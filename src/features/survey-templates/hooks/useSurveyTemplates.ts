import { useCallback, useEffect, useRef, useState } from 'react'

import {
  createSurveyTemplate,
  deleteSurveyTemplate,
  getSurveyTemplate,
  listSurveyTemplates,
  setSurveyTemplateActive,
  updateSurveyTemplate,
  type ManagedSurveyTemplate,
  type ManagedSurveyTemplateSummary,
  type SurveyTemplateFormValues,
} from '../services/surveyTemplatesClient'

export type SurveyTemplateMutationAction =
  | 'create'
  | 'update'
  | 'set-active'
  | 'delete'

type PendingMutation = {
  action: SurveyTemplateMutationAction
  templateId: string | null
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The survey template change could not be completed.'
}

function summaryFrom(
  template: ManagedSurveyTemplate,
): ManagedSurveyTemplateSummary {
  const { questions: _questions, ...summary } = template
  return summary
}

export function useSurveyTemplates() {
  const [templates, setTemplates] = useState<ManagedSurveyTemplateSummary[]>([])
  const [selectedTemplate, setSelectedTemplate] =
    useState<ManagedSurveyTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingTemplate, setLoadingTemplate] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingMutation, setPendingMutation] =
    useState<PendingMutation | null>(null)
  const listController = useRef<AbortController | null>(null)
  const detailController = useRef<AbortController | null>(null)
  const selectedTemplateId = useRef<string | null>(null)
  const mutationLocked = useRef(false)

  const refetch = useCallback(async ({ silent = false } = {}) => {
    listController.current?.abort()
    const controller = new AbortController()
    listController.current = controller

    if (!silent) setLoading(true)
    setError(null)

    try {
      const records = await listSurveyTemplates({ signal: controller.signal })
      if (!controller.signal.aborted) setTemplates(records)
    } catch (requestError) {
      if (!controller.signal.aborted) setError(errorMessage(requestError))
    } finally {
      if (!controller.signal.aborted && !silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()

    return () => {
      listController.current?.abort()
      detailController.current?.abort()
    }
  }, [refetch])

  const selectTemplate = useCallback(async (templateId: string | null) => {
    detailController.current?.abort()
    selectedTemplateId.current = templateId

    if (!templateId) {
      setSelectedTemplate(null)
      setLoadingTemplate(false)
      return null
    }

    const controller = new AbortController()
    detailController.current = controller
    setLoadingTemplate(true)
    setError(null)

    try {
      const template = await getSurveyTemplate(templateId, controller.signal)
      if (
        !controller.signal.aborted &&
        selectedTemplateId.current === templateId
      ) {
        setSelectedTemplate(template)
      }
      return template
    } catch (requestError) {
      if (!controller.signal.aborted) setError(errorMessage(requestError))
      throw requestError
    } finally {
      if (
        !controller.signal.aborted &&
        selectedTemplateId.current === templateId
      ) {
        setLoadingTemplate(false)
      }
    }
  }, [])

  const replaceSummary = useCallback(
    (updated: ManagedSurveyTemplateSummary) => {
      setTemplates((current) =>
        current.map((template) =>
          template.id === updated.id ? updated : template),
      )
    },
    [],
  )

  const runMutation = useCallback(async <Result,>(
    pending: PendingMutation,
    mutation: () => Promise<Result>,
  ): Promise<Result> => {
    if (mutationLocked.current) {
      throw new Error('Another survey template change is already in progress.')
    }

    mutationLocked.current = true
    setPendingMutation(pending)
    setError(null)

    try {
      return await mutation()
    } catch (requestError) {
      setError(errorMessage(requestError))
      throw requestError
    } finally {
      mutationLocked.current = false
      setPendingMutation(null)
    }
  }, [])

  const createTemplate = useCallback(
    (values: SurveyTemplateFormValues) => runMutation(
      { action: 'create', templateId: null },
      async () => {
        const created = await createSurveyTemplate(values)
        setTemplates((current) => [summaryFrom(created), ...current])
        selectedTemplateId.current = created.id
        setSelectedTemplate(created)
        return created
      },
    ),
    [runMutation],
  )

  const updateTemplate = useCallback(
    (templateId: string, values: SurveyTemplateFormValues) => runMutation(
      { action: 'update', templateId },
      async () => {
        const updated = await updateSurveyTemplate(templateId, values)
        replaceSummary(summaryFrom(updated))
        if (selectedTemplateId.current === templateId) {
          setSelectedTemplate(updated)
        }
        return updated
      },
    ),
    [replaceSummary, runMutation],
  )

  const changeTemplateActive = useCallback(
    (templateId: string, active: boolean) => runMutation(
      { action: 'set-active', templateId },
      async () => {
        const updated = await setSurveyTemplateActive(
          templateId,
          active,
        )
        replaceSummary(updated)
        if (selectedTemplateId.current === templateId) {
          setSelectedTemplate((current) =>
            current?.id === templateId
              ? { ...current, ...updated }
              : current,
          )
        }
        return updated
      },
    ),
    [replaceSummary, runMutation],
  )

  const removeTemplate = useCallback(
    (templateId: string) => runMutation(
      { action: 'delete', templateId },
      async () => {
        await deleteSurveyTemplate(templateId)
        setTemplates((current) =>
          current.filter((template) => template.id !== templateId),
        )
        if (selectedTemplateId.current === templateId) {
          selectedTemplateId.current = null
          setSelectedTemplate(null)
        }
      },
    ),
    [runMutation],
  )

  const clearSelection = useCallback(() => {
    detailController.current?.abort()
    selectedTemplateId.current = null
    setSelectedTemplate(null)
    setLoadingTemplate(false)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return {
    templates,
    selectedTemplate,
    selectedTemplateId: selectedTemplate?.id || selectedTemplateId.current,
    loading,
    loadingTemplate,
    error,
    pendingMutation,
    pendingAction: pendingMutation?.action || null,
    pendingTemplateId: pendingMutation?.templateId || null,
    isMutating: pendingMutation !== null,
    refetch,
    selectTemplate,
    clearSelection,
    clearError,
    createTemplate,
    updateTemplate,
    changeTemplateActive,
    removeTemplate,
  }
}
