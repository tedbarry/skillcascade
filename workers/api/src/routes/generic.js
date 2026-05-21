import { Hono } from 'hono'
import { query, queryWithUser } from '../db.js'
import {
  canAccessClient,
  requireAdmin,
  checkTablePermission,
  getAccessibleClientIds,
  canViewSessionNotes,
  canCreateSessionNoteRecord,
  canEditSessionNoteRecord,
  canLinkSessionNoteRecord,
  canAdvanceSessionNoteStatus,
  hasClinicalManagerRole,
  canViewSchedulesOrgWide,
  shouldRestrictSchedulesToOwnStaff,
  normalizeRoleSlug,
  canManageTeamRecords,
  canManageOrganizationSettings,
} from '../middleware/access.js'

const app = new Hono()
const SAFE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/i
const ALLOWED_FILTER_OPERATORS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'is_not', 'in'])
const NO_ACCESS_UUID = '00000000-0000-0000-0000-000000000000'
const SESSION_NOTE_IMMUTABLE_FIELDS = new Set(['org_id', 'client_id', 'staff_id', 'session_date'])
const SESSION_NOTE_EDITABLE_FIELDS = new Set(['narrative', 'cpt_code', 'location', 'start_time', 'end_time', 'duration_minutes', 'structured_data', 'session_id'])
const SESSION_NOTE_LINK_ONLY_FIELDS = new Set(['session_id'])
const SESSION_NOTE_VIRTUAL_FIELDS = new Set(['workflow_reason', 'workflow_attestation', 'workflow_attestation_label'])
const SESSION_NOTE_COMPLETION_FIELD_LABELS = {
  narrative: 'Narrative',
  cpt_code: 'CPT code',
  location: 'Location',
  start_time: 'Start time',
  end_time: 'End time',
  duration_minutes: 'Duration',
}
const SESSION_NOTE_TRANSITION_FIELDS = {
  draft: ['status'],
  completed: ['status'],
  reviewed: ['status'],
  approved: ['status'],
}
const SESSION_NOTE_ORG_WIDE_ROLES = new Set(['master_admin', 'admin', 'qa_admin'])
const CLIENT_ACCESS_FILTER_TABLES = new Set(['sessions'])
const DIRECT_CLIENT_TABLES = new Set(['assessments', 'client_programs', 'reports', 'client_goal_decisions', 'product_workflow_jobs'])
const GOAL_LIBRARY_TABLES = new Set(['goal_domains', 'goal_ltgs', 'goal_stgs', 'goal_targets'])
const GOAL_LIBRARY_PARENT_LOOKUPS = {
  goal_ltgs: { column: 'domain_id', table: 'goal_domains', label: 'Domain' },
  goal_stgs: { column: 'ltg_id', table: 'goal_ltgs', label: 'Long-term goal' },
  goal_targets: { column: 'stg_id', table: 'goal_stgs', label: 'Short-term goal' },
}
const PROFILE_SELF_RESTRICTED_FIELDS = new Set(['id', 'org_id', 'role', 'role_id', 'is_super_admin', 'created_at', 'updated_at'])
const PROFILE_MANAGER_EDITABLE_FIELDS = new Set(['display_name', 'role', 'role_id', 'org_id'])
const ORGANIZATION_EDITABLE_FIELDS = new Set(['name', 'type', 'branding'])

const TABLE_CONFIG = {
  invite_tokens: { scope: 'org', orgColumn: 'org_id' },
  client_assignments: { scope: 'client', clientColumn: 'client_id' },
  schedule_templates: { scope: 'org', orgColumn: 'org_id' },
  schedule_exceptions: { scope: 'lookup', lookupTable: 'schedule_templates', lookupColumn: 'template_id', lookupClientColumn: 'client_id' },
  authorizations: { scope: 'client', clientColumn: 'client_id' },
  skill_working_estimates: { scope: 'client', clientColumn: 'client_id' },
  clinical_insights: { scope: 'client', clientColumn: 'client_id' },
  snapshots: { scope: 'client', clientColumn: 'client_id' },
  messages: { scope: 'client', clientColumn: 'client_id' },
  session_runs: { scope: 'open' },
  program_phase_log: { scope: 'lookup', lookupTable: 'client_programs', lookupColumn: 'program_id', lookupClientColumn: 'client_id' },

  program_labels: { scope: 'org', orgColumn: 'org_id' },
  program_label_assignments: { scope: 'open' },

  user_settings: { scope: 'user', userColumn: 'user_id' },
  usage_sessions: { scope: 'open' },
  usage_events: { scope: 'open' },
  subscriptions: { scope: 'user', userColumn: 'user_id' },

  assessments: { scope: 'open' },

  profiles: { scope: 'org', orgColumn: 'org_id' },
  clients: { scope: 'org', orgColumn: 'org_id' },
  sessions: { scope: 'org', orgColumn: 'org_id' },
  client_programs: { scope: 'open' },
  client_goal_decisions: { scope: 'open' },
  client_targets: { scope: 'open' },
  session_data: { scope: 'open' },
  session_programs: { scope: 'open' },
  organizations: { scope: 'org_self' },
  audit_log: { scope: 'open' },
  ai_chats: { scope: 'org', orgColumn: 'org_id' },
  auth_reports: { scope: 'open' },
  reports: { scope: 'open' },
  product_workflow_jobs: { scope: 'open' },
  product_workflow_sources: { scope: 'lookup', lookupTable: 'product_workflow_jobs', lookupColumn: 'job_id', lookupClientColumn: 'client_id' },
  product_workflow_approvals: { scope: 'lookup', lookupTable: 'product_workflow_jobs', lookupColumn: 'job_id', lookupClientColumn: 'client_id' },
  product_workflow_goal_reviews: { scope: 'lookup', lookupTable: 'product_workflow_jobs', lookupColumn: 'job_id', lookupClientColumn: 'client_id' },
  product_workflow_artifacts: { scope: 'lookup', lookupTable: 'product_workflow_jobs', lookupColumn: 'job_id', lookupClientColumn: 'client_id' },

  goal_domains: { scope: 'open' },
  goal_ltgs: { scope: 'open' },
  goal_stgs: { scope: 'open' },
  goal_targets: { scope: 'open' },
  goal_favorites: { scope: 'user', userColumn: 'user_id' },

  session_notes: { scope: 'org', orgColumn: 'org_id' },
  client_files: { scope: 'client', clientColumn: 'client_id' },
  client_contacts: { scope: 'client', clientColumn: 'client_id' },

  roles: { scope: 'org', orgColumn: 'org_id' },

  contact_submissions: { scope: 'admin_read' },
}

function normalizeIdentifier(identifier, label = 'identifier') {
  const value = String(identifier || '').trim()
  if (!SAFE_IDENTIFIER.test(value)) {
    throw new Error(`Invalid ${label}`)
  }
  return value
}

function normalizeColumnList(columns) {
  if (!columns || columns === '*') return '*'

  return columns
    .split(',')
    .map(column => normalizeIdentifier(column, 'column'))
    .join(', ')
}

function normalizeConflictColumns(conflictColumns) {
  const raw = String(conflictColumns || 'id')
  return raw
    .split(',')
    .map(column => normalizeIdentifier(column, 'conflict column'))
    .join(', ')
}

function normalizePositiveInteger(value, label) {
  if (value == null || value === '') return null
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid ${label}`)
  }
  return parsed
}

function getSafeObjectKeys(row, label = 'column') {
  const keys = Object.keys(row || {})
  if (keys.length === 0) throw new Error('No data provided')
  return keys.map(key => normalizeIdentifier(key, label))
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null
  const match = /^(\d{1,2}):(\d{2})/.exec(timeStr.trim())
  if (!match) return null
  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10)
}

function getSessionNoteCompletionIssues(note = {}) {
  const issues = []

  if (!String(note.narrative || '').trim()) issues.push(SESSION_NOTE_COMPLETION_FIELD_LABELS.narrative)
  if (!String(note.cpt_code || '').trim()) issues.push(SESSION_NOTE_COMPLETION_FIELD_LABELS.cpt_code)
  if (!String(note.location || '').trim()) issues.push(SESSION_NOTE_COMPLETION_FIELD_LABELS.location)
  if (!String(note.start_time || '').trim()) issues.push(SESSION_NOTE_COMPLETION_FIELD_LABELS.start_time)
  if (!String(note.end_time || '').trim()) issues.push(SESSION_NOTE_COMPLETION_FIELD_LABELS.end_time)

  const duration = Number.parseInt(note.duration_minutes, 10)
  if (!Number.isFinite(duration) || duration <= 0) {
    issues.push(SESSION_NOTE_COMPLETION_FIELD_LABELS.duration_minutes)
  }

  const startMinutes = parseTimeToMinutes(note.start_time)
  const endMinutes = parseTimeToMinutes(note.end_time)
  if (startMinutes != null && endMinutes != null && endMinutes <= startMinutes) {
    issues.push('End time must be later than start time')
  }

  return issues
}

function getSessionNoteAuditAction(fromStatus, toStatus) {
  if (fromStatus === toStatus) return null
  if (toStatus === 'draft') return 'session_note_reopened'
  if (toStatus === 'reviewed' && fromStatus === 'approved') return 'session_note_approval_reopened'
  return 'session_note_status_changed'
}

function normalizeWorkflowReason(value) {
  const trimmed = String(value || '').trim()
  return trimmed ? trimmed.slice(0, 500) : ''
}

function normalizeWorkflowAttestationLabel(value) {
  const trimmed = String(value || '').trim()
  return trimmed ? trimmed.slice(0, 500) : ''
}

function stripSessionNoteVirtualFields(data) {
  if (Array.isArray(data)) {
    return data.map(stripSessionNoteVirtualFields)
  }
  if (!data || typeof data !== 'object') return data

  const next = { ...data }
  for (const field of SESSION_NOTE_VIRTUAL_FIELDS) {
    delete next[field]
  }
  return next
}

async function writeSessionNoteCreatedAudit(env, profile, note) {
  if (!profile?.id || !note?.id) return

  await query(
    env,
    `INSERT INTO audit_log (user_id, action, resource_type, resource_id, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      profile.id,
      'session_note_created',
      'session_note',
      note.id,
      JSON.stringify({
        note_id: note.id,
        client_id: note.client_id || null,
        staff_id: note.staff_id || null,
        session_id: note.session_id || null,
        from_status: null,
        to_status: note.status || 'draft',
      }),
    ],
  )
}

async function writeSessionNoteStatusAudit(
  env,
  profile,
  beforeNote,
  afterNote,
  workflowReason = '',
  workflowAttested = false,
  workflowAttestationLabel = '',
) {
  const fromStatus = beforeNote?.status || null
  const toStatus = afterNote?.status || null
  const action = getSessionNoteAuditAction(fromStatus, toStatus)
  if (!action || !profile?.id || !afterNote?.id) return

  await query(
    env,
    `INSERT INTO audit_log (user_id, action, resource_type, resource_id, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      profile.id,
      action,
      'session_note',
      afterNote.id,
      JSON.stringify({
        note_id: afterNote.id,
        client_id: afterNote.client_id || beforeNote?.client_id || null,
        staff_id: afterNote.staff_id || beforeNote?.staff_id || null,
        session_id: afterNote.session_id || beforeNote?.session_id || null,
        from_status: fromStatus,
        to_status: toStatus,
        workflow_reason: normalizeWorkflowReason(workflowReason) || null,
        workflow_attested: Boolean(workflowAttested),
        workflow_attestation_label: workflowAttested
          ? normalizeWorkflowAttestationLabel(workflowAttestationLabel) || null
          : null,
      }),
    ],
  )
}

function withNoAccessFilter(filters = {}, clientColumn = 'client_id') {
  return { ...filters, [clientColumn]: NO_ACCESS_UUID }
}

async function applyAccessibleClientFilters(env, profile, filters = {}, options = {}) {
  const clientColumn = options.clientColumn || 'client_id'
  const roleSlug = normalizeRoleSlug(profile?.role_slug || profile?.role)
  const requestedClientId = filters?.[clientColumn]

  if (Array.isArray(requestedClientId)) {
    const [operator, values] = requestedClientId
    if (operator !== 'in' || !Array.isArray(values)) {
      return { allowed: false, status: 400, error: `${clientColumn} array filters are not supported for this resource` }
    }

    for (const clientId of values) {
      if (!await canAccessClient(env, profile, clientId)) {
        return { allowed: false, status: 403, error: 'Forbidden' }
      }
    }
    return { allowed: true, filters }
  }

  if (requestedClientId) {
    if (!await canAccessClient(env, profile, requestedClientId)) {
      return { allowed: false, status: 403, error: 'Forbidden' }
    }
    return { allowed: true, filters }
  }

  if (profile?.is_super_admin || (options.allowOrgWideRoles || new Set()).has(roleSlug)) {
    return { allowed: true, filters }
  }

  const clientIds = await getAccessibleClientIds(env, profile)
  if (clientIds.length === 0) {
    return { allowed: true, filters: withNoAccessFilter(filters, clientColumn) }
  }

  return {
    allowed: true,
    filters: { ...filters, [clientColumn]: ['in', clientIds] },
  }
}

async function validateClientMutationRows(env, profile, table, rawData, clientColumn = 'client_id') {
  const rows = Array.isArray(rawData) ? rawData : [rawData]
  if (rows.length === 0) {
    return { allowed: false, status: 400, error: 'No data provided' }
  }

  const accessibleClientIds = new Set(await getAccessibleClientIds(env, profile))
  for (const row of rows) {
    const clientId = row?.[clientColumn]
    if (!clientId) {
      return { allowed: false, status: 400, error: `${clientColumn} required for ${table}` }
    }
    if (!accessibleClientIds.has(clientId)) {
      return { allowed: false, status: 403, error: 'Forbidden' }
    }
  }

  return { allowed: true }
}

async function getOrgProfileIds(env, orgId) {
  if (!orgId) return []
  const result = await query(
    env,
    'SELECT id FROM profiles WHERE org_id = $1',
    [orgId],
  )
  return result.rows.map(row => row.id).filter(Boolean)
}

async function applyVisibleUserFilters(env, profile, filters = {}) {
  const requestedUserId = filters?.user_id
  const canViewOrgLogs = profile?.is_super_admin || requireAdmin(profile)

  if (Array.isArray(requestedUserId)) {
    const [operator, values] = requestedUserId
    if (operator !== 'in' || !Array.isArray(values)) {
      return { allowed: false, status: 400, error: 'user_id array filters are not supported for this resource' }
    }

    if (!canViewOrgLogs) {
      const onlySelf = values.every(value => value === profile.id)
      if (!onlySelf) return { allowed: false, status: 403, error: 'Forbidden' }
      return { allowed: true, filters: { ...filters, user_id: profile.id } }
    }

    const orgUserIds = new Set(await getOrgProfileIds(env, profile.org_id))
    for (const userId of values) {
      if (!orgUserIds.has(userId)) {
        return { allowed: false, status: 403, error: 'Forbidden' }
      }
    }
    return { allowed: true, filters }
  }

  if (requestedUserId) {
    if (!canViewOrgLogs) {
      if (requestedUserId !== profile.id) {
        return { allowed: false, status: 403, error: 'Forbidden' }
      }
      return { allowed: true, filters: { ...filters, user_id: profile.id } }
    }

    const orgUserIds = new Set(await getOrgProfileIds(env, profile.org_id))
    if (!orgUserIds.has(requestedUserId)) {
      return { allowed: false, status: 403, error: 'Forbidden' }
    }
    return { allowed: true, filters }
  }

  if (!canViewOrgLogs) {
    return { allowed: true, filters: { ...filters, user_id: profile.id } }
  }

  const orgUserIds = await getOrgProfileIds(env, profile.org_id)
  if (orgUserIds.length === 0) {
    return { allowed: true, filters: withNoAccessFilter(filters, 'user_id') }
  }

  return {
    allowed: true,
    filters: { ...filters, user_id: ['in', orgUserIds] },
  }
}

function getUsageVisibilityFilters(profile, filters = {}) {
  if (profile?.is_super_admin || requireAdmin(profile)) {
    return { ...filters, org_id: profile.org_id }
  }
  return { ...filters, org_id: profile.org_id, user_id: profile.id }
}

async function validateUsageSessionOwnership(env, profile, sessionIds = []) {
  const uniqueIds = [...new Set(sessionIds.filter(Boolean))]
  if (uniqueIds.length === 0) {
    return { allowed: false, status: 400, error: 'session_id required' }
  }

  const result = await query(
    env,
    'SELECT id, user_id, org_id FROM usage_sessions WHERE id = ANY($1::text[])',
    [uniqueIds],
  )
  if (result.rows.length !== uniqueIds.length) {
    return { allowed: false, status: 404, error: 'One or more usage sessions were not found' }
  }

  for (const row of result.rows) {
    if (row.org_id !== profile.org_id) {
      return { allowed: false, status: 403, error: 'Forbidden' }
    }
    if (!profile?.is_super_admin && !requireAdmin(profile) && row.user_id !== profile.id) {
      return { allowed: false, status: 403, error: 'Forbidden' }
    }
  }

  return { allowed: true }
}

async function loadSingleRow(env, table, id, columns = '*') {
  const result = await query(
    env,
    `SELECT ${columns} FROM ${normalizeIdentifier(table, 'table')} WHERE id = $1 LIMIT 1`,
    [id],
  )
  return result.rows[0] || null
}

async function validateSessionLink(env, profile, clientId, sessionId) {
  if (!sessionId) return { allowed: true }

  const session = await loadSingleRow(
    env,
    'sessions',
    sessionId,
    'id, org_id, client_id',
  )

  if (!session) {
    return { allowed: false, status: 404, error: 'Linked session not found' }
  }
  if (session.org_id !== profile.org_id || session.client_id !== clientId) {
    return { allowed: false, status: 403, error: 'Linked session does not match this client record' }
  }
  if (!await canAccessClient(env, profile, session.client_id)) {
    return { allowed: false, status: 403, error: 'Forbidden' }
  }

  return { allowed: true }
}

async function validateProgramAccess(env, profile, programId) {
  if (!programId) {
    return { allowed: false, status: 400, error: 'program_id is required' }
  }

  const program = await loadSingleRow(env, 'client_programs', programId, 'id, client_id')
  if (!program) {
    return { allowed: false, status: 404, error: 'Program not found' }
  }
  if (!await canAccessClient(env, profile, program.client_id)) {
    return { allowed: false, status: 403, error: 'Forbidden' }
  }

  return { allowed: true, program }
}

async function validateProgramFilter(env, profile, programFilter) {
  if (Array.isArray(programFilter)) {
    const [operator, values] = programFilter
    if (operator !== 'in' || !Array.isArray(values) || values.length === 0) {
      return { allowed: false, status: 400, error: 'program_id filters must use a non-empty in() list' }
    }

    const uniqueIds = [...new Set(values)]
    const result = await query(
      env,
      'SELECT id, client_id FROM client_programs WHERE id = ANY($1::uuid[])',
      [uniqueIds],
    )
    if (result.rows.length !== uniqueIds.length) {
      return { allowed: false, status: 404, error: 'One or more programs were not found' }
    }

    const accessibleClientIds = new Set(await getAccessibleClientIds(env, profile))
    for (const row of result.rows) {
      if (!accessibleClientIds.has(row.client_id)) {
        return { allowed: false, status: 403, error: 'Forbidden' }
      }
    }
    return { allowed: true }
  }

  return validateProgramAccess(env, profile, programFilter)
}

async function validateProgramMutationRows(env, profile, table, rawData, programColumn = 'program_id') {
  const rows = Array.isArray(rawData) ? rawData : [rawData]
  if (rows.length === 0) {
    return { allowed: false, status: 400, error: 'No data provided' }
  }

  const programIds = rows.map(row => row?.[programColumn]).filter(Boolean)
  if (programIds.length !== rows.length) {
    return { allowed: false, status: 400, error: `${programColumn} required for ${table}` }
  }

  return validateProgramFilter(
    env,
    profile,
    programIds.length === 1 ? programIds[0] : ['in', [...new Set(programIds)]],
  )
}

async function validateLookupMutationRows(env, profile, table, rawData, config) {
  const rows = Array.isArray(rawData) ? rawData : [rawData]
  if (rows.length === 0) {
    return { allowed: false, status: 400, error: 'No data provided' }
  }

  if (rows.some(row => !row?.[config.lookupColumn])) {
    return { allowed: false, status: 400, error: `${config.lookupColumn} required for ${table}` }
  }
  const lookupIds = [...new Set(rows.map(row => row?.[config.lookupColumn]))]

  const parent = await query(
    env,
    `SELECT id,
            ${normalizeIdentifier(config.lookupClientColumn, 'lookup client column')}
     FROM ${normalizeIdentifier(config.lookupTable, 'lookup table')}
     WHERE id = ANY($1::uuid[])`,
    [lookupIds],
  )

  if (parent.rows.length !== lookupIds.length) {
    return { allowed: false, status: 404, error: 'One or more parent resources were not found' }
  }

  for (const row of parent.rows) {
    if (!await canAccessClient(env, profile, row[config.lookupClientColumn])) {
      return { allowed: false, status: 403, error: 'Forbidden' }
    }
  }

  return { allowed: true }
}

async function validateSessionAccess(env, profile, sessionId) {
  if (!sessionId) {
    return { allowed: false, status: 400, error: 'session_id is required' }
  }

  const session = await loadSingleRow(env, 'sessions', sessionId, 'id, client_id')
  if (!session) {
    return { allowed: false, status: 404, error: 'Session not found' }
  }
  if (!await canAccessClient(env, profile, session.client_id)) {
    return { allowed: false, status: 403, error: 'Forbidden' }
  }

  return { allowed: true, session }
}

async function validateSessionFilter(env, profile, sessionFilter) {
  if (Array.isArray(sessionFilter)) {
    const [operator, values] = sessionFilter
    if (operator !== 'in' || !Array.isArray(values) || values.length === 0) {
      return { allowed: false, status: 400, error: 'session_id filters must use a non-empty in() list' }
    }

    const uniqueIds = [...new Set(values)]
    const result = await query(
      env,
      'SELECT id, client_id FROM sessions WHERE id = ANY($1::uuid[])',
      [uniqueIds],
    )
    if (result.rows.length !== uniqueIds.length) {
      return { allowed: false, status: 404, error: 'One or more sessions were not found' }
    }

    const accessibleClientIds = new Set(await getAccessibleClientIds(env, profile))
    for (const row of result.rows) {
      if (!accessibleClientIds.has(row.client_id)) {
        return { allowed: false, status: 403, error: 'Forbidden' }
      }
    }
    return { allowed: true }
  }

  return validateSessionAccess(env, profile, sessionFilter)
}

async function validateSessionMutationRows(env, profile, table, rawData, sessionColumn = 'session_id') {
  const rows = Array.isArray(rawData) ? rawData : [rawData]
  if (rows.length === 0) {
    return { allowed: false, status: 400, error: 'No data provided' }
  }

  const sessionIds = rows.map(row => row?.[sessionColumn]).filter(Boolean)
  if (sessionIds.length !== rows.length) {
    return { allowed: false, status: 400, error: `${sessionColumn} required for ${table}` }
  }

  return validateSessionFilter(
    env,
    profile,
    sessionIds.length === 1 ? sessionIds[0] : ['in', [...new Set(sessionIds)]],
  )
}

async function validateSessionNoteUpdate(env, profile, note, updates = {}) {
  const keys = Object.keys(updates || {})
  if (keys.length === 0) {
    return { allowed: false, status: 400, error: 'No data to update' }
  }

  const persistedKeys = keys.filter(key => !SESSION_NOTE_VIRTUAL_FIELDS.has(key))
  const persistedUpdates = stripSessionNoteVirtualFields(updates)
  if (persistedKeys.length === 0) {
    return { allowed: false, status: 400, error: 'No editable session note fields were provided.' }
  }

  if (persistedKeys.some(key => SESSION_NOTE_IMMUTABLE_FIELDS.has(key))) {
    return { allowed: false, status: 403, error: 'Session note ownership and workflow audit fields are not directly editable.' }
  }

  const linkOnlyUpdate = persistedKeys.every(key => SESSION_NOTE_LINK_ONLY_FIELDS.has(key))
  if (linkOnlyUpdate) {
    if (!canLinkSessionNoteRecord(profile, note)) {
      return { allowed: false, status: 403, error: 'Permission denied' }
    }
    if (note.session_id && persistedUpdates.session_id !== note.session_id) {
      return { allowed: false, status: 403, error: 'Linked sessions cannot be reassigned once attached.' }
    }
    return validateSessionLink(env, profile, note.client_id, persistedUpdates.session_id)
  }

  if (Object.prototype.hasOwnProperty.call(persistedUpdates, 'status')) {
    const nextStatus = String(persistedUpdates.status || '').trim()
    const allowedFields = SESSION_NOTE_TRANSITION_FIELDS[nextStatus]
    const workflowReason = normalizeWorkflowReason(updates?.workflow_reason)
    const workflowAttested = updates?.workflow_attestation === true
    if (!allowedFields) {
      return { allowed: false, status: 400, error: `Unsupported note status transition: ${nextStatus}` }
    }
    if (!persistedKeys.every(key => allowedFields.includes(key))) {
      return { allowed: false, status: 400, error: 'Status transitions can only update the matching workflow audit fields.' }
    }
    if (!canAdvanceSessionNoteStatus(profile, note, nextStatus)) {
      return { allowed: false, status: 403, error: 'Permission denied' }
    }
    const requiresWorkflowAttestation = (
      ((note.status || '').trim() === 'draft' && nextStatus === 'completed')
      || ((note.status || '').trim() === 'completed' && nextStatus === 'reviewed')
      || ((note.status || '').trim() === 'reviewed' && nextStatus === 'approved')
    )
    if (requiresWorkflowAttestation && !workflowAttested) {
      return {
        allowed: false,
        status: 400,
        error: 'An explicit workflow attestation is required before this status change can be recorded.',
      }
    }
    if (
      ((note.status || '').trim() === 'completed' && nextStatus === 'draft')
      || ((note.status || '').trim() === 'reviewed' && nextStatus === 'draft')
      || ((note.status || '').trim() === 'approved' && nextStatus === 'reviewed')
    ) {
      if (!workflowReason) {
        return {
          allowed: false,
          status: 400,
          error: 'Document why this note is being returned or reopened before saving the workflow change.',
        }
      }
    }
    if (nextStatus === 'completed') {
      const completionIssues = getSessionNoteCompletionIssues(note)
      if (completionIssues.length > 0) {
        return {
          allowed: false,
          status: 400,
          error: `Complete required note fields before marking this note as completed: ${completionIssues.join(', ')}`,
        }
      }
    }

    const timestamp = new Date().toISOString()
    if (nextStatus === 'draft') {
      persistedUpdates.completed_by = null
      persistedUpdates.completed_at = null
      persistedUpdates.reviewed_by = null
      persistedUpdates.reviewed_at = null
      persistedUpdates.approved_by = null
      persistedUpdates.approved_at = null
    } else if (nextStatus === 'completed') {
      persistedUpdates.completed_by = profile.id
      persistedUpdates.completed_at = persistedUpdates.completed_at || timestamp
    } else if (nextStatus === 'reviewed') {
      if ((note.status || '').trim() === 'approved') {
        persistedUpdates.approved_by = null
        persistedUpdates.approved_at = null
      } else {
        persistedUpdates.reviewed_by = profile.id
        persistedUpdates.reviewed_at = persistedUpdates.reviewed_at || timestamp
      }
    } else if (nextStatus === 'approved') {
      persistedUpdates.approved_by = profile.id
      persistedUpdates.approved_at = persistedUpdates.approved_at || timestamp
    }

    return { allowed: true }
  }

  if (!persistedKeys.every(key => SESSION_NOTE_EDITABLE_FIELDS.has(key))) {
    return { allowed: false, status: 400, error: 'Unsupported session note fields in update payload.' }
  }
  if (!canEditSessionNoteRecord(profile, note)) {
    return { allowed: false, status: 403, error: 'Permission denied' }
  }

  return validateSessionLink(env, profile, note.client_id, persistedUpdates.session_id)
}

async function validateClientInOrg(env, profile, clientId, options = {}) {
  if (!clientId) {
    return { allowed: false, status: 400, error: 'client_id is required' }
  }

  const client = await loadSingleRow(env, 'clients', clientId, 'id, org_id, deleted_at')
  if (!client || client.org_id !== profile.org_id || client.deleted_at) {
    return { allowed: false, status: 404, error: 'Client not found' }
  }

  if (!options.allowOrgWide && !await canAccessClient(env, profile, clientId)) {
    return { allowed: false, status: 403, error: 'Forbidden' }
  }

  return { allowed: true, client }
}

async function validateStaffInOrg(env, profile, staffId, label = 'staff_id') {
  if (!staffId) {
    return { allowed: false, status: 400, error: `${label} is required` }
  }

  const staff = await loadSingleRow(env, 'profiles', staffId, 'id, org_id')
  if (!staff || staff.org_id !== profile.org_id) {
    return { allowed: false, status: 404, error: 'Staff member not found' }
  }

  return { allowed: true, staff }
}

async function validateScheduleTemplateAccess(env, profile, template) {
  if (!template || template.org_id !== profile.org_id) {
    return { allowed: false, status: 404, error: 'Scheduled session not found' }
  }

  if (canViewSchedulesOrgWide(profile)) {
    return { allowed: true, template }
  }

  if (!await canAccessClient(env, profile, template.client_id)) {
    return { allowed: false, status: 403, error: 'Forbidden' }
  }

  if (shouldRestrictSchedulesToOwnStaff(profile) && template.staff_id !== profile.id) {
    return { allowed: false, status: 403, error: 'You can only view your own scheduled sessions.' }
  }

  return { allowed: true, template }
}

async function validateScheduleTemplateFilter(env, profile, templateFilter) {
  if (Array.isArray(templateFilter)) {
    const [operator, values] = templateFilter
    if (operator !== 'in' || !Array.isArray(values) || values.length === 0) {
      return { allowed: false, status: 400, error: 'template_id filters must use a non-empty in() list' }
    }

    const uniqueIds = [...new Set(values)]
    const result = await query(
      env,
      'SELECT id, org_id, client_id, staff_id FROM schedule_templates WHERE id = ANY($1::uuid[])',
      [uniqueIds],
    )
    if (result.rows.length !== uniqueIds.length) {
      return { allowed: false, status: 404, error: 'One or more scheduled sessions were not found' }
    }

    for (const row of result.rows) {
      const access = await validateScheduleTemplateAccess(env, profile, row)
      if (!access.allowed) return access
    }

    return { allowed: true }
  }

  if (!templateFilter) {
    return { allowed: false, status: 400, error: 'template_id is required' }
  }

  const existing = await loadSingleRow(env, 'schedule_templates', templateFilter, 'id, org_id, client_id, staff_id')
  if (!existing) {
    return { allowed: false, status: 404, error: 'Scheduled session not found' }
  }

  return validateScheduleTemplateAccess(env, profile, existing)
}

async function validateScheduleTemplateMutationRows(env, profile, rawData) {
  const rows = Array.isArray(rawData) ? rawData : [rawData]
  if (rows.length === 0) {
    return { allowed: false, status: 400, error: 'No data provided' }
  }

  const allowOrgWide = canViewSchedulesOrgWide(profile)

  for (const row of rows) {
    const clientValidation = await validateClientInOrg(env, profile, row?.client_id, { allowOrgWide })
    if (!clientValidation.allowed) return clientValidation

    const staffValidation = await validateStaffInOrg(env, profile, row?.staff_id)
    if (!staffValidation.allowed) return staffValidation

    row.org_id = profile.org_id
  }

  return { allowed: true }
}

async function validateScheduleExceptionPayload(env, profile, templateId, body = {}) {
  const templateAccess = await validateScheduleTemplateFilter(env, profile, templateId)
  if (!templateAccess.allowed) return templateAccess

  if (body?.substitute_staff_id) {
    const staffValidation = await validateStaffInOrg(env, profile, body.substitute_staff_id, 'substitute_staff_id')
    if (!staffValidation.allowed) return staffValidation
  }

  return { allowed: true }
}

async function validateGoalLibraryMutation(env, table, rawData = null, body = {}) {
  const rows = Array.isArray(rawData) ? rawData : [body]
  if (rows.length === 0) {
    return { allowed: false, status: 400, error: 'No data provided' }
  }

  const parentConfig = GOAL_LIBRARY_PARENT_LOOKUPS[table]
  if (!parentConfig) {
    return { allowed: true }
  }

  for (const row of rows) {
    const parentId = row?.[parentConfig.column]
    if (!parentId) {
      return { allowed: false, status: 400, error: `${parentConfig.column} required for ${table}` }
    }

    const parent = await loadSingleRow(env, parentConfig.table, parentId, 'id')
    if (!parent) {
      return { allowed: false, status: 404, error: `${parentConfig.label} not found` }
    }
  }

  return { allowed: true }
}

async function enforceAccess(env, profile, table, operation, body, filters, rawData = null) {
  const config = TABLE_CONFIG[table]
  if (!config) return { allowed: false, status: 400, error: `Table "${table}" not allowed` }

  const { scope } = config

  if (CLIENT_ACCESS_FILTER_TABLES.has(table)) {
    if (operation === 'insert') {
      const clientId = body?.client_id
      if (!clientId) {
        return { allowed: false, status: 400, error: `client_id required for ${table}` }
      }
      if (!await canAccessClient(env, profile, clientId)) {
        return { allowed: false, status: 403, error: 'Forbidden' }
      }
      body.org_id = profile.org_id
      return { allowed: true, filters }
    }

    if (operation === 'update' || operation === 'delete') {
      const id = filters?.id
      if (!id || Array.isArray(id)) {
        return { allowed: false, status: 400, error: `${table} mutations require an id filter` }
      }

      const existing = await loadSingleRow(env, table, id, 'id, org_id, client_id')
      if (!existing || existing.org_id !== profile.org_id) {
        return { allowed: false, status: 404, error: 'Resource not found' }
      }
      if (!await canAccessClient(env, profile, existing.client_id)) {
        return { allowed: false, status: 403, error: 'Forbidden' }
      }

      return { allowed: true, filters: { id: existing.id, org_id: profile.org_id } }
    }

    const visibility = await applyAccessibleClientFilters(env, profile, { ...(filters || {}), org_id: profile.org_id })
    if (!visibility.allowed) return visibility
    return { allowed: true, filters: visibility.filters }
  }

  if (table === 'schedule_templates') {
    if (operation === 'insert' || operation === 'upsert') {
      const validation = await validateScheduleTemplateMutationRows(env, profile, rawData || body)
      if (!validation.allowed) return validation
      return { allowed: true, filters }
    }

    if (operation === 'update' || operation === 'delete') {
      const id = filters?.id
      if (!id || Array.isArray(id)) {
        return { allowed: false, status: 400, error: 'schedule_templates mutations require an id filter' }
      }

      const existing = await loadSingleRow(env, 'schedule_templates', id, 'id, org_id, client_id, staff_id')
      const access = await validateScheduleTemplateAccess(env, profile, existing)
      if (!access.allowed) return access

      if (operation === 'update') {
        const nextClientId = body?.client_id || existing.client_id
        const nextStaffId = body?.staff_id || existing.staff_id
        const allowOrgWide = canViewSchedulesOrgWide(profile)

        const clientValidation = await validateClientInOrg(env, profile, nextClientId, { allowOrgWide })
        if (!clientValidation.allowed) return clientValidation

        const staffValidation = await validateStaffInOrg(env, profile, nextStaffId)
        if (!staffValidation.allowed) return staffValidation

        body.org_id = profile.org_id
      }

      return { allowed: true, filters: { ...(filters || {}), id: existing.id, org_id: profile.org_id } }
    }

    if (filters?.id && !Array.isArray(filters.id)) {
      const existing = await loadSingleRow(env, 'schedule_templates', filters.id, 'id, org_id, client_id, staff_id')
      const access = await validateScheduleTemplateAccess(env, profile, existing)
      if (!access.allowed) return access
      return { allowed: true, filters: { ...(filters || {}), id: existing.id, org_id: profile.org_id } }
    }

    const scopedFilters = { ...(filters || {}), org_id: profile.org_id }
    if (canViewSchedulesOrgWide(profile)) {
      return { allowed: true, filters: scopedFilters }
    }

    const visibility = await applyAccessibleClientFilters(env, profile, scopedFilters)
    if (!visibility.allowed) return visibility

    if (shouldRestrictSchedulesToOwnStaff(profile)) {
      const requestedStaffId = visibility.filters?.staff_id
      if (Array.isArray(requestedStaffId)) {
        const [operator, values] = requestedStaffId
        if (operator !== 'in' || !Array.isArray(values) || values.some(value => value !== profile.id)) {
          return { allowed: false, status: 403, error: 'You can only view your own scheduled sessions.' }
        }
      } else if (requestedStaffId && requestedStaffId !== profile.id) {
        return { allowed: false, status: 403, error: 'You can only view your own scheduled sessions.' }
      }

      visibility.filters.staff_id = profile.id
    }

    return { allowed: true, filters: visibility.filters }
  }

  if (table === 'schedule_exceptions') {
    if (operation === 'select') {
      if (filters?.template_id) {
        const access = await validateScheduleTemplateFilter(env, profile, filters.template_id)
        if (!access.allowed) return access
        return { allowed: true, filters }
      }

      if (filters?.id && !Array.isArray(filters.id)) {
        const existing = await loadSingleRow(env, 'schedule_exceptions', filters.id, 'id, template_id')
        if (!existing) {
          return { allowed: false, status: 404, error: 'Schedule exception not found' }
        }
        const access = await validateScheduleTemplateFilter(env, profile, existing.template_id)
        if (!access.allowed) return access
        return { allowed: true, filters: { ...(filters || {}), id: existing.id } }
      }

      return { allowed: false, status: 400, error: 'schedule_exceptions queries require template_id or id' }
    }

    if (operation === 'insert' || operation === 'upsert') {
      const validation = await validateScheduleExceptionPayload(env, profile, body?.template_id, body)
      if (!validation.allowed) return validation
      return { allowed: true, filters }
    }

    if (operation === 'delete' && filters?.template_id) {
      const access = await validateScheduleTemplateFilter(env, profile, filters.template_id)
      if (!access.allowed) return access
      return { allowed: true, filters }
    }

    const id = filters?.id
    if (!id || Array.isArray(id)) {
      return { allowed: false, status: 400, error: 'schedule_exceptions mutations require an id filter or template_id filter for delete' }
    }

    const existing = await loadSingleRow(env, 'schedule_exceptions', id, 'id, template_id')
    if (!existing) {
      return { allowed: false, status: 404, error: 'Schedule exception not found' }
    }

    const effectiveTemplateId = body?.template_id || existing.template_id
    const access = await validateScheduleExceptionPayload(env, profile, effectiveTemplateId, body)
    if (!access.allowed) return access

    return { allowed: true, filters: { ...(filters || {}), id: existing.id } }
  }

  if (DIRECT_CLIENT_TABLES.has(table)) {
    if (operation === 'insert' || operation === 'upsert') {
      const rowValidation = await validateClientMutationRows(env, profile, table, rawData || body)
      if (!rowValidation.allowed) return rowValidation
      return { allowed: true, filters }
    }

    if (operation === 'update' || operation === 'delete') {
      const id = filters?.id
      if (id && !Array.isArray(id)) {
        const existing = await loadSingleRow(env, table, id, 'id, client_id')
        if (!existing) {
          return { allowed: false, status: 404, error: 'Resource not found' }
        }
        if (!await canAccessClient(env, profile, existing.client_id)) {
          return { allowed: false, status: 403, error: 'Forbidden' }
        }
        return { allowed: true, filters: { ...filters, id: existing.id } }
      }

      const visibility = await applyAccessibleClientFilters(env, profile, filters || {})
      if (!visibility.allowed) return visibility
      if (operation === 'update') {
        return { allowed: false, status: 400, error: `${table} updates require an id filter` }
      }
      return { allowed: true, filters: visibility.filters }
    }

    const visibility = await applyAccessibleClientFilters(env, profile, filters || {})
    if (!visibility.allowed) return visibility
    return { allowed: true, filters: visibility.filters }
  }

  if (table === 'program_label_assignments') {
    if (operation === 'select') {
      if (filters?.program_id) {
        const access = await validateProgramFilter(env, profile, filters.program_id)
        if (!access.allowed) return access
        return { allowed: true, filters }
      }
      if (filters?.id && !Array.isArray(filters.id)) {
        const existing = await loadSingleRow(env, 'program_label_assignments', filters.id, 'id, program_id')
        if (!existing) {
          return { allowed: false, status: 404, error: 'Program label assignment not found' }
        }
        const access = await validateProgramAccess(env, profile, existing.program_id)
        if (!access.allowed) return access
        return { allowed: true, filters: { ...filters, id: existing.id } }
      }

      return { allowed: false, status: 400, error: 'program_label_assignments queries require program_id or id' }
    }

    if (operation === 'insert' || operation === 'upsert') {
      const access = await validateProgramMutationRows(env, profile, table, rawData || body)
      if (!access.allowed) return access
      return { allowed: true, filters }
    }

    if (operation === 'delete' && filters?.program_id) {
      const access = await validateProgramFilter(env, profile, filters.program_id)
      if (!access.allowed) return access
      return { allowed: true, filters }
    }

    const id = filters?.id
    if (!id || Array.isArray(id)) {
      return { allowed: false, status: 400, error: 'program_label_assignments mutations require an id filter or program_id filter for delete' }
    }

    const existing = await loadSingleRow(env, 'program_label_assignments', id, 'id, program_id')
    if (!existing) {
      return { allowed: false, status: 404, error: 'Program label assignment not found' }
    }
    const access = await validateProgramAccess(env, profile, existing.program_id)
    if (!access.allowed) return access

    return { allowed: true, filters: { ...filters, id: existing.id } }
  }

  if (table === 'profiles') {
    if (operation === 'select') {
      return { allowed: true, filters: { ...(filters || {}), org_id: profile.org_id } }
    }

    if (operation === 'insert' || operation === 'upsert') {
      if (!canManageTeamRecords(profile)) {
        return { allowed: false, status: 403, error: 'Only team managers can create profile records.' }
      }

      const rows = Array.isArray(rawData) ? rawData : [body]
      if (rows.length === 0) {
        return { allowed: false, status: 400, error: 'No data provided' }
      }

      for (const row of rows) {
        if (Object.prototype.hasOwnProperty.call(row || {}, 'is_super_admin')) {
          return { allowed: false, status: 403, error: 'Super-admin status cannot be modified through the profile API.' }
        }
        row.org_id = profile.org_id
      }

      return { allowed: true, filters }
    }

    const id = filters?.id
    if (!id || Array.isArray(id)) {
      return { allowed: false, status: 400, error: 'profiles mutations require an id filter' }
    }

    const existing = await loadSingleRow(env, 'profiles', id, 'id, org_id, is_super_admin')
    if (!existing || existing.org_id !== profile.org_id) {
      return { allowed: false, status: 404, error: 'Profile not found' }
    }

    if (operation === 'update') {
      const keys = Object.keys(body || {})
      if (keys.length === 0) {
        return { allowed: false, status: 400, error: 'No data to update' }
      }

      if (Object.prototype.hasOwnProperty.call(body, 'is_super_admin')) {
        return { allowed: false, status: 403, error: 'Super-admin status cannot be modified through the profile API.' }
      }

      const isSelf = existing.id === profile.id
      if (!isSelf) {
        if (!canManageTeamRecords(profile)) {
          return { allowed: false, status: 403, error: 'Only team managers can edit other member profiles.' }
        }
        if (!keys.every(key => PROFILE_MANAGER_EDITABLE_FIELDS.has(key))) {
          return { allowed: false, status: 403, error: 'Only display name, role, and org membership changes are allowed for team member profiles.' }
        }
        if (Object.prototype.hasOwnProperty.call(body, 'org_id') && body.org_id !== null && body.org_id !== profile.org_id) {
          return { allowed: false, status: 403, error: 'Members can only be reassigned within this organization or removed from it.' }
        }
      } else if (!canManageTeamRecords(profile) && keys.some(key => PROFILE_SELF_RESTRICTED_FIELDS.has(key))) {
        return { allowed: false, status: 403, error: 'You cannot change your own organization membership or role.' }
      }

      return { allowed: true, filters: { ...filters, id: existing.id, org_id: profile.org_id } }
    }

    if (operation === 'delete') {
      if (existing.id !== profile.id) {
        return { allowed: false, status: 403, error: 'Profiles can only be deleted by the profile owner.' }
      }
      return { allowed: true, filters: { ...filters, id: existing.id, org_id: profile.org_id } }
    }
  }

  if (table === 'organizations') {
    if (operation === 'select') {
      return { allowed: true, filters: { ...(filters || {}), id: profile.org_id } }
    }

    if (!canManageOrganizationSettings(profile)) {
      return { allowed: false, status: 403, error: 'Only organization managers can change organization settings.' }
    }

    if (operation === 'insert' || operation === 'upsert') {
      return { allowed: false, status: 403, error: 'Organizations are provisioned automatically and cannot be created here.' }
    }

    if (operation === 'update') {
      const keys = Object.keys(body || {})
      if (keys.length === 0) {
        return { allowed: false, status: 400, error: 'No data to update' }
      }
      if (!keys.every(key => ORGANIZATION_EDITABLE_FIELDS.has(key))) {
        return { allowed: false, status: 403, error: 'Only organization name, type, and branding can be updated here.' }
      }
    }

    return { allowed: true, filters: { ...(filters || {}), id: profile.org_id } }
  }

  if (GOAL_LIBRARY_TABLES.has(table)) {
    if (operation === 'select') {
      return { allowed: true, filters }
    }

    if (operation === 'insert' || operation === 'upsert') {
      const validation = await validateGoalLibraryMutation(env, table, rawData, body)
      if (!validation.allowed) return validation
      return { allowed: true, filters }
    }

    const id = filters?.id
    if (!id || Array.isArray(id)) {
      return { allowed: false, status: 400, error: `${table} mutations require an id filter` }
    }

    const existing = await loadSingleRow(env, table, id, 'id')
    if (!existing) {
      return { allowed: false, status: 404, error: `${table} row not found` }
    }

    return { allowed: true, filters: { ...filters, id: existing.id } }
  }

  if (table === 'auth_reports') {
    if (operation === 'insert') {
      const clientId = body?.client_id
      if (!clientId) {
        return { allowed: false, status: 400, error: 'client_id required for auth_reports' }
      }
      if (!await canAccessClient(env, profile, clientId)) {
        return { allowed: false, status: 403, error: 'Forbidden' }
      }
      body.created_by = profile.id
      return { allowed: true, filters }
    }

    if (operation === 'update' || operation === 'delete') {
      const id = filters?.id
      if (!id || Array.isArray(id)) {
        return { allowed: false, status: 400, error: 'auth_reports mutations require an id filter' }
      }

      const existing = await loadSingleRow(env, 'auth_reports', id, 'id, client_id, created_by')
      if (!existing) {
        return { allowed: false, status: 404, error: 'Report not found' }
      }
      if (existing.created_by !== profile.id) {
        return { allowed: false, status: 403, error: 'You can only manage your own auth reports.' }
      }
      if (existing.client_id && !await canAccessClient(env, profile, existing.client_id)) {
        return { allowed: false, status: 403, error: 'Forbidden' }
      }

      return { allowed: true, filters: { ...filters, id: existing.id, created_by: profile.id } }
    }

    const visibility = await applyAccessibleClientFilters(env, profile, { ...(filters || {}), created_by: profile.id })
    if (!visibility.allowed) return visibility
    return { allowed: true, filters: visibility.filters }
  }

  if (table === 'audit_log') {
    if (operation === 'insert') {
      body.user_id = profile.id
      return { allowed: true, filters }
    }

    if (operation === 'update') {
      return { allowed: false, status: 403, error: 'Audit log entries are append-only.' }
    }

    if (operation === 'delete') {
      const requestedUserId = filters?.user_id
      if (!requestedUserId || Array.isArray(requestedUserId) || requestedUserId !== profile.id) {
        return { allowed: false, status: 403, error: 'You can only delete your own audit log entries.' }
      }
      return { allowed: true, filters: { ...filters, user_id: profile.id } }
    }

    return applyVisibleUserFilters(env, profile, filters || {})
  }

  if (table === 'usage_sessions') {
    if (operation === 'select') {
      return { allowed: true, filters: getUsageVisibilityFilters(profile, filters || {}) }
    }

    if (operation === 'insert') {
      body.user_id = profile.id
      body.org_id = profile.org_id
      return { allowed: true, filters }
    }

    const id = filters?.id
    if (!id || Array.isArray(id)) {
      return { allowed: false, status: 400, error: 'usage_sessions mutations require an id filter' }
    }

    const existing = await loadSingleRow(env, 'usage_sessions', id, 'id, user_id, org_id')
    if (!existing || existing.org_id !== profile.org_id) {
      return { allowed: false, status: 404, error: 'Usage session not found' }
    }
    if (!profile?.is_super_admin && !requireAdmin(profile) && existing.user_id !== profile.id) {
      return { allowed: false, status: 403, error: 'Forbidden' }
    }

    body.user_id = existing.user_id
    body.org_id = existing.org_id
    return { allowed: true, filters: { ...filters, id: existing.id, org_id: existing.org_id } }
  }

  if (table === 'usage_events') {
    if (operation === 'select') {
      return { allowed: true, filters: getUsageVisibilityFilters(profile, filters || {}) }
    }

    if (operation === 'insert') {
      const rows = Array.isArray(rawData) ? rawData : [body]
      const sessionAccess = await validateUsageSessionOwnership(
        env,
        profile,
        rows.map(row => row?.session_id),
      )
      if (!sessionAccess.allowed) return sessionAccess

      for (const row of rows) {
        row.user_id = profile.id
        row.org_id = profile.org_id
      }
      return { allowed: true, filters }
    }

    return { allowed: false, status: 403, error: 'usage_events are append-only.' }
  }

  if (table === 'session_data') {
    if (operation === 'select') {
      if (filters?.program_id && !Array.isArray(filters.program_id)) {
        const programAccess = await validateProgramAccess(env, profile, filters.program_id)
        if (!programAccess.allowed) return programAccess
        return { allowed: true, filters }
      }
      if (filters?.session_id) {
        const sessionAccess = await validateSessionFilter(env, profile, filters.session_id)
        if (!sessionAccess.allowed) return sessionAccess
        return { allowed: true, filters }
      }
      if (filters?.id && !Array.isArray(filters.id)) {
        const existing = await loadSingleRow(env, 'session_data', filters.id, 'id, program_id, session_id')
        if (!existing) {
          return { allowed: false, status: 404, error: 'Session data not found' }
        }
        const access = existing.program_id
          ? await validateProgramAccess(env, profile, existing.program_id)
          : await validateSessionAccess(env, profile, existing.session_id)
        if (!access.allowed) return access
        return { allowed: true, filters: { ...filters, id: existing.id } }
      }

      return { allowed: false, status: 400, error: 'session_data queries require program_id, session_id, or id' }
    }

    if (operation === 'insert') {
      const programAccess = await validateProgramAccess(env, profile, body?.program_id)
      if (!programAccess.allowed) return programAccess
      const sessionAccess = await validateSessionAccess(env, profile, body?.session_id)
      if (!sessionAccess.allowed) return sessionAccess
      if (programAccess.program.client_id !== sessionAccess.session.client_id) {
        return { allowed: false, status: 400, error: 'session_data must reference a program and session for the same client' }
      }
      return { allowed: true, filters }
    }

    const id = filters?.id
    if (!id || Array.isArray(id)) {
      return { allowed: false, status: 400, error: 'session_data mutations require an id filter' }
    }

    const existing = await loadSingleRow(env, 'session_data', id, 'id, program_id, session_id')
    if (!existing) {
      return { allowed: false, status: 404, error: 'Session data not found' }
    }
    const access = existing.program_id
      ? await validateProgramAccess(env, profile, existing.program_id)
      : await validateSessionAccess(env, profile, existing.session_id)
    if (!access.allowed) return access

    return { allowed: true, filters: { ...filters, id: existing.id } }
  }

  if (table === 'session_runs') {
    if (operation === 'select') {
      if (filters?.session_id) {
        const access = await validateSessionFilter(env, profile, filters.session_id)
        if (!access.allowed) return access
        return { allowed: true, filters }
      }
      if (filters?.id && !Array.isArray(filters.id)) {
        const existing = await loadSingleRow(env, 'session_runs', filters.id, 'id, session_id')
        if (!existing) {
          return { allowed: false, status: 404, error: 'Session run not found' }
        }
        const access = await validateSessionAccess(env, profile, existing.session_id)
        if (!access.allowed) return access
        return { allowed: true, filters: { ...filters, id: existing.id } }
      }

      return { allowed: false, status: 400, error: 'session_runs queries require session_id or id' }
    }

    if (operation === 'insert') {
      const access = await validateSessionAccess(env, profile, body?.session_id)
      if (!access.allowed) return access
      body.staff_id = profile.id
      return { allowed: true, filters }
    }

    if (operation === 'delete' && filters?.session_id) {
      const access = await validateSessionFilter(env, profile, filters.session_id)
      if (!access.allowed) return access
      return { allowed: true, filters }
    }

    const id = filters?.id
    if (!id || Array.isArray(id)) {
      return { allowed: false, status: 400, error: 'session_runs mutations require an id filter or session_id filter for delete' }
    }

    const existing = await loadSingleRow(env, 'session_runs', id, 'id, session_id, staff_id')
    if (!existing) {
      return { allowed: false, status: 404, error: 'Session run not found' }
    }
    const access = await validateSessionAccess(env, profile, existing.session_id)
    if (!access.allowed) return access

    if (operation === 'update' && !hasClinicalManagerRole(profile) && existing.staff_id !== profile.id) {
      return { allowed: false, status: 403, error: 'You can only update your own session runs.' }
    }

    return { allowed: true, filters: { ...filters, id: existing.id, session_id: existing.session_id } }
  }

  if (table === 'client_targets') {
    if (operation === 'select') {
      if (filters?.program_id && !Array.isArray(filters.program_id)) {
        const programAccess = await validateProgramAccess(env, profile, filters.program_id)
        if (!programAccess.allowed) return programAccess
        return { allowed: true, filters }
      }
      if (filters?.id && !Array.isArray(filters.id)) {
        const existing = await loadSingleRow(env, 'client_targets', filters.id, 'id, program_id')
        if (!existing) {
          return { allowed: false, status: 404, error: 'Target not found' }
        }
        const access = await validateProgramAccess(env, profile, existing.program_id)
        if (!access.allowed) return access
        return { allowed: true, filters: { ...filters, id: existing.id } }
      }

      return { allowed: false, status: 400, error: 'client_targets queries require program_id or id' }
    }

    if (operation === 'insert') {
      const programAccess = await validateProgramAccess(env, profile, body?.program_id)
      if (!programAccess.allowed) return programAccess
      return { allowed: true, filters }
    }

    const id = filters?.id
    if (!id || Array.isArray(id)) {
      return { allowed: false, status: 400, error: 'client_targets mutations require an id filter' }
    }

    const existing = await loadSingleRow(env, 'client_targets', id, 'id, program_id')
    if (!existing) {
      return { allowed: false, status: 404, error: 'Target not found' }
    }
    const access = await validateProgramAccess(env, profile, existing.program_id)
    if (!access.allowed) return access

    return { allowed: true, filters: { ...filters, id: existing.id } }
  }

  if (table === 'session_programs') {
    if (operation === 'select') {
      if (filters?.session_id) {
        const sessionAccess = await validateSessionFilter(env, profile, filters.session_id)
        if (!sessionAccess.allowed) return sessionAccess
        return { allowed: true, filters }
      }
      if (filters?.id && !Array.isArray(filters.id)) {
        const existing = await loadSingleRow(env, 'session_programs', filters.id, 'id, session_id')
        if (!existing) {
          return { allowed: false, status: 404, error: 'Session program row not found' }
        }
        const access = await validateSessionAccess(env, profile, existing.session_id)
        if (!access.allowed) return access
        return { allowed: true, filters: { ...filters, id: existing.id } }
      }

      return { allowed: false, status: 400, error: 'session_programs queries require session_id or id' }
    }

    if (operation === 'insert') {
      const sessionAccess = await validateSessionMutationRows(env, profile, table, rawData || body)
      if (!sessionAccess.allowed) return sessionAccess
      return { allowed: true, filters }
    }

    if (operation === 'delete' && filters?.session_id) {
      const sessionAccess = await validateSessionFilter(env, profile, filters.session_id)
      if (!sessionAccess.allowed) return sessionAccess
      return { allowed: true, filters }
    }

    const id = filters?.id
    if (!id || Array.isArray(id)) {
      return { allowed: false, status: 400, error: 'session_programs mutations require an id filter or session_id filter for delete' }
    }

    const existing = await loadSingleRow(env, 'session_programs', id, 'id, session_id')
    if (!existing) {
      return { allowed: false, status: 404, error: 'Session program row not found' }
    }
    const access = await validateSessionAccess(env, profile, existing.session_id)
    if (!access.allowed) return access

    return { allowed: true, filters: { ...filters, id: existing.id } }
  }

  if (table === 'session_notes') {
    if (!canViewSessionNotes(profile)) {
      return { allowed: false, status: 403, error: 'Permission denied' }
    }

    if (operation === 'select') {
      const visibility = await applyAccessibleClientFilters(
        env,
        profile,
        { ...(filters || {}), org_id: profile.org_id },
        { allowOrgWideRoles: SESSION_NOTE_ORG_WIDE_ROLES },
      )
      if (!visibility.allowed) return visibility
      return { allowed: true, filters: visibility.filters }
    }

    if (operation === 'insert') {
      const clientId = body?.client_id
      if (!clientId) {
        return { allowed: false, status: 400, error: 'client_id required for session_notes' }
      }
      if (!await canAccessClient(env, profile, clientId)) {
        return { allowed: false, status: 403, error: 'Forbidden' }
      }
      if (!canCreateSessionNoteRecord(profile, body)) {
        return { allowed: false, status: 403, error: 'Permission denied' }
      }
      if (body.status && body.status !== 'draft') {
        return { allowed: false, status: 400, error: 'New session notes must start in draft status.' }
      }

      body.org_id = profile.org_id
      body.status = 'draft'
      delete body.completed_by
      delete body.completed_at
      delete body.reviewed_by
      delete body.reviewed_at
      delete body.approved_by
      delete body.approved_at
      if (normalizeRoleSlug(profile?.role_slug || profile?.role) === 'rbt') {
        body.staff_id = profile.id
      }

      const sessionLink = await validateSessionLink(env, profile, clientId, body.session_id)
      if (!sessionLink.allowed) return sessionLink

      return { allowed: true, filters }
    }

    const id = filters?.id
    if (!id || Array.isArray(id)) {
      return { allowed: false, status: 400, error: 'session_notes mutations require an id filter' }
    }

    const existingNote = await loadSingleRow(
      env,
      'session_notes',
      id,
      'id, org_id, client_id, staff_id, status, session_id, narrative, cpt_code, location, start_time, end_time, duration_minutes, completed_by, completed_at, reviewed_by, reviewed_at, approved_by, approved_at',
    )
    if (!existingNote || existingNote.org_id !== profile.org_id) {
      return { allowed: false, status: 404, error: 'Session note not found' }
    }
    if (!await canAccessClient(env, profile, existingNote.client_id)) {
      return { allowed: false, status: 403, error: 'Forbidden' }
    }

    if (operation === 'update') {
      const validation = await validateSessionNoteUpdate(env, profile, existingNote, rawData || body)
      if (!validation.allowed) return validation
    } else if (operation === 'delete') {
      if (!canEditSessionNoteRecord(profile, existingNote)) {
        return { allowed: false, status: 403, error: 'Permission denied' }
      }
    }

    return { allowed: true, filters: { id: existingNote.id, org_id: profile.org_id } }
  }

  if (scope === 'user') {
    const userCol = config.userColumn
    if (operation === 'insert') {
      body[userCol] = profile.id
    } else {
      filters = { ...(filters || {}), [userCol]: profile.id }
    }
    return { allowed: true, filters }
  }

  if (scope === 'org') {
    const orgCol = config.orgColumn
    if (operation === 'insert') {
      body[orgCol] = profile.org_id
    } else {
      filters = { ...(filters || {}), [orgCol]: profile.org_id }
    }
    return { allowed: true, filters }
  }

  if (scope === 'client') {
    const clientCol = config.clientColumn
    const clientId = body?.[clientCol] || filters?.[clientCol]
    if (!clientId) {
      return { allowed: false, status: 400, error: `${clientCol} filter required for ${table}` }
    }
    if (!await canAccessClient(env, profile, clientId)) {
      return { allowed: false, status: 403, error: 'Forbidden' }
    }
    return { allowed: true, filters }
  }

  if (scope === 'lookup') {
    if (operation === 'insert' || operation === 'upsert') {
      const access = await validateLookupMutationRows(env, profile, table, rawData || body, config)
      if (!access.allowed) return access
      return { allowed: true, filters }
    }

    const lookupId = body?.[config.lookupColumn] || filters?.[config.lookupColumn]
    if (!lookupId) {
      return { allowed: false, status: 400, error: `${config.lookupColumn} required for ${table}` }
    }

    const parent = await query(
      env,
      `SELECT ${normalizeIdentifier(config.lookupClientColumn, 'lookup client column')}
       FROM ${normalizeIdentifier(config.lookupTable, 'lookup table')}
       WHERE id = $1`,
      [lookupId],
    )

    if (parent.rows.length === 0) {
      return { allowed: false, status: 404, error: 'Parent resource not found' }
    }
    if (!await canAccessClient(env, profile, parent.rows[0][config.lookupClientColumn])) {
      return { allowed: false, status: 403, error: 'Forbidden' }
    }
    return { allowed: true, filters }
  }

  if (scope === 'admin_read') {
    if (operation !== 'insert' && !requireAdmin(profile)) {
      return { allowed: false, status: 403, error: 'Admin required' }
    }
    return { allowed: true, filters }
  }

  if (scope === 'org_self') {
    return { allowed: true, filters: { ...(filters || {}), id: profile.org_id } }
  }

  if (scope === 'open') {
    return { allowed: true, filters }
  }

  return { allowed: false, status: 400, error: 'Unknown scope' }
}

app.post('/:table', async (c) => {
  const profile = c.get('profile')
  const table = c.req.param('table')
  const body = await c.req.json()

  const {
    operation = 'select',
    columns = '*',
    data = {},
    filters: rawFilters = {},
    order,
    limit,
    offset,
    on_conflict,
    returning = true,
  } = body

  if (!TABLE_CONFIG[table]) {
    return c.json({ error: `Table "${table}" not allowed` }, 400)
  }

  const validOps = ['select', 'insert', 'update', 'upsert', 'delete']
  if (!validOps.includes(operation)) {
    return c.json({ error: `Invalid operation: ${operation}` }, 400)
  }

  if (!checkTablePermission(profile, table, operation)) {
    return c.json({ error: 'Permission denied' }, 403)
  }

  const mutData = data || {}
  const rawMutationData = operation === 'select' || operation === 'delete'
    ? {}
    : (Array.isArray(mutData) ? mutData[0] : mutData)
  const mutationData = table === 'session_notes'
    ? stripSessionNoteVirtualFields(rawMutationData)
    : rawMutationData
  const mutationPayload = table === 'session_notes'
    ? stripSessionNoteVirtualFields(mutData)
    : mutData

  const access = await enforceAccess(c.env, profile, table, operation, mutationData, { ...rawFilters }, mutData)
  if (!access.allowed) {
    return c.json({ error: access.error }, access.status)
  }

  const filters = access.filters || rawFilters
  const sessionNoteWorkflowReason = table === 'session_notes'
    ? normalizeWorkflowReason(rawMutationData?.workflow_reason)
    : ''
  const sessionNoteWorkflowAttested = table === 'session_notes'
    ? rawMutationData?.workflow_attestation === true
    : false
  const sessionNoteWorkflowAttestationLabel = table === 'session_notes'
    ? normalizeWorkflowAttestationLabel(rawMutationData?.workflow_attestation_label)
    : ''
  const sessionNoteAuditBefore = table === 'session_notes' && operation === 'update' && mutationData?.status
    ? await loadSingleRow(
        c.env,
        'session_notes',
        filters?.id,
        'id, client_id, staff_id, session_id, status',
      )
    : null

  try {
    let result

    switch (operation) {
      case 'select':
        result = await handleSelect(c.env, table, columns, filters, order, limit, offset)
        break
      case 'insert':
        result = await handleInsert(c.env, profile, table, mutationPayload, returning)
        break
      case 'update':
        result = await handleUpdate(c.env, table, mutationPayload, filters, returning)
        break
      case 'upsert':
        result = await handleUpsert(c.env, profile, table, mutationPayload, on_conflict, returning)
        break
      case 'delete':
        result = await handleDelete(c.env, table, filters)
        break
    }

    if (table === 'session_notes' && operation === 'insert' && Array.isArray(result)) {
      for (const createdNote of result) {
        await writeSessionNoteCreatedAudit(c.env, profile, createdNote)
      }
    }

    if (
      table === 'session_notes'
      && operation === 'update'
      && sessionNoteAuditBefore
      && mutationData?.status
      && Array.isArray(result)
      && result[0]
      && result[0].status !== sessionNoteAuditBefore.status
    ) {
      await writeSessionNoteStatusAudit(
        c.env,
        profile,
        sessionNoteAuditBefore,
        result[0],
        sessionNoteWorkflowReason,
        sessionNoteWorkflowAttested,
        sessionNoteWorkflowAttestationLabel,
      )
    }

    return c.json({ data: result })
  } catch (err) {
    console.error(`Generic route error [${table}/${operation}]:`, err.message)
    return c.json({ error: err.message }, 500)
  }
})

function buildWhereClause(filters, startIdx = 1) {
  const conditions = []
  const values = []
  let idx = startIdx

  for (const [rawKey, val] of Object.entries(filters || {})) {
    const key = normalizeIdentifier(rawKey, 'filter column')

    if (val === null) {
      conditions.push(`${key} IS NULL`)
      continue
    }

    if (Array.isArray(val) && val.length === 2) {
      const [op, v] = val
      if (!ALLOWED_FILTER_OPERATORS.has(op)) {
        throw new Error(`Unsupported filter operator: ${op}`)
      }

      const opMap = {
        eq: '=',
        neq: '!=',
        gt: '>',
        gte: '>=',
        lt: '<',
        lte: '<=',
        like: 'LIKE',
        ilike: 'ILIKE',
        is: 'IS',
      }

      if (op === 'in' && Array.isArray(v)) {
        const placeholders = v.map((_, j) => `$${idx + j}`).join(',')
        conditions.push(`${key} IN (${placeholders})`)
        values.push(...v)
        idx += v.length
      } else if (op === 'is' && v === null) {
        conditions.push(`${key} IS NULL`)
      } else if (op === 'is_not' && v === null) {
        conditions.push(`${key} IS NOT NULL`)
      } else {
        conditions.push(`${key} ${opMap[op] || '='} $${idx}`)
        values.push(v)
        idx++
      }
      continue
    }

    conditions.push(`${key} = $${idx}`)
    values.push(val)
    idx++
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
    nextIdx: idx,
  }
}

async function handleSelect(env, table, columns, filters, order, limit, offset) {
  const cols = normalizeColumnList(columns)
  const { clause, values } = buildWhereClause(filters)

  let sql = `SELECT ${cols} FROM ${table} ${clause}`

  if (order && order.column) {
    const dir = order.ascending === false ? 'DESC' : 'ASC'
    sql += ` ORDER BY ${normalizeIdentifier(order.column, 'order column')} ${dir}`
  }

  const safeLimit = normalizePositiveInteger(limit, 'limit')
  const safeOffset = normalizePositiveInteger(offset, 'offset')
  if (safeLimit != null) sql += ` LIMIT ${safeLimit}`
  if (safeOffset != null) sql += ` OFFSET ${safeOffset}`

  const result = await query(env, sql, values)
  return result.rows
}

async function handleInsert(env, profile, table, data, returning) {
  const rows = Array.isArray(data) ? data : [data]
  if (rows.length === 0) return []

  const cols = getSafeObjectKeys(rows[0], 'insert column')
  const values = []
  const rowPlaceholders = []
  let idx = 1

  for (const row of rows) {
    const placeholders = []
    for (const col of cols) {
      const val = row[col]
      placeholders.push(`$${idx}`)
      values.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val)
      idx++
    }
    rowPlaceholders.push(`(${placeholders.join(', ')})`)
  }

  let sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES ${rowPlaceholders.join(', ')}`
  if (returning) sql += ' RETURNING *'

  const result = await queryWithUser(env, profile.id, sql, values)
  return returning ? result.rows : { count: result.rowCount }
}

async function handleUpdate(env, table, data, filters, returning) {
  if (!data || Object.keys(data).length === 0) {
    throw new Error('No data to update')
  }

  const updates = []
  const values = []
  let idx = 1

  for (const [rawKey, val] of Object.entries(data)) {
    const key = normalizeIdentifier(rawKey, 'update column')
    updates.push(`${key} = $${idx}`)
    values.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val)
    idx++
  }

  const { clause, values: filterValues } = buildWhereClause(filters, idx)
  values.push(...filterValues)

  let sql = `UPDATE ${table} SET ${updates.join(', ')} ${clause}`
  if (returning) sql += ' RETURNING *'

  const result = await query(env, sql, values)
  return returning ? result.rows : { count: result.rowCount }
}

async function handleUpsert(env, profile, table, data, onConflict, returning) {
  const rows = Array.isArray(data) ? data : [data]
  if (rows.length === 0) return []

  const cols = getSafeObjectKeys(rows[0], 'upsert column')
  const values = []
  const rowPlaceholders = []
  let idx = 1

  for (const row of rows) {
    const placeholders = []
    for (const col of cols) {
      const val = row[col]
      placeholders.push(`$${idx}`)
      values.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val)
      idx++
    }
    rowPlaceholders.push(`(${placeholders.join(', ')})`)
  }

  const conflictCols = normalizeConflictColumns(onConflict)
  const conflictSet = new Set(conflictCols.split(',').map(column => column.trim()))
  const updateCols = cols
    .filter(col => !conflictSet.has(col))
    .map(col => `${col} = EXCLUDED.${col}`)
    .join(', ')

  let sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES ${rowPlaceholders.join(', ')}`
  sql += ` ON CONFLICT (${conflictCols}) DO ${updateCols ? `UPDATE SET ${updateCols}` : 'NOTHING'}`
  if (returning) sql += ' RETURNING *'

  const result = await queryWithUser(env, profile.id, sql, values)
  return returning ? result.rows : { count: result.rowCount }
}

async function handleDelete(env, table, filters) {
  if (!filters || Object.keys(filters).length === 0) {
    throw new Error('Filters required for delete - cannot delete without WHERE clause')
  }

  const { clause, values } = buildWhereClause(filters)
  const result = await query(env, `DELETE FROM ${table} ${clause}`, values)
  return { count: result.rowCount }
}

export default app
