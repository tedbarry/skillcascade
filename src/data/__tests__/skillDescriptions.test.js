import { describe, it, expect } from 'vitest'
import { getSkillDescription } from '../skillDescriptions.js'
import { framework } from '../framework.js'

describe('getSkillDescription', () => {
  it('returns description for a known D1 skill', () => {
    const desc = getSkillDescription('d1-sa1-sg1-s1')
    expect(desc).toBeTruthy()
    expect(desc.description).toBeTruthy()
    expect(desc.looks_like).toBeTruthy()
    expect(desc.absence).toBeTruthy()
  })

  it('returns description for a known D9 skill', () => {
    const desc = getSkillDescription('d9-sa1-sg1-s2')
    expect(desc).toBeTruthy()
    expect(desc.description).toBeTruthy()
  })

  it('returns null for an unknown skill ID', () => {
    const desc = getSkillDescription('nonexistent-skill')
    expect(desc).toBeNull()
  })

  it('has descriptions for the majority of skills', () => {
    let total = 0
    let covered = 0
    for (const domain of framework) {
      for (const sa of domain.subAreas) {
        for (const sg of sa.skillGroups) {
          for (const skill of sg.skills) {
            total++
            if (getSkillDescription(skill.id)) covered++
          }
        }
      }
    }
    // At least 90% coverage
    expect(covered / total).toBeGreaterThan(0.9)
  })
})
