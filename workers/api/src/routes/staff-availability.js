import { Hono } from 'hono'
import { query } from '../db.js'
import { canManageStaffAvailability } from '../middleware/access.js'
import {
  STAFF_AVAILABILITY_SETTINGS_KEY,
  normalizeStaffAvailabilityRecord,
  validateStaffAvailabilityPayload,
} from '../../../../src/lib/staffAvailability.js'

const app = new Hono()
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUuid(value) {
  return UUID_PATTERN.test(String(value || '').trim())
}

function parseMaybeJson(value) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

async function getTargetStaff(c, targetUserId) {
  const result = await query(
    c.env,
    `SELECT id, display_name, role
     FROM profiles
     WHERE id = $1 AND org_id = $2
     LIMIT 1`,
    [targetUserId, c.get('orgId')],
  )

  return result.rows[0] || null
}

function buildSettingsPayload(currentSettings = {}, availabilityPayload = {}) {
  return {
    ...currentSettings,
    [STAFF_AVAILABILITY_SETTINGS_KEY]: {
      weekly_hours: availabilityPayload.weekly_hours,
      blackout_dates: availabilityPayload.blackout_dates,
    },
  }
}

app.get('/', async (c) => {
  const profile = c.get('profile')
  const requestedStaffId = String(c.req.query('staff_id') || '').trim()

  if (requestedStaffId && !isValidUuid(requestedStaffId)) {
    return c.json({ error: 'Invalid staff_id.' }, 400)
  }

  if (requestedStaffId && !canManageStaffAvailability(profile, requestedStaffId)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const targetStaffId = requestedStaffId || (canManageStaffAvailability(profile, null)
    ? null
    : profile.id)

  const params = [profile.org_id]
  let staffFilterSql = ''
  if (targetStaffId) {
    params.push(targetStaffId)
    staffFilterSql = 'AND p.id = $2'
  }

  const result = await query(
    c.env,
    `SELECT p.id AS staff_id, p.display_name, p.role, us.settings
     FROM profiles p
     LEFT JOIN user_settings us ON us.user_id = p.id
     WHERE p.org_id = $1
       ${staffFilterSql}
     ORDER BY lower(coalesce(p.display_name, '')), p.id`,
    params,
  )

  const data = result.rows.map((row) => normalizeStaffAvailabilityRecord(row))
  return c.json({ data })
})

app.post('/', async (c) => {
  const profile = c.get('profile')
  const body = await c.req.json()
  const targetUserId = String(body.staff_id || '').trim()

  if (!isValidUuid(targetUserId)) {
    return c.json({ error: 'A valid staff_id is required.' }, 400)
  }
  if (!canManageStaffAvailability(profile, targetUserId)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const targetStaff = await getTargetStaff(c, targetUserId)
  if (!targetStaff) {
    return c.json({ error: 'Staff member not found.' }, 404)
  }

  const availabilityPayload = {
    weekly_hours: body.weekly_hours || {},
    blackout_dates: body.blackout_dates || [],
  }
  const validationIssues = validateStaffAvailabilityPayload(availabilityPayload)
  if (validationIssues.length > 0) {
    return c.json({ error: validationIssues[0] }, 400)
  }

  const currentSettingsResult = await query(
    c.env,
    'SELECT settings FROM user_settings WHERE user_id = $1 LIMIT 1',
    [targetUserId],
  )
  const currentSettings = parseMaybeJson(currentSettingsResult.rows[0]?.settings)
  const nextSettings = buildSettingsPayload(currentSettings, availabilityPayload)

  const upsertResult = await query(
    c.env,
    `INSERT INTO user_settings (user_id, settings)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (user_id) DO UPDATE SET settings = EXCLUDED.settings
     RETURNING user_id, settings`,
    [targetUserId, JSON.stringify(nextSettings)],
  )

  await query(
    c.env,
    `INSERT INTO audit_log (user_id, action, resource_type, resource_id, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [
      profile.id,
      'staff_availability_updated',
      'user_settings',
      targetUserId,
      JSON.stringify({
        target_staff_id: targetUserId,
        target_staff_name: targetStaff.display_name || null,
        blackout_count: availabilityPayload.blackout_dates.length,
      }),
    ],
  )

  return c.json({
    data: normalizeStaffAvailabilityRecord({
      staff_id: targetUserId,
      display_name: targetStaff.display_name,
      role: targetStaff.role,
      settings: upsertResult.rows[0]?.settings || nextSettings,
    }),
  })
})

export default app
