export type SubmissionQualityLevel =
  | 'strong'
  | 'mixed'
  | 'review'
  | 'insufficient'

export type SubmissionQualityQuestion = {
  id: string
  question_type: string
  text?: string | null
  options?: unknown
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
  expectedCompletionSeconds: number
  completionTimeRatio: number | null
  openEndedAnswerCount: number
  openEndedWordCount: number
  openEndedSentenceCount: number
  averageWordsPerOpenAnswer: number | null
  qualitativeCoveragePercentage: number | null
  qualitativeDepthScore: number | null
  severelyRushed: boolean
  potentiallyRushed: boolean
  minimalQualitativeFeedback: boolean
  score: number | null
  level: SubmissionQualityLevel
  label: string
  engagementScore: number | null
  engagementLevel: SubmissionQualityLevel
  engagementLabel: string
  signals: string[]
}

export type SubmissionQualityMetrics = {
  submittedCount: number
  timedSubmissionCount: number
  averageCompletionSeconds: number | null
  averageExpectedCompletionSeconds: number | null
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
  engagementScore: number | null
  engagementLevel: SubmissionQualityLevel
  engagementLabel: string
  distribution: Record<SubmissionQualityLevel, number>
  submissions: SubmissionQualityRecord[]
}

const OPEN_ENDED_TYPES = new Set(['SHORT_TEXT', 'LONG_TEXT', 'text'])
const QUALITATIVE_TYPES = new Set(['LONG_TEXT', 'text'])
const MINIMUM_QUALITATIVE_WORDS = 5
const BASELINE_SECONDS_PER_QUESTION = 30
const COMPOSITION_WORDS_PER_MINUTE = 30
const SECONDS_PER_COMPOSED_WORD = 60 / COMPOSITION_WORDS_PER_MINUTE
const SECONDS_PER_QUESTION_WORD = 0.3
const COHORT_SPEEDING_RATIO = 0.43

function asAnswerRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function answerText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asOptionsRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
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
  if (level === 'strong') return 'High quality'
  if (level === 'mixed') return 'Moderate quality'
  if (level === 'review') return 'Review suggested'
  return 'Insufficient data'
}

export function submissionEngagementLabel(level: SubmissionQualityLevel): string {
  if (level === 'strong') return 'Strong engagement'
  if (level === 'mixed') return 'Mixed engagement'
  if (level === 'review') return 'Low engagement'
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

function qualitativeAnswerScore(value: unknown): number {
  const words = countWords(value)
  const sentences = countSentences(value)
  if (words < 5) return 0
  if (words < 15) return 40
  if (words >= 30 || sentences >= 2) return 100
  return 75
}

function expectedQuestionSeconds(
  question: SubmissionQualityQuestion,
  answer: unknown,
): number {
  const readingSeconds = Math.max(
    2,
    countWords(question.text) * SECONDS_PER_QUESTION_WORD,
  )
  const type = question.question_type
  const answerWords = countWords(answer)
  const answerSentences = countSentences(answer)
  const typingSeconds = answerWords * SECONDS_PER_COMPOSED_WORD

  if (type === 'LIKERT' || type === 'likert' || type === 'RATING_SCALE') {
    return (BASELINE_SECONDS_PER_QUESTION / 3) + readingSeconds
  }
  if (type === 'SINGLE_CHOICE' || type === 'DROPDOWN') {
    return (BASELINE_SECONDS_PER_QUESTION * 0.4) + readingSeconds
  }
  if (type === 'MULTI_CHOICE') {
    return (BASELINE_SECONDS_PER_QUESTION * 0.6) + readingSeconds
  }
  if (type === 'MATRIX') {
    const options = asOptionsRecord(question.options)
    const rows = Array.isArray(options.rows) ? options.rows.length : 1
    return Math.max(
      BASELINE_SECONDS_PER_QUESTION * 0.5,
      rows * 8,
    ) + readingSeconds
  }
  if (type === 'SHORT_TEXT') {
    return (BASELINE_SECONDS_PER_QUESTION * 0.5) +
      readingSeconds +
      typingSeconds +
      (answerSentences * 2)
  }
  if (type === 'LONG_TEXT' || type === 'text') {
    return BASELINE_SECONDS_PER_QUESTION +
      readingSeconds +
      typingSeconds +
      (answerSentences * 3)
  }
  if (type === 'DATE' || type === 'TIME') {
    return (BASELINE_SECONDS_PER_QUESTION * 0.4) + readingSeconds
  }
  if (type === 'FILE') {
    return (BASELINE_SECONDS_PER_QUESTION * 1.5) + readingSeconds
  }
  return (BASELINE_SECONDS_PER_QUESTION * 0.5) + readingSeconds
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
  const submissions = responses.map(response => {
    const respondent = respondentById.get(response.respondent_id)
    const duration = respondent?.completion_duration_seconds
    const completionSeconds = typeof duration === 'number' &&
      Number.isFinite(duration) && duration >= 0
      ? duration
      : null
    const answers = asAnswerRecord(response.answers)
    const expectedCompletionSeconds = questions.reduce(
      (total, question) => total + expectedQuestionSeconds(
        question,
        answers[question.id],
      ),
      0,
    )
    const completionTimeRatio = completionSeconds !== null &&
      expectedCompletionSeconds > 0
      ? completionSeconds / expectedCompletionSeconds
      : null
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
    const qualitativeCoveragePercentage = qualitativeQuestions.length > 0
      ? (qualitativeAnswers.length / qualitativeQuestions.length) * 100
      : null
    const qualitativeDepthScore = qualitativeQuestions.length > 0
      ? qualitativeQuestions.reduce(
          (total, question) => total + qualitativeAnswerScore(answers[question.id]),
          0,
        ) / qualitativeQuestions.length
      : null
    const belowCohortThreshold = completionSeconds !== null &&
      medianCompletionSeconds !== null &&
      completionTimes.length >= 3 &&
      completionSeconds < medianCompletionSeconds * COHORT_SPEEDING_RATIO
    const severelyRushed = completionTimeRatio !== null && completionTimeRatio < 0.4
    const potentiallyRushed = completionTimeRatio !== null &&
      (completionTimeRatio < 0.6 || belowCohortThreshold)
    const minimalQualitativeFeedback = averageQualitativeWords !== null &&
      averageQualitativeWords < MINIMUM_QUALITATIVE_WORDS
    const timingScore = completionTimeRatio === null
      ? null
      : Math.min(100, Math.max(0, (completionTimeRatio / 0.8) * 100))
    const scoreParts = [
      ...(timingScore === null ? [] : [{ score: timingScore, weight: 50 }]),
      ...(qualitativeDepthScore === null
        ? []
        : [{ score: qualitativeDepthScore, weight: 35 }]),
      ...(qualitativeCoveragePercentage === null
        ? []
        : [{ score: qualitativeCoveragePercentage, weight: 15 }]),
    ]
    const availableWeight = scoreParts.reduce(
      (total, part) => total + part.weight,
      0,
    )
    let score = availableWeight > 0
      ? Math.round(scoreParts.reduce(
          (total, part) => total + (part.score * part.weight),
          0,
        ) / availableWeight)
      : null
    if (score !== null && severelyRushed) score = Math.min(score, 39)
    else if (score !== null && potentiallyRushed) score = Math.min(score, 74)
    const level = qualityLevel(score)
    const engagementScore = qualitativeDepthScore !== null &&
      qualitativeCoveragePercentage !== null
      ? Math.round(
          (qualitativeDepthScore * 0.7) +
          (qualitativeCoveragePercentage * 0.3),
        )
      : null
    const engagementLevel = qualityLevel(engagementScore)
    const signals: string[] = []

    if (severelyRushed && completionTimeRatio !== null) {
      signals.push(
        `Completion time was ${Math.round(completionTimeRatio * 100)}% of the weighted expected time.`,
      )
    } else if (potentiallyRushed && completionTimeRatio !== null) {
      signals.push(
        `Completion time was faster than expected at ${Math.round(completionTimeRatio * 100)}% of the weighted baseline.`,
      )
    }
    if (minimalQualitativeFeedback) {
      signals.push(
        `Paragraph feedback averaged fewer than ${MINIMUM_QUALITATIVE_WORDS} words per question.`,
      )
    }
    if (
      qualitativeCoveragePercentage !== null &&
      qualitativeCoveragePercentage < 100
    ) {
      signals.push(
        `Answered ${qualitativeAnswers.length} of ${qualitativeQuestions.length} paragraph questions.`,
      )
    }

    return {
      respondentId: response.respondent_id,
      completionSeconds,
      expectedCompletionSeconds,
      completionTimeRatio,
      openEndedAnswerCount: openEndedAnswers.length,
      openEndedWordCount,
      openEndedSentenceCount,
      averageWordsPerOpenAnswer: openEndedAnswers.length > 0
        ? openEndedWordCount / openEndedAnswers.length
        : null,
      qualitativeCoveragePercentage,
      qualitativeDepthScore,
      severelyRushed,
      potentiallyRushed,
      minimalQualitativeFeedback,
      score,
      level,
      label: submissionQualityLabel(level),
      engagementScore,
      engagementLevel,
      engagementLabel: submissionEngagementLabel(engagementLevel),
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
  const assessedEngagementScores = submissions
    .map(submission => submission.engagementScore)
    .filter((value): value is number => value !== null)
  const engagementAverage = average(assessedEngagementScores)
  const engagementScore = engagementAverage === null
    ? null
    : Math.round(engagementAverage)
  const engagementLevel = qualityLevel(engagementScore)
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
    averageExpectedCompletionSeconds: average(
      submissions.map(submission => submission.expectedCompletionSeconds),
    ),
    medianCompletionSeconds,
    rushedThresholdSeconds: medianCompletionSeconds === null
      ? null
      : medianCompletionSeconds * COHORT_SPEEDING_RATIO,
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
    engagementScore,
    engagementLevel,
    engagementLabel: submissionEngagementLabel(engagementLevel),
    distribution,
    submissions,
  }
}
