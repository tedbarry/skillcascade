/**
 * Sample assessment data for demo purposes.
 * Shows a realistic profile: strong regulation, developing executive function,
 * weaker communication and social understanding.
 */
import { ASSESSMENT_LEVELS, framework } from './framework.js'

const { NEEDS_WORK, DEVELOPING, SOLID } = ASSESSMENT_LEVELS

/**
 * Generate sample assessments with a realistic pattern:
 * - Domain 1 (Regulation): mostly solid
 * - Domain 2 (Self-Awareness): solid to developing
 * - Domain 3 (Executive Function): developing
 * - Domain 4 (Problem Solving): developing to needs work
 * - Domain 5 (Communication): needs work to developing
 * - Domain 6 (Social Understanding): needs work
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

  framework.forEach((domain) => {
    const pattern = domainPatterns[domain.id] || []
    domain.subAreas.forEach((subArea, saIdx) => {
      const baseLevel = pattern[saIdx % pattern.length] || DEVELOPING
      subArea.skillGroups.forEach((skillGroup, sgIdx) => {
        skillGroup.skills.forEach((skill, sIdx) => {
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
