import { useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  SURVEY_MANAGEMENT_TABS,
  type SurveyManagementTab,
} from '../types'

const SURVEY_ID_PARAMETER = 'surveyId'
const SURVEY_TAB_PARAMETER = 'surveyTab'

const validTabs = new Set<SurveyManagementTab>(
  SURVEY_MANAGEMENT_TABS.map(({ id }) => id),
)
const surveyRequiredTabs = new Set<SurveyManagementTab>(
  SURVEY_MANAGEMENT_TABS.filter(({ requiresSurvey }) => requiresSurvey).map(
    ({ id }) => id,
  ),
)

type NavigationOptions = {
  replace?: boolean
}

type SurveyManagementStateOptions = {
  availableSurveyIds?: readonly string[]
  surveysLoaded?: boolean
}

function parseTab(value: string | null): SurveyManagementTab {
  return value && validTabs.has(value as SurveyManagementTab)
    ? (value as SurveyManagementTab)
    : 'list'
}

function normaliseSurveyId(value: string | null): string | null {
  const normalised = value?.trim()
  return normalised || null
}

export function useSurveyManagementState({
  availableSurveyIds = [],
  surveysLoaded = false,
}: SurveyManagementStateOptions = {}) {
  const [searchParams, setSearchParams] = useSearchParams()

  const requestedSurveyId = normaliseSurveyId(
    searchParams.get(SURVEY_ID_PARAMETER),
  )
  const requestedTabValue = searchParams.get(SURVEY_TAB_PARAMETER)
  const requestedTab = parseTab(requestedTabValue)

  const availableSurveyIdSet = useMemo(
    () => new Set(availableSurveyIds),
    [availableSurveyIds],
  )
  const selectionExists =
    !requestedSurveyId ||
    !surveysLoaded ||
    availableSurveyIdSet.has(requestedSurveyId)
  const selectedSurveyId = selectionExists ? requestedSurveyId : null
  const activeTab =
    selectedSurveyId || !surveyRequiredTabs.has(requestedTab)
      ? requestedTab
      : 'list'

  const updateParameters = useCallback(
    (
      update: (parameters: URLSearchParams) => void,
      { replace = false }: NavigationOptions = {},
    ) => {
      setSearchParams(
        (currentParameters) => {
          const nextParameters = new URLSearchParams(currentParameters)
          update(nextParameters)
          return nextParameters
        },
        { replace },
      )
    },
    [setSearchParams],
  )

  // Repair stale or manually edited URLs without ever choosing a survey on the
  // user's behalf. Other query parameters are deliberately preserved.
  useEffect(() => {
    const invalidTab =
      requestedTabValue !== null && !validTabs.has(requestedTabValue as SurveyManagementTab)
    const missingSurvey = Boolean(requestedSurveyId && !selectionExists)
    const protectedTabWithoutSurvey =
      !selectedSurveyId && surveyRequiredTabs.has(requestedTab)

    if (!invalidTab && !missingSurvey && !protectedTabWithoutSurvey) return

    updateParameters(
      (parameters) => {
        if (missingSurvey) parameters.delete(SURVEY_ID_PARAMETER)
        if (invalidTab || protectedTabWithoutSurvey || missingSurvey) {
          parameters.set(SURVEY_TAB_PARAMETER, 'list')
        }
      },
      { replace: true },
    )
  }, [
    requestedSurveyId,
    requestedTab,
    requestedTabValue,
    selectedSurveyId,
    selectionExists,
    updateParameters,
  ])

  const selectSurvey = useCallback(
    (
      surveyId: string,
      destination: Exclude<SurveyManagementTab, 'list'> = 'builder',
      options?: NavigationOptions,
    ) => {
      const normalisedId = normaliseSurveyId(surveyId)
      if (!normalisedId) throw new Error('A survey must be selected.')

      updateParameters((parameters) => {
        parameters.set(SURVEY_ID_PARAMETER, normalisedId)
        parameters.set(SURVEY_TAB_PARAMETER, destination)
      }, options)
    },
    [updateParameters],
  )

  const openTab = useCallback(
    (tab: SurveyManagementTab, options?: NavigationOptions): boolean => {
      if (surveyRequiredTabs.has(tab) && !selectedSurveyId) return false

      updateParameters((parameters) => {
        parameters.set(SURVEY_TAB_PARAMETER, tab)
      }, options)
      return true
    },
    [selectedSurveyId, updateParameters],
  )

  const showSurveyList = useCallback(
    (options?: NavigationOptions) => openTab('list', options),
    [openTab],
  )

  const clearSelection = useCallback(
    (options?: NavigationOptions) => {
      updateParameters((parameters) => {
        parameters.delete(SURVEY_ID_PARAMETER)
        parameters.set(SURVEY_TAB_PARAMETER, 'list')
      }, options)
    },
    [updateParameters],
  )

  const isTabEnabled = useCallback(
    (tab: SurveyManagementTab) =>
      !surveyRequiredTabs.has(tab) || Boolean(selectedSurveyId),
    [selectedSurveyId],
  )

  return {
    selectedSurveyId,
    activeTab,
    hasSelection: Boolean(selectedSurveyId),
    invalidSelectedSurveyId:
      requestedSurveyId && !selectionExists ? requestedSurveyId : null,
    tabs: SURVEY_MANAGEMENT_TABS,
    selectSurvey,
    openTab,
    showSurveyList,
    clearSelection,
    isTabEnabled,
  }
}
