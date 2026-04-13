import { normalizeRoleSlug } from './sessionNoteWorkflow.js'

const CLINICAL_MANAGER_ROLES = new Set(['master_admin', 'admin', 'bcba'])
const SCHEDULE_MANAGER_ROLES = new Set(['master_admin', 'admin', 'bcba', 'scheduling_admin', 'office_staff'])
const STAFF_SELF_SERVICE_ROLES = new Set(['rbt'])

export function getRoleSlugFromProfile(profile) {
  if (profile?.is_super_admin) return 'master_admin'
  return normalizeRoleSlug(profile?.role)
}

export function canManageSchedules(role) {
  return SCHEDULE_MANAGER_ROLES.has(normalizeRoleSlug(role))
}

export function canManageStaffAvailability(role) {
  const roleSlug = normalizeRoleSlug(role)
  return SCHEDULE_MANAGER_ROLES.has(roleSlug) || STAFF_SELF_SERVICE_ROLES.has(roleSlug)
}

export function canManageAuthorizations(role) {
  return CLINICAL_MANAGER_ROLES.has(normalizeRoleSlug(role))
}

export function canManageClientContacts(role) {
  return CLINICAL_MANAGER_ROLES.has(normalizeRoleSlug(role))
}

export function canManageClientFiles(role) {
  return CLINICAL_MANAGER_ROLES.has(normalizeRoleSlug(role))
}
