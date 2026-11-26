import { useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  UserRound,
  UserX,
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ALL_ORGANISATIONS,
  useOrganisationScope,
} from '@/context/OrganisationScopeContext'
import { useOrganisations } from '@/features/organisations/hooks/useOrganisations'

import UserActionDialog, {
  type UserConfirmationAction,
} from '../components/UserActionDialog'
import UserFormDialog from '../components/UserFormDialog'
import UserImportDialog from '../components/UserImportDialog'
import UsersTable from '../components/UsersTable'
import UsersToolbar from '../components/UsersToolbar'
import { useUsers } from '../hooks/useUsers'
import type { UserImportValues } from '../import/userImportSchema'
import type { BulkUserImportResponse } from '../services/usersClient'
import type {
  ManagedUser,
  UserFilters,
  UserFormValues,
  UserSort,
  UserSortKey,
} from '../types'
import { DEFAULT_USER_FILTERS, DEFAULT_USER_SORT } from '../types'

function searchableText(user: ManagedUser): string {
  return [
    user.id,
    user.fullName,
    user.email,
    user.authEmail,
    user.profileEmail,
    user.phone,
    user.username,
    user.organisation?.name,
    user.department,
    user.branch,
    user.manager?.fullName,
    user.manager?.email,
    user.locationSite,
    user.jobTitle,
    user.position,
    user.role,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function sortValue(user: ManagedUser, key: UserSortKey): string | number {
  switch (key) {
    case 'id': return user.id
    case 'fullName': return user.fullName || ''
    case 'email': return user.email || ''
    case 'phone': return user.phone || ''
    case 'organisation': return user.organisation?.name || ''
    case 'department': return user.department || ''
    case 'branch': return user.branch || ''
    case 'manager': return user.manager?.fullName || user.manager?.email || ''
    case 'locationSite': return user.locationSite || ''
    case 'jobTitle': return user.jobTitle || ''
    case 'position': return user.position || ''
    case 'hireDate': return user.hireDate || ''
    case 'username': return user.username || ''
    case 'role': return user.role || ''
    case 'active': return user.active ? 1 : 0
    case 'providers': return user.providers.join(', ')
    case 'providerType': return user.providerType || ''
    case 'authCreatedAt': return user.authCreatedAt || ''
    case 'lastSignInAt': return user.lastSignInAt || ''
  }
}

function compareUsers(first: ManagedUser, second: ManagedUser, sort: UserSort) {
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
  icon: typeof UserRound
  tone: 'blue' | 'teal' | 'grey' | 'navy'
}) {
  const tones = {
    blue: 'bg-[#EAF4FB] text-[#2479AF]',
    teal: 'bg-[#E5F8F5] text-[#0A8A7E]',
    grey: 'bg-[#F0F3F6] text-[#6D7D90]',
    navy: 'bg-[#E9EEF5] text-[#1A3560]',
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

export default function UsersPage() {
  const { organisationScope } = useOrganisationScope()
  const {
    users,
    loading,
    error,
    pendingMutation,
    refetch,
    createUser,
    updateUser,
    activateUser,
    deactivateUser,
    deleteUser,
    importUsers,
  } = useUsers()
  const organisationState = useOrganisations()
  const [filters, setFilters] = useState<UserFilters>({ ...DEFAULT_USER_FILTERS })
  const [sort, setSort] = useState<UserSort>({ ...DEFAULT_USER_SORT })
  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null)
  const [actionOpen, setActionOpen] = useState(false)
  const [actionUser, setActionUser] = useState<ManagedUser | null>(null)
  const [action, setAction] = useState<UserConfirmationAction>('deactivate')
  const [importOpen, setImportOpen] = useState(false)
  const [importSummary, setImportSummary] =
    useState<BulkUserImportResponse | null>(null)

  const globallyScopedUsers = useMemo(
    () => organisationScope === ALL_ORGANISATIONS
      ? users
      : users.filter((user) => user.organisationId === organisationScope),
    [organisationScope, users],
  )

  const globallyScopedOrganisations = useMemo(
    () => organisationScope === ALL_ORGANISATIONS
      ? organisationState.organisations
      : organisationState.organisations.filter(
        (organisation) => organisation.id === organisationScope,
      ),
    [organisationScope, organisationState.organisations],
  )

  const effectiveFilters = useMemo<UserFilters>(() => ({
    ...filters,
    organisationId:
      filters.organisationId === 'all' ||
      globallyScopedOrganisations.some(
        (organisation) => organisation.id === filters.organisationId,
      )
        ? filters.organisationId
        : 'all',
  }), [filters, globallyScopedOrganisations])

  const organisationScopedUsers = useMemo(
    () => effectiveFilters.organisationId === 'all'
      ? globallyScopedUsers
      : globallyScopedUsers.filter(
        (user) => user.organisationId === effectiveFilters.organisationId,
      ),
    [effectiveFilters.organisationId, globallyScopedUsers],
  )

  const visibleUsers = useMemo(() => {
    const query = effectiveFilters.search.trim().toLowerCase()

    return organisationScopedUsers
      .filter((user) => {
        if (query && !searchableText(user).includes(query)) return false
        if (
          effectiveFilters.role !== 'all' &&
          user.role !== effectiveFilters.role
        ) return false
        if (
          effectiveFilters.status !== 'all' &&
          user.active !== (effectiveFilters.status === 'active')
        ) return false
        if (
          effectiveFilters.department !== 'all' &&
          user.department !== effectiveFilters.department
        ) return false
        if (
          effectiveFilters.branch !== 'all' &&
          user.branch !== effectiveFilters.branch
        ) return false
        return true
      })
      .sort((first, second) => compareUsers(first, second, sort))
  }, [effectiveFilters, organisationScopedUsers, sort])

  const stats = useMemo(() => ({
    total: organisationScopedUsers.length,
    active: organisationScopedUsers.filter((user) => user.active).length,
    inactive: organisationScopedUsers.filter((user) => !user.active).length,
    superadmins: organisationScopedUsers.filter(
      (user) => user.role === 'superadmin',
    ).length,
  }), [organisationScopedUsers])

  function openCreateDialog() {
    setEditingUser(null)
    setFormOpen(true)
  }

  function openEditDialog(user: ManagedUser) {
    setEditingUser(user)
    setFormOpen(true)
  }

  function openActionDialog(
    user: ManagedUser,
    nextAction: UserConfirmationAction,
  ) {
    setActionUser(user)
    setAction(nextAction)
    setActionOpen(true)
  }

  async function submitUser(values: UserFormValues) {
    if (editingUser) {
      return updateUser({ ...values, id: editingUser.id })
    }

    return createUser(values)
  }

  async function confirmAction(
    user: ManagedUser,
    selectedAction: UserConfirmationAction,
  ) {
    if (selectedAction === 'activate') return activateUser(user.id)
    if (selectedAction === 'deactivate') return deactivateUser(user.id)
    return deleteUser(user.id)
  }

  async function submitImport({
    organisationId,
    rows,
  }: {
    organisationId: string
    rows: UserImportValues[]
  }) {
    const result = await importUsers(organisationId, rows)
    setImportSummary(result)
    return result
  }

  const pageError = error || organisationState.error
  const formPending = pendingMutation?.name === 'create' ||
    (pendingMutation?.name === 'update' && pendingMutation.userId === editingUser?.id)
  const actionPending = Boolean(
    pendingMutation && pendingMutation.userId === actionUser?.id,
  )
  const importPending = pendingMutation?.name === 'import'

  return (
    <section className="min-w-0 space-y-5 p-5 md:p-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#1BBFB0]">
            Configuration
          </div>
          <h1 className="mt-1 font-['Plus_Jakarta_Sans'] text-2xl font-extrabold tracking-[-0.5px] text-[#0D1F3C] md:text-3xl">
            Users and profiles
          </h1>
          <p className="mt-1 text-sm text-[#7C8EA5]">
            Manage authentication accounts, organisation assignments and employee details.
          </p>
        </div>
        {!loading && (
          <div className="text-sm text-[#7C8EA5]">
            Showing <span className="font-bold text-[#314966]">{visibleUsers.length}</span>
            {' '}of <span className="font-bold text-[#314966]">{organisationScopedUsers.length}</span>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={stats.total} icon={UserRound} tone="blue" />
        <StatCard label="Active" value={stats.active} icon={UserCheck} tone="teal" />
        <StatCard label="Inactive" value={stats.inactive} icon={UserX} tone="grey" />
        <StatCard label="Super admins" value={stats.superadmins} icon={ShieldCheck} tone="navy" />
      </div>

      {pageError && (
        <Alert variant="destructive" className="border-[#F4B6AE] bg-[#FFF5F3]">
          <AlertCircle />
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      )}

      {importSummary && (
        <Alert className={
          importSummary.failed > 0
            ? 'border-[#E6D7A8] bg-[#FFFCF2] text-[#765F20]'
            : 'border-[#A9E3DD] bg-[#F0FBF9] text-[#087C72]'
        }>
          {importSummary.failed > 0
            ? <AlertCircle />
            : <CheckCircle2 />}
          <AlertDescription className="text-current">
            <p>
              Import complete: {importSummary.created} created,{' '}
              {importSummary.updated} updated, {importSummary.skipped} skipped and{' '}
              {importSummary.failed} failed.
            </p>
            {importSummary.failed > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {importSummary.results
                  .filter((result) => result.status === 'failed')
                  .map((result) => (
                    <li key={`${result.rowNumber}-${result.email}`}>
                      Row {result.rowNumber} · {result.email || 'unknown email'} —{' '}
                      {result.message || 'Import failed without further details.'}
                    </li>
                  ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}

      <UsersToolbar
        filters={effectiveFilters}
        organisations={globallyScopedOrganisations}
        users={organisationScopedUsers}
        refreshing={loading || organisationState.loading}
        onFiltersChange={setFilters}
        onRefresh={() => void refetch()}
        onAddUser={openCreateDialog}
        onImportUsers={() => {
          setImportSummary(null)
          setImportOpen(true)
        }}
      />

      <UsersTable
        users={visibleUsers}
        loading={loading}
        sort={sort}
        onSortChange={setSort}
        onEdit={openEditDialog}
        onActivate={(user) => openActionDialog(user, 'activate')}
        onDeactivate={(user) => openActionDialog(user, 'deactivate')}
        onDelete={(user) => openActionDialog(user, 'delete')}
        pendingUserId={pendingMutation?.userId}
      />

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={editingUser ? 'edit' : 'create'}
        user={editingUser}
        organisations={organisationState.organisations}
        users={users}
        submitting={formPending}
        onSubmit={submitUser}
      />

      <UserActionDialog
        open={actionOpen}
        onOpenChange={setActionOpen}
        action={action}
        user={actionUser}
        pending={actionPending}
        onConfirm={confirmAction}
      />

      <UserImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        organisations={organisationState.organisations}
        submitting={importPending}
        onImport={submitImport}
      />
    </section>
  )
}
