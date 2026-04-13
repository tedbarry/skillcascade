/**
 * Pre-built goal templates — instant, no AI needed.
 * Generates a measurable ABA goal from any skill + assessment data + user preferences.
 */
import { framework, ASSESSMENT_LEVELS, ASSESSMENT_LABELS, isAssessed } from '../data/framework.js'
import { getBehavioralIndicator } from '../data/behavioralIndicators.js'
import { getTeachingPlaybook } from '../data/teachingPlaybook.js'
import { getSkillCeiling, computeSkillInfluence } from '../data/skillInfluence.js'
import { SKILL_PREREQUISITES } from '../data/skillDependencies.js'
import { DEFAULT_GOAL_PREFS } from '../hooks/useGoalPreferences.js'

/**
 * Look up a skill's domain and sub-area info from the framework.
 */
function lookupSkill(skillId) {
  for (const domain of framework) {
    for (const sa of domain.subAreas) {
      for (const sg of sa.skillGroups) {
        for (const skill of sg.skills) {
          if (skill.id === skillId) {
            return { skill, domain, subArea: sa, skillGroup: sg }
          }
        }
      }
    }
  }
  return null
}

/**
 * Generate a condition phrase based on domain context.
 */
function generateCondition(domainName, subAreaName) {
  const conditionMap = {
    'Regulation': 'Given a structured activity or routine',
    'Self-Awareness & Insight': 'When presented with a reflective prompt or situation',
    'Executive Function': 'Given a multi-step task or transition',
    'Problem Solving & Judgment': 'When presented with a novel problem or decision',
    'Communication': 'During a communicative exchange or structured opportunity',
    'Social Understanding & Perspective': 'In a social interaction or group setting',
    'Identity & Self-Concept': 'When discussing self or making personal choices',
    'Safety & Survival Skills': 'In a community or safety-relevant situation',
    'Support System Skills': 'When caregiver or environmental support is relevant',
  }
  return conditionMap[domainName] || 'Given an appropriate opportunity'
}

/**
 * Generate an instant goal template for a skill — no AI needed.
 *
 * @param {string} skillId
 * @param {Object} assessments - current assessment data
 * @param {Object} [prefs] - user's goal preferences
 * @returns {Object} goal template
 */
export function generateGoalTemplate(skillId, assessments = {}, prefs = DEFAULT_GOAL_PREFS) {
  const info = lookupSkill(skillId)
  if (!info) return null

  const { skill, domain, subArea, skillGroup } = info
  const currentLevel = assessments[skillId] ?? null
  const targetLevel = isAssessed(currentLevel) ? Math.min(currentLevel + 1, ASSESSMENT_LEVELS.SOLID) : ASSESSMENT_LEVELS.DEVELOPING

  const currentIndicator = getBehavioralIndicator(skillId, currentLevel) || ''
  const targetIndicator = getBehavioralIndicator(skillId, targetLevel) || ''
  const playbook = getTeachingPlaybook(skillId)
  const ceiling = getSkillCeiling(skillId, assessments)

  const condition = generateCondition(domain.name, subArea.name)
  const behavior = `[Client] will ${skill.name.toLowerCase()}`
  const criteria = prefs.masteryCriteria || DEFAULT_GOAL_PREFS.masteryCriteria

  // Build goal text based on preferences
  let goalText
  if (prefs.goalFormat === 'behavior-only' || (!prefs.includeCondition && !prefs.includeCriteria)) {
    goalText = behavior
  } else if (prefs.includeCondition && prefs.includeCriteria) {
    goalText = `${condition}, ${behavior} with ${criteria}`
  } else if (prefs.includeCondition) {
    goalText = `${condition}, ${behavior}`
  } else if (prefs.includeCriteria) {
    goalText = `${behavior} with ${criteria}`
  } else {
    goalText = behavior
  }

  // Check for prerequisite warnings
  const prereqs = SKILL_PREREQUISITES[skillId] || []
  const weakPrereqs = prereqs.filter(pid => {
    const lvl = assessments[pid]
    return !isAssessed(lvl) || lvl < ASSESSMENT_LEVELS.DEVELOPING
  })

  let warning = null
  if (weakPrereqs.length > 0) {
    const weakNames = weakPrereqs.map(pid => {
      const pInfo = lookupSkill(pid)
      return pInfo ? pInfo.skill.name : pid
    })
    warning = `Prerequisite skills may need attention first: ${weakNames.join(', ')}`
  }
  if (ceiling && ceiling.ceiling < targetLevel) {
    warning = `Skill is capped at ${ASSESSMENT_LABELS[ceiling.ceiling]} by prerequisite constraints`
  }

  return {
    skillId,
    skillName: skill.name,
    domainName: domain.name,
    subAreaName: subArea.name,
    currentLevel,
    targetLevel,
    goalText,
    behavior: skill.name.toLowerCase(),
    condition,
    criteria,
    currentIndicator,
    targetIndicator,
    strategies: playbook?.strategies || [],
    context: playbook?.context || '',
    measurement: playbook?.measurement || '',
    warning,
    isPrebuilt: true,
  }
}

/**
 * Generate pre-built templates for multiple skills at once.
 */
export function generateGoalTemplates(skillIds, assessments = {}, prefs = DEFAULT_GOAL_PREFS) {
  return skillIds.map(id => generateGoalTemplate(id, assessments, prefs)).filter(Boolean)
}
