import { useState, useEffect, useCallback, useRef } from 'react'
import supabase from '../lib/supabaseClient'

export function useSurvey(orgId) {
  const [survey, setSurvey]           = useState(null)
  const [surveys, setSurveys]         = useState([])
  const [questions, setQuestions]     = useState([])
  const [respondents, setRespondents] = useState([])
  const [responses, setResponses]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const refreshTimerRef               = useRef(null)

  const refetch = useCallback(async ({ silent = false } = {}) => {
    if (!orgId) {
      setSurvey(null)
      setSurveys([])
      setQuestions([])
      setRespondents([])
      setResponses([])
      setError(null)
      setLoading(false)
      return
    }

    if (!silent) setLoading(true)
    setError(null)
    try {
      let surveyQuery = supabase
        .from('survey')
        .select('*')
        .order('created_at', { ascending: false })

      if (orgId !== 'all') {
        surveyQuery = surveyQuery.eq('org_id', orgId).limit(1)
      }

      const { data: surveyRows, error: svErr } = await surveyQuery
      if (svErr) throw svErr

      const availableSurveys = surveyRows || []
      const scopedSurveys = orgId === 'all'
        ? availableSurveys.filter((candidate, index, rows) =>
            rows.findIndex(row => row.org_id === candidate.org_id) === index,
          )
        : availableSurveys

      if (!scopedSurveys.length) {
        setSurvey(null)
        setSurveys([])
        setQuestions([])
        setRespondents([])
        setResponses([])
        return
      }

      setSurvey(scopedSurveys[0])
      setSurveys(scopedSurveys)
      const surveyIds = scopedSurveys.map(item => item.id)

      const scopeQuery = (query) => surveyIds.length === 1
        ? query.eq('survey_id', surveyIds[0])
        : query.in('survey_id', surveyIds)

      const [qRes, rRes, respRes] = await Promise.all([
        scopeQuery(supabase.from('survey_questions').select('*')).order('order_num'),
        scopeQuery(supabase.from('survey_respondents').select('*')).order('invited_at', { ascending: false }),
        scopeQuery(supabase.from('survey_responses').select('*')),
      ])

      if (qRes.error) throw qRes.error
      if (rRes.error) throw rRes.error
      if (respRes.error) throw respRes.error

      setQuestions(qRes.data || [])
      setRespondents(rRes.data || [])
      setResponses(respRes.data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { refetch() }, [refetch])

  useEffect(() => {
    if (!surveys.length) return undefined

    const surveyIds = surveys.map(item => item.id)
    const queueRefresh = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = setTimeout(() => {
        void refetch({ silent: true })
      }, 150)
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') queueRefresh()
    }

    const responseSubscription = {
      event: '*', schema: 'public', table: 'survey_responses',
      ...(surveyIds.length === 1 ? { filter: `survey_id=eq.${surveyIds[0]}` } : {}),
    }
    const respondentSubscription = {
      event: '*', schema: 'public', table: 'survey_respondents',
      ...(surveyIds.length === 1 ? { filter: `survey_id=eq.${surveyIds[0]}` } : {}),
    }
    const channel = supabase
      .channel(`survey-participation-${orgId}`)
      .on(
        'postgres_changes',
        responseSubscription,
        queueRefresh,
      )
      .on(
        'postgres_changes',
        respondentSubscription,
        queueRefresh,
      )
      .subscribe()

    window.addEventListener('focus', queueRefresh)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
      window.removeEventListener('focus', queueRefresh)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      void supabase.removeChannel(channel)
    }
  }, [orgId, refetch, surveys])

  async function updateSurvey(updates) {
    const { error: err } = await supabase
      .from('survey')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', survey.id)
    if (err) throw err
    await refetch()
  }

  async function addQuestion(q) {
    const maxOrder = questions.length > 0 ? Math.max(...questions.map(x => x.order_num)) + 1 : 0
    const { error: err } = await supabase
      .from('survey_questions')
      .insert({ ...q, survey_id: survey.id, order_num: q.order_num ?? maxOrder })
    if (err) throw err
    await refetch()
  }

  async function updateQuestion(id, updates) {
    const { error: err } = await supabase
      .from('survey_questions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (err) throw err
    await refetch()
  }

  async function deleteQuestion(id) {
    const { error: err } = await supabase
      .from('survey_questions')
      .delete()
      .eq('id', id)
    if (err) throw err
    await refetch()
  }

  async function deleteAllQuestions() {
    const { error: err } = await supabase
      .from('survey_questions')
      .delete()
      .eq('survey_id', survey.id)
    if (err) throw err
    await refetch()
  }

  async function moveQuestion(id, direction) {
    const idx = questions.findIndex(q => q.id === id)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= questions.length) return
    const a = questions[idx]
    const b = questions[swapIdx]
    await Promise.all([
      supabase.from('survey_questions').update({ order_num: b.order_num }).eq('id', a.id),
      supabase.from('survey_questions').update({ order_num: a.order_num }).eq('id', b.id),
    ])
    await refetch()
  }

  async function addRespondents(rows) {
    if (!survey?.id) throw new Error('Select a survey before inviting respondents.')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Your session has expired. Sign in again.')

    const response = await fetch('/api/surveys/invitations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ surveyId: survey.id, rows }),
    })
    const body = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(body?.error || 'Survey invitations could not be sent.')
    }

    await refetch()
    return body
  }

  async function removeRespondent(id) {
    // Remove any submitted responses first so completed/test entries can be
    // deleted cleanly (and aren't left orphaned if there's no FK cascade).
    const { error: respErr } = await supabase
      .from('survey_responses')
      .delete()
      .eq('respondent_id', id)
    if (respErr) throw respErr
    const { error: err } = await supabase
      .from('survey_respondents')
      .delete()
      .eq('id', id)
    if (err) throw err
    await refetch()
  }

  async function sendReminders() {
    if (!survey?.id) throw new Error('Select a survey before sending reminders.')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Your session has expired. Sign in again.')

    const response = await fetch('/api/surveys/reminders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ surveyId: survey.id }),
    })
    const body = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(body?.error || 'Survey reminders could not be sent.')
    }

    await refetch()
    return body
  }

  return {
    survey, surveys, questions, respondents, responses, loading, error, refetch,
    updateSurvey, addQuestion, updateQuestion, deleteQuestion, deleteAllQuestions, moveQuestion,
    addRespondents, removeRespondent, sendReminders,
  }
}
