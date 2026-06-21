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
        .maybeSingle()
      setUser(authUser)
      setProfile(data)
      setRole(data?.role || null)
    } catch {
      setUser(authUser)
      setProfile(null)
      setRole(null)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadProfile(session?.user ?? null).finally(() => setLoading(false))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'INITIAL_SESSION') return
        loadProfile(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [loadProfile])

  async function signIn(emailOrUsername, password) {
    let email = emailOrUsername
    if (!emailOrUsername.includes('@')) {
      // Treat as username — look up the email
      const { data: profile, error: lookupError } = await supabase
        .from('profiles')
        .select('email')
        .ilike('username', emailOrUsername)
        .maybeSingle()
      if (lookupError || !profile) throw new Error('No account found with that username.')
      email = profile.email
    }
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

  async function signUp(email, password, fullName, jobTitle = '', role = 'client', username = '', position = '') {
    // Self-service sign-up may NEVER mint a privileged account. Even though the
    // database trigger (handle_new_user) clamps this server-side, we also clamp
    // here so the public client can only ever request a non-privileged role.
    // Consultant / superadmin accounts are created exclusively via the
    // superadmin-gated create-user Edge Function.
    const safeRole = role === 'employee' ? 'employee' : 'client'
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, job_title: jobTitle, role: safeRole, username, position },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      throw new Error('An account with this email already exists. Please sign in instead.')
    }
    return data
  }

  async function updateProfile(updates) {
    if (!user) throw new Error('Not authenticated')
    // Privilege-sensitive columns can never be changed by the user editing their
    // own profile. These are owned by superadmins (via the create-user Edge
    // Function / admin tools) and enforced again by RLS + a DB trigger.
    // Stripping them here is defence-in-depth so the UI never even attempts it.
    const { role, org_id, active, id, email, ...safeUpdates } = updates || {}
    void role; void org_id; void active; void id; void email
    const { data, error } = await supabase
      .from('profiles').update(safeUpdates).eq('id', user.id).select().single()
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
