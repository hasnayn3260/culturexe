import {
  Clock3,
  Gauge,
  Info,
  MessageSquareText,
  TextQuote,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import type {
  SubmissionQualityLevel,
  SubmissionQualityMetrics,
} from '../utils/submissionQuality'

type SubmissionQualitySummaryProps = {
  metrics: SubmissionQualityMetrics
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'Not available'
  if (seconds < 60) return `${Math.round(seconds)} sec`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes} min ${remainingSeconds} sec`
      : `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0
    ? `${hours} hr ${remainingMinutes} min`
    : `${hours} hr`
}

function levelClasses(level: SubmissionQualityLevel): string {
  if (level === 'strong') return 'border-[#BDE7DF] bg-[#E7F9F7] text-[#087C72]'
  if (level === 'mixed') return 'border-[#E8D9AE] bg-[#FFF7E2] text-[#8A6520]'
  if (level === 'review') return 'border-[#F1C4B8] bg-[#FDECE7] text-[#A0442E]'
  return 'border-[#DCE5EE] bg-[#F3F5F7] text-[#6D7D90]'
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Clock3
  label: string
  value: string
  detail: string
}) {
  return (
    <Card size="sm" className="border-0 bg-[#F8FAFC] ring-[#DCE5EE]">
      <CardContent className="grid gap-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[#7890AD]">
          <Icon className="size-4 text-[#1BBFB0]" />
          {label}
        </div>
        <div className="text-2xl font-extrabold text-[#0D1F3C]">{value}</div>
        <div className="text-xs leading-5 text-[#6D7D90]">{detail}</div>
      </CardContent>
    </Card>
  )
}

export default function SubmissionQualitySummary({
  metrics,
}: SubmissionQualitySummaryProps) {
  const coverage = metrics.openEndedCoveragePercentage
  const distribution = [
    { level: 'strong' as const, label: 'Strong', count: metrics.distribution.strong },
    { level: 'mixed' as const, label: 'Mixed', count: metrics.distribution.mixed },
    { level: 'review' as const, label: 'Review', count: metrics.distribution.review },
    { level: 'insufficient' as const, label: 'Insufficient', count: metrics.distribution.insufficient },
  ]

  return (
    <Card className="mb-6 w-full max-w-none items-stretch border-0 bg-white ring-[#DCE5EE]">
      <CardHeader className="w-full self-stretch border-b border-[#E6ECF2]">
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-[#0D1F3C]">
              Submission quality
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    aria-label="How submission quality is calculated"
                    className="text-[#8A9BB0] hover:text-[#0D1F3C]"
                  >
                    <Info className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm leading-5">
                    This is a review aid, not a judgment of a respondent. Timing is
                    compared with the cohort median. Qualitative detail uses paragraph
                    response word counts. Missing indicators do not reduce the score.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription className="mt-1 max-w-3xl text-[#6D7D90]">
              Signals that help distinguish thoughtful submissions from potentially rushed or minimal responses.
            </CardDescription>
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-2 justify-self-start md:justify-self-end">
            <Badge
              variant="outline"
              className={`h-auto w-fit max-w-full whitespace-normal px-3 py-1.5 text-center ${levelClasses(metrics.engagementLevel)}`}
            >
              Response engagement · {metrics.engagementLabel}{metrics.engagementScore !== null ? ` · ${metrics.engagementScore}%` : ''}
            </Badge>
            <Badge
              variant="outline"
              className={`h-auto w-fit max-w-full whitespace-normal px-3 py-1.5 text-center ${levelClasses(metrics.level)}`}
            >
              Survey response quality · {metrics.label}{metrics.score !== null ? ` · ${metrics.score}%` : ''}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid w-full self-stretch gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Clock3}
            label="Average completion time"
            value={formatDuration(metrics.averageCompletionSeconds)}
            detail={`${metrics.timedSubmissionCount} of ${metrics.submittedCount} timed · weighted baseline ${formatDuration(metrics.averageExpectedCompletionSeconds)}.`}
          />
          <MetricCard
            icon={MessageSquareText}
            label="Average open response"
            value={metrics.averageOpenEndedWords === null
              ? 'Not applicable'
              : `${metrics.averageOpenEndedWords.toFixed(1)} words`}
            detail={metrics.averageOpenEndedSentences === null
              ? 'No answered open-ended questions in this scope.'
              : `${metrics.averageOpenEndedSentences.toFixed(1)} sentences across ${metrics.openEndedAnswerCount} answered fields.`}
          />
          <MetricCard
            icon={TextQuote}
            label="Open-response coverage"
            value={coverage === null ? 'Not applicable' : `${Math.round(coverage)}%`}
            detail={metrics.openEndedQuestionCount > 0
              ? `${metrics.openEndedQuestionCount} open-ended question${metrics.openEndedQuestionCount === 1 ? '' : 's'} assessed.`
              : 'This survey has no open-ended questions.'}
          />
          <MetricCard
            icon={Gauge}
            label="Responses to review"
            value={String(metrics.distribution.review + metrics.distribution.mixed)}
            detail={`${metrics.potentiallyRushedCount} potentially rushed · ${metrics.minimalFeedbackCount} with minimal paragraph feedback.`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-[#E6ECF2] pt-4">
          <span className="mr-1 text-xs font-semibold text-[#6D7D90]">Submission signals:</span>
          {distribution.map(item => (
            <Badge
              key={item.level}
              variant="outline"
              className={levelClasses(item.level)}
            >
              {item.label}: {item.count}
            </Badge>
          ))}
          {metrics.rushedThresholdSeconds !== null && (
            <span className="ml-auto text-xs text-[#8A9BB0]">
              Timing review threshold: {formatDuration(metrics.rushedThresholdSeconds)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
