import { useMemo } from 'react'
import { ArrowRight, CalendarClock, CheckCircle2, ClipboardList } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getEffectiveSurveyStatus } from '@/features/survey/utils/surveyStatus'

type ClientAssignedSurvey = {
  id: string
  title?: string | null
  description?: string | null
  live_start?: string | null
  live_end?: string | null
  clientRespondent?: {
    started_at?: string | null
    draft_saved_at?: string | null
    submitted_at?: string | null
  } | null
}

type ClientActiveSurveysPageProps = {
  surveys: ClientAssignedSurvey[]
  onOpenSurvey: (surveyId: string) => void
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'Not scheduled'
  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

export default function ClientActiveSurveysPage({
  surveys,
  onOpenSurvey,
}: ClientActiveSurveysPageProps) {
  const orderedSurveys = useMemo(() => [...surveys].sort((left, right) => {
    const statusOrder = { live: 0, scheduled: 1, draft: 2, closed: 3 }
    const leftStatus = getEffectiveSurveyStatus(left) || 'draft'
    const rightStatus = getEffectiveSurveyStatus(right) || 'draft'
    const difference = statusOrder[leftStatus] - statusOrder[rightStatus]
    if (difference !== 0) return difference
    return new Date(right.live_start || 0).getTime() - new Date(left.live_start || 0).getTime()
  }), [surveys])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white px-6 py-6 shadow-[0_8px_28px_rgba(13,31,60,0.06)] ring-1 ring-[#DFE7EF] sm:px-8">
        <p className="text-xs font-bold tracking-[0.16em] text-[#0A8A7E] uppercase">Participation</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-[#0D1F3C]">Active surveys</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6D819A]">
          Only surveys you were added to or invited to are shown here.
        </p>
      </section>

      {orderedSurveys.length === 0 ? (
        <Card className="border-[#DFE6EE] shadow-[0_8px_24px_rgba(13,31,60,0.04)]">
          <CardContent className="py-14 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[#EEF5FB] text-[#2A78B5]">
              <ClipboardList />
            </div>
            <h2 className="mt-4 text-lg font-extrabold text-[#0D1F3C]">No surveys assigned</h2>
            <p className="mt-2 text-sm text-[#7A8DA5]">
              A survey will appear after you are added or invited.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {orderedSurveys.map((survey) => {
            const lifecycle = getEffectiveSurveyStatus(survey) || 'draft'
            const completed = Boolean(survey.clientRespondent?.submitted_at)
            const started = Boolean(
              survey.clientRespondent?.started_at || survey.clientRespondent?.draft_saved_at,
            )
            const statusLabel = completed
              ? 'Completed'
              : lifecycle === 'live'
                ? started ? 'In progress' : 'Open'
                : lifecycle === 'scheduled'
                  ? 'Upcoming'
                  : lifecycle === 'closed' ? 'Closed' : 'Not open'
            const StatusIcon = completed ? CheckCircle2 : CalendarClock

            return (
              <Card key={survey.id} className="border-[#DFE6EE] shadow-[0_8px_24px_rgba(13,31,60,0.04)]">
                <CardContent className="flex h-full flex-col p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF8F6] text-[#0A8A7E]">
                      <StatusIcon className="size-5" />
                    </div>
                    <Badge
                      variant="outline"
                      className={completed || lifecycle === 'live'
                        ? 'border-[#A9E1DB] bg-[#F0FAF8] text-[#087C72]'
                        : 'border-[#D6E2EE] bg-[#F5F8FB] text-[#526A88]'}
                    >
                      {statusLabel}
                    </Badge>
                  </div>
                  <h2 className="mt-4 text-lg font-extrabold text-[#0D1F3C]">{survey.title || 'Assigned survey'}</h2>
                  {survey.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6D819A]">{survey.description}</p>
                  )}
                  <div className="mt-4 grid gap-2 text-xs text-[#6D819A] sm:grid-cols-2">
                    <div><span className="font-bold text-[#314966]">Opens:</span> {formatDateTime(survey.live_start)}</div>
                    <div><span className="font-bold text-[#314966]">Closes:</span> {formatDateTime(survey.live_end)}</div>
                  </div>
                  <div className="mt-auto pt-5">
                    <Button
                      type="button"
                      onClick={() => onOpenSurvey(survey.id)}
                      className="w-full bg-[#1BBFB0] font-bold text-white hover:bg-[#16AFA1]"
                    >
                      {completed ? 'View survey status' : lifecycle === 'live' ? started ? 'Continue survey' : 'Open survey' : 'View schedule'}
                      <ArrowRight />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
