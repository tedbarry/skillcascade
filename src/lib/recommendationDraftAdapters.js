import { CANONICAL_DOMAIN_LABELS } from '../data/canonicalRecommendationProfiles.js'

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

export function buildAuthReportGoalFromRecommendation(recommendation, targetDate) {
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
  return recommendations.map((recommendation) => ({
    deficitSlug: recommendation.deficitSlug,
    domainSlug: recommendation.domainSlug,
    goalFamilyTitle: recommendation.goalFamilyTitle,
    recommendationStrength: recommendation.recommendationStrength || 'medium',
    priorityScore: recommendation.priorityScore ?? null,
    medicalNecessityTags: recommendation.medicalNecessityTags || [],
    supportingSubAreas: (recommendation.supportingSubAreas || []).map((item) => item.subAreaName || item.subAreaId).filter(Boolean),
  }))
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
