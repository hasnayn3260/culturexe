import assert from 'node:assert/strict'
import test from 'node:test'

import {
  firstReminderEligibleAt,
  isAutomaticReminderScheduleDue,
  isReminderRecipientEligible,
} from './reminderPolicy.ts'

test('includes respondents invited directly by email', () => {
  assert.equal(isReminderRecipientEligible({
    invited_at: '2026-11-26T08:00:00.000Z',
    user_id: null,
    source: 'invited',
  }), true)
})

test('includes company users after their invitation has been sent', () => {
  assert.equal(isReminderRecipientEligible({
    invited_at: '2026-11-26T08:00:00.000Z',
    user_id: '861f5df0-ba23-4624-bc8c-c75745329472',
    source: 'assigned',
  }), true)
})

test('does not send a reminder before an added user receives an invitation', () => {
  assert.equal(isReminderRecipientEligible({
    invited_at: null,
    user_id: '861f5df0-ba23-4624-bc8c-c75745329472',
    source: 'assigned',
  }), false)
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

test('waits for the configured local send time on the first reminder day', () => {
  const schedule = {
    reminder_first_send_at: '2026-11-26T09:47:00.000Z',
    reminder_send_time: '11:50:00',
    reminder_timezone: 'Africa/Johannesburg',
  }

  assert.equal(
    isAutomaticReminderScheduleDue(
      schedule,
      new Date('2026-11-26T09:49:00.000Z'),
    ),
    false,
  )
  assert.equal(
    isAutomaticReminderScheduleDue(
      schedule,
      new Date('2026-11-26T09:50:00.000Z'),
    ),
    true,
  )
})

test('keeps a missed reminder due after its send-time window has passed', () => {
  const schedule = {
    reminder_first_send_at: '2026-11-26T09:47:00.000Z',
    reminder_send_time: '11:50:00',
    reminder_timezone: 'Africa/Johannesburg',
  }

  assert.equal(
    isAutomaticReminderScheduleDue(
      schedule,
      new Date('2026-11-26T13:30:00.000Z'),
    ),
    true,
  )
  assert.equal(
    isAutomaticReminderScheduleDue(
      schedule,
      new Date('2026-11-27T05:00:00.000Z'),
    ),
    true,
  )
})

test('never sends before the saved first reminder timestamp', () => {
  assert.equal(isAutomaticReminderScheduleDue({
    reminder_first_send_at: '2026-11-26T10:00:00.000Z',
    reminder_send_time: '11:50:00',
    reminder_timezone: 'Africa/Johannesburg',
  }, new Date('2026-11-26T09:59:00.000Z')), false)
})

test('delays the first reminder when its invitation was sent late', () => {
  assert.equal(firstReminderEligibleAt({
    firstScheduledAt: '2026-11-26T09:50:00.000Z',
    invitedAt: '2026-11-26T10:20:00.000Z',
    frequencyDays: 1,
  }), new Date('2026-11-27T10:20:00.000Z').getTime())
})

test('keeps the configured first reminder when invitation arrived on time', () => {
  assert.equal(firstReminderEligibleAt({
    firstScheduledAt: '2026-11-26T09:50:00.000Z',
    invitedAt: '2026-11-26T08:00:00.000Z',
    frequencyDays: 1,
  }), new Date('2026-11-26T09:50:00.000Z').getTime())
})
