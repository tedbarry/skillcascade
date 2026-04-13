import { Hono } from 'hono'
import { query } from '../db.js'
import { canAccessClient, hasClinicalManagerRole } from '../middleware/access.js'

const app = new Hono()

const VALID_RELATIONSHIPS = new Set([
  'parent',
  'guardian',
  'physician',
  'teacher',
  'insurance_rep',
  'speech_therapist',
  'occupational_therapist',
  'case_manager',
  'other',
])

const VALID_ACCESS_LEVELS = new Set(['none', 'view_progress', 'view_reports', 'full'])

function normalizeContactPayload(body = {}) {
  return {
    name: String(body.name || '').trim(),
    relationship: VALID_RELATIONSHIPS.has(body.relationship) ? body.relationship : 'other',
    email: String(body.email || '').trim(),
    phone: String(body.phone || '').trim(),
    organization_name: String(body.organization_name || '').trim(),
    notes: String(body.notes || '').trim(),
    access_level: VALID_ACCESS_LEVELS.has(body.access_level) ? body.access_level : 'none',
    is_primary: body.is_primary === true,
  }
}

async function getContact(env, contactId) {
  const result = await query(env,
    `SELECT id, client_id, org_id, name, relationship, email, phone, organization_name, notes, access_level, is_primary, created_at
     FROM client_contacts
     WHERE id = $1`,
    [contactId]
  )
  return result.rows[0] || null
}

async function findReplacementPrimary(env, clientId) {
  const result = await query(env,
    `SELECT id
     FROM client_contacts
     WHERE client_id = $1
     ORDER BY
       CASE WHEN relationship IN ('parent', 'guardian') THEN 0 ELSE 1 END,
       created_at ASC
     LIMIT 1`,
    [clientId]
  )
  return result.rows[0]?.id || null
}

function validateContactPayload(contact) {
  if (!contact.name) return 'Name is required.'
  if (contact.access_level !== 'none' && !contact.email) {
    return 'Contacts with portal/report access need an email address.'
  }
  return null
}

app.post('/', async (c) => {
  const profile = c.get('profile')
  if (!hasClinicalManagerRole(profile)) {
    return c.json({ error: 'Only BCBA and admin roles can manage contacts.' }, 403)
  }

  const body = await c.req.json()
  const clientId = String(body.client_id || '').trim()
  if (!clientId) return c.json({ error: 'client_id is required.' }, 400)
  if (!await canAccessClient(c.env, profile, clientId)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const contact = normalizeContactPayload(body)
  const validationError = validateContactPayload(contact)
  if (validationError) return c.json({ error: validationError }, 400)

  const result = await query(c.env,
    `${contact.is_primary ? "WITH cleared AS (UPDATE client_contacts SET is_primary = false WHERE client_id = $1) " : ''}
     INSERT INTO client_contacts (
       client_id, org_id, name, relationship, email, phone, organization_name, notes, access_level, is_primary
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      clientId,
      profile.org_id,
      contact.name,
      contact.relationship,
      contact.email || null,
      contact.phone || null,
      contact.organization_name || null,
      contact.notes || null,
      contact.access_level,
      contact.is_primary,
    ]
  )

  return c.json({ data: result.rows[0] }, 201)
})

app.patch('/:id', async (c) => {
  const profile = c.get('profile')
  if (!hasClinicalManagerRole(profile)) {
    return c.json({ error: 'Only BCBA and admin roles can manage contacts.' }, 403)
  }

  const contactId = c.req.param('id')
  const existing = await getContact(c.env, contactId)
  if (!existing) return c.json({ error: 'Contact not found.' }, 404)
  if (!await canAccessClient(c.env, profile, existing.client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const body = await c.req.json()
  const contact = normalizeContactPayload({ ...existing, ...body })
  const validationError = validateContactPayload(contact)
  if (validationError) return c.json({ error: validationError }, 400)

  const result = await query(c.env,
    `${contact.is_primary
      ? "WITH cleared AS (UPDATE client_contacts SET is_primary = false WHERE client_id = $1 AND id <> $2) "
      : ''}
     UPDATE client_contacts
     SET
       name = $3,
       relationship = $4,
       email = $5,
       phone = $6,
       organization_name = $7,
       notes = $8,
       access_level = $9,
       is_primary = $10,
       updated_at = now()
     WHERE client_id = $1 AND id = $2
     RETURNING *`,
    [
      existing.client_id,
      contactId,
      contact.name,
      contact.relationship,
      contact.email || null,
      contact.phone || null,
      contact.organization_name || null,
      contact.notes || null,
      contact.access_level,
      contact.is_primary,
    ]
  )

  return c.json({ data: result.rows[0] })
})

app.post('/:id/primary', async (c) => {
  const profile = c.get('profile')
  if (!hasClinicalManagerRole(profile)) {
    return c.json({ error: 'Only BCBA and admin roles can manage contacts.' }, 403)
  }

  const contactId = c.req.param('id')
  const existing = await getContact(c.env, contactId)
  if (!existing) return c.json({ error: 'Contact not found.' }, 404)
  if (!await canAccessClient(c.env, profile, existing.client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const result = await query(c.env,
    `WITH cleared AS (
       UPDATE client_contacts
       SET is_primary = false
       WHERE client_id = $1 AND id <> $2
     )
     UPDATE client_contacts
     SET is_primary = true, updated_at = now()
     WHERE client_id = $1 AND id = $2
     RETURNING *`,
    [existing.client_id, contactId]
  )

  return c.json({ data: result.rows[0] })
})

app.delete('/:id', async (c) => {
  const profile = c.get('profile')
  if (!hasClinicalManagerRole(profile)) {
    return c.json({ error: 'Only BCBA and admin roles can manage contacts.' }, 403)
  }

  const contactId = c.req.param('id')
  const existing = await getContact(c.env, contactId)
  if (!existing) return c.json({ error: 'Contact not found.' }, 404)
  if (!await canAccessClient(c.env, profile, existing.client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  await query(c.env, 'DELETE FROM client_contacts WHERE id = $1', [contactId])

  if (existing.is_primary) {
    const replacementId = await findReplacementPrimary(c.env, existing.client_id)
    if (replacementId) {
      await query(c.env,
        'UPDATE client_contacts SET is_primary = true, updated_at = now() WHERE id = $1',
        [replacementId]
      )
    }
  }

  return c.json({ success: true })
})

export default app
