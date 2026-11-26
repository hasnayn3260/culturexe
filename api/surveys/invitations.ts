import { createClient } from '@supabase/supabase-js'

import { sendSurveyInvitationEmail } from '../email/postmark.js'

type InvitationRowInput = {
  email?: unknown
  name?: unknown
  department?: unknown
  job_title?: unknown
}

type SurveyRow = {
  id: string
  org_id: string
  title: string
  status: string
  live_start: string | null
  live_end: string | null
  email_invitations_enabled: boolean
}

type OrganisationRow = {
  id: string
  name: string
  logo_path: string | null
  banner_path: string | null
}

type RespondentRow = {
  id: string
  survey_id: string
  email: string
  name: string | null
  department: string | null
  job_title: string | null
  token: string
  user_id: string | null
  submitted_at: string | null
}

type InvitationResult = {
  email: string
  respondentId?: string
  status: 'sent' | 'failed' | 'skipped'
  message: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_INVITATIONS = 250

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
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

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function createAdminClient() {
  const supabaseUrl = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
  const serviceKey =
    env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'Server configuration is missing SUPABASE_URL and SUPABASE_SECRET_KEY.',
    )
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function bearerToken(request: Request): string | null {
  const value = request.headers.get('authorization')
  const match = value?.match(/^Bearer\s+(.+)$/i)
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

  const admin = createAdminClient()
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token)

  if (authError || !user) {
    return {
      ok: false as const,
      response: json({ error: 'Your session is invalid or expired.' }, 401),
    }
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role, active, org_id')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError) throw profileError

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

function formatSurveyDate(value: string): string {
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Africa/Johannesburg',
  }).format(new Date(value))
}

function publicAssetUrl(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  path: string,
): string {
  if (/^https?:\/\//i.test(path)) return path
  return admin.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

async function route(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405)
  }

  try {
    const auth = await requireSurveyManager(request)
    if (!auth.ok) return auth.response

    let body: { surveyId?: unknown; rows?: unknown }
    try {
      body = await request.json()
    } catch {
      return json({ error: 'Request body must be valid JSON.' }, 400)
    }

    const surveyId = clean(body.surveyId)
    if (!UUID_PATTERN.test(surveyId)) {
      return json({ error: 'A valid survey ID is required.' }, 400)
    }
    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return json({ error: 'Add at least one respondent.' }, 400)
    }
    if (body.rows.length > MAX_INVITATIONS) {
      return json(
        { error: `Send no more than ${MAX_INVITATIONS} invitations at once.` },
        400,
      )
    }

    const rows = body.rows as InvitationRowInput[]
    const normalized = rows.map((row) => ({
      email: clean(row.email).toLowerCase(),
      name: clean(row.name),
      department: clean(row.department),
      jobTitle: clean(row.job_title),
    }))
    const invalidEmail = normalized.find(
      (row) => !EMAIL_PATTERN.test(row.email) || row.email.length > 254,
    )
    if (invalidEmail) {
      return json({ error: `Enter a valid email address for ${invalidEmail.email || 'every respondent'}.` }, 400)
    }

    const duplicateEmail = normalized.find(
      (row, index) => normalized.findIndex((item) => item.email === row.email) !== index,
    )
    if (duplicateEmail) {
      return json(
        { error: `${duplicateEmail.email} appears more than once in this invitation.` },
        400,
      )
    }

    const { data: surveyData, error: surveyError } = await auth.admin
      .from('survey')
      .select('id, org_id, title, status, live_start, live_end, email_invitations_enabled')
      .eq('id', surveyId)
      .maybeSingle()
    if (surveyError) throw surveyError
    if (!surveyData) return json({ error: 'Survey not found.' }, 404)
    const survey = surveyData as SurveyRow

    if (
      auth.profile.role !== 'superadmin' &&
      auth.profile.org_id !== survey.org_id
    ) {
      return json({ error: 'You cannot manage this organisation’s survey.' }, 403)
    }

    if (!survey.email_invitations_enabled) {
      return json(
        { error: 'Email invitations are disabled in this survey’s settings.' },
        409,
      )
    }

    if (!survey.live_start || !survey.live_end) {
      return json(
        { error: 'Set the survey opening and closing dates before sending invitations.' },
        409,
      )
    }

    const now = Date.now()
    const openingTime = new Date(survey.live_start).getTime()
    const closingTime = new Date(survey.live_end).getTime()
    if (
      !Number.isFinite(openingTime) ||
      !Number.isFinite(closingTime) ||
      closingTime <= openingTime
    ) {
      return json(
        { error: 'Set a valid survey opening and closing window before sending invitations.' },
        409,
      )
    }
    if (survey.status === 'closed' || closingTime <= now) {
      return json({ error: 'Invitations cannot be sent after the survey has closed.' }, 409)
    }

    const { data: organisationData, error: organisationError } = await auth.admin
      .from('organisations')
      .select('id, name, logo_path, banner_path')
      .eq('id', survey.org_id)
      .maybeSingle()
    if (organisationError) throw organisationError
    if (!organisationData) return json({ error: 'Survey organisation not found.' }, 404)
    const organisation = organisationData as OrganisationRow
    if (!organisation.logo_path || !organisation.banner_path) {
      return json(
        { error: 'Upload the organisation logo and banner before sending invitations.' },
        409,
      )
    }

    const emails = normalized.map((row) => row.email)
    const [respondentsResult, profilesResult] = await Promise.all([
      auth.admin
        .from('survey_respondents')
        .select('id, survey_id, email, name, department, job_title, token, user_id, submitted_at')
        .eq('survey_id', survey.id)
        .in('email', emails),
      auth.admin
        .from('profiles')
        .select('id, email')
        .eq('org_id', survey.org_id)
        .eq('active', true)
        .in('email', emails),
    ])
    if (respondentsResult.error) throw respondentsResult.error
    if (profilesResult.error) throw profilesResult.error

    const existingByEmail = new Map<string, RespondentRow>(
      ((respondentsResult.data || []) as RespondentRow[]).map((respondent) => [
        respondent.email.toLowerCase(),
        respondent,
      ]),
    )
    const profileIdByEmail = new Map<string, string>(
      (profilesResult.data || [])
        .filter((profile) => profile.email)
        .map((profile) => [profile.email.toLowerCase(), profile.id]),
    )
    const existingIds = [...existingByEmail.values()].map((respondent) => respondent.id)
    const completedIds = new Set<string>()
    if (existingIds.length > 0) {
      const { data, error } = await auth.admin
        .from('survey_responses')
        .select('respondent_id')
        .eq('survey_id', survey.id)
        .in('respondent_id', existingIds)
      if (error) throw error
      for (const response of data || []) completedIds.add(response.respondent_id)
    }

    const siteUrl = (env('PUBLIC_SITE_URL') || env('SITE_URL') ||
      'https://www.culture-xe.com').replace(/\/$/, '')
    const supportEmail = env('SUPPORT_EMAIL') || 'support@stratxe.com'
    const logoUrl = publicAssetUrl(auth.admin, 'Company Logos', organisation.logo_path)
    const bannerUrl = publicAssetUrl(auth.admin, 'Company Banners', organisation.banner_path)
    const results: InvitationResult[] = []

    for (const row of normalized) {
      try {
        let respondent = existingByEmail.get(row.email)
        if (
          respondent &&
          (respondent.submitted_at || completedIds.has(respondent.id))
        ) {
          results.push({
            email: row.email,
            respondentId: respondent.id,
            status: 'skipped',
            message: 'This respondent has already completed the survey.',
          })
          continue
        }

        const respondentValues = {
          survey_id: survey.id,
          email: row.email,
          name: row.name || respondent?.name || null,
          department: row.department || respondent?.department || null,
          job_title: row.jobTitle || respondent?.job_title || null,
          user_id: respondent?.user_id || profileIdByEmail.get(row.email) || null,
          source: 'invited',
        }

        if (respondent) {
          const { data, error } = await auth.admin
            .from('survey_respondents')
            .update(respondentValues)
            .eq('id', respondent.id)
            .select('id, survey_id, email, name, department, job_title, token, user_id, submitted_at')
            .single()
          if (error) throw error
          respondent = data as RespondentRow
        } else {
          const { data, error } = await auth.admin
            .from('survey_respondents')
            .insert({ ...respondentValues, invited_at: null })
            .select('id, survey_id, email, name, department, job_title, token, user_id, submitted_at')
            .single()
          if (error) throw error
          respondent = data as RespondentRow
        }

        await sendSurveyInvitationEmail({
          to: row.email,
          organisationId: organisation.id,
          surveyId: survey.id,
          respondentId: respondent.id,
          model: {
            organisation_name: organisation.name,
            survey_title: survey.title,
            organisation_logo_url: logoUrl,
            organisation_banner_url: bannerUrl,
            recipient_name: row.name || respondent.name || row.email,
            opening_date: formatSurveyDate(survey.live_start),
            closing_date: formatSurveyDate(survey.live_end),
            survey_url: `${siteUrl}/assess/${respondent.token}`,
            support_email: supportEmail,
          },
        })

        const { error: invitedAtError } = await auth.admin
          .from('survey_respondents')
          .update({ invited_at: new Date().toISOString() })
          .eq('id', respondent.id)
        if (invitedAtError) {
          console.error('Survey invitation timestamp update failed', {
            respondentId: respondent.id,
            error: invitedAtError,
          })
        }

        results.push({
          email: row.email,
          respondentId: respondent.id,
          status: 'sent',
          message: invitedAtError
            ? 'Invitation sent, but the invitation timestamp could not be recorded.'
            : 'Invitation sent.',
        })
      } catch (error) {
        results.push({
          email: row.email,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Invitation could not be sent.',
        })
      }
    }

    const count = (status: InvitationResult['status']) =>
      results.filter((result) => result.status === status).length

    return json({
      results,
      total: results.length,
      sent: count('sent'),
      failed: count('failed'),
      skipped: count('skipped'),
    })
  } catch (error) {
    console.error('survey invitations API error', error)
    return json(
      { error: error instanceof Error ? error.message : 'Unexpected server error.' },
      500,
    )
  }
}

export default {
  fetch: route,
}
