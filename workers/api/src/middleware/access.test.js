import {
  normalizeRoleSlug,
  canViewSessionNotes,
  canCreateSessionNoteRecord,
  canEditSessionNoteRecord,
  canLinkSessionNoteRecord,
  canAdvanceSessionNoteStatus,
  canViewSchedulesOrgWide,
  shouldRestrictSchedulesToOwnStaff,
  canManageStaffAvailability,
  canManageOrganizationSettings,
  canManageTeamRecords,
  checkTablePermission,
} from './access.js'

describe('worker session note access helpers', () => {
  const ownerProfile = { id: 'user-1', role_slug: 'rbt' }
  const bcbaProfile = { id: 'user-2', role_slug: 'bcba', role: 'bcba' }
  const qaProfile = { id: 'user-3', role_slug: 'qa_admin' }
  const parentProfile = { id: 'user-4', role_slug: 'parent' }

  it('normalizes legacy role aliases the same way as the frontend workflow', () => {
    expect(normalizeRoleSlug('Therapist')).toBe('rbt')
    expect(normalizeRoleSlug('QA')).toBe('qa_admin')
  })

  it('blocks non-clinical viewers from the session note workspace', () => {
    expect(canViewSessionNotes(parentProfile)).toBe(false)
    expect(canViewSessionNotes(ownerProfile)).toBe(true)
    expect(canViewSessionNotes(qaProfile)).toBe(true)
  })

  it('lets RBTs create, edit, and link only their own draft notes', () => {
    const ownDraftNote = { staff_id: 'user-1', status: 'draft' }
    const ownCompletedNote = { staff_id: 'user-1', status: 'completed' }
    const otherDraftNote = { staff_id: 'user-9', status: 'draft' }

    expect(canCreateSessionNoteRecord(ownerProfile, ownDraftNote)).toBe(true)
    expect(canCreateSessionNoteRecord(ownerProfile, otherDraftNote)).toBe(false)
    expect(canEditSessionNoteRecord(ownerProfile, ownDraftNote)).toBe(true)
    expect(canEditSessionNoteRecord(ownerProfile, ownCompletedNote)).toBe(false)
    expect(canEditSessionNoteRecord(ownerProfile, otherDraftNote)).toBe(false)
    expect(canLinkSessionNoteRecord(ownerProfile, ownDraftNote)).toBe(true)
    expect(canLinkSessionNoteRecord(ownerProfile, otherDraftNote)).toBe(false)
  })

  it('locks approved notes against direct editing while still allowing managers to link them', () => {
    const approvedNote = { staff_id: 'user-1', status: 'approved' }

    expect(canEditSessionNoteRecord(bcbaProfile, approvedNote)).toBe(false)
    expect(canLinkSessionNoteRecord(bcbaProfile, approvedNote)).toBe(true)
    expect(canLinkSessionNoteRecord(qaProfile, approvedNote)).toBe(true)
  })

  it('enforces the draft -> completed -> reviewed -> approved chain with controlled reopen paths server-side', () => {
    const draftNote = { staff_id: 'user-1', status: 'draft' }
    const completedNote = { staff_id: 'user-1', status: 'completed' }
    const reviewedNote = { staff_id: 'user-1', status: 'reviewed' }
    const approvedNote = { staff_id: 'user-1', status: 'approved' }

    expect(canAdvanceSessionNoteStatus(ownerProfile, draftNote, 'completed')).toBe(true)
    expect(canAdvanceSessionNoteStatus(ownerProfile, completedNote, 'draft')).toBe(true)
    expect(canAdvanceSessionNoteStatus(ownerProfile, completedNote, 'reviewed')).toBe(false)
    expect(canAdvanceSessionNoteStatus(bcbaProfile, completedNote, 'reviewed')).toBe(true)
    expect(canAdvanceSessionNoteStatus(bcbaProfile, reviewedNote, 'draft')).toBe(true)
    expect(canAdvanceSessionNoteStatus(qaProfile, reviewedNote, 'approved')).toBe(true)
    expect(canAdvanceSessionNoteStatus(qaProfile, reviewedNote, 'draft')).toBe(true)
    expect(canAdvanceSessionNoteStatus(qaProfile, approvedNote, 'reviewed')).toBe(false)
    expect(canAdvanceSessionNoteStatus({ id: 'user-5', role_slug: 'admin' }, approvedNote, 'reviewed')).toBe(true)
    expect(canAdvanceSessionNoteStatus(parentProfile, reviewedNote, 'approved')).toBe(false)
  })

  it('keeps goal library reads open while restricting authoring to goal editors', () => {
    const rbtProfile = { id: 'user-5', role: 'rbt' }

    expect(checkTablePermission(parentProfile, 'goal_stgs', 'select')).toBe(true)
    expect(checkTablePermission(rbtProfile, 'goal_stgs', 'select')).toBe(true)
    expect(checkTablePermission(rbtProfile, 'goal_stgs', 'insert')).toBe(false)
    expect(checkTablePermission(bcbaProfile, 'goal_stgs', 'insert')).toBe(true)
  })

  it('keeps schedule visibility aligned with real role expectations', () => {
    const schedulingAdmin = { id: 'user-6', role_slug: 'scheduling_admin' }
    const officeStaff = { id: 'user-7', role_slug: 'office_staff' }

    expect(canViewSchedulesOrgWide(bcbaProfile)).toBe(false)
    expect(canViewSchedulesOrgWide(ownerProfile)).toBe(false)
    expect(canViewSchedulesOrgWide(schedulingAdmin)).toBe(true)
    expect(canViewSchedulesOrgWide(officeStaff)).toBe(true)
    expect(shouldRestrictSchedulesToOwnStaff(ownerProfile)).toBe(true)
    expect(shouldRestrictSchedulesToOwnStaff(bcbaProfile)).toBe(false)
  })

  it('allows schedule managers org-wide staff availability access while keeping therapist self-service scoped', () => {
    const schedulingAdmin = { id: 'user-6', role_slug: 'scheduling_admin' }

    expect(canManageStaffAvailability(bcbaProfile, 'user-9')).toBe(true)
    expect(canManageStaffAvailability(schedulingAdmin, 'user-9')).toBe(true)
    expect(canManageStaffAvailability(ownerProfile, 'user-1')).toBe(true)
    expect(canManageStaffAvailability(ownerProfile, 'user-9')).toBe(false)
  })

  it('treats org settings and team records as explicit management permissions', () => {
    const settingsManager = {
      id: 'user-8',
      role_slug: 'ops_admin',
      role_permissions: {
        settings: { edit: true },
        team: { edit: true },
      },
    }

    expect(canManageOrganizationSettings(parentProfile)).toBe(false)
    expect(canManageTeamRecords(parentProfile)).toBe(false)
    expect(canManageOrganizationSettings(settingsManager)).toBe(true)
    expect(canManageTeamRecords(settingsManager)).toBe(true)
    expect(checkTablePermission(settingsManager, 'organizations', 'update')).toBe(true)
    expect(checkTablePermission(parentProfile, 'organizations', 'update')).toBe(false)
  })

  it('keeps client creation and deletion behind explicit client permissions', () => {
    const clientManager = {
      id: 'user-9',
      role_slug: 'client_manager',
      role_permissions: {
        clients: { view: true, create: true, edit: true, delete: true },
      },
    }

    expect(checkTablePermission(parentProfile, 'clients', 'insert')).toBe(false)
    expect(checkTablePermission(parentProfile, 'clients', 'delete')).toBe(false)
    expect(checkTablePermission(clientManager, 'clients', 'insert')).toBe(true)
    expect(checkTablePermission(clientManager, 'clients', 'delete')).toBe(true)
  })
})
