import { useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CircleOff,
  FileStack,
  Globe2,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useOrganisations } from '@/features/organisations/hooks/useOrganisations'

import SurveyTemplateForm from '../components/SurveyTemplateForm'
import SurveyTemplatesTable from '../components/SurveyTemplatesTable'
import { useSurveyTemplates } from '../hooks/useSurveyTemplates'
import type {
  ManagedSurveyTemplateSummary,
  SurveyTemplateFormValues,
} from '../services/surveyTemplatesClient'

type PageMode = 'list' | 'create' | 'edit'
type ScopeFilter = 'all' | 'global' | 'organisation'
type StatusFilter = 'all' | 'active' | 'inactive'

const selectClassName =
  'h-11 rounded-xl border border-[#DCE4EE] bg-white px-3.5 text-sm text-[#314966] outline-none transition focus:border-[#1BBFB0] focus:ring-3 focus:ring-[#1BBFB0]/20'

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: typeof FileStack
  tone: 'blue' | 'teal' | 'purple' | 'grey'
}) {
  const tones = {
    blue: 'bg-[#EAF4FB] text-[#2479AF]',
    teal: 'bg-[#E5F8F5] text-[#0A8A7E]',
    purple: 'bg-[#F0EDFB] text-[#6D58A8]',
    grey: 'bg-[#F0F3F6] text-[#6D7D90]',
  }

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#DFE6EE] bg-white px-4 py-3 shadow-[0_6px_20px_rgba(13,31,60,0.04)]">
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-extrabold text-[#0D1F3C]">
          {value.toLocaleString('en-ZA')}
        </div>
        <div className="truncate text-xs font-medium text-[#8A9BB0]">
          {label}
        </div>
      </div>
    </div>
  )
}

export default function SurveyTemplatesPage() {
  const {
    templates,
    selectedTemplate,
    loading,
    loadingTemplate,
    error: templateError,
    pendingMutation,
    isMutating,
    refetch,
    selectTemplate,
    clearSelection,
    clearError,
    createTemplate,
    updateTemplate,
    changeTemplateActive,
    removeTemplate,
  } = useSurveyTemplates()
  const {
    organisations,
    loading: organisationsLoading,
    error: organisationError,
  } = useOrganisations()
  const [mode, setMode] = useState<PageMode>('list')
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState<ScopeFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [organisationId, setOrganisationId] = useState('all')
  const [openingTemplateId, setOpeningTemplateId] = useState<string | null>(null)

  const organisationNames = useMemo(
    () => new Map(organisations.map((organisation) => [
      organisation.id,
      organisation.tradingName || organisation.name,
    ])),
    [organisations],
  )

  const visibleTemplates = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return templates.filter((template) => {
      const organisationName = template.organisationId
        ? organisationNames.get(template.organisationId) || ''
        : 'global'
      const searchable = [
        template.name,
        template.description,
        organisationName,
      ].filter(Boolean).join(' ').toLocaleLowerCase()

      if (query && !searchable.includes(query)) return false
      if (scope === 'global' && template.organisationId) return false
      if (scope === 'organisation' && !template.organisationId) return false
      if (status === 'active' && !template.active) return false
      if (status === 'inactive' && template.active) return false
      if (
        organisationId !== 'all' &&
        template.organisationId !== organisationId
      ) return false
      return true
    })
  }, [organisationId, organisationNames, scope, search, status, templates])

  const stats = useMemo(() => ({
    total: templates.length,
    global: templates.filter((template) => !template.organisationId).length,
    organisation: templates.filter((template) => template.organisationId).length,
    inactive: templates.filter((template) => !template.active).length,
  }), [templates])

  function openCreate() {
    clearError()
    clearSelection()
    setMode('create')
  }

  async function openEdit(template: ManagedSurveyTemplateSummary) {
    if (openingTemplateId || isMutating) return
    clearError()
    setOpeningTemplateId(template.id)
    try {
      await selectTemplate(template.id)
      setMode('edit')
    } catch {
      // The hook exposes the request error in the page alert.
    } finally {
      setOpeningTemplateId(null)
    }
  }

  function returnToList() {
    clearError()
    clearSelection()
    setMode('list')
  }

  async function submitTemplate(values: SurveyTemplateFormValues) {
    if (mode === 'edit') {
      if (!selectedTemplate) {
        throw new Error('The selected survey template is unavailable.')
      }
      await updateTemplate(selectedTemplate.id, values)
    } else {
      await createTemplate(values)
    }
    returnToList()
  }

  const pageError = templateError || organisationError
  const formPending = pendingMutation?.action === 'create' || (
    pendingMutation?.action === 'update' &&
    pendingMutation.templateId === selectedTemplate?.id
  )

  if (mode !== 'list') {
    return (
      <section className="min-w-0 space-y-5 p-5 md:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={returnToList}
              disabled={formPending}
              aria-label="Return to survey templates"
              className="mt-1 border-[#D7E0EA] text-[#526A88]"
            >
              <ArrowLeft />
            </Button>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#1BBFB0]">
                Survey management · Survey templates
              </div>
              <h1 className="mt-1 font-['Plus_Jakarta_Sans'] text-2xl font-extrabold tracking-[-0.5px] text-[#0D1F3C] md:text-3xl">
                {mode === 'create' ? 'Create survey template' : 'Edit survey template'}
              </h1>
              <p className="mt-1 text-sm text-[#7C8EA5]">
                Build a reusable questionnaire without respondents, schedules or survey history.
              </p>
            </div>
          </div>
        </div>

        {pageError && (
          <Alert variant="destructive" className="border-[#F4B6AE] bg-[#FFF5F3]">
            <AlertCircle />
            <AlertDescription>{pageError}</AlertDescription>
          </Alert>
        )}

        {mode === 'edit' && (loadingTemplate || !selectedTemplate) ? (
          <div className="flex min-h-80 items-center justify-center rounded-2xl border border-[#DFE6EE] bg-white">
            <LoaderCircle className="size-7 animate-spin text-[#1BBFB0]" />
          </div>
        ) : (
          <SurveyTemplateForm
            template={mode === 'edit' ? selectedTemplate : null}
            organisations={organisations}
            pending={formPending}
            onSubmit={submitTemplate}
            onCancel={returnToList}
          />
        )}
      </section>
    )
  }

  return (
    <section className="min-w-0 space-y-5 p-5 md:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#1BBFB0]">
            Survey management
          </div>
          <h1 className="mt-1 font-['Plus_Jakarta_Sans'] text-2xl font-extrabold tracking-[-0.5px] text-[#0D1F3C] md:text-3xl">
            Survey templates
          </h1>
          <p className="mt-1 text-sm text-[#7C8EA5]">
            Manage reusable global and organisation-specific questionnaires.
          </p>
        </div>
        {!loading && (
          <div className="text-sm text-[#7C8EA5]">
            Showing <span className="font-bold text-[#314966]">
              {visibleTemplates.length}
            </span>{' '}
            of <span className="font-bold text-[#314966]">
              {templates.length}
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total templates" value={stats.total} icon={FileStack} tone="blue" />
        <StatCard label="Global" value={stats.global} icon={Globe2} tone="teal" />
        <StatCard label="Organisation-specific" value={stats.organisation} icon={Building2} tone="purple" />
        <StatCard label="Inactive" value={stats.inactive} icon={CircleOff} tone="grey" />
      </div>

      {pageError && (
        <Alert variant="destructive" className="border-[#F4B6AE] bg-[#FFF5F3]">
          <AlertCircle />
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-2xl border border-[#DFE6EE] bg-white p-4 shadow-[0_8px_24px_rgba(13,31,60,0.04)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#91A1B5]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search templates or organisations"
              className="h-11 rounded-xl border-[#DCE4EE] pl-10 text-[#0D1F3C] focus-visible:border-[#1BBFB0] focus-visible:ring-[#1BBFB0]/20"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:flex xl:shrink-0">
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value as ScopeFilter)}
              className={selectClassName}
              aria-label="Filter by template scope"
            >
              <option value="all">All scopes</option>
              <option value="global">Global</option>
              <option value="organisation">Organisation-specific</option>
            </select>
            <select
              value={organisationId}
              onChange={(event) => setOrganisationId(event.target.value)}
              className={selectClassName}
              aria-label="Filter by organisation"
            >
              <option value="all">All organisations</option>
              {organisations.map((organisation) => (
                <option key={organisation.id} value={organisation.id}>
                  {organisation.tradingName || organisation.name}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
              className={selectClassName}
              aria-label="Filter by template status"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-[#E8EDF3] pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetch({ silent: true })}
            disabled={loading || isMutating}
            className="border-[#D7E0EA] font-bold text-[#526A88]"
          >
            <RefreshCw />
            Refresh
          </Button>
          <Button
            type="button"
            onClick={openCreate}
            disabled={loading || organisationsLoading || isMutating}
            className="bg-[#1BBFB0] font-bold text-white hover:bg-[#16A99C]"
          >
            <Plus />
            Create template
          </Button>
        </div>
      </div>

      {openingTemplateId && (
        <div className="flex items-center gap-2 rounded-xl border border-[#BDE6E1] bg-[#ECFAF8] px-4 py-3 text-sm font-semibold text-[#087C72]">
          <LoaderCircle className="size-4 animate-spin" />
          Loading template editor…
        </div>
      )}

      <SurveyTemplatesTable
        templates={visibleTemplates}
        organisations={organisations}
        loading={loading}
        pendingTemplateId={pendingMutation?.templateId || openingTemplateId}
        onEdit={(template) => void openEdit(template)}
        onSetActive={(template, active) =>
          changeTemplateActive(template.id, active)}
        onDelete={(template) => removeTemplate(template.id)}
      />
    </section>
  )
}
