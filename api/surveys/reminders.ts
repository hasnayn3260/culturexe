import { timingSafeEqual } from 'node:crypto'

import { createClient } from '@supabase/supabase-js'

import { sendSurveyReminderEmail } from '../email/postmark.js'
import { isReminderRecipientEligible } from './reminderPolicy.js'

type SurveyRow = {
  id: string
  org_id: string
  title: string
  status: string
  live_start: string | null
  live_end: string | null
  email_reminders_enabled: boolean
  reminder_frequency_days: number
  reminder_max_sends: number
  reminder_timezone: string
}

type OrganisationRow = {
  id: string
  name: string
  logo_path: string | null
  banner_path: string | null
}

type RespondentRow = {
  id: string
  email: string
  name: string | null
  token: string
  submitted_at: string | null
  invited_at: string | null
  user_id: string | null
  source: string | null
  reminded_at: string | null
  reminder_count: number
}

type ReminderResult = {
  email: string
  respondentId: string
  status: 'sent' | 'failed' | 'skipped'
  message: string
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
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
  const cronSecret = env('CRON_SECRET')
  if (cronSecret && secureEqual(token, cronSecret)) {
    return {
      ok: true as const,
      admin,
      profile: { role: 'superadmin', active: true, org_id: null },
    }
  }

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

function formatSurveyDate(value: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-ZA', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone,
    }).format(new Date(value))
  } catch {
    return new Intl.DateTimeFormat('en-ZA', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Africa/Johannesburg',
    }).format(new Date(value))
  }
}

function publicAssetUrl(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  path: string,
): string {
  if (/^https?:\/\//i.test(path)) return path
  return admin.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

export async function route(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405)
  }

  try {
    const auth = await requireSurveyManager(request)
    if (!auth.ok) return auth.response

    let body: { surveyId?: unknown }
    try {
      body = await request.json()
    } catch {
      return json({ error: 'Request body must be valid JSON.' }, 400)
    }

    const surveyId = typeof body.surveyId === 'string' ? body.surveyId.trim() : ''
    if (!UUID_PATTERN.test(surveyId)) {
      return json({ error: 'A valid survey ID is required.' }, 400)
    }

    const { data: surveyData, error: surveyError } = await auth.admin
      .from('survey')
      .select('id, org_id, title, status, live_start, live_end, email_reminders_enabled, reminder_frequency_days, reminder_max_sends, reminder_timezone')
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

    if (!survey.email_reminders_enabled) {
      return json(
        { error: 'Email reminders are disabled in this survey’s settings.' },
        409,
      )
    }

    if (!survey.live_start || !survey.live_end) {
      return json(
        { error: 'Set the survey opening and closing dates before sending reminders.' },
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
        { error: 'Set a valid survey opening and closing window before sending reminders.' },
        409,
      )
    }
    if (survey.status === 'closed' || closingTime <= now) {
      return json({ error: 'Reminders cannot be sent after the survey has closed.' }, 409)
    }
    if (survey.status !== 'live' || openingTime > now) {
      return json({ error: 'Reminders can only be sent while the survey is live.' }, 409)
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
        { error: 'Upload the organisation logo and banner before sending reminders.' },
        409,
      )
    }

    const { data: respondentData, error: respondentError } = await auth.admin
      .from('survey_respondents')
      .select('id, email, name, token, submitted_at, invited_at, user_id, source, reminded_at, reminder_count')
      .eq('survey_id', survey.id)
    if (respondentError) throw respondentError
    const respondents = ((respondentData || []) as RespondentRow[])
      .filter(isReminderRecipientEligible)

    const respondentIds = respondents.map((respondent) => respondent.id)
    const completedIds = new Set<string>()
    if (respondentIds.length > 0) {
      const { data, error } = await auth.admin
        .from('survey_responses')
        .select('respondent_id')
        .eq('survey_id', survey.id)
        .in('respondent_id', respondentIds)
      if (error) throw error
      for (const response of data || []) completedIds.add(response.respondent_id)
    }

    const siteUrl = (env('PUBLIC_SITE_URL') || env('SITE_URL') ||
      'https://www.culture-xe.com').replace(/\/$/, '')
    const supportEmail = env('SUPPORT_EMAIL') || 'support@stratxe.com'
    const logoUrl = publicAssetUrl(auth.admin, 'Company Logos', organisation.logo_path)
    const bannerUrl = publicAssetUrl(auth.admin, 'Company Banners', organisation.banner_path)
    const results: ReminderResult[] = []
    const minimumReminderGap = survey.reminder_frequency_days * 24 * 60 * 60 * 1_000

    for (const respondent of respondents) {
      if (respondent.submitted_at || completedIds.has(respondent.id)) {
        results.push({
          email: respondent.email,
          respondentId: respondent.id,
          status: 'skipped',
          message: 'Survey already completed.',
        })
        continue
      }

      if (respondent.reminder_count >= survey.reminder_max_sends) {
        results.push({
          email: respondent.email,
          respondentId: respondent.id,
          status: 'skipped',
          message: `The maximum of ${survey.reminder_max_sends} reminders has been reached.`,
        })
        continue
      }

      const lastReminderTime = respondent.reminded_at
        ? new Date(respondent.reminded_at).getTime()
        : Number.NaN
      if (
        Number.isFinite(lastReminderTime) &&
        now - lastReminderTime < minimumReminderGap
      ) {
        const nextEligibleAt = new Date(lastReminderTime + minimumReminderGap)
        results.push({
          email: respondent.email,
          respondentId: respondent.id,
          status: 'skipped',
          message: `The next reminder may be sent after ${formatSurveyDate(nextEligibleAt.toISOString(), survey.reminder_timezone)}.`,
        })
        continue
      }

      if (!EMAIL_PATTERN.test(respondent.email)) {
        const attemptedAt = new Date().toISOString()
        const errorMessage = 'The respondent email address is invalid.'
        const { error: trackingError } = await auth.admin
          .from('survey_respondents')
          .update({
            last_reminder_attempted_at: attemptedAt,
            last_reminder_error: errorMessage,
          })
          .eq('id', respondent.id)
          .eq('survey_id', survey.id)
        if (trackingError) {
          console.error('Invalid reminder attempt could not be recorded', {
            respondentId: respondent.id,
            error: trackingError,
          })
        }
        results.push({
          email: respondent.email,
          respondentId: respondent.id,
          status: 'failed',
          message: errorMessage,
        })
        continue
      }

      const attemptedAt = new Date().toISOString()
      try {
        const { error: attemptError } = await auth.admin
          .from('survey_respondents')
          .update({
            last_reminder_attempted_at: attemptedAt,
            last_reminder_error: null,
          })
          .eq('id', respondent.id)
          .eq('survey_id', survey.id)
        if (attemptError) {
          throw new Error('The reminder attempt could not be recorded, so no email was sent.')
        }

        await sendSurveyReminderEmail({
          to: respondent.email,
          organisationId: organisation.id,
          surveyId: survey.id,
          respondentId: respondent.id,
          model: {
            survey_title: survey.title,
            closing_date: formatSurveyDate(survey.live_end, survey.reminder_timezone),
            organisation_logo_url: logoUrl,
            organisation_name: organisation.name,
            organisation_banner_url: bannerUrl,
            recipient_name: respondent.name || respondent.email,
            survey_url: `${siteUrl}/assess/${respondent.token}`,
            support_email: supportEmail,
          },
        })

        const { error: timestampError } = await auth.admin
          .from('survey_respondents')
          .update({
            reminded_at: attemptedAt,
            reminder_count: respondent.reminder_count + 1,
            last_reminder_attempted_at: attemptedAt,
            last_reminder_error: null,
          })
          .eq('id', respondent.id)
          .eq('survey_id', survey.id)
        if (timestampError) {
          console.error('Survey reminder timestamp update failed', {
            respondentId: respondent.id,
            error: timestampError,
          })
        }

        results.push({
          email: respondent.email,
          respondentId: respondent.id,
          status: 'sent',
          message: timestampError
            ? 'Reminder sent, but the reminder timestamp could not be recorded.'
            : 'Reminder sent.',
        })
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : 'Reminder could not be sent.'
        const { error: trackingError } = await auth.admin
          .from('survey_respondents')
          .update({
            last_reminder_attempted_at: attemptedAt,
            last_reminder_error: errorMessage.slice(0, 2_000),
          })
          .eq('id', respondent.id)
          .eq('survey_id', survey.id)
        if (trackingError) {
          console.error('Failed reminder attempt could not be recorded', {
            respondentId: respondent.id,
            error: trackingError,
          })
        }
        results.push({
          email: respondent.email,
          respondentId: respondent.id,
          status: 'failed',
          message: errorMessage,
        })
      }
    }

    const count = (status: ReminderResult['status']) =>
      results.filter((result) => result.status === status).length

    return json({
      results,
      total: results.length,
      sent: count('sent'),
      failed: count('failed'),
      skipped: count('skipped'),
    })
  } catch (error) {
    console.error('survey reminders API error', error)
    return json(
      { error: error instanceof Error ? error.message : 'Unexpected server error.' },
      500,
    )
  }
}

export default {
  fetch: route,
}
