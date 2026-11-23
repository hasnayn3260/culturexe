export type PlatformRole = 'client' | 'superadmin'

export type EmploymentPosition =
  | 'Executive'
  | 'Senior Manager'
  | 'Manager'
  | 'Team Lead'
  | 'Supervisor'
  | 'Senior Employee'
  | 'Employee'
  | 'Intern'
  | 'Contractor'
  | 'Other'

export type UserStatus = 'active' | 'inactive'
export type UserStatusFilter = 'all' | UserStatus
export type SortDirection = 'asc' | 'desc'

export type OrganisationReference = {
  id: string
  name: string
}

export type ManagerReference = {
  id: string
  fullName: string | null
  email: string | null
}

/**
 * User record returned by the future super-admin API. It combines protected
 * Supabase Auth information with the organisation data stored in
 * `public.profiles`. The browser must never query `auth.users` directly.
 */
export type ManagedUser = {
  id: string
  fullName: string | null

  // Auth email is authoritative. profileEmail remains available so the API can
  // detect and repair mismatches without hiding them from administration tools.
  email: string | null
  authEmail: string | null
  profileEmail: string | null

  phone: string | null
  authPhone: string | null
  profilePhone: string | null

  role: PlatformRole | null
  active: boolean
  organisationId: string | null
  organisation: OrganisationReference | null

  department: string | null
  branch: string | null
  managerId: string | null
  manager: ManagerReference | null
  locationSite: string | null
  jobTitle: string | null
  position: EmploymentPosition | null
  hireDate: string | null
  username: string | null
  mustChangePassword: boolean

  providers: string[]
  providerType: string | null
  authCreatedAt: string | null
  profileCreatedAt: string | null
  lastSignInAt: string | null
}

/** Values shared by both the create-user and edit-user dialogs. */
export type UserFormValues = {
  fullName: string
  email: string
  phone: string
  organisationId: string
  department: string
  branch: string
  managerId: string
  locationSite: string
  jobTitle: string
  position: EmploymentPosition | ''
  hireDate: string
  username: string
  role: PlatformRole
  active: boolean
}

export type CreateManagedUserInput = UserFormValues

export type UpdateManagedUserInput = UserFormValues & {
  id: string
}

export type UserFilters = {
  search: string
  organisationId: string
  role: PlatformRole | 'all'
  status: UserStatusFilter
  department: string
  branch: string
}

export type UserSortKey =
  | 'id'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'organisation'
  | 'department'
  | 'branch'
  | 'manager'
  | 'locationSite'
  | 'jobTitle'
  | 'position'
  | 'hireDate'
  | 'username'
  | 'role'
  | 'active'
  | 'providers'
  | 'providerType'
  | 'authCreatedAt'
  | 'lastSignInAt'

export type UserTableColumnId = UserSortKey | 'actions'

export type UserSort = {
  key: UserSortKey
  direction: SortDirection
}

export type UserAction = 'activate' | 'deactivate' | 'delete'

export const DEFAULT_USER_FILTERS: UserFilters = {
  search: '',
  organisationId: 'all',
  role: 'all',
  status: 'all',
  department: 'all',
  branch: 'all',
}

export const DEFAULT_USER_SORT: UserSort = {
  key: 'fullName',
  direction: 'asc',
}
