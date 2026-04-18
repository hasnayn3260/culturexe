import { useState, useEffect, useCallback } from 'react'
import supabase from '../lib/supabaseClient'

export function useClientData(orgId) {
  const [org, setOrg]               = useState(null)
  const [assessments, setAssessments] = useState([])
  const [reports, setReports]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  const fetch = useCallback(async () => {
    if (!orgId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const { data: orgData, error: orgErr } = await supabase
        .from('organisations')
        .select('*')
        .eq('id', orgId)
        .maybeSingle()
      if (orgErr) throw orgErr
      setOrg(orgData)

      const { data: assessData, error: assessErr } = await supabase
        .from('assessments')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
      if (assessErr) throw assessErr

      const enriched = await Promise.all((assessData || []).map(async a => {
        const [
          { count: invitedCount },
          { count: responseCount },
        ] = await Promise.all([
          supabase
            .from('response_tokens')
            .select('id', { count: 'exact', head: true })
            .eq('assessment_id', a.id),
          supabase
            .from('responses')
            .select('id', { count: 'exact', head: true })
            .eq('assessment_id', a.id),
        ])
        const total_invited   = invitedCount  ?? 0
        const total_responses = responseCount ?? 0
        const completion_rate = total_invited > 0
          ? Math.round((total_responses / total_invited) * 100)
          : 0
        return { ...a, total_invited, total_responses, completion_rate }
      }))
      setAssessments(enriched)

      const ids = (assessData || []).map(a => a.id)
      if (ids.length > 0) {
        const { data: reportData, error: reportErr } = await supabase
          .from('reports')
          .select('*')
          .in('assessment_id', ids)
          .eq('status', 'released')
          .order('created_at', { ascending: false })
        if (reportErr) throw reportErr
        setReports(reportData || [])
      } else {
        setReports([])
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetch() }, [fetch])

  return { org, assessments, reports, loading, error, refetch: fetch }
}
