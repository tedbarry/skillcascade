import goalHierarchy from '../data/goalHierarchy.json'

export function buildGoalHierarchyText(hierarchy = goalHierarchy) {
  return (hierarchy || [])
    .map((domain) => {
      const ltgLines = (domain.ltgs || [])
        .map((ltg) => {
          const stgLines = (ltg.stgs || [])
            .map((stg) => `    STG: ${stg}`)
            .join('\n')

          return `  LTG: ${ltg.name}${stgLines ? `\n${stgLines}` : ''}`
        })
        .join('\n')

      return `\nDOMAIN: ${domain.name}${ltgLines ? `\n${ltgLines}` : ''}`
    })
    .join('')
}

export const GOAL_HIERARCHY = goalHierarchy
export const GOAL_HIERARCHY_TEXT = buildGoalHierarchyText(goalHierarchy)
