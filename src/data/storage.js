/**
 * Data persistence layer — Cloudflare Workers API backend.
 * All functions are async and return data from the database.
 *
 * Legacy browser encryption compatibility:
 * if an old client-side key exists we still honor it, but the canonical
 * compliance path is AWS-first under the BAA rather than browser PHI setup.
 */

import { api } from '../lib/api.js'
import { getDatabaseStgId, getGoalProvenanceFields } from '../lib/recommendationDraftAdapters.js'
import { getSessionKey, encryptFields, decryptFields, PHI_FIELDS, logEncryption, restoreSessionKey } from '../lib/crypto.js'
import { getLinkedSessionStatusForNoteStatus } from '../lib/sessionNoteWorkflow.js'

/**
 * Legacy compatibility helper for older encrypted rows.
 * New runtime behavior allows plaintext app writes over the AWS/BAA path when
 * no legacy browser key is present.
 */
async function encryptClientData(obj) {
  await restoreSessionKey()

  const key = getSessionKey()
  if (!key) {
    return obj
  }
  const fields = PHI_FIELDS.clients || []
  const encrypted = await encryptFields(key, obj, fields)
  fields.forEach(f => { if (obj[f] != null) logEncryption('clients', f, 'encrypt') })
  return encrypted
}

/**
 * Decrypt legacy-encrypted PHI fields after loading from the database.
 */
async function decryptClientData(obj) {
  if (!obj) return obj
  await restoreSessionKey()
  const key = getSessionKey()
  if (!key) return obj // No key = return as-is (may be plaintext or encrypted)
  const fields = PHI_FIELDS.clients || []
  const decrypted = await decryptFields(key, obj, fields)
  fields.forEach(f => {
    if (obj[f] && typeof obj[f] === 'string' && obj[f].startsWith('enc:')) {
      logEncryption('clients', f, 'decrypt')
    }
  })
  return decrypted
}

async function decryptClientList(arr) {
  if (!arr || !Array.isArray(arr)) return arr
  return await Promise.all(arr.map(decryptClientData))
}

/**
 * Client profiles
 */
export async function saveClient(client, orgId) {
  if (client.id) {
    // Update existing — encrypt PHI fields before saving
    const encrypted = await encryptClientData({
      name: client.name,
      date_of_birth: client.date_of_birth,
      notes: client.notes,
    })
    const { data, error } = await api
      .from('clients')
      .update(encrypted)
      .eq('id', client.id)
    if (error) throw error
    const result = Array.isArray(data) ? data[0] : data
    return await decryptClientData(result)
  }
  // Insert new — encrypt PHI fields before saving
  const encrypted = await encryptClientData({
    name: client.name,
    date_of_birth: client.date_of_birth,
    notes: client.notes,
  })
  const { data, error } = await api
    .from('clients')
    .insert({ ...encrypted, org_id: orgId })
  if (error) throw error
  const result = Array.isArray(data) ? data[0] : data
  return await decryptClientData(result)
}

export async function getClients(orgId) {
  const { data, error } = await api
    .from('clients')
    .select('*')
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false }) // Can't order by encrypted name
  if (error) throw error
  // Decrypt any legacy-encrypted client names/DOBs/notes
  const decrypted = await decryptClientList(data || [])
  // Sort by decrypted name client-side
  return decrypted.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

export async function getClient(id) {
  const { data, error } = await api
    .from('clients')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error) return null
  return await decryptClientData(data)
}

export async function assignClientToUser(clientId, userId, role = 'bcba') {
  const { error } = await api
    .from('client_assignments')
    .upsert({ client_id: clientId, user_id: userId, role }, { onConflict: 'client_id,user_id' })
  if (error) throw error
}

export async function unassignClientFromUser(clientId, userId) {
  const { error } = await api
    .from('client_assignments')
    .delete()
    .eq('client_id', clientId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function deleteClient(id) {
  // Soft delete for data retention best practices
  const { error } = await api
    .from('clients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/**
 * Assessments — stored as individual rows, returned as a map of skillId → level
 */
export async function saveAssessment(clientId, assessments, userId) {
  // Split entries: assessed skills (0-3) get upserted, null/undefined get deleted
  const upsertRows = []
  const deleteSkillIds = []

  Object.entries(assessments)
    .filter(([key]) => !key.startsWith('_'))
    .forEach(([skillId, level]) => {
      if (level !== null && level !== undefined) {
        upsertRows.push({
          client_id: clientId,
          skill_id: skillId,
          level,
          assessed_by: userId,
          assessed_at: new Date().toISOString(),
        })
      } else {
        deleteSkillIds.push(skillId)
      }
    })

  // Upsert assessed skills
  if (upsertRows.length > 0) {
    const { error } = await api
      .from('assessments')
      .upsert(upsertRows, { onConflict: 'client_id,skill_id' })
    if (error) throw error
  }

  // Delete cleared skills (null = "Not Assessed" → remove from DB)
  if (deleteSkillIds.length > 0) {
    const { error } = await api
      .from('assessments')
      .delete()
      .eq('client_id', clientId)
      .in('skill_id', deleteSkillIds)
    if (error) throw error
  }

  return assessments
}

export async function getAssessments(clientId) {
  const { data, error } = await api
    .from('assessments')
    .select('skill_id, level')
    .eq('client_id', clientId)
  if (error) throw error

  // Convert rows to map: { skillId: level }
  const map = {}
  for (const row of data || []) {
    map[row.skill_id] = row.level
  }
  return map
}

export async function getLastAssessedDates(clientIds) {
  if (!clientIds.length) return {}
  const { data, error } = await api
    .from('assessments')
    .select('client_id, assessed_at')
    .in('client_id', clientIds)
    .order('assessed_at', { ascending: false })
  if (error) throw error

  // Keep only the most recent assessed_at per client
  const map = {}
  for (const row of data || []) {
    if (!map[row.client_id]) {
      map[row.client_id] = row.assessed_at
    }
  }
  return map
}

export async function deleteAssessments(clientId) {
  const { error } = await api
    .from('assessments')
    .delete()
    .eq('client_id', clientId)
  if (error) throw error
}

/**
 * Assessment snapshots — for progress timeline
 */
export async function saveSnapshot(clientId, label, data, userId) {
  const { error } = await api
    .from('snapshots')
    .insert({
      client_id: clientId,
      label,
      data,
      created_by: userId,
    })
  if (error) throw error

  // Return all snapshots for this client
  return getSnapshots(clientId)
}

export async function getSnapshots(clientId) {
  const { data, error } = await api
    .from('snapshots')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at')
  if (error) throw error

  // Normalize to the shape the frontend expects
  return (data || []).map((s) => ({
    id: s.id,
    label: s.label,
    timestamp: new Date(s.created_at).getTime(),
    assessments: s.data,
  }))
}

export async function deleteSnapshot(clientId, snapshotId) {
  const { error } = await api
    .from('snapshots')
    .delete()
    .eq('id', snapshotId)
    .eq('client_id', clientId)
  if (error) throw error

  return getSnapshots(clientId)
}

/**
 * Saved reports — frozen assessment snapshots with report metadata
 */
export async function saveReport(clientId, report, userId) {
  const { error } = await api
    .from('reports')
    .insert({
      client_id: clientId,
      report_type: report.reportType,
      title: report.title,
      assessments: report.assessments,
      config: report.config,
      created_by: userId,
    })
  if (error) throw error
  return getReports(clientId)
}

export async function getReports(clientId) {
  const { data, error } = await api
    .from('reports')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((r) => ({
    id: r.id,
    reportType: r.report_type,
    title: r.title,
    assessments: r.assessments,
    config: r.config || {},
    createdAt: new Date(r.created_at).getTime(),
  }))
}

export async function deleteReport(clientId, reportId) {
  const { error } = await api
    .from('reports')
    .delete()
    .eq('id', reportId)
    .eq('client_id', clientId)
  if (error) throw error
  return getReports(clientId)
}

/**
 * AI Chats — org-scoped, cross-client, cross-user
 */

/** Load all chats for a tool across the entire org. */
export async function getAiChats(toolId) {
  const { data, error } = await api
    .from('ai_chats')
    .select('*')
    .eq('tool_id', toolId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  const key = getSessionKey()
  const chatFields = PHI_FIELDS.ai_chats || []
  const results = []
  for (const row of (data || [])) {
    let decrypted = row
    if (key) {
      decrypted = await decryptFields(key, row, chatFields)
    }
    results.push({
      id: decrypted.id,
      title: decrypted.title,
      messages: decrypted.messages || [],
      client_name: decrypted.client_name,
      user_id: decrypted.user_id,
      created_at: new Date(decrypted.created_at).getTime(),
      updated_at: new Date(decrypted.updated_at).getTime(),
    })
  }
  return results
}

/** Create or update a chat. Returns the saved row. */
export async function saveAiChat(chat, orgId, userId) {
  const key = getSessionKey()
  const chatFields = PHI_FIELDS.ai_chats || []

  // Preserve legacy browser encryption only when a session key already exists.
  const toEncrypt = { title: chat.title, messages: chat.messages, client_name: chat.client_name }
  const encrypted = key ? await encryptFields(key, toEncrypt, chatFields) : toEncrypt
  if (key) chatFields.forEach(f => { if (toEncrypt[f] != null) logEncryption('ai_chats', f, 'encrypt') })

  if (chat.id) {
    const { data, error } = await api
      .from('ai_chats')
      .update({ title: encrypted.title, messages: encrypted.messages, client_name: encrypted.client_name })
      .eq('id', chat.id)
    if (error) throw error
    const result = Array.isArray(data) ? data[0] : data
    return { ...chat, id: result.id }
  }
  const { data, error } = await api
    .from('ai_chats')
    .insert({
      org_id: orgId,
      user_id: userId,
      tool_id: chat.tool_id,
      title: encrypted.title,
      messages: encrypted.messages,
      client_name: encrypted.client_name,
    })
  if (error) throw error

  // Decrypt for return
  const result = Array.isArray(data) ? data[0] : data
  const decrypted = key ? await decryptFields(key, result, chatFields) : result
  return {
    id: decrypted.id,
    title: decrypted.title,
    messages: decrypted.messages || [],
    client_name: decrypted.client_name,
    user_id: decrypted.user_id,
    created_at: new Date(decrypted.created_at).getTime(),
    updated_at: new Date(decrypted.updated_at).getTime(),
  }
}

/** Delete a chat (only creator can delete, enforced by RLS). */
export async function deleteAiChat(chatId) {
  const { error } = await api
    .from('ai_chats')
    .delete()
    .eq('id', chatId)
  if (error) throw error
}

/**
 * Sync Report → Learning Tree: Creates/updates client_programs from authorization report goals.
 * Called when a report is finalized. Matches by stg_id first, then by goal name.
 * Returns { created: number, updated: number, skipped: number, details: string[] }
 */
export async function syncReportToLearningTree(clientId, reportFields) {
  const { routeGoal } = await import('../lib/goalRouter.js')
  const goals = reportFields.goals || []
  if (goals.length === 0) return { created: 0, updated: 0, skipped: 0, details: ['No goals in report'] }

  // Load existing programs for this client
  const { data: existingPrograms, error: loadErr } = await api
    .from('client_programs')
    .select('*')
    .eq('client_id', clientId)
  if (loadErr) throw loadErr

  const existing = existingPrograms || []
  const results = { created: 0, updated: 0, skipped: 0, details: [] }

  const domainMap = {
    maladaptive: 'Behavior',
    replacement: 'Behavior',
    communication: 'Communication',
    socialization: 'Social',
    adaptive_daily_living: 'Adaptive Daily Living',
    coping_self_regulation: 'Coping & Self-Regulation',
    socialGroup: 'Social',
    parent: 'Parent Training',
  }

  const toCreate = []
  const toUpdate = []

  for (const goal of goals) {
    // Parent goals now sync like all others (domain = 'Parent Training')

    const stgId = getDatabaseStgId(goal.stg_id || goal.skillId)
    const provenanceFields = {
      ...getGoalProvenanceFields(goal),
      source_type: goal.source_type || goal.sourceType || 'auth_report',
      source_label: goal.source_label || goal.sourceLabel || 'Authorization Report',
    }
    let match = null
    if (stgId) match = existing.find(p => p.stg_id === stgId)
    if (!match && provenanceFields.library_target_id) match = existing.find(p => p.library_target_id === provenanceFields.library_target_id)
    if (!match && goal.program) match = existing.find(p => (p.name || '').toLowerCase().trim() === (goal.program || '').toLowerCase().trim())

    const programDomain = domainMap[goal.domain] || 'Communication'

    if (match) {
      const updates = { updated_at: new Date().toISOString() }
      if (goal.objective && goal.objective !== match.objective) updates.objective = goal.objective
      if (goal.criteria && goal.criteria !== match.criteria) updates.criteria = goal.criteria
      if (goal.baseline && !match.baseline) updates.baseline = goal.baseline
      for (const [key, value] of Object.entries(provenanceFields)) {
        const hasValue = Array.isArray(value) ? value.length > 0 : value != null && value !== ''
        if (!hasValue) continue
        const current = match[key]
        const changed = Array.isArray(value) || typeof value === 'object'
          ? JSON.stringify(current || []) !== JSON.stringify(value)
          : current !== value
        if (changed) updates[key] = value
      }
      if (goal.mastered || goal.currentLevel === 'Mastered') {
        if (match.status !== 'mastered') {
          updates.status = 'mastered'
          updates.mastered_at = new Date().toISOString()
        }
      }
      if (Object.keys(updates).length > 1) {
        toUpdate.push({ id: match.id, updates, name: match.name })
      } else {
        results.skipped++
        results.details.push(`No changes needed: ${match.name}`)
      }
    } else {
      toCreate.push({
        client_id: clientId,
        stg_id: stgId,
        domain: programDomain,
        ltg_name: goal.ltg_name || goal.longTermGoal || (() => {
          const route = routeGoal(goal.program || goal.skillName || '', goal.objective, goal.domain)
          return route.ltgName
        })(),
        stg_name: goal.stg_name || '',
        name: goal.program || goal.skillName || goal.objective || 'Unnamed Goal',
        objective: goal.objective || goal.goalText || '',
        criteria: goal.criteria || '80% accuracy across 5 consecutive sessions',
        baseline: goal.baseline || '0%',
        measurement_type: goal.measurement_type || 'percentage',
        goal_type: goal.goal_type || goal.type || 'increase',
        skill_mappings: null,
        status: (goal.mastered || goal.currentLevel === 'Mastered') ? 'mastered' : 'acquisition',
        display_order: existing.length + toCreate.length,
        ...provenanceFields,
      })
    }
  }

  // Batch insert new programs (single API call)
  if (toCreate.length > 0) {
    const { error } = await api.from('client_programs').insert(toCreate)
    if (!error) {
      results.created = toCreate.length
      toCreate.forEach(p => results.details.push(`Created: ${p.name}`))
    } else {
      console.error('[Sync] Batch insert failed:', error.message)
      results.details.push(`Batch insert failed: ${error.message}`)
      results.skipped += toCreate.length
    }
  }

  // Update existing programs (parallel, max 5 concurrent)
  for (const item of toUpdate) {
    const { error } = await api.from('client_programs').update(item.updates).eq('id', item.id)
    if (!error) {
      results.updated++
      results.details.push(`Updated: ${item.name}`)
    }
  }

  return results
}

/**
 * Sync Session Data → Assessment: Updates skill assessment levels based on session performance.
 * For each program with session data, looks up skill_mappings and sets assessment level
 * based on recent accuracy: 0-50% → 1, 50-75% → 2, 75-90% → 2, 90%+ → 3
 * Returns { updated: number, skipped: number, details: string[] }
 */
export async function syncSessionDataToAssessment(clientId, programId, userId) {
  // Build query for programs — single program or all for client
  let programsQuery = api.from('client_programs').select('id, name, skill_mappings, status')
    .eq('client_id', clientId)
  if (programId) {
    programsQuery = programsQuery.eq('id', programId)
  }

  const { data: programs, error: progErr } = await programsQuery
  if (progErr) throw progErr
  if (!programs || programs.length === 0) return { updated: 0, skipped: 0, details: ['No programs found'] }

  const results = { updated: 0, skipped: 0, details: [] }
  const assessmentUpdates = {}

  for (const prog of programs) {
    // Skip programs without skill mappings
    if (!prog.skill_mappings || prog.skill_mappings.length === 0) {
      results.skipped++
      results.details.push(`No skill mappings: ${prog.name}`)
      continue
    }

    // Get recent session data for this program (last 5 sessions)
    const { data: sessionData, error: sdErr } = await api
      .from('session_data')
      .select('percentage, correct_count, total_trials, created_at')
      .eq('program_id', prog.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (sdErr || !sessionData || sessionData.length === 0) {
      results.skipped++
      results.details.push(`No session data: ${prog.name}`)
      continue
    }

    // Calculate average percentage from recent sessions
    const percentages = sessionData
      .filter(sd => sd.percentage != null)
      .map(sd => sd.percentage)

    if (percentages.length === 0) {
      results.skipped++
      results.details.push(`No percentage data: ${prog.name}`)
      continue
    }

    const avgPct = percentages.reduce((sum, p) => sum + p, 0) / percentages.length

    // Map percentage to assessment level
    // 0-50% → level 1 (Emerging)
    // 50-75% → level 2 (Developing)
    // 75-90% → level 2 (Developing)
    // 90%+ → level 3 (Proficient)
    let level
    if (avgPct >= 90) level = 3
    else if (avgPct >= 50) level = 2
    else level = 1

    // Apply to all mapped skills
    for (const skillId of prog.skill_mappings) {
      assessmentUpdates[skillId] = level
    }

    results.updated++
    results.details.push(`${prog.name}: ${Math.round(avgPct)}% avg → level ${level} (${prog.skill_mappings.length} skill${prog.skill_mappings.length !== 1 ? 's' : ''})`)
  }

  // Save all assessment updates at once
  if (Object.keys(assessmentUpdates).length > 0) {
    await saveAssessment(clientId, assessmentUpdates, userId)
  }

  return results
}

/**
 * Delete all data for an organization — clients (soft-delete), assessments, snapshots, messages
 */
export async function clearAllData(orgId) {
  // Get all clients in this org
  const { data: clients, error: clientsErr } = await api
    .from('clients')
    .select('id')
    .eq('org_id', orgId)
    .is('deleted_at', null)
  if (clientsErr) throw clientsErr

  const clientIds = (clients || []).map((c) => c.id)
  if (clientIds.length === 0) return

  // Delete assessments, snapshots, and messages for all clients
  const { error: assessErr } = await api.from('assessments').delete().in('client_id', clientIds)
  if (assessErr) throw assessErr

  const { error: snapErr } = await api.from('snapshots').delete().in('client_id', clientIds)
  if (snapErr) throw snapErr

  const { error: repErr } = await api.from('reports').delete().in('client_id', clientIds)
  if (repErr) throw repErr

  const { error: msgErr } = await api.from('messages').delete().in('client_id', clientIds)
  if (msgErr) throw msgErr

  // Soft-delete all clients
  const { error: delErr } = await api
    .from('clients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('org_id', orgId)
    .is('deleted_at', null)
  if (delErr) throw delErr
}

// ═══════════════════════════════════════════════════════════════
// SCHEDULING
// ═══════════════════════════════════════════════════════════════

/**
 * Get all schedule templates for an organization.
 */
export async function getScheduleTemplates(orgId) {
  const { data, error } = await api
    .from('schedule_templates')
    .select('*')
    .eq('org_id', orgId)
    .order('day_of_week')
  if (error) throw error
  return data || []
}

/**
 * Create a new schedule template.
 */
export async function createScheduleTemplate(template) {
  const { data, error } = await api
    .from('schedule_templates')
    .insert(template)
  if (error) throw error
  const result = Array.isArray(data) ? data[0] : data
  return result
}

/**
 * Update an existing schedule template.
 */
export async function updateScheduleTemplate(id, updates) {
  const { data, error } = await api
    .from('schedule_templates')
    .update(updates)
    .eq('id', id)
  if (error) throw error
  const result = Array.isArray(data) ? data[0] : data
  return result
}

/**
 * Delete a schedule template and its exceptions.
 */
export async function deleteScheduleTemplate(id) {
  await api.from('schedule_exceptions').delete().eq('template_id', id)
  const { error } = await api.from('schedule_templates').delete().eq('id', id)
  if (error) throw error
}

/**
 * Get schedule exceptions for templates within a date range.
 */
export async function getScheduleExceptions(templateIds, startDate, endDate) {
  if (!templateIds || templateIds.length === 0) return []
  let query = api
    .from('schedule_exceptions')
    .select('*')
    .in('template_id', templateIds)
  if (startDate) query = query.gte('exception_date', startDate)
  if (endDate) query = query.lte('exception_date', endDate)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

/**
 * Create a schedule exception (cancel, substitute, reschedule).
 */
export async function createScheduleException(exception) {
  const { data, error } = await api
    .from('schedule_exceptions')
    .insert(exception)
  if (error) throw error
  const result = Array.isArray(data) ? data[0] : data
  return result
}

/**
 * Get a therapist's daily agenda — schedule templates matching a day of week,
 * filtered by user, with exceptions applied.
 */
export async function getDailyAgenda(userId, date, orgId) {
  const dateObj = new Date(date + 'T12:00:00')
  const dayOfWeek = dateObj.getDay()

  // Get templates for this day
  const { data: templates, error: tErr } = await api
    .from('schedule_templates')
    .select('*')
    .eq('org_id', orgId)
    .eq('staff_id', userId)
    .eq('day_of_week', dayOfWeek)
  if (tErr) throw tErr
  if (!templates || templates.length === 0) return []

  // Filter by effective dates
  const active = templates.filter(t => {
    if (date < t.effective_from) return false
    if (t.effective_to && date > t.effective_to) return false
    return true
  })

  if (active.length === 0) return []

  // Get exceptions
  const templateIds = active.map(t => t.id)
  const { data: exceptions } = await api
    .from('schedule_exceptions')
    .select('*')
    .in('template_id', templateIds)
    .eq('exception_date', date)

  const excMap = {}
  for (const e of (exceptions || [])) excMap[e.template_id] = e

  return active.map(t => ({ ...t, exception: excMap[t.id] || null }))
}

// ═══════════════════════════════════════════════════════════════
// SESSION NOTES
// ═══════════════════════════════════════════════════════════════

export async function getSessionNotes(orgId, filters = {}) {
  let q = api.from('session_notes').select('*').order('session_date', { ascending: false })
  if (filters.clientId) q = q.eq('client_id', filters.clientId)
  if (filters.staffId) q = q.eq('staff_id', filters.staffId)
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.limit) q = q.limit(filters.limit)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function createSessionNote(note) {
  const { data, error } = await api.from('session_notes').insert(note)
  if (error) throw error
  const result = Array.isArray(data) ? data[0] : data
  return result
}

export async function updateSessionNote(id, updates) {
  const { data, error } = await api.from('session_notes').update(updates).eq('id', id)
  if (error) throw error
  const result = Array.isArray(data) ? data[0] : data
  return result
}

export async function deleteSessionNote(id) {
  const { error } = await api.from('session_notes').delete().eq('id', id)
  if (error) throw error
}

const SESSION_TYPE_TO_CPT = {
  direct: '97153',
  supervision: '97155',
  parent_training: '97156',
  planning: 'H0032',
  assessment: '97151',
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null
  const [hours, minutes] = timeStr.split(':').map(value => parseInt(value, 10))
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return (hours * 60) + minutes
}

function calculateDurationMinutes(startTime, endTime) {
  const startMinutes = parseTimeToMinutes(startTime)
  const endMinutes = parseTimeToMinutes(endTime)
  if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) return null
  return endMinutes - startMinutes
}

export function buildScheduledSessionContext(template, date, options = {}) {
  const startTime = options.startTime || template.start_time || null
  const endTime = options.endTime || template.end_time || null
  const sessionType = options.sessionType || template.session_type || 'direct'

  return {
    clientId: template.client_id,
    clientName: options.clientName || template.client_name || null,
    staffId: options.staffId || template.staff_id || null,
    sessionDate: date,
    sessionType,
    cptCode: options.cptCode || SESSION_TYPE_TO_CPT[sessionType] || '97153',
    location: options.location || template.location || null,
    scheduledStartTime: startTime,
    scheduledEndTime: endTime,
    scheduleTemplateId: options.scheduleTemplateId || template.id || null,
  }
}

function parseStructuredField(value) {
  if (!value) return null
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }
  return typeof value === 'object' ? value : null
}

function normalizeTimeValue(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
}

function buildSessionNoteStructuredData(session, options = {}) {
  const sessionStructured = parseStructuredField(session?.notes_structured) || {}
  return {
    ...sessionStructured,
    session_type: options.sessionType || session?.session_type || sessionStructured.session_type || null,
    launched_from: options.launchedFrom ?? sessionStructured.launched_from ?? null,
    schedule_template_id: options.scheduleTemplateId ?? sessionStructured.schedule_template_id ?? null,
    scheduled_start_time: options.scheduledStartTime ?? sessionStructured.scheduled_start_time ?? null,
    scheduled_end_time: options.scheduledEndTime ?? sessionStructured.scheduled_end_time ?? null,
    ...(options.runId ? { session_run_id: options.runId } : {}),
  }
}

export function buildAppointmentKey(appointment = {}) {
  const scheduleTemplateId = appointment.scheduleTemplateId
    || appointment.schedule_template_id
    || null
  const date = appointment.sessionDate
    || appointment.session_date
    || appointment.date
    || ''
  const clientId = appointment.clientId || appointment.client_id || ''
  const staffId = appointment.staffId || appointment.staff_id || ''
  const cptCode = appointment.cptCode || appointment.cpt_code || appointment.sessionType || appointment.session_type || ''
  const startTime = normalizeTimeValue(
    appointment.scheduledStartTime
    || appointment.scheduled_start_time
    || appointment.startTime
    || appointment.start_time
  )

  if (scheduleTemplateId && date) {
    return `template:${scheduleTemplateId}:${date}`
  }

  return [date, clientId, staffId, cptCode, startTime].join('|')
}

export function buildAppointmentKeyFromNote(note) {
  const structured = parseStructuredField(note?.structured_data)
  return buildAppointmentKey({
    sessionDate: note?.session_date,
    clientId: note?.client_id,
    staffId: note?.staff_id,
    cptCode: note?.cpt_code,
    startTime: structured?.scheduled_start_time || note?.start_time,
    scheduleTemplateId: structured?.schedule_template_id || null,
  })
}

export function buildAppointmentKeyFromSession(session) {
  const structured = parseStructuredField(session?.notes_structured)
  return buildAppointmentKey({
    sessionDate: session?.session_date,
    clientId: session?.client_id,
    staffId: session?.staff_id,
    cptCode: session?.cpt_code,
    sessionType: session?.session_type,
    startTime: structured?.scheduled_start_time || session?.start_time,
    scheduleTemplateId: structured?.schedule_template_id || null,
  })
}

/**
 * Find an existing session note matching a schedule appointment's parameters.
 * Returns the note if found, null otherwise.
 */
export async function getSessionNoteForAppointment(clientId, staffId, date, cptCode, options = {}) {
  let q = api.from('session_notes').select('*')
    .eq('client_id', clientId)
    .eq('session_date', date)
  if (cptCode) q = q.eq('cpt_code', cptCode)
  if (staffId) q = q.eq('staff_id', staffId)
  const { data, error } = await q.limit(20)
  if (error) throw error
  if (!data || data.length === 0) return null

  const appointmentKey = buildAppointmentKey({
    sessionDate: date,
    clientId,
    staffId,
    cptCode,
    startTime: options.startTime,
    scheduleTemplateId: options.scheduleTemplateId,
  })

  return data.find(note => buildAppointmentKeyFromNote(note) === appointmentKey) || data[0]
}

export async function getSessionForAppointment(clientId, staffId, date, cptCode, options = {}) {
  let q = api.from('sessions').select('id, org_id, client_id, staff_id, session_date, start_time, end_time, duration_minutes, session_type, cpt_code, status, location, notes_structured')
    .eq('client_id', clientId)
    .eq('session_date', date)
  if (options.orgId) q = q.eq('org_id', options.orgId)
  if (cptCode) q = q.eq('cpt_code', cptCode)
  if (staffId) q = q.eq('staff_id', staffId)
  const { data, error } = await q.limit(20)
  if (error) throw error

  const candidates = (data || []).filter(session => session.status !== 'template')
  if (candidates.length === 0) return null

  const appointmentKey = buildAppointmentKey({
    sessionDate: date,
    clientId,
    staffId,
    cptCode,
    startTime: options.startTime,
    scheduleTemplateId: options.scheduleTemplateId,
  })

  return candidates.find(session => buildAppointmentKeyFromSession(session) === appointmentKey) || candidates[0]
}

export async function ensureSessionNoteForSession(session, orgId, options = {}) {
  if (!session?.client_id || !session?.session_date || !orgId) return null

  const staffId = options.staffId || session.staff_id || null
  const cptCode = options.cptCode || session.cpt_code || SESSION_TYPE_TO_CPT[options.sessionType || session.session_type] || '97153'
  const startTime = options.startTime || session.start_time || null
  const endTime = options.endTime || session.end_time || null
  const durationMinutes = options.durationMinutes ?? session.duration_minutes ?? calculateDurationMinutes(startTime, endTime)
  const structuredData = buildSessionNoteStructuredData(session, {
    sessionType: options.sessionType,
    launchedFrom: options.launchedFrom,
    scheduleTemplateId: options.scheduleTemplateId,
    scheduledStartTime: options.scheduledStartTime,
    scheduledEndTime: options.scheduledEndTime,
    runId: options.runId,
  })
  const linkSessionId = options.linkSessionId === false ? null : (options.sessionId || session.id || null)
  const appointmentOptions = {
    startTime: structuredData.scheduled_start_time || startTime,
    scheduleTemplateId: structuredData.schedule_template_id || null,
  }

  let note = null
  if (linkSessionId) {
    const { data, error } = await api.from('session_notes').select('*').eq('session_id', linkSessionId).limit(10)
    if (error) throw error
    const noteRows = data || []
    note = noteRows.find(existing => buildAppointmentKeyFromNote(existing) === buildAppointmentKey({
      sessionDate: session.session_date,
      clientId: session.client_id,
      staffId,
      cptCode,
      startTime: appointmentOptions.startTime,
      scheduleTemplateId: appointmentOptions.scheduleTemplateId,
    })) || noteRows[0] || null
  }

  if (!note) {
    note = await getSessionNoteForAppointment(
      session.client_id,
      staffId,
      session.session_date,
      cptCode,
      appointmentOptions,
    )
  }

  if (note) {
    const existingStructured = parseStructuredField(note.structured_data) || {}
    const scheduledDuration = calculateDurationMinutes(existingStructured.scheduled_start_time, existingStructured.scheduled_end_time)
    const noteUpdates = {}

    if (linkSessionId && !note.session_id) {
      noteUpdates.session_id = linkSessionId
    }

    if (note.status === 'draft') {
      if (startTime && (!note.start_time || note.start_time === existingStructured.scheduled_start_time)) {
        noteUpdates.start_time = startTime
      }
      if (endTime && (!note.end_time || note.end_time === existingStructured.scheduled_end_time)) {
        noteUpdates.end_time = endTime
      }
      if (durationMinutes != null && (note.duration_minutes == null || note.duration_minutes === scheduledDuration)) {
        noteUpdates.duration_minutes = durationMinutes
      }
      if (!note.location && (options.location || session.location)) {
        noteUpdates.location = options.location || session.location
      }
    }

    const mergedStructuredData = {
      ...existingStructured,
      ...structuredData,
    }
    if (JSON.stringify(existingStructured) !== JSON.stringify(mergedStructuredData)) {
      noteUpdates.structured_data = mergedStructuredData
    }

    if (Object.keys(noteUpdates).length > 0) {
      const { data, error } = await api.from('session_notes').update(noteUpdates).eq('id', note.id)
      if (error) throw error
      const updatedNote = Array.isArray(data) ? data[0] : data
      return updatedNote || { ...note, ...noteUpdates }
    }

    return note
  }

  const notePayload = {
    client_id: session.client_id,
    staff_id: staffId,
    org_id: orgId,
    session_id: linkSessionId,
    session_date: session.session_date,
    cpt_code: cptCode,
    start_time: startTime,
    end_time: endTime,
    duration_minutes: durationMinutes,
    location: options.location || session.location || null,
    status: options.initialStatus || 'draft',
    narrative: options.narrative || '',
    structured_data: structuredData,
  }

  const { data, error } = await api.from('session_notes').insert(notePayload)
  if (error) throw error
  const result = Array.isArray(data) ? data[0] : data
  return result || notePayload
}

export async function syncSessionStatusForNote(note, nextNoteStatus, options = {}) {
  if (!note?.client_id || !note?.session_date) return null

  let sessionId = options.sessionId || note.session_id || null

  if (!sessionId) {
    const structured = parseStructuredField(note.structured_data) || {}
    const linkedSession = await getSessionForAppointment(
      note.client_id,
      note.staff_id,
      note.session_date,
      note.cpt_code,
      {
        orgId: options.orgId,
        startTime: structured.scheduled_start_time || note.start_time,
        scheduleTemplateId: structured.schedule_template_id || null,
      },
    )
    sessionId = linkedSession?.id || null
  }

  if (!sessionId) return null

  const sessionStatus = getLinkedSessionStatusForNoteStatus(nextNoteStatus)
  const { error } = await api.from('sessions').update({ status: sessionStatus }).eq('id', sessionId)
  if (error) throw error

  let updatedNote = note
  if (note.id && !note.session_id) {
    const { data, error: noteError } = await api.from('session_notes').update({ session_id: sessionId }).eq('id', note.id)
    if (noteError) throw noteError
    const noteResult = Array.isArray(data) ? data[0] : data
    updatedNote = noteResult || { ...note, session_id: sessionId }
  }

  return {
    sessionId,
    sessionStatus,
    note: updatedNote,
  }
}

/**
 * Create a new draft session note from a schedule template + date.
 * Pre-fills all fields from the schedule appointment.
 */
export async function createSessionNoteFromSchedule(template, date, orgId) {
  const cptCode = SESSION_TYPE_TO_CPT[template.session_type] || '97153'
  const startTime = template.start_time
  const endTime = template.end_time
  const startMin = startTime ? parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]) : 0
  const endMin = endTime ? parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]) : 0
  const durationMinutes = endMin > startMin ? endMin - startMin : null

  const note = {
    client_id: template.client_id,
    staff_id: template.staff_id,
    org_id: orgId,
    session_date: date,
    cpt_code: cptCode,
    start_time: startTime,
    end_time: endTime,
    duration_minutes: durationMinutes,
    location: template.location || null,
    status: 'draft',
    narrative: '',
    structured_data: {
      schedule_template_id: template.id || null,
      scheduled_start_time: startTime,
      scheduled_end_time: endTime,
      session_type: template.session_type || 'direct',
    },
  }

  const { data, error } = await api.from('session_notes').insert(note)
  if (error) throw error
  const result = Array.isArray(data) ? data[0] : data
  return result
}

export { SESSION_TYPE_TO_CPT }

// ═══════════════════════════════════════════════════════════════
// CLIENT FILES
// ═══════════════════════════════════════════════════════════════

export async function getClientFiles(clientId, category) {
  let q = api.from('client_files').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
  if (category && category !== 'all') q = q.eq('category', category)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function createClientFile(file) {
  const { data, error } = await api.from('client_files').insert(file)
  if (error) throw error
  const result = Array.isArray(data) ? data[0] : data
  return result
}

export async function updateClientFile(id, updates) {
  const { data, error } = await api.from('client_files').update(updates).eq('id', id)
  if (error) throw error
  const result = Array.isArray(data) ? data[0] : data
  return result
}

export async function deleteClientFile(id) {
  const { error } = await api.from('client_files').delete().eq('id', id)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════════
// CLIENT CONTACTS
// ═══════════════════════════════════════════════════════════════

export async function getClientContacts(clientId) {
  const { data, error } = await api.from('client_contacts').select('*').eq('client_id', clientId).order('is_primary', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createClientContact(contact) {
  const { data, error } = await api.from('client_contacts').insert(contact)
  if (error) throw error
  const result = Array.isArray(data) ? data[0] : data
  return result
}

export async function updateClientContact(id, updates) {
  const { data, error } = await api.from('client_contacts').update(updates).eq('id', id)
  if (error) throw error
  const result = Array.isArray(data) ? data[0] : data
  return result
}

export async function deleteClientContact(id) {
  const { error } = await api.from('client_contacts').delete().eq('id', id)
  if (error) throw error
}
