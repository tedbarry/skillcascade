import { framework, isAssessed } from '../data/framework.js'

/**
 * Build the context object sent with each support chat message.
 * Keeps the payload under ~500 tokens to avoid bloating requests.
 */
export function buildChatContext({ activeView, clientName, assessments, plan, role }) {
  const summary = buildAssessmentSummary(assessments)

  return {
    currentView: activeView || 'home',
    clientName: clientName || null,
    assessmentSummary: summary,
    plan: plan || null,
    role: role || null,
  }
}

/**
 * Compute domain averages and identify top needs from raw assessments.
 */
function buildAssessmentSummary(assessments) {
  if (!assessments || typeof assessments !== 'object') {
    return { assessed: false, domainAverages: [], topNeeds: [] }
  }

  const assessed = Object.keys(assessments).length
  if (assessed === 0) {
    return { assessed: false, domainAverages: [], topNeeds: [] }
  }

  // Build domain averages
  const domainAverages = []
  const allSkillScores = []

  for (const domain of framework) {
    let total = 0
    let count = 0

    for (const subArea of domain.subAreas) {
      for (const group of subArea.skillGroups) {
        for (const skill of group.skills) {
          const level = assessments[skill.id]
          if (isAssessed(level)) {
            total += level
            count++
            allSkillScores.push({ name: skill.name, domain: domain.name, level })
          }
        }
      }
    }

    if (count > 0) {
      domainAverages.push({
        domain: domain.name,
        average: Math.round((total / count) * 100) / 100,
        assessedCount: count,
      })
    }
  }

  // Top needs: lowest-scored skills (level 0 or 1), up to 5
  const topNeeds = allSkillScores
    .filter(s => s.level <= 1)
    .sort((a, b) => a.level - b.level)
    .slice(0, 5)
    .map(s => `${s.name} (${s.domain}: ${s.level}/3)`)

  return {
    assessed: true,
    totalSkillsAssessed: assessed,
    domainAverages,
    topNeeds,
  }
}
