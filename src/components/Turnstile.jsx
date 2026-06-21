import { useEffect, useRef } from 'react'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

export default function Turnstile({ onVerify, onExpire, resetKey }) {
  const containerRef = useRef(null)
  const widgetId = useRef(null)

  useEffect(() => {
    function render() {
      if (!containerRef.current || !window.turnstile) return
      // Clear any previous widget in this container
      if (widgetId.current != null) {
        try { window.turnstile.remove(widgetId.current) } catch {}
        widgetId.current = null
      }
      containerRef.current.innerHTML = ''
      widgetId.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: (token) => onVerify(token),
        'expired-callback': () => { onExpire?.(); onVerify(null) },
        'error-callback': () => onVerify(null),
      })
    }

    if (window.turnstile) {
      render()
    } else {
      const interval = setInterval(() => {
        if (window.turnstile) { clearInterval(interval); render() }
      }, 50)
      return () => clearInterval(interval)
    }

    return () => {
      if (widgetId.current != null && window.turnstile) {
        try { window.turnstile.remove(widgetId.current) } catch {}
        widgetId.current = null
      }
    }
  }, [resetKey])

  return <div ref={containerRef} style={{ margin: '16px 0' }} />
}
