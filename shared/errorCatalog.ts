export const ERROR_CATALOG = {
  'CXE-AUTH-001': 'Please sign in to continue.',
  'CXE-AUTH-002': 'Your session has expired. Please sign in again.',
  'CXE-AUTH-003': 'You do not have permission to perform this action.',
  'CXE-VAL-001': 'Some information is invalid. Check the highlighted fields and try again.',
  'CXE-DATA-001': 'The requested record could not be found.',
  'CXE-DATA-002': 'This change conflicts with existing information.',
  'CXE-DATA-003': 'An account already uses this email address.',
  'CXE-DATA-004': 'An account already uses this phone number.',
  'CXE-DATA-005': 'The email address must match the organisation’s configured domain.',
  'CXE-DATA-006': 'The selected manager could not be found in this organisation.',
  'CXE-SUR-001': 'This survey link is invalid or has expired.',
  'CXE-SUR-002': 'This survey is not currently accepting responses.',
  'CXE-SUR-003': 'This survey has already been submitted.',
  'CXE-EMAIL-001': 'The email could not be sent. Please try again shortly.',
  'CXE-FILE-001': 'The file could not be processed. Check the file and try again.',
  'CXE-NET-001': 'The service could not be reached. Check your connection and try again.',
  'CXE-RATE-001': 'Too many requests were made. Wait a moment and try again.',
  'CXE-SRV-001': 'Something went wrong while processing your request.',
  'CXE-UNK-001': 'Something went wrong. Please try again.',
  CX001: 'This survey link is incomplete. Please reopen the link from your email.',
  CX002: 'Your progress could not be saved because the answer data is invalid.',
  CX003: 'Your saved progress is too large. Please contact support.',
  CX004: 'This survey link is invalid or has expired.',
  CX005: 'This survey has already been submitted.',
  CX006: 'This survey is closed and is no longer accepting responses.',
  CX007: 'This survey visit could not be recorded. Please refresh the page.',
} as const

export type CultureXeErrorCode = keyof typeof ERROR_CATALOG

export type NormalisedError = {
  code: CultureXeErrorCode
  message: string
  reference: string
  technicalMessage?: string
}

const TECHNICAL_MESSAGE_PATTERN = /(?:postgres|postgrest|supabase|authretryable|fetcherror|sqlstate|violates|constraint|stack|\{\}|\[object object\]|http\s*5\d\d)/i

export function isCultureXeErrorCode(value: unknown): value is CultureXeErrorCode {
  return typeof value === 'string' && value in ERROR_CATALOG
}

export function createErrorReference(): string {
  const value = globalThis.crypto?.randomUUID?.()
    || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `CX-${value.split('-')[0].toUpperCase()}`
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function classifyError(input: {
  message?: unknown
  code?: unknown
  status?: unknown
  reference?: unknown
}): NormalisedError {
  const technicalMessage = text(input.message)
  const sourceCode = text(input.code)
  const status = typeof input.status === 'number' ? input.status : null
  const lower = technicalMessage.toLowerCase()
  let code: CultureXeErrorCode

  if (isCultureXeErrorCode(sourceCode)) code = sourceCode
  else if (/phone/.test(lower) && /(already|duplicate|unique)/.test(lower)) code = 'CXE-DATA-004'
  else if (/email/.test(lower) && /(already|duplicate|unique)/.test(lower)) code = 'CXE-DATA-003'
  else if (/email.*domain|domain.*email/.test(lower)) code = 'CXE-DATA-005'
  else if (/manager/.test(lower) && /(not found|could not be found|organisation)/.test(lower)) code = 'CXE-DATA-006'
  else if (/survey/.test(lower) && /(already.*submit|has already been submitted)/.test(lower)) code = 'CXE-SUR-003'
  else if (/survey/.test(lower) && /(not.*accept|closed|not live)/.test(lower)) code = 'CXE-SUR-002'
  else if (/survey/.test(lower) && /(invalid|expired).*(link|token)|(?:link|token).*(invalid|expired)/.test(lower)) code = 'CXE-SUR-001'
  else if (/(postmark|email).*(send|deliver|failed)|(?:send|deliver).*email/.test(lower)) code = 'CXE-EMAIL-001'
  else if (/file|upload/.test(lower)) code = 'CXE-FILE-001'
  else if (sourceCode === '23505') code = 'CXE-DATA-002'
  else if (sourceCode === '23503' || sourceCode === '23514') code = 'CXE-VAL-001'
  else if (/^(?:PGRST|AUTH)/i.test(sourceCode)) code = 'CXE-SRV-001'
  else if (status === 401) code = /expired|session/.test(lower) ? 'CXE-AUTH-002' : 'CXE-AUTH-001'
  else if (status === 403) code = 'CXE-AUTH-003'
  else if (status === 404) code = 'CXE-DATA-001'
  else if (status === 409) code = 'CXE-DATA-002'
  else if (status === 429) code = 'CXE-RATE-001'
  else if (status !== null && status >= 500) code = 'CXE-SRV-001'
  else if (/failed to fetch|network|load failed|offline/.test(lower)) code = 'CXE-NET-001'
  else if (TECHNICAL_MESSAGE_PATTERN.test(technicalMessage)) code = 'CXE-SRV-001'
  else if (status !== null && status >= 400 && status < 500) code = 'CXE-VAL-001'
  else if (technicalMessage) code = 'CXE-VAL-001'
  else code = 'CXE-UNK-001'

  const mayUseOriginalMessage = (status === null || (status >= 400 && status < 500)) &&
    technicalMessage.length > 0 && !TECHNICAL_MESSAGE_PATTERN.test(technicalMessage)

  return {
    code,
    message: mayUseOriginalMessage ? technicalMessage : ERROR_CATALOG[code],
    reference: text(input.reference) || createErrorReference(),
    ...(technicalMessage ? { technicalMessage } : {}),
  }
}

export function formatUserError(error: Pick<NormalisedError, 'code' | 'message' | 'reference'>): string {
  return `${error.message} [${error.code} · Ref ${error.reference}]`
}
