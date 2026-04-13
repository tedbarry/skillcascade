/**
 * Authorization Report HTML Generator
 * Produces a complete 26-section insurance authorization document.
 *
 * Clinical fixes (Debbie Hoffman feedback, March 2026):
 * 1. Page header with client name + DOB on every page
 * 2. Entity/practice name in title
 * 3. Credentials formatting (clean "BCBA, LBA")
 * 4. Minimum 11pt font size throughout
 * 5. FERB must match behavior function
 * 6. BIP organized by behavior (not grouped sections)
 * 7. Function consistency validation
 * 8. Examples + Non-examples in BIP
 * 9. N/A auto-detection for empty sections
 * 10. Signature block with credentials + title
 * 11. Education type field
 * 12. Progress fields for maladaptive behaviors (reassessments)
 */
import { escapeHTML } from './escapeHTML.js'

// Allow safe formatting tags (<strong>, <em>, <b>, <i>, <br>, <u>) while escaping everything else
function safeHTML(str) {
  if (typeof str !== 'string') return ''
  // First escape everything
  let safe = escapeHTML(str)
  // Then restore safe formatting tags (opening and closing)
  safe = safe.replace(/&lt;(\/?)(strong|em|b|i|u|sup|sub)&gt;/gi, '<$1$2>')
  // Restore <br> and <br/>
  safe = safe.replace(/&lt;br\s*\/?&gt;/gi, '<br/>')
  return safe
}
import { BOILERPLATE, SERVICE_LEVELS, DSM5_CRITERIA, VINELAND_INTRO, GOAL_DOMAIN_HEADERS, DEFAULT_AUTH_FIELDS, getFERBForFunction } from '../data/authorizationBoilerplate.js'

// ─── Helper: Clean credentials formatting ────────────────────────
// Remove state abbreviations like "LBA-NY" -> "LBA", "BCBA LBA" -> "BCBA, LBA"
function cleanCredentials(creds) {
  if (!creds) return ''
  let cleaned = creds
  // Remove state abbreviations from LBA (e.g., "LBA-NY", "LBA-NJ", "LBA NY", "LBA NJ")
  cleaned = cleaned.replace(/LBA[-\s]?[A-Z]{2}/g, 'LBA')
  // Remove duplicate LBA entries
  cleaned = cleaned.replace(/\bLBA\b.*?\bLBA\b/g, 'LBA')
  // Ensure comma separation if space-separated
  cleaned = cleaned.replace(/\b(BCBA)\s+(LBA)\b/g, '$1, $2')
  cleaned = cleaned.replace(/\b(LBA)\s+(CBSS)\b/g, '$1, $2')
  cleaned = cleaned.replace(/\b(BCBA)\s+(CBSS)\b/g, '$1, $2')
  // Clean up extra spaces/commas
  cleaned = cleaned.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim()
  return cleaned
}

// ─── Helper: Validate function consistency across BIP behaviors ──
function validateFunctionConsistency(behaviors) {
  const warnings = []
  const functionMap = {} // behavior name -> set of functions used

  for (const b of behaviors) {
    if (!b.name || !b.function) continue
    const key = b.name.toLowerCase().trim()
    if (!functionMap[key]) functionMap[key] = new Set()
    functionMap[key].add(b.function.toLowerCase().trim())
  }

  for (const [name, functions] of Object.entries(functionMap)) {
    if (functions.size > 1) {
      warnings.push(`"${name}" has inconsistent functions: ${[...functions].join(', ')}`)
    }
  }

  return warnings
}

// ─── HTML Building Blocks ────────────────────────────────────────

function section(title, content, sectionNumber) {
  return `
    <div class="report-section" style="margin-bottom:20px;page-break-inside:avoid;">
      ${title ? `<h2 style="font-size:14pt;font-weight:700;color:#1C1917;border-bottom:2px solid #D6D3D1;padding-bottom:6px;margin:20px 0 10px 0;">${sectionNumber ? `${sectionNumber}. ` : ''}${escapeHTML(title)}</h2>` : ''}
      ${content}
    </div>`
}

function subsection(title, content) {
  return `<h3 style="font-size:12pt;font-weight:600;color:#44403C;margin:12px 0 6px 0;">${escapeHTML(title)}</h3>${content}`
}

function paragraph(text) {
  if (!text) return ''
  // Use safeHTML to allow <strong>, <em>, <br> etc. while escaping dangerous tags
  return `<p style="font-size:11pt;color:#44403C;line-height:1.6;margin:6px 0;">${safeHTML(text)}</p>`
}

// For pre-built HTML where caller already handled escaping (e.g. template literals with escapeHTML)
function rawParagraph(html) {
  if (!html) return ''
  return `<p style="font-size:11pt;color:#44403C;line-height:1.6;margin:6px 0;">${html}</p>`
}

function naText(label) {
  return `<p style="font-size:11pt;color:#78716C;font-style:italic;margin:6px 0;">N/A &mdash; ${escapeHTML(label || 'Not applicable at this time')}</p>`
}

function italicQuote(text) {
  if (!text) return ''
  return `<p style="font-size:11pt;color:#78716C;line-height:1.5;font-style:italic;margin:6px 0;padding:8px 12px;background:#FAFAF9;border-left:3px solid #D6D3D1;border-radius:0 4px 4px 0;">${safeHTML(text)}</p>`
}

function checkboxField(label, checked) {
  const mark = checked ? '&#9746;' : '&#9744;'
  return `<span style="font-size:11pt;margin-right:16px;">${mark} ${escapeHTML(label)}</span>`
}

function severityRow(label, severity) {
  const levels = ['none', 'mild', 'moderate', 'severe']
  const cells = levels.map(l =>
    `<td style="text-align:center;padding:4px 8px;font-size:11pt;${severity === l ? 'font-weight:700;background:#E7E5E4;color:#1C1917;' : 'color:#A8A29E;'}">${severity === l ? '&#9679;' : '&#9675;'} ${l.charAt(0).toUpperCase() + l.slice(1)}</td>`
  ).join('')
  return `<tr><td style="padding:4px 8px;font-size:11pt;font-weight:600;color:#44403C;">${escapeHTML(label)}</td>${cells}</tr>`
}

/**
 * Generate the full authorization report HTML.
 */
export function generateAuthorizationReportHTML(fields = {}, clientName = '', assessments = {}, examinerFields = {}) {
  const name = clientName || 'Client'
  const cleaned = { ...DEFAULT_AUTH_FIELDS, ...fields }
  const oldName = cleaned._generatedForName || ''
  for (const key of Object.keys(cleaned)) {
    if (typeof cleaned[key] === 'string' && cleaned[key].length > 10) {
      cleaned[key] = cleaned[key].replace(/\[Client\]/gi, name)
      if (oldName && oldName !== name && oldName.length > 2) {
        cleaned[key] = cleaned[key].split(oldName).join(name)
      }
    }
  }
  const f = cleaned
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  // FIX 3: Clean credentials
  const rawCredentials = f.examinerCredentials || examinerFields.examinerCredentials || ''
  const displayCredentials = cleanCredentials(rawCredentials)

  // FIX 7: Function consistency validation
  const behaviors = (f.bipBehaviors || []).filter(b => b.name)
  const functionWarnings = validateFunctionConsistency(behaviors)

  const dobDisplay = f.clientDOB || ''
  const entityDisplay = f.entityName || ''

  // FIX 1 + FIX 4: Page header + 11pt minimum font
  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Authorization Report &mdash; ${escapeHTML(name)}</title>
<style>
  body { font-family: 'Georgia', 'Times New Roman', serif; max-width: 8.5in; margin: 0 auto; padding: 0.75in; color: #1C1917; font-size: 11pt; line-height: 1.5; }
  h1 { font-size: 18pt; text-align: center; color: #1C1917; margin-bottom: 4px; }
  h2 { font-size: 14pt; font-weight: 700; color: #1C1917; border-bottom: 2px solid #D6D3D1; padding-bottom: 6px; margin: 20px 0 10px 0; }
  h3 { font-size: 12pt; font-weight: 600; color: #44403C; margin: 12px 0 6px 0; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11pt; }
  th { background: #F5F5F4; color: #44403C; font-size: 11pt; font-weight: 600; text-align: left; padding: 6px 8px; border: 1px solid #E7E5E4; }
  td { font-size: 11pt; padding: 5px 8px; border: 1px solid #E7E5E4; color: #44403C; vertical-align: top; }
  p { font-size: 11pt; }
  .demographics { display: flex; gap: 20px; margin-bottom: 16px; }
  .demo-col { flex: 1; }
  .demo-row { font-size: 11pt; margin: 3px 0; }
  .demo-label { font-weight: 700; color: #44403C; }
  .cpt-table td:first-child { font-weight: 600; }
  .goal-graph { max-width: 100%; max-height: 200px; margin: 8px 0; border: 1px solid #E7E5E4; border-radius: 4px; }
  .sig-block { margin-top: 40px; padding-top: 20px; border-top: 2px solid #D6D3D1; }
  .sig-line { width: 300px; border-bottom: 1px solid #1C1917; margin-bottom: 4px; margin-top: 40px; }
  .placeholder { background: #fff3cd; padding: 8px 12px; border-left: 3px solid #f0ad4e; border-radius: 0 4px 4px 0; font-size: 11pt; color: #856404; margin: 6px 0; }
  .function-warning { background: #fde8e8; padding: 8px 12px; border-left: 3px solid #e53e3e; border-radius: 0 4px 4px 0; font-size: 11pt; color: #9b2c2c; margin: 6px 0; font-weight: 600; }
  .bip-behavior-block { margin: 16px 0; padding: 12px 16px; border: 1px solid #D6D3D1; border-radius: 4px; page-break-inside: avoid; }

  @page {
    margin-top: 1in;
    margin-bottom: 0.75in;
    @top-center {
      content: "Client: ${escapeHTML(name)}  |  DOB: ${escapeHTML(dobDisplay)}";
      font-size: 9pt; color: #78716C; font-family: 'Georgia', serif;
    }
    @bottom-center {
      content: "Page " counter(page) " of " counter(pages);
      font-size: 9pt; color: #78716C; font-family: 'Georgia', serif;
    }
  }

  @media print {
    body { padding: 0.5in; font-size: 11pt; }
    table, th, td { font-size: 11pt; }
    .report-section { page-break-inside: avoid; }
    .no-print { display: none; }
  }
</style></head><body>`

  // FIX 1: Page header banner (visible in HTML view)
  html += `<div style="text-align:center;font-size:9pt;color:#78716C;border-bottom:1px solid #D6D3D1;padding-bottom:4px;margin-bottom:12px;">Client: ${escapeHTML(name)}${dobDisplay ? ` | DOB: ${escapeHTML(dobDisplay)}` : ''}${entityDisplay ? ` | ${escapeHTML(entityDisplay)}` : ''}</div>`

  // ─── Section 1: Header / Demographics ───
  html += `<h1>Authorization Report</h1>`
  // FIX 2: Entity name in title
  if (entityDisplay) {
    html += `<p style="text-align:center;font-size:12pt;font-weight:600;color:#44403C;margin:0 0 4px 0;">${escapeHTML(entityDisplay)}</p>`
  }
  html += `<p style="text-align:center;font-size:11pt;color:#78716C;margin-bottom:16px;">Developmental-Functional Skills Assessment &amp; Treatment Plan</p>`

  html += `<div class="demographics"><div class="demo-col">`
  html += `<div class="demo-row"><span class="demo-label">Client:</span> ${escapeHTML(name)}</div>`
  if (f.clientDOB) html += `<div class="demo-row"><span class="demo-label">Date of Birth:</span> ${escapeHTML(f.clientDOB)}</div>`
  html += `<div class="demo-row"><span class="demo-label">Diagnosis:</span> ${escapeHTML(f.diagnosis)}</div>`
  if (f.diagnosedBy) html += `<div class="demo-row"><span class="demo-label">Diagnosed By:</span> ${escapeHTML(f.diagnosedBy)}</div>`
  if (f.dateOfDiagnosis) html += `<div class="demo-row"><span class="demo-label">Date of Diagnosis:</span> ${escapeHTML(f.dateOfDiagnosis)}</div>`
  if (f.dateFirstABA) html += `<div class="demo-row"><span class="demo-label">Date First Began ABA:</span> ${escapeHTML(f.dateFirstABA)}</div>`
  // FIX 11: Education type
  if (f.educationType) {
    const edTypeLabels = {
      general_education: 'General Education', special_education: 'Special Education',
      inclusion: 'Inclusion', self_contained: 'Self-Contained',
      home_school: 'Home School', private_school: 'Private School',
    }
    html += `<div class="demo-row"><span class="demo-label">Education Type:</span> ${escapeHTML(edTypeLabels[f.educationType] || f.educationType)}</div>`
  }
  html += `</div><div class="demo-col">`
  if (entityDisplay) html += `<div class="demo-row"><span class="demo-label">Entity:</span> ${escapeHTML(entityDisplay)}</div>`
  if (f.examinerName || examinerFields.examinerName) html += `<div class="demo-row"><span class="demo-label">Report Author:</span> ${escapeHTML(f.examinerName || examinerFields.examinerName || '')}</div>`
  // FIX 3: Clean credentials
  if (displayCredentials) html += `<div class="demo-row"><span class="demo-label">Credentials:</span> ${escapeHTML(displayCredentials)}</div>`
  html += `<div class="demo-row"><span class="demo-label">Date of Report:</span> ${date}</div>`
  if (f.reportRangeStart && f.reportRangeEnd) html += `<div class="demo-row"><span class="demo-label">Report Range:</span> ${escapeHTML(f.reportRangeStart)} &mdash; ${escapeHTML(f.reportRangeEnd)}</div>`
  if (f.insuranceCompany) html += `<div class="demo-row"><span class="demo-label">Insurance:</span> ${escapeHTML(f.insuranceCompany)}</div>`
  if (f.memberId) html += `<div class="demo-row"><span class="demo-label">Member ID:</span> ${escapeHTML(f.memberId)}</div>`
  html += `</div></div>`

  // ─── Section 2: Requesting Hours ───
  html += section('Requesting Hours', (() => {
    const activeRows = f.cptHours.filter(row => row.hours > 0)
    if (activeRows.length === 0) return naText('No hours requested')
    let t = `<table class="cpt-table"><tr><th>Hours</th><th>Service Description</th><th>CPT Code</th><th>Setting</th></tr>`
    for (const row of activeRows) {
      t += `<tr><td>${row.hours}</td><td>${escapeHTML(row.label)}</td><td>${escapeHTML(row.code)}</td><td>${escapeHTML(row.setting)}</td></tr>`
    }
    t += `</table>`
    if (f.hoursStatement) {
      t += `<p style="font-size:11pt;color:#44403C;line-height:1.6;margin:10px 0;padding:8px 12px;background:#FBF9F5;border-left:3px solid #059669;border-radius:0 4px 4px 0;font-style:italic;">${safeHTML(f.hoursStatement)}</p>`
    }
    return t
  })())

  // ─── Section 3: Medical Necessity ───
  html += section('Medical Necessity', paragraph(f.medicalNecessityText))

  // ─── Section 4: Location of Services ───
  html += section('Location of Services', paragraph(f.locationText))

  // ─── Section 5: Supervision Protocol ───
  html += section('Supervision Protocol', paragraph(f.supervisionText))

  // ─── Section 6: Biopsychosocial ───
  // FIX 9: N/A auto-detection
  html += section('Biopsychosocial Information', [
    f.familyHistory ? subsection('Family History', paragraph(f.familyHistory)) : subsection('Family History', naText('No family history information provided')),
    f.developmentalHistory ? subsection('Developmental History', paragraph(f.developmentalHistory)) : subsection('Developmental History', naText('No developmental history information provided')),
    f.educationalHistory ? subsection('Educational History', paragraph(f.educationalHistory)) : subsection('Educational History', naText('No educational history information provided')),
    f.clientStrengths ? subsection("Client's Area of Strength", paragraph(f.clientStrengths)) : subsection("Client's Area of Strength", naText('No strengths information provided')),
  ].join(''))

  // ─── Section 7: Current Problem Areas ───
  const problemAreas = [
    { key: 'problemTypeI', label: 'Maladaptive Behavior Type I (includes restrictive repetitive patterns of behavior of activities):', criteria: DSM5_CRITERIA.maladaptiveTypeI },
    { key: 'problemTypeII', label: 'Maladaptive Behavior Type II:', criteria: DSM5_CRITERIA.maladaptiveTypeII },
    { key: 'problemCommunication', label: 'Communication Skills:', criteria: DSM5_CRITERIA.communication },
    { key: 'problemSocial', label: 'Social Skills:', criteria: DSM5_CRITERIA.social },
  ]
  html += section('Current Problem Areas', problemAreas.map(pa => {
    const text = f[pa.key]
    let content = `<p style="font-size:12pt;font-weight:700;color:#1C1917;margin:14px 0 6px 0;">${escapeHTML(pa.label)}</p>`
    if (pa.criteria) {
      content += `<p style="font-size:11pt;color:#78716C;line-height:1.5;font-style:italic;margin:6px 0;padding:8px 12px;background:#FAFAF9;border-left:3px solid #D6D3D1;border-radius:0 4px 4px 0;">${escapeHTML(pa.criteria)}</p>`
    }
    content += `<p style="font-size:11pt;font-weight:700;font-style:italic;color:#44403C;margin:8px 0 4px 0;">As Evidenced By:</p>`
    content += text ? paragraph(text) : naText('No assessment data available for this area at this time')
    return content
  }).join(''))

  // ─── Section 8: Functional Impairment ───
  html += section('Functional Impairment', (() => {
    let t = `<table><tr><th>Domain</th><th style="text-align:center">None</th><th style="text-align:center">Mild</th><th style="text-align:center">Moderate</th><th style="text-align:center">Severe</th></tr>`
    t += severityRow('Communication', f.impairmentCommunication)
    t += severityRow('Socialization Skills', f.impairmentSocialization)
    t += severityRow('Maladaptive Behavior Type I', f.impairmentMaladaptiveI)
    t += severityRow('Maladaptive Behavior Type II', f.impairmentMaladaptiveII)
    t += `</table>`
    return t
  })())

  // ─── Section 9: Observations (initial only) ───
  if (!f.isReauth) {
    html += section('Observations', f.observations ? paragraph(f.observations) : naText('Observations to be completed during initial assessment sessions'))
  }

  // ─── Section 10: Assessment of Current Functioning ───
  html += section('Assessment of Current Functioning', (() => {
    let t = paragraph(VINELAND_INTRO)
    if (f.vinelandNotes) t += paragraph(f.vinelandNotes)
    if (f.vinelandImage) {
      t += `<div style="text-align:center;margin:12px 0;"><img src="${f.vinelandImage}" style="max-width:100%;border:1px solid #E7E5E4;border-radius:4px;" alt="Vineland-3 Score Summary" /></div>`
    } else if (!f.vinelandNotes) {
      t += naText('Vineland-3 scores to be completed')
    }
    return t
  })())

  // ─── Section 11: Barriers to Treatment ───
  html += section('Barriers to Treatment', f.barriers ? paragraph(f.barriers) : naText('No significant barriers to treatment identified at this time'))

  // ─── Section 12: Clinical Interpretation ───
  html += section('Clinical Interpretation / Response to Treatment', [
    subsection('Reason for Referral', f.reasonForReferral ? paragraph(f.reasonForReferral) : naText('Reason for referral to be completed')),
    subsection('Recommended Service Level', (() => {
      const level = SERVICE_LEVELS[f.serviceLevel] || SERVICE_LEVELS.comprehensive
      let t = `<p style="font-size:11pt;color:#78716C;margin:4px 0;"><strong>Focused ABA Treatment:</strong> ${SERVICE_LEVELS.focused.hoursRange}</p>`
      t += `<p style="font-size:11pt;color:#44403C;margin:2px 0 8px 0;">${escapeHTML(SERVICE_LEVELS.focused.description)}</p>`
      t += `<p style="font-size:11pt;color:#78716C;margin:4px 0;"><strong>Comprehensive ABA Treatment:</strong> ${SERVICE_LEVELS.comprehensive.hoursRange}</p>`
      t += `<p style="font-size:11pt;color:#44403C;margin:2px 0 8px 0;">${escapeHTML(SERVICE_LEVELS.comprehensive.description)}</p>`
      t += `<p style="font-size:12pt;font-weight:700;color:#1C1917;margin-top:12px;">${escapeHTML(name)} is recommended to have <u>${level.label}</u> services.</p>`
      return t
    })()),
  ].join(''))

  // ─── Section 13: Progress / Mastered Goals ───
  // Auto-populate from mastered goals if progressGoals is empty
  const progressList = (f.progressGoals && f.progressGoals.length > 0)
    ? f.progressGoals
    : (f.goals || [])
        .filter(g => g.mastered || (g.targetDate || '').trim().toLowerCase() === 'mastered')
        .map(g => ({ domain: g.domain || '', program: g.program || '', objective: g.objective || '', masteredDate: '', id: g.id, skillId: g.skillId }))

  // Build a lookup from program name → goal id for graph matching
  const goalIdByProgram = {}
  for (const g of (f.goals || [])) {
    if (g.program && (g.id || g.skillId)) goalIdByProgram[g.program.toLowerCase().trim()] = g.id || g.skillId
  }

  if (f.isReauth && progressList.length > 0) {
    html += section('Progress / Mastered Goals in the Last 6 Months', (() => {
      let t = `<table><tr><th>Domain</th><th>Program/Behavior</th><th>Objective</th><th>Mastered Date</th><th>Graph</th></tr>`
      for (const g of progressList) {
        // Try direct id first, then match by program name back to goals
        const graphKey = g.id || g.skillId || goalIdByProgram[(g.program || '').toLowerCase().trim()]
        const graphSrc = graphKey && f.goalGraphs && f.goalGraphs[graphKey]
        const graphCell = graphSrc
          ? `<img src="${graphSrc}" style="max-width:180px;max-height:120px;" alt="Progress graph" />`
          : `<span style="color:#78716C;font-style:italic;font-size:10pt;">N/A</span>`
        t += `<tr><td>${escapeHTML(g.domain || '')}</td><td>${escapeHTML(g.program || '')}</td><td>${escapeHTML(g.objective || '')}</td><td>${escapeHTML(g.masteredDate || '')}</td><td style="text-align:center;">${graphCell}</td></tr>`
      }
      t += `</table>`
      return t
    })())
  } else if (f.isReauth) {
    html += section('Progress / Mastered Goals in the Last 6 Months', naText('No goals mastered during this authorization period'))
  }

  // ─── Section 14: BIP ───
  // Columnar BIP table matching Teddy's original report format
  html += section('Behavior Intervention Plan (BIP)', (() => {
    if (behaviors.length === 0) return naText('No target behaviors identified &mdash; BIP to be completed')

    let t = ''

    // Function consistency warnings
    if (functionWarnings.length > 0) {
      for (const w of functionWarnings) {
        t += `<div class="function-warning">WARNING: Function inconsistency detected &mdash; ${escapeHTML(w)}</div>`
      }
    }

    // Intro sentence
    t += `<p style="font-size:11pt;color:#44403C;line-height:1.6;margin:6px 0 12px 0;">Target maladaptive behaviors for the BIP were chosen based on ABC data, BCBA direct observation and the FAST assessment</p>`

    // ── Single columnar table with one column per behavior ──
    const colWidth = Math.floor(70 / behaviors.length)
    const thStyle = `font-size:11pt;padding:6px 10px;border:1px solid #E7E5E4;background:#F5F5F4;color:#44403C;font-weight:600;width:${100 - colWidth * behaviors.length}%;vertical-align:top;`
    const tdStyle = `font-size:11pt;padding:6px 10px;border:1px solid #E7E5E4;color:#44403C;vertical-align:top;`
    const headerStyle = `font-size:11pt;padding:6px 10px;border:1px solid #E7E5E4;background:#F5F5F4;color:#1C1917;font-weight:700;text-align:center;`

    t += `<table style="width:100%;border-collapse:collapse;margin:0 0 16px 0;page-break-inside:avoid;">`

    // Header row with behavior numbers
    t += `<tr><th style="${thStyle}"></th>`
    for (let i = 0; i < behaviors.length; i++) {
      t += `<th style="${headerStyle}">Behavior ${i + 1}</th>`
    }
    t += `</tr>`

    // Helper to render a row across all behaviors
    const multiRow = (label, getValue) => {
      let row = `<tr><td style="${thStyle}">${label}</td>`
      for (const b of behaviors) {
        const val = getValue(b)
        row += `<td style="${tdStyle}">${val || '<span style="color:#A8A29E;font-style:italic;">To be completed</span>'}</td>`
      }
      row += `</tr>`
      return row
    }

    // Target Behavior
    t += multiRow('Target Behavior', b => escapeHTML(b.name ? `Reducing ${b.name}` : ''))

    // Operational Definition
    t += multiRow('Operational Def.', b => escapeHTML(b.opDef))

    // Examples (render as bullet list)
    const formatBullets = (text) => {
      if (!text) return ''
      // Handle arrays (from AI generation) or strings
      const items = Array.isArray(text)
        ? text.map(s => String(s).trim()).filter(Boolean)
        : String(text).split(/[;\n]/).map(s => s.trim()).filter(Boolean)
      return items.map(item => `- ${escapeHTML(item)}`).join('<br/>')
    }
    t += multiRow('Examples', b => formatBullets(b.examples))

    // Non-Examples
    t += multiRow('Non-Examples', b => formatBullets(b.nonExamples))

    // Probable Function
    t += multiRow('Probable Function', b => escapeHTML(b.function))

    // Proactive Strategies
    t += multiRow('Proactive Strategies', b => escapeHTML(b.proactive))

    // FERB
    t += multiRow('FERB', b => {
      const expectedFERB = getFERBForFunction(b.function)
      const ferbDisplay = b.ferb || expectedFERB || ''
      let ferbHTML = escapeHTML(ferbDisplay)
      // Add function-match warning if needed
      if (b.ferb && expectedFERB && b.function) {
        const ferbLower = b.ferb.toLowerCase()
        const funcLower = (b.function || '').toLowerCase()
        let match = false
        if (funcLower.includes('escape') && (ferbLower.includes('break') || ferbLower.includes('terminat'))) match = true
        else if (funcLower.includes('attention') && (ferbLower.includes('attention') || ferbLower.includes('social') || ferbLower.includes('excuse me'))) match = true
        else if (funcLower.includes('tangible') && ferbLower.includes('request')) match = true
        else if ((funcLower.includes('sensory') || funcLower.includes('automatic')) && (ferbLower.includes('sensory') || ferbLower.includes('fidget'))) match = true
        if (!match) ferbHTML += `<br/><span style="font-size:10pt;color:#9b2c2c;font-weight:600;">CLINICAL NOTE: FERB may not match function.</span>`
      }
      return ferbHTML
    })

    // De-escalation
    t += multiRow('De-escalation', b => escapeHTML(b.deescalation))

    // Data Collection
    t += multiRow('Data Collection', b => escapeHTML(b.dataCollection || 'Frequency Count'))

    // Baseline
    t += multiRow('Baseline', b => escapeHTML(b.baseline))

    // Current Level
    t += multiRow('Current Level', b => escapeHTML(b.currentLevel))

    // Progress row (reassessments only)
    if (f.isReauth) {
      t += multiRow('Progress', b => b.progress ? escapeHTML(b.progress) : '')
    }

    t += `</table>`

    // Additional FERB goals from the goals array
    const ferbGoals = (f.goals || []).filter(g => g.domain === 'replacement' || (g.program || '').toLowerCase().includes('ferb'))
    if (ferbGoals.length > 0) {
      t += `<h3 style="font-size:12pt;font-weight:600;color:#44403C;margin:16px 0 6px 0;">Additional Replacement Behavior Goals</h3>`
      for (const g of ferbGoals) {
        const goalText = g.objective || g.goalText || g.program || ''
        if (goalText) {
          t += `<p style="font-size:11pt;color:#44403C;margin:4px 0;"><strong>${escapeHTML(g.program || g.skillName || 'Replacement Behavior')}:</strong> ${escapeHTML(goalText)}</p>`
        }
      }
    }

    // Summary table
    t += `<h3 style="font-size:12pt;font-weight:600;color:#44403C;margin:16px 0 6px 0;">BIP Summary</h3>`
    t += `<table><tr><th>Behavior</th><th>Function</th><th>FERB</th><th>Data Collection</th><th>Baseline</th><th>Current Level</th></tr>`
    for (const b of behaviors) {
      const ferbSummary = b.ferb ? (b.ferb.length > 60 ? b.ferb.substring(0, 57) + '...' : b.ferb) : 'TBD'
      t += `<tr><td>${escapeHTML(b.name)}</td><td>${escapeHTML(b.function || 'TBD')}</td><td>${escapeHTML(ferbSummary)}</td><td>${escapeHTML(b.dataCollection)}</td><td>${escapeHTML(b.baseline || 'TBD')}</td><td>${escapeHTML(b.currentLevel || 'TBD')}</td></tr>`
    }
    t += `</table>`

    return t
  })())

  // ─── Section 15: Techniques ───
  html += section('Techniques', paragraph(f.techniquesText))

  // ─── Section 16: Preference Assessment ───
  html += section('Results of Preference Assessment', (() => {
    if (!f.primaryReinforcers && !f.secondaryReinforcers) return naText('Preference assessment to be completed')
    let t = `<table><tr><th>Category</th><th>Details</th></tr>`
    if (f.primaryReinforcers) t += `<tr><td><strong>Primary Reinforcers</strong></td><td>${escapeHTML(f.primaryReinforcers)}</td></tr>`
    if (f.secondaryReinforcers) t += `<tr><td><strong>Secondary/Paired Reinforcers</strong></td><td>${escapeHTML(f.secondaryReinforcers)}</td></tr>`
    if (f.reinforcementSchedule) t += `<tr><td><strong>Reinforcement Schedule</strong></td><td>${escapeHTML(f.reinforcementSchedule)}</td></tr>`
    t += `</table>`
    return t
  })())

  // ─── Section 17: Goals ───
  {
    if (f.goals.length === 0) {
      html += section('Goals', naText('Treatment goals to be completed or imported from Goal Engine'))
    } else {
      const groups = {}
      for (const g of f.goals) {
        const domain = g.domain || 'Other'
        if (!groups[domain]) groups[domain] = []
        groups[domain].push(g)
      }

      const renderGoalRow = (g) => {
        let baselineText = g.baseline || ''
        if (g.type === 'decrease' && g.baselineValue != null) {
          const bDate = g.baselineDate ? ` ${g.baselineDate}` : ''
          baselineText = `${g.baselineValue} instances per session${bDate}`
        } else if (g.type === 'increase' && !baselineText) {
          const bDate = g.baselineDate ? ` ${g.baselineDate}` : ''
          baselineText = `0%${bDate}`
        }

        let currentText = g.currentLevel || 'New'
        if (g.mastered) currentText = 'Mastered'

        let criteriaText = g.criteria || ''
        if (!criteriaText) {
          if (g.type === 'decrease') {
            const sessCount = g.criteriaSessionCount || 14
            criteriaText = `${g.criteriaValue != null ? g.criteriaValue : 0} instance(s) per session over ${sessCount} sessions`
          } else if (g.type === 'increase') {
            const consec = g.criteriaConsecutive || 3
            criteriaText = `80% accuracy across ${consec} consecutive sessions`
          }
        }

        const graphKey = g.id || g.skillId
        const graphHTML = graphKey && f.goalGraphs && f.goalGraphs[graphKey]
          ? `<img src="${f.goalGraphs[graphKey]}" class="goal-graph" style="max-width:180px;max-height:120px;" alt="Goal progress graph" />`
          : `<span style="color:#78716C;font-style:italic;font-size:10pt;">N/A</span>`

        return `<tr><td><strong>${escapeHTML(g.program || g.skillName || '')}</strong></td>`
          + `<td>${escapeHTML(g.objective || g.goalText || '')}</td>`
          + `<td>${escapeHTML(baselineText)}</td>`
          + `<td>${escapeHTML(currentText)}</td>`
          + `<td>${escapeHTML(criteriaText)}</td>`
          + `<td>${escapeHTML(g.targetDate || '')}</td>`
          + `<td style="text-align:center;">${graphHTML}</td></tr>`
      }

      const domainOrder = ['maladaptive', 'replacement', 'communication', 'socialization', 'socialGroup', 'parent', 'Other']
      const renderedDomains = domainOrder.filter(d => groups[d] && groups[d].length > 0)
      for (const d of Object.keys(groups)) {
        if (!renderedDomains.includes(d)) renderedDomains.push(d)
      }

      for (const domain of renderedDomains) {
        const goals = groups[domain]
        if (!goals || goals.length === 0) continue
        const header = GOAL_DOMAIN_HEADERS[domain] || domain

        if (domain === 'parent') {
          html += section('Parent Training Goals', (() => {
            let t = `<table><tr><th>Program/Behavior</th><th>Objective</th><th>Baseline (Date)</th><th>Current Level (Date)</th><th>Criteria for Mastery</th><th>Target date for Mastery</th><th>Graphs</th></tr>`
            for (const g of goals) t += renderGoalRow(g)
            t += `</table>`
            return t
          })())
        } else if (domain === 'replacement') {
          html += section('Replacement Behaviors (FERBs)', (() => {
            const commFERBs = goals.filter(g => {
              const n = (g.program || g.skillName || g.objective || '').toLowerCase()
              return n.includes('communicat') || n.includes('request') || n.includes('mand') || n.includes('express') || n.includes('functional communication') || n.includes('fct')
            })
            const socialFERBs = goals.filter(g => !commFERBs.includes(g))

            let t = ''
            if (commFERBs.length > 0) {
              t += `<h3 style="font-size:11pt;font-weight:600;color:#3B82F6;margin:12px 0 6px 0;">Communication Replacement Behaviors</h3>`
              t += `<table><tr><th>Program/Behavior</th><th>Objective</th><th>Baseline (Date)</th><th>Current Level (Date)</th><th>Criteria for Mastery</th><th>Target date for Mastery</th><th>Graphs</th></tr>`
              for (const g of commFERBs) t += renderGoalRow(g)
              t += `</table>`
            }
            if (socialFERBs.length > 0) {
              t += `<h3 style="font-size:11pt;font-weight:600;color:#10B981;margin:12px 0 6px 0;">Social Replacement Behaviors</h3>`
              t += `<table><tr><th>Program/Behavior</th><th>Objective</th><th>Baseline (Date)</th><th>Current Level (Date)</th><th>Criteria for Mastery</th><th>Target date for Mastery</th><th>Graphs</th></tr>`
              for (const g of socialFERBs) t += renderGoalRow(g)
              t += `</table>`
            }
            if (t === '') {
              t = `<table><tr><th>Program/Behavior</th><th>Objective</th><th>Baseline (Date)</th><th>Current Level (Date)</th><th>Criteria for Mastery</th><th>Target date for Mastery</th><th>Graphs</th></tr>`
              for (const g of goals) t += renderGoalRow(g)
              t += `</table>`
            }
            return t
          })())
        } else {
          html += section(header, (() => {
            let t = `<table><tr><th>Program/Behavior</th><th>Objective</th><th>Baseline (Date)</th><th>Current Level (Date)</th><th>Criteria for Mastery</th><th>Target date for Mastery</th><th>Graphs</th></tr>`
            for (const g of goals) t += renderGoalRow(g)
            t += `</table>`
            return t
          })())
        }
      }
    }
  }

  // ─── Section 18: Parent Involvement ───
  html += section('Parent Involvement', (() => {
    let t = paragraph(f.parentInvolvementText)
    if (f.parentProficiency) t += rawParagraph(`<strong>Current Parent Proficiency:</strong> ${escapeHTML(f.parentProficiency)}`)
    if (f.parentMonthlyHours) t += rawParagraph(`<strong>Monthly Parent Training Hours:</strong> ${escapeHTML(f.parentMonthlyHours)}`)
    if (f.parentGoals.length > 0) {
      t += subsection('Parent Goals', (() => {
        let gt = `<table><tr><th>Goal</th><th>Baseline</th><th>Current Level</th><th>Criteria</th></tr>`
        for (const g of f.parentGoals) {
          gt += `<tr><td>${escapeHTML(g.goal || '')}</td><td>${escapeHTML(g.baseline || '')}</td><td>${escapeHTML(g.currentLevel || '')}</td><td>${escapeHTML(g.criteria || '')}</td></tr>`
        }
        gt += `</table>`
        return gt
      })())
    }
    return t
  })())

  // ─── Section 19: Coordination of Care ───
  html += section('Coordination of Care with Other Providers', (() => {
    let t = paragraph(f.coordinationText)
    t += `<div style="margin:8px 0;">`
    t += checkboxField('PCP notified of ABA services', f.coordinationPCP)
    t += checkboxField('Communication established with PCP', f.coordinationPCPCommunication)
    t += checkboxField('Other BH provider coordination', f.coordinationBH)
    t += checkboxField('Consent for release of information obtained', f.coordinationConsent)
    t += `</div>`
    return t
  })())

  // ─── Section 20: Transition Plan ───
  html += section('Transition Plan', (() => {
    let t = paragraph(f.transitionIntroText || BOILERPLATE.transitionPlanIntro)
    t += subsection('Transition Process', paragraph(BOILERPLATE.transitionProcess))

    if (f.transitionBehavior || f.transitionCommunication || f.transitionSocialization) {
      if (f.transitionBehavior) t += rawParagraph(`<strong>Behavior:</strong> ${escapeHTML(f.transitionBehavior)}`)
      if (f.transitionCommunication) t += rawParagraph(`<strong>Communication:</strong> ${escapeHTML(f.transitionCommunication)}`)
      if (f.transitionSocialization) t += rawParagraph(`<strong>Socialization:</strong> ${escapeHTML(f.transitionSocialization)}`)
    } else {
      t += naText('Domain-specific transition criteria to be completed or auto-generated')
    }

    t += paragraph(BOILERPLATE.transitionPostCriteria)
    return t
  })())

  // ─── Section 21: Maintenance Plan ───
  html += section('Maintenance Plan', paragraph(f.maintenanceText))

  // ─── Section 22: Discharge Criteria ───
  html += section('Discharge Criteria', paragraph(f.dischargeText))

  // ─── Section 23: Crisis Plan ───
  html += section('Crisis Plan', paragraph(f.crisisText))

  // ─── Section 24: Risk Assessment ───
  html += section('Risk Assessment', (() => {
    let t = paragraph(f.riskAssessmentText)
    const suicideOptions = ['not_present', 'ideation', 'plan', 'means', 'prior_attempt']
    const homicideOptions = ['not_present', 'ideation', 'plan', 'means', 'prior_attempt']
    t += `<div style="margin:10px 0;">`
    t += `<p style="font-size:11pt;font-weight:600;color:#44403C;margin:4px 0;">Suicidality:</p>`
    t += suicideOptions.map(o => checkboxField(o.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()), f.suicidality === o)).join('')
    t += `</div><div style="margin:10px 0;">`
    t += `<p style="font-size:11pt;font-weight:600;color:#44403C;margin:4px 0;">Homicidality:</p>`
    t += homicideOptions.map(o => checkboxField(o.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()), f.homicidality === o)).join('')
    t += `</div>`
    return t
  })())

  // ─── Section 25: Parent Review ───
  html += `<div style="margin:12px 0;">`
  html += checkboxField('Parent/Caregiver has reviewed and participated in the development of this treatment plan', f.parentReviewed)
  html += `</div>`

  // ─── Section 26: Signature Block ───
  // FIX 10: Proper signature block
  const sigName = f.examinerName || examinerFields.examinerName || ''
  const sigCredentials = displayCredentials
  html += `<div class="sig-block">`
  html += `<div class="sig-line"></div>`
  html += `<p style="font-size:11pt;margin:4px 0;"><strong>${escapeHTML(sigName || '______________________________')}${sigCredentials ? `, ${escapeHTML(sigCredentials)}` : ''}</strong></p>`
  html += `<p style="font-size:11pt;color:#44403C;margin:2px 0;">${date}</p>`
  html += `<p style="font-size:11pt;color:#44403C;margin:2px 0;">Licensed Behavior Analyst</p>`
  if (f.npiNumber) html += `<p style="font-size:11pt;color:#44403C;margin:2px 0;">NPI: ${escapeHTML(f.npiNumber)}</p>`
  html += `</div>`

  html += `</body></html>`
  return html
}
