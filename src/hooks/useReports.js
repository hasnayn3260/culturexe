import { useState, useEffect, useCallback } from 'react'
import supabase from '../lib/supabaseClient'

export function useReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('reports')
        .select(`*, assessments ( id, name, organisations ( id, name ) )`)
        .order('created_at', { ascending: false })
      if (err) throw err
      setReports(
        (data || []).map(r => ({
          ...r,
          assessment_name: r.assessments?.name || '—',
          org_name:        r.assessments?.organisations?.name || '—',
        }))
      )
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function updateReport(id, updates) {
    const { error: err } = await supabase
      .from('reports')
      .update(updates)
      .eq('id', id)
    if (err) throw err
    await fetch()
  }

  async function releaseReport(id) {
    await updateReport(id, {
      status:      'released',
      released_at: new Date().toISOString(),
    })
  }

  return { reports, loading, error, updateReport, releaseReport, refetch: fetch }
}
