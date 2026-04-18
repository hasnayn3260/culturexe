import { useState, useEffect } from 'react'
import supabase from '../lib/supabaseClient'

export function useAuth() {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('[useAuth] profile fetch error:', error.message, error)
        setProfile(null)
        return
      }

      console.log('[useAuth] profile fetched:', data)
      setProfile(data ?? null)
    } catch (e) {
      console.error('[useAuth] profile fetch exception:', e)
      setProfile(null)
    }
  }

  useEffect(() => {
    let mounted = true

    // onAuthStateChange fires INITIAL_SESSION immediately on setup —
    // no need for a separate getSession() call which would race with it.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        console.log('[useAuth] auth event:', event, '|', session?.user?.email ?? 'no user')

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          await fetchProfile(currentUser.id)
        } else {
          setProfile(null)
        }

        if (mounted) setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.error('[useAuth] signIn error:', error.message, error)
      throw error
    }
    console.log('[useAuth] signed in, user:', data.user?.email)
    return data
  }

  async function signInWithMagicLink(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })
    if (error) {
      console.error('[useAuth] magic link error:', error.message, error)
      throw error
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return {
    user,
    profile,
    role: profile?.role ?? null,
    loading,
    signIn,
    signInWithMagicLink,
    signOut,
  }
}
