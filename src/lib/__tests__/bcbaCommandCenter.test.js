import { describe, expect, it } from 'vitest'
import { buildBcbaCommandCenterSummary } from '../bcbaCommandCenter.js'
import { getCoreLibraryTargetsForRecommendation } from '../recommendationDraftAdapters.js'

function communicationRecommendation(overrides = {}) {
  return {
    domainSlug: 'communication',
    deficitSlug: 'functional_communication_initiation',
    goalFamilyTitle: 'Functional Communication Initiation',
    recommendedObjectiveSeed: 'The client will initiate functional communication across routines.',
    defaultMeasurementType: 'percentage',
    defaultCriteria: '80% accuracy across 3 consecutive sessions',
    priorityScore: 0.86,
    recommendationStrength: 'high',
    medicalNecessityTags: ['communication_access', 'behavior_risk_reduction'],
    medicalNecessityRationale: 'Functional communication deficits limit access to needs and increase behavior risk.',
    evidenceSummary: 'Expressive Communication: 3 low-scored skills',
    supportingSubAreas: [],
    sourceRefs: ['d5-sa1-sg1-s1'],
    ...overrides,
  }
}

describe('bcbaCommandCenter', () => {
  it('starts with assessment and client setup when no client data is ready', () => {
    const summary = buildBcbaCommandCenterSummary({
      assessments: {},
      hasClient: false,
    })

    expect(summary.coverage.hasAssessmentData).toBe(false)
    expect(summary.nextActions.map((action) => action.id)).toContain('select-client')
    expect(summary.nextActions.map((action) => action.id)).toContain('complete-assessment')
  })

  it('prioritizes pending Clinical Evidence decisions from assessment recommendations', () => {
    const summary = buildBcbaCommandCenterSummary({
      recommendations: [communicationRecommendation()],
      programs: [],
      decisions: [],
      reports: [],
      hasClient: true,
    })

    expect(summary.evidenceSummary.totalRecommendations).toBe(1)
    expect(summary.evidenceSummary.pending).toBe(1)
    expect(summary.topRecommendations[0]).toMatchObject({
      family: 'Functional Communication Initiation',
      decisionLabel: 'Pending BCBA Decision',
    })
    expect(summary.nextActions[0]).toMatchObject({
      id: 'review-evidence',
      view: 'clinical-evidence',
    })
  })

  it('separates imported evidence support from unsupported custom goals', () => {
    const recommendation = communicationRecommendation()
    const [target] = getCoreLibraryTargetsForRecommendation(recommendation, { limit: 1 })
    const programs = [
      {
        id: 'program-1',
        name: target.name,
        library_target_id: target.id,
        canonical_deficit_slug: target.canonical_deficit_slug,
        provenance_status: 'canonical',
      },
      {
        id: 'program-2',
        name: 'Custom feeding goal',
        provenance_status: 'custom',
      },
    ]
    const decisions = [
      {
        client_id: 'client-1',
        canonical_target_id: target.id,
        decision_status: 'imported',
        client_program_id: 'program-1',
        evidence_snapshot: {
          canonical_target_id: target.id,
          mapped_goal_family_ids: [target.canonical_deficit_slug],
        },
      },
    ]

    const summary = buildBcbaCommandCenterSummary({
      recommendations: [recommendation],
      programs,
      decisions,
      reports: [{ id: 'report-1', createdAt: 1000 }],
    })

    expect(summary.evidenceSummary.imported).toBe(1)
    expect(summary.goalEvidence.assessmentSupported).toBe(1)
    expect(summary.goalEvidence.custom).toBe(1)
    expect(summary.goalEvidence.needsSupport).toBe(1)
    expect(summary.nextActions.map((action) => action.id)).toContain('strengthen-goal-support')
    expect(summary.reports.totalReports).toBe(1)
  })
})
