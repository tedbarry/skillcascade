import { framework, DOMAIN_DEPENDENCIES } from '../../framework.js'

/**
 * Auto-generate KB entries for the 9 developmental domains.
 */
export function generateDomainEntries() {
  return framework.map(domain => {
    const deps = DOMAIN_DEPENDENCIES[domain.id] || []
    const depNames = deps.map(did => {
      const d = framework.find(f => f.id === did)
      return d ? d.name : did
    })

    const subAreaList = domain.subAreas.map(sa => sa.name).join(', ')
    const skillCount = domain.subAreas.reduce((sum, sa) =>
      sum + sa.skillGroups.reduce((s2, sg) => s2 + sg.skills.length, 0), 0)

    const bodyParts = [
      domain.coreQuestion,
      '',
      `Key Insight: ${domain.keyInsight}`,
      '',
      `Core Capacities: ${domain.coreCapacities.join(', ')}`,
      '',
      `Sub-Areas (${domain.subAreas.length}): ${subAreaList}`,
      '',
      `Total Skills: ${skillCount}`,
    ]

    if (depNames.length > 0) {
      bodyParts.push('', `Prerequisites: Depends on ${depNames.join(', ')}`)
    } else {
      bodyParts.push('', 'Prerequisites: None — this is a foundational domain')
    }

    return {
      id: `domain-${domain.id}`,
      title: `D${domain.domain}: ${domain.name}`,
      category: 'domains',
      tags: [domain.name.toLowerCase(), domain.subtitle.toLowerCase(), domain.id, `domain ${domain.domain}`, 'domain'],
      summary: domain.coreQuestion,
      body: bodyParts.join('\n'),
      relatedIds: domain.subAreas.map(sa => `subarea-${sa.id}`),
      viewLink: 'assess',
      domainId: domain.id,
      source: 'auto',
    }
  })
}
