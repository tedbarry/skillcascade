import { framework } from '../../framework.js'
import { SUB_AREA_DEPS } from '../../skillDependencies.js'

/**
 * Auto-generate KB entries for all ~49 sub-areas.
 */
export function generateSubAreaEntries() {
  const entries = []

  for (const domain of framework) {
    for (const sa of domain.subAreas) {
      const skillCount = sa.skillGroups.reduce((sum, sg) => sum + sg.skills.length, 0)
      const groupNames = sa.skillGroups.map(sg => sg.name).join(', ')

      // Cross-domain prerequisites from SUB_AREA_DEPS
      const deps = SUB_AREA_DEPS[sa.id] || []
      const depDescriptions = deps.map(depId => {
        for (const d of framework) {
          const found = d.subAreas.find(s => s.id === depId)
          if (found) return `${found.name} (D${d.domain})`
        }
        return depId
      })

      const bodyParts = [
        `Part of D${domain.domain}: ${domain.name}`,
        '',
        `Skill Groups (${sa.skillGroups.length}): ${groupNames}`,
        '',
        `Total Skills: ${skillCount}`,
      ]

      if (depDescriptions.length > 0) {
        bodyParts.push('', `Cross-Domain Prerequisites: ${depDescriptions.join(', ')}`)
      }

      entries.push({
        id: `subarea-${sa.id}`,
        title: sa.name,
        category: 'domains',
        tags: [sa.name.toLowerCase(), domain.name.toLowerCase(), sa.id, `d${domain.domain}`, 'sub-area'],
        summary: `${sa.name} — part of ${domain.name} (D${domain.domain}). ${skillCount} skills across ${sa.skillGroups.length} groups.`,
        body: bodyParts.join('\n'),
        relatedIds: [`domain-${domain.id}`, ...sa.skillGroups.flatMap(sg => sg.skills.map(s => `skill-${s.id}`)).slice(0, 5)],
        viewLink: 'assess',
        domainId: domain.id,
        subAreaId: sa.id,
        source: 'auto',
      })
    }
  }

  return entries
}
