import { timingSafeEqual } from 'node:crypto'

import { createClient } from '@supabase/supabase-js'

import { sendSurveyReceiptEmail } from '../email/postmark.js'
import { normaliseApiPayload } from '../errors.js'

type WebhookPayload = {
  type?: unknown
  table?: unknown
  schema?: unknown
  record?: {
    id?: unknown
    survey_id?: unknown
    respondent_id?: unknown
  }
}

type SurveyResponseRow = {
  id: string
  survey_id: string
  respondent_id: string
  submitted_at: string | null
  receipt_email_message_id: string | null
  receipt_email_sent_at: string | null
  receipt_email_attempted_at: string | null
}

type RespondentRow = {
  id: string
  email: string
  name: string | null
}

type SurveyRow = {
  id: string
  org_id: string
  title: string
  email_receipts_enabled: boolean
  reminder_timezone: string
}

type OrganisationRow = {
  id: string
  name: string
  logo_path: string | null
  banner_path: string | null
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
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

function formatSubmittedAt(value: string, timeZone: string): string {
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

async function route(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405)
  }

  const expectedSecret =
    env('SURVEY_COMPLETION_WEBHOOK_SECRET') || env('COMPLETION_WEBHOOK_SECRET')
  if (!expectedSecret) {
    console.error('Survey receipt webhook secret is not configured.')
    return json({ error: 'Webhook configuration is incomplete.' }, 503)
  }

  const providedSecret = request.headers.get('x-webhook-secret') || ''
  if (!providedSecret || !secureEqual(providedSecret, expectedSecret)) {
    return json({ error: 'Unauthorized.' }, 401)
  }

  try {
    let payload: WebhookPayload
    let emailAccepted = false
    try {
      payload = await request.json()
    } catch {
      return json({ error: 'Request body must be valid JSON.' }, 400)
    }

    if (
      payload.type !== 'INSERT' ||
      payload.schema !== 'public' ||
      payload.table !== 'survey_responses'
    ) {
      return json({ skipped: 'Only survey response inserts create receipts.' })
    }

    const responseId =
      typeof payload.record?.id === 'string' ? payload.record.id : ''
    const surveyId =
      typeof payload.record?.survey_id === 'string' ? payload.record.survey_id : ''
    const respondentId =
      typeof payload.record?.respondent_id === 'string'
        ? payload.record.respondent_id
        : ''
    if (
      !UUID_PATTERN.test(responseId) ||
      !UUID_PATTERN.test(surveyId) ||
      !UUID_PATTERN.test(respondentId)
    ) {
      return json({ error: 'The webhook record is missing valid IDs.' }, 400)
    }

    const admin = createAdminClient()
    const { data: responseData, error: responseError } = await admin
      .from('survey_responses')
      .select('id, survey_id, respondent_id, submitted_at, receipt_email_message_id, receipt_email_sent_at, receipt_email_attempted_at')
      .eq('id', responseId)
      .eq('survey_id', surveyId)
      .eq('respondent_id', respondentId)
      .maybeSingle()
    if (responseError) throw responseError
    if (!responseData) return json({ error: 'Survey response not found.' }, 404)
    const surveyResponse = responseData as SurveyResponseRow
    if (surveyResponse.receipt_email_sent_at) {
      return json({ skipped: 'Receipt already sent.' })
    }

    const { data: surveyData, error: surveyError } = await admin
      .from('survey')
      .select('id, org_id, title, email_receipts_enabled, reminder_timezone')
      .eq('id', surveyId)
      .maybeSingle()
    if (surveyError) throw surveyError
    if (!surveyData) return json({ error: 'Survey not found.' }, 404)
    const survey = surveyData as SurveyRow
    if (!survey.email_receipts_enabled) {
      return json({
        skipped: 'Email completion receipts are disabled for this survey.',
      })
    }

    const claimedAt = new Date().toISOString()
    const { data: claim, error: claimError } = await admin
      .from('survey_responses')
      .update({ receipt_email_attempted_at: claimedAt })
      .eq('id', responseId)
      .is('receipt_email_sent_at', null)
      .is('receipt_email_attempted_at', null)
      .select('id')
      .maybeSingle()
    if (claimError) throw claimError
    if (!claim) {
      return json({ skipped: 'Receipt delivery is already in progress.' })
    }

    try {
      const respondentResult = await admin
        .from('survey_respondents')
        .select('id, email, name')
        .eq('id', respondentId)
        .eq('survey_id', surveyId)
        .maybeSingle()
      if (respondentResult.error) throw respondentResult.error
      if (!respondentResult.data) throw new Error('Survey respondent not found.')

      const respondent = respondentResult.data as RespondentRow
      if (!EMAIL_PATTERN.test(respondent.email)) {
        throw new Error('The respondent email address is invalid.')
      }

      const { data: organisationData, error: organisationError } = await admin
        .from('organisations')
        .select('id, name, logo_path, banner_path')
        .eq('id', survey.org_id)
        .maybeSingle()
      if (organisationError) throw organisationError
      if (!organisationData) throw new Error('Survey organisation not found.')
      const organisation = organisationData as OrganisationRow
      if (!organisation.logo_path || !organisation.banner_path) {
        throw new Error('The organisation logo and banner are required.')
      }

      const logoUrl = publicAssetUrl(admin, 'Company Logos', organisation.logo_path)
      const bannerUrl = publicAssetUrl(admin, 'Company Banners', organisation.banner_path)
      const submittedAt = surveyResponse.submitted_at || claimedAt
      const messageId = await sendSurveyReceiptEmail({
        to: respondent.email,
        organisationId: organisation.id,
        surveyId: survey.id,
        respondentId: respondent.id,
        responseId: surveyResponse.id,
        model: {
          survey_title: survey.title,
          organisation_logo_url: logoUrl,
          organisation_name: organisation.name,
          organisation_banner_url: bannerUrl,
          recipient_name: respondent.name || respondent.email,
          submitted_at: formatSubmittedAt(submittedAt, survey.reminder_timezone),
          support_email: env('SUPPORT_EMAIL') || 'support@stratxe.com',
        },
      })
      emailAccepted = true

      const { error: savedError } = await admin
        .from('survey_responses')
        .update({
          receipt_email_message_id: messageId,
          receipt_email_sent_at: new Date().toISOString(),
        })
        .eq('id', responseId)
        .eq('receipt_email_attempted_at', claimedAt)
      if (savedError) throw savedError

      return json({ sent: respondent.email, messageId })
    } catch (error) {
      if (!emailAccepted) {
        const { error: releaseError } = await admin
          .from('survey_responses')
          .update({ receipt_email_attempted_at: null })
          .eq('id', responseId)
          .eq('receipt_email_attempted_at', claimedAt)
          .is('receipt_email_sent_at', null)
        if (releaseError) {
          console.error('Could not release survey receipt delivery claim', releaseError)
        }
      }
      throw error
    }
  } catch (error) {
    console.error('survey receipt API error', error)
    return json(
      { error: error instanceof Error ? error.message : 'Unexpected server error.' },
      500,
    )
  }
}

export default {
  fetch: route,
}
