/**
 * cascadeModel.js — Pure computation functions for the Developmental Connectome
 *
 * All functions are stateless and take (assessments, snapshots, etc.) as arguments.
 * No React imports, no side effects — safe to call from hooks, workers, or tests.
 */

import { framework, DOMAIN_DEPENDENCIES, ASSESSMENT_LEVELS, isAssessed } from './framework.js'
import {
  getSkillTier,
  getSubAreaPrereqs,
  getSkillPrereqs,
  getAllPrerequisites,
  computeSkillReadiness,
  findCrossDomainBottlenecks,
  getSubAreaTierBreakdown,
  getDomainFromId,
  getDepType,
} from './skillDependencies.js'

/* ─────────────────────────────────────────────
   Domain Health
   ───────────────────────────────────────────── */

/**
 * Compute health metrics for every domain.
 * Returns Map<domainId, { avg, assessed, total, healthPct, state }>
 */
export function computeDomainHealth(assessments = {}) {
  const health = {}

  framework.forEach((domain) => {
    let total = 0
    let assessed = 0
    let scoreSum = 0

    domain.subAreas.forEach((sa) => {
      sa.skillGroups.forEach((sg) => {
        sg.skills.forEach((skill) => {
          total++
          const level = assessments[skill.id]
          if (isAssessed(level)) {
            assessed++
            scoreSum += level
          }
        })
      })
    })

    const avg = assessed > 0 ? scoreSum / assessed : 0
    const healthPct = avg / 3 // 0-1 normalized

    // State classification — respects dependency types:
    // 'requires' deps must meet threshold to avoid 'blocked' state
    // 'supports' deps contribute a health adjustment but never block
    const deps = DOMAIN_DEPENDENCIES[domain.id] || []
    const requiredDeps = deps.filter(depId => getDepType(depId, domain.id) === 'requires')
    const supportsDeps = deps.filter(depId => getDepType(depId, domain.id) === 'supports')

    const requiredMet = requiredDeps.length === 0 || requiredDeps.every((depId) => {
      const dep = health[depId]
      return dep && dep.assessed > 0 && dep.avg >= 2.0
    })

    // Supports deps contribute a small bonus/penalty (±0.1 per dep)
    let supportsAdjustment = 0
    supportsDeps.forEach(depId => {
      const dep = health[depId]
      if (dep && dep.assessed > 0) {
        supportsAdjustment += (dep.avg - 2.0) * 0.05 // ±0.05 per supports dep
      }
    })

    let state
    if (assessed === 0) state = 'locked'
    else if (!requiredMet && avg < 2.0) state = 'blocked'
    else if (avg < 1.5) state = 'needs-work'
    else if (avg < 2.5) state = 'developing'
    else state = 'mastered'

    // Clamp adjusted health to 0-1 range
    const adjustedHealthPct = Math.max(0, Math.min(1, healthPct + supportsAdjustment))
    health[domain.id] = { avg, assessed, total, healthPct: adjustedHealthPct, state }
  })

  return health
}

/* ─────────────────────────────────────────────
   Cascade Strength (BFS from a source domain)
   ───────────────────────────────────────────── */

/**
 * BFS from a source domain through DOMAIN_DEPENDENCIES.
 * Edge weight = (1 - sourceHealth) × attenuation per tier (0.85^tier).
 * Returns Map<domainId, { impactStrength: 0-1, tier, pathFromSource[] }>
 */
export function computeCascadeStrength(sourceDomainId, assessments = {}) {
  const health = computeDomainHealth(assessments)
  const sourceHealth = health[sourceDomainId]?.healthPct ?? 0
  const baseImpact = 1 - sourceHealth // weak source = high impact

  const result = {}
  const visited = new Set([sourceDomainId])
  let currentTier = [sourceDomainId]
  let tierNum = 0

  while (currentTier.length > 0) {
    const nextTier = []
    for (const current of currentTier) {
      Object.entries(DOMAIN_DEPENDENCIES).forEach(([domainId, deps]) => {
        if (deps.includes(current) && !visited.has(domainId)) {
          visited.add(domainId)
          const tier = tierNum + 1
          // 'supports' edges propagate at 50% strength
          const depType = getDepType(current, domainId)
          const typeWeight = depType === 'supports' ? 0.5 : 1.0
          const impactStrength = baseImpact * Math.pow(0.85, tier) * typeWeight

          // Build path from source
          const parentPath = result[current]?.pathFromSource || [sourceDomainId]
          result[domainId] = {
            impactStrength,
            tier,
            pathFromSource: [...parentPath, domainId],
          }

          nextTier.push(domainId)
        }
      })
    }
    currentTier = nextTier
    tierNum++
  }

  return result
}

/* ─────────────────────────────────────────────
   Impact Ranking (Developmental Leverage Score)
   ───────────────────────────────────────────── */

/**
 * Get all domains that transitively depend on a given domain.
 */
function getTransitiveDependents(domainId) {
  const dependents = new Set()
  const queue = [domainId]

  while (queue.length > 0) {
    const current = queue.shift()
    Object.entries(DOMAIN_DEPENDENCIES).forEach(([id, deps]) => {
      if (deps.includes(current) && !dependents.has(id)) {
        dependents.add(id)
        queue.push(id)
      }
    })
  }

  return dependents
}

/**
 * Count total skills in a set of domain IDs.
 */
function countSkillsInDomains(domainIds) {
  let count = 0
  domainIds.forEach((dId) => {
    const domain = framework.find((d) => d.id === dId)
    if (domain) {
      domain.subAreas.forEach((sa) => {
        sa.skillGroups.forEach((sg) => {
          count += sg.skills.length
        })
      })
    }
  })
  return count
}

/**
 * Compute impact ranking for all domains.
 * leverageScore = downstreamSkills × (1 - healthPct) — weak foundations score highest.
 * Returns sorted array.
 */
export function computeImpactRanking(assessments = {}) {
  const health = computeDomainHealth(assessments)

  return framework.map((domain) => {
    const downstreamDomains = getTransitiveDependents(domain.id)
    const downstreamSkills = countSkillsInDomains(downstreamDomains)
    const h = health[domain.id] || { healthPct: 0, assessed: 0 }
    const leverageScore = downstreamSkills * (1 - h.healthPct)

    return {
      domainId: domain.id,
      domainName: domain.name,
      domainNumber: domain.domain,
      downstreamDomains: downstreamDomains.size,
      downstreamSkills,
      healthPct: h.healthPct,
      leverageScore,
    }
  }).sort((a, b) => b.leverageScore - a.leverageScore)
}

/* ─────────────────────────────────────────────
   Sub-Area Health
   ───────────────────────────────────────────── */

/**
 * Compute health for each sub-area within a domain.
 */
export function computeSubAreaHealth(domainId, assessments = {}) {
  const domain = framework.find((d) => d.id === domainId)
  if (!domain) return []

  return domain.subAreas.map((sa) => {
    let total = 0
    let assessed = 0
    let scoreSum = 0

    sa.skillGroups.forEach((sg) => {
      sg.skills.forEach((skill) => {
        total++
        const level = assessments[skill.id]
        if (isAssessed(level)) {
          assessed++
          scoreSum += level
        }
      })
    })

    const avg = assessed > 0 ? scoreSum / assessed : 0
    return {
      subAreaId: sa.id,
      name: sa.name,
      avg,
      assessed,
      total,
      healthPct: avg / 3,
    }
  })
}

/* ─────────────────────────────────────────────
   Cascade Risks
   ───────────────────────────────────────────── */

/**
 * Detect cascade risks:
 * - Foundation inversions (higher domain scores > prerequisite scores)
 * - Foundation regressions (D1/D2 dropped since last snapshot)
 * - Bottlenecks (weak mid-chain domain blocking 2+ higher domains)
 */
export function detectCascadeRisks(assessments = {}, snapshots = []) {
  const health = computeDomainHealth(assessments)
  const risks = []

  // Foundation inversions: a domain's avg exceeds its prerequisite's avg
  framework.forEach((domain) => {
    const deps = DOMAIN_DEPENDENCIES[domain.id] || []
    const domainHealth = health[domain.id]
    if (!domainHealth || domainHealth.assessed === 0) return

    deps.forEach((depId) => {
      const depHealth = health[depId]
      if (!depHealth || depHealth.assessed === 0) return

      if (domainHealth.avg > depHealth.avg + 0.3) {
        const depDomain = framework.find((d) => d.id === depId)
        risks.push({
          type: 'inversion',
          severity: domainHealth.avg - depHealth.avg,
          title: 'Foundation Inversion',
          description: `${domain.name} (${domainHealth.avg.toFixed(1)}) exceeds prerequisite ${depDomain?.name} (${depHealth.avg.toFixed(1)}) — possible splinter skill pattern`,
          affectedDomains: [domain.id, depId],
          actionDomainId: depId,
        })
      }
    })
  })

  // Foundation regressions: D1/D2 dropped since last snapshot
  if (snapshots.length > 0) {
    const lastSnapshot = snapshots[snapshots.length - 1]
    const lastAssessments = lastSnapshot?.assessments || {}
    const lastHealth = computeDomainHealth(lastAssessments)

    ;['d1', 'd2'].forEach((fId) => {
      const current = health[fId]
      const previous = lastHealth[fId]
      if (!current || !previous || current.assessed === 0 || previous.assessed === 0) return

      if (previous.avg - current.avg > 0.2) {
        const domain = framework.find((d) => d.id === fId)
        risks.push({
          type: 'regression',
          severity: previous.avg - current.avg,
          title: 'Foundation Regression',
          description: `${domain?.name} dropped from ${previous.avg.toFixed(1)} to ${current.avg.toFixed(1)} since last snapshot — may destabilize dependent domains`,
          affectedDomains: [fId, ...Array.from(getTransitiveDependents(fId))],
          actionDomainId: fId,
        })
      }
    })
  }

  // Bottlenecks: weak mid-chain domain blocking 2+ higher domains
  framework.forEach((domain) => {
    const domainHealth = health[domain.id]
    if (!domainHealth || domainHealth.assessed === 0) return
    if (domainHealth.avg >= 2.0) return // not weak

    // Count how many domains directly depend on this one
    const directDependents = Object.entries(DOMAIN_DEPENDENCIES)
      .filter(([, deps]) => deps.includes(domain.id))
      .map(([id]) => id)

    if (directDependents.length >= 2) {
      risks.push({
        type: 'bottleneck',
        severity: (2.0 - domainHealth.avg) * directDependents.length,
        title: 'Bottleneck',
        description: `${domain.name} (${domainHealth.avg.toFixed(1)}/3) blocks ${directDependents.length} higher domains`,
        affectedDomains: [domain.id, ...directDependents],
        actionDomainId: domain.id,
      })
    }
  })

  return risks.sort((a, b) => b.severity - a.severity)
}

/* ─────────────────────────────────────────────
   Path Tracer
   ───────────────────────────────────────────── */

/**
 * Find the full prerequisite chain to reach a goal domain.
 * Returns array of domainIds from foundation to goal, in order.
 */
export function findPrerequisiteChain(goalDomainId) {
  const chain = []
  const visited = new Set()

  function walk(domainId) {
    if (visited.has(domainId)) return
    visited.add(domainId)

    const deps = DOMAIN_DEPENDENCIES[domainId] || []
    deps.forEach((depId) => walk(depId))
    chain.push(domainId)
  }

  walk(goalDomainId)
  return chain
}

/**
 * Compute readiness for each step in a prerequisite chain.
 */
export function computePathReadiness(chain, assessments = {}) {
  const health = computeDomainHealth(assessments)

  return chain.map((domainId, index) => {
    const h = health[domainId] || { avg: 0, assessed: 0, total: 0, healthPct: 0, state: 'locked' }
    const domain = framework.find((d) => d.id === domainId)

    let status
    if (h.avg >= 2.0) status = 'met'
    else if (h.avg >= 1.5) status = 'close'
    else status = 'far'

    return {
      step: index + 1,
      domainId,
      domainName: domain?.name || domainId,
      domainNumber: domain?.domain || 0,
      avg: h.avg,
      assessed: h.assessed,
      total: h.total,
      healthPct: h.healthPct,
      state: h.state,
      status,
      gap: Math.max(0, 2.0 - h.avg),
    }
  })
}

/* ─────────────────────────────────────────────
   What-If Simulation
   ───────────────────────────────────────────── */

/**
 * Create synthetic assessments by overriding specific domain scores.
 * For overridden domains, uniformly fills all skills to match the target avg.
 */
export function simulateCascade(baseAssessments = {}, overrides = {}) {
  const synthetic = { ...baseAssessments }

  Object.entries(overrides).forEach(([domainId, targetAvg]) => {
    const domain = framework.find((d) => d.id === domainId)
    if (!domain) return

    // Round target to nearest valid level
    const level = Math.round(Math.min(3, Math.max(0, targetAvg)))

    domain.subAreas.forEach((sa) => {
      sa.skillGroups.forEach((sg) => {
        sg.skills.forEach((skill) => {
          synthetic[skill.id] = level
        })
      })
    })
  })

  return synthetic
}

/* ─────────────────────────────────────────────
   Snapshot Interpolation (for timeline slider)
   ───────────────────────────────────────────── */

/**
 * Interpolate between two assessment maps.
 * t = 0 returns assessmentA, t = 1 returns assessmentB.
 */
export function interpolateAssessments(assessmentA = {}, assessmentB = {}, t) {
  const allKeys = new Set([...Object.keys(assessmentA), ...Object.keys(assessmentB)])
  const result = {}

  allKeys.forEach((key) => {
    const a = assessmentA[key] ?? 0
    const b = assessmentB[key] ?? 0
    result[key] = a + (b - a) * t
  })

  return result
}

/* ─────────────────────────────────────────────
   Learning Barrier Detection (VB-MAPP-style)
   ───────────────────────────────────────────── */

/**
 * Detect learning barrier patterns from existing assessment data.
 * Inspired by VB-MAPP Barriers Assessment — identifies patterns that
 * indicate underlying obstacles to skill acquisition.
 *
 * Returns array of { type, severity, affectedDomains, description }
 * Types: 'score-inversion', 'prerequisite-gap', 'uneven-profile', 'plateau'
 */
export function detectLearningBarriers(assessments = {}, snapshots = []) {
  const health = computeDomainHealth(assessments)
  const barriers = []

  // 1. Score inversions within a domain: higher-tier skills rated above lower-tier ones
  framework.forEach(domain => {
    const tierScores = {} // tier → { sum, count }
    domain.subAreas.forEach(sa => {
      sa.skillGroups.forEach(sg => {
        sg.skills.forEach(skill => {
          const level = assessments[skill.id]
          const tier = getSkillTier(skill.id)
          if (isAssessed(level) && level > 0 && tier > 0) {
            if (!tierScores[tier]) tierScores[tier] = { sum: 0, count: 0 }
            tierScores[tier].sum += level
            tierScores[tier].count++
          }
        })
      })
    })

    const tiers = Object.keys(tierScores).map(Number).sort((a, b) => a - b)
    for (let i = 0; i < tiers.length - 1; i++) {
      const lowerTier = tiers[i]
      const higherTier = tiers[i + 1]
      const lowerAvg = tierScores[lowerTier].sum / tierScores[lowerTier].count
      const higherAvg = tierScores[higherTier].sum / tierScores[higherTier].count

      if (higherAvg > lowerAvg + 0.5) {
        barriers.push({
          type: 'score-inversion',
          severity: higherAvg - lowerAvg,
          affectedDomains: [domain.id],
          description: `${domain.name}: Tier ${higherTier} skills (${higherAvg.toFixed(1)}) rated higher than Tier ${lowerTier} (${lowerAvg.toFixed(1)}) — possible splinter skills or assessment gap`,
        })
      }
    }
  })

  // 2. Prerequisite gaps: downstream skill rated higher than its direct prerequisites
  Object.entries(DOMAIN_DEPENDENCIES).forEach(([domainId, deps]) => {
    const domainH = health[domainId]
    if (!domainH || domainH.assessed === 0) return

    deps.forEach(depId => {
      const depH = health[depId]
      if (!depH || depH.assessed === 0) return

      if (domainH.avg > depH.avg + 0.8) {
        const domain = framework.find(d => d.id === domainId)
        const depDomain = framework.find(d => d.id === depId)
        barriers.push({
          type: 'prerequisite-gap',
          severity: domainH.avg - depH.avg,
          affectedDomains: [domainId, depId],
          description: `${domain?.name} (${domainH.avg.toFixed(1)}) significantly exceeds prerequisite ${depDomain?.name} (${depH.avg.toFixed(1)}) — foundation may be unstable`,
        })
      }
    })
  })

  // 3. Uneven profiles: large variance within a domain suggests scattered skills
  framework.forEach(domain => {
    const scores = []
    domain.subAreas.forEach(sa => {
      sa.skillGroups.forEach(sg => {
        sg.skills.forEach(skill => {
          const level = assessments[skill.id]
          if (isAssessed(level) && level > 0) scores.push(level)
        })
      })
    })

    if (scores.length >= 4) {
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length
      const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
      const stdDev = Math.sqrt(variance)

      if (stdDev > 0.9) {
        barriers.push({
          type: 'uneven-profile',
          severity: stdDev,
          affectedDomains: [domain.id],
          description: `${domain.name}: High variability (SD=${stdDev.toFixed(2)}) across skills — may indicate scattered acquisition or inconsistent generalization`,
        })
      }
    }
  })

  // 4. Plateau patterns: no growth across recent snapshots
  if (snapshots.length >= 2) {
    const recent = snapshots.slice(-3)
    framework.forEach(domain => {
      const healthOverTime = recent.map(snap => {
        const h = computeDomainHealth(snap.assessments || {})
        return h[domain.id]?.avg ?? 0
      })
      // Add current
      healthOverTime.push(health[domain.id]?.avg ?? 0)

      const allAssessed = healthOverTime.every(h => h > 0)
      if (!allAssessed) return

      const maxDelta = Math.max(...healthOverTime) - Math.min(...healthOverTime)
      if (maxDelta < 0.15 && healthOverTime[0] < 2.5) {
        barriers.push({
          type: 'plateau',
          severity: 2.5 - healthOverTime[healthOverTime.length - 1],
          affectedDomains: [domain.id],
          description: `${domain.name}: Minimal change (±${maxDelta.toFixed(2)}) across ${healthOverTime.length} assessments — possible plateau`,
        })
      }
    })
  }

  return barriers.sort((a, b) => b.severity - a.severity)
}

/* ─────────────────────────────────────────────
   Skill-Level Dependencies (Cross-Domain)
   ───────────────────────────────────────────── */

/**
 * Re-export skill dependency functions for convenient single-import usage.
 */
export {
  getSkillTier,
  getSubAreaPrereqs,
  getSkillPrereqs,
  getAllPrerequisites,
  computeSkillReadiness,
  findCrossDomainBottlenecks,
  getSubAreaTierBreakdown,
  getDomainFromId,
}

/**
 * Compute sub-area readiness: for each sub-area, how ready are its
 * cross-domain prerequisites?
 *
 * Returns Map<subAreaId, { readiness: 0-1, prereqSubAreas, unmetPrereqs[] }>
 */
export function computeSubAreaReadiness(assessments = {}) {
  const result = {}

  framework.forEach(domain => {
    domain.subAreas.forEach(sa => {
      const prereqSaIds = getSubAreaPrereqs(sa.id)
      if (prereqSaIds.length === 0) {
        result[sa.id] = { readiness: 1, prereqSubAreas: [], unmetPrereqs: [] }
        return
      }

      let totalSkills = 0
      let metSkills = 0
      const unmetPrereqs = []

      prereqSaIds.forEach(prereqSaId => {
        const prereqDomainId = getDomainFromId(prereqSaId)
        const prereqDomain = framework.find(d => d.id === prereqDomainId)
        if (!prereqDomain) return

        const prereqSa = prereqDomain.subAreas.find(s => s.id === prereqSaId)
        if (!prereqSa) return

        prereqSa.skillGroups.forEach(sg => {
          sg.skills.forEach(skill => {
            totalSkills++
            const level = assessments[skill.id]
            if (isAssessed(level) && level >= 2) {
              metSkills++
            } else {
              unmetPrereqs.push({
                skillId: skill.id,
                skillName: skill.name,
                subAreaId: prereqSaId,
                subAreaName: prereqSa.name,
                domainId: prereqDomainId,
                currentLevel: level ?? null,
                tier: getSkillTier(skill.id),
              })
            }
          })
        })
      })

      result[sa.id] = {
        readiness: totalSkills > 0 ? metSkills / totalSkills : 1,
        prereqSubAreas: prereqSaIds,
        unmetPrereqs: unmetPrereqs.sort((a, b) => a.tier - b.tier),
      }
    })
  })

  return result
}

/**
 * Find the most impactful skill-level bottlenecks across all domains.
 * Wraps findCrossDomainBottlenecks from skillDependencies.js.
 *
 * Returns top N bottleneck skills sorted by blocked count.
 */
export function findSkillBottlenecks(assessments = {}, limit = 20) {
  return findCrossDomainBottlenecks(assessments, framework).slice(0, limit)
}

/**
 * Enhanced sub-area health with tier breakdown and prerequisite readiness.
 * Extends computeSubAreaHealth with skill-level dependency data.
 */
export function computeEnhancedSubAreaHealth(domainId, assessments = {}) {
  const baseHealth = computeSubAreaHealth(domainId, assessments)
  const saReadiness = computeSubAreaReadiness(assessments)

  return baseHealth.map(sa => ({
    ...sa,
    tierBreakdown: getSubAreaTierBreakdown(sa.subAreaId, assessments, framework),
    prerequisiteReadiness: saReadiness[sa.subAreaId] || { readiness: 1, prereqSubAreas: [], unmetPrereqs: [] },
  }))
}
