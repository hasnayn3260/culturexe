import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import supabase from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { updatePassword } = useAuth()

  const [ready,       setReady]       = useState(false)  // recovery session active
  const [invalid,     setInvalid]     = useState(false)  // link expired/bad
  const [password,    setPassword]    = useState('')
  const [confirmPw,   setConfirmPw]   = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [done,        setDone]        = useState(false)
  const [error,       setError]       = useState('')

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when it detects the recovery token in the URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })

    // Also check if a recovery session is already active (page refresh case)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
      else {
        // Give the hash-based flow 4 s to fire before showing an error
        const t = setTimeout(() => setInvalid(true), 4000)
        return () => clearTimeout(t)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPw) { setError('Passwords do not match.'); return }
    setSubmitting(true)
    try {
      await updatePassword(password)
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err) {
      setError(err.message || 'Could not update password. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F2F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '24px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes cb-progress { from { width: 0 } to { width: 100% } }`}</style>
      <div style={{ background: 'white', borderRadius: 20, padding: '48px 40px', boxShadow: '0 4px 32px rgba(0,0,0,0.08)', maxWidth: 420, width: '100%' }}>

        <div style={{ fontWeight: 800, fontSize: 18, color: '#0D1F3C', marginBottom: 36, letterSpacing: '-0.3px' }}>
          Culture<span style={{ color: '#1BBFB0' }}>Xe</span>
        </div>

        {/* Waiting for recovery session */}
        {!ready && !invalid && (
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'inline-block', width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(27,191,176,0.2)', borderTopColor: '#1BBFB0', animation: 'spin 0.7s linear infinite' }} />
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0D1F3C', marginTop: 20, marginBottom: 6 }}>Verifying reset link…</div>
            <div style={{ fontSize: 13.5, color: '#7A9BB0' }}>Just a moment.</div>
          </div>
        )}

        {/* Invalid / expired link */}
        {invalid && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FDE8E3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 28, color: '#E8563A' }}>✕</div>
            <div style={{ fontWeight: 700, fontSize: 20, color: '#0D1F3C', marginBottom: 8 }}>Link expired</div>
            <div style={{ fontSize: 13.5, color: '#7A9BB0', lineHeight: 1.65, marginBottom: 24 }}>
              This reset link is invalid or has expired. Please request a new one.
            </div>
            <Link to="/forgot-password" className="btn btn-teal" style={{ display: 'inline-block', padding: '11px 24px', textDecoration: 'none', fontSize: 14 }}>Request new link →</Link>
          </div>
        )}

        {/* Reset form */}
        {ready && !done && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0D1F3C', letterSpacing: '-0.4px', marginBottom: 8 }}>Set new password</h1>
            <p style={{ fontSize: 14, color: '#4A6380', lineHeight: 1.6, marginBottom: 28 }}>Choose a strong password for your account.</p>

            {error && (
              <div style={{ background: '#FDE8E3', border: '1px solid rgba(232,86,58,0.25)', borderRadius: 9, padding: '12px 15px', marginBottom: 20, fontSize: 13.5, color: '#C0392B', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0 }}>⚠</span>{error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">New password</label>
                <input className="form-input" type="password" placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} required autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm new password</label>
                <input className="form-input" type="password" placeholder="Repeat your password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required />
              </div>
              <button
                type="submit"
                className="btn btn-teal"
                disabled={submitting}
                style={{ width: '100%', padding: '13px', fontSize: 15, justifyContent: 'center', opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer', marginTop: 8 }}
              >
                {submitting
                  ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />Updating…</span>
                  : 'Update password →'}
              </button>
            </form>
          </>
        )}

        {/* Success */}
        {done && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#E0F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 28, color: '#1BBFB0' }}>✓</div>
            <div style={{ fontWeight: 700, fontSize: 20, color: '#0D1F3C', marginBottom: 8 }}>Password updated!</div>
            <div style={{ fontSize: 13.5, color: '#7A9BB0', lineHeight: 1.65, marginBottom: 24 }}>Taking you back to sign in…</div>
            <div style={{ height: 4, background: '#E8EFF5', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#1BBFB0', borderRadius: 2, animation: 'cb-progress 2.5s linear forwards' }} />
            </div>
          </div>
        )}

        {ready && !done && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Link to="/login" style={{ fontSize: 13, color: '#1BBFB0', textDecoration: 'none', fontWeight: 600 }}>← Back to sign in</Link>
          </div>
        )}
      </div>
    </div>
  )
}
