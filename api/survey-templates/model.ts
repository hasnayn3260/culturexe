export const SURVEY_TEMPLATE_QUESTION_TYPES = [
  'LIKERT',
  'SHORT_TEXT',
  'LONG_TEXT',
  'SINGLE_CHOICE',
  'MULTI_CHOICE',
  'DROPDOWN',
  'RATING_SCALE',
  'MATRIX',
  'DATE',
  'TIME',
  'FILE',
] as const

export type SurveyTemplateQuestionType =
  (typeof SURVEY_TEMPLATE_QUESTION_TYPES)[number]

export type SurveyTemplateQuestionRow = {
  id: string
  template_id: string
  text: string
  hint: string | null
  question_type: SurveyTemplateQuestionType
  dimension: string | null
  order_num: number
  options: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type SurveyTemplateRow = {
  id: string
  org_id: string | null
  name: string
  description: string | null
  active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export type SurveyTemplateQuestionValues = {
  text: string
  hint: string | null
  questionType: SurveyTemplateQuestionType
  dimension: string | null
  orderNumber: number
  options: Record<string, unknown> | null
}

export type SurveyTemplateValues = {
  organisationId: string | null
  name: string
  description: string | null
  active: boolean
  questions: SurveyTemplateQuestionValues[]
}

export type SurveyTemplateValidationResult =
  | { success: true; data: SurveyTemplateValues }
  | { success: false; message: string; field?: string }

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const TYPE_SET = new Set<string>(SURVEY_TEMPLATE_QUESTION_TYPES)
const CHOICE_TYPES = new Set<SurveyTemplateQuestionType>([
  'SINGLE_CHOICE',
  'MULTI_CHOICE',
  'DROPDOWN',
])
const MAX_TEMPLATE_QUESTIONS = 500

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function optionalText(value: unknown): string | null {
  const valueText = text(value)
  return valueText || null
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function compactStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function duplicateValue(values: string[]): string | null {
  const seen = new Set<string>()
  for (const value of values) {
    const normalised = value.toLocaleLowerCase()
    if (seen.has(normalised)) return value
    seen.add(normalised)
  }
  return null
}

function validateQuestionOptions(
  questionType: SurveyTemplateQuestionType,
  value: unknown,
): { success: true; options: Record<string, unknown> | null } | {
  success: false
  message: string
} {
  if (CHOICE_TYPES.has(questionType)) {
    const choices = compactStringList(objectValue(value)?.choices)
    if (choices.length < 2) {
      return { success: false, message: 'Add at least two answer options.' }
    }
    const duplicate = duplicateValue(choices)
    if (duplicate) {
      return {
        success: false,
        message: `Remove the duplicate answer option “${duplicate}”.`,
      }
    }
    return { success: true, options: { choices } }
  }

  if (questionType === 'RATING_SCALE') {
    const options = objectValue(value)
    const minimum = Number(options?.min)
    const maximum = Number(options?.max)
    if (!Number.isInteger(minimum) || !Number.isInteger(maximum)) {
      return { success: false, message: 'Rating values must be whole numbers.' }
    }
    if (minimum >= maximum) {
      return {
        success: false,
        message: 'The rating maximum must be greater than its minimum.',
      }
    }
    if (maximum - minimum > 19) {
      return {
        success: false,
        message: 'A rating scale may contain no more than 20 values.',
      }
    }
    return {
      success: true,
      options: {
        min: minimum,
        max: maximum,
        min_label: text(options?.min_label),
        max_label: text(options?.max_label),
      },
    }
  }

  if (questionType === 'MATRIX') {
    const options = objectValue(value)
    const rows = compactStringList(options?.rows)
    const columns = compactStringList(options?.cols)
    if (rows.length < 1 || columns.length < 2) {
      return {
        success: false,
        message: 'Add at least one matrix row and two matrix columns.',
      }
    }
    if (duplicateValue(rows) || duplicateValue(columns)) {
      return {
        success: false,
        message: 'Matrix row and column labels must be unique.',
      }
    }
    return { success: true, options: { rows, cols: columns } }
  }

  return { success: true, options: null }
}

function validateQuestion(
  value: unknown,
  index: number,
): { success: true; question: SurveyTemplateQuestionValues } | {
  success: false
  message: string
  field: string
} {
  const field = `questions.${index}`
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      success: false,
      message: `Question ${index + 1} is invalid.`,
      field,
    }
  }

  const input = value as Record<string, unknown>
  const questionText = text(input.text).replace(/\s+/g, ' ')
  const hint = optionalText(input.hint)
  const dimension = optionalText(input.dimension)
  const rawType = text(input.questionType || input.question_type).toUpperCase()

  if (!questionText || questionText.length > 5_000) {
    return {
      success: false,
      message: `Question ${index + 1} must contain between 1 and 5,000 characters.`,
      field: `${field}.text`,
    }
  }
  if (hint && hint.length > 2_000) {
    return {
      success: false,
      message: `Question ${index + 1} supporting text must be 2,000 characters or fewer.`,
      field: `${field}.hint`,
    }
  }
  if (dimension && dimension.length > 180) {
    return {
      success: false,
      message: `Question ${index + 1} dimension must be 180 characters or fewer.`,
      field: `${field}.dimension`,
    }
  }
  if (!TYPE_SET.has(rawType)) {
    return {
      success: false,
      message: `Question ${index + 1} has an unsupported question type.`,
      field: `${field}.questionType`,
    }
  }

  const questionType = rawType as SurveyTemplateQuestionType
  const options = validateQuestionOptions(questionType, input.options)
  if (!options.success) {
    return {
      success: false,
      message: `Question ${index + 1}: ${options.message}`,
      field: `${field}.options`,
    }
  }

  return {
    success: true,
    question: {
      text: questionText,
      hint,
      questionType,
      dimension,
      orderNumber: index,
      options: options.options,
    },
  }
}

export function validateSurveyTemplateValues(
  value: unknown,
): SurveyTemplateValidationResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { success: false, message: 'Survey template details are required.' }
  }

  const input = value as Record<string, unknown>
  const organisationId = text(input.organisationId || input.org_id) || null
  const name = text(input.name).replace(/\s+/g, ' ')
  const description = optionalText(input.description)

  if (organisationId && !UUID_PATTERN.test(organisationId)) {
    return {
      success: false,
      message: 'Select a valid organisation or make the template global.',
      field: 'organisationId',
    }
  }
  if (name.length < 2 || name.length > 180) {
    return {
      success: false,
      message: 'Enter a template name between 2 and 180 characters.',
      field: 'name',
    }
  }
  if (description && description.length > 5_000) {
    return {
      success: false,
      message: 'The template description must be 5,000 characters or fewer.',
      field: 'description',
    }
  }
  if (!Array.isArray(input.questions) || input.questions.length === 0) {
    return {
      success: false,
      message: 'Add at least one question to the survey template.',
      field: 'questions',
    }
  }
  if (input.questions.length > MAX_TEMPLATE_QUESTIONS) {
    return {
      success: false,
      message: `A survey template may contain no more than ${MAX_TEMPLATE_QUESTIONS} questions.`,
      field: 'questions',
    }
  }

  const questions: SurveyTemplateQuestionValues[] = []
  for (const [index, questionValue] of input.questions.entries()) {
    const result = validateQuestion(questionValue, index)
    if (!result.success) {
      return {
        success: false,
        message: result.message,
        field: result.field,
      }
    }
    questions.push(result.question)
  }

  return {
    success: true,
    data: {
      organisationId,
      name,
      description,
      active: input.active !== false,
      questions,
    },
  }
}

export function templateDatabasePayload(
  values: SurveyTemplateValues,
  createdBy?: string,
) {
  return {
    org_id: values.organisationId,
    name: values.name,
    description: values.description,
    active: values.active,
    ...(createdBy ? { created_by: createdBy } : {}),
    updated_at: new Date().toISOString(),
  }
}

export function templateQuestionDatabasePayload(
  templateId: string,
  question: SurveyTemplateQuestionValues,
) {
  return {
    template_id: templateId,
    text: question.text,
    hint: question.hint,
    question_type: question.questionType,
    dimension: question.dimension,
    order_num: question.orderNumber,
    options: question.options,
    updated_at: new Date().toISOString(),
  }
}

export function mapSurveyTemplateQuestion(row: SurveyTemplateQuestionRow) {
  return {
    id: row.id,
    templateId: row.template_id,
    text: row.text,
    hint: row.hint,
    questionType: row.question_type,
    dimension: row.dimension,
    orderNumber: row.order_num,
    options: row.options,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapSurveyTemplate(
  row: SurveyTemplateRow,
  questionCount: number,
) {
  return {
    id: row.id,
    organisationId: row.org_id,
    scope: row.org_id ? 'organisation' as const : 'global' as const,
    name: row.name,
    description: row.description,
    active: row.active,
    questionCount,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
