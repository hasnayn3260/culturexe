import { useState, useEffect, useCallback } from 'react'
import supabase from '../lib/supabaseClient'

export function useAdminData() {
  const [users, setUsers]               = useState([])
  const [organisations, setOrgs]         = useState([])
  const [loading, setLoading]            = useState(true)
  const [error, setError]                = useState(null)

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*, organisations ( id, name )')
        .order('created_at', { ascending: false })
      if (err) throw err
      setUsers(
        (data || []).map(u => ({
          ...u,
          org_name: u.organisations?.name || null,
        }))
      )
    } catch (e) {
      setError(e.message)
    }
  }, [])

  const fetchOrgs = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('organisations')
        .select('id, name')
        .order('name')
      if (err) throw err
      setOrgs(data || [])
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchUsers(), fetchOrgs()]).finally(() => setLoading(false))
  }, [fetchUsers, fetchOrgs])

  async function createUser({ email, full_name, role, org_id }) {
    const { data, error: err } = await supabase.functions.invoke('create-user', {
      body: { email, full_name, role, org_id: org_id || null },
    })
    if (err) throw err
    if (data?.error) throw new Error(data.error)
    await fetchUsers()
    return data
  }

  async function updateUser(id, updates) {
    const { error: err } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
    if (err) throw err
    await fetchUsers()
  }

  async function deactivateUser(id) {
    await updateUser(id, { active: false })
  }

  return {
    users,
    organisations,
    loading,
    error,
    createUser,
    updateUser,
    deactivateUser,
    refetchUsers: fetchUsers,
    refetchOrgs:  fetchOrgs,
  }
}
