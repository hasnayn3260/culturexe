export type ReminderRecipient = {
  invited_at: string | null
  user_id: string | null
  source: string | null
}

export type AutomaticReminderSchedule = {
  reminder_first_send_at: string
  reminder_send_time: string
  reminder_timezone: string
}

export function isReminderRecipientEligible(
  respondent: ReminderRecipient,
): boolean {
  if (respondent.source === 'open_link') return false

  return Boolean(respondent.invited_at)
}

export function firstReminderEligibleAt({
  firstScheduledAt,
  invitedAt,
  frequencyDays,
}: {
  firstScheduledAt: string
  invitedAt: string
  frequencyDays: number
}): number {
  const firstScheduledTime = new Date(firstScheduledAt).getTime()
  const invitedTime = new Date(invitedAt).getTime()
  if (!Number.isFinite(firstScheduledTime)) return Number.NaN
  if (!Number.isFinite(invitedTime) || invitedTime <= firstScheduledTime) {
    return firstScheduledTime
  }

  return invitedTime + frequencyDays * 24 * 60 * 60 * 1_000
}

type LocalDateTime = {
  dateKey: number
  minutes: number
}

function localDateTime(date: Date, timeZone: string): LocalDateTime | null {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date)
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((candidate) => candidate.type === type)?.value)
    const year = part('year')
    const month = part('month')
    const day = part('day')
    const hour = part('hour')
    const minute = part('minute')
    if (![year, month, day, hour, minute].every(Number.isInteger)) return null

    return {
      dateKey: year * 10_000 + month * 100 + day,
      minutes: hour * 60 + minute,
    }
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

export function isAutomaticReminderScheduleDue(
  survey: AutomaticReminderSchedule,
  now: Date,
): boolean {
  const firstSendAt = new Date(survey.reminder_first_send_at)
  const firstSendTime = firstSendAt.getTime()
  if (!Number.isFinite(firstSendTime) || now.getTime() < firstSendTime) {
    return false
  }

  const scheduled = scheduledMinutes(survey.reminder_send_time)
  const firstLocal = localDateTime(firstSendAt, survey.reminder_timezone)
  const currentLocal = localDateTime(now, survey.reminder_timezone)

  // Invalid legacy schedule data must not leave an already-overdue reminder
  // permanently stranded. The saved first-send timestamp remains the fallback.
  if (scheduled === null || firstLocal === null || currentLocal === null) {
    return true
  }

  if (currentLocal.dateKey > firstLocal.dateKey) return true
  if (currentLocal.dateKey < firstLocal.dateKey) return false
  return currentLocal.minutes >= scheduled
}
