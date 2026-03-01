import { framework, ASSESSMENT_LABELS, getDomainScores } from './framework.js'

/**
 * Generate RFC 4180-compliant CSV from assessments
 */
export function generateCSV(assessments, clientName) {
  const rows = [['Domain', 'Sub-Area', 'Skill Group', 'Skill', 'Assessment', 'Score']]

  for (const domain of framework) {
    for (const sa of domain.subAreas) {
      for (const sg of sa.skillGroups) {
        for (const skill of sg.skills) {
          const raw = assessments[skill.id]
          const label = raw != null ? ASSESSMENT_LABELS[raw] : 'Not Assessed'
          const score = raw != null ? String(raw) : ''
          rows.push([
            domain.name,
            sa.name,
            sg.name,
            skill.name,
            label,
            score,
          ])
        }
      }
    }
  }

  return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n')
}

export function csvEscape(value) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

/**
 * Generate JSON export with full assessment data
 */
export function generateJSON(assessments, snapshots, clientName, includeSnapshots) {
  const domainScores = getDomainScores(assessments)

  const data = {
    exportVersion: 1,
    exportDate: new Date().toISOString(),
    clientName,
    domainScores: domainScores.map((d) => ({
      domain: d.domain,
      score: Math.round(d.score * 100) / 100,
      assessed: d.assessed,
      total: d.total,
    })),
    assessments,
  }

  if (includeSnapshots && snapshots.length > 0) {
    data.snapshots = snapshots
  }

  return JSON.stringify(data, null, 2)
}

/**
 * Download a file via Blob + temporary link
 */
export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Build structured data for the print report
 */
export function buildPrintData(assessments, clientName) {
  const domainScores = getDomainScores(assessments)

  const domains = framework.map((domain, i) => {
    const score = domainScores[i]
    const subAreas = domain.subAreas.map((sa) => {
      const skillGroups = sa.skillGroups.map((sg) => {
        const skills = sg.skills.map((skill) => ({
          id: skill.id,
          name: skill.name,
          level: assessments[skill.id] ?? null,
          label: assessments[skill.id] != null ? ASSESSMENT_LABELS[assessments[skill.id]] : 'Not Assessed',
        }))
        return { id: sg.id, name: sg.name, skills }
      })
      return { id: sa.id, name: sa.name, skillGroups }
    })

    return {
      id: domain.id,
      name: domain.name,
      domain: domain.domain,
      coreQuestion: domain.coreQuestion,
      score: score.score,
      assessed: score.assessed,
      total: score.total,
      subAreas,
    }
  })

  return { clientName, domains, domainScores }
}
