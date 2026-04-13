export function buildTeamAdminAccess({
  profile = null,
  roleSlug = null,
  canEditTeam = false,
} = {}) {
  const normalizedRoleSlug = typeof roleSlug === 'string' ? roleSlug.trim().toLowerCase() : null
  const isSuperAdmin = profile?.is_super_admin === true
  const hasLegacyAdminFallback = !profile?.role_id && normalizedRoleSlug === 'admin'
  const canManageOrgRoles = Boolean(isSuperAdmin || normalizedRoleSlug === 'master_admin' || hasLegacyAdminFallback)

  return {
    canManageTeam: Boolean(canEditTeam || canManageOrgRoles),
    canManageOrgRoles,
  }
}
