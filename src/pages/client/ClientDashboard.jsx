import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useClientData } from '../../hooks/useClientData'
import { dimensions } from '../../data/dimensions'

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

function daysRemaining(closeDate) {
  if (!closeDate) return null
  return Math.ceil((new Date(closeDate) - new Date()) / 86400000)
}

function scoreColor(s) {
  if (s >= 75) return '#1BBFB0'
  if (s >= 60) return '#3A8FC4'
  if (s >= 45) return '#C9B882'
  return '#E8563A'
}

function scoreLabel(s) {
  if (s >= 75) return 'Strong'
  if (s >= 60) return 'Good'
  if (s >= 45) return 'Developing'
  return 'At Risk'
}

function completionColor(rate) {
  if (rate >= 70) return '#1BBFB0'
  if (rate >= 40) return '#C9B882'
  return '#E8563A'
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(27,191,176,0.18)', borderTopColor: '#1BBFB0', animation: 'cd-spin 0.8s linear infinite' }} />
      <style>{`@keyframes cd-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function ClientDashboard() {
  const { profile, loading: authLoading } = useAuth()
  const { org, assessments, reports, loading } = useClientData(profile?.org_id)

  if (authLoading || loading) return <div className="content"><Spinner /></div>

  const firstName        = profile?.full_name?.split(' ')[0] || ''
  const orgName          = org?.name || 'Your Organisation'
  const activeAssessment = assessments.find(a => a.status === 'active') || null
  const latestReport     = reports[0] || null
  const latestAssessment = latestReport ? assessments.find(a => a.id === latestReport.assessment_id) : null
  const days             = activeAssessment ? daysRemaining(activeAssessment.close_date) : null
  const reportScores     = latestReport?.scores && typeof latestReport.scores === 'object' ? latestReport.scores : null

  const avgScore = reportScores
    ? Math.round(Object.values(reportScores).filter(v => typeof v === 'number').reduce((a, b) => a + b, 0) / Object.values(reportScores).filter(v => typeof v === 'number').length)
    : null

  return (
    <div className="content">

      {/* ── ORG BANNER ───────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0D1F3C 0%, #1B3A6B 50%, #0E4A7A 100%)',
        borderRadius: 16, padding: '36px 36px 32px', marginBottom: 24,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -50, right: -30, width: 220, height: 220, background: 'radial-gradient(circle, rgba(27,191,176,0.14) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: 60, width: 160, height: 160, background: 'radial-gradient(circle, rgba(90,176,208,0.09) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 10 }}>
            Culture Intelligence Portal
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: 'white', letterSpacing: '-0.5px', marginBottom: 8 }}>
            {orgName}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            {getGreeting()}, {firstName} · {todayStr()}
          </div>
        </div>
      </div>

      {/* ── CULTURE HEALTH + ACTIVE ASSESSMENT ──────────── */}
      <div className="grid-2 mb-28">

        {/* Culture health score */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px 24px', textAlign: 'center', minHeight: 260 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 22 }}>
            Culture Health Score
          </div>
          {avgScore != null ? (
            <>
              <div style={{
                width: 130, height: 130, borderRadius: '50%',
                border: `6px solid ${scoreColor(avgScore)}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                marginBottom: 18,
                boxShadow: `0 0 40px ${scoreColor(avgScore)}28, inset 0 0 0 1px ${scoreColor(avgScore)}20`,
              }}>
                <div style={{ fontSize: 42, fontWeight: 800, color: scoreColor(avgScore), lineHeight: 1 }}>{avgScore}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 3 }}>/ 100</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 17, color: scoreColor(avgScore), marginBottom: 6 }}>
                {scoreLabel(avgScore)} Culture
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.65 }}>
                Average across all 8 dimensions<br />
                <span style={{ color: 'var(--text3)', fontSize: 12 }}>
                  {latestAssessment?.name || 'Latest assessment'}
                </span>
              </div>
            </>
          ) : (
            <>
              <div style={{
                width: 100, height: 100, borderRadius: '50%',
                border: '4px dashed rgba(27,191,176,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
              }}>
                <span style={{ fontSize: 30, opacity: 0.5 }}>📊</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy)', marginBottom: 8 }}>Score pending</div>
              <div style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.65 }}>
                Your culture score appears here<br />once a report has been released.
              </div>
            </>
          )}
        </div>

        {/* Active assessment */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 16 }}>Active Assessment</div>
          {activeAssessment ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy)', marginBottom: 4 }}>
                    {activeAssessment.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                    Closes {fmtDate(activeAssessment.close_date)}
                    {days != null && days > 0 && (
                      <span style={{ marginLeft: 7, color: days <= 7 ? 'var(--coral)' : 'var(--text3)' }}>
                        · {days} day{days !== 1 ? 's' : ''} left
                      </span>
                    )}
                    {days != null && days <= 0 && (
                      <span style={{ marginLeft: 7, color: 'var(--coral)' }}>· Closing today</span>
                    )}
                  </div>
                </div>
                <span className="tag tag-active">● Live</span>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text2)', marginBottom: 8 }}>
                  <span>{activeAssessment.total_responses} of {activeAssessment.total_invited} responded</span>
                  <span style={{ fontWeight: 700, color: completionColor(activeAssessment.completion_rate) }}>
                    {activeAssessment.completion_rate}%
                  </span>
                </div>
                <div style={{ height: 10, background: 'var(--bg)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 99, transition: 'width 0.6s ease',
                    width: `${activeAssessment.completion_rate}%`,
                    background: completionColor(activeAssessment.completion_rate),
                  }} />
                </div>
              </div>

              <div style={{ fontSize: 12.5, color: 'var(--text2)', background: 'var(--bg)', borderRadius: 9, padding: '11px 13px', lineHeight: 1.6 }}>
                {activeAssessment.total_invited === 0
                  ? 'No employees have been invited yet.'
                  : activeAssessment.completion_rate >= 70
                  ? '✓ Great response rate — on track for a reliable report.'
                  : activeAssessment.completion_rate >= 40
                  ? 'Moderate response rate. A reminder to employees may help.'
                  : 'Low response rate. Consider sending a reminder to improve data quality.'}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text3)' }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>📋</div>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--navy)', marginBottom: 6 }}>No active assessment</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.65 }}>
                Contact Africa International Advisors<br />to launch your next assessment.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── DIMENSION BREAKDOWN ──────────────────────────── */}
      {reportScores ? (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="flex-between mb-16">
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>Culture Dimensions</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge badge-teal">Latest report</span>
              {latestAssessment && (
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{latestAssessment.name}</span>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 12 }}>
            {dimensions.map(dim => {
              const score = reportScores[dim.id]
              if (score == null) return null
              return (
                <div key={dim.id} style={{
                  padding: '14px 16px', background: 'var(--bg)', borderRadius: 10,
                  borderLeft: `3px solid ${dim.accentColor}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{dim.icon} {dim.name}</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: scoreColor(score) }}>{score}</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(0,0,0,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${score}%`, background: dim.accentColor, borderRadius: 99, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : assessments.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 20 }}>Assessment History</div>
          {assessments.map(a => (
            <div key={a.id} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)' }}>{a.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: completionColor(a.completion_rate) }}>
                  {a.total_responses}/{a.total_invited} · {a.completion_rate}%
                </span>
              </div>
              <div style={{ height: 7, background: 'var(--bg)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${a.completion_rate}%`, background: completionColor(a.completion_rate), borderRadius: 99, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── REPORT ACCESS ────────────────────────────────── */}
      {latestReport && (
        <div style={{
          background: 'linear-gradient(135deg, #0D1F3C 0%, #0E3462 100%)',
          borderRadius: 14, padding: '24px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>
              Latest Report Available
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 4 }}>
              {latestAssessment?.name || 'Culture Assessment Report'}
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)' }}>
              Released {fmtDate(latestReport.released_at || latestReport.created_at)}
            </div>
          </div>
          <Link to="/client/reports">
            <button className="btn btn-teal" style={{ whiteSpace: 'nowrap' }}>
              View Full Report →
            </button>
          </Link>
        </div>
      )}

      {/* Empty state — no assessments at all */}
      {assessments.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '52px 32px' }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--navy)', marginBottom: 10 }}>No assessments yet</div>
          <div style={{ fontSize: 13.5, color: 'var(--text2)', maxWidth: 380, margin: '0 auto', lineHeight: 1.7 }}>
            No culture assessments have been launched for your organisation yet.
            Contact Africa International Advisors to get started.
          </div>
        </div>
      )}
    </div>
  )
}
