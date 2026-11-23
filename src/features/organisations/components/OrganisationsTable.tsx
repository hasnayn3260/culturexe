import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  CircleCheck,
  CircleOff,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'

import type {
  ManagedOrganisation,
  OrganisationSort,
  OrganisationSortKey,
} from '../types'

type OrganisationsTableProps = {
  organisations: ManagedOrganisation[]
  loading: boolean
  sort: OrganisationSort
  onSortChange: (sort: OrganisationSort) => void
  onEdit: (organisation: ManagedOrganisation) => void
  onActivate: (organisation: ManagedOrganisation) => void
  onDeactivate: (organisation: ManagedOrganisation) => void
  onDelete: (organisation: ManagedOrganisation) => void
  pendingOrganisationId?: string | null
}

type Column = {
  id: OrganisationSortKey
  label: string
  width: string
  render: (organisation: ManagedOrganisation) => ReactNode
}

function display(value: string | number | null | undefined): string {
  if (typeof value === 'number') return value.toLocaleString('en-ZA')
  return value?.trim() || '—'
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function organisationInitials(organisation: ManagedOrganisation): string {
  return (organisation.tradingName || organisation.name)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'
}

function OrganisationIdentity({
  organisation,
}: {
  organisation: ManagedOrganisation
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[#DCE5EE] bg-[#F4F8FC]">
        {organisation.logoUrl ? (
          <img
            src={organisation.logoUrl}
            alt=""
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-xs font-extrabold text-[#278EAA]">
            {organisationInitials(organisation)}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate font-semibold text-[#0D1F3C]">
          {display(organisation.tradingName || organisation.name)}
        </div>
        {organisation.tradingName && (
          <div className="mt-0.5 max-w-[230px] truncate text-xs text-[#8A9BB0]">
            {organisation.name}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: ManagedOrganisation['status'] }) {
  const styles = {
    active: 'border-[#9FE4DD] bg-[#E7F9F7] text-[#087C72]',
    inactive: 'border-[#DCE3EA] bg-[#F3F5F7] text-[#6D7D90]',
    onboarding: 'border-[#F3D5A8] bg-[#FFF7E9] text-[#A9681F]',
  }[status]
  const dot = {
    active: 'bg-[#1BBFB0]',
    inactive: 'bg-[#94A3B8]',
    onboarding: 'bg-[#E2A64B]',
  }[status]

  return (
    <Badge variant="outline" className={styles}>
      <span className={`size-1.5 rounded-full ${dot}`} />
      <span className="capitalize">{status}</span>
    </Badge>
  )
}

const columns: Column[] = [
  {
    id: 'name',
    label: 'Organisation',
    width: 'min-w-[270px]',
    render: (organisation) => <OrganisationIdentity organisation={organisation} />,
  },
  {
    id: 'registrationNumber',
    label: 'Registration no.',
    width: 'min-w-[165px]',
    render: (organisation) => display(organisation.registrationNumber),
  },
  {
    id: 'organisationType',
    label: 'Type',
    width: 'min-w-[210px]',
    render: (organisation) => display(organisation.organisationType),
  },
  {
    id: 'sector',
    label: 'Sector',
    width: 'min-w-[220px]',
    render: (organisation) => display(organisation.sector),
  },
  {
    id: 'employeeCount',
    label: 'Employees',
    width: 'min-w-[145px]',
    render: (organisation) => (
      <div>
        <div className="font-semibold text-[#314966]">
          {display(organisation.employeeCount)}
        </div>
        <div className="mt-0.5 text-xs text-[#8A9BB0]">
          {display(organisation.sizeBand)}
        </div>
      </div>
    ),
  },
  {
    id: 'country',
    label: 'Location',
    width: 'min-w-[175px]',
    render: (organisation) => (
      <div>
        <div>{display(organisation.country)}</div>
        <div className="mt-0.5 text-xs text-[#8A9BB0]">
          {[organisation.city, organisation.province].filter(Boolean).join(', ') || '—'}
        </div>
      </div>
    ),
  },
  {
    id: 'contactName',
    label: 'Primary contact',
    width: 'min-w-[190px]',
    render: (organisation) => (
      <div>
        <div className="text-[#314966]">
          {display(
            [organisation.contactFirstName, organisation.contactSurname]
              .filter(Boolean)
              .join(' '),
          )}
        </div>
        <div className="mt-0.5 text-xs text-[#8A9BB0]">
          {display(organisation.contactJobTitle)}
        </div>
      </div>
    ),
  },
  {
    id: 'contactEmail',
    label: 'Contact email',
    width: 'min-w-[220px]',
    render: (organisation) => display(organisation.contactEmail),
  },
  {
    id: 'status',
    label: 'Status',
    width: 'min-w-[125px]',
    render: (organisation) => <StatusBadge status={organisation.status} />,
  },
  {
    id: 'updatedAt',
    label: 'Updated',
    width: 'min-w-[145px]',
    render: (organisation) => formatDate(organisation.updatedAt),
  },
]

function SortIcon({
  active,
  direction,
}: {
  active: boolean
  direction: OrganisationSort['direction']
}) {
  if (!active) return <ArrowUpDown className="size-3.5 text-[#A5B2C2]" />
  return direction === 'asc'
    ? <ArrowUp className="size-3.5 text-[#1BBFB0]" />
    : <ArrowDown className="size-3.5 text-[#1BBFB0]" />
}

export default function OrganisationsTable({
  organisations,
  loading,
  sort,
  onSortChange,
  onEdit,
  onActivate,
  onDeactivate,
  onDelete,
  pendingOrganisationId = null,
}: OrganisationsTableProps) {
  const scrollContainer = useRef<HTMLDivElement>(null)
  const dragState = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    scrollLeft: 0,
  })
  const [dragging, setDragging] = useState(false)

  function changeSort(key: OrganisationSortKey) {
    onSortChange({
      key,
      direction: sort.key === key && sort.direction === 'asc' ? 'desc' : 'asc',
    })
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
    if (drag.moved) container.scrollLeft = drag.scrollLeft - distance
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

    if (drag.moved) {
      window.setTimeout(() => {
        dragState.current.moved = false
      }, 0)
    }
  }

  function openRow(organisation: ManagedOrganisation) {
    if (dragState.current.moved) {
      dragState.current.moved = false
      return
    }
    onEdit(organisation)
  }

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    organisation: ManagedOrganisation,
  ) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onEdit(organisation)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#DFE6EE] bg-white shadow-[0_10px_28px_rgba(13,31,60,0.05)]">
      <div
        ref={scrollContainer}
        onPointerDown={startDragging}
        onPointerMove={dragTable}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        className={`overflow-x-auto ${dragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
      >
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[#F7F9FC]">
            <tr className="border-b border-[#DFE6EE]">
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={`${column.width} px-4 py-3 font-semibold text-[#526A88]`}
                >
                  <button
                    type="button"
                    onClick={() => changeSort(column.id)}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#1BBFB0]/30"
                  >
                    {column.label}
                    <SortIcon
                      active={sort.key === column.id}
                      direction={sort.direction}
                    />
                  </button>
                </th>
              ))}
              <th
                scope="col"
                className="sticky right-0 z-10 min-w-[76px] border-l border-[#E8EDF3] bg-[#F7F9FC] px-4 py-3 text-right font-semibold text-[#526A88]"
              >
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {loading && Array.from({ length: 5 }, (_, row) => (
              <tr key={row} className="border-b border-[#EDF1F5] last:border-0">
                {columns.map((column) => (
                  <td key={column.id} className="px-4 py-4">
                    <Skeleton className="h-5 w-3/4 bg-[#E9EEF4]" />
                  </td>
                ))}
                <td className="sticky right-0 border-l border-[#EDF1F5] bg-white px-4 py-4">
                  <Skeleton className="ml-auto size-7 bg-[#E9EEF4]" />
                </td>
              </tr>
            ))}

            {!loading && organisations.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-14 text-center">
                  <Building2 className="mx-auto size-8 text-[#A8B6C7]" />
                  <div className="mt-3 font-semibold text-[#314966]">
                    No organisations found
                  </div>
                  <div className="mt-1 text-sm text-[#8A9BB0]">
                    Change the filters or add a new organisation.
                  </div>
                </td>
              </tr>
            )}

            {!loading && organisations.map((organisation) => {
              const isPending = pendingOrganisationId === organisation.id

              return (
                <tr
                  key={organisation.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Edit ${organisation.tradingName || organisation.name}`}
                  onClick={() => openRow(organisation)}
                  onKeyDown={(event) => handleRowKeyDown(event, organisation)}
                  className="group cursor-pointer border-b border-[#EDF1F5] text-[#526A88] transition-colors last:border-0 hover:bg-[#FAFBFD] focus-visible:bg-[#F3F9FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1BBFB0]/40"
                >
                  {columns.map((column) => (
                    <td key={column.id} className={`${column.width} px-4 py-3.5`}>
                      {column.render(organisation)}
                    </td>
                  ))}
                  <td
                    onClick={(event) => event.stopPropagation()}
                    className="sticky right-0 z-[1] border-l border-[#EDF1F5] bg-white px-4 py-3 text-right group-hover:bg-[#FAFBFD]"
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        disabled={isPending}
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${organisation.tradingName || organisation.name}`}
                            className="text-[#526A88] hover:bg-[#EAF7F5] hover:text-[#087C72]"
                          />
                        }
                      >
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side="bottom"
                        align="end"
                        className="w-52 rounded-xl bg-white p-1.5 text-[#0D1F3C] shadow-[0_12px_36px_rgba(13,31,60,0.16)] ring-[#E2E8F0]"
                      >
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            onClick={() => onEdit(organisation)}
                            className="gap-2 rounded-lg px-2 py-2 text-[13px] focus:bg-[#F3F8FA] focus:text-[#0D1F3C]"
                          >
                            <Pencil className="text-[#4A6380]" />
                            Edit organisation
                          </DropdownMenuItem>
                          {organisation.status === 'active' ? (
                            <DropdownMenuItem
                              onClick={() => onDeactivate(organisation)}
                              className="gap-2 rounded-lg px-2 py-2 text-[13px] focus:bg-[#F3F8FA] focus:text-[#0D1F3C]"
                            >
                              <CircleOff className="text-[#4A6380]" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => onActivate(organisation)}
                              className="gap-2 rounded-lg px-2 py-2 text-[13px] focus:bg-[#F3F8FA] focus:text-[#0D1F3C]"
                            >
                              <CircleCheck className="text-[#087C72]" />
                              Activate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="bg-[#E2E8F0]" />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => onDelete(organisation)}
                          className="gap-2 rounded-lg px-2 py-2 text-[13px]"
                        >
                          <Trash2 />
                          Delete organisation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!loading && organisations.length > 0 && (
        <div className="border-t border-[#E8EDF3] bg-[#FAFBFD] px-4 py-3 text-xs text-[#7C8EA5]">
          {organisations.length.toLocaleString()} {' '}
          {organisations.length === 1 ? 'organisation' : 'organisations'}
          <span className="ml-2 text-[#9AA9BC]">Drag horizontally to view all columns.</span>
        </div>
      )}
    </div>
  )
}
