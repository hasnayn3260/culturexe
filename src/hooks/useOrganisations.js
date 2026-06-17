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

  async function createOrganisation({ name, industry, employee_count, country, contact_name, contact_email, website, ...rest }) {
    const payload = {
      name,
      ...(industry        !== undefined ? { industry }        : {}),
      ...(employee_count  !== undefined ? { employee_count: employee_count ? parseInt(employee_count) : null } : {}),
      ...(country         !== undefined ? { country }         : {}),
      ...(contact_name    !== undefined ? { contact_name }    : {}),
      ...(contact_email   !== undefined ? { contact_email }   : {}),
      ...(website         !== undefined ? { website }         : {}),
      ...rest,
    }
    const { error: err } = await supabase
      .from('organisations')
      .insert(payload)
    if (err) throw err
    await fetch()
  }

  async function updateOrganisation(id, updates) {
    const { error: err } = await supabase
      .from('organisations')
      .update(updates)
      .eq('id', id)
    if (err) throw err
    await fetch()
  }

  return { organisations, loading, error, createOrganisation, updateOrganisation, refetch: fetch }
}
