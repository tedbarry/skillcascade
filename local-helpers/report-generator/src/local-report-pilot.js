import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import mammoth from 'mammoth'
import JSZip from 'jszip'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
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
const MODULE_DIRECTORY = dirname(fileURLToPath(import.meta.url))
const STANDARD_TEMPLATE_DOCX_PATH = resolve(MODULE_DIRECTORY, '..', 'assets', 'standard-initial-assessment-template.docx')
const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const DEFAULT_OUTPUT_DIRECTORY_NAME = 'report-generator-output'
const LEGACY_OUTPUT_DIRECTORY_NAMES = ['report-pilot-output']
const SKIP_DIRECTORY_NAMES = new Set(['.git', 'node_modules', DEFAULT_OUTPUT_DIRECTORY_NAME, ...LEGACY_OUTPUT_DIRECTORY_NAMES, 'verification-output'])
const STANDARD_TEMPLATE_ONLY_BLOCKER = 'Customer Word templates are disabled for this workflow. SkillCascade uses the standard initial assessment template automatically.'
const REVIEW_NEEDED = 'Not provided in the source packet; BCBA to verify before finalization.'
const CHECKED_BOX = '\u2612'
const UNCHECKED_BOX = '\u2610'
const STANDARD_TEMPLATE_TABLE_COUNT = 15
const UNRESOLVED_TEMPLATE_PHRASES = [
  'Write what ABA methods',
  'Please specify specific long term goals',
  'Client is a(n)',
  'full term/premature',
  'school name full time',
  'Four to five sentences',
  'Please identify as Mild',
  'Click or tap here',
  'REVIEW_UNSUPPORTED_TEMPLATE_FIELD',
  'Review required:',
]

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
    keywords: ['srs-2', 'srs2', 'social responsiveness scale'],
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
    keywords: ['vb-mapp', 'vbmapp', 'verbal behavior milestones assessment', 'milestones assessment'],
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
    keywords: ['speech-language evaluation', 'speech language evaluation', 'speech therapy', 'language evaluation', 'pragmatic language assessment', 'articulation assessment'],
    use: 'communication and pragmatic-language goal rationale',
  },
  {
    id: 'ot_sensory',
    label: 'OT / Sensory Documentation',
    kind: 'related-service',
    keywords: ['occupational therapy', 'ot evaluation', 'fine motor', 'gross motor', 'adaptive equipment', 'sensory profile'],
    use: 'sensory, motor, and adaptive support context',
  },
  {
    id: 'school_iep',
    label: 'School / IEP Documentation',
    kind: 'education',
    keywords: ['iep', 'individualized education program', 'school report', 'classroom observation', 'teacher report', 'educational evaluation', 'special education placement'],
    use: 'educational history and school-functioning context when clinically relevant',
  },
  {
    id: 'ados2',
    label: 'ADOS-2 / Autism Diagnostic Observation Schedule',
    kind: 'diagnostic-assessment',
    keywords: ['ados-2', 'ados2', 'autism diagnostic observation schedule', 'social affect total', 'comparison score'],
    use: 'ADOS classification, autism symptom severity, social affect, and restricted/repetitive behavior score interpretation',
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

const GOAL_DOMAIN_ORDER = ['Behavior', 'Communication', 'Social', 'Social Skills Group', 'Parent Training']

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
    keywords: ['school', 'education', 'iep', 'classroom', 'teacher', 'educational', 'academic'],
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

const SOURCE_SECTION_HEADINGS = [
  'Reason for Referral',
  'Developmental and Psychosocial History',
  'Developmental History',
  'Psychosocial History',
  'Behavioral Observations',
  'Behavioral Observation',
  'ADOS-2 Results',
  'ADOS-2',
  'Interpretation of Results',
  'DSM-5-TR Diagnostic Criteria Alignment',
  'DSM-5 Diagnostic Criteria Alignment',
  'Criterion A',
  'Criterion B',
  'Differential Diagnosis',
  'Functional Impairment Across Settings',
  'Functional Impairment',
  'Diagnostic Impression',
  'Diagnosis',
  'Medical Necessity for ABA Services',
  'Medical Necessity',
  'Summary',
  'Recommendations',
  'Family History',
  'Educational History',
  'Intake',
  'Parent Report',
  'Caregiver Report',
  'Vineland-3',
  'Vineland',
  'SRS-2',
]

const SECTION_PREFERENCES = {
  diagnosisSummary: [
    'diagnostic impression',
    'diagnosis',
    'dsm-5-tr diagnostic criteria alignment',
    'dsm-5 diagnostic criteria alignment',
    'interpretation of results',
    'summary',
  ],
  familyHistory: [
    'family history',
    'parent report',
    'caregiver report',
    'developmental and psychosocial history',
    'reason for referral',
    'functional impairment across settings',
  ],
  developmentalHistory: [
    'developmental and psychosocial history',
    'developmental history',
    'psychosocial history',
    'criterion b',
  ],
  educationalHistory: [
    'educational history',
    'functional impairment across settings',
    'functional impairment',
    'developmental and psychosocial history',
    'reason for referral',
  ],
  behaviorProfile: [
    'criterion b',
    'functional impairment across settings',
    'behavioral observations',
    'behavioral observation',
    'reason for referral',
    'medical necessity for aba services',
    'medical necessity',
  ],
  communicationProfile: [
    'behavioral observations',
    'behavioral observation',
    'criterion a',
    'developmental and psychosocial history',
    'medical necessity for aba services',
    'medical necessity',
  ],
  socialProfile: [
    'behavioral observations',
    'behavioral observation',
    'criterion a',
    'interpretation of results',
    'developmental and psychosocial history',
  ],
  caregiverTraining: [
    'medical necessity for aba services',
    'medical necessity',
    'parent report',
    'caregiver report',
    'family history',
    'functional impairment across settings',
  ],
}

const FRONT_MATTER_START_HEADINGS = [
  'Reason for Referral',
  'Developmental and Psychosocial History',
  'Developmental History',
  'Behavioral Observations',
  'Intake',
  'Family History',
  'Vineland',
  'SRS-2',
]

const HEADER_LINE_PATTERNS = [
  /\bphone\b/i,
  /\bfax\b/i,
  /\bemail\b/i,
  /\baddress\b/i,
  /\blicense\b/i,
  /\blicensed\b/i,
  /\bpsychologist\b/i,
  /\bprovider\b/i,
  /\bpage\s+\d+\b/i,
  /^\d{1,5}\s+\w+.*\b(street|st\.|avenue|ave\.|road|rd\.|suite|ste)\b/i,
]

const STANDARD_SEVERE_BEHAVIOR_GOAL_IDS = [
  'behavior-aggression',
  'behavior-verbal-aggression',
  'behavior-profane-language',
  'behavior-noncompliance',
  'behavior-property-destruction',
  'behavior-elopement',
  'behavior-unsafe-behavior',
]

const FERB_GOAL_IDS = [
  'communication-emotional-expression',
  'communication-break-request',
  'communication-help-request',
  'social-reentry',
  'communication-boundary-setting',
  'communication-transition-communication',
]

const GOAL_LIBRARY = [
  {
    id: 'behavior-aggression',
    domain: 'Behavior',
    longTermGoalName: 'Aggression',
    shortTermGoalName: 'Physical Aggression',
    objective: 'The client will decrease instances of physical aggression.',
    keywords: ['aggression', 'physical aggression', 'hitting', 'kicking', 'biting'],
    deficitDomains: ['maladaptiveBehavior'],
    centralReachDataType: 'frequency',
    requiresDirectEvidence: true,
    baseline: '6 instances per session',
  },
  {
    id: 'behavior-verbal-aggression',
    domain: 'Behavior',
    longTermGoalName: 'Aggression',
    shortTermGoalName: 'Verbal Aggression',
    objective: 'The client will decrease instances of verbal aggression.',
    keywords: ['verbal aggression', 'threat', 'yelling', 'screaming', 'hostile language'],
    deficitDomains: ['maladaptiveBehavior'],
    centralReachDataType: 'frequency',
    requiresDirectEvidence: true,
    baseline: '6 instances per session',
  },
  {
    id: 'behavior-noncompliance',
    domain: 'Behavior',
    longTermGoalName: 'Compliance',
    shortTermGoalName: 'Non-Compliance',
    objective: 'The client will decrease non-compliance.',
    keywords: ['noncompliance', 'non-compliance', 'refusal', 'refuse'],
    deficitDomains: ['maladaptiveBehavior', 'flexibilityRrb'],
    centralReachDataType: 'frequency',
    requiresDirectEvidence: true,
    baseline: '5 instances per session',
  },
  {
    id: 'behavior-property-destruction',
    domain: 'Behavior',
    longTermGoalName: 'Property Destruction',
    shortTermGoalName: 'Property Destruction',
    objective: 'The client will decrease instances of property destruction.',
    keywords: ['property destruction', 'destroy', 'throwing objects', 'breaking items', 'damaging property'],
    deficitDomains: ['maladaptiveBehavior'],
    centralReachDataType: 'frequency',
    requiresDirectEvidence: true,
    baseline: '5 instances per session',
  },
  {
    id: 'behavior-profane-language',
    domain: 'Behavior',
    longTermGoalName: 'Profane Language',
    shortTermGoalName: 'Profane Language',
    objective: 'The client will decrease the use of profane language.',
    keywords: ['profane', 'profanity', 'cursing', 'inappropriate language'],
    deficitDomains: ['maladaptiveBehavior'],
    centralReachDataType: 'frequency',
    requiresDirectEvidence: true,
    baseline: '5 instances per session',
  },
  {
    id: 'behavior-elopement',
    domain: 'Behavior',
    longTermGoalName: 'Elopement',
    shortTermGoalName: 'Elopement',
    objective: 'The client will decrease elopement.',
    keywords: ['elopement', 'elope', 'run away', 'unsafe'],
    deficitDomains: ['maladaptiveBehavior'],
    centralReachDataType: 'frequency',
    requiresDirectEvidence: true,
    baseline: '5 instances per session',
  },
  {
    id: 'behavior-unsafe-behavior',
    domain: 'Behavior',
    longTermGoalName: 'Unsafe Behaviors',
    shortTermGoalName: 'Unsafe Behaviors',
    objective: 'The client will decrease unsafe behaviors.',
    keywords: ['unsafe behavior', 'unsafe behaviors', 'safety concerns', 'safety risk', 'dangerous'],
    deficitDomains: ['maladaptiveBehavior'],
    centralReachDataType: 'frequency',
    requiresDirectEvidence: true,
    baseline: '5 instances per session',
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
    id: 'communication-break-request',
    domain: 'Communication',
    longTermGoalName: 'Functional Communication',
    shortTermGoalName: 'Break Request',
    objective: 'The client will appropriately request a break before escalation when demands, transitions, or sensory load become difficult.',
    keywords: ['break', 'frustration', 'demand', 'transition', 'sensory'],
    deficitDomains: ['communication', 'maladaptiveBehavior', 'flexibilityRrb'],
    centralReachDataType: 'percent',
  },
  {
    id: 'communication-help-request',
    domain: 'Communication',
    longTermGoalName: 'Functional Communication',
    shortTermGoalName: 'Help Request',
    objective: 'The client will ask for help when a task is difficult, unclear, or overwhelming before disengaging or escalating.',
    keywords: ['help', 'difficult', 'unclear', 'comprehension', 'confusing'],
    deficitDomains: ['communication', 'adaptiveDailyLiving', 'maladaptiveBehavior'],
    centralReachDataType: 'percent',
  },
  {
    id: 'communication-clarification',
    domain: 'Communication',
    longTermGoalName: 'Receptive Communication',
    shortTermGoalName: 'Request Clarification',
    objective: 'The client will request clarification, repetition, or a demonstration when directions are confusing before refusing or disengaging.',
    keywords: ['repetition', 'simplification', 'understanding questions', 'comprehension', 'directions'],
    deficitDomains: ['communication', 'adaptiveDailyLiving'],
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
    id: 'communication-emotional-expression',
    domain: 'Communication',
    longTermGoalName: 'Emotional Communication',
    shortTermGoalName: 'Express Internal State',
    objective: 'The client will identify and communicate emotional states, frustration, or internal needs before escalation occurs.',
    keywords: ['emotion', 'emotional', 'internal', 'frustration', 'distress'],
    deficitDomains: ['communication', 'maladaptiveBehavior', 'flexibilityRrb'],
    centralReachDataType: 'percent',
  },
  {
    id: 'communication-self-advocacy',
    domain: 'Communication',
    longTermGoalName: 'Self-Advocacy',
    shortTermGoalName: 'Advocate for Needs',
    objective: 'The client will advocate for a needed accommodation, support, or change in plan using appropriate language.',
    keywords: ['self-advocacy', 'advocate', 'accommodation', 'support', 'need'],
    deficitDomains: ['communication', 'adaptiveDailyLiving', 'maladaptiveBehavior'],
    centralReachDataType: 'percent',
  },
  {
    id: 'communication-boundary-setting',
    domain: 'Communication',
    longTermGoalName: 'Self-Advocacy',
    shortTermGoalName: 'Boundary Setting',
    objective: 'The client will communicate refusal, boundary-setting, or personal needs appropriately using an effective communication mode.',
    keywords: ['refusal', 'personal needs', 'boundary', 'space', 'communication'],
    deficitDomains: ['communication', 'maladaptiveBehavior'],
    centralReachDataType: 'percent',
  },
  {
    id: 'communication-attention',
    domain: 'Communication',
    longTermGoalName: 'Functional Communication',
    shortTermGoalName: 'Appropriate Attention',
    objective: 'The client will appropriately initiate attention from adults or peers instead of using disruptive or unsafe communication responses.',
    keywords: ['attention', 'peer', 'adult', 'initiate', 'disruptive'],
    deficitDomains: ['communication', 'social', 'maladaptiveBehavior'],
    centralReachDataType: 'percent',
  },
  {
    id: 'communication-question-asking',
    domain: 'Communication',
    longTermGoalName: 'Conversational Communication',
    shortTermGoalName: 'Ask Relevant Questions',
    objective: 'The client will ask contextually relevant questions during conversation, instruction, or problem-solving interactions.',
    keywords: ['conversation', 'question', 'reciprocal', 'social communication'],
    deficitDomains: ['communication', 'social'],
    centralReachDataType: 'percent',
  },
  {
    id: 'communication-context-comments',
    domain: 'Communication',
    longTermGoalName: 'Conversational Communication',
    shortTermGoalName: 'Contextual Comments',
    objective: 'The client will make contextually relevant comments that relate to the activity, listener, or topic during reciprocal exchanges.',
    keywords: ['comment', 'conversation', 'reciprocal', 'topic'],
    deficitDomains: ['communication', 'social'],
    centralReachDataType: 'percent',
  },
  {
    id: 'communication-nonverbal-integration',
    domain: 'Communication',
    longTermGoalName: 'Social-Pragmatic Communication',
    shortTermGoalName: 'Integrate Nonverbal Communication',
    objective: 'The client will integrate verbal communication with appropriate gaze, gestures, body orientation, or facial affect during interactions.',
    keywords: ['eye contact', 'gaze', 'gesture', 'nonverbal', 'facial expression', 'body language'],
    deficitDomains: ['communication', 'social'],
    centralReachDataType: 'percent',
  },
  {
    id: 'communication-topic-maintenance',
    domain: 'Communication',
    longTermGoalName: 'Conversational Communication',
    shortTermGoalName: 'Maintain Topic',
    objective: 'The client will maintain a shared topic for multiple conversational turns without shifting exclusively to demands or preferred interests.',
    keywords: ['conversation', 'topic', 'preferred interests', 'reciprocal'],
    deficitDomains: ['communication', 'social', 'flexibilityRrb'],
    centralReachDataType: 'percent',
  },
  {
    id: 'communication-problem-reporting',
    domain: 'Communication',
    longTermGoalName: 'Problem Reporting',
    shortTermGoalName: 'Report Problems',
    objective: 'The client will report a problem, safety concern, or conflict to an adult using clear and appropriate communication.',
    keywords: ['problem', 'safety', 'conflict', 'adult support', 'unsafe'],
    deficitDomains: ['communication', 'maladaptiveBehavior', 'adaptiveDailyLiving'],
    centralReachDataType: 'percent',
  },
  {
    id: 'communication-transition-communication',
    domain: 'Communication',
    longTermGoalName: 'Transition Communication',
    shortTermGoalName: 'Communicate During Transitions',
    objective: 'The client will communicate support needs during transitions before engaging in refusal, elopement, or unsafe behavior.',
    keywords: ['transition', 'refusal', 'elopement', 'support'],
    deficitDomains: ['communication', 'maladaptiveBehavior', 'flexibilityRrb'],
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
    id: 'social-initiation',
    domain: 'Social',
    longTermGoalName: 'Social Initiation',
    shortTermGoalName: 'Initiate Social Interaction',
    objective: 'The client will initiate appropriate social interaction with adults or peers using a greeting, comment, question, or shared activity bid.',
    keywords: ['initiate', 'social initiation', 'peer', 'adult', 'social'],
    deficitDomains: ['social', 'communication'],
    centralReachDataType: 'percent',
  },
  {
    id: 'social-response',
    domain: 'Social',
    longTermGoalName: 'Social Responsiveness',
    shortTermGoalName: 'Respond to Social Bids',
    objective: 'The client will respond to social bids from adults or peers with an appropriate verbal, gestural, or activity-based response.',
    keywords: ['respond', 'social bids', 'peer', 'reciprocal', 'social'],
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
    id: 'social-turn-taking',
    domain: 'Social',
    longTermGoalName: 'Cooperative Participation',
    shortTermGoalName: 'Turn Taking',
    objective: 'The client will participate in turn-taking routines while waiting, sharing materials, and responding to the actions of others.',
    keywords: ['turn', 'sharing', 'peer', 'play', 'cooperative'],
    deficitDomains: ['social', 'adaptiveDailyLiving'],
    centralReachDataType: 'percent',
  },
  {
    id: 'social-perspective-taking',
    domain: 'Social',
    longTermGoalName: 'Perspective Taking',
    shortTermGoalName: 'Identify Others Perspectives',
    objective: 'The client will identify another person\u2019s perspective, emotion, or possible reason for behavior during structured social problem-solving.',
    keywords: ['perspective', 'emotion', 'social insight', 'relationship', 'peer'],
    deficitDomains: ['social', 'communication'],
    centralReachDataType: 'percent',
  },
  {
    id: 'social-conflict-repair',
    domain: 'Social',
    longTermGoalName: 'Social Problem Solving',
    shortTermGoalName: 'Conflict Repair',
    objective: 'The client will use an appropriate repair response following conflict, correction, or social misunderstanding.',
    keywords: ['conflict', 'repair', 'social problem', 'misunderstanding', 'peer'],
    deficitDomains: ['social', 'communication', 'maladaptiveBehavior'],
    centralReachDataType: 'percent',
  },
  {
    id: 'social-accept-different-opinion',
    domain: 'Social',
    longTermGoalName: 'Flexible Social Responding',
    shortTermGoalName: 'Accept Differing Opinions',
    objective: 'The client will accept a differing opinion or adult/peer perspective in a constructive manner without arguing or escalating.',
    keywords: ['opinion', 'arguing', 'rigid', 'flexibility', 'perspective'],
    deficitDomains: ['social', 'flexibilityRrb', 'maladaptiveBehavior'],
    centralReachDataType: 'percent',
  },
  {
    id: 'social-flexible-play',
    domain: 'Social',
    longTermGoalName: 'Flexible Social Participation',
    shortTermGoalName: 'Flexible Play or Activity',
    objective: 'The client will tolerate changes in shared play, activity rules, or peer suggestions while maintaining safe and appropriate participation.',
    keywords: ['flexibility', 'play', 'transition', 'change', 'peer'],
    deficitDomains: ['social', 'flexibilityRrb'],
    centralReachDataType: 'percent',
  },
  {
    id: 'social-group-participation',
    domain: 'Social',
    longTermGoalName: 'Group Participation',
    shortTermGoalName: 'Participate in Group Activity',
    objective: 'The client will participate in a structured group activity by following group expectations and responding to peers or adults appropriately.',
    keywords: ['group', 'classroom', 'peer', 'participation', 'school'],
    deficitDomains: ['social', 'adaptiveDailyLiving'],
    centralReachDataType: 'percent',
  },
  {
    id: 'social-emotional-sharing',
    domain: 'Social',
    longTermGoalName: 'Social-Emotional Reciprocity',
    shortTermGoalName: 'Share Emotions or Interests',
    objective: 'The client will share emotions, interests, or experiences with another person during structured or natural interactions.',
    keywords: ['share', 'emotion', 'interests', 'reciprocal', 'affect'],
    deficitDomains: ['social', 'communication'],
    centralReachDataType: 'percent',
  },
  {
    id: 'social-friendship-skills',
    domain: 'Social',
    longTermGoalName: 'Relationship Skills',
    shortTermGoalName: 'Friendship Skills',
    objective: 'The client will demonstrate friendship-building behaviors such as joining, inviting, responding, and maintaining shared activities.',
    keywords: ['friend', 'relationship', 'peer', 'social isolation', 'social'],
    deficitDomains: ['social'],
    centralReachDataType: 'percent',
  },
  {
    id: 'social-personal-space',
    domain: 'Social',
    longTermGoalName: 'Social Boundaries',
    shortTermGoalName: 'Personal Space',
    objective: 'The client will maintain appropriate personal space and body orientation during adult or peer interactions.',
    keywords: ['personal space', 'body orientation', 'peer', 'social', 'nonverbal'],
    deficitDomains: ['social', 'communication'],
    centralReachDataType: 'percent',
  },
  {
    id: 'social-calm-advocacy',
    domain: 'Social',
    longTermGoalName: 'Social Self-Advocacy',
    shortTermGoalName: 'Calm Advocacy',
    objective: 'The client will state a concern or disagreement using calm, respectful language and an appropriate request.',
    keywords: ['concern', 'disagreement', 'arguing', 'frustration', 'fair'],
    deficitDomains: ['social', 'communication', 'maladaptiveBehavior'],
    centralReachDataType: 'percent',
  },
  {
    id: 'social-reentry',
    domain: 'Social',
    longTermGoalName: 'Social Re-Engagement',
    shortTermGoalName: 'Rejoin After Frustration',
    objective: 'The client will rejoin an activity or interaction after frustration, correction, or a break using an appropriate re-entry routine.',
    keywords: ['rejoin', 'break', 'frustration', 'correction', 'peer'],
    deficitDomains: ['social', 'maladaptiveBehavior', 'flexibilityRrb'],
    centralReachDataType: 'percent',
  },
  {
    id: 'social-group-discussions',
    domain: 'Social Skills Group',
    longTermGoalName: 'Group Discussions',
    shortTermGoalName: 'Group Discussions',
    objective: 'The client will actively participate in the group discussion by raising his hand to ask or answer a question posed by the group leader 2 times per session with a verbal prompt.',
    keywords: ['group', 'discussion', 'question', 'peer', 'social'],
    deficitDomains: ['social', 'communication', 'adaptiveDailyLiving'],
    centralReachDataType: 'percent',
  },
  {
    id: 'social-group-instruction',
    domain: 'Social Skills Group',
    longTermGoalName: 'Group Instruction',
    shortTermGoalName: 'Group Instruction',
    objective: 'The client will wait for his turn to speak by raising his hand during group instruction in the absence of maladaptive behaviors with 2 verbal prompts.',
    keywords: ['group', 'instruction', 'turn', 'wait', 'maladaptive'],
    deficitDomains: ['social', 'communication', 'maladaptiveBehavior'],
    centralReachDataType: 'percent',
  },
  {
    id: 'social-group-structured-peer-play',
    domain: 'Social Skills Group',
    longTermGoalName: 'Structured Peer Play',
    shortTermGoalName: 'Structured Peer Play',
    objective: 'The client will suggest or join a structured play activity with peers, such as a sports game or art project, for 2 minutes per opportunity.',
    keywords: ['peer', 'play', 'structured', 'activity', 'group'],
    deficitDomains: ['social', 'adaptiveDailyLiving'],
    centralReachDataType: 'percent',
  },
  {
    id: 'social-group-peer-tolerance',
    domain: 'Social Skills Group',
    longTermGoalName: 'Peer Tolerance',
    shortTermGoalName: 'Peer Tolerance',
    objective: 'The client will tolerate another peer when he feels the game is not fair with prompting.',
    keywords: ['peer', 'tolerance', 'fair', 'game', 'frustration'],
    deficitDomains: ['social', 'flexibilityRrb', 'maladaptiveBehavior'],
    centralReachDataType: 'percent',
  },
  {
    id: 'social-group-feedback-tolerance',
    domain: 'Social Skills Group',
    longTermGoalName: 'Feedback Tolerance',
    shortTermGoalName: 'Feedback Tolerance',
    objective: 'The client will respond to feedback with a simple acknowledgment or thank you once per session.',
    keywords: ['feedback', 'tolerance', 'correction', 'social', 'group'],
    deficitDomains: ['social', 'communication', 'flexibilityRrb'],
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
  {
    id: 'parent-training-behavior-plan',
    domain: 'Parent Training',
    longTermGoalName: 'Caregiver Implementation',
    shortTermGoalName: 'Behavior Plan Implementation',
    objective: 'The caregiver will implement antecedent strategies, prompting procedures, reinforcement, and response strategies from the behavior plan with fidelity.',
    keywords: ['caregiver', 'parent', 'behavior plan', 'bip', 'reinforcement'],
    deficitDomains: ['caregiverTraining', 'maladaptiveBehavior'],
    centralReachDataType: 'percent',
  },
  {
    id: 'parent-training-data',
    domain: 'Parent Training',
    longTermGoalName: 'Caregiver Data and Generalization',
    shortTermGoalName: 'Home Data Collection',
    objective: 'The caregiver will collect or report behavior and replacement-skill data needed to support treatment decisions and generalization.',
    keywords: ['caregiver', 'parent', 'data', 'home', 'generalization'],
    deficitDomains: ['caregiverTraining', 'maladaptiveBehavior', 'adaptiveDailyLiving'],
    centralReachDataType: 'percent',
  },
  {
    id: 'parent-training-crisis-prevention',
    domain: 'Parent Training',
    longTermGoalName: 'Caregiver Safety Support',
    shortTermGoalName: 'Crisis Prevention',
    objective: 'The caregiver will implement prevention and de-escalation strategies during early signs of dysregulation or unsafe behavior.',
    keywords: ['caregiver', 'parent', 'safety', 'de-escalation', 'unsafe'],
    deficitDomains: ['caregiverTraining', 'maladaptiveBehavior'],
    centralReachDataType: 'percent',
  },
]

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeSourceLineBreaks(value) {
  return String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripTrailingHeadingPunctuation(value) {
  return normalizeText(value).replace(/[:\-]+$/g, '').trim()
}

function sectionKey(value) {
  return stripTrailingHeadingPunctuation(value).toLowerCase()
}

function isLikelySourceHeading(line) {
  const cleaned = stripTrailingHeadingPunctuation(line)
  if (!cleaned) return false
  return SOURCE_SECTION_HEADINGS.some((heading) => cleaned.toLowerCase() === heading.toLowerCase())
}

function cleanExtractedSourceText(value) {
  let text = normalizeSourceLineBreaks(value)
  if (!text) return ''

  const startCandidates = FRONT_MATTER_START_HEADINGS
    .map((heading) => {
      const match = text.match(new RegExp(`(^|\\n)\\s*${escapeRegex(heading)}\\s*:?`, 'i'))
      return match ? match.index + (match[1] ? match[1].length : 0) : -1
    })
    .filter((index) => index >= 0)
  if (startCandidates.length) {
    text = text.slice(Math.min(...startCandidates)).trim()
  }

  const lines = text.split('\n')
  const cleanedLines = []
  for (const line of lines) {
    if (!line) {
      cleanedLines.push(line)
      continue
    }
    if (!isLikelySourceHeading(line) && HEADER_LINE_PATTERNS.some((pattern) => pattern.test(line))) {
      continue
    }
    cleanedLines.push(line)
  }
  return cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function splitSentences(text) {
  return normalizeSourceLineBreaks(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !HEADER_LINE_PATTERNS.some((pattern) => pattern.test(sentence)))
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

function matchingSentences(sources, keywords, limit = 4) {
  const matches = []
  const seen = new Set()
  for (const source of sources) {
    const sentences = splitSentences(source.text)
    for (const sentence of sentences) {
      if (!keywords.some((keyword) => sourceHasKeyword(sentence, keyword))) continue
      const normalized = normalizeText(sentence).toLowerCase()
      if (!normalized || seen.has(normalized)) continue
      seen.add(normalized)
      matches.push({
        sourceId: source.id,
        filename: source.filename,
        text: sentence.slice(0, 650),
      })
      if (matches.length >= limit) return matches
    }
  }
  return matches
}

function extractNamedSourceSections(text) {
  const lines = normalizeSourceLineBreaks(text).split('\n')
  const sections = []
  let current = null

  function finishCurrent() {
    if (!current) return
    const textValue = current.lines.join('\n').trim()
    if (textValue) {
      sections.push({
        heading: current.heading,
        key: sectionKey(current.heading),
        text: textValue,
      })
    }
  }

  for (const line of lines) {
    if (isLikelySourceHeading(line)) {
      finishCurrent()
      current = {
        heading: stripTrailingHeadingPunctuation(line),
        lines: [],
      }
      continue
    }
    if (!current) {
      current = {
        heading: 'Source Text',
        lines: [],
      }
    }
    current.lines.push(line)
  }

  finishCurrent()
  return sections
}

function sourceSectionText(source, preferredKeys = []) {
  if (!source?.sections?.length) return ''
  const wanted = preferredKeys.map(sectionKey)
  const sections = wanted.length
    ? source.sections.filter((section) => wanted.includes(section.key))
    : source.sections
  return sections.map((section) => section.text).filter(Boolean).join('\n\n')
}

function matchingSectionSentences(sources, sectionId, keywords, limit = 5) {
  const matches = []
  const seen = new Set()
  const preferredKeys = SECTION_PREFERENCES[sectionId] || []
  const sourcePasses = preferredKeys.length ? ['preferred', 'all'] : ['all']

  for (const pass of sourcePasses) {
    for (const source of sources) {
      const sourceText = pass === 'preferred'
        ? sourceSectionText(source, preferredKeys)
        : source.text
      if (!sourceText) continue
      const sentences = splitSentences(sourceText)
      for (const sentence of sentences) {
        const keywordMatched = keywords.some((keyword) => sourceHasKeyword(sentence, keyword))
        const includePreferredSectionLead = pass === 'preferred'
          && matches.length === 0
          && sentence.length >= 35
        if (!keywordMatched && !includePreferredSectionLead) continue
        const normalized = normalizeText(sentence).toLowerCase()
        if (!normalized || seen.has(normalized)) continue
        seen.add(normalized)
        matches.push({
          sourceId: source.id,
          filename: source.filename,
          text: sentence.slice(0, 650),
          section: pass === 'preferred' ? preferredKeys.join(', ') : '',
        })
        if (matches.length >= limit) return matches
      }
    }
  }
  return matches
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

function firstRegex(text, pattern) {
  const match = String(text || '').match(pattern)
  return match ? normalizeText(match[1] || match[0]) : ''
}

function firstSectionText(sources, keys = []) {
  for (const source of sources || []) {
    const text = sourceSectionText(source, keys)
    if (text) return text
  }
  return ''
}

function combinedSectionText(sources, keys = []) {
  return (sources || [])
    .map((source) => sourceSectionText(source, keys))
    .filter(Boolean)
    .join('\n\n')
}

function compactEvidenceText(value, maxLength = 620) {
  const text = normalizeText(value)
  if (!text) return ''
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text
}

function firstMeaningfulSentence(text, keywords = []) {
  const sentences = splitSentences(text)
  if (!sentences.length) return ''
  if (keywords.length) {
    const match = sentences.find((sentence) => keywords.some((keyword) => sourceHasKeyword(sentence, keyword)))
    if (match) return compactEvidenceText(match, 520)
  }
  return compactEvidenceText(sentences[0], 520)
}

function meaningfulSentenceGroup(text, keywords = [], limit = 2) {
  const sentences = splitSentences(text)
  if (!sentences.length) return ''
  const selected = []
  const seen = new Set()
  for (const sentence of sentences) {
    if (keywords.length && !keywords.some((keyword) => sourceHasKeyword(sentence, keyword))) continue
    const key = normalizeText(sentence).toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    selected.push(sentence)
    if (selected.length >= limit) break
  }
  const fallback = selected.length ? selected : sentences.slice(0, limit)
  return compactEvidenceText(fallback.join(' '), 760)
}

function detectSourceBehaviors(text) {
  const normalized = normalizeText(text).toLowerCase()
  const behaviorRules = [
    { label: 'physical aggression', terms: ['physical aggression', 'aggressive behavior', 'aggression', 'explosive aggression'] },
    { label: 'verbal aggression', terms: ['verbal aggression', 'threatening', 'hostile language', 'yelling', 'screaming'] },
    { label: 'non-compliance', terms: ['noncompliance', 'non-compliance', 'refusal', 'task refusal'] },
    { label: 'property destruction', terms: ['property destruction', 'damaging property', 'breaking items', 'throwing objects'] },
    { label: 'profane language', terms: ['profane language', 'profanity', 'cursing', 'inappropriate language'] },
    { label: 'elopement', terms: ['elopement', 'elope', 'run away', 'leaving supervised'] },
    { label: 'unsafe behavior', terms: ['unsafe behavior', 'unsafe behaviors', 'safety concerns', 'safety risk', 'crisis involvement'] },
    { label: 'emotional dysregulation', terms: ['emotional dysregulation', 'dysregulation', 'explosive behavior', 'distress'] },
  ]
  return behaviorRules
    .filter((rule) => rule.terms.some((term) => normalized.includes(term)))
    .map((rule) => rule.label)
}

function uniqueList(items = []) {
  return Array.from(new Set(items.map((item) => normalizeText(item)).filter(Boolean)))
}

export function buildLocalClinicalFacts({ sources = [] } = {}) {
  const fullText = sources.map((source) => source.text || '').join('\n\n')
  const reasonForReferral = firstSectionText(sources, ['reason for referral'])
  const developmental = combinedSectionText(sources, [
    'developmental and psychosocial history',
    'developmental history',
    'psychosocial history',
  ])
  const observations = combinedSectionText(sources, ['behavioral observations', 'behavioral observation'])
  const criterionA = combinedSectionText(sources, ['criterion a'])
  const criterionB = combinedSectionText(sources, ['criterion b'])
  const interpretation = combinedSectionText(sources, ['interpretation of results'])
  const impairment = combinedSectionText(sources, [
    'functional impairment across settings',
    'functional impairment',
  ])
  const diagnosisSection = combinedSectionText(sources, ['diagnostic impression', 'diagnosis'])
  const medicalNecessity = combinedSectionText(sources, [
    'medical necessity for aba services',
    'medical necessity',
  ])

  const diagnosis = firstRegex(`${diagnosisSection}\n${fullText}`, /(Autism Spectrum Disorder\s*\(?F?84\.0\)?)/i)
    || firstRegex(fullText, /(autism spectrum disorder)/i)
  const diagnosisCode = firstRegex(`${diagnosisSection}\n${fullText}`, /(F84\.0)/i)
  const supportLevel = firstRegex(`${diagnosisSection}\n${fullText}`, /(Level\s*\d+(?:\s*[-–]\s*\d+)?[^.\n]*)/i)
  const coOccurringText = firstRegex(fullText, /co-?occurring\s+([^.\n]+)/i)
  const ageText = firstRegex(fullText, /Age at Evaluation:\s*([^\n]+)/i)
  const adosModule = firstRegex(fullText, /(Module\s*\d+)/i)
  const adosSocialAffect = firstRegex(fullText, /Social Affect Total:\s*(\d+)/i)
  const adosRrb = firstRegex(fullText, /(?:RRB|Restricted and Repetitive Behavior) Total:\s*(\d+)/i)
  const adosClassification = firstRegex(fullText, /ADOS-2 Classification:\s*([A-Za-z ]+)/i)
  const adosComparisonScore = firstRegex(fullText, /Comparison Score:\s*(\d+)/i)
  const adosComparisonLevel = firstRegex(fullText, /Comparison Score:\s*\d+\s*\(([^)]+)\)/i)
  const homeImpairment = firstRegex(impairment, /Home:\s*([^\n]+)/i)
  const schoolImpairment = firstRegex(impairment, /School:\s*([^\n]+)/i)
    || firstMeaningfulSentence(`${reasonForReferral}\n${developmental}`, ['academic', 'school', 'educational'])
  const socialImpairment = firstRegex(impairment, /Social:\s*([^\n]+)/i)
  const behaviors = uniqueList(detectSourceBehaviors(fullText))

  return {
    diagnosis,
    diagnosisCode,
    supportLevel,
    coOccurringText,
    ageText,
    ados: {
      module: adosModule,
      socialAffect: adosSocialAffect,
      rrb: adosRrb,
      classification: adosClassification,
      comparisonScore: adosComparisonScore,
      comparisonLevel: adosComparisonLevel,
    },
    sectionSnippets: {
      reasonForReferral: firstMeaningfulSentence(reasonForReferral, ['referral', 'aggressive', 'communication', 'academic']),
      developmental: meaningfulSentenceGroup(developmental, ['developmental', 'delayed', 'communication', 'emotions'], 2),
      observationsSocial: meaningfulSentenceGroup(observations, ['reciprocal', 'eye contact', 'social', 'initiation', 'nonverbal'], 3),
      observationsCommunication: meaningfulSentenceGroup(observations, ['communication', 'questions', 'repetition', 'simplification', 'understanding', 'conversation'], 5),
      observationsEmotion: meaningfulSentenceGroup(observations, ['emotion', 'frustrated', 'explosive', 'internal', 'escalate'], 2),
      criterionA: firstMeaningfulSentence(criterionA, ['reciprocity', 'nonverbal', 'relationships']),
      criterionB: firstMeaningfulSentence(criterionB, ['rigidity', 'sensory', 'repetitive', 'inflexibility']),
      interpretation: firstMeaningfulSentence(interpretation, ['severity', 'communication', 'reciprocity', 'rigidity']),
      medicalNecessity: firstMeaningfulSentence(medicalNecessity, ['aba', 'communication', 'aggression', 'rigidity']),
    },
    impairments: {
      home: homeImpairment,
      school: schoolImpairment,
      social: socialImpairment,
    },
    behaviors,
  }
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
    return cleanExtractedSourceText(result.value)
  }
  if (extension === '.txt' || extension === '.md') {
    return cleanExtractedSourceText(await readFile(filePath, 'utf8'))
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
      sections: extractNamedSourceSections(text),
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
  let clinicalFacts = buildLocalClinicalFacts({ sources: [] })
  let evidenceReadiness = buildRequiredEvidenceReadiness([])
  let assessmentAdapters = []
  let deficitProfile = buildLocalDeficitProfile({ sources: [] })
  let clinicalProfile = buildLocalClinicalProfile({ clientLabel: 'Local Report Client', sources: [], clinicalFacts })
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
      clinicalFacts = buildLocalClinicalFacts({ sources: sourcePacket.sources })
      evidenceReadiness = buildRequiredEvidenceReadiness(sourcePacket.sources)
      assessmentAdapters = detectAssessmentAdapters(sourcePacket.sources)
      deficitProfile = buildLocalDeficitProfile({ sources: sourcePacket.sources })
      clinicalProfile = buildLocalClinicalProfile({ clientLabel: 'Local Report Client', sources: sourcePacket.sources, clinicalFacts })
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

export function buildLocalClinicalProfile({ clientLabel, sources, clinicalFacts = buildLocalClinicalFacts({ sources }) }) {
  const sections = SECTION_RULES.map((rule) => {
    const matches = matchingSectionSentences(sources, rule.id, rule.keywords, 5)
    return {
      id: rule.id,
      label: rule.label,
      status: matches.length ? 'source-supported' : 'missing-source-support',
      text: matches.length
        ? buildClinicalSectionText(rule.id, matches, clinicalFacts)
        : rule.fallback,
      sourceEvidence: matches,
      missing: !matches.length,
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

function evidenceSentenceList(matches = []) {
  return matches
    .map((match) => normalizeText(match.text))
    .filter(Boolean)
    .slice(0, 4)
}

function sentenceOrFallback(value, fallback = '') {
  return compactEvidenceText(value) || fallback
}

function sentenceFragment(value) {
  return normalizeText(value).replace(/[.]+$/g, '')
}

function buildClinicalSectionText(sectionId, matches, facts = {}) {
  const evidence = evidenceSentenceList(matches)
  const evidenceText = evidence.join(' ')
  const snippets = facts.sectionSnippets || {}
  const impairments = facts.impairments || {}
  const ados = facts.ados || {}
  const behaviorList = facts.behaviors?.length
    ? facts.behaviors.join(', ')
    : 'maladaptive behavior and safety-related concerns described in the source record'

  switch (sectionId) {
    case 'diagnosisSummary':
      return `Records reviewed support a diagnosis of ${facts.diagnosis || 'Autism Spectrum Disorder'}${facts.diagnosisCode && !String(facts.diagnosis || '').includes(facts.diagnosisCode) ? ` (${facts.diagnosisCode})` : ''}${facts.supportLevel ? `, with the diagnostic source describing support needs in the ${facts.supportLevel} range` : ''}. ${facts.coOccurringText ? `The evaluation also referenced co-occurring ${facts.coOccurringText}. ` : ''}${sentenceOrFallback(snippets.reasonForReferral, evidenceText)} The diagnostic information supports the medical necessity of ABA services to address communication, social, adaptive, behavioral, and caregiver-training needs.`
    case 'familyHistory':
      return `Records reviewed describe a clinically significant history of functional impairment affecting the client's daily participation and family routines. ${sentenceOrFallback(snippets.reasonForReferral, evidenceText)}${impairments.home ? ` At home, records indicate ${sentenceFragment(impairments.home)}.` : ''} This history should be used to individualize caregiver training, safety planning, reinforcement systems, communication supports, and generalization procedures without adding unsupported family-structure details.`
    case 'developmentalHistory':
      return `Records reviewed indicate developmental concerns that are clinically relevant to the current ABA treatment plan. ${sentenceOrFallback(snippets.developmental, evidenceText)} The source record describes ongoing needs in communication, emotional expression, comprehension, flexibility, regulation, and adaptive participation. These developmental needs support goals targeting functional communication, coping, social engagement, instructional readiness, and safe participation across routines.`
    case 'educationalHistory':
      return `Records reviewed indicate that the client is not currently able to function successfully in a traditional school environment due to clinically significant communication, comprehension, regulation, and behavior-related barriers. ${impairments.school ? `The evaluation specifically notes that ${sentenceFragment(impairments.school)}. ` : ''}${sentenceOrFallback(evidenceText)} ABA treatment should therefore focus on prerequisite skills needed for future educational access, including functional communication, tolerance of demands and transitions, compliance with safety expectations, coping, flexibility, and reduction of maladaptive behavior.`
    case 'behaviorProfile':
      return `The client demonstrates clinically significant maladaptive and treatment-interfering behavior that affects safety, participation, and access to instruction or daily routines. Source-supported concerns include ${behaviorList}. ${sentenceOrFallback(snippets.criterionB, evidenceText)}${snippets.observationsEmotion ? ` ${snippets.observationsEmotion} This pattern is consistent with internalized distress that may later present as explosive escalation when communication, flexibility, or coping demands exceed the client's current skill level.` : ''}${impairments.home ? ` Home functioning is affected by ${sentenceFragment(impairments.home)}.` : ''} Behavior intervention should include antecedent supports, functional communication training, differential reinforcement, de-escalation procedures, safety responses, and caregiver implementation across settings.`
    case 'communicationProfile':
      return `The client demonstrates clinically significant communication deficits that interfere with self-advocacy, emotional expression, comprehension, reciprocal interaction, and participation in demands or transitions. ${sentenceOrFallback(snippets.observationsCommunication, evidenceText)} ${sentenceOrFallback(snippets.criterionA)} Communication goals should target requesting, help and break communication, clarification, repair strategies, emotional expression, nonverbal integration, and contextually appropriate reciprocal communication.`
    case 'socialProfile':
      return `The client demonstrates social-communication and reciprocal-interaction deficits that affect peer/adult engagement, social problem solving, flexibility, and relationship development. ${sentenceOrFallback(snippets.observationsSocial, evidenceText)}${impairments.social ? ` Social functioning is further affected by ${sentenceFragment(impairments.social)}.` : ''}${ados.comparisonScore ? ` ADOS-2 results also reflected a high level of autism-spectrum related symptoms, with a Comparison Score of ${ados.comparisonScore}${ados.comparisonLevel ? ` (${ados.comparisonLevel})` : ''}.` : ''} Social goals should target initiation, response to social bids, perspective taking, conflict repair, flexible participation, and maintaining safe engagement during social demands.`
    case 'caregiverTraining':
      return `Caregiver training is clinically indicated to support consistency, generalization, behavior reduction, replacement-skill use, and safe response to escalation across daily routines. ${sentenceOrFallback(snippets.medicalNecessity, evidenceText)} Caregiver goals should focus on implementation of antecedent strategies, prompting, reinforcement, functional communication supports, data reporting, and crisis-prevention procedures taught by the BCBA.`
    default:
      return `Records reviewed indicate the following source-supported information: ${evidenceText}`
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

  if (goal.requiresDirectEvidence) return null

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

function supportsStandardSevereBehaviorPack(sources, deficitProfile) {
  const corpus = (sources || []).map((source) => sourceSearchText(source)).join(' ').toLowerCase()
  const hasBehaviorSupport = (deficitProfile?.domains || []).some((domain) => (
    domain.id === 'maladaptiveBehavior' && domain.status === 'source-supported'
  ))
  const hasAggressionOrDysregulation = /aggression|aggressive|dysregulation|explosive|unsafe|safety/.test(corpus)
  const hasHighImpactContext = /unable to function|academic settings|school|safety concerns|crisis|severe|persistent/.test(corpus)
  return hasBehaviorSupport && hasAggressionOrDysregulation && hasHighImpactContext
}

function standardBehaviorPackEvidence(sources, deficitProfile) {
  const evidence = firstDeficitEvidence(sources, ['aggression', 'aggressive', 'dysregulation', 'unsafe', 'safety', 'academic'])
    || (deficitProfile?.domains || []).find((domain) => domain.id === 'maladaptiveBehavior')?.sourceEvidence?.[0]
  return {
    ...(evidence || { sourceId: '', filename: '', text: '' }),
    basis: 'standard-severe-behavior-pack:bcba-review-required',
  }
}

function goalReportDefaults(goal) {
  if (goal.centralReachDataType === 'frequency') {
    return {
      baseline: goal.baseline || '5 instances per session',
      currentLevel: goal.currentLevel || 'New',
      criteriaForMastery: goal.criteriaForMastery || '0-1 instances per session over 14 sessions',
      targetDateForMastery: goal.targetDateForMastery || '6 months from authorization start',
      graphs: goal.graphs || 'N/A',
    }
  }
  if (goal.domain === 'Social Skills Group') {
    return {
      baseline: goal.baseline || '0%',
      currentLevel: goal.currentLevel || 'New',
      criteriaForMastery: goal.criteriaForMastery || '80% accuracy across 5 consecutive sessions',
      targetDateForMastery: goal.targetDateForMastery || '6 months from authorization start',
      graphs: goal.graphs || 'N/A',
    }
  }
  return {
    baseline: goal.baseline || '0%',
    currentLevel: goal.currentLevel || 'New',
    criteriaForMastery: goal.criteriaForMastery || '80% accuracy across 3 consecutive sessions',
    targetDateForMastery: goal.targetDateForMastery || '6 months from authorization start',
    graphs: goal.graphs || 'N/A',
  }
}

export function buildLocalGoalPlan({ sources, deficitProfile }) {
  const selectedGoals = []
  const standardBehaviorPackApplied = supportsStandardSevereBehaviorPack(sources, deficitProfile)
  const standardBehaviorEvidence = standardBehaviorPackApplied
    ? standardBehaviorPackEvidence(sources, deficitProfile)
    : null
  for (const goal of GOAL_LIBRARY) {
    let match = firstGoalEvidence(goal, sources, deficitProfile)
    if (!match && standardBehaviorPackApplied && STANDARD_SEVERE_BEHAVIOR_GOAL_IDS.includes(goal.id)) {
      match = standardBehaviorEvidence
    }
    if (!match) continue
    const defaults = goalReportDefaults(goal)
    selectedGoals.push({
      ...goal,
      ...defaults,
      selectionBasis: match.basis || 'source-supported',
      sourceEvidence: [match],
    })
  }

  const domains = selectedGoals.reduce((summary, goal) => {
    summary[goal.domain] = (summary[goal.domain] || 0) + 1
    return summary
  }, {})
  const selectedGoalIds = new Set(selectedGoals.map((goal) => goal.id))
  const excludedDirectEvidenceGoals = GOAL_LIBRARY
    .filter((goal) => goal.requiresDirectEvidence && !selectedGoalIds.has(goal.id))
    .map((goal) => ({
      id: goal.id,
      domain: goal.domain,
      longTermGoalName: goal.longTermGoalName,
      shortTermGoalName: goal.shortTermGoalName,
      reviewAction: 'add intake, FBA/BIP, caregiver report, or behavior data before selecting this target',
    }))

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
    excludedDirectEvidenceGoals,
    standardBehaviorPackApplied,
    standardBehaviorPackReviewAction: standardBehaviorPackApplied
      ? 'Standard severe-behavior initial assessment pack applied because the source supports severe aggression/safety/high-impact behavior concerns; BCBA must confirm each target topography before finalization.'
      : '',
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
  const goalDomainNames = ['Behavior', 'Communication', 'Social', 'Social Skills Group', 'Parent Training']
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
    ...((goalPlan?.excludedDirectEvidenceGoals || []).length
      ? [`Direct behavior target confirmation needed before adding: ${goalPlan.excludedDirectEvidenceGoals.map((goal) => goal.shortTermGoalName).join(', ')}`]
      : []),
    ...(goalPlan?.standardBehaviorPackApplied ? [goalPlan.standardBehaviorPackReviewAction] : []),
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
    return paragraph('Source support: Not found in the local source packet; BCBA to verify before finalization.', { spacing: { after: 180 } })
  }
  return paragraph(`Source support: ${section.sourceEvidence.map((item) => item.filename).join(', ')}`, { spacing: { after: 180 } })
}

function reviewMarker(text) {
  return paragraph(`BCBA verification needed: ${text}`, { spacing: { after: 160 }, boldText: true })
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

function checkboxChoiceLine(choices, selectedChoice) {
  const selected = String(selectedChoice || '').toLowerCase()
  return choices
    .map((choice) => `${choice.toLowerCase() === selected ? CHECKED_BOX : UNCHECKED_BOX} ${choice}`)
    .join('   ')
}

function severityCheckboxLine(selectedChoice) {
  return checkboxChoiceLine(['Mild', 'Moderate', 'Severe'], selectedChoice || 'Severe')
}

function sourceCorpusText(job) {
  return (job?.sourcePacket?.sources || [])
    .map((source) => sourceSearchText(source))
    .join('\n')
}

function inferSeverityFromSourceText(text, keywords = []) {
  const normalized = normalizeText(text).toLowerCase()
  const keywordWindows = keywords
    .map((keyword) => normalized.indexOf(String(keyword).toLowerCase()))
    .filter((index) => index >= 0)
    .map((index) => normalized.slice(Math.max(0, index - 240), index + 360))
  const searchAreas = keywordWindows.length ? keywordWindows : [normalized]
  const severityRank = ['severe', 'moderate', 'mild']
  for (const area of searchAreas) {
    const match = severityRank.find((level) => area.includes(level))
    if (match) return match[0].toUpperCase() + match.slice(1)
  }
  return ''
}

function inferReportSeverity(job, sectionId, keywords = []) {
  const explicitSeverity = inferSeverityFromSourceText(sourceCorpusText(job), keywords)
  if (explicitSeverity) return explicitSeverity
  const section = sectionById(job, sectionId)
  return section?.status === 'source-supported' ? 'Severe' : 'Moderate'
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
      tableCell('Objective', true),
      tableCell('Baseline', true),
      tableCell('Current Level', true),
      tableCell('Criteria for Mastery', true),
      tableCell('Target date for Mastery', true),
      tableCell('Graphs', true),
    ],
  })

  const rows = goals.map((goal) => new TableRow({
    children: [
      tableCell(`${goal.longTermGoalName} - ${goal.shortTermGoalName}`),
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

function sectionText(job, id) {
  return sectionById(job, id)?.text || REVIEW_NEEDED
}

function buildDiagnosisAndServiceSection(job) {
  return [
    heading('Diagnosis And Service Recommendation'),
    paragraph('Diagnosis:', { spacing: { after: 60 }, boldText: true }),
    sectionDraftParagraph(sectionById(job, 'diagnosisSummary')),
    paragraph('Date of Diagnosis: ' + REVIEW_NEEDED, { spacing: { after: 80 } }),
    paragraph('97151: Initial assessment and report development. Hours and units must be verified by the BCBA against the authorization request and payer requirements.', { spacing: { after: 60 } }),
    paragraph('97153: Direct treatment hours to be determined by medical necessity, treatment tolerance, caregiver availability, and payer authorization. Review required before finalization.', { spacing: { after: 60 } }),
    paragraph('97155: BCBA supervision and protocol modification hours to be determined by clinical need, behavior intensity, and treatment-team requirements. Review required before finalization.', { spacing: { after: 60 } }),
    paragraph('97156: Parent/caregiver training hours to be determined by caregiver goals, generalization needs, and family availability. Review required before finalization.', { spacing: { after: 160 } }),
    paragraph('Suicidality / self-harm review: ' + REVIEW_NEEDED, { spacing: { after: 60 } }),
    paragraph('Severity / support level review: ' + REVIEW_NEEDED, { spacing: { after: 160 } }),
  ]
}

function buildMedicalNecessityNarrative(job) {
  return [
    heading('Medical Necessity:'),
    paragraph('Research has demonstrated that ABA methodology is effective in addressing maladaptive behaviors and skill deficits in children diagnosed with autism spectrum disorder. Data will be collected to assess relevant skills, identify instructional needs, and teach each skill step-by-step until mastery is achieved. ABA-based treatment is medically necessary to reduce interfering behaviors, teach age-appropriate and functional skills, and increase independence across settings.', { spacing: { after: 120 } }),
    paragraph('Treatment will use evidence-based ABA procedures including discrete trial teaching, natural environment teaching, functional communication training, antecedent-based interventions, differential reinforcement, prompting and prompt fading, social skills training, caregiver training, and ongoing BCBA review of data. The BCBA must verify the final intensity, setting, and service recommendations before the report is used.', { spacing: { after: 160 } }),
    ...buildMedicalNecessitySection(job).slice(1),
  ]
}

function buildDsmCriteriaAndClinicalNeeds(job) {
  return [
    heading('Maladaptive Behavior Type I (includes restrictive repetitive patterns of behavior of activities):'),
    paragraph('DSM V Criteria: Insistence on sameness, inflexible adherence to routines, or ritualized patterns of verbal or nonverbal behavior; highly restricted, fixated interests that are abnormal in intensity or focus.', { spacing: { after: 80 } }),
    paragraph(sectionText(job, 'behaviorProfile'), { spacing: { after: 160 } }),
    heading('Maladaptive Behavior Type II (includes SIB and aggression):'),
    paragraph('The client displays or is at risk for clinically significant maladaptive behavior that may include aggression, property destruction, elopement, unsafe behavior, non-compliance, or other treatment-interfering responses when supported by the source packet.', { spacing: { after: 80 } }),
    paragraph(sectionText(job, 'behaviorProfile'), { spacing: { after: 160 } }),
    heading('2. Communication Skills:'),
    paragraph('DSM V Criteria: Deficits in nonverbal communicative behaviors used for social interaction, including deficits in integrated verbal and nonverbal communication, eye contact, body language, gestures, facial expressions, and nonverbal communication.', { spacing: { after: 80 } }),
    paragraph(sectionText(job, 'communicationProfile'), { spacing: { after: 160 } }),
    heading('3. Social Skills:'),
    paragraph('DSM V Criteria: Deficits in social-emotional reciprocity and deficits in developing, maintaining, and understanding relationships, including difficulty with back-and-forth interaction, sharing interests or emotions, initiating/responding socially, and adjusting behavior to social contexts.', { spacing: { after: 80 } }),
    paragraph(sectionText(job, 'socialProfile'), { spacing: { after: 160 } }),
  ]
}

function buildAssessmentResultsAndBarriers(job) {
  return [
    heading('Assessment Results And Clinical Barriers'),
    paragraph('Standardized assessment results, diagnostic evaluation findings, caregiver report, and clinical records were reviewed when present in the local source packet. Graphs are intentionally omitted for an initial assessment unless the BCBA adds source-specific visual data.', { spacing: { after: 120 } }),
    paragraph(`Detected assessment inputs: ${job.assessmentAdapters.length ? job.assessmentAdapters.map((adapter) => adapter.label).join(', ') : 'No recognized assessment adapter detected; review required.'}`, { spacing: { after: 120 } }),
    paragraph(`Barriers to treatment include the following source-supported domains: ${job.deficitProfile.domains.filter((domain) => domain.status === 'source-supported').map((domain) => domain.label).join(', ') || 'review required'}. These barriers may interfere with safety, instructional control, participation, generalization, and adaptive functioning across settings.`, { spacing: { after: 160 } }),
    paragraph('Reason for Referral: The caregivers sought ABA treatment to address the interfering effects of ASD-related skill deficits and maladaptive behavior. The report should be finalized to reflect the caregiver priorities, diagnostic findings, and functional needs supported by the source packet.', { spacing: { after: 160 } }),
  ]
}

function buildTreatmentModelSection() {
  return [
    heading('Treatment Model And ABA Methods'),
    paragraph('A focused treatment model targets specific behaviors or skill deficits that are most critical for immediate safety, functioning, and quality of life. A comprehensive treatment model addresses multiple developmental and behavioral domains when the client requires broad support across communication, social, adaptive, and behavior-reduction needs. The final treatment model and hours must be selected by the BCBA based on medical necessity and authorization requirements.', { spacing: { after: 120 } }),
    paragraph('The BCBA will utilize a blend of evidence-based ABA principles, including Natural Environment Teaching, Discrete Trial Training, Functional Communication Training, Differential Reinforcement of Alternative Behavior, antecedent-based interventions, social skills instruction, modeling, role-play, shaping, task analysis, and prompt fading. Procedures should be individualized to the client and implemented with ongoing data review.', { spacing: { after: 120 } }),
    paragraph('Potential reinforcers and motivating operations should be identified through caregiver interview, preference assessment, direct observation, and ongoing treatment data. Access to preferred activities, breaks, adult attention, structured choices, sensory accommodations, and preferred tangible/activity options may be used when clinically appropriate.', { spacing: { after: 160 } }),
  ]
}

function buildBehaviorInterventionPlanSection(job) {
  return [
    heading('Behavior Intervention Plan:'),
    paragraph('Target maladaptive behaviors for the BIP should be selected based on caregiver report, source records, ABC data, BCBA direct observation, and any available functional assessment information. The BCBA must verify the final operational definitions and hypothesized functions before use.', { spacing: { after: 120 } }),
    paragraph(`Target behavior profile: ${sectionText(job, 'behaviorProfile')}`, { spacing: { after: 120 } }),
    paragraph('Common antecedents may include denied access, transitions, non-preferred demands, communication breakdowns, social demand, correction, sensory discomfort, peer conflict, or changes in routine when supported by the records. Probable functions should be verified by the BCBA and may include escape, access, attention, sensory regulation, or control of the interaction.', { spacing: { after: 120 } }),
    paragraph('Antecedent strategies should include clear expectations, visual supports, concrete language, pre-correction, repetition/simplification of demands, structured choices, shortened demand intervals, reinforcement for calm communication, transition warnings, and early prompting for coping/help-seeking responses.', { spacing: { after: 120 } }),
    paragraph('Consequence and de-escalation strategies should include neutral affect, safety-focused blocking or environmental arrangement when necessary, prompting functional communication, differential reinforcement of replacement behaviors, planned ignoring when clinically appropriate, and return to task through least-to-most prompting once regulated.', { spacing: { after: 120 } }),
    paragraph('Data collection should include frequency recording for maladaptive behaviors and probe or trial-based data for replacement communication, coping, social, and caregiver-training goals. The BCBA should adjust interventions based on ongoing data trends.', { spacing: { after: 160 } }),
  ]
}

function buildMissingFieldsSection(job) {
  const missingFields = job.clinicalProfile.missingFields
  return [
    heading('Missing / Review-Required Fields'),
    ...(missingFields.length
      ? missingFields.map((field) => paragraph(`${field.label}: ${field.behavior}`, { spacing: { after: 60 } }))
      : [paragraph('No automatically detected clinical-profile fields were marked missing. BCBA review is still required for accuracy, service hours, signatures, and payer-specific language.', { spacing: { after: 120 } })]),
  ]
}

function nodeLocalName(node) {
  return node?.localName || String(node?.nodeName || '').split(':').pop()
}

function directChildren(node, localName) {
  const children = []
  for (let child = node?.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === 1 && (!localName || nodeLocalName(child) === localName)) {
      children.push(child)
    }
  }
  return children
}

function firstDirectChild(node, localName) {
  return directChildren(node, localName)[0] || null
}

function textOf(node) {
  const texts = []
  const walk = (current) => {
    if (!current) return
    if (current.nodeType === 1 && nodeLocalName(current) === 't') {
      texts.push(current.textContent || '')
    }
    for (let child = current.firstChild; child; child = child.nextSibling) walk(child)
  }
  walk(node)
  return texts.join('')
}

function normalizedText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function wElement(document, localName) {
  return document.createElementNS(WORD_NS, `w:${localName}`)
}

function appendTextRun(document, paragraphNode, text, options = {}) {
  const run = wElement(document, 'r')
  if (options.bold) {
    const runProperties = wElement(document, 'rPr')
    runProperties.appendChild(wElement(document, 'b'))
    run.appendChild(runProperties)
  }

  const lines = String(text || '').split(/\n/)
  lines.forEach((line, index) => {
    if (index > 0) run.appendChild(wElement(document, 'br'))
    const textNode = wElement(document, 't')
    textNode.setAttribute('xml:space', 'preserve')
    textNode.appendChild(document.createTextNode(line))
    run.appendChild(textNode)
  })
  paragraphNode.appendChild(run)
}

function clearElementExceptProperties(node, propertyLocalName) {
  const keep = propertyLocalName ? firstDirectChild(node, propertyLocalName) : null
  for (const child of directChildren(node)) {
    if (child !== keep) node.removeChild(child)
  }
  return keep
}

function setParagraphText(document, paragraphNode, text, options = {}) {
  if (!paragraphNode) return
  clearElementExceptProperties(paragraphNode, 'pPr')
  appendTextRun(document, paragraphNode, text, options)
}

function appendParagraph(document, parent, text, options = {}) {
  const paragraphNode = wElement(document, 'p')
  appendTextRun(document, paragraphNode, text, options)
  parent.appendChild(paragraphNode)
  return paragraphNode
}

function setCellText(document, cellNode, text, options = {}) {
  if (!cellNode) return
  clearElementExceptProperties(cellNode, 'tcPr')
  const paragraphs = String(text || '').split(/\n{2,}/).map((item) => item.trim()).filter(Boolean)
  if (!paragraphs.length) {
    appendParagraph(document, cellNode, '')
    return
  }
  paragraphs.forEach((item) => appendParagraph(document, cellNode, item, options))
}

function tableRows(tableNode) {
  return directChildren(tableNode, 'tr')
}

function rowCells(rowNode) {
  return directChildren(rowNode, 'tc')
}

function setTableCellText(document, tableNode, rowIndex, cellIndex, text, options = {}) {
  const row = tableRows(tableNode)[rowIndex]
  const cell = row ? rowCells(row)[cellIndex] : null
  setCellText(document, cell, text, options)
}

function findBodyParagraph(paragraphs, matcher) {
  return paragraphs.find((paragraphNode) => matcher(normalizedText(textOf(paragraphNode))))
}

function setParagraphAfterHeading(document, paragraphs, headingText, text, options = {}) {
  const headingIndex = paragraphs.findIndex((paragraphNode) => normalizedText(textOf(paragraphNode)).toLowerCase() === headingText.toLowerCase())
  if (headingIndex < 0) return false
  for (let index = headingIndex + 1; index < paragraphs.length; index += 1) {
    const paragraphText = normalizedText(textOf(paragraphs[index]))
    if (!paragraphText) continue
    setParagraphText(document, paragraphs[index], text, options)
    return true
  }
  return false
}

function setFirstParagraphContaining(document, paragraphs, needle, text, options = {}) {
  const target = findBodyParagraph(paragraphs, (paragraphText) => paragraphText.toLowerCase().includes(needle.toLowerCase()))
  if (!target) return false
  setParagraphText(document, target, text, options)
  return true
}

function collectElements(root, localName) {
  const elements = []
  const walk = (current) => {
    if (!current) return
    if (current.nodeType === 1 && (!localName || nodeLocalName(current) === localName)) {
      elements.push(current)
    }
    for (let child = current.firstChild; child; child = child.nextSibling) walk(child)
  }
  walk(root)
  return elements
}

function removeElements(root, localName) {
  for (const node of collectElements(root, localName)) {
    if (node.parentNode) node.parentNode.removeChild(node)
  }
}

function unwrapStructuredDocumentTags(root) {
  for (const sdtNode of collectElements(root, 'sdt')) {
    const contentNode = firstDirectChild(sdtNode, 'sdtContent')
    const parentNode = sdtNode.parentNode
    if (!parentNode) continue
    if (contentNode) {
      while (contentNode.firstChild) {
        parentNode.insertBefore(contentNode.firstChild, sdtNode)
      }
    }
    parentNode.removeChild(sdtNode)
  }
}

function documentPlainText(root) {
  return collectElements(root, 't')
    .map((node) => node.textContent || '')
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildStandardTemplateCloneQa(document, bodyTables) {
  const plainText = documentPlainText(document)
  const unresolvedPhraseHits = UNRESOLVED_TEMPLATE_PHRASES.filter((phrase) => plainText.includes(phrase))
  const contentControlCount = collectElements(document, 'sdt').length
  const highlightCount = collectElements(document, 'highlight').length
  const tableCount = bodyTables.length
  const blockerMessages = [
    ...(tableCount !== STANDARD_TEMPLATE_TABLE_COUNT
      ? [`Standard report template table mismatch: expected ${STANDARD_TEMPLATE_TABLE_COUNT}, found ${tableCount}.`]
      : []),
    ...(highlightCount ? [`Generated report still contains ${highlightCount} Word highlight tag(s).`] : []),
    ...(contentControlCount ? [`Generated report still contains ${contentControlCount} Word content-control widget(s).`] : []),
    ...unresolvedPhraseHits.map((phrase) => `Generated report still contains unresolved template phrase: ${phrase}`),
  ]

  return {
    ok: blockerMessages.length === 0,
    tableCount,
    highlightCount,
    contentControlCount,
    unresolvedPhraseHits,
    blockerMessages,
  }
}

function reviewText(label) {
  return `${label}: ${REVIEW_NEEDED}`
}

function templateSectionText(job, id, fallbackLabel) {
  const section = sectionById(job, id)
  if (section?.text) return section.text
  return reviewText(fallbackLabel || id)
}

function sourceSupportedDomainLabels(job) {
  return job.deficitProfile.domains
    .filter((domain) => domain.status === 'source-supported')
    .map((domain) => domain.label)
}

function templateMedicalNecessityText(job) {
  const domains = sourceSupportedDomainLabels(job)
  const domainText = domains.length ? domains.join(', ') : 'review-required deficit domains'
  const necessity = job.clinicalFacts?.sectionSnippets?.medicalNecessity
  return `Research has demonstrated that ABA methodology is effective in addressing maladaptive behaviors and skill deficits in children diagnosed with autism spectrum disorder (ASD). Data will be collected to assess relevant skills and identify what the client needs to learn and the appropriate sequence for teaching each skill. Based on the source packet reviewed, treatment is medically necessary to address clinically significant needs in ${domainText}.${necessity ? ` ${necessity}` : ''} ABA-based treatment should target the reduction of interfering behaviors, the acquisition of functional communication, social, adaptive, and replacement skills, and caregiver implementation of strategies across settings. The BCBA must review and finalize the service intensity, setting, and payer-specific language before this draft is used.`
}

function templateAssessmentText(job) {
  const ados = job.clinicalFacts?.ados || {}
  if (ados.socialAffect || ados.rrb || ados.classification || ados.comparisonScore) {
    const moduleText = ados.module ? ` ${ados.module}` : ''
    const supportLevelText = job.clinicalFacts?.supportLevel
      ? ` The diagnostic impression describes ${job.clinicalFacts.supportLevel}.`
      : ''
    const scoreParts = [
      ados.socialAffect ? `Social Affect total of ${ados.socialAffect}` : '',
      ados.rrb ? `Restricted and Repetitive Behavior total of ${ados.rrb}` : '',
      ados.classification ? `classification of ${ados.classification}` : '',
      ados.comparisonScore ? `Comparison Score of ${ados.comparisonScore}${ados.comparisonLevel ? ` (${ados.comparisonLevel})` : ''}` : '',
    ].filter(Boolean)
    return `Standardized assessment information and diagnostic/evaluation records were reviewed. The source packet includes ADOS-2${moduleText} results, including ${scoreParts.join(', ')}.${supportLevelText} These findings support clinically significant deficits in social communication, reciprocity, nonverbal communication, relationship development, flexibility, and restricted/repetitive behavior patterns. Results should be integrated with caregiver report, direct observation, and ongoing ABA assessment before the report is finalized. Initial assessment drafts do not include progress graphs unless source-specific visual data are added by the BCBA.`
  }
  const adapters = job.assessmentAdapters.length
    ? job.assessmentAdapters.map((adapter) => adapter.label).join(', ')
    : 'no recognized standardized assessment adapter was detected; BCBA to verify source packet completeness'
  return `Standardized assessment information, diagnostic/evaluation records, caregiver report, and clinical source documents were reviewed when available. Detected assessment inputs include: ${adapters}. These results should be reviewed by the BCBA and integrated with direct observation and caregiver interview before the report is finalized. Initial assessment drafts do not include progress graphs unless source-specific visual data are added by the BCBA.`
}

function templateBarrierText(job) {
  const domains = sourceSupportedDomainLabels(job)
  const facts = job.clinicalFacts || {}
  const behaviorText = facts.behaviors?.length ? facts.behaviors.join(', ') : ''
  const impairmentText = [
    facts.impairments?.home ? `home instability/safety concerns (${facts.impairments.home})` : '',
    facts.impairments?.school ? `educational access barriers (${facts.impairments.school})` : '',
    facts.impairments?.social ? `social impairment (${facts.impairments.social})` : '',
  ].filter(Boolean).join('; ')
  if (domains.length && (behaviorText || impairmentText)) {
    return `Barriers to treatment include source-supported deficits in ${domains.join(', ')}${behaviorText ? `, with maladaptive or interfering behavior concerns including ${behaviorText}` : ''}. ${impairmentText ? `Functional barriers noted in the source packet include ${impairmentText}. ` : ''}These barriers may interfere with safety, learning readiness, communication, participation, generalization, and adaptive functioning across settings.`
  }
  return domains.length
    ? `Barriers to treatment include source-supported deficits in ${domains.join(', ')}, which may interfere with safety, learning readiness, communication, participation, generalization, and adaptive functioning across settings.`
    : REVIEW_NEEDED
}

function templateClinicalInterpretationText(job) {
  const referral = job.clinicalFacts?.sectionSnippets?.reasonForReferral
  return `Reason for Referral: ${referral || 'The caregivers sought ABA treatment to address the interfering effects of ASD-related skill deficits and maladaptive behavior.'} The source packet supports the need for a treatment plan that targets functional communication, social interaction, adaptive participation, reduction of maladaptive behavior, and caregiver implementation of strategies. The BCBA should verify all client-specific details, service recommendations, and treatment priorities before finalizing the report.`
}

function templateBehaviorTypeText(job, type) {
  const facts = job.clinicalFacts || {}
  const snippets = facts.sectionSnippets || {}
  if (type === 'typeI') {
    return `The client demonstrates Maladaptive Behavior Type I needs related to restricted, repetitive, rigid, or inflexible patterns of behavior. ${snippets.criterionB || snippets.interpretation || templateSectionText(job, 'behaviorProfile', 'Maladaptive Behavior Type I evidence')} These concerns should be addressed through antecedent supports, tolerance and flexibility programming, functional communication, reinforcement for adaptive responding, and caregiver-supported generalization.`
  }
  const behaviorText = facts.behaviors?.length
    ? facts.behaviors.join(', ')
    : 'maladaptive behavior and safety-related escalation described in the source packet'
  const typeTwoEvidence = [snippets.reasonForReferral, snippets.observationsEmotion, snippets.observationsEmotion ? 'The source pattern is consistent with internalized distress followed by explosive escalation when the client is challenged, frustrated, or unable to communicate needs effectively.' : '']
    .filter(Boolean)
    .join(' ') || templateSectionText(job, 'behaviorProfile', 'Maladaptive Behavior Type II evidence')
  return `The client demonstrates Maladaptive Behavior Type II needs that interfere with safety, participation, and access to instruction or daily routines. Source-supported concerns include ${behaviorText}. ${typeTwoEvidence} These behaviors should be targeted through operational definitions, function-based intervention, antecedent strategies, functional communication training, differential reinforcement, de-escalation procedures, and ongoing frequency data collection.`
}

function templateObservationText(job, observationNumber) {
  const snippets = job.clinicalFacts?.sectionSnippets || {}
  if (observationNumber === 1) {
    return `During the diagnostic observation/source review, the client demonstrated clinically significant social-communication deficits. ${snippets.observationsSocial || snippets.criterionA || templateSectionText(job, 'socialProfile', 'Observation 1')} The observation supports goals targeting reciprocal responding, social initiation, nonverbal integration, and flexible participation with adults and peers.`
  }
  const communicationAndEmotion = [snippets.observationsCommunication, snippets.observationsEmotion]
    .filter(Boolean)
    .join(' ') || templateSectionText(job, 'communicationProfile', 'Observation 2')
  return `Additional observation findings indicate clinically significant communication, emotional-regulation, and participation needs. ${communicationAndEmotion} These findings support goals targeting comprehension, communication repair, emotional expression, help/break requests, coping, and safe re-engagement following frustration or demands.`
}

function goalProgramBehavior(goal) {
  return `${goal.longTermGoalName} - ${goal.shortTermGoalName}`
}

function buildBipBehaviorColumns(job) {
  const behaviors = job.clinicalFacts?.behaviors || []
  const lowerBehaviors = behaviors.map((behavior) => behavior.toLowerCase())
  const hasBehavior = (...terms) => lowerBehaviors.some((behavior) => terms.some((term) => behavior.includes(term)))
  const selectedGoalIds = new Set((job.goalPlan?.goals || []).map((goal) => goal.id))
  const hasStandardPack = STANDARD_SEVERE_BEHAVIOR_GOAL_IDS.every((id) => selectedGoalIds.has(id))
  if (hasStandardPack) {
    return [
      {
        heading: 'Aggression / Verbal Aggression / Profane Language',
        behaviorName: 'Physical aggression, verbal aggression, and profane language',
        definition: 'Episodes of physical aggression, verbal aggression, hostile or threatening language, or profane/inappropriate language that interfere with safety, communication, instruction, or social participation.',
        antecedents: 'Common antecedents may include denied access, difficult demands, correction, communication breakdowns, social demands, transitions, delayed reinforcement, sensory discomfort, or loss of control. Functions must be verified through ABC data and direct observation.',
      },
      {
        heading: 'Non-Compliance / Property Destruction',
        behaviorName: 'Non-compliance and property destruction',
        definition: 'Episodes of refusal, failure to follow reasonable safety or instructional directions, or destructive/unsafe interaction with materials that disrupts participation or access to instruction.',
        antecedents: 'Common antecedents may include nonpreferred demands, unclear expectations, transitions, task difficulty, delayed access, reduced tolerance for adult-directed activities, or difficulty accepting limits. Functions must be verified through data.',
      },
      {
        heading: 'Elopement / Unsafe Behavior',
        behaviorName: 'Elopement and unsafe behavior',
        definition: 'Episodes of leaving supervision, moving toward unsafe areas, or engaging in behavior that places the client or others at risk and requires adult safety support.',
        antecedents: 'Common antecedents may include transitions, overwhelming demands, denied access, social demands, avoidance of difficult tasks, or attempts to escape sensory or emotional discomfort. Functions must be verified through data.',
      },
    ]
  }
  const columns = []

  if (hasBehavior('aggression', 'emotional dysregulation')) {
    columns.push({
      heading: hasBehavior('emotional dysregulation') ? 'Aggression / Emotional Dysregulation' : 'Aggression',
      behaviorName: 'Aggressive or dysregulated behavior',
      definition: 'Episodes of aggressive escalation, unsafe contact, hostile escalation, or severe dysregulation that interfere with safety, instruction, communication, or participation.',
      antecedents: 'Common antecedents may include denied access, difficult tasks, communication breakdowns, social demands, correction, transitions, sensory discomfort, or loss of control. Functions must be verified through ABC data and direct observation.',
    })
  }
  if (hasBehavior('non-compliance', 'property destruction')) {
    columns.push({
      heading: hasBehavior('property destruction') ? 'Non-Compliance / Property Destruction' : 'Non-Compliance',
      behaviorName: 'Refusal or destructive responding',
      definition: 'Episodes of refusal, failure to follow reasonable safety or instructional directions, or unsafe interaction with materials that disrupts participation or access to instruction.',
      antecedents: 'Common antecedents may include nonpreferred demands, unclear expectations, transitions, delayed reinforcement, task difficulty, or reduced tolerance for adult-directed activities. Functions must be verified through data.',
    })
  }
  if (hasBehavior('elopement', 'unsafe behavior')) {
    columns.push({
      heading: hasBehavior('elopement') ? 'Elopement / Unsafe Behavior' : 'Unsafe Behavior',
      behaviorName: 'Unsafe movement or safety-risk behavior',
      definition: 'Episodes of leaving supervision, moving toward unsafe areas, or engaging in behavior that places the client or others at risk and requires adult safety support.',
      antecedents: 'Common antecedents may include transitions, overwhelming demands, denied access, social demands, avoidance of difficult tasks, or attempts to escape sensory or emotional discomfort. Functions must be verified through data.',
    })
  }

  const behaviorGoals = job.goalPlan.goals.filter((goal) => goal.domain === 'Behavior')
  for (const goal of behaviorGoals) {
    if (columns.length >= 3) break
    const heading = goal.shortTermGoalName || goal.longTermGoalName
    if (columns.some((column) => column.heading.toLowerCase().includes(String(heading).toLowerCase()))) continue
    columns.push({
      heading,
      behaviorName: heading,
      definition: `${heading} should be operationally defined by the BCBA using caregiver interview, direct observation, and source records before implementation.`,
      antecedents: 'Probable function should be verified by the BCBA using ABC data, caregiver report, direct observation, and source records. Potential functions may include escape, access, attention, sensory regulation, or control of the interaction when supported by the data.',
    })
  }

  while (columns.length < 3) {
    columns.push({
      heading: REVIEW_NEEDED,
      behaviorName: REVIEW_NEEDED,
      definition: 'A specific maladaptive behavior target was not directly supported in the extracted source packet. Add intake, FBA/BIP, caregiver interview, or behavior data before finalizing this column.',
      antecedents: 'BCBA review required before assigning hypothesized function or intervention procedures.',
    })
  }

  return columns.slice(0, 3)
}

function fillGoalTable(document, tableNode, title, goals, options = {}) {
  if (!tableNode) return
  const rows = tableRows(tableNode)
  if (!rows.length) return

  setTableCellText(document, tableNode, 0, 0, title, { bold: true })
  const templateRow = (rows[2] || rows[rows.length - 1]).cloneNode(true)
  for (let index = rows.length - 1; index >= 2; index -= 1) {
    tableNode.removeChild(rows[index])
  }

  const rowsToRender = goals.length ? goals : [{
    longTermGoalName: 'N/A',
    shortTermGoalName: 'N/A',
    objective: 'N/A - no source-supported goals selected for this section.',
    baseline: 'N/A',
    currentLevel: 'N/A',
    criteriaForMastery: 'N/A',
    targetDateForMastery: 'N/A',
    graphs: 'N/A',
  }]

  rowsToRender.forEach((goal) => {
    const row = templateRow.cloneNode(true)
    const cells = rowCells(row)
    const values = options.sixColumns
      ? [
          goalProgramBehavior(goal),
          goal.objective,
          goal.baseline,
          goal.currentLevel,
          goal.criteriaForMastery,
          goal.targetDateForMastery,
        ]
      : [
          goalProgramBehavior(goal),
          goal.objective,
          goal.baseline,
          goal.currentLevel,
          goal.criteriaForMastery,
          goal.targetDateForMastery,
          goal.graphs || 'N/A',
        ]
    cells.forEach((cell, index) => setCellText(document, cell, values[index] || ''))
    tableNode.appendChild(row)
  })
}

function fillBipTable(document, tableNode, job) {
  const behaviorGoals = job.goalPlan.goals.filter((goal) => goal.domain === 'Behavior')
  const replacementGoals = job.goalPlan.goals
    .filter((goal) => goal.domain === 'Communication' || goal.domain === 'Social')
    .slice(0, 3)
  const behaviorColumns = buildBipBehaviorColumns(job)

  behaviorColumns.forEach((column, index) => {
    setTableCellText(document, tableNode, 0, index + 1, column.heading || `Behavior ${index + 1}`, { bold: true })
    const goal = behaviorGoals[index] || behaviorGoals[0]
    const replacement = replacementGoals[index] || replacementGoals[0]
    setTableCellText(document, tableNode, 1, index + 1, column.behaviorName || goal?.shortTermGoalName || REVIEW_NEEDED)
    setTableCellText(document, tableNode, 2, index + 1, column.definition || goal?.objective || templateSectionText(job, 'behaviorProfile', 'Operational definition'))
    setTableCellText(document, tableNode, 3, index + 1, column.antecedents || 'Probable function should be verified by the BCBA using ABC data, caregiver report, direct observation, and source records.')
    setTableCellText(document, tableNode, 4, index + 1, 'Use antecedent supports including clear expectations, transition warnings, structured choices, visual supports, demand fading, reinforcement for calm responding, and early prompting for functional communication.')
    setTableCellText(document, tableNode, 5, index + 1, replacement?.objective || 'Teach functional communication, help-seeking, tolerance, coping, and contextually appropriate replacement responses matched to the function of behavior.')
    setTableCellText(document, tableNode, 6, index + 1, 'Maintain neutral affect, ensure safety, prompt the replacement response, reinforce appropriate behavior, reduce attention to unsafe/inappropriate behavior when clinically appropriate, and return to instruction once regulated.')
    setTableCellText(document, tableNode, 7, index + 1, goal?.centralReachDataType === 'frequency' ? 'Frequency data for maladaptive behavior; goal/probe data for replacement skills.' : 'Frequency or trial/probe data as clinically appropriate.')
    setTableCellText(document, tableNode, 8, index + 1, goal?.baseline || 'New')
    setTableCellText(document, tableNode, 9, index + 1, goal?.currentLevel || 'N/A for initial assessment')
  })
}

function fillTemplateTables(document, tables, job) {
  const goalsByDomain = {
    Behavior: job.goalPlan.goals.filter((goal) => goal.domain === 'Behavior'),
    Communication: job.goalPlan.goals.filter((goal) => goal.domain === 'Communication'),
    Social: job.goalPlan.goals.filter((goal) => goal.domain === 'Social'),
    'Social Skills Group': job.goalPlan.goals.filter((goal) => goal.domain === 'Social Skills Group'),
    'Parent Training': job.goalPlan.goals.filter((goal) => goal.domain === 'Parent Training'),
  }
  const goalsById = new Map(job.goalPlan.goals.map((goal) => [goal.id, goal]))
  const preferredFerbs = FERB_GOAL_IDS
    .map((id) => goalsById.get(id))
    .filter(Boolean)
  const fallbackFerbs = job.goalPlan.goals
    .filter((goal) => goal.domain === 'Communication' || goal.domain === 'Social')
    .filter((goal) => !FERB_GOAL_IDS.includes(goal.id))
  const ferbGoals = [...preferredFerbs, ...fallbackFerbs].slice(0, 6)

  const demographics = tables[0]
  setTableCellText(document, demographics, 0, 1, job.clientLabel || REVIEW_NEEDED)
  setTableCellText(document, demographics, 0, 3, REVIEW_NEEDED)
  setTableCellText(document, demographics, 1, 1, 'Autism Spectrum Disorder F84.0')
  setTableCellText(document, demographics, 1, 3, 'Teddy Bahary BCBA, LBA-NY/NJ, CBSS')
  setTableCellText(document, demographics, 2, 1, new Date(job.generatedAt).toLocaleDateString('en-US'))
  setTableCellText(document, demographics, 2, 3, 'N/A - initial assessment')
  setTableCellText(document, demographics, 3, 1, REVIEW_NEEDED)
  setTableCellText(document, demographics, 3, 3, REVIEW_NEEDED)

  const diagnosis = tables[1]
  setTableCellText(document, diagnosis, 0, 1, 'Autism Spectrum Disorder F84.0')
  setTableCellText(document, diagnosis, 0, 3, REVIEW_NEEDED)
  setTableCellText(document, diagnosis, 1, 1, REVIEW_NEEDED)
  setTableCellText(document, diagnosis, 1, 3, 'N/A')

  const services = tables[2]
  setTableCellText(document, services, 0, 0, '12')
  setTableCellText(document, services, 1, 0, REVIEW_NEEDED)
  setTableCellText(document, services, 3, 0, REVIEW_NEEDED)
  setTableCellText(document, services, 4, 0, REVIEW_NEEDED)

  const severity = tables[3]
  setTableCellText(document, severity, 0, 1, severityCheckboxLine(inferReportSeverity(job, 'communicationProfile', ['communication', 'expressive', 'receptive', 'language'])))
  setTableCellText(document, severity, 1, 1, severityCheckboxLine(inferReportSeverity(job, 'socialProfile', ['social', 'reciprocal', 'peer', 'play'])))
  setTableCellText(document, severity, 2, 1, severityCheckboxLine(inferReportSeverity(job, 'behaviorProfile', ['restricted', 'repetitive', 'rigid', 'sameness', 'transition'])))
  setTableCellText(document, severity, 3, 1, severityCheckboxLine(inferReportSeverity(job, 'behaviorProfile', ['aggression', 'sib', 'self-injury', 'property destruction', 'elopement', 'unsafe'])))

  fillBipTable(document, tables[5], job)

  const reinforcers = tables[6]
  setTableCellText(document, reinforcers, 0, 1, 'Caregiver interview, observation, and ongoing preference assessment should be used to identify current primary reinforcers.')
  setTableCellText(document, reinforcers, 1, 1, 'Social praise, access to preferred activities, attention, choices, breaks, and token/conditioned reinforcement as clinically appropriate.')
  setTableCellText(document, reinforcers, 2, 1, 'Reinforcement will be individualized and thinned systematically as fluency, independence, and generalization increase.')

  fillGoalTable(document, tables[7], 'Maladaptive behavior: Self-stimulating through repetitive/stereotyped motions; abnormal, inflexible, or intense preoccupations', goalsByDomain.Behavior)
  fillGoalTable(document, tables[8], 'Replacement Behavior for Increase: (include FERB goals from the BIP)', ferbGoals)
  fillGoalTable(document, tables[9], 'Communication Skills: Problems with expressive or receptive language, poor understanding or use of nonverbal communications, stereotyped or repetitive language', goalsByDomain.Communication)
  fillGoalTable(document, tables[10], 'Socialization skills: Lack of social/emotional reciprocity, failure to seek or develop shared social activities', goalsByDomain.Social)
  fillGoalTable(document, tables[11], 'Social Skills Group:', goalsByDomain['Social Skills Group'], { sixColumns: true })
  fillGoalTable(document, tables[12], 'Parent Goals:', goalsByDomain['Parent Training'])

  const coordination = tables[13]
  setTableCellText(document, coordination, 0, 1, REVIEW_NEEDED)
  setTableCellText(document, coordination, 1, 1, REVIEW_NEEDED)
  setTableCellText(document, coordination, 2, 1, REVIEW_NEEDED)
  setTableCellText(document, coordination, 3, 1, REVIEW_NEEDED)

  const risk = tables[14]
  setTableCellText(document, risk, 0, 0, `Suicidality? ${checkboxChoiceLine(['Not present', 'Ideation', 'Plan', 'Means', 'Prior attempt (last 12 months)'], 'Not present')}`)
  setTableCellText(document, risk, 1, 0, `Homicidality? ${checkboxChoiceLine(['Not present', 'Ideation', 'Plan', 'Means', 'Prior attempt (last 12 months)'], 'Not present')}`)
}

function fillTemplateParagraphs(document, paragraphs, job) {
  setFirstParagraphContaining(document, paragraphs, 'Research has demonstrated that ABA methodology is effective', templateMedicalNecessityText(job))
  setParagraphAfterHeading(document, paragraphs, 'Family History:', templateSectionText(job, 'familyHistory', 'Family History'))
  setParagraphAfterHeading(document, paragraphs, 'Developmental History:', templateSectionText(job, 'developmentalHistory', 'Developmental History'))
  setParagraphAfterHeading(document, paragraphs, 'Educational History:', templateSectionText(job, 'educationalHistory', 'Educational History'))
  setParagraphAfterHeading(document, paragraphs, "Client's Area of Strength:", 'The client demonstrates strengths and interests that should be used to support rapport, motivation, instructional engagement, and generalization. The BCBA should finalize this section using caregiver report, direct observation, and source-specific strengths identified in the evaluation packet.')

  setParagraphAfterHeading(document, paragraphs, 'As Evidenced By:', templateBehaviorTypeText(job, 'typeI'))
  const asEvidencedIndexes = paragraphs
    .map((paragraphNode, index) => ({ paragraphNode, index, text: normalizedText(textOf(paragraphNode)) }))
    .filter((item) => item.text === 'As Evidenced By:')
    .map((item) => item.index)
  if (asEvidencedIndexes[1] != null) {
    for (let index = asEvidencedIndexes[1] + 1; index < paragraphs.length; index += 1) {
      if (normalizedText(textOf(paragraphs[index]))) {
        setParagraphText(document, paragraphs[index], templateBehaviorTypeText(job, 'typeII'))
        break
      }
    }
  }
  if (asEvidencedIndexes[2] != null) {
    for (let index = asEvidencedIndexes[2] + 1; index < paragraphs.length; index += 1) {
      if (normalizedText(textOf(paragraphs[index]))) {
        setParagraphText(document, paragraphs[index], templateSectionText(job, 'communicationProfile', 'Communication evidence'))
        break
      }
    }
  }
  if (asEvidencedIndexes[3] != null) {
    for (let index = asEvidencedIndexes[3] + 1; index < paragraphs.length; index += 1) {
      if (normalizedText(textOf(paragraphs[index]))) {
        setParagraphText(document, paragraphs[index], templateSectionText(job, 'socialProfile', 'Social evidence'))
        break
      }
    }
  }

  setParagraphAfterHeading(document, paragraphs, 'Observation 1 (can delete for reassessments):', templateObservationText(job, 1))
  setParagraphAfterHeading(document, paragraphs, 'Observation 2:', templateObservationText(job, 2))
  setParagraphAfterHeading(document, paragraphs, 'Assessment of Current Functioning:', templateAssessmentText(job))
  setFirstParagraphContaining(document, paragraphs, 'Please write a description of the standardized test being used', 'Assessment interpretation should be finalized by the BCBA using the standardized assessment scores, caregiver report, direct observation, and source records available in the packet.')
  setParagraphAfterHeading(document, paragraphs, 'Barriers to treatment:', templateBarrierText(job))
  setFirstParagraphContaining(document, paragraphs, 'Reason for Referral:', templateClinicalInterpretationText(job))
  setFirstParagraphContaining(document, paragraphs, 'Functional Impairment: Please identify as Mild, Moderate, or Severe.', 'Functional Impairment:')
  setFirstParagraphContaining(document, paragraphs, 'Client is recommended to have Comprehensive/Focused services.', 'Client is recommended to receive ABA services at the intensity and model determined medically necessary by the BCBA after review of the source packet, caregiver priorities, safety needs, adaptive functioning, and payer requirements.')
  setFirstParagraphContaining(document, paragraphs, 'Include rationale for lack of progress here', 'N/A - initial assessment.')
  setFirstParagraphContaining(document, paragraphs, 'For initial assessments, write N/A', 'N/A - initial assessment.')
  setFirstParagraphContaining(document, paragraphs, 'Target maladaptive behaviors for the BIP were chosen', 'Target maladaptive behaviors for the BIP were selected based on source records, caregiver report, BCBA clinical review, and available observation/assessment information. The BCBA must verify operational definitions, functions, and intervention procedures before implementation.')
  setFirstParagraphContaining(document, paragraphs, 'Write what ABA methods you will be using', 'The following ABA methods may be used as clinically appropriate: Natural Environment Teaching, Discrete Trial Training, Functional Communication Training, Differential Reinforcement, antecedent-based interventions, modeling, role-play, shaping, chaining, task analysis, prompting, and prompt fading.')
  setFirstParagraphContaining(document, paragraphs, 'Results of Preference Assessment:', 'Results of Preference Assessment: Preference assessment should be completed through caregiver interview, naturalistic observation, and direct assessment of preferred items/activities. Reinforcers should be updated throughout treatment based on motivation and treatment data.')
  setFirstParagraphContaining(document, paragraphs, 'Parent involvement is a crucial component', templateSectionText(job, 'caregiverTraining', 'Parent involvement'))
  setFirstParagraphContaining(document, paragraphs, 'Please specify specific long term goals per domain', 'The following long-term transition benchmarks should be individualized by the BCBA and used to guide titration when the client demonstrates stable mastery, generalization, and reduced treatment-interfering behavior across relevant settings.')
  setFirstParagraphContaining(document, paragraphs, 'Socially inappropriate behaviors have reduced', 'Social goals and clinically significant social barriers will be reviewed for mastery and generalization across people, settings, materials, and naturally occurring routines before hours are reduced.')
  setFirstParagraphContaining(document, paragraphs, 'Client will engage in only expected behaviors during conversational exchanges', 'Communication goals will be reviewed for functional independence, spontaneous use, repair strategies, reciprocal exchange, and generalization across communication partners before hours are reduced.')
  setFirstParagraphContaining(document, paragraphs, 'The malaptive behaviors of ____', 'Maladaptive behaviors targeted in the treatment plan should reduce to clinically safe and stable levels across settings, with replacement behaviors used independently, before direct-care hours are reduced.')
  setFirstParagraphContaining(document, paragraphs, 'This treatment plan was developed and reviewed with parent/caregiver', `${CHECKED_BOX} This treatment plan was developed and reviewed with parent/caregiver`)
  setFirstParagraphContaining(document, paragraphs, 'This treatment plan was not developed and reviewed with parent/caregiver', `${UNCHECKED_BOX} This treatment plan was not developed and reviewed with parent/caregiver`)
}

async function writeGeneratedDocx({ outputPath, job }) {
  const templateBuffer = await readFile(STANDARD_TEMPLATE_DOCX_PATH)
  const zip = await JSZip.loadAsync(templateBuffer)
  const documentXmlFile = zip.file('word/document.xml')
  if (!documentXmlFile) throw new Error('Standard report template is missing word/document.xml.')

  const xml = await documentXmlFile.async('string')
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  const body = document.getElementsByTagName('w:body')[0]
  if (!body) throw new Error('Standard report template is missing a document body.')

  const bodyParagraphs = directChildren(body, 'p')
  const bodyTables = directChildren(body, 'tbl')
  if (bodyTables.length !== 15) {
    throw new Error(`Standard report template table mismatch: expected ${STANDARD_TEMPLATE_TABLE_COUNT} tables, found ${bodyTables.length}.`)
  }

  fillTemplateTables(document, bodyTables, job)
  fillTemplateParagraphs(document, bodyParagraphs, job)
  removeElements(document, 'highlight')
  unwrapStructuredDocumentTags(document)

  const cloneQa = buildStandardTemplateCloneQa(document, directChildren(body, 'tbl'))
  if (!cloneQa.ok) {
    throw new Error(`Generated report failed standard template clone QA: ${cloneQa.blockerMessages.join(' ')}`)
  }

  zip.file('word/document.xml', new XMLSerializer().serializeToString(document))
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  await writeFile(outputPath, buffer)
  return cloneQa
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
  const clinicalFacts = buildLocalClinicalFacts({ sources: sourcePacket.sources })
  const deficitProfile = buildLocalDeficitProfile({ sources: sourcePacket.sources })
  if (!deficitProfile.supportedGoalDomains.length) {
    throw new Error('No source-supported deficit domains were detected. Add assessment/evaluation records that clearly describe communication, social, adaptive, behavior, or caregiver-training needs.')
  }
  const clinicalProfile = buildLocalClinicalProfile({ clientLabel, sources: sourcePacket.sources, clinicalFacts })
  const goalPlan = buildLocalGoalPlan({ sources: sourcePacket.sources, deficitProfile })
  const coverageMatrix = buildReportCoverageMatrix({
    evidenceReadiness,
    assessmentAdapters,
    clinicalFacts,
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
    clinicalFacts,
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
        ...(goalPlan.excludedDirectEvidenceGoals?.length
          ? [`Behavior targets requiring direct source support were not auto-added: ${goalPlan.excludedDirectEvidenceGoals.map((goal) => goal.shortTermGoalName).join(', ')}.`]
          : []),
        ...(goalPlan.standardBehaviorPackApplied ? [goalPlan.standardBehaviorPackReviewAction] : []),
      ],
      liveWriteAttempted: false,
      autoSignAttempted: false,
      autoSubmitAttempted: false,
    },
  }

  const standardTemplateCloneQa = await writeGeneratedDocx({ outputPath, job })
  job.qa.standardTemplateClone = standardTemplateCloneQa

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

  const { clinicalFacts: _clinicalFacts, sourcePacket: _sourcePacket, ...publicJob } = job

  return {
    ...publicJob,
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
