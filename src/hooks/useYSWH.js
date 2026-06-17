import { useState, useEffect, useCallback } from 'react'
import supabase from '../lib/supabaseClient'

export function useYSWH(orgId) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchItems = useCallback(async () => {
    if (!orgId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('yswh_items')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
      if (err) throw err
      setItems(data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchItems() }, [fetchItems])

  async function createItem(data) {
    const { error: err } = await supabase
      .from('yswh_items')
      .insert({ ...data, org_id: orgId })
    if (err) throw err
    await fetchItems()
  }

  async function updateItem(id, updates) {
    const { error: err } = await supabase
      .from('yswh_items')
      .update(updates)
      .eq('id', id)
    if (err) throw err
    await fetchItems()
  }

  return { items, loading, error, createItem, updateItem, refetch: fetchItems }
}
