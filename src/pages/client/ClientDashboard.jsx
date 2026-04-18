import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useClientData } from '../../hooks/useClientData'

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  if (h >= 17 && h < 21) return 'Good evening'
  return 'Good night'
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysRemaining(closeDate) {
  if (!closeDate) return null
  return Math.ceil((new Date(closeDate) - new Date()) / 86400000)
}

function completionColor(rate) {
  if (rate >= 70) return 'var(--teal)'
  if (rate >= 40) return 'var(--gold2)'
  return 'var(--coral)'
}

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

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(27,191,176,0.18)', borderTopColor: 'var(--teal)', animation: 'cd-spin 0.8s linear infinite' }} />
      <style>{`@keyframes cd-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function ClientDashboard() {
  const { profile, loading: authLoading } = useAuth()
  const { org, assessments, reports, loading } = useClientData(profile?.org_id)

  if (authLoading || loading) return <div className="content"><Spinner /></div>

  const firstName        = profile?.full_name?.split(' ')[0] || ''
  const orgName          = org?.name || ''
  const totalAssessments = assessments.length
  const activeList       = assessments.filter(a => a.status === 'active')
  const totalResponses   = assessments.reduce((s, a) => s + (a.total_responses || 0), 0)
  const activeAssessment = activeList[0] || null
  const latestReport     = reports[0] || null
  const latestReportAssessment = latestReport
    ? assessments.find(a => a.id === latestReport.assessment_id)
    : null
  const days = activeAssessment ? daysRemaining(activeAssessment.close_date) : null

  const avgScore = latestReport?.scores
    ? Math.round(Object.values(latestReport.scores).reduce((a, b) => a + b, 0) / Object.values(latestReport.scores).length)
    : null

  return (
    <div className="content">
      {/* Hero */}
      <div className="page-hero" style={{ marginBottom: 28 }}>
        <div className="hero-title">
          {authLoading || !profile?.full_name
            ? 'Welcome ✦'
            : `${getGreeting()}, ${firstName} ✦`}
        </div>
        <div className="hero-sub">
          {orgName ? `${orgName} Culture Intelligence Portal` : 'Culture Intelligence Portal'}
        </div>
        <div className="hero-fluid-pos">
          <svg width="90" height="90" viewBox="0 0 100 100" fill="none" opacity="0.18">
            <path d="M50 50 C50 50 20 35 18 20 C16 5 30 2 40 10 C50 18 50 50 50 50Z" fill="#1BBFB0"/>
            <path d="M50 50 C50 50 15 55 12 70 C9 85 22 92 35 85 C48 78 50 50 50 50Z" fill="#3A8FC4"/>
            <path d="M50 50 C50 50 80 35 82 20 C84 5 70 2 60 10 C50 18 50 50 50 50Z" fill="#C9B882"/>
            <path d="M50 50 C50 50 85 55 88 70 C91 85 78 92 65 85 C52 78 50 50 50 50Z" fill="#1BBFB0"/>
          </svg>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4 mb-28">
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--blue)' }} />
          <div className="stat-label">Total Assessments</div>
          <div className="stat-value">{totalAssessments}</div>
          <div className="stat-sub">All time</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--teal)' }} />
          <div className="stat-label">Active Now</div>
          <div className="stat-value" style={{ color: activeList.length > 0 ? 'var(--teal)' : 'var(--navy)' }}>
            {activeList.length}
          </div>
          <div className="stat-sub">{activeList.length > 0 ? 'In progress' : 'None running'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--gold)' }} />
          <div className="stat-label">Total Responses</div>
          <div className="stat-value">{totalResponses}</div>
          <div className="stat-sub">Across all assessments</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--navy)' }} />
          <div className="stat-label">Reports Available</div>
          <div className="stat-value">{reports.length}</div>
          <div className="stat-sub">{reports.length > 0 ? 'Ready to view' : 'None released yet'}</div>
        </div>
      </div>

      <div className="grid-2 mb-28">
        {/* Active assessment */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 16 }}>
            Active Assessment
          </div>
          {activeAssessment ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy)', marginBottom: 4 }}>
                    {activeAssessment.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                    Closes {fmtDate(activeAssessment.close_date)}
                    {days != null && days > 0 && (
                      <span style={{ marginLeft: 8, color: days <= 7 ? 'var(--coral)' : 'var(--text3)' }}>
                        · {days} day{days !== 1 ? 's' : ''} remaining
                      </span>
                    )}
                    {days != null && days <= 0 && (
                      <span style={{ marginLeft: 8, color: 'var(--coral)' }}>· Closing today</span>
                    )}
                  </div>
                </div>
                <span className="tag tag-active">● Live</span>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginBottom: 7 }}>
                  <span>{activeAssessment.total_responses} of {activeAssessment.total_invited} employees responded</span>
                  <span style={{ fontWeight: 700, color: completionColor(activeAssessment.completion_rate) }}>
                    {activeAssessment.completion_rate}%
                  </span>
                </div>
                <div style={{ height: 10, background: 'var(--bg)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${activeAssessment.completion_rate}%`,
                    background: completionColor(activeAssessment.completion_rate),
                    borderRadius: 99, transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>

              <div style={{ fontSize: 12.5, color: 'var(--text2)', background: 'var(--bg)', borderRadius: 8, padding: '10px 13px' }}>
                {activeAssessment.total_invited === 0
                  ? 'No employees have been invited yet.'
                  : activeAssessment.completion_rate >= 70
                  ? '✓ Great response rate — on track for a statistically reliable report.'
                  : activeAssessment.completion_rate >= 40
                  ? 'Moderate response rate. A reminder to employees may help.'
                  : 'Low response rate. Consider sending a reminder to improve data quality.'}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 13 }}>No active assessment at the moment.</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Contact Africa International Advisors to launch one.</div>
            </div>
          )}
        </div>

        {/* Latest report */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 16 }}>
            Latest Report
          </div>
          {latestReport ? (
            <>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--navy)', marginBottom: 3 }}>
                  {latestReportAssessment?.name || 'Culture Assessment'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  Released {fmtDate(latestReport.released_at || latestReport.created_at)}
                </div>
              </div>
              {avgScore != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '20px 0' }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    border: `4px solid ${scoreColor(avgScore)}`,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: scoreColor(avgScore), lineHeight: 1 }}>{avgScore}</div>
                    <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '1px' }}>score</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: scoreColor(avgScore) }}>{scoreLabel(avgScore)} Culture</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4, lineHeight: 1.5 }}>
                      Overall score across<br />all 8 dimensions
                    </div>
                  </div>
                </div>
              )}
              <Link to="/client/reports" style={{ textDecoration: 'none' }}>
                <button className="btn btn-teal btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
                  View Full Report →
                </button>
              </Link>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '28px 16px' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                border: '2px dashed rgba(27,191,176,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <span style={{ fontSize: 22 }}>📊</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--navy)', marginBottom: 8 }}>
                Report in preparation
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>
                Your report is being prepared by<br />
                Africa International Advisors.<br />
                You'll be notified when it's ready.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Participation breakdown */}
      {assessments.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 20 }}>
            Participation by Assessment
          </div>
          {assessments.map(a => (
            <div key={a.id} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)' }}>{a.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: completionColor(a.completion_rate) }}>
                  {a.total_responses}/{a.total_invited} · {a.completion_rate}%
                </span>
              </div>
              <div style={{ height: 8, background: 'var(--bg)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${a.completion_rate}%`,
                  background: completionColor(a.completion_rate),
                  borderRadius: 99, transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {assessments.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--navy)', marginBottom: 8 }}>No assessments yet</div>
          <div style={{ fontSize: 13.5, color: 'var(--text2)', maxWidth: 380, margin: '0 auto', lineHeight: 1.7 }}>
            No culture assessments have been launched for your organisation yet.
            Contact Africa International Advisors to get started.
          </div>
        </div>
      )}
    </div>
  )
}
