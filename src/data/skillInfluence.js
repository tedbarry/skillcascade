/**
 * skillInfluence.js — Skill Ceiling Model + Influence Engine
 *
 * Computes per-skill ceilings based on prerequisite coupling strengths,
 * influence scores, constraint detection, and Start Here priority ordering.
 *
 * Core concept: each prerequisite imposes a ceiling on its dependent skill.
 * The ceiling depends on the prerequisite's current level AND the coupling
 * strength between the two skills (how tightly they're developmentally linked).
 *
 * Pure functions — no React, no side effects.
 */

import { framework } from './framework.js'
import {
  SKILL_PREREQUISITES,
  DEP_TYPES,
  getSkillTier,
  getDomainFromId,
  getSubAreaFromId,
  buildReversePrereqMap,
} from './skillDependencies.js'

/* ─── Clinical Coupling Overrides ───────────────────────────────────
 *
 * Hand-tuned coupling strengths for edges where the algorithm
 * significantly misjudges the developmental relationship.
 *
 * Key format: 'dependentId→prereqId'
 */
const COUPLING_OVERRIDES = {
  // Connecting Sensations to Labels ← each interoception channel.
  // This IS the definitional gate: labeling requires detection.
  'd2-sa1-sg2-s1→d1-sa1-sg1-s1': 0.95, // Heart Rate Awareness — most accessible signal
  'd2-sa1-sg2-s1→d1-sa1-sg1-s2': 0.90, // Breathing Awareness
  'd2-sa1-sg2-s1→d1-sa1-sg1-s3': 0.85, // Muscle Tension
  'd2-sa1-sg2-s1→d1-sa1-sg1-s4': 0.80, // Hunger/Thirst — least central to emotion labeling

  // Noticing strain ← interoception: expressing discomfort IS communicating body signals
  'd5-sa2-sg1-s1→d1-sa1-sg1-s1': 0.90,
  'd5-sa2-sg1-s1→d1-sa1-sg1-s2': 0.85,
  'd5-sa2-sg1-s1→d1-sa1-sg2-s1': 0.80,

  // Continuing despite boredom ← allowing discomfort: persistence IS tolerance applied to task
  'd3-sa2-sg2-s1→d1-sa4-sg3-s1': 0.90,

  // Recognizing others have separate minds ← distinguishing own emotions
  // Theory of mind requires self-model — very tight developmental gate
  'd6-sa1-sg1-s1→d2-sa1-sg1-s1': 0.90,
  'd6-sa1-sg1-s1→d2-sa1-sg2-s1': 0.85,
}

/* ─── Coupling Strength Algorithm ───────────────────────────────────
 *
 * Computes how tightly a dependent skill is coupled to its prerequisite.
 * Uses a multi-factor clinical model:
 *   1. Domain relationship type (requires vs supports)
 *   2. Tier proximity (same-tier = tighter developmental coupling)
 *   3. Prerequisite exclusivity (sole prereq = more critical)
 *   4. Sub-area proximity (conceptually closer = tighter)
 *   5. Clinical pattern matching (specific developmental relationships)
 *
 * Returns value in [0.25, 0.95].
 *
 * Ceiling implications of strength thresholds:
 *   strength > 0.75  → max_gap 1 (tight: dependent can only be 1 level above prereq)
 *   0.25 < s ≤ 0.75  → max_gap 2 (moderate: can be 2 levels above)
 *   s ≤ 0.25         → max_gap 3 (loose: effectively no constraint)
 */
export function getCouplingStrength(dependentId, prereqId) {
  const key = `${dependentId}→${prereqId}`
  if (COUPLING_OVERRIDES[key] !== undefined) return COUPLING_OVERRIDES[key]

  const depDomain = getDomainFromId(dependentId)
  const preqDomain = getDomainFromId(prereqId)
  const depSA = getSubAreaFromId(dependentId)
  const preqSA = getSubAreaFromId(prereqId)
  const sameDomain = depDomain === preqDomain

  // Domain-level relationship type
  const depType = sameDomain
    ? 'requires'
    : (DEP_TYPES[`${depDomain}→${preqDomain}`] || 'requires')

  // Base: requires = hard developmental gate, supports = facilitative
  let s = depType === 'requires' ? 0.65 : 0.40

  // Tier proximity: same-tier skills share developmental complexity
  const depTier = getSkillTier(dependentId) || 3
  const preqTier = getSkillTier(prereqId) || 3
  const tierGap = Math.abs(depTier - preqTier)
  if (tierGap === 0) s += 0.08
  else if (tierGap === 1) s += 0.04
  else if (tierGap >= 3) s -= 0.04

  // Exclusivity: sole prerequisite is more critical than one of many
  const allPrereqs = SKILL_PREREQUISITES[dependentId] || []
  if (allPrereqs.length === 1) s += 0.10
  else if (allPrereqs.length === 2) s += 0.04
  else if (allPrereqs.length >= 5) s -= 0.03

  // Sub-area proximity: same sub-area = conceptually close
  if (depSA === preqSA) s += 0.08
  else if (sameDomain) s += 0.04

  // Foundation bonus: D1 regulation is the universal developmental gate
  if (preqDomain === 'd1' && !sameDomain) s += 0.04

  // ─── Clinical Pattern Matching ───

  // Interoception → Naming Feelings: detecting → labeling is definitional
  if (preqSA === 'd1-sa1' && depSA === 'd2-sa1') s += 0.10

  // Interoception → Expressing Discomfort: noticing → communicating strain
  if (preqSA === 'd1-sa1' && depSA === 'd5-sa2') s += 0.08

  // Discomfort tolerance → Persistence/Flexibility: core regulatory gate
  if (preqSA === 'd1-sa4' && (depSA === 'd3-sa2' || depSA === 'd3-sa3')) s += 0.06

  // Self-awareness → Perspective-taking: self-model → other-model
  if (preqDomain === 'd2' && depSA === 'd6-sa1') s += 0.06

  // Naming feelings → Self-talk: emotional vocabulary drives self-narrative
  if (preqSA === 'd2-sa1' && depSA === 'd7-sa1') s += 0.08

  // Self-monitoring → Context adaptation: monitoring enables adjustment
  if (preqSA === 'd3-sa5' && depSA === 'd4-sa4') s += 0.06

  // Calming → downstream regulation needs (broad facilitative bonus)
  if ((preqSA === 'd1-sa3' || preqSA === 'd1-sa2') && !sameDomain) s += 0.03

  // Trigger awareness → emotional anticipation across domains
  if (preqSA === 'd2-sa2' && depDomain !== 'd2') s += 0.04

  // Within-domain adjacent sub-area progression
  if (sameDomain) {
    const depSANum = parseInt(depSA.split('-sa')[1]) || 0
    const preqSANum = parseInt(preqSA.split('-sa')[1]) || 0
    if (depSANum > 0 && preqSANum > 0 && depSANum === preqSANum + 1) s += 0.04
  }

  return Math.round(Math.max(0.25, Math.min(0.95, s)) * 100) / 100
}

/* ─── Ceiling Model ─────────────────────────────────────────────── */

/**
 * Maximum level gap allowed between dependent and prerequisite.
 * Higher coupling strength = smaller allowed gap.
 */
function maxGap(strength) {
  return Math.round(1 + 2 * (1 - strength))
}

/**
 * Ceiling imposed on a dependent skill by a single prerequisite.
 * Unassessed prereqs are treated as level 0 (conservative).
 */
function ceilingFromPrereq(prereqLevel, strength) {
  const level = prereqLevel == null ? 0 : prereqLevel
  return Math.min(3, level + maxGap(strength))
}

/**
 * Compute the effective ceiling for every skill that has prerequisites.
 * Ceiling = min across all direct prerequisites.
 *
 * Skills without prerequisites have no entry (ceiling = 3 implicitly).
 *
 * @param {Object} assessments - { skillId: level (0-3 or null/undefined) }
 * @returns {Object} Map of skillId → { ceiling, constrainingPrereqs[] }
 */
export function computeSkillCeilings(assessments) {
  const ceilings = {}

  for (const [skillId, prereqIds] of Object.entries(SKILL_PREREQUISITES)) {
    let effectiveCeiling = 3
    const constrainingPrereqs = []

    for (const prereqId of prereqIds) {
      const prereqLevel = assessments[prereqId] ?? null
      const strength = getCouplingStrength(skillId, prereqId)
      const imposed = ceilingFromPrereq(prereqLevel, strength)

      constrainingPrereqs.push({
        id: prereqId,
        level: prereqLevel,
        strength,
        imposedCeiling: imposed,
      })

      if (imposed < effectiveCeiling) {
        effectiveCeiling = imposed
      }
    }

    // Sort: most constraining first
    constrainingPrereqs.sort((a, b) => a.imposedCeiling - b.imposedCeiling)

    ceilings[skillId] = {
      ceiling: effectiveCeiling,
      constrainingPrereqs,
    }
  }

  return ceilings
}

/**
 * Get ceiling for a single skill (efficient for individual lookups).
 * Returns null if skill has no prerequisites.
 */
export function getSkillCeiling(skillId, assessments) {
  const prereqIds = SKILL_PREREQUISITES[skillId]
  if (!prereqIds) return null

  let ceiling = 3
  const constrainingPrereqs = []

  for (const prereqId of prereqIds) {
    const prereqLevel = assessments[prereqId] ?? null
    const strength = getCouplingStrength(skillId, prereqId)
    const imposed = ceilingFromPrereq(prereqLevel, strength)
    constrainingPrereqs.push({ id: prereqId, level: prereqLevel, strength, imposedCeiling: imposed })
    if (imposed < ceiling) ceiling = imposed
  }

  constrainingPrereqs.sort((a, b) => a.imposedCeiling - b.imposedCeiling)
  return { ceiling, constrainingPrereqs }
}

/* ─── Constrained Skills ────────────────────────────────────────── */

/**
 * Find skills rated above their ceiling (fragile / possibly over-taught).
 * These skills may regress without prerequisite support.
 *
 * @returns {Array} Sorted by gap (highest over-ceiling first)
 */
export function computeConstrainedSkills(assessments) {
  const ceilings = computeSkillCeilings(assessments)
  const constrained = []

  for (const [skillId, data] of Object.entries(ceilings)) {
    const level = assessments[skillId]
    if (level != null && level > data.ceiling) {
      constrained.push({
        skillId,
        level,
        ceiling: data.ceiling,
        gap: level - data.ceiling,
        domainId: getDomainFromId(skillId),
        constrainingPrereqs: data.constrainingPrereqs.filter(p => p.imposedCeiling < level),
      })
    }
  }

  return constrained.sort((a, b) => b.gap - a.gap)
}

/* ─── Influence Scoring ─────────────────────────────────────────── */

// Lazy-cached reverse prerequisite map (static data)
let _reverseMap = null
function getReverseMap() {
  if (!_reverseMap) _reverseMap = buildReversePrereqMap()
  return _reverseMap
}

/**
 * Compute transitive downstream count for each prerequisite skill.
 * Uses DFS with cycle protection.
 */
function computeTransitiveDownstream() {
  const reverse = getReverseMap()
  const cache = {}

  function traverse(skillId, visited) {
    if (cache[skillId]) return cache[skillId]
    visited.add(skillId)
    const direct = reverse[skillId] || []
    const all = new Set(direct)
    for (const depId of direct) {
      if (!visited.has(depId)) {
        const transitive = traverse(depId, new Set(visited))
        for (const id of transitive) all.add(id)
      }
    }
    cache[skillId] = all
    return all
  }

  const result = {}
  for (const skillId of Object.keys(reverse)) {
    result[skillId] = traverse(skillId, new Set()).size
  }
  return result
}

// Lazy-cached transitive downstream (static data)
let _transitiveDownstream = null
function getTransitiveDownstream() {
  if (!_transitiveDownstream) _transitiveDownstream = computeTransitiveDownstream()
  return _transitiveDownstream
}

/**
 * Compute influence score for each prerequisite skill.
 *
 * Influence = sum of coupling strengths to direct dependents WHERE
 * improving this skill by 1 level would raise the dependent's ceiling.
 *
 * @param {Object} assessments
 * @returns {Object} Map of skillId → { influenceScore, directDownstream, transitiveDownstream, constrainedDownstream, affectedDomains[] }
 */
export function computeSkillInfluence(assessments) {
  const reverse = getReverseMap()
  const transitiveDownstream = getTransitiveDownstream()
  const influence = {}

  for (const skillId of Object.keys(reverse)) {
    const effectiveLevel = assessments[skillId] ?? 0
    const hypotheticalLevel = Math.min(3, effectiveLevel + 1)
    const directDeps = reverse[skillId] || []

    let influenceScore = 0
    let constrainedDownstream = 0
    const affectedDomains = new Set()

    for (const depId of directDeps) {
      const strength = getCouplingStrength(depId, skillId)
      const currentCeiling = ceilingFromPrereq(effectiveLevel, strength)
      const newCeiling = ceilingFromPrereq(hypotheticalLevel, strength)

      if (newCeiling > currentCeiling) {
        influenceScore += strength
        affectedDomains.add(getDomainFromId(depId))
      }

      const depLevel = assessments[depId]
      if (depLevel != null && depLevel > currentCeiling) {
        constrainedDownstream++
      }
    }

    influence[skillId] = {
      influenceScore: Math.round(influenceScore * 100) / 100,
      directDownstream: directDeps.length,
      transitiveDownstream: transitiveDownstream[skillId] || 0,
      constrainedDownstream,
      affectedDomains: [...affectedDomains],
    }
  }

  return influence
}

/* ─── Start Here Priority ───────────────────────────────────────── */

/**
 * Get priority-ordered list of unassessed skills for "Start Here" assessment.
 *
 * Prioritizes skills that are most informative to rate first:
 *   - High downstream influence (many skills depend on this)
 *   - Lower developmental tier (foundation first)
 *   - Skills in fully-unassessed domains (coverage)
 *   - Junction points (both prereq and dependent)
 *
 * @param {Object} assessments
 * @returns {Array} Sorted by priority descending
 */
export function getStartHerePriority(assessments) {
  const reverse = getReverseMap()
  const transitiveDownstream = getTransitiveDownstream()
  const ceilings = computeSkillCeilings(assessments)

  // Count assessed skills per domain
  const domainAssessedCount = {}
  framework.forEach(d => {
    let count = 0
    d.subAreas.forEach(sa => {
      sa.skillGroups.forEach(sg => {
        sg.skills.forEach(s => { if (assessments[s.id] != null) count++ })
      })
    })
    domainAssessedCount[d.id] = count
  })

  const results = []

  framework.forEach(domain => {
    domain.subAreas.forEach(sa => {
      sa.skillGroups.forEach(sg => {
        sg.skills.forEach(skill => {
          if (assessments[skill.id] != null) return // skip assessed

          const tier = getSkillTier(skill.id) || 3
          const downstream = transitiveDownstream[skill.id] || 0
          const directDown = (reverse[skill.id] || []).length
          const isPrereq = directDown > 0
          const isDependent = SKILL_PREREQUISITES[skill.id] != null
          const isJunction = isPrereq && isDependent
          const domainUnassessed = domainAssessedCount[domain.id] === 0

          // Check if this skill's ceiling is heavily constrained
          const ceilingData = ceilings[skill.id]
          const ceiling = ceilingData?.ceiling ?? 3
          const heavilyConstrained = ceiling <= 1

          // Compute priority score
          let priority = 0
          priority += downstream * 3         // Downstream influence
          priority += directDown * 2         // Direct dependents
          priority += (6 - tier) * 2         // Tier bonus (lower = higher priority)
          if (domainUnassessed) priority += 5 // Coverage
          if (isJunction) priority += 3       // Junction point
          if (isPrereq) priority += 2         // Prereq bonus
          if (heavilyConstrained) priority -= 8 // Demote constrained

          let reason = ''
          if (downstream >= 5) reason = 'High influence — many skills depend on this'
          else if (tier <= 2 && isPrereq) reason = 'Foundation skill — sets ceiling for higher skills'
          else if (domainUnassessed) reason = 'First skill in this domain — establishes coverage'
          else if (isJunction) reason = 'Junction point — both receives and sends influence'
          else if (isPrereq) reason = 'Prerequisite — affects downstream skill ceilings'
          else if (tier <= 2) reason = 'Foundation tier — early developmental skill'
          else reason = 'Fills assessment coverage'

          results.push({
            skillId: skill.id,
            skillName: skill.name,
            domainId: domain.id,
            domainName: domain.name,
            subAreaId: sa.id,
            subAreaName: sa.name,
            tier,
            priority,
            reason,
            downstreamCount: downstream,
          })
        })
      })
    })
  })

  return results.sort((a, b) => b.priority - a.priority)
}

/**
 * Ceiling coverage: what fraction of skills have known ceilings.
 * A ceiling is "known" when at least one prereq has been assessed.
 * Skills without prereqs always have ceiling = 3 (known by definition).
 */
export function getCeilingCoverage(assessments) {
  const ceilings = computeSkillCeilings(assessments)
  let knownCeilings = 0
  const totalWithPrereqs = Object.keys(SKILL_PREREQUISITES).length

  for (const data of Object.values(ceilings)) {
    if (data.constrainingPrereqs.some(p => p.level != null)) knownCeilings++
  }

  let totalSkills = 0
  framework.forEach(d => d.subAreas.forEach(sa => sa.skillGroups.forEach(sg => {
    totalSkills += sg.skills.length
  })))

  const skillsWithoutPrereqs = totalSkills - totalWithPrereqs

  return {
    knownCeilings: knownCeilings + skillsWithoutPrereqs,
    totalSkills,
    coverage: totalSkills > 0 ? (knownCeilings + skillsWithoutPrereqs) / totalSkills : 0,
  }
}
