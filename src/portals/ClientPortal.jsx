import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useClientData } from '../hooks/useClientData'
import { usePulse } from '../hooks/usePulse'
import UserMenu from '../components/UserMenu'
import { useYSWH } from '../hooks/useYSWH'
import './client.css'

const ROLES_DEF = {
  staff:   { tabs: ['today', 'voice', 'happening', 'yswh', 'me'] },
  manager: { tabs: ['today', 'voice', 'happening', 'yswh', 'me', 'team'] },
  hc:      { tabs: ['today', 'voice', 'happening', 'yswh', 'me', 'team', 'diagnostics', 'participation', 'lifecycle', 'governance'] },
  exec:    { tabs: ['today', 'voice', 'happening', 'yswh', 'me', 'team', 'diagnostics', 'participation', 'governance'] },
}

const TAB_LABELS = {
  today: 'Today',
  voice: 'My Voice',
  happening: "What's Happening",
  yswh: 'You Said We Heard',
  me: 'Me',
  team: 'My Team',
  diagnostics: 'Diagnostics',
  participation: 'Participation',
  lifecycle: 'Lifecycle Config',
  governance: 'Governance',
}

const DIMS_DEMO = [
  { name: 'Strategic Coherence', score: 82, mentions: 12, color: 'bar-teal' },
  { name: 'Systems Intelligence', score: 71, mentions: 8, color: 'bar-teal' },
  { name: 'Execution Discipline', score: 69, mentions: 14, color: 'bar-blue' },
  { name: 'Purpose & Meaning', score: 74, mentions: 6, color: 'bar-blue' },
  { name: 'Governance & Decision Rights', score: 61, mentions: 19, color: 'bar-gold' },
  { name: 'Value Recognition', score: 47, mentions: 31, color: 'bar-coral' },
  { name: 'Listening & Learning', score: 63, mentions: 11, color: 'bar-blue' },
  { name: 'Leadership Influence', score: 67, mentions: 42, color: 'bar-coral' },
  { name: 'Psychological Safety', score: 58, mentions: 28, color: 'bar-coral' },
  { name: 'Innovation', score: 71, mentions: 9, color: 'bar-teal' },
  { name: 'Agility & Resilience', score: 76, mentions: 7, color: 'bar-teal' },
  { name: 'Customer Orientation', score: 79, mentions: 5, color: 'bar-teal' },
]

const PULSE_DIM_OPTS = ['Leadership', 'Recognition', 'Collaboration', 'Wellbeing', 'Strategy', 'Communication']

function scoreBarClass(score) {
  if (score >= 75) return 'bar-teal'
  if (score >= 60) return 'bar-blue'
  if (score >= 50) return 'bar-gold'
  return 'bar-coral'
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`
  return `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? 's' : ''} ago`
}

export default function ClientPortal() {
  const navigate = useNavigate()
  const { profile, role: authRole, signOut } = useAuth()

  const orgId = profile?.org_id || null
  const { org, assessments: clientAssessments, reports: clientReports, loading: clientLoading } = useClientData(orgId)
  const { entries: pulseEntries, stats: pulseStats, createEntry, loading: pulseLoading } = usePulse(orgId)
  const { items: ywshItems, loading: ywshLoading } = useYSWH(orgId)

  const [demoRole, setDemoRole] = useState('hc')
  const [view, setView] = useState('today')
  const [pulseText, setPulseText] = useState('')
  const [selectedDims, setSelectedDims] = useState([])
  const [deptFilter, setDeptFilter] = useState('all')

  const availableTabs = ROLES_DEF[demoRole]?.tabs || ROLES_DEF.staff.tabs

  // Ensure current view is in available tabs
  const activeView = availableTabs.includes(view) ? view : availableTabs[0]

  const toggleDim = (dim) => {
    setSelectedDims(prev => prev.includes(dim) ? prev.filter(d => d !== dim) : [...prev, dim])
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'
  const displayName = profile?.full_name || 'User'
  const firstName = displayName.split(' ')[0]

  // Profile derived values
  const dept = profile?.department || '—'
  const jobTitle = profile?.job_title || '—'
  const tenureStr = profile?.hire_date
    ? (() => {
        const months = Math.floor((new Date() - new Date(profile.hire_date)) / (1000 * 60 * 60 * 24 * 30.5))
        const y = Math.floor(months / 12), m = months % 12
        return y > 0 ? `${y}yr ${m}mo` : `${m}mo`
      })()
    : '—'

  // Active assessments count
  const activeAssessments = clientAssessments.filter(a => a.status === 'active')
  const activeCount = activeAssessments.length

  // Latest released report
  const latestReport = clientReports[0] || null
  const reportScores = latestReport?.scores || null

  // Pulse themes — count dimension mentions
  const pulseDimCounts = {}
  pulseEntries.forEach(e => {
    if (Array.isArray(e.dimensions)) {
      e.dimensions.forEach(d => { pulseDimCounts[d] = (pulseDimCounts[d] || 0) + 1 })
    }
  })
  const topThemes = Object.entries(pulseDimCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  // YSWH status dot color
  function ywshDotColor(status) {
    if (status === 'in_progress') return '#1BBFB0'
    if (status === 'planned') return '#C9B882'
    if (status === 'complete') return '#065F46'
    if (status === 'cancelled') return '#8A9BB0'
    return '#8A9BB0'
  }

  function ywshStatusLabel(status) {
    if (status === 'in_progress') return 'In Progress'
    if (status === 'planned') return 'Planned'
    if (status === 'complete') return 'Completed'
    if (status === 'cancelled') return 'Cancelled'
    return status || '—'
  }

  function ywshStatusColor(status) {
    if (status === 'in_progress') return '#0A8A7E'
    if (status === 'planned') return '#7A6030'
    if (status === 'complete') return '#065F46'
    return 'var(--text3)'
  }

  async function handlePulseSubmit() {
    if (!pulseText.trim() || !orgId) return
    await createEntry(pulseText.trim(), selectedDims, orgId)
    setPulseText('')
    setSelectedDims([])
  }

  return (
    <div className="portal-cl">
      {/* ── TOPBAR ── */}
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <span className="cx">Culture</span>
            <span className="xe">Xe</span>
          </div>
          <div className="brand-org">{org?.name || '…'}</div>
          {(authRole === 'superadmin') && (
            <button
              className="btn btn-outline btn-sm"
              style={{ marginLeft: 10, fontSize: 11 }}
              onClick={() => navigate('/app')}
            >
              ← Consultant Portal
            </button>
          )}
        </div>

        <div className="top-center">
          {availableTabs.map(tab => (
            <button
              key={tab}
              className={`tn${activeView === tab ? ' active' : ''}`}
              onClick={() => setView(tab)}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <div className="top-right">
          <div className="role-switcher">
            <label>DEMO</label>
            <select value={demoRole} onChange={e => { setDemoRole(e.target.value); setView('today') }}>
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="hc">HR / Culture Lead</option>
              <option value="exec">Executive</option>
            </select>
          </div>
          <UserMenu initials={initials} displayName={profile?.full_name || displayName} />
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="container">

        {/* ════════════════════════════════════════════════
            TODAY VIEW
        ════════════════════════════════════════════════ */}
        {activeView === 'today' && (
          <div>
            <div className="hero-light">
              <div className="hero-title-l">Good morning, {firstName} ☀️</div>
              <div className="hero-sub-l">Here is what needs your attention today{org?.name ? ` at ${org.name}` : ''}.</div>
            </div>

            <div className="grid-2 mb-20">
              {/* Active Surveys */}
              <div className="card">
                <div className="flex-between mb-16">
                  <div className="section-title" style={{ fontSize: 15 }}>Active Surveys</div>
                  {activeCount > 0 && <span className="badge badge-teal">{activeCount} open</span>}
                </div>
                {activeAssessments.length > 0 ? activeAssessments.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, marginBottom: 8, background: 'var(--teal-light)', border: '1px solid rgba(27,191,176,0.22)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--navy)' }}>{s.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 2 }}>
                        {s.close_date ? `Closes ${new Date(s.close_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}` : 'Open'}
                      </div>
                    </div>
                    <button className="btn btn-sm" style={{ background: 'var(--teal)', color: 'white', border: 'none' }}>Start →</button>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)', fontSize: 13 }}>No active surveys right now.</div>
                )}
              </div>

              {/* 360 Requests */}
              <div className="card">
                <div className="flex-between mb-16">
                  <div className="section-title" style={{ fontSize: 15 }}>360 Requests</div>
                </div>
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)', fontSize: 13 }}>No 360 requests pending.</div>
              </div>
            </div>

            {/* Quick Pulse */}
            <div className="pulse-input-wrap">
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy)', marginBottom: 10 }}>Quick Pulse — How are things at work today?</div>
              <textarea
                className="pulse-textarea"
                placeholder="Share what's on your mind. Fully anonymous. Your voice shapes our culture..."
                value={pulseText}
                onChange={e => setPulseText(e.target.value)}
              />
              <div className="pulse-footer">
                <div className="pulse-dims">
                  {PULSE_DIM_OPTS.map(d => (
                    <button key={d} className={`pulse-dim${selectedDims.includes(d) ? ' sel' : ''}`} onClick={() => toggleDim(d)}>{d}</button>
                  ))}
                </div>
                <button className="btn btn-teal btn-sm" onClick={handlePulseSubmit} disabled={!pulseText.trim() || !orgId}>Submit →</button>
              </div>
            </div>

            {/* Latest YSWH */}
            <div className="card">
              <div className="flex-between mb-16">
                <div className="section-title" style={{ fontSize: 15 }}>Latest — You Said, We Heard</div>
                <button className="btn btn-outline btn-sm" onClick={() => setView('yswh')}>View All →</button>
              </div>
              {ywshItems.length > 0 ? (
                <div className="yswh-item">
                  <div className="yswh-theme">{ywshItems[0].theme}</div>
                  <div className="yswh-quote">{ywshItems[0].employee_quote}</div>
                  <div className="yswh-response">{ywshItems[0].response_text}</div>
                  <div className="yswh-action">
                    <div className="yswh-dot" style={{ background: ywshDotColor(ywshItems[0].action_status) }} />
                    <span style={{ color: ywshStatusColor(ywshItems[0].action_status) }}>{ywshStatusLabel(ywshItems[0].action_status)}</span>
                    {ywshItems[0].target_date && (
                      <span style={{ color: 'var(--text3)', fontWeight: 400, marginLeft: 8 }}>
                        Target: {new Date(ywshItems[0].target_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)', fontSize: 13 }}>No updates yet. Your leadership will post responses here.</div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            MY VOICE VIEW
        ════════════════════════════════════════════════ */}
        {activeView === 'voice' && (
          <div>
            <div className="hero-dark">
              <div className="hero-title-d">My Voice</div>
              <div className="hero-sub-d">Share how you're experiencing work. Fully anonymous. Directly shapes culture decisions.</div>
            </div>

            {/* Always On Pulse */}
            <div className="pulse-input-wrap">
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>Always On Pulse</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>Share anything — a concern, a win, an observation. Completely anonymous.</div>
              <textarea
                className="pulse-textarea"
                placeholder="What's on your mind about work, culture, leadership, or your team?"
                value={pulseText}
                onChange={e => setPulseText(e.target.value)}
              />
              <div className="pulse-footer">
                <div className="pulse-dims">
                  {PULSE_DIM_OPTS.map(d => (
                    <button key={d} className={`pulse-dim${selectedDims.includes(d) ? ' sel' : ''}`} onClick={() => toggleDim(d)}>{d}</button>
                  ))}
                </div>
                <button className="btn btn-teal btn-sm" onClick={handlePulseSubmit} disabled={!pulseText.trim() || !orgId}>Submit Anonymously →</button>
              </div>
            </div>

            <div className="grid-2">
              {/* Open Surveys */}
              <div className="card">
                <div className="section-title mb-16" style={{ fontSize: 15 }}>Open Surveys</div>
                {activeAssessments.length > 0 ? activeAssessments.map(s => (
                  <div key={s.id} style={{ marginBottom: 16 }}>
                    <div className="flex-between" style={{ marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--navy)' }}>{s.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {s.close_date ? `Closes ${new Date(s.close_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Open'}
                      </span>
                    </div>
                    <div className="dim-bar-bg">
                      <div className="dim-bar bar-teal" style={{ width: '0%' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11.5 }}>
                      <span style={{ color: 'var(--text3)' }}>Not started</span>
                      <button className="btn btn-sm btn-teal">Start →</button>
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)', fontSize: 13 }}>No open surveys at this time.</div>
                )}
              </div>

              {/* 360 Requests */}
              <div className="card">
                <div className="section-title mb-16" style={{ fontSize: 15 }}>360 Requests</div>
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)', fontSize: 13 }}>No 360 requests pending.</div>
              </div>
            </div>

            {/* My Recent Submissions */}
            <div className="card" style={{ marginTop: 20 }}>
              <div className="section-title mb-16" style={{ fontSize: 15 }}>My Recent Submissions</div>
              {pulseEntries.slice(0, 5).length > 0 ? pulseEntries.slice(0, 5).map((entry, i) => (
                <div key={entry.id || i} className="sentiment">
                  <div className="sentiment-head">
                    <div className="sentiment-tags">
                      {Array.isArray(entry.dimensions) && entry.dimensions.map(t => <span key={t} className="badge badge-slate">{t}</span>)}
                    </div>
                    <span className="sentiment-time">{timeAgo(entry.created_at)}</span>
                  </div>
                  <div className="sentiment-body">"{entry.text}"</div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)', fontSize: 13 }}>No submissions yet. Share your first pulse above.</div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            WHAT'S HAPPENING VIEW
        ════════════════════════════════════════════════ */}
        {activeView === 'happening' && (
          <div>
            <div className="hero-dark">
              <div className="hero-title-d">What's Happening</div>
              <div className="hero-sub-d">Anonymised culture themes and sentiment intelligence{org?.name ? ` from across ${org.name}` : ''}.</div>
            </div>

            {/* Trending themes */}
            <div style={{ marginBottom: 12, fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1.5 }}>Trending This Week</div>
            <div className="grid-3 mb-24">
              {topThemes.length > 0 ? topThemes.map(([ theme, count ], idx) => (
                <div key={theme} className={`insight${idx === 0 ? ' alert' : idx === 1 ? ' warn' : ''}`} style={{ margin: 0 }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{idx === 0 ? '⚠' : idx === 1 ? '◎' : '✓'}</div>
                  <div className="insight-title">{theme}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                    <span className={`badge badge-${idx === 0 ? 'coral' : idx === 1 ? 'gold' : 'teal'}`}>{count} mentions</span>
                  </div>
                  <div className="insight-text">Top mentioned dimension in recent pulse submissions.</div>
                </div>
              )) : (
                <div className="insight" style={{ margin: 0, gridColumn: '1/-1' }}>
                  <div className="insight-title">No themes yet</div>
                  <div className="insight-text">Themes will appear here as employees submit pulse entries.</div>
                </div>
              )}
            </div>

            {/* Dimension Pulse */}
            <div className="card">
              <div className="flex-between mb-16">
                <div className="section-title" style={{ fontSize: 15 }}>Dimension Pulse</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Based on {pulseStats.total} open-text submissions</div>
              </div>
              {Object.keys(pulseDimCounts).length > 0 ? (
                <div className="grid-2">
                  {Object.entries(pulseDimCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([dim, count]) => {
                      const maxCount = Math.max(...Object.values(pulseDimCounts))
                      return (
                        <div key={dim} className="dim-item">
                          <div className="dim-header">
                            <span className="dim-name">{dim}</span>
                            <span className="dim-score" style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>{count} mentions</span>
                          </div>
                          <div className="dim-bar-bg">
                            <div className="dim-bar bar-blue" style={{ width: `${Math.min(100, (count / maxCount) * 100)}%` }} />
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <div className="grid-2">
                  {DIMS_DEMO.slice().sort((a, b) => b.mentions - a.mentions).map(dim => (
                    <div key={dim.name} className="dim-item">
                      <div className="dim-header">
                        <span className="dim-name">{dim.name}</span>
                        <span className="dim-score" style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>{dim.mentions} mentions</span>
                      </div>
                      <div className="dim-bar-bg">
                        <div className={`dim-bar ${dim.color}`} style={{ width: `${Math.min(100, (dim.mentions / 42) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            YOU SAID WE HEARD VIEW
        ════════════════════════════════════════════════ */}
        {activeView === 'yswh' && (
          <div>
            <div className="hero-light">
              <div className="hero-title-l">You Said, We Heard, We're Doing</div>
              <div className="hero-sub-l">Here's how {org?.name || 'your organisation'} has responded to your feedback. Transparency builds trust.</div>
            </div>

            {ywshItems.length > 0 ? ywshItems.map((item, i) => (
              <div key={item.id || i} className="yswh-item">
                <div className="yswh-theme">{item.theme}</div>
                {item.employee_quote && <div className="yswh-quote">{item.employee_quote}</div>}
                {item.response_text && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Our Response</div>
                    <div className="yswh-response">{item.response_text}</div>
                  </>
                )}
                {item.action_text && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Action Taken</div>
                    <div style={{ fontSize: 12, color: 'var(--navy)', marginBottom: 10, fontStyle: 'italic' }}>{item.action_text}</div>
                  </>
                )}
                <div className="yswh-action">
                  <div className="yswh-dot" style={{ background: ywshDotColor(item.action_status) }} />
                  <span style={{ color: ywshStatusColor(item.action_status) }}>{ywshStatusLabel(item.action_status)}</span>
                  {item.target_date && (
                    <span style={{ color: 'var(--text3)', fontWeight: 400, marginLeft: 8 }}>
                      Target: {new Date(item.target_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text3)' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>No updates yet.</div>
                <div style={{ fontSize: 13 }}>Your leadership will post responses here.</div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════
            ME VIEW
        ════════════════════════════════════════════════ */}
        {activeView === 'me' && (
          <div>
            <div className="hero-light">
              <div className="hero-title-l">My Settings & Privacy</div>
              <div className="hero-sub-l">Your profile, notification preferences, and privacy controls.</div>
            </div>

            <div className="grid-2">
              {/* My Profile */}
              <div>
                <div className="card mb-16">
                  <div className="section-title mb-16" style={{ fontSize: 15 }}>My Profile</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                    <div className="avatar" style={{ width: 52, height: 52, fontSize: 18 }}>{initials}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--navy)' }}>{displayName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{dept} · {jobTitle}</div>
                    </div>
                  </div>
                  {[
                    { label: 'Department', value: dept },
                    { label: 'Role', value: jobTitle },
                    { label: 'Tenure', value: tenureStr },
                    { label: 'Reports to', value: '—' },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <span style={{ color: 'var(--text3)', fontWeight: 500 }}>{row.label}</span>
                      <span style={{ color: 'var(--navy)', fontWeight: 600 }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Notification Preferences */}
                <div className="card">
                  <div className="section-title mb-16" style={{ fontSize: 15 }}>Notification Preferences</div>
                  {[
                    { label: 'New survey invitations', checked: true },
                    { label: '360 feedback requests', checked: true },
                    { label: 'YSWH updates from leadership', checked: true },
                    { label: 'Weekly culture digest', checked: false },
                  ].map(pref => (
                    <div key={pref.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 13, color: 'var(--navy)' }}>{pref.label}</span>
                      <input type="checkbox" defaultChecked={pref.checked} style={{ width: 16, height: 16, accentColor: 'var(--teal)' }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Privacy & Anonymity */}
              <div className="card">
                <div className="section-title mb-16" style={{ fontSize: 15 }}>Privacy & Anonymity</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 20 }}>
                  CultureXe is built on a foundation of psychological safety and data ethics. Here's exactly how your data is protected.
                </div>
                <div className="gov-card">
                  <div className="gov-body">
                    {[
                      { title: 'Full Anonymity', desc: 'Your individual responses are never visible to management, HR, or any other employee. Responses are processed by AI only.' },
                      { title: 'Aggregate Reporting Only', desc: 'Results are only reported in groups of 5 or more. No individual response is ever surfaced.' },
                      { title: 'No Reverse Engineering', desc: 'Open-text responses are paraphrased by AI before being included in any report to prevent identification.' },
                      { title: 'Your Data, Your Rights', desc: 'You may request deletion of all your submitted data at any time by contacting your HR administrator.' },
                      { title: 'POPIA Compliant', desc: 'CultureXe complies with the Protection of Personal Information Act (POPIA) and GDPR standards.' },
                    ].map(item => (
                      <div key={item.title} className="gov-item">
                        <span className="gov-check">✓</span>
                        <div>
                          <strong style={{ color: 'var(--navy)' }}>{item.title}:</strong> {item.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            TEAM VIEW (manager+)
        ════════════════════════════════════════════════ */}
        {activeView === 'team' && (
          <div>
            <div className="hero-dark">
              <div className="hero-title-d">My Team</div>
              <div className="hero-sub-d">Anonymised culture intelligence for your direct reports and reporting lines.</div>
            </div>

            <div className="grid-4 mb-24">
              {[
                { label: 'Team Size', value: '—', color: '#1BBFB0' },
                { label: 'Survey Participation', value: '—', color: '#3A8FC4' },
                { label: 'Pulse Activity', value: pulseStats.thisWeek, color: '#C9B882' },
                { label: 'Avg Sentiment', value: pulseStats.avgSentiment != null ? `${pulseStats.avgSentiment}/5` : '—', color: '#E8563A' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-accent" style={{ background: s.color }} />
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value">{s.value}</div>
                </div>
              ))}
            </div>

            <div className="grid-2">
              {/* Team Dimension Scores */}
              <div className="card">
                <div className="section-title mb-16" style={{ fontSize: 15 }}>Team Dimension Scores</div>
                {DIMS_DEMO.slice(0, 8).map(dim => {
                  const score = reportScores?.[dim.name] ?? dim.score
                  return (
                    <div key={dim.name} className="dim-item">
                      <div className="dim-header">
                        <span className="dim-name">{dim.name}</span>
                        <span className="dim-score">{score}</span>
                      </div>
                      <div className="dim-bar-bg">
                        <div className={`dim-bar ${scoreBarClass(score)}`} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  )
                })}
                {!reportScores && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>Sample data — no released report yet.</div>}
              </div>

              <div>
                {/* Team Themes */}
                <div className="card mb-16">
                  <div className="section-title mb-16" style={{ fontSize: 15 }}>Team Themes</div>
                  {pulseEntries.slice(0, 3).length > 0 ? pulseEntries.slice(0, 3).map((entry, i) => (
                    <div key={entry.id || i} className="sentiment">
                      <div className="sentiment-head">
                        <div className="sentiment-tags">
                          {Array.isArray(entry.dimensions) && entry.dimensions.map(t => <span key={t} className="badge badge-slate">{t}</span>)}
                        </div>
                        <span className="sentiment-time">{timeAgo(entry.created_at)}</span>
                      </div>
                      <div className="sentiment-body">"{entry.text}"</div>
                    </div>
                  )) : (
                    <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text3)', fontSize: 13 }}>No team pulse entries yet.</div>
                  )}
                </div>

                {/* 360 Feedback */}
                <div className="card">
                  <div className="section-title mb-16" style={{ fontSize: 15 }}>Your Leadership 360</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 16 }}>
                    {[
                      { label: 'Self', val: 71 },
                      { label: 'Direct Reports', val: 74 },
                      { label: 'Peers', val: 72 },
                      { label: 'Manager', val: 76 },
                    ].map(s => (
                      <div key={s.label} style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: 24, color: 'var(--navy)' }}>{s.val}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="insight">
                    <div className="insight-title">Alignment Insight</div>
                    <div className="insight-text">Strong alignment across rater groups (5-point range). Direct reports rate your Leadership Influence highest. Opportunity area: Psychological Safety rated 3 points below self-assessment.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            DIAGNOSTICS VIEW (hc/exec)
        ════════════════════════════════════════════════ */}
        {activeView === 'diagnostics' && (
          <div>
            <div className="hero-dark">
              <div className="hero-title-d">Organisation Diagnostics</div>
              <div className="hero-sub-d">Full culture intelligence across all 12 dimensions with real-time pulse integration.</div>
            </div>

            <div className="grid-4 mb-24">
              {[
                { label: 'Culture Score', value: reportScores ? Math.round(Object.values(reportScores).map(Number).filter(v => !isNaN(v)).reduce((a, b) => a + b, 0) / Object.values(reportScores).length) : '—', color: '#1BBFB0' },
                { label: 'Always On Pulse', value: pulseStats.total, color: '#3A8FC4' },
                { label: 'Avg Leader 360', value: '—', color: '#C9B882' },
                { label: 'YSWH Items', value: ywshItems.length, color: '#1A3560' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-accent" style={{ background: s.color }} />
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value">{s.value}</div>
                </div>
              ))}
            </div>

            {/* 12 Dimension Scores */}
            <div className="card mb-20">
              <div className="flex-between mb-16">
                <div className="section-title" style={{ fontSize: 15 }}>12-Dimension Culture Scores</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {!reportScores && <span className="badge badge-gold">Sample data</span>}
                  <select
                    className="form-input"
                    style={{ width: 'auto', fontSize: 12, padding: '5px 10px' }}
                    value={deptFilter}
                    onChange={e => setDeptFilter(e.target.value)}
                  >
                    <option value="all">All Departments</option>
                    <option value="underwriting">Underwriting</option>
                    <option value="claims">Claims</option>
                    <option value="finance">Finance</option>
                    <option value="ops">Operations</option>
                  </select>
                </div>
              </div>
              <div className="grid-2">
                {[DIMS_DEMO.slice(0, 6), DIMS_DEMO.slice(6, 12)].map((col, ci) => (
                  <div key={ci}>
                    {col.map(dim => {
                      const score = reportScores?.[dim.name] ?? dim.score
                      return (
                        <div key={dim.name} className="dim-item">
                          <div className="dim-header">
                            <span className="dim-name">{dim.name}</span>
                            <span className="dim-score">{score}</span>
                          </div>
                          <div className="dim-bar-bg">
                            <div className={`dim-bar ${scoreBarClass(score)}`} style={{ width: `${score}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Connected Intelligence */}
            <div className="card">
              <div className="section-title mb-16" style={{ fontSize: 15 }}>Connected Intelligence</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {[
                  { type: 'alert', title: 'Critical: Value Recognition', text: 'Score of 47 is the lowest and sits 21 points below sector average. Leading indicator of retention risk in Underwriting.' },
                  { type: 'warn', title: 'Watch: Psychological Safety', text: 'At 58, below the 60-point activation threshold. Open-text confirms self-censoring behaviour across management layers.' },
                  { type: '', title: 'Bright Spot: Customer Orientation', text: 'Score of 79 puts the organisation in the top quartile for customer-centricity. Strong correlation with recent NPS improvements.' },
                ].map((ins, i) => (
                  <div key={i} className={`insight${ins.type ? ` ${ins.type}` : ''}`} style={{ margin: 0 }}>
                    <div className="insight-title">{ins.title}</div>
                    <div className="insight-text">{ins.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            PARTICIPATION VIEW (hc/exec)
        ════════════════════════════════════════════════ */}
        {activeView === 'participation' && (
          <div>
            <div className="hero-light">
              <div className="hero-title-l">Organisation Participation</div>
              <div className="hero-sub-l">Track survey completion, pulse activity, and 360 engagement across all departments.</div>
            </div>

            <div className="grid-3 mb-24">
              {clientAssessments.length > 0 ? [
                { label: 'Survey Rate', value: `${Math.round(clientAssessments.reduce((sum, a) => sum + a.completion_rate, 0) / clientAssessments.length)}%`, color: '#1BBFB0' },
                { label: 'Always On Active', value: `${pulseStats.total}`, color: '#3A8FC4' },
                { label: '360 Completion', value: '—', color: '#C9B882' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-accent" style={{ background: s.color }} />
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value">{s.value}</div>
                </div>
              )) : [
                { label: 'Survey Rate', value: '—', color: '#1BBFB0' },
                { label: 'Always On Active', value: `${pulseStats.total}`, color: '#3A8FC4' },
                { label: '360 Completion', value: '—', color: '#C9B882' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-accent" style={{ background: s.color }} />
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value">{s.value}</div>
                </div>
              ))}
            </div>

            <div className="card mb-20">
              <div className="section-title mb-16" style={{ fontSize: 15 }}>Assessment Participation</div>
              <table>
                <thead>
                  <tr>
                    <th>Assessment</th>
                    <th>Invited</th>
                    <th>Responses</th>
                    <th>Completion</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clientAssessments.length > 0 ? clientAssessments.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>{a.name}</td>
                      <td>{a.total_invited}</td>
                      <td>{a.total_responses}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="dim-bar-bg" style={{ width: 60 }}>
                            <div className={`dim-bar ${a.completion_rate > 75 ? 'bar-teal' : a.completion_rate > 50 ? 'bar-gold' : 'bar-coral'}`} style={{ width: `${a.completion_rate}%` }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{a.completion_rate}%</span>
                        </div>
                      </td>
                      <td>
                        {a.status === 'complete' || a.status === 'completed' ? <span className="tag tag-complete">✓ On Track</span>
                          : a.status === 'active' || a.status === 'live' ? <span className="tag tag-active">● Active</span>
                          : <span className="tag tag-review">⚠ {a.status}</span>}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)', fontSize: 13 }}>No assessments found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            LIFECYCLE CONFIG VIEW (hc only)
        ════════════════════════════════════════════════ */}
        {activeView === 'lifecycle' && (
          <div>
            <div className="hero-light">
              <div className="hero-title-l">Lifecycle Listening Configuration</div>
              <div className="hero-sub-l">Manage automated surveys triggered at key employee journey moments.</div>
            </div>

            <div className="grid-3">
              {[
                { icon: '🎉', title: 'Onboarding (Day 30)', desc: 'Automatically triggered 30 days after start date. Captures first impressions and onboarding experience.', status: 'active', n: 23, statusColor: '#0A8A7E', statusBg: '#D1FAE5' },
                { icon: '📅', title: '6-Month & Anniversary', desc: 'Triggered at 6 months, 1 year, and annually. Tracks sentiment evolution over time.', status: 'active', n: 41, statusColor: '#0A8A7E', statusBg: '#D1FAE5' },
                { icon: '⭐', title: 'Post-Promotion', desc: 'Triggered 60 days after a role change or promotion. Captures transition experience.', status: 'active', n: 8, statusColor: '#0A8A7E', statusBg: '#D1FAE5' },
                { icon: '🔄', title: 'Post-Restructuring', desc: 'Activated for employees affected by an organisational restructure. Tracks integration and morale.', status: 'active', n: 156, statusColor: '#0A8A7E', statusBg: '#D1FAE5' },
                { icon: '🌿', title: 'Return from Leave', desc: 'Triggered on return from parental, medical, or extended leave. Supports reintegration.', status: 'active', n: 12, statusColor: '#0A8A7E', statusBg: '#D1FAE5' },
                { icon: '👋', title: 'Exit Interview', desc: 'Triggered upon resignation or offboarding. Captures genuine departure feedback for culture improvement.', status: 'active', n: 6, statusColor: '#0A8A7E', statusBg: '#D1FAE5' },
              ].map(card => (
                <div key={card.title} className="lifecycle-card">
                  <div className="lc-icon">{card.icon}</div>
                  <div className="lc-title">{card.title}</div>
                  <div className="lc-desc">{card.desc}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <span className="lc-status" style={{ background: card.statusBg, color: card.statusColor }}>● Active</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>{card.n} recipients</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            GOVERNANCE VIEW (hc/exec)
        ════════════════════════════════════════════════ */}
        {activeView === 'governance' && (
          <div>
            <div className="hero-dark">
              <div className="hero-title-d">Governance & Data Ethics</div>
              <div className="hero-sub-d">Full transparency on how CultureXe handles employee data, privacy, and access controls.</div>
            </div>

            <div className="grid-2 mb-24">
              {/* Anonymity Thresholds */}
              <div className="gov-card">
                <div className="gov-head">🔒 Anonymity Thresholds</div>
                <div className="gov-body">
                  <div className="gov-item"><span className="gov-check">✓</span><div>Individual responses never surfaced to any user — including HR and Executive.</div></div>
                  <div className="gov-item"><span className="gov-check">✓</span><div>Results only reported in groups of <strong>5 or more respondents</strong>.</div></div>
                  <div className="gov-item"><span className="gov-check">✓</span><div>Open-text responses paraphrased by AI before inclusion in reports.</div></div>
                  <div className="gov-item"><span className="gov-check">✓</span><div>Department breakdowns suppressed if n &lt; 5 to prevent reverse-engineering.</div></div>
                </div>
              </div>

              {/* Data Retention */}
              <div className="gov-card">
                <div className="gov-head">🗄 Data Retention Policy</div>
                <div className="gov-body">
                  <div className="gov-item"><span className="gov-check">✓</span><div>Survey response data retained for <strong>3 years</strong> from collection date.</div></div>
                  <div className="gov-item"><span className="gov-check">✓</span><div>Always On Pulse submissions retained for <strong>18 months</strong>.</div></div>
                  <div className="gov-item"><span className="gov-check">✓</span><div>Deleted employee data purged from all systems within <strong>30 days</strong> of departure.</div></div>
                  <div className="gov-item"><span className="gov-check">✓</span><div>Full data export available to organisation on contract termination.</div></div>
                </div>
              </div>

              {/* Access Controls */}
              <div className="gov-card">
                <div className="gov-head">🔑 Access Controls</div>
                <div className="gov-body">
                  <div className="gov-item"><span className="gov-check">✓</span><div><strong>Staff:</strong> Can submit responses and view YSWH summaries only.</div></div>
                  <div className="gov-item"><span className="gov-check">✓</span><div><strong>Manager:</strong> Can view anonymised team-level summaries (min. n=5).</div></div>
                  <div className="gov-item"><span className="gov-check">✓</span><div><strong>Executive:</strong> Can view department and organisation-level reports.</div></div>
                  <div className="gov-item"><span className="gov-check">✓</span><div><strong>HR / Culture Lead:</strong> Can view all aggregate reports and configure lifecycle triggers.</div></div>
                  <div className="gov-item"><span className="gov-check">✓</span><div><strong>AIA Consultant:</strong> Can view all data and generate AI insights. Cannot see individual responses.</div></div>
                </div>
              </div>

              {/* Ethical Framework */}
              <div className="gov-card">
                <div className="gov-head">⚖ Ethical Framework</div>
                <div className="gov-body">
                  <div className="gov-item"><span className="gov-check">✓</span><div>POPIA (Protection of Personal Information Act) compliant.</div></div>
                  <div className="gov-item"><span className="gov-check">✓</span><div>GDPR standards applied to all data processing activities.</div></div>
                  <div className="gov-item"><span className="gov-check">✓</span><div>AI insights reviewed by human AIA consultants before delivery to clients.</div></div>
                  <div className="gov-item"><span className="gov-check">✓</span><div>No data sold to, or shared with, any third party under any circumstances.</div></div>
                  <div className="gov-item"><span className="gov-check">✓</span><div>Annual data ethics audit conducted by independent auditor.</div></div>
                </div>
              </div>
            </div>

            {/* Access Audit Log */}
            <div className="card">
              <div className="section-title mb-16" style={{ fontSize: 15 }}>Access Audit Log</div>
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>Timestamp</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { user: displayName, role: demoRole.toUpperCase(), action: 'Viewed Org Diagnostics Report', time: new Date().toLocaleString('en-ZA'), status: 'normal' },
                    { user: 'System', role: 'Automated', action: 'Lifecycle trigger: Onboarding survey sent', time: new Date(Date.now() - 86400000).toLocaleString('en-ZA'), status: 'automated' },
                  ].map((row, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{row.user}</td>
                      <td><span className="badge badge-slate">{row.role}</span></td>
                      <td style={{ color: 'var(--text2)' }}>{row.action}</td>
                      <td style={{ color: 'var(--text3)', fontSize: 12 }}>{row.time}</td>
                      <td>{row.status === 'automated' ? <span className="tag tag-pending">Automated</span> : <span className="tag tag-complete">Normal</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
