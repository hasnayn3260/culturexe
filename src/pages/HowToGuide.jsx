import { Link } from 'react-router-dom'

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

function StepMockup({ step }) {
  if (step === 1) {
    return (
      <div style={{
        background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12,
        padding: '20px 24px', fontFamily: 'monospace', fontSize: 13,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#FF5F56', '#FFBD2E', '#27C93F'].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <div style={{
            flex: 1, background: 'white', border: '1px solid #D1D9E3', borderRadius: 6,
            padding: '4px 10px', fontSize: 11.5, color: '#4A6380',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            🔒 culturexe.aia.africa
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0' }}>
          <FluidSVG size={32} id="mock-nav" />
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, color: '#0D1F3C' }}>
            Culture<span style={{ color: '#1BBFB0' }}>Xe</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{
            background: '#1BBFB0', color: 'white', borderRadius: 8,
            padding: '5px 14px', fontSize: 12, fontWeight: 600,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            Login →
          </div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #0D1F3C, #0E3462)', borderRadius: 8, padding: '18px 16px', marginTop: 8 }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 6, letterSpacing: 1 }}>AFRICA'S CULTURE INTELLIGENCE PLATFORM</div>
          <div style={{ color: 'white', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13 }}>Understand your culture.</div>
          <div style={{ color: '#1BBFB0', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13 }}>Transform your organisation.</div>
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div style={{
        background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12,
        padding: '20px 24px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <FluidSVG size={36} id="mock-login" />
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, color: '#0D1F3C', marginTop: 6 }}>
            Welcome back
          </div>
          <div style={{ fontSize: 12, color: '#8A9BB0', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 2 }}>Sign in to CultureXe</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            background: 'white', border: '1.5px solid #D1D9E3', borderRadius: 8,
            padding: '9px 12px', fontSize: 12, color: '#8A9BB0',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            Email address
          </div>
          <div style={{
            background: 'white', border: '1.5px solid #D1D9E3', borderRadius: 8,
            padding: '9px 12px', fontSize: 12, color: '#8A9BB0',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            Password
          </div>
          <div style={{
            background: '#1BBFB0', color: 'white', borderRadius: 8,
            padding: '10px', textAlign: 'center', fontSize: 13, fontWeight: 600,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            Sign In →
          </div>
          <div style={{ textAlign: 'center', fontSize: 12, color: '#4A6380', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Don't have an account?{' '}
            <span style={{ color: '#1BBFB0', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>
              Sign Up
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (step === 3) {
    return (
      <div style={{
        background: 'white', border: '1px solid #E8EDF2', borderRadius: 16,
        padding: '28px 28px 24px',
        boxShadow: '0 2px 16px rgba(13,31,60,0.07)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 18, color: '#0D1F3C', marginBottom: 4 }}>
            Create your account
          </div>
          <div style={{ fontSize: 13, color: '#8A9BB0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Join CultureXe</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#4A6380', marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Position <span style={{ color: '#E05C3A' }}>*</span>
              </div>
              <div style={{
                background: 'white', border: '1.5px solid #D1D9E3', borderRadius: 10,
                padding: '11px 14px', fontSize: 13.5, color: '#B0BAC8',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                width: '100%', boxSizing: 'border-box',
              }}>
                <span>Select position...</span>
                <span style={{ color: '#4A6380', fontSize: 11 }}>▼</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#4A6380', marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Job Title <span style={{ color: '#E05C3A' }}>*</span>
              </div>
              <div style={{
                background: 'white', border: '1.5px solid #D1D9E3', borderRadius: 10,
                padding: '11px 14px', fontSize: 13.5, color: '#B0BAC8',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                width: '100%', boxSizing: 'border-box',
              }}>
                e.g. Finance Lead
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 4) {
    return (
      <div style={{
        background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12,
        padding: '20px 24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: '#0D1F3C' }}>DBN Culture Survey</div>
          <div style={{
            background: '#E0F7F5', color: '#0A8A7E', fontSize: 10, fontWeight: 600,
            borderRadius: 20, padding: '3px 10px', fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            5 of 47 answered
          </div>
        </div>
        <div style={{ background: '#E2E8F0', borderRadius: 4, height: 4, marginBottom: 14 }}>
          <div style={{ background: '#1BBFB0', borderRadius: 4, height: 4, width: '10%' }} />
        </div>
        <div style={{ fontSize: 12.5, color: '#0D1F3C', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, marginBottom: 12, lineHeight: 1.5 }}>
          In my organisation, leaders clearly communicate the strategic goals and direction.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree'].map((opt, i) => (
            <div key={opt} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: i === 1 ? '#E0F7F5' : 'white',
              border: `1.5px solid ${i === 1 ? '#1BBFB0' : '#E2E8F0'}`,
              borderRadius: 8, padding: '7px 12px', cursor: 'pointer',
            }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${i === 1 ? '#1BBFB0' : '#D1D9E3'}`,
                background: i === 1 ? '#1BBFB0' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {i === 1 && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'white' }} />}
              </div>
              <span style={{ fontSize: 11.5, color: '#0D1F3C', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{opt}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}

const steps = [
  {
    num: '01',
    title: 'Open the CultureXe website',
    desc: 'On your browser, go to: culturexe.aia.africa',
    detail: 'You can use any device — desktop, tablet, or mobile. The platform is fully optimised for all screen sizes.',
    color: '#1BBFB0',
    bg: 'linear-gradient(135deg, #E0F7F5 0%, #EEF9F8 100%)',
  },
  {
    num: '02',
    title: "Click 'Login' then choose 'Sign Up'",
    desc: "On the homepage, click the Login button in the top-right corner. Then select 'Sign Up' at the bottom of the login form.",
    detail: 'You will only need to do this once. After creating your account, simply log in each time you return.',
    color: '#3A8FC4',
    bg: 'linear-gradient(135deg, #EAF4FB 0%, #EEF7FC 100%)',
  },
  {
    num: '03',
    title: 'Create your account',
    desc: 'Use your work email address. For the Location / Role field, select "Client / Survey Accepted". Then create a password.',
    detail: 'Your work email is required to verify that you are a DBN employee. Your personal responses will never be linked to your email.',
    color: '#C9B882',
    bg: 'linear-gradient(135deg, #FAF6EC 0%, #FEFBF2 100%)',
  },
  {
    num: '04',
    title: 'Complete the DBN culture survey',
    desc: 'Once logged in, your survey will appear automatically. The survey takes 8–10 minutes and covers 12 culture dimensions.',
    detail: 'You can pause and return at any time — your progress is saved. Please try to complete it in one sitting for the best experience.',
    color: '#8A7BC4',
    bg: 'linear-gradient(135deg, #F0EEF9 0%, #F5F4FC 100%)',
  },
]

export default function HowToGuide() {
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", overflowX: 'hidden', background: 'white' }}>

      <style>{`
        @media (max-width: 768px) {
          .htg-hero-title { font-size: 28px !important; }
          .htg-step-grid  { grid-template-columns: 1fr !important; }
          .htg-section    { padding: 60px 20px !important; }
          .htg-nav        { padding: 0 20px !important; }
        }
      `}</style>

      {/* NAVBAR */}
      <nav className="htg-nav" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: 'white', boxShadow: '0 1px 0 rgba(13,31,60,0.06)',
        height: 66, display: 'flex', alignItems: 'center',
        padding: '0 48px', justifyContent: 'space-between',
      }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="fluid-breathe">
            <FluidSVG size={36} id="htg-nav" />
          </div>
          <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.3px', lineHeight: 1 }}>
            <span style={{ color: '#0D1F3C' }}>Culture</span>
            <span style={{ color: '#1BBFB0' }}>Xe</span>
          </div>
          <div style={{ width: 1, height: 32, background: 'rgba(13,31,60,0.12)' }} />
          <img src="/aia_logo.svg" alt="Africa International Advisors" style={{ height: 30 }} />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{ fontSize: 13.5, color: '#4A6380', textDecoration: 'none', fontWeight: 500 }}>← Back to Home</Link>
          <Link to="/login" className="btn btn-teal btn-sm">Login →</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        paddingTop: 66,
        background: 'linear-gradient(145deg, #0D1F3C 0%, #112444 35%, #0E3462 70%, #0A2A52 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '10%', right: '5%', width: 340, height: 340, background: 'radial-gradient(circle, rgba(27,191,176,0.09) 0%, transparent 68%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 800, margin: '0 auto', padding: '72px 48px 80px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(27,191,176,0.12)', border: '1px solid rgba(27,191,176,0.25)',
            borderRadius: 20, padding: '6px 16px', marginBottom: 32,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1BBFB0', display: 'inline-block' }} />
            <span style={{ color: '#1BBFB0', fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              A Message to All DBN Employees
            </span>
          </div>

          <h1 className="htg-hero-title" style={{
            fontSize: 44, fontWeight: 800, color: 'white',
            lineHeight: 1.12, letterSpacing: '-1px', marginBottom: 24,
          }}>
            Help us understand the culture<br />
            <span style={{ background: 'linear-gradient(90deg, #1BBFB0 0%, #5AADD4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              we are building together
            </span>
          </h1>

          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.62)', lineHeight: 1.82, maxWidth: 600, margin: '0 auto 36px' }}>
            Africa International Advisors has partnered with the Development Bank of Namibia
            to conduct a confidential culture assessment. Your honest input will help shape
            a stronger, healthier workplace for everyone at DBN.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            {[
              { icon: '🔒', label: '100% Confidential' },
              { icon: '◎', label: 'Anonymous Responses' },
              { icon: '⏱', label: '8–10 Minutes' },
            ].map(b => (
              <div key={b.label} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 24, padding: '8px 16px',
              }}>
                <span style={{ fontSize: 14 }}>{b.icon}</span>
                <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.72)', fontWeight: 500 }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY YOUR VOICE MATTERS */}
      <section className="htg-section" style={{ background: '#EEF5F9', padding: '88px 48px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{
              display: 'inline-block', background: 'rgba(27,191,176,0.10)',
              border: '1px solid rgba(27,191,176,0.20)', borderRadius: 20,
              padding: '5px 13px', marginBottom: 18,
              fontSize: 11, fontWeight: 600, color: '#0A8A7E', letterSpacing: '1.5px', textTransform: 'uppercase',
            }}>
              Why It Matters
            </div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: '#0D1F3C', letterSpacing: '-0.5px', marginBottom: 14 }}>
              Why your voice matters
            </h2>
            <p style={{ fontSize: 15.5, color: '#4A6380', lineHeight: 1.82, maxWidth: 600, margin: '0 auto' }}>
              Culture is not what an organisation says it is — it is what employees experience every day.
              The only way to understand and improve it is to hear directly from the people who live it.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              {
                icon: '👁',
                title: 'Evidence-Based Decisions',
                desc: 'Leadership uses your responses — aggregated and anonymised — to make decisions grounded in reality, not assumptions.',
                color: '#1BBFB0',
              },
              {
                icon: '🛡',
                title: 'Fully Anonymous',
                desc: 'Individual responses are never visible to anyone at DBN. Only aggregated group data is reported — so please be honest.',
                color: '#3A8FC4',
              },
              {
                icon: '★',
                title: 'Real Impact',
                desc: 'Past CultureXe assessments have directly shaped leadership programmes, team restructures, and policy changes across client organisations.',
                color: '#C9B882',
              },
            ].map(f => (
              <div key={f.title} style={{
                background: 'white', borderRadius: 16, border: '1px solid #E2E8F0',
                padding: '28px 24px', boxShadow: '0 2px 12px rgba(13,31,60,0.05)',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                  background: `${f.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, marginBottom: 18,
                }}>
                  {f.icon}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0D1F3C', marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13.5, color: '#4A6380', lineHeight: 1.72 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW TO GET STARTED */}
      <section className="htg-section" style={{ background: 'white', padding: '88px 48px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{
              display: 'inline-block', background: 'rgba(27,191,176,0.08)',
              border: '1px solid rgba(27,191,176,0.18)', borderRadius: 20,
              padding: '5px 13px', marginBottom: 18,
              fontSize: 11, fontWeight: 600, color: '#0A8A7E', letterSpacing: '1.5px', textTransform: 'uppercase',
            }}>
              Step-by-Step
            </div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: '#0D1F3C', letterSpacing: '-0.5px', marginBottom: 14 }}>
              How to get started
            </h2>
            <p style={{ fontSize: 15.5, color: '#4A6380', maxWidth: 480, margin: '0 auto', lineHeight: 1.75 }}>
              Follow these four steps to access and complete your culture survey.
              It only takes a few minutes to set up.
            </p>
          </div>

          <div className="htg-step-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            {steps.map((step, idx) => (
              <div key={step.num} style={{
                background: step.bg,
                border: '1px solid rgba(13,31,60,0.06)',
                borderRadius: 20, overflow: 'hidden',
                boxShadow: '0 4px 24px rgba(13,31,60,0.06)',
              }}>
                <div style={{ padding: '32px 32px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: `${step.color}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 900, color: step.color,
                      letterSpacing: '-0.5px',
                    }}>
                      {step.num}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: '#0D1F3C', lineHeight: 1.3 }}>{step.title}</div>
                  </div>
                  <p style={{ fontSize: 14, color: '#0D1F3C', lineHeight: 1.72, marginBottom: 10, fontWeight: 500 }}>{step.desc}</p>
                  <p style={{ fontSize: 13, color: '#4A6380', lineHeight: 1.72 }}>{step.detail}</p>
                </div>
                <div style={{ padding: '0 24px 24px' }}>
                  <StepMockup step={idx + 1} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONFIDENTIALITY NOTICE */}
      <section style={{
        background: 'linear-gradient(145deg, #0D1F3C 0%, #122849 50%, #0E3462 100%)',
        padding: '72px 48px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(27,191,176,0.07) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 36, flexWrap: 'wrap' }}>
            {['🔒 Confidential', '◎ Secure', '👁 Anonymous'].map(b => (
              <div key={b} style={{
                background: 'rgba(27,191,176,0.12)', border: '1px solid rgba(27,191,176,0.25)',
                borderRadius: 24, padding: '8px 18px',
                fontSize: 12.5, fontWeight: 600, color: '#1BBFB0', letterSpacing: '0.5px',
              }}>
                {b}
              </div>
            ))}
          </div>
          <h2 style={{ fontSize: 30, fontWeight: 800, color: 'white', letterSpacing: '-0.5px', marginBottom: 16 }}>
            Your privacy is protected
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.58)', lineHeight: 1.82, marginBottom: 40, maxWidth: 520, margin: '0 auto 40px' }}>
            All responses are aggregated — individual answers are never visible to DBN leadership or
            any other employee. Africa International Advisors maintains strict confidentiality protocols
            across all assessments.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Link to="/signup" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#1BBFB0', color: 'white',
              padding: '14px 32px', borderRadius: 11,
              fontWeight: 700, fontSize: 14.5, textDecoration: 'none',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              Start the Survey →
            </Link>
            <Link to="/" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.72)',
              border: '1px solid rgba(255,255,255,0.14)',
              padding: '14px 32px', borderRadius: 11,
              fontWeight: 600, fontSize: 14.5, textDecoration: 'none',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              ← Back to Home
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#060F1E', padding: '32px 48px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FluidSVG size={24} id="htg-foot" />
            <span style={{ fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
              Culture<span style={{ color: '#1BBFB0' }}>Xe</span>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 6px' }}>·</span>
            <img src="/aia_logo.svg" alt="Africa International Advisors" style={{ height: 22, filter: 'brightness(0) invert(0.4)' }} />
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)' }}>
            © 2026 CultureXe · Africa International Advisors · All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
