import { useState, useEffect, useCallback, useRef } from 'react'
import supabase from '../lib/supabaseClient'

export function useSurvey(orgId) {
  const [survey, setSurvey]           = useState(null)
  const [questions, setQuestions]     = useState([])
  const [respondents, setRespondents] = useState([])
  const [responses, setResponses]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const refreshTimerRef               = useRef(null)

  const refetch = useCallback(async ({ silent = false } = {}) => {
    if (!orgId) {
      setSurvey(null)
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
      const { data: sv, error: svErr } = await supabase
        .from('survey')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (svErr) throw svErr
      if (!sv) { setSurvey(null); setQuestions([]); setRespondents([]); setResponses([]); return }
      setSurvey(sv)

      const [qRes, rRes, respRes] = await Promise.all([
        supabase.from('survey_questions').select('*').eq('survey_id', sv.id).order('order_num'),
        supabase.from('survey_respondents').select('*').eq('survey_id', sv.id).order('invited_at', { ascending: false }),
        supabase.from('survey_responses').select('*').eq('survey_id', sv.id),
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
    if (!survey?.id) return undefined

    const surveyId = survey.id
    const queueRefresh = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = setTimeout(() => {
        void refetch({ silent: true })
      }, 150)
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') queueRefresh()
    }

    const channel = supabase
      .channel(`survey-participation-${surveyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'survey_responses', filter: `survey_id=eq.${surveyId}` },
        queueRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'survey_respondents', filter: `survey_id=eq.${surveyId}` },
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
  }, [survey?.id, refetch])

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
    const toInsert = rows.map(r => ({ ...r, survey_id: survey.id }))
    const { error: err } = await supabase
      .from('survey_respondents')
      .upsert(toInsert, { onConflict: 'survey_id,email' })
    if (err) throw err
    await refetch()
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
    const completedRespondentIds = new Set(responses.map(response => response.respondent_id))
    const pending = respondents.filter(r => !completedRespondentIds.has(r.id))
    if (!pending.length) return 0
    const { error: err } = await supabase
      .from('survey_respondents')
      .update({ reminded_at: new Date().toISOString() })
      .in('id', pending.map(r => r.id))
    if (err) throw err
    await refetch()
    return pending.length
  }

  return {
    survey, questions, respondents, responses, loading, error, refetch,
    updateSurvey, addQuestion, updateQuestion, deleteQuestion, deleteAllQuestions, moveQuestion,
    addRespondents, removeRespondent, sendReminders,
  }
}
