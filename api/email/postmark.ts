type TemporaryAccessTemplateModel = {
  organisation_name: string
  organisation_logo_url: string
  organisation_banner_url: string
  recipient_name: string
  username: string
  temporary_password: string
  invite_url: string
  support_email: string
}

type SendTemporaryAccessEmailInput = {
  to: string
  model: TemporaryAccessTemplateModel
}

type PostmarkTemplateResponse = {
  ErrorCode?: number
  Message?: string
  MessageID?: string
}

function env(name: string): string | undefined {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> }
  }

  return runtime.process?.env?.[name]
}

export async function sendTemporaryAccessEmail({
  to,
  model,
}: SendTemporaryAccessEmailInput): Promise<string> {
  const serverToken = env('POSTMARK_SERVER_TOKEN')
  const from = env('POSTMARK_FROM_EMAIL')
  const templateAlias = env('POSTMARK_TEMP_ACCESS_TEMPLATE_ALIAS') || 'tempaccess'

  if (!serverToken || !from) {
    throw new Error(
      'Postmark configuration is missing POSTMARK_SERVER_TOKEN or POSTMARK_FROM_EMAIL.',
    )
  }

  const response = await fetch('https://api.postmarkapp.com/email/withTemplate', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': serverToken,
    },
    body: JSON.stringify({
      From: from,
      To: to,
      TemplateAlias: templateAlias,
      TemplateModel: model,
      MessageStream: env('POSTMARK_MESSAGE_STREAM') || 'outbound',
      Tag: 'temporary-access',
      TrackOpens: false,
      TrackLinks: 'None',
      Metadata: {
        email_type: 'temporary-access',
      },
    }),
  })

  const body = await response.json().catch(() => null) as PostmarkTemplateResponse | null
  if (!response.ok || body?.ErrorCode) {
    throw new Error(body?.Message || 'Postmark could not send the temporary-access email.')
  }
  if (!body?.MessageID) {
    throw new Error('Postmark accepted the request without returning a message ID.')
  }

  return body.MessageID
}
