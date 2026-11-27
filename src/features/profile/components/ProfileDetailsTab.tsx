import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, CircleAlert, LoaderCircle } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { EmploymentPosition } from '@/features/users/types'

export type ProfileDetails = {
  id?: string | null
  full_name?: string | null
  email?: string | null
  phone?: string | null
  role?: string | null
  org_id?: string | null
  department?: string | null
  branch?: string | null
  manager_id?: string | null
  location_site?: string | null
  job_title?: string | null
  position?: EmploymentPosition | null
  hire_date?: string | null
  username?: string | null
}

export type ProfileDetailsUpdate = {
  full_name: string
  phone: string | null
  department: string | null
  branch: string | null
  manager_id: string | null
  location_site: string | null
  job_title: string | null
  position: EmploymentPosition | null
  hire_date: string | null
  username: string | null
}

export type ManagerOption = { id: string; label: string }

type Props = {
  profile: ProfileDetails | null
  organisationName?: string | null
  managerOptions?: ManagerOption[]
  onSave: (updates: ProfileDetailsUpdate) => Promise<unknown>
  onCancel?: () => void
  onSaved?: () => void
}

type FormState = {
  fullName: string
  phone: string
  department: string
  branch: string
  managerId: string
  locationSite: string
  jobTitle: string
  position: EmploymentPosition | ''
  hireDate: string
  username: string
}
type EditableField = keyof FormState
type FormErrors = Partial<Record<EditableField, string>>

const POSITIONS: EmploymentPosition[] = [
  'Executive', 'Senior Manager', 'Manager', 'Team Lead', 'Supervisor',
  'Senior Employee', 'Employee', 'Intern', 'Contractor', 'Other',
]
const PHONE_PATTERN = /^[+\d][\d\s().-]{5,24}$/
const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/
const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin', super_admin: 'Super Admin', consultant: 'Consultant',
  client: 'Client', employee: 'Employee',
}
const inputClassName = 'h-11 rounded-[10px] border-[#DCE4EE] bg-white px-3 text-sm text-[#0D1F3C] shadow-none placeholder:text-[#9AA9BC] focus-visible:border-[#1BBFB0] focus-visible:ring-[#1BBFB0]/20 aria-invalid:border-[#D94A3A] aria-invalid:ring-[#D94A3A]/15 read-only:bg-[#F7F9FC] read-only:text-[#8A9BB0]'
const selectClassName = 'h-11 w-full rounded-[10px] border border-[#DCE4EE] bg-white px-3 text-sm text-[#0D1F3C] outline-none transition focus:border-[#1BBFB0] focus:ring-3 focus:ring-[#1BBFB0]/20 aria-invalid:border-[#D94A3A] aria-invalid:ring-3 aria-invalid:ring-[#D94A3A]/15'

function toForm(profile: ProfileDetails | null): FormState {
  return {
    fullName: profile?.full_name ?? '', phone: profile?.phone ?? '',
    department: profile?.department ?? '', branch: profile?.branch ?? '',
    managerId: profile?.manager_id ?? '', locationSite: profile?.location_site ?? '',
    jobTitle: profile?.job_title ?? '', position: profile?.position ?? '',
    hireDate: profile?.hire_date ?? '', username: profile?.username ?? '',
  }
}

function validate(values: FormState, profile: ProfileDetails | null): FormErrors {
  const errors: FormErrors = {}
  const required = profile?.role === 'client' || profile?.role === 'employee'
  const fullName = values.fullName.trim().replace(/\s+/g, ' ')
  if (fullName.length < 2) errors.fullName = 'Enter your full name.'
  else if (fullName.length > 120) errors.fullName = 'Use 120 characters or fewer.'
  if (values.phone.trim() && !PHONE_PATTERN.test(values.phone.trim())) errors.phone = 'Enter a valid phone number.'
  if (required) {
    if (!values.department.trim()) errors.department = 'Department is required.'
    if (!values.branch.trim()) errors.branch = 'Branch is required.'
    if (!values.locationSite.trim()) errors.locationSite = 'Location or site is required.'
    if (!values.jobTitle.trim()) errors.jobTitle = 'Job title is required.'
    if (!values.position) errors.position = 'Employment level is required.'
    if (!values.hireDate) errors.hireDate = 'Start date is required.'
  }
  if (values.managerId && values.managerId === profile?.id) errors.managerId = 'You cannot be your own manager.'
  const username = values.username.trim()
  if (username && (username.length < 3 || username.length > 50)) errors.username = 'Username must be between 3 and 50 characters.'
  else if (username && !USERNAME_PATTERN.test(username)) errors.username = 'Use letters, numbers, dots, underscores or hyphens only.'
  for (const field of ['department', 'branch', 'locationSite', 'jobTitle'] as const) {
    if (values[field].trim().length > 120) errors[field] = 'Use 120 characters or fewer.'
  }
  return errors
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs font-medium text-[#D94A3A]">{message}</p> : null
}

function FieldLabel({ htmlFor, children, required = false }: { htmlFor: string; children: string; required?: boolean }) {
  return (
    <Label htmlFor={htmlFor} className="mb-2 text-[#526A88]">
      {children}{required && <span className="ml-1 font-extrabold text-[#D94A3A]" aria-hidden="true">*</span>}
      {required && <span className="sr-only"> (required)</span>}
    </Label>
  )
}

export default function ProfileDetailsTab({ profile, organisationName, managerOptions = [], onSave, onCancel, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(() => toForm(profile))
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const required = profile?.role === 'client' || profile?.role === 'employee'

  useEffect(() => { setForm(toForm(profile)); setErrors({}) }, [profile])

  function setField<Key extends EditableField>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setSaved(false); setSubmitError('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(form, profile)
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return }
    setSaving(true); setSaved(false); setSubmitError('')
    const nullable = (value: string) => value.trim() || null
    try {
      await onSave({
        full_name: form.fullName.trim().replace(/\s+/g, ' '), phone: nullable(form.phone),
        department: nullable(form.department), branch: nullable(form.branch),
        manager_id: form.managerId || null, location_site: nullable(form.locationSite),
        job_title: nullable(form.jobTitle), position: form.position || null,
        hire_date: form.hireDate || null, username: form.username.trim().toLowerCase() || null,
      })
      setSaved(true); onSaved?.()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save profile.')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} noValidate className="w-full space-y-6">
      <div>
        <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-extrabold text-[#0D1F3C]">Personal and employment details</h2>
        <p className="mt-1 text-sm text-[#8A9BB0]">Fields marked with <span className="font-bold text-[#D94A3A]">*</span> are required{required ? ' for employee accounts.' : '.'}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2"><FieldLabel htmlFor="profile-full-name" required>Full name</FieldLabel><Input id="profile-full-name" value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} aria-invalid={Boolean(errors.fullName)} className={inputClassName} autoComplete="name" /><FieldError message={errors.fullName} /></div>
        <div><FieldLabel htmlFor="profile-email" required>Email</FieldLabel><Input id="profile-email" type="email" value={profile?.email ?? ''} readOnly className={inputClassName} /></div>
        <div><FieldLabel htmlFor="profile-phone">Phone</FieldLabel><Input id="profile-phone" type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} aria-invalid={Boolean(errors.phone)} className={inputClassName} placeholder="+27 00 000 0000" autoComplete="tel" /><FieldError message={errors.phone} /></div>
        <div><FieldLabel htmlFor="profile-role">Platform role</FieldLabel><Input id="profile-role" value={profile?.role ? ROLE_LABELS[profile.role] || profile.role : 'Not assigned'} readOnly className={inputClassName} /></div>
        <div><FieldLabel htmlFor="profile-organisation" required={required}>Organisation</FieldLabel><Input id="profile-organisation" value={organisationName || 'Not assigned'} readOnly className={inputClassName} /></div>
        <div><FieldLabel htmlFor="profile-department" required={required}>Department</FieldLabel><Input id="profile-department" value={form.department} onChange={(e) => setField('department', e.target.value)} aria-invalid={Boolean(errors.department)} className={inputClassName} placeholder="e.g. Finance" /><FieldError message={errors.department} /></div>
        <div><FieldLabel htmlFor="profile-branch" required={required}>Branch</FieldLabel><Input id="profile-branch" value={form.branch} onChange={(e) => setField('branch', e.target.value)} aria-invalid={Boolean(errors.branch)} className={inputClassName} placeholder="e.g. Head Office" /><FieldError message={errors.branch} /></div>
        <div><FieldLabel htmlFor="profile-manager">Manager</FieldLabel><select id="profile-manager" value={form.managerId} onChange={(e) => setField('managerId', e.target.value)} aria-invalid={Boolean(errors.managerId)} className={selectClassName}><option value="">No manager</option>{managerOptions.map((manager) => <option key={manager.id} value={manager.id}>{manager.label}</option>)}</select><FieldError message={errors.managerId} /></div>
        <div><FieldLabel htmlFor="profile-location" required={required}>Location/site</FieldLabel><Input id="profile-location" value={form.locationSite} onChange={(e) => setField('locationSite', e.target.value)} aria-invalid={Boolean(errors.locationSite)} className={inputClassName} placeholder="e.g. Johannesburg" /><FieldError message={errors.locationSite} /></div>
        <div><FieldLabel htmlFor="profile-job-title" required={required}>Job title</FieldLabel><Input id="profile-job-title" value={form.jobTitle} onChange={(e) => setField('jobTitle', e.target.value)} aria-invalid={Boolean(errors.jobTitle)} className={inputClassName} placeholder="e.g. Financial Analyst" /><FieldError message={errors.jobTitle} /></div>
        <div><FieldLabel htmlFor="profile-position" required={required}>Employment level</FieldLabel><select id="profile-position" value={form.position} onChange={(e) => setField('position', e.target.value as FormState['position'])} aria-invalid={Boolean(errors.position)} className={selectClassName}><option value="">Select level</option>{POSITIONS.map((position) => <option key={position} value={position}>{position}</option>)}</select><FieldError message={errors.position} /></div>
        <div><FieldLabel htmlFor="profile-hire-date" required={required}>Start date</FieldLabel><Input id="profile-hire-date" type="date" value={form.hireDate} onChange={(e) => setField('hireDate', e.target.value)} aria-invalid={Boolean(errors.hireDate)} className={inputClassName} /><FieldError message={errors.hireDate} /></div>
        <div><FieldLabel htmlFor="profile-username">Username</FieldLabel><Input id="profile-username" value={form.username} onChange={(e) => setField('username', e.target.value)} aria-invalid={Boolean(errors.username)} className={inputClassName} placeholder="e.g. jane.smith" autoComplete="username" /><FieldError message={errors.username} /></div>
      </div>

      {submitError && <Alert className="border-[rgba(232,86,58,0.25)] bg-[#FDE8E3] text-[#C0392B]"><CircleAlert /><AlertDescription className="text-[#C0392B]">{submitError}</AlertDescription></Alert>}
      {saved && <Alert className="border-[rgba(27,191,176,0.30)] bg-[#E0F7F5] text-[#0A5550]"><CheckCircle2 /><AlertDescription className="font-medium text-[#0A5550]">Profile saved successfully.</AlertDescription></Alert>}
      <div className="flex flex-col-reverse gap-2 border-t border-[#E8EDF3] pt-5 sm:flex-row sm:justify-end">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>}
        <Button type="submit" disabled={saving} className="bg-[#1BBFB0] px-6 font-bold text-white hover:bg-[#16AFA1]">{saving && <LoaderCircle className="animate-spin" />}{saving ? 'Saving…' : 'Save changes'}</Button>
      </div>
    </form>
  )
}
