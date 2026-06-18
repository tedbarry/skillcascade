import {
  buildApprovalLedger,
  buildCentralReachTreePlan,
  evaluateExternalAction,
} from './productizationJobModel.js'
import {
  buildGoalPlannerReview,
  buildReportGoalRows,
} from './assessmentGoalPlanner.js'
import JSZip from 'jszip'

export const INITIAL_ASSESSMENT_DRAFT_ARTIFACT = 'initial_assessment_draft'
export const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export const REPORT_SECTION_LABELS = {
  demographics: 'Demographics',
  diagnosis: 'Diagnosis',
  family_history: 'Family History',
  developmental_history: 'Developmental History',
  educational_history: 'Educational History',
  behavioral_presentation: 'Behavioral Presentation',
  communication_profile: 'Communication Profile',
  social_profile: 'Social Profile',
  parent_training_needs: 'Parent Training Needs',
  recommended_goals: 'Recommended Goals',
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function xmlEscape(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function sectionLabel(sectionId) {
  return REPORT_SECTION_LABELS[sectionId] || cleanText(sectionId).replace(/_/g, ' ')
}

function docxParagraph(text, { style = '', bold = false } = {}) {
  const styleXml = style ? `<w:pPr><w:pStyle w:val="${xmlEscape(style)}"/></w:pPr>` : ''
  const boldXml = bold ? '<w:rPr><w:b/></w:rPr>' : ''
  return `<w:p>${styleXml}<w:r>${boldXml}<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`
}

function docxBullet(text) {
  return docxParagraph(`- ${text}`)
}

function docxSpacer() {
  return '<w:p/>'
}

function formatDateForCore(value) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return new Date().toISOString()
  return date.toISOString()
}

export function flattenCentralReachTreePlan(treePlan = {}) {
  const root = treePlan.root || buildCentralReachTreePlan([]).root
  const rows = []

  function walk(node, trail = []) {
    for (const child of node.children || []) {
      const nextTrail = [...trail, child.name]
      if (child.type === 'data_collection') {
        rows.push({
          domain: trail[0] || '',
          longTermGoal: trail[1] || '',
          shortTermGoal: trail[2] || '',
          objective: child.name,
          dataType: child.dataType || 'Percentage',
          dataCollectionType: child.dataCollectionType || child.centralReach?.itemType || 'datapercent',
          trialCount: child.trialCount ?? child.centralReach?.trialCount ?? null,
          maxTrials: child.maxTrials ?? child.centralReach?.maxTrials ?? null,
          centralReach: child.centralReach || null,
          sourceRefs: child.sourceRefs || [],
        })
      } else {
        walk(child, nextTrail)
      }
    }
  }

  walk(root)
  return rows
}

export function buildReportSectionChecklist(sourceLedger = {}) {
  const missing = new Set(sourceLedger.missingSections || [])
  const covered = new Set(sourceLedger.coveredSections || [])
  const allSections = [...new Set([
    ...Object.keys(REPORT_SECTION_LABELS),
    ...covered,
    ...missing,
  ])]

  return allSections.map((sectionId) => ({
    id: sectionId,
    label: sectionLabel(sectionId),
    status: missing.has(sectionId)
      ? 'needs_source'
      : covered.has(sectionId)
        ? 'source_ready'
        : 'not_started',
  }))
}

export function buildInitialAssessmentDraftPreview({
  sectionChecklist = [],
  goalRows = [],
  sourceLedger = {},
  approvalLedger = buildApprovalLedger([]),
} = {}) {
  const missingSections = sectionChecklist.filter((section) => section.status === 'needs_source')
  const reportGate = evaluateExternalAction('finalize_report', approvalLedger.gates)
  const centralReachGate = evaluateExternalAction('centralreach_write', approvalLedger.gates)
  const behaviorGoals = goalRows.filter((goal) => goal.domain === 'Behavior')
  const goalPlannerReview = buildGoalPlannerReview(goalRows)

  return [
    'Initial Assessment Draft Packet - Review Only',
    '',
    'Clinical status: Draft only. Finalization, external sharing, and CentralReach writes remain blocked until the required approval gates are complete.',
    '',
    'Source readiness:',
    `- Sources registered: ${sourceLedger.sourceCount || 0}`,
    `- Sources verified: ${sourceLedger.verifiedCount || 0}`,
    `- Missing report sections: ${missingSections.length ? missingSections.map((section) => section.label).join(', ') : 'None'}`,
    '',
    'Report section checklist:',
    ...sectionChecklist.map((section) => `- ${section.label}: ${section.status.replace(/_/g, ' ')}`),
    '',
    'Goal hierarchy summary:',
    `- Total goals staged: ${goalRows.length}`,
    `- Maladaptive behavior goals staged as Frequency: ${behaviorGoals.filter((goal) => goal.dataType === 'Frequency').length}`,
    `- Percentage goals staged with 10-trial data collection: ${goalRows.filter((goal) => goal.dataCollectionType === 'datapercent' && Number(goal.trialCount) === 10).length}`,
    ...goalRows.slice(0, 12).map((goal) => `- ${goal.domain} / ${goal.longTermGoal} / ${goal.shortTermGoal}: ${goal.objective || '[objective needed]'} (${goal.dataType})`),
    goalRows.length > 12 ? `- ${goalRows.length - 12} additional goal(s) omitted from this preview.` : '',
    '',
    'Goal planner review:',
    `- Report table rows needing review: ${goalPlannerReview.incompleteReportRowCount}`,
    `- FERB mappings ready: ${goalPlannerReview.ferbReadyCount}/${goalPlannerReview.ferbMappings.length}`,
    ...goalPlannerReview.warnings.slice(0, 6).map((warning) => `- ${warning}`),
    '',
    'Approval gates:',
    `- ${reportGate.reason}`,
    `- ${centralReachGate.reason}`,
  ].filter((line) => line !== '').join('\n')
}

export function buildInitialAssessmentDraftArtifact(job = {}, {
  generatedAt = new Date().toISOString(),
  generatedBy = null,
} = {}) {
  const sectionChecklist = buildReportSectionChecklist(job.sourceLedger || {})
  const goalRows = job.goalRows?.length ? job.goalRows : flattenCentralReachTreePlan(job.treePlan || {})
  const reportGoalRows = buildReportGoalRows(goalRows)
  const goalPlannerReview = buildGoalPlannerReview(goalRows)
  const approvalLedger = job.approvalLedger || buildApprovalLedger([])
  const missingSections = sectionChecklist.filter((section) => section.status === 'needs_source')
  const reportGate = evaluateExternalAction('finalize_report', approvalLedger.gates)
  const centralReachGate = evaluateExternalAction('centralreach_write', approvalLedger.gates)
  const artifactStatus = missingSections.length === 0 && goalPlannerReview.readiness.readyForGoalApproval
    ? 'ready_for_review'
    : 'draft'

  const metadata = {
    title: 'Initial Assessment Draft Packet',
    review_only: true,
    generated_at: generatedAt,
    generated_by: generatedBy,
    source_summary: {
      source_count: job.sourceLedger?.sourceCount || 0,
      verified_count: job.sourceLedger?.verifiedCount || 0,
      missing_sections: job.sourceLedger?.missingSections || [],
    },
    section_checklist: sectionChecklist,
    goal_summary: {
      domain_count: job.treePlan?.domainCount || 0,
      goal_count: goalRows.length,
      behavior_frequency_goal_count: job.treePlan?.behaviorFrequencyGoalCount || 0,
      warning_count: job.treePlan?.warnings?.length || 0,
    },
    goal_rows: goalRows,
    report_goal_rows: reportGoalRows,
    goal_planner: goalPlannerReview,
    approval_summary: {
      report_finalization: reportGate,
      centralreach_write: centralReachGate,
    },
    preview_text: buildInitialAssessmentDraftPreview({
      sectionChecklist,
      goalRows,
      sourceLedger: job.sourceLedger || {},
      approvalLedger,
    }),
  }

  return {
    artifact_type: INITIAL_ASSESSMENT_DRAFT_ARTIFACT,
    artifact_status: artifactStatus,
    storage_ref: null,
    metadata,
  }
}

function buildDocxDocumentXml(artifact = {}, {
  exportMode = 'review',
  generatedAt = artifact.metadata?.generated_at || new Date().toISOString(),
} = {}) {
  const metadata = artifact.metadata || {}
  const sourceSummary = metadata.source_summary || {}
  const goalSummary = metadata.goal_summary || {}
  const sectionChecklist = metadata.section_checklist || []
  const goalRows = metadata.goal_rows || []
  const reportGoalRows = metadata.report_goal_rows || buildReportGoalRows(goalRows)
  const goalPlanner = metadata.goal_planner || buildGoalPlannerReview(goalRows)
  const approvalSummary = metadata.approval_summary || {}
  const isFinal = exportMode === 'final'

  const lines = [
    docxParagraph(isFinal ? 'Initial Assessment Export Packet' : 'Initial Assessment Draft Packet - Review Only', { style: 'Title' }),
    docxParagraph(isFinal ? 'Status: Final export packet.' : 'Status: Internal review draft only. Do not send externally until clinician finalization is approved.', { bold: true }),
    !isFinal
      ? docxParagraph('Clinical status: Draft only. Finalization, external sharing, and CentralReach writes remain blocked until the required approval gates are complete.')
      : '',
    docxParagraph(`Generated: ${formatDateForCore(generatedAt)}`),
    docxSpacer(),
    docxParagraph('Source Readiness', { style: 'Heading1' }),
    docxBullet(`Sources registered: ${sourceSummary.source_count || 0}`),
    docxBullet(`Sources verified: ${sourceSummary.verified_count || 0}`),
    docxBullet(`Missing report sections: ${(sourceSummary.missing_sections || []).length ? sourceSummary.missing_sections.map(sectionLabel).join(', ') : 'None'}`),
    docxSpacer(),
    docxParagraph('Report Section Checklist', { style: 'Heading1' }),
    ...sectionChecklist.map((section) => docxBullet(`${section.label}: ${cleanText(section.status).replace(/_/g, ' ')}`)),
    docxSpacer(),
    docxParagraph('Goal Hierarchy Summary', { style: 'Heading1' }),
    docxBullet(`Total goals staged: ${goalSummary.goal_count || goalRows.length}`),
    docxBullet(`Domains staged: ${goalSummary.domain_count || 0}`),
    docxBullet(`Maladaptive behavior goals staged as Frequency: ${goalSummary.behavior_frequency_goal_count || 0}`),
    docxBullet(`Percentage goals staged with 10-trial data collection: ${goalRows.filter((goal) => goal.dataCollectionType === 'datapercent' && Number(goal.trialCount) === 10).length}`),
    docxSpacer(),
    docxParagraph('Goals', { style: 'Heading1' }),
    ...goalRows.map((goal, index) => docxBullet(`${index + 1}. ${goal.domain} / ${goal.longTermGoal} / ${goal.shortTermGoal}: ${goal.objective || '[objective needed]'} (${goal.dataType || 'Percentage'})`)),
    docxSpacer(),
    docxParagraph('Report Goal Table Rows', { style: 'Heading1' }),
    ...reportGoalRows.map((goal, index) => [
      docxParagraph(`${index + 1}. Program/Behavior: ${goal.programBehavior || '[program needed]'}`, { bold: true }),
      docxBullet(`Short-Term Goal: ${goal.shortTermGoal || '[short-term goal needed]'}`),
      docxBullet(`Objective: ${goal.objective || '[objective needed]'}`),
      docxBullet(`Baseline: ${goal.baseline}`),
      docxBullet(`Current Level: ${goal.currentLevel}`),
      docxBullet(`Criteria for Mastery: ${goal.criteriaForMastery}`),
      docxBullet(`Target date for Mastery: ${goal.targetDateForMastery}`),
      docxBullet(`Graphs: ${goal.graphs}`),
    ].join('\n    ')),
    docxSpacer(),
    docxParagraph('FERB Mapping', { style: 'Heading1' }),
    ...(goalPlanner.ferbMappings?.length
      ? goalPlanner.ferbMappings.map((mapping) => docxBullet(`${mapping.behaviorLabel}: ${
          mapping.replacements.length
            ? mapping.replacements.map((replacement) => `${replacement.shortTermGoal} (${replacement.ferbType})`).join('; ')
            : 'Needs two communication/social replacement goals.'
        }`))
      : [docxBullet('No maladaptive behavior FERB mappings are currently staged.')]),
    docxSpacer(),
    docxParagraph('Approval Gates', { style: 'Heading1' }),
    docxBullet(approvalSummary.report_finalization?.reason || 'Report finalization status was not available.'),
    docxBullet(approvalSummary.centralreach_write?.reason || 'CentralReach write status was not available.'),
  ]

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${lines.join('\n    ')}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`
}

function buildDocxStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr>
  </w:style>
</w:styles>`
}

function buildDocxContentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`
}

function buildDocxRootRelationshipsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
}

function buildDocxCorePropertiesXml({
  title = 'Initial Assessment Draft Packet',
  generatedAt = new Date().toISOString(),
} = {}) {
  const created = formatDateForCore(generatedAt)
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${xmlEscape(title)}</dc:title>
  <dc:creator>SkillCascade</dc:creator>
  <cp:lastModifiedBy>SkillCascade</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${created}</dcterms:modified>
</cp:coreProperties>`
}

function buildDocxAppPropertiesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>SkillCascade</Application>
</Properties>`
}

function coerceDraftArtifact(input = {}) {
  if (input.artifact_type === INITIAL_ASSESSMENT_DRAFT_ARTIFACT && input.metadata) return input
  return buildInitialAssessmentDraftArtifact(input)
}

export async function buildInitialAssessmentDraftDocxBytes(input = {}, {
  exportMode = 'review',
  generatedAt,
} = {}) {
  const artifact = coerceDraftArtifact(input)
  const reportGate = artifact.metadata?.approval_summary?.report_finalization

  if (exportMode === 'final' && reportGate?.allowed !== true) {
    throw new Error('Final Word export is blocked until report finalization is approved.')
  }

  const zip = new JSZip()
  const title = exportMode === 'final'
    ? 'Initial Assessment Export Packet'
    : 'Initial Assessment Draft Packet - Review Only'
  const timestamp = generatedAt || artifact.metadata?.generated_at || new Date().toISOString()

  zip.file('[Content_Types].xml', buildDocxContentTypesXml())
  zip.folder('_rels').file('.rels', buildDocxRootRelationshipsXml())
  zip.folder('word').file('document.xml', buildDocxDocumentXml(artifact, { exportMode, generatedAt: timestamp }))
  zip.folder('word').file('styles.xml', buildDocxStylesXml())
  zip.folder('docProps').file('core.xml', buildDocxCorePropertiesXml({ title, generatedAt: timestamp }))
  zip.folder('docProps').file('app.xml', buildDocxAppPropertiesXml())

  return zip.generateAsync({
    type: 'uint8array',
    mimeType: DOCX_MIME_TYPE,
    compression: 'DEFLATE',
  })
}

export async function buildInitialAssessmentDraftDocxBlob(input = {}, options = {}) {
  const bytes = await buildInitialAssessmentDraftDocxBytes(input, options)
  return new Blob([bytes], { type: DOCX_MIME_TYPE })
}
