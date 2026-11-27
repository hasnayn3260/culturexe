const EMPTY_MESSAGES = new Set([
  '',
  '{}',
  '[]',
  'null',
  'undefined',
  '[object object]',
])

function usefulText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const message = value.trim()
  return EMPTY_MESSAGES.has(message.toLowerCase()) ? null : message
}

/**
 * Converts Error, Supabase/PostgREST, Auth and fetch failures into a useful,
 * user-safe message without leaking stacks or serialising them as `{}`.
 */
export function describeError(error: unknown, fallback: string): string {
  const details: string[] = []

  if (typeof error === 'string') {
    const message = usefulText(error)
    if (message) details.push(message)
  }

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>

    for (const key of ['message', 'error', 'details', 'hint', 'description']) {
      const message = usefulText(record[key])
      if (message && !details.includes(message)) details.push(message)
    }

    const code = usefulText(record.code)
    if (code && !details.some((message) => message.includes(code))) {
      details.push(`Code: ${code}`)
    }

    const name = usefulText(record.name)
    if (name && name !== 'Error' && !details.includes(name)) {
      details.push(name)
    }

    if (typeof record.status === 'number') {
      details.push(`HTTP ${record.status}`)
    }

    for (const key of ['cause', 'originalError']) {
      if (key in record && record[key] !== error) {
        const cause = describeError(record[key], '')
        if (cause && !details.includes(cause)) details.push(cause)
      }
    }
  }

  return details.join(' — ') || fallback
}

export function stageError(
  stage: string,
  error: unknown,
  fallback = 'The service did not provide further details.',
): Error {
  return new Error(`${stage}: ${describeError(error, fallback)}`)
}
import {
  classifyError,
  type NormalisedError,
} from '../shared/errorCatalog.ts'


export type ApiErrorPayload = {
  error: string
  message: string
  code: NormalisedError['code']
  reference: string
  [key: string]: unknown
}

function sourceError(data: Record<string, unknown>): unknown {
  const error = data.error ?? data.message
  return typeof error === 'string' ? error : describeError(error, '')
}

function normaliseResultRows(value: unknown): unknown {
  if (!Array.isArray(value)) return value
  return value.map((item) => {
    if (!item || typeof item !== 'object') return item
    const row = item as Record<string, unknown>
    if (row.status !== 'failed' || (!row.error && !row.message)) return item
    const normalised = classifyError({
      message: row.error ?? row.message,
      code: row.code,
      reference: row.reference,
      status: 400,
    })
    if (normalised.technicalMessage && normalised.message !== normalised.technicalMessage) {
      console.error(`[${normalised.reference}] ${normalised.code}`, {
        rowNumber: row.rowNumber,
        technicalMessage: normalised.technicalMessage,
      })
    }
    return {
      ...row,
      message: normalised.message,
      code: normalised.code,
      reference: normalised.reference,
    }
  })
}

/** Adds a stable code and support reference while keeping the legacy `error` field. */
export function normaliseApiPayload(data: unknown, status: number): unknown {
  if (!data || typeof data !== 'object') return data
  const record = data as Record<string, unknown>
  const results = normaliseResultRows(record.results)
  if (!('error' in record) && status < 400) {
    return results === record.results ? data : { ...record, results }
  }

  const normalised = classifyError({
    message: sourceError(record),
    code: record.code,
    reference: record.reference,
    status,
  })

  if (normalised.technicalMessage && normalised.message !== normalised.technicalMessage) {
    console.error(`[${normalised.reference}] ${normalised.code}`, {
      status,
      technicalMessage: normalised.technicalMessage,
    })
  }

  return {
    ...record,
    error: normalised.message,
    message: normalised.message,
    code: normalised.code,
    reference: normalised.reference,
    ...(results === undefined ? {} : { results }),
  } satisfies ApiErrorPayload
}
