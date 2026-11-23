import { useMemo } from 'react'
import { Download, Filter, Plus, RefreshCw, Search, Upload, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import type {
  ManagedUser,
  OrganisationReference,
  UserFilters,
} from '../types'
import { DEFAULT_USER_FILTERS } from '../types'
import { downloadUserImportTemplate } from '../import/downloadUserImportTemplate'

type UsersToolbarProps = {
  filters: UserFilters
  organisations: OrganisationReference[]
  users: ManagedUser[]
  refreshing?: boolean
  onFiltersChange: (filters: UserFilters) => void
  onRefresh: () => void
  onAddUser: () => void
  onImportUsers?: () => void
}

const selectClassName =
  'h-9 min-w-0 rounded-[9px] border border-[#DCE4EE] bg-white px-3 text-[13px] text-[#314966] outline-none transition focus:border-[#1BBFB0] focus:ring-3 focus:ring-[#1BBFB0]/20'

function uniqueValues(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())))]
    .sort((first, second) => first.localeCompare(second))
}

export default function UsersToolbar({
  filters,
  organisations,
  users,
  refreshing = false,
  onFiltersChange,
  onRefresh,
  onAddUser,
  onImportUsers,
}: UsersToolbarProps) {
  const departments = useMemo(
    () => uniqueValues(users.map((user) => user.department)),
    [users],
  )
  const branches = useMemo(
    () => uniqueValues(users.map((user) => user.branch)),
    [users],
  )

  const hasFilters =
    filters.search !== DEFAULT_USER_FILTERS.search ||
    filters.organisationId !== DEFAULT_USER_FILTERS.organisationId ||
    filters.role !== DEFAULT_USER_FILTERS.role ||
    filters.status !== DEFAULT_USER_FILTERS.status ||
    filters.department !== DEFAULT_USER_FILTERS.department ||
    filters.branch !== DEFAULT_USER_FILTERS.branch

  function update<Key extends keyof UserFilters>(
    key: Key,
    value: UserFilters[Key],
  ) {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="rounded-2xl border border-[#DFE6EE] bg-white p-4 shadow-[0_8px_24px_rgba(13,31,60,0.04)]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full xl:max-w-[360px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8A9BB0]" />
          <Input
            type="search"
            value={filters.search}
            onChange={(event) => update('search', event.target.value)}
            placeholder="Search name, email, username or UID"
            aria-label="Search users"
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
            aria-label="Refresh users"
            className="h-9 border-[#DCE4EE] bg-white px-3 text-[#526A88] hover:bg-[#F4F8FA] hover:text-[#0D1F3C]"
          >
            <RefreshCw className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={downloadUserImportTemplate}
            className="h-9 border-[#B8D9D5] bg-white px-3 text-[#087C72] hover:bg-[#EAF8F6] hover:text-[#087C72]"
          >
            <Download />
            Download template
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onImportUsers}
            disabled={!onImportUsers}
            className="h-9 border-[#AFCFDF] bg-white px-3 text-[#2479AF] hover:bg-[#EAF4FB] hover:text-[#1A6BAA]"
          >
            <Upload />
            Import CSV
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={onAddUser}
            className="h-9 bg-[#1BBFB0] px-4 font-bold text-white hover:bg-[#16A99C]"
          >
            <Plus />
            Add user
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#EDF1F5] pt-3">
        <div className="mr-1 flex items-center gap-1.5 text-xs font-semibold text-[#7C8EA5]">
          <Filter className="size-3.5" />
          Filters
        </div>

        <select
          value={filters.organisationId}
          onChange={(event) => update('organisationId', event.target.value)}
          aria-label="Filter by organisation"
          className={`${selectClassName} w-[190px]`}
        >
          <option value="all">All organisations</option>
          {organisations.map((organisation) => (
            <option key={organisation.id} value={organisation.id}>
              {organisation.name}
            </option>
          ))}
        </select>

        <select
          value={filters.role}
          onChange={(event) =>
            update('role', event.target.value as UserFilters['role'])}
          aria-label="Filter by platform role"
          className={`${selectClassName} w-[145px]`}
        >
          <option value="all">All roles</option>
          <option value="client">Client</option>
          <option value="superadmin">Super admin</option>
        </select>

        <select
          value={filters.status}
          onChange={(event) =>
            update('status', event.target.value as UserFilters['status'])}
          aria-label="Filter by account status"
          className={`${selectClassName} w-[130px]`}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={filters.department}
          onChange={(event) => update('department', event.target.value)}
          aria-label="Filter by department"
          className={`${selectClassName} w-[155px]`}
        >
          <option value="all">All departments</option>
          {departments.map((department) => (
            <option key={department} value={department}>{department}</option>
          ))}
        </select>

        <select
          value={filters.branch}
          onChange={(event) => update('branch', event.target.value)}
          aria-label="Filter by branch"
          className={`${selectClassName} w-[145px]`}
        >
          <option value="all">All branches</option>
          {branches.map((branch) => (
            <option key={branch} value={branch}>{branch}</option>
          ))}
        </select>

        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onFiltersChange({ ...DEFAULT_USER_FILTERS })}
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
