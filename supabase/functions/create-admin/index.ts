import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

// Get allowed origins from environment or use defaults
const getAllowedOrigins = (): string[] => {
  const customOrigin = Deno.env.get('ALLOWED_ORIGIN');
  const origins = [
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:3000',
  ];
  
  if (customOrigin) {
    origins.push(customOrigin);
  }
  
  // Add Lovable preview domains
  origins.push('https://lovable.dev');
  
  return origins;
};

const isOriginAllowed = (origin: string | null): boolean => {
  if (!origin) return false;
  
  const allowedOrigins = getAllowedOrigins();
  
  for (const allowed of allowedOrigins) {
    if (origin === allowed) {
      return true;
    }
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

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, name, adminSecret } = await req.json();

    // Verify admin secret (should be set as a secret in edge function)
    const expectedSecret = Deno.env.get('ADMIN_CREATION_SECRET');
    if (!expectedSecret || adminSecret !== expectedSecret) {
      console.info('[AUTH] Invalid admin secret provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create user
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (userError) {
      console.error('[ERROR] User creation failed');
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // The trigger will create a profile and default 'agent' role
    // Now update to admin role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .update({ role: 'admin' })
      .eq('user_id', userData.user.id);

    if (roleError) {
      console.error('[ERROR] Role update failed');
      return new Response(
        JSON.stringify({ error: 'Failed to update role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.info('[SECURITY] Admin account created successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin account created successfully',
        userId: userData.user.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[ERROR] Unexpected error occurred');
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(null), 'Content-Type': 'application/json' } }
    );
  }
});
