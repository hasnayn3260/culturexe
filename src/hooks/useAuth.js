import { useState, useEffect } from 'react'
import supabase from '../lib/supabaseClient'

export function useAuth() {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [role, setRole]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // If there is no session, stop loading immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session)

        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          console.log('Profile fetched:', profile)

          setUser(session.user)
          setProfile(profile)
          setRole(profile?.role || null)
        } else {
          setUser(null)
          setProfile(null)
          setRole(null)
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signInWithMagicLink(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: window.location.origin,
      },
    })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setRole(null)
  }

  return {
    user,
    profile,
    role,
    loading,
    signIn,
    signInWithMagicLink,
    signOut,
  }
}
