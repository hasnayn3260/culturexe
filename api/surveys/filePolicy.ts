export const SURVEY_FILE_BUCKET = 'survey-files'
export const MAX_SURVEY_FILE_BYTES = 10 * 1024 * 1024

export const SURVEY_FILE_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  txt: 'text/plain',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type SurveyFileReference = {
  kind: 'survey_file'
  path: string
  name: string
  contentType: string
  size: number
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

export function safeFileName(value: string): string {
  const baseName = value.split(/[\\/]/).pop() || value
  const normalised = baseName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^\.+/, '')

  return (normalised || 'upload').slice(-120)
}

export function validatedContentType(
  fileName: string,
  suppliedType: string,
): string | null {
  const extension = fileName.split('.').pop()?.toLowerCase() || ''
  const expectedType = MIME_BY_EXTENSION[extension]
  if (!expectedType) return null

  const normalisedType = suppliedType.toLowerCase().split(';', 1)[0].trim()
  if (
    normalisedType &&
    normalisedType !== 'application/octet-stream' &&
    normalisedType !== expectedType
  ) {
    return null
  }

  return expectedType
}

export function buildSurveyFilePath({
  organisationId,
  surveyId,
  respondentId,
  questionId,
  fileName,
  objectId,
}: {
  organisationId: string
  surveyId: string
  respondentId: string
  questionId: string
  fileName: string
  objectId: string
}): string {
  return [
    organisationId,
    surveyId,
    respondentId,
    questionId,
    `${objectId}-${safeFileName(fileName)}`,
  ].join('/')
}

export function fileReference(
  path: string,
  file: { name: string; size: number },
  contentType: string,
): SurveyFileReference {
  return {
    kind: 'survey_file',
    path,
    name: file.name,
    contentType,
    size: file.size,
  }
}

export function pathOwnership(
  path: string,
  respondentId: string,
  questionId: string,
): boolean {
  const parts = path.split('/')
  return (
    parts.length === 5 &&
    parts[2] === respondentId &&
    parts[3] === questionId
  ) || (
    parts.length === 3 &&
    parts[0] === respondentId &&
    parts[1] === questionId
  )
}
