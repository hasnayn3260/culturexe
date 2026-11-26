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

export function useClientSurvey(userEmail, userId, orgId, selectedSurveyId) {
  const accessIdRef = useRef(createSurveyAccessId())
  const [survey,           setSurvey]           = useState(null)
  const [questions,        setQuestions]        = useState([])
  const [respondent,       setRespondent]       = useState(null)
  const [existingResponse, setExistingResponse] = useState(null)
  const [availableSurveys, setAvailableSurveys] = useState([])
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState(null)

  const load = useCallback(async () => {
    if (!userEmail || !orgId) {
      setSurvey(null)
      setQuestions([])
      setRespondent(null)
      setExistingResponse(null)
      setAvailableSurveys([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setQuestions([])
    setRespondent(null)
    setExistingResponse(null)
    try {
      const assignmentQueries = []
      if (userId) {
        assignmentQueries.push(
          supabase.from('survey_respondents').select('*').eq('user_id', userId),
        )
      }
      if (userEmail) {
        assignmentQueries.push(
          supabase.from('survey_respondents').select('*').ilike('email', userEmail),
        )
      }

      const assignmentResults = await Promise.all(assignmentQueries)
      const assignmentBySurvey = new Map()
      for (const result of assignmentResults) {
        if (result.error) throw result.error
        for (const assignment of result.data || []) {
          const current = assignmentBySurvey.get(assignment.survey_id)
          if (!current || assignment.user_id === userId) {
            assignmentBySurvey.set(assignment.survey_id, assignment)
          }
        }
      }

      const assignedSurveyIds = [...assignmentBySurvey.keys()]
      if (assignedSurveyIds.length === 0) {
        setAvailableSurveys([])
        setSurvey(null)
        return
      }

      const { data: surveyRows, error: svErr } = await supabase
        .from('survey')
        .select('*')
        .eq('org_id', orgId)
        .in('id', assignedSurveyIds)
        .order('created_at', { ascending: false })
      if (svErr) throw svErr

      const accessibleSurveys = (surveyRows || []).map((item) => ({
        ...item,
        clientRespondent: assignmentBySurvey.get(item.id),
      }))
      setAvailableSurveys(accessibleSurveys)
      const sv = accessibleSurveys.find(({ id }) => id === selectedSurveyId) ||
        accessibleSurveys.find((item) =>
          isSurveyAcceptingResponses(item) && !item.clientRespondent?.submitted_at) ||
        accessibleSurveys[0] || null
      setSurvey(sv)
      if (!sv) return

      let resp = assignmentBySurvey.get(sv.id)
      const [questionsResult, responseResult] = await Promise.all([
        supabase
          .from('survey_questions')
          .select('*')
          .eq('survey_id', sv.id)
          .order('order_num'),
        supabase
          .from('survey_responses')
          .select('*')
          .eq('respondent_id', resp.id)
          .maybeSingle(),
      ])
      if (questionsResult.error) throw questionsResult.error
      if (responseResult.error) throw responseResult.error
      setQuestions(questionsResult.data || [])
      setExistingResponse(responseResult.data)

      if (userId && !resp.user_id) {
        const { data: linkedRespondent, error: linkError } = await supabase
          .from('survey_respondents')
          .update({ user_id: userId })
          .eq('id', resp.id)
          .select()
          .single()
        if (linkError) throw linkError
        resp = linkedRespondent
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
  }, [userEmail, userId, orgId, selectedSurveyId])

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
    survey, availableSurveys, questions, respondent, existingResponse,
    loading, error,
    saveDraft, markStarted, submitResponse, updateRespondentProfile,
    refetch: load,
  }
}
