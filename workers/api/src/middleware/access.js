import { query } from '../db.js'
import { hasPermission } from './auth.js'

/**
 * Access control helpers — replace Supabase RLS policies.
 * All org-scoped data requires the user to be in the same org.
 * Role-based visibility uses permissions from the roles table.
 */

/**
 * Get client IDs this user can access based on their role.
 * master_admin / admin / super_admin: all clients in their org
 * Others with clients.view: only assigned clients
 * No clients.view permission: empty array
 */
export async function getAccessibleClientIds(env, profile) {
  // Must have clients.view permission
  if (!hasPermission(profile, 'clients', 'view')) return []

  const roleSlug = profile.role_slug || profile.role
  if (profile.is_super_admin || roleSlug === 'master_admin' || profile.role === 'admin') {
    const result = await query(env,
      "SELECT id FROM clients WHERE org_id = $1 AND deleted_at IS NULL",
      [profile.org_id]
    )
    return result.rows.map(r => r.id)
  }

  // All other roles: only assigned clients
  const result = await query(env,
    `SELECT c.id FROM clients c
     JOIN client_assignments ca ON ca.client_id = c.id
     WHERE c.org_id = $1 AND c.deleted_at IS NULL AND ca.user_id = $2`,
    [profile.org_id, profile.id]
  )
  return result.rows.map(r => r.id)
}

/**
 * Check if a user can access a specific client
 */
export async function canAccessClient(env, profile, clientId) {
  const ids = await getAccessibleClientIds(env, profile)
  return ids.includes(clientId)
}

/**
 * Enforce org membership — returns 403 if the resource's org doesn't match
 */
export function requireOrg(profile, resourceOrgId) {
  if (profile.is_super_admin) return true
  return profile.org_id === resourceOrgId
}

/**
 * Enforce admin role (master_admin or legacy admin or super_admin)
 */
export function requireAdmin(profile) {
  if (profile.is_super_admin) return true
  const roleSlug = profile.role_slug || profile.role
  return roleSlug === 'master_admin' || profile.role === 'admin'
}

const CLINICAL_MANAGER_ROLES = new Set(['master_admin', 'admin', 'bcba'])
const ORG_WIDE_SCHEDULE_ROLES = new Set(['master_admin', 'admin', 'scheduling_admin', 'office_staff'])
const SELF_ONLY_SCHEDULE_ROLES = new Set(['rbt'])
const STAFF_AVAILABILITY_MANAGER_ROLES = new Set(['master_admin', 'admin', 'bcba', 'scheduling_admin', 'office_staff'])
const GOAL_LIBRARY_TABLES = new Set(['goal_domains', 'goal_ltgs', 'goal_stgs', 'goal_targets'])
const ROLE_ALIASES = {
  therapist: 'rbt',
  technician: 'rbt',
  qa: 'qa_admin',
}
const SESSION_NOTE_VIEWER_ROLES = new Set(['master_admin', 'admin', 'bcba', 'qa_admin', 'rbt'])
const SESSION_NOTE_CREATOR_ROLES = new Set(['master_admin', 'admin', 'bcba', 'rbt'])
const SESSION_NOTE_EDITOR_ROLES = new Set(['master_admin', 'admin', 'bcba'])
const SESSION_NOTE_REVIEWER_ROLES = new Set(['master_admin', 'admin', 'bcba', 'qa_admin'])
const SESSION_NOTE_APPROVER_ROLES = SESSION_NOTE_REVIEWER_ROLES
const SESSION_NOTE_APPROVAL_REOPEN_ROLES = new Set(['master_admin', 'admin'])

export function normalizeRoleSlug(role) {
  if (!role) return ''
  const normalized = String(role).trim().toLowerCase().replace(/\s+/g, '_')
  return ROLE_ALIASES[normalized] || normalized
}

export function hasClinicalManagerRole(profile) {
  if (profile?.is_super_admin) return true
  const roleSlug = normalizeRoleSlug(profile?.role_slug || profile?.role)
  return CLINICAL_MANAGER_ROLES.has(roleSlug)
}

export function canViewSchedulesOrgWide(profile) {
  if (profile?.is_super_admin) return true
  const roleSlug = normalizeRoleSlug(profile?.role_slug || profile?.role)
  return ORG_WIDE_SCHEDULE_ROLES.has(roleSlug)
}

export function shouldRestrictSchedulesToOwnStaff(profile) {
  if (profile?.is_super_admin) return false
  const roleSlug = normalizeRoleSlug(profile?.role_slug || profile?.role)
  return SELF_ONLY_SCHEDULE_ROLES.has(roleSlug)
}

export function canManageStaffAvailability(profile, targetUserId = profile?.id) {
  if (profile?.is_super_admin) return true
  const roleSlug = normalizeRoleSlug(profile?.role_slug || profile?.role)
  if (STAFF_AVAILABILITY_MANAGER_ROLES.has(roleSlug)) return true
  return roleSlug === 'rbt' && Boolean(targetUserId) && targetUserId === profile?.id
}

export function canManageTeamRecords(profile) {
  if (profile?.is_super_admin) return true
  return requireAdmin(profile) || hasPermission(profile, 'team', 'edit')
}

export function canManageOrganizationSettings(profile) {
  if (profile?.is_super_admin) return true
  return requireAdmin(profile) || hasPermission(profile, 'settings', 'edit')
}

export function canViewSessionNotes(profile) {
  if (profile?.is_super_admin) return true
  return SESSION_NOTE_VIEWER_ROLES.has(normalizeRoleSlug(profile?.role_slug || profile?.role))
}

export function canCreateSessionNoteRecord(profile, note = {}) {
  const roleSlug = normalizeRoleSlug(profile?.role_slug || profile?.role)
  if (!SESSION_NOTE_CREATOR_ROLES.has(roleSlug)) return false
  if (roleSlug !== 'rbt') return true
  return Boolean(note?.staff_id) && note.staff_id === profile?.id
}

export function canEditSessionNoteRecord(profile, note = {}) {
  if (!note || !profile?.id) return false
  if ((note.status || 'draft') !== 'draft') return false

  const roleSlug = normalizeRoleSlug(profile?.role_slug || profile?.role)
  if (SESSION_NOTE_EDITOR_ROLES.has(roleSlug)) return true

  return roleSlug === 'rbt' && note.staff_id === profile.id
}

export function canLinkSessionNoteRecord(profile, note = {}) {
  if (!note || !profile?.id) return false

  const roleSlug = normalizeRoleSlug(profile?.role_slug || profile?.role)
  if (SESSION_NOTE_EDITOR_ROLES.has(roleSlug) || SESSION_NOTE_REVIEWER_ROLES.has(roleSlug)) {
    return true
  }

  return roleSlug === 'rbt' && note.staff_id === profile.id
}

export function canAdvanceSessionNoteStatus(profile, note = {}, nextStatus) {
  if (!note || !profile?.id || !nextStatus) return false

  const roleSlug = normalizeRoleSlug(profile?.role_slug || profile?.role)
  const isOwner = note.staff_id === profile.id

  if (note.status === 'draft' && nextStatus === 'completed') {
    if (roleSlug === 'rbt' && !isOwner) return false
    return SESSION_NOTE_CREATOR_ROLES.has(roleSlug)
  }

  if (note.status === 'completed' && nextStatus === 'draft') {
    if (isOwner && SESSION_NOTE_CREATOR_ROLES.has(roleSlug)) return true
    return SESSION_NOTE_REVIEWER_ROLES.has(roleSlug)
  }

  if (note.status === 'completed' && nextStatus === 'reviewed') {
    return SESSION_NOTE_REVIEWER_ROLES.has(roleSlug)
  }

  if (note.status === 'reviewed' && nextStatus === 'draft') {
    return SESSION_NOTE_APPROVER_ROLES.has(roleSlug)
  }

  if (note.status === 'reviewed' && nextStatus === 'approved') {
    return SESSION_NOTE_APPROVER_ROLES.has(roleSlug)
  }

  if (note.status === 'approved' && nextStatus === 'reviewed') {
    return SESSION_NOTE_APPROVAL_REOPEN_ROLES.has(roleSlug)
  }

  return false
}

/**
 * Check a specific permission — convenience re-export
 */
export { hasPermission }

// ═══════════════════════════════════════════════════════════════
// TABLE → PERMISSION CATEGORY MAPPING
// Maps table names to the permission category + default actions required
// ═══════════════════════════════════════════════════════════════
const TABLE_PERMISSION_MAP = {
  // Client-related
  clients:                    { category: 'clients', select: 'view', insert: 'create', update: 'edit', delete: 'delete' },
  client_assignments:         { category: 'clients', select: 'view', insert: 'edit', update: 'edit', delete: 'edit' },
  client_programs:            { category: 'programs', select: 'view', insert: 'edit', update: 'edit', delete: 'edit' },
  client_targets:             { category: 'programs', select: 'view', insert: 'edit', update: 'edit', delete: 'edit' },

  // Sessions
  sessions:                   { category: 'sessions', select: 'view', insert: 'edit', update: 'edit', delete: 'edit' },
  session_data:               { category: 'sessions', select: 'view', insert: 'run', update: 'run', delete: 'edit' },
  session_runs:               { category: 'sessions', select: 'view', insert: 'run', update: 'run', delete: 'edit' },
  session_programs:           { category: 'sessions', select: 'view', insert: 'edit', update: 'edit', delete: 'edit' },

  // Scheduling
  schedule_templates:         { category: 'scheduling', select: 'view', insert: 'edit', update: 'edit', delete: 'edit' },
  schedule_exceptions:        { category: 'scheduling', select: 'view', insert: 'edit', update: 'edit', delete: 'edit' },

  // Billing
  authorizations:             { category: 'billing', select: 'view', insert: 'edit', update: 'edit', delete: 'edit' },
  subscriptions:              { category: null }, // User-scoped, no category check needed

  // Reports
  reports:                    { category: 'reports', select: 'view', insert: 'edit', update: 'edit', delete: 'edit' },
  auth_reports:               { category: 'reports', select: 'view', insert: 'edit', update: 'edit', delete: 'edit' },

  // Goals
  // Shared library reads stay open; authoring is handled in checkTablePermission().
  goal_domains:               { category: null },
  goal_ltgs:                  { category: null },
  goal_stgs:                  { category: null },
  goal_targets:               { category: null },
  goal_favorites:             { category: null }, // User-scoped

  // Clinical
  clinical_insights:          { category: 'clinical', select: 'access', insert: 'access', update: 'access', delete: 'access' },
  skill_working_estimates:    { category: 'clinical', select: 'access', insert: 'access', update: 'access', delete: 'access' },

  // Team
  profiles:                   { category: null }, // Handled by org scoping
  invite_tokens:              { category: 'team', select: 'view', insert: 'edit', update: 'edit', delete: 'edit' },

  // Settings / org
  organizations:              { category: null }, // Org-self scoped
  program_labels:             { category: 'programs', select: 'view', insert: 'edit', update: 'edit', delete: 'edit' },
  program_label_assignments:  { category: 'programs', select: 'view', insert: 'edit', update: 'edit', delete: 'edit' },
  program_phase_log:          { category: 'programs', select: 'view', insert: 'edit', update: 'edit', delete: 'edit' },

  // AI
  ai_chats:                   { category: 'ai', select: 'use', insert: 'use', update: 'use', delete: 'use' },

  // No permission gating
  user_settings:              { category: null },
  usage_sessions:             { category: null },
  usage_events:               { category: null },
  audit_log:                  { category: null },
  messages:                   { category: null },
  snapshots:                  { category: null },
  contact_submissions:        { category: null },

  // Roles table
  roles:                      { category: 'team', select: 'view', insert: 'edit', update: 'edit', delete: 'edit' },
}

/**
 * Check if a user has permission for a specific table operation.
 * Returns true if allowed, false if blocked.
 * Tables with category: null skip permission checks (handled by scope).
 */
export function checkTablePermission(profile, table, operation) {
  if (table === 'client_files' || table === 'client_contacts') {
    if (operation === 'select') return true
    return hasClinicalManagerRole(profile)
  }

  if (table === 'organizations') {
    if (operation === 'select') return true
    return canManageOrganizationSettings(profile)
  }

  if (GOAL_LIBRARY_TABLES.has(table)) {
    if (operation === 'select') return true
    return hasPermission(profile, 'goals', 'edit')
  }

  const mapping = TABLE_PERMISSION_MAP[table]
  if (!mapping || !mapping.category) return true // No permission mapping = allowed (scope handles it)

  const action = mapping[operation] || 'view'
  return hasPermission(profile, mapping.category, action)
}
