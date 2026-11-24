import { useMemo, useState } from 'react'
import {
  AlertCircle,
  BellRing,
  CalendarClock,
  Check,
  Clipboard,
  ExternalLink,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Play,
  RotateCcw,
  Square,
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

import type {
  SurveyDetail,
  SurveyUpdate,
} from '../hooks/useSurveyDetails'
import type { SurveyLifecycleStatus } from '../utils/surveyStatus'

type SurveyLifecyclePanelProps = {
  survey: SurveyDetail
  effectiveStatus: SurveyLifecycleStatus
  questionCount: number
  pendingRespondentCount: number
  onUpdateSurvey: (updates: SurveyUpdate) => Promise<unknown> | unknown
  onSendReminders: () => Promise<unknown> | unknown
}

type LifecycleAction = 'activate' | 'return-to-draft' | 'close' | 'reopen'
type PendingAction = LifecycleAction | 'reminders' | 'open-link' | null
type Feedback = { tone: 'success' | 'error'; message: string }

const statusCopy: Record<
  SurveyLifecycleStatus,
  { label: string; description: string; style: string }
> = {
  draft: {
    label: 'Draft',
    description: 'Only survey managers can access this survey.',
    style: 'border-[#DCE3EA] bg-[#F3F5F7] text-[#6D7D90]',
  },
  scheduled: {
    label: 'Scheduled',
    description: 'The survey will open automatically at its scheduled time.',
    style: 'border-[#BCD9EE] bg-[#EDF6FC] text-[#2479AF]',
  },
  live: {
    label: 'Live',
    description: 'Respondents can currently open and complete the survey.',
    style: 'border-[#9FE4DD] bg-[#E7F9F7] text-[#087C72]',
  },
  closed: {
    label: 'Closed',
    description: 'The survey is no longer accepting responses.',
    style: 'border-[#E8C7C1] bg-[#FFF1EF] text-[#A44B3B]',
  },
}

const actionCopy: Record<
  LifecycleAction,
  { title: string; description: string; confirm: string }
> = {
  activate: {
    title: 'Activate this survey?',
    description:
      'The survey will become scheduled or live according to its opening date. Its questionnaire will be locked.',
    confirm: 'Activate survey',
  },
  'return-to-draft': {
    title: 'Return this survey to draft?',
    description:
      'The scheduled opening will be paused and the questionnaire will become editable again.',
    confirm: 'Return to draft',
  },
  close: {
    title: 'Close this survey now?',
    description:
      'The closing time will be replaced with the current time and respondents will no longer be able to submit responses.',
    confirm: 'Close survey',
  },
  reopen: {
    title: 'Reopen this survey as a draft?',
    description:
      'The survey will remain unavailable to respondents until it is activated again.',
    confirm: 'Reopen as draft',
  },
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function messageFrom(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The survey control could not be updated.'
}

function countFrom(value: unknown, key: string): number {
  if (!value || typeof value !== 'object') return 0
  const count = (value as Record<string, unknown>)[key]
  return typeof count === 'number' && Number.isFinite(count) ? count : 0
}

export default function SurveyLifecyclePanel({
  survey,
  effectiveStatus,
  questionCount,
  pendingRespondentCount,
  onUpdateSurvey,
  onSendReminders,
}: SurveyLifecyclePanelProps) {
  const [confirmation, setConfirmation] = useState<LifecycleAction | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  const status = statusCopy[effectiveStatus]
  const openLink = useMemo(
    () => `${window.location.origin}/assess/open/${survey.open_link_token}`,
    [survey.open_link_token],
  )
  const activationLabel = survey.live_start &&
    new Date(survey.live_start).getTime() > Date.now()
    ? 'Schedule survey'
    : 'Launch survey'

  function activationError(): string | null {
    if (questionCount < 1) return 'Add at least one question before activating the survey.'
    if (!survey.live_start || !survey.live_end) {
      return 'Set both the opening and closing dates before activating the survey.'
    }

    const opening = new Date(survey.live_start).getTime()
    const closing = new Date(survey.live_end).getTime()
    if (!Number.isFinite(opening) || !Number.isFinite(closing)) {
      return 'Enter valid opening and closing dates before activating the survey.'
    }
    if (closing <= opening) return 'The closing date must be after the opening date.'
    if (closing <= Date.now()) return 'Choose a closing date in the future.'
    return null
  }

  function requestAction(action: LifecycleAction) {
    setFeedback(null)
    if (action === 'activate') {
      const validationMessage = activationError()
      if (validationMessage) {
        setFeedback({ tone: 'error', message: validationMessage })
        return
      }
    }
    setConfirmation(action)
  }

  async function confirmLifecycleAction() {
    if (!confirmation || pendingAction) return
    const action = confirmation
    setPendingAction(action)
    setFeedback(null)

    try {
      if (action === 'activate') {
        await onUpdateSurvey({ status: 'live' })
      } else if (action === 'close') {
        await onUpdateSurvey({
          status: 'closed',
          live_end: new Date().toISOString(),
        })
      } else {
        await onUpdateSurvey({ status: 'draft' })
      }

      setConfirmation(null)
      setFeedback({
        tone: 'success',
        message: action === 'activate'
          ? 'The survey lifecycle has been activated.'
          : action === 'close'
            ? 'The survey is now closed.'
            : 'The survey is now a draft.',
      })
    } catch (error) {
      setFeedback({ tone: 'error', message: messageFrom(error) })
    } finally {
      setPendingAction(null)
    }
  }

  async function sendReminders() {
    if (pendingAction) return
    setPendingAction('reminders')
    setFeedback(null)

    try {
      const result = await onSendReminders()
      const sent = countFrom(result, 'sent')
      const failed = countFrom(result, 'failed')
      const skipped = countFrom(result, 'skipped')
      const summary = [
        `${sent} reminder${sent === 1 ? '' : 's'} sent`,
        failed > 0 ? `${failed} failed` : null,
        skipped > 0 ? `${skipped} skipped` : null,
      ].filter(Boolean).join(', ')

      setFeedback({
        tone: failed > 0 && sent === 0 ? 'error' : 'success',
        message: `${summary}.`,
      })
    } catch (error) {
      setFeedback({ tone: 'error', message: messageFrom(error) })
    } finally {
      setPendingAction(null)
    }
  }

  async function toggleOpenLink() {
    if (pendingAction || effectiveStatus === 'closed') return
    setPendingAction('open-link')
    setFeedback(null)

    try {
      await onUpdateSurvey({ open_link_enabled: !survey.open_link_enabled })
      setFeedback({
        tone: 'success',
        message: survey.open_link_enabled
          ? 'Open-link access has been disabled.'
          : 'Open-link access has been enabled.',
      })
    } catch (error) {
      setFeedback({ tone: 'error', message: messageFrom(error) })
    } finally {
      setPendingAction(null)
    }
  }

  async function copyOpenLink() {
    try {
      await navigator.clipboard.writeText(openLink)
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), 1_800)
    } catch {
      setFeedback({
        tone: 'error',
        message: 'The link could not be copied. Copy it manually instead.',
      })
    }
  }

  return (
    <div className="space-y-5">
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(330px,0.85fr)]">
        <section className="rounded-2xl border border-[#DFE6EE] bg-white shadow-[0_8px_24px_rgba(13,31,60,0.04)]">
          <div className="border-b border-[#E8EDF3] px-5 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-['Plus_Jakarta_Sans'] text-xl font-extrabold text-[#0D1F3C]">
                  Survey lifecycle
                </h2>
                <p className="mt-1 text-sm text-[#8A9BB0]">
                  Control when the survey accepts responses.
                </p>
              </div>
              <Badge variant="outline" className={status.style}>
                {effectiveStatus === 'live' && (
                  <span className="size-1.5 animate-pulse rounded-full bg-[#1BBFB0]" />
                )}
                {status.label}
              </Badge>
            </div>
          </div>

          <div className="space-y-5 p-5">
            <div className="rounded-xl bg-[#F6F8FB] p-4">
              <p className="text-sm font-semibold text-[#314966]">
                {status.description}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[10px] font-bold tracking-[0.1em] text-[#8A9BB0] uppercase">
                    Opens
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#0D1F3C]">
                    {formatDateTime(survey.live_start)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold tracking-[0.1em] text-[#8A9BB0] uppercase">
                    Closes
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#0D1F3C]">
                    {formatDateTime(survey.live_end)}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {effectiveStatus === 'draft' && (
                <Button
                  type="button"
                  onClick={() => requestAction('activate')}
                  disabled={pendingAction !== null}
                  className="sm:col-span-2 bg-[#1BBFB0] font-bold text-white hover:bg-[#16A99C]"
                >
                  <Play />
                  {activationLabel}
                </Button>
              )}

              {effectiveStatus === 'scheduled' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => requestAction('return-to-draft')}
                  disabled={pendingAction !== null}
                  className="sm:col-span-2 border-[#DCE4EE] text-[#526A88]"
                >
                  <RotateCcw />
                  Return to draft
                </Button>
              )}

              {effectiveStatus === 'live' && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void sendReminders()}
                    disabled={pendingAction !== null || pendingRespondentCount === 0}
                    className="border-[#BDE1DD] text-[#087C72] hover:bg-[#F0FBF9]"
                  >
                    {pendingAction === 'reminders' ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <BellRing />
                    )}
                    Send reminders ({pendingRespondentCount})
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => requestAction('close')}
                    disabled={pendingAction !== null}
                    className="border-[#F0C8C1] text-[#A44B3B] hover:bg-[#FFF1EF]"
                  >
                    <Square />
                    Close survey
                  </Button>
                </>
              )}

              {effectiveStatus === 'closed' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => requestAction('reopen')}
                  disabled={pendingAction !== null}
                  className="sm:col-span-2 border-[#DCE4EE] text-[#526A88]"
                >
                  <RotateCcw />
                  Reopen as draft
                </Button>
              )}
            </div>

            {effectiveStatus === 'live' && pendingRespondentCount === 0 && (
              <p className="text-xs text-[#8A9BB0]">
                There are no invited, incomplete respondents to remind.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[#DFE6EE] bg-white shadow-[0_8px_24px_rgba(13,31,60,0.04)]">
          <div className="border-b border-[#E8EDF3] px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-['Plus_Jakarta_Sans'] text-xl font-extrabold text-[#0D1F3C]">
                  Open-link access
                </h2>
                <p className="mt-1 text-sm text-[#8A9BB0]">
                  Allow participation without an email invitation.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={survey.open_link_enabled}
                aria-label="Toggle open-link access"
                onClick={() => void toggleOpenLink()}
                disabled={pendingAction !== null || effectiveStatus === 'closed'}
                className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  survey.open_link_enabled ? 'bg-[#1BBFB0]' : 'bg-[#CBD5E1]'
                }`}
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${
                    survey.open_link_enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <Alert className="border-[#D7E3EC] bg-[#F7FAFC] text-[#526A88]">
              {effectiveStatus === 'closed' ? <LockKeyhole /> : <Link2 />}
              <AlertDescription>
                {effectiveStatus === 'closed'
                  ? 'Open-link settings cannot be changed after the survey has closed.'
                  : 'Anyone with this link can self-register and participate while the survey is live.'}
              </AlertDescription>
            </Alert>

            {survey.open_link_enabled && (
              <div>
                <div className="break-all rounded-xl border border-[#DCE5EE] bg-[#F6FAFB] p-3 text-xs font-medium leading-5 text-[#087C72]">
                  {openLink}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void copyOpenLink()}
                    className="border-[#DCE4EE] text-[#526A88]"
                  >
                    {linkCopied ? <Check /> : <Clipboard />}
                    {linkCopied ? 'Copied' : 'Copy link'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(openLink, '_blank', 'noopener,noreferrer')}
                    className="border-[#DCE4EE] text-[#526A88]"
                  >
                    <ExternalLink />
                    Preview
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <AlertDialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open && !pendingAction) setConfirmation(null)
        }}
      >
        <AlertDialogContent className="bg-white text-[#0D1F3C]">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-[#EAF7F5] text-[#087C72]">
              <CalendarClock />
            </AlertDialogMedia>
            <AlertDialogTitle className="font-['Plus_Jakarta_Sans'] font-extrabold">
              {confirmation ? actionCopy[confirmation].title : ''}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#7C8EA5]">
              {confirmation ? actionCopy[confirmation].description : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendingAction !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={() => void confirmLifecycleAction()}
              disabled={pendingAction !== null}
              className={confirmation === 'close'
                ? 'bg-[#C94D3C] font-bold text-white hover:bg-[#AD3E30]'
                : 'bg-[#1BBFB0] font-bold text-white hover:bg-[#16A99C]'}
            >
              {pendingAction && pendingAction !== 'reminders' && pendingAction !== 'open-link' && (
                <LoaderCircle className="animate-spin" />
              )}
              {confirmation ? actionCopy[confirmation].confirm : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
