import { useMemo, useState } from 'react'
import {
  AlertCircle,
  Building2,
  BuildingIcon,
  CircleOff,
  Clock3,
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'

import OrganisationActionDialog from '../components/OrganisationActionDialog'
import OrganisationFormDialog from '../components/OrganisationFormDialog'
import OrganisationsTable from '../components/OrganisationsTable'
import OrganisationsToolbar from '../components/OrganisationsToolbar'
import { useOrganisations } from '../hooks/useOrganisations'
import {
  DEFAULT_ORGANISATION_FILTERS,
  DEFAULT_ORGANISATION_SORT,
  type ManagedOrganisation,
  type OrganisationAction,
  type OrganisationFilters,
  type OrganisationFormValues,
  type OrganisationSort,
  type OrganisationSortKey,
} from '../types'

function searchableText(organisation: ManagedOrganisation): string {
  return [
    organisation.id,
    organisation.name,
    organisation.tradingName,
    organisation.registrationNumber,
    organisation.organisationType,
    organisation.sector,
    organisation.website,
    organisation.countryOfRegistration,
    organisation.registeredAddress,
    organisation.city,
    organisation.province,
    organisation.postalCode,
    organisation.country,
    organisation.generalEmail,
    organisation.mainPhone,
    organisation.emailDomain,
    organisation.contactFirstName,
    organisation.contactSurname,
    organisation.contactJobTitle,
    organisation.contactEmail,
    organisation.contactPhone,
    organisation.contactDepartment,
    organisation.externalReference,
    organisation.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function sortValue(
  organisation: ManagedOrganisation,
  key: OrganisationSortKey,
): string | number {
  switch (key) {
    case 'name': return organisation.name
    case 'tradingName': return organisation.tradingName || ''
    case 'registrationNumber': return organisation.registrationNumber || ''
    case 'organisationType': return organisation.organisationType || ''
    case 'sector': return organisation.sector || ''
    case 'employeeCount': return organisation.employeeCount ?? -1
    case 'country': return organisation.country || ''
    case 'contactName': return [
      organisation.contactFirstName,
      organisation.contactSurname,
    ].filter(Boolean).join(' ')
    case 'contactEmail': return organisation.contactEmail || ''
    case 'status': return organisation.status
    case 'createdAt': return organisation.createdAt || ''
    case 'updatedAt': return organisation.updatedAt
  }
}

function compareOrganisations(
  first: ManagedOrganisation,
  second: ManagedOrganisation,
  sort: OrganisationSort,
) {
  const firstValue = sortValue(first, sort.key)
  const secondValue = sortValue(second, sort.key)
  const direction = sort.direction === 'asc' ? 1 : -1

  if (typeof firstValue === 'number' && typeof secondValue === 'number') {
    return (firstValue - secondValue) * direction
  }

  return String(firstValue).localeCompare(String(secondValue), undefined, {
    numeric: true,
    sensitivity: 'base',
  }) * direction
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: typeof Building2
  tone: 'blue' | 'teal' | 'amber' | 'grey'
}) {
  const tones = {
    blue: 'bg-[#EAF4FB] text-[#2479AF]',
    teal: 'bg-[#E5F8F5] text-[#0A8A7E]',
    amber: 'bg-[#FFF6E8] text-[#B87524]',
    grey: 'bg-[#F0F3F6] text-[#6D7D90]',
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#DFE6EE] bg-white px-4 py-3 shadow-[0_6px_20px_rgba(13,31,60,0.04)]">
      <div className={`flex size-10 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-xl font-extrabold text-[#0D1F3C]">
          {value.toLocaleString()}
        </div>
        <div className="text-xs font-medium text-[#8A9BB0]">{label}</div>
      </div>
    </div>
  )
}

export default function OrganisationsPage() {
  const {
    organisations,
    loading,
    error,
    pendingMutation,
    refetch,
    createOrganisation,
    updateOrganisation,
    activateOrganisation,
    deactivateOrganisation,
    deleteOrganisation,
  } = useOrganisations()
  const [filters, setFilters] = useState<OrganisationFilters>({
    ...DEFAULT_ORGANISATION_FILTERS,
  })
  const [sort, setSort] = useState<OrganisationSort>({
    ...DEFAULT_ORGANISATION_SORT,
  })
  const [formOpen, setFormOpen] = useState(false)
  const [editingOrganisation, setEditingOrganisation] =
    useState<ManagedOrganisation | null>(null)
  const [actionOpen, setActionOpen] = useState(false)
  const [actionOrganisation, setActionOrganisation] =
    useState<ManagedOrganisation | null>(null)
  const [action, setAction] = useState<OrganisationAction>('deactivate')

  const visibleOrganisations = useMemo(() => {
    const query = filters.search.trim().toLowerCase()

    return organisations
      .filter((organisation) => {
        if (query && !searchableText(organisation).includes(query)) return false
        if (
          filters.status !== 'all' &&
          organisation.status !== filters.status
        ) return false
        if (
          filters.organisationType !== 'all' &&
          organisation.organisationType !== filters.organisationType
        ) return false
        if (
          filters.sector !== 'all' &&
          organisation.sector !== filters.sector
        ) return false
        if (
          filters.country !== 'all' &&
          organisation.country !== filters.country
        ) return false
        return true
      })
      .sort((first, second) => compareOrganisations(first, second, sort))
  }, [filters, organisations, sort])

  const stats = useMemo(() => ({
    total: organisations.length,
    active: organisations.filter((organisation) =>
      organisation.status === 'active').length,
    onboarding: organisations.filter((organisation) =>
      organisation.status === 'onboarding').length,
    inactive: organisations.filter((organisation) =>
      organisation.status === 'inactive').length,
  }), [organisations])

  function openCreateDialog() {
    setEditingOrganisation(null)
    setFormOpen(true)
  }

  function openEditDialog(organisation: ManagedOrganisation) {
    setEditingOrganisation(organisation)
    setFormOpen(true)
  }

  function openActionDialog(
    organisation: ManagedOrganisation,
    nextAction: OrganisationAction,
  ) {
    setActionOrganisation(organisation)
    setAction(nextAction)
    setActionOpen(true)
  }

  async function submitOrganisation(values: OrganisationFormValues) {
    if (editingOrganisation) {
      return updateOrganisation({ ...values, id: editingOrganisation.id })
    }

    return createOrganisation(values)
  }

  async function confirmAction(
    organisation: ManagedOrganisation,
    selectedAction: OrganisationAction,
  ) {
    if (selectedAction === 'activate') {
      return activateOrganisation(organisation.id)
    }
    if (selectedAction === 'deactivate') {
      return deactivateOrganisation(organisation.id)
    }
    return deleteOrganisation(organisation.id)
  }

  const formPending = pendingMutation?.name === 'create' || (
    pendingMutation?.name === 'update' &&
    pendingMutation.organisationId === editingOrganisation?.id
  )
  const actionPending = Boolean(
    pendingMutation &&
    pendingMutation.organisationId === actionOrganisation?.id,
  )

  return (
    <section className="min-w-0 space-y-5 p-5 md:p-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#1BBFB0]">
            Configuration
          </div>
          <h1 className="mt-1 font-['Plus_Jakarta_Sans'] text-2xl font-extrabold tracking-[-0.5px] text-[#0D1F3C] md:text-3xl">
            Organisations
          </h1>
          <p className="mt-1 text-sm text-[#7C8EA5]">
            Manage client organisations, account contacts and branded survey experiences.
          </p>
        </div>
        {!loading && (
          <div className="text-sm text-[#7C8EA5]">
            Showing <span className="font-bold text-[#314966]">
              {visibleOrganisations.length}
            </span>
            {' '}of <span className="font-bold text-[#314966]">
              {organisations.length}
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total organisations"
          value={stats.total}
          icon={Building2}
          tone="blue"
        />
        <StatCard
          label="Active"
          value={stats.active}
          icon={BuildingIcon}
          tone="teal"
        />
        <StatCard
          label="Onboarding"
          value={stats.onboarding}
          icon={Clock3}
          tone="amber"
        />
        <StatCard
          label="Inactive"
          value={stats.inactive}
          icon={CircleOff}
          tone="grey"
        />
      </div>

      {error && (
        <Alert variant="destructive" className="border-[#F4B6AE] bg-[#FFF5F3]">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <OrganisationsToolbar
        filters={filters}
        organisations={organisations}
        refreshing={loading}
        onFiltersChange={setFilters}
        onRefresh={() => void refetch()}
        onAddOrganisation={openCreateDialog}
      />

      <OrganisationsTable
        organisations={visibleOrganisations}
        loading={loading}
        sort={sort}
        onSortChange={setSort}
        onEdit={openEditDialog}
        onActivate={(organisation) =>
          openActionDialog(organisation, 'activate')}
        onDeactivate={(organisation) =>
          openActionDialog(organisation, 'deactivate')}
        onDelete={(organisation) =>
          openActionDialog(organisation, 'delete')}
        pendingOrganisationId={pendingMutation?.organisationId}
      />

      <OrganisationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={editingOrganisation ? 'edit' : 'create'}
        organisation={editingOrganisation}
        submitting={formPending}
        onSubmit={submitOrganisation}
      />

      <OrganisationActionDialog
        open={actionOpen}
        onOpenChange={setActionOpen}
        action={action}
        organisation={actionOrganisation}
        pending={actionPending}
        onConfirm={confirmAction}
      />
    </section>
  )
}
