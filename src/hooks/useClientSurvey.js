import { useState, useEffect, useCallback } from 'react'
import supabase from '../lib/supabaseClient'

function calcTiming(submittedAt, liveStart, liveEnd) {
  const sub = new Date(submittedAt).getTime()
  if (liveEnd && sub > new Date(liveEnd).getTime()) return 'late'
  if (liveStart && liveEnd) {
    const mid = new Date(liveStart).getTime() + (new Date(liveEnd).getTime() - new Date(liveStart).getTime()) / 2
    return sub < mid ? 'early' : 'on_time'
  }
  return 'on_time'
}

export function useClientSurvey(userEmail, userId) {
  const [survey,           setSurvey]           = useState(null)
  const [questions,        setQuestions]        = useState([])
  const [respondent,       setRespondent]       = useState(null)
  const [existingResponse, setExistingResponse] = useState(null)
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState(null)

  const load = useCallback(async () => {
    if (!userEmail) return
    setLoading(true)
    setError(null)
    try {
      const { data: sv, error: svErr } = await supabase
        .from('survey').select('*').limit(1).maybeSingle()
      if (svErr) throw svErr
      setSurvey(sv)
      if (!sv) { setLoading(false); return }

      const { data: qs } = await supabase
        .from('survey_questions').select('*')
        .eq('survey_id', sv.id).order('order_num')
      setQuestions(qs || [])

      let { data: resp } = await supabase
        .from('survey_respondents').select('*')
        .eq('survey_id', sv.id).eq('email', userEmail).maybeSingle()

      if (!resp) {
        const { data: created, error: createErr } = await supabase
          .from('survey_respondents')
          .insert({ survey_id: sv.id, email: userEmail, user_id: userId || null })
          .select()
          .single()
        if (createErr) console.warn('survey_respondents insert:', createErr.message)
        resp = created
      } else {
        if (userId && !resp.user_id) {
          await supabase.from('survey_respondents')
            .update({ user_id: userId }).eq('id', resp.id)
        }
        const { data: existing } = await supabase
          .from('survey_responses').select('*')
          .eq('respondent_id', resp.id).maybeSingle()
        setExistingResponse(existing)
      }

      setRespondent(resp)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [userEmail, userId])

  useEffect(() => { load() }, [load])

  async function saveDraft(answers) {
    if (!respondent) return
    const { data, error } = await supabase
      .from('survey_respondents')
      .update({ draft_answers: answers, draft_saved_at: new Date().toISOString() })
      .eq('id', respondent.id).select().single()
    if (error) throw error
    setRespondent(data)
  }

  async function submitResponse(answers) {
    if (!respondent || !survey) throw new Error('Unable to save your response — please refresh the page and try again.')
    const now = new Date().toISOString()
    const timing = calcTiming(now, survey.live_start, survey.live_end)

    const { data: resp, error: rErr } = await supabase
      .from('survey_responses')
      .upsert(
        { survey_id: survey.id, respondent_id: respondent.id, answers, submitted_at: now },
        { onConflict: 'respondent_id' }
      ).select().single()
    if (rErr) throw rErr
    setExistingResponse(resp)

    const { data: updResp, error: uErr } = await supabase
      .from('survey_respondents')
      .update({ used: true, submitted_at: now, response_timing: timing, draft_answers: null, draft_saved_at: null })
      .eq('id', respondent.id).select().single()
    if (uErr) throw uErr
    setRespondent(updResp)
  }

  async function updateRespondentProfile(updates) {
    if (!respondent) return
    const { data, error } = await supabase
      .from('survey_respondents').update(updates)
      .eq('id', respondent.id).select().single()
    if (error) throw error
    setRespondent(data)
    return data
  }

  return {
    survey, questions, respondent, existingResponse,
    loading, error,
    saveDraft, submitResponse, updateRespondentProfile,
    refetch: load,
  }
}
