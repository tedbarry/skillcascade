import { describe, expect, it } from 'vitest'
import { CORE_GOAL_LIBRARY } from '../../data/canonicalGoalLibrary.js'
import {
  GOAL_ADAPTATION_REASON_MIN_LENGTH,
  buildAssessmentRecommendationSnapshot,
  buildAuthReportGoalFromRecommendation,
  buildLearningTreeDraftFromRecommendation,
  buildClientProgramInsertFromLibraryGoal,
  buildGoalCanonicalSnapshot,
  createAssessmentRecommendationReviewState,
  findCoreLibraryTargetForGoal,
  getDatabaseStgId,
  getEffectiveGoalProvenanceStatus,
  getGoalProvenanceDrift,
  getGoalProvenanceFields,
  getCoreLibraryTargetsForRecommendation,
  getCoreLibraryTargetDetail,
  getAssessmentRecommendationStatus,
  getAuthReportDomainLabel,
  isGoalAdaptationReasonValid,
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
    expect(draft.provenance_status).toBe('canonical')
    expect(draft.canonical_snapshot).toMatchObject({
      library_target_id: 'core-target-safety_awareness_emergency_response-1',
      name: 'Follow emergency or safety directives immediately',
    })
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
    expect(goal.provenance_status).toBe('canonical')
    expect(goal.canonical_snapshot).toMatchObject({
      library_target_id: 'core-target-safety_awareness_emergency_response-1',
      name: 'Follow emergency or safety directives immediately',
    })
    expect(goal.targetDate).toBe('October 2026')
  })

  it('marks non-library recommendation drafts as assessment-direct provenance', () => {
    const orphanRecommendation = {
      ...adaptiveRecommendation,
      deficitSlug: 'publisher_only_low_score',
      goalFamilyTitle: 'Publisher-only Low Score',
    }

    const learningTreeDraft = buildLearningTreeDraftFromRecommendation(orphanRecommendation)
    const authGoal = buildAuthReportGoalFromRecommendation(orphanRecommendation, 'November 2026')

    expect(learningTreeDraft.provenance_status).toBe('assessment_direct')
    expect(learningTreeDraft.canonical_snapshot).toBeNull()
    expect(authGoal.provenance_status).toBe('assessment_direct')
    expect(authGoal.canonical_snapshot).toBeNull()
    expect(authGoal.source_label).toBe('Assessment Recommendation')
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

  it('does not treat built-in core library ids as database UUIDs', () => {
    const [target] = getCoreLibraryTargetsForRecommendation(adaptiveRecommendation, { limit: 1 })

    expect(target.stg_id).toMatch(/^core-stg-/)
    expect(getDatabaseStgId(target.stg_id)).toBeNull()
    expect(getDatabaseStgId('11111111-1111-4111-8111-111111111111')).toBe('11111111-1111-4111-8111-111111111111')
  })

  it('builds client-program inserts that preserve library provenance without writing core ids into stg_id', () => {
    const [target] = getCoreLibraryTargetsForRecommendation(adaptiveRecommendation, { limit: 1 })
    const detail = getCoreLibraryTargetDetail(target)
    const program = buildClientProgramInsertFromLibraryGoal({
      id: target.id,
      stg_id: target.stg_id,
      library_target_id: target.id,
      name: target.name,
      objective: detail.objective,
      domain_name: target.domain_name,
      ltg_name: target.ltg_name,
      stg_name: target.stg_name,
      default_criteria: detail.default_criteria,
      source_type: target.source_type,
      source_label: target.source_label,
      canonical_domain_slug: target.canonical_domain_slug,
      canonical_deficit_slug: target.canonical_deficit_slug,
      medical_necessity_tags: detail.medical_necessity_tags,
      medical_necessity_rationale: detail.medical_necessity,
      verification_summary: detail.verification_summary,
      verification_sources: detail.verification_sources,
    }, 'client-1')

    expect(program.stg_id).toBeNull()
    expect(program.library_target_id).toBe(target.id)
    expect(program.canonical_deficit_slug).toBe(target.canonical_deficit_slug)
    expect(program.source_label).toBe('SkillCascade Medically Necessary Library')
    expect(program.medical_necessity_tags.length).toBeGreaterThan(0)
    expect(program.verification_sources.length).toBeGreaterThan(0)
    expect(program.provenance_status).toBe('canonical')
    expect(program.adaptation_reason).toBeNull()
    expect(program.canonical_snapshot).toMatchObject({
      library_target_id: target.id,
      name: target.name,
      objective: detail.objective,
      criteria: detail.default_criteria,
      measurement_type: detail.measurement_type,
      goal_type: detail.goal_type,
      domain: target.domain_name,
      verification_summary: detail.verification_summary,
    })
  })

  it('keeps baseline, status, mastery, and progress data out of provenance drift', () => {
    const [target] = getCoreLibraryTargetsForRecommendation(adaptiveRecommendation, { limit: 1 })
    const detail = getCoreLibraryTargetDetail(target)
    const program = {
      library_target_id: target.id,
      name: target.name,
      objective: detail.objective,
      criteria: detail.default_criteria,
      measurement_type: detail.measurement_type,
      goal_type: detail.goal_type,
      domain: target.domain_name,
      provenance_status: 'canonical',
      canonical_snapshot: buildGoalCanonicalSnapshot({ ...target, ...detail, library_target_id: target.id }),
    }

    const drift = getGoalProvenanceDrift(program, {
      baseline: '20% with prompts',
      current_level: '55%',
      status: 'intervention',
      mastered: true,
      last_session_score: 80,
    })

    expect(drift.isDrifted).toBe(false)
    expect(drift.changedFields).toEqual([])
    expect(getEffectiveGoalProvenanceStatus(program, {
      baseline: '20% with prompts',
      status: 'intervention',
    })).toBe('canonical')
  })

  it('marks canonical goals as adapted when protected fields differ from the immutable snapshot', () => {
    const [target] = getCoreLibraryTargetsForRecommendation(adaptiveRecommendation, { limit: 1 })
    const detail = getCoreLibraryTargetDetail(target)
    const program = {
      library_target_id: target.id,
      name: target.name,
      objective: detail.objective,
      criteria: detail.default_criteria,
      measurement_type: detail.measurement_type,
      goal_type: detail.goal_type,
      domain: target.domain_name,
      provenance_status: 'canonical',
      canonical_snapshot: buildGoalCanonicalSnapshot({ ...target, ...detail, library_target_id: target.id }),
    }

    const drift = getGoalProvenanceDrift(program, {
      objective: `${detail.objective} with visual supports.`,
      criteria: '90% accuracy across 4 consecutive sessions',
      measurement_type: 'frequency',
      name: `${target.name} - adapted`,
    })

    expect(drift.isDrifted).toBe(true)
    expect(drift.changedFields).toEqual(expect.arrayContaining(['name', 'objective', 'criteria', 'measurement_type']))
    expect(getEffectiveGoalProvenanceStatus(program, {
      objective: `${detail.objective} with visual supports.`,
    })).toBe('adapted')
  })

  it('requires a short auditable BCBA adaptation reason before saving adapted library goals', () => {
    expect(GOAL_ADAPTATION_REASON_MIN_LENGTH).toBe(10)
    expect(isGoalAdaptationReasonValid('too short')).toBe(false)
    expect(isGoalAdaptationReasonValid('Client profile requires a safer response form.')).toBe(true)
  })

  it('normalizes provenance fields from camelCase and snake_case sources', () => {
    expect(getGoalProvenanceFields({
      libraryTargetId: 'core-target-help',
      canonicalDomainSlug: 'communication',
      canonical_deficit_slug: 'functional_communication',
      sourceType: 'core',
      source_label: 'SkillCascade Medically Necessary Library',
      medicalNecessityRationale: 'Functionally necessary.',
      verificationSummary: 'Publicly verifiable.',
      verification_sources: [{ label: 'WHO ICF' }],
    })).toMatchObject({
      library_target_id: 'core-target-help',
      canonical_domain_slug: 'communication',
      canonical_deficit_slug: 'functional_communication',
      source_type: 'core',
      source_label: 'SkillCascade Medically Necessary Library',
      medical_necessity_rationale: 'Functionally necessary.',
      verification_summary: 'Publicly verifiable.',
      verification_sources: [{ label: 'WHO ICF' }],
    })
  })

  it('recognizes imported client goals that came from the built-in library', () => {
    const match = findCoreLibraryTargetForGoal({
      name: 'Follow emergency or safety directives immediately',
      objective: 'The client will follow emergency, safety, or protective directives immediately and remain with the adult or safe location during high-risk routines.',
    })
    const detail = getCoreLibraryTargetDetail(match)

    expect(match?.canonical_deficit_slug).toBe('safety_awareness_emergency_response')
    expect(detail.verification_summary).toContain('WHO ICF')
  })

  it('recognizes core library target ids stored in goal skill ids', () => {
    const [target] = getCoreLibraryTargetsForRecommendation(adaptiveRecommendation, { limit: 1 })

    expect(findCoreLibraryTargetForGoal({ skillId: target.id })?.id).toBe(target.id)
    expect(findCoreLibraryTargetForGoal({ id: `recommendation-${target.id}` })?.id).toBe(target.id)
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

  it('keeps all built-in library goals medically necessary and publicly verifiable', () => {
    expect(CORE_GOAL_LIBRARY.targets).toHaveLength(224)

    for (const target of CORE_GOAL_LIBRARY.targets) {
      const detail = JSON.parse(target.description)

      expect(detail.verification_summary, target.name).toBeTruthy()
      expect(detail.verification_sources?.length, target.name).toBeGreaterThan(0)
      expect(detail.medical_necessity, target.name).toBeTruthy()
      expect(detail.medical_necessity_tags?.length, target.name).toBeGreaterThan(0)
      expect(detail.recommended_when, target.name).toBeTruthy()
      expect(detail.assessment_signals?.length, target.name).toBeGreaterThan(0)
    }
  })
})
