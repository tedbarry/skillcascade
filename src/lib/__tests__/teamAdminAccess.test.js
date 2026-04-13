import { describe, expect, it } from 'vitest'
import { buildTeamAdminAccess } from '../teamAdminAccess.js'

describe('buildTeamAdminAccess', () => {
  it('keeps master-admin role tools restricted away from specialized admin roles', () => {
    expect(buildTeamAdminAccess({
      profile: { role_id: 'role_scheduling', role: 'admin', is_super_admin: false },
      roleSlug: 'scheduling_admin',
      canEditTeam: true,
    })).toMatchObject({
      canManageTeam: true,
      canManageOrgRoles: false,
    })
  })

  it('allows org-role management for actual master admins and legacy admins without role ids', () => {
    expect(buildTeamAdminAccess({
      profile: { role_id: 'role_master', role: 'admin', is_super_admin: false },
      roleSlug: 'master_admin',
      canEditTeam: true,
    }).canManageOrgRoles).toBe(true)

    expect(buildTeamAdminAccess({
      profile: { role_id: null, role: 'admin', is_super_admin: false },
      roleSlug: 'admin',
      canEditTeam: true,
    }).canManageOrgRoles).toBe(true)
  })
})
