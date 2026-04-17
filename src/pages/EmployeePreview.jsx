import { useState } from 'react'
import { dimensions } from '../data/dimensions'
import { questions, scaleLabels } from '../data/questions'

const clientList = ['Stanbic Bank Ghana', 'MTN Nigeria', 'Ecobank Group', 'Safaricom Kenya', 'Access Bank PLC']
const assessmentList = ['Q1 Culture Pulse', 'Annual Culture Survey', 'Quick Pulse — April']

export default function EmployeePreview() {
  const [selectedOrg, setSelectedOrg] = useState(clientList[0])
  const [selectedAssessment, setSelectedAssessment] = useState(assessmentList[0])
  const [activeDimIndex, setActiveDimIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const activeDim = dimensions[activeDimIndex]
  const dimQuestions = questions.filter(q => q.dimension === activeDim.id)

  const totalAnswered = Object.keys(answers).length
  const totalQuestions = questions.length
  const progress = Math.round((totalAnswered / totalQuestions) * 100)

  function handleAnswer(qId, val) {
    setAnswers(prev => ({ ...prev, [qId]: val }))
  }

  function handleSubmit() {
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="content">
        <div className="page-hero">
          <div className="hero-title">Employee Survey Preview</div>
          <div className="hero-sub">This is the experience employees see when completing their CultureXe survey.</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <div style={{ fontWeight: 700, fontSize: 22, color: 'var(--navy)', marginBottom: 8 }}>
            Survey Complete
          </div>
          <div style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 28 }}>
            Thank you for completing the CultureXe survey. Your responses are anonymous and will help your organisation build a better culture.
          </div>
          <button className="btn btn-teal" onClick={() => { setSubmitted(false); setAnswers({}); setActiveDimIndex(0) }}>
            Reset Preview
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="content">
      <div className="page-hero">
        <div className="hero-title">Employee Survey Preview</div>
        <div className="hero-sub">See exactly what employees experience when completing their CultureXe assessment.</div>
      </div>

      <div className="flex gap-12 mb-24">
        <select className="form-input" style={{ maxWidth: 220 }} value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)}>
          {clientList.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="form-input" style={{ maxWidth: 260 }} value={selectedAssessment} onChange={e => setSelectedAssessment(e.target.value)}>
          {assessmentList.map(a => <option key={a}>{a}</option>)}
        </select>
        <span className="badge badge-teal" style={{ alignSelf: 'center' }}>Preview Mode</span>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>
        <div className="card-sm">
          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 14 }}>
            Survey Dimensions
          </div>
          {dimensions.map((dim, idx) => {
            const dimQs = questions.filter(q => q.dimension === dim.id)
            const answered = dimQs.filter(q => answers[q.id]).length
            const done = answered === dimQs.length
            return (
              <button
                key={dim.id}
                onClick={() => setActiveDimIndex(idx)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', textAlign: 'left', background: 'none', border: 'none',
                  padding: '10px 12px', borderRadius: 9, cursor: 'pointer',
                  background: activeDimIndex === idx ? 'var(--teal-light)' : 'transparent',
                  borderLeft: activeDimIndex === idx ? '3px solid var(--teal)' : '3px solid transparent',
                  marginBottom: 2,
                }}
              >
                <span style={{ fontSize: 16 }}>{dim.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: activeDimIndex === idx ? 600 : 400, color: 'var(--navy)' }}>
                    {dim.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{answered}/{dimQs.length}</div>
                </div>
                {done && <span style={{ color: 'var(--teal)', fontSize: 14 }}>✓</span>}
              </button>
            )
          })}
          <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Overall progress</div>
            <div className="dim-bar-bg">
              <div className="dim-bar bar-teal" style={{ width: `${progress}%` }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{totalAnswered}/{totalQuestions} answered</div>
          </div>
        </div>

        <div className="card">
          <div className="flex-between mb-24">
            <div>
              <div style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 4 }}>
                Dimension {activeDimIndex + 1} of {dimensions.length}
              </div>
              <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--navy)' }}>
                {activeDim.icon} {activeDim.name}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4, lineHeight: 1.6 }}>
                {activeDim.description}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <div className="flex gap-8" style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
              {scaleLabels.map(s => (
                <div key={s.value} style={{ width: 68, textAlign: 'center', fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}>
                  {s.label}
                </div>
              ))}
            </div>

            {dimQuestions.map((q, qIdx) => (
              <div key={q.id} style={{
                padding: '16px 0',
                borderBottom: qIdx < dimQuestions.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ fontSize: 14, color: 'var(--navy)', marginBottom: 12, lineHeight: 1.6 }}>
                  {qIdx + 1}. {q.text}
                </div>
                <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
                  {scaleLabels.map(s => (
                    <button
                      key={s.value}
                      onClick={() => handleAnswer(q.id, s.value)}
                      style={{
                        width: 68, height: 38, borderRadius: 9, border: '1.5px solid',
                        borderColor: answers[q.id] === s.value ? 'var(--teal)' : 'var(--border2)',
                        background: answers[q.id] === s.value ? 'var(--teal-light)' : 'white',
                        color: answers[q.id] === s.value ? '#0A8A7E' : 'var(--text2)',
                        fontWeight: answers[q.id] === s.value ? 700 : 400,
                        fontSize: 14, cursor: 'pointer', transition: 'all 0.12s',
                      }}
                    >
                      {s.value}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex-between">
            <button
              className="btn btn-outline"
              disabled={activeDimIndex === 0}
              onClick={() => setActiveDimIndex(i => i - 1)}
            >
              ← Previous
            </button>
            {activeDimIndex < dimensions.length - 1 ? (
              <button className="btn btn-teal" onClick={() => setActiveDimIndex(i => i + 1)}>
                Next →
              </button>
            ) : (
              <button className="btn btn-teal" onClick={handleSubmit}>
                Submit Survey ✓
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
