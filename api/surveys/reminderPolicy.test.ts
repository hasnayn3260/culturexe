import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isInReminderDeliveryWindow,
  isReminderRecipientEligible,
} from './reminderPolicy.ts'

test('includes respondents invited directly by email', () => {
  assert.equal(isReminderRecipientEligible({
    invited_at: '2026-11-26T08:00:00.000Z',
    user_id: null,
    source: 'invited',
  }), true)
})

test('includes company users added to the survey', () => {
  assert.equal(isReminderRecipientEligible({
    invited_at: null,
    user_id: '861f5df0-ba23-4624-bc8c-c75745329472',
    source: 'assigned',
  }), true)
})

test('excludes anonymous open-link respondents', () => {
  assert.equal(isReminderRecipientEligible({
    invited_at: null,
    user_id: null,
    source: 'open_link',
  }), false)
})

test('excludes open-link respondents even when an account is linked', () => {
  assert.equal(isReminderRecipientEligible({
    invited_at: null,
    user_id: '861f5df0-ba23-4624-bc8c-c75745329472',
    source: 'open_link',
  }), false)
})

test('excludes uninvited respondents without a linked company user', () => {
  assert.equal(isReminderRecipientEligible({
    invited_at: null,
    user_id: null,
    source: null,
  }), false)
})

test('uses the configured survey timezone for the delivery window', () => {
  const survey = {
    reminder_send_time: '11:50:00',
    reminder_timezone: 'Africa/Johannesburg',
  }

  assert.equal(
    isInReminderDeliveryWindow(survey, new Date('2026-11-26T09:50:00.000Z')),
    true,
  )
  assert.equal(
    isInReminderDeliveryWindow(survey, new Date('2026-11-26T09:59:00.000Z')),
    true,
  )
  assert.equal(
    isInReminderDeliveryWindow(survey, new Date('2026-11-26T10:00:00.000Z')),
    false,
  )
})

test('handles reminder windows across midnight', () => {
  const survey = {
    reminder_send_time: '23:58:00',
    reminder_timezone: 'Africa/Johannesburg',
  }

  assert.equal(
    isInReminderDeliveryWindow(survey, new Date('2026-11-26T22:03:00.000Z')),
    true,
  )
})

test('rejects invalid reminder times and timezones', () => {
  const now = new Date('2026-11-26T09:50:00.000Z')

  assert.equal(isInReminderDeliveryWindow({
    reminder_send_time: '25:99',
    reminder_timezone: 'Africa/Johannesburg',
  }, now), false)
  assert.equal(isInReminderDeliveryWindow({
    reminder_send_time: '11:50',
    reminder_timezone: 'Not/A_Timezone',
  }, now), false)
})
