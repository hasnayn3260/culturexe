import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─────────────────────────────────────────────────────────────────────────────
// send-completion
// Sends a "thank you / survey received" email to a respondent after they submit.
//
// Designed to be invoked by a Supabase DATABASE WEBHOOK on:
//   INSERT into public.survey_responses
// The webhook posts { type, table, record, ... }; we read record.respondent_id,
// look the respondent up with the service role, and email THAT respondent's
// stored address — so the endpoint can never be used to email arbitrary people.
//
// Optional hardening: set COMPLETION_WEBHOOK_SECRET and add a matching header
// (x-webhook-secret) in the webhook config; requests without it are rejected.
//
// Required env (Supabase → Edge Functions → Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
//   COMPLETION_WEBHOOK_SECRET (optional)
// ─────────────────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    // Optional shared-secret check.
    const expectedSecret = Deno.env.get('COMPLETION_WEBHOOK_SECRET')
    if (expectedSecret && req.headers.get('x-webhook-secret') !== expectedSecret) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) return json({ error: 'Email service not configured' }, 500)

    const payload = await req.json().catch(() => ({}))
    // Accept either a DB-webhook payload or a direct { respondent_id }.
    const respondentId: string | undefined =
      payload?.record?.respondent_id ?? payload?.respondent_id

    if (!respondentId) return json({ error: 'No respondent_id in payload' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Look up the respondent (and their survey) server-side.
    const { data: respondent, error: rErr } = await supabase
      .from('survey_respondents')
      .select('email, name, survey:survey_id ( title )')
      .eq('id', respondentId)
      .maybeSingle()

    if (rErr) return json({ error: rErr.message }, 500)
    if (!respondent?.email) return json({ skipped: 'no email for respondent' })

    const surveyTitle = (respondent as any).survey?.title ?? 'the survey'
    const firstName = (respondent.name ?? '').trim().split(' ')[0] || 'there'

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'CultureXe Surveys <surveys@culturexe.com>',
        to: [respondent.email],
        subject: `Thank you — your response to ${surveyTitle} has been received`,
        html: buildCompletionHtml({ firstName, surveyTitle }),
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return json({ error: err.message ?? `Resend HTTP ${res.status}` }, 502)
    }

    return json({ sent: respondent.email })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})

function buildCompletionHtml(opts: { firstName: string; surveyTitle: string }): string {
  const { firstName, surveyTitle } = opts
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:#0d2d3a;padding:32px 40px;">
          <p style="margin:0;color:#4ecdc4;font-size:22px;font-weight:700;letter-spacing:-0.5px;">CultureXe</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0d2d3a;">Thank you, ${firstName} 🎉</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#666;">${surveyTitle}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.6;">
            Your response has been received. Thank you for taking the time to share your honest feedback —
            it directly helps build a stronger, healthier workplace.
          </p>
          <p style="margin:0 0 0;font-size:15px;color:#333;line-height:1.6;">
            Your individual answers remain confidential. There's nothing more you need to do.
          </p>
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:24px 40px;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#aaa;">© ${new Date().getFullYear()} CultureXe. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
