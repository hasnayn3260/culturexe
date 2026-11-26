import { timingSafeEqual } from 'node:crypto'

import { createClient } from '@supabase/supabase-js'

import { route as sendSurveyReminders } from '../surveys/reminders.js'
import { isAutomaticReminderScheduleDue } from '../surveys/reminderPolicy.js'

type ScheduledSurvey = {
  id: string
  reminder_first_send_at: string
  reminder_send_time: string
  reminder_timezone: string
}

type CronResult = {
  surveyId: string
  status: 'processed' | 'failed'
  sent: number
  failed: number
  skipped: number
  message?: string
}

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

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
}

function createAdminClient() {
  const supabaseUrl = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
  const serviceKey = env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'Server configuration is missing SUPABASE_URL and SUPABASE_SECRET_KEY.',
    )
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function numericField(value: unknown, key: string): number {
  if (!value || typeof value !== 'object') return 0
  const field = (value as Record<string, unknown>)[key]
  return typeof field === 'number' && Number.isFinite(field) ? field : 0
}

export async function route(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed.' }, 405)
  }

  const cronSecret = env('CRON_SECRET')
  if (!cronSecret) {
    console.error('CRON_SECRET is not configured.')
    return json({ error: 'Cron configuration is incomplete.' }, 503)
  }

  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token || !secureEqual(token.trim(), cronSecret)) {
    return json({ error: 'Unauthorized.' }, 401)
  }

  try {
    const admin = createAdminClient()
    const now = new Date()
    const nowIso = now.toISOString()
    const { data, error } = await admin
      .from('survey')
      .select('id, reminder_first_send_at, reminder_send_time, reminder_timezone')
      .eq('status', 'live')
      .eq('reminders_enabled', true)
      .eq('email_reminders_enabled', true)
      .lte('live_start', nowIso)
      .gt('live_end', nowIso)
      .lte('reminder_first_send_at', nowIso)
      .order('reminder_first_send_at', { ascending: true })
    if (error) throw error

    // Once the first scheduled send time has passed, keep processing the survey.
    // The reminder route applies each respondent's frequency, completion and
    // maximum-send rules, so a missed cron run is caught up on the next run.
    const dueSurveys = ((data || []) as ScheduledSurvey[])
      .filter((survey) => isAutomaticReminderScheduleDue(survey, now))
    const results: CronResult[] = []

    for (const survey of dueSurveys) {
      try {
        const reminderRequest = new Request(
          new URL('/api/surveys/reminders', request.url),
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${cronSecret}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ surveyId: survey.id }),
          },
        )
        const response = await sendSurveyReminders(reminderRequest)
        const body: unknown = await response.json().catch(() => null)

        if (!response.ok) {
          const message = body && typeof body === 'object' &&
              typeof (body as Record<string, unknown>).error === 'string'
            ? String((body as Record<string, unknown>).error)
            : `Reminder delivery returned HTTP ${response.status}.`
          results.push({
            surveyId: survey.id,
            status: 'failed',
            sent: 0,
            failed: 0,
            skipped: 0,
            message,
          })
          continue
        }

        results.push({
          surveyId: survey.id,
          status: 'processed',
          sent: numericField(body, 'sent'),
          failed: numericField(body, 'failed'),
          skipped: numericField(body, 'skipped'),
        })
      } catch (error) {
        results.push({
          surveyId: survey.id,
          status: 'failed',
          sent: 0,
          failed: 0,
          skipped: 0,
          message: error instanceof Error ? error.message : 'Unexpected delivery error.',
        })
      }
    }

    return json({
      checkedAt: nowIso,
      eligibleSurveys: (data || []).length,
      dueSurveys: dueSurveys.length,
      processedSurveys: results.filter(({ status }) => status === 'processed').length,
      failedSurveys: results.filter(({ status }) => status === 'failed').length,
      sent: results.reduce((total, result) => total + result.sent, 0),
      failed: results.reduce((total, result) => total + result.failed, 0),
      skipped: results.reduce((total, result) => total + result.skipped, 0),
      results,
    })
  } catch (error) {
    console.error('Automatic survey reminder cron error', error)
    return json(
      { error: error instanceof Error ? error.message : 'Unexpected server error.' },
      500,
    )
  }
}

export default { fetch: route }
