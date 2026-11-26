import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildSurveyFilePath,
  pathOwnership,
  safeFileName,
  validatedContentType,
} from './filePolicy.ts'

const ids = {
  organisationId: '11111111-1111-4111-8111-111111111111',
  surveyId: '22222222-2222-4222-8222-222222222222',
  respondentId: '33333333-3333-4333-8333-333333333333',
  questionId: '44444444-4444-4444-8444-444444444444',
}

test('builds an organisation-scoped survey file path', () => {
  assert.equal(
    buildSurveyFilePath({
      ...ids,
      fileName: '../../Board report.pdf',
      objectId: '55555555-5555-4555-8555-555555555555',
    }),
    `${ids.organisationId}/${ids.surveyId}/${ids.respondentId}/${ids.questionId}/55555555-5555-4555-8555-555555555555-Board-report.pdf`,
  )
})

test('sanitises unsafe object names', () => {
  assert.equal(safeFileName(' Résumé / final?.docx '), 'final-.docx')
})

test('validates both extension and supplied content type', () => {
  assert.equal(validatedContentType('evidence.pdf', 'application/pdf'), 'application/pdf')
  assert.equal(validatedContentType('evidence.pdf', 'application/octet-stream'), 'application/pdf')
  assert.equal(validatedContentType('evidence.pdf', 'text/html'), null)
  assert.equal(validatedContentType('payload.svg', 'image/svg+xml'), null)
})

test('recognises current and legacy paths owned by a response field', () => {
  const current = `${ids.organisationId}/${ids.surveyId}/${ids.respondentId}/${ids.questionId}/file.pdf`
  const legacy = `${ids.respondentId}/${ids.questionId}/file.pdf`
  assert.equal(pathOwnership(current, ids.respondentId, ids.questionId), true)
  assert.equal(pathOwnership(legacy, ids.respondentId, ids.questionId), true)
  assert.equal(pathOwnership(current, ids.respondentId, ids.surveyId), false)
})
