/**
 * Supabase Edge Function: create-user
 *
 * DEPLOYMENT INSTRUCTIONS:
 * ─────────────────────────────────────────────────────────────
 * 1. Install Supabase CLI:   brew install supabase/tap/supabase
 * 2. Login:                  supabase login
 * 3. Link project:           supabase link --project-ref <your-project-ref>
 * 4. Deploy this function:   supabase functions deploy create-user
 * 5. Set env var (already available in edge functions):
 *    SUPABASE_SERVICE_ROLE_KEY is automatically injected by Supabase.
 *    SUPABASE_URL and SUPABASE_ANON_KEY are also auto-injected.
 *
 * SQL TO RUN IN SUPABASE SQL EDITOR (one-time setup):
 * ─────────────────────────────────────────────────────────────
 * alter table public.profiles
 *   add column if not exists active boolean default true;
 * ─────────────────────────────────────────────────────────────
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    // Caller-scoped client — verifies the JWT of the requesting user
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser()
    if (authError || !caller) throw new Error('Unauthorized')

    // Verify caller is superadmin
    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.role !== 'superadmin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: superadmin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, full_name, role, org_id } = await req.json()
    if (!email || !full_name || !role) {
      throw new Error('Missing required fields: email, full_name, role')
    }

    // Service-role client — has admin privileges to create auth users
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Invite sends a magic-link email so the new user can set their password
    const { data: { user: newUser }, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { full_name, role },
      })

    if (inviteError) throw inviteError
    if (!newUser) throw new Error('User creation failed')

    // Create the profile row linked to the new auth user
    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id:       newUser.id,
        email,
        full_name,
        role,
        org_id:   org_id || null,
        active:   true,
      })

    if (profileError) {
      // Clean up the auth user if profile insert fails
      await adminClient.auth.admin.deleteUser(newUser.id)
      throw profileError
    }

    return new Response(
      JSON.stringify({ user: newUser }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
