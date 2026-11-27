import assert from 'node:assert/strict'
import test from 'node:test'

import { describeError, normaliseApiPayload, stageError } from './errors.ts'

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

test('suppresses an unhandled backend message and adds support metadata', () => {
  const payload = normaliseApiPayload({
    error: 'AuthRetryableFetchError — HTTP 500',
  }, 500) as Record<string, unknown>

  assert.equal(payload.code, 'CXE-SRV-001')
  assert.equal(payload.error, 'Something went wrong while processing your request.')
  assert.match(String(payload.reference), /^CX-/)
})

test('maps duplicate phone failures to a frontend-friendly code', () => {
  const payload = normaliseApiPayload({
    error: 'duplicate key value violates unique phone constraint',
  }, 400) as Record<string, unknown>

  assert.equal(payload.code, 'CXE-DATA-004')
  assert.equal(payload.error, 'An account already uses this phone number.')
})

test('keeps specific safe validation copy for users', () => {
  const payload = normaliseApiPayload({
    error: 'Select at least one organisation user.',
  }, 400) as Record<string, unknown>

  assert.equal(payload.code, 'CXE-VAL-001')
  assert.equal(payload.error, 'Select at least one organisation user.')
})

test('suppresses a technical failed-row message but keeps a support reference', () => {
  const payload = normaliseApiPayload({
    results: [{
      rowNumber: 3,
      email: 'person@example.com',
      status: 'failed',
      message: 'AuthRetryableFetchError — HTTP 500',
    }],
  }, 200) as { results: Array<Record<string, unknown>> }

  assert.equal(payload.results[0].code, 'CXE-SRV-001')
  assert.equal(
    payload.results[0].message,
    'Something went wrong while processing your request.',
  )
  assert.match(String(payload.results[0].reference), /^CX-/)
})
