import { framework } from '../../framework.js'
import { getSkillTier, SKILL_PREREQUISITES, buildReversePrereqMap } from '../../skillDependencies.js'
import { TIER_LABELS } from '../../../constants/tiers.js'

/**
 * Auto-generate KB entries for all 260 skills.
 *
 * IMPORTANT: Full body content (descriptions, playbook, indicators) is NOT
 * included here — it's loaded on-demand by KBEntryView to keep the search
 * index lightweight (~30-40KB instead of ~750KB).
 */
let _reverseMap = null
function getReverseMap() {
  if (!_reverseMap) _reverseMap = buildReversePrereqMap()
  return _reverseMap
}

export function generateSkillEntries() {
  const reverseMap = getReverseMap()
  const entries = []

  for (const domain of framework) {
    for (const sa of domain.subAreas) {
      for (const sg of sa.skillGroups) {
        for (const skill of sg.skills) {
          const tier = getSkillTier(skill.id)
          const prereqIds = SKILL_PREREQUISITES[skill.id] || []
          const dependentIds = reverseMap[skill.id] || []

          const tags = [
            skill.name.toLowerCase(),
            domain.name.toLowerCase(),
            sa.name.toLowerCase(),
            sg.name.toLowerCase(),
            skill.id,
            `d${domain.domain}`,
          ]
          if (tier) tags.push(`tier ${tier}`, TIER_LABELS[tier]?.toLowerCase())

          entries.push({
            id: `skill-${skill.id}`,
            title: skill.name,
            category: 'domains',
            tags,
            summary: `${skill.name} — ${domain.name} > ${sa.name} > ${sg.name}${tier ? ` (Tier ${tier})` : ''}`,
            body: null, // Loaded on-demand by KBEntryView
            relatedIds: [
              `subarea-${sa.id}`,
              ...prereqIds.map(pid => `skill-${pid}`),
              ...dependentIds.slice(0, 3).map(did => `skill-${did}`),
            ],
            viewLink: 'assess',
            skillId: skill.id,
            domainId: domain.id,
            subAreaId: sa.id,
            source: 'auto',
            _meta: {
              domainNumber: domain.domain,
              domainName: domain.name,
              subAreaName: sa.name,
              skillGroupName: sg.name,
              tier,
              prereqCount: prereqIds.length,
              dependentCount: dependentIds.length,
            },
          })
        }
      }
    }
  }

  return entries
}
