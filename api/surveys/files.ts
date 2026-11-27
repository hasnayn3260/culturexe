import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { normaliseApiPayload } from '../errors.js'
import {
  buildSurveyFilePath,
  fileReference,
  isUuid,
  MAX_SURVEY_FILE_BYTES,
  pathOwnership,
  SURVEY_FILE_BUCKET,
  validatedContentType,
} from './filePolicy.js'

type RespondentRow = {
  id: string
  survey_id: string
  user_id: string | null
  email: string | null
  used: boolean
  submitted_at: string | null
}

type SurveyRow = {
  id: string
  org_id: string
}

type FileRequestBody = {
  respondentToken?: unknown
  questionId?: unknown
  fileName?: unknown
  contentType?: unknown
  size?: unknown
  path?: unknown
}

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

function adminClient(): SupabaseClient {
  const supabaseUrl = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
  const serviceKey =
    env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'Server configuration is missing SUPABASE_URL and SUPABASE_SECRET_KEY.',
    )
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function bearerToken(request: Request): string | null {
  const match = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

async function readBody(request: Request): Promise<FileRequestBody> {
  try {
    return await request.json() as FileRequestBody
  } catch {
    throw new Error('Request body must be valid JSON.')
  }
}

function storagePath(value: string): string {
  const markers = [
    `/storage/v1/object/public/${SURVEY_FILE_BUCKET}/`,
    `/storage/v1/object/sign/${SURVEY_FILE_BUCKET}/`,
  ]

  for (const marker of markers) {
    const index = value.indexOf(marker)
    if (index >= 0) {
      const remainder = value.slice(index + marker.length).split('?', 1)[0]
      try {
        return decodeURIComponent(remainder)
      } catch {
        return remainder
      }
    }
  }

  return value.replace(/^\/+/, '').split('?', 1)[0]
}

async function respondentForToken(
  admin: SupabaseClient,
  token: string,
): Promise<RespondentRow | null> {
  if (!isUuid(token)) return null

  const { data, error } = await admin
    .from('survey_respondents')
    .select('id, survey_id, user_id, email, used, submitted_at')
    .eq('token', token)
    .maybeSingle()

  if (error) throw error
  return data as RespondentRow | null
}

async function surveyForRespondent(
  admin: SupabaseClient,
  respondent: Pick<RespondentRow, 'survey_id'>,
): Promise<SurveyRow | null> {
  const { data, error } = await admin
    .from('survey')
    .select('id, org_id')
    .eq('id', respondent.survey_id)
    .maybeSingle()

  if (error) throw error
  return data as SurveyRow | null
}

async function validateFileQuestion(
  admin: SupabaseClient,
  surveyId: string,
  questionId: string,
): Promise<boolean> {
  if (!isUuid(questionId)) return false

  const { data, error } = await admin
    .from('survey_questions')
    .select('id')
    .eq('id', questionId)
    .eq('survey_id', surveyId)
    .eq('question_type', 'FILE')
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

async function acceptingResponses(
  admin: SupabaseClient,
  respondent: RespondentRow,
): Promise<boolean> {
  const { data, error } = await admin.rpc('survey_accepting_responses', {
    p_survey_id: respondent.survey_id,
    p_respondent_id: respondent.id,
  })
  if (error) throw error
  return data === true
}

async function handleUploadRequest(request: Request): Promise<Response> {
  const body = await readBody(request)
  const respondentToken = text(body.respondentToken)
  const questionId = text(body.questionId)
  const fileName = text(body.fileName)
  const suppliedType = text(body.contentType)
  const size = typeof body.size === 'number' ? body.size : Number.NaN

  if (!respondentToken || !questionId || !fileName) {
    return json({ error: 'The respondent, question and file are required.' }, 400)
  }
  if (!Number.isInteger(size) || size <= 0 || size > MAX_SURVEY_FILE_BYTES) {
    return json({ error: 'Files must be larger than 0 bytes and no more than 10 MB.' }, 400)
  }

  const contentType = validatedContentType(fileName, suppliedType)
  if (!contentType) {
    return json({
      error: 'Upload a PDF, Word, Excel, CSV, text, JPEG, PNG or WebP file.',
    }, 400)
  }

  const admin = adminClient()
  const respondent = await respondentForToken(admin, respondentToken)
  if (!respondent) return json({ error: 'This survey response link is invalid.' }, 404)
  if (respondent.used || respondent.submitted_at) {
    return json({ error: 'Files cannot be changed after the survey is submitted.' }, 409)
  }
  if (!await acceptingResponses(admin, respondent)) {
    return json({ error: 'This survey is not currently accepting responses.' }, 409)
  }
  if (!await validateFileQuestion(admin, respondent.survey_id, questionId)) {
    return json({ error: 'Select a valid file-upload question.' }, 400)
  }

  const survey = await surveyForRespondent(admin, respondent)
  if (!survey) return json({ error: 'The survey could not be found.' }, 404)

  const path = buildSurveyFilePath({
    organisationId: survey.org_id,
    surveyId: survey.id,
    respondentId: respondent.id,
    questionId,
    fileName,
    objectId: crypto.randomUUID(),
  })
  const { data, error } = await admin.storage
    .from(SURVEY_FILE_BUCKET)
    .createSignedUploadUrl(path)

  if (error) throw error
  return json({
    path,
    token: data.token,
    reference: fileReference(path, { name: fileName, size }, contentType),
  }, 201)
}

async function handleDelete(request: Request): Promise<Response> {
  const body = await readBody(request)
  const respondentToken = text(body.respondentToken)
  const questionId = text(body.questionId)
  const path = storagePath(text(body.path))
  const admin = adminClient()
  const respondent = await respondentForToken(admin, respondentToken)

  if (!respondent) return json({ error: 'This survey response link is invalid.' }, 404)
  if (respondent.used || respondent.submitted_at) {
    return json({ error: 'Files cannot be removed after the survey is submitted.' }, 409)
  }
  if (!await acceptingResponses(admin, respondent)) {
    return json({ error: 'This survey is not currently accepting responses.' }, 409)
  }
  if (!await validateFileQuestion(admin, respondent.survey_id, questionId)) {
    return json({ error: 'Select a valid file-upload question.' }, 400)
  }
  if (!pathOwnership(path, respondent.id, questionId)) {
    return json({ error: 'The file does not belong to this response field.' }, 403)
  }

  const { error } = await admin.storage.from(SURVEY_FILE_BUCKET).remove([path])
  if (error) throw error
  return json({ path, deleted: true })
}

async function requireFileReader(request: Request, path: string) {
  const token = bearerToken(request)
  if (!token) return { ok: false as const, response: json({ error: 'Authentication required.' }, 401) }

  const admin = adminClient()
  const { data: authData, error: authError } = await admin.auth.getUser(token)
  const user = authData.user
  if (authError || !user) {
    return { ok: false as const, response: json({ error: 'Your session is invalid or expired.' }, 401) }
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role, active')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError) throw profileError
  if (profile?.active === false) {
    return { ok: false as const, response: json({ error: 'This account is inactive.' }, 403) }
  }

  const parts = path.split('/')
  const respondentId = parts.length === 5 ? parts[2] : parts.length === 3 ? parts[0] : ''
  const questionId = parts.length === 5 ? parts[3] : parts.length === 3 ? parts[1] : ''
  if (!isUuid(respondentId) || !isUuid(questionId)) {
    return { ok: false as const, response: json({ error: 'The file path is invalid.' }, 400) }
  }

  const { data, error } = await admin
    .from('survey_respondents')
    .select('id, survey_id, user_id, email')
    .eq('id', respondentId)
    .maybeSingle()
  if (error) throw error
  const respondent = data as Pick<RespondentRow, 'id' | 'survey_id' | 'user_id' | 'email'> | null
  if (!respondent) {
    return { ok: false as const, response: json({ error: 'The survey file was not found.' }, 404) }
  }

  const survey = await surveyForRespondent(admin, respondent)
  const pathMatchesSurvey = parts.length === 3 || (
    survey && parts[0] === survey.org_id && parts[1] === survey.id
  )
  if (!survey || !pathMatchesSurvey || !pathOwnership(path, respondent.id, questionId)) {
    return { ok: false as const, response: json({ error: 'The survey file path is invalid.' }, 403) }
  }

  const staffRoles = new Set(['admin', 'consultant', 'superadmin'])
  const ownsResponse = respondent.user_id === user.id || (
    respondent.email && user.email &&
    respondent.email.toLowerCase() === user.email.toLowerCase()
  )
  if (!staffRoles.has(profile?.role || '') && !ownsResponse) {
    return { ok: false as const, response: json({ error: 'You cannot access this survey file.' }, 403) }
  }

  return { ok: true as const, admin }
}

async function handleSignedRead(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const path = storagePath(url.searchParams.get('path') || '')
  if (!path) return json({ error: 'A survey file path is required.' }, 400)

  const auth = await requireFileReader(request, path)
  if (!auth.ok) return auth.response

  const fileName = path.split('/').pop() || 'survey-file'
  const { data, error } = await auth.admin.storage
    .from(SURVEY_FILE_BUCKET)
    .createSignedUrl(path, 60, { download: fileName })
  if (error) throw error

  return json({ url: data.signedUrl, expiresIn: 60 })
}

async function route(request: Request): Promise<Response> {
  try {
    switch (request.method) {
      case 'POST':
        return await handleUploadRequest(request)
      case 'DELETE':
        return await handleDelete(request)
      case 'GET':
        return await handleSignedRead(request)
      default:
        return json({ error: 'Method not allowed.' }, 405)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.'
    console.error('survey files API error', error)
    return json({ error: message }, message.includes('valid JSON') ? 400 : 500)
  }
}

export default { fetch: route }
