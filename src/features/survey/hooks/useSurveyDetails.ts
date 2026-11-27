import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import supabase from '@/lib/supabaseClient'
import { reportClientError } from '@/lib/errors/normaliseClientError'

import {
  getEffectiveSurveyStatus,
  type SurveyLifecycleStatus,
} from '../utils/surveyStatus'
import { useSurveyStatusClock } from './useSurveyStatusClock'

export type SurveyDetail = {
  id: string
  org_id: string
  title: string
  description: string | null
  status: 'draft' | 'live' | 'closed'
  live_start: string | null
  live_end: string | null
  created_at: string
  updated_at: string
  open_link_enabled: boolean
  open_link_token: string
  reminders_enabled: boolean
  reminder_first_send_at: string | null
  reminder_frequency_days: number
  reminder_send_time: string
  reminder_timezone: string
  reminder_max_sends: number
  email_invitations_enabled: boolean
  email_reminders_enabled: boolean
  email_receipts_enabled: boolean
  sms_invitations_enabled: boolean
  sms_reminders_enabled: boolean
  sms_receipts_enabled: boolean
}

export type SurveyQuestion = {
  id: string
  survey_id: string
  text: string
  hint: string | null
  question_type: string
  dimension: string | null
  order_num: number
  created_at: string
  updated_at: string
  options: unknown
}

export type SurveyRespondent = {
  id: string
  survey_id: string
  email: string
  name: string | null
  department: string | null
  job_title: string | null
  token: string
  used: boolean
  invited_at: string | null
  reminded_at: string | null
  submitted_at: string | null
  response_timing: string | null
  user_id: string | null
  draft_answers: unknown
  draft_saved_at: string | null
  first_accessed_at: string | null
  last_accessed_at: string | null
  access_count: number
  started_at: string | null
  completion_duration_seconds: number | null
  source: string | null
  tenure: string | null
  job_grade: string | null
  reminder_count: number
  last_reminder_attempted_at: string | null
  last_reminder_error: string | null
}

export type SurveyResponse = {
  id: string
  survey_id: string
  respondent_id: string
  answers: unknown
  submitted_at: string
  receipt_email_attempted_at: string | null
  receipt_email_sent_at: string | null
  receipt_email_message_id: string | null
}

export type SurveyUpdate = Partial<
  Pick<
    SurveyDetail,
    | 'title'
    | 'description'
    | 'status'
    | 'live_start'
    | 'live_end'
    | 'open_link_enabled'
    | 'reminders_enabled'
    | 'reminder_first_send_at'
    | 'reminder_frequency_days'
    | 'reminder_send_time'
    | 'reminder_timezone'
    | 'reminder_max_sends'
    | 'email_invitations_enabled'
    | 'email_reminders_enabled'
    | 'email_receipts_enabled'
    | 'sms_invitations_enabled'
    | 'sms_reminders_enabled'
    | 'sms_receipts_enabled'
  >
>

export type SurveyQuestionInput = Pick<
  SurveyQuestion,
  'text' | 'question_type'
> &
  Partial<
    Pick<
      SurveyQuestion,
      'hint' | 'dimension' | 'order_num' | 'options'
    >
  >

export type SurveyQuestionUpdate = Partial<SurveyQuestionInput>
export type SurveyRespondentImportRow = Record<string, unknown>
export type SurveyOrganisationUser = {
  id: string
  email: string
  fullName: string | null
  department: string | null
  jobTitle: string | null
  position: string | null
  branch: string | null
  locationSite: string | null
}
export type QuestionMoveDirection = 'up' | 'down'

type RefetchOptions = {
  silent?: boolean
}

function errorMessage(error: unknown): string {
  return reportClientError(error, 'The survey could not be loaded.')
}

export function useSurveyDetails(surveyId?: string | null) {
  const statusNow = useSurveyStatusClock()
  const [survey, setSurvey] = useState<SurveyDetail | null>(null)
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [respondents, setRespondents] = useState<SurveyRespondent[]>([])
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [loading, setLoading] = useState(Boolean(surveyId))
  const [error, setError] = useState<string | null>(null)

  const refreshTimerRef = useRef<number | null>(null)
  const requestSequenceRef = useRef(0)

  const clearSurvey = useCallback(() => {
    setSurvey(null)
    setQuestions([])
    setRespondents([])
    setResponses([])
  }, [])

  const refetch = useCallback(
    async ({ silent = false }: RefetchOptions = {}) => {
      const requestSequence = ++requestSequenceRef.current

      if (!surveyId) {
        clearSurvey()
        setError(null)
        setLoading(false)
        return
      }

      if (!silent) setLoading(true)
      setError(null)

      try {
        const { data: surveyData, error: surveyError } = await supabase
          .from('survey')
          .select('*')
          .eq('id', surveyId)
          .maybeSingle()

        if (surveyError) throw surveyError
        if (requestSequence !== requestSequenceRef.current) return

        if (!surveyData) {
          clearSurvey()
          setError('The selected survey could not be found.')
          return
        }

        const [questionResult, respondentResult, responseResult] =
          await Promise.all([
            supabase
              .from('survey_questions')
              .select('*')
              .eq('survey_id', surveyId)
              .order('order_num'),
            supabase
              .from('survey_respondents')
              .select('*')
              .eq('survey_id', surveyId)
              .order('invited_at', { ascending: false }),
            supabase
              .from('survey_responses')
              .select('*')
              .eq('survey_id', surveyId),
          ])

        if (questionResult.error) throw questionResult.error
        if (respondentResult.error) throw respondentResult.error
        if (responseResult.error) throw responseResult.error
        if (requestSequence !== requestSequenceRef.current) return

        setSurvey(surveyData as SurveyDetail)
        setQuestions((questionResult.data ?? []) as SurveyQuestion[])
        setRespondents((respondentResult.data ?? []) as SurveyRespondent[])
        setResponses((responseResult.data ?? []) as SurveyResponse[])
      } catch (caughtError) {
        if (requestSequence !== requestSequenceRef.current) return
        clearSurvey()
        setError(errorMessage(caughtError))
      } finally {
        if (requestSequence === requestSequenceRef.current) {
          setLoading(false)
        }
      }
    },
    [clearSurvey, surveyId],
  )

  useEffect(() => {
    void refetch()
  }, [refetch])

  useEffect(() => {
    if (!surveyId) return undefined

    const queueRefresh = () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current)
      }

      refreshTimerRef.current = window.setTimeout(() => {
        void refetch({ silent: true })
      }, 150)
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') queueRefresh()
    }

    const channel = supabase
      .channel(`survey-details-${surveyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'survey',
          filter: `id=eq.${surveyId}`,
        },
        queueRefresh,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'survey_questions',
          filter: `survey_id=eq.${surveyId}`,
        },
        queueRefresh,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'survey_respondents',
          filter: `survey_id=eq.${surveyId}`,
        },
        queueRefresh,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'survey_responses',
          filter: `survey_id=eq.${surveyId}`,
        },
        queueRefresh,
      )
      .subscribe()

    window.addEventListener('focus', queueRefresh)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null
      }

      window.removeEventListener('focus', queueRefresh)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      void supabase.removeChannel(channel)
    }
  }, [refetch, surveyId])

  const effectiveStatus = useMemo<SurveyLifecycleStatus | null>(
    () => getEffectiveSurveyStatus(survey, statusNow),
    [statusNow, survey],
  )
  const questionnaireLocked =
    effectiveStatus !== null && effectiveStatus !== 'draft'

  const requireSurveyId = useCallback(() => {
    if (!surveyId || survey?.id !== surveyId) {
      throw new Error('Select a survey before continuing.')
    }

    return surveyId
  }, [survey?.id, surveyId])

  const requireEditableQuestionnaire = useCallback(() => {
    const selectedSurveyId = requireSurveyId()
    if (questionnaireLocked) {
      throw new Error(
        'The questionnaire cannot be changed after the survey is scheduled or opened.',
      )
    }

    return selectedSurveyId
  }, [questionnaireLocked, requireSurveyId])

  const updateSurvey = useCallback(
    async (updates: SurveyUpdate) => {
      const selectedSurveyId = requireSurveyId()
      const { error: updateError } = await supabase
        .from('survey')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', selectedSurveyId)

      if (updateError) throw updateError
      await refetch()
    },
    [refetch, requireSurveyId],
  )

  const addQuestion = useCallback(
    async (question: SurveyQuestionInput) => {
      const selectedSurveyId = requireEditableQuestionnaire()
      const nextOrder =
        questions.length > 0
          ? Math.max(...questions.map(({ order_num }) => order_num)) + 1
          : 0

      const { error: insertError } = await supabase
        .from('survey_questions')
        .insert({
          ...question,
          survey_id: selectedSurveyId,
          order_num: question.order_num ?? nextOrder,
        })

      if (insertError) throw insertError
      await refetch()
    },
    [questions, refetch, requireEditableQuestionnaire],
  )

  const updateQuestion = useCallback(
    async (questionId: string, updates: SurveyQuestionUpdate) => {
      const selectedSurveyId = requireEditableQuestionnaire()
      const { error: updateError } = await supabase
        .from('survey_questions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', questionId)
        .eq('survey_id', selectedSurveyId)

      if (updateError) throw updateError
      await refetch()
    },
    [refetch, requireEditableQuestionnaire],
  )

  const deleteQuestion = useCallback(
    async (questionId: string) => {
      const selectedSurveyId = requireEditableQuestionnaire()
      const { error: deleteError } = await supabase
        .from('survey_questions')
        .delete()
        .eq('id', questionId)
        .eq('survey_id', selectedSurveyId)

      if (deleteError) throw deleteError
      await refetch()
    },
    [refetch, requireEditableQuestionnaire],
  )

  const deleteAllQuestions = useCallback(async () => {
    const selectedSurveyId = requireEditableQuestionnaire()
    const { error: deleteError } = await supabase
      .from('survey_questions')
      .delete()
      .eq('survey_id', selectedSurveyId)

    if (deleteError) throw deleteError
    await refetch()
  }, [refetch, requireEditableQuestionnaire])

  const moveQuestion = useCallback(
    async (questionId: string, direction: QuestionMoveDirection) => {
      const selectedSurveyId = requireEditableQuestionnaire()
      const currentIndex = questions.findIndex(({ id }) => id === questionId)
      if (currentIndex < 0) return

      const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      if (swapIndex < 0 || swapIndex >= questions.length) return

      const currentQuestion = questions[currentIndex]
      const swapQuestion = questions[swapIndex]
      if (!currentQuestion || !swapQuestion) return

      const [currentResult, swapResult] = await Promise.all([
        supabase
          .from('survey_questions')
          .update({ order_num: swapQuestion.order_num })
          .eq('id', currentQuestion.id)
          .eq('survey_id', selectedSurveyId),
        supabase
          .from('survey_questions')
          .update({ order_num: currentQuestion.order_num })
          .eq('id', swapQuestion.id)
          .eq('survey_id', selectedSurveyId),
      ])

      if (currentResult.error) throw currentResult.error
      if (swapResult.error) throw swapResult.error
      await refetch()
    },
    [questions, refetch, requireEditableQuestionnaire],
  )

  const addRespondents = useCallback(
    async (rows: SurveyRespondentImportRow[]) => {
      const selectedSurveyId = requireSurveyId()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Your session has expired. Sign in again.')
      }

      const response = await fetch('/api/surveys/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ surveyId: selectedSurveyId, rows }),
      })
      const body: unknown = await response.json().catch(() => null)

      if (!response.ok) {
        const message =
          body &&
          typeof body === 'object' &&
          'error' in body &&
          typeof body.error === 'string'
            ? body.error
            : 'Survey invitations could not be sent.'
        throw new Error(message)
      }

      await refetch()
      return body
    },
    [refetch, requireSurveyId],
  )

  const listOrganisationUsers = useCallback(async () => {
    const selectedSurveyId = requireSurveyId()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('Your session has expired. Sign in again.')
    }

    const response = await fetch(
      `/api/surveys/respondent-users?surveyId=${encodeURIComponent(selectedSurveyId)}`,
      { headers: { Authorization: `Bearer ${session.access_token}` } },
    )
    const body: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const message = body && typeof body === 'object' && 'error' in body &&
        typeof body.error === 'string'
        ? body.error
        : 'Organisation users could not be loaded.'
      throw new Error(message)
    }

    if (!body || typeof body !== 'object' || !('users' in body) ||
      !Array.isArray(body.users)) return []
    return body.users as SurveyOrganisationUser[]
  }, [requireSurveyId])

  const addOrganisationUsers = useCallback(async (userIds: string[]) => {
    const selectedSurveyId = requireSurveyId()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('Your session has expired. Sign in again.')
    }

    const response = await fetch('/api/surveys/respondent-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ surveyId: selectedSurveyId, userIds }),
    })
    const body: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const message = body && typeof body === 'object' && 'error' in body &&
        typeof body.error === 'string'
        ? body.error
        : 'The selected users could not be added.'
      throw new Error(message)
    }

    await refetch()
    return body
  }, [refetch, requireSurveyId])

  const removeRespondent = useCallback(
    async (respondentId: string) => {
      const selectedSurveyId = requireSurveyId()
      const { error: responseDeleteError } = await supabase
        .from('survey_responses')
        .delete()
        .eq('respondent_id', respondentId)
        .eq('survey_id', selectedSurveyId)

      if (responseDeleteError) throw responseDeleteError

      const { error: respondentDeleteError } = await supabase
        .from('survey_respondents')
        .delete()
        .eq('id', respondentId)
        .eq('survey_id', selectedSurveyId)

      if (respondentDeleteError) throw respondentDeleteError
      await refetch()
    },
    [refetch, requireSurveyId],
  )

  const sendReminders = useCallback(async () => {
    const selectedSurveyId = requireSurveyId()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('Your session has expired. Sign in again.')
    }

    const response = await fetch('/api/surveys/reminders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ surveyId: selectedSurveyId }),
    })
    const body: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      const message =
        body &&
        typeof body === 'object' &&
        'error' in body &&
        typeof body.error === 'string'
          ? body.error
          : 'Survey reminders could not be sent.'
      throw new Error(message)
    }

    await refetch()
    return body
  }, [refetch, requireSurveyId])

  return {
    survey,
    questions,
    respondents,
    responses,
    effectiveStatus,
    questionnaireLocked,
    loading,
    error,
    refetch,
    updateSurvey,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    deleteAllQuestions,
    moveQuestion,
    addRespondents,
    listOrganisationUsers,
    addOrganisationUsers,
    removeRespondent,
    sendReminders,
  }
}
