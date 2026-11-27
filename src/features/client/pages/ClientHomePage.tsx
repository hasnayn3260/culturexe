import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CalendarClock, CheckCircle2, Clock3, ClipboardList } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getEffectiveSurveyStatus } from '@/features/survey/utils/surveyStatus'

type ClientSurvey = {
  id: string
  title?: string | null
  live_start?: string | null
  live_end?: string | null
  clientRespondent?: { submitted_at?: string | null } | null
}

type ClientHomePageProps = {
  displayName: string
  surveys: ClientSurvey[]
  onOpenSurvey: (surveyId: string) => void
}

const DAY_MS = 86_400_000

function differenceParts(target: string | null | undefined, now: number) {
  const difference = target ? Math.max(0, new Date(target).getTime() - now) : 0
  return {
    days: Math.floor(difference / DAY_MS),
    hours: Math.floor((difference % DAY_MS) / 3_600_000),
    minutes: Math.floor((difference % 3_600_000) / 60_000),
    seconds: Math.floor((difference % 60_000) / 1_000),
  }
}

function formatDate(value?: string | null) {
  if (!value) return 'Not scheduled'
  return new Intl.DateTimeFormat('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(value))
}

export default function ClientHomePage({ displayName, surveys, onOpenSurvey }: ClientHomePageProps) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const { liveSurvey, nextSurvey, lastSurvey } = useMemo(() => {
    const live = surveys.find((item) => getEffectiveSurveyStatus(item, now) === 'live') || null
    const scheduled = surveys
      .filter((item) => getEffectiveSurveyStatus(item, now) === 'scheduled' && item.live_start)
      .sort((a, b) => new Date(a.live_start!).getTime() - new Date(b.live_start!).getTime())
    const past = surveys
      .filter((item) => getEffectiveSurveyStatus(item, now) === 'closed' && item.live_end)
      .sort((a, b) => new Date(b.live_end!).getTime() - new Date(a.live_end!).getTime())
    return { liveSurvey: live, nextSurvey: scheduled[0] || null, lastSurvey: past[0] || null }
  }, [now, surveys])

  const countdown = differenceParts(nextSurvey?.live_start, now)
  const daysSinceLast = lastSurvey?.live_end
    ? Math.max(0, Math.floor((now - new Date(lastSurvey.live_end).getTime()) / DAY_MS))
    : null
  const daysToNext = nextSurvey?.live_start
    ? Math.max(0, Math.ceil((new Date(nextSurvey.live_start).getTime() - now) / DAY_MS))
    : null

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0D1F3C_0%,#12395A_58%,#0B716B_100%)] px-7 py-8 text-white shadow-[0_14px_36px_rgba(13,31,60,0.14)] sm:px-9">
        <p className="text-xs font-bold tracking-[0.18em] text-[#75E4DA] uppercase">Client home</p>
        <h1 className="mt-3 font-['Plus_Jakarta_Sans'] text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
          Welcome back, {displayName}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
          View your current survey, see what is coming next and keep track of your participation.
        </p>
      </section>

      {liveSurvey && (
        <Card className="border-[#A9E1DB] bg-[#F3FCFB] shadow-[0_8px_24px_rgba(13,31,60,0.04)]">
          <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#DDF7F4] text-[#07877B]">
                <ClipboardList className="size-6" />
              </div>
              <div>
                <div className="text-xs font-bold tracking-[0.12em] text-[#07877B] uppercase">Open now</div>
                <h2 className="mt-1 text-xl font-extrabold text-[#0D1F3C]">{liveSurvey.title || 'Current survey'}</h2>
                <p className="mt-1 text-sm text-[#6D819A]">Your survey is ready for you to complete.</p>
              </div>
            </div>
            <Button onClick={() => onOpenSurvey(liveSurvey.id)} className="bg-[#1BBFB0] font-bold text-white hover:bg-[#16AFA1]">
              Open survey <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      )}

      {nextSurvey && (
        <Card className="overflow-hidden border-[#DCE5EF] shadow-[0_8px_24px_rgba(13,31,60,0.04)]">
          <CardHeader className="border-b border-[#E8EDF3] bg-white px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#EEF5FB] text-[#2A78B5]"><CalendarClock /></div>
              <div>
                <p className="text-xs font-bold tracking-[0.12em] text-[#6D819A] uppercase">Next scheduled survey</p>
                <CardTitle className="mt-1 text-xl text-[#0D1F3C]">{nextSurvey.title || 'Upcoming survey'}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="bg-[#F8FBFD] p-6">
            <div className="grid grid-cols-4 gap-2 sm:gap-4">
              {[
                ['Days', countdown.days], ['Hours', countdown.hours],
                ['Minutes', countdown.minutes], ['Seconds', countdown.seconds],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-[#DFE7F0] bg-white px-2 py-4 text-center">
                  <div className="text-2xl font-extrabold text-[#0D1F3C] sm:text-3xl">{String(value).padStart(2, '0')}</div>
                  <div className="mt-1 text-[10px] font-bold tracking-[0.1em] text-[#8A9BB0] uppercase sm:text-xs">{label}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-sm font-medium text-[#526A88]">Opens {formatDate(nextSurvey.live_start)}</p>
          </CardContent>
        </Card>
      )}

      {lastSurvey && (
        <div className="grid gap-5 md:grid-cols-2">
          <Card className="border-[#DFE6EE] shadow-[0_8px_24px_rgba(13,31,60,0.04)]">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#E7F7F3] text-[#07877B]"><CheckCircle2 /></div>
              <div>
                <div className="text-3xl font-extrabold text-[#0D1F3C]">{daysSinceLast}</div>
                <div className="mt-1 text-sm font-semibold text-[#526A88]">days since your last survey</div>
                <div className="mt-1 text-xs text-[#8A9BB0]">{lastSurvey.title}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[#DFE6EE] shadow-[0_8px_24px_rgba(13,31,60,0.04)]">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#EEF3FA] text-[#2A78B5]"><Clock3 /></div>
              <div>
                <div className="text-3xl font-extrabold text-[#0D1F3C]">{daysToNext ?? '—'}</div>
                <div className="mt-1 text-sm font-semibold text-[#526A88]">{daysToNext == null ? 'no next survey scheduled' : 'days until your next survey'}</div>
                <div className="mt-1 text-xs text-[#8A9BB0]">{nextSurvey?.title || 'We will let you know when one is scheduled.'}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!liveSurvey && !nextSurvey && !lastSurvey && (
        <Card className="border-[#DFE6EE] shadow-[0_8px_24px_rgba(13,31,60,0.04)]">
          <CardContent className="py-14 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[#EEF5FB] text-[#2A78B5]"><ClipboardList /></div>
            <h2 className="mt-4 text-lg font-extrabold text-[#0D1F3C]">No surveys assigned</h2>
            <p className="mt-2 text-sm text-[#7A8DA5]">Surveys you are invited or added to will appear here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
