import { useState, useEffect, useCallback } from 'react'
import supabase from '../lib/supabaseClient'

export function usePulse(orgId) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('pulse_entries')
        .select('*')
        .order('created_at', { ascending: false })

      if (orgId) {
        query = query.eq('org_id', orgId)
      }

      const { data, error: err } = await query
      if (err) throw err
      setEntries(data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const stats = (() => {
    const total = entries.length
    const flagged = entries.filter(e => e.flagged).length
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const thisWeek = entries.filter(e => new Date(e.created_at) >= sevenDaysAgo).length
    const withSentiment = entries.filter(e => e.sentiment != null && !isNaN(Number(e.sentiment)))
    const avgSentiment = withSentiment.length > 0
      ? Math.round((withSentiment.reduce((sum, e) => sum + Number(e.sentiment), 0) / withSentiment.length) * 10) / 10
      : null
    return { total, flagged, thisWeek, avgSentiment }
  })()

  async function createEntry(text, dimensions, entryOrgId) {
    const { error: err } = await supabase
      .from('pulse_entries')
      .insert({
        org_id: entryOrgId,
        text,
        dimensions: dimensions || [],
        sentiment: null,
        flagged: false,
      })
    if (err) throw err
    await fetchEntries()
  }

  return { entries, loading, error, stats, createEntry, refetch: fetchEntries }
}
