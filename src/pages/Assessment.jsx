import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import supabase from '../lib/supabaseClient'

const SCALE = [1, 2, 3, 4, 5]
const SCALE_LABELS = { 1: 'Strongly Disagree', 2: 'Disagree', 3: 'Neutral', 4: 'Agree', 5: 'Strongly Agree' }

function calcTiming(submittedAt, liveStart, liveEnd) {
  const sub = new Date(submittedAt).getTime()
  if (liveEnd && sub > new Date(liveEnd).getTime()) return 'late'
  if (liveStart && liveEnd) {
    const mid = new Date(liveStart).getTime() + (new Date(liveEnd).getTime() - new Date(liveStart).getTime()) / 2
    return sub < mid ? 'early' : 'on_time'
  }
  return 'on_time'
}

function isAnswered(q, val) {
  if (val == null) return false
  if (Array.isArray(val)) return val.length > 0
  if (typeof val === 'object') return Object.keys(val).length > 0
  return val !== ''
}

function inputStyle(answered) {
  return {
    width: '100%', padding: '10px 14px', borderRadius: 9,
    border: `1.5px solid ${answered ? '#1BBFB0' : '#D1D9E6'}`,
    fontSize: 14, fontFamily: 'inherit', color: '#0B1D3E', outline: 'none',
    transition: 'border-color 0.12s', background: 'white', boxSizing: 'border-box',
  }
}

// ── Question renderers ─────────────────────────────────────

function QuestionRenderer({ q, value, onChange, respondentId }) {
  const type = q.question_type
  const answered = isAnswered(q, value)

  // FILE upload state lives here
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const fileRef = useRef(null)

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setUploadErr('')
    try {
      const path = `${respondentId}/${q.id}/${Date.now()}_${file.name}`
      const { data, error } = await supabase.storage.from('survey-files').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('survey-files').getPublicUrl(data.path)
      onChange(publicUrl)
    } catch (err) {
      setUploadErr(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // SHORT_TEXT
  if (type === 'SHORT_TEXT') {
    return (
      <input
        type="text"
        style={inputStyle(answered)}
        placeholder="Your answer…"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      />
    )
  }

  // LONG_TEXT or legacy 'text'
  if (type === 'LONG_TEXT' || type === 'text') {
    return (
      <textarea
        style={{ ...inputStyle(answered), resize: 'vertical', minHeight: 90 }}
        placeholder="Type your response here…"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      />
    )
  }

  // SINGLE_CHOICE
  if (type === 'SINGLE_CHOICE') {
    const choices = q.options?.choices || []
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
        {choices.map(c => (
          <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 9, border: `1.5px solid ${value === c ? '#1BBFB0' : '#D1D9E6'}`, background: value === c ? 'rgba(27,191,176,0.07)' : 'white', cursor: 'pointer', transition: 'all 0.12s' }}>
            <input type="radio" name={`q-${q.id}`} value={c} checked={value === c} onChange={() => onChange(c)} style={{ accentColor: '#1BBFB0', width: 16, height: 16, flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: '#0B1D3E', lineHeight: 1.5 }}>{c}</span>
          </label>
        ))}
      </div>
    )
  }

  // MULTI_CHOICE
  if (type === 'MULTI_CHOICE') {
    const choices = q.options?.choices || []
    const selected = Array.isArray(value) ? value : []
    function toggle(c) {
      onChange(selected.includes(c) ? selected.filter(x => x !== c) : [...selected, c])
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
        {choices.map(c => {
          const checked = selected.includes(c)
          return (
            <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 9, border: `1.5px solid ${checked ? '#1BBFB0' : '#D1D9E6'}`, background: checked ? 'rgba(27,191,176,0.07)' : 'white', cursor: 'pointer', transition: 'all 0.12s' }}>
              <input type="checkbox" checked={checked} onChange={() => toggle(c)} style={{ accentColor: '#1BBFB0', width: 16, height: 16, flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: '#0B1D3E', lineHeight: 1.5 }}>{c}</span>
            </label>
          )
        })}
        {selected.length > 0 && <div style={{ fontSize: 12, color: '#8898AA', marginTop: 2 }}>{selected.length} selected</div>}
      </div>
    )
  }

  // DROPDOWN
  if (type === 'DROPDOWN') {
    const choices = q.options?.choices || []
    return (
      <select
        style={{ ...inputStyle(answered), appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%238898AA\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: 18, paddingRight: 40 }}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">— Select an option —</option>
        {choices.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    )
  }

  // RATING_SCALE
  if (type === 'RATING_SCALE') {
    const { min = 1, max = 10, min_label = '', max_label = '' } = q.options || {}
    const scale = Array.from({ length: Number(max) - Number(min) + 1 }, (_, i) => Number(min) + i)
    return (
      <div>
        {(min_label || max_label) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#8898AA', marginBottom: 8 }}>
            <span>{min_label}</span><span>{max_label}</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {scale.map(v => (
            <button
              key={v}
              onClick={() => onChange(v)}
              style={{
                width: 44, height: 44, borderRadius: 9, cursor: 'pointer',
                border: `1.5px solid ${value === v ? '#1BBFB0' : '#D1D9E6'}`,
                background: value === v ? 'rgba(27,191,176,0.1)' : 'white',
                color: value === v ? '#0A8A7E' : '#637082',
                fontWeight: value === v ? 700 : 400,
                fontSize: 14, transition: 'all 0.12s', fontFamily: 'inherit',
              }}
            >
              {v}
            </button>
          ))}
        </div>
        {value != null && (
          <div style={{ fontSize: 12, color: '#0A8A7E', marginTop: 8, fontWeight: 500 }}>Selected: {value}</div>
        )}
      </div>
    )
  }

  // MATRIX
  if (type === 'MATRIX') {
    const { rows = [], cols = [] } = q.options || {}
    const rowAnswers = (typeof value === 'object' && !Array.isArray(value)) ? value : {}
    function pickCell(row, col) { onChange({ ...rowAnswers, [row]: col }) }
    const allRowsAnswered = rows.every(r => rowAnswers[r] != null)
    return (
      <div style={{ overflowX: 'auto', marginTop: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: '#8898AA', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #E2E7EF', minWidth: 130 }}></th>
              {cols.map(c => (
                <th key={c} style={{ textAlign: 'center', padding: '8px 10px', color: '#637082', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #E2E7EF', whiteSpace: 'nowrap' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row} style={{ background: ri % 2 === 0 ? 'white' : '#FAFBFD' }}>
                <td style={{ padding: '12px', color: '#0B1D3E', fontWeight: 500, lineHeight: 1.45, borderBottom: ri < rows.length - 1 ? '1px solid #F0F3F8' : 'none' }}>{row}</td>
                {cols.map(col => (
                  <td key={col} style={{ textAlign: 'center', padding: '12px 10px', borderBottom: ri < rows.length - 1 ? '1px solid #F0F3F8' : 'none' }}>
                    <button
                      onClick={() => pickCell(row, col)}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
                        border: `2px solid ${rowAnswers[row] === col ? '#1BBFB0' : '#D1D9E6'}`,
                        background: rowAnswers[row] === col ? '#1BBFB0' : 'white',
                        transition: 'all 0.12s',
                      }}
                      title={`${row} → ${col}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!allRowsAnswered && rows.length > 0 && (
          <div style={{ fontSize: 11.5, color: '#8898AA', marginTop: 8 }}>
            {rows.filter(r => !rowAnswers[r]).length} row{rows.filter(r => !rowAnswers[r]).length !== 1 ? 's' : ''} still unselected
          </div>
        )}
      </div>
    )
  }

  // DATE
  if (type === 'DATE') {
    return (
      <input
        type="date"
        style={{ ...inputStyle(answered), maxWidth: 240 }}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      />
    )
  }

  // TIME
  if (type === 'TIME') {
    return (
      <input
        type="time"
        style={{ ...inputStyle(answered), maxWidth: 180 }}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      />
    )
  }

  // FILE
  if (type === 'FILE') {
    return (
      <div>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} />
        {value ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: '10px 14px', borderRadius: 9, border: '1.5px solid #1BBFB0', background: 'rgba(27,191,176,0.07)', fontSize: 13, color: '#0A8A7E', flex: 1, wordBreak: 'break-all' }}>
              📎 {typeof value === 'string' ? value.split('/').pop().replace(/^\d+_/, '') : 'File uploaded'}
            </div>
            <button onClick={() => { onChange(null); if (fileRef.current) fileRef.current.value = '' }} style={{ background: 'none', border: '1.5px solid #D1D9E6', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#637082', cursor: 'pointer', fontFamily: 'inherit' }}>
              Change
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current.click()}
            disabled={uploading}
            style={{
              padding: '12px 20px', borderRadius: 9, border: '1.5px dashed #D1D9E6', background: 'white',
              fontSize: 14, color: uploading ? '#8898AA' : '#637082', cursor: uploading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8, transition: 'border-color 0.12s',
            }}
            onMouseEnter={e => { if (!uploading) e.currentTarget.style.borderColor = '#1BBFB0' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#D1D9E6' }}
          >
            {uploading
              ? <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(27,191,176,0.2)', borderTopColor: '#1BBFB0', animation: 'as-spin 0.8s linear infinite' }} /> Uploading…</>
              : <>📎 Choose File</>
            }
          </button>
        )}
        {uploadErr && <div style={{ fontSize: 12, color: '#E8563A', marginTop: 6 }}>⚠ {uploadErr}</div>}
        <div style={{ fontSize: 12, color: '#8898AA', marginTop: 6 }}>File will be uploaded securely.</div>
      </div>
    )
  }

  // LIKERT (default, also handles legacy 'likert')
  return (
    <div className="as-scale-row" style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
      {SCALE.map(v => {
        const active = value === v
        const [word1, word2] = SCALE_LABELS[v].split(' ')
        return (
          <button
            key={v}
            className="as-scale-btn"
            onClick={() => onChange(v)}
            style={{
              width: 72, minHeight: 72, borderRadius: 9, cursor: 'pointer',
              border: `1.5px solid ${active ? '#1BBFB0' : '#D1D9E6'}`,
              background: active ? 'rgba(27,191,176,0.1)' : 'white',
              color: active ? '#0A8A7E' : '#637082',
              transition: 'all 0.12s', fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 2, padding: '8px 4px',
            }}
          >
            <span style={{ fontSize: 16, fontWeight: active ? 700 : 500, lineHeight: 1 }}>{v}</span>
            <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, lineHeight: 1.25, textAlign: 'center', color: active ? '#0A8A7E' : '#8898AA' }}>
              {word1}
            </span>
            {word2 && (
              <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, lineHeight: 1.25, textAlign: 'center', color: active ? '#0A8A7E' : '#8898AA' }}>
                {word2}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Layout shells ──────────────────────────────────────────

function PageShell({ surveyTitle, progress, children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F4F6FA', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <style>{`
        @keyframes as-spin { to { transform: rotate(360deg); } }
        @media (max-width: 680px) {
          .as-q-panel { padding: 18px 16px !important; }
          .as-q-text  { font-size: 15px !important; }
          .as-scale-row { justify-content: stretch !important; flex-wrap: wrap !important; }
          .as-scale-btn { min-width: 0 !important; width: auto !important; min-height: 72px !important; flex: 1 !important; }
          .as-nav-btns  { flex-direction: column-reverse !important; gap: 10px !important; }
          .as-nav-btns button { width: 100% !important; padding: 14px !important; font-size: 15px !important; }
        }
      `}</style>

      <div style={{ background: 'white', borderBottom: '1px solid #E2E7EF', height: 60, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.5px' }}>
            <span style={{ color: '#0B1D3E' }}>Culture</span><span style={{ color: '#1BBFB0' }}>Xe</span>
          </div>
          {surveyTitle && (
            <span style={{ fontSize: 13, color: '#8898AA', borderLeft: '1px solid #E2E7EF', paddingLeft: 12 }}>{surveyTitle}</span>
          )}
        </div>
        {progress != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 100, height: 6, background: '#E2E7EF', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: '#1BBFB0', borderRadius: 3, transition: 'width 0.35s' }} />
            </div>
            <span style={{ fontSize: 12, color: '#8898AA', fontWeight: 500, minWidth: 32 }}>{progress}%</span>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px 60px' }}>
        {children}
      </div>
    </div>
  )
}

function SpinPage({ msg }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(27,191,176,0.18)', borderTopColor: '#1BBFB0', animation: 'as-spin 0.8s linear infinite' }} />
      <div style={{ marginTop: 16, fontSize: 14, color: '#8898AA' }}>{msg}</div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────

export default function Assessment() {
  const { token } = useParams()
  const navigate  = useNavigate()

  const [phase, setPhase]               = useState('loading')
  const [respondent, setRespondent]     = useState(null)
  const [survey, setSurvey]             = useState(null)
  const [questions, setQuestions]       = useState([])
  const [answers, setAnswers]           = useState({})
  const [page, setPage]                 = useState(0)
  const [submitError, setSubmitError]   = useState('')
  const [navError, setNavError]         = useState('')

  useEffect(() => {
    async function init() {
      if (!token) { setPhase('invalid'); return }
      try {
        const { data: resp, error: rErr } = await supabase
          .from('survey_respondents')
          .select('*, survey(*)')
          .eq('token', token)
          .maybeSingle()

        if (rErr) throw rErr
        if (!resp) { setPhase('invalid'); return }
        if (resp.used) { setPhase('used'); return }

        const sv = resp.survey
        if (sv?.status !== 'live') { setPhase('not_live'); return }

        setRespondent(resp)
        setSurvey(sv)

        const { data: qs, error: qErr } = await supabase
          .from('survey_questions')
          .select('*')
          .eq('survey_id', sv.id)
          .order('order_num')

        if (qErr) throw qErr
        setQuestions(qs || [])
        setPhase('survey')
      } catch {
        setPhase('invalid')
      }
    }
    init()
  }, [token])

  // Paging: group by dimension if present, otherwise flat pages of 5
  const dimensions = [...new Set(questions.map(q => q.dimension || '').filter(Boolean))]
  const hasDimensions = dimensions.length > 0

  let pages = []
  if (hasDimensions) {
    const noDim = questions.filter(q => !q.dimension)
    for (const dim of dimensions) {
      pages.push({ label: dim, qs: questions.filter(q => q.dimension === dim) })
    }
    if (noDim.length) pages.push({ label: 'Other', qs: noDim })
  } else {
    const chunkSize = 5
    for (let i = 0; i < questions.length; i += chunkSize) {
      pages.push({ label: `Questions ${i + 1}–${Math.min(i + chunkSize, questions.length)}`, qs: questions.slice(i, i + chunkSize) })
    }
  }

  const currentPage = pages[page] || { label: '', qs: [] }
  const totalQ = questions.length
  const totalAnswered = questions.filter(q => isAnswered(q, answers[q.id])).length
  const progress = totalQ > 0 ? Math.round((totalAnswered / totalQ) * 100) : 0
  const allAnswered = totalQ > 0 && totalAnswered === totalQ
  const isLastPage = page === pages.length - 1

  // A page is complete only when every question on it is answered (all compulsory).
  const pageComplete = (i) => (pages[i]?.qs || []).every(q => isAnswered(q, answers[q.id]))
  // A section is reachable only when every earlier section is complete.
  const canAccess = (i) => {
    for (let j = 0; j < i; j++) if (!pageComplete(j)) return false
    return true
  }
  const currentPageComplete = pageComplete(page)
  const currentRemaining = currentPage.qs.filter(q => !isAnswered(q, answers[q.id])).length

  function handleAnswer(qId, val) {
    setAnswers(prev => ({ ...prev, [qId]: val }))
  }

  async function handleSubmit() {
    // Compulsory: every question must be answered before a submission is allowed.
    if (!allAnswered) {
      const firstIncomplete = pages.findIndex((_, i) => !pageComplete(i))
      if (firstIncomplete !== -1) { setPage(firstIncomplete); window.scrollTo({ top: 0, behavior: 'smooth' }) }
      setSubmitError(`You have ${totalQ - totalAnswered} unanswered question${totalQ - totalAnswered !== 1 ? 's' : ''}. All questions are required before you can submit.`)
      return
    }
    setSubmitError('')
    setPhase('submitting')
    try {
      const now = new Date().toISOString()
      const timing = calcTiming(now, survey?.live_start, survey?.live_end)

      await supabase.from('survey_responses').insert({
        survey_id:     respondent.survey_id,
        respondent_id: respondent.id,
        answers,
        submitted_at:  now,
      })

      await supabase
        .from('survey_respondents')
        .update({ used: true, submitted_at: now, response_timing: timing })
        .eq('id', respondent.id)

      setPhase('complete')
    } catch (e) {
      setSubmitError(e.message || 'Something went wrong. Please try again.')
      setPhase('survey')
    }
  }

  // ── Phases ─────────────────────────────────────────────────

  if (phase === 'loading') {
    return <PageShell><SpinPage msg="Loading your survey…" /></PageShell>
  }

  if (phase === 'invalid') {
    return (
      <PageShell>
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>⚠</div>
          <div style={{ fontWeight: 700, fontSize: 22, color: '#0B1D3E', marginBottom: 12 }}>This link is invalid or has expired</div>
          <div style={{ fontSize: 14, color: '#637082', maxWidth: 400, margin: '0 auto', lineHeight: 1.7 }}>
            Please check the link you received and try again, or contact your HR team for a new invitation.
          </div>
        </div>
      </PageShell>
    )
  }

  if (phase === 'not_live') {
    return (
      <PageShell>
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>⏳</div>
          <div style={{ fontWeight: 700, fontSize: 22, color: '#0B1D3E', marginBottom: 12 }}>Survey Not Active</div>
          <div style={{ fontSize: 14, color: '#637082', maxWidth: 400, margin: '0 auto', lineHeight: 1.7 }}>
            This survey is not currently live. Please check back later or contact your HR team.
          </div>
        </div>
      </PageShell>
    )
  }

  if (phase === 'used') {
    return (
      <PageShell surveyTitle={survey?.title}>
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 52, color: '#1BBFB0', marginBottom: 20 }}>✓</div>
          <div style={{ fontWeight: 700, fontSize: 22, color: '#0B1D3E', marginBottom: 12 }}>Already submitted</div>
          <div style={{ fontSize: 14, color: '#637082', maxWidth: 400, margin: '0 auto', lineHeight: 1.7 }}>
            You have already completed this survey. Thank you for your contribution.
          </div>
        </div>
      </PageShell>
    )
  }

  if (phase === 'submitting') {
    return <PageShell surveyTitle={survey?.title}><SpinPage msg="Saving your responses…" /></PageShell>
  }

  if (phase === 'complete') {
    return (
      <PageShell surveyTitle={survey?.title}>
        <style>{`
          @keyframes as-complete-pop {
            0%   { opacity: 0; transform: scale(0.88) translateY(18px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes as-complete-progress {
            from { width: 0%; }
            to   { width: 100%; }
          }
          @keyframes as-tick-draw {
            from { stroke-dashoffset: 60; }
            to   { stroke-dashoffset: 0; }
          }
        `}</style>

        <div style={{ maxWidth: 520, margin: '60px auto', animation: 'as-complete-pop 0.45s cubic-bezier(0.22,1,0.36,1) forwards' }}>

          {/* Card */}
          <div style={{ background: 'white', borderRadius: 20, padding: '52px 40px 44px', border: '1px solid #E2E7EF', boxShadow: '0 8px 40px rgba(13,31,60,0.08)', textAlign: 'center' }}>

            {/* Animated tick */}
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #1BBFB0 0%, #0A8A7E 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: '0 6px 24px rgba(27,191,176,0.35)' }}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <polyline
                  points="7,19 15,27 29,11"
                  stroke="white"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="60"
                  strokeDashoffset="60"
                  style={{ animation: 'as-tick-draw 0.5s 0.2s cubic-bezier(0.22,1,0.36,1) forwards' }}
                />
              </svg>
            </div>

            <div style={{ fontWeight: 800, fontSize: 26, color: '#0B1D3E', letterSpacing: '-0.4px', marginBottom: 12 }}>
              Thank you!
            </div>
            <div style={{ fontSize: 15, color: '#4A6380', lineHeight: 1.75, marginBottom: 32, maxWidth: 380, margin: '0 auto 32px' }}>
              Your responses to the <strong style={{ color: '#0B1D3E' }}>{survey?.title}</strong> have been recorded. Your honest input helps shape a stronger culture at DBN.
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: '#EEF2F7', margin: '0 -40px 28px' }} />

            <div style={{ fontSize: 13, color: '#8898AA', marginBottom: 20 }}>
              Returning to the home page in a few seconds…
            </div>

            {/* Progress bar */}
            <div style={{ height: 4, background: '#EEF2F7', borderRadius: 2, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{
                height: '100%', background: 'linear-gradient(90deg, #1BBFB0, #0A8A7E)',
                borderRadius: 2,
                animation: 'as-complete-progress 4s linear forwards',
                onAnimationEnd: () => navigate('/', { replace: true }),
              }} onAnimationEnd={() => navigate('/', { replace: true })} />
            </div>

            <button
              onClick={() => navigate('/', { replace: true })}
              style={{ background: 'none', border: '1.5px solid #D1D9E6', borderRadius: 9, padding: '10px 22px', fontSize: 13.5, color: '#637082', cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#1BBFB0'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#D1D9E6'}
            >
              Go now →
            </button>
          </div>
        </div>
      </PageShell>
    )
  }

  // ── Phase: survey ───────────────────────────────────────────

  const hasLikertOnPage = currentPage.qs.some(q => q.question_type === 'likert' || q.question_type === 'LIKERT')

  return (
    <PageShell surveyTitle={survey?.title} progress={progress}>

      {submitError && (
        <div style={{ padding: '12px 16px', background: '#FFF0EE', border: '1px solid rgba(232,86,58,0.2)', borderRadius: 10, color: '#E8563A', fontSize: 13, marginBottom: 16 }}>
          ⚠ {submitError}
        </div>
      )}

      {navError && (
        <div style={{ padding: '12px 16px', background: '#FFF8EC', border: '1px solid rgba(214,158,46,0.25)', borderRadius: 10, color: '#9A6B00', fontSize: 13, marginBottom: 16 }}>
          ⚠ {navError}
        </div>
      )}

      {/* Page progress pills */}
      {pages.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
          {pages.map((p, i) => {
            const current = i === page
            const locked = !canAccess(i)
            return (
              <button
                key={i}
                onClick={() => {
                  if (locked) {
                    setNavError('Please complete all questions in the current section before moving on.')
                    return
                  }
                  setNavError('')
                  setPage(i)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                style={{
                  padding: '6px 13px', borderRadius: 20, fontSize: 12.5, cursor: 'pointer',
                  border: `1.5px solid ${current ? '#1BBFB0' : '#D1D9E6'}`,
                  background: current ? '#1BBFB0' : 'white',
                  color: current ? 'white' : '#0B1D3E',
                  fontFamily: 'inherit',
                  fontWeight: current ? 600 : 500,
                  transition: 'all 0.15s',
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      )}

      <div className="as-q-panel" style={{ background: 'white', borderRadius: 12, padding: '28px 32px', border: '1px solid #E2E7EF' }}>

        {hasDimensions && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: '#8898AA', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 4 }}>
              Section {page + 1} of {pages.length}
            </div>
            <div style={{ fontWeight: 700, fontSize: 20, color: '#0B1D3E' }}>{currentPage.label}</div>
          </div>
        )}


        {currentPage.qs.map((q, qi) => (
          <div key={q.id} style={{ padding: '20px 0', borderBottom: qi < currentPage.qs.length - 1 ? '1px solid #E2E7EF' : 'none' }}>
            <div className="as-q-text" style={{ fontSize: 14, color: '#0B1D3E', marginBottom: 6, lineHeight: 1.65, fontWeight: 500 }}>
              {q.text}
            </div>
            {q.hint && (
              <div style={{ fontSize: 12.5, color: '#8898AA', marginBottom: 12, lineHeight: 1.55 }}>{q.hint}</div>
            )}
            <QuestionRenderer
              q={q}
              value={answers[q.id]}
              onChange={val => handleAnswer(q.id, val)}
              respondentId={respondent?.id}
            />
          </div>
        ))}

        {/* Navigation */}
        <div className="as-nav-btns" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, gap: 12 }}>
          <button
            disabled={page === 0}
            onClick={() => { setPage(i => i - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            style={{ padding: '11px 22px', borderRadius: 9, border: '1.5px solid #D1D9E6', background: 'white', color: '#637082', fontSize: 14, cursor: 'pointer', opacity: page === 0 ? 0.4 : 1, fontFamily: 'inherit' }}
          >← Previous</button>

          {!isLastPage ? (
            <button
              onClick={() => {
                if (!currentPageComplete) {
                  setNavError('Please answer every question in this section before continuing.')
                  return
                }
                setNavError('')
                setPage(i => i + 1)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              disabled={!currentPageComplete}
              style={{
                padding: '11px 24px', borderRadius: 9, border: 'none',
                background: currentPageComplete ? '#1BBFB0' : '#B7E5DF',
                color: 'white', fontSize: 14, fontWeight: 600,
                cursor: currentPageComplete ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
              }}
            >Next →</button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered}
              style={{
                padding: '11px 24px', borderRadius: 9, border: 'none',
                background: allAnswered ? '#1BBFB0' : '#B7E5DF',
                color: 'white',
                fontSize: 14, fontWeight: 600,
                cursor: allAnswered ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s', fontFamily: 'inherit',
              }}
            >Submit Survey ✓</button>
          )}
        </div>

        {!currentPageComplete && totalQ > 0 && (
          <div style={{ textAlign: 'right', marginTop: 10, fontSize: 12, color: '#E8563A' }}>
            {currentRemaining} question{currentRemaining !== 1 ? 's' : ''} in this section still need{currentRemaining === 1 ? 's' : ''} an answer — all questions are required.
          </div>
        )}
      </div>
    </PageShell>
  )
}
