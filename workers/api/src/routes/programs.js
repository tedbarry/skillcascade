import { Hono } from 'hono'
import { query, queryWithUser } from '../db.js'
import { canAccessClient } from '../middleware/access.js'

const app = new Hono()

// ═══════════════════════════════════════════════════════════════
// CLIENT PROGRAMS
// ═══════════════════════════════════════════════════════════════

// GET /api/programs?client_id=xxx — list programs for a client
app.get('/', async (c) => {
  const profile = c.get('profile')
  const clientId = c.req.query('client_id')

  if (!clientId) return c.json({ error: 'client_id required' }, 400)
  if (!await canAccessClient(c.env, profile, clientId)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const result = await query(c.env,
    "SELECT * FROM client_programs WHERE client_id = $1 ORDER BY display_order, created_at",
    [clientId]
  )
  return c.json({ data: result.rows })
})

// GET /api/programs/:id — single program with targets
app.get('/:id', async (c) => {
  const profile = c.get('profile')
  const programId = c.req.param('id')

  const result = await query(c.env,
    "SELECT * FROM client_programs WHERE id = $1", [programId]
  )
  if (result.rows.length === 0) return c.json({ error: 'Not found' }, 404)

  const program = result.rows[0]
  if (!await canAccessClient(c.env, profile, program.client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  // Include targets
  const targets = await query(c.env,
    "SELECT * FROM client_targets WHERE program_id = $1 ORDER BY display_order, created_at",
    [programId]
  )

  return c.json({ data: { ...program, targets: targets.rows } })
})

// POST /api/programs — create program
app.post('/', async (c) => {
  const profile = c.get('profile')
  const body = await c.req.json()

  if (!body.client_id) return c.json({ error: 'client_id required' }, 400)
  if (!await canAccessClient(c.env, profile, body.client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const result = await queryWithUser(c.env, profile.id,
    `INSERT INTO client_programs (
      client_id, stg_id, domain, ltg_name, stg_name, name, objective, criteria,
      measurement_type, goal_type, skill_mappings, status, baseline, baseline_date,
      display_order, program_type, data_method, phase_criteria, min_trials, max_trials,
      mastery_window, mastery_criteria_text, ltg_mastery_criteria, maintenance_frequency,
      library_target_id, canonical_domain_slug, canonical_deficit_slug, source_type, source_label,
      medical_necessity_tags, medical_necessity_rationale, verification_summary, verification_sources,
      provenance_status, adaptation_reason, canonical_snapshot, created_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14,
      $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25,
      $26, $27, $28, $29, $30,
      $31, $32, $33, $34, $35, $36, $37
    ) RETURNING *`,
    [
      body.client_id, body.stg_id || null, body.domain || '', body.ltg_name || null,
      body.stg_name || null, body.name, body.objective || null, body.criteria || null,
      body.measurement_type || 'percentage', body.goal_type || 'increase',
      body.skill_mappings || null, body.status || 'acquisition',
      body.baseline || null, body.baseline_date || null,
      body.display_order || 0, body.program_type || 'skill_acquisition',
      body.data_method || 'trial', body.phase_criteria ? JSON.stringify(body.phase_criteria) : '{}',
      body.min_trials || null, body.max_trials || null,
      body.mastery_window || 3, body.mastery_criteria_text || null,
      body.ltg_mastery_criteria || null, body.maintenance_frequency || null,
      body.library_target_id || null, body.canonical_domain_slug || null,
      body.canonical_deficit_slug || null, body.source_type || null, body.source_label || null,
      body.medical_necessity_tags ? JSON.stringify(body.medical_necessity_tags) : '[]',
      body.medical_necessity_rationale || null, body.verification_summary || null,
      body.verification_sources ? JSON.stringify(body.verification_sources) : '[]',
      body.provenance_status || (body.library_target_id ? 'canonical' : 'custom'),
      body.adaptation_reason || null,
      body.canonical_snapshot ? JSON.stringify(body.canonical_snapshot) : null,
      profile.id,
    ]
  )
  return c.json({ data: result.rows[0] }, 201)
})

// PATCH /api/programs/:id — update program
app.patch('/:id', async (c) => {
  const profile = c.get('profile')
  const programId = c.req.param('id')

  // Verify access via client
  const existing = await query(c.env, "SELECT client_id FROM client_programs WHERE id = $1", [programId])
  if (existing.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  if (!await canAccessClient(c.env, profile, existing.rows[0].client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const body = await c.req.json()
  const allowed = [
    'domain', 'ltg_name', 'stg_name', 'name', 'objective', 'criteria',
    'measurement_type', 'goal_type', 'skill_mappings', 'status', 'baseline',
    'baseline_date', 'mastered_at', 'display_order', 'program_type', 'data_method',
    'phase_criteria', 'min_trials', 'max_trials', 'mastery_window',
    'mastery_criteria_text', 'ltg_mastery_criteria', 'maintenance_frequency',
    'phase_changed_at', 'session_count', 'provenance_status', 'adaptation_reason',
    'canonical_snapshot',
  ]
  const updates = []
  const values = []
  let i = 1

  for (const [key, val] of Object.entries(body)) {
    if (allowed.includes(key)) {
      updates.push(`${key} = $${i}`)
      values.push((key === 'phase_criteria' || key === 'canonical_snapshot') && typeof val === 'object' ? JSON.stringify(val) : val)
      i++
    }
  }

  if (updates.length === 0) return c.json({ error: 'No valid fields' }, 400)

  values.push(programId)
  const result = await query(c.env,
    `UPDATE client_programs SET ${updates.join(', ')}, updated_at = now() WHERE id = $${i} RETURNING *`,
    values
  )
  return c.json({ data: result.rows[0] })
})

// DELETE /api/programs/:id — hard delete (cascades to targets, session_data)
app.delete('/:id', async (c) => {
  const profile = c.get('profile')
  const programId = c.req.param('id')

  const existing = await query(c.env, "SELECT client_id FROM client_programs WHERE id = $1", [programId])
  if (existing.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  if (!await canAccessClient(c.env, profile, existing.rows[0].client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  await query(c.env, "DELETE FROM client_programs WHERE id = $1", [programId])
  return c.json({ success: true })
})

// ═══════════════════════════════════════════════════════════════
// CLIENT TARGETS (nested under programs)
// ═══════════════════════════════════════════════════════════════

// GET /api/programs/:id/targets — list targets for a program
app.get('/:id/targets', async (c) => {
  const profile = c.get('profile')
  const programId = c.req.param('id')

  const existing = await query(c.env, "SELECT client_id FROM client_programs WHERE id = $1", [programId])
  if (existing.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  if (!await canAccessClient(c.env, profile, existing.rows[0].client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const result = await query(c.env,
    "SELECT * FROM client_targets WHERE program_id = $1 ORDER BY display_order, created_at",
    [programId]
  )
  return c.json({ data: result.rows })
})

// POST /api/programs/:id/targets — create target
app.post('/:id/targets', async (c) => {
  const profile = c.get('profile')
  const programId = c.req.param('id')

  const existing = await query(c.env, "SELECT client_id FROM client_programs WHERE id = $1", [programId])
  if (existing.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  if (!await canAccessClient(c.env, profile, existing.rows[0].client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const body = await c.req.json()
  const result = await query(c.env,
    `INSERT INTO client_targets (program_id, name, status, display_order)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [programId, body.name, body.status || 'acquisition', body.display_order || 0]
  )
  return c.json({ data: result.rows[0] }, 201)
})

// PATCH /api/programs/:programId/targets/:targetId — update target
app.patch('/:programId/targets/:targetId', async (c) => {
  const profile = c.get('profile')
  const programId = c.req.param('programId')
  const targetId = c.req.param('targetId')

  const existing = await query(c.env, "SELECT client_id FROM client_programs WHERE id = $1", [programId])
  if (existing.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  if (!await canAccessClient(c.env, profile, existing.rows[0].client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const body = await c.req.json()
  const allowed = ['name', 'status', 'mastered_at', 'display_order']
  const updates = []
  const values = []
  let i = 1

  for (const [key, val] of Object.entries(body)) {
    if (allowed.includes(key)) {
      updates.push(`${key} = $${i}`)
      values.push(val)
      i++
    }
  }

  if (updates.length === 0) return c.json({ error: 'No valid fields' }, 400)

  values.push(targetId, programId)
  const result = await query(c.env,
    `UPDATE client_targets SET ${updates.join(', ')} WHERE id = $${i} AND program_id = $${i + 1} RETURNING *`,
    values
  )
  if (result.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  return c.json({ data: result.rows[0] })
})

// DELETE /api/programs/:programId/targets/:targetId
app.delete('/:programId/targets/:targetId', async (c) => {
  const profile = c.get('profile')
  const programId = c.req.param('programId')
  const targetId = c.req.param('targetId')

  const existing = await query(c.env, "SELECT client_id FROM client_programs WHERE id = $1", [programId])
  if (existing.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  if (!await canAccessClient(c.env, profile, existing.rows[0].client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  await query(c.env,
    "DELETE FROM client_targets WHERE id = $1 AND program_id = $2",
    [targetId, programId]
  )
  return c.json({ success: true })
})

export default app
