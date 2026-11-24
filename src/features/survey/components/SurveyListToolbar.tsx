import { useMemo } from 'react'
import {
  CalendarDays,
  Filter,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import {
  DEFAULT_SURVEY_LIST_FILTERS,
  type SurveyListFilters,
  type SurveyListItem,
  type SurveyOrganisationReference,
} from '../types'
import { getSurveyRunYears } from '../utils/surveyList'

type SurveyListToolbarProps = {
  filters: SurveyListFilters
  surveys: SurveyListItem[]
  refreshing?: boolean
  onFiltersChange: (filters: SurveyListFilters) => void
  onRefresh: () => void
  onCreateSurvey: () => void
}

const selectClassName =
  'h-9 min-w-0 rounded-[9px] border border-[#DCE4EE] bg-white px-3 text-[13px] text-[#314966] outline-none transition focus:border-[#1BBFB0] focus:ring-3 focus:ring-[#1BBFB0]/20'

function surveyOrganisations(
  surveys: SurveyListItem[],
): SurveyOrganisationReference[] {
  const organisations = new Map<string, SurveyOrganisationReference>()
  surveys.forEach((survey) => {
    organisations.set(survey.organisation.id, survey.organisation)
  })

  return [...organisations.values()].sort((first, second) =>
    (first.tradingName || first.name).localeCompare(
      second.tradingName || second.name,
      undefined,
      { sensitivity: 'base' },
    ),
  )
}

export default function SurveyListToolbar({
  filters,
  surveys,
  refreshing = false,
  onFiltersChange,
  onRefresh,
  onCreateSurvey,
}: SurveyListToolbarProps) {
  const organisations = useMemo(
    () => surveyOrganisations(surveys),
    [surveys],
  )
  const runYears = useMemo(() => getSurveyRunYears(surveys), [surveys])

  const hasFilters =
    filters.search !== DEFAULT_SURVEY_LIST_FILTERS.search ||
    filters.organisationId !==
      DEFAULT_SURVEY_LIST_FILTERS.organisationId ||
    filters.status !== DEFAULT_SURVEY_LIST_FILTERS.status ||
    filters.runYear !== DEFAULT_SURVEY_LIST_FILTERS.runYear ||
    filters.runFrom !== DEFAULT_SURVEY_LIST_FILTERS.runFrom ||
    filters.runTo !== DEFAULT_SURVEY_LIST_FILTERS.runTo

  function update<Key extends keyof SurveyListFilters>(
    key: Key,
    value: SurveyListFilters[Key],
  ) {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="rounded-2xl border border-[#DFE6EE] bg-white p-4 shadow-[0_8px_24px_rgba(13,31,60,0.04)]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full xl:max-w-[430px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8A9BB0]" />
          <Input
            type="search"
            value={filters.search}
            onChange={(event) => update('search', event.target.value)}
            placeholder="Search surveys or organisations"
            aria-label="Search surveys"
            className="h-9 rounded-[9px] border-[#DCE4EE] bg-[#FAFBFD] pr-3 pl-9 text-[13px] text-[#0D1F3C] placeholder:text-[#9AA9BC] focus-visible:border-[#1BBFB0] focus-visible:ring-[#1BBFB0]/20"
          />
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh surveys"
            className="h-9 border-[#DCE4EE] bg-white px-3 text-[#526A88] hover:bg-[#F4F8FA] hover:text-[#0D1F3C]"
          >
            <RefreshCw className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={onCreateSurvey}
            className="h-9 bg-[#1BBFB0] px-4 font-bold text-white hover:bg-[#16A99C]"
          >
            <Plus />
            Create survey
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-[#EDF1F5] pt-3">
        <div className="mr-1 flex h-9 items-center gap-1.5 text-xs font-semibold text-[#7C8EA5]">
          <Filter className="size-3.5" />
          Filters
        </div>

        <select
          value={filters.organisationId}
          onChange={(event) => update('organisationId', event.target.value)}
          aria-label="Filter surveys by organisation"
          className={`${selectClassName} w-[200px]`}
        >
          <option value="all">All organisations</option>
          {organisations.map((organisation) => (
            <option key={organisation.id} value={organisation.id}>
              {organisation.tradingName || organisation.name}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(event) =>
            update(
              'status',
              event.target.value as SurveyListFilters['status'],
            )}
          aria-label="Filter surveys by lifecycle status"
          className={`${selectClassName} w-[145px]`}
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="live">Live</option>
          <option value="closed">Closed</option>
        </select>

        <select
          value={filters.runYear}
          onChange={(event) =>
            update(
              'runYear',
              event.target.value === 'all'
                ? 'all'
                : Number(event.target.value),
            )}
          aria-label="Filter surveys by run year"
          className={`${selectClassName} w-[130px]`}
        >
          <option value="all">All years</option>
          {runYears.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        <label className="min-w-[145px] flex-1 sm:max-w-[180px]">
          <span className="mb-1 flex items-center gap-1 text-[10px] font-bold tracking-[0.08em] text-[#8A9BB0] uppercase">
            <CalendarDays className="size-3" />
            Run from
          </span>
          <Input
            type="date"
            value={filters.runFrom}
            max={filters.runTo || undefined}
            onChange={(event) => update('runFrom', event.target.value)}
            aria-label="Filter surveys running from date"
            className="h-9 rounded-[9px] border-[#DCE4EE] bg-white px-3 text-[13px] text-[#314966] focus-visible:border-[#1BBFB0] focus-visible:ring-[#1BBFB0]/20"
          />
        </label>

        <label className="min-w-[145px] flex-1 sm:max-w-[180px]">
          <span className="mb-1 flex items-center gap-1 text-[10px] font-bold tracking-[0.08em] text-[#8A9BB0] uppercase">
            <CalendarDays className="size-3" />
            Run to
          </span>
          <Input
            type="date"
            value={filters.runTo}
            min={filters.runFrom || undefined}
            onChange={(event) => update('runTo', event.target.value)}
            aria-label="Filter surveys running to date"
            className="h-9 rounded-[9px] border-[#DCE4EE] bg-white px-3 text-[13px] text-[#314966] focus-visible:border-[#1BBFB0] focus-visible:ring-[#1BBFB0]/20"
          />
        </label>

        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onFiltersChange({ ...DEFAULT_SURVEY_LIST_FILTERS })}
            className="h-9 px-2.5 text-[#6D7D90] hover:bg-[#F3F6F9] hover:text-[#0D1F3C]"
          >
            <X />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
