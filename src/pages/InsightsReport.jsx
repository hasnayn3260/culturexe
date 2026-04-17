import { useState } from 'react'
import { dimensions } from '../data/dimensions'

const clientList = ['Stanbic Bank Ghana', 'MTN Nigeria', 'Ecobank Group', 'Safaricom Kenya', 'Access Bank PLC']
const assessmentList = ['Q1 Culture Pulse', 'Annual Culture Survey', 'Leadership Effectiveness']

const reportData = {
  'Stanbic Bank Ghana': {
    scores: { purpose: 76, leadership: 62, innovation: 69, collaboration: 81, accountability: 57, inclusion: 72, learning: 65, customer: 74 },
    responses: 184, total: 210, date: 'Apr 12–26, 2026',
    strengths: ['Collaboration & Ubuntu', 'Purpose & Values', 'Customer & Community'],
    risks: ['Accountability & Performance', 'Leadership & Trust'],
    narrative: 'Stanbic Bank Ghana demonstrates a strong communal culture underpinned by genuine purpose alignment. Employees feel meaningfully connected to the organisational mission. The standout dimension is Collaboration & Ubuntu (81), reflecting the Ubuntu spirit embedded in team practices.',
    watchAreas: 'Accountability & Performance (57) and Leadership & Trust (62) present the most significant areas of concern. Qualitative responses indicate that feedback mechanisms are inconsistent and that mid-level management trust has declined over the past 12 months — a pattern often linked to post-restructuring environments.',
    benchmarkAvg: 70,
  },
  'MTN Nigeria': {
    scores: { purpose: 71, leadership: 68, innovation: 74, collaboration: 77, accountability: 65, inclusion: 70, learning: 73, customer: 80 },
    responses: 412, total: 500, date: 'Apr 8–30, 2026',
    strengths: ['Customer & Community', 'Collaboration & Ubuntu', 'Innovation & Agility'],
    risks: ['Accountability & Performance', 'Purpose & Values'],
    narrative: 'MTN Nigeria presents a commercially oriented culture with strong customer centricity (80) and innovation agility (74). The organisation\'s scale and market leadership appear to drive a performance-focused mindset, though this comes at the cost of meaning and purpose alignment for frontline staff.',
    watchAreas: 'Purpose & Values (71) and Accountability & Performance (65) need focused attention. The gap between executive-level purpose clarity and employee-level alignment is a recurring theme in open responses.',
    benchmarkAvg: 70,
  },
}

function scoreColor(score) {
  if (score >= 75) return 'var(--teal)'
  if (score >= 60) return 'var(--blue)'
  if (score >= 45) return 'var(--gold2)'
  return 'var(--coral)'
}

function scoreLabel(score) {
  if (score >= 75) return 'Strong'
  if (score >= 60) return 'Good'
  if (score >= 45) return 'Developing'
  return 'At Risk'
}

export default function InsightsReport() {
  const [selectedOrg, setSelectedOrg] = useState(clientList[0])
  const [selectedAssessment, setSelectedAssessment] = useState(assessmentList[0])

  const data = reportData[selectedOrg] || reportData['Stanbic Bank Ghana']
  const avgScore = Math.round(Object.values(data.scores).reduce((a, b) => a + b, 0) / Object.values(data.scores).length)
  const responseRate = Math.round((data.responses / data.total) * 100)

  return (
    <div className="content">
      <div className="page-hero">
        <div className="hero-title">Insights Report</div>
        <div className="hero-sub">Deep-dive culture analysis — select an organisation and assessment to explore results.</div>
      </div>

      <div className="flex gap-12 mb-28">
        <select className="form-input" style={{ maxWidth: 240 }} value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)}>
          {clientList.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="form-input" style={{ maxWidth: 260 }} value={selectedAssessment} onChange={e => setSelectedAssessment(e.target.value)}>
          {assessmentList.map(a => <option key={a}>{a}</option>)}
        </select>
        <button className="btn btn-outline btn-sm">Export PDF</button>
        <button className="btn btn-outline btn-sm">Share Report</button>
      </div>

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
          <div className="stat-value">{responseRate}%</div>
          <div className="stat-sub">{data.responses} of {data.total} employees</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--teal)' }} />
          <div className="stat-label">vs Benchmark</div>
          <div className="stat-value" style={{ color: avgScore >= data.benchmarkAvg ? 'var(--teal)' : 'var(--coral)' }}>
            {avgScore >= data.benchmarkAvg ? '+' : ''}{avgScore - data.benchmarkAvg}
          </div>
          <div className="stat-sub">Africa FS benchmark: {data.benchmarkAvg}</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--gold)' }} />
          <div className="stat-label">Period</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginTop: 10 }}>{data.date}</div>
          <div className="stat-sub">{selectedAssessment}</div>
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
          <div className="ai-panel-title">AI Narrative — {selectedOrg}</div>
          <div className="ai-panel-desc">{data.narrative}</div>
        </div>
      </div>

      <div className="grid-2 mb-28">
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 20 }}>Dimension Scores</div>
          {dimensions.map(dim => (
            <div key={dim.id} className="dim-item">
              <div className="dim-header">
                <span className="dim-name">{dim.icon} {dim.name}</span>
                <div className="flex gap-8" style={{ alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: scoreColor(data.scores[dim.id]), fontWeight: 500 }}>
                    {scoreLabel(data.scores[dim.id])}
                  </span>
                  <span className="dim-score" style={{ color: scoreColor(data.scores[dim.id]) }}>
                    {data.scores[dim.id]}
                  </span>
                </div>
              </div>
              <div className="dim-bar-bg">
                <div className={`dim-bar ${dim.barClass}`} style={{ width: `${data.scores[dim.id]}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="card mb-16">
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 16 }}>Key Strengths</div>
            {data.strengths.map(s => (
              <div key={s} className="insight">
                <div className="insight-title">✓ {s}</div>
                <div className="insight-text">
                  {dimensions.find(d => d.name === s)?.strength}
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 16 }}>Watch Areas</div>
            <div className="insight alert" style={{ marginBottom: 16 }}>
              <div className="insight-title">⚠ Priority Focus</div>
              <div className="insight-text">{data.watchAreas}</div>
            </div>
            {data.risks.map(r => (
              <div key={r} className="insight warn">
                <div className="insight-title">↓ {r}</div>
                <div className="insight-text">
                  {dimensions.find(d => d.name === r)?.development}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
