import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const ROLE_REDIRECTS = {
  consultant: '/app/dashboard',
  client:     '/client/dashboard',
  employee:   '/assess',
}

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

export default function Login() {
  const navigate = useNavigate()
  const { user, role, loading: authLoading, signIn, signInWithMagicLink } = useAuth()

  const [tab, setTab]                 = useState('password')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')
  const [magicSent, setMagicSent]     = useState(false)

  // Redirect once role is known (handles both fresh login and returning sessions)
  useEffect(() => {
    if (!authLoading && user && role) {
      navigate(ROLE_REDIRECTS[role] || '/login', { replace: true })
    }
  }, [authLoading, user, role, navigate])

  // Clear error when switching tabs
  function switchTab(t) {
    setTab(t)
    setError('')
    setMagicSent(false)
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email, password)
      // redirect fires via the useEffect above once role is resolved
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMagicLink(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signInWithMagicLink(email)
      setMagicSent(true)
    } catch (err) {
      setError(err.message || 'Failed to send magic link. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D1F3C' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(27,191,176,0.2)', borderTopColor: '#1BBFB0', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .login-left  { display: none !important; }
          .login-right { width: 100% !important; padding: 32px 24px !important; }
          .login-mob-logo { display: flex !important; }
        }
      `}</style>

      {/* ── LEFT PANEL ─────────────────────────────────────── */}
      <div className="login-left" style={{
        width: '55%', flexShrink: 0,
        background: 'linear-gradient(145deg, #0D1F3C 0%, #112444 35%, #0E3462 70%, #0A2A52 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background orbs */}
        <div style={{ position: 'absolute', top: '5%',  left: '5%',  width: 280, height: 280, background: 'radial-gradient(circle, rgba(27,191,176,0.08) 0%, transparent 68%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '8%', right: '8%', width: 220, height: 220, background: 'radial-gradient(circle, rgba(58,143,196,0.09) 0%, transparent 68%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 460, height: 460, background: 'radial-gradient(circle, rgba(27,191,176,0.06) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 60px' }}>
          {/* Animated logo */}
          <div className="fluid-spin" style={{ display: 'inline-block', marginBottom: 36 }}>
            <FluidSVG size={260} id="lp-hero" />
          </div>

          {/* Wordmark */}
          <div style={{ fontWeight: 800, fontSize: 32, letterSpacing: '-0.5px', marginBottom: 8 }}>
            <span style={{ color: 'white' }}>Culture</span>
            <span style={{ color: '#1BBFB0' }}>Xe</span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 32 }}>
            by AIA Africa
          </div>

          <div style={{ fontSize: 15.5, color: 'rgba(255,255,255,0.52)', lineHeight: 1.8, maxWidth: 340, margin: '0 auto', marginBottom: 44 }}>
            Africa's most advanced organisational culture intelligence platform.
          </div>

          {/* Credential pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            {[
              { icon: '◉', text: 'Consultant Portal' },
              { icon: '🏢', text: 'Client Access' },
              { icon: '◎', text: 'Employee Assessments' },
            ].map(item => (
              <div key={item.text} style={{
                display: 'inline-flex', alignItems: 'center', gap: 9,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20, padding: '7px 16px',
              }}>
                <span style={{ fontSize: 13 }}>{item.icon}</span>
                <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Back link */}
        <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, textAlign: 'center' }}>
          <Link to="/" style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.28)', textDecoration: 'none', fontWeight: 500 }}>
            ← Back to CultureXe.com
          </Link>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────── */}
      <div className="login-right" style={{
        flex: 1, background: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflowY: 'auto', padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Mobile-only logo — hidden on desktop */}
          <div className="login-mob-logo" style={{ display: 'none', flexDirection: 'column', alignItems: 'center', marginBottom: 36 }}>
            <div className="fluid-breathe" style={{ marginBottom: 12 }}>
              <FluidSVG size={80} id="lp-mob" />
            </div>
            <div style={{ fontWeight: 800, fontSize: 20, color: '#0D1F3C', letterSpacing: '-0.3px' }}>
              Culture<span style={{ color: '#1BBFB0' }}>Xe</span>
            </div>
            <div style={{ fontSize: 11, color: '#8A9BB0', letterSpacing: '2.5px', textTransform: 'uppercase', marginTop: 4 }}>by AIA Africa</div>
          </div>

          {/* Small logo — visible on desktop */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 40 }}>
            <div className="fluid-breathe">
              <FluidSVG size={32} id="lp-sm" />
            </div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0D1F3C' }}>
              Culture<span style={{ color: '#1BBFB0' }}>Xe</span>
            </div>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0D1F3C', letterSpacing: '-0.5px', marginBottom: 6 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 14, color: '#4A6380', marginBottom: 32, lineHeight: 1.6 }}>
            Sign in to your CultureXe account.
          </p>

          {/* Tab switcher */}
          <div style={{
            display: 'flex', background: '#EEF5F9',
            borderRadius: 11, padding: 4, marginBottom: 32, gap: 4,
          }}>
            {[
              { key: 'password', label: 'Email & Password' },
              { key: 'magic',    label: 'Magic Link' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => switchTab(t.key)}
                style={{
                  flex: 1, padding: '10px 12px',
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                  background: tab === t.key ? 'white' : 'transparent',
                  color: tab === t.key ? '#0D1F3C' : '#8A9BB0',
                  boxShadow: tab === t.key ? '0 1px 8px rgba(13,31,60,0.10)' : 'none',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#FDE8E3', border: '1px solid rgba(232,86,58,0.25)',
              borderRadius: 9, padding: '12px 15px', marginBottom: 20,
              fontSize: 13.5, color: '#C0392B', display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span>
              {error}
            </div>
          )}

          {/* ── EMAIL & PASSWORD FORM ── */}
          {tab === 'password' && (
            <form onSubmit={handleSignIn}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="you@organisation.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ margin: 0 }}>Password</label>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', fontSize: 12.5, color: '#1BBFB0', cursor: 'pointer', fontWeight: 500, padding: 0, fontFamily: 'inherit' }}
                    onClick={() => switchTab('magic')}
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  className="form-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-teal"
                disabled={submitting}
                style={{ width: '100%', padding: '13px', fontSize: 15, justifyContent: 'center', opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer', marginTop: 8 }}
              >
                {submitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                    Signing in…
                  </span>
                ) : 'Sign In →'}
              </button>
            </form>
          )}

          {/* ── MAGIC LINK FORM ── */}
          {tab === 'magic' && !magicSent && (
            <form onSubmit={handleMagicLink}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="you@organisation.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <p style={{ fontSize: 13, color: '#8A9BB0', lineHeight: 1.65, marginBottom: 20 }}>
                We'll send a secure, one-click sign-in link to your email. No password needed.
              </p>
              <button
                type="submit"
                className="btn btn-teal"
                disabled={submitting}
                style={{ width: '100%', padding: '13px', fontSize: 15, justifyContent: 'center', opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                {submitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                    Sending…
                  </span>
                ) : 'Send Magic Link →'}
              </button>
            </form>
          )}

          {/* Magic link success */}
          {tab === 'magic' && magicSent && (
            <div>
              <div style={{
                background: '#E0F7F5', border: '1px solid rgba(27,191,176,0.3)',
                borderRadius: 12, padding: '20px 20px', marginBottom: 20, textAlign: 'center',
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0D1F3C', marginBottom: 6 }}>
                  Check your inbox
                </div>
                <div style={{ fontSize: 13.5, color: '#4A6380', lineHeight: 1.65 }}>
                  A sign-in link has been sent to<br />
                  <strong style={{ color: '#0D1F3C' }}>{email}</strong>.<br />
                  Click the link to continue.
                </div>
              </div>
              <button
                className="btn btn-outline"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => { setMagicSent(false); setEmail('') }}
              >
                Use a different email
              </button>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid #E2E8F0', textAlign: 'center' }}>
            <div style={{ fontSize: 12.5, color: '#8A9BB0', lineHeight: 1.75 }}>
              Need access? Contact{' '}
              <a href="mailto:support@africaia.com" style={{ color: '#1BBFB0', textDecoration: 'none', fontWeight: 500 }}>
                AIA Africa
              </a>
              .<br />
              Accounts are created by your administrator.
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
