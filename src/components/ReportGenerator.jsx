import { useState, useMemo } from 'react'
import { framework, ASSESSMENT_LEVELS, ASSESSMENT_LABELS, getDomainScores, DOMAIN_DEPENDENCIES } from '../data/framework.js'
import { downloadFile } from '../data/exportUtils.js'

const REPORT_TYPES = {
  SCHOOL: 'school',
  MEDICAL: 'medical',
  PROGRESS: 'progress',
}

const REPORT_META = {
  [REPORT_TYPES.SCHOOL]: {
    label: 'School Report',
    description: 'Educational team summary — focuses on functional skills relevant to classroom success, uses school-friendly language, and includes accommodation suggestions.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
      </svg>
    ),
  },
  [REPORT_TYPES.MEDICAL]: {
    label: 'Medical/Clinical Report',
    description: 'For physicians, developmental pediatricians, or other providers — clinical terminology, structured by developmental domains, includes cascade implications.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
  },
  [REPORT_TYPES.PROGRESS]: {
    label: 'Progress Summary',
    description: 'Snapshot comparison for caregivers and team meetings — highlights growth, areas of concern, and recommended next steps.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
}

// School-relevant domains with classroom context
const SCHOOL_RELEVANT = {
  d1: { relevance: 'high', context: 'Self-regulation in the classroom — ability to manage arousal, stay calm during transitions, and recover from frustration.' },
  d2: { relevance: 'high', context: 'Self-awareness — recognizing emotions, understanding personal strengths/challenges, and self-monitoring during tasks.' },
  d3: { relevance: 'high', context: 'Flexibility — adapting to schedule changes, transitioning between activities, and tolerating unexpected events.' },
  d4: { relevance: 'medium', context: 'Social awareness — reading social cues from peers and teachers, understanding classroom expectations.' },
  d5: { relevance: 'high', context: 'Communication — requesting help, expressing needs, following multi-step directions, and participating in discussions.' },
  d6: { relevance: 'high', context: 'Social interaction — peer relationships, group work participation, conflict resolution, and cooperative play.' },
  d7: { relevance: 'medium', context: 'Executive function — planning, organizing materials, completing multi-step assignments, and managing time.' },
  d8: { relevance: 'low', context: 'Crisis/safety behaviors — relevant for safety planning if applicable.' },
  d9: { relevance: 'low', context: 'Systemic factors — environmental supports that may affect school performance.' },
}

// Medical/clinical framing per domain
const CLINICAL_FRAMING = {
  d1: 'Autonomic regulation and interoceptive processing',
  d2: 'Metacognitive and self-referential processing',
  d3: 'Cognitive flexibility and adaptive responding',
  d4: 'Social cognition and perspective-taking',
  d5: 'Expressive and receptive communication',
  d6: 'Social pragmatics and interpersonal functioning',
  d7: 'Executive functioning and higher-order reasoning',
  d8: 'Threat-response override and crisis-state functioning',
  d9: 'Environmental and systemic factors',
}

/**
 * Analyze assessment data for reporting
 */
function analyzeForReport(assessments) {
  const scores = getDomainScores(assessments)
  const totalSkills = framework.reduce((sum, d) =>
    sum + d.subAreas.reduce((s2, sa) =>
      s2 + sa.skillGroups.reduce((s3, sg) => s3 + sg.skills.length, 0), 0), 0)

  let assessed = 0, needsWork = 0, developing = 0, solid = 0
  const weakSubAreas = []
  const strongSubAreas = []
  const cascadeIssues = []

  for (const domain of framework) {
    for (const sa of domain.subAreas) {
      let saTotal = 0, saCount = 0, saNW = 0
      for (const sg of sa.skillGroups) {
        for (const skill of sg.skills) {
          const level = assessments[skill.id] ?? 0
          if (level > 0) {
            assessed++
            saCount++
            saTotal += level
            if (level === 1) { needsWork++; saNW++ }
            if (level === 2) developing++
            if (level === 3) solid++
          }
        }
      }
      const saAvg = saCount > 0 ? saTotal / saCount : 0
      if (saAvg > 0 && saAvg < 1.8) weakSubAreas.push({ ...sa, domain, avg: saAvg, needsWorkCount: saNW })
      if (saAvg >= 2.5) strongSubAreas.push({ ...sa, domain, avg: saAvg })
    }
  }

  // Cascade analysis: find domains where prerequisites are weak
  for (const domain of framework) {
    const deps = DOMAIN_DEPENDENCIES[domain.id] || []
    if (deps.length === 0) continue
    const domainScore = scores.find(s => s.domainId === domain.id)
    if (!domainScore || domainScore.score < 1.5) continue // skip if this domain is also weak

    for (const depId of deps) {
      const depScore = scores.find(s => s.domainId === depId)
      if (depScore && depScore.score > 0 && depScore.score < 1.8) {
        cascadeIssues.push({
          domain: domain.name,
          domainId: domain.id,
          prerequisite: depScore.domain,
          prereqId: depId,
          prereqScore: depScore.score,
        })
      }
    }
  }

  return { scores, totalSkills, assessed, needsWork, developing, solid, weakSubAreas, strongSubAreas, cascadeIssues }
}

/**
 * Get accommodation suggestions based on weak areas
 */
function getSchoolAccommodations(weakSubAreas) {
  const accommodations = []
  const domainIds = new Set(weakSubAreas.map(sa => sa.domain.id))

  if (domainIds.has('d1')) {
    accommodations.push(
      'Provide a calm-down corner or sensory tools (fidgets, noise-canceling headphones)',
      'Allow movement breaks between activities',
      'Use visual timers to support transitions',
    )
  }
  if (domainIds.has('d2')) {
    accommodations.push(
      'Use feelings check-in charts at the start of activities',
      'Provide self-monitoring checklists for task completion',
    )
  }
  if (domainIds.has('d3')) {
    accommodations.push(
      'Preview schedule changes verbally and visually before they occur',
      'Provide additional transition warnings (5 min, 2 min, 1 min)',
      'Offer choice within structured activities to build flexibility',
    )
  }
  if (domainIds.has('d5')) {
    accommodations.push(
      'Pair verbal directions with visual supports (picture schedules, written steps)',
      'Allow extra processing time before expecting a response',
      'Provide sentence starters or communication supports for participation',
    )
  }
  if (domainIds.has('d6')) {
    accommodations.push(
      'Assign structured peer partner roles during group work',
      'Pre-teach social expectations before unstructured time (recess, lunch)',
      'Use social narratives to preview challenging social situations',
    )
  }
  if (domainIds.has('d7')) {
    accommodations.push(
      'Break multi-step assignments into smaller chunks with check-ins',
      'Provide graphic organizers and task planners',
      'Allow extended time on complex assignments',
    )
  }

  return accommodations
}

/**
 * Generate the HTML report string for download
 */
function generateReportHTML(type, clientName, assessments, analysis, snapshotComparison, branding) {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const { scores, totalSkills, assessed, needsWork, developing, solid, weakSubAreas, strongSubAreas, cascadeIssues } = analysis
  const orgName = branding?.orgName || 'SkillCascade'
  const reportHeader = branding?.reportHeader || 'Confidential — Protected Health Information'
  const reportFooter = branding?.reportFooter || `${orgName} Assessment Report`
  const showPoweredBy = branding?.showPoweredBy !== false

  const styles = `
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #2d2d2d; line-height: 1.5; max-width: 800px; margin: 0 auto; padding: 40px; }
    h1 { font-size: 22px; color: #3d2a1c; margin: 0 0 4px; }
    h2 { font-size: 16px; color: #5f3e2a; border-bottom: 2px solid #e8d5c0; padding-bottom: 6px; margin-top: 28px; }
    h3 { font-size: 14px; color: #7d5235; margin: 16px 0 8px; }
    p, li { font-size: 12px; }
    .subtitle { font-size: 14px; color: #7d5235; margin: 0 0 24px; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .badge-nw { background: #fce0dd; color: #b63a2e; }
    .badge-dev { background: #fef3c7; color: #92400e; }
    .badge-solid { background: #dce8de; color: #31543d; }
    .badge-na { background: #e5e7eb; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { text-align: left; padding: 8px 12px; font-size: 11px; font-weight: 600; color: #5f3e2a; border-bottom: 2px solid #e8d5c0; }
    td { padding: 6px 12px; font-size: 11px; border-bottom: 1px solid #f5ebe0; }
    .bar-wrap { display: flex; align-items: center; gap: 8px; }
    .bar { height: 8px; border-radius: 4px; }
    .bar-bg { flex: 1; background: #f5ebe0; border-radius: 4px; overflow: hidden; }
    .callout { background: #fdf8f0; border-left: 3px solid #c49a6c; padding: 10px 14px; margin: 12px 0; font-size: 12px; }
    .callout-alert { background: #fdf2f1; border-left-color: #d44d3f; }
    .callout-good { background: #f0f5f1; border-left-color: #4f8460; }
    ul { padding-left: 20px; }
    li { margin-bottom: 4px; }
    .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e8d5c0; font-size: 10px; color: #c49a6c; display: flex; justify-content: space-between; }
    .confidential { font-size: 10px; color: #d44d3f; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
    @media print { body { padding: 0; } }
  `

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${orgName} Report - ${clientName}</title><style>${styles}</style></head><body>`
  html += `<div class="confidential">${reportHeader}</div>`

  if (type === REPORT_TYPES.SCHOOL) {
    html += generateSchoolReport(clientName, date, analysis)
  } else if (type === REPORT_TYPES.MEDICAL) {
    html += generateMedicalReport(clientName, date, analysis)
  } else {
    html += generateProgressReport(clientName, date, analysis, snapshotComparison)
  }

  html += `<div class="footer"><span>${reportFooter} — ${clientName}</span><span>${date}${showPoweredBy ? ' • Powered by SkillCascade' : ''}</span></div>`
  html += `</body></html>`
  return html
}

function generateSchoolReport(clientName, date, analysis) {
  const { scores, weakSubAreas, strongSubAreas } = analysis
  const accommodations = getSchoolAccommodations(weakSubAreas)
  let html = ''

  html += `<h1>Educational Support Summary</h1>`
  html += `<p class="subtitle">${clientName} — ${date}</p>`

  html += `<h2>Purpose</h2>`
  html += `<p>This report summarizes ${clientName}'s functional skill profile across developmental domains relevant to classroom performance. It is intended to support the educational team in understanding ${clientName}'s current strengths and areas where additional support may be beneficial.</p>`

  // Domain overview — only school-relevant
  html += `<h2>Functional Skill Overview</h2>`
  html += `<table><tr><th>Area</th><th>Level</th><th>Classroom Relevance</th></tr>`
  for (const s of scores) {
    const rel = SCHOOL_RELEVANT[s.domainId]
    if (!rel || rel.relevance === 'low') continue
    const levelLabel = s.assessed === 0 ? 'Not yet assessed' : s.score >= 2.5 ? 'Solid' : s.score >= 1.5 ? 'Developing' : 'Needs Support'
    const badgeClass = s.score >= 2.5 ? 'badge-solid' : s.score >= 1.5 ? 'badge-dev' : s.score > 0 ? 'badge-nw' : 'badge-na'
    html += `<tr><td><strong>${s.domain}</strong></td><td><span class="badge ${badgeClass}">${levelLabel}</span></td><td>${rel.context}</td></tr>`
  }
  html += `</table>`

  // Strengths
  if (strongSubAreas.length > 0) {
    html += `<h2>Areas of Strength</h2>`
    html += `<div class="callout callout-good">`
    html += `<ul>`
    for (const sa of strongSubAreas.slice(0, 8)) {
      html += `<li><strong>${sa.name}</strong> (${sa.domain.name}) — averaging ${sa.avg.toFixed(1)}/3</li>`
    }
    html += `</ul></div>`
  }

  // Areas needing support
  if (weakSubAreas.length > 0) {
    html += `<h2>Areas for Additional Support</h2>`
    for (const sa of weakSubAreas.slice(0, 6)) {
      html += `<h3>${sa.name} (${sa.domain.name})</h3>`
      html += `<p>Current level: <span class="badge badge-nw">Needs Support</span> — ${sa.needsWorkCount} skill(s) identified as needing focused attention.</p>`
    }
  }

  // Accommodations
  if (accommodations.length > 0) {
    html += `<h2>Suggested Classroom Accommodations</h2>`
    html += `<ul>`
    for (const acc of accommodations) {
      html += `<li>${acc}</li>`
    }
    html += `</ul>`
    html += `<p><em>Note: These suggestions are based on the skill profile and should be discussed with the educational team to determine appropriateness for the individual student.</em></p>`
  }

  html += `<h2>Communication</h2>`
  html += `<p>The assessing clinician welcomes collaboration with the educational team. Please reach out with questions about how to apply these findings in the classroom setting. Ongoing progress monitoring is recommended with periodic re-assessment.</p>`

  return html
}

function generateMedicalReport(clientName, date, analysis) {
  const { scores, totalSkills, assessed, needsWork, developing, solid, weakSubAreas, strongSubAreas, cascadeIssues } = analysis
  let html = ''

  html += `<h1>Developmental-Functional Skills Assessment</h1>`
  html += `<p class="subtitle">${clientName} — ${date}</p>`

  html += `<h2>Assessment Overview</h2>`
  html += `<p>A comprehensive developmental-functional skills assessment was conducted across 9 domains encompassing ${totalSkills} discrete skills. Of these, ${assessed} skills (${totalSkills > 0 ? Math.round((assessed / totalSkills) * 100) : 0}%) have been assessed to date.</p>`

  html += `<table><tr><th>Category</th><th>Count</th><th>Percentage</th></tr>`
  html += `<tr><td>Solid (functional)</td><td>${solid}</td><td>${assessed > 0 ? Math.round((solid / assessed) * 100) : 0}%</td></tr>`
  html += `<tr><td>Developing (emerging)</td><td>${developing}</td><td>${assessed > 0 ? Math.round((developing / assessed) * 100) : 0}%</td></tr>`
  html += `<tr><td>Needs Work (deficit)</td><td>${needsWork}</td><td>${assessed > 0 ? Math.round((needsWork / assessed) * 100) : 0}%</td></tr>`
  html += `</table>`

  // Domain-by-domain clinical summary
  html += `<h2>Domain Analysis</h2>`
  for (const s of scores) {
    const clinical = CLINICAL_FRAMING[s.domainId]
    const levelLabel = s.assessed === 0 ? 'Not yet assessed' : s.score >= 2.5 ? 'Within functional limits' : s.score >= 1.5 ? 'Emerging / partially developed' : 'Significant deficit noted'
    const badgeClass = s.score >= 2.5 ? 'badge-solid' : s.score >= 1.5 ? 'badge-dev' : s.score > 0 ? 'badge-nw' : 'badge-na'

    html += `<h3>${s.domain} — ${clinical}</h3>`
    html += `<p>Status: <span class="badge ${badgeClass}">${levelLabel}</span>`
    if (s.assessed > 0) {
      html += ` (mean score: ${s.score.toFixed(2)}/3.00, ${s.assessed}/${s.total} skills assessed)`
    }
    html += `</p>`
  }

  // Cascade implications
  if (cascadeIssues.length > 0) {
    html += `<h2>Developmental Cascade Implications</h2>`
    html += `<div class="callout callout-alert">`
    html += `<p><strong>Foundation deficits detected that may be constraining higher-order functioning:</strong></p>`
    html += `<ul>`
    for (const issue of cascadeIssues) {
      html += `<li><strong>${issue.domain}</strong> may be limited by prerequisite deficits in <strong>${issue.prerequisite}</strong> (score: ${issue.prereqScore.toFixed(2)}/3.00). Targeting ${issue.prerequisite.toLowerCase()} skills may yield improvements across dependent domains.</li>`
    }
    html += `</ul></div>`
  }

  // Areas of concern
  if (weakSubAreas.length > 0) {
    html += `<h2>Areas of Clinical Concern</h2>`
    html += `<ul>`
    for (const sa of weakSubAreas) {
      html += `<li><strong>${sa.name}</strong> (${sa.domain.name}) — mean ${sa.avg.toFixed(2)}/3.00, ${sa.needsWorkCount} skill(s) at deficit level</li>`
    }
    html += `</ul>`
  }

  // Strengths
  if (strongSubAreas.length > 0) {
    html += `<h2>Functional Strengths</h2>`
    html += `<ul>`
    for (const sa of strongSubAreas.slice(0, 8)) {
      html += `<li><strong>${sa.name}</strong> (${sa.domain.name}) — mean ${sa.avg.toFixed(2)}/3.00</li>`
    }
    html += `</ul>`
  }

  html += `<h2>Clinical Recommendations</h2>`
  html += `<ul>`
  if (cascadeIssues.length > 0) {
    html += `<li>Prioritize foundational domain remediation before targeting higher-order skills</li>`
  }
  if (needsWork > 0) {
    html += `<li>Continued behavioral intervention targeting identified deficits</li>`
  }
  html += `<li>Periodic re-assessment (recommended every 3-6 months) to monitor developmental trajectory</li>`
  html += `<li>Coordination with educational and therapeutic team for consistent intervention across settings</li>`
  html += `</ul>`

  return html
}

function generateProgressReport(clientName, date, analysis, snapshotComparison) {
  const { scores, totalSkills, assessed, needsWork, developing, solid, weakSubAreas, strongSubAreas } = analysis
  let html = ''

  html += `<h1>Progress Summary</h1>`
  html += `<p class="subtitle">${clientName} — ${date}</p>`

  html += `<h2>Current Snapshot</h2>`
  html += `<p>${assessed} of ${totalSkills} skills assessed across 9 developmental domains.</p>`

  // Score distribution
  html += `<table><tr><th>Level</th><th>Count</th><th>Distribution</th></tr>`
  const dist = [
    { label: 'Solid', count: solid, cls: 'badge-solid', color: '#7fb589' },
    { label: 'Developing', count: developing, cls: 'badge-dev', color: '#e5b76a' },
    { label: 'Needs Work', count: needsWork, cls: 'badge-nw', color: '#e8928a' },
  ]
  for (const d of dist) {
    const pct = assessed > 0 ? (d.count / assessed) * 100 : 0
    html += `<tr><td><span class="badge ${d.cls}">${d.label}</span></td><td>${d.count}</td>`
    html += `<td><div class="bar-wrap"><div class="bar-bg"><div class="bar" style="width:${pct}%;background:${d.color}"></div></div><span style="font-size:10px;color:#7d5235">${Math.round(pct)}%</span></div></td></tr>`
  }
  html += `</table>`

  // Domain scores
  html += `<h2>Domain Scores</h2>`
  html += `<table><tr><th>Domain</th><th style="text-align:center">Score</th><th style="text-align:center">Assessed</th><th>Level</th></tr>`
  for (const s of scores) {
    const barColor = s.score >= 2.5 ? '#7fb589' : s.score >= 1.5 ? '#e5b76a' : s.score > 0 ? '#e8928a' : '#d1d5db'
    const badgeClass = s.score >= 2.5 ? 'badge-solid' : s.score >= 1.5 ? 'badge-dev' : s.score > 0 ? 'badge-nw' : 'badge-na'
    const label = s.assessed === 0 ? 'N/A' : s.score >= 2.5 ? 'Solid' : s.score >= 1.5 ? 'Developing' : 'Needs Work'
    html += `<tr><td>${s.domain}</td><td style="text-align:center;font-weight:600">${s.assessed > 0 ? s.score.toFixed(2) : '—'}</td><td style="text-align:center">${s.assessed}/${s.total}</td><td><span class="badge ${badgeClass}">${label}</span></td></tr>`
  }
  html += `</table>`

  // Snapshot comparison
  if (snapshotComparison) {
    const prevScores = getDomainScores(snapshotComparison.assessments)
    html += `<h2>Changes Since "${snapshotComparison.label}"</h2>`
    html += `<table><tr><th>Domain</th><th style="text-align:center">Previous</th><th style="text-align:center">Current</th><th style="text-align:center">Change</th></tr>`
    for (let i = 0; i < scores.length; i++) {
      const curr = scores[i]
      const prev = prevScores[i]
      const diff = curr.score - prev.score
      const arrow = diff > 0.1 ? '<span style="color:#4f8460;font-weight:600">+' + diff.toFixed(2) + '</span>' : diff < -0.1 ? '<span style="color:#d44d3f;font-weight:600">' + diff.toFixed(2) + '</span>' : '<span style="color:#7d5235">—</span>'
      html += `<tr><td>${curr.domain}</td><td style="text-align:center">${prev.assessed > 0 ? prev.score.toFixed(2) : '—'}</td><td style="text-align:center">${curr.assessed > 0 ? curr.score.toFixed(2) : '—'}</td><td style="text-align:center">${arrow}</td></tr>`
    }
    html += `</table>`
  }

  // Key highlights
  if (strongSubAreas.length > 0) {
    html += `<h2>Key Strengths</h2>`
    html += `<div class="callout callout-good"><ul>`
    for (const sa of strongSubAreas.slice(0, 6)) {
      html += `<li><strong>${sa.name}</strong> — ${sa.avg.toFixed(1)}/3</li>`
    }
    html += `</ul></div>`
  }

  if (weakSubAreas.length > 0) {
    html += `<h2>Priority Focus Areas</h2>`
    html += `<div class="callout callout-alert"><ul>`
    for (const sa of weakSubAreas.slice(0, 6)) {
      html += `<li><strong>${sa.name}</strong> (${sa.domain.name}) — ${sa.avg.toFixed(1)}/3</li>`
    }
    html += `</ul></div>`
  }

  html += `<h2>Next Steps</h2>`
  html += `<ul>`
  html += `<li>Continue targeting identified priority areas in treatment sessions</li>`
  html += `<li>Re-assess in 3-6 months to track growth trajectory</li>`
  if (weakSubAreas.some(sa => sa.domain.id === 'd1' || sa.domain.id === 'd2')) {
    html += `<li>Foundation domains (Regulation, Self-Awareness) should remain primary focus — improvements here often unlock gains in higher domains</li>`
  }
  html += `</ul>`

  return html
}

/**
 * ReportGenerator component — full-page view for generating audience-specific reports
 */
export default function ReportGenerator({ assessments, clientName, snapshots, onNavigateToAssess, branding }) {
  const [selectedType, setSelectedType] = useState(null)
  const [compareSnapshotId, setCompareSnapshotId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [previewHTML, setPreviewHTML] = useState(null)

  const analysis = useMemo(() => analyzeForReport(assessments), [assessments])

  const assessedCount = analysis.assessed
  const hasData = assessedCount > 0

  function handleGenerate() {
    if (!selectedType || !hasData) return
    setGenerating(true)

    const snapshotComparison = compareSnapshotId
      ? snapshots.find(s => s.id === compareSnapshotId)
      : null

    // Small timeout so the UI shows the generating state
    setTimeout(() => {
      const html = generateReportHTML(selectedType, clientName, assessments, analysis, snapshotComparison, branding)
      setPreviewHTML(html)
      setGenerating(false)
    }, 300)
  }

  function handleDownload() {
    if (!previewHTML) return
    const safeName = (clientName || 'client').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    const typeLabel = REPORT_META[selectedType]?.label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() || 'report'
    downloadFile(previewHTML, `skillcascade-${safeName}-${typeLabel}.html`, 'text/html;charset=utf-8')
  }

  function handlePrint() {
    if (!previewHTML) return
    const win = window.open('', '_blank')
    win.document.write(previewHTML)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-warm-800 font-display">Report Generator</h2>
        <p className="text-sm text-warm-500 mt-1">
          Generate audience-specific reports from {clientName}'s assessment data.
        </p>
      </div>

      {!hasData && (
        <div className="bg-warm-100 rounded-xl p-6 text-center">
          <p className="text-warm-600 text-sm mb-3">No assessment data available. Complete at least some assessments before generating a report.</p>
          {onNavigateToAssess && (
            <button
              onClick={() => onNavigateToAssess(null)}
              className="text-sm px-4 py-2 bg-sage-500 text-white rounded-lg hover:bg-sage-600 transition-colors"
            >
              Start Assessing
            </button>
          )}
        </div>
      )}

      {hasData && !previewHTML && (
        <>
          {/* Report type selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Object.entries(REPORT_META).map(([key, meta]) => (
              <button
                key={key}
                onClick={() => setSelectedType(key)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  selectedType === key
                    ? 'border-sage-400 bg-sage-50 shadow-sm'
                    : 'border-warm-200 bg-white hover:border-warm-300'
                }`}
              >
                <div className={`mb-2 ${selectedType === key ? 'text-sage-600' : 'text-warm-400'}`}>
                  {meta.icon}
                </div>
                <div className="font-semibold text-warm-800 text-sm mb-1">{meta.label}</div>
                <div className="text-xs text-warm-500 leading-relaxed">{meta.description}</div>
              </button>
            ))}
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-6 text-xs text-warm-500 mb-4 bg-warm-100 rounded-lg px-4 py-3">
            <span><strong className="text-warm-700">{analysis.assessed}</strong> skills assessed</span>
            <span><strong className="text-warm-700 text-sage-600">{analysis.solid}</strong> solid</span>
            <span><strong className="text-warm-700" style={{ color: '#e5b76a' }}>{analysis.developing}</strong> developing</span>
            <span><strong className="text-warm-700 text-coral-500">{analysis.needsWork}</strong> needs work</span>
            {analysis.cascadeIssues.length > 0 && (
              <span className="text-coral-500 font-medium">{analysis.cascadeIssues.length} cascade issue(s)</span>
            )}
          </div>

          {/* Snapshot comparison (for Progress type) */}
          {selectedType === REPORT_TYPES.PROGRESS && snapshots.length > 0 && (
            <div className="flex items-center gap-3 mb-6 bg-white rounded-lg border border-warm-200 px-4 py-3">
              <label className="text-sm text-warm-600 font-medium">Compare with snapshot:</label>
              <select
                value={compareSnapshotId}
                onChange={(e) => setCompareSnapshotId(e.target.value)}
                className="text-sm px-3 py-1.5 rounded-md border border-warm-200 text-warm-700 focus:outline-none focus:border-sage-400"
              >
                <option value="">None (current data only)</option>
                {snapshots.map((snap) => (
                  <option key={snap.id} value={snap.id}>
                    {snap.label || new Date(snap.timestamp).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!selectedType || generating}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              selectedType
                ? 'bg-sage-500 text-white hover:bg-sage-600 shadow-sm'
                : 'bg-warm-200 text-warm-400 cursor-not-allowed'
            }`}
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="42" strokeDashoffset="12" />
                </svg>
                Generating...
              </span>
            ) : (
              'Generate Report'
            )}
          </button>
        </>
      )}

      {/* Preview */}
      {previewHTML && (
        <div>
          {/* Action bar */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-sage-500 text-white rounded-lg text-sm font-medium hover:bg-sage-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download HTML
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-warm-200 text-warm-700 rounded-lg text-sm font-medium hover:bg-warm-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12Zm-2.25 0h.008v.008H16.5V12Z" />
              </svg>
              Print
            </button>
            <button
              onClick={() => { setPreviewHTML(null); setSelectedType(null); setCompareSnapshotId('') }}
              className="px-4 py-2 text-warm-500 hover:text-warm-700 text-sm"
            >
              Back
            </button>
          </div>

          {/* Iframe preview */}
          <div className="bg-white rounded-xl border border-warm-200 shadow-sm overflow-hidden">
            <iframe
              srcDoc={previewHTML}
              title="Report Preview"
              className="w-full border-0"
              style={{ height: '700px' }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  )
}
