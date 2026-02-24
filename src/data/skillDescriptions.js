/**
 * Combined skill descriptions index.
 * Merges all domain-specific description files into a single lookup.
 */
import { descriptions_d1d3 } from './skillDescriptions_d1d3.js'
import { descriptions_d4d6 } from './skillDescriptions_d4d6.js'
import { descriptions_d7d9 } from './skillDescriptions_d7d9.js'

export const skillDescriptions = {
  ...descriptions_d1d3,
  ...descriptions_d4d6,
  ...descriptions_d7d9,
}

/**
 * Get the description object for a skill ID.
 * Returns { description, looks_like, absence } or null if not found.
 */
export function getSkillDescription(skillId) {
  return skillDescriptions[skillId] || null
}
