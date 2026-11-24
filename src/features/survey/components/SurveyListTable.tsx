import type { KeyboardEvent } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ClipboardList,
  ExternalLink,
  MoreHorizontal,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'

import type {
  SurveyListItem,
  SurveyManagementTab,
  SurveySort,
  SurveySortKey,
} from '../types'

type SurveyDestination = Exclude<SurveyManagementTab, 'list'>

type SurveyListTableProps = {
  surveys: SurveyListItem[]
  loading: boolean
  sort: SurveySort
  onSortChange: (sort: SurveySort) => void
  onOpenSurvey: (
    survey: SurveyListItem,
    destination?: SurveyDestination,
  ) => void
}

const SORT_OPTIONS: Array<{ value: SurveySortKey; label: string }> = [
  { value: 'updatedAt', label: 'Last updated' },
  { value: 'createdAt', label: 'Created date' },
  { value: 'title', label: 'Survey title' },
  { value: 'organisation', label: 'Organisation' },
  { value: 'effectiveStatus', label: 'Lifecycle status' },
  { value: 'liveStart', label: 'Opening date' },
  { value: 'liveEnd', label: 'Closing date' },
  { value: 'questionCount', label: 'Question count' },
  { value: 'respondentCount', label: 'Respondent count' },
  { value: 'completedCount', label: 'Completed count' },
  { value: 'completionRate', label: 'Completion rate' },
]

function formatDate(value: string | null): string {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function organisationInitials(survey: SurveyListItem): string {
  return (survey.organisation.tradingName || survey.organisation.name)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'
}

function SurveyStatusBadge({
  status,
}: {
  status: SurveyListItem['effectiveStatus']
}) {
  const styles = {
    draft: 'border-[#DCE3EA] bg-[#F3F5F7] text-[#6D7D90]',
    scheduled: 'border-[#BCD9EE] bg-[#EDF6FC] text-[#2479AF]',
    live: 'border-[#9FE4DD] bg-[#E7F9F7] text-[#087C72]',
    closed: 'border-[#E8C7C1] bg-[#FFF1EF] text-[#A44B3B]',
  }[status]
  const dot = {
    draft: 'bg-[#94A3B8]',
    scheduled: 'bg-[#3A8FC4]',
    live: 'bg-[#1BBFB0]',
    closed: 'bg-[#CF6B58]',
  }[status]

  return (
    <Badge variant="outline" className={styles}>
      <span className={`size-1.5 rounded-full ${dot}`} />
      <span className="capitalize">{status}</span>
    </Badge>
  )
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean
  direction: SurveySort['direction']
}) {
  if (!active) return <ArrowUpDown className="size-3.5 text-[#A5B2C2]" />
  return direction === 'asc' ? (
    <ArrowUp className="size-3.5 text-[#1BBFB0]" />
  ) : (
    <ArrowDown className="size-3.5 text-[#1BBFB0]" />
  )
}

export default function SurveyListTable({
  surveys,
  loading,
  sort,
  onSortChange,
  onOpenSurvey,
}: SurveyListTableProps) {
  function changeSort(key: SurveySortKey) {
    onSortChange({
      key,
      direction:
        sort.key === key && sort.direction === 'asc' ? 'desc' : 'asc',
    })
  }

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    survey: SurveyListItem,
  ) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onOpenSurvey(survey, 'builder')
  }

  function previewSurvey(survey: SurveyListItem) {
    window.open(
      `/app/surveys/${encodeURIComponent(survey.id)}/preview`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#DFE6EE] bg-white shadow-[0_10px_28px_rgba(13,31,60,0.05)]">
      <div className="flex flex-col gap-2 border-b border-[#E8EDF3] bg-[#FAFBFD] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-[#7C8EA5]">
          {loading ? 'Loading surveys…' : (
            <>
              <span className="font-semibold text-[#526A88]">
                {surveys.length.toLocaleString()}
              </span>{' '}
              {surveys.length === 1 ? 'survey' : 'surveys'}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold text-[#7C8EA5]" htmlFor="survey-list-sort">
            Sort by
          </label>
          <select
            id="survey-list-sort"
            value={sort.key}
            onChange={(event) =>
              onSortChange({ ...sort, key: event.target.value as SurveySortKey })}
            className="h-8 rounded-[8px] border border-[#DCE4EE] bg-white px-2.5 text-xs text-[#314966] outline-none focus:border-[#1BBFB0] focus:ring-3 focus:ring-[#1BBFB0]/20"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() =>
              onSortChange({
                ...sort,
                direction: sort.direction === 'asc' ? 'desc' : 'asc',
              })}
            aria-label={`Sort ${sort.direction === 'asc' ? 'descending' : 'ascending'}`}
            title={`Sort ${sort.direction === 'asc' ? 'descending' : 'ascending'}`}
            className="size-8 border-[#DCE4EE] bg-white text-[#526A88] hover:bg-[#F2F7F8] hover:text-[#087C72]"
          >
            {sort.direction === 'asc' ? <ArrowUp /> : <ArrowDown />}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] table-fixed border-collapse text-left text-sm">
          <thead className="bg-[#F7F9FC]">
            <tr className="border-b border-[#DFE6EE]">
              <th scope="col" className="w-[25%] px-4 py-3 font-semibold text-[#526A88]">
                <button
                  type="button"
                  onClick={() => changeSort('title')}
                  className="inline-flex items-center gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#1BBFB0]/30"
                >
                  Survey
                  <SortIcon active={sort.key === 'title'} direction={sort.direction} />
                </button>
              </th>
              <th scope="col" className="w-[18%] px-3 py-3 font-semibold text-[#526A88]">
                <button
                  type="button"
                  onClick={() => changeSort('organisation')}
                  className="inline-flex items-center gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#1BBFB0]/30"
                >
                  Organisation
                  <SortIcon active={sort.key === 'organisation'} direction={sort.direction} />
                </button>
              </th>
              <th scope="col" className="w-[11%] px-3 py-3 font-semibold text-[#526A88]">
                <button
                  type="button"
                  onClick={() => changeSort('effectiveStatus')}
                  className="inline-flex items-center gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#1BBFB0]/30"
                >
                  Status
                  <SortIcon active={sort.key === 'effectiveStatus'} direction={sort.direction} />
                </button>
              </th>
              <th scope="col" className="w-[17%] px-3 py-3 font-semibold text-[#526A88]">
                <button
                  type="button"
                  onClick={() => changeSort('liveStart')}
                  className="inline-flex items-center gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#1BBFB0]/30"
                >
                  Run dates
                  <SortIcon active={sort.key === 'liveStart'} direction={sort.direction} />
                </button>
              </th>
              <th scope="col" className="w-[16%] px-3 py-3 font-semibold text-[#526A88]">
                <button
                  type="button"
                  onClick={() => changeSort('completionRate')}
                  className="inline-flex items-center gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#1BBFB0]/30"
                >
                  Participation
                  <SortIcon active={sort.key === 'completionRate'} direction={sort.direction} />
                </button>
              </th>
              <th scope="col" className="w-[13%] px-3 py-3 font-semibold text-[#526A88]">
                <button
                  type="button"
                  onClick={() => changeSort('updatedAt')}
                  className="inline-flex items-center gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#1BBFB0]/30"
                >
                  Updated
                  <SortIcon active={sort.key === 'updatedAt'} direction={sort.direction} />
                </button>
              </th>
              <th scope="col" className="w-[64px] px-3 py-3 text-right font-semibold text-[#526A88]">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {loading && Array.from({ length: 5 }, (_, row) => (
              <tr key={row} className="border-b border-[#EDF1F5] last:border-0">
                {Array.from({ length: 7 }, (_, column) => (
                  <td key={column} className="px-4 py-4">
                    <Skeleton className="h-5 w-3/4 bg-[#E9EEF4]" />
                  </td>
                ))}
              </tr>
            ))}

            {!loading && surveys.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-14 text-center">
                  <ClipboardList className="mx-auto size-8 text-[#A8B6C7]" />
                  <div className="mt-3 font-semibold text-[#314966]">
                    No surveys found
                  </div>
                  <div className="mt-1 text-sm text-[#8A9BB0]">
                    Change the filters or create a new survey.
                  </div>
                </td>
              </tr>
            )}

            {!loading && surveys.map((survey) => (
              <tr
                key={survey.id}
                role="button"
                tabIndex={0}
                aria-label={`Open ${survey.title}`}
                onClick={() => onOpenSurvey(survey, 'builder')}
                onKeyDown={(event) => handleRowKeyDown(event, survey)}
                className="group cursor-pointer border-b border-[#EDF1F5] text-[#526A88] transition-colors last:border-0 hover:bg-[#FAFBFD] focus-visible:bg-[#F3F9FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1BBFB0]/40"
              >
                <td className="px-4 py-3.5 align-middle">
                  <div className="truncate font-semibold text-[#0D1F3C]">
                    {survey.title}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-[#8A9BB0]">
                    {survey.description || `${survey.questionCount} questions`}
                  </div>
                </td>
                <td className="px-3 py-3.5 align-middle">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-[#DCE5EE] bg-[#F4F8FC]">
                      {survey.organisation.logoUrl ? (
                        <img
                          src={survey.organisation.logoUrl}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-[10px] font-extrabold text-[#278EAA]">
                          {organisationInitials(survey)}
                        </span>
                      )}
                    </div>
                    <span className="truncate text-[13px] text-[#314966]">
                      {survey.organisation.tradingName || survey.organisation.name}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3.5 align-middle">
                  <SurveyStatusBadge status={survey.effectiveStatus} />
                </td>
                <td className="px-3 py-3.5 align-middle text-xs">
                  <div className="text-[#314966]">
                    <span className="text-[#8A9BB0]">Opens </span>
                    {formatDate(survey.liveStart)}
                  </div>
                  <div className="mt-1 text-[#314966]">
                    <span className="text-[#8A9BB0]">Closes </span>
                    {formatDate(survey.liveEnd)}
                  </div>
                </td>
                <td className="px-3 py-3.5 align-middle">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#314966]">
                      {survey.completedCount}/{survey.respondentCount}
                    </span>
                    <span className="font-bold text-[#087C72]">
                      {survey.completionRate}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#E8EEF4]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#1BBFB0] to-[#25C7B8]"
                      style={{ width: `${Math.min(survey.completionRate, 100)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] text-[#8A9BB0]">
                    {survey.startedCount} started · {survey.questionCount} questions
                  </div>
                </td>
                <td className="px-3 py-3.5 align-middle text-xs text-[#526A88]">
                  {formatDateTime(survey.updatedAt)}
                </td>
                <td
                  onClick={(event) => event.stopPropagation()}
                  className="px-3 py-3.5 text-right align-middle"
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${survey.title}`}
                          className="text-[#526A88] hover:bg-[#EAF7F5] hover:text-[#087C72]"
                        />
                      }
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="bottom"
                      align="end"
                      className="w-44 rounded-xl bg-white p-1.5 text-[#0D1F3C] shadow-[0_12px_36px_rgba(13,31,60,0.16)] ring-[#E2E8F0]"
                    >
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          onClick={() => previewSurvey(survey)}
                          className="gap-2 rounded-lg px-2 py-2 text-[13px] focus:bg-[#F3F8FA] focus:text-[#0D1F3C]"
                        >
                          <ExternalLink className="text-[#0A8A7E]" />
                          Preview survey
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onOpenSurvey(survey, 'builder')}
                          className="gap-2 rounded-lg px-2 py-2 text-[13px] focus:bg-[#F3F8FA] focus:text-[#0D1F3C]"
                        >
                          <ClipboardList className="text-[#4A6380]" />
                          Survey builder
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onOpenSurvey(survey, 'controls')}
                          className="gap-2 rounded-lg px-2 py-2 text-[13px] focus:bg-[#F3F8FA] focus:text-[#0D1F3C]"
                        >
                          <SlidersHorizontal className="text-[#4A6380]" />
                          Survey controls
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onOpenSurvey(survey, 'settings')}
                          className="gap-2 rounded-lg px-2 py-2 text-[13px] focus:bg-[#F3F8FA] focus:text-[#0D1F3C]"
                        >
                          <Settings2 className="text-[#4A6380]" />
                          Survey settings
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
