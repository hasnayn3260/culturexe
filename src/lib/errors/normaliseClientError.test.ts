import assert from 'node:assert/strict'
import test from 'node:test'

import {
  apiClientError,
  normaliseClientError,
  userErrorMessage,
} from './normaliseClientError.ts'

test('uses backend code and reference in the user-facing message', () => {
  const error = apiClientError({
    error: 'An account already uses this phone number.',
    code: 'CXE-DATA-004',
    reference: 'CX-TEST1234',
  }, 400, 'Unable to save the user.')

  assert.equal(error.code, 'CXE-DATA-004')
  assert.equal(error.reference, 'CX-TEST1234')
  assert.match(error.message, /CXE-DATA-004 · Ref CX-TEST1234/)
})

test('suppresses raw server details when the backend is not normalised', () => {
  const error = normaliseClientError(
    new Error('AuthRetryableFetchError HTTP 500'),
    'Unable to complete the request.',
    500,
  )

  assert.equal(error.code, 'CXE-SRV-001')
  assert.doesNotMatch(userErrorMessage(error), /AuthRetryableFetchError/)
})

test('keeps safe local validation text and adds a support reference', () => {
  const message = userErrorMessage(new Error('Select at least one user.'))
  assert.match(message, /^Select at least one user\./)
  assert.match(message, /CXE-VAL-001 · Ref CX-/)
})
