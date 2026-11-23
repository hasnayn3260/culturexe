export type OrganisationStatus = 'active' | 'inactive' | 'onboarding'

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

type OrganisationType = (typeof ORGANISATION_TYPES)[number]
type OrganisationSector = (typeof ORGANISATION_SECTORS)[number]

export type OrganisationValues = {
  name: string
  tradingName: string
  registrationNumber: string
  organisationType: OrganisationType
  sector: OrganisationSector
  employeeCount: number
  website: string | null
  yearEstablished: number | null
  countryOfRegistration: string
  registeredAddress: string
  city: string
  province: string
  postalCode: string
  country: string
  generalEmail: string
  mainPhone: string
  emailDomain: string | null
  contactFirstName: string
  contactSurname: string
  contactJobTitle: string
  contactEmail: string
  contactPhone: string
  contactDepartment: string
  timezone: string
  preferredLocale: string
  externalReference: string | null
  status: OrganisationStatus
}

export type OrganisationRow = {
  id: string
  name: string
  trading_name: string | null
  registration_number: string | null
  organisation_type: OrganisationType | null
  industry: OrganisationSector | null
  employee_count: number | null
  website: string | null
  year_established: number | null
  logo_path: string | null
  banner_path: string | null
  country_of_registration: string | null
  registered_address: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  country: string | null
  general_email: string | null
  main_phone: string | null
  email_domain: string | null
  contact_first_name: string | null
  contact_surname: string | null
  contact_job_title: string | null
  contact_email: string | null
  contact_phone: string | null
  contact_department: string | null
  timezone: string | null
  preferred_locale: string | null
  external_reference: string | null
  status: OrganisationStatus | null
  created_at: string | null
  updated_at: string | null
}

export type OrganisationRecord = {
  id: string
  name: string
  tradingName: string | null
  registrationNumber: string | null
  organisationType: OrganisationType | null
  sector: OrganisationSector | null
  employeeCount: number | null
  sizeBand: string | null
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

type ValidationResult =
  | { success: true; data: OrganisationValues }
  | { success: false; message: string }

const VALID_TYPES = new Set<string>(ORGANISATION_TYPES)
const VALID_SECTORS = new Set<string>(ORGANISATION_SECTORS)
const VALID_STATUSES = new Set<OrganisationStatus>([
  'active',
  'inactive',
  'onboarding',
])
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[+\d][\d\s().-]{5,24}$/
const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizedText(value: unknown): string {
  return text(value).replace(/\s+/g, ' ')
}

function nullable(value: string): string | null {
  return value || null
}

function integer(value: unknown): number | null {
  const rawValue = typeof value === 'number' ? value : Number(text(value))
  return Number.isInteger(rawValue) ? rawValue : null
}

function normalizedWebsite(value: unknown): string {
  const website = text(value)
  if (!website) return ''
  return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

function validWebsite(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function normalizedDomain(value: unknown): string {
  return text(value)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/^@/, '')
    .replace(/\/.*$/, '')
}

export function validateOrganisationValues(value: unknown): ValidationResult {
  if (!value || typeof value !== 'object') {
    return { success: false, message: 'Organisation details are required.' }
  }

  const input = value as Record<string, unknown>
  const employeeCount = integer(input.employeeCount)
  const establishedYear = text(input.yearEstablished)
    ? integer(input.yearEstablished)
    : null
  const organisationType = text(input.organisationType)
  const sector = text(input.sector)
  const status = text(input.status) as OrganisationStatus

  const data: OrganisationValues = {
    name: normalizedText(input.name),
    tradingName: normalizedText(input.tradingName),
    registrationNumber: text(input.registrationNumber),
    organisationType: organisationType as OrganisationType,
    sector: sector as OrganisationSector,
    employeeCount: employeeCount ?? 0,
    website: nullable(normalizedWebsite(input.website)),
    yearEstablished: establishedYear,
    countryOfRegistration: normalizedText(input.countryOfRegistration),
    registeredAddress: normalizedText(input.registeredAddress),
    city: normalizedText(input.city),
    province: normalizedText(input.province),
    postalCode: text(input.postalCode),
    country: normalizedText(input.country),
    generalEmail: text(input.generalEmail).toLowerCase(),
    mainPhone: text(input.mainPhone),
    emailDomain: nullable(normalizedDomain(input.emailDomain)),
    contactFirstName: normalizedText(input.contactFirstName),
    contactSurname: normalizedText(input.contactSurname),
    contactJobTitle: normalizedText(input.contactJobTitle),
    contactEmail: text(input.contactEmail).toLowerCase(),
    contactPhone: text(input.contactPhone),
    contactDepartment: normalizedText(input.contactDepartment),
    timezone: text(input.timezone),
    preferredLocale: text(input.preferredLocale),
    externalReference: nullable(text(input.externalReference)),
    status,
  }

  if (data.name.length < 2 || data.name.length > 160) {
    return { success: false, message: 'Enter a valid organisation name.' }
  }
  if (!data.tradingName || data.tradingName.length > 160) {
    return { success: false, message: 'Enter a valid trading name.' }
  }
  if (!data.registrationNumber || data.registrationNumber.length > 80) {
    return { success: false, message: 'Enter a valid registration number.' }
  }
  if (!VALID_TYPES.has(organisationType)) {
    return { success: false, message: 'Select a valid organisation type.' }
  }
  if (!VALID_SECTORS.has(sector)) {
    return { success: false, message: 'Select a valid sector.' }
  }
  if (employeeCount === null || employeeCount < 1) {
    return { success: false, message: 'Enter a valid employee headcount.' }
  }
  if (data.website && !validWebsite(data.website)) {
    return { success: false, message: 'Enter a valid website address.' }
  }
  if (
    establishedYear !== null &&
    (establishedYear < 1700 || establishedYear > new Date().getFullYear())
  ) {
    return { success: false, message: 'Enter a valid year established.' }
  }
  if (!data.countryOfRegistration) {
    return { success: false, message: 'Enter the country of registration.' }
  }
  if (!data.registeredAddress || !data.city || !data.province) {
    return { success: false, message: 'Enter the complete registered address.' }
  }
  if (!data.postalCode || !data.country) {
    return { success: false, message: 'Enter the postal code and country.' }
  }
  if (!EMAIL_PATTERN.test(data.generalEmail)) {
    return { success: false, message: 'Enter a valid general email address.' }
  }
  if (!PHONE_PATTERN.test(data.mainPhone)) {
    return { success: false, message: 'Enter a valid main telephone number.' }
  }
  if (data.emailDomain && !DOMAIN_PATTERN.test(data.emailDomain)) {
    return { success: false, message: 'Enter a valid email domain.' }
  }
  if (!data.contactFirstName || !data.contactSurname) {
    return { success: false, message: 'Enter the primary contact’s full name.' }
  }
  if (!data.contactJobTitle || !data.contactDepartment) {
    return { success: false, message: 'Enter the primary contact’s employment details.' }
  }
  if (!EMAIL_PATTERN.test(data.contactEmail)) {
    return { success: false, message: 'Enter a valid primary contact email.' }
  }
  if (!PHONE_PATTERN.test(data.contactPhone)) {
    return { success: false, message: 'Enter a valid primary contact number.' }
  }
  if (!data.timezone || !data.preferredLocale) {
    return { success: false, message: 'Timezone and preferred locale are required.' }
  }
  if (!VALID_STATUSES.has(status)) {
    return { success: false, message: 'Select a valid organisation status.' }
  }

  return { success: true, data }
}

export function organisationDatabasePayload(
  values: OrganisationValues,
  branding: { logoPath: string; bannerPath: string },
  actorId?: string,
) {
  return {
    name: values.name,
    legal_name: values.name,
    trading_name: values.tradingName,
    registration_number: values.registrationNumber,
    organisation_type: values.organisationType,
    industry: values.sector,
    employee_count: values.employeeCount,
    website: values.website,
    year_established: values.yearEstablished,
    logo_path: branding.logoPath,
    banner_path: branding.bannerPath,
    country_of_registration: values.countryOfRegistration,
    registered_address: values.registeredAddress,
    city: values.city,
    province: values.province,
    postal_code: values.postalCode,
    country: values.country,
    general_email: values.generalEmail,
    main_phone: values.mainPhone,
    email_domain: values.emailDomain,
    contact_first_name: values.contactFirstName,
    contact_surname: values.contactSurname,
    contact_job_title: values.contactJobTitle,
    contact_email: values.contactEmail,
    contact_phone: values.contactPhone,
    contact_department: values.contactDepartment,
    timezone: values.timezone,
    preferred_locale: values.preferredLocale,
    external_reference: values.externalReference,
    status: values.status,
    ...(actorId ? { created_by: actorId } : {}),
  }
}

function sizeBand(employeeCount: number | null): string | null {
  if (employeeCount === null || employeeCount < 1) return null
  if (employeeCount <= 50) return '1–50 employees'
  if (employeeCount <= 200) return '51–200 employees'
  if (employeeCount <= 500) return '201–500 employees'
  if (employeeCount <= 1_000) return '501–1,000 employees'
  if (employeeCount <= 5_000) return '1,001–5,000 employees'
  if (employeeCount <= 10_000) return '5,001–10,000 employees'
  return '10,001+ employees'
}

function storageUrl(
  supabaseUrl: string,
  bucket: string,
  objectPath: string | null,
): string | null {
  if (!objectPath) return null

  const encodedPath = objectPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`
}

export function mapOrganisationRow(
  row: OrganisationRow,
  supabaseUrl: string,
): OrganisationRecord {
  return {
    id: row.id,
    name: row.name,
    tradingName: row.trading_name,
    registrationNumber: row.registration_number,
    organisationType: row.organisation_type,
    sector: row.industry,
    employeeCount: row.employee_count,
    sizeBand: sizeBand(row.employee_count),
    website: row.website,
    yearEstablished: row.year_established,
    logoPath: row.logo_path,
    logoUrl: storageUrl(supabaseUrl, 'Company Logos', row.logo_path),
    bannerPath: row.banner_path,
    bannerUrl: storageUrl(supabaseUrl, 'Company Banners', row.banner_path),
    countryOfRegistration: row.country_of_registration,
    registeredAddress: row.registered_address,
    city: row.city,
    province: row.province,
    postalCode: row.postal_code,
    country: row.country,
    generalEmail: row.general_email,
    mainPhone: row.main_phone,
    emailDomain: row.email_domain,
    contactFirstName: row.contact_first_name,
    contactSurname: row.contact_surname,
    contactJobTitle: row.contact_job_title,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    contactDepartment: row.contact_department,
    timezone: row.timezone || 'Africa/Johannesburg',
    preferredLocale: row.preferred_locale || 'en-ZA',
    externalReference: row.external_reference,
    status: row.status || 'onboarding',
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at || new Date(0).toISOString(),
  }
}
