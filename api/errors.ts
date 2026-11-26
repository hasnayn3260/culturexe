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

    if (details.length === 0 && 'cause' in record && record.cause !== error) {
      const cause = describeError(record.cause, '')
      if (cause) details.push(cause)
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
