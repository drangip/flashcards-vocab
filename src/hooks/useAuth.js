import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Returns { session, user, loading, signInWithGoogle, signOut }
 * session: Supabase session object or null
 * user: auth.users row or null
 * loading: true until the initial session is resolved
 */
export function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return {
    session,
    user: session?.user ?? null,
    loading,
    signInWithGoogle,
    signOut,
  }
}
