import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Check,
  Clipboard,
  ExternalLink,
  ListFilter,
  LoaderCircle,
  MailPlus,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  X,
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type {
  SurveyRespondent,
  SurveyRespondentImportRow,
  SurveyOrganisationUser,
  SurveyResponse,
} from '../hooks/useSurveyDetails'

type SurveyRespondentsPanelProps = {
  respondents: SurveyRespondent[]
  responses: SurveyResponse[]
  respondentAssignmentEnabled: boolean
  respondentAssignmentDisabledReason?: string
  invitationsEnabled: boolean
  invitationDisabledReason?: string
  onLoadOrganisationUsers: () => Promise<SurveyOrganisationUser[]>
  onAddOrganisationUsers: (userIds: string[]) => Promise<unknown> | unknown
  onAddRespondents: (
    rows: SurveyRespondentImportRow[],
  ) => Promise<unknown> | unknown
  onRemoveRespondent: (respondentId: string) => Promise<unknown> | unknown
}

type InvitationRow = {
  id: string
  email: string
  name: string
  department: string
  job_title: string
}

type RowErrors = Partial<Record<'email' | 'name', string>>
type InvitationResult = {
  email: string
  status: 'sent' | 'queued' | 'failed' | 'skipped'
  message: string
}
type StatusFilter = 'all' | 'pending' | 'started' | 'completed'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PAGE_SIZE = 20
const ALL_USER_FILTERS = '__all__'
let rowSequence = 0

const inputClassName =
  'h-9 rounded-[9px] border-[#DCE4EE] bg-white px-3 text-[13px] text-[#0D1F3C] placeholder:text-[#9AA9BC] focus-visible:border-[#1BBFB0] focus-visible:ring-[#1BBFB0]/20 aria-invalid:border-[#D94A3A] aria-invalid:ring-[#D94A3A]/15'

function createInvitationRow(): InvitationRow {
  rowSequence += 1
  return {
    id: `invitation-row-${Date.now()}-${rowSequence}`,
    email: '',
    name: '',
    department: '',
    job_title: '',
  }
}

function messageFrom(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The respondent change could not be completed.'
}

function uniqueOptions(values: Array<string | null>): string[] {
  const options = new Map<string, string>()
  values.forEach((value) => {
    const trimmed = value?.trim()
    if (trimmed) options.set(trimmed.toLocaleLowerCase(), trimmed)
  })
  return [...options.values()].sort((first, second) =>
    first.localeCompare(second, undefined, { sensitivity: 'base' }))
}

function normaliseFilterValue(value: string | null): string {
  return value?.trim().toLocaleLowerCase() || ''
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
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

function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—'
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))} sec`

  const totalMinutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  if (totalMinutes < 60) {
    return remainingSeconds > 0
      ? `${totalMinutes} min ${remainingSeconds} sec`
      : `${totalMinutes} min`
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`
}

function initials(respondent: SurveyRespondent): string {
  const source = respondent.name || respondent.email || '?'
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function invitationResults(value: unknown): InvitationResult[] {
  if (!value || typeof value !== 'object') return []
  const results = (value as Record<string, unknown>).results
  if (!Array.isArray(results)) return []

  return results.flatMap((result): InvitationResult[] => {
    if (!result || typeof result !== 'object') return []
    const record = result as Record<string, unknown>
    if (
      typeof record.email !== 'string' ||
      !['sent', 'queued', 'failed', 'skipped'].includes(String(record.status))
    ) return []

    return [{
      email: record.email.toLowerCase(),
      status: record.status as InvitationResult['status'],
      message: typeof record.message === 'string' ? record.message : '',
    }]
  })
}

export function completedRespondentIds(
  respondents: SurveyRespondent[],
  responses: SurveyResponse[],
): Set<string> {
  const ids = new Set(responses.map((response) => response.respondent_id))
  respondents.forEach((respondent) => {
    if (respondent.submitted_at) ids.add(respondent.id)
  })
  return ids
}

export function pendingReminderRespondentCount(
  respondents: SurveyRespondent[],
  responses: SurveyResponse[],
): number {
  const completed = completedRespondentIds(respondents, responses)
  return respondents.filter(
    (respondent) =>
      respondent.source !== 'open_link' &&
      Boolean(respondent.invited_at) &&
      !completed.has(respondent.id),
  ).length
}

function respondentStatus(
  respondent: SurveyRespondent,
  completedIds: Set<string>,
): Exclude<StatusFilter, 'all'> {
  if (completedIds.has(respondent.id)) return 'completed'
  if (respondent.started_at || respondent.draft_saved_at) return 'started'
  return 'pending'
}

function RespondentStatusBadge({ status }: { status: Exclude<StatusFilter, 'all'> }) {
  const styles = {
    pending: 'border-[#E7D6AE] bg-[#FFF9EA] text-[#8C681E]',
    started: 'border-[#BCD9EE] bg-[#EDF6FC] text-[#2479AF]',
    completed: 'border-[#9FE4DD] bg-[#E7F9F7] text-[#087C72]',
  }[status]

  return (
    <Badge variant="outline" className={styles}>
      <span className="capitalize">{status}</span>
    </Badge>
  )
}

export default function SurveyRespondentsPanel({
  respondents,
  responses,
  respondentAssignmentEnabled,
  respondentAssignmentDisabledReason = 'Respondents cannot be added to this survey.',
  invitationsEnabled,
  invitationDisabledReason = 'Invitations are unavailable for this survey.',
  onLoadOrganisationUsers,
  onAddOrganisationUsers,
  onAddRespondents,
  onRemoveRespondent,
}: SurveyRespondentsPanelProps) {
  const [showInvitationForm, setShowInvitationForm] = useState(false)
  const [showUserPicker, setShowUserPicker] = useState(false)
  const [organisationUsers, setOrganisationUsers] = useState<SurveyOrganisationUser[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [showUserFilters, setShowUserFilters] = useState(false)
  const [jobTitleFilter, setJobTitleFilter] = useState(ALL_USER_FILTERS)
  const [branchFilter, setBranchFilter] = useState(ALL_USER_FILTERS)
  const [employmentLevelFilter, setEmploymentLevelFilter] = useState(ALL_USER_FILTERS)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [addingUsers, setAddingUsers] = useState(false)
  const [rows, setRows] = useState<InvitationRow[]>(() => [createInvitationRow()])
  const [rowErrors, setRowErrors] = useState<Record<string, RowErrors>>({})
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [sending, setSending] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<SurveyRespondent | null>(null)
  const [copiedRespondentId, setCopiedRespondentId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error'
    message: string
  } | null>(null)

  const completedIds = useMemo(
    () => completedRespondentIds(respondents, responses),
    [respondents, responses],
  )
  const submittedAtByRespondent = useMemo(() => new Map(
    responses.map((response) => [response.respondent_id, response.submitted_at]),
  ), [responses])
  const stats = useMemo(() => ({
    total: respondents.length,
    completed: respondents.filter((respondent) => completedIds.has(respondent.id)).length,
    started: respondents.filter(
      (respondent) =>
        !completedIds.has(respondent.id) &&
        Boolean(respondent.started_at || respondent.draft_saved_at),
    ).length,
    pending: respondents.filter(
      (respondent) =>
        !completedIds.has(respondent.id) &&
        !respondent.started_at &&
        !respondent.draft_saved_at,
    ).length,
  }), [completedIds, respondents])

  const filteredRespondents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return respondents
      .filter((respondent) => {
        const status = respondentStatus(respondent, completedIds)
        if (statusFilter !== 'all' && status !== statusFilter) return false
        if (!query) return true
        return [
          respondent.name,
          respondent.email,
          respondent.department,
          respondent.job_title,
        ].some((value) => value?.toLocaleLowerCase().includes(query))
      })
      .sort((first, second) => {
        const firstDate = first.invited_at || first.started_at || ''
        const secondDate = second.invited_at || second.started_at || ''
        return secondDate.localeCompare(firstDate) ||
          (first.name || first.email).localeCompare(second.name || second.email)
      })
  }, [completedIds, respondents, search, statusFilter])
  const pageCount = Math.max(1, Math.ceil(filteredRespondents.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const visibleRespondents = filteredRespondents.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  const organisationUserFilterOptions = useMemo(() => ({
    jobTitles: uniqueOptions(organisationUsers.map((user) => user.jobTitle)),
    branches: uniqueOptions(organisationUsers.map((user) => user.branch)),
    employmentLevels: uniqueOptions(organisationUsers.map((user) => user.position)),
  }), [organisationUsers])
  const activeUserFilterCount = [
    jobTitleFilter,
    branchFilter,
    employmentLevelFilter,
  ].filter((value) => value !== ALL_USER_FILTERS).length

  const filteredOrganisationUsers = useMemo(() => {
    const query = userSearch.trim().toLocaleLowerCase()
    return organisationUsers.filter((user) => {
      const matchesSearch = !query || [
        user.fullName,
        user.email,
        user.department,
        user.jobTitle,
        user.position,
        user.branch,
        user.locationSite,
      ].some((value) => value?.toLocaleLowerCase().includes(query))
      const matchesJobTitle = jobTitleFilter === ALL_USER_FILTERS ||
        normaliseFilterValue(user.jobTitle) === normaliseFilterValue(jobTitleFilter)
      const matchesBranch = branchFilter === ALL_USER_FILTERS ||
        normaliseFilterValue(user.branch) === normaliseFilterValue(branchFilter)
      const matchesEmploymentLevel = employmentLevelFilter === ALL_USER_FILTERS ||
        normaliseFilterValue(user.position) === normaliseFilterValue(employmentLevelFilter)

      return matchesSearch && matchesJobTitle && matchesBranch && matchesEmploymentLevel
    })
  }, [
    branchFilter,
    employmentLevelFilter,
    jobTitleFilter,
    organisationUsers,
    userSearch,
  ])

  useEffect(() => {
    if (!showUserPicker || !respondentAssignmentEnabled) return
    let active = true
    setLoadingUsers(true)
    setFeedback(null)
    void onLoadOrganisationUsers()
      .then((users) => {
        if (active) setOrganisationUsers(users)
      })
      .catch((error) => {
        if (active) setFeedback({ tone: 'error', message: messageFrom(error) })
      })
      .finally(() => {
        if (active) setLoadingUsers(false)
      })
    return () => { active = false }
  }, [onLoadOrganisationUsers, respondentAssignmentEnabled, showUserPicker])

  function toggleUser(userId: string) {
    setSelectedUserIds((current) => {
      const next = new Set(current)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  function clearUserFilters() {
    setJobTitleFilter(ALL_USER_FILTERS)
    setBranchFilter(ALL_USER_FILTERS)
    setEmploymentLevelFilter(ALL_USER_FILTERS)
  }

  function closeUserPicker() {
    setShowUserPicker(false)
    setShowUserFilters(false)
    setUserSearch('')
    clearUserFilters()
    setSelectedUserIds(new Set())
  }

  function toggleVisibleUsers() {
    setSelectedUserIds((current) => {
      const next = new Set(current)
      const visibleIds = filteredOrganisationUsers.map((user) => user.id)
      const everyVisibleSelected = visibleIds.length > 0 &&
        visibleIds.every((userId) => next.has(userId))
      visibleIds.forEach((userId) => {
        if (everyVisibleSelected) next.delete(userId)
        else next.add(userId)
      })
      return next
    })
  }

  async function addSelectedUsers() {
    if (addingUsers || selectedUserIds.size === 0) return
    setAddingUsers(true)
    setFeedback(null)
    try {
      const result = await onAddOrganisationUsers([...selectedUserIds])
      const record = result && typeof result === 'object'
        ? result as Record<string, unknown>
        : {}
      const added = typeof record.added === 'number'
        ? record.added
        : selectedUserIds.size
      const skipped = typeof record.skipped === 'number' ? record.skipped : 0
      setFeedback({
        tone: 'success',
        message: `${added} organisation user${added === 1 ? '' : 's'} added${skipped > 0 ? `, ${skipped} already on the survey` : ''}.`,
      })
      setSelectedUserIds(new Set())
      setShowUserPicker(false)
      setShowUserFilters(false)
      setOrganisationUsers([])
      setUserSearch('')
      clearUserFilters()
    } catch (error) {
      setFeedback({ tone: 'error', message: messageFrom(error) })
    } finally {
      setAddingUsers(false)
    }
  }

  function updateRow(
    rowId: string,
    field: keyof Omit<InvitationRow, 'id'>,
    value: string,
  ) {
    setRows((current) => current.map((row) =>
      row.id === rowId ? { ...row, [field]: value } : row))
    if (field !== 'email' && field !== 'name') return
    setRowErrors((current) => ({
      ...current,
      [rowId]: { ...current[rowId], [field]: undefined },
    }))
    setFeedback(null)
  }

  function removeInvitationRow(rowId: string) {
    setRows((current) => current.length === 1
      ? current
      : current.filter((row) => row.id !== rowId))
    setRowErrors((current) => {
      const next = { ...current }
      delete next[rowId]
      return next
    })
  }

  function validateRows(): boolean {
    const nextErrors: Record<string, RowErrors> = {}
    const emails = new Set<string>()

    rows.forEach((row) => {
      const email = row.email.trim().toLowerCase()
      const errors: RowErrors = {}
      if (!EMAIL_PATTERN.test(email)) {
        errors.email = 'Enter a valid email address.'
      } else if (emails.has(email)) {
        errors.email = 'This email appears more than once.'
      } else {
        emails.add(email)
      }
      if (row.name.trim().length > 160) {
        errors.name = 'Use 160 characters or fewer.'
      }
      if (Object.keys(errors).length > 0) nextErrors[row.id] = errors
    })

    setRowErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function sendInvitations() {
    if (!invitationsEnabled || sending || !validateRows()) return
    setSending(true)
    setFeedback(null)

    try {
      const result = await onAddRespondents(rows.map((row) => ({
        email: row.email.trim().toLowerCase(),
        name: row.name.trim(),
        department: row.department.trim(),
        job_title: row.job_title.trim(),
      })))
      const results = invitationResults(result)
      const sent = results.filter(({ status }) => status === 'sent').length
      const queued = results.filter(({ status }) => status === 'queued').length
      const failed = results.filter(({ status }) => status === 'failed')
      const skipped = results.filter(({ status }) => status === 'skipped').length
      const summary = [
        sent > 0 ? `${sent} invitation${sent === 1 ? '' : 's'} sent` : null,
        queued > 0 ? `${queued} queued for survey opening` : null,
        failed.length > 0 ? `${failed.length} failed` : null,
        skipped > 0 ? `${skipped} skipped` : null,
      ].filter(Boolean).join(', ')

      setFeedback({
        tone: failed.length > 0 && sent === 0 ? 'error' : 'success',
        message: `${summary}.`,
      })

      const failedEmails = new Set(failed.map(({ email }) => email))
      const failedRows = rows.filter((row) =>
        failedEmails.has(row.email.trim().toLowerCase()))
      setRows(failedRows.length > 0 ? failedRows : [createInvitationRow()])
      setRowErrors({})
      if (failedRows.length === 0) setShowInvitationForm(false)
    } catch (error) {
      setFeedback({ tone: 'error', message: messageFrom(error) })
    } finally {
      setSending(false)
    }
  }

  async function copyRespondentLink(respondent: SurveyRespondent) {
    const link = `${window.location.origin}/assess/${respondent.token}`
    try {
      await navigator.clipboard.writeText(link)
      setCopiedRespondentId(respondent.id)
      window.setTimeout(() => setCopiedRespondentId(null), 1_800)
    } catch {
      setFeedback({ tone: 'error', message: 'The survey link could not be copied.' })
    }
  }

  async function confirmRemoveRespondent() {
    if (!removeTarget || removingId) return
    setRemovingId(removeTarget.id)
    setFeedback(null)

    try {
      await onRemoveRespondent(removeTarget.id)
      setFeedback({
        tone: 'success',
        message: `${removeTarget.name || removeTarget.email || 'The respondent'} was removed.`,
      })
      setRemoveTarget(null)
    } catch (error) {
      setFeedback({ tone: 'error', message: messageFrom(error) })
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <section className="rounded-2xl border border-[#DFE6EE] bg-white shadow-[0_8px_24px_rgba(13,31,60,0.04)]">
      <div className="flex flex-col gap-4 border-b border-[#E8EDF3] px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 lg:flex-1">
          <h2 className="font-['Plus_Jakarta_Sans'] text-xl font-extrabold text-[#0D1F3C]">
            Respondents
          </h2>
          <p className="mt-1 text-sm text-[#8A9BB0]">
            Add company users, invite by email and monitor participation for this survey only.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 xl:shrink-0 xl:flex-nowrap">
          <Badge variant="outline" className="border-[#DCE4EE] bg-[#F7F9FB] text-[#526A88]">
            <Users className="size-3" /> {stats.total} total
          </Badge>
          <Badge variant="outline" className="border-[#9FE4DD] bg-[#E7F9F7] text-[#087C72]">
            <UserCheck className="size-3" /> {stats.completed} completed
          </Badge>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowUserPicker(true)
              setShowInvitationForm(false)
              setFeedback(null)
            }}
            disabled={!respondentAssignmentEnabled || addingUsers}
            title={!respondentAssignmentEnabled
              ? respondentAssignmentDisabledReason
              : undefined}
            className="border-[#A9D8D3] bg-white font-bold text-[#087C72] hover:bg-[#EAF8F6] hover:text-[#087C72]"
          >
            <UserPlus />
            Add company users
          </Button>
          <Button
            type="button"
            onClick={() => {
              setShowInvitationForm(true)
              closeUserPicker()
              setFeedback(null)
            }}
            disabled={!invitationsEnabled || sending}
            title={!invitationsEnabled ? invitationDisabledReason : undefined}
            className="bg-[#1BBFB0] font-bold text-white hover:bg-[#16A99C]"
          >
            <MailPlus />
            Invite by email
          </Button>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {feedback && (
          <Alert
            variant={feedback.tone === 'error' ? 'destructive' : 'default'}
            className={feedback.tone === 'error'
              ? 'border-[#F4B6AE] bg-[#FFF5F3]'
              : 'border-[#A9E2DC] bg-[#F0FBF9] text-[#087C72]'}
          >
            {feedback.tone === 'error' ? <AlertCircle /> : <Check />}
            <AlertDescription>{feedback.message}</AlertDescription>
          </Alert>
        )}

        {showUserPicker && respondentAssignmentEnabled && (
          <div className="rounded-2xl border border-[#B8DDD9] bg-[#F5FBFA] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-bold text-[#0D1F3C]">Add company users</h3>
                <p className="mt-1 text-xs text-[#8A9BB0]">
                  Select active users from this survey&apos;s organisation. Invitations are sent according to the survey schedule.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={closeUserPicker}
                disabled={addingUsers}
                aria-label="Close company user picker"
              >
                <X />
              </Button>
            </div>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8A9BB0]" />
                <Input
                  type="search"
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Search company users"
                  className="h-9 rounded-[9px] border-[#DCE4EE] bg-white pr-3 pl-9 text-[13px]"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUserFilters((current) => !current)}
                  className={activeUserFilterCount > 0
                    ? 'border-[#A9D8D3] bg-[#EAF8F6] text-[#087C72] hover:bg-[#DDF4F1] hover:text-[#087C72]'
                    : 'border-[#DCE4EE] text-[#526A88]'}
                  aria-expanded={showUserFilters}
                >
                  <ListFilter />
                  Filters{activeUserFilterCount > 0 ? ` (${activeUserFilterCount})` : ''}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleVisibleUsers}
                  disabled={loadingUsers || filteredOrganisationUsers.length === 0}
                  className="border-[#DCE4EE] text-[#526A88]"
                >
                  {filteredOrganisationUsers.length > 0 &&
                  filteredOrganisationUsers.every((user) => selectedUserIds.has(user.id))
                    ? 'Clear visible'
                    : 'Select visible'}
                </Button>
              </div>
            </div>

            {showUserFilters && (
              <div className="mt-3 grid gap-2 rounded-xl border border-[#DFE8EC] bg-white p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
                <Select
                  value={jobTitleFilter}
                  onValueChange={(value) => setJobTitleFilter(value ?? ALL_USER_FILTERS)}
                >
                  <SelectTrigger aria-label="Filter by job title">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_USER_FILTERS}>All job titles</SelectItem>
                    {organisationUserFilterOptions.jobTitles.map((jobTitle) => (
                      <SelectItem key={jobTitle} value={jobTitle}>{jobTitle}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={branchFilter}
                  onValueChange={(value) => setBranchFilter(value ?? ALL_USER_FILTERS)}
                >
                  <SelectTrigger aria-label="Filter by branch">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_USER_FILTERS}>All branches</SelectItem>
                    {organisationUserFilterOptions.branches.map((branch) => (
                      <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={employmentLevelFilter}
                  onValueChange={(value) => setEmploymentLevelFilter(value ?? ALL_USER_FILTERS)}
                >
                  <SelectTrigger aria-label="Filter by employment level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_USER_FILTERS}>All employment levels</SelectItem>
                    {organisationUserFilterOptions.employmentLevels.map((level) => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearUserFilters}
                  disabled={activeUserFilterCount === 0}
                  className="text-[#526A88]"
                >
                  Clear
                </Button>
              </div>
            )}

            <div className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-[#DFE8EC] bg-white">
              {loadingUsers ? (
                <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-[#7C8EA5]">
                  <LoaderCircle className="size-4 animate-spin" /> Loading company users…
                </div>
              ) : filteredOrganisationUsers.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="font-semibold text-[#314966]">
                    {organisationUsers.length === 0
                      ? 'All eligible company users are already respondents.'
                      : 'No company users match the current search and filters.'}
                  </div>
                  <div className="mt-1 text-xs text-[#8A9BB0]">
                    Only active client accounts from this organisation are shown.
                  </div>
                </div>
              ) : (
                filteredOrganisationUsers.map((user) => (
                  <label
                    key={user.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-[#EDF1F4] px-4 py-3 last:border-b-0 hover:bg-[#F7FBFB]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.has(user.id)}
                      onChange={() => toggleUser(user.id)}
                      disabled={addingUsers}
                      className="size-4 accent-[#1BBFB0]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-[#0D1F3C]">
                        {user.fullName || 'Name not supplied'}
                      </div>
                      <div className="truncate text-xs text-[#7C8EA5]">{user.email}</div>
                    </div>
                    <div className="hidden min-w-0 text-right text-xs text-[#526A88] sm:block">
                      <div className="max-w-48 truncate font-semibold">
                        {user.department || 'No department'}
                      </div>
                      <div className="max-w-48 truncate text-[#8A9BB0]">
                        {user.jobTitle || user.position || 'No job title'}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-semibold text-[#526A88]">
                {selectedUserIds.size} selected
              </div>
              <Button
                type="button"
                onClick={() => void addSelectedUsers()}
                disabled={addingUsers || selectedUserIds.size === 0}
                className="bg-[#1BBFB0] font-bold text-white hover:bg-[#16A99C]"
              >
                {addingUsers ? <LoaderCircle className="animate-spin" /> : <UserPlus />}
                Add {selectedUserIds.size || ''} user{selectedUserIds.size === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        )}

        {showUserPicker && !respondentAssignmentEnabled && (
          <Alert className="border-[#E7D6AE] bg-[#FFF9EA] text-[#785817]">
            <AlertCircle />
            <AlertDescription>{respondentAssignmentDisabledReason}</AlertDescription>
          </Alert>
        )}

        {showInvitationForm && invitationsEnabled && (
          <div className="rounded-2xl border border-[#CFE1E9] bg-[#F8FBFC] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-[#0D1F3C]">New invitations</h3>
                <p className="mt-1 text-xs text-[#8A9BB0]">
                  Each person receives a unique survey link through Postmark.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowInvitationForm(false)}
                disabled={sending}
                aria-label="Close invitation form"
              >
                <X />
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {rows.map((row, index) => (
                <div
                  key={row.id}
                  className="grid gap-3 rounded-xl border border-[#E1E8EF] bg-white p-3 lg:grid-cols-[1.15fr_1fr_0.8fr_0.8fr_auto]"
                >
                  <div>
                    <Label htmlFor={`${row.id}-email`} className="mb-1 text-xs text-[#526A88]">
                      Email <span className="text-[#D94A3A]">*</span>
                    </Label>
                    <Input
                      id={`${row.id}-email`}
                      type="email"
                      value={row.email}
                      onChange={(event) => updateRow(row.id, 'email', event.target.value)}
                      disabled={sending}
                      aria-invalid={Boolean(rowErrors[row.id]?.email)}
                      placeholder="person@company.com"
                      className={inputClassName}
                    />
                    {rowErrors[row.id]?.email && (
                      <p className="mt-1 text-xs text-[#D94A3A]">{rowErrors[row.id]?.email}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor={`${row.id}-name`} className="mb-1 text-xs text-[#526A88]">
                      Name
                    </Label>
                    <Input
                      id={`${row.id}-name`}
                      value={row.name}
                      onChange={(event) => updateRow(row.id, 'name', event.target.value)}
                      disabled={sending}
                      aria-invalid={Boolean(rowErrors[row.id]?.name)}
                      placeholder="Full name"
                      className={inputClassName}
                    />
                    {rowErrors[row.id]?.name && (
                      <p className="mt-1 text-xs text-[#D94A3A]">{rowErrors[row.id]?.name}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor={`${row.id}-department`} className="mb-1 text-xs text-[#526A88]">
                      Department
                    </Label>
                    <Input
                      id={`${row.id}-department`}
                      value={row.department}
                      onChange={(event) => updateRow(row.id, 'department', event.target.value)}
                      disabled={sending}
                      placeholder="Finance"
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${row.id}-job-title`} className="mb-1 text-xs text-[#526A88]">
                      Job title
                    </Label>
                    <Input
                      id={`${row.id}-job-title`}
                      value={row.job_title}
                      onChange={(event) => updateRow(row.id, 'job_title', event.target.value)}
                      disabled={sending}
                      placeholder="Manager"
                      className={inputClassName}
                    />
                  </div>
                  <div className="flex items-end justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeInvitationRow(row.id)}
                      disabled={sending || rows.length === 1}
                      aria-label={`Remove invitation row ${index + 1}`}
                      className="text-[#A44B3B] hover:bg-[#FFF1EF]"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRows((current) => [...current, createInvitationRow()])}
                disabled={sending || rows.length >= 250}
                className="border-[#DCE4EE] text-[#526A88]"
              >
                <Plus />
                Add person
              </Button>
              <Button
                type="button"
                onClick={() => void sendInvitations()}
                disabled={sending || rows.length === 0}
                className="bg-[#1BBFB0] font-bold text-white hover:bg-[#16A99C]"
              >
                {sending ? <LoaderCircle className="animate-spin" /> : <MailPlus />}
                Send {rows.length} invitation{rows.length === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        )}

        {showInvitationForm && !invitationsEnabled && (
          <Alert className="border-[#E7D6AE] bg-[#FFF9EA] text-[#785817]">
            <AlertCircle />
            <AlertDescription>{invitationDisabledReason}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8A9BB0]" />
            <Input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search name, email, department or job title"
              className="h-9 rounded-[9px] border-[#DCE4EE] bg-[#FAFBFD] pr-3 pl-9 text-[13px]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter)
              setPage(1)
            }}
            aria-label="Filter respondents by status"
            className="h-9 rounded-[9px] border border-[#DCE4EE] bg-white px-3 text-[13px] text-[#314966] outline-none focus:border-[#1BBFB0] focus:ring-3 focus:ring-[#1BBFB0]/20"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending ({stats.pending})</option>
            <option value="started">Started ({stats.started})</option>
            <option value="completed">Completed ({stats.completed})</option>
          </select>
        </div>

        {visibleRespondents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#CAD7E5] bg-[#FAFCFD] px-6 py-12 text-center">
            <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-[#EAF4FB] text-[#2479AF]">
              <UserRound className="size-5" />
            </div>
            <h3 className="mt-3 font-bold text-[#0D1F3C]">
              {respondents.length === 0 ? 'No respondents yet' : 'No matching respondents'}
            </h3>
            <p className="mt-1 text-sm text-[#8A9BB0]">
              {respondents.length === 0
                ? 'Add company users now, or invite respondents by email when the schedule and branding are ready.'
                : 'Change the search or status filter to see more results.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleRespondents.map((respondent) => {
              const status = respondentStatus(respondent, completedIds)
              const link = `${window.location.origin}/assess/${respondent.token}`
              return (
                <article
                  key={respondent.id}
                  className="grid gap-3 rounded-xl border border-[#E1E8EF] bg-white p-3 md:grid-cols-[minmax(180px,1.2fr)_minmax(130px,0.7fr)_minmax(110px,0.6fr)_minmax(210px,0.9fr)_auto] md:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1BBFB0] to-[#3298C5] text-xs font-extrabold text-white">
                      {initials(respondent)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-[#0D1F3C]">
                        {respondent.name || 'Name not supplied'}
                      </div>
                      <div className="truncate text-xs text-[#7C8EA5]">
                        {respondent.email || 'Open-link respondent'}
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 text-xs text-[#526A88]">
                    <div className="truncate font-semibold">
                      {respondent.department || 'No department'}
                    </div>
                    <div className="mt-0.5 truncate text-[#8A9BB0]">
                      {respondent.job_title || 'No job title'}
                    </div>
                  </div>
                  <div>
                    <RespondentStatusBadge status={status} />
                    <div className="mt-1 text-[10px] text-[#9AA9BC] capitalize">
                      {respondent.source?.replace('_', ' ') || 'invited'}
                    </div>
                  </div>
                  <div className="grid gap-1 text-xs text-[#7C8EA5]">
                    <div className="flex justify-between gap-3">
                      <span className="font-semibold text-[#526A88]">Accesses</span>
                      <span className="text-right">
                        {respondent.access_count || 0} ({Math.max(0, (respondent.access_count || 0) - 1)} repeat)
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-semibold text-[#526A88]">Last accessed</span>
                      <span className="text-right">{formatDateTime(respondent.last_accessed_at)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-semibold text-[#526A88]">Started</span>
                      <span className="text-right">{formatDateTime(respondent.started_at)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-semibold text-[#526A88]">Submitted</span>
                      <span className="text-right">
                        {formatDateTime(
                          respondent.submitted_at || submittedAtByRespondent.get(respondent.id) || null,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-semibold text-[#526A88]">Time taken</span>
                      <span className="text-right">
                        {formatDuration(respondent.completion_duration_seconds)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    {status !== 'completed' && respondent.token && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => void copyRespondentLink(respondent)}
                          title="Copy unique survey link"
                          aria-label={`Copy survey link for ${respondent.name || respondent.email}`}
                          className="text-[#526A88] hover:bg-[#F2F7F8] hover:text-[#087C72]"
                        >
                          {copiedRespondentId === respondent.id ? <Check /> : <Clipboard />}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => window.open(link, '_blank', 'noopener,noreferrer')}
                          title="Open unique survey link"
                          aria-label={`Open survey link for ${respondent.name || respondent.email}`}
                          className="text-[#526A88] hover:bg-[#F2F7F8] hover:text-[#087C72]"
                        >
                          <ExternalLink />
                        </Button>
                      </>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setRemoveTarget(respondent)}
                      disabled={removingId !== null}
                      title="Remove respondent"
                      aria-label={`Remove ${respondent.name || respondent.email}`}
                      className="text-[#A44B3B] hover:bg-[#FFF1EF] hover:text-[#8F3527]"
                    >
                      {removingId === respondent.id
                        ? <LoaderCircle className="animate-spin" />
                        : <Trash2 />}
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {pageCount > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E8EDF3] pt-4">
            <div className="text-xs text-[#8A9BB0]">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredRespondents.length)} of {filteredRespondents.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage === 1}
              >
                Previous
              </Button>
              <span className="text-xs font-semibold text-[#526A88]">
                {safePage} / {pageCount}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                disabled={safePage === pageCount}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open && !removingId) setRemoveTarget(null)
        }}
      >
        <AlertDialogContent className="bg-white text-[#0D1F3C]">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-[#FFF1EF] text-[#A44B3B]">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle className="font-['Plus_Jakarta_Sans'] font-extrabold">
              Remove this respondent?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#7C8EA5]">
              {removeTarget && completedIds.has(removeTarget.id)
                ? 'This permanently deletes the respondent and their submitted survey response.'
                : 'This removes the invitation and prevents this unique link from being used.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={() => void confirmRemoveRespondent()}
              disabled={removingId !== null}
              className="bg-[#C94D3C] font-bold text-white hover:bg-[#AD3E30]"
            >
              {removingId && <LoaderCircle className="animate-spin" />}
              Remove respondent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
