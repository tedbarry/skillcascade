/**
 * Supabase-backed storage for authorization reports.
 * Replaces localStorage + IndexedDB with a single source of truth.
 *
 * Legacy browser encryption compatibility remains here for older rows,
 * but the canonical compliance path is AWS-first under the BAA.
 */
import { supabase } from './supabase.js'
import { api } from './api.js'
import { getSessionKey, encryptFields, decryptFields, PHI_FIELDS, logEncryption } from './crypto.js'

const REPORT_PHI = PHI_FIELDS.auth_reports || ['fields', 'label']

async function encryptReport(obj) {
  const key = getSessionKey()
  if (!key || !obj) return obj
  const result = await encryptFields(key, obj, REPORT_PHI)
  REPORT_PHI.forEach(f => { if (obj[f] != null) logEncryption('auth_reports', f, 'encrypt') })
  return result
}

async function decryptReport(obj) {
  if (!obj) return obj
  const key = getSessionKey()
  if (!key) return obj
  const result = await decryptFields(key, obj, REPORT_PHI)
  REPORT_PHI.forEach(f => {
    if (obj[f] && typeof obj[f] === 'string' && obj[f].startsWith('enc:')) {
      logEncryption('auth_reports', f, 'decrypt')
    }
  })
  return result
}

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

/**
 * Save (upsert) the current draft for a client.
 * One draft per client per user — upserts by matching client_id + created_by + is_draft.
 */
export async function saveDraft(clientId, fields, goalGraphs = {}) {
  const userId = await getUserId()

  // Check if a draft already exists
  const { data: existing } = await api
    .from('auth_reports')
    .select('id')
    .eq('client_id', clientId)
    .eq('created_by', userId)
    .eq('is_draft', true)
    .single()

  // 🔒 Encrypt PHI fields
  const encrypted = await encryptReport({ fields, label: null })

  const row = {
    client_id: clientId,
    created_by: userId,
    fields: encrypted.fields,
    goal_graphs: goalGraphs,
    is_draft: true,
    updated_at: new Date().toISOString(),
  }

  let result
  if (existing) {
    result = await api
      .from('auth_reports')
      .update(row)
      .eq('id', existing.id)
  } else {
    result = await api
      .from('auth_reports')
      .insert(row)
  }

  if (result.error) throw result.error
  const data = Array.isArray(result.data) ? result.data[0] : result.data
  return data
}

/**
 * Load the current draft for a client.
 * Returns { fields, goalGraphs } or null if no draft exists.
 */
export async function loadDraft(clientId) {
  const userId = await getUserId()

  const { data, error } = await api
    .from('auth_reports')
    .select('id, fields, goal_graphs, updated_at')
    .eq('client_id', clientId)
    .eq('created_by', userId)
    .eq('is_draft', true)
    .single()

  if (error || !data) return null
  // 🔒 Decrypt PHI fields
  const decrypted = await decryptReport(data)
  return {
    id: decrypted.id,
    fields: decrypted.fields || {},
    goalGraphs: decrypted.goal_graphs || {},
    updatedAt: decrypted.updated_at,
  }
}

/**
 * Save a named report snapshot (not a draft).
 */
export async function saveReport(clientId, label, fields, goalGraphs = {}) {
  const userId = await getUserId()

  // 🔒 Encrypt PHI fields
  const encrypted = await encryptReport({ fields, label })

  const { data, error } = await api
    .from('auth_reports')
    .insert({
      client_id: clientId,
      created_by: userId,
      label: encrypted.label,
      fields: encrypted.fields,
      goal_graphs: goalGraphs,
      is_draft: false,
    })

  if (error) throw error
  const saved = Array.isArray(data) ? data[0] : data
  return saved
}

/**
 * Load a specific saved report by ID.
 */
export async function loadReport(reportId) {
  const { data, error } = await api
    .from('auth_reports')
    .select('*')
    .eq('id', reportId)
    .single()

  if (error) throw error
  // 🔒 Decrypt PHI fields
  const decrypted = await decryptReport(data)
  return {
    id: decrypted.id,
    label: decrypted.label,
    fields: decrypted.fields || {},
    goalGraphs: decrypted.goal_graphs || {},
    createdAt: decrypted.created_at,
    updatedAt: decrypted.updated_at,
  }
}

/**
 * List all saved (non-draft) reports for a client, newest first.
 */
export async function listReports(clientId) {
  const userId = await getUserId()

  const { data, error } = await api
    .from('auth_reports')
    .select('id, label, created_at, updated_at')
    .eq('client_id', clientId)
    .eq('created_by', userId)
    .eq('is_draft', false)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error
  // 🔒 Decrypt labels
  const results = []
  for (const r of (data || [])) {
    const dec = await decryptReport(r)
    results.push({
      id: dec.id,
      label: dec.label,
      date: dec.created_at,
      updatedAt: dec.updated_at,
    })
  }
  return results
}

/**
 * Delete a saved report by ID.
 */
export async function deleteReport(reportId) {
  const { error } = await api
    .from('auth_reports')
    .delete()
    .eq('id', reportId)

  if (error) throw error
}
