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
  ManagedUser,
  UserSort,
  UserSortKey,
} from '../types'

type UsersTableProps = {
  users: ManagedUser[]
  loading: boolean
  sort: UserSort
  onSortChange: (sort: UserSort) => void
  onEdit: (user: ManagedUser) => void
  onActivate: (user: ManagedUser) => void
  onDeactivate: (user: ManagedUser) => void
  onDelete: (user: ManagedUser) => void
  pendingUserId?: string | null
}

type Column = {
  id: UserSortKey
  label: string
  width: string
  render: (user: ManagedUser) => ReactNode
}

function display(value: string | null | undefined): string {
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

function formatDateTime(value: string | null): string {
  if (!value) return 'Never'
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

function initials(user: ManagedUser): string {
  const source = user.fullName || user.email || '?'
  const result = source
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return result || '?'
}

const columns: Column[] = [
  {
    id: 'fullName',
    label: 'Name',
    width: 'min-w-[230px]',
    render: (user) => (
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1BBFB0] to-[#3A8FC4] text-xs font-extrabold text-white">
          {initials(user)}
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold text-[#0D1F3C]">
            {display(user.fullName)}
          </div>
          <div className="mt-0.5 truncate text-xs text-[#8A9BB0]">
            {display(user.username)}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'email',
    label: 'Email',
    width: 'min-w-[230px]',
    render: (user) => (
      <div>
        <div className="text-[#314966]">{display(user.email)}</div>
        {user.authEmail !== user.profileEmail && (
          <div className="mt-1 text-xs font-medium text-[#C87922]">
            Auth/profile mismatch
          </div>
        )}
      </div>
    ),
  },
  {
    id: 'phone',
    label: 'Phone',
    width: 'min-w-[155px]',
    render: (user) => display(user.phone),
  },
  {
    id: 'organisation',
    label: 'Organisation',
    width: 'min-w-[220px]',
    render: (user) => display(user.organisation?.name),
  },
  {
    id: 'department',
    label: 'Department',
    width: 'min-w-[170px]',
    render: (user) => display(user.department),
  },
  {
    id: 'branch',
    label: 'Branch',
    width: 'min-w-[160px]',
    render: (user) => display(user.branch),
  },
  {
    id: 'manager',
    label: 'Manager',
    width: 'min-w-[210px]',
    render: (user) => display(user.manager?.fullName || user.manager?.email),
  },
  {
    id: 'locationSite',
    label: 'Location/site',
    width: 'min-w-[175px]',
    render: (user) => display(user.locationSite),
  },
  {
    id: 'jobTitle',
    label: 'Job title',
    width: 'min-w-[190px]',
    render: (user) => display(user.jobTitle),
  },
  {
    id: 'position',
    label: 'Employment level',
    width: 'min-w-[175px]',
    render: (user) => display(user.position),
  },
  {
    id: 'hireDate',
    label: 'Start date',
    width: 'min-w-[145px]',
    render: (user) => formatDate(user.hireDate),
  },
  {
    id: 'role',
    label: 'Platform role',
    width: 'min-w-[145px]',
    render: (user) => (
      <Badge
        variant="outline"
        className="border-[#CFE0EE] bg-[#F4F8FC] capitalize text-[#365473]"
      >
        {user.role === 'superadmin' ? 'Super admin' : display(user.role)}
      </Badge>
    ),
  },
  {
    id: 'active',
    label: 'Status',
    width: 'min-w-[120px]',
    render: (user) => (
      <Badge
        variant="outline"
        className={
          user.active
            ? 'border-[#9FE4DD] bg-[#E7F9F7] text-[#087C72]'
            : 'border-[#DCE3EA] bg-[#F3F5F7] text-[#6D7D90]'
        }
      >
        <span
          className={`size-1.5 rounded-full ${
            user.active ? 'bg-[#1BBFB0]' : 'bg-[#94A3B8]'
          }`}
        />
        {user.active ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    id: 'providers',
    label: 'Providers',
    width: 'min-w-[145px]',
    render: (user) => user.providers.length > 0 ? user.providers.join(', ') : '—',
  },
  {
    id: 'providerType',
    label: 'Provider type',
    width: 'min-w-[150px]',
    render: (user) => display(user.providerType),
  },
  {
    id: 'authCreatedAt',
    label: 'Created',
    width: 'min-w-[190px]',
    render: (user) => formatDateTime(user.authCreatedAt),
  },
  {
    id: 'lastSignInAt',
    label: 'Last sign in',
    width: 'min-w-[190px]',
    render: (user) => formatDateTime(user.lastSignInAt),
  },
]

function SortIcon({ active, direction }: {
  active: boolean
  direction: UserSort['direction']
}) {
  if (!active) return <ArrowUpDown className="size-3.5 text-[#A5B2C2]" />
  return direction === 'asc'
    ? <ArrowUp className="size-3.5 text-[#1BBFB0]" />
    : <ArrowDown className="size-3.5 text-[#1BBFB0]" />
}

export default function UsersTable({
  users,
  loading,
  sort,
  onSortChange,
  onEdit,
  onActivate,
  onDeactivate,
  onDelete,
  pendingUserId = null,
}: UsersTableProps) {
  const scrollContainer = useRef<HTMLDivElement>(null)
  const dragState = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    scrollLeft: 0,
  })
  const [dragging, setDragging] = useState(false)

  function changeSort(key: UserSortKey) {
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

    if (drag.moved) {
      window.setTimeout(() => {
        dragState.current.moved = false
      }, 0)
    }
  }

  function openRow(user: ManagedUser) {
    if (dragState.current.moved) {
      dragState.current.moved = false
      return
    }
    onEdit(user)
  }

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    user: ManagedUser,
  ) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onEdit(user)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#DFE6EE] bg-white shadow-[0_10px_28px_rgba(13,31,60,0.05)]">
      <div
        ref={scrollContainer}
        onPointerDown={startDragging}
        onPointerMove={dragTable}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        className={`overflow-x-auto ${
          dragging ? 'cursor-grabbing select-none' : 'cursor-grab'
        }`}
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
            {loading && Array.from({ length: 6 }, (_, row) => (
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

            {!loading && users.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-6 py-14 text-center"
                >
                  <div className="font-semibold text-[#314966]">No users found</div>
                  <div className="mt-1 text-sm text-[#8A9BB0]">
                    Change the filters or add a new user.
                  </div>
                </td>
              </tr>
            )}

            {!loading && users.map((user) => {
              const isPending = pendingUserId === user.id

              return (
                <tr
                  key={user.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Edit ${user.fullName || user.email || 'user'}`}
                  onClick={() => openRow(user)}
                  onKeyDown={(event) => handleRowKeyDown(event, user)}
                  className="cursor-pointer border-b border-[#EDF1F5] text-[#526A88] transition-colors last:border-0 hover:bg-[#FAFBFD] focus-visible:bg-[#F3F9FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1BBFB0]/40"
                >
                  {columns.map((column) => (
                    <td key={column.id} className={`${column.width} px-4 py-3.5`}>
                      {column.render(user)}
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
                            aria-label={`Actions for ${user.fullName || user.email || 'user'}`}
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
                            onClick={() => onEdit(user)}
                            className="gap-2 rounded-lg px-2 py-2 text-[13px] focus:bg-[#F3F8FA] focus:text-[#0D1F3C]"
                          >
                            <Pencil className="text-[#4A6380]" />
                            Edit user
                          </DropdownMenuItem>
                          {user.active ? (
                            <DropdownMenuItem
                              onClick={() => onDeactivate(user)}
                              className="gap-2 rounded-lg px-2 py-2 text-[13px] focus:bg-[#F3F8FA] focus:text-[#0D1F3C]"
                            >
                              <CircleOff className="text-[#4A6380]" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => onActivate(user)}
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
                          onClick={() => onDelete(user)}
                          className="gap-2 rounded-lg px-2 py-2 text-[13px]"
                        >
                          <Trash2 />
                          Delete user
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

      {!loading && users.length > 0 && (
        <div className="border-t border-[#E8EDF3] bg-[#FAFBFD] px-4 py-3 text-xs text-[#7C8EA5]">
          {users.length.toLocaleString()} {users.length === 1 ? 'user' : 'users'}
        </div>
      )}
    </div>
  )
}
