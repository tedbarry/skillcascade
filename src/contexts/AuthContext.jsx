import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes — HIPAA session timeout

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const inactivityTimer = useRef(null)

  // Fetch profile from profiles table
  const fetchProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, organizations(id, name, branding)')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Failed to fetch profile:', error.message)
      return null
    }
    return data
  }, [])

  // Session timeout — auto-logout after 30 min inactivity
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    inactivityTimer.current = setTimeout(() => {
      signOut()
    }, INACTIVITY_TIMEOUT)
  }, [])

  useEffect(() => {
    if (!user) return
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((evt) => window.addEventListener(evt, resetInactivityTimer))
    resetInactivityTimer()
    return () => {
      events.forEach((evt) => window.removeEventListener(evt, resetInactivityTimer))
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    }
  }, [user, resetInactivityTimer])

  // Sync settings from Supabase to localStorage on login (e.g. AI API key)
  useEffect(() => {
    if (!user) return
    supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (!data?.settings) return
        const { ai_api_key } = data.settings
        if (ai_api_key) {
          localStorage.setItem('skillcascade_ai_api_key', ai_api_key)
        }
      })
  }, [user])

  // Load profile in the background — never blocks the auth loading gate
  const loadProfile = useCallback((userId) => {
    fetchProfile(userId).then(setProfile).catch(() => setProfile(null))
  }, [fetchProfile])

  // Restore session via onAuthStateChange — the reliable path in Supabase v2.
  // IMPORTANT: setUser + setLoading must be synchronous (no awaits before them)
  // so ProtectedRoute resolves immediately once the session is known.
  useEffect(() => {
    // Safety timeout — never hang on the loading spinner
    const timeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) console.warn('Auth loading timed out after 8s')
        return false
      })
    }, 8000)

    let initialResolved = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'INITIAL_SESSION') {
          // First event on page load — resolve loading immediately
          if (session?.user) {
            setUser(session.user)
            loadProfile(session.user.id)
          }
          clearTimeout(timeout)
          setLoading(false)
          initialResolved = true
        } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          setUser(session.user)
          loadProfile(session.user.id)
          // If INITIAL_SESSION never fired, resolve loading here
          if (!initialResolved) {
            clearTimeout(timeout)
            setLoading(false)
            initialResolved = true
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
        }
      }
    )

    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
  }, [loadProfile])

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    // Audit login
    await supabase.from('audit_log').insert({
      user_id: data.user.id,
      action: 'login',
      resource_type: 'session',
      metadata: { method: 'password' },
    })

    return data
  }, [])

  const signUp = useCallback(async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata, // display_name, role, org_id
      },
    })
    if (error) throw error
    return data
  }, [])

  const signOut = useCallback(async () => {
    if (user) {
      await supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'logout',
        resource_type: 'session',
      })
    }
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [user])

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
