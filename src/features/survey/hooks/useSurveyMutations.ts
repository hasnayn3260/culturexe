import { useCallback, useRef, useState } from 'react'

import {
  cloneSurveyTemplateQuestions,
  createManagedSurvey,
  deleteManagedSurvey,
  updateManagedSurvey,
  type CloneSurveyTemplateInput,
  type SurveyMutationResult,
} from '../services/surveysClient'
import type { CreateSurveyInput, UpdateSurveyInput } from '../types'

export type SurveyMutationAction =
  | 'create'
  | 'update'
  | 'clone-template'
  | 'delete'

type UseSurveyMutationsOptions = {
  onRefresh?: () => Promise<unknown> | unknown
  onSurveyCreated?: (survey: SurveyMutationResult) => Promise<unknown> | unknown
  onSurveyUpdated?: (survey: SurveyMutationResult) => Promise<unknown> | unknown
  onSurveyDeleted?: (surveyId: string) => Promise<unknown> | unknown
}

type MutationContext = {
  action: SurveyMutationAction
  surveyId: string | null
}

function messageFrom(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The survey change could not be completed.'
}

export function useSurveyMutations({
  onRefresh,
  onSurveyCreated,
  onSurveyUpdated,
  onSurveyDeleted,
}: UseSurveyMutationsOptions = {}) {
  const [pending, setPending] = useState<MutationContext | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mutationLocked = useRef(false)

  const runMutation = useCallback(
    async <Result,>(
      context: MutationContext,
      mutation: () => Promise<Result>,
      afterMutation?: (result: Result) => Promise<unknown> | unknown,
    ): Promise<Result> => {
      if (mutationLocked.current) {
        throw new Error('Another survey change is already in progress.')
      }

      mutationLocked.current = true
      setPending(context)
      setError(null)

      try {
        const result = await mutation()
        await afterMutation?.(result)
        await onRefresh?.()
        return result
      } catch (caughtError) {
        setError(messageFrom(caughtError))
        throw caughtError
      } finally {
        mutationLocked.current = false
        setPending(null)
      }
    },
    [onRefresh],
  )

  const createSurvey = useCallback(
    (values: CreateSurveyInput) =>
      runMutation(
        { action: 'create', surveyId: null },
        () => createManagedSurvey(values),
        onSurveyCreated,
      ),
    [onSurveyCreated, runMutation],
  )

  const updateSurvey = useCallback(
    (input: UpdateSurveyInput) =>
      runMutation(
        { action: 'update', surveyId: input.id },
        () => updateManagedSurvey(input),
        onSurveyUpdated,
      ),
    [onSurveyUpdated, runMutation],
  )

  const saveSurvey = useCallback(
    (input: CreateSurveyInput | UpdateSurveyInput) =>
      'id' in input ? updateSurvey(input) : createSurvey(input),
    [createSurvey, updateSurvey],
  )

  const cloneTemplate = useCallback(
    (input: CloneSurveyTemplateInput) =>
      runMutation(
        { action: 'clone-template', surveyId: input.surveyId },
        () => cloneSurveyTemplateQuestions(input),
        onSurveyUpdated,
      ),
    [onSurveyUpdated, runMutation],
  )

  const deleteSurvey = useCallback(
    (surveyId: string) =>
      runMutation(
        { action: 'delete', surveyId },
        () => deleteManagedSurvey(surveyId),
        () => onSurveyDeleted?.(surveyId),
      ),
    [onSurveyDeleted, runMutation],
  )

  const clearError = useCallback(() => setError(null), [])

  return {
    pending,
    pendingAction: pending?.action || null,
    pendingSurveyId: pending?.surveyId || null,
    isPending: pending !== null,
    submittingForm:
      pending?.action === 'create' || pending?.action === 'update',
    error,
    clearError,
    createSurvey,
    updateSurvey,
    saveSurvey,
    cloneTemplate,
    deleteSurvey,
  }
}
