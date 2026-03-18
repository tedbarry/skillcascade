import { framework, isAssessed } from '../data/framework.js'
import { computeDomainHealth, detectCascadeRisks } from '../data/cascadeModel.js'

/**
 * Build the context object sent with each support chat message.
 * Keeps the payload under ~1000 tokens for Haiku.
 */
export function buildChatContext({ activeView, clientName, assessments, plan, role, snapshots }) {
  const summary = buildAssessmentSummary(assessments, snapshots)

  return {
    currentView: activeView || 'home',
    clientName: clientName || null,
    assessmentSummary: summary,
    plan: plan || null,
    role: role || null,
  }
}

/**
 * Compute domain averages, health states, top needs, top strengths,
 * and cascade risks from raw assessments.
 */
function buildAssessmentSummary(assessments, snapshots) {
  if (!assessments || typeof assessments !== 'object') {
    return { assessed: false, domainAverages: [], topNeeds: [], topStrengths: [], cascadeRisks: [] }
  }

  const assessed = Object.keys(assessments).length
  if (assessed === 0) {
    return { assessed: false, domainAverages: [], topNeeds: [], topStrengths: [], cascadeRisks: [] }
  }

  // Use cascadeModel for authoritative domain health (includes state)
  const domainHealth = computeDomainHealth(assessments)

  // Build domain averages with health states
  const domainAverages = []
  const allSkillScores = []

  for (const domain of framework) {
    const health = domainHealth[domain.id]
    let count = 0

    for (const subArea of domain.subAreas) {
      for (const group of subArea.skillGroups) {
        for (const skill of group.skills) {
          const level = assessments[skill.id]
          if (isAssessed(level)) {
            count++
            allSkillScores.push({ name: skill.name, domain: domain.name, level })
          }
        }
      }
    }

    if (count > 0 && health) {
      domainAverages.push({
        domain: domain.name,
        average: Math.round(health.avg * 100) / 100,
        assessedCount: health.assessed,
        state: health.state,
      })
    }
  }

  // Top needs: lowest-scored skills (level 0 or 1), up to 5
  const topNeeds = allSkillScores
    .filter(s => s.level <= 1)
    .sort((a, b) => a.level - b.level)
    .slice(0, 5)
    .map(s => `${s.name} (${s.domain}: ${s.level}/3)`)

  // Top strengths: mastered skills (level 3), up to 3
  const topStrengths = allSkillScores
    .filter(s => s.level === 3)
    .slice(0, 3)
    .map(s => `${s.name} (${s.domain})`)

  // Assessment completion percentage
  const assessmentCompletion = Math.round((assessed / 260) * 100)

  // Cascade risks (limit to top 3 to keep context size manageable)
  let cascadeRisks = []
  try {
    const risks = detectCascadeRisks(assessments, snapshots || [])
    cascadeRisks = risks.slice(0, 3).map(r => ({
      title: r.title,
      description: r.description,
    }))
  } catch {
    // Non-critical — skip if cascade detection fails
  }

  return {
    assessed: true,
    totalSkillsAssessed: assessed,
    assessmentCompletion,
    domainAverages,
    topNeeds,
    topStrengths,
    cascadeRisks,
  }
}
