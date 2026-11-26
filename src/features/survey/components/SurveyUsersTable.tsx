import {
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

import type { SubmissionQualityLevel } from '../../analytics/utils/submissionQuality'

export type SurveyUserTableRow = {
  id: string
  firstName: string
  surname: string
  email: string
  source: 'open_link' | 'invited'
  department: string
  position: string
  status: 'completed' | 'in_progress' | 'not_started'
  accessCount: number
  firstAccessedAt: string | null
  lastAccessedAt: string | null
  startedAt: string | null
  completionSeconds: number | null
  qualityScore: number | null
  qualityLevel: SubmissionQualityLevel
  qualityLabel: string
  qualitySignals: string[]
  openEndedWordCount: number
  timing: 'early' | 'on_time' | 'late' | null
  submittedAt: string | null
}

export type SurveyUserSortKey = keyof Omit<SurveyUserTableRow, 'id'>
export type SurveyUserSortDirection = 'asc' | 'desc'

export type SurveyUserSort = {
  key: SurveyUserSortKey
  direction: SurveyUserSortDirection
}

type SurveyUsersTableProps = {
  rows: SurveyUserTableRow[]
  onAddUsers: () => void
  sort: SurveyUserSort
  onSortChange: (sort: SurveyUserSort) => void
}

const columns: Array<{ key: SurveyUserSortKey; label: string }> = [
  { key: 'firstName', label: 'First name' },
  { key: 'surname', label: 'Surname' },
  { key: 'email', label: 'Email' },
  { key: 'source', label: 'Source' },
  { key: 'department', label: 'Department' },
  { key: 'position', label: 'Position' },
  { key: 'status', label: 'Survey status' },
  { key: 'accessCount', label: 'Accesses' },
  { key: 'firstAccessedAt', label: 'First accessed' },
  { key: 'lastAccessedAt', label: 'Last accessed' },
  { key: 'startedAt', label: 'Started' },
  { key: 'completionSeconds', label: 'Time taken' },
  { key: 'qualityScore', label: 'Quality' },
  { key: 'timing', label: 'Timing' },
  { key: 'submittedAt', label: 'Submitted' },
]

function compareValues(left: unknown, right: unknown): number {
  const leftBlank = left === null || left === undefined || left === ''
  const rightBlank = right === null || right === undefined || right === ''
  if (leftBlank && rightBlank) return 0
  if (leftBlank) return 1
  if (rightBlank) return -1
  if (typeof left === 'number' && typeof right === 'number') return left - right
  return String(left).localeCompare(String(right), 'en-ZA', {
    numeric: true,
    sensitivity: 'base',
  })
}

export function sortSurveyUsers(
  rows: SurveyUserTableRow[],
  sort: SurveyUserSort,
): SurveyUserTableRow[] {
  const direction = sort.direction === 'asc' ? 1 : -1

  return [...rows].sort((left, right) => {
    const comparison = compareValues(left[sort.key], right[sort.key])
    if (comparison !== 0) return comparison * direction
    return compareValues(left.email, right.email)
  })
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))} sec`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes} min ${remainingSeconds} sec`
      : `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function statusLabel(status: SurveyUserTableRow['status']): string {
  if (status === 'completed') return 'Completed'
  if (status === 'in_progress') return 'In progress'
  return 'Not started'
}

function timingLabel(timing: SurveyUserTableRow['timing']): string {
  if (timing === 'early') return 'Early'
  if (timing === 'on_time') return 'On time'
  if (timing === 'late') return 'Late'
  return '—'
}

function qualityClasses(level: SubmissionQualityLevel): string {
  if (level === 'strong') return 'border-[#BDE7DF] bg-[#E7F9F7] text-[#087C72]'
  if (level === 'mixed') return 'border-[#E8D9AE] bg-[#FFF7E2] text-[#8A6520]'
  if (level === 'review') return 'border-[#F1C4B8] bg-[#FDECE7] text-[#A0442E]'
  return 'border-[#DCE5EE] bg-[#F3F5F7] text-[#6D7D90]'
}

export default function SurveyUsersTable({
  rows,
  onAddUsers,
  sort,
  onSortChange,
}: SurveyUsersTableProps) {
  const scrollContainer = useRef<HTMLDivElement>(null)
  const dragState = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    scrollLeft: 0,
  })
  const [dragging, setDragging] = useState(false)

  const sortedRows = useMemo(
    () => sortSurveyUsers(rows, sort),
    [rows, sort],
  )

  function toggleSort(key: SurveyUserSortKey) {
    if (key === sort.key) {
      onSortChange({
        key,
        direction: sort.direction === 'asc' ? 'desc' : 'asc',
      })
      return
    }
    onSortChange({ key, direction: 'asc' })
  }

  function startDragging(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    if ((event.target as HTMLElement).closest('button, a, input, select, textarea')) return

    const container = scrollContainer.current
    if (!container || container.scrollWidth <= container.clientWidth) return

    dragState.current = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: container.scrollLeft,
    }
  }

  function dragTable(event: PointerEvent<HTMLDivElement>) {
    const container = scrollContainer.current
    const drag = dragState.current
    if (!container || !drag.active || drag.pointerId !== event.pointerId) return

    const distance = event.clientX - drag.startX
    if (Math.abs(distance) > 4 && !drag.moved) {
      drag.moved = true
      container.setPointerCapture(event.pointerId)
      setDragging(true)
    }

    if (!drag.moved) return
    container.scrollLeft = drag.scrollLeft - distance
  }

  function stopDragging(event: PointerEvent<HTMLDivElement>) {
    const container = scrollContainer.current
    const drag = dragState.current
    if (!drag.active || drag.pointerId !== event.pointerId) return

    drag.active = false
    if (container?.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId)
    }
    setDragging(false)
    window.setTimeout(() => {
      dragState.current.moved = false
    }, 0)
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-[18px] border border-[#DCE5EE] bg-white px-6 py-12 text-center text-sm text-[#8A9BB0]">
        No users have been assigned to this survey yet.{' '}
        <button
          type="button"
          onClick={onAddUsers}
          className="font-semibold text-[#0A9F92] hover:underline"
        >
          Add users
        </button>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#DCE5EE] bg-white shadow-sm">
      <div
        ref={scrollContainer}
        onPointerDown={startDragging}
        onPointerMove={dragTable}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        className={`overflow-x-auto touch-pan-y ${dragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
        aria-label="Survey users table. Drag horizontally to view more columns."
      >
        <table className="w-full min-w-[1450px] border-collapse text-left">
          <thead className="bg-[#F7F9FC]">
            <tr>
              {columns.map((column) => {
                const active = column.key === sort.key
                const Icon = !active
                  ? ArrowUpDown
                  : sort.direction === 'asc'
                    ? ArrowUp
                    : ArrowDown

                return (
                  <th key={column.key} className="border-b border-[#DCE5EE] px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-bold uppercase tracking-[0.08em] text-[#7890AD] transition hover:text-[#0D1F3C]"
                      aria-label={`Sort ${column.label} ${active && sort.direction === 'asc' ? 'descending' : 'ascending'}`}
                    >
                      {column.label}
                      <Icon className={`size-3.5 ${active ? 'text-[#1BBFB0]' : 'text-[#A5B2C2]'}`} />
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.id} className="border-b border-[#E6ECF2] last:border-0 hover:bg-[#F8FBFD]">
                <td className="px-4 py-3 font-semibold text-[#0D1F3C]">{row.firstName || '—'}</td>
                <td className="px-4 py-3 font-semibold text-[#0D1F3C]">{row.surname || '—'}</td>
                <td className="px-4 py-3 text-[#314966]">{row.source === 'open_link' ? <span className="italic text-[#8A9BB0]">No email</span> : row.email}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.source === 'open_link' ? 'bg-[#E7F9F7] text-[#087C72]' : 'bg-[#FFF7E9] text-[#9B6721]'}`}>
                    {row.source === 'open_link' ? 'Open link' : 'Invited'}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#314966]">{row.department || '—'}</td>
                <td className="px-4 py-3 text-[#314966]">{row.position || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.status === 'completed' ? 'bg-[#E7F9F7] text-[#087C72]' : row.status === 'in_progress' ? 'bg-[#EAF3FB] text-[#236EA7]' : 'bg-[#F3F5F7] text-[#6D7D90]'}`}>
                    {statusLabel(row.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#314966]">{row.accessCount}</td>
                <td className="whitespace-nowrap px-4 py-3 text-[#6D7D90]">{formatDateTime(row.firstAccessedAt)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-[#6D7D90]">{formatDateTime(row.lastAccessedAt)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-[#6D7D90]">{formatDateTime(row.startedAt)}</td>
                <td className="px-4 py-3 text-[#314966]">{formatDuration(row.completionSeconds)}</td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={qualityClasses(row.qualityLevel)}
                    title={row.qualitySignals.length > 0
                      ? row.qualitySignals.join(' ')
                      : `${row.openEndedWordCount} open-ended words recorded.`}
                  >
                    {row.qualityLabel}{row.qualityScore !== null ? ` · ${row.qualityScore}%` : ''}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-[#314966]">{timingLabel(row.timing)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-[#6D7D90]">{formatDateTime(row.submittedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
