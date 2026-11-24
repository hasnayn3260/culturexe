import { useMemo, useState } from 'react'
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CheckSquare2,
  ChevronDown,
  CircleDot,
  Clock3,
  Gauge,
  Grid3X3,
  GripVertical,
  ListPlus,
  LoaderCircle,
  LockKeyhole,
  Paperclip,
  Pencil,
  Plus,
  Star,
  TextCursorInput,
  Trash2,
  type LucideIcon,
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import type {
  QuestionMoveDirection,
  SurveyQuestion,
  SurveyQuestionInput,
  SurveyQuestionUpdate,
} from '../hooks/useSurveyDetails'
import SurveyQuestionForm, {
  surveyQuestionTypeLabel,
  type SurveyQuestionType,
} from './SurveyQuestionForm'

type SurveyBuilderWorkspaceProps = {
  questions: SurveyQuestion[]
  questionnaireLocked: boolean
  onAddQuestion: (question: SurveyQuestionInput) => Promise<unknown> | unknown
  onUpdateQuestion: (
    questionId: string,
    updates: SurveyQuestionUpdate,
  ) => Promise<unknown> | unknown
  onDeleteQuestion: (questionId: string) => Promise<unknown> | unknown
  onDeleteAllQuestions: () => Promise<unknown> | unknown
  onMoveQuestion: (
    questionId: string,
    direction: QuestionMoveDirection,
  ) => Promise<unknown> | unknown
}

type PendingAction =
  | { name: 'add'; questionId: null }
  | { name: 'update' | 'delete' | 'move'; questionId: string }
  | { name: 'delete-all'; questionId: null }

const TYPE_ICONS: Partial<Record<SurveyQuestionType, LucideIcon>> = {
  LIKERT: Star,
  SHORT_TEXT: TextCursorInput,
  LONG_TEXT: AlignLeft,
  SINGLE_CHOICE: CircleDot,
  MULTI_CHOICE: CheckSquare2,
  DROPDOWN: ChevronDown,
  RATING_SCALE: Gauge,
  MATRIX: Grid3X3,
  DATE: CalendarDays,
  TIME: Clock3,
  FILE: Paperclip,
}

function messageFrom(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The questionnaire change could not be completed.'
}

function optionRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function questionOptionSummary(question: SurveyQuestion): string | null {
  const options = optionRecord(question.options)

  if (
    question.question_type === 'SINGLE_CHOICE' ||
    question.question_type === 'MULTI_CHOICE' ||
    question.question_type === 'DROPDOWN'
  ) {
    const choices = stringArray(options.choices)
    return choices.length > 0 ? choices.join(' · ') : null
  }

  if (question.question_type === 'RATING_SCALE') {
    const minimum = options.min ?? 1
    const maximum = options.max ?? 10
    const minimumLabel = typeof options.min_label === 'string'
      ? options.min_label.trim()
      : ''
    const maximumLabel = typeof options.max_label === 'string'
      ? options.max_label.trim()
      : ''
    const labels = [minimumLabel, maximumLabel].filter(Boolean).join(' → ')
    return `${String(minimum)}–${String(maximum)}${labels ? ` · ${labels}` : ''}`
  }

  if (question.question_type === 'MATRIX') {
    const rows = stringArray(options.rows)
    const columns = stringArray(options.cols)
    return `${rows.length} ${rows.length === 1 ? 'row' : 'rows'} · ${columns.length} columns`
  }

  if (question.question_type === 'LIKERT') {
    return 'Strongly disagree → Strongly agree'
  }

  return null
}

function QuestionTypeIcon({ type }: { type: string }) {
  const Icon = TYPE_ICONS[type as SurveyQuestionType] || ListPlus
  return <Icon className="size-4" />
}

export default function SurveyBuilderWorkspace({
  questions,
  questionnaireLocked,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onDeleteAllQuestions,
  onMoveQuestion,
}: SurveyBuilderWorkspaceProps) {
  const [addingQuestion, setAddingQuestion] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SurveyQuestion | 'all' | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [error, setError] = useState<string | null>(null)

  const orderedQuestions = useMemo(
    () => [...questions].sort((first, second) =>
      first.order_num - second.order_num || first.id.localeCompare(second.id)),
    [questions],
  )
  const editingQuestion = useMemo(
    () => questions.find(({ id }) => id === editingQuestionId) || null,
    [editingQuestionId, questions],
  )
  const isPending = pending !== null

  async function runAction(
    action: PendingAction,
    operation: () => Promise<unknown> | unknown,
  ) {
    if (isPending) return
    setPending(action)
    setError(null)

    try {
      await operation()
    } catch (caughtError) {
      setError(messageFrom(caughtError))
      throw caughtError
    } finally {
      setPending(null)
    }
  }

  async function addQuestion(question: SurveyQuestionInput) {
    await runAction(
      { name: 'add', questionId: null },
      () => onAddQuestion(question),
    )
    setAddingQuestion(false)
  }

  async function updateQuestion(question: SurveyQuestionInput) {
    if (!editingQuestionId) return
    await runAction(
      { name: 'update', questionId: editingQuestionId },
      () => onUpdateQuestion(editingQuestionId, question),
    )
    setEditingQuestionId(null)
  }

  async function moveQuestion(
    questionId: string,
    direction: QuestionMoveDirection,
  ) {
    try {
      await runAction(
        { name: 'move', questionId },
        () => onMoveQuestion(questionId, direction),
      )
    } catch {
      // The workspace alert already presents the mutation error.
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return

    try {
      if (deleteTarget === 'all') {
        await runAction(
          { name: 'delete-all', questionId: null },
          onDeleteAllQuestions,
        )
        setEditingQuestionId(null)
      } else {
        const questionId = deleteTarget.id
        await runAction(
          { name: 'delete', questionId },
          () => onDeleteQuestion(questionId),
        )
        if (editingQuestionId === questionId) setEditingQuestionId(null)
      }
    } catch {
      // Keep the dialog open so the user can retry or cancel.
      return
    }

    setDeleteTarget(null)
  }

  function startAddingQuestion() {
    setError(null)
    setEditingQuestionId(null)
    setAddingQuestion(true)
  }

  function startEditingQuestion(questionId: string) {
    setError(null)
    setAddingQuestion(false)
    setEditingQuestionId(questionId)
  }

  return (
    <div className="space-y-5">
      {questionnaireLocked && (
        <Alert className="border-[#E7D6AE] bg-[#FFF9EA] text-[#785817]">
          <LockKeyhole />
          <AlertDescription>
            This questionnaire is locked because the survey has been scheduled,
            opened or closed. Return the survey to draft before changing questions.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="border-[#F4B6AE] bg-[#FFF5F3]">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-2xl border border-[#DFE6EE] bg-white shadow-[0_8px_24px_rgba(13,31,60,0.04)]">
        <div className="flex flex-col gap-4 border-b border-[#E8EDF3] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-['Plus_Jakarta_Sans'] text-xl font-extrabold text-[#0D1F3C]">
                Questions
              </h2>
              <Badge
                variant="outline"
                className="border-[#CFE2ED] bg-[#F2F8FB] text-[#526A88]"
              >
                {orderedQuestions.length}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-[#8A9BB0]">
              Add, edit and arrange the questionnaire shown to respondents.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {orderedQuestions.length > 0 && !questionnaireLocked && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteTarget('all')}
                disabled={isPending}
                className="border-[#F0C8C1] bg-white text-[#A44B3B] hover:bg-[#FFF1EF] hover:text-[#8F3527]"
              >
                <Trash2 />
                Delete all
              </Button>
            )}
            <Button
              type="button"
              onClick={startAddingQuestion}
              disabled={questionnaireLocked || isPending || addingQuestion}
              className="bg-[#1BBFB0] font-bold text-white hover:bg-[#16A99C]"
            >
              <Plus />
              Add question
            </Button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {addingQuestion && (
            <SurveyQuestionForm
              pending={pending?.name === 'add'}
              disabled={questionnaireLocked}
              onSave={addQuestion}
              onCancel={() => setAddingQuestion(false)}
            />
          )}

          {orderedQuestions.length === 0 && !addingQuestion && (
            <div className="rounded-2xl border border-dashed border-[#CAD7E5] bg-[#FAFCFD] px-6 py-14 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#E5F8F6] text-[#0A8A7E]">
                <ListPlus className="size-6" />
              </div>
              <h3 className="mt-4 font-['Plus_Jakarta_Sans'] text-lg font-extrabold text-[#0D1F3C]">
                Start building the questionnaire
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#8A9BB0]">
                Add the first question now. Survey templates and bulk question
                imports will use this same questionnaire structure.
              </p>
              {!questionnaireLocked && (
                <Button
                  type="button"
                  onClick={startAddingQuestion}
                  className="mt-5 bg-[#1BBFB0] font-bold text-white hover:bg-[#16A99C]"
                >
                  <Plus />
                  Add first question
                </Button>
              )}
            </div>
          )}

          {orderedQuestions.map((question, index) => {
            const isEditing = editingQuestionId === question.id
            const optionSummary = questionOptionSummary(question)
            const questionPending = pending?.questionId === question.id

            return (
              <div key={question.id} className="space-y-3">
                <article
                  className={`group rounded-2xl border bg-white transition ${
                    isEditing
                      ? 'border-[#90DCD5] shadow-[0_0_0_3px_rgba(27,191,176,0.10)]'
                      : 'border-[#E1E8EF] hover:border-[#C8D7E5] hover:shadow-[0_6px_18px_rgba(13,31,60,0.04)]'
                  }`}
                >
                  <div className="flex gap-3 p-4 sm:gap-4">
                    <div className="flex shrink-0 flex-col items-center gap-1">
                      <GripVertical className="mt-1 size-4 text-[#B1BECD]" />
                      <div className="flex size-8 items-center justify-center rounded-lg bg-[#F1F5F8] text-xs font-extrabold text-[#526A88]">
                        {index + 1}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-[#CFE2ED] bg-[#F2F8FB] text-[#526A88]"
                        >
                          <QuestionTypeIcon type={question.question_type} />
                          {surveyQuestionTypeLabel(question.question_type)}
                        </Badge>
                        {question.dimension && (
                          <Badge
                            variant="outline"
                            className="border-[#BDE6E1] bg-[#ECFAF8] text-[#087C72]"
                          >
                            {question.dimension}
                          </Badge>
                        )}
                      </div>

                      <h3 className="mt-3 text-[15px] font-bold leading-6 text-[#0D1F3C]">
                        {question.text}
                      </h3>
                      {question.hint && (
                        <p className="mt-1 text-sm leading-5 text-[#8A9BB0]">
                          {question.hint}
                        </p>
                      )}
                      {optionSummary && (
                        <p className="mt-2 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#7C8EA5]">
                          {optionSummary}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => void moveQuestion(question.id, 'up')}
                        disabled={
                          questionnaireLocked || isPending || index === 0
                        }
                        aria-label={`Move question ${index + 1} up`}
                        title="Move up"
                        className="text-[#526A88] hover:bg-[#F2F7F8] hover:text-[#087C72]"
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => void moveQuestion(question.id, 'down')}
                        disabled={
                          questionnaireLocked ||
                          isPending ||
                          index === orderedQuestions.length - 1
                        }
                        aria-label={`Move question ${index + 1} down`}
                        title="Move down"
                        className="text-[#526A88] hover:bg-[#F2F7F8] hover:text-[#087C72]"
                      >
                        {questionPending && pending?.name === 'move' ? (
                          <LoaderCircle className="animate-spin" />
                        ) : (
                          <ArrowDown />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => startEditingQuestion(question.id)}
                        disabled={questionnaireLocked || isPending}
                        aria-label={`Edit question ${index + 1}`}
                        title="Edit question"
                        className="text-[#526A88] hover:bg-[#F2F7F8] hover:text-[#087C72]"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteTarget(question)}
                        disabled={questionnaireLocked || isPending}
                        aria-label={`Delete question ${index + 1}`}
                        title="Delete question"
                        className="text-[#A44B3B] hover:bg-[#FFF1EF] hover:text-[#8F3527]"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </article>

                {isEditing && editingQuestion && (
                  <SurveyQuestionForm
                    initialQuestion={editingQuestion}
                    pending={pending?.name === 'update' && questionPending}
                    disabled={questionnaireLocked}
                    onSave={updateQuestion}
                    onCancel={() => setEditingQuestionId(null)}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && pending?.name !== 'delete' && pending?.name !== 'delete-all') {
            setDeleteTarget(null)
          }
        }}
      >
        <AlertDialogContent className="bg-white text-[#0D1F3C]">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-[#FFF1EF] text-[#A44B3B]">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle className="font-['Plus_Jakarta_Sans'] font-extrabold">
              {deleteTarget === 'all' ? 'Delete every question?' : 'Delete this question?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#7C8EA5]">
              {deleteTarget === 'all'
                ? `This permanently removes all ${orderedQuestions.length} questions from the survey.`
                : 'This permanently removes the selected question from the survey.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={() => void confirmDelete()}
              disabled={isPending}
              className="bg-[#C94D3C] font-bold text-white hover:bg-[#AD3E30]"
            >
              {(pending?.name === 'delete' || pending?.name === 'delete-all') && (
                <LoaderCircle className="animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
