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
  
  // Check exact matches
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

// Simple in-memory rate limiting (resets on cold start, but provides basic protection)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per minute per user

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

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.info('[AUTH] Missing authorization header')
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create client with user token to verify caller identity
    const supabaseUser = createClient(supabaseUrl, supabaseServiceRoleKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Get caller user
    const { data: { user: callerUser }, error: userError } = await supabaseUser.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !callerUser) {
      console.info('[AUTH] Authentication failed')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check rate limit
    if (!checkRateLimit(callerUser.id)) {
      console.info('[SECURITY] Rate limit exceeded')
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get caller role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)
    const { data: callerRoleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .maybeSingle()

    if (roleError) {
      console.error('[ERROR] Failed to fetch role')
      return new Response(
        JSON.stringify({ error: 'Error fetching role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const callerRole = callerRoleData?.role || 'agent'

    // Only admins and managers can change passwords
    if (callerRole !== 'admin' && callerRole !== 'manager') {
      console.info('[AUTH] Permission denied: insufficient role')
      return new Response(
        JSON.stringify({ error: 'Permission denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { targetUserId, newPassword } = await req.json()

    if (!targetUserId || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Missing targetUserId or newPassword' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enhanced password validation: require at least one uppercase, one lowercase, and one number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!passwordRegex.test(newPassword)) {
      return new Response(
        JSON.stringify({ error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get target user role
    const { data: targetRoleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUserId)
      .maybeSingle()

    const targetRole = targetRoleData?.role || 'agent'

    // Managers cannot change admin passwords
    if (callerRole === 'manager' && targetRole === 'admin') {
      console.info('[AUTH] Manager attempted admin password change')
      return new Response(
        JSON.stringify({ error: 'Managers cannot change admin passwords' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Cannot change own password via this endpoint
    if (targetUserId === callerUser.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot change your own password via this endpoint' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update password using admin client
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    )

    if (updateError) {
      console.error('[ERROR] Password update failed')
      return new Response(
        JSON.stringify({ error: 'Failed to update password' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Security audit log - minimal info without PII
    console.info('[SECURITY] Password changed successfully')

    return new Response(
      JSON.stringify({ success: true, message: 'Password updated successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[ERROR] Unexpected error occurred')
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(null), 'Content-Type': 'application/json' } }
    )
  }
})
