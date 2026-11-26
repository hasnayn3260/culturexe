import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  LockKeyhole,
  Users,
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import SurveyBuilderWorkspace from '../components/SurveyBuilderWorkspace'
import SurveyLifecyclePanel from '../components/SurveyLifecyclePanel'
import SurveyManagementTabs from '../components/SurveyManagementTabs'
import SurveyRespondentsPanel, {
  pendingReminderRespondentCount,
} from '../components/SurveyRespondentsPanel'
import SurveySettingsPanel from '../components/SurveySettingsPanel'
import { useSurveyDetails } from '../hooks/useSurveyDetails'
import { useSurveyManagementState } from '../hooks/useSurveyManagementState'
import type { SurveyManagementTab } from '../types'
import SurveyListPage from './SurveyListPage'

const workspaceCopy: Record<
  Exclude<SurveyManagementTab, 'list'>,
  { eyebrow: string; title: string; description: string }
> = {
  builder: {
    eyebrow: 'Questionnaire',
    title: 'Survey Builder',
    description:
      'Build and arrange the questions for this specific survey run.',
  },
  controls: {
    eyebrow: 'Distribution',
    title: 'Survey Controls',
    description:
      'Manage respondents, invitations, reminders and the survey lifecycle.',
  },
  settings: {
    eyebrow: 'Configuration',
    title: 'Survey Settings',
    description:
      'Update the schedule, access options and general survey information.',
  },
}

function formatDate(value: string | null): string {
  if (!value) return 'Not scheduled'
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

function statusStyles(status: string | null): string {
  switch (status) {
    case 'live':
      return 'border-[#9FE4DD] bg-[#E7F9F7] text-[#087C72]'
    case 'scheduled':
      return 'border-[#BCD9EE] bg-[#EDF6FC] text-[#2479AF]'
    case 'closed':
      return 'border-[#E8C7C1] bg-[#FFF1EF] text-[#A44B3B]'
    default:
      return 'border-[#DCE3EA] bg-[#F3F5F7] text-[#6D7D90]'
  }
}

function WorkspaceLoading() {
  return (
    <section className="space-y-5 p-5 md:p-7" aria-label="Loading selected survey">
      <div className="rounded-2xl border border-[#DFE6EE] bg-white p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-8 w-72 max-w-full" />
        <Skeleton className="mt-4 h-16 w-full" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </section>
  )
}

export default function SurveyManagementPage() {
  const {
    selectedSurveyId,
    activeTab,
    hasSelection,
    openTab,
    showSurveyList,
    clearSelection,
  } = useSurveyManagementState()
  const details = useSurveyDetails(
    activeTab === 'list' ? null : selectedSurveyId,
  )

  const selectedWorkspace =
    activeTab === 'list' ? null : workspaceCopy[activeTab]
  const pendingRespondentCount = pendingReminderRespondentCount(
    details.respondents,
    details.responses,
  )
  const invitationsEnabled = Boolean(
    details.survey?.live_start &&
    details.survey.live_end &&
    details.effectiveStatus !== 'closed' &&
    details.survey.email_invitations_enabled,
  )
  const invitationDisabledReason = details.effectiveStatus === 'closed'
    ? 'Invitations cannot be sent after the survey has closed.'
    : details.survey && !details.survey.email_invitations_enabled
      ? 'Email invitations are disabled in this survey’s settings.'
    : 'Set both the opening and closing dates before inviting respondents.'
  const respondentAssignmentEnabled = details.effectiveStatus !== 'closed'
  const respondentAssignmentDisabledReason =
    'Respondents cannot be added after the survey has closed.'

  return (
    <div className="min-w-0">
      <div className="border-b border-[#DFE6EE] bg-white px-5 py-3 md:px-7">
        <SurveyManagementTabs
          activeTab={activeTab}
          hasSelection={hasSelection}
          onTabChange={openTab}
        />
      </div>

      {activeTab === 'list' && <SurveyListPage />}

      {activeTab !== 'list' && details.loading && <WorkspaceLoading />}

      {activeTab !== 'list' && !details.loading && details.error && (
        <section className="p-5 md:p-7">
          <Alert
            variant="destructive"
            className="border-[#F4B6AE] bg-[#FFF5F3]"
          >
            <AlertCircle />
            <AlertDescription className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{details.error}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => clearSelection({ replace: true })}
                className="shrink-0 border-[#E9A69B] bg-white text-[#A23D2D] hover:bg-[#FFF0ED]"
              >
                <ArrowLeft />
                Return to survey list
              </Button>
            </AlertDescription>
          </Alert>
        </section>
      )}

      {activeTab !== 'list' &&
        !details.loading &&
        !details.error &&
        details.survey &&
        selectedWorkspace && (
          <section className="min-w-0 space-y-5 p-5 md:p-7">
            <div className="overflow-hidden rounded-2xl border border-[#DFE6EE] bg-white shadow-[0_8px_24px_rgba(13,31,60,0.04)]">
              <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => showSurveyList()}
                    className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B9F93] transition hover:text-[#087C72]"
                  >
                    <ArrowLeft className="size-3.5" />
                    All surveys
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="min-w-0 font-['Plus_Jakarta_Sans'] text-2xl font-extrabold tracking-[-0.45px] text-[#0D1F3C] md:text-3xl">
                      {details.survey.title}
                    </h1>
                    <Badge
                      variant="outline"
                      className={statusStyles(details.effectiveStatus)}
                    >
                      <span className="capitalize">
                        {details.effectiveStatus || 'draft'}
                      </span>
                    </Badge>
                    {details.questionnaireLocked && (
                      <Badge
                        variant="outline"
                        className="border-[#E7D6AE] bg-[#FFF9EA] text-[#8C681E]"
                      >
                        <LockKeyhole className="size-3" />
                        Questionnaire locked
                      </Badge>
                    )}
                  </div>
                  {details.survey.description && (
                    <p className="mt-1 max-w-3xl text-sm text-[#7C8EA5]">
                      {details.survey.description}
                    </p>
                  )}
                </div>

                <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="rounded-xl bg-[#F5F8FB] px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.08em] text-[#8A9BB0] uppercase">
                      <ClipboardList className="size-3" />
                      Questions
                    </div>
                    <div className="mt-1 text-lg font-extrabold text-[#0D1F3C]">
                      {details.questions.length.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#F5F8FB] px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.08em] text-[#8A9BB0] uppercase">
                      <Users className="size-3" />
                      Respondents
                    </div>
                    <div className="mt-1 text-lg font-extrabold text-[#0D1F3C]">
                      {details.respondents.length.toLocaleString()}
                    </div>
                  </div>
                  <div className="col-span-2 rounded-xl bg-[#F5F8FB] px-3 py-2.5 sm:col-span-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.08em] text-[#8A9BB0] uppercase">
                      <CalendarDays className="size-3" />
                      Closes
                    </div>
                    <div className="mt-1 whitespace-nowrap text-xs font-bold text-[#314966]">
                      {formatDate(details.survey.live_end)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {activeTab === 'builder' ? (
              <SurveyBuilderWorkspace
                questions={details.questions}
                questionnaireLocked={details.questionnaireLocked}
                onAddQuestion={details.addQuestion}
                onUpdateQuestion={details.updateQuestion}
                onDeleteQuestion={details.deleteQuestion}
                onDeleteAllQuestions={details.deleteAllQuestions}
                onMoveQuestion={details.moveQuestion}
              />
            ) : activeTab === 'controls' ? (
              <div className="space-y-5">
                <SurveyLifecyclePanel
                  survey={details.survey}
                  effectiveStatus={details.effectiveStatus ?? 'draft'}
                  questionCount={details.questions.length}
                  pendingRespondentCount={pendingRespondentCount}
                  onUpdateSurvey={details.updateSurvey}
                  onSendReminders={details.sendReminders}
                />
                <SurveyRespondentsPanel
                  respondents={details.respondents}
                  responses={details.responses}
                  respondentAssignmentEnabled={respondentAssignmentEnabled}
                  respondentAssignmentDisabledReason={respondentAssignmentDisabledReason}
                  invitationsEnabled={invitationsEnabled}
                  invitationDisabledReason={invitationDisabledReason}
                  onLoadOrganisationUsers={details.listOrganisationUsers}
                  onAddOrganisationUsers={details.addOrganisationUsers}
                  onAddRespondents={details.addRespondents}
                  onRemoveRespondent={details.removeRespondent}
                />
              </div>
            ) : activeTab === 'settings' ? (
              <SurveySettingsPanel
                survey={details.survey}
                effectiveStatus={details.effectiveStatus ?? 'draft'}
                onSave={details.updateSurvey}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-[#CAD7E5] bg-white px-6 py-14 text-center">
                <div className="text-xs font-bold tracking-[0.16em] text-[#1BBFB0] uppercase">
                  {selectedWorkspace.eyebrow}
                </div>
                <h2 className="mt-2 font-['Plus_Jakarta_Sans'] text-2xl font-extrabold text-[#0D1F3C]">
                  {selectedWorkspace.title}
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#7C8EA5]">
                  {selectedWorkspace.description}
                </p>
              </div>
            )}
          </section>
        )}
    </div>
  )
}
