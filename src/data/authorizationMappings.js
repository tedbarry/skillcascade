/**
 * Maps SkillCascade's 9-domain assessment framework to insurance authorization
 * problem area categories. Auto-generates deficit narratives and functional
 * impairment severity from assessment data.
 */
import { framework, ASSESSMENT_LEVELS, ASSESSMENT_LABELS, isAssessed } from './framework.js'
import { getBehavioralIndicator } from './behavioralIndicators.js'
import { DSM5_CRITERIA } from './authorizationBoilerplate.js'

// ─── Domain → Insurance Category Mapping ────────────────────────

/**
 * Maps SkillCascade domain IDs to insurance problem area categories.
 * A domain can contribute to multiple categories.
 */
const DOMAIN_TO_CATEGORY = {
  // Maladaptive Type I: repetitive/restrictive patterns, sensory, rigidity
  maladaptiveTypeI: ['d1', 'd3'],  // Regulation (sensory/arousal) + Executive Function (rigidity/inflexibility)

  // Maladaptive Type II: aggression, SIB, elopement, non-compliance
  maladaptiveTypeII: ['d8', 'd1'],  // Safety & Survival + Regulation (escalation/dysregulation)

  // Communication: expressive, receptive, nonverbal, pragmatic
  communication: ['d5'],  // Communication domain

  // Social: reciprocity, relationships, perspective-taking, play
  social: ['d6', 'd2', 'd7'],  // Social Understanding + Self-Awareness + Identity
}

/**
 * Get all skills in a deficit state (Not Present or Needs Work) for given domain IDs.
 */
function getDeficitSkills(domainIds, assessments) {
  const deficits = []

  for (const domainId of domainIds) {
    const domain = framework.find(d => d.id === domainId)
    if (!domain) continue

    for (const sa of domain.subAreas) {
      for (const sg of sa.skillGroups) {
        for (const skill of sg.skills) {
          const level = assessments[skill.id]
          if (isAssessed(level) && level <= ASSESSMENT_LEVELS.NEEDS_WORK) {
            const indicator = getBehavioralIndicator(skill.id, level)
            deficits.push({
              skillId: skill.id,
              skillName: skill.name,
              domainName: domain.name,
              subAreaName: sa.name,
              level,
              levelLabel: ASSESSMENT_LABELS[level],
              indicator: indicator || '',
            })
          }
        }
      }
    }
  }

  return deficits
}

/**
 * Get all developing skills (level 2) for given domain IDs — used for context.
 */
function getDevelopingSkills(domainIds, assessments) {
  const developing = []

  for (const domainId of domainIds) {
    const domain = framework.find(d => d.id === domainId)
    if (!domain) continue

    for (const sa of domain.subAreas) {
      for (const sg of sa.skillGroups) {
        for (const skill of sg.skills) {
          const level = assessments[skill.id]
          if (level === ASSESSMENT_LEVELS.DEVELOPING) {
            developing.push({ skillName: skill.name, subAreaName: sa.name })
          }
        }
      }
    }
  }

  return developing
}

/**
 * Compute domain average for given domain IDs.
 */
function computeCategoryAvg(domainIds, assessments) {
  let total = 0, count = 0

  for (const domainId of domainIds) {
    const domain = framework.find(d => d.id === domainId)
    if (!domain) continue

    for (const sa of domain.subAreas) {
      for (const sg of sa.skillGroups) {
        for (const skill of sg.skills) {
          const level = assessments[skill.id]
          if (isAssessed(level)) { total += level; count++ }
        }
      }
    }
  }

  return count > 0 ? total / count : 0
}

// ─── Auto-Generate "Current Problem Areas" Text ─────────────────

/**
 * Generate base text for a problem area category from assessment data.
 * Returns: { dsmCriteria, asEvidencedBy, deficitCount, severity }
 *
 * The asEvidencedBy text is a factual listing of deficits — BCBAs can edit it,
 * or use "Enhance with AI" to get a flowing clinical narrative.
 */
function generateProblemAreaText(categoryKey, assessments, clientName = 'The client') {
  const domainIds = DOMAIN_TO_CATEGORY[categoryKey]
  const deficits = getDeficitSkills(domainIds, assessments)
  const developing = getDevelopingSkills(domainIds, assessments)
  const avg = computeCategoryAvg(domainIds, assessments)

  const dsmCriteria = DSM5_CRITERIA[categoryKey] || ''

  if (deficits.length === 0 && developing.length === 0) {
    return {
      dsmCriteria,
      asEvidencedBy: `${clientName} does not currently demonstrate significant deficits in this area based on the assessment data.`,
      deficitCount: 0,
      severity: 'none',
    }
  }

  // Group deficits by sub-area for organized output
  const bySubArea = {}
  for (const d of deficits) {
    if (!bySubArea[d.subAreaName]) bySubArea[d.subAreaName] = []
    bySubArea[d.subAreaName].push(d)
  }

  // Build the "As Evidenced By" text
  const lines = []

  // Summary line
  const totalAssessed = deficits.length + developing.length
  lines.push(`${clientName} demonstrates deficits across ${Object.keys(bySubArea).length} sub-area${Object.keys(bySubArea).length !== 1 ? 's' : ''}, with ${deficits.length} skill${deficits.length !== 1 ? 's' : ''} at the Needs Work or Not Present level.`)

  // Per sub-area details with behavioral indicators
  for (const [subArea, skills] of Object.entries(bySubArea)) {
    const indicators = skills
      .filter(s => s.indicator)
      .slice(0, 3)
      .map(s => s.indicator)

    if (indicators.length > 0) {
      lines.push(`In ${subArea}: ${indicators.join('. ')}.`)
    } else {
      const skillNames = skills.slice(0, 4).map(s => s.skillName.toLowerCase())
      lines.push(`In ${subArea}, ${clientName.split(' ')[0] || 'the client'} shows deficits in ${skillNames.join(', ')}.`)
    }
  }

  // Note developing skills if present
  if (developing.length > 0 && developing.length <= 5) {
    const devNames = developing.slice(0, 3).map(d => d.skillName.toLowerCase())
    lines.push(`Additionally, ${developing.length} skill${developing.length !== 1 ? 's are' : ' is'} at the Developing level, including ${devNames.join(', ')}, indicating partial but inconsistent skill acquisition.`)
  }

  // Functional impact
  const impactStatements = {
    maladaptiveTypeI: 'These patterns significantly interfere with the client\'s ability to attend to learning tasks, engage in functional play, and participate in structured activities across settings.',
    maladaptiveTypeII: 'These behaviors present a significant risk to the client\'s safety and the safety of others, and interfere with the client\'s ability to access learning opportunities and participate in age-appropriate activities.',
    communication: 'These communication deficits significantly limit the client\'s ability to express wants and needs, follow instructions, engage in social interactions, and advocate for themselves across settings.',
    social: 'These social skill deficits significantly impact the client\'s ability to develop and maintain peer relationships, participate in group activities, and navigate social situations appropriately.',
  }

  lines.push(impactStatements[categoryKey] || 'These deficits significantly impact the client\'s daily functioning across settings.')

  // Determine severity
  let severity = 'moderate'
  if (avg < 1.0) severity = 'severe'
  else if (avg < 1.5) severity = 'moderate'
  else if (avg < 2.0) severity = 'mild'
  else severity = 'none'

  return {
    dsmCriteria,
    asEvidencedBy: lines.join(' '),
    deficitCount: deficits.length,
    severity,
  }
}

/**
 * Generate all four problem area sections from assessment data.
 */
export function generateAllProblemAreas(assessments, clientName = 'The client') {
  return {
    maladaptiveTypeI: generateProblemAreaText('maladaptiveTypeI', assessments, clientName),
    maladaptiveTypeII: generateProblemAreaText('maladaptiveTypeII', assessments, clientName),
    communication: generateProblemAreaText('communication', assessments, clientName),
    social: generateProblemAreaText('social', assessments, clientName),
  }
}

// ─── Auto-Compute Functional Impairment ─────────────────────────

/**
 * Compute functional impairment severity per category from domain averages.
 * Returns: { communication, socialization, maladaptiveI, maladaptiveII }
 * Each value is 'none', 'mild', 'moderate', or 'severe'.
 */
export function computeFunctionalImpairment(assessments) {
  function avgToSeverity(avg) {
    if (avg < 1.0) return 'severe'
    if (avg < 1.5) return 'moderate'
    if (avg < 2.2) return 'mild'
    return 'none'
  }

  return {
    communication: avgToSeverity(computeCategoryAvg(DOMAIN_TO_CATEGORY.communication, assessments)),
    socialization: avgToSeverity(computeCategoryAvg(DOMAIN_TO_CATEGORY.social, assessments)),
    maladaptiveI: avgToSeverity(computeCategoryAvg(DOMAIN_TO_CATEGORY.maladaptiveTypeI, assessments)),
    maladaptiveII: avgToSeverity(computeCategoryAvg(DOMAIN_TO_CATEGORY.maladaptiveTypeII, assessments)),
  }
}

// ─── Auto-Generate Transition Criteria ──────────────────────────

/**
 * Generate transition/titration criteria from goals.
 * Produces per-domain criteria that reference the actual goal names, matching
 * the exact format from Teddy's reports:
 *   "When [client] [specific measurable outcome] across [N] settings
 *    with 90% accuracy for 6 months, services can be titrated."
 */
export function generateTransitionCriteria(goals = [], clientName = 'The client') {
  // Partition goals by domain
  const decreaseGoals = goals.filter(g =>
    g.domain === 'maladaptive' || g.domain === 'replacement' || g.type === 'decrease'
  )
  const commGoals = goals.filter(g => g.domain === 'communication')
  const socialGoals = goals.filter(g =>
    g.domain === 'socialization' || g.domain === 'socialGroup'
  )

  // Count unique settings across all goals (fallback 14)
  const settingCount = goals.reduce((n, g) => {
    const s = parseInt(g.settingsCount, 10)
    return s > n ? s : n
  }, 14)

  // --- Behavior criterion ---
  let behaviorCriterion
  if (decreaseGoals.length > 0) {
    const behaviorNames = decreaseGoals
      .map(g => g.program || g.skillName || g.name || '')
      .filter(Boolean)
    const nameList = behaviorNames.length > 0
      ? ` (${behaviorNames.join(', ')})`
      : ''
    behaviorCriterion = `When ${clientName} decreases all instances of maladaptive behaviors${nameList} to 0 instances per session across ${settingCount} settings with 90% accuracy for 6 months, services can be titrated.`
  } else {
    behaviorCriterion = `When ${clientName} decreases all instances of maladaptive behaviors to 0 instances per session across ${settingCount} settings with 90% accuracy for 6 months, services can be titrated.`
  }

  // --- Communication criterion ---
  let communicationCriterion
  if (commGoals.length > 0) {
    const commDescriptions = commGoals
      .map(g => g.objective || g.goalText || g.program || g.skillName || '')
      .filter(Boolean)
      .map(t => t.replace(/^(the client |client )/i, '').replace(/\.$/, '').toLowerCase())
    const summary = commDescriptions.length > 0
      ? commDescriptions.join(', ')
      : 'use functional communication skills independently'
    communicationCriterion = `When ${clientName} can ${summary} across various settings with 90% independence for 6 months, services can be titrated.`
  } else {
    communicationCriterion = `When ${clientName} can use functional communication skills independently across various settings with 90% independence for 6 months, services can be titrated.`
  }

  // --- Socialization criterion ---
  let socializationCriterion
  if (socialGoals.length > 0) {
    const socialDescriptions = socialGoals
      .map(g => g.objective || g.goalText || g.program || g.skillName || '')
      .filter(Boolean)
      .map(t => t.replace(/^(the client |client )/i, '').replace(/\.$/, '').toLowerCase())
    const summary = socialDescriptions.length > 0
      ? socialDescriptions.join(', ')
      : 'initiate and maintain appropriate social interactions'
    socializationCriterion = `When ${clientName} can ${summary} with 90% independence across multiple settings for 6 months, services can be titrated.`
  } else {
    socializationCriterion = `When ${clientName} can initiate and maintain appropriate social interactions with 90% independence across multiple settings for 6 months, services can be titrated.`
  }

  return {
    behavior: behaviorCriterion,
    communication: communicationCriterion,
    socialization: socializationCriterion,
  }
}
