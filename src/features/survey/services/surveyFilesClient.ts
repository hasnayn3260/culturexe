import supabase from '@/lib/supabaseClient'

export const MAX_SURVEY_FILE_BYTES = 10 * 1024 * 1024
export const SURVEY_FILE_ACCEPT = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.txt',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
].join(',')

export type SurveyFileReference = {
  kind: 'survey_file'
  path: string
  name: string
  contentType: string
  size: number
}

type UploadAuthorisation = {
  path: string
  token: string
  reference: SurveyFileReference
}

async function responseError(response: Response, fallback: string): Promise<Error> {
  try {
    const body = await response.json() as { error?: unknown }
    if (typeof body.error === 'string' && body.error.trim()) {
      return new Error(body.error.trim())
    }
  } catch {
    // Use the caller's stable fallback when the service did not return JSON.
  }
  return new Error(fallback)
}

export function surveyFilePath(value: unknown): string | null {
  if (
    value &&
    typeof value === 'object' &&
    'path' in value &&
    typeof value.path === 'string'
  ) {
    return value.path
  }
  if (typeof value !== 'string' || !value.trim()) return null

  const marker = '/storage/v1/object/public/survey-files/'
  const markerIndex = value.indexOf(marker)
  if (markerIndex >= 0) {
    const encodedPath = value.slice(markerIndex + marker.length).split('?', 1)[0]
    try {
      return decodeURIComponent(encodedPath)
    } catch {
      return encodedPath
    }
  }

  return value.startsWith('http://') || value.startsWith('https://')
    ? null
    : value.replace(/^\/+/, '')
}

export function surveyFileName(value: unknown, fallback = 'File uploaded'): string {
  if (
    value &&
    typeof value === 'object' &&
    'name' in value &&
    typeof value.name === 'string' &&
    value.name.trim()
  ) {
    return value.name
  }

  const path = surveyFilePath(value)
  if (!path) return fallback
  const objectName = path.split('/').pop() || fallback
  return objectName
    .replace(/^\d+_/, '')
    .replace(/^[0-9a-f]{8}-[0-9a-f-]{27,}-/i, '')
}

function validateFile(file: File): void {
  if (file.size <= 0) throw new Error('The selected file is empty.')
  if (file.size > MAX_SURVEY_FILE_BYTES) {
    throw new Error('The selected file is larger than the 10 MB limit.')
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  const allowed = new Set([
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt',
    'jpg', 'jpeg', 'png', 'webp',
  ])
  if (!allowed.has(extension)) {
    throw new Error('Upload a PDF, Word, Excel, CSV, text, JPEG, PNG or WebP file.')
  }
}

export async function uploadSurveyFile({
  file,
  respondentToken,
  questionId,
  previousValue,
}: {
  file: File
  respondentToken: string
  questionId: string
  previousValue?: unknown
}): Promise<SurveyFileReference> {
  validateFile(file)

  const authorisationResponse = await fetch('/api/surveys/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      respondentToken,
      questionId,
      fileName: file.name,
      contentType: file.type,
      size: file.size,
    }),
  })
  if (!authorisationResponse.ok) {
    throw await responseError(authorisationResponse, 'The file upload could not be authorised.')
  }

  const authorisation = await authorisationResponse.json() as UploadAuthorisation
  const { error } = await supabase.storage
    .from('survey-files')
    .uploadToSignedUrl(authorisation.path, authorisation.token, file, {
      contentType: authorisation.reference.contentType,
      cacheControl: '3600',
    })
  if (error) throw error

  const previousPath = surveyFilePath(previousValue)
  if (previousPath && previousPath !== authorisation.path) {
    void fetch('/api/surveys/files', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ respondentToken, questionId, path: previousPath }),
    })
  }

  return authorisation.reference
}

export async function signedSurveyFileUrl(value: unknown): Promise<string> {
  const path = surveyFilePath(value)
  if (!path) throw new Error('The survey file reference is invalid.')

  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('Sign in again to open this survey file.')

  const response = await fetch(
    `/api/surveys/files?path=${encodeURIComponent(path)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!response.ok) {
    throw await responseError(response, 'The survey file could not be opened.')
  }

  const body = await response.json() as { url?: unknown }
  if (typeof body.url !== 'string' || !body.url) {
    throw new Error('The survey file service did not return a download link.')
  }
  return body.url
}
