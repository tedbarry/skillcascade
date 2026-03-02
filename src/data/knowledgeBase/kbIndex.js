/**
 * Master KB index — merges all auto-generated and manual entries.
 * Import this for the full entry list and lookup functions.
 */
import { generateDomainEntries } from './generators/domainEntries.js'
import { generateSubAreaEntries } from './generators/subAreaEntries.js'
import { generateSkillEntries } from './generators/skillEntries.js'

// Manual entries — imported directly
import { gettingStartedEntries } from './entries/gettingStarted.js'
import { clinicalEntries } from './entries/clinical.js'
import { assessmentEntries } from './entries/assessment.js'
import { viewsEntries } from './entries/views.js'
import { dataExportEntries } from './entries/dataExport.js'

const MANUAL_ENTRIES = [
  ...gettingStartedEntries,
  ...clinicalEntries,
  ...assessmentEntries,
  ...viewsEntries,
  ...dataExportEntries,
]

// Lazy-cached merged list
let _allEntries = null
let _entryMap = null

export function getAllEntries() {
  if (!_allEntries) {
    _allEntries = [
      ...MANUAL_ENTRIES,
      ...generateDomainEntries(),
      ...generateSubAreaEntries(),
      ...generateSkillEntries(),
    ]
  }
  return _allEntries
}

export function getEntryMap() {
  if (!_entryMap) {
    _entryMap = new Map()
    for (const entry of getAllEntries()) {
      _entryMap.set(entry.id, entry)
    }
  }
  return _entryMap
}

export function getEntryById(id) {
  return getEntryMap().get(id) || null
}

export function getEntriesByCategory(category) {
  return getAllEntries().filter(e => e.category === category)
}

export function getCategoryCounts() {
  const counts = {}
  for (const entry of getAllEntries()) {
    counts[entry.category] = (counts[entry.category] || 0) + 1
  }
  return counts
}
