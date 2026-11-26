export type ReminderRecipient = {
  invited_at: string | null
  user_id: string | null
  source: string | null
}

export type ReminderSchedule = {
  reminder_send_time: string
  reminder_timezone: string
}

export const REMINDER_DELIVERY_WINDOW_MINUTES = 10

export function isReminderRecipientEligible(
  respondent: ReminderRecipient,
): boolean {
  if (respondent.source === 'open_link') return false

  return Boolean(respondent.invited_at || respondent.user_id)
}

function localMinutes(date: Date, timeZone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date)
    const hour = Number(parts.find(({ type }) => type === 'hour')?.value)
    const minute = Number(parts.find(({ type }) => type === 'minute')?.value)
    return Number.isInteger(hour) && Number.isInteger(minute)
      ? hour * 60 + minute
      : null
  } catch {
    return null
  }
}

function scheduledMinutes(value: string): number | null {
  const match = value.match(/^(\d{2}):(\d{2})/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
    ? hour * 60 + minute
    : null
}

export function isInReminderDeliveryWindow(
  survey: ReminderSchedule,
  now: Date,
): boolean {
  const current = localMinutes(now, survey.reminder_timezone)
  const scheduled = scheduledMinutes(survey.reminder_send_time)
  if (current === null || scheduled === null) return false

  const minutesSinceScheduled = (current - scheduled + 24 * 60) % (24 * 60)
  return minutesSinceScheduled < REMINDER_DELIVERY_WINDOW_MINUTES
}
