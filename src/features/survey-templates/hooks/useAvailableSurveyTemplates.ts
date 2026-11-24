import { useCallback, useEffect, useRef, useState } from 'react'

import type { SurveyTemplateSummary } from '@/features/survey/types'

import { listSurveyTemplates } from '../services/surveyTemplatesClient'

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The available survey templates could not be loaded.'
}

export function useAvailableSurveyTemplates() {
  const [templates, setTemplates] = useState<SurveyTemplateSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestController = useRef<AbortController | null>(null)

  const refetch = useCallback(async () => {
    requestController.current?.abort()
    const controller = new AbortController()
    requestController.current = controller

    setLoading(true)
    setError(null)

    try {
      const availableTemplates = await listSurveyTemplates({
        activeOnly: true,
        signal: controller.signal,
      })

      if (!controller.signal.aborted) {
        setTemplates(availableTemplates)
      }
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setTemplates([])
        setError(errorMessage(requestError))
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()

    return () => requestController.current?.abort()
  }, [refetch])

  return {
    templates,
    loading,
    error,
    refetch,
  }
}
