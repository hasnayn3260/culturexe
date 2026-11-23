import type {
  ParsedUserImportRow,
  UserImportColumn,
  UserImportColumnKey,
  UserImportFieldErrors,
  UserImportValues,
} from './userImportSchema'
import {
  REQUIRED_USER_IMPORT_COLUMNS,
  USER_IMPORT_COLUMNS,
  USER_IMPORT_POSITIONS,
  USER_IMPORT_ROLES,
} from './userImportSchema'

type ParseOptions = {
  organisationId: string
}

export type UserImportPreviewRow = ParsedUserImportRow & {
  rowErrors: string[]
}

export type UserImportParseResult = {
  rows: UserImportPreviewRow[]
  missingHeaders: string[]
  duplicateHeaders: string[]
  unknownHeaders: string[]
  fileErrors: string[]
  validRowCount: number
  invalidRowCount: number
  canImport: boolean
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[+\d][\d\s().-]{5,24}$/
const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s/-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

function buildHeaderLookup(): Map<string, UserImportColumn> {
  const lookup = new Map<string, UserImportColumn>()

  for (const column of USER_IMPORT_COLUMNS) {
    lookup.set(normalizeHeader(column.header), column)
    for (const alias of column.aliases) {
      lookup.set(normalizeHeader(alias), column)
    }
  }

  return lookup
}

function readCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          cell += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        cell += character
      }
      continue
    }

    if (character === '"' && cell.length === 0) {
      quoted = true
    } else if (character === ',') {
      row.push(cell)
      cell = ''
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(cell)
      if (row.some((value) => value.trim())) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += character
    }
  }

  if (quoted) throw new Error('The CSV contains an unclosed quoted value.')

  row.push(cell)
  if (row.some((value) => value.trim())) rows.push(row)
  return rows
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
}

function normalizeRole(value: string): UserImportValues['role'] | null {
  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, '')
  if (normalized === 'client') return 'client'
  if (normalized === 'superadmin') return 'superadmin'
  return null
}

function normalizePosition(value: string): UserImportValues['position'] | null {
  const match = USER_IMPORT_POSITIONS.find(
    (position) => position.toLowerCase() === value.trim().toLowerCase(),
  )
  return match || null
}

function normalizeActive(value: string): boolean | null {
  const normalized = value.trim().toLowerCase()
  if (['true', 'yes', '1', 'active', 'enabled'].includes(normalized)) return true
  if (['false', 'no', '0', 'inactive', 'disabled'].includes(normalized)) return false
  return null
}

function emptyValues(): UserImportValues {
  return {
    fullName: '',
    email: '',
    department: '',
    branch: '',
    managerEmail: '',
    locationSite: '',
    jobTitle: '',
    position: '',
    hireDate: '',
    role: 'client',
    active: true,
    phone: '',
    username: '',
  }
}

function validateRow(
  source: Partial<Record<UserImportColumnKey, string>>,
  organisationId: string,
): { values: UserImportValues; errors: UserImportFieldErrors } {
  const values = emptyValues()
  const errors: UserImportFieldErrors = {}

  values.fullName = (source.fullName || '').trim().replace(/\s+/g, ' ')
  values.email = (source.email || '').trim().toLowerCase()
  values.department = (source.department || '').trim()
  values.branch = (source.branch || '').trim()
  values.managerEmail = (source.managerEmail || '').trim().toLowerCase()
  values.locationSite = (source.locationSite || '').trim()
  values.jobTitle = (source.jobTitle || '').trim()
  values.hireDate = (source.hireDate || '').trim()
  values.phone = (source.phone || '').trim()
  values.username = (source.username || '').trim().toLowerCase()

  const role = normalizeRole(source.role || '')
  const position = normalizePosition(source.position || '')
  const active = normalizeActive(source.active || '')
  if (role) values.role = role
  if (position) values.position = position
  if (active !== null) values.active = active

  if (!UUID_PATTERN.test(organisationId)) {
    errors.organisationId = 'Select an organisation before importing.'
  }
  if (values.fullName.length < 2 || values.fullName.length > 120) {
    errors.fullName = 'Full name must be between 2 and 120 characters.'
  }
  if (!EMAIL_PATTERN.test(values.email) || values.email.length > 254) {
    errors.email = 'Enter a valid email address.'
  }
  if (!role || !USER_IMPORT_ROLES.includes(role)) {
    errors.role = 'Use client or superadmin.'
  }
  if (source.active === undefined || active === null) {
    errors.active = 'Use true or false.'
  }

  if (values.role === 'client') {
    if (!values.department) errors.department = 'Department is required.'
    if (!values.branch) errors.branch = 'Branch is required.'
    if (!values.locationSite) errors.locationSite = 'Location/site is required.'
    if (!values.jobTitle) errors.jobTitle = 'Job title is required.'
    if (!position) errors.position = 'Select a supported employment level.'
    if (!values.hireDate) errors.hireDate = 'Start date is required.'
  } else if (source.position && !position) {
    errors.position = 'Select a supported employment level.'
  }

  if (values.hireDate && !validDate(values.hireDate)) {
    errors.hireDate = 'Use YYYY-MM-DD.'
  }
  if (values.managerEmail && !EMAIL_PATTERN.test(values.managerEmail)) {
    errors.managerEmail = 'Enter a valid manager email.'
  } else if (values.managerEmail === values.email) {
    errors.managerEmail = 'A user cannot be their own manager.'
  }
  if (values.phone && !PHONE_PATTERN.test(values.phone)) {
    errors.phone = 'Enter a valid phone number.'
  }
  if (values.username) {
    if (values.username.length < 3 || values.username.length > 50) {
      errors.username = 'Username must be between 3 and 50 characters.'
    } else if (!USERNAME_PATTERN.test(values.username)) {
      errors.username = 'Use letters, numbers, dots, underscores or hyphens.'
    }
  }

  for (const key of [
    'department',
    'branch',
    'locationSite',
    'jobTitle',
  ] as const) {
    if (values[key].length > 120) errors[key] = 'Use 120 characters or fewer.'
  }

  return { values, errors }
}

export function parseUserImportCsv(
  text: string,
  options: ParseOptions,
): UserImportParseResult {
  const fileErrors: string[] = []
  let csvRows: string[][]

  try {
    csvRows = readCsv(text)
  } catch (error) {
    return {
      rows: [],
      missingHeaders: [],
      duplicateHeaders: [],
      unknownHeaders: [],
      fileErrors: [error instanceof Error ? error.message : 'Unable to read CSV.'],
      validRowCount: 0,
      invalidRowCount: 0,
      canImport: false,
    }
  }

  if (csvRows.length === 0) {
    fileErrors.push('The CSV is empty.')
    return {
      rows: [],
      missingHeaders: [],
      duplicateHeaders: [],
      unknownHeaders: [],
      fileErrors,
      validRowCount: 0,
      invalidRowCount: 0,
      canImport: false,
    }
  }

  const lookup = buildHeaderLookup()
  const headers = csvRows[0].map((header) => header.trim())
  const columns = headers.map((header) => lookup.get(normalizeHeader(header)))
  const seenKeys = new Set<UserImportColumnKey>()
  const duplicateHeaders: string[] = []
  const unknownHeaders: string[] = []

  columns.forEach((column, index) => {
    if (!column) {
      if (headers[index]) unknownHeaders.push(headers[index])
      return
    }
    if (seenKeys.has(column.key)) duplicateHeaders.push(headers[index])
    seenKeys.add(column.key)
  })

  const missingHeaders = REQUIRED_USER_IMPORT_COLUMNS
    .filter((column) => !seenKeys.has(column.key))
    .map((column) => column.header)
  const emailCounts = new Map<string, number>()

  const rows = csvRows.slice(1).map((cells, index): UserImportPreviewRow => {
    const source: Partial<Record<UserImportColumnKey, string>> = {}
    const rowErrors: string[] = []

    columns.forEach((column, columnIndex) => {
      if (column && source[column.key] === undefined) {
        source[column.key] = cells[columnIndex] || ''
      }
    })

    if (cells.length > headers.length) {
      rowErrors.push('Row contains more values than the header.')
    }

    const { values, errors } = validateRow(source, options.organisationId)
    if (values.email) {
      emailCounts.set(values.email, (emailCounts.get(values.email) || 0) + 1)
    }

    return {
      rowNumber: index + 2,
      values,
      errors,
      rowErrors,
      valid: Object.keys(errors).length === 0 && rowErrors.length === 0,
    }
  })

  for (const row of rows) {
    if (row.values.email && (emailCounts.get(row.values.email) || 0) > 1) {
      row.errors.email = 'Email is duplicated in this file.'
      row.valid = false
    }
  }

  if (rows.length === 0) fileErrors.push('The CSV does not contain any user rows.')
  const validRowCount = rows.filter((row) => row.valid).length
  const invalidRowCount = rows.length - validRowCount
  const hasHeaderErrors = missingHeaders.length > 0 || duplicateHeaders.length > 0

  return {
    rows,
    missingHeaders,
    duplicateHeaders,
    unknownHeaders,
    fileErrors,
    validRowCount,
    invalidRowCount,
    canImport: fileErrors.length === 0 && !hasHeaderErrors &&
      invalidRowCount === 0 && rows.length > 0,
  }
}
