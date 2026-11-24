import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  Building2,
  ClipboardPlus,
  Globe2,
  Layers3,
  LoaderCircle,
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import type {
  CreateSurveyInput,
  SurveyFormValues,
  SurveyListItem,
  SurveyOrganisationReference,
  SurveyTemplateSummary,
  UpdateSurveyInput,
} from '../types'

type SurveyFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  survey?: SurveyListItem | null
  organisations: SurveyOrganisationReference[]
  templates?: SurveyTemplateSummary[]
  submitting?: boolean
  onSubmit: (values: CreateSurveyInput | UpdateSurveyInput) => Promise<unknown>
}

type DialogValues = SurveyFormValues & {
  templateId: string
}

type FieldErrors = Partial<
  Record<'organisationId' | 'title' | 'liveStart' | 'liveEnd' | 'templateId', string>
>

const EMPTY_VALUES: DialogValues = {
  organisationId: '',
  title: '',
  description: '',
  status: 'draft',
  liveStart: '',
  liveEnd: '',
  openLinkEnabled: false,
  templateId: '',
}

const inputClassName =
  'h-10 rounded-[10px] border-[#DCE4EE] bg-white px-3 text-[14px] text-[#0D1F3C] placeholder:text-[#9AA9BC] focus-visible:border-[#1BBFB0] focus-visible:ring-[#1BBFB0]/20 aria-invalid:border-[#D94A3A] aria-invalid:ring-[#D94A3A]/15'
const selectClassName =
  'h-10 w-full rounded-[10px] border border-[#DCE4EE] bg-white px-3 text-[14px] text-[#0D1F3C] outline-none transition focus:border-[#1BBFB0] focus:ring-3 focus:ring-[#1BBFB0]/20 aria-invalid:border-[#D94A3A] aria-invalid:ring-3 aria-invalid:ring-[#D94A3A]/15 disabled:cursor-not-allowed disabled:bg-[#F3F6FA] disabled:text-[#8A9BB0]'

function localDateTimeValue(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}

function isoDateTimeValue(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function valuesFromSurvey(survey?: SurveyListItem | null): DialogValues {
  if (!survey) return { ...EMPTY_VALUES }

  return {
    organisationId: survey.organisationId,
    title: survey.title,
    description: survey.description || '',
    status: survey.storedStatus,
    liveStart: localDateTimeValue(survey.liveStart),
    liveEnd: localDateTimeValue(survey.liveEnd),
    openLinkEnabled: survey.openLinkEnabled,
    templateId: '',
  }
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs font-medium text-[#D94A3A]">{message}</p>
}

function FieldLabel({
  htmlFor,
  children,
  required = false,
}: {
  htmlFor: string
  children: string
  required?: boolean
}) {
  return (
    <Label htmlFor={htmlFor} className="mb-2 text-[#526A88]">
      {children}
      {required && <span className="ml-0.5 font-extrabold text-[#D94A3A]">*</span>}
    </Label>
  )
}

function validate(
  values: DialogValues,
  templates: SurveyTemplateSummary[],
): FieldErrors {
  const errors: FieldErrors = {}
  if (!values.organisationId) errors.organisationId = 'Select an organisation.'
  if (!values.title.trim()) errors.title = 'Enter a survey title.'

  const requiresSchedule = values.status === 'live'
  if (requiresSchedule && !values.liveStart) {
    errors.liveStart = 'Set an opening date before scheduling the survey.'
  }
  if (requiresSchedule && !values.liveEnd) {
    errors.liveEnd = 'Set a closing date before scheduling the survey.'
  }
  if (values.liveStart && !values.liveEnd) {
    errors.liveEnd = 'Set a closing date.'
  }
  if (values.liveEnd && !values.liveStart) {
    errors.liveStart = 'Set an opening date.'
  }
  if (
    values.liveStart &&
    values.liveEnd &&
    new Date(values.liveEnd).getTime() <= new Date(values.liveStart).getTime()
  ) {
    errors.liveEnd = 'The closing date must be after the opening date.'
  }

  if (values.templateId) {
    const template = templates.find(({ id }) => id === values.templateId)
    if (!template) {
      errors.templateId = 'The selected template is no longer available.'
    } else if (
      template.organisationId &&
      template.organisationId !== values.organisationId
    ) {
      errors.templateId = 'This template belongs to a different organisation.'
    }
  }

  return errors
}

export default function SurveyFormDialog({
  open,
  onOpenChange,
  mode,
  survey = null,
  organisations,
  templates = [],
  submitting = false,
  onSubmit,
}: SurveyFormDialogProps) {
  const [values, setValues] = useState<DialogValues>({ ...EMPTY_VALUES })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setValues(mode === 'edit' ? valuesFromSurvey(survey) : { ...EMPTY_VALUES })
    setErrors({})
    setSubmitError(null)
  }, [mode, open, survey])

  const availableTemplates = useMemo(
    () => templates.filter(
      (template) =>
        !template.organisationId ||
        template.organisationId === values.organisationId,
    ),
    [templates, values.organisationId],
  )
  const selectedTemplate = useMemo(
    () => templates.find(({ id }) => id === values.templateId) || null,
    [templates, values.templateId],
  )
  const selectedTemplateOrganisation = useMemo(() => {
    if (!selectedTemplate?.organisationId) return null
    return organisations.find(
      ({ id }) => id === selectedTemplate.organisationId,
    ) || null
  }, [organisations, selectedTemplate])

  function update<Key extends keyof DialogValues>(
    key: Key,
    value: DialogValues[Key],
  ) {
    setValues((current) => {
      const nextValues = { ...current, [key]: value }

      if (key === 'organisationId' && current.templateId) {
        const selectedTemplate = templates.find(
          ({ id }) => id === current.templateId,
        )

        if (
          selectedTemplate?.organisationId &&
          selectedTemplate.organisationId !== value
        ) {
          nextValues.templateId = ''
        }
      }

      return nextValues
    })
    setErrors((current) => ({ ...current, [key]: undefined }))
    setSubmitError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(values, templates)
    setErrors(nextErrors)
    setSubmitError(null)
    if (Object.keys(nextErrors).length > 0) return

    const formValues: SurveyFormValues = {
      organisationId: values.organisationId,
      title: values.title.trim(),
      description: values.description.trim(),
      status: values.status,
      liveStart: isoDateTimeValue(values.liveStart),
      liveEnd: isoDateTimeValue(values.liveEnd),
      openLinkEnabled: values.openLinkEnabled,
    }

    try {
      if (mode === 'edit') {
        if (!survey) throw new Error('The selected survey is unavailable.')
        await onSubmit({ ...formValues, id: survey.id })
      } else {
        await onSubmit({
          ...formValues,
          templateId: values.templateId || null,
        })
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'The survey could not be saved.',
      )
    }
  }

  const title = mode === 'create' ? 'Create survey' : 'Edit survey settings'

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!submitting) onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-[18px] bg-white p-0 text-[#0D1F3C] shadow-[0_24px_64px_rgba(13,31,60,0.20)] ring-0 sm:max-w-[720px]">
        <DialogHeader className="shrink-0 border-b border-[#E8EDF3] px-5 py-5 pr-16 sm:px-7 sm:py-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#E5F8F6] text-[#0A8A7E]">
              <ClipboardPlus className="size-5" />
            </div>
            <div>
              <DialogTitle className="font-['Plus_Jakarta_Sans'] text-xl font-extrabold tracking-[-0.3px] text-[#0D1F3C]">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] text-[#8A9BB0]">
                {mode === 'create'
                  ? 'Set the survey owner, schedule and initial questionnaire source.'
                  : 'Update the survey schedule, access and general details.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-5 py-5 sm:grid-cols-2 sm:px-7 sm:py-6">
            {submitError && (
              <Alert className="border-[#F2B8AE] bg-[#FFF4F1] text-[#A23D2D] sm:col-span-2">
                <AlertCircle />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <div>
              <FieldLabel htmlFor="survey-organisation" required>
                Organisation
              </FieldLabel>
              <select
                id="survey-organisation"
                value={values.organisationId}
                onChange={(event) => update('organisationId', event.target.value)}
                disabled={submitting || mode === 'edit'}
                aria-invalid={Boolean(errors.organisationId)}
                className={selectClassName}
              >
                <option value="">Select organisation</option>
                {organisations.map((organisation) => (
                  <option key={organisation.id} value={organisation.id}>
                    {organisation.tradingName || organisation.name}
                  </option>
                ))}
              </select>
              <FieldError message={errors.organisationId} />
              {mode === 'edit' && (
                <p className="mt-1 text-[11px] text-[#8A9BB0]">
                  The organisation cannot be changed after creation.
                </p>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="survey-status" required>
                Lifecycle
              </FieldLabel>
              <select
                id="survey-status"
                value={values.status}
                onChange={(event) =>
                  update('status', event.target.value as SurveyFormValues['status'])}
                disabled={submitting}
                className={selectClassName}
              >
                <option value="draft">Draft</option>
                <option value="live">Scheduled / live</option>
                {mode === 'edit' && <option value="closed">Closed</option>}
              </select>
              <p className="mt-1 text-[11px] text-[#8A9BB0]">
                Future opening dates display as Scheduled automatically.
              </p>
            </div>

            <div className="sm:col-span-2">
              <FieldLabel htmlFor="survey-title" required>
                Survey title
              </FieldLabel>
              <Input
                id="survey-title"
                value={values.title}
                onChange={(event) => update('title', event.target.value)}
                placeholder="e.g. 2027 Culture and Engagement Survey"
                disabled={submitting}
                aria-invalid={Boolean(errors.title)}
                className={inputClassName}
              />
              <FieldError message={errors.title} />
            </div>

            <div className="sm:col-span-2">
              <FieldLabel htmlFor="survey-description">Description</FieldLabel>
              <textarea
                id="survey-description"
                value={values.description}
                onChange={(event) => update('description', event.target.value)}
                placeholder="Describe the purpose of this survey."
                disabled={submitting}
                rows={3}
                className="w-full resize-y rounded-[10px] border border-[#DCE4EE] bg-white px-3 py-2.5 text-[14px] text-[#0D1F3C] outline-none placeholder:text-[#9AA9BC] focus:border-[#1BBFB0] focus:ring-3 focus:ring-[#1BBFB0]/20"
              />
            </div>

            {mode === 'create' && (
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="survey-template">Start from template</FieldLabel>
                <select
                  id="survey-template"
                  value={values.templateId}
                  onChange={(event) => update('templateId', event.target.value)}
                  disabled={submitting}
                  aria-invalid={Boolean(errors.templateId)}
                  className={selectClassName}
                >
                  <option value="">Blank survey</option>
                  {availableTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} · {template.scope === 'global' ? 'Global' : 'Organisation'} · {template.questionCount} {template.questionCount === 1 ? 'question' : 'questions'}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.templateId} />
                {selectedTemplate && (
                  <div className="mt-3 rounded-[12px] border border-[#DCE4EE] bg-[#F8FAFC] p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E5F8F6] px-2.5 py-1 text-[11px] font-bold text-[#0A8A7E]">
                        {selectedTemplate.scope === 'global' ? (
                          <Globe2 className="size-3.5" />
                        ) : (
                          <Building2 className="size-3.5" />
                        )}
                        {selectedTemplate.scope === 'global'
                          ? 'Global template'
                          : selectedTemplateOrganisation?.tradingName
                            || selectedTemplateOrganisation?.name
                            || 'Organisation template'}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF4FB] px-2.5 py-1 text-[11px] font-bold text-[#2479AF]">
                        <Layers3 className="size-3.5" />
                        {selectedTemplate.questionCount}{' '}
                        {selectedTemplate.questionCount === 1
                          ? 'question'
                          : 'questions'}
                      </span>
                    </div>
                    {selectedTemplate.description && (
                      <p className="mt-2 text-xs leading-5 text-[#6F8299]">
                        {selectedTemplate.description}
                      </p>
                    )}
                  </div>
                )}
                <p className="mt-1 text-[11px] text-[#8A9BB0]">
                  Templates copy questionnaire content only. Dates, respondents and responses are never copied.
                </p>
              </div>
            )}

            <div>
              <FieldLabel htmlFor="survey-live-start" required={values.status === 'live'}>
                Opening date and time
              </FieldLabel>
              <Input
                id="survey-live-start"
                type="datetime-local"
                value={values.liveStart}
                max={values.liveEnd || undefined}
                onChange={(event) => update('liveStart', event.target.value)}
                disabled={submitting}
                aria-invalid={Boolean(errors.liveStart)}
                className={inputClassName}
              />
              <FieldError message={errors.liveStart} />
            </div>

            <div>
              <FieldLabel htmlFor="survey-live-end" required={values.status === 'live'}>
                Closing date and time
              </FieldLabel>
              <Input
                id="survey-live-end"
                type="datetime-local"
                value={values.liveEnd}
                min={values.liveStart || undefined}
                onChange={(event) => update('liveEnd', event.target.value)}
                disabled={submitting}
                aria-invalid={Boolean(errors.liveEnd)}
                className={inputClassName}
              />
              <FieldError message={errors.liveEnd} />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-[#DCE4EE] bg-[#F8FAFC] p-4 sm:col-span-2">
              <input
                type="checkbox"
                checked={values.openLinkEnabled}
                onChange={(event) => update('openLinkEnabled', event.target.checked)}
                disabled={submitting}
                className="mt-0.5 size-4 accent-[#1BBFB0]"
              />
              <span>
                <span className="block text-sm font-bold text-[#0D1F3C]">
                  Enable open survey link
                </span>
                <span className="mt-1 block text-xs leading-5 text-[#8A9BB0]">
                  Anyone with the link can enter the survey. Keep this disabled when access must be limited to invited respondents.
                </span>
              </span>
            </label>
          </div>

          <DialogFooter className="m-0 shrink-0 rounded-none border-t border-[#E8EDF3] bg-[#F8FAFC] px-5 py-4 sm:px-7">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="border-[#D4DEE9] bg-white text-[#526A88] hover:bg-[#F3F6F9] hover:text-[#0D1F3C]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#1BBFB0] font-bold text-white hover:bg-[#16A99C]"
            >
              {submitting && <LoaderCircle className="animate-spin" />}
              {mode === 'create' ? 'Create survey' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
