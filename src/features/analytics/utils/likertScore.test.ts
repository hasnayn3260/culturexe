import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculateLikertMetrics,
  normaliseLikertAverage,
  roundedLikertPercentage,
} from './likertScore.ts'

test('normalises the lower Likert boundary to zero percent', () => {
  assert.equal(normaliseLikertAverage(1), 0)
})

test('normalises the Likert midpoint to fifty percent', () => {
  assert.equal(normaliseLikertAverage(3), 50)
})

test('normalises the upper Likert boundary to one hundred percent', () => {
  assert.equal(normaliseLikertAverage(5), 100)
})

test('keeps the average and returns the corrected percentage', () => {
  assert.deepEqual(calculateLikertMetrics([1, 2, 3, 4, 5]), {
    average: 3,
    percentage: 50,
    responseCount: 5,
  })
})

test('ignores invalid and out-of-range responses', () => {
  assert.equal(roundedLikertPercentage([null, 'invalid', 0, 1, 5, 6]), 50)
})

test('returns null when there are no valid responses', () => {
  assert.equal(calculateLikertMetrics([]), null)
  assert.equal(roundedLikertPercentage(['invalid']), null)
})
