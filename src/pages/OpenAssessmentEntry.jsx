import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import supabase from '../lib/supabaseClient'

// Fallback choice lists — used only if the live "About You" questions can't
// be read (e.g. survey builder hasn't set them up yet). Mirrors the current
// DBN survey questions exactly so the open-link intake matches the real survey.
const FALLBACK_DEPARTMENTS = [
  'Credit Risk',
  'Finance (Finance, Treasury, Operations and Procurement)',
  'Human Capital',
  'Investments (Coverage, Portfolio Management, Deal Structuring, Research and Product Development)',
  'Legal Counsel & Company Secretary',
  'Marketing & Corporate Affairs',
  'Office of the CEO (Strategy)',
  'Risk & Compliance',
  'SME Finance',
  'Technology & Information',
]
const FALLBACK_TENURE = ['Less than 1 year', '1–3 years', '4–7 years', '8+ years']
const FALLBACK_GRADES = [
  'Intern',
  'A1', 'A2', 'A3', 'A4', 'A5',
  'B1', 'B2', 'B3', 'B4', 'B5',
  'C1', 'C2', 'C3', 'C4', 'C5',
  'D1', 'D2', 'D3', 'D4', 'D5',
  'E1', 'E2', 'E3',
  'F1',
]

function selectStyle() {
  return {
    width: '100%', padding: '10px 14px', borderRadius: 9,
    border: '1.5px solid #D1D9E6',
    fontSize: 14, fontFamily: 'inherit', color: '#0B1D3E', outline: 'none',
    background: 'white', boxSizing: 'border-box',
  }
}

function PageShell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F4F6FA', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <div style={{ background: 'white', borderBottom: '1px solid #E2E7EF', height: 60, padding: '0 24px', display: 'flex', alignItems: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.5px' }}>
          <span style={{ color: '#0B1D3E' }}>Culture</span><span style={{ color: '#1BBFB0' }}>Xe</span>
        </div>
      </div>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '48px 20px 60px' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12.5, color: '#4A6380', marginBottom: 6, fontWeight: 500 }}>
        {label} {required ? '*' : <span style={{ color: '#8898AA', fontWeight: 400 }}>(optional)</span>}
      </label>
      {children}
    </div>
  )
}

export default function OpenAssessmentEntry() {
  const { openToken } = useParams()
  const navigate = useNavigate()

  const [phase, setPhase] = useState('loading') // loading | form | submitting | invalid
  const [survey, setSurvey] = useState(null)
  const [departments, setDepartments] = useState(FALLBACK_DEPARTMENTS)
  const [tenureOptions, setTenureOptions] = useState(FALLBACK_TENURE)
  const [gradeOptions, setGradeOptions] = useState(FALLBACK_GRADES)

  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [tenure, setTenure] = useState('')
  const [jobGrade, setJobGrade] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function init() {
      if (!openToken) { setPhase('invalid'); return }
      const { data, error: err } = await supabase
        .from('survey')
        .select('id, title, description, status, open_link_enabled')
        .eq('open_link_token', openToken)
        .eq('open_link_enabled', true)
        .maybeSingle()

      if (err || !data || data.status !== 'live') { setPhase('invalid'); return }
      setSurvey(data)

      // Pull the exact same choice lists as the live "About You" questions,
      // so this intake form always matches the survey.
      const { data: qs } = await supabase
        .from('survey_questions')
        .select('text, options')
        .eq('survey_id', data.id)

      if (qs?.length) {
        const deptQ   = qs.find(q => /department|division/i.test(q.text) && q.options?.choices?.length)
        const tenureQ = qs.find(q => /how long|worked at/i.test(q.text) && q.options?.choices?.length)
        const gradeQ  = qs.find(q => /grade|role level/i.test(q.text) && q.options?.choices?.length)
        if (deptQ)   setDepartments(deptQ.options.choices)
        if (tenureQ) setTenureOptions(tenureQ.options.choices)
        if (gradeQ)  setGradeOptions(gradeQ.options.choices)
      }

      setPhase('form')
    }
    init()
  }, [openToken])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!department)  { setError('Please select your department.'); return }
    if (!jobTitle.trim()) { setError('Please enter your job title.'); return }
    if (!tenure)       { setError('Please select how long you have worked here.'); return }
    if (!jobGrade)     { setError('Please select your job grade.'); return }
    setError('')
    setPhase('submitting')
    try {
      const { data, error: err } = await supabase.rpc('register_open_respondent', {
        p_open_token: openToken,
        p_department: department,
        p_job_title: jobTitle,
        p_tenure: tenure,
        p_job_grade: jobGrade,
        p_name: name || null,
      })
      if (err) throw err
      const newToken = data?.[0]?.respondent_token
      if (!newToken) throw new Error('Could not start the survey. Please try again.')
      navigate(`/assess/${newToken}`, { replace: true })
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setPhase('form')
    }
  }

  if (phase === 'loading') {
    return <PageShell><div style={{ textAlign: 'center', padding: '60px 0', color: '#8898AA' }}>Loading…</div></PageShell>
  }

  if (phase === 'invalid') {
    return (
      <PageShell>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>⚠</div>
          <div style={{ fontWeight: 700, fontSize: 22, color: '#0B1D3E', marginBottom: 12 }}>This link is invalid or has expired</div>
          <div style={{ fontSize: 14, color: '#637082', maxWidth: 400, margin: '0 auto', lineHeight: 1.7 }}>
            Please check the link you received, or contact your HR team for a new one.
          </div>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div style={{ background: 'white', borderRadius: 12, padding: '28px 32px', border: '1px solid #E2E7EF' }}>
        <div style={{ fontWeight: 700, fontSize: 20, color: '#0B1D3E', marginBottom: 6 }}>{survey?.title}</div>
        {survey?.description && (
          <div style={{ fontSize: 13.5, color: '#637082', marginBottom: 24, lineHeight: 1.6 }}>{survey.description}</div>
        )}
        <div style={{ fontSize: 13, color: '#8898AA', marginBottom: 20 }}>
          Enter your details to start. No company email or account needed.
        </div>

        <form onSubmit={handleSubmit}>
          <Field label="Full Name">
            <input style={selectStyle()} value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
          </Field>

          <Field label="Department" required>
            <select style={selectStyle()} value={department} onChange={e => setDepartment(e.target.value)}>
              <option value="">— Select your department —</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>

          <Field label="Job Title" required>
            <input style={selectStyle()} value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Site Worker" />
          </Field>

          <Field label="How long have you worked here?" required>
            <select style={selectStyle()} value={tenure} onChange={e => setTenure(e.target.value)}>
              <option value="">— Select —</option>
              {tenureOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <Field label="Job Grade" required>
            <select style={selectStyle()} value={jobGrade} onChange={e => setJobGrade(e.target.value)}>
              <option value="">— Select —</option>
              {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>

          {error && (
            <div style={{ padding: '10px 14px', background: '#FFF0EE', border: '1px solid rgba(232,86,58,0.2)', borderRadius: 9, color: '#E8563A', fontSize: 13, marginBottom: 16 }}>
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={phase === 'submitting'}
            style={{
              width: '100%', padding: '12px 24px', borderRadius: 9, border: 'none',
              background: '#1BBFB0', color: 'white', fontSize: 14, fontWeight: 600,
              cursor: phase === 'submitting' ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              opacity: phase === 'submitting' ? 0.7 : 1,
            }}
          >
            {phase === 'submitting' ? 'Starting…' : 'Start Survey →'}
          </button>
        </form>
      </div>
    </PageShell>
  )
}
