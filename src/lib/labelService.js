import { supabase } from './supabase.js'
import { api } from './api.js'

export async function getLabels(orgId) {
  const { data } = await api
    .from('program_labels')
    .select('*')
    .eq('org_id', orgId)
    .order('name')
  return data || []
}

export async function createLabel(orgId, name, color = '#9ca3af', description = '') {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await api
    .from('program_labels')
    .insert({ org_id: orgId, created_by: user.id, name, color, description })
  if (error) throw error
  const result = Array.isArray(data) ? data[0] : data
  return result
}

export async function updateLabel(labelId, updates) {
  const { data, error } = await api
    .from('program_labels')
    .update(updates)
    .eq('id', labelId)
  if (error) throw error
  const result = Array.isArray(data) ? data[0] : data
  return result
}

export async function deleteLabel(labelId) {
  const { error } = await api
    .from('program_labels')
    .delete()
    .eq('id', labelId)
  if (error) throw error
}

export async function assignLabel(programId, labelId) {
  const { error } = await api
    .from('program_label_assignments')
    .upsert({ program_id: programId, label_id: labelId })
  if (error && error.code !== '23505') throw error // ignore duplicate
}

export async function removeLabel(programId, labelId) {
  const { error } = await api
    .from('program_label_assignments')
    .delete()
    .eq('program_id', programId)
    .eq('label_id', labelId)
  if (error) throw error
}

export async function getProgramLabels(programId) {
  // Fetch assignments first, then fetch labels by IDs
  const { data: assignments } = await api
    .from('program_label_assignments')
    .select('label_id')
    .eq('program_id', programId)

  const labelIds = (assignments || []).map(a => a.label_id).filter(Boolean)
  if (labelIds.length === 0) return []

  const { data: labels } = await api
    .from('program_labels')
    .select('*')
    .in('id', labelIds)

  return labels || []
}

export async function getClientProgramLabels(clientId) {
  // First get all program IDs for this client
  const { data: programs } = await api
    .from('client_programs')
    .select('id')
    .eq('client_id', clientId)

  const programIds = (programs || []).map(p => p.id)
  if (programIds.length === 0) return []

  // Then get all label assignments for those programs
  const { data: assignments } = await api
    .from('program_label_assignments')
    .select('program_id, label_id')
    .in('program_id', programIds)

  return assignments || []
}

// Get all programs for a client with their labels
export async function getProgramsWithLabels(clientId) {
  const { data: programs } = await api
    .from('client_programs')
    .select('*')
    .eq('client_id', clientId)
    .order('display_order')

  const programList = programs || []
  if (programList.length === 0) return []

  // Fetch all label assignments for these programs
  const programIds = programList.map(p => p.id)
  const { data: assignments } = await api
    .from('program_label_assignments')
    .select('program_id, label_id')
    .in('program_id', programIds)

  const assignmentList = assignments || []
  const labelIds = [...new Set(assignmentList.map(a => a.label_id).filter(Boolean))]

  // Fetch all labels referenced
  let labelMap = {}
  if (labelIds.length > 0) {
    const { data: labels } = await api
      .from('program_labels')
      .select('*')
      .in('id', labelIds)
    for (const l of (labels || [])) labelMap[l.id] = l
  }

  // Group assignments by program_id
  const assignmentsByProgram = {}
  for (const a of assignmentList) {
    if (!assignmentsByProgram[a.program_id]) assignmentsByProgram[a.program_id] = []
    assignmentsByProgram[a.program_id].push(a)
  }

  return programList.map(p => ({
    ...p,
    labels: (assignmentsByProgram[p.id] || [])
      .map(a => labelMap[a.label_id])
      .filter(Boolean),
  }))
}
