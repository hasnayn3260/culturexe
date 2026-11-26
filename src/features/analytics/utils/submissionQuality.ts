export type SubmissionQualityLevel =
  | 'strong'
  | 'mixed'
  | 'review'
  | 'insufficient'

export type SubmissionQualityQuestion = {
  id: string
  question_type: string
}

export type SubmissionQualityResponse = {
  respondent_id: string
  answers?: unknown
}

export type SubmissionQualityRespondent = {
  id: string
  completion_duration_seconds?: number | null
}

export type SubmissionQualityRecord = {
  respondentId: string
  completionSeconds: number | null
  openEndedAnswerCount: number
  openEndedWordCount: number
  openEndedSentenceCount: number
  averageWordsPerOpenAnswer: number | null
  potentiallyRushed: boolean
  minimalQualitativeFeedback: boolean
  score: number | null
  level: SubmissionQualityLevel
  label: string
  signals: string[]
}

export type SubmissionQualityMetrics = {
  submittedCount: number
  timedSubmissionCount: number
  averageCompletionSeconds: number | null
  medianCompletionSeconds: number | null
  rushedThresholdSeconds: number | null
  potentiallyRushedCount: number
  openEndedQuestionCount: number
  qualitativeQuestionCount: number
  openEndedAnswerCount: number
  averageOpenEndedWords: number | null
  averageOpenEndedSentences: number | null
  openEndedCoveragePercentage: number | null
  minimalFeedbackCount: number
  assessedSubmissionCount: number
  score: number | null
  level: SubmissionQualityLevel
  label: string
  distribution: Record<SubmissionQualityLevel, number>
  submissions: SubmissionQualityRecord[]
}

const OPEN_ENDED_TYPES = new Set(['SHORT_TEXT', 'LONG_TEXT', 'text'])
const QUALITATIVE_TYPES = new Set(['LONG_TEXT', 'text'])
const MINIMUM_QUALITATIVE_WORDS = 5
const MINIMUM_RUSHED_THRESHOLD_SECONDS = 30
const FALLBACK_SECONDS_PER_QUESTION = 3

function asAnswerRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function answerText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((total, value) => total + value, 0) / values.length
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const ordered = [...values].sort((left, right) => left - right)
  const middle = Math.floor(ordered.length / 2)
  return ordered.length % 2 === 0
    ? (ordered[middle - 1] + ordered[middle]) / 2
    : ordered[middle]
}

function qualityLevel(score: number | null): SubmissionQualityLevel {
  if (score === null) return 'insufficient'
  if (score >= 75) return 'strong'
  if (score >= 40) return 'mixed'
  return 'review'
}

export function submissionQualityLabel(level: SubmissionQualityLevel): string {
  if (level === 'strong') return 'Strong engagement'
  if (level === 'mixed') return 'Mixed engagement'
  if (level === 'review') return 'Review suggested'
  return 'Insufficient data'
}

export function countWords(value: unknown): number {
  const text = answerText(value)
  if (!text) return 0
  return text
    .split(/\s+/u)
    .filter(token => /[\p{L}\p{N}]/u.test(token))
    .length
}

export function countSentences(value: unknown): number {
  const text = answerText(value)
  if (!text) return 0
  return (text.match(/[^.!?]+(?:[.!?]+|$)/gu) || [])
    .filter(sentence => sentence.trim())
    .length
}

export function calculateSubmissionQuality({
  questions,
  responses,
  respondents,
}: {
  questions: SubmissionQualityQuestion[]
  responses: SubmissionQualityResponse[]
  respondents: SubmissionQualityRespondent[]
}): SubmissionQualityMetrics {
  const openEndedQuestions = questions.filter(question =>
    OPEN_ENDED_TYPES.has(question.question_type),
  )
  const qualitativeQuestions = questions.filter(question =>
    QUALITATIVE_TYPES.has(question.question_type),
  )
  const respondentById = new Map(
    respondents.map(respondent => [respondent.id, respondent]),
  )
  const completionTimes = responses
    .map(response => respondentById.get(response.respondent_id)?.completion_duration_seconds)
    .filter((value): value is number => (
      typeof value === 'number' && Number.isFinite(value) && value >= 0
    ))
  const medianCompletionSeconds = median(completionTimes)
  const rushedThresholdSeconds = medianCompletionSeconds === null
    ? null
    : completionTimes.length >= 3
      ? Math.max(
          MINIMUM_RUSHED_THRESHOLD_SECONDS,
          medianCompletionSeconds * 0.5,
        )
      : Math.max(
          MINIMUM_RUSHED_THRESHOLD_SECONDS,
          questions.length * FALLBACK_SECONDS_PER_QUESTION,
        )

  const submissions = responses.map(response => {
    const respondent = respondentById.get(response.respondent_id)
    const duration = respondent?.completion_duration_seconds
    const completionSeconds = typeof duration === 'number' &&
      Number.isFinite(duration) && duration >= 0
      ? duration
      : null
    const answers = asAnswerRecord(response.answers)
    const openEndedAnswers = openEndedQuestions
      .map(question => answerText(answers[question.id]))
      .filter(Boolean)
    const qualitativeAnswers = qualitativeQuestions
      .map(question => answerText(answers[question.id]))
      .filter(Boolean)
    const openEndedWordCount = openEndedAnswers.reduce(
      (total, value) => total + countWords(value),
      0,
    )
    const openEndedSentenceCount = openEndedAnswers.reduce(
      (total, value) => total + countSentences(value),
      0,
    )
    const qualitativeWordCount = qualitativeAnswers.reduce(
      (total, value) => total + countWords(value),
      0,
    )
    const averageQualitativeWords = qualitativeQuestions.length > 0
      ? qualitativeWordCount / qualitativeQuestions.length
      : null
    const potentiallyRushed = completionSeconds !== null &&
      rushedThresholdSeconds !== null &&
      completionSeconds < rushedThresholdSeconds
    const minimalQualitativeFeedback = averageQualitativeWords !== null &&
      averageQualitativeWords < MINIMUM_QUALITATIVE_WORDS
    const applicableIndicators = [
      completionSeconds !== null,
      qualitativeQuestions.length > 0,
    ]
    const passedIndicators = [
      completionSeconds !== null && !potentiallyRushed,
      qualitativeQuestions.length > 0 && !minimalQualitativeFeedback,
    ]
    const indicatorCount = applicableIndicators.filter(Boolean).length
    const score = indicatorCount > 0
      ? Math.round(
          (passedIndicators.filter(Boolean).length / indicatorCount) * 100,
        )
      : null
    const level = qualityLevel(score)
    const signals: string[] = []

    if (potentiallyRushed && rushedThresholdSeconds !== null) {
      signals.push(
        `Completion time was below the ${Math.round(rushedThresholdSeconds)} second review threshold.`,
      )
    }
    if (minimalQualitativeFeedback) {
      signals.push(
        `Paragraph feedback averaged fewer than ${MINIMUM_QUALITATIVE_WORDS} words per question.`,
      )
    }

    return {
      respondentId: response.respondent_id,
      completionSeconds,
      openEndedAnswerCount: openEndedAnswers.length,
      openEndedWordCount,
      openEndedSentenceCount,
      averageWordsPerOpenAnswer: openEndedAnswers.length > 0
        ? openEndedWordCount / openEndedAnswers.length
        : null,
      potentiallyRushed,
      minimalQualitativeFeedback,
      score,
      level,
      label: submissionQualityLabel(level),
      signals,
    }
  })

  const openEndedAnswerCount = submissions.reduce(
    (total, submission) => total + submission.openEndedAnswerCount,
    0,
  )
  const openEndedWordCount = submissions.reduce(
    (total, submission) => total + submission.openEndedWordCount,
    0,
  )
  const openEndedSentenceCount = submissions.reduce(
    (total, submission) => total + submission.openEndedSentenceCount,
    0,
  )
  const assessedScores = submissions
    .map(submission => submission.score)
    .filter((value): value is number => value !== null)
  const score = average(assessedScores)
  const roundedScore = score === null ? null : Math.round(score)
  const level = qualityLevel(roundedScore)
  const distribution: Record<SubmissionQualityLevel, number> = {
    strong: 0,
    mixed: 0,
    review: 0,
    insufficient: 0,
  }
  submissions.forEach(submission => {
    distribution[submission.level] += 1
  })

  return {
    submittedCount: responses.length,
    timedSubmissionCount: completionTimes.length,
    averageCompletionSeconds: average(completionTimes),
    medianCompletionSeconds,
    rushedThresholdSeconds,
    potentiallyRushedCount: submissions.filter(
      submission => submission.potentiallyRushed,
    ).length,
    openEndedQuestionCount: openEndedQuestions.length,
    qualitativeQuestionCount: qualitativeQuestions.length,
    openEndedAnswerCount,
    averageOpenEndedWords: openEndedAnswerCount > 0
      ? openEndedWordCount / openEndedAnswerCount
      : null,
    averageOpenEndedSentences: openEndedAnswerCount > 0
      ? openEndedSentenceCount / openEndedAnswerCount
      : null,
    openEndedCoveragePercentage: openEndedQuestions.length > 0 && responses.length > 0
      ? (openEndedAnswerCount / (openEndedQuestions.length * responses.length)) * 100
      : null,
    minimalFeedbackCount: submissions.filter(
      submission => submission.minimalQualitativeFeedback,
    ).length,
    assessedSubmissionCount: assessedScores.length,
    score: roundedScore,
    level,
    label: submissionQualityLabel(level),
    distribution,
    submissions,
  }
}
