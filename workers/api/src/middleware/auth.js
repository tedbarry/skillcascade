import { query } from '../db.js'

// Cache verified tokens for 60 seconds to avoid hitting Supabase on every request
const tokenCache = new Map()
const CACHE_TTL = 60_000

/**
 * Verify Supabase token by calling Supabase's auth API.
 * This is more secure than local JWT verification because:
 * 1. No JWT secret needed in the Worker
 * 2. Token revocation is respected immediately
 * 3. Supabase handles all token validation logic
 */
export async function authMiddleware(c, next) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing authorization header' }, 401)
  }

  const token = authHeader.slice(7)

  try {
    // Check cache first
    const cached = tokenCache.get(token)
    if (cached && Date.now() < cached.expiresAt) {
      setContext(c, cached.user, cached.profile)
      await next()
      return
    }

    // Verify token with Supabase auth API
    const supabaseUrl = c.env.SUPABASE_URL || 'https://walshlbzxyzqxbbzsrcs.supabase.co'
    const supabaseKey = c.env.SUPABASE_ANON_KEY || 'sb_publishable_oh0bvudMoPjqud7RCZ6X4Q_SXp-R_Wu'

    const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseKey,
      },
    })

    if (!authRes.ok) {
      return c.json({ error: 'Invalid or expired token' }, 401)
    }

    const user = await authRes.json()
    if (!user?.id) {
      return c.json({ error: 'Invalid user' }, 401)
    }

    // Get profile with org info + role permissions from RDS
    const profileResult = await query(c.env,
      `SELECT p.id, p.org_id, p.role, p.display_name, p.is_super_admin, p.role_id,
              r.slug AS role_slug, r.name AS role_name, r.permissions AS role_permissions
       FROM profiles p
       LEFT JOIN roles r ON r.id = p.role_id
       WHERE p.id = $1`,
      [user.id]
    )

    let profile
    if (profileResult.rows.length === 0) {
      // Auto-provision profile for users migrating from Supabase
      // Their auth exists in Supabase but profile hasn't been created in RDS yet
      const meta = user.user_metadata || {}
      const role = meta.role || 'bcba'
      const displayName = meta.display_name || user.email?.split('@')[0] || 'User'

      // Create org if needed
      let orgId = meta.org_id || null
      if (!orgId) {
        const orgResult = await query(c.env,
          "INSERT INTO organizations (name) VALUES ($1) RETURNING id",
          [meta.org_name || `${displayName}'s Practice`]
        )
        orgId = orgResult.rows[0].id
      }

      // Seed org roles if this is a new org
      await query(c.env, "SELECT seed_org_roles($1)", [orgId])

      // Find matching role_id for this user's role
      const roleSlugMap = { admin: 'master_admin', bcba: 'bcba', parent: 'parent' }
      const targetSlug = roleSlugMap[role] || 'bcba'
      const roleResult = await query(c.env,
        "SELECT id FROM roles WHERE org_id = $1 AND slug = $2 LIMIT 1",
        [orgId, targetSlug]
      )
      const roleId = roleResult.rows[0]?.id || null

      // Create profile
      const insertResult = await query(c.env,
        `INSERT INTO profiles (id, org_id, role, display_name, is_super_admin, role_id)
         VALUES ($1, $2, $3, $4, false, $5)
         ON CONFLICT (id) DO NOTHING
         RETURNING id, org_id, role, display_name, is_super_admin, role_id`,
        [user.id, orgId, role, displayName, roleId]
      )
      profile = insertResult.rows[0]
      if (!profile) {
        // Race condition: re-fetch with role join
        const retry = await query(c.env,
          `SELECT p.id, p.org_id, p.role, p.display_name, p.is_super_admin, p.role_id,
                  r.slug AS role_slug, r.name AS role_name, r.permissions AS role_permissions
           FROM profiles p LEFT JOIN roles r ON r.id = p.role_id WHERE p.id = $1`,
          [user.id]
        )
        profile = retry.rows[0]
      }
      if (!profile) {
        return c.json({ error: 'Failed to create user profile' }, 500)
      }
      // VIP/partner accounts — auto-upgrade to super admin + enterprise + clinical
      const VIP_EMAILS = ['joeybcba@supportiveaba.com', 'teddybahary@gmail.com', 'debbieh@supportiveaba.com']
      if (VIP_EMAILS.includes(user.email?.toLowerCase())) {
        await query(c.env, "UPDATE profiles SET is_super_admin = true, role = 'admin' WHERE id = $1", [user.id])
        // Find master_admin role for this org
        const maRole = await query(c.env, "SELECT id FROM roles WHERE org_id = $1 AND slug = 'master_admin' LIMIT 1", [orgId])
        if (maRole.rows[0]) {
          await query(c.env, "UPDATE profiles SET role_id = $1 WHERE id = $2", [maRole.rows[0].id, user.id])
        }
        // Create enterprise + clinical subscription
        await query(c.env,
          `INSERT INTO subscriptions (user_id, plan, status, seats, clinical_access, clinical_plan, clinical_seats)
           VALUES ($1, 'enterprise', 'active', 50, true, 'clinic_enterprise', 50)
           ON CONFLICT (user_id) DO UPDATE SET plan = 'enterprise', status = 'active', seats = 50, clinical_access = true, clinical_plan = 'clinic_enterprise', clinical_seats = 50`,
          [user.id]
        )
        profile.is_super_admin = true
        profile.role = 'admin'
        console.log('VIP account auto-upgraded:', user.email)
      }
      console.log('Auto-provisioned profile for', user.email)
    } else {
      profile = profileResult.rows[0]
    }

    // Cache for 60s
    tokenCache.set(token, {
      user,
      profile,
      expiresAt: Date.now() + CACHE_TTL,
    })

    // Evict old cache entries periodically
    if (tokenCache.size > 100) {
      const now = Date.now()
      for (const [k, v] of tokenCache) {
        if (now > v.expiresAt) tokenCache.delete(k)
      }
    }

    setContext(c, user, profile)
    await next()
  } catch (err) {
    console.error('Auth error:', err.message)
    return c.json({ error: 'Authentication failed' }, 401)
  }
}

function setContext(c, user, profile) {
  c.set('userId', user.id)
  c.set('userEmail', user.email)
  c.set('profile', profile)
  c.set('orgId', profile.org_id)
  c.set('role', profile.role)
  c.set('isSuperAdmin', profile.is_super_admin === true)

  // Parse role permissions if available
  let perms = profile.role_permissions
  if (typeof perms === 'string') {
    try { perms = JSON.parse(perms) } catch { perms = null }
  }
  c.set('permissions', perms || null)
  c.set('roleSlug', profile.role_slug || profile.role)
}

/**
 * Check if a profile has a specific permission.
 * Super admins always return true.
 * Falls back to legacy role field if no role_permissions loaded.
 */
export function hasPermission(profile, category, action) {
  if (profile.is_super_admin) return true

  let perms = profile.role_permissions
  if (typeof perms === 'string') {
    try { perms = JSON.parse(perms) } catch { perms = null }
  }

  if (perms) {
    const cat = perms[category]
    if (!cat) return false
    if (typeof cat === 'boolean') return cat
    return cat[action] === true
  }

  // Legacy fallback
  if (profile.role === 'admin') return true
  if (profile.role === 'bcba') {
    if (['team', 'settings', 'billing'].includes(category)) return false
    return true
  }
  if (profile.role === 'parent') {
    if (action !== 'view') return false
    return ['clients', 'programs', 'sessions'].includes(category)
  }
  return false
}
