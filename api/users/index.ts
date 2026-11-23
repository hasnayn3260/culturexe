import { createClient, type User } from '@supabase/supabase-js'

import { sendTemporaryAccessEmail } from '../email/postmark.js'
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

type UserValues = {
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

type ProfileRow = {
  id: string
  email: string | null
  role: PlatformRole | null
  org_id: string | null
  full_name: string | null
  created_at: string | null
  active: boolean | null
  department: string | null
  job_title: string | null
  manager_id: string | null
  hire_date: string | null
  phone: string | null
  username: string | null
  position: EmploymentPosition | null
  branch: string | null
  location_site: string | null
  must_change_password: boolean | null
  temporary_password_issued_at: string | null
  onboarding_completed_at: string | null
  onboarding_email_message_id: string | null
  onboarding_email_sent_at: string | null
}

type OrganisationRow = {
  id: string
  name: string
  logo_path?: string | null
  banner_path?: string | null
}

type RequestBody = {
  id?: unknown
  action?: unknown
  values?: unknown
}

type ValidationResult =
  | { success: true; data: UserValues }
  | { success: false; message: string }

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
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

function getServerConfig() {
  const supabaseUrl = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
  const serviceKey =
    env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'Server configuration is missing SUPABASE_URL and SUPABASE_SECRET_KEY.',
    )
  }

  return { supabaseUrl, serviceKey }
}

function createAdminClient() {
  const { supabaseUrl, serviceKey } = getServerConfig()

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function bearerToken(request: Request): string | null {
  const value = request.headers.get('authorization')
  const match = value?.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

async function requireSuperadmin(request: Request) {
  const token = bearerToken(request)
  if (!token) {
    return {
      ok: false as const,
      error: json({ error: 'Authentication required.' }, 401),
    }
  }

  const admin = createAdminClient()
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token)

  if (authError || !user) {
    return {
      ok: false as const,
      error: json({ error: 'Your session is invalid or expired.' }, 401),
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
      error: json({ error: 'Super-admin access is required.' }, 403),
    }
  }

  return { ok: true as const, admin, actor: user }
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function nullable(value: string): string | null {
  return value || null
}

function validateValues(value: unknown): ValidationResult {
  if (!value || typeof value !== 'object') {
    return { success: false, message: 'User details are required.' }
  }

  const input = value as Record<string, unknown>
  const role = cleanString(input.role) as PlatformRole
  const position = cleanString(input.position) as EmploymentPosition | ''
  const data: UserValues = {
    fullName: cleanString(input.fullName).replace(/\s+/g, ' '),
    email: cleanString(input.email).toLowerCase(),
    phone: cleanString(input.phone),
    organisationId: cleanString(input.organisationId),
    department: cleanString(input.department),
    branch: cleanString(input.branch),
    managerId: cleanString(input.managerId),
    locationSite: cleanString(input.locationSite),
    jobTitle: cleanString(input.jobTitle),
    position,
    hireDate: cleanString(input.hireDate),
    username: cleanString(input.username).toLowerCase(),
    role,
    active: input.active !== false,
  }

  if (data.fullName.length < 2 || data.fullName.length > 120) {
    return { success: false, message: 'Enter a valid full name.' }
  }
  if (!EMAIL_PATTERN.test(data.email) || data.email.length > 254) {
    return { success: false, message: 'Enter a valid email address.' }
  }
  if (!ROLES.has(data.role)) {
    return { success: false, message: 'Select a valid platform role.' }
  }
  if (data.role === 'client' && !UUID_PATTERN.test(data.organisationId)) {
    return { success: false, message: 'Select an organisation for this client.' }
  }
  if (data.organisationId && !UUID_PATTERN.test(data.organisationId)) {
    return { success: false, message: 'Select a valid organisation.' }
  }
  if (data.managerId && !UUID_PATTERN.test(data.managerId)) {
    return { success: false, message: 'Select a valid manager.' }
  }
  if (data.position && !POSITIONS.has(data.position)) {
    return { success: false, message: 'Select a valid employment position.' }
  }
  if (data.hireDate && !/^\d{4}-\d{2}-\d{2}$/.test(data.hireDate)) {
    return { success: false, message: 'Enter a valid start date.' }
  }
  if (data.username && (
    data.username.length < 3 ||
    data.username.length > 50 ||
    !USERNAME_PATTERN.test(data.username)
  )) {
    return {
      success: false,
      message: 'Username must be 3–50 characters using letters, numbers, dots, underscores or hyphens.',
    }
  }

  if (data.role === 'client') {
    if (!data.department) {
      return { success: false, message: 'Enter the employee’s department.' }
    }
    if (!data.branch) {
      return { success: false, message: 'Enter the employee’s branch.' }
    }
    if (!data.locationSite) {
      return { success: false, message: 'Enter the employee’s location or site.' }
    }
    if (!data.jobTitle) {
      return { success: false, message: 'Enter the employee’s job title.' }
    }
    if (!data.position) {
      return { success: false, message: 'Select the employee’s employment level.' }
    }
    if (!data.hireDate) {
      return { success: false, message: 'Enter the employee’s start date.' }
    }
  }

  return { success: true, data }
}

async function readBody(request: Request): Promise<RequestBody> {
  try {
    return await request.json() as RequestBody
  } catch {
    throw new Error('Request body must be valid JSON.')
  }
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

function providerNames(user: User): string[] {
  const identityProviders = (user.identities || [])
    .map((identity) => identity.provider)
    .filter((provider): provider is string => Boolean(provider))

  if (identityProviders.length > 0) return [...new Set(identityProviders)]

  const metadataProviders = user.app_metadata?.providers
  return Array.isArray(metadataProviders)
    ? metadataProviders.filter((provider): provider is string =>
      typeof provider === 'string')
    : []
}

function managedUser(
  user: User,
  profile: ProfileRow | undefined,
  organisations: Map<string, OrganisationRow>,
  profiles: Map<string, ProfileRow>,
) {
  const organisation = profile?.org_id
    ? organisations.get(profile.org_id) || null
    : null
  const manager = profile?.manager_id
    ? profiles.get(profile.manager_id)
    : undefined
  const providers = providerNames(user)

  return {
    id: user.id,
    fullName: profile?.full_name || null,
    email: user.email || profile?.email || null,
    authEmail: user.email || null,
    profileEmail: profile?.email || null,
    phone: user.phone || profile?.phone || null,
    authPhone: user.phone || null,
    profilePhone: profile?.phone || null,
    role: profile?.role || null,
    active: profile?.active !== false,
    organisationId: profile?.org_id || null,
    organisation,
    department: profile?.department || null,
    branch: profile?.branch || null,
    managerId: profile?.manager_id || null,
    manager: manager
      ? { id: manager.id, fullName: manager.full_name, email: manager.email }
      : null,
    locationSite: profile?.location_site || null,
    jobTitle: profile?.job_title || null,
    position: profile?.position || null,
    hireDate: profile?.hire_date || null,
    username: profile?.username || null,
    mustChangePassword: profile?.must_change_password === true,
    providers,
    providerType: providers[0] || null,
    authCreatedAt: user.created_at || null,
    profileCreatedAt: profile?.created_at || null,
    lastSignInAt: user.last_sign_in_at || null,
  }
}

async function getManagedUser(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
) {
  const [{ data: authData, error: authError }, profileResult, orgResult] =
    await Promise.all([
      admin.auth.admin.getUserById(id),
      admin.from('profiles').select('*').eq('id', id).maybeSingle(),
      admin.from('organisations').select('id, name'),
    ])

  if (authError) throw authError
  if (profileResult.error) throw profileResult.error
  if (orgResult.error) throw orgResult.error

  const profile = profileResult.data as ProfileRow | null
  let manager: ProfileRow | null = null
  if (profile?.manager_id) {
    const result = await admin
      .from('profiles')
      .select('*')
      .eq('id', profile.manager_id)
      .maybeSingle()
    if (result.error) throw result.error
    manager = result.data as ProfileRow | null
  }

  const profileMap = new Map<string, ProfileRow>()
  if (profile) profileMap.set(profile.id, profile)
  if (manager) profileMap.set(manager.id, manager)
  const organisationMap = new Map(
    ((orgResult.data || []) as OrganisationRow[]).map((org) => [org.id, org]),
  )

  return managedUser(authData.user, profile || undefined, organisationMap, profileMap)
}

async function ensureReferences(
  admin: ReturnType<typeof createAdminClient>,
  values: UserValues,
  userId?: string,
) {
  if (values.organisationId) {
    const { data, error } = await admin
      .from('organisations')
      .select('id')
      .eq('id', values.organisationId)
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('The selected organisation does not exist.')
  }

  if (values.managerId) {
    if (values.managerId === userId) {
      throw new Error('A user cannot be their own manager.')
    }

    const { data, error } = await admin
      .from('profiles')
      .select('id, org_id')
      .eq('id', values.managerId)
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('The selected manager does not exist.')
    if (data.org_id !== nullable(values.organisationId)) {
      throw new Error('The manager must belong to the same organisation.')
    }
  }
}

async function resolveUsername(
  admin: ReturnType<typeof createAdminClient>,
  values: UserValues,
  currentUserId?: string,
): Promise<string> {
  const [profilesResult, organisationResult] = await Promise.all([
    admin.from('profiles').select('id, username').not('username', 'is', null),
    values.organisationId
      ? admin.from('organisations').select('name').eq('id', values.organisationId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])
  if (profilesResult.error) throw profilesResult.error
  if (organisationResult.error) throw organisationResult.error

  const owners = new Map<string, string>(
    (profilesResult.data || [])
      .filter((profile) => profile.username)
      .map((profile) => [profile.username.toLowerCase(), profile.id]),
  )

  if (values.username) {
    const ownerId = owners.get(values.username)
    if (ownerId && ownerId !== currentUserId) {
      throw new Error('Username is already used by another account.')
    }
    return values.username
  }

  if (currentUserId) {
    const current = (profilesResult.data || []).find(
      (profile) => profile.id === currentUserId,
    )
    if (current?.username) return current.username.toLowerCase()
  }

  const generated = availableUsername({
    fullName: values.fullName,
    email: values.email,
    department: values.department,
    branch: values.branch,
    locationSite: values.locationSite,
    organisationName: organisationResult.data?.name || '',
  }, (username) => !owners.has(username))

  if (!generated) {
    throw new Error(
      'A unique username could not be generated without numbers. Enter a meaningful username manually.',
    )
  }
  return generated
}

function profileValues(id: string, values: UserValues, temporaryAccess = false) {
  return {
    id,
    email: values.email,
    full_name: values.fullName,
    phone: nullable(values.phone),
    role: values.role,
    org_id: nullable(values.organisationId),
    department: nullable(values.department),
    branch: nullable(values.branch),
    manager_id: nullable(values.managerId),
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

async function temporaryAccessTemplateModel(
  admin: ReturnType<typeof createAdminClient>,
  values: UserValues,
  temporaryPassword: string,
) {
  const siteUrl = (env('PUBLIC_SITE_URL') || env('SITE_URL') ||
    'https://www.culture-xe.com').replace(/\/$/, '')
  const supportEmail = env('SUPPORT_EMAIL') || 'support@stratxe.com'

  if (!values.organisationId) {
    return {
      organisation_name: 'CultureXe',
      organisation_logo_url: env('CULTUREXE_LOGO_URL') || `${siteUrl}/aia_logo.svg`,
      organisation_banner_url: env('CULTUREXE_BANNER_URL') || '',
      recipient_name: values.fullName,
      username: values.username,
      temporary_password: temporaryPassword,
      invite_url: `${siteUrl}/login`,
      support_email: supportEmail,
    }
  }

  const { data, error } = await admin
    .from('organisations')
    .select('id, name, logo_path, banner_path')
    .eq('id', values.organisationId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('The selected organisation does not exist.')
  if (!data.logo_path || !data.banner_path) {
    throw new Error(
      'Upload the organisation logo and banner before inviting users.',
    )
  }

  const logoUrl = admin.storage
    .from('Company Logos')
    .getPublicUrl(data.logo_path).data.publicUrl
  const bannerUrl = admin.storage
    .from('Company Banners')
    .getPublicUrl(data.banner_path).data.publicUrl

  return {
    organisation_name: data.name,
    organisation_logo_url: logoUrl,
    organisation_banner_url: bannerUrl,
    recipient_name: values.fullName,
    username: values.username,
    temporary_password: temporaryPassword,
    invite_url: `${siteUrl}/login`,
    support_email: supportEmail,
  }
}

async function ensureNotLastSuperadmin(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
) {
  const { data: target, error: targetError } = await admin
    .from('profiles')
    .select('role, active')
    .eq('id', id)
    .maybeSingle()
  if (targetError) throw targetError
  if (target?.role !== 'superadmin' || target.active === false) return

  const { count, error } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'superadmin')
    .eq('active', true)
  if (error) throw error
  if ((count || 0) <= 1) throw new Error('The last active super-admin cannot be removed.')
}

async function handleGet(admin: ReturnType<typeof createAdminClient>) {
  const [authUsers, profilesResult, organisationsResult] = await Promise.all([
    listAllAuthUsers(admin),
    admin.from('profiles').select('*'),
    admin.from('organisations').select('id, name'),
  ])

  if (profilesResult.error) throw profilesResult.error
  if (organisationsResult.error) throw organisationsResult.error

  const profileMap = new Map(
    ((profilesResult.data || []) as ProfileRow[]).map((profile) => [profile.id, profile]),
  )
  const organisationMap = new Map(
    ((organisationsResult.data || []) as OrganisationRow[])
      .map((organisation) => [organisation.id, organisation]),
  )

  return json({
    users: authUsers.map((user) =>
      managedUser(user, profileMap.get(user.id), organisationMap, profileMap)),
  })
}

async function handlePost(
  request: Request,
  admin: ReturnType<typeof createAdminClient>,
) {
  const body = await readBody(request)
  const validation = validateValues(body.values)
  if (!validation.success) return json({ error: validation.message }, 400)
  const values = validation.data
  await ensureReferences(admin, values)
  values.username = await resolveUsername(admin, values)

  const temporaryPassword = generateTemporaryPassword()
  const templateModel = await temporaryAccessTemplateModel(
    admin,
    values,
    temporaryPassword,
  )
  const { data, error } = await admin.auth.admin.createUser({
    email: values.email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: values.fullName, role: values.role },
  })
  if (error) return json({ error: error.message }, 400)

  try {
    const { error: profileError } = await admin
      .from('profiles')
      .upsert(profileValues(data.user.id, values, true), { onConflict: 'id' })
    if (profileError) throw profileError

    if (!values.active) {
      const { error: banError } = await admin.auth.admin.updateUserById(data.user.id, {
        ban_duration: '876000h',
      })
      if (banError) throw banError
    }

    const messageId = await sendTemporaryAccessEmail({
      to: values.email,
      model: templateModel,
    })
    const { error: deliveryError } = await admin
      .from('profiles')
      .update({
        onboarding_email_message_id: messageId,
        onboarding_email_sent_at: new Date().toISOString(),
      })
      .eq('id', data.user.id)
    if (deliveryError) throw deliveryError
  } catch (creationError) {
    await admin.from('profiles').delete().eq('id', data.user.id)
    await admin.auth.admin.deleteUser(data.user.id)
    throw creationError
  }

  return json({ user: await getManagedUser(admin, data.user.id) }, 201)
}

async function handlePatch(
  request: Request,
  admin: ReturnType<typeof createAdminClient>,
  actor: User,
) {
  const body = await readBody(request)
  const id = cleanString(body.id)
  const action = cleanString(body.action)
  if (!UUID_PATTERN.test(id)) return json({ error: 'A valid user ID is required.' }, 400)

  if (action === 'activate' || action === 'deactivate') {
    if (action === 'deactivate') {
      if (id === actor.id) return json({ error: 'You cannot deactivate your own account.' }, 400)
      await ensureNotLastSuperadmin(admin, id)
    }

    const active = action === 'activate'
    const { error: authError } = await admin.auth.admin.updateUserById(id, {
      ban_duration: active ? 'none' : '876000h',
    })
    if (authError) return json({ error: authError.message }, 400)

    const { error: profileError } = await admin
      .from('profiles')
      .update({ active })
      .eq('id', id)
    if (profileError) throw profileError

    return json({ id, action })
  }

  if (action !== 'update') return json({ error: 'Invalid user action.' }, 400)

  const validation = validateValues(body.values)
  if (!validation.success) return json({ error: validation.message }, 400)
  const values = validation.data
  if (id === actor.id && (values.role !== 'superadmin' || !values.active)) {
    return json({ error: 'You cannot remove your own super-admin access.' }, 400)
  }

  const { data: currentProfile, error: currentError } = await admin
    .from('profiles')
    .select('role, active')
    .eq('id', id)
    .maybeSingle()
  if (currentError) throw currentError
  if (!currentProfile) return json({ error: 'User not found.' }, 404)
  if (
    currentProfile.role === 'superadmin' &&
    currentProfile.active !== false &&
    (values.role !== 'superadmin' || !values.active)
  ) {
    await ensureNotLastSuperadmin(admin, id)
  }

  await ensureReferences(admin, values, id)
  values.username = await resolveUsername(admin, values, id)
  const { error: authError } = await admin.auth.admin.updateUserById(id, {
    email: values.email,
    phone: nullable(values.phone) || undefined,
    user_metadata: { full_name: values.fullName, role: values.role },
    ban_duration: values.active ? 'none' : '876000h',
  })
  if (authError) return json({ error: authError.message }, 400)

  const { error: profileError } = await admin
    .from('profiles')
    .update(profileValues(id, values))
    .eq('id', id)
  if (profileError) throw profileError

  return json({ user: await getManagedUser(admin, id) })
}

async function handleDelete(
  request: Request,
  admin: ReturnType<typeof createAdminClient>,
  actor: User,
) {
  const body = await readBody(request)
  const id = cleanString(body.id)
  if (!UUID_PATTERN.test(id)) return json({ error: 'A valid user ID is required.' }, 400)
  if (id === actor.id) return json({ error: 'You cannot delete your own account.' }, 400)

  await ensureNotLastSuperadmin(admin, id)
  const { data: profile, error: profileReadError } = await admin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (profileReadError) throw profileReadError

  const { error: profileDeleteError } = await admin
    .from('profiles')
    .delete()
    .eq('id', id)
  if (profileDeleteError) throw profileDeleteError

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(id)
  if (authDeleteError) {
    if (profile) await admin.from('profiles').insert(profile)
    return json({ error: authDeleteError.message }, 400)
  }

  return json({ id, action: 'delete' })
}

async function route(request: Request): Promise<Response> {
  try {
    const auth = await requireSuperadmin(request)
    if (!auth.ok) return auth.error

    switch (request.method) {
      case 'GET':
        return await handleGet(auth.admin)
      case 'POST':
        return await handlePost(request, auth.admin)
      case 'PATCH':
        return await handlePatch(request, auth.admin, auth.actor)
      case 'DELETE':
        return await handleDelete(request, auth.admin, auth.actor)
      default:
        return json({ error: 'Method not allowed.' }, 405)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.'
    console.error('admin users API error', error)
    return json({ error: message }, message.includes('valid JSON') ? 400 : 500)
  }
}

export default {
  fetch: route,
}
