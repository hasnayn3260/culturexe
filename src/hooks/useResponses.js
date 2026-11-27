import { useState, useEffect, useCallback } from 'react'
import supabase from '../lib/supabaseClient'
import { reportClientError } from '../lib/errors/normaliseClientError'

export function useResponses(assessmentId) {
  const [tokens, setTokens]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const fetch = useCallback(async () => {
    if (!assessmentId) { setTokens([]); return }
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('response_tokens')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('created_at', { ascending: false })
      if (err) throw err
      setTokens(data || [])
    } catch (e) {
      setError(reportClientError(e, 'Responses could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [assessmentId])

  useEffect(() => { fetch() }, [fetch])

  const totalInvited   = tokens.length
  const completedCount = tokens.filter(t => t.used).length
  const pendingCount   = totalInvited - completedCount
  const completionRate = totalInvited > 0 ? Math.round((completedCount / totalInvited) * 100) : 0

  return { tokens, totalInvited, completedCount, pendingCount, completionRate, loading, error, refetch: fetch }
}
