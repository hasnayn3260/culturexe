import { useState, useEffect } from 'react'
import { dimensions } from '../data/dimensions'
import { useOrganisations } from '../hooks/useOrganisations'
import { useAssessments } from '../hooks/useAssessments'
import { useReports } from '../hooks/useReports'
import supabase from '../lib/supabaseClient'

const DEMO_SCORES = {
  purpose: 76, leadership: 62, innovation: 69, collaboration: 81,
  accountability: 57, inclusion: 72, learning: 65, customer: 74,
}
const BENCHMARK_AVG = 70

const QUADRANTS = [
  { id: 'agility',   label: 'Agility & Innovation',  icon: '⚡', dims: ['innovation', 'collaboration'],   color: 'var(--gold)'  },
  { id: 'alignment', label: 'Alignment & Execution',  icon: '◆', dims: ['accountability', 'purpose'],     color: 'var(--blue)'  },
  { id: 'people',    label: 'People & Learning',      icon: '★', dims: ['leadership', 'learning'],        color: 'var(--teal)'  },
  { id: 'culture',   label: 'Culture & Inclusion',    icon: '❋', dims: ['inclusion', 'customer'],         color: 'var(--navy)'  },
]

function scoreColor(s) {
  if (s >= 75) return 'var(--teal)'
  if (s >= 60) return 'var(--blue)'
  if (s >= 45) return 'var(--gold2)'
  return 'var(--coral)'
}

function scoreLabel(s) {
  if (s >= 75) return 'Strong'
  if (s >= 60) return 'Good'
  if (s >= 45) return 'Developing'
  return 'At Risk'
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(27,191,176,0.18)', borderTopColor: 'var(--teal)', animation: 'ir-spin 0.8s linear infinite' }} />
      <style>{`@keyframes ir-spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  )
}

export default function InsightsReport() {
  const { organisations, loading: orgsLoading }    = useOrganisations()
  const { assessments, loading: assessLoading }    = useAssessments()
  const { releaseReport }                          = useReports()

  const [selectedOrgId, setSelectedOrgId]           = useState('')
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('')
  const [report, setReport]                         = useState(null)
  const [reportLoading, setReportLoading]           = useState(false)
  const [reportError, setReportError]               = useState('')
  const [notes, setNotes]                           = useState('')
  const [notesSaving, setNotesSaving]               = useState(false)
  const [releasing, setReleasing]                   = useState(false)
  const [released, setReleased]                     = useState(false)

  useEffect(() => {
    if (!orgsLoading && organisations.length > 0 && !selectedOrgId) {
      setSelectedOrgId(String(organisations[0].id))
    }
  }, [orgsLoading, organisations, selectedOrgId])

  const orgAssessments = assessments.filter(a => String(a.org_id) === String(selectedOrgId))

  useEffect(() => {
    if (assessLoading) return
    if (orgAssessments.length > 0) {
      setSelectedAssessmentId(String(orgAssessments[0].id))
    } else {
      setSelectedAssessmentId('')
      setReport(null)
    }
  }, [selectedOrgId, assessLoading])

  useEffect(() => {
    if (!selectedAssessmentId) { setReport(null); return }
    setReportLoading(true)
    setReportError('')
    supabase
      .from('reports')
      .select('*')
      .eq('assessment_id', selectedAssessmentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setReportError(error.message)
        } else {
          setReport(data || null)
          setNotes(data?.consultant_notes || '')
          setReleased(data?.status === 'released')
        }
        setReportLoading(false)
      })
  }, [selectedAssessmentId])

  const selectedAssessment = assessments.find(a => String(a.id) === String(selectedAssessmentId))
  const selectedOrg        = organisations.find(o => String(o.id) === String(selectedOrgId))

  const scores       = report?.scores || DEMO_SCORES
  const isDemo       = !report?.scores
  const avgScore     = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length)
  const responseCount = selectedAssessment?.response_count ?? 0
  const totalInvited  = selectedAssessment?.total_invited  ?? 0
  const responseRate  = totalInvited > 0 ? Math.round((responseCount / totalInvited) * 100) : null

  const sortedDims = [...dimensions].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
  const topStrengths = sortedDims.slice(0, 3)
  const topRisks     = sortedDims.slice(-2)

  const quadrantScores = QUADRANTS.map(q => {
    const vals = q.dims.map(d => scores[d]).filter(v => v != null)
    return { ...q, score: vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b) / vals.length) : null }
  })

  async function handleNoteBlur() {
    if (!report?.id || notes === (report.consultant_notes || '')) return
    setNotesSaving(true)
    await supabase.from('reports').update({ consultant_notes: notes }).eq('id', report.id)
    setNotesSaving(false)
  }

  async function handleRelease() {
    if (!report?.id) return
    setReleasing(true)
    try {
      await releaseReport(report.id)
      setReleased(true)
    } finally {
      setReleasing(false)
    }
  }

  const periodLabel = selectedAssessment
    ? `${fmtDate(selectedAssessment.launch_date)} – ${fmtDate(selectedAssessment.close_date)}`
    : '—'

  return (
    <div className="content">
      <div className="page-hero">
        <div className="hero-title">Insights Report</div>
        <div className="hero-sub">Deep-dive culture analysis — select an organisation and assessment to explore results.</div>
      </div>

      <div className="flex gap-12 mb-28">
        <select
          className="form-input"
          style={{ maxWidth: 240 }}
          value={selectedOrgId}
          onChange={e => setSelectedOrgId(e.target.value)}
          disabled={orgsLoading}
        >
          {orgsLoading
            ? <option>Loading…</option>
            : organisations.length === 0
              ? <option value="">No organisations</option>
              : organisations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)
          }
        </select>
        <select
          className="form-input"
          style={{ maxWidth: 280 }}
          value={selectedAssessmentId}
          onChange={e => setSelectedAssessmentId(e.target.value)}
          disabled={assessLoading || orgAssessments.length === 0}
        >
          {assessLoading
            ? <option>Loading…</option>
            : orgAssessments.length === 0
              ? <option value="">No assessments for this client</option>
              : orgAssessments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)
          }
        </select>
        <button className="btn btn-outline btn-sm">Export PDF</button>
        {report && !released && (
          <button
            className="btn btn-teal btn-sm"
            onClick={handleRelease}
            disabled={releasing}
          >
            {releasing ? 'Releasing…' : 'Release to Client'}
          </button>
        )}
        {released && (
          <span className="tag tag-complete" style={{ alignSelf: 'center' }}>✓ Released</span>
        )}
      </div>

      {reportError && (
        <div style={{ padding: '14px 18px', background: 'var(--coral-light)', border: '1px solid rgba(232,86,58,0.2)', borderRadius: 10, color: 'var(--coral)', fontSize: 13.5, marginBottom: 20 }}>
          ⚠ {reportError}
        </div>
      )}

      {isDemo && !reportLoading && selectedAssessmentId && (
        <div style={{ padding: '11px 16px', background: 'rgba(27,191,176,0.06)', border: '1px solid rgba(27,191,176,0.18)', borderRadius: 10, fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
          No report exists for this assessment yet — showing sample data.
        </div>
      )}

      {reportLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid-4 mb-28">
            <div className="stat-card">
              <div className="stat-accent" style={{ background: scoreColor(avgScore) }} />
              <div className="stat-label">Overall Culture Score</div>
              <div className="stat-value" style={{ color: scoreColor(avgScore) }}>{avgScore}</div>
              <div className="stat-sub">{scoreLabel(avgScore)} culture</div>
            </div>
            <div className="stat-card">
              <div className="stat-accent" style={{ background: 'var(--blue)' }} />
              <div className="stat-label">Response Rate</div>
              <div className="stat-value">{responseRate !== null ? `${responseRate}%` : '—'}</div>
              <div className="stat-sub">
                {totalInvited > 0 ? `${responseCount} of ${totalInvited} employees` : 'No invites sent yet'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-accent" style={{ background: 'var(--teal)' }} />
              <div className="stat-label">vs Benchmark</div>
              <div className="stat-value" style={{ color: avgScore >= BENCHMARK_AVG ? 'var(--teal)' : 'var(--coral)' }}>
                {avgScore >= BENCHMARK_AVG ? '+' : ''}{avgScore - BENCHMARK_AVG}
              </div>
              <div className="stat-sub">Africa FS benchmark: {BENCHMARK_AVG}</div>
            </div>
            <div className="stat-card">
              <div className="stat-accent" style={{ background: 'var(--gold)' }} />
              <div className="stat-label">Period</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)', marginTop: 10 }}>{periodLabel}</div>
              <div className="stat-sub">{selectedAssessment?.name || '—'}</div>
            </div>
          </div>

          <div className="ai-panel mb-28">
            <div className="ai-panel-brain fluid-think">
              <svg width="44" height="44" viewBox="0 0 100 100" fill="none">
                <defs>
                  <radialGradient id="ir1" cx="30%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#C9E8A0" />
                    <stop offset="40%" stopColor="#5BBFB0" />
                    <stop offset="100%" stopColor="#1A6BAA" />
                  </radialGradient>
                </defs>
                <path d="M50 50 C50 50 20 35 18 20 C16 5 30 2 40 10 C50 18 50 50 50 50Z" fill="url(#ir1)" opacity="0.92" />
                <path d="M50 50 C50 50 15 55 12 70 C9 85 22 92 35 85 C48 78 50 50 50 50Z" fill="url(#ir1)" opacity="0.75" />
                <path d="M50 50 C50 50 80 35 82 20 C84 5 70 2 60 10 C50 18 50 50 50 50Z" fill="url(#ir1)" opacity="0.88" />
                <path d="M50 50 C50 50 85 55 88 70 C91 85 78 92 65 85 C52 78 50 50 50 50Z" fill="url(#ir1)" opacity="0.72" />
                <circle cx="50" cy="50" r="7" fill="white" opacity="0.36" />
              </svg>
            </div>
            <div className="ai-panel-text">
              <div className="ai-panel-title">AI Narrative — {selectedOrg?.name || '—'}</div>
              <div className="ai-panel-desc">
                {report?.ai_narrative ||
                  `${selectedOrg?.name || 'This organisation'} shows an overall culture score of ${avgScore} — rated ${scoreLabel(avgScore).toLowerCase()}. Top strengths are ${topStrengths.map(d => d.name).join(', ')}. Priority development areas are ${topRisks.map(d => d.name).join(' and ')}.`
                }
              </div>
            </div>
          </div>

          <div className="grid-4 mb-28">
            {quadrantScores.map(q => (
              <div className="stat-card" key={q.id}>
                <div className="stat-accent" style={{ background: q.color }} />
                <div className="stat-label">{q.icon} {q.label}</div>
                <div className="stat-value" style={{ color: q.score != null ? scoreColor(q.score) : 'var(--text3)' }}>
                  {q.score ?? '—'}
                </div>
                <div className="stat-sub">
                  {q.dims.map(d => dimensions.find(dim => dim.id === d)?.name).join(' · ')}
                </div>
              </div>
            ))}
          </div>

          <div className="grid-2 mb-28">
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 20 }}>Dimension Scores</div>
              {dimensions.map(dim => (
                <div key={dim.id} className="dim-item">
                  <div className="dim-header">
                    <span className="dim-name">{dim.icon} {dim.name}</span>
                    <div className="flex gap-8" style={{ alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: scoreColor(scores[dim.id]), fontWeight: 500 }}>
                        {scoreLabel(scores[dim.id])}
                      </span>
                      <span className="dim-score" style={{ color: scoreColor(scores[dim.id]) }}>
                        {scores[dim.id]}
                      </span>
                    </div>
                  </div>
                  <div className="dim-bar-bg">
                    <div className={`dim-bar ${dim.barClass}`} style={{ width: `${scores[dim.id]}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div className="card mb-16">
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 16 }}>Key Strengths</div>
                {topStrengths.map(dim => (
                  <div key={dim.id} className="insight">
                    <div className="insight-title">✓ {dim.name}</div>
                    <div className="insight-text">{dim.strength}</div>
                  </div>
                ))}
              </div>

              <div className="card mb-16">
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 16 }}>Watch Areas</div>
                {topRisks.map(dim => (
                  <div key={dim.id} className="insight warn">
                    <div className="insight-title">↓ {dim.name}</div>
                    <div className="insight-text">{dim.development}</div>
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="flex-between" style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>Consultant Notes</div>
                  {notesSaving && (
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>Saving…</span>
                  )}
                </div>
                <textarea
                  className="form-input"
                  style={{ minHeight: 120, resize: 'vertical', fontSize: 13 }}
                  placeholder={report ? 'Add your interpretation and recommendations…' : 'Save a report first to add notes.'}
                  value={notes}
                  disabled={!report}
                  onChange={e => setNotes(e.target.value)}
                  onBlur={handleNoteBlur}
                />
                {!report && selectedAssessmentId && (
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>
                    No report record found for this assessment. Create one in the Reports page.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
