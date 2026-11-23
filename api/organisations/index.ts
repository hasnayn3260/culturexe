import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

import {
  mapOrganisationRow,
  organisationDatabasePayload,
  validateOrganisationValues,
  type OrganisationRow,
  type OrganisationStatus,
} from './model.js'

type RequestPayload = {
  id: string
  action: string
  values: unknown
  logo: File | null
  banner: File | null
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ALLOWED_IMAGE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const LOGO_BUCKET = 'Company Logos'
const BANNER_BUCKET = 'Company Banners'

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

function serverConfig() {
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

function adminClient() {
  const { supabaseUrl, serviceKey } = serverConfig()

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
    return {
      ok: false as const,
      response: json({ error: 'Authentication required.' }, 401),
    }
  }

  const admin = adminClient()
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

  return { ok: true as const, admin, actor: user }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parseValues(value: FormDataEntryValue | null): unknown {
  if (typeof value !== 'string') return null

  try {
    return JSON.parse(value) as unknown
  } catch {
    throw new Error('Organisation values must be valid JSON.')
  }
}

function uploadedFile(value: FormDataEntryValue | null): File | null {
  return value instanceof File && value.size > 0 ? value : null
}

async function readPayload(request: Request): Promise<RequestPayload> {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    return {
      id: text(form.get('id')),
      action: text(form.get('action')),
      values: parseValues(form.get('values')),
      logo: uploadedFile(form.get('logo')),
      banner: uploadedFile(form.get('banner')),
    }
  }

  let body: Record<string, unknown>
  try {
    body = await request.json() as Record<string, unknown>
  } catch {
    throw new Error('Request body must be valid JSON or multipart form data.')
  }

  return {
    id: text(body.id),
    action: text(body.action),
    values: body.values,
    logo: null,
    banner: null,
  }
}

function validateImage(file: File | null, label: string): string | null {
  if (!file) return `${label} is required.`
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return `${label} must be a PNG, JPEG or WebP image.`
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `${label} must be 5 MB or smaller.`
  }
  return null
}

function imageObjectPath(organisationId: string, file: File): string {
  const extension = ALLOWED_IMAGE_TYPES.get(file.type)
  if (!extension) throw new Error('Unsupported image type.')
  return `${organisationId}/${crypto.randomUUID()}.${extension}`
}

async function uploadImage(
  admin: SupabaseClient,
  bucket: string,
  organisationId: string,
  file: File,
): Promise<string> {
  const objectPath = imageObjectPath(organisationId, file)
  const { error } = await admin.storage.from(bucket).upload(
    objectPath,
    await file.arrayBuffer(),
    { contentType: file.type, cacheControl: '3600', upsert: false },
  )

  if (error) throw new Error(`Could not upload ${file.name}: ${error.message}`)
  return objectPath
}

async function removeObjects(
  admin: SupabaseClient,
  objects: Array<{ bucket: string; path: string | null | undefined }>,
): Promise<void> {
  await Promise.all(
    objects
      .filter((object): object is { bucket: string; path: string } =>
        Boolean(object.path))
      .map(async ({ bucket, path }) => {
        const { error } = await admin.storage.from(bucket).remove([path])
        if (error) console.error(`Could not remove ${bucket}/${path}`, error)
      }),
  )
}

async function organisationById(
  admin: SupabaseClient,
  id: string,
): Promise<OrganisationRow | null> {
  const { data, error } = await admin
    .from('organisations')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data as OrganisationRow | null
}

async function handleGet(admin: SupabaseClient): Promise<Response> {
  const { supabaseUrl } = serverConfig()
  const { data, error } = await admin
    .from('organisations')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return json({
    organisations: ((data || []) as OrganisationRow[]).map((row) =>
      mapOrganisationRow(row, supabaseUrl)),
  })
}

async function handlePost(
  request: Request,
  admin: SupabaseClient,
  actor: User,
): Promise<Response> {
  const payload = await readPayload(request)
  const validation = validateOrganisationValues(payload.values)
  if (!validation.success) return json({ error: validation.message }, 400)

  const logoError = validateImage(payload.logo, 'Organisation logo')
  if (logoError) return json({ error: logoError }, 400)
  const bannerError = validateImage(payload.banner, 'Organisation banner')
  if (bannerError) return json({ error: bannerError }, 400)

  const organisationId = crypto.randomUUID()
  const uploaded: Array<{ bucket: string; path: string }> = []

  try {
    const logoPath = await uploadImage(
      admin,
      LOGO_BUCKET,
      organisationId,
      payload.logo!,
    )
    uploaded.push({ bucket: LOGO_BUCKET, path: logoPath })

    const bannerPath = await uploadImage(
      admin,
      BANNER_BUCKET,
      organisationId,
      payload.banner!,
    )
    uploaded.push({ bucket: BANNER_BUCKET, path: bannerPath })

    const { data, error } = await admin
      .from('organisations')
      .insert({
        id: organisationId,
        ...organisationDatabasePayload(
          validation.data,
          { logoPath, bannerPath },
          actor.id,
        ),
      })
      .select('*')
      .single()

    if (error) throw error
    const { supabaseUrl } = serverConfig()
    return json(
      { organisation: mapOrganisationRow(data as OrganisationRow, supabaseUrl) },
      201,
    )
  } catch (error) {
    await removeObjects(admin, uploaded)
    throw error
  }
}

async function updateStatus(
  admin: SupabaseClient,
  id: string,
  status: OrganisationStatus,
): Promise<Response> {
  const { data, error } = await admin
    .from('organisations')
    .update({ status })
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) throw error
  if (!data) return json({ error: 'Organisation not found.' }, 404)

  const { supabaseUrl } = serverConfig()
  return json({
    organisation: mapOrganisationRow(data as OrganisationRow, supabaseUrl),
  })
}

async function handlePatch(
  request: Request,
  admin: SupabaseClient,
): Promise<Response> {
  const payload = await readPayload(request)
  if (!UUID_PATTERN.test(payload.id)) {
    return json({ error: 'A valid organisation ID is required.' }, 400)
  }

  if (payload.action === 'activate') {
    return updateStatus(admin, payload.id, 'active')
  }
  if (payload.action === 'deactivate') {
    return updateStatus(admin, payload.id, 'inactive')
  }
  if (payload.action !== 'update') {
    return json({ error: 'Invalid organisation action.' }, 400)
  }

  const current = await organisationById(admin, payload.id)
  if (!current) return json({ error: 'Organisation not found.' }, 404)
  if (!current.logo_path && !payload.logo) {
    return json({ error: 'Organisation logo is required.' }, 400)
  }
  if (!current.banner_path && !payload.banner) {
    return json({ error: 'Organisation banner is required.' }, 400)
  }

  if (payload.logo) {
    const error = validateImage(payload.logo, 'Organisation logo')
    if (error) return json({ error }, 400)
  }
  if (payload.banner) {
    const error = validateImage(payload.banner, 'Organisation banner')
    if (error) return json({ error }, 400)
  }

  const validation = validateOrganisationValues(payload.values)
  if (!validation.success) return json({ error: validation.message }, 400)

  let logoPath = current.logo_path!
  let bannerPath = current.banner_path!
  const uploaded: Array<{ bucket: string; path: string }> = []

  try {
    if (payload.logo) {
      logoPath = await uploadImage(admin, LOGO_BUCKET, payload.id, payload.logo)
      uploaded.push({ bucket: LOGO_BUCKET, path: logoPath })
    }
    if (payload.banner) {
      bannerPath = await uploadImage(
        admin,
        BANNER_BUCKET,
        payload.id,
        payload.banner,
      )
      uploaded.push({ bucket: BANNER_BUCKET, path: bannerPath })
    }

    const { data, error } = await admin
      .from('organisations')
      .update(
        organisationDatabasePayload(validation.data, { logoPath, bannerPath }),
      )
      .eq('id', payload.id)
      .select('*')
      .single()

    if (error) throw error

    await removeObjects(admin, [
      {
        bucket: LOGO_BUCKET,
        path: payload.logo ? current.logo_path : null,
      },
      {
        bucket: BANNER_BUCKET,
        path: payload.banner ? current.banner_path : null,
      },
    ])

    const { supabaseUrl } = serverConfig()
    return json({
      organisation: mapOrganisationRow(data as OrganisationRow, supabaseUrl),
    })
  } catch (error) {
    await removeObjects(admin, uploaded)
    throw error
  }
}

async function linkedRecordCount(
  admin: SupabaseClient,
  table: 'profiles' | 'survey',
  column: 'org_id',
  organisationId: string,
): Promise<number> {
  const { count, error } = await admin
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq(column, organisationId)

  if (error) throw error
  return count || 0
}

async function handleDelete(
  request: Request,
  admin: SupabaseClient,
): Promise<Response> {
  const payload = await readPayload(request)
  if (!UUID_PATTERN.test(payload.id)) {
    return json({ error: 'A valid organisation ID is required.' }, 400)
  }

  const current = await organisationById(admin, payload.id)
  if (!current) return json({ error: 'Organisation not found.' }, 404)

  const [userCount, surveyCount] = await Promise.all([
    linkedRecordCount(admin, 'profiles', 'org_id', payload.id),
    linkedRecordCount(admin, 'survey', 'org_id', payload.id),
  ])

  if (userCount > 0 || surveyCount > 0) {
    return json(
      {
        error:
          `This organisation has ${userCount} linked user${userCount === 1 ? '' : 's'} ` +
          `and ${surveyCount} linked survey${surveyCount === 1 ? '' : 's'}. ` +
          'Deactivate it instead of deleting it.',
      },
      409,
    )
  }

  const { error } = await admin.from('organisations').delete().eq('id', payload.id)
  if (error) throw error

  await removeObjects(admin, [
    { bucket: LOGO_BUCKET, path: current.logo_path },
    { bucket: BANNER_BUCKET, path: current.banner_path },
  ])

  return json({ id: payload.id, action: 'delete' })
}

async function route(request: Request): Promise<Response> {
  try {
    const auth = await requireSuperadmin(request)
    if (!auth.ok) return auth.response

    switch (request.method) {
      case 'GET':
        return await handleGet(auth.admin)
      case 'POST':
        return await handlePost(request, auth.admin, auth.actor)
      case 'PATCH':
        return await handlePatch(request, auth.admin)
      case 'DELETE':
        return await handleDelete(request, auth.admin)
      default:
        return json({ error: 'Method not allowed.' }, 405)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.'
    const isBadRequest =
      message.includes('valid JSON') ||
      message.includes('multipart form data')

    console.error('admin organisations API error', error)
    return json({ error: message }, isBadRequest ? 400 : 500)
  }
}

export default {
  fetch: route,
}
