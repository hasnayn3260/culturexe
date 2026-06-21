import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function FluidSVG({ size = 60, id = 'su' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id={`${id}-a`} cx="30%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#C9E8A0" /><stop offset="40%" stopColor="#5BBFB0" /><stop offset="100%" stopColor="#1A6BAA" />
        </radialGradient>
        <radialGradient id={`${id}-b`} cx="70%" cy="65%" r="65%">
          <stop offset="0%" stopColor="#E8D890" /><stop offset="40%" stopColor="#5AB0D0" /><stop offset="100%" stopColor="#1BBFB0" />
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

export default function Signup() {
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const [firstName,  setFirstName]  = useState('')
  const [lastName,   setLastName]   = useState('')
  const [username,   setUsername]   = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [confirmPw,  setConfirmPw]  = useState('')
  const [department, setDepartment] = useState('')
  const [jobTitle,   setJobTitle]   = useState('')
  const [position,   setPosition]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')
  const [done,       setDone]       = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!firstName.trim()) { setError('Please enter your first name.'); return }
    if (!lastName.trim())  { setError('Please enter your surname.'); return }
    if (!username.trim())  { setError('Please choose a username.'); return }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) { setError('Username must be 3–30 characters: letters, numbers, or underscores only.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPw) { setError('Passwords do not match.'); return }

    setSubmitting(true)
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`
      await signUp(email, password, fullName, jobTitle, 'client', username.trim(), position)
      setDone(true)
    } catch (err) {
      setError(err.message || 'Could not create account. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const fieldStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1.5px solid #E2E8F0', fontSize: 14, fontFamily: 'inherit',
    color: '#0D1F3C', outline: 'none', transition: 'border-color 0.15s',
    boxSizing: 'border-box', background: 'white',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F7F6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@keyframes su-spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <FluidSVG size={56} id="su-logo" />
          <div style={{ fontWeight: 800, fontSize: 20, color: '#0D1F3C', marginTop: 10, letterSpacing: '-0.3px' }}>
            Culture<span style={{ color: '#1BBFB0' }}>Xe</span>
          </div>
          <div style={{ fontSize: 11.5, color: '#8A9BB0', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 3 }}>Participant Registration</div>
        </div>

        <div style={{ background: 'white', borderRadius: 18, padding: '36px 32px', boxShadow: '0 4px 32px rgba(0,0,0,0.07)' }}>
          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 52, color: '#1BBFB0', marginBottom: 16 }}>✓</div>
              <div style={{ fontWeight: 700, fontSize: 20, color: '#0D1F3C', marginBottom: 10 }}>Account Created</div>
              <div style={{ fontSize: 14, color: '#637082', lineHeight: 1.7, marginBottom: 28 }}>
                {email ? <>Check your inbox at <strong style={{ color: '#0D1F3C' }}>{email}</strong> to confirm your address, then sign in below.</> : 'Your account is ready. Sign in to access your survey.'}
              </div>
              <button
                onClick={() => navigate('/login')}
                style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: '#1BBFB0', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Go to Sign In →
              </button>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0D1F3C', marginBottom: 4, letterSpacing: '-0.3px' }}>Create your account</h1>
              <p style={{ fontSize: 13.5, color: '#637082', marginBottom: 24, lineHeight: 1.6 }}>Register to access and complete your survey.</p>

              {error && (
                <div style={{ background: '#FDE8E3', border: '1px solid rgba(232,86,58,0.25)', borderRadius: 9, padding: '11px 14px', marginBottom: 20, fontSize: 13.5, color: '#C0392B', display: 'flex', gap: 8 }}>
                  <span>⚠</span>{error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#4A5568', marginBottom: 5 }}>First Name *</label>
                    <input style={fieldStyle} type="text" placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} required
                      onFocus={e => e.target.style.borderColor = '#1BBFB0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#4A5568', marginBottom: 5 }}>Surname *</label>
                    <input style={fieldStyle} type="text" placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} required
                      onFocus={e => e.target.style.borderColor = '#1BBFB0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#4A5568', marginBottom: 5 }}>Username *</label>
                  <input style={fieldStyle} type="text" placeholder="e.g. john_doe" value={username} onChange={e => setUsername(e.target.value)} required
                    onFocus={e => e.target.style.borderColor = '#1BBFB0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#4A5568', marginBottom: 5 }}>Work Email *</label>
                  <input style={fieldStyle} type="email" placeholder="you@organisation.com" value={email} onChange={e => setEmail(e.target.value)} required
                    onFocus={e => e.target.style.borderColor = '#1BBFB0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#4A5568', marginBottom: 5 }}>Position <span style={{ color: '#A0AEC0', fontWeight: 400 }}>(optional)</span></label>
                    <select style={{ ...fieldStyle, cursor: 'pointer' }} value={position} onChange={e => setPosition(e.target.value)}
                      onFocus={e => e.target.style.borderColor = '#1BBFB0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'}>
                      <option value="">Select position…</option>
                      {['Executive','Senior Manager','Manager','Team Lead','Supervisor','Senior Employee','Employee','Intern','Contractor','Other'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#4A5568', marginBottom: 5 }}>Department <span style={{ color: '#A0AEC0', fontWeight: 400 }}>(optional)</span></label>
                    <input style={fieldStyle} type="text" placeholder="e.g. Finance" value={department} onChange={e => setDepartment(e.target.value)}
                      onFocus={e => e.target.style.borderColor = '#1BBFB0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#4A5568', marginBottom: 5 }}>Job Title <span style={{ color: '#A0AEC0', fontWeight: 400 }}>(optional)</span></label>
                  <input style={fieldStyle} type="text" placeholder="e.g. Finance Lead" value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                    onFocus={e => e.target.style.borderColor = '#1BBFB0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#4A5568', marginBottom: 5 }}>Password *</label>
                  <input style={fieldStyle} type="password" placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} required
                    onFocus={e => e.target.style.borderColor = '#1BBFB0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#4A5568', marginBottom: 5 }}>Confirm Password *</label>
                  <input style={fieldStyle} type="password" placeholder="Repeat your password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required
                    onFocus={e => e.target.style.borderColor = '#1BBFB0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: submitting ? '#8DD4CE' : '#1BBFB0', color: 'white', fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {submitting && <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'su-spin 0.7s linear infinite', display: 'inline-block' }} />}
                  {submitting ? 'Creating account…' : 'Create Account →'}
                </button>
              </form>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#8A9BB0' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#1BBFB0', textDecoration: 'none', fontWeight: 600 }}>Sign in →</Link>
        </div>
      </div>
    </div>
  )
}
