import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes — HIPAA session timeout

/**
 * Read the Supabase session from localStorage synchronously.
 * This runs BEFORE React's first render, so ProtectedRoute never
 * flashes a redirect to /login when a valid session exists.
 */
function getStoredUser() {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL
    if (!url) return null
    const ref = new URL(url).hostname.split('.')[0]
    const key = `sb-${ref}-auth-token`
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.user ?? null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  // Sync init from localStorage — no async, no race conditions
  const [user, setUser] = useState(getStoredUser)
  const [profile, setProfile] = useState(null)
  // If we found a user in localStorage, skip loading entirely
  const [loading, setLoading] = useState(() => !getStoredUser())
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

  // Fetch profile on mount if we have a user (background, non-blocking)
  useEffect(() => {
    if (user) {
      fetchProfile(user.id).then(setProfile).catch(() => setProfile(null))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen to auth state changes — handles token refresh, sign-in, sign-out.
  // NOT used for initial session restore (that's handled synchronously above).
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
        } else if (session?.user) {
          setUser(session.user)
          // Fetch profile in background on sign-in or token refresh
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            fetchProfile(session.user.id).then(setProfile).catch(() => setProfile(null))
          }
        }
        // Always ensure loading is resolved
        setLoading(false)
      }
    )

    // Safety timeout — in case onAuthStateChange never fires (shouldn't happen)
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 5000)

    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
  }, [fetchProfile])

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
