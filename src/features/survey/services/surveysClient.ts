import supabase from '@/lib/supabaseClient'

import type {
  CreateSurveyInput,
  SurveyStoredStatus,
  UpdateSurveyInput,
} from '../types'

const ADMIN_SURVEYS_ENDPOINT = '/api/surveys'

type ApiErrorBody = {
  error?: string
  message?: string
}

type RequestOptions = {
  method?: 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

type SurveyResponse = {
  survey: SurveyMutationResult
}

type DeleteSurveyResponse = {
  id: string
  action: 'delete'
}

export type SurveyMutationResult = {
  id: string
  organisationId: string
  title: string
  description: string | null
  storedStatus: SurveyStoredStatus
  liveStart: string | null
  liveEnd: string | null
  createdAt: string
  updatedAt: string
  openLinkEnabled: boolean
  openLinkToken: string
}

export type CloneSurveyTemplateInput = {
  surveyId: string
  templateId: string
}

export class AdminSurveysApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AdminSurveysApiError'
    this.status = status
  }
}

async function accessToken(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) throw new AdminSurveysApiError(error.message, 401)
  if (!session?.access_token) {
    throw new AdminSurveysApiError(
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

async function surveysRequest<T>({
  method = 'POST',
  body,
  signal,
}: RequestOptions): Promise<T> {
  const token = await accessToken()
  const response = await fetch(ADMIN_SURVEYS_ENDPOINT, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })
  const parsedBody = await responseBody(response)

  if (!response.ok) {
    const errorBody = parsedBody as ApiErrorBody | null
    throw new AdminSurveysApiError(
      errorBody?.error || errorBody?.message || 'Unable to manage surveys.',
      response.status,
    )
  }

  return parsedBody as T
}

export async function createManagedSurvey(
  values: CreateSurveyInput,
  signal?: AbortSignal,
): Promise<SurveyMutationResult> {
  const response = await surveysRequest<SurveyResponse>({
    method: 'POST',
    body: { values },
    signal,
  })

  return response.survey
}

export async function updateManagedSurvey(
  input: UpdateSurveyInput,
  signal?: AbortSignal,
): Promise<SurveyMutationResult> {
  const { id, ...values } = input
  const response = await surveysRequest<SurveyResponse>({
    method: 'PATCH',
    body: { id, action: 'update', values },
    signal,
  })

  return response.survey
}

export async function cloneSurveyTemplateQuestions(
  input: CloneSurveyTemplateInput,
  signal?: AbortSignal,
): Promise<SurveyMutationResult> {
  const response = await surveysRequest<SurveyResponse>({
    method: 'PATCH',
    body: {
      id: input.surveyId,
      action: 'clone-template',
      templateId: input.templateId,
    },
    signal,
  })

  return response.survey
}

export async function deleteManagedSurvey(
  id: string,
  signal?: AbortSignal,
): Promise<void> {
  await surveysRequest<DeleteSurveyResponse>({
    method: 'DELETE',
    body: { id, action: 'delete' },
    signal,
  })
}
