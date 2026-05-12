import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import supabase from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [role, setRole]       = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setUser(null); setProfile(null); setRole(null)
      return
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()
      setUser(authUser)
      setProfile(data)
      setRole(data?.role || null)
    } catch {
      // profile table unreachable — keep user set so they're not force-logged-out
      setUser(authUser)
      setProfile(null)
      setRole(null)
    }
  }, [])

  useEffect(() => {
    // Fire once on mount to hydrate state from existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadProfile(session?.user ?? null).finally(() => setLoading(false))
    })

    // Keep state in sync when token refreshes, user signs in/out in another tab, etc.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // INITIAL_SESSION is already handled by getSession above — skip to avoid double fetch
        if (event === 'INITIAL_SESSION') return
        loadProfile(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [loadProfile])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signInWithMagicLink(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
    })
    if (error) throw error
  }

  async function signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // full_name is read by the handle_new_user() DB trigger
        data: { full_name: fullName },
      },
    })
    if (error) throw error
    return data
  }

  async function updateProfile(updates) {
    if (!user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('profiles').update(updates).eq('id', user.id).select().single()
    if (error) throw error
    setProfile(data)
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null); setProfile(null); setRole(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, signIn, signInWithMagicLink, signUp, updateProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
