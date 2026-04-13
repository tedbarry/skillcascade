/**
 * Phase Engine — evaluates auto-progression rules after session data is recorded.
 * Called after each session sync to check if any programs should change status.
 */
import { api } from './api.js'

// Default phase criteria templates by program type
export const DEFAULT_PHASE_CRITERIA = {
  skill_acquisition: {
    baseline: {
      rules: [
        { condition: '>=', value: 80, over: 3, unit: 'data_points', then: 'intervention' },
        { condition: '<', value: 80, over: 1, unit: 'data_points', then: 'intervention' }
      ]
    },
    intervention: {
      rules: [
        { condition: '>=', value: 80, over: 3, unit: 'consecutive_sessions', then: 'generalization' }
      ]
    },
    generalization: {
      rules: [
        { condition: '>=', value: 80, over: 3, unit: 'consecutive_sessions', then: 'maintenance' },
        { condition: '<', value: 80, over: 3, unit: 'data_points', then: 'intervention' },
        { condition: 'consecutive_errors', count: 3, then: 'intervention' }
      ]
    },
    maintenance: {
      display_every: 5,
      rules: [
        { condition: '>=', value: 80, over: 1, unit: 'data_points', then: 'mastered' },
        { condition: '<', value: 80, over: 2, unit: 'data_points', then: 'intervention' },
        { condition: 'consecutive_errors', count: 3, then: 'intervention' }
      ]
    }
  },
  behavior_reduction: {
    baseline: {
      rules: [
        { condition: '<=', value: 0, over: 3, unit: 'data_points', then: 'maintenance' },
        { condition: '>', value: 0, over: 1, unit: 'data_points', then: 'intervention' }
      ]
    },
    intervention: {
      rules: [
        { condition: '<=', value: 0, over: 14, unit: 'consecutive_sessions', then: 'mastered' }
      ]
    },
    maintenance: {
      display_every: 5,
      rules: [
        { condition: '<=', value: 0, over: 1, unit: 'data_points', then: 'mastered' },
        { condition: '>', value: 0, over: 1, unit: 'data_points', then: 'intervention' }
      ]
    }
  },
  // task_analysis, duration, parent use skill_acquisition defaults
}

// Get the criteria for a program (custom or default)
export function getPhaseCriteria(program) {
  const custom = program.phase_criteria
  if (custom && Object.keys(custom).length > 0) return custom
  return DEFAULT_PHASE_CRITERIA[program.program_type] || DEFAULT_PHASE_CRITERIA.skill_acquisition
}

// Evaluate rules for a program after new session data
// Returns { shouldChange: boolean, newStatus: string, reason: string } or null
export async function evaluatePhaseRules(programId) {
  // Load program
  const { data: program } = await api
    .from('client_programs')
    .select('*')
    .eq('id', programId)
    .single()

  if (!program) return null

  const criteria = getPhaseCriteria(program)
  const currentPhase = program.status
  const phaseRules = criteria[currentPhase]

  if (!phaseRules || !phaseRules.rules || phaseRules.rules.length === 0) return null

  // Load recent session data for this program
  const { data: sessionData } = await api
    .from('session_data')
    .select('percentage, frequency_count, duration_seconds, created_at')
    .eq('program_id', programId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!sessionData || sessionData.length === 0) return null

  const measurementType = program.measurement_type || 'percentage'

  // Get the relevant value from session data
  const getValue = (sd) => {
    if (measurementType === 'frequency') return sd.frequency_count || 0
    if (measurementType === 'duration') return sd.duration_seconds || 0
    return sd.percentage != null ? sd.percentage : null
  }

  const values = sessionData.map(getValue).filter(v => v != null)

  for (const rule of phaseRules.rules) {
    let matched = false
    let reason = ''

    if (rule.condition === 'consecutive_errors') {
      // Check for N consecutive sessions below threshold (or 0% for trial data)
      const count = rule.count || 3
      if (values.length >= count) {
        const consecutive = values.slice(0, count).every(v => v === 0 || v < 50)
        if (consecutive) {
          matched = true
          reason = `${count} consecutive low-performance sessions`
        }
      }
    } else {
      // Standard comparison: >=, <=, <, >
      const threshold = rule.value
      const windowSize = rule.over || 1

      if (values.length < windowSize) continue

      const window = values.slice(0, windowSize)
      const compare = (v) => {
        if (rule.condition === '>=') return v >= threshold
        if (rule.condition === '<=') return v <= threshold
        if (rule.condition === '>') return v > threshold
        if (rule.condition === '<') return v < threshold
        return false
      }

      if (rule.unit === 'consecutive_sessions' || rule.unit === 'days') {
        // ALL values in window must meet condition
        matched = window.every(compare)
        reason = `${rule.condition} ${threshold} over ${windowSize} consecutive ${rule.unit}`
      } else {
        // data_points — all in window meet condition
        matched = window.every(compare)
        reason = `${rule.condition} ${threshold} over ${windowSize} data points`
      }
    }

    if (matched) {
      return {
        shouldChange: true,
        newStatus: rule.then,
        reason: reason,
        rule: rule,
      }
    }
  }

  return { shouldChange: false }
}

// Apply a phase change — update program status and log it
export async function applyPhaseChange(programId, newStatus, reason, triggeredBy = 'system', sessionId = null) {
  // Get current status
  const { data: program } = await api
    .from('client_programs')
    .select('status')
    .eq('id', programId)
    .single()

  if (!program || program.status === newStatus) return

  // Update program status
  const updates = {
    status: newStatus,
    phase_changed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  if (newStatus === 'mastered') updates.mastered_at = new Date().toISOString()

  await api.from('client_programs').update(updates).eq('id', programId)

  // Log the phase change
  await api.from('program_phase_log').insert({
    program_id: programId,
    from_status: program.status,
    to_status: newStatus,
    reason: reason,
    triggered_by: triggeredBy,
    session_id: sessionId,
  })
}

// Check all programs for a client after a session
export async function evaluateAllPrograms(clientId, sessionId = null) {
  const { data: programs } = await api
    .from('client_programs')
    .select('id, status')
    .eq('client_id', clientId)
    .in('status', ['baseline', 'intervention', 'generalization', 'maintenance'])

  if (!programs) return []

  const changes = []
  for (const prog of programs) {
    const result = await evaluatePhaseRules(prog.id)
    if (result && result.shouldChange) {
      await applyPhaseChange(prog.id, result.newStatus, result.reason, 'system', sessionId)
      changes.push({ programId: prog.id, from: prog.status, to: result.newStatus, reason: result.reason })
    }
  }

  return changes
}

// Check if a maintenance program should appear in this session
export function shouldShowInSession(program, sessionCount) {
  if (!['baseline', 'intervention', 'generalization'].includes(program.status)) {
    if (program.status === 'maintenance') {
      const freq = program.maintenance_frequency || 5
      return (sessionCount % freq) === 0
    }
    return false // inactive, mastered, on_hold, archived don't show
  }
  return true
}

// Generate mastery criteria text from program data
export function generateMasteryCriteriaText(program) {
  const name = program.name || 'the target behavior'
  const type = program.program_type || 'skill_acquisition'
  const window = program.mastery_window || 3

  if (type === 'behavior_reduction') {
    return `${name} will be reduced to 0 instances per session across ${window * 4} consecutive sessions.`
  }
  return `The client will demonstrate ${name} with 80% accuracy across ${window} consecutive sessions.`
}
