import type { EmploymentPosition, PlatformRole } from '../types'

export type UserImportColumnKey =
  | 'fullName'
  | 'email'
  | 'department'
  | 'branch'
  | 'managerEmail'
  | 'locationSite'
  | 'jobTitle'
  | 'position'
  | 'hireDate'
  | 'role'
  | 'active'
  | 'phone'
  | 'username'

export type UserImportColumn = {
  key: UserImportColumnKey
  header: string
  label: string
  required: boolean
  description: string
  example: string
  aliases: string[]
}

export type UserImportValues = {
  fullName: string
  email: string
  department: string
  branch: string
  managerEmail: string
  locationSite: string
  jobTitle: string
  position: EmploymentPosition | ''
  hireDate: string
  role: PlatformRole
  active: boolean
  phone: string
  username: string
}

export type UserImportFieldErrors = Partial<
  Record<UserImportColumnKey | 'organisationId', string>
>

export type ParsedUserImportRow = {
  rowNumber: number
  values: UserImportValues
  errors: UserImportFieldErrors
  valid: boolean
}

export type UserImportResultStatus =
  | 'pending'
  | 'created'
  | 'updated'
  | 'skipped'
  | 'failed'

export type UserImportResult = {
  rowNumber: number
  email: string
  status: UserImportResultStatus
  userId?: string
  message?: string
}

export const USER_IMPORT_POSITIONS: EmploymentPosition[] = [
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

export const USER_IMPORT_ROLES: PlatformRole[] = ['client', 'superadmin']

export const USER_IMPORT_COLUMNS: UserImportColumn[] = [
  {
    key: 'fullName',
    header: 'full_name',
    label: 'Full name',
    required: true,
    description: 'Employee identity used in the profile and invitation email.',
    example: 'Jane Smith',
    aliases: ['name', 'employee_name', 'display_name'],
  },
  {
    key: 'email',
    header: 'email',
    label: 'Email',
    required: true,
    description: 'Unique authentication email and account identifier.',
    example: 'jane.smith@example.com',
    aliases: ['email_address', 'work_email', 'employee_email'],
  },
  {
    key: 'department',
    header: 'department',
    label: 'Department',
    required: true,
    description: 'Required reporting and survey-analysis dimension.',
    example: 'Finance',
    aliases: ['division', 'business_unit', 'team'],
  },
  {
    key: 'branch',
    header: 'branch',
    label: 'Branch',
    required: true,
    description: 'Required reporting and organisation-query dimension.',
    example: 'Head Office',
    aliases: ['office', 'business_branch'],
  },
  {
    key: 'managerEmail',
    header: 'manager_email',
    label: 'Manager email',
    required: false,
    description: 'Optional stable link to another user in the same organisation.',
    example: 'manager@example.com',
    aliases: ['reports_to_email', 'supervisor_email', 'line_manager_email'],
  },
  {
    key: 'locationSite',
    header: 'location_site',
    label: 'Location/site',
    required: true,
    description: 'Required reporting and survey-analysis dimension.',
    example: 'Johannesburg',
    aliases: ['location', 'site', 'work_location'],
  },
  {
    key: 'jobTitle',
    header: 'job_title',
    label: 'Job title',
    required: true,
    description: 'Required employee classification and reporting field.',
    example: 'Financial Analyst',
    aliases: ['title', 'role_title', 'designation'],
  },
  {
    key: 'position',
    header: 'employment_level',
    label: 'Employment level',
    required: true,
    description: 'Must match one of the supported employment levels.',
    example: 'Employee',
    aliases: ['position', 'job_level', 'job_grade', 'seniority'],
  },
  {
    key: 'hireDate',
    header: 'start_date',
    label: 'Start date',
    required: true,
    description: 'ISO date used for tenure calculations: YYYY-MM-DD.',
    example: '2024-01-15',
    aliases: ['hire_date', 'employment_date', 'date_started'],
  },
  {
    key: 'role',
    header: 'platform_role',
    label: 'Platform role',
    required: true,
    description: 'Controls platform authorization. Current values: client or superadmin.',
    example: 'client',
    aliases: ['role', 'user_role', 'access_role'],
  },
  {
    key: 'active',
    header: 'active',
    label: 'Active status',
    required: true,
    description: 'Controls account access. Use true or false.',
    example: 'true',
    aliases: ['is_active', 'enabled', 'status'],
  },
  {
    key: 'phone',
    header: 'phone',
    label: 'Phone',
    required: false,
    description: 'Optional employee phone number.',
    example: '+27 11 555 0100',
    aliases: ['phone_number', 'mobile', 'mobile_number'],
  },
  {
    key: 'username',
    header: 'username',
    label: 'Username',
    required: false,
    description: 'Optional unique username.',
    example: 'jane.smith',
    aliases: ['user_name', 'login_name'],
  },
]

export const REQUIRED_USER_IMPORT_COLUMNS = USER_IMPORT_COLUMNS.filter(
  (column) => column.required,
)

export const OPTIONAL_USER_IMPORT_COLUMNS = USER_IMPORT_COLUMNS.filter(
  (column) => !column.required,
)
