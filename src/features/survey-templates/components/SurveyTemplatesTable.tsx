import { useMemo, useState, type KeyboardEvent } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  CircleCheck,
  CircleOff,
  FileStack,
  Globe2,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

import type { ManagedSurveyTemplateSummary } from '../services/surveyTemplatesClient'

type OrganisationOption = {
  id: string
  name: string
  tradingName?: string | null
}

type SortKey = 'name' | 'scope' | 'questionCount' | 'active' | 'updatedAt'
type SortDirection = 'asc' | 'desc'

type SurveyTemplatesTableProps = {
  templates: ManagedSurveyTemplateSummary[]
  organisations: OrganisationOption[]
  loading?: boolean
  pendingTemplateId?: string | null
  onEdit: (template: ManagedSurveyTemplateSummary) => void
  onSetActive: (
    template: ManagedSurveyTemplateSummary,
    active: boolean,
  ) => Promise<unknown> | unknown
  onDelete: (
    template: ManagedSurveyTemplateSummary,
  ) => Promise<unknown> | unknown
}

function formatDate(value: string): string {
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

function SortIcon({
  active,
  direction,
}: {
  active: boolean
  direction: SortDirection
}) {
  if (!active) return <ArrowUpDown className="size-3.5 text-[#A5B2C2]" />
  return direction === 'asc'
    ? <ArrowUp className="size-3.5 text-[#1BBFB0]" />
    : <ArrowDown className="size-3.5 text-[#1BBFB0]" />
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={active
        ? 'border-[#9FE4DD] bg-[#E7F9F7] text-[#087C72]'
        : 'border-[#DCE3EA] bg-[#F3F5F7] text-[#6D7D90]'}
    >
      <span className={`size-1.5 rounded-full ${active ? 'bg-[#1BBFB0]' : 'bg-[#94A3B8]'}`} />
      {active ? 'Active' : 'Inactive'}
    </Badge>
  )
}

export default function SurveyTemplatesTable({
  templates,
  organisations,
  loading = false,
  pendingTemplateId = null,
  onEdit,
  onSetActive,
  onDelete,
}: SurveyTemplatesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [deleteTarget, setDeleteTarget] =
    useState<ManagedSurveyTemplateSummary | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const organisationNames = useMemo(
    () => new Map(organisations.map((organisation) => [
      organisation.id,
      organisation.tradingName || organisation.name,
    ])),
    [organisations],
  )

  const sortedTemplates = useMemo(() => {
    const value = (
      template: ManagedSurveyTemplateSummary,
    ): string | number | boolean => {
      if (sortKey === 'name') return template.name.toLocaleLowerCase()
      if (sortKey === 'scope') {
        return template.organisationId
          ? organisationNames.get(template.organisationId)?.toLocaleLowerCase() || ''
          : ''
      }
      if (sortKey === 'questionCount') return template.questionCount
      if (sortKey === 'active') return template.active
      return Date.parse(template.updatedAt) || 0
    }

    return [...templates].sort((first, second) => {
      const firstValue = value(first)
      const secondValue = value(second)
      const comparison = typeof firstValue === 'string' && typeof secondValue === 'string'
        ? firstValue.localeCompare(secondValue)
        : Number(firstValue) - Number(secondValue)
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [organisationNames, sortDirection, sortKey, templates])

  function changeSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection(key === 'updatedAt' ? 'desc' : 'asc')
    }
  }

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    template: ManagedSurveyTemplateSummary,
  ) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onEdit(template)
  }

  function openDelete(template: ManagedSurveyTemplateSummary) {
    setDeleteTarget(template)
    setConfirmation('')
    setAcknowledged(false)
    setDeleteError(null)
  }

  function closeDelete(force = false) {
    if (!force && deleteTarget?.id === pendingTemplateId) return
    setDeleteTarget(null)
    setConfirmation('')
    setAcknowledged(false)
    setDeleteError(null)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleteError(null)
    try {
      await onDelete(deleteTarget)
      closeDelete(true)
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : 'The survey template could not be deleted.',
      )
    }
  }

  const deletePending = deleteTarget?.id === pendingTemplateId
  const canDelete = Boolean(
    deleteTarget &&
    confirmation.trim() === deleteTarget.name &&
    acknowledged,
  )

  const headers: Array<{ key: SortKey; label: string; className: string }> = [
    { key: 'name', label: 'Template', className: 'min-w-[260px]' },
    { key: 'scope', label: 'Scope', className: 'min-w-[220px]' },
    { key: 'questionCount', label: 'Questions', className: 'w-[130px]' },
    { key: 'active', label: 'Status', className: 'w-[130px]' },
    { key: 'updatedAt', label: 'Updated', className: 'min-w-[170px]' },
  ]

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-[#DFE6EE] bg-white shadow-[0_10px_28px_rgba(13,31,60,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-[#F7F9FC]">
              <tr className="border-b border-[#DFE6EE]">
                {headers.map((header) => (
                  <th
                    key={header.key}
                    scope="col"
                    className={`${header.className} px-5 py-3.5 font-semibold text-[#526A88]`}
                  >
                    <button
                      type="button"
                      onClick={() => changeSort(header.key)}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#1BBFB0]/30"
                    >
                      {header.label}
                      <SortIcon
                        active={sortKey === header.key}
                        direction={sortDirection}
                      />
                    </button>
                  </th>
                ))}
                <th className="w-16 px-5 py-3.5 text-right font-semibold text-[#526A88]">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E7ECF2]">
              {loading && Array.from({ length: 5 }, (_, index) => (
                <tr key={index}>
                  {Array.from({ length: 6 }, (__, cell) => (
                    <td key={cell} className="px-5 py-5">
                      <Skeleton className="h-5 w-full max-w-40" />
                    </td>
                  ))}
                </tr>
              ))}

              {!loading && sortedTemplates.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#E5F8F6] text-[#0A8A7E]">
                      <FileStack className="size-6" />
                    </div>
                    <h3 className="mt-4 font-['Plus_Jakarta_Sans'] text-lg font-extrabold text-[#0D1F3C]">
                      No survey templates found
                    </h3>
                    <p className="mt-1 text-sm text-[#8A9BB0]">
                      Create a reusable questionnaire to get started.
                    </p>
                  </td>
                </tr>
              )}

              {!loading && sortedTemplates.map((template) => {
                const pending = pendingTemplateId === template.id
                const organisationName = template.organisationId
                  ? organisationNames.get(template.organisationId) || 'Unknown organisation'
                  : null

                return (
                  <tr
                    key={template.id}
                    tabIndex={0}
                    onClick={() => onEdit(template)}
                    onKeyDown={(event) => handleRowKeyDown(event, template)}
                    className="cursor-pointer transition hover:bg-[#F8FBFC] focus:bg-[#F1FAF9] focus:outline-none"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#E5F8F6] text-[#087C72]">
                          <FileStack className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-bold text-[#0D1F3C]">
                            {template.name}
                          </div>
                          <div className="mt-0.5 max-w-75 truncate text-xs text-[#8A9BB0]">
                            {template.description || 'No description'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant="outline"
                        className={template.organisationId
                          ? 'border-[#BDE6E1] bg-[#ECFAF8] text-[#087C72]'
                          : 'border-[#CFE2ED] bg-[#F2F8FB] text-[#526A88]'}
                      >
                        {template.organisationId ? <Building2 /> : <Globe2 />}
                        {organisationName || 'Global'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 font-semibold text-[#314966]">
                      {template.questionCount.toLocaleString('en-ZA')}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge active={template.active} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-[#526A88]">
                      {formatDate(template.updatedAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={pending}
                              onClick={(event) => event.stopPropagation()}
                              aria-label={`Actions for ${template.name}`}
                            />
                          }
                        >
                          {pending
                            ? <LoaderCircle className="animate-spin" />
                            : <MoreHorizontal />}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          onClick={(event) => event.stopPropagation()}
                          className="w-52"
                        >
                          <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => onEdit(template)}>
                              <Pencil />
                              Edit template
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => void onSetActive(template, !template.active)}
                            >
                              {template.active ? <CircleOff /> : <CircleCheck />}
                              {template.active ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              onClick={() => openDelete(template)}
                              className="text-[#B64032] focus:text-[#B64032]"
                            >
                              <Trash2 />
                              Delete template
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => {
        if (!open) closeDelete()
      }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-[18px] bg-white p-6 text-[#0D1F3C] sm:max-w-125">
          <AlertDialogHeader className="items-start text-left">
            <AlertDialogMedia className="bg-[#FFF0EE] text-[#D94A3A]">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle className="font-['Plus_Jakarta_Sans'] font-extrabold">
              Permanently delete this template?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left leading-6 text-[#6D7D90]">
              Existing surveys created from this template will not change, but the
              template and all its reusable questions will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 rounded-xl border border-[#F1D1CC] bg-[#FFF8F7] p-4">
            <div>
              <Label htmlFor="delete-template-confirmation" className="mb-2 text-[#7A3B33]">
                Enter <span className="font-bold">{deleteTarget?.name}</span> to confirm
              </Label>
              <Input
                id="delete-template-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={deletePending}
                autoComplete="off"
                className="border-[#E8B9B2] bg-white focus-visible:border-[#D94A3A] focus-visible:ring-[#D94A3A]/20"
              />
            </div>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-5 text-[#7A3B33]">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                disabled={deletePending}
                className="mt-0.5 size-4 shrink-0 accent-[#D94A3A]"
              />
              <span>
                I understand this permanently removes the template and cannot be undone.
              </span>
            </label>
          </div>

          {deleteError && (
            <Alert variant="destructive" className="border-[#F4B6AE] bg-[#FFF5F3]">
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}

          <AlertDialogFooter className="-mx-6 -mb-6 rounded-b-[18px] border-[#E8EDF3] bg-[#F8FAFC] px-6 py-4">
            <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={() => void confirmDelete()}
              disabled={!canDelete || deletePending}
              className="bg-[#D94A3A] font-bold text-white hover:bg-[#C33D2F]"
            >
              {deletePending && <LoaderCircle className="animate-spin" />}
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
