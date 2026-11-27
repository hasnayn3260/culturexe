import {
  classifyError,
  formatUserError,
  type CultureXeErrorCode,
  type NormalisedError,
} from '../../../shared/errorCatalog.ts'

export type ApiErrorBody = {
  error?: unknown
  message?: unknown
  code?: unknown
  reference?: unknown
  [key: string]: unknown
}

export const CULTUREXE_ERROR_EVENT = 'culturexe:error'

function errorRecord(error: unknown): Record<string, unknown> | null {
  return error && typeof error === 'object'
    ? error as Record<string, unknown>
    : null
}

export function normaliseClientError(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
  suppliedStatus?: number,
): NormalisedError {
  if (error instanceof CultureXeClientError) return error.normalised

  const record = errorRecord(error)
  const rawMessage = typeof error === 'string'
    ? error
    : record?.error ?? record?.message ?? fallback
  const formattedMatch = typeof rawMessage === 'string'
    ? rawMessage.match(/^(.*) \[((?:CXE-[A-Z]+-\d{3})|(?:CX\d{3})) · Ref (CX-[A-Z0-9-]+)\]$/)
    : null
  const status = suppliedStatus ?? (
    typeof record?.status === 'number' ? record.status : undefined
  )
  const normalised = classifyError({
    message: formattedMatch?.[1] ?? rawMessage,
    code: record?.code ?? formattedMatch?.[2],
    reference: record?.reference ?? formattedMatch?.[3],
    status,
  })

  if (normalised.technicalMessage && normalised.message !== normalised.technicalMessage) {
    console.error(`[${normalised.reference}] ${normalised.code}`, error)
  }

  return normalised
}

export function showErrorToast(error: unknown): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CULTUREXE_ERROR_EVENT, { detail: error }))
}

export function reportClientError(
  error: unknown,
  fallback?: string,
  status?: number,
): string {
  const normalised = normaliseClientError(error, fallback, status)
  showErrorToast(normalised)
  return formatUserError(normalised)
}

export function userErrorMessage(
  error: unknown,
  fallback?: string,
  status?: number,
): string {
  return formatUserError(normaliseClientError(error, fallback, status))
}

export class CultureXeClientError extends Error {
  readonly code: CultureXeErrorCode
  readonly reference: string
  readonly status: number | undefined
  readonly normalised: NormalisedError

  constructor(error: unknown, status?: number, fallback?: string) {
    const normalised = normaliseClientError(error, fallback, status)
    super(formatUserError(normalised))
    this.name = 'CultureXeClientError'
    this.code = normalised.code
    this.reference = normalised.reference
    this.status = status
    this.normalised = normalised
  }
}

export function apiClientError(
  body: ApiErrorBody | null,
  status: number,
  fallback: string,
): CultureXeClientError {
  return new CultureXeClientError(body ?? fallback, status, fallback)
}
