import { CANONICAL_DOMAIN_LABELS } from '../data/canonicalRecommendationProfiles.js'
import { CORE_GOAL_LIBRARY, CORE_GOAL_LIBRARY_NAME } from '../data/canonicalGoalLibrary.js'

export const AUTH_REPORT_DOMAIN_CONFIG = {
  maladaptive: { label: 'Maladaptive', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', counted: true },
  replacement: { label: 'Replacement (FERB)', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', counted: true },
  communication: { label: 'Communication', color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', counted: true },
  socialization: { label: 'Socialization', color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', counted: true },
  adaptive_daily_living: { label: 'Adaptive Daily Living', color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC', counted: true },
  coping_self_regulation: { label: 'Coping & Self-Regulation', color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE', counted: true },
  socialGroup: { label: 'Social Skills Group', color: '#14B8A6', bg: '#F0FDFA', border: '#99F6E4', counted: false },
  parent: { label: 'Parent Training', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', counted: false },
}

export function getAuthReportDomainLabel(domain) {
  return AUTH_REPORT_DOMAIN_CONFIG[domain]?.label || 'Communication'
}

export function mapCanonicalDomainToAuthGoalDomain(domainSlug) {
  switch (domainSlug) {
    case 'behavior':
      return 'maladaptive'
    case 'communication':
      return 'communication'
    case 'social':
      return 'socialization'
    case 'adaptive_daily_living':
      return 'adaptive_daily_living'
    case 'coping_self_regulation':
      return 'coping_self_regulation'
    case 'caregiver_support':
      return 'parent'
    default:
      return 'communication'
  }
}

function parseCoreTargetDetail(target) {
  if (!target?.description) return {}
  try {
    return JSON.parse(target.description)
  } catch {
    return {}
  }
}

function normalizeGoalText(value) {
  return (value || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

const DATABASE_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isDatabaseUuid(value) {
  return typeof value === 'string' && DATABASE_UUID_RE.test(value)
}

export function getDatabaseStgId(value) {
  return isDatabaseUuid(value) ? value : null
}

export function getCoreLibraryTargetDetail(target) {
  return parseCoreTargetDetail(target)
}

export function findCoreLibraryTargetForGoal(goal) {
  if (!goal) return null

  const rawTargetId = goal.library_target_id || goal.skillId || goal.stg_id || goal.id
  const targetId = typeof rawTargetId === 'string' && rawTargetId.startsWith('recommendation-')
    ? rawTargetId.replace(/^recommendation-/, '')
    : rawTargetId
  if (targetId) {
    const byId = CORE_GOAL_LIBRARY.targets.find((target) => target.id === targetId)
    if (byId) return byId
  }

  const name = normalizeGoalText(goal.name || goal.program || goal.skillName)
  const objective = normalizeGoalText(goal.objective || goal.goalText)
  const deficitSlug = goal.canonical_deficit_slug || goal.canonicalDeficitSlug
  const candidateTargets = deficitSlug
    ? CORE_GOAL_LIBRARY.targets.filter((target) => target.canonical_deficit_slug === deficitSlug)
    : CORE_GOAL_LIBRARY.targets

  return candidateTargets.find((target) => normalizeGoalText(target.name) === name)
    || candidateTargets.find((target) => normalizeGoalText(parseCoreTargetDetail(target).objective || target.objective) === objective)
    || null
}

function getProgramTypeForCoreTarget(target) {
  if (target?.canonical_domain_slug === 'caregiver_support') return 'parent_training'
  if (target?.goal_type === 'decrease') return 'behavior_reduction'
  return 'skill_acquisition'
}

function getAuthDomainForCoreTarget(target) {
  if (target?.canonical_domain_slug === 'behavior') {
    return target?.goal_type === 'decrease' ? 'maladaptive' : 'replacement'
  }
  return mapCanonicalDomainToAuthGoalDomain(target?.canonical_domain_slug)
}

export function getCoreLibraryTargetsForRecommendation(recommendation, options = {}) {
  const deficitSlug = recommendation?.deficitSlug || recommendation?.canonical_deficit_slug
  if (!deficitSlug) return []

  const matches = CORE_GOAL_LIBRARY.targets
    .filter((target) => target.canonical_deficit_slug === deficitSlug)
    .sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99) || a.name.localeCompare(b.name))

  if (Number.isFinite(options.limit)) return matches.slice(0, options.limit)
  return matches
}

export function getPrimaryCoreLibraryTargetForRecommendation(recommendation) {
  return getCoreLibraryTargetsForRecommendation(recommendation, { limit: 1 })[0] || null
}

export function buildLearningTreeDraftFromCoreTarget(target, recommendation = null) {
  const detail = parseCoreTargetDetail(target)

  return {
    name: target.name,
    objective: detail.objective || target.objective || recommendation?.recommendedObjectiveSeed || target.name,
    domain: target.domain_name || CANONICAL_DOMAIN_LABELS[target.canonical_domain_slug] || 'Communication',
    ltgName: target.ltg_name || recommendation?.goalFamilyTitle || 'Assessment Recommendations',
    criteria: detail.default_criteria || target.default_criteria || recommendation?.defaultCriteria,
    goalType: detail.goal_type || target.goal_type || 'increase',
    programType: getProgramTypeForCoreTarget(target),
    dataMethod: detail.measurement_type || target.measurement_type || recommendation?.defaultMeasurementType || 'percentage',
    sourceType: target.source_type || 'core',
    sourceLabel: target.source_label || CORE_GOAL_LIBRARY_NAME,
    canonicalDeficitSlug: target.canonical_deficit_slug || recommendation?.deficitSlug || null,
    canonicalDomainSlug: target.canonical_domain_slug || recommendation?.domainSlug || null,
    libraryTargetId: target.id,
  }
}

export function mapLearningTreeDomainToAuthGoalDomain(domainName) {
  const normalized = (domainName || '').trim().toLowerCase()

  switch (normalized) {
    case 'behavior':
      return 'maladaptive'
    case 'communication':
      return 'communication'
    case 'social':
      return 'socialization'
    case 'adaptive daily living':
      return 'adaptive_daily_living'
    case 'coping & self-regulation':
    case 'coping and self-regulation':
      return 'coping_self_regulation'
    case 'parent training':
      return 'parent'
    default:
      if (normalized.includes('adaptive') || normalized.includes('daily living')) return 'adaptive_daily_living'
      if (normalized.includes('coping') || normalized.includes('regulation')) return 'coping_self_regulation'
      if (normalized.includes('social')) return 'socialization'
      if (normalized.includes('behavior')) return 'maladaptive'
      if (normalized.includes('parent')) return 'parent'
      return 'communication'
  }
}

export function buildLearningTreeDraftFromRecommendation(recommendation) {
  const libraryTarget = getPrimaryCoreLibraryTargetForRecommendation(recommendation)
  if (libraryTarget) return buildLearningTreeDraftFromCoreTarget(libraryTarget, recommendation)

  return {
    name: recommendation.goalFamilyTitle,
    objective: recommendation.recommendedObjectiveSeed,
    domain: CANONICAL_DOMAIN_LABELS[recommendation.domainSlug] || 'Communication',
    ltgName: 'Assessment Recommendations',
    criteria: recommendation.defaultCriteria,
    goalType: 'increase',
    programType: recommendation.domainSlug === 'caregiver_support' ? 'parent_training' : 'skill_acquisition',
    dataMethod: recommendation.defaultMeasurementType || 'percentage',
  }
}

export function buildAuthReportGoalFromCoreTarget(target, recommendation = null, targetDate) {
  const detail = parseCoreTargetDetail(target)
  const goalType = detail.goal_type || target.goal_type || 'increase'
  const measurementType = detail.measurement_type || target.measurement_type || recommendation?.defaultMeasurementType || 'percentage'

  return {
    id: `recommendation-${target.id}`,
    skillId: target.id,
    domain: getAuthDomainForCoreTarget({ ...target, goal_type: goalType }),
    canonical_domain_slug: target.canonical_domain_slug || recommendation?.domainSlug || null,
    canonical_deficit_slug: target.canonical_deficit_slug || recommendation?.deficitSlug || null,
    library_target_id: target.id,
    ltg_name: target.ltg_name || recommendation?.goalFamilyTitle || 'Assessment Recommendations',
    ltgName: target.ltg_name || recommendation?.goalFamilyTitle || 'Assessment Recommendations',
    stg_name: target.stg_name || recommendation?.goalFamilyTitle || '',
    program: target.name,
    objective: detail.objective || target.objective || recommendation?.recommendedObjectiveSeed || target.name,
    goalText: detail.objective || target.objective || recommendation?.recommendedObjectiveSeed || target.name,
    baseline: '0%',
    currentLevel: 'New',
    criteria: detail.default_criteria || target.default_criteria || recommendation?.defaultCriteria,
    targetDate,
    goal_type: goalType,
    measurement_type: measurementType,
    type: goalType,
    recommendation_strength: recommendation?.recommendationStrength || 'medium',
    medical_necessity_tags: detail.medical_necessity_tags || recommendation?.medicalNecessityTags || [],
    medical_necessity_rationale: detail.medical_necessity || recommendation?.medicalNecessityRationale || '',
    sourceRefs: recommendation?.sourceRefs || [],
    verification_summary: detail.verification_summary || '',
    verification_sources: detail.verification_sources || [],
    source_type: target.source_type || 'core',
    source_label: target.source_label || CORE_GOAL_LIBRARY_NAME,
    requires_bcba_review: recommendation?.requiresBcbaReview ?? true,
  }
}

export function buildAuthReportGoalFromRecommendation(recommendation, targetDate) {
  const libraryTarget = getPrimaryCoreLibraryTargetForRecommendation(recommendation)
  if (libraryTarget) return buildAuthReportGoalFromCoreTarget(libraryTarget, recommendation, targetDate)

  const authDomain = mapCanonicalDomainToAuthGoalDomain(recommendation.domainSlug)

  return {
    id: `recommendation-${recommendation.deficitSlug}`,
    skillId: recommendation.deficitSlug,
    domain: authDomain,
    canonical_domain_slug: recommendation.domainSlug,
    canonical_deficit_slug: recommendation.deficitSlug,
    ltg_name: 'Assessment Recommendations',
    ltgName: 'Assessment Recommendations',
    program: recommendation.goalFamilyTitle,
    objective: recommendation.recommendedObjectiveSeed,
    goalText: recommendation.recommendedObjectiveSeed,
    baseline: '0%',
    currentLevel: 'New',
    criteria: recommendation.defaultCriteria,
    targetDate,
    goal_type: 'increase',
    measurement_type: recommendation.defaultMeasurementType || 'percentage',
    type: 'increase',
    recommendation_strength: recommendation.recommendationStrength,
    medical_necessity_tags: recommendation.medicalNecessityTags || [],
    medical_necessity_rationale: recommendation.medicalNecessityRationale || '',
    sourceRefs: recommendation.sourceRefs || [],
    requires_bcba_review: recommendation.requiresBcbaReview ?? true,
  }
}

export function buildAssessmentRecommendationSnapshot(recommendations = []) {
  return recommendations.map((recommendation) => {
    const matchedTargets = getCoreLibraryTargetsForRecommendation(recommendation)
    return {
      deficitSlug: recommendation.deficitSlug,
      domainSlug: recommendation.domainSlug,
      goalFamilyTitle: recommendation.goalFamilyTitle,
      recommendationStrength: recommendation.recommendationStrength || 'medium',
      priorityScore: recommendation.priorityScore ?? null,
      medicalNecessityTags: recommendation.medicalNecessityTags || [],
      supportingSubAreas: (recommendation.supportingSubAreas || []).map((item) => item.subAreaName || item.subAreaId).filter(Boolean),
      matchedLibraryGoalCount: matchedTargets.length,
      primaryLibraryGoalName: matchedTargets[0]?.name || null,
    }
  })
}

function hasImportedGoalForRecommendation(recommendation, goals = []) {
  return (goals || []).some((goal) => (
    goal?.canonical_deficit_slug === recommendation.deficitSlug
    || goal?.skillId === recommendation.deficitSlug
  ))
}

export function getAssessmentRecommendationStatus(recommendation, reviewState = null, goals = []) {
  if (hasImportedGoalForRecommendation(recommendation, goals)) return 'imported'

  const excludedDeficitSlugs = Array.isArray(reviewState?.excludedDeficitSlugs)
    ? reviewState.excludedDeficitSlugs
    : []

  if (excludedDeficitSlugs.includes(recommendation.deficitSlug)) return 'excluded'
  return 'pending'
}

export function summarizeAssessmentRecommendationReview(recommendations = [], reviewState = null, goals = []) {
  const counts = { total: recommendations.length, imported: 0, excluded: 0, pending: 0 }

  for (const recommendation of recommendations) {
    const status = getAssessmentRecommendationStatus(recommendation, reviewState, goals)
    counts[status] += 1
  }

  return counts
}

export function createAssessmentRecommendationReviewState(reviewState = null, recommendations = [], options = {}) {
  const validDeficitSlugs = new Set((recommendations || []).map((recommendation) => recommendation.deficitSlug))
  let excludedDeficitSlugs = Array.isArray(reviewState?.excludedDeficitSlugs)
    ? reviewState.excludedDeficitSlugs.filter((slug) => validDeficitSlugs.has(slug))
    : []

  if (Array.isArray(options.removeExcludedDeficitSlugs) && options.removeExcludedDeficitSlugs.length > 0) {
    const removalSet = new Set(options.removeExcludedDeficitSlugs)
    excludedDeficitSlugs = excludedDeficitSlugs.filter((slug) => !removalSet.has(slug))
  }

  if (Array.isArray(options.addExcludedDeficitSlugs) && options.addExcludedDeficitSlugs.length > 0) {
    const next = new Set(excludedDeficitSlugs)
    for (const slug of options.addExcludedDeficitSlugs) {
      if (validDeficitSlugs.has(slug)) next.add(slug)
    }
    excludedDeficitSlugs = Array.from(next)
  }

  const timestamp = options.timestamp || new Date().toISOString()

  return {
    snapshot: buildAssessmentRecommendationSnapshot(recommendations),
    excludedDeficitSlugs,
    lastReviewedAt: options.touchReview ? timestamp : reviewState?.lastReviewedAt || null,
    lastImportedAt: options.touchImport ? timestamp : reviewState?.lastImportedAt || null,
  }
}
