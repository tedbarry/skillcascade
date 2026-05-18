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

function cleanDraftValue(value, fallback = '') {
  const cleaned = String(value || '').trim()
  return cleaned || fallback
}

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

function formatGoalDraftLine(goal = {}, index = 0) {
  const name = cleanDraftValue(goal.name, `Goal ${index + 1}`)
  const domain = cleanDraftValue(goal.domain, 'clinical domain')
  const evidenceLabel = cleanDraftValue(goal.evidence?.label, 'evidence status pending')
  const provenanceLabel = cleanDraftValue(goal.provenance?.label, 'source pending')
  const prompt = cleanDraftValue(goal.notePrompt, 'Document current performance, barriers, and next clinical action.')

  return `${index + 1}. ${name} (${domain}) - ${evidenceLabel}; ${provenanceLabel}. ${prompt}`
}

function getDraftFocusForType(noteType = {}) {
  switch (noteType.id) {
    case 'supervision':
      return 'Review implementation fidelity, client response, barriers, and BCBA treatment-plan adjustments.'
    case 'parent_training':
      return 'Connect caregiver coaching to generalization, replacement behavior practice, and medically necessary goals.'
    case 'treatment_planning':
      return 'Document BCBA clinical reasoning, goal sequencing, prerequisites, and plan updates.'
    case 'reassessment':
      return 'Summarize assessment findings, deficit areas, risk factors, and recommendation decisions.'
    case 'authorization_support':
      return 'Prepare payer-facing support from assessment-backed Learning Tree goals without turning this into an EMR export.'
    default:
      return cleanDraftValue(noteType.purpose, 'Document clinical reasoning and next actions.')
  }
}

export function getClinicalNotesStudioTypeForCpt(cptCode = '') {
  const normalized = String(cptCode || '').trim().toUpperCase()
  if (!normalized) return null
  return CLINICAL_NOTES_STUDIO_TYPES.find((type) => String(type.cptCode || '').toUpperCase() === normalized) || null
}

export function buildClinicalNotesStudioDraft({
  noteType = CLINICAL_NOTES_STUDIO_TYPES[0],
  selectedClientName = '',
  summary = {},
  currentNarrative = '',
} = {}) {
  const type = noteType || CLINICAL_NOTES_STUDIO_TYPES[0]
  const clientLabel = cleanDraftValue(selectedClientName, summary.hasClient ? 'selected client' : 'client not selected')
  const goalCards = Array.isArray(summary.goalCards) ? summary.goalCards.slice(0, 3) : []
  const existingNarrative = String(currentNarrative || '').trim()
  const goalLines = goalCards.length
    ? goalCards.map(formatGoalDraftLine).join('\n')
    : '- No active Learning Tree goals were loaded. Add assessment findings, Learning Tree support, or BCBA rationale before using this for payer-facing documentation.'

  return [
    `${type.label || 'Clinical note'} draft starter${type.cptCode ? ` (${type.cptCode})` : ''}`,
    `Client focus: ${clientLabel}`,
    `Clinical intent: ${getDraftFocusForType(type)}`,
    existingNarrative ? 'Existing narrative detected: review before appending so duplicate or conflicting facts are not introduced.' : 'Existing narrative detected: none.',
    '',
    'Evidence and goal support to consider:',
    goalLines,
    '',
    'Facts the BCBA must add before signing:',
    '- Date, time, duration, participants, and setting: [verify from the actual service record].',
    '- Direct observation or data reviewed: [add only what was observed or reviewed].',
    '- Client response, progress, and barriers: [include data, prompt level, generalization, safety, or skill-acquisition details].',
    '- Caregiver or technician coaching, if applicable: [state what was modeled, coached, or changed].',
    '',
    'BCBA clinical reasoning and plan:',
    '- Medical-necessity link: [connect impairment, risk, or adaptive deficit to the selected goal support].',
    '- Decision or next action: [state plan adjustment, prerequisite need, reassessment need, or auth-support follow-up].',
    '',
    'Guardrail: This is a deterministic SkillCascade starter, not an external AI note and not an EMR export. Do not claim attendance, duration, services delivered, outcomes, or payer language unless the BCBA verifies those facts.',
  ].join('\n')
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
