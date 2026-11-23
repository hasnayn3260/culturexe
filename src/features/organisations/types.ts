export type OrganisationStatus = 'active' | 'inactive' | 'onboarding'
export type OrganisationStatusFilter = 'all' | OrganisationStatus
export type OrganisationSortDirection = 'asc' | 'desc'

export const ORGANISATION_TYPES = [
  'Private Company',
  'Public Company',
  'State-Owned Enterprise (SOE)',
  'Government Department',
  'Municipality / Local Government',
  'Non-Profit Organisation (NPO)',
  'Non-Governmental Organisation (NGO)',
  'Trust',
  'Partnership',
  'Other',
] as const

export type OrganisationType = (typeof ORGANISATION_TYPES)[number]

export const ORGANISATION_SECTORS = [
  'Financial Services & Banking',
  'Consulting & Professional Services',
  'Government & Public Sector',
  'Healthcare',
  'Education',
  'Manufacturing & Industrial',
  'Mining & Resources',
  'Retail & Consumer Goods',
  'Telecommunications & Technology',
  'Energy & Utilities',
  'Transport & Logistics',
  'Construction & Infrastructure',
  'Agriculture',
  'Tourism & Hospitality',
  'Non-Profit & Development',
  'Other',
] as const

export type OrganisationSector = (typeof ORGANISATION_SECTORS)[number]

export const ORGANISATION_SIZE_BANDS = [
  '1–50 employees',
  '51–200 employees',
  '201–500 employees',
  '501–1,000 employees',
  '1,001–5,000 employees',
  '5,001–10,000 employees',
  '10,001+ employees',
] as const

export type OrganisationSizeBand = (typeof ORGANISATION_SIZE_BANDS)[number]

export function organisationSizeBand(
  employeeCount: number | null,
): OrganisationSizeBand | null {
  if (employeeCount === null || employeeCount < 1) return null
  if (employeeCount <= 50) return '1–50 employees'
  if (employeeCount <= 200) return '51–200 employees'
  if (employeeCount <= 500) return '201–500 employees'
  if (employeeCount <= 1_000) return '501–1,000 employees'
  if (employeeCount <= 5_000) return '1,001–5,000 employees'
  if (employeeCount <= 10_000) return '5,001–10,000 employees'
  return '10,001+ employees'
}

export type ManagedOrganisation = {
  id: string
  name: string
  tradingName: string | null
  registrationNumber: string | null
  organisationType: OrganisationType | null
  sector: OrganisationSector | null
  employeeCount: number | null
  sizeBand: OrganisationSizeBand | null
  website: string | null
  yearEstablished: number | null

  logoPath: string | null
  logoUrl: string | null
  bannerPath: string | null
  bannerUrl: string | null

  countryOfRegistration: string | null
  registeredAddress: string | null
  city: string | null
  province: string | null
  postalCode: string | null
  country: string | null

  generalEmail: string | null
  mainPhone: string | null
  emailDomain: string | null

  contactFirstName: string | null
  contactSurname: string | null
  contactJobTitle: string | null
  contactEmail: string | null
  contactPhone: string | null
  contactDepartment: string | null

  timezone: string
  preferredLocale: string
  externalReference: string | null
  status: OrganisationStatus
  createdAt: string | null
  updatedAt: string
}

/** Values shared by the create and edit organisation dialogs. */
export type OrganisationFormValues = {
  name: string
  tradingName: string
  registrationNumber: string
  organisationType: OrganisationType | ''
  sector: OrganisationSector | ''
  employeeCount: string
  website: string
  yearEstablished: string

  logo: File | null
  banner: File | null

  countryOfRegistration: string
  registeredAddress: string
  city: string
  province: string
  postalCode: string
  country: string

  generalEmail: string
  mainPhone: string
  emailDomain: string

  contactFirstName: string
  contactSurname: string
  contactJobTitle: string
  contactEmail: string
  contactPhone: string
  contactDepartment: string

  timezone: string
  preferredLocale: string
  externalReference: string
  status: OrganisationStatus
}

export type CreateManagedOrganisationInput = OrganisationFormValues

export type UpdateManagedOrganisationInput = OrganisationFormValues & {
  id: string
}

export type OrganisationFilters = {
  search: string
  status: OrganisationStatusFilter
  organisationType: OrganisationType | 'all'
  sector: OrganisationSector | 'all'
  country: string
}

export type OrganisationSortKey =
  | 'name'
  | 'tradingName'
  | 'registrationNumber'
  | 'organisationType'
  | 'sector'
  | 'employeeCount'
  | 'country'
  | 'contactName'
  | 'contactEmail'
  | 'status'
  | 'createdAt'
  | 'updatedAt'

export type OrganisationTableColumnId = OrganisationSortKey | 'actions'

export type OrganisationSort = {
  key: OrganisationSortKey
  direction: OrganisationSortDirection
}

export type OrganisationAction = 'activate' | 'deactivate' | 'delete'

export const DEFAULT_ORGANISATION_FILTERS: OrganisationFilters = {
  search: '',
  status: 'all',
  organisationType: 'all',
  sector: 'all',
  country: 'all',
}

export const DEFAULT_ORGANISATION_SORT: OrganisationSort = {
  key: 'name',
  direction: 'asc',
}
