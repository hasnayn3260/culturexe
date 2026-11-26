import assert from 'node:assert/strict'
import test from 'node:test'

import { isPendingSurveyInvitation } from './invitationPolicy.ts'

test('queues an added company user whose invitation has not been sent', () => {
  assert.equal(isPendingSurveyInvitation({
    invited_at: null,
    source: 'assigned',
    submitted_at: null,
  }), true)
})

test('queues a failed direct invitation for retry', () => {
  assert.equal(isPendingSurveyInvitation({
    invited_at: null,
    source: 'invited',
    submitted_at: null,
  }), true)
})

test('does not resend a recorded invitation', () => {
  assert.equal(isPendingSurveyInvitation({
    invited_at: '2026-11-26T10:00:00.000Z',
    source: 'assigned',
    submitted_at: null,
  }), false)
})

test('does not invite completed or open-link respondents', () => {
  assert.equal(isPendingSurveyInvitation({
    invited_at: null,
    source: 'assigned',
    submitted_at: '2026-11-26T10:00:00.000Z',
  }), false)
  assert.equal(isPendingSurveyInvitation({
    invited_at: null,
    source: 'open_link',
    submitted_at: null,
  }), false)
})
