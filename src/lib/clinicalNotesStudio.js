import { getAuthEvidenceStatusForGoal } from './clinicalEvidenceSpine.js'
import { getGoalProvenanceBadge } from './recommendationDraftAdapters.js'

export const CLINICAL_NOTES_STUDIO_TYPES = [
  {
    id: 'supervision',
    label: 'BCBA supervision',
    cptCode: '97155',
    purpose: 'Review treatment implementation, goal progress, barriers, and plan adjustments.',
  },
  {
    id: 'parent_training',
    label: 'Parent training',
    cptCode: '97156',
    purpose: 'Connect caregiver coaching to medically necessary goals and generalization needs.',
  },
  {
    id: 'treatment_planning',
    label: 'Treatment planning',
    cptCode: 'H0032',
    purpose: 'Document clinical reasoning, sequencing, prerequisites, and goal-plan updates.',
  },
  {
    id: 'reassessment',
    label: 'Reassessment support',
    cptCode: '97151',
    purpose: 'Summarize assessment findings, deficits, and recommendation decisions.',
  },
  {
    id: 'authorization_support',
    label: 'Authorization support',
    cptCode: null,
    purpose: 'Prepare auth-facing support from evidence-backed Learning Tree goals.',
  },
]

const INACTIVE_PROGRAM_STATUSES = new Set(['archived', 'inactive', 'discontinued', 'deleted'])

function isActiveProgram(program = {}) {
  if (program.deleted_at) return false
  return !INACTIVE_PROGRAM_STATUSES.has(String(program.status || '').toLowerCase())
}

function getProgramClientId(program = {}) {
  return program.client_id || program.clientId || null
}

function getNoteClientId(note = {}) {
  return note.client_id || note.clientId || null
}

function getSessionClientId(session = {}) {
  return session.client_id || session.clientId || null
}

function isRecentIsoDate(value, days = 30) {
  if (!value) return false
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return false
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return date.getTime() >= cutoff
}

function getGoalNotePrompt(goal = {}, evidenceStatus = {}) {
  const name = goal.name || goal.objective || 'Goal'

  switch (evidenceStatus.status) {
    case 'assessment_supported':
      return `Document current progress, barriers, and next clinical action for ${name} using its persisted assessment support.`
    case 'adapted':
      return `Document why the client-specific adaptation for ${name} remains medically necessary and clinically appropriate.`
    case 'assessment_direct':
      return `Document the assessment finding supporting ${name} and whether it should be linked to a canonical source.`
    case 'library_verified':
      return `Document current performance for ${name} and whether assessment support should be linked before auth use.`
    default:
      return `Document the clinical reason ${name} remains in the treatment plan or flag it for more evidence.`
  }
}

export function buildClinicalNotesStudioSummary({
  selectedClientId = null,
  programs = [],
  decisions = [],
  notes = [],
  sessions = [],
} = {}) {
  const scopedPrograms = (programs || [])
    .filter(isActiveProgram)
    .filter((program) => !selectedClientId || getProgramClientId(program) === selectedClientId)

  const scopedNotes = (notes || [])
    .filter((note) => !selectedClientId || getNoteClientId(note) === selectedClientId)

  const scopedSessions = (sessions || [])
    .filter((session) => !selectedClientId || getSessionClientId(session) === selectedClientId)

  const goalCards = scopedPrograms.map((goal) => {
    const provenance = getGoalProvenanceBadge(goal)
    const evidence = getAuthEvidenceStatusForGoal(goal, decisions)
    return {
      id: goal.id || goal.name,
      name: goal.name || goal.objective || 'Untitled goal',
      domain: goal.domain || goal.domain_name || goal.canonical_domain_slug || 'Clinical goal',
      provenance,
      evidence,
      notePrompt: getGoalNotePrompt(goal, evidence),
    }
  })

  const goals = goalCards.reduce((summary, goal) => {
    summary.total += 1
    if (goal.evidence.status === 'assessment_supported') summary.assessmentSupported += 1
    if (goal.evidence.status === 'library_verified') summary.libraryVerified += 1
    if (goal.evidence.status === 'adapted') summary.adapted += 1
    if (goal.evidence.status === 'needs_support') summary.needsSupport += 1
    if (goal.provenance.status === 'custom') summary.custom += 1
    return summary
  }, {
    total: 0,
    assessmentSupported: 0,
    libraryVerified: 0,
    adapted: 0,
    needsSupport: 0,
    custom: 0,
  })

  const notesSummary = scopedNotes.reduce((summary, note) => {
    summary.total += 1
    if (note.status !== 'approved') summary.open += 1
    if (note.status === 'draft') summary.draft += 1
    if (note.status === 'completed') summary.completed += 1
    if (note.status === 'reviewed') summary.reviewed += 1
    if (note.status === 'approved') summary.approved += 1
    if (isRecentIsoDate(note.session_date || note.created_at, 30)) summary.recent30Days += 1
    return summary
  }, {
    total: 0,
    open: 0,
    draft: 0,
    completed: 0,
    reviewed: 0,
    approved: 0,
    recent30Days: 0,
  })

  return {
    hasClient: Boolean(selectedClientId),
    selectedClientId,
    goals,
    notes: notesSummary,
    sessions: {
      recent60Days: scopedSessions.length,
      missingOrDraft: notesSummary.draft,
    },
    goalCards: goalCards.slice(0, 5),
    noteTypes: CLINICAL_NOTES_STUDIO_TYPES,
    guardrails: [
      'Use Learning Tree goals as the note source of truth.',
      'Tie medical-necessity language to canonical verification and assessment decisions.',
      'Keep browser automation or EMR transfer out of this workflow for V1.',
    ],
  }
}
