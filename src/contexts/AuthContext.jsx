import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { api } from '../lib/api.js'
import { initAnalytics, identify as identifyUser, endSession } from '../lib/analytics.js'

const AuthContext = createContext(null)

const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes — security session timeout

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
    const { data, error } = await api
      .from('profiles')
      .select('id, org_id, role, display_name, is_super_admin, role_id, encrypted_master_key, kek_salt, kek_iv, recovery_phrase_hash, encryption_version, created_at')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Failed to fetch profile:', error.message)
      return null
    }

    // Fetch organization separately if profile has an org_id
    if (data?.org_id) {
      const { data: org } = await api
        .from('organizations')
        .select('id, name, branding')
        .eq('id', data.org_id)
        .single()
      if (org) data.organizations = org
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

  // Initialize analytics on mount
  useEffect(() => { initAnalytics() }, [])

  // Fetch profile on mount if we have a user (background, non-blocking)
  useEffect(() => {
    if (user) {
      fetchProfile(user.id).then((p) => {
        setProfile(p)
        if (p) identifyUser(user, { role: p.role, org_id: p.org_id, plan: p.is_super_admin ? 'enterprise' : 'free' })
      }).catch(() => setProfile(null))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen to auth state changes — handles token refresh, sign-in, sign-out.
  // NOT used for initial session restore (that's handled synchronously above).
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          endSession()
          setUser(null)
          setProfile(null)
        } else if (session?.user) {
          setUser(session.user)
          // Fetch profile in background on sign-in or token refresh
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            fetchProfile(session.user.id).then((p) => {
              setProfile(p)
              if (p && event === 'SIGNED_IN') {
                identifyUser(session.user, { role: p.role, org_id: p.org_id, plan: p.is_super_admin ? 'enterprise' : 'free' })
              }
            }).catch(() => setProfile(null))
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

    // AWS-first + BAA is the active compliance path.
    // Browser encryption setup is no longer part of login.

    // Audit login
    await api.from('audit_log').insert({
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

  const signOut = useCallback(async (options = {}) => {
    const { skipAudit = false, skipSessionEnd = false } = options

    if (!skipSessionEnd) {
      await endSession()
    }
    if (user && !skipAudit) {
      await api.from('audit_log').insert({
        user_id: user.id,
        action: 'logout',
        resource_type: 'session',
      })
    }
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [user])

  const isSuperAdmin = profile?.is_super_admin === true
  const isAdmin = isSuperAdmin || profile?.role === 'admin'

  const value = {
    user,
    profile,
    loading,
    isSuperAdmin,
    isAdmin,
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
