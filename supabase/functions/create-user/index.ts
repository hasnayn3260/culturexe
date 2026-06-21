import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Only these origins may call this function from a browser. Add your local dev
// origin here if needed. Anything else gets no CORS grant (request is blocked
// by the browser). Set via the ALLOWED_ORIGINS env var (comma-separated) to
// avoid hard-coding, falling back to the production site.
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ??
  'https://culture-xe.com,https://www.culture-xe.com')
  .split(',').map((o) => o.trim()).filter(Boolean)

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin') ?? ''
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: requestingUser } } = 
      await supabaseClient.auth.getUser()
    
    if (!requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: requestingProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', requestingUser.id)
      .single()

    if (requestingProfile?.role !== 'superadmin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden - superadmin only' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, full_name, role, org_id } = await req.json()

    if (!email || !full_name || !role) {
      return new Response(
        JSON.stringify({ error: 'email, full_name and role are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: newUser, error: createError } = 
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: 'https://culture-xe.com/login',
        data: { full_name, role }
      })

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Upsert (not insert): the handle_new_user trigger has already created a
    // non-privileged profile row for this user. As the service role we now
    // authoritatively set the intended role/org — this is the ONLY path that is
    // allowed to assign privileged roles (consultant / superadmin).
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        email,
        full_name,
        role,
        org_id: org_id || null,
        active: true
      }, { onConflict: 'id' })

    if (profileError) {
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: newUser.user,
        message: `Invite sent to ${email}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})