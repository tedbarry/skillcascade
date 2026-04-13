import {
  canBatchApproveSessionNotes,
  canCreateSessionNote,
  canCreateSessionNoteForSession,
  canEditSessionNote,
  canSelectSessionNoteForBatchApproval,
  getDefaultSessionNoteWorkflowLane,
  getSessionNoteHistoryEntry,
  getLinkedSessionStatusForNoteStatus,
  getSessionNoteCompletionIssues,
  getSessionNoteRestriction,
  getSessionNoteWorkflowLane,
  getSessionNoteWorkflowAction,
  getSessionNoteWorkflowReturnAction,
  normalizeRoleSlug,
  parseSessionNoteHistoryMetadata,
} from '../sessionNoteWorkflow.js'

describe('sessionNoteWorkflow', () => {
  const ownerId = 'user-1'
  const otherId = 'user-2'

  it('normalizes role aliases', () => {
    expect(normalizeRoleSlug('Therapist')).toBe('rbt')
    expect(normalizeRoleSlug('QA')).toBe('qa_admin')
  })

  it('allows RBTs to create and complete their own draft notes', () => {
    const note = { staff_id: ownerId, status: 'draft' }
    const ownSession = { staff_id: ownerId }

    expect(canCreateSessionNote('rbt')).toBe(true)
    expect(canCreateSessionNoteForSession(ownSession, { roleSlug: 'rbt', userId: ownerId })).toBe(true)
    expect(canEditSessionNote(note, { roleSlug: 'rbt', userId: ownerId })).toBe(true)
    expect(getSessionNoteWorkflowAction(note, { roleSlug: 'rbt', userId: ownerId })).toMatchObject({
      status: 'completed',
      label: 'Mark as Completed',
      requiresAttestation: true,
    })
  })

  it('prevents RBTs from editing another therapist note or reviewing notes', () => {
    const otherTherapistNote = { staff_id: otherId, status: 'draft' }
    const completedNote = { staff_id: ownerId, status: 'completed' }
    const otherSession = { staff_id: otherId }

    expect(canCreateSessionNoteForSession(otherSession, { roleSlug: 'rbt', userId: ownerId })).toBe(false)
    expect(canEditSessionNote(otherTherapistNote, { roleSlug: 'rbt', userId: ownerId })).toBe(false)
    expect(canEditSessionNote(completedNote, { roleSlug: 'rbt', userId: ownerId })).toBe(false)
    expect(getSessionNoteWorkflowAction(completedNote, { roleSlug: 'rbt', userId: ownerId })).toBeNull()
    expect(getSessionNoteWorkflowReturnAction(completedNote, { roleSlug: 'rbt', userId: ownerId })).toEqual({
      status: 'draft',
      label: 'Reopen Draft',
      requiresReason: true,
      reasonLabel: 'Document why this completed note is being reopened.',
    })
    expect(getSessionNoteRestriction(otherTherapistNote, { roleSlug: 'rbt', userId: ownerId })).toMatch(/only edit their own notes/i)
  })

  it('lets supervisors create notes for any session while blocking QA from drafting', () => {
    const session = { staff_id: otherId }

    expect(canCreateSessionNoteForSession(session, { roleSlug: 'bcba', userId: ownerId })).toBe(true)
    expect(canCreateSessionNoteForSession(session, { roleSlug: 'admin', userId: ownerId })).toBe(true)
    expect(canCreateSessionNoteForSession(session, { roleSlug: 'qa_admin', userId: ownerId })).toBe(false)
  })

  it('allows BCBAs to review notes and send locked notes back for therapist revision', () => {
    const completedNote = { staff_id: otherId, status: 'completed' }
    const reviewedNote = { staff_id: otherId, status: 'reviewed' }

    expect(canEditSessionNote(completedNote, { roleSlug: 'bcba', userId: ownerId })).toBe(false)
    expect(getSessionNoteWorkflowAction(completedNote, { roleSlug: 'bcba', userId: ownerId })).toMatchObject({
      status: 'reviewed',
      label: 'Mark as Reviewed',
      requiresAttestation: true,
    })
    expect(getSessionNoteWorkflowReturnAction(completedNote, { roleSlug: 'bcba', userId: ownerId })).toEqual({
      status: 'draft',
      label: 'Return to Therapist',
      requiresReason: true,
      reasonLabel: 'Document what needs to change before this note can move forward.',
    })
    expect(getSessionNoteWorkflowAction(reviewedNote, { roleSlug: 'bcba', userId: ownerId })).toMatchObject({
      status: 'approved',
      label: 'Mark as Approved',
      requiresAttestation: true,
    })
    expect(getSessionNoteWorkflowReturnAction(reviewedNote, { roleSlug: 'bcba', userId: ownerId })).toEqual({
      status: 'draft',
      label: 'Return to Therapist',
      requiresReason: true,
      reasonLabel: 'Document what needs to change before this note can move forward.',
    })
  })

  it('lets QA admins approve reviewed notes without editing them', () => {
    const reviewedNote = { staff_id: otherId, status: 'reviewed' }

    expect(canEditSessionNote(reviewedNote, { roleSlug: 'qa_admin', userId: ownerId })).toBe(false)
    expect(canBatchApproveSessionNotes('qa_admin')).toBe(true)
    expect(canSelectSessionNoteForBatchApproval(reviewedNote, { roleSlug: 'qa_admin' })).toBe(true)
    expect(getSessionNoteWorkflowAction(reviewedNote, { roleSlug: 'qa_admin', userId: ownerId })).toMatchObject({
      status: 'approved',
      label: 'Mark as Approved',
      requiresAttestation: true,
    })
    expect(getSessionNoteWorkflowReturnAction(reviewedNote, { roleSlug: 'qa_admin', userId: ownerId })).toEqual({
      status: 'draft',
      label: 'Return to Therapist',
      requiresReason: true,
      reasonLabel: 'Document what needs to change before this note can move forward.',
    })
    expect(getSessionNoteRestriction(reviewedNote, { roleSlug: 'qa_admin', userId: ownerId })).toMatch(/locked until they are returned/i)
  })

  it('locks approved notes from further edits or batch selection', () => {
    const approvedNote = { staff_id: ownerId, status: 'approved' }
    const reopenedByAdmin = getSessionNoteWorkflowReturnAction(approvedNote, { roleSlug: 'admin', userId: ownerId })

    expect(canEditSessionNote(approvedNote, { roleSlug: 'bcba', userId: ownerId })).toBe(false)
    expect(getSessionNoteWorkflowAction(approvedNote, { roleSlug: 'bcba', userId: ownerId })).toBeNull()
    expect(canSelectSessionNoteForBatchApproval(approvedNote, { roleSlug: 'bcba' })).toBe(false)
    expect(reopenedByAdmin).toEqual({
      status: 'reviewed',
      label: 'Reopen Approval',
      requiresReason: true,
      reasonLabel: 'Document why the signed record is being reopened for another approval pass.',
    })
    expect(getSessionNoteRestriction(approvedNote, { roleSlug: 'bcba', userId: ownerId })).toMatch(/admin reopens approval/i)
  })

  it('maps note workflow states back to the linked session status', () => {
    expect(getLinkedSessionStatusForNoteStatus('draft')).toBe('completed')
    expect(getLinkedSessionStatusForNoteStatus('completed')).toBe('note_written')
    expect(getLinkedSessionStatusForNoteStatus('reviewed')).toBe('note_written')
    expect(getLinkedSessionStatusForNoteStatus('approved')).toBe('note_written')
  })

  it('routes notes into the correct workflow lane', () => {
    expect(getSessionNoteWorkflowLane('missing')).toBe('therapist')
    expect(getSessionNoteWorkflowLane('draft')).toBe('therapist')
    expect(getSessionNoteWorkflowLane('completed')).toBe('supervisor')
    expect(getSessionNoteWorkflowLane('reviewed')).toBe('approval')
    expect(getSessionNoteWorkflowLane('approved')).toBe('done')
  })

  it('flags the required fields before a note can be completed', () => {
    expect(getSessionNoteCompletionIssues({
      narrative: '',
      cpt_code: '',
      location: '',
      start_time: '',
      end_time: '',
      duration_minutes: '',
    })).toEqual([
      'Narrative',
      'CPT code',
      'Location',
      'Start time',
      'End time',
      'Duration',
    ])

    expect(getSessionNoteCompletionIssues({
      narrative: 'Worked on listener responding and mands.',
      cpt_code: '97153',
      location: 'Clinic',
      start_time: '11:30',
      end_time: '10:30',
      duration_minutes: 60,
    })).toEqual(['End time must be later than start time'])

    expect(getSessionNoteCompletionIssues({
      narrative: 'Worked on listener responding and mands.',
      cpt_code: '97153',
      location: 'Clinic',
      start_time: '09:00',
      end_time: '11:00',
      duration_minutes: 120,
    })).toEqual([])
  })

  it('defaults each role into the right queue lane', () => {
    expect(getDefaultSessionNoteWorkflowLane('rbt')).toBe('therapist')
    expect(getDefaultSessionNoteWorkflowLane('bcba')).toBe('supervisor')
    expect(getDefaultSessionNoteWorkflowLane('qa_admin')).toBe('approval')
    expect(getDefaultSessionNoteWorkflowLane('admin')).toBe('all')
  })

  it('parses workflow metadata and maps history entries into readable labels', () => {
    const metadata = parseSessionNoteHistoryMetadata(JSON.stringify({
      from_status: 'completed',
      to_status: 'draft',
      workflow_reason: 'Please add more intervention detail.',
    }))

    expect(metadata.workflow_reason).toBe('Please add more intervention detail.')

    expect(getSessionNoteHistoryEntry({
      action: 'session_note_created',
      user_id: ownerId,
      display_name: 'Ava BCBA',
      metadata: {},
    }).title).toBe('Draft created')

    expect(getSessionNoteHistoryEntry({
      action: 'session_note_reopened',
      user_id: ownerId,
      metadata,
    }, {
      [ownerId]: 'Ava BCBA',
    })).toMatchObject({
      title: 'Returned to therapist',
      actorName: 'Ava BCBA',
      reason: 'Please add more intervention detail.',
    })

    expect(getSessionNoteHistoryEntry({
      action: 'session_note_status_changed',
      user_id: ownerId,
      metadata: {
        from_status: 'reviewed',
        to_status: 'approved',
        workflow_attested: true,
      },
    }, {
      [ownerId]: 'Ava BCBA',
    })).toMatchObject({
      title: 'Approved',
      attestationLabel: 'Attestation recorded',
    })
  })
})
