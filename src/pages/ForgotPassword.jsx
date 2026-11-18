import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const COMMON_DOMAIN_TYPOS = {
  'gamil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'hotmail.con': 'hotmail.com',
  'outlook.con': 'outlook.com',
  'yahoo.con': 'yahoo.com',
}

function normalizeEmail(value) {
  return value.trim().toLowerCase()
}

function getSuggestedEmail(value) {
  const normalized = normalizeEmail(value)
  const atIndex = normalized.lastIndexOf('@')
  if (atIndex < 1) return ''

  const localPart = normalized.slice(0, atIndex)
  const domain = normalized.slice(atIndex + 1)
  const correctedDomain = COMMON_DOMAIN_TYPOS[domain]
    || (domain.endsWith('.cmo') ? `${domain.slice(0, -4)}.com` : '')

  return correctedDomain ? `${localPart}@${correctedDomain}` : ''
}

function getResetErrorMessage(error) {
  const message = error instanceof Error ? error.message.toLowerCase() : ''

  if (message.includes('rate') || message.includes('too many')) {
    return 'Too many reset attempts. Please wait a few minutes and try again.'
  }

  if (message.includes('fetch') || message.includes('network')) {
    return 'We could not connect to the reset service. Check your connection and try again.'
  }

  return 'The reset service is temporarily unavailable. Please try again shortly.'
}

export default function ForgotPassword() {
  const { resetPasswordForEmail } = useAuth()
  const [email,       setEmail]       = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [done,        setDone]        = useState(false)
  const [error,       setError]       = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const suggestedEmail = getSuggestedEmail(email)

  useEffect(() => {
    if (resendCooldown <= 0) return undefined

    const timer = window.setTimeout(() => {
      setResendCooldown(current => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [resendCooldown])

  async function sendReset(targetEmail) {
    const normalizedEmail = normalizeEmail(targetEmail)

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Enter a valid email address, for example name@organisation.com.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await resetPasswordForEmail(normalizedEmail)
      setEmail(normalizedEmail)
      setSubmittedEmail(normalizedEmail)
      setDone(true)
      setResendCooldown(60)
    } catch (caughtError) {
      setError(getResetErrorMessage(caughtError))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    await sendReset(email)
  }

  async function handleResend() {
    if (resendCooldown > 0 || submitting) return
    await sendReset(submittedEmail)
  }

  function handleChangeEmail() {
    setDone(false)
    setError('')
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
                  onChange={e => {
                    setEmail(e.target.value)
                    setError('')
                  }}
                  required
                  autoFocus
                />
                {suggestedEmail && suggestedEmail !== normalizeEmail(email) && (
                  <div style={{ marginTop: 7, fontSize: 12.5, color: '#4A6380' }}>
                    Did you mean{' '}
                    <button
                      type="button"
                      onClick={() => setEmail(suggestedEmail)}
                      style={{ border: 'none', background: 'none', padding: 0, color: '#1BBFB0', font: 'inherit', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {suggestedEmail}
                    </button>
                    ?
                  </div>
                )}
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
            <p style={{ fontSize: 14, color: '#4A6380', lineHeight: 1.65, textAlign: 'center', marginBottom: 16 }}>
              If an active account exists for this address, a password reset link will arrive shortly:
            </p>

            <div style={{ padding: '12px 14px', borderRadius: 10, background: '#F7F9FC', border: '1px solid #E2E8F0', color: '#0D1F3C', fontSize: 13.5, fontWeight: 700, textAlign: 'center', wordBreak: 'break-word' }}>
              {submittedEmail}
            </div>

            <button
              type="button"
              onClick={handleChangeEmail}
              style={{ display: 'block', margin: '10px auto 24px', border: 'none', background: 'none', padding: 0, color: '#1BBFB0', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Wrong address? Change email
            </button>

            <div style={{ borderRadius: 11, background: '#F7F9FC', padding: '14px 16px', marginBottom: 18 }}>
              <div style={{ color: '#0D1F3C', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>No email after a few minutes?</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#4A6380', fontSize: 12.5, lineHeight: 1.7 }}>
                <li>Use the address that received your CultureXe invitation.</li>
                <li>Check spam, junk, and Microsoft quarantine.</li>
                <li>Confirm the address above is spelled correctly.</li>
              </ul>
            </div>

            {error && (
              <div style={{ background: '#FDE8E3', border: '1px solid rgba(232,86,58,0.3)', borderRadius: 9, padding: '11px 14px', marginBottom: 16, fontSize: 13, color: '#C0392B' }}>
                {error}
              </div>
            )}

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => void handleResend()}
              disabled={submitting || resendCooldown > 0}
              style={{ width: '100%', justifyContent: 'center', opacity: submitting || resendCooldown > 0 ? 0.65 : 1, cursor: submitting || resendCooldown > 0 ? 'not-allowed' : 'pointer' }}
            >
              {submitting
                ? 'Sending…'
                : resendCooldown > 0
                  ? `Resend available in ${resendCooldown}s`
                  : 'Resend reset link'}
            </button>

            <p style={{ marginTop: 18, textAlign: 'center', color: '#8A9BB0', fontSize: 12.5, lineHeight: 1.6 }}>
              Still need help?{' '}
              <a href="mailto:support@stratxe.com?subject=Password%20reset%20help" style={{ color: '#1BBFB0', fontWeight: 700, textDecoration: 'none' }}>
                Contact support
              </a>
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
