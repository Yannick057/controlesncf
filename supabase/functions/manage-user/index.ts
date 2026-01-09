import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Get allowed origins from environment or use defaults
const getAllowedOrigins = (): string[] => {
  const customOrigin = Deno.env.get('ALLOWED_ORIGIN');
  const origins = [
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:3000',
    'https://lovable.dev',
  ];
  
  if (customOrigin) {
    origins.push(customOrigin);
  }
  
  return origins;
};

const isOriginAllowed = (origin: string | null): boolean => {
  if (!origin) return false;
  
  const allowedOrigins = getAllowedOrigins();
  
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  
  // Allow Lovable project domains
  if (origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app')) {
    return true;
  }
  
  return false;
};

const getCorsHeaders = (origin: string | null): Record<string, string> => {
  const allowedOrigin = isOriginAllowed(origin) ? origin : 'https://lovable.dev';
  return {
    'Access-Control-Allow-Origin': allowedOrigin || 'https://lovable.dev',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
};

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQUESTS = 10;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.info('[AUTH] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, supabaseServiceRoleKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user: callerUser }, error: userError } = await supabaseUser.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !callerUser) {
      console.info('[AUTH] Authentication failed');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!checkRateLimit(callerUser.id)) {
      console.info('[SECURITY] Rate limit exceeded');
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get caller role
    const { data: callerRoleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .maybeSingle();

    if (roleError) {
      console.error('[ERROR] Failed to fetch role');
      return new Response(
        JSON.stringify({ error: 'Error fetching role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerRole = callerRoleData?.role || 'agent';

    // Only admins and managers can manage users
    if (callerRole !== 'admin' && callerRole !== 'manager') {
      console.info('[AUTH] Permission denied: insufficient role');
      return new Response(
        JSON.stringify({ error: 'Permission denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, targetUserId } = await req.json();

    if (!action || !targetUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing action or targetUserId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cannot perform actions on self
    if (targetUserId === callerUser.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot perform this action on your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target user role
    const { data: targetRoleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUserId)
      .maybeSingle();

    const targetRole = targetRoleData?.role || 'agent';

    // Managers cannot manage admins
    if (callerRole === 'manager' && targetRole === 'admin') {
      console.info('[AUTH] Manager attempted to manage admin account');
      return new Response(
        JSON.stringify({ error: 'Managers cannot manage admin accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'delete': {
        // Delete user data first (cascading delete should handle most)
        // Delete from profiles
        await supabaseAdmin.from('profiles').delete().eq('id', targetUserId);
        
        // Delete from user_roles
        await supabaseAdmin.from('user_roles').delete().eq('user_id', targetUserId);
        
        // Delete the auth user
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
        
        if (deleteError) {
          console.error('[ERROR] Failed to delete user');
          return new Response(
            JSON.stringify({ error: 'Failed to delete user' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.info('[SECURITY] User deleted successfully');
        return new Response(
          JSON.stringify({ success: true, message: 'User deleted successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'suspend': {
        // Ban the user (sets banned_until to far future)
        const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
          targetUserId,
          { ban_duration: '876000h' } // ~100 years
        );

        if (banError) {
          console.error('[ERROR] Failed to suspend user');
          return new Response(
            JSON.stringify({ error: 'Failed to suspend user' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.info('[SECURITY] User suspended successfully');
        return new Response(
          JSON.stringify({ success: true, message: 'User suspended successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reactivate': {
        // Unban the user
        const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(
          targetUserId,
          { ban_duration: 'none' }
        );

        if (unbanError) {
          console.error('[ERROR] Failed to reactivate user');
          return new Response(
            JSON.stringify({ error: 'Failed to reactivate user' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.info('[SECURITY] User reactivated successfully');
        return new Response(
          JSON.stringify({ success: true, message: 'User reactivated successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('[ERROR] Unexpected error occurred');
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(null), 'Content-Type': 'application/json' } }
    );
  }
});
