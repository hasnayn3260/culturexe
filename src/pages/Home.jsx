import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { dimensions } from '../data/dimensions'

function FluidSVG({ size = 100, id = 'fl' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id={`${id}-a`} cx="30%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#C9E8A0" />
          <stop offset="40%" stopColor="#5BBFB0" />
          <stop offset="100%" stopColor="#1A6BAA" />
        </radialGradient>
        <radialGradient id={`${id}-b`} cx="70%" cy="65%" r="65%">
          <stop offset="0%" stopColor="#E8D890" />
          <stop offset="40%" stopColor="#5AB0D0" />
          <stop offset="100%" stopColor="#1BBFB0" />
        </radialGradient>
      </defs>
      <path d="M50 50 C50 50 20 35 18 20 C16 5 30 2 40 10 C50 18 50 50 50 50Z" fill={`url(#${id}-a)`} opacity="0.92" />
      <path d="M50 50 C50 50 15 55 12 70 C9 85 22 92 35 85 C48 78 50 50 50 50Z" fill={`url(#${id}-a)`} opacity="0.75" />
      <path d="M50 50 C50 50 80 35 82 20 C84 5 70 2 60 10 C50 18 50 50 50 50Z" fill={`url(#${id}-b)`} opacity="0.88" />
      <path d="M50 50 C50 50 85 55 88 70 C91 85 78 92 65 85 C52 78 50 50 50 50Z" fill={`url(#${id}-b)`} opacity="0.72" />
      <circle cx="50" cy="50" r="7" fill="white" opacity="0.36" />
    </svg>
  )
}

const steps = [
  {
    num: '01', icon: '📋', title: 'Assess',
    desc: 'Deploy anonymous, mobile-friendly surveys to employees at any level. Multilingual support available for diverse workforces across African markets.',
    color: '#1BBFB0', bg: 'linear-gradient(135deg, #E0F7F5 0%, #EEF9F8 100%)',
  },
  {
    num: '02', icon: '◎', title: 'Analyse',
    desc: 'The CultureXe Intelligence Engine scores all 8 dimensions, surfaces patterns, and benchmarks results against the AIA Africa peer group.',
    color: '#3A8FC4', bg: 'linear-gradient(135deg, #EAF4FB 0%, #EEF7FC 100%)',
  },
  {
    num: '03', icon: '★', title: 'Act',
    desc: 'AIA Africa consultants deliver a full Insights Report with narrative analysis, risk flags, and a prioritised intervention roadmap.',
    color: '#C9B882', bg: 'linear-gradient(135deg, #FAF6EC 0%, #FEFBF2 100%)',
  },
]

const audiences = [
  {
    icon: '◉', role: 'Consultants',
    tagline: 'Deploy and manage culture assessments across your entire client portfolio from one platform.',
    features: ['Multi-client dashboard', 'AI-assisted narrative', 'Branded PDF reports', 'Benchmark comparisons'],
    color: '#1BBFB0', bg: 'linear-gradient(135deg, #E0F7F5 0%, #EEF9F8 100%)',
  },
  {
    icon: '🏢', role: 'Clients', featured: true,
    tagline: 'Access your organisation\'s culture insights and track cultural evolution over time.',
    features: ['Organisation-level scores', 'Historical tracking', 'Team-level breakdowns', 'Action planning tools'],
    color: '#3A8FC4', bg: 'linear-gradient(135deg, #EAF4FB 0%, #EEF7FC 100%)',
  },
  {
    icon: '◎', role: 'Employees',
    tagline: 'Share your honest experience anonymously and help shape the culture you work in.',
    features: ['100% anonymous', 'Mobile-friendly', '8–10 minute survey', 'Impact-driven purpose'],
    color: '#C9B882', bg: 'linear-gradient(135deg, #FAF6EC 0%, #FEFBF2 100%)',
  },
]

export default function Home() {
  const [scrolled, setScrolled]           = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close overlay on resize to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 768) setMobileMenuOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", overflowX: 'hidden', background: 'white' }}>

      {/* ── Responsive styles ── */}
      <style>{`
        .home-hamburger { display: none !important; }
        .home-mob-logo  { display: none !important; }
        @media (max-width: 1024px) {
          .home-hamburger    { display: flex !important; }
          .home-nav-links    { display: none !important; }
          .home-hero-grid    { grid-template-columns: 1fr !important; padding: 60px 32px 80px !important; }
          .home-hero-svg     { display: none !important; }
          .home-hero-stats   { gap: 24px !important; flex-wrap: wrap; }
          .home-steps-row    { flex-wrap: wrap; }
          .home-step-arrow   { display: none !important; }
          .home-dims-grid    { grid-template-columns: repeat(2, 1fr) !important; }
          .home-audience-grid{ grid-template-columns: repeat(2, 1fr) !important; }
          .home-aud-featured { transform: none !important; }
          .home-footer-top   { grid-template-columns: 1fr !important; gap: 40px !important; text-align: center; }
          .home-footer-right { text-align: center !important; align-items: center !important; }
          .home-footer-links { align-items: center !important; }
          .home-section      { padding: 80px 32px !important; }
        }
        @media (max-width: 768px) {
          .home-hero-grid    { padding: 40px 20px 80px !important; gap: 0 !important; }
          .home-hero-h1      { font-size: 28px !important; letter-spacing: -0.5px !important; }
          .home-hero-ctas    { flex-direction: column !important; }
          .home-hero-ctas > * { width: 100% !important; justify-content: center !important; text-align: center !important; box-sizing: border-box; }
          .home-stats-grid   { grid-template-columns: repeat(2, 1fr) !important; }
          .home-stat-sep     { display: none !important; }
          .home-stat-item    { padding: 16px 12px !important; }
          .home-features-grid{ grid-template-columns: 1fr !important; }
          .home-steps-row    { flex-direction: column !important; gap: 20px !important; }
          .home-audience-grid{ grid-template-columns: 1fr !important; }
          .home-footer-bottom{ flex-direction: column !important; gap: 12px !important; text-align: center; }
          .home-section      { padding: 60px 20px !important; }
          .home-mob-logo     { display: flex !important; }
        }
      `}</style>

      {/* ── Mobile overlay menu ── */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: '#0D1F3C',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 24px',
        }}>
          <button
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'absolute', top: 20, right: 20,
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.7)', fontSize: 28,
              cursor: 'pointer', lineHeight: 1,
            }}
          >
            ✕
          </button>
          <div className="fluid-breathe home-mob-logo" style={{ marginBottom: 24 }}>
            <FluidSVG size={72} id="mob-menu" />
          </div>
          <div style={{ fontWeight: 800, fontSize: 22, color: 'white', marginBottom: 44 }}>
            Culture<span style={{ color: '#1BBFB0' }}>Xe</span>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, marginBottom: 44 }}>
            {[
              { href: '#how-it-works', label: 'How It Works' },
              { href: '#the-model',    label: 'The Model' },
              { href: '#who-its-for',  label: "Who It's For" },
            ].map(link => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{ fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <Link
            to="/login"
            onClick={() => setMobileMenuOpen(false)}
            className="btn btn-teal"
            style={{ padding: '14px 40px', fontSize: 15 }}
          >
            Login →
          </Link>
        </div>
      )}

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <nav className="home-nav" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: 'white',
        boxShadow: scrolled ? '0 2px 20px rgba(13,31,60,0.10)' : '0 1px 0 rgba(13,31,60,0.06)',
        transition: 'box-shadow 0.25s',
        height: 66, display: 'flex', alignItems: 'center',
        padding: '0 48px', justifyContent: 'space-between',
      }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="fluid-breathe">
            <FluidSVG size={36} id="nav" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.3px', lineHeight: 1 }}>
              <span style={{ color: '#0D1F3C' }}>Culture</span>
              <span style={{ color: '#1BBFB0' }}>Xe</span>
            </div>
            <div style={{ fontSize: 9, color: 'rgba(13,31,60,0.35)', letterSpacing: '2.5px', textTransform: 'uppercase', marginTop: 3 }}>
              by AIA Africa
            </div>
          </div>
        </Link>

        {/* Desktop nav links */}
        <div className="home-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <a href="#how-it-works" style={{ fontSize: 13.5, color: '#4A6380', textDecoration: 'none', fontWeight: 500 }}>How It Works</a>
          <a href="#the-model"    style={{ fontSize: 13.5, color: '#4A6380', textDecoration: 'none', fontWeight: 500 }}>The Model</a>
          <a href="#who-its-for"  style={{ fontSize: 13.5, color: '#4A6380', textDecoration: 'none', fontWeight: 500 }}>Who It's For</a>
          <Link to="/login" className="btn btn-teal btn-sm">Login →</Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="home-hamburger"
          onClick={() => setMobileMenuOpen(true)}
          style={{
            alignItems: 'center', justifyContent: 'center',
            width: 40, height: 40, background: 'none',
            border: '1px solid rgba(13,31,60,0.12)', borderRadius: 8,
            cursor: 'pointer', fontSize: 20, color: '#0D1F3C',
          }}
        >
          ☰
        </button>
      </nav>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh',
        background: 'linear-gradient(145deg, #0D1F3C 0%, #112444 35%, #0E3462 70%, #0A2A52 100%)',
        display: 'flex', alignItems: 'center',
        paddingTop: 66, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '8%', left: '3%', width: 360, height: 360, background: 'radial-gradient(circle, rgba(27,191,176,0.07) 0%, transparent 68%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '12%', left: '18%', width: 240, height: 240, background: 'radial-gradient(circle, rgba(58,143,196,0.09) 0%, transparent 68%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div className="home-hero-grid" style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 48px', display: 'grid', gridTemplateColumns: '1fr 480px', gap: 60, alignItems: 'center', width: '100%' }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(27,191,176,0.12)', border: '1px solid rgba(27,191,176,0.25)',
              borderRadius: 20, padding: '6px 14px', marginBottom: 32,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1BBFB0', display: 'inline-block' }} />
              <span style={{ color: '#1BBFB0', fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                Now Live · Africa's Culture Intelligence Platform
              </span>
            </div>

            <h1 className="home-hero-h1" style={{ fontSize: 54, fontWeight: 800, lineHeight: 1.08, color: 'white', marginBottom: 24, letterSpacing: '-1.5px' }}>
              Understand your culture.<br />
              <span style={{ background: 'linear-gradient(90deg, #1BBFB0 0%, #5AADD4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Transform your organisation.
              </span>
            </h1>

            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.60)', lineHeight: 1.8, marginBottom: 44, maxWidth: 500 }}>
              CultureXe is Africa's most advanced organisational culture intelligence platform —
              built for consultants, designed for impact.
            </p>

            <div className="home-hero-ctas" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Link to="/login" className="btn btn-teal" style={{ padding: '14px 30px', fontSize: 15 }}>
                Get Started →
              </Link>
              <a href="#how-it-works" className="btn btn-ghost" style={{ padding: '14px 30px', fontSize: 15 }}>
                See How It Works
              </a>
            </div>

            <div className="home-hero-stats" style={{ marginTop: 52, display: 'flex', gap: 36 }}>
              {[
                { value: '14+', label: 'Active Clients' },
                { value: '1,800+', label: 'Responses Collected' },
                { value: '100%', label: 'Anonymous & Secure' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#1BBFB0', letterSpacing: '-0.5px' }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 3, fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="home-hero-svg" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
            <div style={{
              position: 'absolute', width: 380, height: 380,
              background: 'radial-gradient(circle, rgba(27,191,176,0.20) 0%, rgba(58,143,196,0.10) 45%, transparent 70%)',
              borderRadius: '50%', zIndex: 0,
            }} />
            <div className="fluid-spin" style={{ position: 'relative', zIndex: 1 }}>
              <FluidSVG size={320} id="hero" />
            </div>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '2px', textTransform: 'uppercase' }}>Scroll</div>
          <div style={{ width: 1, height: 44, background: 'linear-gradient(to bottom, rgba(255,255,255,0.25), transparent)' }} />
        </div>
      </section>

      {/* ── STATS BAR ──────────────────────────────────────── */}
      <section style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '36px 48px' }}>
        <div className="home-stats-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { value: '14+', label: 'Client Organisations', icon: '🏢' },
            { value: '1,800+', label: 'Responses Collected', icon: '📊' },
            { value: '8', label: 'Culture Dimensions', icon: '⬡' },
            { value: '31', label: 'Reports Released', icon: '📋' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="home-stat-item"
              style={{ textAlign: 'center', padding: '4px 24px', borderRight: i < 3 ? '1px solid #E2E8F0' : 'none' }}
            >
              <div style={{ fontSize: 36, fontWeight: 800, color: '#0D1F3C', letterSpacing: '-1.5px', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: 12.5, color: '#8A9BB0', marginTop: 8, fontWeight: 500 }}>{stat.icon} {stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHAT IS CULTUREXE ──────────────────────────────── */}
      <section className="home-section" style={{ background: '#EEF5F9', padding: '110px 48px' }}>
        <div className="home-features-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <div style={{
              display: 'inline-block', background: 'rgba(27,191,176,0.10)',
              border: '1px solid rgba(27,191,176,0.20)', borderRadius: 20,
              padding: '5px 13px', marginBottom: 22,
              fontSize: 11, fontWeight: 600, color: '#0A8A7E', letterSpacing: '1.5px', textTransform: 'uppercase',
            }}>
              Platform Overview
            </div>
            <h2 style={{ fontSize: 40, fontWeight: 800, color: '#0D1F3C', lineHeight: 1.12, marginBottom: 22, letterSpacing: '-0.5px' }}>
              A new intelligence for<br />organisational culture
            </h2>
            <p style={{ fontSize: 15.5, color: '#4A6380', lineHeight: 1.82, marginBottom: 20 }}>
              CultureXe combines a rigorously validated 8-dimension culture framework with AI-powered
              pattern recognition to give consultants and leaders an evidence-based view of how their
              organisation truly operates — beyond the org chart.
            </p>
            <p style={{ fontSize: 15.5, color: '#4A6380', lineHeight: 1.82 }}>
              Built by AIA Africa's organisational psychologists and culture practitioners, CultureXe
              is contextualised for the African corporate environment — where culture complexity and
              stakeholder diversity are unique and often underserved by global tools.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: '⬡', title: '8-Dimension Framework', color: '#1BBFB0', desc: 'A proprietary culture model covering Purpose, Leadership, Innovation, Collaboration, Accountability, Inclusion, Learning, and Customer orientation.' },
              { icon: '◎', title: 'AI-Powered Insights', color: '#3A8FC4', desc: 'Pattern recognition across hundreds of responses surfaces trends, risks, and opportunities your team might otherwise miss.' },
              { icon: '★', title: 'Consultant-Led', color: '#C9B882', desc: "AIA Africa's expertise is baked into every report — from interpretation frameworks to intervention recommendations." },
            ].map(f => (
              <div key={f.title} style={{
                background: 'white', borderRadius: 16, border: '1px solid #E2E8F0',
                padding: '22px 24px', display: 'flex', gap: 18, alignItems: 'flex-start',
                boxShadow: '0 2px 12px rgba(13,31,60,0.05)',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 13, flexShrink: 0,
                  background: `${f.color}18`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 22, color: f.color,
                }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0D1F3C', marginBottom: 7 }}>{f.title}</div>
                  <div style={{ fontSize: 13.5, color: '#4A6380', lineHeight: 1.68 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────── */}
      <section id="how-it-works" className="home-section" style={{ background: 'white', padding: '110px 48px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 70 }}>
            <div style={{
              display: 'inline-block', background: 'rgba(27,191,176,0.08)',
              border: '1px solid rgba(27,191,176,0.18)', borderRadius: 20,
              padding: '5px 13px', marginBottom: 18,
              fontSize: 11, fontWeight: 600, color: '#0A8A7E', letterSpacing: '1.5px', textTransform: 'uppercase',
            }}>
              The Process
            </div>
            <h2 style={{ fontSize: 40, fontWeight: 800, color: '#0D1F3C', letterSpacing: '-0.5px', marginBottom: 14 }}>
              Three steps to culture clarity
            </h2>
            <p style={{ fontSize: 15.5, color: '#4A6380', maxWidth: 480, margin: '0 auto', lineHeight: 1.75 }}>
              From first deployment to actionable insights — CultureXe moves fast without sacrificing depth.
            </p>
          </div>

          <div className="home-steps-row" style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
            {steps.map((step, idx) => (
              <div key={step.num} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{
                  flex: 1, background: step.bg, borderRadius: 20,
                  border: '1px solid rgba(13,31,60,0.06)',
                  boxShadow: '0 4px 24px rgba(13,31,60,0.06)',
                  padding: '40px 32px', textAlign: 'center',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', top: 14, right: 18,
                    fontSize: 52, fontWeight: 900, color: `${step.color}14`,
                    lineHeight: 1, userSelect: 'none',
                  }}>
                    {step.num}
                  </div>
                  <div style={{
                    width: 64, height: 64, borderRadius: 18,
                    background: `${step.color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, margin: '0 auto 20px',
                  }}>
                    {step.icon}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 22, color: '#0D1F3C', marginBottom: 14 }}>{step.title}</div>
                  <div style={{ fontSize: 14, color: '#4A6380', lineHeight: 1.75 }}>{step.desc}</div>
                </div>

                {idx < 2 && (
                  <div className="home-step-arrow" style={{ flexShrink: 0, padding: '0 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 36, height: 2, background: 'linear-gradient(90deg, #1BBFB0, #3A8FC4)', borderRadius: 2 }} />
                    <div style={{ width: 0, height: 0, borderLeft: '8px solid #3A8FC4', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', marginLeft: 4 }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE 8 DIMENSIONS ───────────────────────────────── */}
      <section id="the-model" className="home-section" style={{
        background: 'linear-gradient(145deg, #0D1F3C 0%, #122849 50%, #0E3462 100%)',
        padding: '110px 48px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500, background: 'radial-gradient(circle, rgba(27,191,176,0.09) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 400, height: 400, background: 'radial-gradient(circle, rgba(58,143,196,0.07) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'rgba(27,191,176,0.12)', border: '1px solid rgba(27,191,176,0.25)',
              borderRadius: 20, padding: '6px 14px', marginBottom: 18,
            }}>
              <div className="fluid-breathe">
                <FluidSVG size={18} id="dim-badge" />
              </div>
              <span style={{ color: '#1BBFB0', fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                Proprietary Framework
              </span>
            </div>
            <h2 style={{ fontSize: 40, fontWeight: 800, color: 'white', letterSpacing: '-0.5px', marginBottom: 14 }}>
              The CultureXe Model
            </h2>
            <p style={{ fontSize: 15.5, color: 'rgba(255,255,255,0.48)', maxWidth: 540, margin: '0 auto', lineHeight: 1.75 }}>
              Eight evidence-based dimensions that together map the full landscape of organisational
              culture — from purpose alignment to community impact.
            </p>
          </div>

          <div className="home-dims-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {dimensions.map((dim, idx) => (
              <DimCard key={dim.id} dim={dim} idx={idx} />
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ───────────────────────────────────── */}
      <section id="who-its-for" className="home-section" style={{ background: '#EEF5F9', padding: '110px 48px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{
              display: 'inline-block', background: 'rgba(27,191,176,0.08)',
              border: '1px solid rgba(27,191,176,0.18)', borderRadius: 20,
              padding: '5px 13px', marginBottom: 18,
              fontSize: 11, fontWeight: 600, color: '#0A8A7E', letterSpacing: '1.5px', textTransform: 'uppercase',
            }}>
              Who It's For
            </div>
            <h2 style={{ fontSize: 40, fontWeight: 800, color: '#0D1F3C', letterSpacing: '-0.5px', marginBottom: 14 }}>
              Built for every stakeholder
            </h2>
            <p style={{ fontSize: 15.5, color: '#4A6380', maxWidth: 460, margin: '0 auto', lineHeight: 1.75 }}>
              Whether you're advising, leading, or working — CultureXe gives you the insight you need.
            </p>
          </div>

          <div className="home-audience-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'start' }}>
            {audiences.map(card => (
              <AudienceCard key={card.role} card={card} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="home-section" style={{
        background: 'linear-gradient(135deg, #1BBFB0 0%, #3A8FC4 55%, #1A6BAA 100%)',
        padding: '110px 48px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 700, height: 700, background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div className="fluid-breathe" style={{ marginBottom: 32, display: 'inline-block' }}>
            <FluidSVG size={80} id="cta" />
          </div>
          <h2 style={{ fontSize: 44, fontWeight: 800, color: 'white', letterSpacing: '-0.8px', marginBottom: 18, lineHeight: 1.12 }}>
            Ready to transform your culture?
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.72)', lineHeight: 1.8, marginBottom: 44 }}>
            Join the growing number of African organisations using CultureXe to build
            healthier, higher-performing workplaces.
          </p>
          <Link to="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'white', color: '#0D1F3C',
            padding: '17px 38px', borderRadius: 13,
            fontWeight: 700, fontSize: 15.5, textDecoration: 'none',
            boxShadow: '0 8px 36px rgba(13,31,60,0.18)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            Get Started with CultureXe →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer style={{ background: '#0D1F3C', padding: '64px 48px 32px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="home-footer-top" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 60, marginBottom: 52, alignItems: 'start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div className="fluid-breathe">
                  <FluidSVG size={32} id="foot" />
                </div>
                <span style={{ fontWeight: 800, fontSize: 16, color: 'white' }}>
                  Culture<span style={{ color: '#1BBFB0' }}>Xe</span>
                </span>
              </div>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.36)', lineHeight: 1.75, maxWidth: 250 }}>
                Culture intelligence for Africa.<br />
                Built by AIA Africa — empowering consultants and organisations to understand and shape their culture.
              </div>
            </div>

            <div className="home-footer-links" style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
              {[
                { label: 'Home', to: '/' },
                { label: 'How It Works', href: '#how-it-works' },
                { label: 'The Model', href: '#the-model' },
                { label: "Who It's For", href: '#who-its-for' },
                { label: 'Login', to: '/login' },
              ].map(link => (
                link.to ? (
                  <Link key={link.label} to={link.to} style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.42)', textDecoration: 'none', fontWeight: 500 }}>
                    {link.label}
                  </Link>
                ) : (
                  <a key={link.label} href={link.href} style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.42)', textDecoration: 'none', fontWeight: 500 }}>
                    {link.label}
                  </a>
                )
              ))}
            </div>

            <div className="home-footer-right" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                background: 'rgba(27,191,176,0.10)', border: '1px solid rgba(27,191,176,0.22)',
                borderRadius: 12, padding: '12px 16px', marginBottom: 16,
              }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#1BBFB0' }}>AIA Africa</span>
                <span style={{ width: 1, height: 14, background: 'rgba(27,191,176,0.3)', display: 'inline-block' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>Consultant Portal</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.24)', lineHeight: 1.7 }}>
                Powering culture transformation<br />across African markets.
              </div>
            </div>
          </div>

          <div className="home-footer-bottom" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 26, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
              © 2026 CultureXe · AIA Africa · All rights reserved.
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              {['Privacy Policy', 'Terms of Service'].map(l => (
                <span key={l} style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', cursor: 'pointer' }}>{l}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function DimCard({ dim, idx }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(27,191,176,0.09)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${hovered ? 'rgba(27,191,176,0.28)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 16, padding: '24px 20px',
        transition: 'background 0.2s, border-color 0.2s',
        cursor: 'default',
      }}
    >
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 46, height: 46, borderRadius: 12,
        background: hovered ? 'rgba(27,191,176,0.22)' : 'rgba(27,191,176,0.14)',
        fontSize: 20, marginBottom: 14, transition: 'background 0.2s',
      }}>
        {dim.icon}
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#1BBFB0', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 7 }}>
        Dimension {String(idx + 1).padStart(2, '0')}
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, color: 'white', marginBottom: 9, lineHeight: 1.3 }}>
        {dim.name}
      </div>
      <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.44)', lineHeight: 1.65 }}>
        {dim.description}
      </div>
    </div>
  )
}

function AudienceCard({ card }) {
  return (
    <div
      className={card.featured ? 'home-aud-featured' : ''}
      style={{
        background: card.bg, borderRadius: 22,
        border: `1.5px solid ${card.color}28`,
        padding: '38px 32px',
        boxShadow: card.featured ? `0 12px 48px ${card.color}22` : '0 2px 16px rgba(13,31,60,0.05)',
        transform: card.featured ? 'translateY(-10px)' : 'none',
        position: 'relative',
      }}
    >
      {card.featured && (
        <div style={{
          position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
          background: '#3A8FC4', color: 'white',
          fontSize: 10, fontWeight: 700, padding: '4px 14px',
          borderRadius: 20, letterSpacing: '1.5px', textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          Most Popular
        </div>
      )}
      <div style={{
        width: 58, height: 58, borderRadius: 15,
        background: `${card.color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, marginBottom: 22, color: card.color,
      }}>
        {card.icon}
      </div>
      <div style={{ fontWeight: 800, fontSize: 23, color: '#0D1F3C', marginBottom: 12 }}>{card.role}</div>
      <div style={{ fontSize: 14.5, color: '#4A6380', lineHeight: 1.75, marginBottom: 26 }}>{card.tagline}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {card.features.map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: `${card.color}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: card.color, fontWeight: 700,
            }}>
              ✓
            </div>
            <span style={{ fontSize: 13.5, color: '#0D1F3C', fontWeight: 500 }}>{f}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
