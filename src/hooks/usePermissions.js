import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { api } from '../lib/api.js'

/**
 * Permission categories and their actions:
 *   clients: view, edit, create, delete
 *   scheduling: view, edit
 *   billing: view, edit
 *   reports: view, edit, finalize
 *   programs: view, edit
 *   sessions: view, edit, run
 *   goals: view, edit
 *   team: view, edit
 *   settings: view, edit
 *   ai: use
 *   clinical: access
 */

// Default permissions for known role slugs (used as fallback before role loads)
const ROLE_DEFAULTS = {
  master_admin: () => true,
  admin: () => true,
}

/**
 * usePermissions — loads the user's role and permissions from the roles table.
 * Returns { can(category, action), role, permissions, loading }
 */
export default function usePermissions() {
  const { profile } = useAuth()
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.role_id) {
      // No role_id assigned — fall back to legacy role field
      setRole(null)
      setLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await api
          .from('roles')
          .select('id, name, slug, permissions, is_system')
          .eq('id', profile.role_id)
          .single()
        if (!cancelled && !error && data) {
          setRole(data)
        }
      } catch {
        // Silent — will fall back to legacy
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [profile?.role_id])

  const permissions = useMemo(() => {
    if (role?.permissions && typeof role.permissions === 'object') {
      return role.permissions
    }
    return null
  }, [role])

  /**
   * can(category, action) — check if user has permission.
   * Super admins always return true.
   * If no role loaded, falls back to legacy role field.
   */
  const can = useCallback((category, action) => {
    if (!profile) return false

    // Super admins bypass all checks
    if (profile.is_super_admin) return true

    // If we have loaded role permissions, use them
    if (permissions) {
      const cat = permissions[category]
      if (!cat) return false
      // For single-action categories like ai.use or clinical.access
      if (typeof cat === 'boolean') return cat
      return cat[action] === true
    }

    // Legacy fallback: admin role = full access, bcba = most access, parent = view only
    const legacyRole = profile.role
    if (legacyRole === 'admin') return true
    if (legacyRole === 'bcba') {
      // BCBAs can do most things except team/settings/billing
      if (['team', 'settings', 'billing'].includes(category)) return false
      return true
    }
    if (legacyRole === 'parent') {
      // Parents can only view clients, programs, sessions
      if (action !== 'view') return false
      return ['clients', 'programs', 'sessions'].includes(category)
    }
    return false
  }, [profile, permissions])

  /**
   * canAny(category) — check if user has any action for a category
   */
  const canAny = useCallback((category) => {
    if (!profile) return false
    if (profile.is_super_admin) return true
    if (permissions) {
      const cat = permissions[category]
      if (!cat) return false
      if (typeof cat === 'boolean') return cat
      return Object.values(cat).some(v => v === true)
    }
    // Legacy fallback
    return can(category, 'view')
  }, [profile, permissions, can])

  return {
    can,
    canAny,
    role,
    permissions,
    loading,
    roleSlug: role?.slug || profile?.role || null,
    roleName: role?.name || profile?.role || null,
  }
}
