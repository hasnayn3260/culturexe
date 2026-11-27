import supabase from '@/lib/supabaseClient'

import type { SurveyTemplateSummary } from '@/features/survey/types'
import {
  CultureXeClientError,
  type ApiErrorBody,
} from '@/lib/errors/normaliseClientError'

const SURVEY_TEMPLATES_ENDPOINT = '/api/survey-templates'

export type SurveyTemplateQuestionType =
  | 'LIKERT'
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'SINGLE_CHOICE'
  | 'MULTI_CHOICE'
  | 'DROPDOWN'
  | 'RATING_SCALE'
  | 'MATRIX'
  | 'DATE'
  | 'TIME'
  | 'FILE'

export type SurveyTemplateQuestion = {
  id: string
  templateId: string
  text: string
  hint: string | null
  questionType: SurveyTemplateQuestionType
  dimension: string | null
  orderNumber: number
  options: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export type SurveyTemplateQuestionInput = {
  text: string
  hint: string | null
  questionType: SurveyTemplateQuestionType
  dimension: string | null
  options: Record<string, unknown> | null
}

export type ManagedSurveyTemplateSummary = SurveyTemplateSummary & {
  active: boolean
  createdBy: string | null
}

export type ManagedSurveyTemplate = ManagedSurveyTemplateSummary & {
  questions: SurveyTemplateQuestion[]
}

export type SurveyTemplateFormValues = {
  organisationId: string | null
  name: string
  description: string | null
  active: boolean
  questions: SurveyTemplateQuestionInput[]
}

export type SurveyTemplateListOptions = {
  organisationId?: string
  activeOnly?: boolean
  signal?: AbortSignal
}

type TemplateApiErrorBody = ApiErrorBody & {
  field?: string | null
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  query?: URLSearchParams
  body?: unknown
  signal?: AbortSignal
}

type TemplatesResponse = {
  templates: ManagedSurveyTemplateSummary[]
}

type TemplateResponse = {
  template: ManagedSurveyTemplate
}

type SummaryResponse = {
  template: ManagedSurveyTemplateSummary
}

type DeleteResponse = {
  id: string
  action: 'delete'
}

export class SurveyTemplatesApiError extends CultureXeClientError {
  readonly field: string | null

  constructor(error: unknown, status: number, field: string | null = null) {
    super(error, status, 'Unable to manage survey templates.')
    this.name = 'SurveyTemplatesApiError'
    this.field = field
  }
}

async function accessToken(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) throw new SurveyTemplatesApiError(error, 401)
  if (!session?.access_token) {
    throw new SurveyTemplatesApiError(
      'Your session has expired. Sign in again.',
      401,
    )
  }

  return session.access_token
}

async function responseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return null

  try {
    return await response.json()
  } catch {
    return null
  }
}

async function templateRequest<T>(
  options: RequestOptions = {},
): Promise<T> {
  const token = await accessToken()
  const queryString = options.query?.toString()
  const endpoint = queryString
    ? `${SURVEY_TEMPLATES_ENDPOINT}?${queryString}`
    : SURVEY_TEMPLATES_ENDPOINT

  const response = await fetch(endpoint, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body === undefined
        ? {}
        : { 'Content-Type': 'application/json' }),
    },
    body: options.body === undefined
      ? undefined
      : JSON.stringify(options.body),
    signal: options.signal,
  })
  const body = await responseBody(response)

  if (!response.ok) {
    const error = body as TemplateApiErrorBody | null
    throw new SurveyTemplatesApiError(
      error ?? 'Unable to manage survey templates.',
      response.status,
      error?.field || null,
    )
  }

  return body as T
}

export async function listSurveyTemplates(
  options: SurveyTemplateListOptions = {},
): Promise<ManagedSurveyTemplateSummary[]> {
  const query = new URLSearchParams()
  if (options.organisationId) {
    query.set('organisationId', options.organisationId)
  }
  if (options.activeOnly) query.set('activeOnly', 'true')

  const response = await templateRequest<TemplatesResponse | null>({
    query,
    signal: options.signal,
  })
  return Array.isArray(response?.templates) ? response.templates : []
}

export async function getSurveyTemplate(
  id: string,
  signal?: AbortSignal,
): Promise<ManagedSurveyTemplate> {
  const response = await templateRequest<TemplateResponse>({
    query: new URLSearchParams({ id }),
    signal,
  })
  return response.template
}

export async function createSurveyTemplate(
  values: SurveyTemplateFormValues,
): Promise<ManagedSurveyTemplate> {
  const response = await templateRequest<TemplateResponse>({
    method: 'POST',
    body: { values },
  })
  return response.template
}

export async function updateSurveyTemplate(
  id: string,
  values: SurveyTemplateFormValues,
): Promise<ManagedSurveyTemplate> {
  const response = await templateRequest<TemplateResponse>({
    method: 'PATCH',
    body: { id, action: 'update', values },
  })
  return response.template
}

export async function setSurveyTemplateActive(
  id: string,
  active: boolean,
): Promise<ManagedSurveyTemplateSummary> {
  const response = await templateRequest<SummaryResponse>({
    method: 'PATCH',
    body: { id, action: 'set-active', active },
  })
  return response.template
}

export async function deleteSurveyTemplate(id: string): Promise<void> {
  await templateRequest<DeleteResponse>({
    method: 'DELETE',
    body: { id, action: 'delete' },
  })
}
