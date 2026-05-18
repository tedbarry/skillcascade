import { describe, expect, it } from 'vitest'
import { CORE_GOAL_LIBRARY } from '../../data/canonicalGoalLibrary.js'
import { GOAL_PROVENANCE_STATUSES } from '../recommendationDraftAdapters.js'
import {
  CLIENT_GOAL_DECISION_STATUSES,
  buildAssessmentEvidenceSnapshot,
  buildClientGoalDecisionPayload,
  buildGoalDecisionPayloadFromImport,
  deriveClinicalEvidenceRows,
  getAuthEvidenceStatusForGoal,
  normalizeClientGoalDecisionStatus,
} from '../clinicalEvidenceSpine.js'

const target = CORE_GOAL_LIBRARY.targets.find((item) => item.canonical_domain_slug === 'communication')

function sampleRecommendation(overrides = {}) {
  return {
    domainSlug: target.canonical_domain_slug,
    deficitSlug: target.canonical_deficit_slug,
    goalFamilyTitle: target.stg_name,
    recommendedObjectiveSeed: target.objective,
    defaultMeasurementType: target.measurement_type,
    defaultCriteria: target.default_criteria,
    priorityScore: 0.88,
    recommendationStrength: 'high',
    medicalNecessityTags: ['communication_access', 'treatment_access'],
    medicalNecessityRationale: 'Low-scored communication findings support a medically necessary goal.',
    evidenceSummary: 'Expressive Communication: 3 low-scored skills',
    sourceRefs: ['d5-sa1-sg1-s1'],
    supportingSubAreas: [
      {
        subAreaId: 'd5-sa1',
        subAreaName: 'Requesting Help',
        domainName: 'Communication',
        triggerType: 'cluster',
        avgLevel: 0.5,
        severity: 0.8,
        weakSkillNames: ['Requests help'],
        fragileSkillNames: [],
      },
    ],
    ...overrides,
  }
}

describe('clinicalEvidenceSpine', () => {
  it('keeps decision statuses separate from goal provenance statuses', () => {
    expect(CLIENT_GOAL_DECISION_STATUSES).toEqual([
      'pending',
      'imported',
      'excluded',
      'linked',
      'needs_prerequisite',
      'needs_assessment',
    ])
    expect(CLIENT_GOAL_DECISION_STATUSES.some((status) => GOAL_PROVENANCE_STATUSES.includes(status))).toBe(false)
    expect(normalizeClientGoalDecisionStatus('canonical')).toBe('pending')
  })

  it('builds structured assessment evidence snapshots without copying publisher goal banks', () => {
    const snapshot = buildAssessmentEvidenceSnapshot(sampleRecommendation(), target, {
      assessmentTool: 'SkillCascade Assessment',
      sourceAssessmentId: 'assessment-1',
      sourceAssessmentDate: '2026-04-29T12:00:00.000Z',
    })

    expect(snapshot.assessment_tool).toBe('SkillCascade Assessment')
    expect(snapshot.source_assessment_id).toBe('assessment-1')
    expect(snapshot.source_assessment_date).toBe('2026-04-29')
    expect(snapshot.canonical_target_id).toBe(target.id)
    expect(snapshot.mapped_goal_family_ids).toContain(target.canonical_deficit_slug)
    expect(snapshot.mapped_target_ids).toContain(target.id)
    expect(snapshot.signal_labels.length).toBeGreaterThan(0)
    expect(snapshot.recommendation_strength).toBe('high')
    expect(snapshot.confidence).toBe(0.9)
  })

  it('creates persisted decision payloads for all V1 decision flows', () => {
    for (const status of CLIENT_GOAL_DECISION_STATUSES) {
      const payload = buildClientGoalDecisionPayload({
        clientId: 'client-1',
        recommendation: sampleRecommendation(),
        target,
        status,
        clientProgramId: status === 'imported' ? 'program-1' : null,
        userId: 'user-1',
        reasonCode: status,
        reasonText: `${status} reason`,
        sourceAssessmentDate: '2026-04-29',
      })

      expect(payload.client_id).toBe('client-1')
      expect(payload.canonical_target_id).toBe(target.id)
      expect(payload.decision_status).toBe(status)
      expect(payload.evidence_snapshot.canonical_target_id).toBe(target.id)
      if (status === 'pending') expect(payload.decided_at).toBeNull()
      else expect(payload.decided_at).toBeTruthy()
    }
  })

  it('bridges assessment-supported goal imports into persisted decisions without inventing evidence', () => {
    const libraryGoal = {
      id: 'goal-1',
      name: target.name,
      library_target_id: target.id,
      canonical_deficit_slug: target.canonical_deficit_slug,
      objective: target.objective,
    }

    const assessmentBackedPayload = buildGoalDecisionPayloadFromImport({
      clientId: 'client-1',
      goal: libraryGoal,
      recommendations: [sampleRecommendation()],
      clientProgramId: 'program-1',
      userId: 'user-1',
    })

    expect(assessmentBackedPayload.client_id).toBe('client-1')
    expect(assessmentBackedPayload.canonical_target_id).toBe(target.id)
    expect(assessmentBackedPayload.decision_status).toBe('imported')
    expect(assessmentBackedPayload.client_program_id).toBe('program-1')
    expect(assessmentBackedPayload.evidence_snapshot.source_refs).toEqual(['d5-sa1-sg1-s1'])

    expect(buildGoalDecisionPayloadFromImport({
      clientId: 'client-1',
      goal: libraryGoal,
      recommendations: [],
    })).toBeNull()
  })

  it('joins recommendations, persisted decisions, and Learning Tree goals', () => {
    const recommendation = sampleRecommendation()
    const program = {
      id: 'program-1',
      name: target.name,
      library_target_id: target.id,
      canonical_deficit_slug: target.canonical_deficit_slug,
      provenance_status: 'canonical',
    }
    const decision = {
      id: 'decision-1',
      canonical_target_id: target.id,
      decision_status: 'linked',
      client_program_id: 'program-1',
      evidence_snapshot: buildAssessmentEvidenceSnapshot(recommendation, target),
    }

    const rows = deriveClinicalEvidenceRows({
      recommendations: [recommendation],
      decisions: [decision],
      programs: [program],
    })

    expect(rows).toHaveLength(1)
    expect(rows[0].clientProgramId).toBe('program-1')
    expect(rows[0].decisionStatus).toBe('linked')
    expect(rows[0].authReportSupport.status).toBe('assessment_supported')
  })

  it('flags custom and adapted auth-report goals that need more support', () => {
    const customStatus = getAuthEvidenceStatusForGoal({
      id: 'custom-1',
      name: 'Custom caregiver goal',
      provenance_status: 'custom',
    }, [])
    const adaptedStatus = getAuthEvidenceStatusForGoal({
      id: 'program-2',
      name: target.name,
      library_target_id: target.id,
      provenance_status: 'adapted',
      canonical_snapshot: { name: target.name },
    }, [])

    expect(customStatus.status).toBe('needs_support')
    expect(adaptedStatus.status).toBe('adapted')
  })
})
