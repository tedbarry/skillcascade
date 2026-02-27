import { describe, it, expect } from 'vitest'
import { framework, toHierarchy, getFrameworkStats, getDomainScores, ASSESSMENT_LEVELS } from '../framework.js'

describe('framework', () => {
  it('has 9 domains', () => {
    expect(framework).toHaveLength(9)
  })

  it('has 49 sub-areas across all domains', () => {
    const count = framework.reduce((n, d) => n + d.subAreas.length, 0)
    expect(count).toBe(49)
  })

  it('every domain has an id, name, and subAreas', () => {
    for (const domain of framework) {
      expect(domain.id).toBeTruthy()
      expect(domain.name).toBeTruthy()
      expect(domain.subAreas.length).toBeGreaterThan(0)
    }
  })

  it('all skill IDs are unique', () => {
    const ids = new Set()
    for (const domain of framework) {
      for (const sa of domain.subAreas) {
        for (const sg of sa.skillGroups) {
          for (const skill of sg.skills) {
            expect(ids.has(skill.id)).toBe(false)
            ids.add(skill.id)
          }
        }
      }
    }
    expect(ids.size).toBeGreaterThan(250)
  })

  it('skill IDs follow the d{n}-sa{n}-sg{n}-s{n} pattern', () => {
    for (const domain of framework) {
      for (const sa of domain.subAreas) {
        for (const sg of sa.skillGroups) {
          for (const skill of sg.skills) {
            expect(skill.id).toMatch(/^d\d+-sa\d+-sg\d+-s\d+$/)
          }
        }
      }
    }
  })
})

describe('getFrameworkStats', () => {
  it('returns correct total counts', () => {
    const stats = getFrameworkStats()
    expect(stats.domains).toBe(9)
    expect(stats.subAreas).toBe(49)
    expect(stats.skills).toBeGreaterThan(250)
  })
})

describe('toHierarchy', () => {
  it('returns a root node with 9 children', () => {
    const root = toHierarchy()
    expect(root.children).toHaveLength(9)
  })

  it('has name on root', () => {
    const root = toHierarchy()
    expect(root.name).toBeTruthy()
  })
})

describe('getDomainScores', () => {
  it('returns scores for all 9 domains with empty assessments', () => {
    const scores = getDomainScores({})
    expect(scores).toHaveLength(9)
    scores.forEach(s => {
      expect(s.score).toBe(0)
      expect(s.assessed).toBe(0)
    })
  })

  it('calculates correct average for assessed skills', () => {
    const assessments = {
      'd1-sa1-sg1-s1': ASSESSMENT_LEVELS.NEEDS_WORK,
      'd1-sa1-sg1-s2': ASSESSMENT_LEVELS.SOLID,
    }
    const scores = getDomainScores(assessments)
    const d1 = scores.find(s => s.domainId === 'd1')
    expect(d1.assessed).toBe(2)
    expect(d1.score).toBe(2) // (1 + 3) / 2
  })
})
