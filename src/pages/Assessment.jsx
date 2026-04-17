import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { dimensions } from '../data/dimensions'
import supabase from '../lib/supabaseClient'

const SCALE = [1, 2, 3, 4, 5]
const SCALE_LABELS = {
  1: 'Strongly Disagree',
  2: 'Disagree',
  3: 'Neutral',
  4: 'Agree',
  5: 'Strongly Agree',
}

function scoreColor(s) {
  if (s >= 75) return 'var(--teal)'
  if (s >= 60) return 'var(--blue)'
  if (s >= 45) return 'var(--gold2)'
  return 'var(--coral)'
}

function calcPersonalScores(answers, questions) {
  const scores = {}
  for (const dim of dimensions) {
    const dimQs = questions.filter(q => q.dimension === dim.id)
    if (!dimQs.length) { scores[dim.id] = null; continue }
    const scored = dimQs.filter(q => answers[q.id] != null)
    if (!scored.length) { scores[dim.id] = null; continue }
    const avg = scored.reduce((s, q) => s + Number(answers[q.id]), 0) / scored.length
    scores[dim.id] = Math.round((avg / 5) * 100)
  }
  return scores
}

async function aggregateAndUpsertReport(assessmentId, questions) {
  const { data: allResponses } = await supabase
    .from('responses')
    .select('answers')
    .eq('assessment_id', assessmentId)

  const scores = {}
  for (const dim of dimensions) {
    const dimQIds = questions.filter(q => q.dimension === dim.id).map(q => q.id)
    const allVals = []
    for (const resp of allResponses || []) {
      for (const qId of dimQIds) {
        const v = resp.answers?.[qId]
        if (v != null) allVals.push(Number(v))
      }
    }
    scores[dim.id] = allVals.length > 0
      ? Math.round(allVals.reduce((a, b) => a + b, 0) / allVals.length / 5 * 100)
      : 0
  }

  const { data: existing } = await supabase
    .from('reports')
    .select('id')
    .eq('assessment_id', assessmentId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('reports')
      .update({ scores, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('reports')
      .insert({ assessment_id: assessmentId, scores, status: 'review' })
  }
}

// ── Page shell (header + centred content) ──────────────────
function PageShell({ orgName, progress, children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F4F6FA', fontFamily: 'var(--font, "Plus Jakarta Sans", sans-serif)' }}>
      <style>{`
        @keyframes as-spin { to { transform: rotate(360deg); } }
        @media (max-width: 680px) {
          .as-layout  { flex-direction: column !important; }
          .as-sidebar { display: none !important; }
          .as-mob-tabs { display: flex !important; }
          .as-scale-lbl { display: none !important; }
          .as-scale-row { justify-content: stretch !important; }
          .as-scale-btn { min-width: 0 !important; width: auto !important; height: 48px !important; flex: 1 !important; font-size: 16px !important; }
          .as-q-panel { padding: 18px 16px !important; }
          .as-q-text { font-size: 15px !important; }
          .as-nav-btns { flex-direction: column-reverse !important; gap: 10px !important; }
          .as-nav-btns button { width: 100% !important; padding: 14px !important; font-size: 15px !important; }
        }
      `}</style>

      {/* Sticky header */}
      <div style={{
        background: 'white', borderBottom: '1px solid #E2E7EF',
        height: 60, padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.5px' }}>
            <span style={{ color: '#0B1D3E' }}>Culture</span>
            <span style={{ color: '#1BBFB0' }}>Xe</span>
          </div>
          {orgName && (
            <span style={{ fontSize: 13, color: '#8898AA', borderLeft: '1px solid #E2E7EF', paddingLeft: 12 }}>
              {orgName}
            </span>
          )}
        </div>
        {progress != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 100, height: 6, background: '#E2E7EF', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progress}%`,
                background: '#1BBFB0', borderRadius: 3, transition: 'width 0.35s',
              }} />
            </div>
            <span style={{ fontSize: 12, color: '#8898AA', fontWeight: 500, minWidth: 32 }}>{progress}%</span>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 920, margin: '0 auto', padding: '28px 20px 60px' }}>
        {children}
      </div>
    </div>
  )
}

// ── Loading indicator ───────────────────────────────────────
function SpinPage({ msg }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(27,191,176,0.18)', borderTopColor: '#1BBFB0', animation: 'as-spin 0.8s linear infinite' }} />
      <div style={{ marginTop: 16, fontSize: 14, color: '#8898AA' }}>{msg}</div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────
export default function Assessment() {
  const { token } = useParams()

  const [phase, setPhase]               = useState('loading')
  const [tokenData, setTokenData]       = useState(null)
  const [orgName, setOrgName]           = useState('')
  const [assessName, setAssessName]     = useState('')
  const [questions, setQuestions]       = useState([])
  const [activeDimIdx, setActiveDimIdx] = useState(0)
  const [answers, setAnswers]           = useState({})
  const [personalScores, setPersonalScores] = useState({})
  const [submitError, setSubmitError]   = useState('')

  useEffect(() => {
    async function init() {
      if (!token) { setPhase('invalid'); return }
      try {
        const { data: tkn, error: tknErr } = await supabase
          .from('response_tokens')
          .select('id, assessment_id, email, used, assessments ( id, name, organisations ( id, name ) )')
          .eq('token', token)
          .maybeSingle()

        if (tknErr) throw tknErr
        if (!tkn)   { setPhase('invalid'); return }
        if (tkn.used) { setPhase('used'); return }

        setTokenData(tkn)
        setAssessName(tkn.assessments?.name || 'Culture Assessment')
        setOrgName(tkn.assessments?.organisations?.name || '')

        const { data: qs, error: qErr } = await supabase
          .from('questions')
          .select('*')
          .order('order_num', { ascending: true })

        if (qErr) throw qErr
        setQuestions(qs || [])
        setPhase('survey')
      } catch {
        setPhase('invalid')
      }
    }
    init()
  }, [token])

  const activeDim   = dimensions[activeDimIdx]
  const dimQs       = activeDim ? questions.filter(q => q.dimension === activeDim.id) : []
  const totalAnswered = Object.keys(answers).length
  const totalQ      = questions.length
  const progress    = totalQ > 0 ? Math.round((totalAnswered / totalQ) * 100) : 0
  const allAnswered = totalQ > 0 && totalAnswered === totalQ

  function handleAnswer(qId, val) {
    setAnswers(prev => ({ ...prev, [qId]: val }))
  }

  async function handleSubmit() {
    setSubmitError('')
    setPhase('submitting')
    try {
      const { assessment_id: assessmentId, id: tokenId } = tokenData

      await supabase.from('responses').insert({
        assessment_id: assessmentId,
        token_id:      tokenId,
        answers,
      })

      await supabase.from('response_tokens').update({ used: true }).eq('id', tokenId)

      setPersonalScores(calcPersonalScores(answers, questions))

      await aggregateAndUpsertReport(assessmentId, questions)

      setPhase('complete')
    } catch (e) {
      setSubmitError(e.message || 'Something went wrong. Please try again.')
      setPhase('survey')
    }
  }

  // ─── Phase: loading ───
  if (phase === 'loading') {
    return (
      <PageShell orgName="">
        <SpinPage msg="Loading your assessment…" />
      </PageShell>
    )
  }

  // ─── Phase: invalid ───
  if (phase === 'invalid') {
    return (
      <PageShell orgName="">
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>⚠</div>
          <div style={{ fontWeight: 700, fontSize: 22, color: '#0B1D3E', marginBottom: 12 }}>
            This link is invalid or has expired
          </div>
          <div style={{ fontSize: 14, color: '#637082', maxWidth: 400, margin: '0 auto', lineHeight: 1.7 }}>
            Please check the link you received and try again, or contact your HR team for a new invitation.
          </div>
        </div>
      </PageShell>
    )
  }

  // ─── Phase: used ───
  if (phase === 'used') {
    return (
      <PageShell orgName={orgName}>
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 52, color: '#1BBFB0', marginBottom: 20 }}>✓</div>
          <div style={{ fontWeight: 700, fontSize: 22, color: '#0B1D3E', marginBottom: 12 }}>
            Already submitted
          </div>
          <div style={{ fontSize: 14, color: '#637082', maxWidth: 400, margin: '0 auto', lineHeight: 1.7 }}>
            You have already completed this assessment. Thank you for your contribution — your responses are making a difference.
          </div>
        </div>
      </PageShell>
    )
  }

  // ─── Phase: submitting ───
  if (phase === 'submitting') {
    return (
      <PageShell orgName={orgName}>
        <SpinPage msg="Saving your responses…" />
      </PageShell>
    )
  }

  // ─── Phase: complete ───
  if (phase === 'complete') {
    const scored = dimensions.filter(d => personalScores[d.id] != null)
    const avgPersonal = scored.length > 0
      ? Math.round(scored.reduce((s, d) => s + personalScores[d.id], 0) / scored.length)
      : null

    return (
      <PageShell orgName={orgName}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 60, color: '#1BBFB0', marginBottom: 16, lineHeight: 1 }}>✓</div>
            <div style={{ fontWeight: 700, fontSize: 24, color: '#0B1D3E', marginBottom: 10 }}>
              Survey Complete
            </div>
            <div style={{ fontSize: 14, color: '#637082', lineHeight: 1.7 }}>
              Thank you for completing the {assessName}
              {orgName && ` for ${orgName}`}.
              <br />
              Your responses are completely anonymous and help build a better culture.
            </div>
            {avgPersonal != null && (
              <div style={{ marginTop: 20 }}>
                <span style={{
                  display: 'inline-block', fontSize: 36, fontWeight: 800,
                  color: scoreColor(avgPersonal), lineHeight: 1,
                }}>
                  {avgPersonal}
                </span>
                <div style={{ fontSize: 13, color: '#8898AA', marginTop: 4 }}>Your personal culture score</div>
              </div>
            )}
          </div>

          <div style={{ background: 'white', borderRadius: 12, padding: '24px 28px', border: '1px solid #E2E7EF' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0B1D3E', marginBottom: 20 }}>
              Your Culture Profile
            </div>
            {dimensions.map(dim => {
              const s = personalScores[dim.id]
              if (s == null) return null
              return (
                <div key={dim.id} style={{ marginBottom: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                    <span style={{ color: '#0B1D3E' }}>{dim.icon} {dim.name}</span>
                    <span style={{ fontWeight: 700, color: scoreColor(s) }}>{s}</span>
                  </div>
                  <div style={{ height: 6, background: '#E2E7EF', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${s}%`,
                      background: scoreColor(s), borderRadius: 3, transition: 'width 0.8s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </PageShell>
    )
  }

  // ─── Phase: survey ───
  return (
    <PageShell orgName={orgName} progress={progress}>

      {/* Mobile dimension tabs */}
      <div className="as-mob-tabs" style={{
        display: 'none', overflowX: 'auto', gap: 8,
        padding: '4px 0 14px', marginBottom: 12, scrollbarWidth: 'none',
      }}>
        {dimensions.map((dim, idx) => {
          const done = questions.filter(q => q.dimension === dim.id).every(q => answers[q.id] != null)
          return (
            <button
              key={dim.id}
              onClick={() => { setActiveDimIdx(idx); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              style={{
                flexShrink: 0, padding: '8px 13px', borderRadius: 20,
                border: `1.5px solid ${activeDimIdx === idx ? '#1BBFB0' : '#E2E7EF'}`,
                background: activeDimIdx === idx ? 'rgba(27,191,176,0.08)' : 'white',
                color: activeDimIdx === idx ? '#0A8A7E' : '#637082',
                fontSize: 13, cursor: 'pointer', fontWeight: activeDimIdx === idx ? 600 : 400,
                whiteSpace: 'nowrap',
              }}
            >
              {dim.icon} {done ? '✓' : `${idx + 1}`}
            </button>
          )
        })}
      </div>

      {submitError && (
        <div style={{ padding: '12px 16px', background: '#FFF0EE', border: '1px solid rgba(232,86,58,0.2)', borderRadius: 10, color: '#E8563A', fontSize: 13, marginBottom: 16 }}>
          ⚠ {submitError}
        </div>
      )}

      <div className="as-layout" style={{ display: 'flex', gap: 20, alignItems: 'start' }}>

        {/* Desktop sidebar */}
        <div className="as-sidebar" style={{
          width: 216, flexShrink: 0,
          background: 'white', borderRadius: 12, padding: '20px 14px',
          border: '1px solid #E2E7EF',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#8898AA', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 14 }}>
            Dimensions
          </div>
          {dimensions.map((dim, idx) => {
            const dQs = questions.filter(q => q.dimension === dim.id)
            const answered = dQs.filter(q => answers[q.id] != null).length
            const done = answered === dQs.length && dQs.length > 0
            return (
              <button
                key={dim.id}
                onClick={() => { setActiveDimIdx(idx); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  width: '100%', textAlign: 'left', border: 'none',
                  padding: '9px 10px', borderRadius: 8, cursor: 'pointer',
                  background: activeDimIdx === idx ? 'rgba(27,191,176,0.08)' : 'transparent',
                  borderLeft: `3px solid ${activeDimIdx === idx ? '#1BBFB0' : 'transparent'}`,
                  marginBottom: 2,
                }}
              >
                <span style={{ fontSize: 14 }}>{dim.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: activeDimIdx === idx ? 600 : 400, color: '#0B1D3E', lineHeight: 1.3 }}>
                    {dim.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#8898AA' }}>{answered}/{dQs.length}</div>
                </div>
                {done && <span style={{ color: '#1BBFB0', fontSize: 13, flexShrink: 0 }}>✓</span>}
              </button>
            )
          })}
          <div style={{ marginTop: 16, borderTop: '1px solid #E2E7EF', paddingTop: 14 }}>
            <div style={{ fontSize: 11, color: '#8898AA', marginBottom: 5 }}>Overall progress</div>
            <div style={{ height: 6, background: '#E2E7EF', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: '#1BBFB0', borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: 11, color: '#8898AA', marginTop: 4 }}>{totalAnswered}/{totalQ} answered</div>
          </div>
        </div>

        {/* Question panel */}
        <div className="as-q-panel" style={{
          flex: 1, background: 'white', borderRadius: 12,
          padding: '24px 28px', border: '1px solid #E2E7EF',
        }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: '#8898AA', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 5 }}>
              Dimension {activeDimIdx + 1} of {dimensions.length}
            </div>
            <div style={{ fontWeight: 700, fontSize: 20, color: '#0B1D3E', marginBottom: 6 }}>
              {activeDim?.icon} {activeDim?.name}
            </div>
            <div style={{ fontSize: 13, color: '#637082', lineHeight: 1.65 }}>
              {activeDim?.description}
            </div>
          </div>

          {/* Scale header labels — hidden on mobile */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 8 }}>
            {SCALE.map(v => (
              <div key={v} className="as-scale-lbl" style={{ width: 64, textAlign: 'center', fontSize: 10, color: '#8898AA', fontWeight: 500, lineHeight: 1.3 }}>
                {SCALE_LABELS[v]}
              </div>
            ))}
          </div>

          {dimQs.length === 0 && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#8898AA', fontSize: 13 }}>
              No questions for this dimension yet.
            </div>
          )}

          {dimQs.map((q, qi) => (
            <div
              key={q.id}
              style={{
                padding: '16px 0',
                borderBottom: qi < dimQs.length - 1 ? '1px solid #E2E7EF' : 'none',
              }}
            >
              <div className="as-q-text" style={{ fontSize: 14, color: '#0B1D3E', marginBottom: 12, lineHeight: 1.65 }}>
                {qi + 1}. {q.text}
              </div>
              <div className="as-scale-row" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {SCALE.map(v => (
                  <button
                    key={v}
                    className="as-scale-btn"
                    onClick={() => handleAnswer(q.id, v)}
                    style={{
                      width: 64, height: 42, borderRadius: 9, cursor: 'pointer',
                      border: `1.5px solid ${answers[q.id] === v ? '#1BBFB0' : '#D1D9E6'}`,
                      background: answers[q.id] === v ? 'rgba(27,191,176,0.1)' : 'white',
                      color: answers[q.id] === v ? '#0A8A7E' : '#637082',
                      fontWeight: answers[q.id] === v ? 700 : 400,
                      fontSize: 15, transition: 'all 0.12s',
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="as-nav-btns" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 12 }}>
            <button
              disabled={activeDimIdx === 0}
              onClick={() => { setActiveDimIdx(i => i - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              style={{
                padding: '10px 20px', borderRadius: 9, border: '1.5px solid #D1D9E6',
                background: 'white', color: '#637082', fontSize: 14, cursor: 'pointer',
                opacity: activeDimIdx === 0 ? 0.4 : 1,
              }}
            >
              ← Previous
            </button>

            {activeDimIdx < dimensions.length - 1 ? (
              <button
                onClick={() => { setActiveDimIdx(i => i + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                style={{
                  padding: '10px 22px', borderRadius: 9, border: 'none',
                  background: '#1BBFB0', color: 'white', fontSize: 14,
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!allAnswered}
                title={!allAnswered ? `${totalQ - totalAnswered} question${totalQ - totalAnswered !== 1 ? 's' : ''} remaining` : ''}
                style={{
                  padding: '10px 22px', borderRadius: 9, border: 'none',
                  background: allAnswered ? '#1BBFB0' : '#D1D9E6',
                  color: allAnswered ? 'white' : '#8898AA',
                  fontSize: 14, fontWeight: 600,
                  cursor: allAnswered ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s',
                }}
              >
                Submit Survey ✓
              </button>
            )}
          </div>

          {!allAnswered && activeDimIdx === dimensions.length - 1 && totalQ > 0 && (
            <div style={{ textAlign: 'right', marginTop: 10, fontSize: 12, color: '#8898AA' }}>
              {totalQ - totalAnswered} question{totalQ - totalAnswered !== 1 ? 's' : ''} still unanswered
            </div>
          )}
        </div>

      </div>
    </PageShell>
  )
}
