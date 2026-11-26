import { createClient, type User } from '@supabase/supabase-js'

import { sendTemporaryAccessEmail } from '../email/postmark.js'
import { describeError, stageError } from '../errors.js'
import { generateTemporaryPassword } from './temporaryPassword.js'
import { availableUsername } from './username.js'

type PlatformRole = 'client' | 'superadmin'

type EmploymentPosition =
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

type ImportRow = {
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

type ImportResult = {
  rowNumber: number
  email: string
  status: 'created' | 'updated' | 'skipped' | 'failed'
  userId?: string
  message?: string
}

type ProfileRow = {
  id: string
  email: string | null
  org_id: string | null
  username: string | null
  active: boolean | null
  position: EmploymentPosition | null
}

type OrganisationRow = {
  id: string
  name: string
  logo_path: string | null
  banner_path: string | null
  email_domain: string | null
}

type ValidatedRow = {
  rowNumber: number
  values: ImportRow
  existingUserId: string | null
}

const ROLES = new Set<PlatformRole>(['client', 'superadmin'])
const POSITIONS = new Set<EmploymentPosition>([
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
const MANAGER_POSITIONS = new Set<EmploymentPosition>([
  'Manager',
  'Senior Manager',
])
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[+\d][\d\s().-]{5,24}$/
const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_IMPORT_ROWS = 500

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function env(name: string): string | undefined {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> }
  }

  return runtime.process?.env?.[name]
}

function createAdminClient() {
  const supabaseUrl = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
  const serviceKey =
    env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'Server configuration is missing SUPABASE_URL and SUPABASE_SECRET_KEY.',
    )
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function bearerToken(request: Request): string | null {
  const match = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

async function requireSuperadmin(request: Request) {
  const token = bearerToken(request)
  if (!token) {
    return { ok: false as const, response: json({ error: 'Authentication required.' }, 401) }
  }

  const admin = createAdminClient()
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token)
  if (authError || !user) {
    return {
      ok: false as const,
      response: json({ error: 'Your session is invalid or expired.' }, 401),
    }
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role, active')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError) throw profileError
  if (profile?.role !== 'superadmin' || profile.active === false) {
    return {
      ok: false as const,
      response: json({ error: 'Super-admin access is required.' }, 403),
    }
  }

  return { ok: true as const, admin }
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function nullable(value: string): string | null {
  return value || null
}

function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf('@') + 1).toLowerCase()
}

function importPriority(position: ImportRow['position']): number {
  if (position === 'Senior Manager') return 0
  if (position === 'Manager') return 1
  return 2
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
}

function normalizeRow(value: unknown): ImportRow | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (typeof row.active !== 'boolean') return null

  return {
    fullName: clean(row.fullName).replace(/\s+/g, ' '),
    email: clean(row.email).toLowerCase(),
    department: clean(row.department),
    branch: clean(row.branch),
    managerEmail: clean(row.managerEmail).toLowerCase(),
    locationSite: clean(row.locationSite),
    jobTitle: clean(row.jobTitle),
    position: clean(row.position) as EmploymentPosition | '',
    hireDate: clean(row.hireDate),
    role: clean(row.role) as PlatformRole,
    active: row.active,
    phone: clean(row.phone),
    username: clean(row.username).toLowerCase(),
  }
}

function validateRow(values: ImportRow): string | null {
  if (values.fullName.length < 2 || values.fullName.length > 120) {
    return 'Full name must be between 2 and 120 characters.'
  }
  if (!EMAIL_PATTERN.test(values.email) || values.email.length > 254) {
    return 'Enter a valid email address.'
  }
  if (!ROLES.has(values.role)) return 'Use client or superadmin as the platform role.'
  if (values.phone && !PHONE_PATTERN.test(values.phone)) {
    return 'Enter a valid phone number.'
  }
  if (values.username && (
    values.username.length < 3 ||
    values.username.length > 50 ||
    !USERNAME_PATTERN.test(values.username)
  )) {
    return 'Username must be 3–50 characters using letters, numbers, dots, underscores or hyphens.'
  }
  if (values.managerEmail && !EMAIL_PATTERN.test(values.managerEmail)) {
    return 'Enter a valid manager email address.'
  }
  if (values.managerEmail === values.email) {
    return 'A user cannot be their own manager.'
  }
  if (values.position && !POSITIONS.has(values.position)) {
    return 'Select a supported employment level.'
  }
  if (values.hireDate && !validDate(values.hireDate)) {
    return 'Start date must use YYYY-MM-DD.'
  }
  for (const field of [
    values.department,
    values.branch,
    values.locationSite,
    values.jobTitle,
  ]) {
    if (field.length > 120) return 'Employment text fields must be 120 characters or fewer.'
  }

  if (values.role === 'client') {
    if (!values.department) return 'Department is required.'
    if (!values.branch) return 'Branch is required.'
    if (!values.locationSite) return 'Location/site is required.'
    if (!values.jobTitle) return 'Job title is required.'
    if (!values.position) return 'Employment level is required.'
    if (!values.hireDate) return 'Start date is required.'
  }

  return null
}

async function listAllAuthUsers(admin: ReturnType<typeof createAdminClient>) {
  const users: User[] = []
  const perPage = 1000

  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < perPage) break
  }

  return users
}

function profilePayload(
  id: string,
  organisationId: string,
  values: ImportRow,
  managerId: string | null = null,
  temporaryAccess = false,
) {
  return {
    id,
    email: values.email,
    full_name: values.fullName,
    phone: nullable(values.phone),
    role: values.role,
    org_id: organisationId,
    department: nullable(values.department),
    branch: nullable(values.branch),
    manager_id: managerId,
    location_site: nullable(values.locationSite),
    job_title: nullable(values.jobTitle),
    position: nullable(values.position),
    hire_date: nullable(values.hireDate),
    username: nullable(values.username),
    active: values.active,
    ...(temporaryAccess
      ? {
          must_change_password: true,
          temporary_password_issued_at: new Date().toISOString(),
          onboarding_completed_at: null,
        }
      : {}),
  }
}

async function prepareRows(
  admin: ReturnType<typeof createAdminClient>,
  organisationId: string,
  inputRows: unknown[],
) {
  const [authUsers, profilesResult, organisationResult] = await Promise.all([
    listAllAuthUsers(admin),
    admin.from('profiles').select('id, email, org_id, username, active, position'),
    admin
      .from('organisations')
      .select('id, name, logo_path, banner_path, email_domain')
      .eq('id', organisationId)
      .maybeSingle(),
  ])
  if (profilesResult.error) throw profilesResult.error
  if (organisationResult.error) throw organisationResult.error
  if (!organisationResult.data) throw new Error('The selected organisation does not exist.')

  const profiles = (profilesResult.data || []) as ProfileRow[]
  const organisation = organisationResult.data as OrganisationRow
  const authByEmail = new Map(
    authUsers
      .filter((user) => user.email)
      .map((user) => [user.email!.toLowerCase(), user]),
  )
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
  const profileByEmail = new Map(
    profiles
      .filter((profile) => profile.email)
      .map((profile) => [profile.email!.toLowerCase(), profile]),
  )
  const profileByUsername = new Map(
    profiles
      .filter((profile) => profile.username)
      .map((profile) => [profile.username!.toLowerCase(), profile]),
  )
  const emailCounts = new Map<string, number>()
  const usernameCounts = new Map<string, number>()
  const normalized = inputRows.map((row, index) => ({
    rowNumber: index + 2,
    values: normalizeRow(row),
  }))

  const reservedUsernames = new Set(
    profiles
      .map((profile) => profile.username?.toLowerCase())
      .filter((username): username is string => Boolean(username)),
  )
  for (const row of normalized) {
    if (row.values?.username) reservedUsernames.add(row.values.username)
  }

  for (const row of normalized) {
    const values = row.values
    if (!values || values.username || !values.email) continue

    const authUser = authByEmail.get(values.email)
    const existingProfile = authUser
      ? profileById.get(authUser.id)
      : profileByEmail.get(values.email)
    if (existingProfile?.username) {
      values.username = existingProfile.username.toLowerCase()
      continue
    }

    const generated = availableUsername({
      fullName: values.fullName,
      email: values.email,
      department: values.department,
      branch: values.branch,
      locationSite: values.locationSite,
      organisationName: organisation.name,
    }, (username) => !reservedUsernames.has(username))

    if (generated) {
      values.username = generated
      reservedUsernames.add(generated)
    }
  }

  for (const row of normalized) {
    if (row.values?.email) {
      emailCounts.set(row.values.email, (emailCounts.get(row.values.email) || 0) + 1)
    }
    if (row.values?.username) {
      usernameCounts.set(
        row.values.username,
        (usernameCounts.get(row.values.username) || 0) + 1,
      )
    }
  }

  const batchEmails = new Set(
    normalized.map((row) => row.values?.email).filter(Boolean) as string[],
  )
  const batchUsersByEmail = new Map(
    normalized
      .filter((row): row is typeof row & { values: ImportRow } => Boolean(row.values))
      .map((row) => [row.values.email, row.values]),
  )
  const validRows: ValidatedRow[] = []
  const invalidResults: ImportResult[] = []

  for (const row of normalized) {
    const values = row.values
    if (!values) {
      invalidResults.push({
        rowNumber: row.rowNumber,
        email: '',
        status: 'failed',
        message: 'Row is not a valid user object.',
      })
      continue
    }

    let message = validateRow(values)
    const authUser = authByEmail.get(values.email)
    const existingProfile = authUser
      ? profileById.get(authUser.id)
      : profileByEmail.get(values.email)

    if (!message && !organisation.email_domain) {
      message = 'Configure the organisation email domain before importing users.'
    }
    if (
      !message &&
      emailDomain(values.email) !== organisation.email_domain!.toLowerCase()
    ) {
      message = `Email must use the organisation domain @${organisation.email_domain}.`
    }

    if (!message && (emailCounts.get(values.email) || 0) > 1) {
      message = 'Email is duplicated in this import.'
    }
    if (!message && values.username && (usernameCounts.get(values.username) || 0) > 1) {
      message = 'Username is duplicated in this import.'
    }
    if (!message && existingProfile && existingProfile.org_id !== organisationId) {
      message = 'This user already belongs to another organisation.'
    }
    if (!message && values.username) {
      const usernameOwner = profileByUsername.get(values.username)
      if (usernameOwner && usernameOwner.id !== authUser?.id) {
        message = 'Username is already used by another account.'
      }
    }
    if (!message && profileByEmail.has(values.email) && !authUser) {
      message = 'A profile uses this email but its Auth account could not be matched.'
    }
    if (!message && values.managerEmail) {
      const importedManager = batchUsersByEmail.get(values.managerEmail)

      if (importedManager) {
        if (!importedManager.active) {
          message = 'The selected manager must be active.'
        } else if (!MANAGER_POSITIONS.has(importedManager.position as EmploymentPosition)) {
          message = 'The selected manager must have a Manager or Senior Manager employment level.'
        }
      } else if (!batchEmails.has(values.managerEmail)) {
        const manager = authByEmail.get(values.managerEmail)
        const managerProfile = manager ? profileById.get(manager.id) : undefined
        if (!managerProfile || managerProfile.org_id !== organisationId) {
          message = 'Manager email was not found in this organisation or import.'
        } else if (managerProfile.active === false) {
          message = 'The selected manager must be active.'
        } else if (!MANAGER_POSITIONS.has(managerProfile.position as EmploymentPosition)) {
          message = 'The selected manager must have a Manager or Senior Manager employment level.'
        }
      }
    }

    if (message) {
      invalidResults.push({
        rowNumber: row.rowNumber,
        email: values.email,
        status: 'failed',
        message,
      })
    } else {
      validRows.push({
        rowNumber: row.rowNumber,
        values,
        existingUserId: authUser?.id || null,
      })
    }
  }

  return {
    validRows,
    invalidResults,
    authByEmail,
    profileById,
    organisation,
  }
}

function temporaryAccessTemplateModel(
  admin: ReturnType<typeof createAdminClient>,
  organisation: OrganisationRow,
  values: ImportRow,
  temporaryPassword: string,
) {
  if (!organisation.logo_path || !organisation.banner_path) {
    throw new Error(
      'Upload the organisation logo and banner before importing users.',
    )
  }

  const siteUrl = (env('PUBLIC_SITE_URL') || env('SITE_URL') ||
    'https://www.culture-xe.com').replace(/\/$/, '')
  const logoUrl = admin.storage
    .from('Company Logos')
    .getPublicUrl(organisation.logo_path).data.publicUrl
  const bannerUrl = admin.storage
    .from('Company Banners')
    .getPublicUrl(organisation.banner_path).data.publicUrl

  return {
    organisation_name: organisation.name,
    organisation_logo_url: logoUrl,
    organisation_banner_url: bannerUrl,
    recipient_name: values.fullName,
    username: values.username,
    temporary_password: temporaryPassword,
    invite_url: `${siteUrl}/login`,
    support_email: env('SUPPORT_EMAIL') || 'support@stratxe.com',
  }
}

async function runImport(
  admin: ReturnType<typeof createAdminClient>,
  organisationId: string,
  organisation: OrganisationRow,
  rows: ValidatedRow[],
  existingAuthByEmail: Map<string, User>,
  existingProfilesById: Map<string, ProfileRow>,
) {
  const results: ImportResult[] = []
  const userIdByEmail = new Map<string, string>()
  const successfulRows: Array<ValidatedRow & { userId: string }> = []
  const orderedRows = [...rows].sort((first, second) =>
    importPriority(first.values.position) - importPriority(second.values.position) ||
    first.rowNumber - second.rowNumber,
  )

  for (const row of orderedRows) {
    const { values } = row
    let createdUserId: string | null = null

    try {
      let userId = row.existingUserId
      let status: ImportResult['status'] = 'updated'
      let temporaryPassword: string | null = null

      if (!userId) {
        temporaryPassword = generateTemporaryPassword()
        const { data, error } = await admin.auth.admin.createUser({
          email: values.email,
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: { full_name: values.fullName, role: values.role },
        })
        if (error) throw stageError('Account creation failed', error)
        userId = data.user.id
        createdUserId = userId
        status = 'created'
      }

      const { error: authError } = await admin.auth.admin.updateUserById(userId, {
        phone: nullable(values.phone) || undefined,
        user_metadata: { full_name: values.fullName, role: values.role },
        ban_duration: values.active ? 'none' : '876000h',
      })
      if (authError) throw stageError('Authentication update failed', authError)

      const managerId = values.managerEmail
        ? userIdByEmail.get(values.managerEmail) ||
          existingAuthByEmail.get(values.managerEmail)?.id || null
        : null

      const { error: profileError } = await admin
        .from('profiles')
        .upsert(
          profilePayload(
            userId,
            organisationId,
            values,
            managerId,
            status === 'created',
          ),
          { onConflict: 'id' },
        )
      if (profileError) throw stageError('Profile save failed', profileError)

      if (status === 'created' && temporaryPassword) {
        let messageId: string
        try {
          messageId = await sendTemporaryAccessEmail({
            to: values.email,
            model: temporaryAccessTemplateModel(
              admin,
              organisation,
              values,
              temporaryPassword,
            ),
          })
        } catch (error) {
          throw stageError('Temporary-access email failed', error)
        }
        const { error: deliveryError } = await admin
          .from('profiles')
          .update({
            onboarding_email_message_id: messageId,
            onboarding_email_sent_at: new Date().toISOString(),
          })
          .eq('id', userId)
        if (deliveryError) {
          throw stageError('Email delivery tracking failed', deliveryError)
        }
      }

      userIdByEmail.set(values.email, userId)
      successfulRows.push({ ...row, userId })
      results.push({
        rowNumber: row.rowNumber,
        email: values.email,
        status,
        userId,
      })
    } catch (error) {
      if (createdUserId) {
        await admin.from('profiles').delete().eq('id', createdUserId)
        await admin.auth.admin.deleteUser(createdUserId)
      }
      results.push({
        rowNumber: row.rowNumber,
        email: values.email,
        status: 'failed',
        message: describeError(error, 'User import failed without further details.'),
      })
    }
  }

  for (const row of successfulRows) {
    if (!row.values.managerEmail) continue

    const managerId = userIdByEmail.get(row.values.managerEmail) ||
      existingAuthByEmail.get(row.values.managerEmail)?.id || null
    if (!managerId || managerId === row.userId) continue

    const managerProfile = existingProfilesById.get(managerId)
    if (managerProfile && managerProfile.org_id !== organisationId) continue

    const { error } = await admin
      .from('profiles')
      .update({ manager_id: managerId })
      .eq('id', row.userId)

    if (error) {
      const result = results.find((item) => item.rowNumber === row.rowNumber)
      if (result) {
        result.status = 'failed'
        result.message = `Account saved, but manager link failed: ${describeError(
          error,
          'The database did not provide further details.',
        )}`
      }
    }
  }

  return results.sort((first, second) => first.rowNumber - second.rowNumber)
}

async function route(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405)
  }

  try {
    const auth = await requireSuperadmin(request)
    if (!auth.ok) return auth.response

    let body: { organisationId?: unknown; rows?: unknown }
    try {
      body = await request.json()
    } catch {
      return json({ error: 'Request body must be valid JSON.' }, 400)
    }

    const organisationId = clean(body.organisationId)
    if (!UUID_PATTERN.test(organisationId)) {
      return json({ error: 'Select a valid organisation.' }, 400)
    }
    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return json({ error: 'At least one user row is required.' }, 400)
    }
    if (body.rows.length > MAX_IMPORT_ROWS) {
      return json({ error: `Import no more than ${MAX_IMPORT_ROWS} users at once.` }, 400)
    }

    const prepared = await prepareRows(auth.admin, organisationId, body.rows)
    if (prepared.invalidResults.length > 0) {
      return json({
        error: 'Fix every invalid row before importing.',
        results: prepared.invalidResults,
      }, 400)
    }

    const results = await runImport(
      auth.admin,
      organisationId,
      prepared.organisation,
      prepared.validRows,
      prepared.authByEmail,
      prepared.profileById,
    )
    const count = (status: ImportResult['status']) =>
      results.filter((result) => result.status === status).length

    return json({
      results,
      total: results.length,
      created: count('created'),
      updated: count('updated'),
      skipped: count('skipped'),
      failed: count('failed'),
    })
  } catch (error) {
    console.error('user import API error', error)
    return json({
      error: describeError(error, 'Unexpected user import server error.'),
    }, 500)
  }
}

export default {
  fetch: route,
}
