import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type SurveyStatus = 'draft' | 'live' | 'closed'

type SurveyValues = {
  organisationId: string
  title: string
  description: string
  status: SurveyStatus
  liveStart: string
  liveEnd: string
  openLinkEnabled: boolean
  templateId: string
}

type SurveyRow = {
  id: string
  org_id: string
  title: string
  description: string | null
  status: SurveyStatus
  live_start: string | null
  live_end: string | null
  created_at: string | null
  updated_at: string | null
  open_link_enabled: boolean
  open_link_token: string
}

type TemplateRow = {
  id: string
  org_id: string | null
  description: string | null
}

type TemplateQuestionRow = {
  text: string
  hint: string | null
  question_type: string
  dimension: string | null
  order_num: number
  options: unknown
}

type RequestBody = {
  id?: unknown
  action?: unknown
  templateId?: unknown
  values?: unknown
}

type ValidationResult =
  | { success: true; data: SurveyValues }
  | { success: false; message: string }

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SURVEY_COLUMNS =
  'id, org_id, title, description, status, live_start, live_end, created_at, updated_at, open_link_enabled, open_link_token'

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

  return { ok: true as const, admin }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parseDate(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function validateValues(value: unknown, creating: boolean): ValidationResult {
  if (!value || typeof value !== 'object') {
    return { success: false, message: 'Survey details are required.' }
  }

  const input = value as Record<string, unknown>
  const status = text(input.status) as SurveyStatus
  const data: SurveyValues = {
    organisationId: text(input.organisationId),
    title: text(input.title).replace(/\s+/g, ' '),
    description: text(input.description),
    status,
    liveStart: text(input.liveStart),
    liveEnd: text(input.liveEnd),
    openLinkEnabled: input.openLinkEnabled === true,
    templateId: text(input.templateId),
  }

  if (!UUID_PATTERN.test(data.organisationId)) {
    return { success: false, message: 'Select a valid organisation.' }
  }
  if (data.title.length < 2 || data.title.length > 180) {
    return { success: false, message: 'Enter a survey title between 2 and 180 characters.' }
  }
  if (data.description.length > 5_000) {
    return { success: false, message: 'The survey description must be 5,000 characters or fewer.' }
  }
  if (!['draft', 'live', 'closed'].includes(data.status)) {
    return { success: false, message: 'Select a valid survey lifecycle status.' }
  }
  if (creating && data.status === 'closed') {
    return { success: false, message: 'A new survey cannot start as closed.' }
  }
  if (data.templateId && !UUID_PATTERN.test(data.templateId)) {
    return { success: false, message: 'Select a valid survey template.' }
  }

  const liveStart = parseDate(data.liveStart)
  const liveEnd = parseDate(data.liveEnd)
  if (data.liveStart && !liveStart) {
    return { success: false, message: 'Enter a valid opening date.' }
  }
  if (data.liveEnd && !liveEnd) {
    return { success: false, message: 'Enter a valid closing date.' }
  }
  if (data.status === 'live' && (!liveStart || !liveEnd)) {
    return { success: false, message: 'Scheduled and live surveys require opening and closing dates.' }
  }
  if ((liveStart && !liveEnd) || (!liveStart && liveEnd)) {
    return { success: false, message: 'Set both the opening and closing dates.' }
  }
  if (liveStart && liveEnd && Date.parse(liveEnd) <= Date.parse(liveStart)) {
    return { success: false, message: 'The closing date must be after the opening date.' }
  }

  data.liveStart = liveStart || ''
  data.liveEnd = liveEnd || ''
  return { success: true, data }
}

async function readBody(request: Request): Promise<RequestBody> {
  try {
    return await request.json() as RequestBody
  } catch {
    throw new Error('Request body must be valid JSON.')
  }
}

async function organisationExists(
  admin: SupabaseClient,
  organisationId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from('organisations')
    .select('id')
    .eq('id', organisationId)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

async function surveyById(
  admin: SupabaseClient,
  surveyId: string,
): Promise<SurveyRow | null> {
  const { data, error } = await admin
    .from('survey')
    .select(SURVEY_COLUMNS)
    .eq('id', surveyId)
    .maybeSingle()

  if (error) throw error
  return data as SurveyRow | null
}

function mapSurvey(row: SurveyRow) {
  return {
    id: row.id,
    organisationId: row.org_id,
    title: row.title,
    description: row.description,
    storedStatus: row.status,
    liveStart: row.live_start,
    liveEnd: row.live_end,
    createdAt: row.created_at || new Date(0).toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date(0).toISOString(),
    openLinkEnabled: row.open_link_enabled,
    openLinkToken: row.open_link_token,
  }
}

async function templateContent(
  admin: SupabaseClient,
  templateId: string,
  organisationId: string,
): Promise<{ template: TemplateRow; questions: TemplateQuestionRow[] }> {
  const { data: templateData, error: templateError } = await admin
    .from('survey_templates')
    .select('id, org_id, description')
    .eq('id', templateId)
    .maybeSingle()

  if (templateError) throw templateError
  if (!templateData) throw new Error('Survey template not found.')

  const template = templateData as TemplateRow
  if (template.org_id && template.org_id !== organisationId) {
    throw new Error('This survey template belongs to a different organisation.')
  }

  const { data: questionData, error: questionError } = await admin
    .from('survey_template_questions')
    .select('text, hint, question_type, dimension, order_num, options')
    .eq('template_id', templateId)
    .order('order_num', { ascending: true })

  if (questionError) throw questionError
  const questions = (questionData || []) as TemplateQuestionRow[]
  if (questions.length === 0) {
    throw new Error('The selected survey template has no questions.')
  }

  return { template, questions }
}

async function insertTemplateQuestions(
  admin: SupabaseClient,
  surveyId: string,
  questions: TemplateQuestionRow[],
): Promise<void> {
  const { error } = await admin.from('survey_questions').insert(
    questions.map((question) => ({
      survey_id: surveyId,
      text: question.text,
      hint: question.hint,
      question_type: question.question_type,
      dimension: question.dimension,
      order_num: question.order_num,
      options: question.options,
    })),
  )

  if (error) throw error
}

async function linkedCount(
  admin: SupabaseClient,
  table: 'survey_questions' | 'survey_respondents',
  surveyId: string,
): Promise<number> {
  const { count, error } = await admin
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('survey_id', surveyId)

  if (error) throw error
  return count || 0
}

async function handleCreate(
  request: Request,
  admin: SupabaseClient,
): Promise<Response> {
  const body = await readBody(request)
  const validation = validateValues(body.values, true)
  if (!validation.success) return json({ error: validation.message }, 400)
  const values = validation.data

  if (!await organisationExists(admin, values.organisationId)) {
    return json({ error: 'Organisation not found.' }, 404)
  }

  let templateContentResult:
    | Awaited<ReturnType<typeof templateContent>>
    | null = null
  if (values.templateId) {
    try {
      templateContentResult = await templateContent(
        admin,
        values.templateId,
        values.organisationId,
      )
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : 'The template could not be loaded.' },
        400,
      )
    }
  }

  const { data, error } = await admin
    .from('survey')
    .insert({
      org_id: values.organisationId,
      title: values.title,
      description:
        values.description || templateContentResult?.template.description || null,
      status: values.status,
      live_start: values.liveStart || null,
      live_end: values.liveEnd || null,
      open_link_enabled: values.openLinkEnabled,
      updated_at: new Date().toISOString(),
    })
    .select(SURVEY_COLUMNS)
    .single()

  if (error) throw error
  const survey = data as SurveyRow

  if (templateContentResult) {
    try {
      await insertTemplateQuestions(
        admin,
        survey.id,
        templateContentResult.questions,
      )
    } catch (cloneError) {
      // Creation and cloning span two Supabase statements. Remove the new
      // survey if cloning fails so a partial template copy is never retained.
      await admin.from('survey').delete().eq('id', survey.id)
      throw cloneError
    }
  }

  const created = await surveyById(admin, survey.id)
  if (!created) throw new Error('The created survey could not be reloaded.')
  return json({ survey: mapSurvey(created) }, 201)
}

async function handleUpdate(
  request: Request,
  admin: SupabaseClient,
): Promise<Response> {
  const body = await readBody(request)
  const surveyId = text(body.id)
  if (!UUID_PATTERN.test(surveyId)) {
    return json({ error: 'A valid survey ID is required.' }, 400)
  }

  if (text(body.action) === 'clone-template') {
    const templateId = text(body.templateId)
    if (!UUID_PATTERN.test(templateId)) {
      return json({ error: 'A valid survey template is required.' }, 400)
    }

    const current = await surveyById(admin, surveyId)
    if (!current) return json({ error: 'Survey not found.' }, 404)
    if (current.status !== 'draft') {
      return json(
        { error: 'Templates can only be applied while a survey is in draft.' },
        409,
      )
    }

    const [questionCount, respondentCount] = await Promise.all([
      linkedCount(admin, 'survey_questions', surveyId),
      linkedCount(admin, 'survey_respondents', surveyId),
    ])
    if (questionCount > 0 || respondentCount > 0) {
      return json(
        {
          error:
            'A template can only be applied to an empty draft with no respondents.',
        },
        409,
      )
    }

    let content: Awaited<ReturnType<typeof templateContent>>
    try {
      content = await templateContent(admin, templateId, current.org_id)
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : 'The template could not be loaded.' },
        400,
      )
    }

    await insertTemplateQuestions(admin, surveyId, content.questions)
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (!current.description && content.template.description) {
      updates.description = content.template.description
    }
    const { error: updateError } = await admin
      .from('survey')
      .update(updates)
      .eq('id', surveyId)
    if (updateError) throw updateError

    const updated = await surveyById(admin, surveyId)
    if (!updated) throw new Error('The updated survey could not be reloaded.')
    return json({ survey: mapSurvey(updated) })
  }

  if (text(body.action) !== 'update') {
    return json({ error: 'Select a valid survey action.' }, 400)
  }

  const validation = validateValues(body.values, false)
  if (!validation.success) return json({ error: validation.message }, 400)
  const values = validation.data
  const current = await surveyById(admin, surveyId)
  if (!current) return json({ error: 'Survey not found.' }, 404)
  if (values.organisationId !== current.org_id) {
    return json(
      { error: 'The survey organisation cannot be changed after creation.' },
      409,
    )
  }

  const { data, error } = await admin
    .from('survey')
    .update({
      title: values.title,
      description: values.description || null,
      status: values.status,
      live_start: values.liveStart || null,
      live_end: values.liveEnd || null,
      open_link_enabled: values.openLinkEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq('id', surveyId)
    .select(SURVEY_COLUMNS)
    .single()

  if (error) throw error
  return json({ survey: mapSurvey(data as SurveyRow) })
}

async function handleDelete(
  request: Request,
  admin: SupabaseClient,
): Promise<Response> {
  const body = await readBody(request)
  const surveyId = text(body.id)
  if (!UUID_PATTERN.test(surveyId)) {
    return json({ error: 'A valid survey ID is required.' }, 400)
  }

  const current = await surveyById(admin, surveyId)
  if (!current) return json({ error: 'Survey not found.' }, 404)
  if (current.status !== 'draft') {
    return json({ error: 'Only draft surveys can be deleted.' }, 409)
  }

  const respondentCount = await linkedCount(admin, 'survey_respondents', surveyId)
  if (respondentCount > 0) {
    return json(
      { error: 'This survey has respondents and cannot be deleted.' },
      409,
    )
  }

  const { error } = await admin.from('survey').delete().eq('id', surveyId)
  if (error) throw error
  return json({ id: surveyId, action: 'delete' })
}

async function route(request: Request): Promise<Response> {
  try {
    const auth = await requireSuperadmin(request)
    if (!auth.ok) return auth.response

    switch (request.method) {
      case 'POST':
        return await handleCreate(request, auth.admin)
      case 'PATCH':
        return await handleUpdate(request, auth.admin)
      case 'DELETE':
        return await handleDelete(request, auth.admin)
      default:
        return json({ error: 'Method not allowed.' }, 405)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.'
    const badRequest = message.includes('valid JSON')
    console.error('admin surveys API error', error)
    return json({ error: message }, badRequest ? 400 : 500)
  }
}

export default { fetch: route }
