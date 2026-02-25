/**
 * narratives.js — Template-based clinical narrative generation.
 *
 * Pure functions that turn cascade engine data into plain-language text.
 * No AI — conditional templates selected by data patterns.
 */

import { framework } from '../data/framework.js'

const DOMAIN_NAMES = {}
const FRIENDLY_NAMES = {
  d1: 'Managing Feelings & Energy',
  d2: 'Understanding Themselves',
  d3: 'Planning & Problem Solving',
  d4: 'Understanding Situations',
  d5: 'Expressing Needs & Ideas',
  d6: 'Getting Along with Others',
  d7: 'Thinking & Learning',
  d8: 'Staying Safe',
  d9: 'Using Support',
}
framework.forEach(d => { DOMAIN_NAMES[d.id] = d.name })

function dn(id) { return DOMAIN_NAMES[id] || id }
function fn(id) { return FRIENDLY_NAMES[id] || DOMAIN_NAMES[id] || id }

function listJoin(items, conjunction = 'and') {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, ${conjunction} ${items[items.length - 1]}`
}

/* ─── Pattern Detection ─── */

function detectPattern(domainHealth, impactRanking, risks, barriers) {
  const assessed = Object.values(domainHealth).filter(h => h.assessed > 0)
  if (assessed.length === 0) return 'no-data'

  const hasFoundationWeakness = (domainHealth.d1?.avg || 0) < 1.5
  const hasInversions = risks.some(r => r.type === 'inversion')
  const hasRegressions = risks.some(r => r.type === 'regression')
  const allStrong = assessed.every(h => h.avg >= 2.0)
  const hasPlateaus = barriers.some(b => b.type === 'plateau')

  if (hasRegressions) return 'regression'
  if (hasFoundationWeakness && hasInversions) return 'foundation-inversion'
  if (hasFoundationWeakness) return 'foundation-weakness'
  if (hasInversions) return 'splinter-skills'
  if (hasPlateaus) return 'plateau'
  if (allStrong) return 'strong-profile'
  return 'mixed'
}

/* ─── Clinical Summary ─── */

export function generateClinicalSummary(domainHealth, impactRanking, risks, barriers) {
  const pattern = detectPattern(domainHealth, impactRanking, risks, barriers)
  const topLeverage = impactRanking[0]
  const riskCount = risks.length + barriers.length

  switch (pattern) {
    case 'no-data':
      return 'No assessment data available. Complete an initial assessment to generate clinical insights.'

    case 'regression': {
      const regRisks = risks.filter(r => r.type === 'regression')
      const domains = regRisks.flatMap(r => r.affectedDomains || [])
      return `Active regression detected in ${listJoin([...new Set(domains)].map(dn))}. ` +
        `This destabilizes downstream domains and requires immediate attention. ` +
        `${riskCount} total risk${riskCount !== 1 ? 's' : ''} identified.`
    }

    case 'foundation-inversion': {
      const d1Avg = (domainHealth.d1?.avg || 0).toFixed(1)
      return `${dn('d1')} is significantly weak (${d1Avg}/3) while higher domains show stronger scores — a foundation inversion pattern. ` +
        `This suggests possible splinter skill teaching or assessment inconsistency. ` +
        `Priority intervention should target ${dn(topLeverage?.domainId || 'd1')} to stabilize the cascade.`
    }

    case 'foundation-weakness': {
      const d1Avg = (domainHealth.d1?.avg || 0).toFixed(1)
      const blocked = impactRanking.filter(r => r.healthPct < 0.5).length
      return `${dn('d1')} is the primary bottleneck (${d1Avg}/3), limiting progress across ${blocked} higher domain${blocked !== 1 ? 's' : ''}. ` +
        `Target foundational regulation skills first to unlock the developmental cascade.`
    }

    case 'splinter-skills': {
      const invRisks = risks.filter(r => r.type === 'inversion')
      const affectedPairs = invRisks.map(r =>
        `${dn(r.affectedDomains?.[0] || '?')} exceeds its prerequisite`
      )
      return `Score inversion${invRisks.length !== 1 ? 's' : ''} detected: ${listJoin(affectedPairs)}. ` +
        `Higher-domain skills may be fragile without prerequisite foundation. ` +
        `Consolidation work on prerequisite domains is recommended.`
    }

    case 'plateau': {
      const plateauBarriers = barriers.filter(b => b.type === 'plateau')
      const domains = [...new Set(plateauBarriers.flatMap(b => b.affectedDomains || []))]
      return `Progress has plateaued in ${listJoin(domains.map(dn))}. ` +
        `Consider adjusting instructional strategies or reviewing whether prerequisite skills are truly generalized. ` +
        `${topLeverage ? `${dn(topLeverage.domainId)} has the highest intervention leverage.` : ''}`
    }

    case 'strong-profile':
      return `All assessed domains are at or above the developing threshold. ` +
        `Focus on mastery-level consolidation and generalization across contexts. ` +
        `${riskCount > 0 ? `${riskCount} minor risk${riskCount !== 1 ? 's' : ''} to monitor.` : 'No active risks detected.'}`

    default: {
      const weakest = impactRanking.find(r => r.healthPct < 0.5)
      const strongest = [...impactRanking].sort((a, b) => b.healthPct - a.healthPct)[0]
      return `${weakest ? `${dn(weakest.domainId)} is the highest-leverage target for intervention. ` : ''}` +
        `${strongest ? `${dn(strongest.domainId)} is a relative strength. ` : ''}` +
        `${riskCount > 0 ? `${riskCount} risk${riskCount !== 1 ? 's' : ''} requiring attention.` : 'No active risks detected.'}`
    }
  }
}

/* ─── Parent Summary ─── */

export function generateParentSummary(domainHealth, clientName = 'Your child') {
  const assessed = Object.entries(domainHealth).filter(([, h]) => h.assessed > 0)
  if (assessed.length === 0) {
    return `We're just getting started with ${clientName}'s assessment. Once we have more information, we'll share what we're seeing.`
  }

  const strengths = assessed
    .filter(([, h]) => h.avg >= 2.0)
    .map(([id]) => fn(id))
  const growing = assessed
    .filter(([, h]) => h.avg >= 1.0 && h.avg < 2.0)
    .map(([id]) => fn(id))
  const starting = assessed
    .filter(([, h]) => h.avg < 1.0)
    .map(([id]) => fn(id))

  const parts = []

  if (strengths.length > 0) {
    parts.push(`${clientName} is showing real strength in ${listJoin(strengths)}.`)
  }

  if (growing.length > 0) {
    parts.push(`${growing.length === 1 ? `${growing[0]} is` : `${listJoin(growing)} are`} areas of active growth — we're seeing progress here.`)
  }

  if (starting.length > 0 && strengths.length > 0) {
    parts.push(`We're building foundations in ${listJoin(starting)}, which will help with other skills over time.`)
  } else if (starting.length > 0) {
    parts.push(`We're focusing on building strong foundations in ${listJoin(starting)} — these are the building blocks for everything else.`)
  }

  return parts.join(' ')
}

/* ─── Intervention Rationale ─── */

export function generateInterventionRationale(targetSkills, domainInsights) {
  if (!targetSkills || targetSkills.length === 0) {
    return 'No specific skill targets identified. Complete an assessment to generate recommendations.'
  }

  const topSkill = targetSkills[0]
  const domains = [...new Set(targetSkills.map(s => s.domainId))]
  const totalBlocked = targetSkills.reduce((sum, s) => sum + (s.blockedCount || 0), 0)

  let rationale = `These ${targetSkills.length} skills were selected because they block the most downstream progress. `

  if (topSkill.blockedCount > 0) {
    rationale += `"${topSkill.skillName}" (${dn(topSkill.domainId)}) is a Tier ${topSkill.tier} prerequisite blocking ${topSkill.blockedCount} skill${topSkill.blockedCount !== 1 ? 's' : ''}. `
  }

  if (totalBlocked > 10) {
    rationale += `Together, addressing these targets would unblock ${totalBlocked} downstream skills across ${domains.length} domain${domains.length !== 1 ? 's' : ''}.`
  } else if (domains.length > 1) {
    rationale += `Targets span ${listJoin(domains.map(dn))}, addressing multiple cascade pathways.`
  }

  return rationale
}

/* ─── Domain Narrative ─── */

export function generateDomainNarrative(domainId, domainHealth, risks, impactRanking) {
  const health = domainHealth[domainId]
  if (!health || health.assessed === 0) {
    return `${dn(domainId)} has not been assessed yet.`
  }

  const ranking = impactRanking?.find(r => r.domainId === domainId)
  const domainRisks = risks.filter(r =>
    r.affectedDomains?.includes(domainId) || r.actionDomainId === domainId
  )

  const state = health.state
  const avg = health.avg.toFixed(1)

  if (state === 'mastered') {
    return `${dn(domainId)} is strong at ${avg}/3. ${ranking?.downstreamDomains > 0 ? `Supports ${ranking.downstreamDomains} downstream domain${ranking.downstreamDomains !== 1 ? 's' : ''}.` : ''}`
  }

  if (state === 'blocked') {
    return `${dn(domainId)} is blocked — prerequisite domains need improvement first.`
  }

  if (domainRisks.length > 0) {
    return `${dn(domainId)} at ${avg}/3 with ${domainRisks.length} active risk${domainRisks.length !== 1 ? 's' : ''}. ${ranking?.downstreamDomains > 0 ? `Affects ${ranking.downstreamDomains} domain${ranking.downstreamDomains !== 1 ? 's' : ''} downstream.` : ''}`
  }

  if (state === 'needs-work') {
    return `${dn(domainId)} at ${avg}/3 needs targeted intervention. ${ranking?.leverageScore > 5 ? 'High leverage — improvement here cascades widely.' : ''}`
  }

  return `${dn(domainId)} at ${avg}/3, developing. ${health.assessed}/${health.total} skills assessed.`
}
