import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path'
import mammoth from 'mammoth'
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

const SUPPORTED_SOURCE_EXTENSIONS = new Set(['.docx', '.txt', '.md'])
const DEFAULT_OUTPUT_DIRECTORY_NAME = 'report-generator-output'
const LEGACY_OUTPUT_DIRECTORY_NAMES = ['report-pilot-output']
const SKIP_DIRECTORY_NAMES = new Set(['.git', 'node_modules', DEFAULT_OUTPUT_DIRECTORY_NAME, ...LEGACY_OUTPUT_DIRECTORY_NAMES, 'verification-output'])
const STANDARD_TEMPLATE_ONLY_BLOCKER = 'Customer Word templates are disabled for this workflow. SkillCascade uses the standard initial assessment template automatically.'

export const STANDARD_REPORT_TEMPLATE = {
  id: 'skillcascade-standard-initial-assessment-v1',
  label: 'SkillCascade Standard Initial Assessment',
  reportType: 'initial-assessment',
  mode: 'skillcascade-standard-docx',
  controlledBy: 'skillcascade',
  customerTemplateUpload: false,
  reviewRule: 'BCBA review is required before use, signing, submission, or payer delivery.',
}

export const REQUIRED_EVIDENCE_CATEGORIES = [
  {
    id: 'diagnostic_or_psychological_evaluation',
    label: 'Diagnosis / Psychological Evaluation',
    required: true,
    keywords: [
      'psychological evaluation',
      'diagnostic evaluation',
      'diagnostic report',
      'psych report',
      'diagnosis',
      'diagnosed',
      'autism spectrum disorder',
      'asd',
      'dsm-5',
      'dsm v',
    ],
    examples: 'diagnostic report, psychological evaluation, or diagnosis document',
  },
  {
    id: 'intake_or_caregiver_history',
    label: 'Intake / Caregiver History',
    required: true,
    keywords: [
      'intake',
      'caregiver interview',
      'parent interview',
      'parent report',
      'family history',
      'developmental history',
      'caregiver reported',
      'presenting concerns',
    ],
    examples: 'intake form, caregiver interview, or parent history document',
  },
  {
    id: 'adaptive_or_functional_assessment',
    label: 'Adaptive / Functional Assessment',
    required: true,
    keywords: [
      'vineland',
      'vineland-3',
      'adaptive behavior',
      'adaptive behavior composite',
      'communication domain',
      'daily living skills',
      'socialization',
      'abas',
      'afls',
      'vbmapp',
      'vb-mapp',
      'ablls',
    ],
    examples: 'Vineland, ABAS, AFLS, VB-MAPP, ABLLS, or similar adaptive/skill assessment',
  },
]

export const ASSESSMENT_ADAPTERS = [
  {
    id: 'psychological_evaluation',
    label: 'Psychological / Diagnostic Evaluation',
    kind: 'evaluation',
    keywords: ['psychological evaluation', 'diagnostic evaluation', 'cognitive', 'adaptive functioning', 'dsm-5', 'diagnosis'],
    use: 'diagnosis, developmental history, medical necessity, and broad deficit rationale',
  },
  {
    id: 'intake',
    label: 'Intake / Caregiver Interview',
    kind: 'intake',
    keywords: ['intake', 'caregiver interview', 'parent report', 'presenting concerns', 'family history', 'developmental history'],
    use: 'family history, developmental history, educational history, caregiver priorities, and contextual needs',
  },
  {
    id: 'vineland',
    label: 'Vineland / Adaptive Behavior Report',
    kind: 'adaptive-assessment',
    keywords: ['vineland', 'adaptive behavior composite', 'communication domain', 'daily living skills', 'socialization', 'v-scale'],
    use: 'adaptive, communication, daily living, and socialization deficit crosswalks',
  },
  {
    id: 'srs2',
    label: 'SRS-2 / Social Responsiveness Report',
    kind: 'social-assessment',
    keywords: ['srs-2', 'srs2', 'social responsiveness', 'social awareness', 'social cognition', 'social communication', 'restricted interests'],
    use: 'social communication, social cognition, social motivation, and restricted/repetitive behavior prioritization',
  },
  {
    id: 'abas',
    label: 'ABAS / Adaptive Behavior Report',
    kind: 'adaptive-assessment',
    keywords: ['abas', 'adaptive behavior assessment system', 'conceptual', 'social composite', 'practical composite'],
    use: 'adaptive functioning and daily living deficit crosswalks',
  },
  {
    id: 'vbmapp',
    label: 'VB-MAPP',
    kind: 'skill-assessment',
    keywords: ['vb-mapp', 'vbmapp', 'mand', 'tact', 'listener responding', 'intraverbal', 'milestones assessment'],
    use: 'early language, listener responding, manding, tacting, and learning-readiness goal families',
  },
  {
    id: 'ablls_afls',
    label: 'ABLLS-R / AFLS',
    kind: 'skill-assessment',
    keywords: ['ablls', 'ablls-r', 'afls', 'basic living', 'home skills', 'community skills', 'functional living'],
    use: 'skill acquisition, functional living, adaptive, and community goal families',
  },
  {
    id: 'fba_bip',
    label: 'FBA / BIP / Behavior Documentation',
    kind: 'behavior-assessment',
    keywords: ['fba', 'functional behavior assessment', 'behavior intervention plan', 'bip', 'antecedent', 'consequence', 'function of behavior'],
    use: 'maladaptive behavior definitions, hypothesized functions, FERBs, and behavior goals',
  },
  {
    id: 'speech_language',
    label: 'Speech / Language Evaluation',
    kind: 'related-service',
    keywords: ['speech', 'language evaluation', 'expressive language', 'receptive language', 'pragmatic language', 'articulation'],
    use: 'communication and pragmatic-language goal rationale',
  },
  {
    id: 'ot_sensory',
    label: 'OT / Sensory Documentation',
    kind: 'related-service',
    keywords: ['occupational therapy', 'sensory', 'fine motor', 'gross motor', 'adaptive equipment', 'sensory profile'],
    use: 'sensory, motor, and adaptive support context',
  },
  {
    id: 'school_iep',
    label: 'School / IEP Documentation',
    kind: 'education',
    keywords: ['iep', 'school', 'classroom', 'teacher', 'educational', 'placement', 'special education'],
    use: 'educational history and school-functioning context when clinically relevant',
  },
]

const DEFICIT_DOMAIN_RULES = [
  {
    id: 'maladaptiveBehavior',
    label: 'Maladaptive Behavior',
    goalDomains: ['Behavior', 'Communication', 'Social', 'Parent Training'],
    keywords: ['aggression', 'noncompliance', 'non-compliance', 'property destruction', 'elopement', 'unsafe', 'tantrum', 'profane', 'self-injury', 'sib'],
  },
  {
    id: 'communication',
    label: 'Communication Deficits',
    goalDomains: ['Communication'],
    keywords: ['communication', 'expressive', 'receptive', 'request', 'mand', 'language', 'pragmatic', 'conversation', 'functional communication'],
  },
  {
    id: 'social',
    label: 'Social / Reciprocal Interaction Deficits',
    goalDomains: ['Social'],
    keywords: ['social', 'peer', 'reciprocal', 'joint attention', 'play', 'social cognition', 'social communication', 'social motivation', 'perspective'],
  },
  {
    id: 'adaptiveDailyLiving',
    label: 'Adaptive / Daily Living Deficits',
    goalDomains: ['Communication', 'Social', 'Parent Training'],
    keywords: ['adaptive', 'daily living', 'self-care', 'personal', 'domestic', 'community', 'functional living', 'vineland', 'abas', 'afls'],
  },
  {
    id: 'flexibilityRrb',
    label: 'Flexibility / Restricted-Repetitive Behavior Needs',
    goalDomains: ['Behavior', 'Social', 'Parent Training'],
    keywords: ['restricted interests', 'repetitive', 'rigid', 'sameness', 'transition', 'flexibility', 'perseverative', 'ritual'],
  },
  {
    id: 'caregiverTraining',
    label: 'Caregiver Training Needs',
    goalDomains: ['Parent Training'],
    keywords: ['caregiver', 'parent training', 'parent', 'home', 'generalization', 'family training', 'reinforcement', 'prompting'],
  },
]

const GOAL_DOMAIN_ORDER = ['Behavior', 'Communication', 'Social', 'Parent Training']

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
    deficitDomains: ['maladaptiveBehavior'],
    centralReachDataType: 'frequency',
  },
  {
    id: 'behavior-noncompliance',
    domain: 'Behavior',
    longTermGoalName: 'Noncompliance',
    shortTermGoalName: 'Instructional Noncompliance',
    objective: 'The client will decrease instances of noncompliance and increase cooperation with adult-directed tasks.',
    keywords: ['noncompliance', 'non-compliance', 'refusal', 'refuse'],
    deficitDomains: ['maladaptiveBehavior', 'flexibilityRrb'],
    centralReachDataType: 'frequency',
  },
  {
    id: 'behavior-elopement',
    domain: 'Behavior',
    longTermGoalName: 'Unsafe Behavior',
    shortTermGoalName: 'Elopement',
    objective: 'The client will decrease instances of elopement and unsafe movement away from supervised areas.',
    keywords: ['elopement', 'elope', 'run away', 'unsafe'],
    deficitDomains: ['maladaptiveBehavior'],
    centralReachDataType: 'frequency',
  },
  {
    id: 'communication-functional-requests',
    domain: 'Communication',
    longTermGoalName: 'Functional Communication',
    shortTermGoalName: 'Functional Requests',
    objective: 'The client will independently use functional communication to request help, items, breaks, or attention across people and settings.',
    keywords: ['communication', 'request', 'mand', 'help', 'break'],
    deficitDomains: ['communication', 'maladaptiveBehavior', 'adaptiveDailyLiving'],
    centralReachDataType: 'percent',
  },
  {
    id: 'communication-repair',
    domain: 'Communication',
    longTermGoalName: 'Communication Repair',
    shortTermGoalName: 'Repair Strategies',
    objective: 'The client will use communication repair strategies when misunderstood or when access to preferred items/activities is delayed.',
    keywords: ['communication', 'repair', 'misunderstood', 'frustration'],
    deficitDomains: ['communication', 'maladaptiveBehavior'],
    centralReachDataType: 'percent',
  },
  {
    id: 'social-reciprocity',
    domain: 'Social',
    longTermGoalName: 'Reciprocal Social Engagement',
    shortTermGoalName: 'Reciprocal Responses',
    objective: 'The client will respond to and initiate reciprocal social exchanges using contextually appropriate comments, questions, or gestures.',
    keywords: ['social', 'reciprocal', 'peer', 'conversation'],
    deficitDomains: ['social', 'communication'],
    centralReachDataType: 'percent',
  },
  {
    id: 'social-play',
    domain: 'Social',
    longTermGoalName: 'Social Play',
    shortTermGoalName: 'Peer Play',
    objective: 'The client will participate in structured or semi-structured peer play using appropriate social behaviors.',
    keywords: ['play', 'peer', 'social'],
    deficitDomains: ['social'],
    centralReachDataType: 'percent',
  },
  {
    id: 'parent-training',
    domain: 'Parent Training',
    longTermGoalName: 'Caregiver Implementation',
    shortTermGoalName: 'Prompting And Reinforcement',
    objective: 'The caregiver will implement prompting, reinforcement, and generalization procedures as trained by the BCBA.',
    keywords: ['parent', 'caregiver', 'generalization', 'home'],
    deficitDomains: ['caregiverTraining', 'maladaptiveBehavior', 'adaptiveDailyLiving'],
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

function sourceSearchText(source) {
  return `${source.filename || ''} ${source.relativePath || ''} ${source.text || ''}`
}

function matchedKeywordsForSource(source, keywords = []) {
  const searchText = sourceSearchText(source)
  return keywords.filter((keyword) => sourceHasKeyword(searchText, keyword))
}

function sourceReference(source, matchedKeywords = []) {
  return {
    sourceId: source.id,
    filename: source.filename,
    relativePath: source.relativePath,
    matchedKeywords: matchedKeywords.slice(0, 8),
  }
}

function buildSourceRuleMatches(sources, rules) {
  return rules.map((rule) => {
    const evidence = sources
      .map((source) => {
        const matchedKeywords = matchedKeywordsForSource(source, rule.keywords)
        return matchedKeywords.length ? sourceReference(source, matchedKeywords) : null
      })
      .filter(Boolean)

    return {
      id: rule.id,
      label: rule.label,
      required: Boolean(rule.required),
      kind: rule.kind || '',
      use: rule.use || '',
      examples: rule.examples || '',
      status: evidence.length ? 'found' : 'missing',
      evidence,
    }
  })
}

export function buildRequiredEvidenceReadiness(sources) {
  const categories = buildSourceRuleMatches(sources, REQUIRED_EVIDENCE_CATEGORIES)
  const missingRequired = categories.filter((category) => category.required && category.status !== 'found')

  return {
    status: missingRequired.length ? 'blocked-missing-required-evidence' : 'ready',
    ready: missingRequired.length === 0,
    categories,
    missingRequired: missingRequired.map((category) => ({
      id: category.id,
      label: category.label,
      examples: category.examples,
    })),
  }
}

export function detectAssessmentAdapters(sources) {
  return buildSourceRuleMatches(sources, ASSESSMENT_ADAPTERS)
    .filter((adapter) => adapter.status === 'found')
}

function firstDeficitEvidence(sources, keywords) {
  const match = firstMatchingSentence(sources, keywords)
  if (match) return match

  const source = sources.find((item) => matchedKeywordsForSource(item, keywords).length)
  if (!source) return null
  return {
    sourceId: source.id,
    filename: source.filename,
    text: '',
  }
}

export function buildLocalDeficitProfile({ sources }) {
  const domains = DEFICIT_DOMAIN_RULES.map((rule) => {
    const evidence = firstDeficitEvidence(sources, rule.keywords)
    return {
      id: rule.id,
      label: rule.label,
      status: evidence ? 'source-supported' : 'missing-source-support',
      goalDomains: rule.goalDomains,
      sourceEvidence: evidence ? [evidence] : [],
    }
  })

  return {
    id: 'local-deficit-profile',
    generatedAt: new Date().toISOString(),
    localOnly: true,
    domains,
    supportedGoalDomains: Array.from(new Set(domains
      .filter((domain) => domain.status === 'source-supported')
      .flatMap((domain) => domain.goalDomains))),
    missingDeficitDomains: domains
      .filter((domain) => domain.status !== 'source-supported')
      .map((domain) => ({
        id: domain.id,
        label: domain.label,
        behavior: 'flag-for-bcba-review-before-selecting-related-goals',
      })),
  }
}

function isInsidePath(candidatePath, parentPath) {
  const rel = relative(parentPath, candidatePath)
  return rel === '' || (!!rel && !rel.startsWith('..') && !isAbsolute(rel))
}

function resolvedPathKey(value) {
  const resolved = resolve(value)
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved
}

function pathsAreSame(left, right) {
  if (!left || !right) return false
  return resolvedPathKey(left) === resolvedPathKey(right)
}

function outputDirWouldHideSource(sourceFolder, outputDir) {
  if (!sourceFolder || !outputDir) return false
  if (pathsAreSame(sourceFolder, outputDir)) return false
  return isInsidePath(resolve(sourceFolder), resolve(outputDir))
}

function outputDirSourceBlockerMessage() {
  return 'Output folder cannot contain the client document folder. Choose the client folder itself, leave output blank for the default drafts subfolder, or choose a drafts folder inside the client folder.'
}

function outputDirScanExclusions(sourceFolder, outputDir) {
  if (!sourceFolder || !outputDir || pathsAreSame(sourceFolder, outputDir)) return []
  return [resolve(outputDir)]
}

function outputDirStrategy(sourceFolder, outputDir, requestedOutputDir) {
  if (!sourceFolder || !outputDir) return 'unknown'
  if (pathsAreSame(sourceFolder, outputDir)) return 'source-folder'
  if (!requestedOutputDir) return 'default-subfolder'
  return 'custom-folder'
}

function isGeneratedOutputArtifact(filename) {
  return /-report-draft\.docx$/i.test(filename)
    || /-review-summary\.json$/i.test(filename)
    || /-evidence-ledger\.json$/i.test(filename)
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
      if (entry.isFile() && isGeneratedOutputArtifact(entry.name)) continue
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
      reason: 'not-extracted-by-local-helper-v1',
    })),
    sources,
  }
}

async function directoryStatus(path) {
  try {
    const info = await stat(path)
    return {
      exists: true,
      isDirectory: info.isDirectory(),
      isFile: info.isFile(),
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return {
      exists: false,
      isDirectory: false,
      isFile: false,
    }
  }
}

export async function preflightLocalReportPilot({
  sourceFolder,
  outputDir = '',
  templatePath = '',
  templateProfileId = '',
} = {}) {
  const blockers = []
  const warnings = []
  if (templatePath || templateProfileId) {
    blockers.push(STANDARD_TEMPLATE_ONLY_BLOCKER)
  }
  if (!sourceFolder) {
    blockers.push('sourceFolder is required')
  }

  const resolvedSourceFolder = sourceFolder ? resolve(sourceFolder) : ''
  const resolvedOutputDir = sourceFolder ? resolve(outputDir || join(sourceFolder, DEFAULT_OUTPUT_DIRECTORY_NAME)) : ''
  const sourceStatus = resolvedSourceFolder ? await directoryStatus(resolvedSourceFolder) : null
  if (sourceStatus && !sourceStatus.exists) blockers.push('Source folder does not exist.')
  if (sourceStatus?.exists && !sourceStatus.isDirectory) blockers.push('Source folder path is not a directory.')
  if (resolvedSourceFolder && resolvedOutputDir && outputDirWouldHideSource(resolvedSourceFolder, resolvedOutputDir)) {
    blockers.push(outputDirSourceBlockerMessage())
  }

  let supportedFiles = []
  let unsupportedFiles = []
  let sourcePacket = null
  let evidenceReadiness = buildRequiredEvidenceReadiness([])
  let assessmentAdapters = []
  let deficitProfile = buildLocalDeficitProfile({ sources: [] })
  let clinicalProfile = buildLocalClinicalProfile({ clientLabel: 'Local Report Client', sources: [] })
  let goalPlan = buildLocalGoalPlan({ sources: [], deficitProfile })
  let coverageMatrix = buildReportCoverageMatrix({
    evidenceReadiness,
    assessmentAdapters,
    deficitProfile,
    clinicalProfile,
    goalPlan,
  })
  if (!blockers.length && resolvedSourceFolder) {
    sourcePacket = await scanLocalSourceFolder(resolvedSourceFolder, {
      excludePaths: outputDirScanExclusions(resolvedSourceFolder, resolvedOutputDir),
    })
    supportedFiles = sourcePacket.sources.map((source) => source.path)
    unsupportedFiles = sourcePacket.unsupportedFiles.map((source) => source.path)
    if (!supportedFiles.length) blockers.push('No supported source files were found. Add .docx, .txt, or .md source files.')
    if (unsupportedFiles.length) warnings.push(`${unsupportedFiles.length} unsupported file(s) will be listed in review but not extracted.`)
    if (supportedFiles.length) {
      evidenceReadiness = buildRequiredEvidenceReadiness(sourcePacket.sources)
      assessmentAdapters = detectAssessmentAdapters(sourcePacket.sources)
      deficitProfile = buildLocalDeficitProfile({ sources: sourcePacket.sources })
      clinicalProfile = buildLocalClinicalProfile({ clientLabel: 'Local Report Client', sources: sourcePacket.sources })
      goalPlan = buildLocalGoalPlan({ sources: sourcePacket.sources, deficitProfile })
      coverageMatrix = buildReportCoverageMatrix({
        evidenceReadiness,
        assessmentAdapters,
        deficitProfile,
        clinicalProfile,
        goalPlan,
      })
      for (const missing of evidenceReadiness.missingRequired) {
        blockers.push(`Required source evidence missing: ${missing.label}. Add ${missing.examples}.`)
      }
      if (!deficitProfile.supportedGoalDomains.length) {
        blockers.push('No source-supported deficit domains were detected. Add assessment/evaluation records that clearly describe communication, social, adaptive, behavior, or caregiver-training needs.')
      }
    }
  }

  warnings.push(`${STANDARD_REPORT_TEMPLATE.label} will be used automatically. Customer report templates are not part of this workflow.`)

  return {
    okToRun: blockers.length === 0,
    localOnly: true,
    sourceTextReturned: false,
    sourceFolder: resolvedSourceFolder,
    outputDir: resolvedOutputDir,
    outputStrategy: outputDirStrategy(resolvedSourceFolder, resolvedOutputDir, outputDir),
    sourceSummary: {
      supportedFileCount: supportedFiles.length,
      unsupportedFileCount: unsupportedFiles.length,
      supportedExtensions: Array.from(SUPPORTED_SOURCE_EXTENSIONS),
    },
    standardTemplate: STANDARD_REPORT_TEMPLATE,
    evidenceReadiness,
    assessmentAdapters,
    deficitProfile: sanitizeDeficitProfileForResponse(deficitProfile),
    coverageMatrix,
    templateSummary: {
      mode: STANDARD_REPORT_TEMPLATE.mode,
      label: STANDARD_REPORT_TEMPLATE.label,
      customerTemplateUpload: false,
      customTemplateAccepted: false,
      controlledBy: STANDARD_REPORT_TEMPLATE.controlledBy,
    },
    blockers,
    warnings,
    safety: {
      liveWriteAttempted: false,
      autoSignAttempted: false,
      autoSubmitAttempted: false,
    },
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
    clientLabel: clientLabel || 'Local Report Client',
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

function firstGoalEvidence(goal, sources, deficitProfile) {
  const directMatch = firstMatchingSentence(sources, goal.keywords)
  if (directMatch) {
    return {
      ...directMatch,
      basis: 'direct-goal-keyword',
    }
  }

  const supportedDeficit = (deficitProfile?.domains || []).find((domain) => (
    goal.deficitDomains?.includes(domain.id)
    && domain.sourceEvidence?.length
  ))
  if (!supportedDeficit) return null

  return {
    ...supportedDeficit.sourceEvidence[0],
    basis: `deficit-domain:${supportedDeficit.id}`,
    deficitDomainId: supportedDeficit.id,
    deficitDomainLabel: supportedDeficit.label,
  }
}

export function buildLocalGoalPlan({ sources, deficitProfile }) {
  const selectedGoals = []
  for (const goal of GOAL_LIBRARY) {
    const match = firstGoalEvidence(goal, sources, deficitProfile)
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
      selectionBasis: match.basis || 'source-supported',
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
    supportedDeficitDomains: (deficitProfile?.domains || [])
      .filter((domain) => domain.status === 'source-supported')
      .map((domain) => ({
        id: domain.id,
        label: domain.label,
        goalDomains: domain.goalDomains,
      })),
    excludedGoalCount: GOAL_LIBRARY.length - selectedGoals.length,
  }
}

export function buildReportCoverageMatrix({
  evidenceReadiness,
  assessmentAdapters = [],
  deficitProfile,
  clinicalProfile,
  goalPlan,
} = {}) {
  const sectionCoverage = (clinicalProfile?.sections || []).map((section) => ({
    id: section.id,
    label: section.label,
    status: section.status,
    evidenceCount: section.sourceEvidence?.length || 0,
    reviewAction: section.missing ? 'review-required-do-not-invent' : 'source-supported-review-language',
  }))
  const goalDomainNames = ['Behavior', 'Communication', 'Social', 'Parent Training']
  const goalDomainCoverage = goalDomainNames.map((domain) => {
    const goals = (goalPlan?.goals || []).filter((goal) => goal.domain === domain)
    const deficitSupport = (deficitProfile?.domains || [])
      .filter((item) => item.status === 'source-supported' && item.goalDomains?.includes(domain))
      .map((item) => ({ id: item.id, label: item.label }))
    return {
      domain,
      status: goals.length ? 'source-supported-goals-present' : deficitSupport.length ? 'review-needed-no-goals-selected' : 'not-source-supported',
      goalCount: goals.length,
      sourceSupportedDeficitCount: deficitSupport.length,
      sourceSupportedDeficits: deficitSupport,
      reviewAction: goals.length
        ? 'bcba-review-goal-fit-and-medical-necessity'
        : deficitSupport.length
          ? 'bcba-review-needed-before-adding-goals'
          : 'do-not-add-without-source-support',
    }
  })
  const requiredEvidenceCoverage = (evidenceReadiness?.categories || []).map((category) => ({
    id: category.id,
    label: category.label,
    required: Boolean(category.required),
    status: category.status,
    evidenceCount: category.evidence?.length || 0,
  }))
  const missingSections = sectionCoverage.filter((section) => section.status !== 'source-supported')
  const missingRequiredEvidence = requiredEvidenceCoverage.filter((category) => category.required && category.status !== 'found')
  const uncoveredGoalDomains = goalDomainCoverage.filter((domain) => domain.status !== 'source-supported-goals-present')
  const blockers = [
    ...missingRequiredEvidence.map((category) => `Missing required evidence category: ${category.label}`),
    ...(!deficitProfile?.supportedGoalDomains?.length ? ['No source-supported deficit domains detected.'] : []),
  ]
  const warnings = [
    ...missingSections.map((section) => `Report section needs source review: ${section.label}`),
    ...uncoveredGoalDomains
      .filter((domain) => domain.status === 'review-needed-no-goals-selected')
      .map((domain) => `Goal domain has deficit support but no selected goals: ${domain.domain}`),
    ...(!assessmentAdapters.length ? ['No known assessment adapter detected.'] : []),
  ]

  return {
    id: 'report-source-coverage-matrix',
    localOnly: true,
    sourceTextReturned: false,
    status: blockers.length ? 'blocked' : warnings.length ? 'review-needed' : 'ready-for-draft',
    summary: {
      requiredEvidenceReady: Boolean(evidenceReadiness?.ready),
      requiredEvidenceFound: requiredEvidenceCoverage.filter((category) => category.status === 'found').length,
      requiredEvidenceTotal: requiredEvidenceCoverage.length,
      detectedAssessmentInputCount: assessmentAdapters.length,
      sourceSupportedSectionCount: sectionCoverage.filter((section) => section.status === 'source-supported').length,
      sectionCount: sectionCoverage.length,
      missingSectionCount: missingSections.length,
      selectedGoalCount: goalPlan?.goals?.length || 0,
      goalDomainsWithGoals: goalDomainCoverage.filter((domain) => domain.goalCount > 0).map((domain) => domain.domain),
    },
    requiredEvidenceCoverage,
    assessmentInputCoverage: assessmentAdapters.map((adapter) => ({
      id: adapter.id,
      label: adapter.label,
      kind: adapter.kind,
      use: adapter.use,
      evidenceCount: adapter.evidence?.length || 0,
    })),
    sectionCoverage,
    goalDomainCoverage,
    blockers,
    warnings,
    reviewGates: [
      'BCBA review required before using report language.',
      'Do not add goals for unsupported domains without source evidence.',
      'Missing sections must stay visible in QA instead of being invented.',
      'No signing, submission, payer delivery, or external-platform write is performed by this helper.',
    ],
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

function reviewMarker(text) {
  return paragraph(`Review required: ${text}`, { spacing: { after: 160 }, boldText: true })
}

function heading(text, level = HeadingLevel.HEADING_2) {
  return new Paragraph({ text, heading: level })
}

function tableCell(text, bold = false) {
  return new TableCell({
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
    children: [new Paragraph({ children: [new TextRun({ text: String(text || ''), bold })] })],
  })
}

function sectionById(job, id) {
  return job.clinicalProfile.sections.find((section) => section.id === id)
}

function sectionDraftParagraph(section) {
  if (!section) return reviewMarker('Section was not available in the generated clinical profile.')
  return paragraph(section.text, { spacing: { after: 120 } })
}

function buildSectionBlock(section) {
  return [
    heading(section.label),
    sectionDraftParagraph(section),
    evidenceParagraph(section),
  ]
}

function buildSourcePacketSection(job) {
  const sourceItems = job.sourcePacket.sources.map((source) => (
    paragraph(`${source.relativePath} (${source.extension}, ${source.characterCount} characters extracted)`, { spacing: { after: 60 } })
  ))
  const unsupportedItems = job.sourcePacket.unsupportedFiles.map((source) => (
    paragraph(`${source.relativePath} (${source.extension}) - unsupported; review manually if clinically relevant.`, { spacing: { after: 60 } })
  ))

  return [
    heading('Source Packet Reviewed'),
    ...(sourceItems.length ? sourceItems : [reviewMarker('No supported source files were extracted.')]),
    ...(unsupportedItems.length
      ? [
          paragraph('Unsupported local files:', { spacing: { before: 120, after: 60 }, boldText: true }),
          ...unsupportedItems,
        ]
      : []),
  ]
}

function buildMedicalNecessitySection(job) {
  const supportedDeficits = job.deficitProfile.domains
    .filter((domain) => domain.status === 'source-supported')
    .map((domain) => domain.label)
  const supportedGoalDomains = job.coverageMatrix.summary.goalDomainsWithGoals || []

  return [
    heading('Medical Necessity And Clinical Rationale'),
    supportedDeficits.length
      ? paragraph(`The local source packet supports clinically significant needs in the following areas: ${supportedDeficits.join(', ')}. Recommended goals are included only where the available sources support a related deficit domain.`, { spacing: { after: 120 } })
      : reviewMarker('No source-supported deficit domains were detected. Do not finalize goals until the source packet supports the clinical rationale.'),
    supportedGoalDomains.length
      ? paragraph(`Goal domains with source-supported recommendations in this draft: ${supportedGoalDomains.join(', ')}.`, { spacing: { after: 120 } })
      : reviewMarker('No goal domains currently have source-supported recommendations.'),
    paragraph('The BCBA must review the draft, confirm medical necessity, finalize wording, and adjust service recommendations before the report is used.', { spacing: { after: 180 } }),
  ]
}

function buildBiopsychosocialSection(job) {
  const ids = ['familyHistory', 'developmentalHistory', 'educationalHistory']
  return [
    heading('Biopsychosocial History'),
    ...ids.flatMap((id) => {
      const section = sectionById(job, id)
      return section ? buildSectionBlock(section) : [reviewMarker(`${id} was not available.`)]
    }),
  ]
}

function buildClinicalProfileSection(job) {
  const ids = ['diagnosisSummary', 'behaviorProfile', 'communicationProfile', 'socialProfile', 'caregiverTraining']
  return [
    heading('Clinical Profile And Treatment Needs'),
    ...ids.flatMap((id) => {
      const section = sectionById(job, id)
      return section ? buildSectionBlock(section) : [reviewMarker(`${id} was not available.`)]
    }),
  ]
}

function buildGoalTable(goals) {
  const header = new TableRow({
    children: [
      tableCell('Program/Behavior', true),
      tableCell('Short-Term Goal', true),
      tableCell('Objective', true),
      tableCell('Baseline', true),
      tableCell('Current Level', true),
      tableCell('Criteria for Mastery', true),
      tableCell('Target date for Mastery', true),
      tableCell('Data / Graphs', true),
    ],
  })

  const rows = goals.map((goal) => new TableRow({
    children: [
      tableCell(goal.longTermGoalName),
      tableCell(goal.shortTermGoalName),
      tableCell(goal.objective),
      tableCell(goal.baseline),
      tableCell(goal.currentLevel),
      tableCell(goal.criteriaForMastery),
      tableCell(goal.targetDateForMastery),
      tableCell(`${goal.centralReachDataType}; ${goal.graphs}`),
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

function buildGoalDomainSections(job) {
  return GOAL_DOMAIN_ORDER.flatMap((domain) => {
    const goals = job.goalPlan.goals.filter((goal) => goal.domain === domain)
    const domainCoverage = job.coverageMatrix.goalDomainCoverage.find((item) => item.domain === domain)
    return [
      heading(`${domain} Goals`),
      paragraph(`Coverage: ${domainCoverage?.status || 'not reviewed'} (${goals.length} goal${goals.length === 1 ? '' : 's'}).`, { spacing: { after: 100 } }),
      goals.length
        ? buildGoalTable(goals)
        : reviewMarker(`No ${domain.toLowerCase()} goals were selected automatically. Add only if source evidence supports this domain.`),
    ]
  })
}

function buildReviewChecklist(job) {
  const warnings = job.qa.warnings.length ? job.qa.warnings : ['No automated QA warnings were generated; BCBA review is still required.']
  return [
    heading('BCBA Review Checklist'),
    paragraph('Before using this draft, the BCBA should confirm the following:', { spacing: { after: 100 } }),
    paragraph('1. All source-supported sections accurately reflect the records reviewed.', { spacing: { after: 60 } }),
    paragraph('2. Missing or unsupported areas are corrected manually and not invented.', { spacing: { after: 60 } }),
    paragraph('3. Each recommended goal is clinically appropriate for the client and tied to source-supported deficits.', { spacing: { after: 60 } }),
    paragraph('4. Service recommendations, titration, signatures, payer language, and final formatting are reviewed before use.', { spacing: { after: 140 } }),
    heading('QA Warnings', HeadingLevel.HEADING_3),
    ...warnings.map((warning) => paragraph(warning, { spacing: { after: 60 } })),
  ]
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
          paragraph(`Template: ${job.standardTemplate.label}`, { spacing: { after: 180 } }),
          paragraph('Review status: Draft for BCBA review. This local helper does not sign, submit, or finalize reports.', { spacing: { after: 300 } }),
          ...buildSourcePacketSection(job),
          heading('Evidence Readiness'),
          ...job.evidenceReadiness.categories.map((category) => paragraph(`${category.label}: ${category.status}`, { spacing: { after: 80 } })),
          heading('Detected Assessment Inputs'),
          ...(job.assessmentAdapters.length
            ? job.assessmentAdapters.map((adapter) => paragraph(`${adapter.label}: ${adapter.use}`, { spacing: { after: 80 } }))
            : [paragraph('No recognized assessment adapters were detected. BCBA review is required.', { spacing: { after: 120 } })]),
          heading('Deficit Domains'),
          ...job.deficitProfile.domains.map((domain) => paragraph(`${domain.label}: ${domain.status}`, { spacing: { after: 80 } })),
          heading('Report Coverage Matrix'),
          paragraph(`Coverage status: ${job.coverageMatrix.status}. Source-supported sections: ${job.coverageMatrix.summary.sourceSupportedSectionCount}/${job.coverageMatrix.summary.sectionCount}. Selected goals: ${job.coverageMatrix.summary.selectedGoalCount}.`, { spacing: { after: 120 } }),
          ...job.coverageMatrix.goalDomainCoverage.map((domain) => paragraph(`${domain.domain}: ${domain.status} (${domain.goalCount} goal${domain.goalCount === 1 ? '' : 's'})`, { spacing: { after: 80 } })),
          ...buildMedicalNecessitySection(job),
          ...buildBiopsychosocialSection(job),
          ...buildClinicalProfileSection(job),
          heading('Recommended Goals'),
          ...buildGoalDomainSections(job),
          heading('Missing / Review-Required Fields'),
          ...job.clinicalProfile.missingFields.map((field) => paragraph(`${field.label}: ${field.behavior}`)),
          ...buildReviewChecklist(job),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  await writeFile(outputPath, buffer)
}

function evidenceLedgerItem(item) {
  return {
    sourceId: item.sourceId,
    filename: item.filename,
    excerpt: item.text || '',
    excerptCharacterCount: String(item.text || '').length,
  }
}

function responseEvidenceItem(item) {
  return {
    sourceId: item.sourceId,
    filename: item.filename,
    excerptStoredLocallyOnly: Boolean(item.text),
  }
}

function buildEvidenceLedger(job) {
  return {
    id: `${job.id}-evidence-ledger`,
    jobId: job.id,
    generatedAt: job.generatedAt,
    localOnly: true,
    containsPhi: true,
    dataPolicy: {
      storedLocallyOnly: true,
      returnedToSkillCascade: false,
      browserResponseContainsExcerpts: false,
    },
    standardTemplate: job.standardTemplate,
    sourceFiles: job.sourcePacket.sources.map((source) => ({
      id: source.id,
      filename: source.filename,
      relativePath: source.relativePath,
      extension: source.extension,
      characterCount: source.characterCount,
    })),
    requiredEvidence: job.evidenceReadiness.categories,
    assessmentAdapters: job.assessmentAdapters,
    coverageMatrix: job.coverageMatrix,
    deficitDomains: job.deficitProfile.domains.map((domain) => ({
      id: domain.id,
      label: domain.label,
      status: domain.status,
      goalDomains: domain.goalDomains,
      evidence: domain.sourceEvidence.map(evidenceLedgerItem),
    })),
    sections: job.clinicalProfile.sections.map((section) => ({
      id: section.id,
      label: section.label,
      status: section.status,
      missing: section.missing,
      evidence: section.sourceEvidence.map(evidenceLedgerItem),
    })),
    goals: job.goalPlan.goals.map((goal) => ({
      id: goal.id,
      domain: goal.domain,
      longTermGoalName: goal.longTermGoalName,
      shortTermGoalName: goal.shortTermGoalName,
      objective: goal.objective,
      centralReachDataType: goal.centralReachDataType,
      evidence: goal.sourceEvidence.map(evidenceLedgerItem),
    })),
    missingFields: job.clinicalProfile.missingFields,
  }
}

function sanitizeClinicalProfileForResponse(clinicalProfile) {
  return {
    ...clinicalProfile,
    sections: clinicalProfile.sections.map((section) => ({
      ...section,
      sourceEvidence: section.sourceEvidence.map(responseEvidenceItem),
    })),
  }
}

function sanitizeGoalPlanForResponse(goalPlan) {
  return {
    ...goalPlan,
    goals: goalPlan.goals.map((goal) => ({
      ...goal,
      sourceEvidence: goal.sourceEvidence.map(responseEvidenceItem),
    })),
  }
}

function sanitizeDeficitProfileForResponse(deficitProfile) {
  return {
    ...deficitProfile,
    domains: (deficitProfile.domains || []).map((domain) => ({
      ...domain,
      sourceEvidence: domain.sourceEvidence.map(responseEvidenceItem),
    })),
  }
}

export async function runLocalReportPilot({
  sourceFolder,
  outputDir,
  clientLabel = 'Local Report Client',
  reportTitle = STANDARD_REPORT_TEMPLATE.label,
  templatePath = '',
  templateProfileId = '',
  templateFieldAliases = {},
} = {}) {
  if (!sourceFolder) throw new Error('sourceFolder is required')
  if (templatePath || templateProfileId || Object.keys(templateFieldAliases || {}).length) {
    throw new Error(STANDARD_TEMPLATE_ONLY_BLOCKER)
  }
  const resolvedOutputDir = resolve(outputDir || join(sourceFolder, DEFAULT_OUTPUT_DIRECTORY_NAME))
  if (outputDirWouldHideSource(sourceFolder, resolvedOutputDir)) {
    throw new Error(outputDirSourceBlockerMessage())
  }

  await mkdir(resolvedOutputDir, { recursive: true })

  const sourcePacket = await scanLocalSourceFolder(sourceFolder, {
    excludePaths: outputDirScanExclusions(sourceFolder, resolvedOutputDir),
  })
  const evidenceReadiness = buildRequiredEvidenceReadiness(sourcePacket.sources)
  if (!evidenceReadiness.ready) {
    throw new Error(`Required source evidence is missing: ${evidenceReadiness.missingRequired.map((item) => item.label).join(', ')}.`)
  }
  const assessmentAdapters = detectAssessmentAdapters(sourcePacket.sources)
  const deficitProfile = buildLocalDeficitProfile({ sources: sourcePacket.sources })
  if (!deficitProfile.supportedGoalDomains.length) {
    throw new Error('No source-supported deficit domains were detected. Add assessment/evaluation records that clearly describe communication, social, adaptive, behavior, or caregiver-training needs.')
  }
  const clinicalProfile = buildLocalClinicalProfile({ clientLabel, sources: sourcePacket.sources })
  const goalPlan = buildLocalGoalPlan({ sources: sourcePacket.sources, deficitProfile })
  const coverageMatrix = buildReportCoverageMatrix({
    evidenceReadiness,
    assessmentAdapters,
    deficitProfile,
    clinicalProfile,
    goalPlan,
  })
  const generatedAt = new Date().toISOString()
  const safeClient = clientLabel.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'client'
  const outputPath = join(resolvedOutputDir, `${safeClient}-report-draft.docx`)
  const reviewPath = join(resolvedOutputDir, `${safeClient}-review-summary.json`)
  const evidenceLedgerPath = join(resolvedOutputDir, `${safeClient}-evidence-ledger.json`)

  const job = {
    id: `local-report-${Date.now()}`,
    localOnly: true,
    sourceFolder: sourcePacket.sourceFolder,
    outputDir: resolvedOutputDir,
    outputStrategy: outputDirStrategy(sourceFolder, resolvedOutputDir, outputDir),
    clientLabel,
    reportTitle,
    generatedAt,
    sourcePacket,
    standardTemplate: STANDARD_REPORT_TEMPLATE,
    evidenceReadiness,
    assessmentAdapters,
    deficitProfile,
    clinicalProfile,
    goalPlan,
    coverageMatrix,
    outputPath,
    templatePath: '',
    templateProfileId: '',
    templateProfileLabel: '',
    templateFieldAliases: {},
    templateProfile: null,
    templateMode: STANDARD_REPORT_TEMPLATE.mode,
    qa: {
      status: 'ready-for-bcba-review',
      blockers: [],
      warnings: [
        ...evidenceReadiness.missingRequired.map((item) => `Missing required evidence: ${item.label}`),
        ...clinicalProfile.missingFields.map((field) => `Missing source support: ${field.label}`),
        ...deficitProfile.missingDeficitDomains.map((domain) => `Deficit domain not clearly supported: ${domain.label}`),
        ...sourcePacket.unsupportedFiles.map((file) => `Unsupported local source not extracted: ${file.relativePath}`),
        ...(goalPlan.goals.length ? [] : ['No source-supported goals were selected automatically.']),
      ],
      liveWriteAttempted: false,
      autoSignAttempted: false,
      autoSubmitAttempted: false,
    },
  }

  await writeGeneratedDocx({ outputPath, job })

  const evidenceLedger = buildEvidenceLedger(job)
  await writeFile(evidenceLedgerPath, JSON.stringify(evidenceLedger, null, 2))

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
    standardTemplate: STANDARD_REPORT_TEMPLATE,
    evidenceReadiness,
    assessmentAdapters,
    deficitProfile: sanitizeDeficitProfileForResponse(deficitProfile),
    coverageMatrix,
    templateProfile: null,
    missingFields: clinicalProfile.missingFields,
    goalCount: goalPlan.goals.length,
    goalsByDomain: goalPlan.domains,
    evidenceLedgerPath,
    evidenceSummary: {
      sectionEvidenceCount: evidenceLedger.sections.reduce((total, section) => total + section.evidence.length, 0),
      goalEvidenceCount: evidenceLedger.goals.reduce((total, goal) => total + goal.evidence.length, 0),
      coverageStatus: coverageMatrix.status,
      missingSectionCount: coverageMatrix.summary.missingSectionCount,
      goalDomainsWithGoals: coverageMatrix.summary.goalDomainsWithGoals,
      excerptTextStoredLocallyOnly: true,
    },
    qa: job.qa,
    outputPath,
  }, null, 2))

  return {
    ...job,
    reviewPath,
    evidenceLedgerPath,
    clinicalProfile: sanitizeClinicalProfileForResponse(job.clinicalProfile),
    evidenceReadiness,
    assessmentAdapters,
    deficitProfile: sanitizeDeficitProfileForResponse(job.deficitProfile),
    coverageMatrix: job.coverageMatrix,
    goalPlan: sanitizeGoalPlanForResponse(job.goalPlan),
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
