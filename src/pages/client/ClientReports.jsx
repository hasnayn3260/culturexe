import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useClientData } from '../../hooks/useClientData'
import { dimensions } from '../../data/dimensions'

const QUADRANTS = [
  { id: 'agility',   label: 'Agility & Innovation',  icon: '⚡', dims: ['innovation', 'collaboration'],   color: 'var(--gold)'  },
  { id: 'alignment', label: 'Alignment & Execution',  icon: '◆', dims: ['accountability', 'purpose'],     color: 'var(--blue)'  },
  { id: 'people',    label: 'People & Learning',      icon: '★', dims: ['leadership', 'learning'],        color: 'var(--teal)'  },
  { id: 'culture',   label: 'Culture & Inclusion',    icon: '❋', dims: ['inclusion', 'customer'],         color: 'var(--navy)'  },
]
const BENCHMARK_AVG = 70

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

function Spinner({ inline }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: inline ? '0' : '60px 0' }}>
      <div style={{ width: inline ? 16 : 36, height: inline ? 16 : 36, borderRadius: '50%', border: `${inline ? 2 : 3}px solid rgba(27,191,176,0.18)`, borderTopColor: 'var(--teal)', animation: 'crsp-spin 0.8s linear infinite' }} />
      <style>{`@keyframes crsp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Full report detail ──────────────────────────────────────────
function ReportDetail({ report, assessment, orgName, onBack, autoDownload }) {
  const reportRef  = useRef(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  const scores     = report.scores || {}
  const vals       = Object.values(scores).filter(v => v != null)
  const avgScore   = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null

  const sortedDims   = [...dimensions].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
  const topStrengths = sortedDims.slice(0, 3)
  const topRisks     = sortedDims.slice(-2)

  const quadrantScores = QUADRANTS.map(q => {
    const qVals = q.dims.map(d => scores[d]).filter(v => v != null)
    return { ...q, score: qVals.length > 0 ? Math.round(qVals.reduce((a, b) => a + b) / qVals.length) : null }
  })

  const responseCount = assessment?.total_responses ?? 0
  const totalInvited  = assessment?.total_invited  ?? 0
  const responseRate  = totalInvited > 0 ? Math.round((responseCount / totalInvited) * 100) : null

  async function handleDownloadPDF() {
    if (!reportRef.current) return
    setPdfLoading(true)
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ])
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#EEF5F9',
        logging: false,
      })
      const imgData   = canvas.toDataURL('image/png')
      const pdf       = new jsPDF('p', 'mm', 'a4')
      const pageW     = pdf.internal.pageSize.getWidth()
      const pageH     = pdf.internal.pageSize.getHeight()
      const imgW      = pageW
      const imgH      = (canvas.height * imgW) / canvas.width

      pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH)
      let offset = pageH
      while (offset < imgH) {
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, -offset, imgW, imgH)
        offset += pageH
      }

      const safe = orgName.replace(/[^a-z0-9]/gi, '-')
      const date = new Date().toISOString().slice(0, 10)
      pdf.save(`${safe}-CultureXe-Report-${date}.pdf`)
    } catch (err) {
      console.error('PDF error:', err)
    } finally {
      setPdfLoading(false)
    }
  }

  useEffect(() => {
    if (!autoDownload) return
    const t = setTimeout(() => handleDownloadPDF(), 800)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <button className="btn btn-outline btn-sm" onClick={onBack}>← Back to Reports</button>
        <button
          className="btn btn-teal btn-sm"
          onClick={handleDownloadPDF}
          disabled={pdfLoading}
          style={{ opacity: pdfLoading ? 0.7 : 1, minWidth: 130 }}
        >
          {pdfLoading
            ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Spinner inline /> Generating…</span>
            : '↓ Download PDF'}
        </button>
      </div>

      {/* Capturable report area */}
      <div ref={reportRef} style={{ background: 'var(--bg)', borderRadius: 16, padding: 4 }}>
        <div className="page-hero" style={{ marginBottom: 24, borderRadius: 16 }}>
          <div className="hero-title">{assessment?.name || 'Culture Report'}</div>
          <div className="hero-sub">
            {orgName} · Released {fmtDate(report.released_at || report.created_at)}
          </div>
        </div>

        <div className="grid-4 mb-28">
          <div className="stat-card">
            <div className="stat-accent" style={{ background: avgScore != null ? scoreColor(avgScore) : 'var(--navy)' }} />
            <div className="stat-label">Overall Culture Score</div>
            <div className="stat-value" style={{ color: avgScore != null ? scoreColor(avgScore) : 'var(--navy)' }}>
              {avgScore ?? '—'}
            </div>
            <div className="stat-sub">{avgScore != null ? `${scoreLabel(avgScore)} culture` : '—'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-accent" style={{ background: 'var(--blue)' }} />
            <div className="stat-label">Response Rate</div>
            <div className="stat-value">{responseRate != null ? `${responseRate}%` : '—'}</div>
            <div className="stat-sub">{totalInvited > 0 ? `${responseCount} of ${totalInvited} employees` : '—'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-accent" style={{ background: 'var(--teal)' }} />
            <div className="stat-label">vs Benchmark</div>
            <div className="stat-value" style={{ color: avgScore != null ? (avgScore >= BENCHMARK_AVG ? 'var(--teal)' : 'var(--coral)') : 'var(--navy)' }}>
              {avgScore != null ? `${avgScore >= BENCHMARK_AVG ? '+' : ''}${avgScore - BENCHMARK_AVG}` : '—'}
            </div>
            <div className="stat-sub">Africa FS benchmark: {BENCHMARK_AVG}</div>
          </div>
          <div className="stat-card">
            <div className="stat-accent" style={{ background: 'var(--gold)' }} />
            <div className="stat-label">Respondents</div>
            <div className="stat-value">{responseCount}</div>
            <div className="stat-sub">Employee responses</div>
          </div>
        </div>

        {report.ai_narrative && (
          <div className="ai-panel mb-28">
            <div className="ai-panel-brain fluid-think">
              <svg width="44" height="44" viewBox="0 0 100 100" fill="none">
                <defs>
                  <radialGradient id="crdet1" cx="30%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#C9E8A0"/>
                    <stop offset="40%" stopColor="#5BBFB0"/>
                    <stop offset="100%" stopColor="#1A6BAA"/>
                  </radialGradient>
                </defs>
                <path d="M50 50 C50 50 20 35 18 20 C16 5 30 2 40 10 C50 18 50 50 50 50Z" fill="url(#crdet1)" opacity="0.92"/>
                <path d="M50 50 C50 50 15 55 12 70 C9 85 22 92 35 85 C48 78 50 50 50 50Z" fill="url(#crdet1)" opacity="0.75"/>
                <path d="M50 50 C50 50 80 35 82 20 C84 5 70 2 60 10 C50 18 50 50 50 50Z" fill="url(#crdet1)" opacity="0.88"/>
                <path d="M50 50 C50 50 85 55 88 70 C91 85 78 92 65 85 C52 78 50 50 50 50Z" fill="url(#crdet1)" opacity="0.72"/>
                <circle cx="50" cy="50" r="7" fill="white" opacity="0.36"/>
              </svg>
            </div>
            <div className="ai-panel-text">
              <div className="ai-panel-title">AI Narrative — {orgName}</div>
              <div className="ai-panel-desc">{report.ai_narrative}</div>
            </div>
          </div>
        )}

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
                    <span style={{ fontSize: 11, color: scoreColor(scores[dim.id] ?? 0), fontWeight: 500 }}>
                      {scoreLabel(scores[dim.id] ?? 0)}
                    </span>
                    <span className="dim-score" style={{ color: scoreColor(scores[dim.id] ?? 0) }}>
                      {scores[dim.id] ?? '—'}
                    </span>
                  </div>
                </div>
                <div className="dim-bar-bg">
                  <div className={`dim-bar ${dim.barClass}`} style={{ width: `${scores[dim.id] ?? 0}%` }} />
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
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 16 }}>Watch Areas</div>
              {topRisks.map(dim => (
                <div key={dim.id} className="insight warn">
                  <div className="insight-title">↓ {dim.name}</div>
                  <div className="insight-text">{dim.development}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '16px 0 8px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text3)' }}>
          Prepared by Africa International Advisors · CultureXe Platform · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}

// ── Report list card ────────────────────────────────────────────
function ReportCard({ report, assessment, orgName, onView, onPDF }) {
  const scores   = report.scores || {}
  const vals     = Object.values(scores).filter(v => v != null)
  const avgScore = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null

  return (
    <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span className="tag tag-complete">✓ Released</span>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
            {fmtDate(report.released_at || report.created_at)}
          </span>
        </div>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 3 }}>
          {assessment?.name || 'Culture Assessment'}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text2)' }}>
          {assessment?.total_responses ?? 0} respondents · {orgName}
        </div>
      </div>

      {avgScore != null && (
        <div style={{ textAlign: 'center', padding: '0 8px' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: scoreColor(avgScore), lineHeight: 1 }}>{avgScore}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{scoreLabel(avgScore)}</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
        <button className="btn btn-outline btn-sm" onClick={onView}>View Report</button>
        <button className="btn btn-teal btn-sm" onClick={onPDF}>↓ PDF</button>
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────
export default function ClientReports() {
  const { profile }                               = useAuth()
  const { org, assessments, reports, loading, error } = useClientData(profile?.org_id)
  const [viewing, setViewing]                     = useState(null) // { report, autoDownload }

  const orgName = org?.name || ''

  function openReport(report, autoDownload = false) {
    setViewing({ report, autoDownload })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (viewing) {
    const assessment = assessments.find(a => a.id === viewing.report.assessment_id)
    return (
      <ReportDetail
        report={viewing.report}
        assessment={assessment}
        orgName={orgName}
        onBack={() => setViewing(null)}
        autoDownload={viewing.autoDownload}
      />
    )
  }

  return (
    <div className="content">
      <div className="page-hero">
        <div className="hero-title">Reports</div>
        <div className="hero-sub">View and download your released culture intelligence reports.</div>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', background: 'var(--coral-light)', border: '1px solid rgba(232,86,58,0.2)', borderRadius: 10, color: 'var(--coral)', fontSize: 13.5, marginBottom: 20 }}>
          ⚠ {error}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : reports.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '56px 32px' }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>📊</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--navy)', marginBottom: 8 }}>No reports yet</div>
          <div style={{ fontSize: 13.5, color: 'var(--text2)', maxWidth: 440, margin: '0 auto', lineHeight: 1.7 }}>
            Your culture intelligence report is being prepared by Africa International Advisors.
            You'll be notified when it's ready to view.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {reports.map(r => (
            <ReportCard
              key={r.id}
              report={r}
              assessment={assessments.find(a => a.id === r.assessment_id)}
              orgName={orgName}
              onView={() => openReport(r, false)}
              onPDF={() => openReport(r, true)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
