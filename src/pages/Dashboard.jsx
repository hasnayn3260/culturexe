import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { dimensions } from '../data/dimensions'
import { useOrganisations } from '../hooks/useOrganisations'
import { useAssessments } from '../hooks/useAssessments'
import { useReports } from '../hooks/useReports'
import { useAuth } from '../hooks/useAuth'
import supabase from '../lib/supabaseClient'

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  if (h >= 17 && h < 21) return 'Good evening'
  return 'Good night'
}

function todayStr() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function scoreColor(s) {
  if (s >= 75) return 'var(--teal)'
  if (s >= 60) return 'var(--blue)'
  if (s >= 45) return 'var(--gold2)'
  return 'var(--coral)'
}

function statusAccent(s) {
  if (s === 'active')   return '#1BBFB0'
  if (s === 'review')   return '#C9B882'
  if (s === 'complete') return '#3A8FC4'
  return '#8A9BB0'
}

function statusLabel(s) {
  if (s === 'active')   return '● Live'
  if (s === 'review')   return '⟳ Review'
  if (s === 'complete') return '✓ Done'
  return '○ Pending'
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(27,191,176,0.18)', borderTopColor: '#1BBFB0', animation: 'db-spin 0.8s linear infinite' }} />
      <style>{`@keyframes db-spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  )
}

const FALLBACK_SCORES = {
  purpose: 78, leadership: 65, innovation: 71, collaboration: 83,
  accountability: 59, inclusion: 74, learning: 68, customer: 77,
}

export default function Dashboard() {
  const { profile }                             = useAuth()
  const { organisations, loading: orgsLoading } = useOrganisations()
  const { assessments, loading: assessLoading } = useAssessments()
  const { reports, loading: reportsLoading }    = useReports()
  const [responseCount, setResponseCount]       = useState(null)

  useEffect(() => {
    supabase
      .from('responses')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => setResponseCount(count ?? 0))
  }, [])

  const loading = orgsLoading || assessLoading || reportsLoading

  const activeAssessments = assessments.filter(a => a.status === 'active')
  const reviewAssessments = assessments.filter(a => a.status === 'review')
  const releasedReports   = reports.filter(r => r.status === 'released')

  const releasedWithScores = releasedReports.filter(r => r.scores && typeof r.scores === 'object')
  const liveDimensionScores = releasedWithScores.length > 0
    ? Object.fromEntries(
        dimensions.map(dim => {
          const vals = releasedWithScores.map(r => r.scores[dim.id]).filter(v => typeof v === 'number')
          return [dim.id, vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null]
        })
      )
    : null
  const displayScores = liveDimensionScores || FALLBACK_SCORES
  const scoresAreReal = !!liveDimensionScores

  // Latest assessment per org
  const orgLatestAssessment = useMemo(() => {
    const map = {}
    assessments.forEach(a => {
      const existing = map[a.org_id]
      if (!existing || new Date(a.created_at) > new Date(existing.created_at)) {
        map[a.org_id] = a
      }
    })
    return map
  }, [assessments])

  const firstName = profile?.full_name?.split(' ')[0] || ''

  return (
    <div className="content">

      {/* ── HERO HEADER ──────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0D1F3C 0%, #0E3462 55%, #1A5A8A 100%)',
        borderRadius: 16, padding: '28px 32px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 20, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(27,191,176,0.12) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: 20, width: 160, height: 160, background: 'radial-gradient(circle, rgba(90,176,208,0.08) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.3px', marginBottom: 5 }}>
            {getGreeting()}{firstName ? `, ${firstName}` : ''} ✦
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', fontWeight: 500 }}>
            {todayStr()} · Consultant Portal
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          {[
            { label: 'Clients',   value: loading ? '…' : organisations.length,                                          color: '#1BBFB0' },
            { label: 'Active',    value: loading ? '…' : activeAssessments.length,                                      color: '#5AB0D0' },
            { label: 'Responses', value: loading || responseCount == null ? '…' : responseCount.toLocaleString(),       color: '#C9B882' },
            { label: 'Reports',   value: loading ? '…' : releasedReports.length,                                        color: '#7ECFC8' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '10px 18px', textAlign: 'center', minWidth: 80,
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.42)', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CLIENT PORTFOLIO ─────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>Client Portfolio</div>
          <Link to="/app/clients" style={{ fontSize: 12, color: 'var(--teal)', textDecoration: 'none', fontWeight: 500 }}>
            Manage all →
          </Link>
        </div>

        {loading ? (
          <Spinner />
        ) : organisations.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy)', marginBottom: 6 }}>No clients onboarded yet</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>Add your first client organisation to get started.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14 }}>
            {organisations.map(org => {
              const latest = orgLatestAssessment[org.id]
              const status = latest?.status || null
              const accent = statusAccent(status)
              return (
                <div key={org.id} style={{
                  background: 'white', borderRadius: 14,
                  border: '1px solid var(--border)',
                  borderTop: `3px solid ${accent}`,
                  padding: '18px 20px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)', marginBottom: 3 }}>{org.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>Since {fmtDate(org.created_at)}</div>
                    </div>
                    {status ? (
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                        background: `${accent}18`, color: accent, border: `1px solid ${accent}40`,
                        whiteSpace: 'nowrap', flexShrink: 0,
                      }}>
                        {statusLabel(status)}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>No assessments</span>
                    )}
                  </div>

                  <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '9px 11px' }}>
                    {latest ? (
                      <>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--navy)', marginBottom: 2 }}>{latest.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>
                          {latest.launch_date ? `Launched ${fmtDate(latest.launch_date)}` : 'Not yet launched'}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>No assessments yet</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── DIMENSION OVERVIEW + RECENT ASSESSMENTS ─────── */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="flex-between mb-16">
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>Dimension Overview</div>
            {scoresAreReal
              ? <span className="badge badge-teal">Live · {releasedWithScores.length} report{releasedWithScores.length !== 1 ? 's' : ''}</span>
              : <span className="badge badge-slate">Sample data</span>}
          </div>
          {dimensions.map(dim => {
            const score = displayScores[dim.id]
            return (
              <div key={dim.id} className="dim-item">
                <div className="dim-header">
                  <span className="dim-name">{dim.icon} {dim.name}</span>
                  <span className="dim-score" style={{ color: score != null ? scoreColor(score) : 'var(--text3)' }}>
                    {score ?? '—'}
                  </span>
                </div>
                <div className="dim-bar-bg">
                  <div className={`dim-bar ${dim.barClass}`} style={{ width: score != null ? `${score}%` : '0%' }} />
                </div>
              </div>
            )
          })}
        </div>

        <div className="card">
          <div className="flex-between mb-16">
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>Recent Assessments</div>
            <Link to="/app/assessments" style={{ fontSize: 12, color: 'var(--teal)', textDecoration: 'none', fontWeight: 500 }}>
              View all →
            </Link>
          </div>
          {assessLoading ? <Spinner /> : (
            <table>
              <thead>
                <tr><th>Organisation</th><th>Launched</th><th>Status</th></tr>
              </thead>
              <tbody>
                {assessments.slice(0, 8).length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text3)', fontSize: 13 }}>📋 No assessments yet.</td></tr>
                ) : assessments.slice(0, 8).map(a => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{a.org_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{a.name}</div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{fmtDate(a.launch_date)}</td>
                    <td>
                      <span className={`tag ${
                        a.status === 'active'   ? 'tag-active'   :
                        a.status === 'complete' ? 'tag-complete' :
                        a.status === 'review'   ? 'tag-review'   :
                        'tag-pending'
                      }`}>
                        {a.status === 'active' ? '● Live' : a.status === 'complete' ? '✓ Done' : a.status === 'review' ? '⟳ Review' : '○ Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── PENDING REVIEW ───────────────────────────────── */}
      {reviewAssessments.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid var(--gold)', background: 'linear-gradient(to right, #FFFBF0, white)' }}>
          <div className="flex-between mb-16">
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>Needs Your Attention</div>
            <span className="badge badge-gold">{reviewAssessments.length} pending review</span>
          </div>
          <table>
            <thead>
              <tr><th>Assessment</th><th>Organisation</th><th>Closed</th><th>Action</th></tr>
            </thead>
            <tbody>
              {reviewAssessments.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{a.name}</td>
                  <td style={{ fontSize: 13 }}>{a.org_name}</td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>{fmtDate(a.close_date)}</td>
                  <td><Link to="/app/report" className="btn btn-teal btn-sm">Open →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
