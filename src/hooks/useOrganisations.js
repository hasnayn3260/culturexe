import { useState, useEffect, useCallback } from 'react'
import supabase from '../lib/supabaseClient'

export function useOrganisations() {
  const [organisations, setOrganisations] = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('organisations')
        .select('*')
        .order('created_at', { ascending: false })
      if (err) throw err
      setOrganisations(data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function createOrganisation(org) {
    const { error: err } = await supabase
      .from('organisations')
      .insert(org)
    if (err) throw err
    await fetch()
  }

  return { organisations, loading, error, createOrganisation, refetch: fetch }
}
