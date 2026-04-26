import { describe, expect, it } from 'vitest'
import {
  buildAssessmentRecommendationSnapshot,
  buildAuthReportGoalFromRecommendation,
  buildLearningTreeDraftFromRecommendation,
  createAssessmentRecommendationReviewState,
  getCoreLibraryTargetsForRecommendation,
  getAssessmentRecommendationStatus,
  getAuthReportDomainLabel,
  mapLearningTreeDomainToAuthGoalDomain,
  summarizeAssessmentRecommendationReview,
} from '../recommendationDraftAdapters.js'

const adaptiveRecommendation = {
  domainSlug: 'adaptive_daily_living',
  deficitSlug: 'safety_awareness_emergency_response',
  goalFamilyTitle: 'Safety Awareness and Emergency Response',
  recommendedObjectiveSeed: 'The client will recognize danger cues and follow safety routines across community environments.',
  defaultMeasurementType: 'percentage',
  defaultCriteria: '80% accuracy across 3 consecutive sessions',
  recommendationStrength: 'high',
  medicalNecessityTags: ['safety', 'community_participation'],
  medicalNecessityRationale: 'Weak assessment findings indicate a safety-focused need.',
  sourceRefs: ['d8-sa1-sg2-s1'],
}

describe('recommendationDraftAdapters', () => {
  it('builds a learning-tree draft with the canonical domain label', () => {
    const draft = buildLearningTreeDraftFromRecommendation(adaptiveRecommendation)

    expect(draft.name).toBe('Follow emergency or safety directives immediately')
    expect(draft.domain).toBe('Adaptive Daily Living')
    expect(draft.ltgName).toBe('Safety and Community Functioning')
    expect(draft.dataMethod).toBe('percentage')
    expect(draft.sourceLabel).toBe('SkillCascade Medically Necessary Library')
    expect(draft.canonicalDeficitSlug).toBe('safety_awareness_emergency_response')
  })

  it('builds an auth-report goal that preserves canonical recommendation context', () => {
    const goal = buildAuthReportGoalFromRecommendation(adaptiveRecommendation, 'October 2026')

    expect(goal.domain).toBe('adaptive_daily_living')
    expect(goal.canonical_domain_slug).toBe('adaptive_daily_living')
    expect(goal.canonical_deficit_slug).toBe('safety_awareness_emergency_response')
    expect(goal.program).toBe('Follow emergency or safety directives immediately')
    expect(goal.source_label).toBe('SkillCascade Medically Necessary Library')
    expect(goal.verification_sources.length).toBeGreaterThan(3)
    expect(goal.targetDate).toBe('October 2026')
  })

  it('finds exact built-in library targets for a recommendation family', () => {
    const matches = getCoreLibraryTargetsForRecommendation(adaptiveRecommendation)

    expect(matches.length).toBeGreaterThan(1)
    expect(matches[0]).toMatchObject({
      name: 'Follow emergency or safety directives immediately',
      canonical_deficit_slug: 'safety_awareness_emergency_response',
      source_type: 'core',
    })
  })

  it('maps new learning-tree domains into auth-report domains', () => {
    expect(mapLearningTreeDomainToAuthGoalDomain('Adaptive Daily Living')).toBe('adaptive_daily_living')
    expect(mapLearningTreeDomainToAuthGoalDomain('Coping & Self-Regulation')).toBe('coping_self_regulation')
  })

  it('returns readable labels for new auth-report domains', () => {
    expect(getAuthReportDomainLabel('coping_self_regulation')).toBe('Coping & Self-Regulation')
  })

  it('summarizes pending, imported, and excluded recommendation review states', () => {
    const recommendations = [
      adaptiveRecommendation,
      {
        ...adaptiveRecommendation,
        deficitSlug: 'coping_skills_flexibility',
        goalFamilyTitle: 'Coping Skills and Flexibility',
      },
      {
        ...adaptiveRecommendation,
        deficitSlug: 'help_seeking_self_advocacy',
        domainSlug: 'communication',
        goalFamilyTitle: 'Help-Seeking and Self-Advocacy',
      },
    ]

    const reviewState = createAssessmentRecommendationReviewState(null, recommendations, {
      addExcludedDeficitSlugs: ['coping_skills_flexibility'],
      touchReview: true,
      timestamp: '2026-04-24T17:00:00.000Z',
    })

    const goals = [
      {
        canonical_deficit_slug: 'safety_awareness_emergency_response',
        skillId: 'safety_awareness_emergency_response',
      },
    ]

    expect(getAssessmentRecommendationStatus(recommendations[0], reviewState, goals)).toBe('imported')
    expect(getAssessmentRecommendationStatus(recommendations[1], reviewState, goals)).toBe('excluded')
    expect(getAssessmentRecommendationStatus(recommendations[2], reviewState, goals)).toBe('pending')
    expect(summarizeAssessmentRecommendationReview(recommendations, reviewState, goals)).toEqual({
      total: 3,
      imported: 1,
      excluded: 1,
      pending: 1,
    })
  })

  it('builds a compact snapshot and removes stale exclusions when recommendations change', () => {
    const recommendations = [
      adaptiveRecommendation,
      {
        ...adaptiveRecommendation,
        deficitSlug: 'help_seeking_self_advocacy',
        domainSlug: 'communication',
        goalFamilyTitle: 'Help-Seeking and Self-Advocacy',
      },
    ]

    const snapshot = buildAssessmentRecommendationSnapshot(recommendations)
    expect(snapshot[0]).toMatchObject({
      deficitSlug: 'safety_awareness_emergency_response',
      domainSlug: 'adaptive_daily_living',
      matchedLibraryGoalCount: expect.any(Number),
      primaryLibraryGoalName: 'Follow emergency or safety directives immediately',
    })

    const reviewState = createAssessmentRecommendationReviewState({
      excludedDeficitSlugs: ['retired_slug', 'help_seeking_self_advocacy'],
      lastReviewedAt: '2026-04-20T00:00:00.000Z',
    }, recommendations)

    expect(reviewState.excludedDeficitSlugs).toEqual(['help_seeking_self_advocacy'])
    expect(reviewState.snapshot).toHaveLength(2)
  })
})
