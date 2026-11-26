import assert from 'node:assert/strict'
import test from 'node:test'

import { describeError, stageError } from './errors.ts'

test('replaces an empty object message with the supplied fallback', () => {
  assert.equal(
    describeError(new Error('{}'), 'No further details.'),
    'No further details.',
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
