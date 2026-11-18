import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, CircleAlert } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type ProfileDetails = {
  full_name?: string | null
  email?: string | null
  phone?: string | null
  department?: string | null
  job_title?: string | null
  hire_date?: string | null
}

export type ProfileDetailsUpdate = {
  full_name: string
  phone: string | null
  department: string | null
  job_title: string | null
  hire_date: string | null
}

type ProfileDetailsTabProps = {
  profile: ProfileDetails | null
  onSave: (updates: ProfileDetailsUpdate) => Promise<unknown>
  onCancel?: () => void
  onSaved?: () => void
}

type ProfileFormState = {
  fullName: string
  phone: string
  department: string
  jobTitle: string
  hireDate: string
}

function toFormState(profile: ProfileDetails | null): ProfileFormState {
  return {
    fullName: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    department: profile?.department ?? '',
    jobTitle: profile?.job_title ?? '',
    hireDate: profile?.hire_date ?? '',
  }
}

type FieldProps = {
  id: string
  label: string
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  type?: 'text' | 'email' | 'tel' | 'date'
  readOnly?: boolean
}

function ProfileField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  readOnly = false,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className="text-xs font-semibold tracking-[0.8px] text-[#8A9BB0] uppercase"
      >
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className="h-11 rounded-[9px] border-[#E2E8F0] bg-white px-[13px] text-[13.5px] text-[#0D1F3C] shadow-none placeholder:text-[#8A9BB0] focus-visible:border-[#1BBFB0] focus-visible:ring-[#1BBFB0]/20 read-only:bg-[#F7F9FC] read-only:text-[#8A9BB0]"
      />
    </div>
  )
}

export default function ProfileDetailsTab({
  profile,
  onSave,
  onCancel,
  onSaved,
}: ProfileDetailsTabProps) {
  const [form, setForm] = useState<ProfileFormState>(() => toFormState(profile))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setForm(toFormState(profile))
  }, [profile])

  function setField<Key extends keyof ProfileFormState>(key: Key, value: ProfileFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
    setSaved(false)
    setError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const fullName = form.fullName.trim()
    if (!fullName) {
      setError('Full name is required.')
      return
    }

    setSaving(true)
    setSaved(false)
    setError('')

    try {
      await onSave({
        full_name: fullName,
        phone: form.phone.trim() || null,
        department: form.department.trim() || null,
        job_title: form.jobTitle.trim() || null,
        hire_date: form.hireDate || null,
      })
      setSaved(true)
      onSaved?.()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5">
      <ProfileField
        id="profile-full-name"
        label="Full Name"
        value={form.fullName}
        placeholder="Your full name"
        onChange={(value) => setField('fullName', value)}
      />

      <ProfileField
        id="profile-email"
        label="Email"
        type="email"
        value={profile?.email ?? ''}
        readOnly
      />

      <ProfileField
        id="profile-phone"
        label="Phone"
        type="tel"
        value={form.phone}
        placeholder="+27 000 000 0000"
        onChange={(value) => setField('phone', value)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <ProfileField
          id="profile-department"
          label="Department"
          value={form.department}
          placeholder="e.g. Finance"
          onChange={(value) => setField('department', value)}
        />
        <ProfileField
          id="profile-job-title"
          label="Job Title"
          value={form.jobTitle}
          placeholder="e.g. Manager"
          onChange={(value) => setField('jobTitle', value)}
        />
      </div>

      <ProfileField
        id="profile-hire-date"
        label="Start Date"
        type="date"
        value={form.hireDate}
        onChange={(value) => setField('hireDate', value)}
      />

      {error && (
        <Alert className="border-[rgba(232,86,58,0.25)] bg-[#FDE8E3] text-[#C0392B]">
          <CircleAlert />
          <AlertDescription className="text-[#C0392B]">{error}</AlertDescription>
        </Alert>
      )}

      {saved && (
        <Alert className="border-[rgba(27,191,176,0.30)] bg-[#E0F7F5] text-[#0A5550]">
          <CheckCircle2 />
          <AlertDescription className="font-medium text-[#0A5550]">
            Profile saved successfully.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-10 rounded-[9px] border-[#E2E8F0] bg-white px-5 text-[13.5px] font-semibold text-[#4A6380] hover:bg-[#F7F9FC]"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={saving}
          className="h-10 rounded-[9px] bg-[#1BBFB0] px-6 text-[13.5px] font-bold text-white hover:bg-[#16AFA1]"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
