import { readFile, writeFile } from 'node:fs/promises'
import { profileTemplate } from './template-profile.js'
import { dataPath, ensureDataDir } from './local-data.js'

const STORE_VERSION = 1
const STORE_PATH = dataPath('template-profiles.json')

function sanitizeSlug(value) {
  return String(value || 'template')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'template'
}

function nowIso() {
  return new Date().toISOString()
}

function normalizeFieldAliases(fieldAliases = {}) {
  return Object.fromEntries(Object.entries(fieldAliases || {})
    .map(([templateTag, sourceTag]) => [String(templateTag || '').trim(), String(sourceTag || '').trim()])
    .filter(([templateTag, sourceTag]) => templateTag && sourceTag))
}

function summarizeAliasCoverage(profile, fieldAliases = {}) {
  const aliases = normalizeFieldAliases(fieldAliases)
  const unsupportedTags = profile.unsupportedTags || []
  return {
    aliasCount: Object.keys(aliases).length,
    mappedUnsupportedTags: unsupportedTags
      .filter((item) => aliases[item.tag])
      .map((item) => ({
        tag: item.tag,
        mappedTo: aliases[item.tag],
      })),
    unmappedUnsupportedTags: unsupportedTags
      .filter((item) => !aliases[item.tag])
      .map((item) => item.tag),
  }
}

async function readStore() {
  try {
    const text = await readFile(STORE_PATH, 'utf8')
    const parsed = JSON.parse(text)
    return {
      version: parsed.version || STORE_VERSION,
      localOnly: true,
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return { version: STORE_VERSION, localOnly: true, profiles: [] }
  }
}

async function writeStore(store) {
  await ensureDataDir()
  await writeFile(STORE_PATH, JSON.stringify({
    version: STORE_VERSION,
    localOnly: true,
    updatedAt: nowIso(),
    profiles: store.profiles,
  }, null, 2))
}

function summarizeProfile(savedProfile) {
  return {
    id: savedProfile.id,
    label: savedProfile.label,
    templatePath: savedProfile.templatePath,
    filename: savedProfile.filename,
    status: savedProfile.status,
    tagCount: savedProfile.tagCount,
    fieldAliases: savedProfile.fieldAliases || {},
    aliasSummary: savedProfile.aliasSummary || summarizeAliasCoverage(savedProfile.profile, savedProfile.fieldAliases),
    savedAt: savedProfile.savedAt,
    updatedAt: savedProfile.updatedAt,
    localOnly: true,
    profile: savedProfile.profile,
  }
}

export async function listTemplateProfiles() {
  const store = await readStore()
  return {
    localOnly: true,
    storePath: STORE_PATH,
    profileCount: store.profiles.length,
    profiles: store.profiles.map(summarizeProfile),
  }
}

export async function getTemplateProfile(profileId) {
  if (!profileId) throw new Error('templateProfileId is required')
  const store = await readStore()
  const savedProfile = store.profiles.find((profile) => profile.id === profileId)
  if (!savedProfile) throw new Error(`Saved template profile was not found: ${profileId}`)
  return summarizeProfile(savedProfile)
}

export async function saveTemplateProfile({
  templatePath,
  label = '',
  templateProfileId = '',
  fieldAliases = {},
} = {}) {
  const profile = await profileTemplate({ templatePath })
  const normalizedAliases = normalizeFieldAliases(fieldAliases)
  const store = await readStore()
  const existing = templateProfileId
    ? store.profiles.find((item) => item.id === templateProfileId)
    : null
  const id = existing?.id || `tpl-${sanitizeSlug(label || profile.filename)}-${Date.now()}`
  const timestamp = nowIso()
  const savedProfile = {
    id,
    label: String(label || existing?.label || profile.filename || 'Customer template').trim(),
    templatePath: profile.templatePath,
    filename: profile.filename,
    status: profile.status,
    tagCount: profile.tagCount,
    fieldAliases: normalizedAliases,
    aliasSummary: summarizeAliasCoverage(profile, normalizedAliases),
    savedAt: existing?.savedAt || timestamp,
    updatedAt: timestamp,
    localOnly: true,
    profile,
  }

  const nextProfiles = store.profiles.filter((item) => item.id !== id)
  nextProfiles.unshift(savedProfile)
  await writeStore({ ...store, profiles: nextProfiles })
  return summarizeProfile(savedProfile)
}
