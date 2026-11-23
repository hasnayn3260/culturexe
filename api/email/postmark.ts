export type PostmarkEmailCategory =
  | 'accounts'
  | 'notifications'
  | 'surveys'
  | 'reminders'

type PostmarkTrackingMode = 'None' | 'HtmlAndText'

type PostmarkCategoryConfig = {
  fromEnv: string
  streamEnv: string
  defaultStream: string
  trackOpens: boolean
  trackLinks: PostmarkTrackingMode
}

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

export type SurveyInvitationTemplateModel = {
  organisation_name: string
  survey_title: string
  organisation_logo_url: string
  organisation_banner_url: string
  recipient_name: string
  opening_date: string
  closing_date: string
  survey_url: string
  support_email: string
}

export type SurveyReminderTemplateModel = {
  survey_title: string
  closing_date: string
  organisation_logo_url: string
  organisation_name: string
  organisation_banner_url: string
  recipient_name: string
  survey_url: string
  support_email: string
}

export type SurveyReceiptTemplateModel = {
  survey_title: string
  organisation_logo_url: string
  organisation_name: string
  organisation_banner_url: string
  recipient_name: string
  submitted_at: string
  support_email: string
}

type SendPostmarkTemplateEmailInput = {
  category: PostmarkEmailCategory
  to: string
  templateAlias: string
  model: object
  tag?: string
  metadata?: Record<string, string>
  replyTo?: string
}

type SendTemporaryAccessEmailInput = {
  to: string
  model: TemporaryAccessTemplateModel
}

type SendSurveyInvitationEmailInput = {
  to: string
  model: SurveyInvitationTemplateModel
  organisationId: string
  surveyId: string
  respondentId: string
}

type SendSurveyReminderEmailInput = {
  to: string
  model: SurveyReminderTemplateModel
  organisationId: string
  surveyId: string
  respondentId: string
}

type SendSurveyReceiptEmailInput = {
  to: string
  model: SurveyReceiptTemplateModel
  organisationId: string
  surveyId: string
  respondentId: string
  responseId: string
}

type PostmarkTemplateResponse = {
  ErrorCode?: number
  Message?: string
  MessageID?: string
}

const CATEGORY_CONFIG: Record<PostmarkEmailCategory, PostmarkCategoryConfig> = {
  accounts: {
    fromEnv: 'POSTMARK_FROM_ACCOUNTS',
    streamEnv: 'POSTMARK_STREAM_ACCOUNTS',
    defaultStream: 'auth',
    trackOpens: false,
    trackLinks: 'None',
  },
  notifications: {
    fromEnv: 'POSTMARK_FROM_NOTIFICATIONS',
    streamEnv: 'POSTMARK_STREAM_NOTIFICATIONS',
    defaultStream: 'outbound',
    trackOpens: false,
    trackLinks: 'None',
  },
  surveys: {
    fromEnv: 'POSTMARK_FROM_SURVEYS',
    streamEnv: 'POSTMARK_STREAM_SURVEYS',
    defaultStream: 'outbound',
    trackOpens: true,
    trackLinks: 'HtmlAndText',
  },
  reminders: {
    fromEnv: 'POSTMARK_FROM_REMINDERS',
    streamEnv: 'POSTMARK_STREAM_REMINDERS',
    defaultStream: 'outbound',
    trackOpens: true,
    trackLinks: 'HtmlAndText',
  },
}

function env(name: string): string | undefined {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> }
  }

  return runtime.process?.env?.[name]
}

export async function sendPostmarkTemplateEmail({
  category,
  to,
  templateAlias,
  model,
  tag = category,
  metadata = {},
  replyTo,
}: SendPostmarkTemplateEmailInput): Promise<string> {
  const serverToken = env('POSTMARK_SERVER_TOKEN')
  const config = CATEGORY_CONFIG[category]
  const from = env(config.fromEnv)
  const messageStream = env(config.streamEnv) || config.defaultStream
  const resolvedReplyTo = replyTo || env('POSTMARK_REPLY_TO')

  if (!serverToken || !from) {
    throw new Error(
      `Postmark configuration is missing POSTMARK_SERVER_TOKEN or ${config.fromEnv}.`,
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
      ...(resolvedReplyTo ? { ReplyTo: resolvedReplyTo } : {}),
      TemplateAlias: templateAlias,
      TemplateModel: model,
      MessageStream: messageStream,
      Tag: tag,
      TrackOpens: config.trackOpens,
      TrackLinks: config.trackLinks,
      Metadata: {
        email_category: category,
        ...metadata,
      },
    }),
  })

  const body = await response.json().catch(() => null) as PostmarkTemplateResponse | null
  if (!response.ok || body?.ErrorCode) {
    throw new Error(body?.Message || `Postmark could not send the ${category} email.`)
  }
  if (!body?.MessageID) {
    throw new Error('Postmark accepted the request without returning a message ID.')
  }

  return body.MessageID
}

export function sendTemporaryAccessEmail({
  to,
  model,
}: SendTemporaryAccessEmailInput): Promise<string> {
  return sendPostmarkTemplateEmail({
    category: 'accounts',
    to,
    templateAlias: env('POSTMARK_TEMP_ACCESS_TEMPLATE_ALIAS') || 'tempaccess',
    model,
    tag: 'temporary-access',
    metadata: {
      email_type: 'temporary-access',
    },
  })
}

export function sendSurveyInvitationEmail({
  to,
  model,
  organisationId,
  surveyId,
  respondentId,
}: SendSurveyInvitationEmailInput): Promise<string> {
  return sendPostmarkTemplateEmail({
    category: 'surveys',
    to,
    templateAlias: env('POSTMARK_SURVEY_INVITATION_TEMPLATE_ALIAS') || 'survey',
    model,
    tag: 'survey-invitation',
    metadata: {
      email_type: 'survey-invitation',
      organisation_id: organisationId,
      survey_id: surveyId,
      respondent_id: respondentId,
    },
  })
}

export function sendSurveyReminderEmail({
  to,
  model,
  organisationId,
  surveyId,
  respondentId,
}: SendSurveyReminderEmailInput): Promise<string> {
  return sendPostmarkTemplateEmail({
    category: 'reminders',
    to,
    templateAlias: env('POSTMARK_SURVEY_REMINDER_TEMPLATE_ALIAS') || 'reminder',
    model,
    tag: 'survey-reminder',
    metadata: {
      email_type: 'survey-reminder',
      organisation_id: organisationId,
      survey_id: surveyId,
      respondent_id: respondentId,
    },
  })
}

export function sendSurveyReceiptEmail({
  to,
  model,
  organisationId,
  surveyId,
  respondentId,
  responseId,
}: SendSurveyReceiptEmailInput): Promise<string> {
  return sendPostmarkTemplateEmail({
    category: 'notifications',
    to,
    templateAlias: env('POSTMARK_SURVEY_RECEIPT_TEMPLATE_ALIAS') || 'receipt',
    model,
    tag: 'survey-receipt',
    metadata: {
      email_type: 'survey-receipt',
      organisation_id: organisationId,
      survey_id: surveyId,
      respondent_id: respondentId,
      response_id: responseId,
    },
  })
}
