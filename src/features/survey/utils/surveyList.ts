import type {
  SurveyListFilters,
  SurveyListItem,
  SurveySort,
  SurveySortKey,
} from '../types'

const textCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})

const statusOrder: Record<SurveyListItem['effectiveStatus'], number> = {
  draft: 0,
  scheduled: 1,
  live: 2,
  closed: 3,
}

function normaliseSearchValue(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase()
}

function timestamp(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

function dateBoundary(value: string, endOfDay: boolean): number | null {
  if (!value) return null

  const parsed = Date.parse(
    `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`,
  )
  return Number.isNaN(parsed) ? null : parsed
}

function runInterval(survey: SurveyListItem): [number, number] {
  const createdAt = timestamp(survey.createdAt) ?? 0
  const start = timestamp(survey.liveStart)
  const end = timestamp(survey.liveEnd)
  const runStart = start ?? end ?? createdAt
  const runEnd = end ?? start ?? createdAt

  return runStart <= runEnd
    ? [runStart, runEnd]
    : [runEnd, runStart]
}

function overlaps(
  survey: SurveyListItem,
  rangeStart: number | null,
  rangeEnd: number | null,
): boolean {
  const [surveyStart, surveyEnd] = runInterval(survey)
  if (rangeStart !== null && surveyEnd < rangeStart) return false
  if (rangeEnd !== null && surveyStart > rangeEnd) return false
  return true
}

function matchesSearch(survey: SurveyListItem, search: string): boolean {
  const query = normaliseSearchValue(search)
  if (!query) return true

  const searchableValues = [
    survey.title,
    survey.description ?? '',
    survey.organisation.name,
    survey.organisation.tradingName ?? '',
  ]

  return searchableValues.some((value) =>
    normaliseSearchValue(value).includes(query),
  )
}

export function getSurveyRunDate(survey: SurveyListItem): string {
  return survey.liveStart ?? survey.liveEnd ?? survey.createdAt
}

export function getSurveyRunYears(surveys: SurveyListItem[]): number[] {
  const years = new Set<number>()

  surveys.forEach((survey) => {
    const [runStart, runEnd] = runInterval(survey)
    const firstYear = new Date(runStart).getUTCFullYear()
    const lastYear = new Date(runEnd).getUTCFullYear()

    for (let year = firstYear; year <= lastYear; year += 1) {
      years.add(year)
    }
  })

  return [...years].sort((first, second) => second - first)
}

export function filterSurveys(
  surveys: SurveyListItem[],
  filters: SurveyListFilters,
): SurveyListItem[] {
  const from = dateBoundary(filters.runFrom, false)
  const to = dateBoundary(filters.runTo, true)
  const yearStart =
    filters.runYear === 'all'
      ? null
      : Date.UTC(filters.runYear, 0, 1, 0, 0, 0, 0)
  const yearEnd =
    filters.runYear === 'all'
      ? null
      : Date.UTC(filters.runYear, 11, 31, 23, 59, 59, 999)

  return surveys.filter((survey) => {
    if (!matchesSearch(survey, filters.search)) return false
    if (
      filters.organisationId !== 'all' &&
      survey.organisationId !== filters.organisationId
    ) {
      return false
    }
    if (
      filters.status !== 'all' &&
      survey.effectiveStatus !== filters.status
    ) {
      return false
    }
    if (!overlaps(survey, yearStart, yearEnd)) return false
    if (!overlaps(survey, from, to)) return false
    return true
  })
}

function compareNullableDates(
  first: string | null,
  second: string | null,
  direction: SurveySort['direction'],
): number {
  const firstTime = timestamp(first)
  const secondTime = timestamp(second)

  // Missing dates stay at the bottom in either direction.
  if (firstTime === null && secondTime === null) return 0
  if (firstTime === null) return 1
  if (secondTime === null) return -1

  const comparison = firstTime - secondTime
  return direction === 'asc' ? comparison : -comparison
}

function compareByKey(
  first: SurveyListItem,
  second: SurveyListItem,
  key: SurveySortKey,
  direction: SurveySort['direction'],
): number {
  const multiplier = direction === 'asc' ? 1 : -1

  switch (key) {
    case 'title':
      return textCollator.compare(first.title, second.title) * multiplier
    case 'organisation':
      return (
        textCollator.compare(
          first.organisation.tradingName || first.organisation.name,
          second.organisation.tradingName || second.organisation.name,
        ) * multiplier
      )
    case 'effectiveStatus':
      return (
        (statusOrder[first.effectiveStatus] -
          statusOrder[second.effectiveStatus]) *
        multiplier
      )
    case 'liveStart':
      return compareNullableDates(first.liveStart, second.liveStart, direction)
    case 'liveEnd':
      return compareNullableDates(first.liveEnd, second.liveEnd, direction)
    case 'createdAt':
      return compareNullableDates(first.createdAt, second.createdAt, direction)
    case 'updatedAt':
      return compareNullableDates(first.updatedAt, second.updatedAt, direction)
    case 'questionCount':
    case 'respondentCount':
    case 'completedCount':
    case 'completionRate':
      return (first[key] - second[key]) * multiplier
  }
}

export function sortSurveys(
  surveys: SurveyListItem[],
  sort: SurveySort,
): SurveyListItem[] {
  return [...surveys].sort((first, second) => {
    const comparison = compareByKey(first, second, sort.key, sort.direction)
    if (comparison !== 0) return comparison

    const updatedComparison = compareNullableDates(
      first.updatedAt,
      second.updatedAt,
      'desc',
    )
    if (updatedComparison !== 0) return updatedComparison

    return textCollator.compare(first.id, second.id)
  })
}

export function filterAndSortSurveys(
  surveys: SurveyListItem[],
  filters: SurveyListFilters,
  sort: SurveySort,
): SurveyListItem[] {
  return sortSurveys(filterSurveys(surveys, filters), sort)
}
