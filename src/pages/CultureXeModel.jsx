import { useState } from 'react'
import { dimensions } from '../data/dimensions'
import { questions } from '../data/questions'

export default function CultureXeModel() {
  const [activeId, setActiveId] = useState(null)

  const activeDim = dimensions.find(d => d.id === activeId)
  const dimQuestions = activeId ? questions.filter(q => q.dimension === activeId) : []

  return (
    <div className="content">
      <div className="page-hero">
        <div className="hero-title">The CultureXe Model</div>
        <div className="hero-sub">
          Eight evidence-based culture dimensions that together paint a complete picture of organisational health.
          Developed by Africa International Advisors for the African corporate context.
        </div>
      </div>

      <div className="ai-panel mb-28">
        <div className="ai-panel-brain fluid-breathe">
          <svg width="52" height="52" viewBox="0 0 100 100" fill="none">
            <defs>
              <radialGradient id="cm1" cx="30%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#C9E8A0" />
                <stop offset="40%" stopColor="#5BBFB0" />
                <stop offset="100%" stopColor="#1A6BAA" />
              </radialGradient>
              <radialGradient id="cm2" cx="70%" cy="65%" r="65%">
                <stop offset="0%" stopColor="#E8D890" />
                <stop offset="40%" stopColor="#5AB0D0" />
                <stop offset="100%" stopColor="#1BBFB0" />
              </radialGradient>
            </defs>
            <path d="M50 50 C50 50 20 35 18 20 C16 5 30 2 40 10 C50 18 50 50 50 50Z" fill="url(#cm1)" opacity="0.92" />
            <path d="M50 50 C50 50 15 55 12 70 C9 85 22 92 35 85 C48 78 50 50 50 50Z" fill="url(#cm1)" opacity="0.75" />
            <path d="M50 50 C50 50 80 35 82 20 C84 5 70 2 60 10 C50 18 50 50 50 50Z" fill="url(#cm2)" opacity="0.88" />
            <path d="M50 50 C50 50 85 55 88 70 C91 85 78 92 65 85 C52 78 50 50 50 50Z" fill="url(#cm2)" opacity="0.72" />
            <circle cx="50" cy="50" r="7" fill="white" opacity="0.36" />
          </svg>
        </div>
        <div className="ai-panel-text">
          <div className="ai-panel-title">About the Model</div>
          <div className="ai-panel-desc">
            The CultureXe Model is built on organisational psychology research contextualised for African markets.
            Each dimension is measured using 5 validated questions on a Likert scale, producing a score from 0–100.
            Composite scores generate an overall Culture Health Index (CHI) for benchmarking and longitudinal tracking.
          </div>
        </div>
      </div>

      <div className="grid-2 mb-28" style={{ gridTemplateColumns: activeId ? '1fr 380px' : '1fr' }}>
        <div className={activeId ? 'grid-2' : 'grid-4'} style={{ gap: 16, alignContent: 'start' }}>
          {dimensions.map((dim, idx) => (
            <button
              key={dim.id}
              onClick={() => setActiveId(activeId === dim.id ? null : dim.id)}
              style={{
                background: activeId === dim.id ? 'var(--navy)' : 'white',
                border: `1.5px solid ${activeId === dim.id ? 'var(--navy)' : 'var(--border)'}`,
                borderRadius: 16,
                padding: '20px 20px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: activeId === dim.id ? '0 4px 20px rgba(13,31,60,0.18)' : '0 2px 8px rgba(13,31,60,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{
                  fontSize: 22,
                  background: activeId === dim.id ? 'rgba(255,255,255,0.12)' : 'var(--teal-light)',
                  width: 42, height: 42,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 10,
                }}>
                  {dim.icon}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 500,
                  color: activeId === dim.id ? 'rgba(255,255,255,0.4)' : 'var(--text3)',
                  textTransform: 'uppercase', letterSpacing: '1.5px',
                }}>
                  Dimension {idx + 1}
                </span>
              </div>
              <div style={{
                fontWeight: 700, fontSize: 14,
                color: activeId === dim.id ? 'white' : 'var(--navy)',
                marginBottom: 8, lineHeight: 1.3,
              }}>
                {dim.name}
              </div>
              <div style={{
                fontSize: 12.5, lineHeight: 1.65,
                color: activeId === dim.id ? 'rgba(255,255,255,0.55)' : 'var(--text2)',
              }}>
                {dim.description}
              </div>
            </button>
          ))}
        </div>

        {activeId && activeDim && (
          <div className="card" style={{ position: 'sticky', top: 82, alignSelf: 'start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{
                fontSize: 28, background: 'var(--teal-light)',
                width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 12,
              }}>
                {activeDim.icon}
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--navy)' }}>{activeDim.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>5 survey questions</div>
              </div>
            </div>

            <div className="insight" style={{ marginBottom: 12 }}>
              <div className="insight-title">When strong</div>
              <div className="insight-text">{activeDim.strength}</div>
            </div>
            <div className="insight warn" style={{ marginBottom: 20 }}>
              <div className="insight-title">Development signal</div>
              <div className="insight-text">{activeDim.development}</div>
            </div>

            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy)', marginBottom: 12 }}>
              Survey Questions
            </div>
            {dimQuestions.map((q, i) => (
              <div key={q.id} style={{
                padding: '12px 14px', background: 'var(--bg)',
                borderRadius: 9, marginBottom: 8,
                fontSize: 13, color: 'var(--text)', lineHeight: 1.6,
              }}>
                <span style={{ fontWeight: 700, color: 'var(--teal)', marginRight: 6 }}>{i + 1}.</span>
                {q.text}
              </div>
            ))}
            <button
              className="btn btn-outline btn-sm"
              style={{ marginTop: 8 }}
              onClick={() => setActiveId(null)}
            >
              Close ✕
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex-between mb-16">
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>Scoring & Interpretation</div>
        </div>
        <div className="grid-4">
          {[
            { range: '75–100', label: 'Strong', color: 'var(--teal)', desc: 'Culture is a competitive advantage. Focus on sustaining and amplifying.' },
            { range: '60–74', label: 'Good', color: 'var(--blue)', desc: 'Solid foundation with room to grow. Target specific friction points.' },
            { range: '45–59', label: 'Developing', color: 'var(--gold2)', desc: 'Notable gaps present. Structured interventions are recommended.' },
            { range: '0–44', label: 'At Risk', color: 'var(--coral)', desc: 'Urgent attention required. Culture may be actively harming performance.' },
          ].map(band => (
            <div key={band.range} style={{
              padding: '18px', borderRadius: 12,
              border: `1.5px solid ${band.color}22`,
              background: `${band.color}0A`,
            }}>
              <div style={{ fontWeight: 800, fontSize: 22, color: band.color, marginBottom: 4 }}>{band.range}</div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy)', marginBottom: 6 }}>{band.label}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.6 }}>{band.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
