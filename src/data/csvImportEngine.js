import { framework, ASSESSMENT_LEVELS } from './framework.js'

/* ─────────────────────────────────────────────
   Build lookup indexes from framework
   ───────────────────────────────────────────── */

let _index = null

function getIndex() {
  if (_index) return _index

  const skillById = {}       // 'd1-sa1-sg1-s1' → skill obj + domain/sa/sg context
  const skillByName = {}     // lowercase skill name → skill id
  const subAreaByName = {}   // lowercase sub-area name → sub-area id
  const domainByName = {}    // lowercase domain name → domain id
  const allSkillIds = []

  for (const domain of framework) {
    domainByName[domain.name.toLowerCase()] = domain.id
    for (const sa of domain.subAreas) {
      subAreaByName[sa.name.toLowerCase()] = sa.id
      for (const sg of sa.skillGroups) {
        for (const skill of sg.skills) {
          skillById[skill.id] = {
            ...skill,
            domainId: domain.id,
            domainName: domain.name,
            subAreaId: sa.id,
            subAreaName: sa.name,
            sgId: sg.id,
            sgName: sg.name,
          }
          skillByName[skill.name.toLowerCase()] = skill.id
          allSkillIds.push(skill.id)
        }
      }
    }
  }

  _index = { skillById, skillByName, subAreaByName, domainByName, allSkillIds }
  return _index
}

/* ─────────────────────────────────────────────
   RFC 4180 CSV Parser
   ───────────────────────────────────────────── */

export function parseCSV(text) {
  const rows = []
  let current = []
  let field = ''
  let inQuotes = false
  const len = text.length

  for (let i = 0; i < len; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          field += '"'
          i++ // skip escaped quote
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else {
      if (ch === '"' && field.length === 0) {
        inQuotes = true
      } else if (ch === ',') {
        current.push(field.trim())
        field = ''
      } else if (ch === '\r' && next === '\n') {
        current.push(field.trim())
        if (current.some(f => f !== '')) rows.push(current)
        current = []
        field = ''
        i++ // skip \n
      } else if (ch === '\n') {
        current.push(field.trim())
        if (current.some(f => f !== '')) rows.push(current)
        current = []
        field = ''
      } else {
        field += ch
      }
    }
  }

  // Last field/row
  current.push(field.trim())
  if (current.some(f => f !== '')) rows.push(current)

  return rows
}

/* ─────────────────────────────────────────────
   Column Detection — heuristic
   ───────────────────────────────────────────── */

const SKILL_NAME_HINTS = ['skill', 'behavior', 'target', 'item', 'goal', 'objective', 'competency', 'ability']
const SKILL_ID_HINTS = ['skill_id', 'skillid', 'skill id', 'id', 'code']
const SCORE_HINTS = ['score', 'rating', 'level', 'value', 'mastery', 'assessment', 'status', 'result', 'grade']
const DOMAIN_HINTS = ['domain', 'area', 'category', 'section', 'program']
const SUBAREA_HINTS = ['sub-area', 'subarea', 'sub area', 'subcategory', 'sub-category', 'strand']
const CLIENT_HINTS = ['client', 'name', 'patient', 'student', 'learner', 'child']

export function detectColumns(headers) {
  const result = {
    skillName: null,
    skillId: null,
    score: null,
    domain: null,
    subArea: null,
    clientName: null,
  }

  const lowerHeaders = headers.map(h => h.toLowerCase().trim())

  for (let i = 0; i < lowerHeaders.length; i++) {
    const h = lowerHeaders[i]

    // Skill ID (exact pattern match)
    if (!result.skillId && SKILL_ID_HINTS.some(hint => h === hint || h.replace(/[_\- ]/g, '') === hint.replace(/[_\- ]/g, ''))) {
      result.skillId = i
      continue
    }

    // Skill name
    if (!result.skillName && SKILL_NAME_HINTS.some(hint => h.includes(hint))) {
      result.skillName = i
      continue
    }

    // Score
    if (!result.score && SCORE_HINTS.some(hint => h.includes(hint))) {
      result.score = i
      continue
    }

    // Domain
    if (!result.domain && DOMAIN_HINTS.some(hint => h.includes(hint))) {
      result.domain = i
      continue
    }

    // Sub-area
    if (!result.subArea && SUBAREA_HINTS.some(hint => h.includes(hint))) {
      result.subArea = i
      continue
    }

    // Client name
    if (!result.clientName && CLIENT_HINTS.some(hint => h.includes(hint))) {
      result.clientName = i
      continue
    }
  }

  return result
}

/* ─────────────────────────────────────────────
   Auto-Map Columns — match headers to framework
   ───────────────────────────────────────────── */

export function autoMapColumns(headers) {
  const detected = detectColumns(headers)

  // Build a confidence description
  const mappings = { ...detected }
  const confidence = []

  if (detected.skillId !== null) confidence.push('skill ID column detected')
  if (detected.skillName !== null) confidence.push('skill name column detected')
  if (detected.score !== null) confidence.push('score column detected')
  if (detected.domain !== null) confidence.push('domain column detected')

  // Check if this looks like our own export format
  const headerStr = headers.map(h => h.toLowerCase()).join('|')
  const isOwnFormat = headerStr.includes('domain') && headerStr.includes('sub-area') &&
    headerStr.includes('skill') && headerStr.includes('score')

  return {
    mappings,
    confidence,
    isOwnFormat,
    canAutoImport: detected.score !== null && (detected.skillId !== null || detected.skillName !== null),
  }
}

/* ─────────────────────────────────────────────
   Score Mapping — convert external scores to 0-3
   ───────────────────────────────────────────── */

const DEFAULT_SCORE_MAP = {
  // Numeric strings
  '0': ASSESSMENT_LEVELS.NOT_ASSESSED,
  '1': ASSESSMENT_LEVELS.NEEDS_WORK,
  '2': ASSESSMENT_LEVELS.DEVELOPING,
  '3': ASSESSMENT_LEVELS.SOLID,
  // 1-5 scale (common in external tools)
  '4': ASSESSMENT_LEVELS.SOLID,
  '5': ASSESSMENT_LEVELS.SOLID,
  // Label-based (SkillCascade labels)
  'not assessed': ASSESSMENT_LEVELS.NOT_ASSESSED,
  'needs work': ASSESSMENT_LEVELS.NEEDS_WORK,
  'developing': ASSESSMENT_LEVELS.DEVELOPING,
  'solid': ASSESSMENT_LEVELS.SOLID,
  // Common external labels
  'not started': ASSESSMENT_LEVELS.NOT_ASSESSED,
  'not mastered': ASSESSMENT_LEVELS.NEEDS_WORK,
  'in progress': ASSESSMENT_LEVELS.DEVELOPING,
  'emerging': ASSESSMENT_LEVELS.DEVELOPING,
  'mastered': ASSESSMENT_LEVELS.SOLID,
  'acquired': ASSESSMENT_LEVELS.SOLID,
  'proficient': ASSESSMENT_LEVELS.SOLID,
  'independent': ASSESSMENT_LEVELS.SOLID,
  'prompted': ASSESSMENT_LEVELS.DEVELOPING,
  'partial': ASSESSMENT_LEVELS.DEVELOPING,
  'baseline': ASSESSMENT_LEVELS.NEEDS_WORK,
  'na': ASSESSMENT_LEVELS.NOT_ASSESSED,
  'n/a': ASSESSMENT_LEVELS.NOT_ASSESSED,
  '': ASSESSMENT_LEVELS.NOT_ASSESSED,
}

export function mapScore(rawValue, customScoreMap) {
  const scoreMap = customScoreMap || DEFAULT_SCORE_MAP
  const key = String(rawValue).toLowerCase().trim()

  if (key in scoreMap) return scoreMap[key]

  // Try numeric parse for percentage-based scores (0-100)
  const num = parseFloat(key)
  if (!isNaN(num)) {
    if (num <= 0) return ASSESSMENT_LEVELS.NOT_ASSESSED
    if (num <= 33) return ASSESSMENT_LEVELS.NEEDS_WORK
    if (num <= 66) return ASSESSMENT_LEVELS.DEVELOPING
    return ASSESSMENT_LEVELS.SOLID
  }

  return ASSESSMENT_LEVELS.NOT_ASSESSED
}

/* ─────────────────────────────────────────────
   Skill Matching — fuzzy match external names
   ───────────────────────────────────────────── */

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function matchSkill(name, domainHint) {
  const { skillByName, skillById, allSkillIds } = getIndex()
  const lower = name.toLowerCase().trim()

  // Exact name match
  if (skillByName[lower]) return skillByName[lower]

  // Normalized match (ignore punctuation/spaces)
  const norm = normalize(name)
  for (const [skillName, skillId] of Object.entries(skillByName)) {
    if (normalize(skillName) === norm) return skillId
  }

  // Contains match — skill name is contained in input or vice versa
  // (only if long enough to avoid false positives)
  if (norm.length >= 15) {
    for (const [skillName, skillId] of Object.entries(skillByName)) {
      const normSkill = normalize(skillName)
      if (normSkill.length >= 15 && (norm.includes(normSkill) || normSkill.includes(norm))) {
        // If domain hint provided, prefer matching domain
        if (domainHint) {
          const info = skillById[skillId]
          if (info && info.domainId === domainHint) return skillId
        } else {
          return skillId
        }
      }
    }
  }

  return null
}

/* ─────────────────────────────────────────────
   Transform — rows + mapping → assessments
   ───────────────────────────────────────────── */

export function transformToAssessments(rows, columnMapping, customScoreMap) {
  const { skillById } = getIndex()
  const assessments = {}
  const unmapped = []
  let mapped = 0

  // Skip header row (rows[0] is headers)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]

    // Try skill ID first
    if (columnMapping.skillId !== null && columnMapping.skillId !== undefined) {
      const rawId = (row[columnMapping.skillId] || '').trim()
      if (rawId && skillById[rawId]) {
        const score = columnMapping.score !== null ? mapScore(row[columnMapping.score], customScoreMap) : ASSESSMENT_LEVELS.NOT_ASSESSED
        if (score > 0) {
          assessments[rawId] = score
          mapped++
        }
        continue
      }
    }

    // Try skill name matching
    if (columnMapping.skillName !== null && columnMapping.skillName !== undefined) {
      const rawName = (row[columnMapping.skillName] || '').trim()
      if (!rawName) continue

      // Get domain hint if available
      let domainHint = null
      if (columnMapping.domain !== null && columnMapping.domain !== undefined) {
        const rawDomain = (row[columnMapping.domain] || '').trim()
        const { domainByName } = getIndex()
        domainHint = domainByName[rawDomain.toLowerCase()] || null
      }

      const skillId = matchSkill(rawName, domainHint)
      if (skillId) {
        const score = columnMapping.score !== null ? mapScore(row[columnMapping.score], customScoreMap) : ASSESSMENT_LEVELS.NOT_ASSESSED
        if (score > 0) {
          assessments[skillId] = score
          mapped++
        }
      } else {
        unmapped.push({ row: i + 1, name: rawName })
      }
    }
  }

  return { assessments, mapped, unmapped, total: rows.length - 1 }
}

/* ─────────────────────────────────────────────
   Detect unique score values in data
   ───────────────────────────────────────────── */

export function detectScoreValues(rows, scoreColumnIndex) {
  if (scoreColumnIndex === null || scoreColumnIndex === undefined) return []
  const unique = new Set()
  for (let i = 1; i < rows.length; i++) {
    const val = (rows[i][scoreColumnIndex] || '').trim()
    if (val) unique.add(val)
  }
  return [...unique].sort()
}

/* ─────────────────────────────────────────────
   Preview — sample rows for user review
   ───────────────────────────────────────────── */

export function getPreviewRows(rows, count = 5) {
  if (rows.length <= 1) return { headers: [], rows: [] }
  return {
    headers: rows[0],
    rows: rows.slice(1, 1 + count),
  }
}

/* ─────────────────────────────────────────────
   Full import pipeline (convenience)
   ───────────────────────────────────────────── */

export function processImportFile(text, fileName) {
  let rows

  if (fileName.endsWith('.csv')) {
    rows = parseCSV(text)
  } else if (fileName.endsWith('.json')) {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed) && parsed.length > 0) {
      rows = [Object.keys(parsed[0]), ...parsed.map(obj => Object.values(obj).map(String))]
    } else {
      throw new Error('JSON must be an array of objects')
    }
  } else {
    throw new Error('Unsupported file type. Use CSV or JSON.')
  }

  if (rows.length < 2) throw new Error('File has no data rows')

  const headers = rows[0]
  const autoMap = autoMapColumns(headers)
  const preview = getPreviewRows(rows)
  const scoreValues = autoMap.mappings.score !== null ? detectScoreValues(rows, autoMap.mappings.score) : []

  return {
    rows,
    headers,
    autoMap,
    preview,
    scoreValues,
    totalRows: rows.length - 1,
  }
}
