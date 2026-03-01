import { useMemo } from 'react'
import useCascadeGraph from './useCascadeGraph.js'
import { framework } from '../data/framework.js'
import { computeCascadeStrength } from '../data/cascadeModel.js'
import { computeConstrainedSkills, computeSkillInfluence } from '../data/skillInfluence.js'
import {
  generateClinicalSummary,
  generateParentSummary,
  generateInterventionRationale,
  generateDomainNarrative,
} from '../lib/narratives.js'

/**
 * useClinicalIntelligence — Wraps the cascade engine with clinical interpretation.
 *
 * Returns directive recommendations, risk summaries, domain insights, and narratives
 * that views can render without understanding the cascade model.
 *
 * @param {Object} assessments - Current assessment data { skillId: level }
 * @param {Array} snapshots - Array of historical snapshots
 * @param {string} clientName - Client name for narratives
 * @returns Clinical intelligence object
 */
export default function useClinicalIntelligence(assessments = {}, snapshots = [], clientName = '') {
  const graph = useCascadeGraph(assessments, snapshots)
  const {
    nodes,
    domainHealth,
    impactRanking,
    cascadeRisks,
    skillBottlenecks,
    subAreaReadiness,
    learningBarriers,
  } = graph

  const hasData = useMemo(
    () => Object.keys(assessments).length > 0,
    [assessments]
  )

  // ─── Target Skills ───
  // Cross-reference skill bottlenecks with impact ranking to find the highest-leverage
  // skills to target: skills in weak, high-leverage domains that block the most progress.
  const targetSkills = useMemo(() => {
    if (!hasData || skillBottlenecks.length === 0) return []

    // Build a leverage map for domains
    const leverageMap = {}
    impactRanking.forEach(r => {
      leverageMap[r.domainId] = r.leverageScore
    })

    // Score each bottleneck skill: blockedCount weighted by domain leverage
    return skillBottlenecks
      .map(skill => {
        const domainLeverage = leverageMap[skill.domainId] || 0
        const domain = framework.find(d => d.id === skill.domainId)
        return {
          ...skill,
          domainName: domain?.name || skill.domainId,
          // Composite priority: skills that block a lot AND live in high-leverage domains
          priority: (skill.blockedCount || 0) * (1 + domainLeverage * 0.1),
          reason: skill.blockedCount > 0
            ? `Blocks ${skill.blockedCount} downstream skill${skill.blockedCount !== 1 ? 's' : ''}`
            : 'Low score in high-leverage domain',
        }
      })
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5)
  }, [hasData, skillBottlenecks, impactRanking])

  // ─── Combined Risks ───
  const risks = useMemo(() => {
    const combined = [
      ...cascadeRisks.map(r => ({ ...r, source: 'cascade' })),
      ...learningBarriers.map(b => ({ ...b, source: 'barrier' })),
    ].sort((a, b) => (b.severity || 0) - (a.severity || 0))

    return {
      combined,
      criticalCount: combined.filter(r => (r.severity || 0) >= 2).length,
      hasActiveRisks: combined.length > 0,
    }
  }, [cascadeRisks, learningBarriers])

  // ─── Ceiling Constraints ───
  const constrainedSkills = useMemo(() => computeConstrainedSkills(assessments), [assessments])
  const skillInfluence = useMemo(() => computeSkillInfluence(assessments), [assessments])

  // Find the single most impactful ceiling constraint (most downstream caps)
  const topCeilingConstraint = useMemo(() => {
    if (!hasData) return null
    // Find the prereq skill that caps the most downstream skills
    let best = null
    for (const [skillId, inf] of Object.entries(skillInfluence)) {
      if (inf.influenceScore > 0 && inf.directDownstream > 0) {
        const level = assessments[skillId] ?? null
        if (level != null && level < 2) {
          if (!best || inf.directDownstream > best.directDownstream) {
            const domain = framework.find(d => d.id === inf.affectedDomains[0])
            let skillName = skillId
            for (const d of framework) {
              for (const sa of d.subAreas) {
                for (const sg of sa.skillGroups) {
                  for (const s of sg.skills) {
                    if (s.id === skillId) skillName = s.name
                  }
                }
              }
            }
            best = { skillId, skillName, level, ...inf }
          }
        }
      }
    }
    return best
  }, [hasData, skillInfluence, assessments])

  // ─── Headline (the 5-second answer) ───
  const headline = useMemo(() => {
    if (!hasData) {
      return { topAction: null, topRisk: null, topStrength: null, topConstraint: null }
    }

    // Top action: first target skill
    const topAction = targetSkills[0] || null

    // Top risk: highest severity combined risk
    const topRisk = risks.combined[0] || null

    // Top strength: highest health domain
    const strongest = [...impactRanking].sort((a, b) => b.healthPct - a.healthPct)[0]
    const topStrength = strongest
      ? { domainId: strongest.domainId, domainName: strongest.domainName, healthPct: strongest.healthPct }
      : null

    return { topAction, topRisk, topStrength, topConstraint: topCeilingConstraint }
  }, [hasData, targetSkills, risks, impactRanking, topCeilingConstraint])

  // ─── Domain Insights ───
  const domainInsights = useMemo(() => {
    const insights = {}

    framework.forEach(domain => {
      const health = domainHealth[domain.id] || { avg: 0, assessed: 0, total: 0, healthPct: 0, state: 'locked' }
      const ranking = impactRanking.find(r => r.domainId === domain.id)
      const domainRisks = risks.combined.filter(r =>
        r.affectedDomains?.includes(domain.id) || r.actionDomainId === domain.id
      )

      // Cascade impact: what improves if this domain improves
      let cascadeImpact = null
      if (health.assessed > 0 && health.avg < 2.5) {
        cascadeImpact = computeCascadeStrength(domain.id, assessments)
      }

      // Ready vs blocked skills from subAreaReadiness
      const readySkills = []
      const blockedSkills = []
      Object.entries(subAreaReadiness).forEach(([saId, readiness]) => {
        if (!saId.startsWith(domain.id)) return
        if (readiness.readiness >= 0.8) {
          readySkills.push({ subAreaId: saId, readiness: readiness.readiness })
        } else if (readiness.unmetPrereqs?.length > 0) {
          blockedSkills.push({ subAreaId: saId, readiness: readiness.readiness, unmet: readiness.unmetPrereqs })
        }
      })

      insights[domain.id] = {
        ...health,
        leverageScore: ranking?.leverageScore ?? 0,
        downstreamDomains: ranking?.downstreamDomains ?? 0,
        downstreamSkills: ranking?.downstreamSkills ?? 0,
        rank: impactRanking.findIndex(r => r.domainId === domain.id) + 1,
        cascadeImpact,
        risks: domainRisks,
        readySkills,
        blockedSkills,
        narrative: generateDomainNarrative(domain.id, domainHealth, cascadeRisks, impactRanking),
      }
    })

    return insights
  }, [domainHealth, impactRanking, risks, subAreaReadiness, assessments, cascadeRisks])

  // ─── Narratives ───
  const narratives = useMemo(() => ({
    clinicalSummary: generateClinicalSummary(domainHealth, impactRanking, cascadeRisks, learningBarriers),
    parentSummary: generateParentSummary(domainHealth, clientName),
    interventionRationale: generateInterventionRationale(targetSkills, domainInsights),
  }), [domainHealth, impactRanking, cascadeRisks, learningBarriers, clientName, targetSkills, domainInsights])

  return {
    // The 5-second answer
    headline,
    // Directive recommendations
    targetSkills,
    // Risk summary
    risks,
    // Per-domain intelligence
    domainInsights,
    // Narratives
    narratives,
    // Ceiling constraints
    constrainedSkills,
    skillInfluence,
    topCeilingConstraint,
    // Passthrough from cascade graph (for views that need raw data)
    nodes,
    domainHealth,
    impactRanking,
    skillBottlenecks,
    subAreaReadiness,
    learningBarriers,
    hasData,
    // Graph utilities (passthrough)
    ...graph,
  }
}
