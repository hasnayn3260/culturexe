import assert from 'node:assert/strict'
import test from 'node:test'

import { describeError, stageError } from './errors.ts'

test('replaces an empty object message with the supplied fallback', () => {
  assert.equal(
    describeError(new Error('{}'), 'No further details.'),
    'No further details.',
  )
})

test('retains Supabase Auth type and HTTP status when its message is empty', () => {
  const error = new Error('{}') as Error & { status: number }
  error.name = 'AuthApiError'
  error.status = 403

  assert.equal(
    describeError(error, 'No further details.'),
    'AuthApiError — HTTP 403',
  )
})

test('preserves useful Supabase error fields and codes', () => {
  assert.equal(
    describeError({
      message: 'Duplicate profile',
      details: 'The email already exists.',
      code: '23505',
    }, 'Database failure.'),
    'Duplicate profile — The email already exists. — Code: 23505',
  )
})

test('adds the failed operation to a service error', () => {
  assert.equal(
    stageError('Profile save failed', {}, 'No database details.').message,
    'Profile save failed: No database details.',
  )
})
