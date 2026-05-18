import { CANONICAL_DOMAIN_LABELS } from '../data/canonicalRecommendationProfiles.js'
import {
  findCoreLibraryTargetForGoal,
  getCoreLibraryTargetDetail,
  getCoreLibraryTargetsForRecommendation,
  getGoalProvenanceBadge,
} from './recommendationDraftAdapters.js'

export const CLIENT_GOAL_DECISION_STATUSES = [
  'pending',
  'imported',
  'excluded',
  'linked',
  'needs_prerequisite',
  'needs_assessment',
]

export const CLIENT_GOAL_DECISION_LABELS = {
  pending: 'Pending BCBA Decision',
  imported: 'Imported to Learning Tree',
  excluded: 'Excluded',
  linked: 'Linked to Existing Goal',
  needs_prerequisite: 'Needs Prerequisite',
  needs_assessment: 'Needs More Assessment',
}

export const CLIENT_GOAL_DECISION_TONES = {
  pending: 'border-warm-200 bg-white text-warm-600',
  imported: 'border-sage-200 bg-sage-50 text-sage-700',
  excluded: 'border-warm-200 bg-warm-100 text-warm-600',
  linked: 'border-blue-200 bg-blue-50 text-blue-700',
  needs_prerequisite: 'border-amber-200 bg-amber-50 text-amber-700',
  needs_assessment: 'border-red-200 bg-red-50 text-red-700',
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function unique(items = []) {
  return [...new Set(items.filter(Boolean))]
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeSourceAssessmentDate(value) {
  if (!value) return todayIsoDate()
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10)
  const text = String(value)
  return text.length >= 10 ? text.slice(0, 10) : todayIsoDate()
}

function average(values = []) {
  const numeric = values.filter((value) => Number.isFinite(value))
  if (numeric.length === 0) return null
  return Number((numeric.reduce((sum, value) => sum + value, 0) / numeric.length).toFixed(3))
}

function getConfidenceForStrength(strength) {
  switch (strength) {
    case 'high':
      return 0.9
    case 'medium':
      return 0.72
    case 'low':
      return 0.55
    default:
      return null
  }
}

function findRecommendationForTarget(target, recommendations = []) {
  if (!target) return null
  return (recommendations || []).find((recommendation) => (
    recommendation?.deficitSlug === target.canonical_deficit_slug
    || recommendation?.canonical_deficit_slug === target.canonical_deficit_slug
  )) || null
}

function buildRecommendationFromImportedGoal(goal = {}, target = null) {
  if (!target) return null

  const detail = getCoreLibraryTargetDetail(target)
  const sourceRefs = Array.isArray(goal.sourceRefs) ? goal.sourceRefs : []
  const hasAssessmentSignal = sourceRefs.length > 0
    || Boolean(goal.recommendation_strength)
    || goal.source_type === 'assessment_direct'
    || goal.source_type === 'assessment_recommendation'

  if (!hasAssessmentSignal) return null

  return {
    domainSlug: target.canonical_domain_slug,
    deficitSlug: target.canonical_deficit_slug,
    goalFamilyTitle: target.stg_name || detail.family_title || target.name,
    recommendedObjectiveSeed: goal.objective || goal.goalText || detail.objective || target.objective || target.name,
    defaultMeasurementType: goal.measurement_type || detail.measurement_type || target.measurement_type,
    defaultCriteria: goal.criteria || detail.default_criteria || target.default_criteria,
    priorityScore: Number.isFinite(goal.recommendation_priority_score) ? goal.recommendation_priority_score : null,
    recommendationStrength: goal.recommendation_strength || 'medium',
    medicalNecessityTags: goal.medical_necessity_tags || detail.medical_necessity_tags || [],
    medicalNecessityRationale: goal.medical_necessity_rationale || detail.medical_necessity || '',
    evidenceSummary: goal.evidence_summary || detail.recommended_when || '',
    sourceRefs,
    supportingSubAreas: [],
  }
}

function getProgramLibraryTargetId(program = {}) {
  return program.library_target_id || program.libraryTargetId || null
}

function getProgramDeficitSlug(program = {}) {
  return program.canonical_deficit_slug || program.canonicalDeficitSlug || null
}

function getDecisionTargetId(decision = {}) {
  return decision.canonical_target_id || decision.canonicalTargetId || null
}

function getDecisionEvidence(decision = {}) {
  const snapshot = decision.evidence_snapshot || decision.evidenceSnapshot || null
  return snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) ? snapshot : {}
}

export function normalizeClientGoalDecisionStatus(value) {
  return CLIENT_GOAL_DECISION_STATUSES.includes(value) ? value : 'pending'
}

export function getClientGoalDecisionBadge(status) {
  const normalized = normalizeClientGoalDecisionStatus(status)
  return {
    status: normalized,
    label: CLIENT_GOAL_DECISION_LABELS[normalized],
    tone: CLIENT_GOAL_DECISION_TONES[normalized],
  }
}

export function getClinicalEvidenceTargetId(recommendation = {}, target = null) {
  if (target?.id) return target.id
  if (recommendation.canonical_target_id) return recommendation.canonical_target_id
  if (recommendation.library_target_id) return recommendation.library_target_id
  if (recommendation.deficitSlug) return `assessment-direct:${recommendation.deficitSlug}`
  if (recommendation.canonical_deficit_slug) return `assessment-direct:${recommendation.canonical_deficit_slug}`
  return 'assessment-direct:unmapped'
}

export function buildAssessmentEvidenceSnapshot(recommendation = {}, target = null, options = {}) {
  const detail = target ? getCoreLibraryTargetDetail(target) : {}
  const supportingSubAreas = Array.isArray(recommendation.supportingSubAreas)
    ? recommendation.supportingSubAreas
    : []
  const signalLabels = unique([
    ...(Array.isArray(detail.assessment_signals) ? detail.assessment_signals : []),
    ...supportingSubAreas.map((item) => item.subAreaName || item.subAreaId),
  ])
  const mappedTargets = target
    ? [target.id]
    : getCoreLibraryTargetsForRecommendation(recommendation, { limit: 4 }).map((item) => item.id)
  const domainSlug = recommendation.domainSlug || target?.canonical_domain_slug || null
  const deficitSlug = recommendation.deficitSlug || target?.canonical_deficit_slug || null

  return {
    assessment_tool: options.assessmentTool || 'SkillCascade Assessment',
    source_assessment_id: options.sourceAssessmentId || 'current-assessment',
    source_assessment_date: normalizeSourceAssessmentDate(options.sourceAssessmentDate),
    section_domain: CANONICAL_DOMAIN_LABELS[domainSlug] || target?.domain_name || null,
    section_domain_slug: domainSlug,
    signal_labels: signalLabels,
    score: Number.isFinite(recommendation.priorityScore) ? recommendation.priorityScore : null,
    severity: average(supportingSubAreas.map((item) => item.severity)),
    confidence: Number.isFinite(options.confidence)
      ? options.confidence
      : getConfidenceForStrength(recommendation.recommendationStrength),
    mapped_goal_family_ids: deficitSlug ? [deficitSlug] : [],
    mapped_target_ids: unique(mappedTargets),
    canonical_target_id: getClinicalEvidenceTargetId(recommendation, target),
    canonical_target_name: target?.name || null,
    recommendation_strength: recommendation.recommendationStrength || 'medium',
    recommendation_title: recommendation.goalFamilyTitle || target?.stg_name || target?.name || 'Assessment recommendation',
    medical_necessity_tags: recommendation.medicalNecessityTags || detail.medical_necessity_tags || [],
    evidence_summary: recommendation.evidenceSummary || '',
    source_refs: recommendation.sourceRefs || [],
    supporting_sections: supportingSubAreas.map((item) => ({
      section_id: item.subAreaId || null,
      section_label: item.subAreaName || null,
      domain_label: item.domainName || null,
      trigger_type: item.triggerType || null,
      avg_level: Number.isFinite(item.avgLevel) ? item.avgLevel : null,
      severity: Number.isFinite(item.severity) ? item.severity : null,
      weak_skill_names: item.weakSkillNames || [],
      fragile_skill_names: item.fragileSkillNames || [],
    })),
  }
}

export function buildClientGoalDecisionPayload({
  clientId,
  recommendation,
  target = null,
  status = 'pending',
  clientProgramId = null,
  userId = null,
  reasonCode = null,
  reasonText = '',
  sourceAssessmentId = 'current-assessment',
  sourceAssessmentDate = null,
  assessmentTool = 'SkillCascade Assessment',
  decidedAt = null,
} = {}) {
  const decisionStatus = normalizeClientGoalDecisionStatus(status)
  const evidenceSnapshot = buildAssessmentEvidenceSnapshot(recommendation, target, {
    assessmentTool,
    sourceAssessmentId,
    sourceAssessmentDate,
  })

  return {
    client_id: clientId,
    source_assessment_id: sourceAssessmentId,
    source_assessment_date: evidenceSnapshot.source_assessment_date,
    canonical_target_id: evidenceSnapshot.canonical_target_id,
    decision_status: decisionStatus,
    client_program_id: clientProgramId || null,
    decided_by_user_id: userId || null,
    decided_at: decidedAt || (decisionStatus === 'pending' ? null : new Date().toISOString()),
    reason_code: reasonCode || null,
    reason_text: cleanText(reasonText) || null,
    evidence_snapshot: evidenceSnapshot,
  }
}

export function buildGoalDecisionPayloadFromImport({
  clientId,
  goal,
  recommendations = [],
  status = 'imported',
  clientProgramId = null,
  userId = null,
  reasonCode = 'imported_to_learning_tree',
  reasonText = 'BCBA imported this canonical goal into the client plan.',
  sourceAssessmentId = 'skillcascade-current-assessment',
  sourceAssessmentDate = null,
  assessmentTool = 'SkillCascade Assessment',
} = {}) {
  const target = findCoreLibraryTargetForGoal(goal)
  if (!clientId || !target) return null

  const recommendation = findRecommendationForTarget(target, recommendations)
    || buildRecommendationFromImportedGoal(goal, target)

  if (!recommendation) return null

  return buildClientGoalDecisionPayload({
    clientId,
    recommendation,
    target,
    status,
    clientProgramId,
    userId,
    reasonCode,
    reasonText,
    sourceAssessmentId,
    sourceAssessmentDate,
    assessmentTool,
  })
}

export function mapClientGoalDecisions(decisions = []) {
  return new Map((decisions || []).map((decision) => [getDecisionTargetId(decision), decision]).filter(([targetId]) => Boolean(targetId)))
}

export function getDecisionForRecommendationTarget(recommendation, target, decisionsMap) {
  const map = decisionsMap instanceof Map ? decisionsMap : mapClientGoalDecisions(decisionsMap || [])
  return map.get(getClinicalEvidenceTargetId(recommendation, target)) || null
}

function findProgramForRecommendation(recommendation, target, programs = []) {
  const targetId = target?.id || recommendation?.canonical_target_id || null
  const deficitSlug = recommendation?.deficitSlug || recommendation?.canonical_deficit_slug || target?.canonical_deficit_slug || null

  return (programs || []).find((program) => targetId && getProgramLibraryTargetId(program) === targetId)
    || (programs || []).find((program) => deficitSlug && getProgramDeficitSlug(program) === deficitSlug)
    || null
}

function getDecisionStatusForRow(decision, importedProgram) {
  const persisted = normalizeClientGoalDecisionStatus(decision?.decision_status)
  if (!importedProgram) return persisted
  if (persisted === 'excluded' || persisted === 'needs_prerequisite' || persisted === 'needs_assessment') return persisted
  if (persisted === 'linked') return 'linked'
  return 'imported'
}

function buildAuthReportSupport({ decisionStatus, importedProgram, target, provenanceBadge }) {
  if (decisionStatus === 'imported' || decisionStatus === 'linked') {
    return {
      status: 'assessment_supported',
      label: 'Assessment-supported',
      tone: 'border-sage-200 bg-sage-50 text-sage-700',
      detail: importedProgram ? 'Decision is connected to a Learning Tree goal.' : 'Decision is connected to assessment evidence.',
    }
  }

  if (decisionStatus === 'excluded') {
    return {
      status: 'excluded',
      label: 'Excluded',
      tone: 'border-warm-200 bg-warm-100 text-warm-600',
      detail: 'BCBA excluded this recommendation from the current treatment plan.',
    }
  }

  if (decisionStatus === 'needs_prerequisite' || decisionStatus === 'needs_assessment') {
    return {
      status: 'needs_support',
      label: decisionStatus === 'needs_prerequisite' ? 'Prerequisite needed' : 'Needs assessment support',
      tone: decisionStatus === 'needs_prerequisite'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-red-200 bg-red-50 text-red-700',
      detail: 'Not ready for an auth-report goal without more clinical support.',
    }
  }

  if (provenanceBadge?.status === 'adapted') {
    return {
      status: 'adapted',
      label: 'Adapted - verify support',
      tone: 'border-amber-200 bg-amber-50 text-amber-700',
      detail: 'Library goal was adapted and should retain a clinical rationale.',
    }
  }

  if (target) {
    return {
      status: 'library_verified',
      label: 'Library verified - decision pending',
      tone: 'border-blue-200 bg-blue-50 text-blue-700',
      detail: 'Canonical support exists, but the client-specific decision is still pending.',
    }
  }

  return {
    status: 'needs_support',
    label: 'Needs clinical support',
    tone: 'border-red-200 bg-red-50 text-red-700',
    detail: 'No canonical source or persisted assessment decision is attached yet.',
  }
}

export function deriveClinicalEvidenceRows({ recommendations = [], decisions = [], programs = [] } = {}) {
  const decisionMap = mapClientGoalDecisions(decisions)

  return (recommendations || []).map((recommendation) => {
    const matchedTargets = getCoreLibraryTargetsForRecommendation(recommendation, { limit: 4 })
    const target = matchedTargets[0] || null
    const decision = getDecisionForRecommendationTarget(recommendation, target, decisionMap)
    const importedProgram = findProgramForRecommendation(recommendation, target, programs)
    const provenanceBadge = importedProgram ? getGoalProvenanceBadge(importedProgram) : null
    const decisionStatus = getDecisionStatusForRow(decision, importedProgram)
    const evidenceSnapshot = decision
      ? getDecisionEvidence(decision)
      : buildAssessmentEvidenceSnapshot(recommendation, target)

    return {
      id: getClinicalEvidenceTargetId(recommendation, target),
      recommendation,
      target,
      matchedTargets,
      decision,
      decisionStatus,
      decisionBadge: getClientGoalDecisionBadge(decisionStatus),
      importedProgram,
      clientProgramId: importedProgram?.id || decision?.client_program_id || null,
      provenanceBadge,
      evidenceSnapshot,
      authReportSupport: buildAuthReportSupport({
        decisionStatus,
        importedProgram,
        target,
        provenanceBadge,
      }),
    }
  })
}

export function summarizeClinicalEvidenceRows(rows = [], programs = []) {
  const summary = {
    totalRecommendations: rows.length,
    pending: 0,
    imported: 0,
    linked: 0,
    excluded: 0,
    needsPrerequisite: 0,
    needsAssessment: 0,
    assessmentSupported: 0,
    needsClinicalSupport: 0,
    customGoals: 0,
  }

  for (const row of rows || []) {
    if (row.decisionStatus === 'pending') summary.pending += 1
    if (row.decisionStatus === 'imported') summary.imported += 1
    if (row.decisionStatus === 'linked') summary.linked += 1
    if (row.decisionStatus === 'excluded') summary.excluded += 1
    if (row.decisionStatus === 'needs_prerequisite') summary.needsPrerequisite += 1
    if (row.decisionStatus === 'needs_assessment') summary.needsAssessment += 1
    if (row.authReportSupport?.status === 'assessment_supported') summary.assessmentSupported += 1
    if (row.authReportSupport?.status === 'needs_support') summary.needsClinicalSupport += 1
  }

  summary.customGoals = (programs || []).filter((program) => getGoalProvenanceBadge(program).status === 'custom').length
  return summary
}

export function getAuthEvidenceStatusForGoal(goal = {}, decisions = []) {
  const target = findCoreLibraryTargetForGoal(goal)
  const targetId = getProgramLibraryTargetId(goal) || target?.id || null
  const deficitSlug = getProgramDeficitSlug(goal)
  const decision = (decisions || []).find((item) => (
    (targetId && getDecisionTargetId(item) === targetId)
    || (deficitSlug && getDecisionEvidence(item).mapped_goal_family_ids?.includes(deficitSlug))
  ))
  const decisionStatus = normalizeClientGoalDecisionStatus(decision?.decision_status)
  const provenanceBadge = getGoalProvenanceBadge(goal)

  if (decision && ['imported', 'linked', 'pending'].includes(decisionStatus)) {
    return {
      status: 'assessment_supported',
      label: 'Assessment-supported',
      tone: 'border-sage-200 bg-sage-50 text-sage-700',
      detail: 'A persisted assessment decision supports this goal.',
    }
  }

  if (provenanceBadge.status === 'adapted') {
    return {
      status: 'adapted',
      label: 'Adapted - verify support',
      tone: 'border-amber-200 bg-amber-50 text-amber-700',
      detail: 'This goal changed from its canonical snapshot and needs a clear adaptation reason.',
    }
  }

  if (provenanceBadge.status === 'assessment_direct') {
    return {
      status: 'assessment_direct',
      label: 'Assessment direct',
      tone: 'border-blue-200 bg-blue-50 text-blue-700',
      detail: 'This goal came from assessment logic without a canonical target link.',
    }
  }

  if (targetId || provenanceBadge.status === 'canonical') {
    return {
      status: 'library_verified',
      label: 'Library verified',
      tone: 'border-blue-200 bg-blue-50 text-blue-700',
      detail: 'Canonical verification exists. Add assessment decision support when available.',
    }
  }

  return {
    status: 'needs_support',
    label: 'Needs clinical support',
    tone: 'border-red-200 bg-red-50 text-red-700',
    detail: 'Custom goals should be connected to assessment evidence or a canonical source before auth-report use.',
  }
}
