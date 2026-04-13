const ROLE_ALIASES = {
  therapist: 'rbt',
  technician: 'rbt',
  qa: 'qa_admin',
}

const NOTE_CREATOR_ROLES = new Set(['master_admin', 'admin', 'bcba', 'rbt'])
const NOTE_EDITOR_ROLES = new Set(['master_admin', 'admin', 'bcba'])
const NOTE_REVIEWER_ROLES = new Set(['master_admin', 'admin', 'bcba', 'qa_admin'])
const NOTE_APPROVER_ROLES = NOTE_REVIEWER_ROLES
const NOTE_APPROVAL_REOPEN_ROLES = new Set(['master_admin', 'admin'])
const COMPLETION_FIELD_LABELS = {
  narrative: 'Narrative',
  cpt_code: 'CPT code',
  location: 'Location',
  start_time: 'Start time',
  end_time: 'End time',
  duration_minutes: 'Duration',
}
const WORKFLOW_ATTESTATION_CONFIG = {
  completed: {
    label: 'I attest that this note accurately reflects the services delivered during this session.',
    helpText: 'Therapists should only complete a note after confirming the clinical record is accurate and complete.',
  },
  reviewed: {
    label: 'I attest that I reviewed this note for clinical completeness and supervisory accuracy.',
    helpText: 'Supervisory review should confirm the note is ready for final approval.',
  },
  approved: {
    label: 'I attest that this note is approved as the signed clinical record for this session.',
    helpText: 'Final approval should only happen when the note is ready to stand as the locked clinical record.',
  },
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null
  const match = /^(\d{1,2}):(\d{2})/.exec(timeStr.trim())
  if (!match) return null
  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10)
}

export function normalizeRoleSlug(role) {
  if (!role) return ''
  const normalized = String(role).trim().toLowerCase().replace(/\s+/g, '_')
  return ROLE_ALIASES[normalized] || normalized
}

export function canCreateSessionNote(role) {
  return NOTE_CREATOR_ROLES.has(normalizeRoleSlug(role))
}

export function canCreateSessionNoteForSession(session, { roleSlug, userId } = {}) {
  const normalizedRole = normalizeRoleSlug(roleSlug)
  if (!NOTE_CREATOR_ROLES.has(normalizedRole) || !userId) return false
  if (normalizedRole !== 'rbt') return true
  return Boolean(session?.staff_id) && session.staff_id === userId
}

export function canEditSessionNote(note, { roleSlug, userId } = {}) {
  if (!note || !userId) return false
  if ((note.status || 'draft') !== 'draft') return false

  const normalizedRole = normalizeRoleSlug(roleSlug)
  if (NOTE_EDITOR_ROLES.has(normalizedRole)) return true

  return normalizedRole === 'rbt' && note.staff_id === userId
}

export function getSessionNoteWorkflowAction(note, { roleSlug, userId } = {}) {
  if (!note || !userId) return null

  const normalizedRole = normalizeRoleSlug(roleSlug)
  const isOwner = note.staff_id === userId

  if (note.status === 'draft') {
    if (normalizedRole === 'rbt' && !isOwner) return null
    if (NOTE_CREATOR_ROLES.has(normalizedRole)) {
      return {
        status: 'completed',
        label: 'Mark as Completed',
        requiresAttestation: true,
        attestationLabel: WORKFLOW_ATTESTATION_CONFIG.completed.label,
        attestationHelpText: WORKFLOW_ATTESTATION_CONFIG.completed.helpText,
      }
    }
  }

  if (note.status === 'completed' && NOTE_REVIEWER_ROLES.has(normalizedRole)) {
    return {
      status: 'reviewed',
      label: 'Mark as Reviewed',
      requiresAttestation: true,
      attestationLabel: WORKFLOW_ATTESTATION_CONFIG.reviewed.label,
      attestationHelpText: WORKFLOW_ATTESTATION_CONFIG.reviewed.helpText,
    }
  }

  if (note.status === 'reviewed' && NOTE_APPROVER_ROLES.has(normalizedRole)) {
    return {
      status: 'approved',
      label: 'Mark as Approved',
      requiresAttestation: true,
      attestationLabel: WORKFLOW_ATTESTATION_CONFIG.approved.label,
      attestationHelpText: WORKFLOW_ATTESTATION_CONFIG.approved.helpText,
    }
  }

  return null
}

export function getSessionNoteWorkflowReturnAction(note, { roleSlug, userId } = {}) {
  if (!note || !userId) return null

  const normalizedRole = normalizeRoleSlug(roleSlug)
  const isOwner = note.staff_id === userId

  if (note.status === 'completed') {
    if (isOwner && NOTE_CREATOR_ROLES.has(normalizedRole)) {
      return {
        status: 'draft',
        label: 'Reopen Draft',
        requiresReason: true,
        reasonLabel: 'Document why this completed note is being reopened.',
      }
    }
    if (NOTE_REVIEWER_ROLES.has(normalizedRole)) {
      return {
        status: 'draft',
        label: 'Return to Therapist',
        requiresReason: true,
        reasonLabel: 'Document what needs to change before this note can move forward.',
      }
    }
  }

  if (note.status === 'reviewed' && NOTE_APPROVER_ROLES.has(normalizedRole)) {
    return {
      status: 'draft',
      label: 'Return to Therapist',
      requiresReason: true,
      reasonLabel: 'Document what needs to change before this note can move forward.',
    }
  }

  if (note.status === 'approved' && NOTE_APPROVAL_REOPEN_ROLES.has(normalizedRole)) {
    return {
      status: 'reviewed',
      label: 'Reopen Approval',
      requiresReason: true,
      reasonLabel: 'Document why the signed record is being reopened for another approval pass.',
    }
  }

  return null
}

export function getSessionNoteCompletionIssues(note = {}) {
  const issues = []

  if (!String(note.narrative || '').trim()) issues.push(COMPLETION_FIELD_LABELS.narrative)
  if (!String(note.cpt_code || '').trim()) issues.push(COMPLETION_FIELD_LABELS.cpt_code)
  if (!String(note.location || '').trim()) issues.push(COMPLETION_FIELD_LABELS.location)
  if (!String(note.start_time || '').trim()) issues.push(COMPLETION_FIELD_LABELS.start_time)
  if (!String(note.end_time || '').trim()) issues.push(COMPLETION_FIELD_LABELS.end_time)

  const duration = Number.parseInt(note.duration_minutes, 10)
  if (!Number.isFinite(duration) || duration <= 0) {
    issues.push(COMPLETION_FIELD_LABELS.duration_minutes)
  }

  const startMinutes = parseTimeToMinutes(note.start_time)
  const endMinutes = parseTimeToMinutes(note.end_time)
  if (startMinutes != null && endMinutes != null && endMinutes <= startMinutes) {
    issues.push('End time must be later than start time')
  }

  return issues
}

export function getLinkedSessionStatusForNoteStatus(noteStatus) {
  return ['completed', 'reviewed', 'approved'].includes(noteStatus || '')
    ? 'note_written'
    : 'completed'
}

export function parseSessionNoteHistoryMetadata(metadata) {
  if (!metadata) return {}
  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }
  return typeof metadata === 'object' ? metadata : {}
}

export function getSessionNoteHistoryEntry(entry = {}, staffMap = {}) {
  const metadata = parseSessionNoteHistoryMetadata(entry.metadata)
  const actorName = entry.display_name || staffMap?.[entry.user_id] || 'Unknown'
  const fromStatus = metadata.from_status || ''
  const toStatus = metadata.to_status || ''
  let title = 'Workflow updated'

  if (entry.action === 'session_note_created') {
    title = 'Draft created'
  } else if (entry.action === 'session_note_approval_reopened') {
    title = 'Approval reopened'
  } else if (entry.action === 'session_note_reopened') {
    title = fromStatus === 'completed' || fromStatus === 'reviewed'
      ? 'Returned to therapist'
      : 'Draft reopened'
  } else if (entry.action === 'session_note_status_changed') {
    if (toStatus === 'completed') title = 'Marked completed'
    else if (toStatus === 'reviewed') title = 'Marked reviewed'
    else if (toStatus === 'approved') title = 'Approved'
    else if (toStatus === 'draft') title = 'Returned to draft'
  }

  return {
    ...entry,
    metadata,
    actorName,
    title,
    reason: String(metadata.workflow_reason || '').trim(),
    attestationLabel: metadata.workflow_attested
      ? String(metadata.workflow_attestation_label || '').trim() || 'Attestation recorded'
      : '',
  }
}

export function getSessionNoteWorkflowLane(noteStatus) {
  if (noteStatus === 'missing' || noteStatus === 'draft') return 'therapist'
  if (noteStatus === 'completed') return 'supervisor'
  if (noteStatus === 'reviewed') return 'approval'
  return 'done'
}

export function getDefaultSessionNoteWorkflowLane(role) {
  const normalizedRole = normalizeRoleSlug(role)
  if (normalizedRole === 'rbt') return 'therapist'
  if (normalizedRole === 'bcba') return 'supervisor'
  if (normalizedRole === 'qa_admin') return 'approval'
  return 'all'
}

export function canBatchApproveSessionNotes(role) {
  return NOTE_APPROVER_ROLES.has(normalizeRoleSlug(role))
}

export function canSelectSessionNoteForBatchApproval(note, { roleSlug } = {}) {
  return canBatchApproveSessionNotes(roleSlug) && note?.status === 'reviewed'
}

export function getSessionNoteRestriction(note, { roleSlug, userId } = {}) {
  if (!note) return ''
  if (note.status === 'approved') return 'Approved notes are locked to preserve the signed clinical record until an admin reopens approval.'
  if (note.status === 'reviewed') return 'Reviewed notes are locked until they are returned to the therapist or moved to final approval.'
  if (note.status === 'completed') return 'Completed notes are locked until they are reopened for edits or reviewed by a supervisor.'

  const normalizedRole = normalizeRoleSlug(roleSlug)
  if (normalizedRole === 'qa_admin') {
    return 'QA admins can review, return, and approve notes but cannot edit the clinical narrative.'
  }

  if (normalizedRole === 'rbt' && note.staff_id !== userId) {
    return 'RBTs can only edit their own notes until a supervisor reviews them.'
  }

  return 'You do not have permission to edit this note.'
}
