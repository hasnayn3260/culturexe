import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

import {
  mapSurveyTemplate,
  mapSurveyTemplateQuestion,
  templateDatabasePayload,
  templateQuestionDatabasePayload,
  validateSurveyTemplateValues,
  type SurveyTemplateQuestionRow,
  type SurveyTemplateRow,
  type SurveyTemplateValues,
} from './model.js'

type RequestBody = {
  id?: unknown
  action?: unknown
  active?: unknown
  values?: unknown
}

type TemplateSnapshot = {
  template: SurveyTemplateRow
  questions: SurveyTemplateQuestionRow[]
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const TEMPLATE_COLUMNS =
  'id, org_id, name, description, active, created_by, created_at, updated_at'
const QUESTION_COLUMNS =
  'id, template_id, text, hint, question_type, dimension, order_num, options, created_at, updated_at'

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

function adminClient(): SupabaseClient {
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

async function readBody(request: Request): Promise<RequestBody> {
  try {
    return await request.json() as RequestBody
  } catch {
    throw new Error('Request body must be valid JSON.')
  }
}

function databaseErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) return ''
  return typeof error.code === 'string' ? error.code : ''
}

function databaseErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (!error || typeof error !== 'object' || !('message' in error)) {
    return 'Unexpected database error.'
  }
  return typeof error.message === 'string'
    ? error.message
    : 'Unexpected database error.'
}

function friendlyDatabaseError(error: unknown): { message: string; status: number } {
  if (databaseErrorCode(error) === '23505') {
    return {
      message:
        'A template with this name already exists in the selected scope.',
      status: 409,
    }
  }
  if (databaseErrorCode(error) === '23503') {
    return {
      message: 'The selected organisation or related record no longer exists.',
      status: 409,
    }
  }
  return { message: databaseErrorMessage(error), status: 500 }
}

async function organisationExists(
  admin: SupabaseClient,
  organisationId: string | null,
): Promise<boolean> {
  if (!organisationId) return true
  const { data, error } = await admin
    .from('organisations')
    .select('id')
    .eq('id', organisationId)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

async function templateById(
  admin: SupabaseClient,
  templateId: string,
): Promise<SurveyTemplateRow | null> {
  const { data, error } = await admin
    .from('survey_templates')
    .select(TEMPLATE_COLUMNS)
    .eq('id', templateId)
    .maybeSingle()

  if (error) throw error
  return data as SurveyTemplateRow | null
}

async function questionsByTemplateId(
  admin: SupabaseClient,
  templateId: string,
): Promise<SurveyTemplateQuestionRow[]> {
  const { data, error } = await admin
    .from('survey_template_questions')
    .select(QUESTION_COLUMNS)
    .eq('template_id', templateId)
    .order('order_num', { ascending: true })

  if (error) throw error
  return (data || []) as SurveyTemplateQuestionRow[]
}

async function templateSnapshot(
  admin: SupabaseClient,
  templateId: string,
): Promise<TemplateSnapshot | null> {
  const template = await templateById(admin, templateId)
  if (!template) return null
  return {
    template,
    questions: await questionsByTemplateId(admin, templateId),
  }
}

async function questionCount(
  admin: SupabaseClient,
  templateId: string,
): Promise<number> {
  const { count, error } = await admin
    .from('survey_template_questions')
    .select('id', { count: 'exact', head: true })
    .eq('template_id', templateId)

  if (error) throw error
  return count || 0
}

async function insertQuestions(
  admin: SupabaseClient,
  templateId: string,
  values: SurveyTemplateValues,
): Promise<void> {
  const { error } = await admin.from('survey_template_questions').insert(
    values.questions.map((question) =>
      templateQuestionDatabasePayload(templateId, question)),
  )
  if (error) throw error
}

async function restoreSnapshot(
  admin: SupabaseClient,
  snapshot: TemplateSnapshot,
): Promise<void> {
  const { template, questions } = snapshot
  await admin
    .from('survey_templates')
    .update({
      org_id: template.org_id,
      name: template.name,
      description: template.description,
      active: template.active,
      updated_at: template.updated_at,
    })
    .eq('id', template.id)

  await admin
    .from('survey_template_questions')
    .delete()
    .eq('template_id', template.id)

  if (questions.length > 0) {
    await admin.from('survey_template_questions').insert(
      questions.map((question) => ({
        id: question.id,
        template_id: question.template_id,
        text: question.text,
        hint: question.hint,
        question_type: question.question_type,
        dimension: question.dimension,
        order_num: question.order_num,
        options: question.options,
        created_at: question.created_at,
        updated_at: question.updated_at,
      })),
    )
  }
}

async function handleList(
  request: Request,
  admin: SupabaseClient,
): Promise<Response> {
  const url = new URL(request.url)
  const templateId = text(url.searchParams.get('id'))
  const organisationId = text(url.searchParams.get('organisationId'))
  const activeOnly = url.searchParams.get('activeOnly') === 'true'

  if (templateId) {
    if (!UUID_PATTERN.test(templateId)) {
      return json({ error: 'A valid survey template ID is required.' }, 400)
    }
    const snapshot = await templateSnapshot(admin, templateId)
    if (!snapshot) return json({ error: 'Survey template not found.' }, 404)

    return json({
      template: {
        ...mapSurveyTemplate(snapshot.template, snapshot.questions.length),
        questions: snapshot.questions.map(mapSurveyTemplateQuestion),
      },
    })
  }

  if (organisationId && !UUID_PATTERN.test(organisationId)) {
    return json({ error: 'A valid organisation filter is required.' }, 400)
  }

  let query = admin
    .from('survey_templates')
    .select(TEMPLATE_COLUMNS)
    .order('updated_at', { ascending: false })

  if (activeOnly) query = query.eq('active', true)
  if (organisationId) {
    query = query.or(`org_id.is.null,org_id.eq.${organisationId}`)
  }

  const { data, error } = await query
  if (error) throw error
  const rows = (data || []) as SurveyTemplateRow[]
  const counts = await Promise.all(
    rows.map((template) => questionCount(admin, template.id)),
  )

  return json({
    templates: rows.map((template, index) =>
      mapSurveyTemplate(template, counts[index] || 0)),
  })
}

async function handleCreate(
  request: Request,
  admin: SupabaseClient,
  actor: User,
): Promise<Response> {
  const body = await readBody(request)
  const validation = validateSurveyTemplateValues(body.values)
  if (!validation.success) {
    return json(
      { error: validation.message, field: validation.field || null },
      400,
    )
  }
  const values = validation.data

  if (!await organisationExists(admin, values.organisationId)) {
    return json({ error: 'The selected organisation was not found.' }, 404)
  }

  const { data, error } = await admin
    .from('survey_templates')
    .insert(templateDatabasePayload(values, actor.id))
    .select(TEMPLATE_COLUMNS)
    .single()

  if (error) {
    const friendly = friendlyDatabaseError(error)
    return json({ error: friendly.message }, friendly.status)
  }
  const template = data as SurveyTemplateRow

  try {
    await insertQuestions(admin, template.id, values)
  } catch (questionError) {
    await admin.from('survey_templates').delete().eq('id', template.id)
    throw questionError
  }

  const snapshot = await templateSnapshot(admin, template.id)
  if (!snapshot) throw new Error('The new survey template could not be reloaded.')
  return json(
    {
      template: {
        ...mapSurveyTemplate(snapshot.template, snapshot.questions.length),
        questions: snapshot.questions.map(mapSurveyTemplateQuestion),
      },
    },
    201,
  )
}

async function handleStatusUpdate(
  admin: SupabaseClient,
  templateId: string,
  active: unknown,
): Promise<Response> {
  if (typeof active !== 'boolean') {
    return json({ error: 'Select a valid active status.' }, 400)
  }

  const { data, error } = await admin
    .from('survey_templates')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', templateId)
    .select(TEMPLATE_COLUMNS)
    .maybeSingle()

  if (error) throw error
  if (!data) return json({ error: 'Survey template not found.' }, 404)
  return json({
    template: mapSurveyTemplate(
      data as SurveyTemplateRow,
      await questionCount(admin, templateId),
    ),
  })
}

async function handleUpdate(
  request: Request,
  admin: SupabaseClient,
): Promise<Response> {
  const body = await readBody(request)
  const templateId = text(body.id)
  if (!UUID_PATTERN.test(templateId)) {
    return json({ error: 'A valid survey template ID is required.' }, 400)
  }

  const action = text(body.action) || 'update'
  if (action === 'set-active') {
    return handleStatusUpdate(admin, templateId, body.active)
  }
  if (action !== 'update') {
    return json({ error: 'Select a valid survey template action.' }, 400)
  }

  const validation = validateSurveyTemplateValues(body.values)
  if (!validation.success) {
    return json(
      { error: validation.message, field: validation.field || null },
      400,
    )
  }
  const values = validation.data
  if (!await organisationExists(admin, values.organisationId)) {
    return json({ error: 'The selected organisation was not found.' }, 404)
  }

  const snapshot = await templateSnapshot(admin, templateId)
  if (!snapshot) return json({ error: 'Survey template not found.' }, 404)

  const { data, error } = await admin
    .from('survey_templates')
    .update(templateDatabasePayload(values))
    .eq('id', templateId)
    .select(TEMPLATE_COLUMNS)
    .single()

  if (error) {
    const friendly = friendlyDatabaseError(error)
    return json({ error: friendly.message }, friendly.status)
  }

  try {
    const { error: deleteError } = await admin
      .from('survey_template_questions')
      .delete()
      .eq('template_id', templateId)
    if (deleteError) throw deleteError
    await insertQuestions(admin, templateId, values)
  } catch (questionError) {
    try {
      await restoreSnapshot(admin, snapshot)
    } catch (restoreError) {
      console.error('survey template rollback failed', restoreError)
    }
    throw questionError
  }

  const questions = await questionsByTemplateId(admin, templateId)
  return json({
    template: {
      ...mapSurveyTemplate(data as SurveyTemplateRow, questions.length),
      questions: questions.map(mapSurveyTemplateQuestion),
    },
  })
}

async function handleDelete(
  request: Request,
  admin: SupabaseClient,
): Promise<Response> {
  const body = await readBody(request)
  const templateId = text(body.id)
  if (!UUID_PATTERN.test(templateId)) {
    return json({ error: 'A valid survey template ID is required.' }, 400)
  }

  const current = await templateById(admin, templateId)
  if (!current) return json({ error: 'Survey template not found.' }, 404)

  const { error } = await admin
    .from('survey_templates')
    .delete()
    .eq('id', templateId)
  if (error) throw error

  return json({ id: templateId, action: 'delete' })
}

async function route(request: Request): Promise<Response> {
  try {
    const auth = await requireSuperadmin(request)
    if (!auth.ok) return auth.response

    switch (request.method) {
      case 'GET':
        return await handleList(request, auth.admin)
      case 'POST':
        return await handleCreate(request, auth.admin, auth.actor)
      case 'PATCH':
        return await handleUpdate(request, auth.admin)
      case 'DELETE':
        return await handleDelete(request, auth.admin)
      default:
        return json({ error: 'Method not allowed.' }, 405)
    }
  } catch (error) {
    const message = databaseErrorMessage(error)
    const badRequest = message.includes('valid JSON')
    console.error('survey templates API error', error)
    return json({ error: message }, badRequest ? 400 : 500)
  }
}

export default { fetch: route }
