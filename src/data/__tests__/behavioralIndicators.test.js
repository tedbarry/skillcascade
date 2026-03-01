import { describe, it, expect } from 'vitest'
import { getBehavioralIndicator, getIndicatorForSkill } from '../behavioralIndicators.js'
import { framework } from '../framework.js'

describe('getBehavioralIndicator', () => {
  it('returns indicator text for a known D1 skill at each level', () => {
    for (const level of [0, 1, 2, 3]) {
      const text = getBehavioralIndicator('d1-sa1-sg1-s1', level)
      expect(text).toBeTruthy()
      expect(typeof text).toBe('string')
      expect(text.length).toBeGreaterThan(20)
    }
  })

  it('returns indicator for a known D5 skill', () => {
    const text = getBehavioralIndicator('d5-sa1-sg1-s1', 0)
    expect(text).toBeTruthy()
    expect(typeof text).toBe('string')
  })

  it('returns indicator for a known D9 skill', () => {
    const text = getBehavioralIndicator('d9-sa1-sg1-s1', 2)
    expect(text).toBeTruthy()
    expect(typeof text).toBe('string')
  })

  it('returns null for an unknown skill ID', () => {
    expect(getBehavioralIndicator('nonexistent-skill', 0)).toBeNull()
  })

  it('returns null for null level', () => {
    expect(getBehavioralIndicator('d1-sa1-sg1-s1', null)).toBeNull()
  })

  it('returns null for undefined level', () => {
    expect(getBehavioralIndicator('d1-sa1-sg1-s1', undefined)).toBeNull()
  })
})

describe('getIndicatorForSkill', () => {
  it('returns all 4 indicators for a known skill', () => {
    const all = getIndicatorForSkill('d1-sa1-sg1-s1')
    expect(all).toBeTruthy()
    expect(typeof all[0]).toBe('string')
    expect(typeof all[1]).toBe('string')
    expect(typeof all[2]).toBe('string')
    expect(typeof all[3]).toBe('string')
  })

  it('returns null for an unknown skill', () => {
    expect(getIndicatorForSkill('nonexistent-skill')).toBeNull()
  })
})

describe('coverage', () => {
  it('has indicators for the majority of skills', () => {
    let total = 0
    let covered = 0
    for (const domain of framework) {
      for (const sa of domain.subAreas) {
        for (const sg of sa.skillGroups) {
          for (const skill of sg.skills) {
            total++
            if (getIndicatorForSkill(skill.id)) covered++
          }
        }
      }
    }
    // At least 90% coverage
    expect(covered / total).toBeGreaterThan(0.9)
  })

  it('all indicators are non-empty strings of reasonable length', () => {
    for (const domain of framework) {
      for (const sa of domain.subAreas) {
        for (const sg of sa.skillGroups) {
          for (const skill of sg.skills) {
            const all = getIndicatorForSkill(skill.id)
            if (!all) continue
            for (const level of [0, 1, 2, 3]) {
              const text = all[level]
              expect(typeof text).toBe('string')
              expect(text.length).toBeGreaterThan(20)
            }
          }
        }
      }
    }
  })

  it('each level is distinct from adjacent levels for each skill', () => {
    for (const domain of framework) {
      for (const sa of domain.subAreas) {
        for (const sg of sa.skillGroups) {
          for (const skill of sg.skills) {
            const all = getIndicatorForSkill(skill.id)
            if (!all) continue
            // Each level should be different text
            expect(all[0]).not.toBe(all[1])
            expect(all[1]).not.toBe(all[2])
            expect(all[2]).not.toBe(all[3])
          }
        }
      }
    }
  })
})
