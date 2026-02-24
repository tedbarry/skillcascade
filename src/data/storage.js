/**
 * Data persistence layer — Supabase backend.
 * All functions are async and return data from the database.
 */

import { supabase } from '../lib/supabase.js'

/**
 * Client profiles
 */
export async function saveClient(client, orgId) {
  if (client.id) {
    // Update existing
    const { data, error } = await supabase
      .from('clients')
      .update({ name: client.name, date_of_birth: client.date_of_birth, notes: client.notes })
      .eq('id', client.id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  // Insert new
  const { data, error } = await supabase
    .from('clients')
    .insert({ name: client.name, org_id: orgId, date_of_birth: client.date_of_birth, notes: client.notes })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getClients(orgId) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .order('name')
  if (error) throw error
  return data || []
}

export async function getClient(id) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error) return null
  return data
}

export async function deleteClient(id) {
  // Soft delete for HIPAA compliance
  const { error } = await supabase
    .from('clients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/**
 * Assessments — stored as individual rows, returned as a map of skillId → level
 */
export async function saveAssessment(clientId, assessments, userId) {
  // Build upsert rows from the assessments map
  const rows = Object.entries(assessments)
    .filter(([key]) => !key.startsWith('_'))
    .map(([skillId, level]) => ({
      client_id: clientId,
      skill_id: skillId,
      level,
      assessed_by: userId,
      assessed_at: new Date().toISOString(),
    }))

  if (rows.length === 0) return {}

  const { error } = await supabase
    .from('assessments')
    .upsert(rows, { onConflict: 'client_id,skill_id' })
  if (error) throw error

  return assessments
}

export async function getAssessments(clientId) {
  const { data, error } = await supabase
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

export async function deleteAssessments(clientId) {
  const { error } = await supabase
    .from('assessments')
    .delete()
    .eq('client_id', clientId)
  if (error) throw error
}

/**
 * Assessment snapshots — for progress timeline
 */
export async function saveSnapshot(clientId, label, data, userId) {
  const { data: snap, error } = await supabase
    .from('snapshots')
    .insert({
      client_id: clientId,
      label,
      data,
      created_by: userId,
    })
    .select()
    .single()
  if (error) throw error

  // Return all snapshots for this client
  return getSnapshots(clientId)
}

export async function getSnapshots(clientId) {
  const { data, error } = await supabase
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
  const { error } = await supabase
    .from('snapshots')
    .delete()
    .eq('id', snapshotId)
    .eq('client_id', clientId)
  if (error) throw error

  return getSnapshots(clientId)
}

/**
 * AI Chats — org-scoped, cross-client, cross-user
 */

/** Load all chats for a tool across the entire org. */
export async function getAiChats(toolId) {
  const { data, error } = await supabase
    .from('ai_chats')
    .select('*')
    .eq('tool_id', toolId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    messages: row.messages || [],
    client_name: row.client_name,
    user_id: row.user_id,
    created_at: new Date(row.created_at).getTime(),
    updated_at: new Date(row.updated_at).getTime(),
  }))
}

/** Create or update a chat. Returns the saved row. */
export async function saveAiChat(chat, orgId, userId) {
  if (chat.id) {
    // Update existing — only the creator can update (RLS enforced)
    const { data, error } = await supabase
      .from('ai_chats')
      .update({
        title: chat.title,
        messages: chat.messages,
        client_name: chat.client_name,
      })
      .eq('id', chat.id)
      .select()
      .single()
    if (error) throw error
    return { ...chat, id: data.id }
  }
  // Insert new
  const { data, error } = await supabase
    .from('ai_chats')
    .insert({
      org_id: orgId,
      user_id: userId,
      tool_id: chat.tool_id,
      title: chat.title,
      messages: chat.messages,
      client_name: chat.client_name,
    })
    .select()
    .single()
  if (error) throw error
  return {
    id: data.id,
    title: data.title,
    messages: data.messages || [],
    client_name: data.client_name,
    user_id: data.user_id,
    created_at: new Date(data.created_at).getTime(),
    updated_at: new Date(data.updated_at).getTime(),
  }
}

/** Delete a chat (only creator can delete, enforced by RLS). */
export async function deleteAiChat(chatId) {
  const { error } = await supabase
    .from('ai_chats')
    .delete()
    .eq('id', chatId)
  if (error) throw error
}

/**
 * Delete all data for an organization — clients (soft-delete), assessments, snapshots, messages
 */
export async function clearAllData(orgId) {
  // Get all clients in this org
  const { data: clients, error: clientsErr } = await supabase
    .from('clients')
    .select('id')
    .eq('org_id', orgId)
    .is('deleted_at', null)
  if (clientsErr) throw clientsErr

  const clientIds = (clients || []).map((c) => c.id)
  if (clientIds.length === 0) return

  // Delete assessments, snapshots, and messages for all clients
  const { error: assessErr } = await supabase.from('assessments').delete().in('client_id', clientIds)
  if (assessErr) throw assessErr

  const { error: snapErr } = await supabase.from('snapshots').delete().in('client_id', clientIds)
  if (snapErr) throw snapErr

  const { error: msgErr } = await supabase.from('messages').delete().in('client_id', clientIds)
  if (msgErr) throw msgErr

  // Soft-delete all clients
  const { error: delErr } = await supabase
    .from('clients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('org_id', orgId)
    .is('deleted_at', null)
  if (delErr) throw delErr
}
