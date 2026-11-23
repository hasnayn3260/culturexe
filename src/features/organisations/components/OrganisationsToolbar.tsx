import { useMemo } from 'react'
import { Filter, Plus, RefreshCw, Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import {
  DEFAULT_ORGANISATION_FILTERS,
  ORGANISATION_SECTORS,
  ORGANISATION_TYPES,
  type ManagedOrganisation,
  type OrganisationFilters,
} from '../types'

type OrganisationsToolbarProps = {
  filters: OrganisationFilters
  organisations: ManagedOrganisation[]
  refreshing?: boolean
  onFiltersChange: (filters: OrganisationFilters) => void
  onRefresh: () => void
  onAddOrganisation: () => void
}

const selectClassName =
  'h-9 min-w-0 rounded-[9px] border border-[#DCE4EE] bg-white px-3 text-[13px] text-[#314966] outline-none transition focus:border-[#1BBFB0] focus:ring-3 focus:ring-[#1BBFB0]/20'

function uniqueCountries(organisations: ManagedOrganisation[]): string[] {
  return [
    ...new Set(
      organisations
        .map((organisation) => organisation.country?.trim())
        .filter((country): country is string => Boolean(country)),
    ),
  ].sort((first, second) => first.localeCompare(second))
}

export default function OrganisationsToolbar({
  filters,
  organisations,
  refreshing = false,
  onFiltersChange,
  onRefresh,
  onAddOrganisation,
}: OrganisationsToolbarProps) {
  const countries = useMemo(
    () => uniqueCountries(organisations),
    [organisations],
  )

  const hasFilters =
    filters.search !== DEFAULT_ORGANISATION_FILTERS.search ||
    filters.status !== DEFAULT_ORGANISATION_FILTERS.status ||
    filters.organisationType !== DEFAULT_ORGANISATION_FILTERS.organisationType ||
    filters.sector !== DEFAULT_ORGANISATION_FILTERS.sector ||
    filters.country !== DEFAULT_ORGANISATION_FILTERS.country

  function update<Key extends keyof OrganisationFilters>(
    key: Key,
    value: OrganisationFilters[Key],
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
            placeholder="Search name, registration number, contact or location"
            aria-label="Search organisations"
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
            aria-label="Refresh organisations"
            className="h-9 border-[#DCE4EE] bg-white px-3 text-[#526A88] hover:bg-[#F4F8FA] hover:text-[#0D1F3C]"
          >
            <RefreshCw className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={onAddOrganisation}
            className="h-9 bg-[#1BBFB0] px-4 font-bold text-white hover:bg-[#16A99C]"
          >
            <Plus />
            Add organisation
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#EDF1F5] pt-3">
        <div className="mr-1 flex items-center gap-1.5 text-xs font-semibold text-[#7C8EA5]">
          <Filter className="size-3.5" />
          Filters
        </div>

        <select
          value={filters.status}
          onChange={(event) => update(
            'status',
            event.target.value as OrganisationFilters['status'],
          )}
          aria-label="Filter by organisation status"
          className={`${selectClassName} w-[140px]`}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="onboarding">Onboarding</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={filters.organisationType}
          onChange={(event) => update(
            'organisationType',
            event.target.value as OrganisationFilters['organisationType'],
          )}
          aria-label="Filter by organisation type"
          className={`${selectClassName} w-[210px]`}
        >
          <option value="all">All organisation types</option>
          {ORGANISATION_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <select
          value={filters.sector}
          onChange={(event) => update(
            'sector',
            event.target.value as OrganisationFilters['sector'],
          )}
          aria-label="Filter by sector"
          className={`${selectClassName} w-[220px]`}
        >
          <option value="all">All sectors</option>
          {ORGANISATION_SECTORS.map((sector) => (
            <option key={sector} value={sector}>{sector}</option>
          ))}
        </select>

        <select
          value={filters.country}
          onChange={(event) => update('country', event.target.value)}
          aria-label="Filter by country"
          className={`${selectClassName} w-[170px]`}
        >
          <option value="all">All countries</option>
          {countries.map((country) => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>

        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onFiltersChange({ ...DEFAULT_ORGANISATION_FILTERS })}
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
