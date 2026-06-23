import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useClientSurvey } from '../hooks/useClientSurvey'
import supabase from '../lib/supabaseClient'

// ── Helpers ────────────────────────────────────────────────

function calcTimeLeft(liveEnd) {
  if (!liveEnd) return null
  const diff = new Date(liveEnd).getTime() - Date.now()
  if (diff <= 0) return { expired: true, total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 }
  const days    = Math.floor(diff / 86400000)
  const hours   = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  return { expired: false, total: diff, days, hours, minutes, seconds }
}

function useCountdown(liveEnd) {
  const [t, setT] = useState(() => calcTimeLeft(liveEnd))
  useEffect(() => {
    setT(calcTimeLeft(liveEnd))
    const id = setInterval(() => setT(calcTimeLeft(liveEnd)), 1000)
    return () => clearInterval(id)
  }, [liveEnd])
  return t
}

function formatCountdown(t) {
  if (!t) return null
  if (t.expired) return { text: 'Survey closed', urgent: true }
  if (t.days > 1)   return { text: `${t.days} days ${t.hours}h remaining`, urgent: false }
  if (t.days === 1) return { text: `1 day ${t.hours}h ${t.minutes}m remaining`, urgent: false }
  if (t.hours > 0)  return { text: `${t.hours}h ${t.minutes}m ${t.seconds}s remaining`, urgent: t.hours < 2 }
  return { text: `${t.minutes}m ${t.seconds}s remaining`, urgent: true }
}

function isAnswered(q, val) {
  if (val == null) return false
  if (Array.isArray(val)) return val.length > 0
  if (typeof val === 'object') return Object.keys(val).length > 0
  return val !== ''
}

const SCALE = [1, 2, 3, 4, 5]
const SCALE_LABELS = { 1: 'Strongly Disagree', 2: 'Disagree', 3: 'Neutral', 4: 'Agree', 5: 'Strongly Agree' }

function Spin({ size = 20, color = '#1BBFB0' }) {
  return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: '50%', border: `2px solid ${color}22`, borderTopColor: color, animation: 'cp-spin 0.7s linear infinite', flexShrink: 0 }} />
}

// ── SVG Icons ──────────────────────────────────────────────
const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1BBFB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
)
const IconLock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1BBFB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)
const IconCloud = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1BBFB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16"/>
    <line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
)
const IconStar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1BBFB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)
const IconClock = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#A0B0C0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)
const IconCheck = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1BBFB0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)
const IconPaperclip = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
)

// ── Question renderer ──────────────────────────────────────

function QuestionInput({ q, value, onChange, userId, showError }) {
  const type = q.question_type
  const answered = isAnswered(q, value)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const fileRef = useRef(null)

  const border = answered ? '#1BBFB0' : showError ? '#E8563A' : '#E0E8F0'
  const base = { width: '100%', padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${border}`, fontSize: 14, fontFamily: 'inherit', color: '#1A2E44', outline: 'none', transition: 'border-color 0.15s', background: 'white', boxSizing: 'border-box' }

  async function handleFile(e) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true); setUploadErr('')
    try {
      const path = `${userId || 'anon'}/${q.id}/${Date.now()}_${file.name}`
      const { data, error } = await supabase.storage.from('survey-files').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('survey-files').getPublicUrl(data.path)
      onChange(publicUrl)
    } catch (err) { setUploadErr(err.message || 'Upload failed') }
    finally { setUploading(false) }
  }

  if (type === 'SHORT_TEXT') return <input type="text" style={base} placeholder="Your answer…" value={value || ''} onChange={e => onChange(e.target.value)} />

  if (type === 'LONG_TEXT' || type === 'text') return <textarea style={{ ...base, minHeight: 100, resize: 'vertical' }} placeholder="Type your response here…" value={value || ''} onChange={e => onChange(e.target.value)} />

  if (type === 'SINGLE_CHOICE') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
        {(q.options?.choices || []).map(c => (
          <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${value === c ? '#1BBFB0' : '#E0E8F0'}`, background: value === c ? '#F0FAFA' : 'white', cursor: 'pointer', transition: 'all 0.12s' }}>
            <input type="radio" name={`q-${q.id}`} value={c} checked={value === c} onChange={() => onChange(c)} style={{ accentColor: '#1BBFB0', width: 17, height: 17, flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: '#1A2E44' }}>{c}</span>
          </label>
        ))}
      </div>
    )
  }

  if (type === 'MULTI_CHOICE') {
    const sel = Array.isArray(value) ? value : []
    const toggle = c => onChange(sel.includes(c) ? sel.filter(x => x !== c) : [...sel, c])
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
        {(q.options?.choices || []).map(c => {
          const checked = sel.includes(c)
          return (
            <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${checked ? '#1BBFB0' : '#E0E8F0'}`, background: checked ? '#F0FAFA' : 'white', cursor: 'pointer', transition: 'all 0.12s' }}>
              <input type="checkbox" checked={checked} onChange={() => toggle(c)} style={{ accentColor: '#1BBFB0', width: 17, height: 17, flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: '#1A2E44' }}>{c}</span>
            </label>
          )
        })}
        {sel.length > 0 && <div style={{ fontSize: 12, color: '#7A9BB0', marginTop: 2 }}>{sel.length} selected</div>}
      </div>
    )
  }

  if (type === 'DROPDOWN') {
    return (
      <select style={{ ...base, appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%238898AA\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: 18, paddingRight: 40 }}
        value={value || ''} onChange={e => onChange(e.target.value)}>
        <option value="">— Select —</option>
        {(q.options?.choices || []).map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    )
  }

  if (type === 'RATING_SCALE') {
    const { min = 1, max = 10, min_label = '', max_label = '' } = q.options || {}
    const scale = Array.from({ length: Number(max) - Number(min) + 1 }, (_, i) => Number(min) + i)
    return (
      <div>
        {(min_label || max_label) && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#7A9BB0', marginBottom: 8 }}><span>{min_label}</span><span>{max_label}</span></div>}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {scale.map(v => (
            <button key={v} onClick={() => onChange(v)} style={{ width: 46, height: 46, borderRadius: 10, border: `1.5px solid ${value === v ? '#1BBFB0' : '#E0E8F0'}`, background: value === v ? '#F0FAFA' : 'white', color: value === v ? '#0A8A7E' : '#637082', fontWeight: value === v ? 700 : 400, fontSize: 14, cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'inherit' }}>
              {v}
            </button>
          ))}
        </div>
        {value != null && <div style={{ fontSize: 12.5, color: '#0A8A7E', marginTop: 8, fontWeight: 500 }}>Selected: {value}</div>}
      </div>
    )
  }

  if (type === 'MATRIX') {
    const { rows = [], cols = [] } = q.options || {}
    const rowAns = (typeof value === 'object' && !Array.isArray(value) && value) ? value : {}
    return (
      <div style={{ overflowX: 'auto', marginTop: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: '#7A9BB0', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #E8EFF5', minWidth: 120 }} />
              {cols.map(c => <th key={c} style={{ textAlign: 'center', padding: '8px 10px', color: '#637082', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #E8EFF5', whiteSpace: 'nowrap' }}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row} style={{ background: ri % 2 === 0 ? 'white' : '#FAFCFE' }}>
                <td style={{ padding: '12px', color: '#1A2E44', fontWeight: 500, lineHeight: 1.45, borderBottom: ri < rows.length - 1 ? '1px solid #F0F5F8' : 'none' }}>{row}</td>
                {cols.map(col => (
                  <td key={col} style={{ textAlign: 'center', padding: '12px 10px', borderBottom: ri < rows.length - 1 ? '1px solid #F0F5F8' : 'none' }}>
                    <button onClick={() => onChange({ ...rowAns, [row]: col })} title={`${row} → ${col}`}
                      style={{ width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', border: `2px solid ${rowAns[row] === col ? '#1BBFB0' : '#D1D9E6'}`, background: rowAns[row] === col ? '#1BBFB0' : 'white', transition: 'all 0.12s' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (type === 'DATE') return <input type="date" style={{ ...base, maxWidth: 240 }} value={value || ''} onChange={e => onChange(e.target.value)} />
  if (type === 'TIME') return <input type="time" style={{ ...base, maxWidth: 180 }} value={value || ''} onChange={e => onChange(e.target.value)} />

  if (type === 'FILE') {
    return (
      <div>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFile} />
        {value ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: '11px 14px', borderRadius: 10, border: '1.5px solid #1BBFB0', background: '#F0FAFA', fontSize: 13.5, color: '#0A8A7E', flex: 1, wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: 7 }}>
              <IconPaperclip />{typeof value === 'string' ? value.split('/').pop().replace(/^\d+_/, '') : 'File uploaded'}
            </div>
            <button onClick={() => { onChange(null); if (fileRef.current) fileRef.current.value = '' }} style={{ padding: '11px 14px', borderRadius: 10, border: '1.5px solid #E0E8F0', background: 'white', fontSize: 13, color: '#637082', cursor: 'pointer', fontFamily: 'inherit' }}>Change</button>
          </div>
        ) : (
          <button onClick={() => fileRef.current.click()} disabled={uploading}
            style={{ padding: '12px 20px', borderRadius: 10, border: '1.5px dashed #D1D9E6', background: 'white', fontSize: 14, color: uploading ? '#8898AA' : '#637082', cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
            {uploading ? <><Spin size={16} /> Uploading…</> : <><IconPaperclip /> Choose File</>}
          </button>
        )}
        {uploadErr && <div style={{ fontSize: 12.5, color: '#E8563A', marginTop: 6 }}>⚠ {uploadErr}</div>}
      </div>
    )
  }

  // LIKERT (default)
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
      {SCALE.map(v => {
        const active = value === v
        const [word1, word2] = SCALE_LABELS[v].split(' ')
        return (
          <button key={v} onClick={() => onChange(v)} style={{
            flex: 1, minWidth: 60, minHeight: 72, borderRadius: 10,
            border: `1.5px solid ${active ? '#1BBFB0' : '#E0E8F0'}`,
            background: active ? '#F0FAFA' : 'white',
            cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'inherit',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 2, padding: '8px 4px',
          }}>
            <span style={{ fontSize: 16, fontWeight: active ? 700 : 500, color: active ? '#0A8A7E' : '#637082', lineHeight: 1 }}>{v}</span>
            <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, color: active ? '#0A8A7E' : '#8898AA', lineHeight: 1.25, textAlign: 'center' }}>{word1}</span>
            {word2 && <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, color: active ? '#0A8A7E' : '#8898AA', lineHeight: 1.25, textAlign: 'center' }}>{word2}</span>}
          </button>
        )
      })}
    </div>
  )
}

// ── Profile screen ─────────────────────────────────────────

function ProfileScreen({ profile, respondent, onSave, onBack }) {
  const { updateProfile, user } = useAuth()
  const [form, setForm] = useState({
    full_name:  profile?.full_name     || '',
    email:      user?.email            || '',
    department: respondent?.department || '',
    job_title:  respondent?.job_title  || '',
  })
  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]    = useState(null)

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setMsg(null)
    try {
      if (form.full_name !== profile?.full_name) await updateProfile({ full_name: form.full_name })
      if (form.email !== user?.email) {
        const { error } = await supabase.auth.updateUser({ email: form.email })
        if (error) throw error
      }
      await onSave({ department: form.department, job_title: form.job_title, name: form.full_name })
      setMsg({ ok: true, text: form.email !== user?.email ? 'Saved. Check your new email address to confirm the change.' : 'Profile updated successfully.' })
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Could not save changes.' })
    } finally { setSaving(false) }
  }

  const iStyle = { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #E0E8F0', fontSize: 14, fontFamily: 'inherit', color: '#1A2E44', outline: 'none', transition: 'border-color 0.15s', background: 'white', boxSizing: 'border-box' }
  const lStyle = { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#4A5E72', marginBottom: 5 }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#7A9BB0', cursor: 'pointer', fontSize: 13.5, fontFamily: 'inherit', padding: '0 0 20px', display: 'flex', alignItems: 'center', gap: 6 }}>← Back to survey</button>
      <div style={{ background: 'white', borderRadius: 16, padding: '32px 28px', boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#0D1F3C', marginBottom: 4 }}>Your Profile</div>
        <div style={{ fontSize: 13.5, color: '#7A9BB0', marginBottom: 28 }}>Update your personal details.</div>

        {msg && (
          <div style={{ padding: '12px 14px', borderRadius: 10, marginBottom: 20, fontSize: 13.5, background: msg.ok ? '#E8F7F5' : '#FDE8E3', color: msg.ok ? '#0A6B5E' : '#C0392B', border: `1px solid ${msg.ok ? 'rgba(27,191,176,0.3)' : 'rgba(232,86,58,0.25)'}` }}>
            {msg.ok ? '✓ ' : '⚠ '}{msg.text}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: 16 }}>
            <label style={lStyle}>Full Name</label>
            <input style={iStyle} type="text" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              onFocus={e => e.target.style.borderColor = '#1BBFB0'} onBlur={e => e.target.style.borderColor = '#E0E8F0'} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={lStyle}>Email Address</label>
            <input style={iStyle} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              onFocus={e => e.target.style.borderColor = '#1BBFB0'} onBlur={e => e.target.style.borderColor = '#E0E8F0'} />
            <div style={{ fontSize: 11.5, color: '#A0B0C0', marginTop: 4 }}>Changing your email requires inbox confirmation.</div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
            <div style={{ flex: 1 }}>
              <label style={lStyle}>Department</label>
              <input style={iStyle} type="text" placeholder="e.g. Finance" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                onFocus={e => e.target.style.borderColor = '#1BBFB0'} onBlur={e => e.target.style.borderColor = '#E0E8F0'} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lStyle}>Job Title</label>
              <input style={iStyle} type="text" placeholder="e.g. Manager" value={form.job_title} onChange={e => setForm(p => ({ ...p, job_title: e.target.value }))}
                onFocus={e => e.target.style.borderColor = '#1BBFB0'} onBlur={e => e.target.style.borderColor = '#E0E8F0'} />
            </div>
          </div>
          <button type="submit" disabled={saving}
            style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: saving ? '#8DD4CE' : '#1BBFB0', color: 'white', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {saving && <Spin size={16} color="white" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main portal ────────────────────────────────────────────

export default function ClientPortal() {
  const navigate = useNavigate()
  const { user, profile, role, signOut } = useAuth()
  const { survey, questions, respondent, existingResponse, loading, error, saveDraft, submitResponse, updateRespondentProfile } = useClientSurvey(user?.email, user?.id)

  const [screen,      setScreen]      = useState('survey')
  const [answers,     setAnswers]     = useState({})
  const [page,        setPage]        = useState(0)
  const [saveState,   setSaveState]   = useState('idle') // idle | saving | saved | error
  const [submitting,  setSubmitting]  = useState(false)
  const [submitted,   setSubmitted]   = useState(false)
  const [submitErr,   setSubmitErr]   = useState('')
  const [showWelcome, setShowWelcome] = useState(true)
  const [triedNext,   setTriedNext]   = useState(false)
  const autoSaveTimer = useRef(null)

  const countdown = useCountdown(survey?.live_end)
  const timer     = formatCountdown(countdown)
  const isLive    = survey?.status === 'live'
  const isClosed  = survey?.status === 'closed'

  // Seed answers from existing response or draft
  useEffect(() => {
    if (existingResponse?.answers && Object.keys(existingResponse.answers).length > 0) {
      setAnswers(existingResponse.answers); setSubmitted(true)
    } else if (respondent?.draft_answers && Object.keys(respondent.draft_answers).length > 0) {
      setAnswers(respondent.draft_answers)
    }
  }, [existingResponse, respondent])

  // Auto-save draft 1.5s after last change
  const triggerAutoSave = useCallback((ans) => {
    if (!respondent || !isLive) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      setSaveState('saving')
      try { await saveDraft(ans); setSaveState('saved'); setTimeout(() => setSaveState('idle'), 2500) }
      catch { setSaveState('error') }
    }, 1500)
  }, [respondent, isLive, saveDraft])

  function handleAnswer(qId, val) {
    setAnswers(prev => { const next = { ...prev, [qId]: val }; triggerAutoSave(next); return next })
  }

  // Paging: by dimension, else chunks of 6
  const dimensions = [...new Set(questions.map(q => q.dimension || '').filter(Boolean))]
  const hasDimensions = dimensions.length > 0
  let pages = []
  if (hasDimensions) {
    const noDim = questions.filter(q => !q.dimension)
    for (const dim of dimensions) pages.push({ label: dim, qs: questions.filter(q => q.dimension === dim) })
    if (noDim.length) pages.push({ label: 'Other', qs: noDim })
  } else {
    for (let i = 0; i < questions.length; i += 6) pages.push({ label: `Part ${Math.floor(i / 6) + 1}`, qs: questions.slice(i, i + 6) })
  }
  const currentPage       = pages[page] || { label: '', qs: [] }
  const isOptionalSection = currentPage.qs.length > 0 && currentPage.qs[0].dimension === 'About You'
  const mandatoryQs       = questions.filter(q => q.dimension !== 'About You')
  const totalQ            = mandatoryQs.length
  const answered          = mandatoryQs.filter(q => isAnswered(q, answers[q.id])).length
  const progress          = totalQ > 0 ? Math.round((answered / totalQ) * 100) : 0
  const allAnswered       = totalQ > 0 && answered === totalQ
  const isLastPage        = page === pages.length - 1
  const sectionDone       = isOptionalSection || currentPage.qs.every(q => isAnswered(q, answers[q.id]))

  async function handleSaveDraft() {
    setSaveState('saving')
    try { await saveDraft(answers); setSaveState('saved'); setTimeout(() => setSaveState('idle'), 2500) }
    catch { setSaveState('error') }
  }

  async function handleSubmit() {
    setSubmitErr(''); setSubmitting(true)
    try { await submitResponse(answers); setSubmitted(true); setScreen('complete') }
    catch (e) { setSubmitErr(e.message || 'Something went wrong.') }
    finally { setSubmitting(false) }
  }

  function handleNext() {
    if (!sectionDone) { setTriedNext(true); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    setTriedNext(false)
    setPage(p => p + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const displayName = profile?.full_name?.split(' ')[0] || 'there'
  const initials    = profile?.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'

  const cardStyle = { background: 'white', borderRadius: 16, padding: '28px', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', marginBottom: 20 }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F2F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <style>{`@keyframes cp-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ textAlign: 'center' }}><Spin size={36} /><div style={{ marginTop: 16, color: '#7A9BB0', fontSize: 14 }}>Loading your survey…</div></div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F2F7FA', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@keyframes cp-spin { to { transform: rotate(360deg); } } @keyframes cp-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>

      {/* ── NAV ── */}
      <nav style={{ background: 'white', borderBottom: '1px solid #E8EFF5', padding: '0 24px', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.3px' }}>
            <span style={{ color: '#0D1F3C' }}>Culture</span><span style={{ color: '#1BBFB0' }}>Xe</span>
          </div>
          {survey?.title && <span style={{ fontSize: 13, color: '#A0B0C0', borderLeft: '1px solid #E8EFF5', paddingLeft: 12 }}>{survey.title}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {role && role !== 'client' && (
            <select
              value="client"
              onChange={e => { if (e.target.value === 'consultant') navigate('/app') }}
              style={{ padding: '6px 30px 6px 12px', borderRadius: 8, border: '1.5px solid #E0E8F0', background: 'white', color: '#1A2E44', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', outline: 'none', appearance: 'none', backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238898AA' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: 16 }}
            >
              <option value="client">Client View</option>
              <option value="consultant">Consultant View</option>
            </select>
          )}
          {isLive && timer && (
            <div style={{ padding: '5px 12px', borderRadius: 20, background: timer.urgent ? '#FFF0EE' : '#F0FAFA', border: `1px solid ${timer.urgent ? 'rgba(232,86,58,0.2)' : 'rgba(27,191,176,0.2)'}`, fontSize: 12.5, fontWeight: 600, color: timer.urgent ? '#C0392B' : '#0A8A7E', display: 'flex', alignItems: 'center', gap: 5 }}>
              {timer.urgent && <span style={{ animation: 'cp-pulse 1s infinite' }}>●</span>}
              {timer.text}
            </div>
          )}
          <button onClick={() => setScreen(s => s === 'profile' ? 'survey' : 'profile')} title={screen === 'profile' ? 'Back to survey' : 'Edit profile'}
            style={{ width: 36, height: 36, borderRadius: '50%', background: '#1BBFB0', border: 'none', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {initials}
          </button>
          <button onClick={signOut} style={{ background: 'none', border: '1px solid #E8EFF5', borderRadius: 8, padding: '6px 12px', fontSize: 12.5, color: '#637082', cursor: 'pointer', fontFamily: 'inherit' }}>
            Sign out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 32px 80px' }}>

        {/* ════════ PROFILE ════════ */}
        {screen === 'profile' && (
          <ProfileScreen profile={profile} respondent={respondent} onSave={updateRespondentProfile} onBack={() => setScreen('survey')} />
        )}

        {/* ════════ COMPLETE ════════ */}
        {screen === 'complete' && (
          <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <style>{`
              @keyframes cp-complete-pop { 0% { opacity:0; transform:scale(0.88) translateY(18px); } 100% { opacity:1; transform:scale(1) translateY(0); } }
              @keyframes cp-tick-draw { from { stroke-dashoffset: 60; } to { stroke-dashoffset: 0; } }
            `}</style>
            <div style={{ maxWidth: 520, width: '100%', background: 'white', borderRadius: 20, padding: '56px 44px 48px', border: '1px solid #E2E7EF', boxShadow: '0 8px 40px rgba(13,31,60,0.09)', textAlign: 'center', animation: 'cp-complete-pop 0.45s cubic-bezier(0.22,1,0.36,1) forwards' }}>

              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #1BBFB0 0%, #0A8A7E 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: '0 6px 24px rgba(27,191,176,0.35)' }}>
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <polyline points="7,19 15,27 29,11" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" strokeDashoffset="60"
                    style={{ animation: 'cp-tick-draw 0.5s 0.2s cubic-bezier(0.22,1,0.36,1) forwards' }} />
                </svg>
              </div>

              <div style={{ fontWeight: 800, fontSize: 26, color: '#0D1F3C', letterSpacing: '-0.4px', marginBottom: 12 }}>Survey Successfully Submitted</div>
              <div style={{ fontSize: 15, color: '#4A6380', lineHeight: 1.75, marginBottom: 36 }}>
                Thank you for completing the <strong style={{ color: '#0D1F3C' }}>{survey?.title}</strong>. Your honest input helps shape a stronger culture at DBN.
              </div>

              <div style={{ height: 1, background: '#EEF2F7', margin: '0 -44px 32px' }} />

              <button
                onClick={() => window.location.reload()}
                style={{ padding: '13px 28px', borderRadius: 10, border: 'none', background: '#1BBFB0', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#0A8A7E'}
                onMouseLeave={e => e.currentTarget.style.background = '#1BBFB0'}
              >
                Back to Home
              </button>
            </div>
          </div>
        )}

        {/* ════════ SURVEY ════════ */}
        {screen === 'survey' && (
          <>
            {error && (
              <div style={{ ...cardStyle, background: '#FDE8E3', borderLeft: '4px solid #E8563A', padding: '16px 20px' }}>
                <div style={{ color: '#C0392B', fontSize: 13.5 }}>⚠ {error}</div>
              </div>
            )}

            {/* Survey not live */}
            {survey && !isLive && (
              <div style={cardStyle}>
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>{isClosed ? <IconCheck /> : <IconClock />}</div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#0D1F3C', marginBottom: 8 }}>
                    {isClosed ? 'Survey Closed' : 'Survey Not Live Yet'}
                  </div>
                  <div style={{ fontSize: 14, color: '#7A9BB0', lineHeight: 1.7 }}>
                    {isClosed ? 'This survey has closed. Thank you for your participation.' : "The survey hasn't opened yet. Check back soon or contact your HR team."}
                  </div>
                  {survey?.live_start && !isLive && !isClosed && (
                    <div style={{ marginTop: 16, fontSize: 13.5, color: '#1BBFB0', fontWeight: 600 }}>
                      Opens: {new Date(survey.live_start).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── WELCOME PAGE ── */}
            {isLive && showWelcome && (
              <>
                {/* Hero */}
                <div style={{ background: 'linear-gradient(145deg, #071E1A 0%, #0A3A34 45%, #0A5A4A 100%)', borderRadius: 16, padding: '44px 36px 40px', marginBottom: 16, color: 'white', position: 'relative', overflow: 'hidden' }}>
                  {/* Decorative rings */}
                  <div style={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: '50%', border: '1px solid rgba(27,191,176,0.12)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', border: '1px solid rgba(27,191,176,0.08)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', bottom: -40, left: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(27,191,176,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(27,191,176,0.15)', border: '1px solid rgba(27,191,176,0.25)', borderRadius: 20, padding: '5px 14px', marginBottom: 22 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1BBFB0' }} />
                      <span style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7EEEE8', fontWeight: 600 }}>DBN Culture Diagnostic</span>
                    </div>

                    <div style={{ fontSize: 30, fontWeight: 800, color: 'white', lineHeight: 1.2, marginBottom: 16, letterSpacing: '-0.4px', maxWidth: 440 }}>
                      The culture we are<br />building together
                    </div>
                    <div style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, maxWidth: 460, marginBottom: 36 }}>
                      Hello, <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{displayName}</strong> — your honest read on how DBN works today helps leadership see what is working, what gets in the way, and where to act.
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {[
                        { value: pages.length, label: 'sections' },
                        { value: totalQ,       label: 'questions' },
                        { value: '15–18',      label: 'minutes' },
                      ].map(({ value, label }) => (
                        <div key={label} style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 72 }}>
                          <span style={{ fontWeight: 800, fontSize: 20, color: '#7EEEE8', lineHeight: 1 }}>{value}</span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3, letterSpacing: '0.5px' }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Info + CTA */}
                <div style={{ background: 'white', borderRadius: 16, padding: '28px 28px 24px', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', marginBottom: 20 }}>
                  <div style={{ marginBottom: 24 }}>
                    {[
                      { icon: <IconShield />, title: 'Fully confidential', body: 'Responses are reviewed in aggregate only — never linked to individuals.' },
                      { icon: <IconStar />,   title: 'All questions are required', body: 'Every question must be answered before you can move to the next section.' },
                      { icon: <IconLock />,   title: 'Complete each section in full', body: 'Work through one section at a time — you can review previous sections at any point.' },
                      { icon: <IconCloud />,  title: 'Auto-saved as you go', body: 'Your progress is saved automatically — you can return and continue if needed.' },
                    ].map(({ icon, title, body }, i, arr) => (
                      <div key={title} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: i < arr.length - 1 ? '1px solid #F0F5F8' : 'none', alignItems: 'flex-start' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#F0FAFA', border: '1px solid rgba(27,191,176,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {icon}
                        </div>
                        <div style={{ paddingTop: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0D1F3C', marginBottom: 3 }}>{title}</div>
                          <div style={{ fontSize: 13, color: '#7A9BB0', lineHeight: 1.6 }}>{body}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => setShowWelcome(false)}
                    style={{ width: '100%', padding: '15px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #1BBFB0 0%, #0A8A7E 100%)', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.2px', boxShadow: '0 4px 16px rgba(27,191,176,0.35)' }}>
                    Begin Survey
                  </button>
                  <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#B0C0CC' }}>
                    Your responses are saved securely to your account
                  </div>
                </div>
              </>
            )}

            {/* ── ACTIVE SURVEY ── */}
            {isLive && !showWelcome && (
              <>
                {/* Status banner */}
                <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #0A4A44 0%, #0A6B5E 100%)', color: 'white', padding: '22px 26px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
                        {submitted ? 'Response recorded — update anytime before close' : respondent?.draft_saved_at ? 'Draft saved — not yet submitted' : 'Not yet submitted'}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 18 }}>
                        {submitted ? '✓ Response submitted' : `${answered} of ${totalQ} answered`}
                      </div>
                    </div>
                    {timer && !timer.expired && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>Time remaining</div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: timer.urgent ? '#FFBFB5' : '#7EEEE8' }}>{timer.text}</div>
                      </div>
                    )}
                  </div>
                  {!submitted && totalQ > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ height: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: '#1BBFB0', borderRadius: 3, transition: 'width 0.35s' }} />
                      </div>
                      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 5, textAlign: 'right' }}>{progress}% complete</div>
                    </div>
                  )}
                </div>

                {/* Re-submit notice */}
                {submitted && (
                  <div style={{ ...cardStyle, background: '#F0FAFA', border: '1px solid rgba(27,191,176,0.2)', padding: '16px 20px' }}>
                    <div style={{ fontSize: 13.5, color: '#0A6B5E', lineHeight: 1.65 }}>
                      ✓ Submitted{respondent?.submitted_at ? ` on ${new Date(respondent.submitted_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}.
                      You can update your answers and re-submit — only your latest response is counted.
                    </div>
                  </div>
                )}

                {/* Page pills */}
                {pages.length > 1 && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
                    {pages.map((p, i) => {
                      const current = i === page
                      return (
                        <button key={i} onClick={() => { setTriedNext(false); setPage(i); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                          style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12.5, cursor: 'pointer', border: `1.5px solid ${current ? '#1BBFB0' : '#D1D9E6'}`, background: current ? '#1BBFB0' : 'white', color: current ? 'white' : '#0D1F3C', fontFamily: 'inherit', fontWeight: current ? 600 : 500, transition: 'all 0.15s' }}>
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Section incomplete warning */}
                {triedNext && !sectionDone && (
                  <div style={{ padding: '13px 16px', background: '#FDE8E3', border: '1px solid rgba(232,86,58,0.25)', borderRadius: 10, marginBottom: 16, fontSize: 13.5, color: '#C0392B', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flexShrink: 0 }}>⚠</span>
                    <span>Please answer all questions in this section before continuing.</span>
                  </div>
                )}

                {/* Questions */}
                <div style={cardStyle}>
                  {hasDimensions && (
                    <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #E8EFF5' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#1BBFB0', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Section {page + 1} of {pages.length}</div>
                        {isOptionalSection && <div style={{ fontSize: 10, fontWeight: 700, color: '#8A9BB0', textTransform: 'uppercase', letterSpacing: '0.8px', background: '#F0F5F8', borderRadius: 4, padding: '2px 7px' }}>Optional</div>}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#0D1F3C', marginTop: 2 }}>{currentPage.label}</div>
                      {isOptionalSection && <div style={{ fontSize: 13, color: '#8A9BB0', marginTop: 6, lineHeight: 1.55 }}>Helps us understand patterns across DBN — never used to identify individuals.</div>}
                    </div>
                  )}

                  {currentPage.qs.map((q, qi) => {
                    const qAnswered = isAnswered(q, answers[q.id])
                    const showError = triedNext && !qAnswered
                    return (
                      <div key={q.id} style={{ padding: '20px 0', borderBottom: qi < currentPage.qs.length - 1 ? '1px solid #F0F5F8' : 'none' }}>
                        <div style={{ fontSize: 14.5, fontWeight: 600, color: '#0D1F3C', marginBottom: q.hint ? 4 : 12, lineHeight: 1.65 }}>
                          {!hasDimensions && <span style={{ color: '#A0B8C8', fontSize: 13, fontWeight: 500, marginRight: 6 }}>Q{page * 6 + qi + 1}.</span>}
                          {q.text}
                          {!isOptionalSection && <span style={{ color: showError ? '#E8563A' : '#BCC8D4', marginLeft: 4, fontSize: 13, fontWeight: 500 }}>*</span>}
                        </div>
                        {q.hint && <div style={{ fontSize: 13, color: '#7A9BB0', marginBottom: 12, lineHeight: 1.55 }}>{q.hint}</div>}
                        <QuestionInput q={q} value={answers[q.id]} onChange={val => handleAnswer(q.id, val)} userId={user?.id} showError={showError && !isOptionalSection} />
                        {showError && !isOptionalSection && <div style={{ fontSize: 12, color: '#E8563A', marginTop: 6, fontWeight: 500 }}>This question is required.</div>}
                      </div>
                    )
                  })}
                </div>

                {submitErr && (
                  <div style={{ padding: '12px 16px', background: '#FDE8E3', border: '1px solid rgba(232,86,58,0.2)', borderRadius: 10, color: '#C0392B', fontSize: 13.5, marginBottom: 16 }}>⚠ {submitErr}</div>
                )}

                {saveState !== 'idle' && (
                  <div style={{ fontSize: 12.5, textAlign: 'right', marginBottom: 8, color: saveState === 'saved' ? '#0A8A7E' : saveState === 'error' ? '#C0392B' : '#7A9BB0' }}>
                    {saveState === 'saving' && '↻ Auto-saving…'}
                    {saveState === 'saved'  && '✓ Draft saved'}
                    {saveState === 'error'  && '⚠ Auto-save failed'}
                  </div>
                )}

                {/* Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <button disabled={page === 0} onClick={() => { setTriedNext(false); setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    style={{ padding: '12px 22px', borderRadius: 10, border: '1.5px solid #E0E8F0', background: 'white', color: '#637082', fontSize: 14, cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1, fontFamily: 'inherit' }}>
                    ← Previous
                  </button>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleSaveDraft} disabled={saveState === 'saving'}
                      style={{ padding: '12px 20px', borderRadius: 10, border: '1.5px solid #1BBFB0', background: 'white', color: '#0A8A7E', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Save Progress
                    </button>
                    {!isLastPage ? (
                      <button onClick={handleNext}
                        style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: '#1BBFB0', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Next →
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const unanswered = totalQ - answered
                          if (unanswered > 0) {
                            if (!window.confirm(`You have ${unanswered} unanswered question${unanswered !== 1 ? 's' : ''}. Submit anyway?`)) return
                          }
                          handleSubmit()
                        }}
                        disabled={submitting}
                        style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: submitting ? '#8DD4CE' : '#1BBFB0', color: 'white', fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.2s' }}>
                        {submitting && <Spin size={15} color="white" />}
                        {submitting ? 'Submitting…' : submitted ? 'Re-submit ✓' : 'Submit Survey ✓'}
                      </button>
                    )}
                  </div>
                </div>

                {!allAnswered && isLastPage && (
                  <div style={{ textAlign: 'right', marginTop: 10, fontSize: 12, color: '#A0B0C0' }}>
                    {totalQ - answered} question{totalQ - answered !== 1 ? 's' : ''} still unanswered
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
