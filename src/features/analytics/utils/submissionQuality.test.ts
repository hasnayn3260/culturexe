import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculateSubmissionQuality,
  countSentences,
  countWords,
} from './submissionQuality.ts'

const questions = [
  { id: 'q1', question_type: 'LIKERT' },
  { id: 'q2', question_type: 'SHORT_TEXT' },
  { id: 'q3', question_type: 'LONG_TEXT' },
]

test('counts words and sentences in open-ended feedback', () => {
  assert.equal(countWords('Clear goals, helpful manager, and good support.'), 7)
  assert.equal(countSentences('Clear goals. Helpful manager! Good support?'), 3)
  assert.equal(countWords('   '), 0)
  assert.equal(countSentences(null), 0)
})

test('calculates average completion time and open-response length', () => {
  const metrics = calculateSubmissionQuality({
    questions,
    respondents: [
      { id: 'r1', completion_duration_seconds: 120 },
      { id: 'r2', completion_duration_seconds: 180 },
    ],
    responses: [
      {
        respondent_id: 'r1',
        answers: { q2: 'Finance', q3: 'The team communicates clearly.' },
      },
      {
        respondent_id: 'r2',
        answers: { q2: 'People', q3: 'Leaders explain decisions. Managers listen.' },
      },
    ],
  })

  assert.equal(metrics.averageCompletionSeconds, 150)
  assert.equal(metrics.timedSubmissionCount, 2)
  assert.equal(metrics.openEndedAnswerCount, 4)
  assert.equal(metrics.openEndedCoveragePercentage, 100)
  assert.equal(metrics.averageOpenEndedSentences, 1.25)
})

test('flags a submission that is fast and has minimal paragraph feedback', () => {
  const metrics = calculateSubmissionQuality({
    questions,
    respondents: [
      { id: 'r1', completion_duration_seconds: 20 },
      { id: 'r2', completion_duration_seconds: 120 },
      { id: 'r3', completion_duration_seconds: 180 },
    ],
    responses: [
      { respondent_id: 'r1', answers: { q3: 'Fine.' } },
      { respondent_id: 'r2', answers: { q3: 'Communication is clear and leaders explain decisions.' } },
      { respondent_id: 'r3', answers: { q3: 'Managers listen carefully and provide useful feedback.' } },
    ],
  })

  const flagged = metrics.submissions.find(item => item.respondentId === 'r1')
  assert.equal(metrics.rushedThresholdSeconds, 51.6)
  assert.equal(flagged?.potentiallyRushed, true)
  assert.equal(flagged?.severelyRushed, true)
  assert.equal(flagged?.minimalQualitativeFeedback, true)
  assert.equal((flagged?.score ?? 100) <= 39, true)
  assert.equal(flagged?.level, 'review')
  assert.equal(metrics.potentiallyRushedCount, 1)
  assert.equal(metrics.minimalFeedbackCount, 1)
})

test('does not penalise surveys without paragraph questions', () => {
  const metrics = calculateSubmissionQuality({
    questions: [{ id: 'q1', question_type: 'LIKERT' }],
    respondents: [{ id: 'r1', completion_duration_seconds: 90 }],
    responses: [{ respondent_id: 'r1', answers: { q1: 4 } }],
  })

  assert.equal(metrics.submissions[0].minimalQualitativeFeedback, false)
  assert.equal(metrics.submissions[0].score, 100)
  assert.equal(metrics.level, 'strong')
  assert.equal(metrics.engagementLevel, 'insufficient')
  assert.equal(metrics.openEndedCoveragePercentage, null)
})

test('returns insufficient data when neither indicator can be assessed', () => {
  const metrics = calculateSubmissionQuality({
    questions: [{ id: 'q1', question_type: 'LIKERT' }],
    respondents: [{ id: 'r1', completion_duration_seconds: null }],
    responses: [{ respondent_id: 'r1', answers: { q1: 3 } }],
  })

  assert.equal(metrics.score, null)
  assert.equal(metrics.level, 'insufficient')
  assert.equal(metrics.submissions[0].score, null)
})

test('flags a two-minute mixed survey against type-weighted thirty-second baselines', () => {
  const weightedQuestions = [
    ...Array.from({ length: 20 }, (_, index) => ({
      id: `likert-${index}`,
      question_type: 'LIKERT',
      text: 'Please indicate how strongly you agree with this statement',
    })),
    ...Array.from({ length: 3 }, (_, index) => ({
      id: `choice-${index}`,
      question_type: 'DROPDOWN',
      text: 'Please select the option that applies to you',
    })),
    { id: 'paragraph-1', question_type: 'LONG_TEXT', text: 'Please explain your experience' },
    { id: 'paragraph-2', question_type: 'LONG_TEXT', text: 'What should improve next' },
  ]
  const metrics = calculateSubmissionQuality({
    questions: weightedQuestions,
    respondents: [{ id: 'r1', completion_duration_seconds: 120 }],
    responses: [{
      respondent_id: 'r1',
      answers: {
        'paragraph-1': 'Not sure',
        'paragraph-2': 'No comment',
      },
    }],
  })
  const result = metrics.submissions[0]

  assert.equal(result.expectedCompletionSeconds > 300, true)
  assert.equal((result.completionTimeRatio ?? 1) < 0.4, true)
  assert.equal(result.severelyRushed, true)
  assert.equal(result.minimalQualitativeFeedback, true)
  assert.equal(result.level, 'review')
  assert.equal((result.score ?? 100) <= 39, true)
})

test('keeps qualitative engagement separate from overall response quality', () => {
  const metrics = calculateSubmissionQuality({
    questions: [
      { id: 'q1', question_type: 'LIKERT', text: 'I understand our strategy' },
      { id: 'q2', question_type: 'LONG_TEXT', text: 'Please explain your experience' },
    ],
    respondents: [{ id: 'r1', completion_duration_seconds: 10 }],
    responses: [{
      respondent_id: 'r1',
      answers: {
        q1: 4,
        q2: 'Leaders communicate clearly and explain decisions with useful context. They invite questions, listen carefully, and respond with practical feedback.',
      },
    }],
  })
  const result = metrics.submissions[0]

  assert.equal(result.engagementLevel, 'strong')
  assert.equal(result.engagementLabel, 'Strong engagement')
  assert.equal(result.level, 'review')
  assert.equal(result.label, 'Review suggested')
})
