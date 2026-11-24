import { useCallback, useMemo, useState } from 'react'
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FilePenLine,
  Radio,
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'

import SurveyFormDialog from '../components/SurveyFormDialog'
import SurveyListTable from '../components/SurveyListTable'
import SurveyListToolbar from '../components/SurveyListToolbar'
import { useSurveyManagementState } from '../hooks/useSurveyManagementState'
import { useSurveyMutations } from '../hooks/useSurveyMutations'
import { useSurveys } from '../hooks/useSurveys'
import {
  DEFAULT_SURVEY_LIST_FILTERS,
  DEFAULT_SURVEY_SORT,
  type CreateSurveyInput,
  type SurveyListFilters,
  type SurveyListItem,
  type SurveyOrganisationReference,
  type SurveySort,
  type UpdateSurveyInput,
} from '../types'
import { filterAndSortSurveys } from '../utils/surveyList'
import { useOrganisations } from '../../organisations/hooks/useOrganisations'

type StatTone = 'blue' | 'teal' | 'amber' | 'grey' | 'coral'

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: typeof ClipboardList
  tone: StatTone
}) {
  const tones: Record<StatTone, string> = {
    blue: 'bg-[#EAF4FB] text-[#2479AF]',
    teal: 'bg-[#E5F8F5] text-[#0A8A7E]',
    amber: 'bg-[#FFF6E8] text-[#B87524]',
    grey: 'bg-[#F0F3F6] text-[#6D7D90]',
    coral: 'bg-[#FFF1EF] text-[#A44B3B]',
  }

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#DFE6EE] bg-white px-4 py-3 shadow-[0_6px_20px_rgba(13,31,60,0.04)]">
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-extrabold text-[#0D1F3C]">
          {value.toLocaleString()}
        </div>
        <div className="truncate text-xs font-medium text-[#8A9BB0]">
          {label}
        </div>
      </div>
    </div>
  )
}

function organisationReferences(
  organisations: ReturnType<typeof useOrganisations>['organisations'],
): SurveyOrganisationReference[] {
  return organisations
    .filter((organisation) => organisation.status !== 'inactive')
    .map((organisation) => ({
      id: organisation.id,
      name: organisation.name,
      tradingName: organisation.tradingName,
      logoUrl: organisation.logoUrl,
      status: organisation.status,
    }))
    .sort((first, second) =>
      (first.tradingName || first.name).localeCompare(
        second.tradingName || second.name,
        undefined,
        { sensitivity: 'base' },
      ),
    )
}

export default function SurveyListPage() {
  const {
    surveys,
    stats,
    loading,
    refreshing,
    error: surveyLoadError,
    refetch,
  } = useSurveys()
  const {
    organisations,
    error: organisationLoadError,
  } = useOrganisations()
  const [filters, setFilters] = useState<SurveyListFilters>({
    ...DEFAULT_SURVEY_LIST_FILTERS,
  })
  const [sort, setSort] = useState<SurveySort>({ ...DEFAULT_SURVEY_SORT })
  const [formOpen, setFormOpen] = useState(false)

  const availableSurveyIds = useMemo(
    () => surveys.map((survey) => survey.id),
    [surveys],
  )
  const {
    selectedSurveyId,
    selectSurvey,
    clearSelection,
  } = useSurveyManagementState({
    availableSurveyIds,
    surveysLoaded: !loading,
  })

  const refreshAfterMutation = useCallback(
    () => refetch({ silent: true }),
    [refetch],
  )
  const mutations = useSurveyMutations({
    onRefresh: refreshAfterMutation,
    onSurveyDeleted: (surveyId) => {
      if (selectedSurveyId === surveyId) clearSelection({ replace: true })
    },
  })

  const visibleSurveys = useMemo(
    () => filterAndSortSurveys(surveys, filters, sort),
    [filters, sort, surveys],
  )
  const availableOrganisations = useMemo(
    () => organisationReferences(organisations),
    [organisations],
  )
  const pageError = surveyLoadError || organisationLoadError || mutations.error

  function openCreateDialog() {
    mutations.clearError()
    setFormOpen(true)
  }

  function openSurvey(
    survey: SurveyListItem,
    destination: 'builder' | 'controls' | 'settings' = 'builder',
  ) {
    selectSurvey(survey.id, destination)
  }

  async function submitSurvey(
    values: CreateSurveyInput | UpdateSurveyInput,
  ) {
    const savedSurvey = await mutations.saveSurvey(values)
    setFormOpen(false)
    selectSurvey(
      savedSurvey.id,
      'id' in values ? 'settings' : 'builder',
    )
    return savedSurvey
  }

  return (
    <section className="min-w-0 space-y-5 p-5 md:p-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-bold tracking-[0.16em] text-[#1BBFB0] uppercase">
            Survey management
          </div>
          <h1 className="mt-1 font-['Plus_Jakarta_Sans'] text-2xl font-extrabold tracking-[-0.5px] text-[#0D1F3C] md:text-3xl">
            Surveys
          </h1>
          <p className="mt-1 text-sm text-[#7C8EA5]">
            Create, find and manage every organisation&apos;s survey run.
          </p>
        </div>

        {!loading && (
          <div className="text-sm text-[#7C8EA5]">
            Showing{' '}
            <span className="font-bold text-[#314966]">
              {visibleSurveys.length}
            </span>{' '}
            of{' '}
            <span className="font-bold text-[#314966]">
              {surveys.length}
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total surveys"
          value={stats.total}
          icon={ClipboardList}
          tone="blue"
        />
        <StatCard
          label="Draft"
          value={stats.draft}
          icon={FilePenLine}
          tone="grey"
        />
        <StatCard
          label="Scheduled"
          value={stats.scheduled}
          icon={CalendarClock}
          tone="amber"
        />
        <StatCard
          label="Live"
          value={stats.live}
          icon={Radio}
          tone="teal"
        />
        <StatCard
          label="Closed"
          value={stats.closed}
          icon={CheckCircle2}
          tone="coral"
        />
      </div>

      {pageError && (
        <Alert variant="destructive" className="border-[#F4B6AE] bg-[#FFF5F3]">
          <AlertCircle />
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      )}

      <SurveyListToolbar
        filters={filters}
        surveys={surveys}
        refreshing={refreshing}
        onFiltersChange={setFilters}
        onRefresh={() => void refetch({ silent: true })}
        onCreateSurvey={openCreateDialog}
      />

      <SurveyListTable
        surveys={visibleSurveys}
        loading={loading}
        sort={sort}
        onSortChange={setSort}
        onOpenSurvey={openSurvey}
      />

      <SurveyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode="create"
        organisations={availableOrganisations}
        submitting={mutations.submittingForm}
        onSubmit={submitSurvey}
      />
    </section>
  )
}
