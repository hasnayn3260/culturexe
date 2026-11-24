import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertCircle, LoaderCircle, Plus, Trash2 } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import type {
  SurveyQuestion,
  SurveyQuestionInput,
} from '../hooks/useSurveyDetails'

export const SURVEY_QUESTION_TYPES = [
  {
    value: 'LIKERT',
    label: 'Likert scale',
    description: '1–5, strongly disagree to strongly agree',
  },
  {
    value: 'SHORT_TEXT',
    label: 'Short answer',
    description: 'Single-line written response',
  },
  {
    value: 'LONG_TEXT',
    label: 'Paragraph',
    description: 'Multi-line written response',
  },
  {
    value: 'SINGLE_CHOICE',
    label: 'Multiple choice',
    description: 'Select one option',
  },
  {
    value: 'MULTI_CHOICE',
    label: 'Checkboxes',
    description: 'Select multiple options',
  },
  {
    value: 'DROPDOWN',
    label: 'Dropdown',
    description: 'Select one option from a list',
  },
  {
    value: 'RATING_SCALE',
    label: 'Linear scale',
    description: 'Numeric scale with custom endpoints',
  },
  {
    value: 'MATRIX',
    label: 'Grid',
    description: 'Rows rated against shared columns',
  },
  { value: 'DATE', label: 'Date', description: 'Calendar date picker' },
  { value: 'TIME', label: 'Time', description: 'Time picker' },
  {
    value: 'FILE',
    label: 'File upload',
    description: 'Upload a document or image',
  },
] as const

export type SurveyQuestionType =
  (typeof SURVEY_QUESTION_TYPES)[number]['value']

type SurveyQuestionFormProps = {
  initialQuestion?: SurveyQuestion | null
  pending?: boolean
  disabled?: boolean
  onSave: (question: SurveyQuestionInput) => Promise<unknown> | unknown
  onCancel: () => void
}

type QuestionFormState = {
  text: string
  hint: string
  questionType: SurveyQuestionType
  dimension: string
  choices: string[]
  ratingMin: string
  ratingMax: string
  ratingMinLabel: string
  ratingMaxLabel: string
  matrixRows: string[]
  matrixColumns: string[]
}

type QuestionFormErrors = Partial<
  Record<'text' | 'choices' | 'rating' | 'matrix', string>
>

const CHOICE_TYPES = new Set<SurveyQuestionType>([
  'SINGLE_CHOICE',
  'MULTI_CHOICE',
  'DROPDOWN',
])

const inputClassName =
  'h-10 rounded-[10px] border-[#DCE4EE] bg-white px-3 text-sm text-[#0D1F3C] placeholder:text-[#9AA9BC] focus-visible:border-[#1BBFB0] focus-visible:ring-[#1BBFB0]/20 aria-invalid:border-[#D94A3A] aria-invalid:ring-[#D94A3A]/15'
const selectClassName =
  'h-10 w-full rounded-[10px] border border-[#DCE4EE] bg-white px-3 text-sm text-[#0D1F3C] outline-none transition focus:border-[#1BBFB0] focus:ring-3 focus:ring-[#1BBFB0]/20 disabled:cursor-not-allowed disabled:bg-[#F3F6FA]'

function objectValue(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function stringList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback
  const strings = value.filter((item): item is string => typeof item === 'string')
  return strings.length > 0 ? strings : fallback
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : fallback
}

function normalQuestionType(value: string | undefined): SurveyQuestionType {
  return SURVEY_QUESTION_TYPES.some((type) => type.value === value)
    ? (value as SurveyQuestionType)
    : 'LIKERT'
}

function stateFrom(question?: SurveyQuestion | null): QuestionFormState {
  const options = objectValue(question?.options)

  return {
    text: question?.text || '',
    hint: question?.hint || '',
    questionType: normalQuestionType(question?.question_type),
    dimension: question?.dimension || '',
    choices: stringList(options.choices, ['', '']),
    ratingMin: stringValue(options.min, '1'),
    ratingMax: stringValue(options.max, '10'),
    ratingMinLabel: stringValue(options.min_label, ''),
    ratingMaxLabel: stringValue(options.max_label, ''),
    matrixRows: stringList(options.rows, ['', '']),
    matrixColumns: stringList(options.cols, ['', '', '']),
  }
}

function compact(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean)
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

function validate(state: QuestionFormState): QuestionFormErrors {
  const errors: QuestionFormErrors = {}

  if (!state.text.trim()) errors.text = 'Enter the question text.'

  if (CHOICE_TYPES.has(state.questionType)) {
    const choices = compact(state.choices)
    if (choices.length < 2) {
      errors.choices = 'Add at least two options.'
    } else {
      const duplicate = duplicateValue(choices)
      if (duplicate) errors.choices = `Remove the duplicate option “${duplicate}”.`
    }
  }

  if (state.questionType === 'RATING_SCALE') {
    const minimum = Number(state.ratingMin)
    const maximum = Number(state.ratingMax)
    if (!Number.isInteger(minimum) || !Number.isInteger(maximum)) {
      errors.rating = 'Scale values must be whole numbers.'
    } else if (minimum >= maximum) {
      errors.rating = 'The maximum must be greater than the minimum.'
    } else if (maximum - minimum > 19) {
      errors.rating = 'Use no more than 20 values in the scale.'
    }
  }

  if (state.questionType === 'MATRIX') {
    const rows = compact(state.matrixRows)
    const columns = compact(state.matrixColumns)
    if (rows.length < 1 || columns.length < 2) {
      errors.matrix = 'Add at least one row and two columns.'
    } else if (duplicateValue(rows) || duplicateValue(columns)) {
      errors.matrix = 'Row and column labels must be unique.'
    }
  }

  return errors
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs font-medium text-[#D94A3A]">{message}</p>
}

export function surveyQuestionTypeLabel(value: string): string {
  return SURVEY_QUESTION_TYPES.find((type) => type.value === value)?.label || value
}

export default function SurveyQuestionForm({
  initialQuestion = null,
  pending = false,
  disabled = false,
  onSave,
  onCancel,
}: SurveyQuestionFormProps) {
  const [state, setState] = useState<QuestionFormState>(() =>
    stateFrom(initialQuestion),
  )
  const [errors, setErrors] = useState<QuestionFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    setState(stateFrom(initialQuestion))
    setErrors({})
    setSubmitError(null)
  }, [initialQuestion])

  const selectedType = useMemo(
    () => SURVEY_QUESTION_TYPES.find((type) => type.value === state.questionType),
    [state.questionType],
  )
  const formDisabled = pending || disabled

  function update<Key extends keyof QuestionFormState>(
    key: Key,
    value: QuestionFormState[Key],
  ) {
    setState((current) => ({ ...current, [key]: value }))
    setErrors({})
    setSubmitError(null)
  }

  function updateList(
    key: 'choices' | 'matrixRows' | 'matrixColumns',
    index: number,
    value: string,
  ) {
    update(
      key,
      state[key].map((item, itemIndex) => itemIndex === index ? value : item),
    )
  }

  function removeListItem(
    key: 'choices' | 'matrixRows' | 'matrixColumns',
    index: number,
  ) {
    update(key, state[key].filter((_, itemIndex) => itemIndex !== index))
  }

  function addListItem(
    key: 'choices' | 'matrixRows' | 'matrixColumns',
  ) {
    update(key, [...state[key], ''])
  }

  function buildOptions(): Record<string, unknown> | null {
    if (CHOICE_TYPES.has(state.questionType)) {
      return { choices: compact(state.choices) }
    }
    if (state.questionType === 'RATING_SCALE') {
      return {
        min: Number(state.ratingMin),
        max: Number(state.ratingMax),
        min_label: state.ratingMinLabel.trim(),
        max_label: state.ratingMaxLabel.trim(),
      }
    }
    if (state.questionType === 'MATRIX') {
      return {
        rows: compact(state.matrixRows),
        cols: compact(state.matrixColumns),
      }
    }
    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(state)
    setErrors(nextErrors)
    setSubmitError(null)
    if (Object.keys(nextErrors).length > 0 || formDisabled) return

    try {
      await onSave({
        text: state.text.trim(),
        hint: state.hint.trim() || null,
        dimension: state.dimension.trim() || null,
        question_type: state.questionType,
        options: buildOptions(),
      })
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'The question could not be saved.',
      )
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-[#DCE5EE] bg-[#F8FAFC] p-5"
    >
      {submitError && (
        <Alert className="mb-5 border-[#F2B8AE] bg-[#FFF4F1] text-[#A23D2D]">
          <AlertCircle />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <div>
        <Label htmlFor="survey-question-text" className="mb-2 text-[#526A88]">
          Question text
          <span className="ml-0.5 font-extrabold text-[#D94A3A]">*</span>
        </Label>
        <textarea
          id="survey-question-text"
          value={state.text}
          onChange={(event) => update('text', event.target.value)}
          disabled={formDisabled}
          aria-invalid={Boolean(errors.text)}
          placeholder="e.g. I feel proud to work for this organisation."
          className="min-h-24 w-full resize-y rounded-[10px] border border-[#DCE4EE] bg-white px-3 py-2.5 text-sm text-[#0D1F3C] outline-none transition placeholder:text-[#9AA9BC] focus:border-[#1BBFB0] focus:ring-3 focus:ring-[#1BBFB0]/20 aria-invalid:border-[#D94A3A] aria-invalid:ring-3 aria-invalid:ring-[#D94A3A]/15 disabled:cursor-not-allowed disabled:bg-[#F3F6FA]"
        />
        <FieldError message={errors.text} />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <Label htmlFor="survey-question-type" className="mb-2 text-[#526A88]">
            Question type
          </Label>
          <select
            id="survey-question-type"
            value={state.questionType}
            onChange={(event) =>
              update('questionType', event.target.value as SurveyQuestionType)}
            disabled={formDisabled}
            className={selectClassName}
          >
            {SURVEY_QUESTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label} — {type.description}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[#8A9BB0]">
            {selectedType?.description}
          </p>
        </div>

        <div>
          <Label htmlFor="survey-question-dimension" className="mb-2 text-[#526A88]">
            Dimension / theme
            <span className="ml-1 font-normal text-[#9AA9BC]">(optional)</span>
          </Label>
          <Input
            id="survey-question-dimension"
            value={state.dimension}
            onChange={(event) => update('dimension', event.target.value)}
            disabled={formDisabled}
            placeholder="e.g. Leadership or Culture"
            className={inputClassName}
          />
        </div>
      </div>

      <div className="mt-5">
        <Label htmlFor="survey-question-hint" className="mb-2 text-[#526A88]">
          Hint / supporting text
          <span className="ml-1 font-normal text-[#9AA9BC]">(optional)</span>
        </Label>
        <Input
          id="survey-question-hint"
          value={state.hint}
          onChange={(event) => update('hint', event.target.value)}
          disabled={formDisabled}
          placeholder="Give the respondent additional context"
          className={inputClassName}
        />
      </div>

      {CHOICE_TYPES.has(state.questionType) && (
        <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Label className="text-[#526A88]">Answer options</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addListItem('choices')}
              disabled={formDisabled}
              className="border-[#DCE4EE] text-[#526A88] hover:text-[#087C72]"
            >
              <Plus />
              Add option
            </Button>
          </div>
          <div className="space-y-2">
            {state.choices.map((choice, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-center text-xs font-bold text-[#9AA9BC]">
                  {index + 1}
                </span>
                <Input
                  value={choice}
                  onChange={(event) =>
                    updateList('choices', index, event.target.value)}
                  disabled={formDisabled}
                  placeholder={`Option ${index + 1}`}
                  aria-label={`Answer option ${index + 1}`}
                  className={inputClassName}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeListItem('choices', index)}
                  disabled={formDisabled || state.choices.length <= 2}
                  aria-label={`Remove option ${index + 1}`}
                  className="text-[#A44B3B] hover:bg-[#FFF1EF] hover:text-[#8F3527]"
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
          <FieldError message={errors.choices} />
        </div>
      )}

      {state.questionType === 'RATING_SCALE' && (
        <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <Label className="mb-3 text-[#526A88]">Scale configuration</Label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="survey-rating-min" className="mb-2 text-xs text-[#7C8EA5]">
                Minimum value
              </Label>
              <Input
                id="survey-rating-min"
                type="number"
                value={state.ratingMin}
                onChange={(event) => update('ratingMin', event.target.value)}
                disabled={formDisabled}
                className={inputClassName}
              />
            </div>
            <div>
              <Label htmlFor="survey-rating-max" className="mb-2 text-xs text-[#7C8EA5]">
                Maximum value
              </Label>
              <Input
                id="survey-rating-max"
                type="number"
                value={state.ratingMax}
                onChange={(event) => update('ratingMax', event.target.value)}
                disabled={formDisabled}
                className={inputClassName}
              />
            </div>
            <div>
              <Label htmlFor="survey-rating-min-label" className="mb-2 text-xs text-[#7C8EA5]">
                Minimum label
              </Label>
              <Input
                id="survey-rating-min-label"
                value={state.ratingMinLabel}
                onChange={(event) => update('ratingMinLabel', event.target.value)}
                disabled={formDisabled}
                placeholder="e.g. Not at all"
                className={inputClassName}
              />
            </div>
            <div>
              <Label htmlFor="survey-rating-max-label" className="mb-2 text-xs text-[#7C8EA5]">
                Maximum label
              </Label>
              <Input
                id="survey-rating-max-label"
                value={state.ratingMaxLabel}
                onChange={(event) => update('ratingMaxLabel', event.target.value)}
                disabled={formDisabled}
                placeholder="e.g. Extremely"
                className={inputClassName}
              />
            </div>
          </div>
          <FieldError message={errors.rating} />
        </div>
      )}

      {state.questionType === 'MATRIX' && (
        <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="grid gap-5 md:grid-cols-2">
            {([
              ['matrixRows', 'Row labels', 'Row'],
              ['matrixColumns', 'Column labels', 'Column'],
            ] as const).map(([key, label, placeholder]) => (
              <div key={key}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Label className="text-[#526A88]">{label}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => addListItem(key)}
                    disabled={formDisabled}
                    aria-label={`Add ${placeholder.toLowerCase()}`}
                    className="border-[#DCE4EE] text-[#526A88] hover:text-[#087C72]"
                  >
                    <Plus />
                  </Button>
                </div>
                <div className="space-y-2">
                  {state[key].map((value, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={value}
                        onChange={(event) =>
                          updateList(key, index, event.target.value)}
                        disabled={formDisabled}
                        placeholder={`${placeholder} ${index + 1}`}
                        aria-label={`${placeholder} ${index + 1}`}
                        className={inputClassName}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeListItem(key, index)}
                        disabled={
                          formDisabled ||
                          (key === 'matrixRows'
                            ? state.matrixRows.length <= 1
                            : state.matrixColumns.length <= 2)
                        }
                        aria-label={`Remove ${placeholder.toLowerCase()} ${index + 1}`}
                        className="text-[#A44B3B] hover:bg-[#FFF1EF] hover:text-[#8F3527]"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <FieldError message={errors.matrix} />
        </div>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-[#E2E8F0] pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
          className="border-[#DCE4EE] bg-white text-[#526A88]"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={formDisabled}
          className="bg-[#1BBFB0] font-bold text-white hover:bg-[#16A99C]"
        >
          {pending && <LoaderCircle className="animate-spin" />}
          {initialQuestion ? 'Update question' : 'Add question'}
        </Button>
      </div>
    </form>
  )
}
