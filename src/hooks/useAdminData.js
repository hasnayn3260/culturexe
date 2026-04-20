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
        .select('*, organisations(id, name)')
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

  async function createUser(userData) {
    const { data: { session } } = await supabase.auth.getSession()

    const response = await fetch(
      import.meta.env.VITE_SUPABASE_URL + '/functions/v1/create-user',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session.access_token,
        },
        body: JSON.stringify(userData),
      }
    )

    const result = await response.json()
    if (!response.ok) throw new Error(result.error)
    await fetchUsers()
    return result
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
