/**
 * Data persistence layer — abstracted so a real backend can plug in later.
 * Currently uses localStorage for MVP.
 */

const STORAGE_PREFIX = 'skillcascade_'

function getKey(key) {
  return `${STORAGE_PREFIX}${key}`
}

/**
 * Client profiles
 */
export function saveClient(client) {
  const clients = getClients()
  const existing = clients.findIndex((c) => c.id === client.id)
  if (existing >= 0) {
    clients[existing] = { ...clients[existing], ...client, updatedAt: Date.now() }
  } else {
    clients.push({ ...client, createdAt: Date.now(), updatedAt: Date.now() })
  }
  localStorage.setItem(getKey('clients'), JSON.stringify(clients))
  return client
}

export function getClients() {
  const raw = localStorage.getItem(getKey('clients'))
  return raw ? JSON.parse(raw) : []
}

export function getClient(id) {
  return getClients().find((c) => c.id === id) || null
}

export function deleteClient(id) {
  const clients = getClients().filter((c) => c.id !== id)
  localStorage.setItem(getKey('clients'), JSON.stringify(clients))
  deleteAssessments(id)
}

/**
 * Assessments — map of skillId → assessment level per client
 */
export function saveAssessment(clientId, assessments) {
  const key = getKey(`assessments_${clientId}`)
  const existing = getAssessments(clientId)
  const merged = { ...existing, ...assessments, _updatedAt: Date.now() }
  localStorage.setItem(key, JSON.stringify(merged))
  return merged
}

export function getAssessments(clientId) {
  const raw = localStorage.getItem(getKey(`assessments_${clientId}`))
  return raw ? JSON.parse(raw) : {}
}

export function deleteAssessments(clientId) {
  localStorage.removeItem(getKey(`assessments_${clientId}`))
}

/**
 * Assessment snapshots — for progress timeline
 */
export function saveSnapshot(clientId, label = '') {
  const snapshots = getSnapshots(clientId)
  const assessments = getAssessments(clientId)
  snapshots.push({
    id: `snap_${Date.now()}`,
    label,
    timestamp: Date.now(),
    assessments: { ...assessments },
  })
  localStorage.setItem(getKey(`snapshots_${clientId}`), JSON.stringify(snapshots))
}

export function getSnapshots(clientId) {
  const raw = localStorage.getItem(getKey(`snapshots_${clientId}`))
  return raw ? JSON.parse(raw) : []
}

/**
 * Generate a simple unique ID
 */
export function generateId() {
  return `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
