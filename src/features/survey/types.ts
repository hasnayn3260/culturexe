import type { SurveyLifecycleStatus } from './utils/surveyStatus'

export type SurveyStoredStatus = 'draft' | 'live' | 'closed'
export type SurveyAssessmentType = 'culture' | 'pulse' | '360' | 'other'
export type SurveyManagementTab = 'list' | 'builder' | 'controls' | 'settings'
export type SurveySortDirection = 'asc' | 'desc'

export type SurveyOrganisationReference = {
  id: string
  name: string
  tradingName: string | null
  logoUrl: string | null
  status: 'active' | 'inactive' | 'onboarding'
}

export type SurveyListItem = {
  id: string
  organisationId: string
  organisation: SurveyOrganisationReference
  title: string
  description: string | null
  assessmentType: SurveyAssessmentType
  isFullCultureAssessment: boolean
  storedStatus: SurveyStoredStatus
  effectiveStatus: SurveyLifecycleStatus
  liveStart: string | null
  liveEnd: string | null
  createdAt: string
  updatedAt: string
  openLinkEnabled: boolean
  openLinkToken: string
  questionCount: number
  respondentCount: number
  startedCount: number
  completedCount: number
  completionRate: number
}

export type SurveyListFilters = {
  search: string
  organisationId: string | 'all'
  status: SurveyLifecycleStatus | 'all'
  runYear: number | 'all'
  runFrom: string
  runTo: string
}

export type SurveySortKey =
  | 'title'
  | 'organisation'
  | 'effectiveStatus'
  | 'liveStart'
  | 'liveEnd'
  | 'createdAt'
  | 'updatedAt'
  | 'questionCount'
  | 'respondentCount'
  | 'completedCount'
  | 'completionRate'

export type SurveySort = {
  key: SurveySortKey
  direction: SurveySortDirection
}

export type SurveyFormValues = {
  organisationId: string
  title: string
  description: string
  assessmentType: SurveyAssessmentType
  isFullCultureAssessment: boolean
  status: SurveyStoredStatus
  liveStart: string
  liveEnd: string
  openLinkEnabled: boolean
}

export type CreateSurveyInput = SurveyFormValues & {
  templateId?: string | null
}

export type UpdateSurveyInput = SurveyFormValues & {
  id: string
}

export type SurveyListStats = {
  total: number
  draft: number
  scheduled: number
  live: number
  closed: number
}

export type SurveyTemplateScope = 'global' | 'organisation'

export type SurveyTemplateSummary = {
  id: string
  organisationId: string | null
  scope: SurveyTemplateScope
  name: string
  description: string | null
  questionCount: number
  createdAt: string
  updatedAt: string
}

export const DEFAULT_SURVEY_LIST_FILTERS: SurveyListFilters = {
  search: '',
  organisationId: 'all',
  status: 'all',
  runYear: 'all',
  runFrom: '',
  runTo: '',
}

export const DEFAULT_SURVEY_SORT: SurveySort = {
  key: 'updatedAt',
  direction: 'desc',
}

export const SURVEY_MANAGEMENT_TABS: Array<{
  id: SurveyManagementTab
  label: string
  requiresSurvey: boolean
}> = [
  { id: 'list', label: 'Survey List', requiresSurvey: false },
  { id: 'builder', label: 'Survey Builder', requiresSurvey: true },
  { id: 'settings', label: 'Survey Settings', requiresSurvey: true },
  { id: 'controls', label: 'Survey Controls', requiresSurvey: true },
]
