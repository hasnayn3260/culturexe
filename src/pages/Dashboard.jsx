import { dimensions } from '../data/dimensions'

const sampleScores = {
  purpose: 78, leadership: 65, innovation: 71, collaboration: 83,
  accountability: 59, inclusion: 74, learning: 68, customer: 77,
}

const recentAssessments = [
  { id: 1, org: 'Stanbic Bank Ghana', name: 'Q1 Culture Pulse', responses: 184, total: 210, status: 'live' },
  { id: 2, org: 'MTN Nigeria', name: 'Annual Culture Survey', responses: 412, total: 500, status: 'live' },
  { id: 3, org: 'Ecobank Group', name: 'Leadership Effectiveness', responses: 97, total: 97, status: 'complete' },
  { id: 4, org: 'Safaricom Kenya', name: 'DEI Pulse Check', responses: 240, total: 260, status: 'complete' },
  { id: 5, org: 'Access Bank PLC', name: 'Onboarding Culture Fit', responses: 12, total: 80, status: 'pending' },
]

const avgScore = Math.round(
  Object.values(sampleScores).reduce((a, b) => a + b, 0) / Object.values(sampleScores).length
)

function scoreColor(score) {
  if (score >= 75) return 'var(--teal)'
  if (score >= 60) return 'var(--blue)'
  if (score >= 45) return 'var(--gold2)'
  return 'var(--coral)'
}

export default function Dashboard() {
  return (
    <div className="content">
      <div className="page-hero">
        <div className="hero-title">Good morning, Azra ✦</div>
        <div className="hero-sub">Here's the CultureXe pulse across your active clients — updated today.</div>
      </div>

      <div className="grid-4 mb-28">
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--teal)' }} />
          <div className="stat-label">Active Clients</div>
          <div className="stat-value">12</div>
          <div className="stat-trend trend-up">↑ 2 added this month</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--blue)' }} />
          <div className="stat-label">Live Assessments</div>
          <div className="stat-value">7</div>
          <div className="stat-sub">3 closing this week</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--gold)' }} />
          <div className="stat-label">Avg Culture Score</div>
          <div className="stat-value" style={{ color: scoreColor(avgScore) }}>{avgScore}</div>
          <div className="stat-trend trend-up">↑ +4 pts vs last quarter</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--coral)' }} />
          <div className="stat-label">Responses This Week</div>
          <div className="stat-value">248</div>
          <div className="stat-sub">Across 4 active surveys</div>
        </div>
      </div>

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
            Across your active clients, <strong>Collaboration & Ubuntu</strong> scores highest at 83 — a strong foundation.
            Watch <strong>Accountability & Performance</strong> (59) and <strong>Leadership & Trust</strong> (65) — both signal
            potential retention risk if left unaddressed before Q2 closes.
          </div>
        </div>
        <button className="btn btn-ghost btn-sm">Full Analysis →</button>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="flex-between mb-16">
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>Dimension Overview</div>
            <span className="badge badge-teal">All Clients · Avg</span>
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

        <div className="card">
          <div className="flex-between mb-16">
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>Recent Assessments</div>
            <a href="/assessments" style={{ fontSize: 12, color: 'var(--teal)', textDecoration: 'none', fontWeight: 500 }}>
              View all →
            </a>
          </div>
          <table>
            <thead>
              <tr>
                <th>Organisation</th>
                <th>Responses</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentAssessments.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{a.org}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{a.name}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13 }}>{a.responses}/{a.total}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {Math.round((a.responses / a.total) * 100)}% rate
                    </div>
                  </td>
                  <td>
                    <span className={`tag tag-${a.status === 'live' ? 'active' : a.status === 'complete' ? 'complete' : 'pending'}`}>
                      {a.status === 'live' ? '● Live' : a.status === 'complete' ? '✓ Done' : '○ Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
