import { useState, useEffect, useCallback, useRef } from 'react'
import supabase from '../lib/supabaseClient'
import { isSurveyAcceptingResponses } from '../features/survey/utils/surveyStatus'
import { createSurveyAccessId } from '../features/survey/utils/surveyAccess'

function calcTiming(submittedAt, liveStart, liveEnd) {
  const sub = new Date(submittedAt).getTime()
  if (liveEnd && sub > new Date(liveEnd).getTime()) return 'late'
  if (liveStart && liveEnd) {
    const mid = new Date(liveStart).getTime() + (new Date(liveEnd).getTime() - new Date(liveStart).getTime()) / 2
    return sub < mid ? 'early' : 'on_time'
  }
  return 'on_time'
}

export function useClientSurvey(userEmail, userId, orgId) {
  const accessIdRef = useRef(createSurveyAccessId())
  const [survey,           setSurvey]           = useState(null)
  const [questions,        setQuestions]        = useState([])
  const [respondent,       setRespondent]       = useState(null)
  const [existingResponse, setExistingResponse] = useState(null)
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState(null)

  const load = useCallback(async () => {
    if (!userEmail || !orgId) {
      setSurvey(null)
      setQuestions([])
      setRespondent(null)
      setExistingResponse(null)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
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

      if (resp?.token) {
        const { data: accessRows, error: accessError } = await supabase.rpc(
          'record_survey_access',
          {
            p_token: resp.token,
            p_access_id: accessIdRef.current,
          },
        )
        if (accessError) {
          console.warn('survey access tracking:', accessError.message)
        } else if (accessRows?.[0]) {
          resp = { ...resp, ...accessRows[0] }
        }
      }

      setRespondent(resp)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [userEmail, userId, orgId])

  useEffect(() => { load() }, [load])

  async function saveDraft(answers) {
    if (!respondent?.token) return
    const { data, error } = await supabase.rpc('save_survey_draft', {
      p_token: respondent.token,
      p_answers: answers,
    })
    if (error) throw error
    const savedDraft = data?.[0]
    if (!savedDraft) return
    setRespondent(current => current ? {
      ...current,
      started_at: savedDraft.started_at,
      draft_saved_at: savedDraft.draft_saved_at,
      draft_answers: answers,
    } : current)
  }

  const markStarted = useCallback(async () => {
    if (!respondent?.token || respondent.started_at || existingResponse) return
    const { data, error: startError } = await supabase.rpc('start_survey_response', {
      p_token: respondent.token,
    })
    if (startError) throw startError
    const started = data?.[0]
    if (!started) return
    setRespondent(current => current ? {
      ...current,
      started_at: started.started_at,
    } : current)
  }, [existingResponse, respondent?.started_at, respondent?.token])

  async function submitResponse(answers) {
    if (!respondent || !survey) throw new Error('Unable to save your response — please refresh the page and try again.')
    if (!isSurveyAcceptingResponses(survey)) {
      throw new Error('This survey is closed and is no longer accepting responses.')
    }
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
    saveDraft, markStarted, submitResponse, updateRespondentProfile,
    refetch: load,
  }
}
