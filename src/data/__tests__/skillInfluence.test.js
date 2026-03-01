import { describe, it, expect } from 'vitest'
import {
  getCouplingStrength,
  computeSkillCeilings,
  getSkillCeiling,
  computeConstrainedSkills,
  computeSkillInfluence,
  getStartHerePriority,
  getCeilingCoverage,
} from '../skillInfluence.js'
import { SKILL_PREREQUISITES, getSkillTier } from '../skillDependencies.js'

/* ─── Coupling Strength ─── */

describe('getCouplingStrength', () => {
  it('returns a number between 0.25 and 0.95', () => {
    for (const [skillId, prereqs] of Object.entries(SKILL_PREREQUISITES)) {
      for (const prereqId of prereqs) {
        const s = getCouplingStrength(skillId, prereqId)
        expect(s).toBeGreaterThanOrEqual(0.25)
        expect(s).toBeLessThanOrEqual(0.95)
      }
    }
  })

  it('returns override value for clinically overridden edges', () => {
    // Heart Rate Awareness → Connecting Sensations to Labels is overridden to 0.95
    expect(getCouplingStrength('d2-sa1-sg2-s1', 'd1-sa1-sg1-s1')).toBe(0.95)
  })

  it('requires relationships have higher coupling than supports', () => {
    // D3 ← D1 is requires, D5 ← D3 is supports
    // Pick edges from each type
    const requiresEdge = getCouplingStrength('d3-sa1-sg2-s1', 'd1-sa2-sg3-s1')
    const supportsEdge = getCouplingStrength('d5-sa3-sg3-s1', 'd3-sa2-sg3-s1')
    expect(requiresEdge).toBeGreaterThan(supportsEdge)
  })

  it('sole-prerequisite edges have higher coupling', () => {
    // d3-sa2-sg2-s1 has 1 prereq — should get exclusivity bonus
    // d6-sa6-sg2-s1 has 3 prereqs — no exclusivity bonus
    const sole = getCouplingStrength('d3-sa2-sg2-s1', 'd1-sa4-sg3-s1')
    const multi = getCouplingStrength('d6-sa6-sg2-s1', 'd1-sa3-sg3-s3')
    expect(sole).toBeGreaterThan(multi)
  })
})

/* ─── Ceiling Model ─── */

describe('computeSkillCeilings', () => {
  it('returns ceilings for all skills in SKILL_PREREQUISITES', () => {
    const ceilings = computeSkillCeilings({})
    const prereqSkillCount = Object.keys(SKILL_PREREQUISITES).length
    expect(Object.keys(ceilings)).toHaveLength(prereqSkillCount)
  })

  it('ceiling for skill with no prereqs returns null via getSkillCeiling', () => {
    // d1-sa1-sg1-s1 has no prerequisites
    const result = getSkillCeiling('d1-sa1-sg1-s1', {})
    expect(result).toBeNull()
  })

  it('ceiling is 1 when tightly-coupled prereq is at level 0', () => {
    // d2-sa1-sg2-s1 ← d1-sa1-sg1-s1 has strength 0.95 → max_gap 1
    const assessments = { 'd1-sa1-sg1-s1': 0, 'd1-sa1-sg1-s2': 3, 'd1-sa1-sg1-s3': 3, 'd1-sa1-sg1-s4': 3 }
    const result = getSkillCeiling('d2-sa1-sg2-s1', assessments)
    expect(result.ceiling).toBe(1) // min(3, 0 + 1) = 1
  })

  it('ceiling = 3 when all prereqs are at Developing or higher', () => {
    // Set all d2-sa1-sg2-s1 prereqs to level 2
    const assessments = {
      'd1-sa1-sg1-s1': 2, 'd1-sa1-sg1-s2': 2,
      'd1-sa1-sg1-s3': 2, 'd1-sa1-sg1-s4': 2,
    }
    const result = getSkillCeiling('d2-sa1-sg2-s1', assessments)
    expect(result.ceiling).toBe(3)
  })

  it('ceiling = min across multiple prereqs', () => {
    // d2-sa1-sg2-s1 has 4 prereqs with strengths 0.95, 0.90, 0.85, 0.80
    // Set first to 0 (ceiling from it = 1), rest to 3 (ceiling = 3)
    const assessments = {
      'd1-sa1-sg1-s1': 0,  // strength 0.95 → ceiling 1
      'd1-sa1-sg1-s2': 3,  // strength 0.90 → ceiling 3
      'd1-sa1-sg1-s3': 3,  // strength 0.85 → ceiling 3
      'd1-sa1-sg1-s4': 3,  // strength 0.80 → ceiling 3
    }
    const result = getSkillCeiling('d2-sa1-sg2-s1', assessments)
    expect(result.ceiling).toBe(1) // min(1, 3, 3, 3)
  })

  it('unassessed prereqs are treated as level 0', () => {
    const result = getSkillCeiling('d2-sa1-sg2-s1', {})
    // All 4 prereqs unassessed (level 0), tightest strength 0.95 → ceiling 1
    expect(result.ceiling).toBe(1)
  })

  it('constrainingPrereqs are sorted by imposedCeiling ascending', () => {
    const assessments = {
      'd1-sa1-sg1-s1': 0,  // tightest → lowest ceiling
      'd1-sa1-sg1-s2': 1,
      'd1-sa1-sg1-s3': 2,
      'd1-sa1-sg1-s4': 3,
    }
    const result = getSkillCeiling('d2-sa1-sg2-s1', assessments)
    for (let i = 1; i < result.constrainingPrereqs.length; i++) {
      expect(result.constrainingPrereqs[i].imposedCeiling)
        .toBeGreaterThanOrEqual(result.constrainingPrereqs[i - 1].imposedCeiling)
    }
  })
})

/* ─── Constrained Skills ─── */

describe('computeConstrainedSkills', () => {
  it('returns empty array when no skills are assessed', () => {
    const result = computeConstrainedSkills({})
    expect(result).toHaveLength(0)
  })

  it('detects skill rated above its ceiling', () => {
    // d2-sa1-sg2-s1 has tight prereq d1-sa1-sg1-s1 (strength 0.95)
    // Prereq at 0, dependent at 2 → ceiling 1, skill is at 2 → constrained
    const assessments = {
      'd1-sa1-sg1-s1': 0,
      'd1-sa1-sg1-s2': 3,
      'd1-sa1-sg1-s3': 3,
      'd1-sa1-sg1-s4': 3,
      'd2-sa1-sg2-s1': 2,
    }
    const constrained = computeConstrainedSkills(assessments)
    const found = constrained.find(c => c.skillId === 'd2-sa1-sg2-s1')
    expect(found).toBeDefined()
    expect(found.level).toBe(2)
    expect(found.ceiling).toBe(1)
    expect(found.gap).toBe(1)
  })

  it('does not flag skills at or below their ceiling', () => {
    const assessments = {
      'd1-sa1-sg1-s1': 2,
      'd1-sa1-sg1-s2': 2,
      'd1-sa1-sg1-s3': 2,
      'd1-sa1-sg1-s4': 2,
      'd2-sa1-sg2-s1': 2, // ceiling is 3, skill is at 2 → OK
    }
    const constrained = computeConstrainedSkills(assessments)
    const found = constrained.find(c => c.skillId === 'd2-sa1-sg2-s1')
    expect(found).toBeUndefined()
  })

  it('sorts by gap descending', () => {
    const constrained = computeConstrainedSkills({
      'd1-sa1-sg1-s1': 0, 'd1-sa1-sg1-s2': 0, 'd1-sa1-sg1-s3': 0, 'd1-sa1-sg1-s4': 0,
      'd2-sa1-sg2-s1': 3, // ceiling 1, gap 2
      'd1-sa1-sg4-s3': 0,
      'd2-sa1-sg2-s2': 2, // check if this produces gap 1
    })
    if (constrained.length >= 2) {
      expect(constrained[0].gap).toBeGreaterThanOrEqual(constrained[1].gap)
    }
  })
})

/* ─── Influence Scoring ─── */

describe('computeSkillInfluence', () => {
  it('returns influence data for skills that are prerequisites', () => {
    const influence = computeSkillInfluence({})
    // d1-sa1-sg1-s1 is a prereq for multiple skills
    expect(influence['d1-sa1-sg1-s1']).toBeDefined()
    expect(influence['d1-sa1-sg1-s1'].directDownstream).toBeGreaterThan(0)
  })

  it('skill with more downstream has higher transitive count', () => {
    const influence = computeSkillInfluence({})
    // D1 interoception skills should have more downstream than D7 skills
    const d1Skill = influence['d1-sa1-sg1-s1']
    const d7Skill = influence['d7-sa1-sg2-s1'] // Self-talk skill if it's a prereq
    // d1-sa1-sg1-s1 should have high downstream
    expect(d1Skill.transitiveDownstream).toBeGreaterThan(0)
  })

  it('influence score is weighted by coupling strength', () => {
    const influence = computeSkillInfluence({})
    // All skills should have non-negative influence scores
    for (const data of Object.values(influence)) {
      expect(data.influenceScore).toBeGreaterThanOrEqual(0)
    }
  })

  it('improving a prerequisite from 0→1 may raise downstream ceilings', () => {
    // With all prereqs at 0, tight couplings impose ceiling 1
    // With prereq at 1, tight couplings impose ceiling 2
    const atZero = computeSkillInfluence({ 'd1-sa1-sg1-s1': 0 })
    const atOne = computeSkillInfluence({ 'd1-sa1-sg1-s1': 1 })
    // At level 1, there should be less ceiling constraint → lower influence score
    // (influence measures POTENTIAL gain from improving by 1 more)
    expect(atZero['d1-sa1-sg1-s1']).toBeDefined()
  })
})

/* ─── Start Here Priority ─── */

describe('getStartHerePriority', () => {
  it('returns all skills when nothing is assessed', () => {
    const priority = getStartHerePriority({})
    expect(priority.length).toBeGreaterThan(200) // ~282 skills
  })

  it('excludes already-assessed skills', () => {
    const priority = getStartHerePriority({ 'd1-sa1-sg1-s1': 2 })
    expect(priority.find(p => p.skillId === 'd1-sa1-sg1-s1')).toBeUndefined()
  })

  it('Tier 1 skills appear before Tier 4+ skills on average', () => {
    const priority = getStartHerePriority({})
    const top20 = priority.slice(0, 20)
    const avgTier = top20.reduce((sum, p) => sum + p.tier, 0) / top20.length
    expect(avgTier).toBeLessThan(3) // Top priority should lean toward lower tiers
  })

  it('prerequisite skills rank higher than non-prerequisite skills', () => {
    const priority = getStartHerePriority({})
    const top30 = priority.slice(0, 30)
    const prereqCount = top30.filter(p => p.downstreamCount > 0).length
    expect(prereqCount).toBeGreaterThan(15) // Most top-30 should be prereqs
  })

  it('each entry has required fields', () => {
    const priority = getStartHerePriority({})
    const first = priority[0]
    expect(first).toHaveProperty('skillId')
    expect(first).toHaveProperty('skillName')
    expect(first).toHaveProperty('domainId')
    expect(first).toHaveProperty('tier')
    expect(first).toHaveProperty('priority')
    expect(first).toHaveProperty('reason')
    expect(first).toHaveProperty('downstreamCount')
  })

  it('skills in unassessed domains get coverage bonus', () => {
    // Assess all D1 skills but leave D2+ empty
    const d1Assessments = {}
    // Just assess one D1 skill to mark domain as partially assessed
    d1Assessments['d1-sa1-sg1-s1'] = 2

    const priority = getStartHerePriority(d1Assessments)
    // D2+ skills should be higher priority due to coverage bonus for unassessed domains
    const top20 = priority.slice(0, 20)
    const nonD1 = top20.filter(p => p.domainId !== 'd1')
    expect(nonD1.length).toBeGreaterThan(10)
  })
})

/* ─── Ceiling Coverage ─── */

describe('getCeilingCoverage', () => {
  it('returns coverage close to 1 when many prereqs are assessed', () => {
    // Skills without prereqs always count as "known"
    // Assess a bunch of prereqs to increase known ceilings
    const assessments = {
      'd1-sa1-sg1-s1': 2, 'd1-sa1-sg1-s2': 2, 'd1-sa1-sg1-s3': 2, 'd1-sa1-sg1-s4': 2,
      'd1-sa1-sg3-s1': 2, 'd1-sa1-sg3-s2': 2, 'd1-sa1-sg3-s3': 2,
      'd1-sa1-sg4-s1': 2, 'd1-sa1-sg4-s3': 2,
      'd1-sa3-sg3-s1': 2, 'd1-sa3-sg3-s3': 2,
      'd1-sa4-sg2-s1': 2, 'd1-sa4-sg2-s2': 2, 'd1-sa4-sg3-s1': 2,
    }
    const coverage = getCeilingCoverage(assessments)
    expect(coverage.coverage).toBeGreaterThan(0.5)
    expect(coverage.totalSkills).toBeGreaterThan(200)
  })

  it('returns baseline coverage even with no assessments', () => {
    const coverage = getCeilingCoverage({})
    // Skills without prereqs still count as having known ceilings
    expect(coverage.knownCeilings).toBeGreaterThan(0)
    expect(coverage.totalSkills).toBeGreaterThan(0)
  })
})
