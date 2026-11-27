import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { normaliseApiPayload } from '../errors.js'

type ManagerProfile = {
  role: string | null
  active: boolean | null
  org_id: string | null
}

type SurveyRow = {
  id: string
  org_id: string
  status: string
  live_end: string | null
}

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  department: string | null
  job_title: string | null
  position: string | null
  branch: string | null
  location_site: string | null
  active: boolean | null
  role: string | null
}

type RespondentRow = {
  id: string
  user_id: string | null
  email: string
  submitted_at: string | null
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_USERS = 250

function json(data: unknown, status = 200): Response {
  return Response.json(normaliseApiPayload(data, status), {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function env(name: string): string | undefined {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> }
  }
  return runtime.process?.env?.[name]
}

function adminClient(): SupabaseClient {
  const supabaseUrl = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
  const serviceKey =
    env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'Server configuration is missing SUPABASE_URL and SUPABASE_SECRET_KEY.',
    )
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function bearerToken(request: Request): string | null {
  const match = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

async function requireSurveyManager(request: Request) {
  const token = bearerToken(request)
  if (!token) {
    return {
      ok: false as const,
      response: json({ error: 'Authentication required.' }, 401),
    }
  }

  const admin = adminClient()
  const { data: authData, error: authError } = await admin.auth.getUser(token)
  if (authError || !authData.user) {
    return {
      ok: false as const,
      response: json({ error: 'Your session is invalid or expired.' }, 401),
    }
  }

  const { data, error } = await admin
    .from('profiles')
    .select('role, active, org_id')
    .eq('id', authData.user.id)
    .maybeSingle()
  if (error) throw error
  const profile = data as ManagerProfile | null

  if (
    !profile ||
    profile.active === false ||
    !['superadmin', 'consultant', 'admin'].includes(profile.role || '')
  ) {
    return {
      ok: false as const,
      response: json({ error: 'Survey management access is required.' }, 403),
    }
  }

  return { ok: true as const, admin, profile }
}

async function managedSurvey(
  admin: SupabaseClient,
  manager: ManagerProfile,
  surveyId: string,
): Promise<{ survey?: SurveyRow; response?: Response }> {
  if (!UUID_PATTERN.test(surveyId)) {
    return { response: json({ error: 'A valid survey ID is required.' }, 400) }
  }

  const { data, error } = await admin
    .from('survey')
    .select('id, org_id, status, live_end')
    .eq('id', surveyId)
    .maybeSingle()
  if (error) throw error
  if (!data) return { response: json({ error: 'Survey not found.' }, 404) }

  const survey = data as SurveyRow
  if (manager.role !== 'superadmin' && manager.org_id !== survey.org_id) {
    return {
      response: json({ error: 'You cannot manage this organisation’s survey.' }, 403),
    }
  }
  return { survey }
}

async function surveyRespondents(
  admin: SupabaseClient,
  surveyId: string,
): Promise<RespondentRow[]> {
  const { data, error } = await admin
    .from('survey_respondents')
    .select('id, user_id, email, submitted_at')
    .eq('survey_id', surveyId)
  if (error) throw error
  return (data || []) as RespondentRow[]
}

async function handleList(
  request: Request,
  admin: SupabaseClient,
  manager: ManagerProfile,
): Promise<Response> {
  const surveyId = new URL(request.url).searchParams.get('surveyId')?.trim() || ''
  const managed = await managedSurvey(admin, manager, surveyId)
  if (managed.response) return managed.response
  const survey = managed.survey as SurveyRow

  const [profilesResult, respondents] = await Promise.all([
    admin
      .from('profiles')
      .select('id, email, full_name, department, job_title, position, branch, location_site, active, role')
      .eq('org_id', survey.org_id)
      .eq('active', true)
      .eq('role', 'client')
      .order('full_name', { ascending: true }),
    surveyRespondents(admin, survey.id),
  ])
  if (profilesResult.error) throw profilesResult.error

  const existingUserIds = new Set(
    respondents.map((respondent) => respondent.user_id).filter(Boolean),
  )
  const existingEmails = new Set(
    respondents.map((respondent) => respondent.email.toLowerCase()),
  )
  const users = ((profilesResult.data || []) as ProfileRow[])
    .filter((profile) =>
      profile.email &&
      !existingUserIds.has(profile.id) &&
      !existingEmails.has(profile.email.toLowerCase()))
    .map((profile) => ({
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      department: profile.department,
      jobTitle: profile.job_title,
      position: profile.position,
      branch: profile.branch,
      locationSite: profile.location_site,
    }))

  return json({ users, organisationId: survey.org_id })
}

async function handleAdd(
  request: Request,
  admin: SupabaseClient,
  manager: ManagerProfile,
): Promise<Response> {
  let body: { surveyId?: unknown; userIds?: unknown }
  try {
    body = await request.json() as typeof body
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, 400)
  }

  const surveyId = typeof body.surveyId === 'string' ? body.surveyId.trim() : ''
  const managed = await managedSurvey(admin, manager, surveyId)
  if (managed.response) return managed.response
  const survey = managed.survey as SurveyRow

  if (
    survey.status === 'closed' ||
    (survey.live_end && Date.parse(survey.live_end) <= Date.now())
  ) {
    return json({ error: 'Respondents cannot be added after the survey has closed.' }, 409)
  }
  if (!Array.isArray(body.userIds) || body.userIds.length === 0) {
    return json({ error: 'Select at least one organisation user.' }, 400)
  }

  const userIds = [...new Set(body.userIds.map((value) =>
    typeof value === 'string' ? value.trim() : ''))]
  if (
    userIds.length > MAX_USERS ||
    userIds.some((userId) => !UUID_PATTERN.test(userId))
  ) {
    return json({ error: `Select between 1 and ${MAX_USERS} valid organisation users.` }, 400)
  }

  const { data, error } = await admin
    .from('profiles')
    .select('id, email, full_name, department, job_title, position, branch, location_site, active, role')
    .eq('org_id', survey.org_id)
    .eq('active', true)
    .eq('role', 'client')
    .in('id', userIds)
  if (error) throw error
  const profiles = (data || []) as ProfileRow[]
  if (profiles.length !== userIds.length || profiles.some((profile) => !profile.email)) {
    return json(
      { error: 'Every selected user must be an active client in the survey organisation with an email address.' },
      400,
    )
  }

  const respondents = await surveyRespondents(admin, survey.id)
  const existingUserIds = new Set(
    respondents.map((respondent) => respondent.user_id).filter(Boolean),
  )
  const existingEmails = new Set(
    respondents.map((respondent) => respondent.email.toLowerCase()),
  )
  const newProfiles = profiles.filter((profile) =>
    !existingUserIds.has(profile.id) &&
    !existingEmails.has((profile.email || '').toLowerCase()))

  if (newProfiles.length > 0) {
    const { error: insertError } = await admin
      .from('survey_respondents')
      .insert(newProfiles.map((profile) => ({
        survey_id: survey.id,
        user_id: profile.id,
        email: profile.email,
        name: profile.full_name,
        department: profile.department,
        job_title: profile.job_title,
        source: 'assigned',
        invited_at: null,
      })))
    if (insertError) throw insertError
  }

  return json({
    added: newProfiles.length,
    skipped: profiles.length - newProfiles.length,
    total: profiles.length,
  })
}

async function route(request: Request): Promise<Response> {
  try {
    const auth = await requireSurveyManager(request)
    if (!auth.ok) return auth.response

    if (request.method === 'GET') {
      return await handleList(request, auth.admin, auth.profile)
    }
    if (request.method === 'POST') {
      return await handleAdd(request, auth.admin, auth.profile)
    }
    return json({ error: 'Method not allowed.' }, 405)
  } catch (error) {
    console.error('survey respondent users API error', error)
    return json({
      error: error instanceof Error ? error.message : 'Unexpected server error.',
    }, 500)
  }
}

export default { fetch: route }
