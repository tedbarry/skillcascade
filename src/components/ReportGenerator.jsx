import { useState, useMemo } from 'react'
import { framework, ASSESSMENT_LEVELS, ASSESSMENT_LABELS, getDomainScores, DOMAIN_DEPENDENCIES, isAssessed } from '../data/framework.js'
import { downloadFile } from '../data/exportUtils.js'
import { computeDomainHealth, computeImpactRanking, detectCascadeRisks } from '../data/cascadeModel.js'
import { computeConstrainedSkills, computeSkillInfluence } from '../data/skillInfluence.js'
import { generateClinicalSummary } from '../lib/narratives.js'
import { generateDomainBarChart, generateRadarChart, generateMasteryGrid, generateScoreSummaryProfile } from '../lib/reportCharts.js'
import { getBehavioralIndicator } from '../data/behavioralIndicators.js'

const REPORT_TYPES = {
  SCHOOL: 'school',
  MEDICAL: 'medical',
  PROGRESS: 'progress',
  INSURANCE: 'insurance',
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
  [REPORT_TYPES.INSURANCE]: {
    label: 'Clinical Assessment',
    description: 'Formal assessment report for insurance documentation — domain profiles, adaptive levels, cascade analysis, visualizations, and BCBA signature block.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
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
          const level = assessments[skill.id]
          if (isAssessed(level)) {
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
function generateReportHTML(type, clientName, assessments, analysis, snapshotComparison, branding, clinicalFields) {
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
    .indicator { font-size: 10px; color: #5f3e2a; padding: 3px 0 3px 10px; border-left: 2px solid; margin: 2px 0; line-height: 1.5; }
    .indicator-nw { border-left-color: #e8928a; }
    .indicator-np { border-left-color: #c47070; }
    ul { padding-left: 20px; }
    li { margin-bottom: 4px; }
    .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e8d5c0; font-size: 10px; color: #c49a6c; display: flex; justify-content: space-between; }
    .confidential { font-size: 10px; color: #d44d3f; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
    .demographics-table { border: none; margin: 8px 0 16px; }
    .demographics-table td { border: none; padding: 4px 0; font-size: 12px; line-height: 1.8; }
    .composite-score { text-align: center; margin: 16px 0; padding: 20px; background: #fdf8f0; border-radius: 8px; }
    .composite-number { font-size: 36px; font-weight: 700; color: #3d2a1c; }
    .composite-label { font-size: 11px; color: #7d5235; margin: 2px 0 8px; text-transform: uppercase; letter-spacing: 1px; }
    .composite-badge { display: inline-block; padding: 4px 16px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .chart-container { margin: 12px 0 20px; }
    .chart-container svg { max-width: 100%; height: auto; }
    .score-profile-grid { display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: start; }
    @media (max-width: 700px) { .score-profile-grid { grid-template-columns: 1fr; } }
    .signature-block { margin-top: 40px; padding-top: 24px; }
    .sig-line { width: 280px; border-top: 1px solid #3d2a1c; margin-bottom: 8px; }
    .signature-block p { margin: 2px 0; font-size: 12px; color: #3d2a1c; }
    @media print {
      body { padding: 0; }
      h2 { page-break-before: auto; }
      table, .chart-container, .composite-score, .signature-block { page-break-inside: avoid; }
    }
  `

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${orgName} Report - ${clientName}</title><style>${styles}</style></head><body>`
  html += `<div class="confidential">${reportHeader}</div>`

  if (type === REPORT_TYPES.SCHOOL) {
    html += generateSchoolReport(clientName, date, analysis, assessments)
  } else if (type === REPORT_TYPES.MEDICAL) {
    html += generateMedicalReport(clientName, date, analysis, assessments)
  } else if (type === REPORT_TYPES.INSURANCE) {
    html += generateInsuranceReport(clientName, date, analysis, assessments, clinicalFields)
  } else {
    html += generateProgressReport(clientName, date, analysis, snapshotComparison, assessments)
  }

  html += `<div class="footer"><span>${reportFooter} — ${clientName}</span><span>${date}${showPoweredBy ? ' • Powered by SkillCascade' : ''}</span></div>`
  html += `</body></html>`
  return html
}

function generateSchoolReport(clientName, date, analysis, assessments) {
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
      // Skill-level behavioral indicators for concerning skills
      for (const sg of sa.skillGroups) {
        for (const skill of sg.skills) {
          const level = assessments[skill.id]
          if (level !== 0 && level !== 1) continue
          const indicator = getBehavioralIndicator(skill.id, level)
          if (!indicator) continue
          const cls = level === 0 ? 'indicator-np' : 'indicator-nw'
          html += `<div class="indicator ${cls}"><strong>${skill.name}</strong> (${ASSESSMENT_LABELS[level]}): ${indicator}</div>`
        }
      }
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

function generateMedicalReport(clientName, date, analysis, assessments) {
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
    for (const sa of weakSubAreas) {
      html += `<p><strong>${sa.name}</strong> (${sa.domain.name}) — mean ${sa.avg.toFixed(2)}/3.00, ${sa.needsWorkCount} skill(s) at deficit level</p>`
      for (const sg of sa.skillGroups) {
        for (const skill of sg.skills) {
          const level = assessments[skill.id]
          if (level !== 0 && level !== 1) continue
          const indicator = getBehavioralIndicator(skill.id, level)
          if (!indicator) continue
          const cls = level === 0 ? 'indicator-np' : 'indicator-nw'
          html += `<div class="indicator ${cls}"><strong>${skill.name}</strong> (${ASSESSMENT_LABELS[level]}): ${indicator}</div>`
        }
      }
    }
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

function generateProgressReport(clientName, date, analysis, snapshotComparison, assessments) {
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
    for (const sa of weakSubAreas.slice(0, 6)) {
      html += `<p><strong>${sa.name}</strong> (${sa.domain.name}) — ${sa.avg.toFixed(1)}/3</p>`
      for (const sg of sa.skillGroups) {
        for (const skill of sg.skills) {
          const level = assessments[skill.id]
          if (level !== 0 && level !== 1) continue
          const indicator = getBehavioralIndicator(skill.id, level)
          if (!indicator) continue
          const cls = level === 0 ? 'indicator-np' : 'indicator-nw'
          html += `<div class="indicator ${cls}"><strong>${skill.name}</strong> (${ASSESSMENT_LABELS[level]}): ${indicator}</div>`
        }
      }
    }
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

/* ─────────────────────────────────────────────
   Adaptive Level Mapping (Vineland-style)
   ───────────────────────────────────────────── */

function getAdaptiveLevel(score) {
  if (score >= 2.5) return { label: 'High', cssClass: 'badge-high', color: '#31543d', bg: '#dce8de' }
  if (score >= 1.5) return { label: 'Adequate', cssClass: 'badge-adequate', color: '#78350f', bg: '#fefce8' }
  if (score >= 1.0) return { label: 'Moderately Low', cssClass: 'badge-modlow', color: '#92400e', bg: '#fef3c7' }
  return { label: 'Low', cssClass: 'badge-low', color: '#b63a2e', bg: '#fce0dd' }
}

function generateInsuranceReport(clientName, date, analysis, assessments, clinicalFields) {
  const { scores, totalSkills, assessed, needsWork, developing, solid, weakSubAreas, strongSubAreas, cascadeIssues } = analysis
  const {
    examinerName = '', examinerCredentials = '', examinerLicense = '',
    clientDOB = '', diagnosis = '', referralSource = '',
    showDomainBarChart = true, showRadarChart = true, showMasteryGrid = true,
  } = clinicalFields || {}

  // Compute cascade data
  const domainHealth = computeDomainHealth(assessments)
  const impactRanking = computeImpactRanking(assessments)
  const risks = detectCascadeRisks(assessments)

  // Composite score (weighted mean of domain averages)
  let totalWeighted = 0, totalWeight = 0
  for (const s of scores) {
    if (s.assessed > 0) {
      totalWeighted += s.score * s.assessed
      totalWeight += s.assessed
    }
  }
  const compositeScore = totalWeight > 0 ? totalWeighted / totalWeight : 0
  const compositeLevel = getAdaptiveLevel(compositeScore)

  let html = ''

  // ── Section 1: Header & Demographics ──
  html += `<h1>Clinical Assessment Report</h1>`
  html += `<p class="subtitle">Developmental-Functional Skills Assessment</p>`

  html += `<table class="demographics-table"><tr>`
  html += `<td style="width:50%;vertical-align:top;padding-right:20px;">`
  html += `<strong>Client:</strong> ${clientName}<br>`
  if (clientDOB) html += `<strong>Date of Birth:</strong> ${clientDOB}<br>`
  if (diagnosis) html += `<strong>Diagnosis:</strong> ${diagnosis}<br>`
  if (referralSource) html += `<strong>Referral Source:</strong> ${referralSource}<br>`
  html += `</td><td style="width:50%;vertical-align:top;">`
  if (examinerName) html += `<strong>Examiner:</strong> ${examinerName}<br>`
  if (examinerCredentials) html += `<strong>Credentials:</strong> ${examinerCredentials}<br>`
  if (examinerLicense) html += `<strong>License #:</strong> ${examinerLicense}<br>`
  html += `<strong>Assessment Date:</strong> ${date}<br>`
  html += `</td></tr></table>`

  html += `<div class="callout" style="margin-top:12px;"><strong>Note:</strong> This report uses a criterion-referenced 0–3 rating scale (Not Assessed = 0, Needs Work = 1, Developing = 2, Solid = 3). Scores reflect mastery of discrete functional skills and are not norm-referenced standard scores. Adaptive levels are derived from domain mean scores.</div>`

  // ── Section 2: Composite Summary ──
  html += `<h2>Composite Summary</h2>`
  html += `<div class="composite-score">`
  html += `<div class="composite-number">${compositeScore.toFixed(2)}</div>`
  html += `<div class="composite-label">Composite Score</div>`
  html += `<div class="composite-badge" style="background:${compositeLevel.bg};color:${compositeLevel.color}">${compositeLevel.label}</div>`
  html += `</div>`

  html += `<table><tr><th>Metric</th><th style="text-align:center">Value</th></tr>`
  html += `<tr><td>Total Skills in Framework</td><td style="text-align:center">${totalSkills}</td></tr>`
  html += `<tr><td>Skills Assessed</td><td style="text-align:center">${assessed} (${totalSkills > 0 ? Math.round((assessed / totalSkills) * 100) : 0}%)</td></tr>`
  html += `<tr><td>Solid (Score = 3)</td><td style="text-align:center">${solid} (${assessed > 0 ? Math.round((solid / assessed) * 100) : 0}%)</td></tr>`
  html += `<tr><td>Developing (Score = 2)</td><td style="text-align:center">${developing} (${assessed > 0 ? Math.round((developing / assessed) * 100) : 0}%)</td></tr>`
  html += `<tr><td>Needs Work (Score = 1)</td><td style="text-align:center">${needsWork} (${assessed > 0 ? Math.round((needsWork / assessed) * 100) : 0}%)</td></tr>`
  html += `</table>`

  // ── Section 2B: Score Summary Profile (Vineland-style) ──
  {
    // Compute sub-area scores for the profile
    const saScores = []
    for (const domain of framework) {
      for (const sa of domain.subAreas) {
        let saTotal = 0, saCount = 0
        for (const sg of sa.skillGroups) {
          for (const skill of sg.skills) {
            const lv = assessments[skill.id]
            if (isAssessed(lv)) { saCount++; saTotal += lv }
          }
        }
        saScores.push({ name: sa.name, domainName: domain.name, score: saCount > 0 ? saTotal / saCount : 0, assessed: saCount })
      }
    }
    const profile = generateScoreSummaryProfile(scores, saScores, compositeScore)
    html += `<h2>Score Summary Profile</h2>`
    html += `<div class="score-profile-grid">`
    html += `<div class="chart-container">${profile.domainPanel}</div>`
    html += `<div class="chart-container">${profile.subAreaPanel}</div>`
    html += `</div>`
  }

  // ── Section 3: Domain Bar Chart ──
  if (showDomainBarChart && scores.length > 0) {
    html += `<h2>Domain Score Profile (Bar)</h2>`
    html += `<div class="chart-container">${generateDomainBarChart(scores)}</div>`
  }

  // ── Section 4: Radar Profile ──
  if (showRadarChart && scores.length > 0) {
    html += `<h2>Developmental Profile</h2>`
    html += `<div class="chart-container" style="text-align:center">${generateRadarChart(scores)}</div>`
  }

  // ── Section 5: Per-Domain Analysis ──
  html += `<h2>Domain Analysis</h2>`
  for (const s of scores) {
    const clinical = CLINICAL_FRAMING[s.domainId]
    const level = s.assessed > 0 ? getAdaptiveLevel(s.score) : null
    const masteryPct = s.assessed > 0 && s.total > 0 ? Math.round((s.assessed / s.total) * 100) : 0

    html += `<h3>${s.domain} — ${clinical}</h3>`
    html += `<p>Mean Score: <strong>${s.assessed > 0 ? s.score.toFixed(2) : '—'}</strong>/3.00`
    if (level) html += ` &nbsp;<span class="badge" style="background:${level.bg};color:${level.color}">${level.label}</span>`
    html += `<br>Assessment Coverage: ${s.assessed}/${s.total} skills (${masteryPct}%)</p>`

    // Sub-area detail table
    const domain = framework.find(d => d.id === s.domainId)
    if (domain) {
      html += `<table><tr><th>Sub-Area</th><th style="text-align:center">Assessed</th><th style="text-align:center">Mean</th><th>Level</th></tr>`
      for (const sa of domain.subAreas) {
        let saTotal = 0, saCount = 0
        for (const sg of sa.skillGroups) {
          for (const skill of sg.skills) {
            const lv = assessments[skill.id]
            if (isAssessed(lv)) { saCount++; saTotal += lv }
          }
        }
        const saSkillCount = sa.skillGroups.reduce((sum, sg) => sum + sg.skills.length, 0)
        const saAvg = saCount > 0 ? saTotal / saCount : 0
        const saLevel = saCount > 0 ? getAdaptiveLevel(saAvg) : null
        html += `<tr><td>${sa.name}</td><td style="text-align:center">${saCount}/${saSkillCount}</td><td style="text-align:center">${saCount > 0 ? saAvg.toFixed(2) : '—'}</td>`
        html += `<td>${saLevel ? `<span class="badge" style="background:${saLevel.bg};color:${saLevel.color}">${saLevel.label}</span>` : '<span class="badge badge-na">N/A</span>'}</td></tr>`
      }
      html += `</table>`
    }

    // Behavioral indicators for concerning skills in this domain
    if (domain) {
      let hasIndicators = false
      for (const sa of domain.subAreas) {
        for (const sg of sa.skillGroups) {
          for (const skill of sg.skills) {
            const lv = assessments[skill.id]
            if (lv !== 0 && lv !== 1) continue
            const indicator = getBehavioralIndicator(skill.id, lv)
            if (!indicator) continue
            if (!hasIndicators) {
              html += `<p style="font-size:11px;font-weight:600;color:#5f3e2a;margin-top:8px;">Skill-Level Observations:</p>`
              hasIndicators = true
            }
            const cls = lv === 0 ? 'indicator-np' : 'indicator-nw'
            html += `<div class="indicator ${cls}"><strong>${skill.name}</strong> (${ASSESSMENT_LABELS[lv]}): ${indicator}</div>`
          }
        }
      }
    }

    // Cascade note for this domain
    const domainCascades = cascadeIssues.filter(c => c.domainId === s.domainId)
    if (domainCascades.length > 0) {
      html += `<div class="callout callout-alert"><strong>Cascade Note:</strong> `
      for (const c of domainCascades) {
        html += `Performance may be constrained by prerequisite deficits in ${c.prerequisite} (${c.prereqScore.toFixed(2)}/3.00). `
      }
      html += `</div>`
    }
  }

  // ── Section 6: Mastery Grid ──
  if (showMasteryGrid) {
    html += `<h2>Skill Mastery Grid</h2>`
    html += `<p style="font-size:11px;color:#7d5235;">Each cell represents one skill. Color indicates mastery level.</p>`
    html += `<div class="chart-container">${generateMasteryGrid(assessments, framework)}</div>`
  }

  // ── Section 7: Cascade Analysis ──
  html += `<h2>Developmental Cascade Analysis</h2>`
  if (cascadeIssues.length > 0) {
    html += `<div class="callout callout-alert"><strong>Foundation deficits detected.</strong> The following prerequisite weaknesses may be constraining progress in dependent domains:</div>`
    html += `<table><tr><th>Domain</th><th>Constrained By</th><th style="text-align:center">Prereq Score</th><th>Impact</th></tr>`
    for (const issue of cascadeIssues) {
      html += `<tr><td>${issue.domain}</td><td>${issue.prerequisite}</td><td style="text-align:center">${issue.prereqScore.toFixed(2)}/3.00</td><td>Prerequisite weakness may limit skill acquisition in this domain</td></tr>`
    }
    html += `</table>`
  } else {
    html += `<div class="callout callout-good">No significant cascade constraints detected. Prerequisite domains appear adequately developed to support current skill targets.</div>`
  }

  // Top leverage domains
  if (impactRanking.length > 0) {
    html += `<h3>Highest-Leverage Intervention Targets</h3>`
    html += `<table><tr><th>#</th><th>Domain</th><th style="text-align:center">Leverage Score</th><th>Rationale</th></tr>`
    const top3 = impactRanking.slice(0, 3)
    for (let i = 0; i < top3.length; i++) {
      const r = top3[i]
      const domainName = framework.find(d => d.id === r.domainId)?.name || r.domainId
      html += `<tr><td>${i + 1}</td><td>${domainName}</td><td style="text-align:center">${r.leverageScore?.toFixed(2) || '—'}</td><td>Improvements here cascade to ${r.dependentCount || 0} dependent domain(s)</td></tr>`
    }
    html += `</table>`
  }

  // ── Section 7b: Ceiling Analysis ──
  const constrained = computeConstrainedSkills(assessments)
  const influence = computeSkillInfluence(assessments)
  const topCaps = Object.entries(influence)
    .filter(([, inf]) => inf.directDownstream > 0)
    .sort(([, a], [, b]) => b.directDownstream - a.directDownstream)
    .slice(0, 5)

  if (topCaps.length > 0 || constrained.length > 0) {
    html += `<h3>Ceiling Analysis</h3>`
    if (topCaps.length > 0) {
      html += `<p>The following prerequisite skills are currently capping the maximum achievable level of downstream skills:</p>`
      html += `<table><tr><th>Prerequisite Skill</th><th style="text-align:center">Current Level</th><th style="text-align:center">Skills Capped</th></tr>`
      for (const [skillId, inf] of topCaps) {
        let name = skillId
        for (const d of framework) {
          for (const sa of d.subAreas) {
            for (const sg of sa.skillGroups) {
              for (const s of sg.skills) {
                if (s.id === skillId) name = s.name
              }
            }
          }
        }
        const level = assessments[skillId]
        const levelLabel = level != null ? ASSESSMENT_LABELS[level] || String(level) : 'Not Assessed'
        html += `<tr><td>${name}</td><td style="text-align:center">${levelLabel}</td><td style="text-align:center">${inf.directDownstream}</td></tr>`
      }
      html += `</table>`
    }
    if (constrained.length > 0) {
      html += `<div class="callout callout-alert"><strong>${constrained.length} skill${constrained.length !== 1 ? 's' : ''} rated above ceiling.</strong> These skills may be fragile — rated higher than their prerequisite support would predict. Monitor for regression.</div>`
    }
  }

  // ── Section 8: Clinical Narrative ──
  html += `<h2>Clinical Summary</h2>`
  const narrative = generateClinicalSummary(domainHealth, impactRanking, risks, [])
  html += `<p>${narrative.replace(/\n/g, '</p><p>')}</p>`

  // ── Section 9: Recommendations ──
  html += `<h2>Recommendations</h2>`
  html += `<ol>`

  // Top priority goals from weak sub-areas
  const priorityGoals = weakSubAreas.slice(0, 5)
  for (const sa of priorityGoals) {
    const targetLevel = sa.avg < 1.5 ? 'Adequate (1.5+)' : 'High (2.5+)'
    html += `<li><strong>${sa.name}</strong> (${sa.domain.name}) — Current: ${sa.avg.toFixed(2)}/3.00. Target: ${targetLevel}.</li>`
  }

  if (priorityGoals.length === 0) {
    html += `<li>Continue monitoring all domains with periodic re-assessment.</li>`
  }

  // Standard recommendations
  if (cascadeIssues.length > 0) {
    html += `<li>Prioritize foundational domain remediation (Regulation, Self-Awareness, Flexibility) before targeting higher-order skills.</li>`
  }
  html += `<li>Re-assessment recommended in 90 days to monitor progress and adjust treatment goals.</li>`
  html += `<li>Coordinate with caregivers and educational team for generalization across settings.</li>`
  html += `</ol>`

  // ── Section 10: Signature Block ──
  html += `<div class="signature-block">`
  html += `<div class="sig-line"></div>`
  html += `<p><strong>${examinerName || '______________________________'}</strong></p>`
  if (examinerCredentials) html += `<p>${examinerCredentials}</p>`
  if (examinerLicense) html += `<p>License #: ${examinerLicense}</p>`
  html += `<p>Date: ${date}</p>`
  html += `</div>`

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
  const [clinicalFields, setClinicalFields] = useState({
    examinerName: '', examinerCredentials: '', examinerLicense: '',
    clientDOB: '', diagnosis: '', referralSource: '',
    showDomainBarChart: true, showRadarChart: true, showMasteryGrid: true,
  })

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
      const html = generateReportHTML(selectedType, clientName, assessments, analysis, snapshotComparison, branding, clinicalFields)
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
    <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-warm-500 mb-4 bg-warm-100 rounded-lg px-4 py-3">
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

          {/* Clinical fields (Insurance type) */}
          {selectedType === REPORT_TYPES.INSURANCE && (
            <div className="mb-6 bg-white rounded-xl border border-warm-200 p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-warm-700 mb-3">Clinical Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-warm-500 mb-1">Examiner Name</label>
                  <input type="text" value={clinicalFields.examinerName} onChange={e => setClinicalFields(f => ({ ...f, examinerName: e.target.value }))}
                    className="w-full px-3 py-2 min-h-[44px] text-sm rounded-lg border border-warm-200 text-warm-700 focus:outline-none focus:border-sage-400" placeholder="Jane Smith, BCBA" />
                </div>
                <div>
                  <label className="block text-xs text-warm-500 mb-1">Credentials</label>
                  <input type="text" value={clinicalFields.examinerCredentials} onChange={e => setClinicalFields(f => ({ ...f, examinerCredentials: e.target.value }))}
                    className="w-full px-3 py-2 min-h-[44px] text-sm rounded-lg border border-warm-200 text-warm-700 focus:outline-none focus:border-sage-400" placeholder="BCBA, M.S. Applied Behavior Analysis" />
                </div>
                <div>
                  <label className="block text-xs text-warm-500 mb-1">License #</label>
                  <input type="text" value={clinicalFields.examinerLicense} onChange={e => setClinicalFields(f => ({ ...f, examinerLicense: e.target.value }))}
                    className="w-full px-3 py-2 min-h-[44px] text-sm rounded-lg border border-warm-200 text-warm-700 focus:outline-none focus:border-sage-400" placeholder="BACB-1234567" />
                </div>
                <div>
                  <label className="block text-xs text-warm-500 mb-1">Client Date of Birth</label>
                  <input type="date" value={clinicalFields.clientDOB} onChange={e => setClinicalFields(f => ({ ...f, clientDOB: e.target.value }))}
                    className="w-full px-3 py-2 min-h-[44px] text-sm rounded-lg border border-warm-200 text-warm-700 focus:outline-none focus:border-sage-400" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-warm-500 mb-1">Diagnosis</label>
                  <input type="text" value={clinicalFields.diagnosis} onChange={e => setClinicalFields(f => ({ ...f, diagnosis: e.target.value }))}
                    className="w-full px-3 py-2 min-h-[44px] text-sm rounded-lg border border-warm-200 text-warm-700 focus:outline-none focus:border-sage-400" placeholder="F84.0 Autism Spectrum Disorder" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-warm-500 mb-1">Referral Source</label>
                  <input type="text" value={clinicalFields.referralSource} onChange={e => setClinicalFields(f => ({ ...f, referralSource: e.target.value }))}
                    className="w-full px-3 py-2 min-h-[44px] text-sm rounded-lg border border-warm-200 text-warm-700 focus:outline-none focus:border-sage-400" placeholder="Dr. Johnson, Pediatrician" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-warm-100">
                <p className="text-xs text-warm-500 mb-2 font-medium">Visualizations to Include</p>
                <div className="flex flex-wrap gap-4">
                  {[
                    { key: 'showDomainBarChart', label: 'Domain Bar Chart' },
                    { key: 'showRadarChart', label: 'Radar Profile' },
                    { key: 'showMasteryGrid', label: 'Mastery Grid' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-warm-600 cursor-pointer min-h-[44px]">
                      <input type="checkbox" checked={clinicalFields[key]}
                        onChange={e => setClinicalFields(f => ({ ...f, [key]: e.target.checked }))}
                        className="w-4 h-4 rounded border-warm-300 text-sage-500 focus:ring-sage-400" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
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
          <div className="flex flex-wrap items-center gap-3 mb-4">
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
              style={{ height: 'calc(100vh - 200px)', minHeight: '400px', maxHeight: '700px' }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  )
}
