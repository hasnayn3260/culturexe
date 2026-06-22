import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ForgotPassword() {
  const { resetPasswordForEmail } = useAuth()
  const [email,       setEmail]       = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [done,        setDone]        = useState(false)
  const [error,       setError]       = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await resetPasswordForEmail(email.trim())
      setDone(true)
    } catch (err) {
      setError(err.message || 'Could not send reset email. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F2F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '24px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ background: 'white', borderRadius: 20, padding: '48px 40px', boxShadow: '0 4px 32px rgba(0,0,0,0.08)', maxWidth: 420, width: '100%' }}>

        <div style={{ fontWeight: 800, fontSize: 18, color: '#0D1F3C', marginBottom: 36, letterSpacing: '-0.3px' }}>
          Culture<span style={{ color: '#1BBFB0' }}>Xe</span>
        </div>

        {!done ? (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0D1F3C', letterSpacing: '-0.4px', marginBottom: 8 }}>Reset your password</h1>
            <p style={{ fontSize: 14, color: '#4A6380', lineHeight: 1.6, marginBottom: 28 }}>
              Enter the email address linked to your account and we'll send you a reset link.
            </p>

            {error && (
              <div style={{ background: '#FDE8E3', border: '1px solid rgba(232,86,58,0.3)', borderRadius: 9, padding: '12px 15px', marginBottom: 20, fontSize: 13.5, color: '#C0392B', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0 }}>⚠</span>{error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email address</label>
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
              <button
                type="submit"
                className="btn btn-teal"
                disabled={submitting}
                style={{ width: '100%', padding: '13px', fontSize: 15, justifyContent: 'center', opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer', marginTop: 8 }}
              >
                {submitting
                  ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />Sending…</span>
                  : 'Send reset link →'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#E0F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 28, color: '#1BBFB0' }}>✓</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0D1F3C', letterSpacing: '-0.4px', marginBottom: 10, textAlign: 'center' }}>Check your inbox</h1>
            <p style={{ fontSize: 14, color: '#4A6380', lineHeight: 1.65, textAlign: 'center', marginBottom: 28 }}>
              If <strong style={{ color: '#0D1F3C' }}>{email}</strong> is registered, you'll receive a password reset link shortly. Check your spam folder if it doesn't arrive.
            </p>
          </>
        )}

        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <Link to="/login" style={{ fontSize: 13, color: '#1BBFB0', textDecoration: 'none', fontWeight: 600 }}>← Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}
