// Cloudflare Turnstile helpers (non-component module so the React component file
// only exports a component — keeps Fast Refresh happy).

export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

// True only when a site key is configured. When false the widget renders nothing
// and the app behaves exactly as before (captcha effectively disabled).
export function isTurnstileEnabled() {
  return Boolean(TURNSTILE_SITE_KEY)
}

let loaderPromise = null
export function loadTurnstile() {
  if (typeof window !== 'undefined' && window.turnstile) return Promise.resolve()
  if (loaderPromise) return loaderPromise
  loaderPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => { loaderPromise = null; reject(new Error('Failed to load Turnstile')) }
    document.head.appendChild(s)
  })
  return loaderPromise
}
