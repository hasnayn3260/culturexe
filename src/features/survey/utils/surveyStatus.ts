export type SurveyLifecycleStatus = 'draft' | 'scheduled' | 'live' | 'closed'

type SurveyStatusInput = {
  status?: string | null
  live_start?: string | null
  live_end?: string | null
}

function timestamp(value?: string | null): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

export function getEffectiveSurveyStatus(
  survey?: SurveyStatusInput | null,
  now = Date.now(),
): SurveyLifecycleStatus | null {
  if (!survey) return null
  if (survey.status === 'closed') return 'closed'
  if (survey.status !== 'live') return 'draft'

  const opensAt = timestamp(survey.live_start)
  const closesAt = timestamp(survey.live_end)

  if (closesAt !== null && now >= closesAt) return 'closed'
  if (opensAt !== null && now < opensAt) return 'scheduled'
  return 'live'
}

export function isSurveyAcceptingResponses(
  survey?: SurveyStatusInput | null,
  now = Date.now(),
): boolean {
  return getEffectiveSurveyStatus(survey, now) === 'live'
}
