import { describe, it, expect } from 'vitest'
import {
  computeDomainHealth,
  computeImpactRanking,
  detectCascadeRisks,
  findPrerequisiteChain,
  computePathReadiness,
  computeSubAreaHealth,
  simulateCascade,
  computeSubAreaReadiness,
} from '../cascadeModel.js'
import { ASSESSMENT_LEVELS } from '../framework.js'

describe('computeDomainHealth', () => {
  it('returns health for all 9 domains with empty assessments', () => {
    const health = computeDomainHealth({})
    expect(Object.keys(health)).toHaveLength(9)
  })

  it('each domain has avg, assessed, total, healthPct, state', () => {
    const health = computeDomainHealth({})
    for (const key of Object.keys(health)) {
      const d = health[key]
      expect(d).toHaveProperty('avg')
      expect(d).toHaveProperty('assessed')
      expect(d).toHaveProperty('total')
      expect(d).toHaveProperty('healthPct')
      expect(d).toHaveProperty('state')
    }
  })

  it('marks unassessed domains as locked', () => {
    const health = computeDomainHealth({})
    expect(health.d1.state).toBe('locked')
  })

  it('computes correct average when skills are rated', () => {
    const assessments = {
      'd1-sa1-sg1-s1': ASSESSMENT_LEVELS.SOLID,
      'd1-sa1-sg1-s2': ASSESSMENT_LEVELS.SOLID,
      'd1-sa1-sg1-s3': ASSESSMENT_LEVELS.SOLID,
    }
    const health = computeDomainHealth(assessments)
    expect(health.d1.avg).toBe(3)
    expect(health.d1.assessed).toBe(3)
  })
})

describe('computeImpactRanking', () => {
  it('returns an array of 9 domain rankings', () => {
    const ranking = computeImpactRanking({})
    expect(ranking).toHaveLength(9)
  })

  it('each ranking has domainId, leverageScore, downstreamDomains', () => {
    const ranking = computeImpactRanking({})
    for (const r of ranking) {
      expect(r).toHaveProperty('domainId')
      expect(r).toHaveProperty('leverageScore')
      expect(r).toHaveProperty('downstreamDomains')
    }
  })

  it('foundation domains (d1, d2) have more downstream domains', () => {
    const ranking = computeImpactRanking({})
    const d1 = ranking.find(r => r.domainId === 'd1')
    const d9 = ranking.find(r => r.domainId === 'd9')
    expect(d1.downstreamDomains).toBeGreaterThanOrEqual(d9.downstreamDomains)
  })
})

describe('detectCascadeRisks', () => {
  it('returns empty array with no assessments', () => {
    const risks = detectCascadeRisks({}, [])
    expect(risks).toEqual([])
  })

  it('detects inversion risk when higher domain exceeds prerequisite', () => {
    // Rate D3 high but D1 low — D3 depends on D1
    const assessments = {}
    // Rate all D1 skills as needs-work
    for (let sa = 1; sa <= 6; sa++) {
      for (let sg = 1; sg <= 3; sg++) {
        for (let s = 1; s <= 5; s++) {
          const id = `d1-sa${sa}-sg${sg}-s${s}`
          assessments[id] = ASSESSMENT_LEVELS.NEEDS_WORK
        }
      }
    }
    // Rate some D3 skills as solid
    for (let sa = 1; sa <= 5; sa++) {
      for (let sg = 1; sg <= 3; sg++) {
        for (let s = 1; s <= 5; s++) {
          const id = `d3-sa${sa}-sg${sg}-s${s}`
          assessments[id] = ASSESSMENT_LEVELS.SOLID
        }
      }
    }
    const risks = detectCascadeRisks(assessments, [])
    const inversions = risks.filter(r => r.type === 'inversion')
    expect(inversions.length).toBeGreaterThan(0)
  })
})

describe('findPrerequisiteChain', () => {
  it('returns chain for D5 that includes foundation domains', () => {
    const chain = findPrerequisiteChain('d5')
    expect(chain.length).toBeGreaterThan(1)
    // Chain is topologically ordered: prerequisites first, goal last
    expect(chain[chain.length - 1]).toBe('d5')
    expect(chain).toContain('d1')
  })

  it('returns single-element chain for D1 (no prerequisites)', () => {
    const chain = findPrerequisiteChain('d1')
    expect(chain).toEqual(['d1'])
  })
})

describe('computePathReadiness', () => {
  it('returns readiness data for each domain in chain', () => {
    const chain = findPrerequisiteChain('d5')
    const readiness = computePathReadiness(chain, {})
    expect(readiness).toHaveLength(chain.length)
    readiness.forEach(r => {
      expect(r).toHaveProperty('domainId')
      expect(r).toHaveProperty('healthPct')
      expect(r).toHaveProperty('status')
    })
  })
})

describe('computeSubAreaHealth', () => {
  it('returns health data for sub-areas in a domain', () => {
    const health = computeSubAreaHealth('d1', {})
    expect(health.length).toBeGreaterThan(0)
    health.forEach(sa => {
      expect(sa).toHaveProperty('subAreaId')
      expect(sa).toHaveProperty('avg')
      expect(sa).toHaveProperty('assessed')
      expect(sa).toHaveProperty('total')
    })
  })
})

describe('simulateCascade', () => {
  it('applies domain-level overrides to assessments', () => {
    const result = simulateCascade({}, { d1: 3 })
    // Should have filled all D1 skills with level 3
    const d1Keys = Object.keys(result).filter(k => k.startsWith('d1-'))
    expect(d1Keys.length).toBeGreaterThan(0)
    d1Keys.forEach(k => expect(result[k]).toBe(3))
  })
})

describe('computeSubAreaReadiness', () => {
  it('returns readiness for all sub-areas', () => {
    const readiness = computeSubAreaReadiness({})
    expect(Object.keys(readiness).length).toBeGreaterThan(0)
  })
})
