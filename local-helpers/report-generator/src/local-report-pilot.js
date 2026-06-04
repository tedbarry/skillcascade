import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path'
import mammoth from 'mammoth'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import { profileTemplate } from './template-profile.js'

const SUPPORTED_SOURCE_EXTENSIONS = new Set(['.docx', '.txt', '.md'])
const SKIP_DIRECTORY_NAMES = new Set(['.git', 'node_modules', 'report-pilot-output', 'verification-output'])

const SECTION_RULES = [
  {
    id: 'diagnosisSummary',
    label: 'Diagnosis Summary',
    keywords: ['diagnosis', 'autism', 'asd', 'diagnosed', 'diagnostic'],
    fallback: 'Diagnosis information was not clearly supported in the local source packet reviewed.',
  },
  {
    id: 'familyHistory',
    label: 'Family History',
    keywords: ['family history', 'family', 'mother', 'father', 'parent', 'sibling', 'caregiver'],
    fallback: 'Family history was not clearly supported in the local source packet reviewed.',
  },
  {
    id: 'developmentalHistory',
    label: 'Developmental History',
    keywords: ['developmental', 'milestone', 'birth', 'pregnancy', 'early intervention', 'delayed'],
    fallback: 'Developmental history was not clearly supported in the local source packet reviewed.',
  },
  {
    id: 'educationalHistory',
    label: 'Educational History',
    keywords: ['school', 'education', 'iep', 'classroom', 'teacher', 'educational'],
    fallback: 'Educational history was not clearly supported in the local source packet reviewed.',
  },
  {
    id: 'behaviorProfile',
    label: 'Maladaptive Behavior Profile',
    keywords: ['aggression', 'noncompliance', 'non-compliance', 'property destruction', 'elopement', 'unsafe', 'tantrum', 'profane'],
    fallback: 'Maladaptive behavior profile was not clearly supported in the local source packet reviewed.',
  },
  {
    id: 'communicationProfile',
    label: 'Communication Profile',
    keywords: ['communication', 'request', 'mand', 'language', 'expressive', 'receptive', 'conversation'],
    fallback: 'Communication profile was not clearly supported in the local source packet reviewed.',
  },
  {
    id: 'socialProfile',
    label: 'Social Profile',
    keywords: ['social', 'peer', 'reciprocal', 'play', 'conversation', 'joint attention'],
    fallback: 'Social profile was not clearly supported in the local source packet reviewed.',
  },
  {
    id: 'caregiverTraining',
    label: 'Parent / Caregiver Training',
    keywords: ['parent training', 'caregiver', 'parent', 'generalization', 'home', 'family training'],
    fallback: 'Parent/caregiver training needs were not clearly supported in the local source packet reviewed.',
  },
]

const GOAL_LIBRARY = [
  {
    id: 'behavior-aggression',
    domain: 'Behavior',
    longTermGoalName: 'Aggression',
    shortTermGoalName: 'Physical Aggression',
    objective: 'The client will decrease instances of physical aggression across treatment settings.',
    keywords: ['aggression', 'physical aggression', 'hitting', 'kicking', 'biting'],
    centralReachDataType: 'frequency',
  },
  {
    id: 'behavior-noncompliance',
    domain: 'Behavior',
    longTermGoalName: 'Noncompliance',
    shortTermGoalName: 'Instructional Noncompliance',
    objective: 'The client will decrease instances of noncompliance and increase cooperation with adult-directed tasks.',
    keywords: ['noncompliance', 'non-compliance', 'refusal', 'refuse'],
    centralReachDataType: 'frequency',
  },
  {
    id: 'behavior-elopement',
    domain: 'Behavior',
    longTermGoalName: 'Unsafe Behavior',
    shortTermGoalName: 'Elopement',
    objective: 'The client will decrease instances of elopement and unsafe movement away from supervised areas.',
    keywords: ['elopement', 'elope', 'run away', 'unsafe'],
    centralReachDataType: 'frequency',
  },
  {
    id: 'communication-functional-requests',
    domain: 'Communication',
    longTermGoalName: 'Functional Communication',
    shortTermGoalName: 'Functional Requests',
    objective: 'The client will independently use functional communication to request help, items, breaks, or attention across people and settings.',
    keywords: ['communication', 'request', 'mand', 'help', 'break'],
    centralReachDataType: 'percent',
  },
  {
    id: 'communication-repair',
    domain: 'Communication',
    longTermGoalName: 'Communication Repair',
    shortTermGoalName: 'Repair Strategies',
    objective: 'The client will use communication repair strategies when misunderstood or when access to preferred items/activities is delayed.',
    keywords: ['communication', 'repair', 'misunderstood', 'frustration'],
    centralReachDataType: 'percent',
  },
  {
    id: 'social-reciprocity',
    domain: 'Social',
    longTermGoalName: 'Reciprocal Social Engagement',
    shortTermGoalName: 'Reciprocal Responses',
    objective: 'The client will respond to and initiate reciprocal social exchanges using contextually appropriate comments, questions, or gestures.',
    keywords: ['social', 'reciprocal', 'peer', 'conversation'],
    centralReachDataType: 'percent',
  },
  {
    id: 'social-play',
    domain: 'Social',
    longTermGoalName: 'Social Play',
    shortTermGoalName: 'Peer Play',
    objective: 'The client will participate in structured or semi-structured peer play using appropriate social behaviors.',
    keywords: ['play', 'peer', 'social'],
    centralReachDataType: 'percent',
  },
  {
    id: 'parent-training',
    domain: 'Parent Training',
    longTermGoalName: 'Caregiver Implementation',
    shortTermGoalName: 'Prompting And Reinforcement',
    objective: 'The caregiver will implement prompting, reinforcement, and generalization procedures as trained by the BCBA.',
    keywords: ['parent', 'caregiver', 'generalization', 'home'],
    centralReachDataType: 'percent',
  },
]

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function splitSentences(text) {
  return normalizeText(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function sourceHasKeyword(text, keyword) {
  return text.toLowerCase().includes(keyword.toLowerCase())
}

function firstMatchingSentence(sources, keywords) {
  for (const source of sources) {
    const sentences = splitSentences(source.text)
    const matched = sentences.find((sentence) => keywords.some((keyword) => sourceHasKeyword(sentence, keyword)))
    if (matched) {
      return {
        sourceId: source.id,
        filename: source.filename,
        text: matched.slice(0, 420),
      }
    }
  }
  return null
}

function isInsidePath(candidatePath, parentPath) {
  const rel = relative(parentPath, candidatePath)
  return rel === '' || (!!rel && !rel.startsWith('..') && !isAbsolute(rel))
}

async function listSourceFiles(rootFolder, { excludePaths = [] } = {}) {
  const supportedFiles = []
  const unsupportedFiles = []

  async function walk(currentFolder) {
    const resolvedCurrent = resolve(currentFolder)
    if (excludePaths.some((excludePath) => isInsidePath(resolvedCurrent, excludePath))) return

    const entries = await readdir(resolvedCurrent, { withFileTypes: true })
    for (const entry of entries) {
      const entryPath = join(resolvedCurrent, entry.name)
      if (entry.isDirectory()) {
        if (!SKIP_DIRECTORY_NAMES.has(entry.name)) await walk(entryPath)
        continue
      }
      if (entry.isFile() && SUPPORTED_SOURCE_EXTENSIONS.has(extname(entryPath).toLowerCase())) {
        supportedFiles.push(entryPath)
      } else if (entry.isFile()) {
        unsupportedFiles.push(entryPath)
      }
    }
  }

  await walk(rootFolder)
  return {
    supportedFiles: supportedFiles.sort((a, b) => a.localeCompare(b)),
    unsupportedFiles: unsupportedFiles.sort((a, b) => a.localeCompare(b)),
  }
}

async function extractSourceFile(filePath) {
  const extension = extname(filePath).toLowerCase()
  if (extension === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath })
    return normalizeText(result.value)
  }
  if (extension === '.txt' || extension === '.md') {
    return normalizeText(await readFile(filePath, 'utf8'))
  }
  return ''
}

export async function scanLocalSourceFolder(sourceFolder, options = {}) {
  const resolvedFolder = resolve(sourceFolder)
  const excludePaths = (options.excludePaths || []).filter(Boolean).map((item) => resolve(item))
  const { supportedFiles, unsupportedFiles } = await listSourceFiles(resolvedFolder, { excludePaths })

  const sources = []
  for (const filePath of supportedFiles) {
    const text = await extractSourceFile(filePath)
    sources.push({
      id: `source-${sources.length + 1}`,
      filename: basename(filePath),
      path: filePath,
      relativePath: relative(resolvedFolder, filePath),
      extension: extname(filePath).toLowerCase(),
      text,
      characterCount: text.length,
      containsPhi: true,
      localOnly: true,
    })
  }

  return {
    sourceFolder: resolvedFolder,
    scannedAt: new Date().toISOString(),
    supportedSourceExtensions: Array.from(SUPPORTED_SOURCE_EXTENSIONS),
    unsupportedFiles: unsupportedFiles.map((filePath) => ({
      filename: basename(filePath),
      path: filePath,
      relativePath: relative(resolvedFolder, filePath),
      extension: extname(filePath).toLowerCase() || '(none)',
      reason: 'not-extracted-by-local-pilot-v1',
    })),
    sources,
  }
}

export function buildLocalClinicalProfile({ clientLabel, sources }) {
  const sections = SECTION_RULES.map((rule) => {
    const match = firstMatchingSentence(sources, rule.keywords)
    return {
      id: rule.id,
      label: rule.label,
      status: match ? 'source-supported' : 'missing-source-support',
      text: match
        ? `Records reviewed indicate the following source-supported information: ${match.text}`
        : rule.fallback,
      sourceEvidence: match ? [match] : [],
      missing: !match,
    }
  })

  return {
    id: 'local-clinical-profile',
    clientLabel: clientLabel || 'Local Pilot Client',
    generatedAt: new Date().toISOString(),
    localOnly: true,
    sections,
    missingFields: sections
      .filter((section) => section.missing)
      .map((section) => ({
        field: section.id,
        label: section.label,
        behavior: 'flag-for-review-do-not-invent',
      })),
  }
}

export function buildLocalGoalPlan({ sources }) {
  const selectedGoals = []
  for (const goal of GOAL_LIBRARY) {
    const match = firstMatchingSentence(sources, goal.keywords)
    if (!match) continue
    selectedGoals.push({
      ...goal,
      baseline: 'Baseline to be established from direct observation and ongoing treatment data collection.',
      currentLevel: `Source support identified in ${match.filename}.`,
      criteriaForMastery: goal.centralReachDataType === 'frequency'
        ? '80% reduction from baseline across 3 consecutive months or as clinically appropriate.'
        : '80% independence across 3 consecutive sessions and at least 2 people/settings when applicable.',
      targetDateForMastery: '12 months from authorization start',
      graphs: 'N/A for initial assessment',
      sourceEvidence: [match],
    })
  }

  const domains = selectedGoals.reduce((summary, goal) => {
    summary[goal.domain] = (summary[goal.domain] || 0) + 1
    return summary
  }, {})

  return {
    id: 'local-goal-plan',
    generatedAt: new Date().toISOString(),
    goals: selectedGoals,
    domains,
    excludedGoalCount: GOAL_LIBRARY.length - selectedGoals.length,
  }
}

function paragraph(text, options = {}) {
  return new Paragraph({
    ...options,
    children: [new TextRun({ text: String(text || ''), bold: options.boldText || false })],
  })
}

function evidenceParagraph(section) {
  if (!section.sourceEvidence.length) {
    return paragraph('Source support: Not found in the local source packet. Review required.', { spacing: { after: 180 } })
  }
  return paragraph(`Source support: ${section.sourceEvidence.map((item) => item.filename).join(', ')}`, { spacing: { after: 180 } })
}

function tableCell(text, bold = false) {
  return new TableCell({
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
    children: [new Paragraph({ children: [new TextRun({ text: String(text || ''), bold })] })],
  })
}

function buildGoalTable(goalPlan) {
  const header = new TableRow({
    children: [
      tableCell('Program/Behavior', true),
      tableCell('Objective', true),
      tableCell('Baseline', true),
      tableCell('Current Level', true),
      tableCell('Criteria for Mastery', true),
      tableCell('Target date for Mastery', true),
      tableCell('Graphs', true),
    ],
  })

  const rows = goalPlan.goals.map((goal) => new TableRow({
    children: [
      tableCell(goal.longTermGoalName),
      tableCell(goal.objective),
      tableCell(goal.baseline),
      tableCell(goal.currentLevel),
      tableCell(goal.criteriaForMastery),
      tableCell(goal.targetDateForMastery),
      tableCell(goal.graphs),
    ],
  }))

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'BBBBBB' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'BBBBBB' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'BBBBBB' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'BBBBBB' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
    },
    rows: [header, ...rows],
  })
}

async function writeGeneratedDocx({ outputPath, job }) {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: job.reportTitle,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          paragraph(`Client: ${job.clientLabel}`, { spacing: { after: 180 } }),
          paragraph(`Generated locally: ${job.generatedAt}`, { spacing: { after: 300 } }),
          paragraph('Review status: Draft for BCBA review. This local pilot does not sign, submit, or finalize reports.', { spacing: { after: 300 } }),
          ...job.clinicalProfile.sections.flatMap((section) => [
            new Paragraph({ text: section.label, heading: HeadingLevel.HEADING_2 }),
            paragraph(section.text, { spacing: { after: 120 } }),
            evidenceParagraph(section),
          ]),
          new Paragraph({ text: 'Recommended Goals', heading: HeadingLevel.HEADING_2 }),
          job.goalPlan.goals.length
            ? buildGoalTable(job.goalPlan)
            : paragraph('No source-supported goals were selected automatically. BCBA review is required.', { spacing: { after: 240 } }),
          new Paragraph({ text: 'Missing / Review-Required Fields', heading: HeadingLevel.HEADING_2 }),
          ...job.clinicalProfile.missingFields.map((field) => paragraph(`${field.label}: ${field.behavior}`)),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  await writeFile(outputPath, buffer)
}

function templateData(job) {
  const sectionById = Object.fromEntries(job.clinicalProfile.sections.map((section) => [section.id, section.text]))
  return {
    report_title: job.reportTitle,
    client_label: job.clientLabel,
    generated_at: job.generatedAt,
    diagnosis_summary: sectionById.diagnosisSummary || '',
    family_history: sectionById.familyHistory || '',
    developmental_history: sectionById.developmentalHistory || '',
    educational_history: sectionById.educationalHistory || '',
    behavior_profile: sectionById.behaviorProfile || '',
    communication_profile: sectionById.communicationProfile || '',
    social_profile: sectionById.socialProfile || '',
    caregiver_training: sectionById.caregiverTraining || '',
    missing_fields: job.clinicalProfile.missingFields.map((field) => field.label).join(', '),
    goals: job.goalPlan.goals.map((goal) => ({
      domain: goal.domain,
      long_term_goal: goal.longTermGoalName,
      short_term_goal: goal.shortTermGoalName,
      objective: goal.objective,
      baseline: goal.baseline,
      current_level: goal.currentLevel,
      criteria: goal.criteriaForMastery,
      target_date: goal.targetDateForMastery,
      graphs: goal.graphs,
    })),
  }
}

async function writePlaceholderTemplateDocx({ templatePath, outputPath, job }) {
  const content = await readFile(templatePath)
  const zip = new PizZip(content)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter(part) {
      const value = part?.value || part?.module || 'unknown'
      return `[[REVIEW_UNSUPPORTED_TEMPLATE_FIELD:${value}]]`
    },
  })
  doc.render(templateData(job))
  const buffer = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  })
  await writeFile(outputPath, buffer)
}

export async function runLocalReportPilot({
  sourceFolder,
  outputDir,
  clientLabel = 'Local Pilot Client',
  reportTitle = 'ABA Initial Assessment Draft',
  templatePath = '',
} = {}) {
  if (!sourceFolder) throw new Error('sourceFolder is required')
  const resolvedOutputDir = resolve(outputDir || join(sourceFolder, 'report-pilot-output'))
  await mkdir(resolvedOutputDir, { recursive: true })

  const sourcePacket = await scanLocalSourceFolder(sourceFolder, { excludePaths: [resolvedOutputDir] })
  const clinicalProfile = buildLocalClinicalProfile({ clientLabel, sources: sourcePacket.sources })
  const goalPlan = buildLocalGoalPlan({ sources: sourcePacket.sources })
  const templateProfile = templatePath ? await profileTemplate({ templatePath }) : null
  const generatedAt = new Date().toISOString()
  const safeClient = clientLabel.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'client'
  const outputPath = join(resolvedOutputDir, `${safeClient}-report-draft.docx`)
  const reviewPath = join(resolvedOutputDir, `${safeClient}-review-summary.json`)

  const job = {
    id: `local-report-${Date.now()}`,
    localOnly: true,
    sourceFolder: sourcePacket.sourceFolder,
    outputDir: resolvedOutputDir,
    clientLabel,
    reportTitle,
    generatedAt,
    sourcePacket,
    clinicalProfile,
    goalPlan,
    outputPath,
    templatePath: templatePath ? resolve(templatePath) : '',
    templateProfile,
    templateMode: templatePath ? 'placeholder-template' : 'generated-docx',
    qa: {
      status: 'ready-for-bcba-review',
      blockers: [],
      warnings: [
        ...clinicalProfile.missingFields.map((field) => `Missing source support: ${field.label}`),
        ...(templateProfile?.warnings || []).map((warning) => `Template profile: ${warning}`),
        ...sourcePacket.unsupportedFiles.map((file) => `Unsupported local source not extracted: ${file.relativePath}`),
        ...(goalPlan.goals.length ? [] : ['No source-supported goals were selected automatically.']),
      ],
      liveWriteAttempted: false,
      autoSignAttempted: false,
      autoSubmitAttempted: false,
    },
  }

  if (templatePath) {
    await writePlaceholderTemplateDocx({ templatePath, outputPath, job })
  } else {
    await writeGeneratedDocx({ outputPath, job })
  }

  await writeFile(reviewPath, JSON.stringify({
    id: job.id,
    generatedAt,
    clientLabel,
    reportTitle,
    localOnly: true,
    sourceFiles: sourcePacket.sources.map((source) => ({
      filename: source.filename,
      relativePath: source.relativePath,
      characterCount: source.characterCount,
    })),
    unsupportedFiles: sourcePacket.unsupportedFiles,
    templateProfile: templateProfile ? {
      status: templateProfile.status,
      filename: templateProfile.filename,
      tagCount: templateProfile.tagCount,
      supportedTags: templateProfile.supportedTags,
      unsupportedTags: templateProfile.unsupportedTags,
      missingRecommendedFields: templateProfile.missingRecommendedFields,
      warnings: templateProfile.warnings,
    } : null,
    missingFields: clinicalProfile.missingFields,
    goalCount: goalPlan.goals.length,
    goalsByDomain: goalPlan.domains,
    qa: job.qa,
    outputPath,
  }, null, 2))

  return {
    ...job,
    reviewPath,
    sourcePacket: {
      ...sourcePacket,
      sources: sourcePacket.sources.map((source) => ({
        id: source.id,
        filename: source.filename,
        path: source.path,
        relativePath: source.relativePath,
        extension: source.extension,
        characterCount: source.characterCount,
        containsPhi: source.containsPhi,
        localOnly: source.localOnly,
      })),
    },
  }
}
