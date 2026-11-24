import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Building2,
  Globe2,
  LoaderCircle,
  Save,
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SurveyBuilderWorkspace from '@/features/survey/components/SurveyBuilderWorkspace'
import type {
  QuestionMoveDirection,
  SurveyQuestion,
  SurveyQuestionInput,
  SurveyQuestionUpdate,
} from '@/features/survey/hooks/useSurveyDetails'

import type {
  ManagedSurveyTemplate,
  SurveyTemplateFormValues,
  SurveyTemplateQuestionInput,
  SurveyTemplateQuestionType,
} from '../services/surveyTemplatesClient'

type OrganisationOption = {
  id: string
  name: string
  tradingName?: string | null
  status?: string
}

type SurveyTemplateFormProps = {
  template?: ManagedSurveyTemplate | null
  organisations: OrganisationOption[]
  pending?: boolean
  onSubmit: (values: SurveyTemplateFormValues) => Promise<unknown> | unknown
  onCancel?: () => void
}

type TemplateScope = 'global' | 'organisation'

type DraftQuestion = SurveyQuestion & {
  temporary: boolean
}

type FieldErrors = Partial<Record<'name' | 'organisationId' | 'questions', string>>

const inputClassName =
  'h-11 rounded-xl border-[#DCE4EE] bg-white px-3.5 text-sm text-[#0D1F3C] placeholder:text-[#9AA9BC] focus-visible:border-[#1BBFB0] focus-visible:ring-[#1BBFB0]/20 aria-invalid:border-[#D94A3A] aria-invalid:ring-[#D94A3A]/15'
const selectClassName =
  'h-11 w-full rounded-xl border border-[#DCE4EE] bg-white px-3.5 text-sm text-[#0D1F3C] outline-none transition focus:border-[#1BBFB0] focus:ring-3 focus:ring-[#1BBFB0]/20 aria-invalid:border-[#D94A3A] aria-invalid:ring-3 aria-invalid:ring-[#D94A3A]/15 disabled:cursor-not-allowed disabled:bg-[#F3F6FA]'

function now(): string {
  return new Date().toISOString()
}

function orderedQuestions(questions: DraftQuestion[]): DraftQuestion[] {
  return [...questions]
    .sort((first, second) =>
      first.order_num - second.order_num || first.id.localeCompare(second.id))
    .map((question, index) => ({ ...question, order_num: index }))
}

function questionsFromTemplate(
  template?: ManagedSurveyTemplate | null,
): DraftQuestion[] {
  if (!template) return []
  return orderedQuestions(template.questions.map((question) => ({
    id: question.id,
    survey_id: template.id,
    text: question.text,
    hint: question.hint,
    question_type: question.questionType,
    dimension: question.dimension,
    order_num: question.orderNumber,
    options: question.options,
    created_at: question.createdAt,
    updated_at: question.updatedAt,
    temporary: false,
  })))
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-xs font-semibold text-[#C74737]">{message}</p>
}

export default function SurveyTemplateForm({
  template = null,
  organisations,
  pending = false,
  onSubmit,
  onCancel,
}: SurveyTemplateFormProps) {
  const [scope, setScope] = useState<TemplateScope>(
    template?.organisationId ? 'organisation' : 'global',
  )
  const [organisationId, setOrganisationId] = useState(
    template?.organisationId || '',
  )
  const [name, setName] = useState(template?.name || '')
  const [description, setDescription] = useState(template?.description || '')
  const [active, setActive] = useState(template?.active ?? true)
  const [questions, setQuestions] = useState<DraftQuestion[]>(() =>
    questionsFromTemplate(template))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    setScope(template?.organisationId ? 'organisation' : 'global')
    setOrganisationId(template?.organisationId || '')
    setName(template?.name || '')
    setDescription(template?.description || '')
    setActive(template?.active ?? true)
    setQuestions(questionsFromTemplate(template))
    setErrors({})
    setSubmitError(null)
  }, [template])

  const activeOrganisations = useMemo(
    () => organisations
      .filter((organisation) => organisation.status !== 'inactive')
      .sort((first, second) => first.name.localeCompare(second.name)),
    [organisations],
  )

  function clearFieldError(field: keyof FieldErrors) {
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSubmitError(null)
  }

  function changeScope(nextScope: TemplateScope) {
    setScope(nextScope)
    if (nextScope === 'global') setOrganisationId('')
    clearFieldError('organisationId')
  }

  function addQuestion(question: SurveyQuestionInput) {
    const timestamp = now()
    const nextQuestion: DraftQuestion = {
      id: crypto.randomUUID(),
      survey_id: template?.id || 'new-template',
      text: question.text,
      hint: question.hint || null,
      question_type: question.question_type,
      dimension: question.dimension || null,
      order_num: questions.length,
      options: question.options || null,
      created_at: timestamp,
      updated_at: timestamp,
      temporary: true,
    }
    setQuestions((current) => orderedQuestions([...current, nextQuestion]))
    clearFieldError('questions')
  }

  function updateQuestion(questionId: string, updates: SurveyQuestionUpdate) {
    setQuestions((current) => current.map((question) =>
      question.id === questionId
        ? {
            ...question,
            text: updates.text ?? question.text,
            hint: updates.hint === undefined
              ? question.hint
              : updates.hint || null,
            question_type: updates.question_type ?? question.question_type,
            dimension: updates.dimension === undefined
              ? question.dimension
              : updates.dimension || null,
            options: updates.options === undefined
              ? question.options
              : updates.options || null,
            updated_at: now(),
          }
        : question))
    clearFieldError('questions')
  }

  function deleteQuestion(questionId: string) {
    setQuestions((current) =>
      orderedQuestions(current.filter((question) => question.id !== questionId)))
    clearFieldError('questions')
  }

  function deleteAllQuestions() {
    setQuestions([])
    clearFieldError('questions')
  }

  function moveQuestion(
    questionId: string,
    direction: QuestionMoveDirection,
  ) {
    setQuestions((current) => {
      const ordered = orderedQuestions(current)
      const index = ordered.findIndex((question) => question.id === questionId)
      const swapIndex = direction === 'up' ? index - 1 : index + 1
      if (index < 0 || swapIndex < 0 || swapIndex >= ordered.length) {
        return ordered
      }

      const next = [...ordered]
      const currentQuestion = next[index]
      const swapQuestion = next[swapIndex]
      if (!currentQuestion || !swapQuestion) return ordered
      next[index] = swapQuestion
      next[swapIndex] = currentQuestion
      return next.map((question, orderNumber) => ({
        ...question,
        order_num: orderNumber,
      }))
    })
  }

  function validate(): FieldErrors {
    const nextErrors: FieldErrors = {}
    const templateName = name.trim()
    if (templateName.length < 2 || templateName.length > 180) {
      nextErrors.name = 'Enter a template name between 2 and 180 characters.'
    }
    if (scope === 'organisation' && !organisationId) {
      nextErrors.organisationId = 'Select the organisation that owns this template.'
    }
    if (questions.length === 0) {
      nextErrors.questions = 'Add at least one question before saving the template.'
    }
    return nextErrors
  }

  async function submitTemplate() {
    const nextErrors = validate()
    setErrors(nextErrors)
    setSubmitError(null)
    if (Object.keys(nextErrors).length > 0 || pending) return

    const questionValues: SurveyTemplateQuestionInput[] = orderedQuestions(questions)
      .map((question) => ({
        text: question.text,
        hint: question.hint,
        questionType: question.question_type as SurveyTemplateQuestionType,
        dimension: question.dimension,
        options: question.options as Record<string, unknown> | null,
      }))

    try {
      await onSubmit({
        organisationId: scope === 'organisation' ? organisationId : null,
        name: name.trim(),
        description: description.trim() || null,
        active,
        questions: questionValues,
      })
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'The survey template could not be saved.',
      )
    }
  }

  return (
    <div className="space-y-6">
      {submitError && (
        <Alert className="border-[#F2B8AE] bg-[#FFF4F1] text-[#A23D2D]">
          <AlertCircle />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <section className="rounded-2xl border border-[#DFE6EE] bg-white p-5 shadow-[0_8px_24px_rgba(13,31,60,0.04)] sm:p-6">
        <div className="flex flex-col gap-3 border-b border-[#E8EDF3] pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-['Plus_Jakarta_Sans'] text-xl font-extrabold text-[#0D1F3C]">
                Template details
              </h2>
              <Badge
                variant="outline"
                className={scope === 'global'
                  ? 'border-[#CFE2ED] bg-[#F2F8FB] text-[#526A88]'
                  : 'border-[#BDE6E1] bg-[#ECFAF8] text-[#087C72]'}
              >
                {scope === 'global' ? <Globe2 /> : <Building2 />}
                {scope === 'global' ? 'Global' : 'Organisation'}
              </Badge>
            </div>
            <p className="mt-1 text-sm leading-6 text-[#8A9BB0]">
              Global templates are available to every organisation. Organisation
              templates are available only when creating surveys for that client.
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#526A88]">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              disabled={pending}
              className="size-4 rounded border-[#CAD7E5] accent-[#1BBFB0]"
            />
            Available for new surveys
          </label>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <Label htmlFor="survey-template-name" className="mb-2 text-[#526A88]">
              Template name
              <span className="ml-0.5 font-extrabold text-[#D94A3A]">*</span>
            </Label>
            <Input
              id="survey-template-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                clearFieldError('name')
              }}
              disabled={pending}
              aria-invalid={Boolean(errors.name)}
              placeholder="e.g. Annual culture assessment"
              className={inputClassName}
            />
            <FieldError message={errors.name} />
          </div>

          <div>
            <Label htmlFor="survey-template-scope" className="mb-2 text-[#526A88]">
              Template scope
              <span className="ml-0.5 font-extrabold text-[#D94A3A]">*</span>
            </Label>
            <select
              id="survey-template-scope"
              value={scope}
              onChange={(event) => changeScope(event.target.value as TemplateScope)}
              disabled={pending}
              className={selectClassName}
            >
              <option value="global">Global — all organisations</option>
              <option value="organisation">Organisation-specific</option>
            </select>
          </div>

          {scope === 'organisation' && (
            <div className="lg:col-span-2">
              <Label
                htmlFor="survey-template-organisation"
                className="mb-2 text-[#526A88]"
              >
                Organisation
                <span className="ml-0.5 font-extrabold text-[#D94A3A]">*</span>
              </Label>
              <select
                id="survey-template-organisation"
                value={organisationId}
                onChange={(event) => {
                  setOrganisationId(event.target.value)
                  clearFieldError('organisationId')
                }}
                disabled={pending}
                aria-invalid={Boolean(errors.organisationId)}
                className={selectClassName}
              >
                <option value="">Select organisation</option>
                {activeOrganisations.map((organisation) => (
                  <option key={organisation.id} value={organisation.id}>
                    {organisation.tradingName || organisation.name}
                  </option>
                ))}
              </select>
              <FieldError message={errors.organisationId} />
            </div>
          )}

          <div className="lg:col-span-2">
            <Label
              htmlFor="survey-template-description"
              className="mb-2 text-[#526A88]"
            >
              Description
              <span className="ml-1 font-normal text-[#9AA9BC]">(optional)</span>
            </Label>
            <textarea
              id="survey-template-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={pending}
              maxLength={5_000}
              placeholder="Explain when this template should be used."
              className="min-h-24 w-full resize-y rounded-xl border border-[#DCE4EE] bg-white px-3.5 py-3 text-sm text-[#0D1F3C] outline-none transition placeholder:text-[#9AA9BC] focus:border-[#1BBFB0] focus:ring-3 focus:ring-[#1BBFB0]/20 disabled:cursor-not-allowed disabled:bg-[#F3F6FA]"
            />
            <p className="mt-1 text-right text-xs text-[#9AA9BC]">
              {description.length.toLocaleString()} / 5,000
            </p>
          </div>
        </div>
      </section>

      <SurveyBuilderWorkspace
        questions={questions}
        questionnaireLocked={pending}
        onAddQuestion={addQuestion}
        onUpdateQuestion={updateQuestion}
        onDeleteQuestion={deleteQuestion}
        onDeleteAllQuestions={deleteAllQuestions}
        onMoveQuestion={moveQuestion}
      />
      <FieldError message={errors.questions} />

      <div className="flex flex-col-reverse gap-3 rounded-2xl border border-[#DFE6EE] bg-white p-4 shadow-[0_8px_24px_rgba(13,31,60,0.04)] sm:flex-row sm:items-center sm:justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={pending}
            className="border-[#D7E0EA] font-bold text-[#526A88]"
          >
            Cancel
          </Button>
        )}
        <Button
          type="button"
          onClick={() => void submitTemplate()}
          disabled={pending}
          className="bg-[#1BBFB0] font-bold text-white hover:bg-[#16A99C]"
        >
          {pending ? <LoaderCircle className="animate-spin" /> : <Save />}
          {template ? 'Save template' : 'Create template'}
        </Button>
      </div>
    </div>
  )
}
