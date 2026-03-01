// Teaching Playbook — Index
// Per-skill clinical teaching guidance: strategies, barriers, measurement, generalization, prerequisites, progression
// Split into 3 domain chunks following the same pattern as behavioralIndicators and skillDescriptions

import { playbook_d1d3 } from './teachingPlaybook_d1d3.js'
import { playbook_d4d6 } from './teachingPlaybook_d4d6.js'
import { playbook_d7d9 } from './teachingPlaybook_d7d9.js'

export const teachingPlaybook = { ...playbook_d1d3, ...playbook_d4d6, ...playbook_d7d9 }

/**
 * Get teaching playbook for a skill.
 * @param {string} skillId — e.g. 'd1-sa1-sg1-s1'
 * @returns {{ context, strategies: string[], barriers, measurement, generalization, prerequisiteNote, progressionNote } | null}
 */
export function getTeachingPlaybook(skillId) {
  return teachingPlaybook[skillId] || null
}
