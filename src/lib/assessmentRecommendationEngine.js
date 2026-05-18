import { framework, ASSESSMENT_LEVELS, isAssessed } from '../data/framework.js'
import { DEFICIT_PROFILES, SUBAREA_TO_DEFICIT } from '../data/canonicalRecommendationProfiles.js'

const LEVEL_SEVERITY = {
  [ASSESSMENT_LEVELS.NOT_PRESENT]: 1.0,
  [ASSESSMENT_LEVELS.NEEDS_WORK]: 0.75,
  [ASSESSMENT_LEVELS.DEVELOPING]: 0.35,
  [ASSESSMENT_LEVELS.SOLID]: 0,
}

const DEFAULT_OPTIONS = {
  clusterThreshold: 2,
  fragileRatioThreshold: 0.8,
  minAssessedForFragileTrigger: 3,
  maxRecommendations: 10,
  maxRecommendationsPerDomain: 3,
}

const skillMeta = new Map()
const subAreaMeta = new Map()

for (const domain of framework) {
  for (const subArea of domain.subAreas) {
    const skills = []
    for (const skillGroup of subArea.skillGroups) {
      for (const skill of skillGroup.skills) {
        const meta = {
          skillId: skill.id,
          skillName: skill.name,
          skillGroupName: skillGroup.name,
          subAreaId: subArea.id,
          subAreaName: subArea.name,
          domainId: domain.id,
          domainName: domain.name,
        }
        skillMeta.set(skill.id, meta)
        skills.push(meta)
      }
    }
    subAreaMeta.set(subArea.id, {
      subAreaId: subArea.id,
      subAreaName: subArea.name,
      domainId: domain.id,
      domainName: domain.name,
      skills,
    })
  }
}

function round(value, digits = 3) {
  return Number(value.toFixed(digits))
}

function buildTriggerType({ weakCount, assessedCount, fragileRatio }, options) {
  if (weakCount >= options.clusterThreshold) return 'cluster'
  if (weakCount >= 1) return 'single-item'
  if (assessedCount >= options.minAssessedForFragileTrigger && fragileRatio >= options.fragileRatioThreshold) {
    return 'fragile-profile'
  }
  return null
}

function buildSeverity({ assessedSkills }) {
  if (assessedSkills.length === 0) return 0
  const total = assessedSkills.reduce((sum, item) => sum + LEVEL_SEVERITY[item.level], 0)
  return total / assessedSkills.length
}

function buildEvidenceSummary(subArea, weakSkills, fragileSkills) {
  const highlights = [...weakSkills, ...fragileSkills]
    .slice(0, 3)
    .map((skill) => skill.skillName.toLowerCase())

  const scopeText = weakSkills.length > 0
    ? `${weakSkills.length} low-scored skill${weakSkills.length !== 1 ? 's' : ''}`
    : `${fragileSkills.length} developing skill${fragileSkills.length !== 1 ? 's' : ''}`

  if (highlights.length === 0) return `${subArea.subAreaName}: ${scopeText}`

  return `${subArea.subAreaName}: ${scopeText} including ${highlights.join(', ')}`
}

export function collectAssessmentFindings(assessments = {}, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }
  const findings = []

  for (const subArea of subAreaMeta.values()) {
    const assessedSkills = subArea.skills
      .map((skill) => ({ ...skill, level: assessments[skill.skillId] }))
      .filter((skill) => isAssessed(skill.level))

    if (assessedSkills.length === 0) continue

    const weakSkills = assessedSkills.filter((skill) => skill.level <= ASSESSMENT_LEVELS.NEEDS_WORK)
    const fragileSkills = assessedSkills.filter((skill) => skill.level === ASSESSMENT_LEVELS.DEVELOPING)
    const avgLevel = assessedSkills.reduce((sum, skill) => sum + skill.level, 0) / assessedSkills.length
    const severity = buildSeverity({ assessedSkills })
    const fragileRatio = fragileSkills.length / assessedSkills.length
    const triggerType = buildTriggerType({
      weakCount: weakSkills.length,
      assessedCount: assessedSkills.length,
      fragileRatio,
    }, config)

    if (!triggerType) continue

    findings.push({
      subAreaId: subArea.subAreaId,
      subAreaName: subArea.subAreaName,
      domainId: subArea.domainId,
      domainName: subArea.domainName,
      assessedCount: assessedSkills.length,
      weakCount: weakSkills.length,
      fragileCount: fragileSkills.length,
      avgLevel: round(avgLevel),
      severity: round(severity),
      triggerType,
      weakSkills,
      fragileSkills,
      evidenceSummary: buildEvidenceSummary(subArea, weakSkills, fragileSkills),
    })
  }

  return findings.sort((a, b) => b.severity - a.severity || a.domainName.localeCompare(b.domainName))
}

function createRecommendation(deficitSlug, profile) {
  return {
    domainSlug: profile.domainSlug,
    deficitSlug,
    goalFamilyTitle: profile.title,
    recommendedObjectiveSeed: profile.standardizedObjective,
    medicalNecessityTags: [...profile.medicalNecessityTags],
    defaultMeasurementType: profile.defaultMeasurementType,
    defaultCriteria: profile.defaultCriteria,
    supportingSubAreas: [],
    sourceRefs: [],
    evidenceSummaries: [],
    severityValues: [],
    weakSkillCount: 0,
    fragileSkillCount: 0,
  }
}

function finalizeRecommendation(recommendation, profile) {
  const meanSeverity = recommendation.severityValues.length > 0
    ? recommendation.severityValues.reduce((sum, value) => sum + value, 0) / recommendation.severityValues.length
    : 0
  const breadthBonus = Math.min(0.18, Math.max(0, recommendation.supportingSubAreas.length - 1) * 0.08)
  const priorityScore = Math.min(0.99, meanSeverity * 0.65 + profile.priorityWeight + breadthBonus)
  const strength = priorityScore >= 0.8 ? 'high' : priorityScore >= 0.6 ? 'medium' : 'low'
  const subAreaNames = recommendation.supportingSubAreas.map((item) => item.subAreaName)
  const joinedSubAreas = subAreaNames.length > 1
    ? `${subAreaNames.slice(0, -1).join(', ')}, and ${subAreaNames.at(-1)}`
    : subAreaNames[0]

  return {
    domainSlug: recommendation.domainSlug,
    deficitSlug: recommendation.deficitSlug,
    goalFamilyTitle: recommendation.goalFamilyTitle,
    recommendedObjectiveSeed: recommendation.recommendedObjectiveSeed,
    defaultMeasurementType: recommendation.defaultMeasurementType,
    defaultCriteria: recommendation.defaultCriteria,
    priorityScore: round(priorityScore),
    recommendationStrength: strength,
    medicalNecessityTags: recommendation.medicalNecessityTags,
    medicalNecessityRationale: `Low-scored findings in ${joinedSubAreas} indicate a need for ${profile.title.toLowerCase()}. This pattern materially affects ${profile.impactStatement} and supports a medically necessary goal recommendation in this area.`,
    evidenceSummary: recommendation.evidenceSummaries.join('; '),
    supportingSubAreas: recommendation.supportingSubAreas,
    sourceRefs: recommendation.sourceRefs,
    weakSkillCount: recommendation.weakSkillCount,
    fragileSkillCount: recommendation.fragileSkillCount,
    requiresBcbaReview: true,
  }
}

function isFiniteCap(value) {
  return Number.isFinite(value) && value >= 0
}

function applyRecommendationCaps(recommendations, options) {
  const maxRecommendations = isFiniteCap(options.maxRecommendations) ? options.maxRecommendations : null
  const maxRecommendationsPerDomain = isFiniteCap(options.maxRecommendationsPerDomain) ? options.maxRecommendationsPerDomain : null

  if (maxRecommendations == null && maxRecommendationsPerDomain == null) return recommendations

  const domainCounts = new Map()
  const capped = []

  for (const recommendation of recommendations) {
    if (maxRecommendations != null && capped.length >= maxRecommendations) break

    const domainSlug = recommendation.domainSlug || 'uncategorized'
    const currentDomainCount = domainCounts.get(domainSlug) || 0
    if (maxRecommendationsPerDomain != null && currentDomainCount >= maxRecommendationsPerDomain) continue

    domainCounts.set(domainSlug, currentDomainCount + 1)
    capped.push(recommendation)
  }

  return capped
}

export function buildAssessmentRecommendations(assessments = {}, options = {}) {
  const findings = collectAssessmentFindings(assessments, options)
  const config = { ...DEFAULT_OPTIONS, ...options }
  const grouped = new Map()

  for (const finding of findings) {
    const deficitSlug = SUBAREA_TO_DEFICIT[finding.subAreaId]
    if (!deficitSlug) continue

    const profile = DEFICIT_PROFILES[deficitSlug]
    if (!profile) continue

    if (!grouped.has(deficitSlug)) {
      grouped.set(deficitSlug, createRecommendation(deficitSlug, profile))
    }

    const recommendation = grouped.get(deficitSlug)
    recommendation.supportingSubAreas.push({
      subAreaId: finding.subAreaId,
      subAreaName: finding.subAreaName,
      domainName: finding.domainName,
      triggerType: finding.triggerType,
      avgLevel: finding.avgLevel,
      severity: finding.severity,
      weakSkillNames: finding.weakSkills.map((skill) => skill.skillName),
      fragileSkillNames: finding.fragileSkills.map((skill) => skill.skillName),
    })
    recommendation.sourceRefs.push(
      ...finding.weakSkills.map((skill) => skill.skillId),
      ...finding.fragileSkills.map((skill) => skill.skillId)
    )
    recommendation.evidenceSummaries.push(finding.evidenceSummary)
    recommendation.severityValues.push(finding.severity)
    recommendation.weakSkillCount += finding.weakCount
    recommendation.fragileSkillCount += finding.fragileCount
  }

  const rankedRecommendations = Array.from(grouped.entries())
    .map(([deficitSlug, recommendation]) => finalizeRecommendation(recommendation, DEFICIT_PROFILES[deficitSlug]))
    .sort((a, b) => b.priorityScore - a.priorityScore || a.goalFamilyTitle.localeCompare(b.goalFamilyTitle))

  return applyRecommendationCaps(rankedRecommendations, config)
}
