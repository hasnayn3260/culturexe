import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertCircle, LoaderCircle, UserPen, UserPlus } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import type {
  EmploymentPosition,
  ManagedUser,
  OrganisationReference,
  UserFormValues,
} from '../types'
import {
  validateUserForm,
  type UserFormErrors,
  type UserFormField,
} from '../validation'

type UserFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  user?: ManagedUser | null
  organisations: OrganisationReference[]
  users: ManagedUser[]
  submitting?: boolean
  onSubmit: (values: UserFormValues) => Promise<unknown>
}

const POSITIONS: EmploymentPosition[] = [
  'Executive',
  'Senior Manager',
  'Manager',
  'Team Lead',
  'Supervisor',
  'Senior Employee',
  'Employee',
  'Intern',
  'Contractor',
  'Other',
]

const MANAGER_POSITIONS = new Set<EmploymentPosition>([
  'Manager',
  'Senior Manager',
])

const EMPTY_VALUES: UserFormValues = {
  fullName: '',
  email: '',
  phone: '',
  organisationId: '',
  department: '',
  branch: '',
  managerId: '',
  locationSite: '',
  jobTitle: '',
  position: '',
  hireDate: '',
  username: '',
  role: 'client',
  active: true,
}

const inputClassName =
  'h-10 rounded-[10px] border-[#DCE4EE] bg-white px-3 text-[14px] text-[#0D1F3C] placeholder:text-[#9AA9BC] focus-visible:border-[#1BBFB0] focus-visible:ring-[#1BBFB0]/20'

const selectClassName =
  'h-10 w-full rounded-[10px] border border-[#DCE4EE] bg-white px-3 text-[14px] text-[#0D1F3C] outline-none transition focus:border-[#1BBFB0] focus:ring-3 focus:ring-[#1BBFB0]/20 aria-invalid:border-[#D94A3A] aria-invalid:ring-3 aria-invalid:ring-[#D94A3A]/15 disabled:cursor-not-allowed disabled:bg-[#F3F6FA] disabled:text-[#8A9BB0]'

function valuesFromUser(user?: ManagedUser | null): UserFormValues {
  if (!user) return { ...EMPTY_VALUES }

  return {
    fullName: user.fullName || '',
    email: user.email || '',
    phone: user.phone || '',
    organisationId: user.organisationId || '',
    department: user.department || '',
    branch: user.branch || '',
    managerId: user.managerId || '',
    locationSite: user.locationSite || '',
    jobTitle: user.jobTitle || '',
    position: user.position || '',
    hireDate: user.hireDate || '',
    username: user.username || '',
    role: user.role || 'client',
    active: user.active,
  }
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null

  return <p className="mt-1 text-xs font-medium text-[#D94A3A]">{message}</p>
}

function FieldLabel({
  htmlFor,
  children,
  required = false,
}: {
  htmlFor: string
  children: string
  required?: boolean
}) {
  return (
    <Label htmlFor={htmlFor} className="mb-2 text-[#526A88]">
      {children}
      {required && (
        <span className="font-extrabold text-[#D94A3A]" aria-hidden="true">*</span>
      )}
      {required && <span className="sr-only"> (required)</span>}
    </Label>
  )
}

export default function UserFormDialog({
  open,
  onOpenChange,
  mode,
  user,
  organisations,
  users,
  submitting = false,
  onSubmit,
}: UserFormDialogProps) {
  const [values, setValues] = useState<UserFormValues>(() =>
    valuesFromUser(mode === 'edit' ? user : null),
  )
  const [errors, setErrors] = useState<UserFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setValues(valuesFromUser(mode === 'edit' ? user : null))
    setErrors({})
    setSubmitError(null)
  }, [mode, open, user])

  const managerOptions = useMemo(() => {
    if (!values.organisationId) return []

    return users
      .filter((candidate) =>
        candidate.id !== user?.id &&
        candidate.organisationId === values.organisationId &&
        candidate.active &&
        candidate.position !== null &&
        MANAGER_POSITIONS.has(candidate.position),
      )
      .sort((first, second) =>
        (first.fullName || first.email || '').localeCompare(
          second.fullName || second.email || '',
        ),
      )
  }, [user?.id, users, values.organisationId])

  function setField<Field extends UserFormField>(
    field: Field,
    value: UserFormValues[Field],
  ) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
    setSubmitError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = validateUserForm(values, { currentUserId: user?.id })

    if (!result.success) {
      setErrors(result.errors)
      return
    }

    setErrors({})
    setSubmitError(null)

    try {
      await onSubmit(result.data)
      onOpenChange(false)
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'The user could not be saved. Please try again.',
      )
    }
  }

  const isEdit = mode === 'edit'
  const requiresEmploymentDetails = values.role === 'client'
  const title = isEdit ? 'Edit user' : 'Add new user'
  const description = isEdit
    ? 'Update the user’s account, organisation and employment details.'
    : 'Create the account and send an invitation to the user’s email address.'

  return (
    <Dialog open={open} onOpenChange={submitting ? undefined : onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[18px] bg-white p-0 text-[#0D1F3C] shadow-[0_24px_64px_rgba(13,31,60,0.20)] ring-0 sm:max-w-[760px]">
        <DialogHeader className="border-b border-[#E8EDF3] px-7 py-6 pr-16">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#E4F8F6] text-[#0C8C81]">
              {isEdit ? <UserPen /> : <UserPlus />}
            </div>
            <div>
              <DialogTitle className="font-['Plus_Jakarta_Sans'] text-xl font-extrabold tracking-[-0.3px] text-[#0D1F3C]">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] text-[#8A9BB0]">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid gap-5 px-7 py-6 sm:grid-cols-2">
            <p className="text-xs font-medium text-[#7A3B33] sm:col-span-2">
              <span className="font-extrabold text-[#D94A3A]">*</span>
              {' '}Required field
              {requiresEmploymentDetails && ' for client accounts'}
            </p>

            {submitError && (
              <Alert
                variant="destructive"
                className="sm:col-span-2 border-[#F4B6AE] bg-[#FFF5F3]"
              >
                <AlertCircle />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <div className="sm:col-span-2">
              <FieldLabel htmlFor="user-full-name" required>Full name</FieldLabel>
              <Input
                id="user-full-name"
                value={values.fullName}
                onChange={(event) => setField('fullName', event.target.value)}
                aria-invalid={Boolean(errors.fullName)}
                className={inputClassName}
                placeholder="e.g. Jane Smith"
                autoComplete="name"
                required
                disabled={submitting}
              />
              <FieldError message={errors.fullName} />
            </div>

            <div>
              <FieldLabel htmlFor="user-email" required>Email</FieldLabel>
              <Input
                id="user-email"
                type="email"
                value={values.email}
                onChange={(event) => setField('email', event.target.value)}
                aria-invalid={Boolean(errors.email)}
                className={inputClassName}
                placeholder="name@company.com"
                autoComplete="email"
                required
                disabled={submitting}
              />
              <FieldError message={errors.email} />
            </div>

            <div>
              <FieldLabel htmlFor="user-phone">Phone</FieldLabel>
              <Input
                id="user-phone"
                type="tel"
                value={values.phone}
                onChange={(event) => setField('phone', event.target.value)}
                aria-invalid={Boolean(errors.phone)}
                className={inputClassName}
                placeholder="+27 00 000 0000"
                autoComplete="tel"
                disabled={submitting}
              />
              <FieldError message={errors.phone} />
            </div>

            <div>
              <FieldLabel htmlFor="user-role" required>Platform role</FieldLabel>
              <select
                id="user-role"
                value={values.role}
                onChange={(event) =>
                  setField('role', event.target.value as UserFormValues['role'])}
                aria-invalid={Boolean(errors.role)}
                className={selectClassName}
                required
                disabled={submitting}
              >
                <option value="client">Client</option>
                <option value="superadmin">Super admin</option>
              </select>
              <FieldError message={errors.role} />
            </div>

            <div>
              <FieldLabel
                htmlFor="user-organisation"
                required={requiresEmploymentDetails}
              >
                Organisation
              </FieldLabel>
              <select
                id="user-organisation"
                value={values.organisationId}
                onChange={(event) => {
                  setField('organisationId', event.target.value)
                  setField('managerId', '')
                }}
                aria-invalid={Boolean(errors.organisationId)}
                className={selectClassName}
                required={requiresEmploymentDetails}
                disabled={submitting}
              >
                <option value="">
                  {values.role === 'client' ? 'Select organisation' : 'No organisation'}
                </option>
                {organisations.map((organisation) => (
                  <option key={organisation.id} value={organisation.id}>
                    {organisation.name}
                  </option>
                ))}
              </select>
              <FieldError message={errors.organisationId} />
            </div>

            <div>
              <FieldLabel
                htmlFor="user-department"
                required={requiresEmploymentDetails}
              >
                Department
              </FieldLabel>
              <Input
                id="user-department"
                value={values.department}
                onChange={(event) => setField('department', event.target.value)}
                aria-invalid={Boolean(errors.department)}
                className={inputClassName}
                placeholder="e.g. Finance"
                required={requiresEmploymentDetails}
                disabled={submitting}
              />
              <FieldError message={errors.department} />
            </div>

            <div>
              <FieldLabel
                htmlFor="user-branch"
                required={requiresEmploymentDetails}
              >
                Branch
              </FieldLabel>
              <Input
                id="user-branch"
                value={values.branch}
                onChange={(event) => setField('branch', event.target.value)}
                aria-invalid={Boolean(errors.branch)}
                className={inputClassName}
                placeholder="e.g. Head Office"
                required={requiresEmploymentDetails}
                disabled={submitting}
              />
              <FieldError message={errors.branch} />
            </div>

            <div>
              <FieldLabel htmlFor="user-manager">Manager</FieldLabel>
              <select
                id="user-manager"
                value={values.managerId}
                onChange={(event) => setField('managerId', event.target.value)}
                aria-invalid={Boolean(errors.managerId)}
                className={selectClassName}
                disabled={submitting || !values.organisationId}
              >
                <option value="">No manager</option>
                {managerOptions.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.fullName || manager.email || manager.id}
                    {manager.position ? ` — ${manager.position}` : ''}
                  </option>
                ))}
              </select>
              <FieldError message={errors.managerId} />
            </div>

            <div>
              <FieldLabel
                htmlFor="user-location"
                required={requiresEmploymentDetails}
              >
                Location/site
              </FieldLabel>
              <Input
                id="user-location"
                value={values.locationSite}
                onChange={(event) => setField('locationSite', event.target.value)}
                aria-invalid={Boolean(errors.locationSite)}
                className={inputClassName}
                placeholder="e.g. Johannesburg"
                required={requiresEmploymentDetails}
                disabled={submitting}
              />
              <FieldError message={errors.locationSite} />
            </div>

            <div>
              <FieldLabel
                htmlFor="user-job-title"
                required={requiresEmploymentDetails}
              >
                Job title
              </FieldLabel>
              <Input
                id="user-job-title"
                value={values.jobTitle}
                onChange={(event) => setField('jobTitle', event.target.value)}
                aria-invalid={Boolean(errors.jobTitle)}
                className={inputClassName}
                placeholder="e.g. Financial Analyst"
                required={requiresEmploymentDetails}
                disabled={submitting}
              />
              <FieldError message={errors.jobTitle} />
            </div>

            <div>
              <FieldLabel
                htmlFor="user-position"
                required={requiresEmploymentDetails}
              >
                Employment level
              </FieldLabel>
              <select
                id="user-position"
                value={values.position}
                onChange={(event) =>
                  setField('position', event.target.value as UserFormValues['position'])}
                aria-invalid={Boolean(errors.position)}
                className={selectClassName}
                required={requiresEmploymentDetails}
                disabled={submitting}
              >
                <option value="">Select level</option>
                {POSITIONS.map((position) => (
                  <option key={position} value={position}>{position}</option>
                ))}
              </select>
              <FieldError message={errors.position} />
            </div>

            <div>
              <FieldLabel
                htmlFor="user-hire-date"
                required={requiresEmploymentDetails}
              >
                Start date
              </FieldLabel>
              <Input
                id="user-hire-date"
                type="date"
                value={values.hireDate}
                onChange={(event) => setField('hireDate', event.target.value)}
                aria-invalid={Boolean(errors.hireDate)}
                className={inputClassName}
                required={requiresEmploymentDetails}
                disabled={submitting}
              />
              <FieldError message={errors.hireDate} />
            </div>

            <div>
              <FieldLabel htmlFor="user-username">Username</FieldLabel>
              <Input
                id="user-username"
                value={values.username}
                onChange={(event) => setField('username', event.target.value)}
                aria-invalid={Boolean(errors.username)}
                className={inputClassName}
                placeholder="Generated automatically if left blank"
                autoComplete="username"
                disabled={submitting}
              />
              {!errors.username && !values.username && (
                <p className="mt-1 text-xs text-[#8A9BB0]">
                  Uses first.last, then adds meaningful name or workplace details if needed. Numbers are never added automatically.
                </p>
              )}
              <FieldError message={errors.username} />
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#DCE4EE] bg-[#F8FAFC] px-4 py-3 sm:col-span-2">
              <span>
                <span className="block text-sm font-semibold text-[#0D1F3C]">
                  Active account
                </span>
                <span className="mt-0.5 block text-xs text-[#8A9BB0]">
                  Inactive users cannot sign in to the platform.
                </span>
              </span>
              <input
                type="checkbox"
                checked={values.active}
                onChange={(event) => setField('active', event.target.checked)}
                className="size-4 accent-[#1BBFB0]"
                disabled={submitting}
              />
            </label>
          </div>

          <DialogFooter className="m-0 border-t border-[#E8EDF3] bg-[#F8FAFC] px-7 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="h-10 border-[#D6E0EB] bg-white px-5 text-[#526A88]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-10 bg-[#1BBFB0] px-5 font-bold text-white hover:bg-[#16A99C]"
            >
              {submitting && <LoaderCircle className="animate-spin" />}
              {isEdit ? 'Save changes' : 'Create and invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
