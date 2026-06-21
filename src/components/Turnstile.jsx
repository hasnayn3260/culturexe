import { useEffect, useRef } from 'react'
import { TURNSTILE_SITE_KEY, loadTurnstile } from '../lib/turnstile'

// Cloudflare Turnstile widget. If VITE_TURNSTILE_SITE_KEY is not set this renders
// nothing, so the app keeps working before/without Turnstile being configured.
//
// Props:
//   onVerify(token) — called with the token on success, or '' when it expires /
//                     errors / is reset.
//   resetSignal     — bump this number to force a fresh challenge (e.g. after a
//                     failed login, because each token is single-use).
export default function Turnstile({ onVerify, resetSignal = 0 }) {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)
  const onVerifyRef = useRef(onVerify)

  // Keep the latest callback without re-running the render effect.
  useEffect(() => { onVerifyRef.current = onVerify }, [onVerify])

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return
    let cancelled = false
    loadTurnstile().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => onVerifyRef.current?.(token),
        'expired-callback': () => onVerifyRef.current?.(''),
        'error-callback': () => onVerifyRef.current?.(''),
        'timeout-callback': () => onVerifyRef.current?.(''),
      })
    }).catch(() => {})
    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current) } catch { /* ignore */ }
        widgetIdRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (resetSignal === 0) return
    if (widgetIdRef.current && window.turnstile) {
      try { window.turnstile.reset(widgetIdRef.current) } catch { /* ignore */ }
      onVerifyRef.current?.('')
    }
  }, [resetSignal])

  if (!TURNSTILE_SITE_KEY) return null
  return <div ref={containerRef} style={{ marginBottom: 16, minHeight: 65 }} />
}
