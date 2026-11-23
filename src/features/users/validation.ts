import type {
  EmploymentPosition,
  PlatformRole,
  UserFormValues,
} from './types'

export type UserFormField = keyof UserFormValues
export type UserFormErrors = Partial<Record<UserFormField, string>>

export type UserValidationResult =
  | { success: true; data: UserFormValues }
  | { success: false; errors: UserFormErrors }

type ValidationOptions = {
  currentUserId?: string
}

const PLATFORM_ROLES = new Set<PlatformRole>(['client', 'superadmin'])

const EMPLOYMENT_POSITIONS = new Set<EmploymentPosition>([
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
])

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[+\d][\d\s().-]{5,24}$/
const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function clean(value: string): string {
  return value.trim()
}

function cleanName(value: string): string {
  return clean(value).replace(/\s+/g, ' ')
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export function normalizeUserFormValues(values: UserFormValues): UserFormValues {
  return {
    ...values,
    fullName: cleanName(values.fullName),
    email: clean(values.email).toLowerCase(),
    phone: clean(values.phone),
    organisationId: clean(values.organisationId),
    department: clean(values.department),
    branch: clean(values.branch),
    managerId: clean(values.managerId),
    locationSite: clean(values.locationSite),
    jobTitle: clean(values.jobTitle),
    hireDate: clean(values.hireDate),
    username: clean(values.username).toLowerCase(),
  }
}

export function validateUserForm(
  values: UserFormValues,
  options: ValidationOptions = {},
): UserValidationResult {
  const data = normalizeUserFormValues(values)
  const errors: UserFormErrors = {}

  if (data.fullName.length < 2) {
    errors.fullName = 'Enter the user’s full name.'
  } else if (data.fullName.length > 120) {
    errors.fullName = 'Full name must be 120 characters or fewer.'
  }

  if (!EMAIL_PATTERN.test(data.email)) {
    errors.email = 'Enter a valid email address.'
  } else if (data.email.length > 254) {
    errors.email = 'Email address must be 254 characters or fewer.'
  }

  if (data.phone && !PHONE_PATTERN.test(data.phone)) {
    errors.phone = 'Enter a valid phone number.'
  }

  if (!PLATFORM_ROLES.has(data.role)) {
    errors.role = 'Select a valid platform role.'
  }

  if (data.role === 'client' && !data.organisationId) {
    errors.organisationId = 'Select an organisation for this client.'
  } else if (data.organisationId && !UUID_PATTERN.test(data.organisationId)) {
    errors.organisationId = 'Select a valid organisation.'
  }

  if (data.role === 'client') {
    if (!data.department) {
      errors.department = 'Enter the employee’s department.'
    }
    if (!data.branch) {
      errors.branch = 'Enter the employee’s branch.'
    }
    if (!data.locationSite) {
      errors.locationSite = 'Enter the employee’s location or site.'
    }
    if (!data.jobTitle) {
      errors.jobTitle = 'Enter the employee’s job title.'
    }
    if (!data.position) {
      errors.position = 'Select the employee’s employment level.'
    }
    if (!data.hireDate) {
      errors.hireDate = 'Enter the employee’s start date.'
    }
  }

  if (data.managerId && !UUID_PATTERN.test(data.managerId)) {
    errors.managerId = 'Select a valid manager.'
  } else if (data.managerId && data.managerId === options.currentUserId) {
    errors.managerId = 'A user cannot be their own manager.'
  }

  if (data.position && !EMPLOYMENT_POSITIONS.has(data.position)) {
    errors.position = 'Select a valid employment position.'
  }

  if (data.hireDate && !isValidDate(data.hireDate)) {
    errors.hireDate = 'Enter a valid start date.'
  }

  if (data.username) {
    if (data.username.length < 3 || data.username.length > 50) {
      errors.username = 'Username must be between 3 and 50 characters.'
    } else if (!USERNAME_PATTERN.test(data.username)) {
      errors.username = 'Username may contain letters, numbers, dots, underscores and hyphens.'
    }
  }

  for (const field of [
    'department',
    'branch',
    'locationSite',
    'jobTitle',
  ] as const) {
    if (data[field].length > 120) {
      errors[field] = 'Use 120 characters or fewer.'
    }
  }

  return Object.keys(errors).length > 0
    ? { success: false, errors }
    : { success: true, data }
}

export function emptyStringToNull(value: string): string | null {
  const normalized = clean(value)
  return normalized || null
}
