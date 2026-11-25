import { useEffect, useState } from 'react'

const STATUS_REFRESH_INTERVAL_MS = 30_000

/** Keeps date-derived survey states current while a page remains open. */
export function useSurveyStatusClock(): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const refresh = () => setNow(Date.now())
    const interval = window.setInterval(refresh, STATUS_REFRESH_INTERVAL_MS)

    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  return now
}
