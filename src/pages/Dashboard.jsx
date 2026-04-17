import { useEffect, useState } from 'react'
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

// ── Demo scores kept for Dimension Overview until real aggregation is available
const sampleScores = {
  purpose: 78, leadership: 65, innovation: 71, collaboration: 83,
  accountability: 59, inclusion: 74, learning: 68, customer: 77,
}

function scoreColor(s) {
  if (s >= 75) return 'var(--teal)'
  if (s >= 60) return 'var(--blue)'
  if (s >= 45) return 'var(--gold2)'
  return 'var(--coral)'
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(27,191,176,0.18)', borderTopColor: 'var(--teal)', animation: 'db-spin 0.8s linear infinite' }} />
      <style>{`@keyframes db-spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  )
}

function EmptyRow({ cols, icon, msg }) {
  return (
    <tr>
      <td colSpan={cols} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text3)', fontSize: 13 }}>
        {icon} {msg}
      </td>
    </tr>
  )
}

function StatSkeleton() {
  return (
    <div className="stat-card">
      <div style={{ height: 11, width: '50%', background: 'var(--border)', borderRadius: 6, marginBottom: 12 }} />
      <div style={{ height: 34, width: '40%', background: 'var(--border)', borderRadius: 6, marginBottom: 8 }} />
      <div style={{ height: 11, width: '65%', background: 'var(--border)', borderRadius: 6 }} />
    </div>
  )
}

export default function Dashboard() {
  const { profile, loading: authLoading }               = useAuth()
  const { organisations, loading: orgsLoading }         = useOrganisations()
  const { assessments, loading: assessLoading }         = useAssessments()
  const { reports, loading: reportsLoading }            = useReports()
  const [responseCount, setResponseCount]               = useState(null)
  const [responseCountLoading, setResponseCountLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('responses')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => {
        setResponseCount(count ?? 0)
        setResponseCountLoading(false)
      })
      .catch(() => {
        setResponseCount(0)
        setResponseCountLoading(false)
      })
  }, [])

  const statsLoading = orgsLoading || assessLoading || reportsLoading || responseCountLoading

  const activeAssessments  = assessments.filter(a => a.status === 'active')
  const releasedReports    = reports.filter(r => r.status === 'released')
  const reviewAssessments  = assessments.filter(a => a.status === 'review')
  const recentAssessments  = assessments.slice(0, 8)

  const avgScore = Math.round(
    Object.values(sampleScores).reduce((a, b) => a + b, 0) / Object.values(sampleScores).length
  )

  return (
    <div className="content">
      <div className="page-hero">
        <div className="hero-title">
          {authLoading || !profile?.full_name
            ? 'Welcome back ✦'
            : `${getGreeting()}, ${profile.full_name.split(' ')[0]} ✦`}
        </div>
        <div className="hero-sub">Here's the CultureXe pulse across your active clients — updated now.</div>
      </div>

      {/* ── KPI STATS ─────────────────────────────────────── */}
      <div className="grid-4 mb-28">
        {statsLoading ? (
          [1,2,3,4].map(i => <StatSkeleton key={i} />)
        ) : (
          <>
            <div className="stat-card">
              <div className="stat-accent" style={{ background: 'var(--teal)' }} />
              <div className="stat-label">Active Clients</div>
              <div className="stat-value">{organisations.length}</div>
              <div className="stat-sub">Organisations onboarded</div>
            </div>
            <div className="stat-card">
              <div className="stat-accent" style={{ background: 'var(--blue)' }} />
              <div className="stat-label">Assessments Running</div>
              <div className="stat-value" style={{ color: 'var(--teal)' }}>{activeAssessments.length}</div>
              <div className="stat-sub">
                {reviewAssessments.length > 0
                  ? `${reviewAssessments.length} pending review`
                  : 'None pending review'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-accent" style={{ background: 'var(--coral)' }} />
              <div className="stat-label">Responses Collected</div>
              <div className="stat-value">{responseCount?.toLocaleString()}</div>
              <div className="stat-sub">Total across all surveys</div>
            </div>
            <div className="stat-card">
              <div className="stat-accent" style={{ background: 'var(--gold)' }} />
              <div className="stat-label">Reports Released</div>
              <div className="stat-value">{releasedReports.length}</div>
              <div className="stat-sub">Delivered to clients</div>
            </div>
          </>
        )}
      </div>

      {/* ── AI PANEL ──────────────────────────────────────── */}
      <div className="ai-panel mb-24">
        <div className="ai-panel-brain fluid-think">
          <svg width="44" height="44" viewBox="0 0 100 100" fill="none">
            <defs>
              <radialGradient id="db1" cx="30%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#C9E8A0" />
                <stop offset="40%" stopColor="#5BBFB0" />
                <stop offset="100%" stopColor="#1A6BAA" />
              </radialGradient>
            </defs>
            <path d="M50 50 C50 50 20 35 18 20 C16 5 30 2 40 10 C50 18 50 50 50 50Z" fill="url(#db1)" opacity="0.92" />
            <path d="M50 50 C50 50 15 55 12 70 C9 85 22 92 35 85 C48 78 50 50 50 50Z" fill="url(#db1)" opacity="0.75" />
            <path d="M50 50 C50 50 80 35 82 20 C84 5 70 2 60 10 C50 18 50 50 50 50Z" fill="url(#db1)" opacity="0.88" />
            <path d="M50 50 C50 50 85 55 88 70 C91 85 78 92 65 85 C52 78 50 50 50 50Z" fill="url(#db1)" opacity="0.72" />
            <circle cx="50" cy="50" r="7" fill="white" opacity="0.36" />
          </svg>
        </div>
        <div className="ai-panel-text">
          <div className="ai-panel-title">AI Culture Summary</div>
          <div className="ai-panel-desc">
            {activeAssessments.length > 0
              ? `You have ${activeAssessments.length} active assessment${activeAssessments.length !== 1 ? 's' : ''} running across ${organisations.length} client${organisations.length !== 1 ? 's' : ''}. ${reviewAssessments.length > 0 ? `${reviewAssessments.length} assessment${reviewAssessments.length !== 1 ? 's are' : ' is'} ready for consultant review.` : 'No assessments are currently pending review.'}`
              : 'No active assessments at this time. Create a new assessment to start collecting culture data from your clients.'}
          </div>
        </div>
        <Link to="/app/assessments" className="btn btn-ghost btn-sm">View All →</Link>
      </div>

      <div className="grid-2">
        {/* ── DIMENSION OVERVIEW ─── */}
        <div className="card">
          <div className="flex-between mb-16">
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>Dimension Overview</div>
            <span className="badge badge-slate">Sample data</span>
          </div>
          {dimensions.map(dim => (
            <div key={dim.id} className="dim-item">
              <div className="dim-header">
                <span className="dim-name">{dim.icon} {dim.name}</span>
                <span className="dim-score" style={{ color: scoreColor(sampleScores[dim.id]) }}>
                  {sampleScores[dim.id]}
                </span>
              </div>
              <div className="dim-bar-bg">
                <div className={`dim-bar ${dim.barClass}`} style={{ width: `${sampleScores[dim.id]}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* ── RECENT ASSESSMENTS ─── */}
        <div className="card">
          <div className="flex-between mb-16">
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>Recent Assessments</div>
            <Link to="/app/assessments" style={{ fontSize: 12, color: 'var(--teal)', textDecoration: 'none', fontWeight: 500 }}>
              View all →
            </Link>
          </div>

          {assessLoading ? (
            <Spinner />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Organisation</th>
                  <th>Launched</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAssessments.length === 0 ? (
                  <EmptyRow cols={3} icon="📋" msg="No assessments yet. Create one to get started." />
                ) : recentAssessments.map(a => (
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
                        {a.status === 'active'   ? '● Live'     :
                         a.status === 'complete' ? '✓ Done'     :
                         a.status === 'review'   ? '⟳ Review'  :
                         '○ Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── PENDING REVIEW ────────────────────────────────── */}
      {reviewAssessments.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="flex-between mb-16">
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>Pending Consultant Review</div>
            <span className="badge badge-gold">{reviewAssessments.length} awaiting review</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Assessment</th>
                <th>Organisation</th>
                <th>Closed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviewAssessments.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{a.name}</td>
                  <td style={{ fontSize: 13 }}>{a.org_name}</td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>{fmtDate(a.close_date)}</td>
                  <td>
                    <Link to="/app/report" className="btn btn-teal btn-sm">Open Report →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
