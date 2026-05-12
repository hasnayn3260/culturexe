import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession:    true,   // keep session in localStorage across page loads
      autoRefreshToken:  true,   // silently refresh JWT before it expires
      detectSessionInUrl: true,  // handle magic link tokens in the URL
    },
  }
)

export default supabase
