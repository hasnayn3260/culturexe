import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../lib/supabaseClient'

function Spin({ size = 32, color = '#1BBFB0' }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      borderRadius: '50%', border: `3px solid ${color}22`,
      borderTopColor: color, animation: 'cb-spin 0.7s linear infinite',
    }} />
  )
}

export default function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying') // verifying | success | error
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let subscription

    async function handleCallback() {
      try {
        const params = new URLSearchParams(window.location.search)
        const errorParam = params.get('error')
        const errorDesc  = params.get('error_description')
        const code       = params.get('code')

        if (errorParam) {
          throw new Error(errorDesc || errorParam)
        }

        // PKCE flow — exchange code for session
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        }

        // Check if a session already exists (implicit / code exchange above)
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
          await supabase.auth.signOut()
          setStatus('success')
          return
        }

        // Implicit flow — wait for the auth state change triggered by the hash token
        const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(async (event, sess) => {
          if (event === 'SIGNED_IN' || event === 'EMAIL_CONFIRMED') {
            sub.unsubscribe()
            await supabase.auth.signOut()
            setStatus('success')
          }
        })
        subscription = sub

        // Timeout: if nothing fires in 8 s, surface an error
        setTimeout(() => {
          sub.unsubscribe()
          if (status === 'verifying') {
            setStatus('error')
            setErrorMsg('Verification timed out — the link may have expired.')
          }
        }, 8000)
      } catch (err) {
        setStatus('error')
        setErrorMsg(err.message || 'Verification failed.')
      }
    }

    handleCallback()
    return () => subscription?.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Once status is settled, redirect to login with the result
  useEffect(() => {
    if (status === 'success') {
      const t = setTimeout(() => navigate('/login', { replace: true, state: { verified: true } }), 2200)
      return () => clearTimeout(t)
    }
    if (status === 'error') {
      const t = setTimeout(
        () => navigate('/login', { replace: true, state: { verifyError: errorMsg || 'Verification failed.' } }),
        3000,
      )
      return () => clearTimeout(t)
    }
  }, [status, errorMsg, navigate])

  const isSuccess = status === 'success'
  const isError   = status === 'error'

  return (
    <div style={{
      minHeight: '100vh', background: '#F2F7FA',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <style>{`@keyframes cb-spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{
        background: 'white', borderRadius: 20, padding: '48px 40px',
        boxShadow: '0 4px 32px rgba(0,0,0,0.08)', maxWidth: 400, width: '100%',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{ fontWeight: 800, fontSize: 18, color: '#0D1F3C', marginBottom: 36, letterSpacing: '-0.3px' }}>
          Culture<span style={{ color: '#1BBFB0' }}>Xe</span>
        </div>

        {/* Verifying */}
        {status === 'verifying' && (
          <>
            <Spin size={40} />
            <div style={{ fontWeight: 700, fontSize: 18, color: '#0D1F3C', marginTop: 24, marginBottom: 8 }}>
              Verifying your email…
            </div>
            <div style={{ fontSize: 13.5, color: '#7A9BB0', lineHeight: 1.65 }}>
              Just a moment while we confirm your address.
            </div>
          </>
        )}

        {/* Success */}
        {isSuccess && (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#E0F7F5', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 24px', fontSize: 28, color: '#1BBFB0',
            }}>✓</div>
            <div style={{ fontWeight: 700, fontSize: 20, color: '#0D1F3C', marginBottom: 8 }}>
              Email confirmed!
            </div>
            <div style={{ fontSize: 13.5, color: '#7A9BB0', lineHeight: 1.65, marginBottom: 28 }}>
              Your email address has been verified. Taking you to sign in…
            </div>
            <div style={{ height: 4, background: '#E8EFF5', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', background: '#1BBFB0', borderRadius: 2,
                animation: 'cb-progress 2.2s linear forwards',
              }} />
              <style>{`@keyframes cb-progress { from { width: 0 } to { width: 100% } }`}</style>
            </div>
          </>
        )}

        {/* Error */}
        {isError && (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#FDE8E3', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 24px', fontSize: 28, color: '#E8563A',
            }}>✕</div>
            <div style={{ fontWeight: 700, fontSize: 20, color: '#0D1F3C', marginBottom: 8 }}>
              Verification failed
            </div>
            <div style={{ fontSize: 13.5, color: '#7A9BB0', lineHeight: 1.65, marginBottom: 8 }}>
              {errorMsg || 'Something went wrong. The link may have expired.'}
            </div>
            <div style={{ fontSize: 12.5, color: '#A0B0C0' }}>Redirecting you back to sign in…</div>
          </>
        )}
      </div>
    </div>
  )
}
