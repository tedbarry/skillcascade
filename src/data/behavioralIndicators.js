/**
 * Combined behavioral indicators index.
 * Merges all domain-specific indicator files into a single lookup.
 *
 * Each skill has 4 indicators (one per assessment level 0–3) describing
 * what that rating looks like in practice for that specific skill.
 */
import { indicators_d1d3 } from './behavioralIndicators_d1d3.js'
import { indicators_d4d6 } from './behavioralIndicators_d4d6.js'
import { indicators_d7d9 } from './behavioralIndicators_d7d9.js'

export const behavioralIndicators = {
  ...indicators_d1d3,
  ...indicators_d4d6,
  ...indicators_d7d9,
}

/**
 * Get the behavioral indicator text for a specific skill at a specific level.
 * Returns string or null.
 */
export function getBehavioralIndicator(skillId, level) {
  const entry = behavioralIndicators[skillId]
  if (!entry || level == null) return null
  return entry[level] ?? null
}

/**
 * Get all 4 indicators for a skill.
 * Returns { 0: string, 1: string, 2: string, 3: string } or null.
 */
export function getIndicatorForSkill(skillId) {
  return behavioralIndicators[skillId] || null
}
