import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BellRing,
  CalendarClock,
  Check,
  Clock3,
  LoaderCircle,
  Mail,
  MessageSquareText,
  Save,
  Settings2,
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import type { SurveyLifecycleStatus } from '../utils/surveyStatus'

export type SurveySettingsRecord = {
  id: string
  title: string
  description: string | null
  live_start: string | null
  live_end: string | null
  reminders_enabled: boolean
  reminder_first_send_at: string | null
  reminder_frequency_days: number
  reminder_send_time: string
  reminder_timezone: string
  reminder_max_sends: number
  email_invitations_enabled: boolean
  email_reminders_enabled: boolean
  email_receipts_enabled: boolean
  sms_invitations_enabled: boolean
  sms_reminders_enabled: boolean
  sms_receipts_enabled: boolean
}

export type SurveySettingsUpdate = Partial<
  Omit<SurveySettingsRecord, 'id'>
>

type SurveySettingsPanelProps = {
  survey: SurveySettingsRecord
  effectiveStatus: SurveyLifecycleStatus
  onSave: (updates: SurveySettingsUpdate) => Promise<unknown> | unknown
}

type SettingsForm = {
  title: string
  description: string
  liveStart: string
  liveEnd: string
  remindersEnabled: boolean
  reminderFirstSendAt: string
  reminderFrequencyDays: string
  reminderSendTime: string
  reminderTimezone: string
  reminderMaxSends: string
  emailInvitationsEnabled: boolean
  emailRemindersEnabled: boolean
  emailReceiptsEnabled: boolean
}

type FormErrors = Partial<Record<
  'title' | 'description' | 'liveStart' | 'liveEnd' | 'reminderFirstSendAt' |
  'reminderFrequencyDays' | 'reminderMaxSends' | 'channels',
  string
>>

const fieldClassName =
  'h-11 rounded-xl border-[#DCE4EE] bg-white px-3 text-sm text-[#0D1F3C] placeholder:text-[#9AA9BC] focus-visible:border-[#1BBFB0] focus-visible:ring-[#1BBFB0]/20 aria-invalid:border-[#D94A3A] aria-invalid:ring-[#D94A3A]/15'

const timezoneOptions = [
  'Africa/Johannesburg',
  'Africa/Windhoek',
  'Africa/Gaborone',
  'Africa/Maputo',
  'Africa/Lusaka',
  'Africa/Harare',
  'Africa/Nairobi',
  'UTC',
]

function toLocalDateTime(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function toIsoDateTime(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function normalizedTime(value: string): string {
  return /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value
}

function settingsForm(survey: SurveySettingsRecord): SettingsForm {
  return {
    title: survey.title,
    description: survey.description || '',
    liveStart: toLocalDateTime(survey.live_start),
    liveEnd: toLocalDateTime(survey.live_end),
    remindersEnabled: survey.reminders_enabled,
    reminderFirstSendAt: toLocalDateTime(survey.reminder_first_send_at),
    reminderFrequencyDays: String(survey.reminder_frequency_days),
    reminderSendTime: survey.reminder_send_time.slice(0, 5),
    reminderTimezone: survey.reminder_timezone,
    reminderMaxSends: String(survey.reminder_max_sends),
    emailInvitationsEnabled: survey.email_invitations_enabled,
    emailRemindersEnabled: survey.email_reminders_enabled,
    emailReceiptsEnabled: survey.email_receipts_enabled,
  }
}

function messageFrom(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The survey settings could not be saved.'
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-[#D94A3A]">{message}</p> : null
}

function ChannelToggle({
  checked,
  disabled = false,
  label,
  description,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  description: string
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[#E1E8EF] bg-white p-3.5">
      <div className="min-w-0">
        <div className="text-sm font-bold text-[#0D1F3C]">{label}</div>
        <div className="mt-0.5 text-xs leading-5 text-[#8A9BB0]">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-45 ${
          checked ? 'bg-[#1BBFB0]' : 'bg-[#CBD5E1]'
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

export default function SurveySettingsPanel({
  survey,
  effectiveStatus,
  onSave,
}: SurveySettingsPanelProps) {
  const [form, setForm] = useState<SettingsForm>(() => settingsForm(survey))
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error'
    message: string
  } | null>(null)

  const initialForm = useMemo(() => settingsForm(survey), [survey])
  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm)
  const scheduleLocked = effectiveStatus !== 'draft'
  const settingsLocked = effectiveStatus === 'closed'

  useEffect(() => {
    setForm(initialForm)
    setErrors({})
    setFeedback(null)
  }, [initialForm])

  function update<K extends keyof SettingsForm>(field: K, value: SettingsForm[K]) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setFeedback(null)
  }

  function validate(): boolean {
    const next: FormErrors = {}
    const title = form.title.trim()
    const opening = form.liveStart ? new Date(form.liveStart).getTime() : null
    const closing = form.liveEnd ? new Date(form.liveEnd).getTime() : null
    const firstReminder = form.reminderFirstSendAt
      ? new Date(form.reminderFirstSendAt).getTime()
      : null
    const frequency = Number(form.reminderFrequencyDays)
    const maximum = Number(form.reminderMaxSends)

    if (title.length < 2 || title.length > 180) {
      next.title = 'Enter a title between 2 and 180 characters.'
    }
    if (form.description.trim().length > 5_000) {
      next.description = 'Use 5,000 characters or fewer.'
    }
    if (form.liveStart && !Number.isFinite(opening)) {
      next.liveStart = 'Enter a valid opening date.'
    }
    if (form.liveEnd && !Number.isFinite(closing)) {
      next.liveEnd = 'Enter a valid closing date.'
    }
    if (opening !== null && closing !== null && closing <= opening) {
      next.liveEnd = 'The closing date must be after the opening date.'
    }
    if (!Number.isInteger(frequency) || frequency < 1 || frequency > 30) {
      next.reminderFrequencyDays = 'Choose a frequency between 1 and 30 days.'
    }
    if (!Number.isInteger(maximum) || maximum < 1 || maximum > 20) {
      next.reminderMaxSends = 'Choose a maximum between 1 and 20 reminders.'
    }

    if (form.remindersEnabled) {
      if (!form.emailRemindersEnabled) {
        next.channels = 'Enable the email reminder channel before automatic reminders.'
      }
      if (firstReminder === null || !Number.isFinite(firstReminder)) {
        next.reminderFirstSendAt = 'Choose when automatic reminders should begin.'
      } else {
        if (opening !== null && firstReminder < opening) {
          next.reminderFirstSendAt = 'The first reminder cannot be before the survey opens.'
        }
        if (closing !== null && firstReminder >= closing) {
          next.reminderFirstSendAt = 'The first reminder must be before the survey closes.'
        }
      }
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function saveSettings() {
    if (saving || !dirty || !validate()) return
    setSaving(true)
    setFeedback(null)

    try {
      await onSave({
        title: form.title.trim(),
        description: form.description.trim() || null,
        live_start: toIsoDateTime(form.liveStart),
        live_end: toIsoDateTime(form.liveEnd),
        reminders_enabled: form.remindersEnabled,
        reminder_first_send_at: toIsoDateTime(form.reminderFirstSendAt),
        reminder_frequency_days: Number(form.reminderFrequencyDays),
        reminder_send_time: normalizedTime(form.reminderSendTime),
        reminder_timezone: form.reminderTimezone,
        reminder_max_sends: Number(form.reminderMaxSends),
        email_invitations_enabled: form.emailInvitationsEnabled,
        email_reminders_enabled: form.emailRemindersEnabled,
        email_receipts_enabled: form.emailReceiptsEnabled,
      })
      setFeedback({ tone: 'success', message: 'Survey settings saved.' })
    } catch (error) {
      setFeedback({ tone: 'error', message: messageFrom(error) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {feedback && (
        <Alert
          variant={feedback.tone === 'error' ? 'destructive' : 'default'}
          className={feedback.tone === 'error'
            ? 'border-[#F4B6AE] bg-[#FFF5F3]'
            : 'border-[#A9E2DC] bg-[#F0FBF9] text-[#087C72]'}
        >
          {feedback.tone === 'error' ? <AlertCircle /> : <Check />}
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      <section className="rounded-2xl border border-[#DFE6EE] bg-white shadow-[0_8px_24px_rgba(13,31,60,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E8EDF3] px-5 py-5">
          <div>
            <h2 className="font-['Plus_Jakarta_Sans'] text-xl font-extrabold text-[#0D1F3C]">
              General and schedule
            </h2>
            <p className="mt-1 text-sm text-[#8A9BB0]">
              Set the survey identity and response window.
            </p>
          </div>
          {scheduleLocked && (
            <Badge variant="outline" className="border-[#E7D6AE] bg-[#FFF9EA] text-[#8C681E]">
              Opening date locked
            </Badge>
          )}
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <Label htmlFor="survey-settings-title" className="mb-1.5 text-sm font-bold text-[#314966]">
              Survey title <span className="text-[#D94A3A]">*</span>
            </Label>
            <Input
              id="survey-settings-title"
              value={form.title}
              onChange={(event) => update('title', event.target.value)}
              disabled={settingsLocked}
              aria-invalid={Boolean(errors.title)}
              className={fieldClassName}
            />
            <FieldError message={errors.title} />
          </div>

          <div className="lg:col-span-2">
            <Label htmlFor="survey-settings-description" className="mb-1.5 text-sm font-bold text-[#314966]">
              Description
            </Label>
            <textarea
              id="survey-settings-description"
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              disabled={settingsLocked}
              aria-invalid={Boolean(errors.description)}
              rows={4}
              className="w-full resize-y rounded-xl border border-[#DCE4EE] bg-white px-3 py-2.5 text-sm text-[#0D1F3C] outline-none placeholder:text-[#9AA9BC] focus:border-[#1BBFB0] focus:ring-3 focus:ring-[#1BBFB0]/20 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-[#D94A3A]"
            />
            <div className="mt-1 flex items-center justify-between gap-3">
              <FieldError message={errors.description} />
              <span className="ml-auto text-[11px] text-[#9AA9BC]">
                {form.description.length.toLocaleString()} / 5,000
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="survey-settings-open" className="mb-1.5 text-sm font-bold text-[#314966]">
              Opening date and time
            </Label>
            <Input
              id="survey-settings-open"
              type="datetime-local"
              value={form.liveStart}
              onChange={(event) => update('liveStart', event.target.value)}
              disabled={scheduleLocked}
              aria-invalid={Boolean(errors.liveStart)}
              className={fieldClassName}
            />
            <FieldError message={errors.liveStart} />
          </div>
          <div>
            <Label htmlFor="survey-settings-close" className="mb-1.5 text-sm font-bold text-[#314966]">
              Closing date and time
            </Label>
            <Input
              id="survey-settings-close"
              type="datetime-local"
              value={form.liveEnd}
              onChange={(event) => update('liveEnd', event.target.value)}
              disabled={settingsLocked}
              aria-invalid={Boolean(errors.liveEnd)}
              className={fieldClassName}
            />
            <FieldError message={errors.liveEnd} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#DFE6EE] bg-white shadow-[0_8px_24px_rgba(13,31,60,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8EDF3] px-5 py-5">
          <div>
            <h2 className="font-['Plus_Jakarta_Sans'] text-xl font-extrabold text-[#0D1F3C]">
              Automatic reminders
            </h2>
            <p className="mt-1 text-sm text-[#8A9BB0]">
              Configure how often incomplete respondents should be reminded.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.remindersEnabled}
            disabled={settingsLocked}
            onClick={() => update('remindersEnabled', !form.remindersEnabled)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-45 ${
              form.remindersEnabled ? 'bg-[#1BBFB0]' : 'bg-[#CBD5E1]'
            }`}
          >
            <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow-sm transition-transform ${
              form.remindersEnabled ? 'translate-x-5.5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="sm:col-span-2 xl:col-span-1">
            <Label htmlFor="survey-settings-first-reminder" className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-[#314966]">
              <CalendarClock className="size-4" /> First reminder
            </Label>
            <Input
              id="survey-settings-first-reminder"
              type="datetime-local"
              value={form.reminderFirstSendAt}
              onChange={(event) => update('reminderFirstSendAt', event.target.value)}
              disabled={!form.remindersEnabled || settingsLocked}
              aria-invalid={Boolean(errors.reminderFirstSendAt)}
              className={fieldClassName}
            />
            <FieldError message={errors.reminderFirstSendAt} />
          </div>
          <div>
            <Label htmlFor="survey-settings-frequency" className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-[#314966]">
              <BellRing className="size-4" /> Repeat every
            </Label>
            <select
              id="survey-settings-frequency"
              value={form.reminderFrequencyDays}
              onChange={(event) => update('reminderFrequencyDays', event.target.value)}
              disabled={!form.remindersEnabled || settingsLocked}
              aria-invalid={Boolean(errors.reminderFrequencyDays)}
              className={`${fieldClassName} w-full border`}
            >
              {[1, 2, 3, 5, 7, 14, 30].map((days) => (
                <option key={days} value={days}>
                  {days === 1 ? 'Every day' : `${days} days`}
                </option>
              ))}
            </select>
            <FieldError message={errors.reminderFrequencyDays} />
          </div>
          <div>
            <Label htmlFor="survey-settings-time" className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-[#314966]">
              <Clock3 className="size-4" /> Send time
            </Label>
            <Input
              id="survey-settings-time"
              type="time"
              value={form.reminderSendTime}
              onChange={(event) => update('reminderSendTime', event.target.value)}
              disabled={!form.remindersEnabled || settingsLocked}
              className={fieldClassName}
            />
          </div>
          <div>
            <Label htmlFor="survey-settings-maximum" className="mb-1.5 text-sm font-bold text-[#314966]">
              Maximum reminders
            </Label>
            <Input
              id="survey-settings-maximum"
              type="number"
              min={1}
              max={20}
              value={form.reminderMaxSends}
              onChange={(event) => update('reminderMaxSends', event.target.value)}
              disabled={!form.remindersEnabled || settingsLocked}
              aria-invalid={Boolean(errors.reminderMaxSends)}
              className={fieldClassName}
            />
            <FieldError message={errors.reminderMaxSends} />
          </div>
          <div className="sm:col-span-2 xl:col-span-4">
            <Label htmlFor="survey-settings-timezone" className="mb-1.5 text-sm font-bold text-[#314966]">
              Reminder timezone
            </Label>
            <select
              id="survey-settings-timezone"
              value={form.reminderTimezone}
              onChange={(event) => update('reminderTimezone', event.target.value)}
              disabled={!form.remindersEnabled || settingsLocked}
              className={`${fieldClassName} w-full border sm:max-w-md`}
            >
              {!timezoneOptions.includes(form.reminderTimezone) && (
                <option value={form.reminderTimezone}>{form.reminderTimezone}</option>
              )}
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>{timezone}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#DFE6EE] bg-white shadow-[0_8px_24px_rgba(13,31,60,0.04)]">
        <div className="border-b border-[#E8EDF3] px-5 py-5">
          <h2 className="font-['Plus_Jakarta_Sans'] text-xl font-extrabold text-[#0D1F3C]">
            Channel management
          </h2>
          <p className="mt-1 text-sm text-[#8A9BB0]">
            Choose which messages this survey can send through each configured channel.
          </p>
        </div>
        <div className="grid gap-5 p-5 xl:grid-cols-2">
          <div className="space-y-3 rounded-2xl bg-[#F7FAFC] p-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#0D1F3C]">
              <Mail className="size-4 text-[#1B9F93]" /> Email through Postmark
            </div>
            <ChannelToggle
              checked={form.emailInvitationsEnabled}
              disabled={settingsLocked}
              label="Survey invitations"
              description="Send each respondent their unique survey link."
              onChange={(checked) => update('emailInvitationsEnabled', checked)}
            />
            <ChannelToggle
              checked={form.emailRemindersEnabled}
              disabled={settingsLocked}
              label="Survey reminders"
              description="Send manual and scheduled reminders to incomplete respondents."
              onChange={(checked) => update('emailRemindersEnabled', checked)}
            />
            <ChannelToggle
              checked={form.emailReceiptsEnabled}
              disabled={settingsLocked}
              label="Completion receipts"
              description="Confirm successful submission to the respondent."
              onChange={(checked) => update('emailReceiptsEnabled', checked)}
            />
            <FieldError message={errors.channels} />
          </div>

          <div className="space-y-3 rounded-2xl bg-[#F7FAFC] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-[#0D1F3C]">
                <MessageSquareText className="size-4 text-[#8A9BB0]" /> SMS
              </div>
              <Badge variant="outline" className="border-[#DCE3EA] bg-white text-[#7C8EA5]">
                Provider required
              </Badge>
            </div>
            <ChannelToggle checked={false} disabled label="Survey invitations" description="Available after an SMS provider is configured." onChange={() => undefined} />
            <ChannelToggle checked={false} disabled label="Survey reminders" description="Available after an SMS provider is configured." onChange={() => undefined} />
            <ChannelToggle checked={false} disabled label="Completion receipts" description="Available after an SMS provider is configured." onChange={() => undefined} />
          </div>
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D7E2EB] bg-white/95 p-4 shadow-[0_12px_32px_rgba(13,31,60,0.12)] backdrop-blur">
        <div className="flex items-center gap-2 text-xs text-[#7C8EA5]">
          <Settings2 className="size-4" />
          {settingsLocked
            ? 'Closed survey settings are read-only.'
            : dirty ? 'You have unsaved changes.' : 'All changes are saved.'}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setForm(initialForm)}
            disabled={!dirty || saving}
            className="border-[#DCE4EE] text-[#526A88]"
          >
            Discard
          </Button>
          <Button
            type="button"
            onClick={() => void saveSettings()}
            disabled={!dirty || saving || settingsLocked}
            className="bg-[#1BBFB0] font-bold text-white hover:bg-[#16A99C]"
          >
            {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
            Save settings
          </Button>
        </div>
      </div>
    </div>
  )
}
