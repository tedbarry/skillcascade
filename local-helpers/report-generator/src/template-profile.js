import { readFile } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import InspectModule from 'docxtemplater/js/inspect-module.js'

export const TEMPLATE_SCALAR_FIELDS = [
  { tag: 'report_title', label: 'Report Title', required: true },
  { tag: 'client_label', label: 'Client Label', required: true },
  { tag: 'generated_at', label: 'Generated Date', required: false },
  { tag: 'diagnosis_summary', label: 'Diagnosis Summary', required: false },
  { tag: 'family_history', label: 'Family History', required: false },
  { tag: 'developmental_history', label: 'Developmental History', required: false },
  { tag: 'educational_history', label: 'Educational History', required: false },
  { tag: 'behavior_profile', label: 'Behavior Profile', required: false },
  { tag: 'communication_profile', label: 'Communication Profile', required: false },
  { tag: 'social_profile', label: 'Social Profile', required: false },
  { tag: 'caregiver_training', label: 'Caregiver Training', required: false },
  { tag: 'missing_fields', label: 'Missing / Review Fields', required: false },
]

export const TEMPLATE_GOAL_FIELDS = [
  { tag: 'goals.domain', label: 'Goal Domain', required: false },
  { tag: 'goals.long_term_goal', label: 'Long-Term Goal', required: false },
  { tag: 'goals.short_term_goal', label: 'Short-Term Goal', required: false },
  { tag: 'goals.objective', label: 'Objective', required: true },
  { tag: 'goals.baseline', label: 'Baseline', required: false },
  { tag: 'goals.current_level', label: 'Current Level', required: false },
  { tag: 'goals.criteria', label: 'Criteria', required: false },
  { tag: 'goals.target_date', label: 'Target Date', required: false },
  { tag: 'goals.graphs', label: 'Graphs', required: false },
]

export const TEMPLATE_CONTROL_TAGS = [
  { tag: 'goals', label: 'Goals Loop', required: true, control: true },
]

export const SUPPORTED_TEMPLATE_FIELDS = [...TEMPLATE_SCALAR_FIELDS, ...TEMPLATE_GOAL_FIELDS]
export const SUPPORTED_TEMPLATE_TAGS = new Set([...SUPPORTED_TEMPLATE_FIELDS, ...TEMPLATE_CONTROL_TAGS].map((field) => field.tag))

const TAG_SUGGESTIONS = {
  client_name: 'client_label',
  client: 'client_label',
  name: 'client_label',
  title: 'report_title',
  report_date: 'generated_at',
  date: 'generated_at',
  diagnosis: 'diagnosis_summary',
  family: 'family_history',
  development: 'developmental_history',
  developmental: 'developmental_history',
  education: 'educational_history',
  school: 'educational_history',
  behavior: 'behavior_profile',
  maladaptive_behavior: 'behavior_profile',
  communication: 'communication_profile',
  social: 'social_profile',
  caregiver: 'caregiver_training',
  parent_training: 'caregiver_training',
  objective: 'goals.objective',
  goal: 'goals.objective',
  baseline: 'goals.baseline',
  criteria: 'goals.criteria',
}

function normalizeTagName(value) {
  return String(value || '')
    .trim()
    .replace(/^\.+|\.+$/g, '')
    .replace(/\s+/g, '_')
}

function flattenTags(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  const paths = []
  for (const [key, nested] of Object.entries(value)) {
    const normalizedKey = normalizeTagName(key)
    const path = prefix ? `${prefix}.${normalizedKey}` : normalizedKey
    paths.push(path)
    paths.push(...flattenTags(nested, path))
  }
  return [...new Set(paths)].sort((a, b) => a.localeCompare(b))
}

function suggestTag(tag) {
  const normalized = normalizeTagName(tag).toLowerCase()
  if (TAG_SUGGESTIONS[normalized]) return TAG_SUGGESTIONS[normalized]
  const lastSegment = normalized.split('.').pop()
  if (TAG_SUGGESTIONS[lastSegment]) return TAG_SUGGESTIONS[lastSegment]

  return [...SUPPORTED_TEMPLATE_TAGS].find((candidate) => (
    candidate.endsWith(`.${lastSegment}`) || lastSegment.includes(candidate.replace(/^goals\./, ''))
  )) || ''
}

function classifyProfile({ templatePath, fileType, templatedFiles, tags, structuredTags }) {
  const tagSet = new Set(tags)
  const supportedTags = tags.filter((tag) => SUPPORTED_TEMPLATE_TAGS.has(tag))
  const unsupportedTags = tags
    .filter((tag) => !SUPPORTED_TEMPLATE_TAGS.has(tag))
    .map((tag) => ({
      tag,
      suggestedTag: suggestTag(tag),
      behavior: 'will-render-as-review-marker-until-mapped',
    }))

  const missingRecommendedFields = SUPPORTED_TEMPLATE_FIELDS
    .filter((field) => !tagSet.has(field.tag))
    .map((field) => ({
      tag: field.tag,
      label: field.label,
      required: field.required,
    }))

  const requiredMissing = missingRecommendedFields.filter((field) => field.required)
  const hasGoalLoop = tagSet.has('goals')
  const hasGoalObjective = tagSet.has('goals.objective')
  const hasAnyTags = tags.length > 0
  const hasUnsupported = unsupportedTags.length > 0
  const status = !hasAnyTags
    ? 'no-placeholders-found'
    : requiredMissing.length || !hasGoalLoop || !hasGoalObjective || hasUnsupported
      ? 'needs-template-review'
      : 'ready'

  const warnings = [
    ...(!hasAnyTags ? ['Template contains no docxtemplater placeholders. Generated output may not insert report data.'] : []),
    ...requiredMissing.map((field) => `Missing useful placeholder: ${field.tag}`),
    ...(!hasGoalLoop ? ['Missing goal loop placeholder: {#goals}...{/goals}'] : []),
    ...(hasGoalLoop && !hasGoalObjective ? ['Goal loop exists but goals.objective was not detected.'] : []),
    ...unsupportedTags.map((field) => `Unsupported placeholder: ${field.tag}`),
  ]

  return {
    id: `template-profile-${Date.now()}`,
    localOnly: true,
    templatePath,
    filename: basename(templatePath),
    extension: extname(templatePath).toLowerCase(),
    fileType,
    status,
    renderMode: hasAnyTags ? 'placeholder-template' : 'plain-docx-no-placeholder',
    templatedFiles,
    tagCount: tags.length,
    tags,
    supportedTags,
    unsupportedTags,
    missingRecommendedFields,
    requiredMissing,
    goalLoop: {
      detected: hasGoalLoop,
      objectiveDetected: hasGoalObjective,
    },
    structuredTags: structuredTags.map((part) => ({
      type: part.type,
      value: part.value,
      module: part.module || '',
      inverted: part.inverted === true,
    })),
    warnings,
    safety: {
      cloudUpload: false,
      sourceTextReturned: false,
      liveExternalWrites: false,
    },
  }
}

export async function profileTemplate({ templatePath } = {}) {
  if (!templatePath) throw new Error('templatePath is required')
  const resolvedPath = resolve(templatePath)
  if (extname(resolvedPath).toLowerCase() !== '.docx') {
    throw new Error('Only .docx templates are supported in this pilot.')
  }

  const content = await readFile(resolvedPath)
  const zip = new PizZip(content)
  const inspectModule = new InspectModule()
  new Docxtemplater(zip, {
    modules: [inspectModule],
    paragraphLoop: true,
    linebreaks: true,
  })

  const allTags = inspectModule.getAllTags()
  const structuredTags = inspectModule.getAllStructuredTags()
  const templatedFiles = inspectModule.getTemplatedFiles()
  const fileType = inspectModule.getFileType()
  const tags = flattenTags(allTags)

  return classifyProfile({
    templatePath: resolvedPath,
    fileType,
    templatedFiles,
    tags,
    structuredTags,
  })
}
