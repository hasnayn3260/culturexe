import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Invitation {
  email: string
  url: string
}

interface RequestBody {
  invitations: Invitation[]
  assessmentName: string
  orgName: string
  message?: string
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Verify the caller is a consultant or superadmin
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['consultant', 'superadmin'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: RequestBody = await req.json()
    const { invitations, assessmentName, orgName, message } = body

    if (!invitations?.length) {
      return new Response(JSON.stringify({ error: 'No invitations provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const results = await Promise.allSettled(
      invitations.map(({ email, url }) =>
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'CultureXe Surveys <surveys@culturexe.com>',
            to: [email],
            subject: `You're invited: ${assessmentName} – ${orgName}`,
            html: buildEmailHtml({ email, url, assessmentName, orgName, message }),
          }),
        }).then(async (r) => {
          if (!r.ok) {
            const err = await r.json().catch(() => ({}))
            throw new Error(err.message ?? `HTTP ${r.status}`)
          }
          return r.json()
        })
      )
    )

    const sent: string[] = []
    const failed: { email: string; reason: string }[] = []

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        sent.push(invitations[i].email)
      } else {
        failed.push({ email: invitations[i].email, reason: result.reason?.message ?? 'Unknown error' })
      }
    })

    return new Response(JSON.stringify({ sent, failed, total: invitations.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function buildEmailHtml(opts: {
  email: string
  url: string
  assessmentName: string
  orgName: string
  message?: string
}): string {
  const { url, assessmentName, orgName, message } = opts
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#0d2d3a;padding:32px 40px;">
              <p style="margin:0;color:#4ecdc4;font-size:22px;font-weight:700;letter-spacing:-0.5px;">CultureXe</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0d2d3a;">You have a new survey</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#666;">${orgName} · ${assessmentName}</p>

              ${message ? `<p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.6;">${message}</p>` : ''}

              <p style="margin:0 0 32px;font-size:15px;color:#333;line-height:1.6;">
                Your organisation has launched a new culture survey. Your honest feedback helps build a stronger, healthier workplace. The survey takes about 10 minutes to complete.
              </p>

              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#4ecdc4;border-radius:8px;">
                    <a href="${url}" style="display:inline-block;padding:14px 32px;color:#0d2d3a;font-size:15px;font-weight:700;text-decoration:none;">
                      Start Survey →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:32px 0 0;font-size:13px;color:#999;line-height:1.5;">
                This link is unique to you. Please do not forward this email.<br/>
                If the button above doesn't work, copy and paste this URL into your browser:<br/>
                <a href="${url}" style="color:#4ecdc4;word-break:break-all;">${url}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;padding:24px 40px;border-top:1px solid #eee;">
              <p style="margin:0;font-size:12px;color:#aaa;">
                © ${new Date().getFullYear()} CultureXe. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
