import { useCallback, useEffect, useState } from 'react'

import supabase from '@/lib/supabaseClient'
import { reportClientError } from '@/lib/errors/normaliseClientError'

export type ClientCultureScore = {
  surveyId: string
  surveyTitle: string
  assessmentDate: string
  score: number
  responseCount: number
}

type CultureScoreRow = {
  survey_id: string
  survey_title: string
  assessment_date: string
  score: number
  response_count: number
}

export function useClientCultureScoreHistory(enabled = true) {
  const [history, setHistory] = useState<ClientCultureScore[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!enabled) {
      setHistory([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    const { data, error: historyError } = await supabase.rpc(
      'list_my_culture_score_history',
    )

    if (historyError) {
      setHistory([])
      setError(reportClientError(historyError, 'Culture score history could not be loaded.'))
    } else {
      setHistory(((data || []) as CultureScoreRow[]).map((row) => ({
        surveyId: row.survey_id,
        surveyTitle: row.survey_title,
        assessmentDate: row.assessment_date,
        score: Number(row.score),
        responseCount: Number(row.response_count),
      })))
    }
    setLoading(false)
  }, [enabled])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { history, loading, error, refetch }
}
