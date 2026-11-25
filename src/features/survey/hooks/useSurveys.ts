import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import supabase from '@/lib/supabaseClient'

import type {
  SurveyListItem,
  SurveyListStats,
  SurveyOrganisationReference,
  SurveyStoredStatus,
} from '../types'
import { getEffectiveSurveyStatus } from '../utils/surveyStatus'
import { useSurveyStatusClock } from './useSurveyStatusClock'

type SurveyRow = {
  id: string
  org_id: string
  title: string
  description: string | null
  status: string
  live_start: string | null
  live_end: string | null
  created_at: string | null
  updated_at: string | null
  open_link_enabled: boolean
  open_link_token: string
}

type OrganisationRow = {
  id: string
  name: string
  trading_name: string | null
  logo_path: string | null
  status: SurveyOrganisationReference['status'] | null
}

type QuestionReference = {
  survey_id: string
}

type RespondentReference = {
  id: string
  survey_id: string
  started_at: string | null
  draft_saved_at: string | null
  submitted_at: string | null
}

type ResponseReference = {
  survey_id: string
  respondent_id: string
}

const PAGE_SIZE = 1_000

function messageFrom(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The survey list could not be loaded.'
}

function increment(map: Map<string, number>, id: string): void {
  map.set(id, (map.get(id) || 0) + 1)
}

function normalStoredStatus(status: string): SurveyStoredStatus {
  if (status === 'closed') return 'closed'
  if (status === 'live') return 'live'
  return 'draft'
}

function publicLogoUrl(path: string | null): string | null {
  if (!path) return null
  return supabase.storage.from('Company Logos').getPublicUrl(path).data.publicUrl
}

async function pagedSurveyRows<T>(
  table: 'survey_questions' | 'survey_respondents' | 'survey_responses',
  columns: string,
  surveyIds: string[],
): Promise<T[]> {
  if (surveyIds.length === 0) return []

  const records: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .in('survey_id', surveyIds)
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error
    const page = (data || []) as T[]
    records.push(...page)
    if (page.length < PAGE_SIZE) break
  }

  return records
}

function emptyStats(): SurveyListStats {
  return { total: 0, draft: 0, scheduled: 0, live: 0, closed: 0 }
}

export function useSurveys(organisationId?: string | null) {
  const statusNow = useSurveyStatusClock()
  const [surveys, setSurveys] = useState<SurveyListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestSequence = useRef(0)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refetch = useCallback(async ({ silent = false } = {}) => {
    const requestId = ++requestSequence.current
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      let surveyQuery = supabase
        .from('survey')
        .select(
          'id, org_id, title, description, status, live_start, live_end, created_at, updated_at, open_link_enabled, open_link_token',
        )
        .order('updated_at', { ascending: false })

      if (organisationId) surveyQuery = surveyQuery.eq('org_id', organisationId)

      const { data: surveyData, error: surveyError } = await surveyQuery
      if (surveyError) throw surveyError

      const surveyRows = (surveyData || []) as SurveyRow[]
      const surveyIds = surveyRows.map((survey) => survey.id)
      const organisationIds = [
        ...new Set(surveyRows.map((survey) => survey.org_id)),
      ]

      const organisationPromise = organisationIds.length === 0
        ? Promise.resolve({ data: [], error: null })
        : supabase
          .from('organisations')
          .select('id, name, trading_name, logo_path, status')
          .in('id', organisationIds)

      const [
        organisationResult,
        questions,
        respondents,
        responses,
      ] = await Promise.all([
        organisationPromise,
        pagedSurveyRows<QuestionReference>(
          'survey_questions',
          'survey_id',
          surveyIds,
        ),
        pagedSurveyRows<RespondentReference>(
          'survey_respondents',
          'id, survey_id, started_at, draft_saved_at, submitted_at',
          surveyIds,
        ),
        pagedSurveyRows<ResponseReference>(
          'survey_responses',
          'survey_id, respondent_id',
          surveyIds,
        ),
      ])

      if (organisationResult.error) throw organisationResult.error

      const organisations = new Map(
        ((organisationResult.data || []) as OrganisationRow[]).map((row) => [
          row.id,
          {
            id: row.id,
            name: row.name,
            tradingName: row.trading_name,
            logoUrl: publicLogoUrl(row.logo_path),
            status: row.status || 'inactive',
          } satisfies SurveyOrganisationReference,
        ]),
      )
      const questionCounts = new Map<string, number>()
      const respondentCounts = new Map<string, number>()
      const startedCounts = new Map<string, number>()
      const completedRespondents = new Map<string, Set<string>>()

      questions.forEach((question) => increment(questionCounts, question.survey_id))
      responses.forEach((response) => {
        const completed = completedRespondents.get(response.survey_id) || new Set()
        completed.add(response.respondent_id)
        completedRespondents.set(response.survey_id, completed)
      })
      respondents.forEach((respondent) => {
        increment(respondentCounts, respondent.survey_id)
        const completed = completedRespondents
          .get(respondent.survey_id)
          ?.has(respondent.id)
        if (
          completed ||
          respondent.started_at ||
          respondent.draft_saved_at ||
          respondent.submitted_at
        ) {
          increment(startedCounts, respondent.survey_id)
        }
      })

      const mapped = surveyRows.flatMap((survey): SurveyListItem[] => {
        const organisation = organisations.get(survey.org_id)
        if (!organisation) return []

        const respondentCount = respondentCounts.get(survey.id) || 0
        const completedCount = completedRespondents.get(survey.id)?.size || 0
        const effectiveStatus = getEffectiveSurveyStatus(survey) || 'draft'

        return [{
          id: survey.id,
          organisationId: survey.org_id,
          organisation,
          title: survey.title,
          description: survey.description,
          storedStatus: normalStoredStatus(survey.status),
          effectiveStatus,
          liveStart: survey.live_start,
          liveEnd: survey.live_end,
          createdAt: survey.created_at || new Date(0).toISOString(),
          updatedAt: survey.updated_at || survey.created_at || new Date(0).toISOString(),
          openLinkEnabled: survey.open_link_enabled,
          openLinkToken: survey.open_link_token,
          questionCount: questionCounts.get(survey.id) || 0,
          respondentCount,
          startedCount: startedCounts.get(survey.id) || 0,
          completedCount,
          completionRate: respondentCount > 0
            ? Math.round((completedCount / respondentCount) * 100)
            : 0,
        }]
      })

      if (requestId === requestSequence.current) setSurveys(mapped)
    } catch (requestError) {
      if (requestId === requestSequence.current) {
        setError(messageFrom(requestError))
      }
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [organisationId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  useEffect(() => {
    const queueRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      refreshTimer.current = setTimeout(() => {
        void refetch({ silent: true })
      }, 200)
    }

    const surveyFilter = organisationId
      ? { event: '*' as const, schema: 'public', table: 'survey', filter: `org_id=eq.${organisationId}` }
      : { event: '*' as const, schema: 'public', table: 'survey' }
    const channel = supabase
      .channel(`survey-list-${organisationId || 'all'}`)
      .on('postgres_changes', surveyFilter, queueRefresh)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'survey_questions' },
        queueRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'survey_respondents' },
        queueRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'survey_responses' },
        queueRefresh,
      )
      .subscribe()

    return () => {
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current)
        refreshTimer.current = null
      }
      void supabase.removeChannel(channel)
    }
  }, [organisationId, refetch])

  const currentSurveys = useMemo(() => surveys.map((survey) => ({
    ...survey,
    effectiveStatus: getEffectiveSurveyStatus(
      {
        status: survey.storedStatus,
        live_start: survey.liveStart,
        live_end: survey.liveEnd,
      },
      statusNow,
    ) || 'draft',
  })), [statusNow, surveys])

  const stats = useMemo(() => {
    return currentSurveys.reduce<SurveyListStats>((totals, survey) => {
      totals.total += 1
      totals[survey.effectiveStatus] += 1
      return totals
    }, emptyStats())
  }, [currentSurveys])

  return {
    surveys: currentSurveys,
    stats,
    loading,
    refreshing,
    error,
    refetch,
  }
}
