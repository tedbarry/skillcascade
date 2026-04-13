import {
  canManageAuthorizations,
  canManageClientContacts,
  canManageClientFiles,
  canManageSchedules,
  canManageStaffAvailability,
  getRoleSlugFromProfile,
} from '../clinicalPermissions.js'

describe('clinicalPermissions', () => {
  it('normalizes profile roles and honors super admins', () => {
    expect(getRoleSlugFromProfile({ role: 'Therapist' })).toBe('rbt')
    expect(getRoleSlugFromProfile({ role: 'admin', is_super_admin: true })).toBe('master_admin')
  })

  it('allows supervisory clinical roles to manage protected workflows', () => {
    expect(canManageSchedules('bcba')).toBe(true)
    expect(canManageSchedules('scheduling_admin')).toBe(true)
    expect(canManageAuthorizations('admin')).toBe(true)
    expect(canManageClientContacts('master_admin')).toBe(true)
    expect(canManageClientFiles('bcba')).toBe(true)
    expect(canManageStaffAvailability('rbt')).toBe(true)
  })

  it('keeps therapist and QA roles read only for protected workflows', () => {
    expect(canManageSchedules('rbt')).toBe(false)
    expect(canManageAuthorizations('qa_admin')).toBe(false)
    expect(canManageClientContacts('therapist')).toBe(false)
    expect(canManageClientFiles('qa')).toBe(false)
  })
})
