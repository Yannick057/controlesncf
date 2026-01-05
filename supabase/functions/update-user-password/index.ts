import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
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
      console.log('Missing authorization header')
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
      console.log('Failed to get caller user:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Caller user:', callerUser.id, callerUser.email)

    // Get caller role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)
    const { data: callerRoleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .maybeSingle()

    if (roleError) {
      console.log('Error fetching caller role:', roleError)
      return new Response(
        JSON.stringify({ error: 'Error fetching role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const callerRole = callerRoleData?.role || 'agent'
    console.log('Caller role:', callerRole)

    // Only admins and managers can change passwords
    if (callerRole !== 'admin' && callerRole !== 'manager') {
      console.log('Permission denied: not admin or manager')
      return new Response(
        JSON.stringify({ error: 'Permission denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { targetUserId, newPassword } = await req.json()

    if (!targetUserId || !newPassword) {
      console.log('Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Missing targetUserId or newPassword' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (newPassword.length < 6) {
      console.log('Password too short')
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
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
    console.log('Target user role:', targetRole)

    // Managers cannot change admin passwords
    if (callerRole === 'manager' && targetRole === 'admin') {
      console.log('Manager cannot change admin password')
      return new Response(
        JSON.stringify({ error: 'Managers cannot change admin passwords' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Cannot change own password via this endpoint
    if (targetUserId === callerUser.id) {
      console.log('Cannot change own password')
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
      console.log('Error updating password:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update password: ' + updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Password updated successfully for user:', targetUserId)

    return new Response(
      JSON.stringify({ success: true, message: 'Password updated successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})