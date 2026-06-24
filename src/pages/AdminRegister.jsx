import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// Internal-only registration page for consultants and admins.
// Not linked from any public UI. Not indexed by search engines.

export default function AdminRegister() {
  const navigate = useNavigate()
  const { signUp, user, role, loading: authLoading } = useAuth()

  const [fullName,   setFullName]   = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [confirmPw,  setConfirmPw]  = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')
  const [done,       setDone]       = useState(false)

  // Inject noindex meta on mount
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'; meta.content = 'noindex,nofollow'
    document.head.appendChild(meta)
    return () => document.head.removeChild(meta)
  }, [])

  useEffect(() => {
    if (!authLoading && user && role) {
      navigate(role === 'client' ? '/client' : '/app', { replace: true })
    }
  }, [authLoading, user, role, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!fullName.trim()) { setError('Please enter a full name.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPw) { setError('Passwords do not match.'); return }
    setSubmitting(true)
    try {
      // Self-service registration always creates a non-privileged account.
      // Consultant / superadmin roles are granted only by an existing superadmin
      // through User Management (the create-user Edge Function).
      await signUp(email, password, fullName, '', 'client')
      setDone(true)
    } catch (err) {
      setError(err.message || 'Could not create account.')
    } finally {
      setSubmitting(false)
    }
  }

  const fieldStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 9,
    border: '1.5px solid #E2E8F0', fontSize: 14, fontFamily: 'inherit',
    color: '#0D1F3C', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D1F3C', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@keyframes ar-spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: 'white', letterSpacing: '-0.3px' }}>
            Culture<span style={{ color: '#1BBFB0' }}>Xe</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 4 }}>Internal — Backend Registration</div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '32px 28px' }}>
          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, color: '#1BBFB0', marginBottom: 12 }}>✓</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: 'white', marginBottom: 8 }}>Account Created</div>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 24 }}>
                The account for <strong style={{ color: 'white' }}>{email}</strong> is ready. Sign in below.
              </div>
              <Link to="/login" style={{ display: 'block', padding: '12px', borderRadius: 9, background: '#1BBFB0', color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: 14, textAlign: 'center' }}>
                Go to Sign In →
              </Link>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 4 }}>Register Staff Account</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>For consultants, admins, and internal users only.</div>

              {error && (
                <div style={{ background: 'rgba(232,86,58,0.15)', border: '1px solid rgba(232,86,58,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: 13.5, color: '#F4856A' }}>
                  ⚠ {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Full Name</label>
                  <input style={{ ...fieldStyle, background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)', color: 'white' }} type="text" placeholder="e.g. Sipho Nkosi" value={fullName} onChange={e => setFullName(e.target.value)} required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Email</label>
                  <input style={{ ...fieldStyle, background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)', color: 'white' }} type="email" placeholder="name@africaia.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Password</label>
                  <input style={{ ...fieldStyle, background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)', color: 'white' }} type="password" placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Confirm Password</label>
                  <input style={{ ...fieldStyle, background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)', color: 'white' }} type="password" placeholder="Repeat password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ width: '100%', padding: '12px', borderRadius: 9, border: 'none', background: submitting ? '#8DD4CE' : '#1BBFB0', color: 'white', fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {submitting && <span style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'ar-spin 0.7s linear infinite', display: 'inline-block' }} />}
                  {submitting ? 'Creating…' : 'Create Account →'}
                </button>
              </form>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12.5, color: 'rgba(255,255,255,0.25)' }}>
          <Link to="/login" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>← Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}
