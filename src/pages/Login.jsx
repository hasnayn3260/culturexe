import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      navigate('/app/dashboard')
    }, 1200)
  }

  return (
    <div style={{
      minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif",
      background: 'linear-gradient(145deg, #0D1F3C 0%, #112444 40%, #0E3462 75%, #0A2A52 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: '10%', left: '5%', width: 320, height: 320, background: 'radial-gradient(circle, rgba(27,191,176,0.07) 0%, transparent 68%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 280, height: 280, background: 'radial-gradient(circle, rgba(58,143,196,0.08) 0%, transparent 68%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 460, padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div className="fluid-breathe">
              <FluidSVG size={44} id="login" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.3px', lineHeight: 1 }}>
                <span style={{ color: 'white' }}>Culture</span>
                <span style={{ color: '#1BBFB0' }}>Xe</span>
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.32)', letterSpacing: '2.5px', textTransform: 'uppercase', marginTop: 3 }}>
                by AIA Africa
              </div>
            </div>
          </Link>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', letterSpacing: '-0.5px', marginBottom: 8 }}>
            Consultant Portal
          </h1>
          <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.48)', lineHeight: 1.6 }}>
            Sign in to access your CultureXe dashboard.
          </p>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 24, padding: '40px 38px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.30)',
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.65)', marginBottom: 8 }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@organisation.com"
                style={{
                  width: '100%', padding: '13px 16px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 11, fontSize: 14, color: 'white',
                  outline: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif",
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(27,191,176,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.65)' }}>
                  Password
                </label>
                <span style={{ fontSize: 12, color: '#1BBFB0', cursor: 'pointer', fontWeight: 500 }}>
                  Forgot password?
                </span>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '13px 16px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 11, fontSize: 14, color: 'white',
                  outline: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif",
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(27,191,176,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(232,86,58,0.15)', border: '1px solid rgba(232,86,58,0.3)',
                borderRadius: 9, padding: '11px 14px', marginBottom: 18,
                fontSize: 13, color: '#F47A65',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: loading ? 'rgba(27,191,176,0.5)' : 'linear-gradient(135deg, #1BBFB0, #3A8FC4)',
                border: 'none', borderRadius: 11,
                color: 'white', fontWeight: 700, fontSize: 15,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                transition: 'opacity 0.15s',
                boxShadow: '0 4px 20px rgba(27,191,176,0.28)',
              }}
            >
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.28)', lineHeight: 1.7 }}>
              Access is restricted to AIA Africa consultants.<br />
              Contact <span style={{ color: '#1BBFB0' }}>support@africaia.com</span> to request access.
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <Link to="/" style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontWeight: 500 }}>
            ← Back to CultureXe
          </Link>
        </div>
      </div>
    </div>
  )
}
