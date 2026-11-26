import {
  ORGANISATION_SECTORS,
  ORGANISATION_TYPES,
  type OrganisationFormValues,
  type OrganisationSector,
  type OrganisationType,
} from './types'

export type OrganisationFormField = keyof OrganisationFormValues
export type OrganisationFormErrors = Partial<
  Record<OrganisationFormField, string>
>

export type OrganisationValidationResult =
  | { success: true; data: OrganisationFormValues }
  | { success: false; errors: OrganisationFormErrors }

type OrganisationValidationOptions = {
  existingLogoPath?: string | null
  existingBannerPath?: string | null
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[+\d][\d\s().-]{5,24}$/
const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const MIN_ESTABLISHED_YEAR = 1700

const VALID_ORGANISATION_TYPES = new Set<OrganisationType>(
  ORGANISATION_TYPES,
)
const VALID_SECTORS = new Set<OrganisationSector>(ORGANISATION_SECTORS)

function clean(value: string): string {
  return value.trim()
}

function cleanText(value: string): string {
  return clean(value).replace(/\s+/g, ' ')
}

function normalizeEmail(value: string): string {
  return clean(value).toLowerCase()
}

function normalizeDomain(value: string): string {
  return clean(value)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/^@/, '')
    .replace(/\/.*$/, '')
}

function normalizeWebsite(value: string): string {
  const website = clean(value)
  if (!website) return ''
  return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function validateImage(
  file: File | null,
  fieldName: 'logo' | 'banner',
  errors: OrganisationFormErrors,
): void {
  if (!file) return

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    errors[fieldName] = 'Upload a PNG, JPEG or WebP image.'
    return
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    errors[fieldName] = 'Image must be 5 MB or smaller.'
  }
}

export function normalizeOrganisationFormValues(
  values: OrganisationFormValues,
): OrganisationFormValues {
  return {
    ...values,
    name: cleanText(values.name),
    tradingName: cleanText(values.tradingName),
    registrationNumber: clean(values.registrationNumber),
    employeeCount: clean(values.employeeCount),
    website: normalizeWebsite(values.website),
    yearEstablished: clean(values.yearEstablished),
    countryOfRegistration: cleanText(values.countryOfRegistration),
    registeredAddress: cleanText(values.registeredAddress),
    city: cleanText(values.city),
    province: cleanText(values.province),
    postalCode: clean(values.postalCode),
    country: cleanText(values.country),
    generalEmail: normalizeEmail(values.generalEmail),
    mainPhone: clean(values.mainPhone),
    emailDomain: normalizeDomain(values.emailDomain),
    contactFirstName: cleanText(values.contactFirstName),
    contactSurname: cleanText(values.contactSurname),
    contactJobTitle: cleanText(values.contactJobTitle),
    contactEmail: normalizeEmail(values.contactEmail),
    contactPhone: clean(values.contactPhone),
    contactDepartment: cleanText(values.contactDepartment),
    timezone: clean(values.timezone),
    preferredLocale: clean(values.preferredLocale),
    externalReference: clean(values.externalReference),
  }
}

export function validateOrganisationForm(
  values: OrganisationFormValues,
  options: OrganisationValidationOptions = {},
): OrganisationValidationResult {
  const data = normalizeOrganisationFormValues(values)
  const errors: OrganisationFormErrors = {}

  if (data.name.length < 2) {
    errors.name = 'Enter the registered organisation name.'
  } else if (data.name.length > 160) {
    errors.name = 'Organisation name must be 160 characters or fewer.'
  }

  if (!data.tradingName) {
    errors.tradingName = 'Enter the organisation’s trading name.'
  } else if (data.tradingName.length > 160) {
    errors.tradingName = 'Trading name must be 160 characters or fewer.'
  }

  if (!data.registrationNumber) {
    errors.registrationNumber = 'Enter the registration number.'
  } else if (data.registrationNumber.length > 80) {
    errors.registrationNumber = 'Registration number must be 80 characters or fewer.'
  }

  if (
    !data.organisationType ||
    !VALID_ORGANISATION_TYPES.has(data.organisationType)
  ) {
    errors.organisationType = 'Select an organisation type.'
  }

  if (!data.sector || !VALID_SECTORS.has(data.sector)) {
    errors.sector = 'Select a sector.'
  }

  const employeeCount = Number(data.employeeCount)
  if (!data.employeeCount) {
    errors.employeeCount = 'Enter the total employee headcount.'
  } else if (!Number.isInteger(employeeCount) || employeeCount < 1) {
    errors.employeeCount = 'Employee headcount must be a whole number of at least 1.'
  }

  if (data.website && !isValidHttpUrl(data.website)) {
    errors.website = 'Enter a valid website address.'
  }

  if (data.yearEstablished) {
    const establishedYear = Number(data.yearEstablished)
    const currentYear = new Date().getFullYear()

    if (
      !Number.isInteger(establishedYear) ||
      establishedYear < MIN_ESTABLISHED_YEAR ||
      establishedYear > currentYear
    ) {
      errors.yearEstablished = `Enter a year between ${MIN_ESTABLISHED_YEAR} and ${currentYear}.`
    }
  }

  if (!data.logo && !options.existingLogoPath) {
    errors.logo = 'Upload the organisation logo.'
  } else {
    validateImage(data.logo, 'logo', errors)
  }

  if (!data.banner && !options.existingBannerPath) {
    errors.banner = 'Upload the organisation banner.'
  } else {
    validateImage(data.banner, 'banner', errors)
  }

  if (!data.countryOfRegistration) {
    errors.countryOfRegistration = 'Enter the country of registration.'
  }

  if (!data.registeredAddress) {
    errors.registeredAddress = 'Enter the registered address.'
  }

  if (!data.city) errors.city = 'Enter the city or town.'
  if (!data.province) errors.province = 'Enter the province or state.'
  if (!data.postalCode) errors.postalCode = 'Enter the postal code.'
  if (!data.country) errors.country = 'Enter the country.'

  if (!EMAIL_PATTERN.test(data.generalEmail)) {
    errors.generalEmail = 'Enter a valid general email address.'
  }

  if (!PHONE_PATTERN.test(data.mainPhone)) {
    errors.mainPhone = 'Enter a valid main telephone number.'
  }

  if (!data.emailDomain) {
    errors.emailDomain = 'Enter the email domain allowed for user imports.'
  } else if (!DOMAIN_PATTERN.test(data.emailDomain)) {
    errors.emailDomain = 'Enter a valid email domain, such as company.com.'
  }

  if (!data.contactFirstName) {
    errors.contactFirstName = 'Enter the primary contact’s first name.'
  }
  if (!data.contactSurname) {
    errors.contactSurname = 'Enter the primary contact’s surname.'
  }
  if (!data.contactJobTitle) {
    errors.contactJobTitle = 'Enter the primary contact’s job title.'
  }
  if (!EMAIL_PATTERN.test(data.contactEmail)) {
    errors.contactEmail = 'Enter a valid primary contact email address.'
  }
  if (!PHONE_PATTERN.test(data.contactPhone)) {
    errors.contactPhone = 'Enter a valid primary contact number.'
  }
  if (!data.contactDepartment) {
    errors.contactDepartment = 'Enter the primary contact’s department.'
  }

  if (!data.timezone) errors.timezone = 'Enter the organisation timezone.'
  if (!data.preferredLocale) {
    errors.preferredLocale = 'Enter the preferred locale.'
  }

  for (const field of [
    'countryOfRegistration',
    'city',
    'province',
    'country',
    'contactFirstName',
    'contactSurname',
    'contactJobTitle',
    'contactDepartment',
  ] as const) {
    if (data[field].length > 120) {
      errors[field] = 'Use 120 characters or fewer.'
    }
  }

  return Object.keys(errors).length > 0
    ? { success: false, errors }
    : { success: true, data }
}

export function emptyOrganisationStringToNull(
  value: string,
): string | null {
  const normalized = clean(value)
  return normalized || null
}
