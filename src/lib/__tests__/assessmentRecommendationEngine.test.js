import { describe, expect, it } from 'vitest'
import { buildAssessmentRecommendations, collectAssessmentFindings } from '../assessmentRecommendationEngine.js'
import { framework } from '../../data/framework.js'

describe('collectAssessmentFindings', () => {
  it('detects cluster findings from low-scored skills inside a sub-area', () => {
    const findings = collectAssessmentFindings({
      'd5-sa1-sg1-s1': 0,
      'd5-sa1-sg3-s1': 1,
      'd5-sa1-sg4-s1': 1,
      'd5-sa1-sg5-s1': 2,
    })

    const requestingHelp = findings.find((finding) => finding.subAreaId === 'd5-sa1')
    expect(requestingHelp).toBeTruthy()
    expect(requestingHelp.triggerType).toBe('cluster')
    expect(requestingHelp.weakCount).toBe(3)
    expect(requestingHelp.fragileCount).toBe(1)
  })
})

describe('buildAssessmentRecommendations', () => {
  it('merges multiple low-scored help-seeking sub-areas into one canonical recommendation', () => {
    const recommendations = buildAssessmentRecommendations({
      'd5-sa1-sg1-s1': 0,
      'd5-sa1-sg3-s1': 1,
      'd5-sa1-sg4-s1': 1,
      'd5-sa5-sg1-s1': 1,
      'd5-sa5-sg2-s1': 0,
      'd5-sa5-sg3-s1': 1,
      'd9-sa3-sg1-s1': 1,
      'd9-sa3-sg1-s3': 0,
    })

    const helpSeeking = recommendations.find((rec) => rec.deficitSlug === 'help_seeking_self_advocacy')
    expect(helpSeeking).toBeTruthy()
    expect(helpSeeking.recommendationStrength).toBe('high')
    expect(helpSeeking.supportingSubAreas.map((item) => item.subAreaId)).toEqual(
      expect.arrayContaining(['d5-sa1', 'd5-sa5', 'd9-sa3'])
    )
    expect(helpSeeking.medicalNecessityTags).toEqual(
      expect.arrayContaining(['communication_access', 'treatment_access', 'safety'])
    )
    expect(helpSeeking.recommendedObjectiveSeed).toMatch(/request help, clarification, accommodation, or support/i)
  })

  it('builds a safety-focused recommendation when emergency-response items are weak', () => {
    const recommendations = buildAssessmentRecommendations({
      'd8-sa1-sg2-s1': 0,
      'd8-sa1-sg2-s2': 1,
      'd8-sa1-sg3-s1': 1,
    })

    expect(recommendations[0].deficitSlug).toBe('safety_awareness_emergency_response')
    expect(recommendations[0].medicalNecessityTags).toContain('safety')
    expect(recommendations[0].goalFamilyTitle).toBe('Safety Awareness and Emergency Response')
  })

  it('returns no recommendations when there are no assessed gaps', () => {
    const recommendations = buildAssessmentRecommendations({
      'd5-sa1-sg1-s1': 3,
      'd5-sa1-sg3-s1': 3,
      'd8-sa1-sg2-s1': 3,
    })

    expect(recommendations).toEqual([])
  })

  it('caps default assessment recommendations to avoid goal-mill output', () => {
    const broadLowAssessment = {}

    for (const domain of framework) {
      for (const subArea of domain.subAreas) {
        const firstSkill = subArea.skillGroups.flatMap((group) => group.skills)[0]
        if (firstSkill) broadLowAssessment[firstSkill.id] = 0
      }
    }

    const recommendations = buildAssessmentRecommendations(broadLowAssessment)
    const domainCounts = recommendations.reduce((counts, recommendation) => {
      counts[recommendation.domainSlug] = (counts[recommendation.domainSlug] || 0) + 1
      return counts
    }, {})

    expect(recommendations.length).toBeLessThanOrEqual(10)
    expect(Math.max(...Object.values(domainCounts))).toBeLessThanOrEqual(3)
  })
})
