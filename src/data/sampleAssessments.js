/**
 * Sample assessment data for demo purposes.
 * Shows a realistic profile: strong regulation, developing executive function,
 * weaker communication and social understanding.
 * D5/D6 are ~40% unassessed to demonstrate Start Here value.
 */
import { ASSESSMENT_LEVELS, framework } from './framework.js'

const { NEEDS_WORK, DEVELOPING, SOLID } = ASSESSMENT_LEVELS

// Deterministic hash for consistent "random" unassessed gaps
function shouldSkip(skillId, rate) {
  let h = 0
  for (let i = 0; i < skillId.length; i++) h = ((h << 5) - h + skillId.charCodeAt(i)) | 0
  return (Math.abs(h) % 100) < (rate * 100)
}

/**
 * Generate sample assessments with a realistic pattern:
 * - Domain 1 (Regulation): mostly solid
 * - Domain 2 (Self-Awareness): solid to developing
 * - Domain 3 (Executive Function): developing
 * - Domain 4 (Problem Solving): developing to needs work
 * - Domain 5 (Communication): needs work to developing (~40% unassessed)
 * - Domain 6 (Social Understanding): needs work (~40% unassessed)
 * - Domain 7 (Identity): developing
 * - Domain 8 (Safety): solid
 * - Domain 9 (Support System): developing
 */
export function generateSampleAssessments() {
  const assessments = {}

  const domainPatterns = {
    d1: [SOLID, SOLID, SOLID, DEVELOPING, SOLID, SOLID, DEVELOPING, SOLID],
    d2: [SOLID, DEVELOPING, SOLID, DEVELOPING, DEVELOPING, SOLID],
    d3: [DEVELOPING, DEVELOPING, NEEDS_WORK, DEVELOPING, DEVELOPING, NEEDS_WORK],
    d4: [DEVELOPING, NEEDS_WORK, DEVELOPING, NEEDS_WORK, DEVELOPING],
    d5: [NEEDS_WORK, DEVELOPING, NEEDS_WORK, NEEDS_WORK, DEVELOPING, NEEDS_WORK],
    d6: [NEEDS_WORK, DEVELOPING, NEEDS_WORK, NEEDS_WORK, NEEDS_WORK, DEVELOPING],
    d7: [DEVELOPING, DEVELOPING, NEEDS_WORK, DEVELOPING, NEEDS_WORK],
    d8: [SOLID, SOLID, DEVELOPING, SOLID],
    d9: [DEVELOPING, DEVELOPING, SOLID, DEVELOPING, DEVELOPING, NEEDS_WORK],
  }

  // D5 and D6 have ~40% unassessed gaps to show Start Here value
  const gapDomains = { d5: 0.4, d6: 0.4 }

  framework.forEach((domain) => {
    const pattern = domainPatterns[domain.id] || []
    const gapRate = gapDomains[domain.id] || 0
    domain.subAreas.forEach((subArea, saIdx) => {
      const baseLevel = pattern[saIdx % pattern.length] || DEVELOPING
      subArea.skillGroups.forEach((skillGroup, sgIdx) => {
        skillGroup.skills.forEach((skill, sIdx) => {
          // Skip some skills in gap domains
          if (gapRate > 0 && shouldSkip(skill.id, gapRate)) return

          // Add some variance within each sub-area
          const variance = (sgIdx + sIdx) % 4
          let level = baseLevel
          if (variance === 0 && baseLevel < SOLID) level = baseLevel + 1
          if (variance === 3 && baseLevel > NEEDS_WORK) level = baseLevel - 1
          assessments[skill.id] = level
        })
      })
    })
  })

  return assessments
}

/**
 * Generate sample snapshots for timeline/risk views.
 * 3 snapshots: 8 weeks ago (weaker), 4 weeks ago (improving), current.
 * D4 shows a regression between snapshot 2 and current.
 */
export function generateSampleSnapshots(currentAssessments) {
  const now = Date.now()
  const WEEK = 7 * 24 * 60 * 60 * 1000

  // Snapshot 1: 8 weeks ago — weaker overall
  const snap1 = {}
  Object.entries(currentAssessments).forEach(([id, level]) => {
    if (id.startsWith('d1') || id.startsWith('d8')) {
      // D1/D8 were already decent — drop some by 1
      snap1[id] = Math.max(NEEDS_WORK, level - ((id.charCodeAt(4) % 3 === 0) ? 1 : 0))
    } else {
      // Other domains were notably weaker
      snap1[id] = Math.max(NEEDS_WORK, level - 1)
    }
  })

  // Snapshot 2: 4 weeks ago — improving, D4 was at its peak
  const snap2 = {}
  Object.entries(currentAssessments).forEach(([id, level]) => {
    if (id.startsWith('d4')) {
      // D4 was actually stronger 4 weeks ago (will regress in "current")
      snap2[id] = Math.min(SOLID, level + 1)
    } else if (id.startsWith('d1') || id.startsWith('d8')) {
      snap2[id] = level
    } else {
      // Midway between snap1 and current
      const s1 = snap1[id] ?? NEEDS_WORK
      snap2[id] = Math.round((s1 + level) / 2)
    }
  })

  return [
    { id: 'sample-snap-1', label: '8 weeks ago', timestamp: now - 8 * WEEK, assessments: snap1 },
    { id: 'sample-snap-2', label: '4 weeks ago', timestamp: now - 4 * WEEK, assessments: snap2 },
    { id: 'sample-snap-3', label: 'Current', timestamp: now, assessments: currentAssessments },
  ]
}
