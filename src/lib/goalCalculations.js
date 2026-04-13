/**
 * Goal Calculations — auto-compute current level and baseline from session data.
 *
 * Current Level = average of last N session data points (configurable, default 5)
 * Baseline = average of first data points collected (auto-set once, locked after)
 */

import { api } from './api.js'

/**
 * Calculate the current level for a program from its session data.
 *
 * @param {string} programId
 * @param {string} dataMethod - 'trial' | 'frequency' | 'duration' | 'rating' | 'percentage'
 * @param {number} window - number of recent sessions to average (default 5)
 * @returns {{ value: number, formatted: string, dataPoints: number }}
 */
export async function calculateCurrentLevel(programId, dataMethod, window = 5) {
  const { data: sessions } = await api
    .from('session_data')
    .select('percentage, frequency_count, duration_seconds, rating_value, total_trials, correct_count, created_at')
    .eq('program_id', programId)
    .order('created_at', { ascending: false })
    .limit(window)

  if (!sessions || sessions.length === 0) {
    return { value: null, formatted: 'No data', dataPoints: 0 }
  }

  let values = []

  switch (dataMethod) {
    case 'trial':
    case 'percentage':
      values = sessions
        .filter(s => s.percentage != null)
        .map(s => s.percentage)
      break
    case 'frequency':
      values = sessions
        .filter(s => s.frequency_count != null)
        .map(s => s.frequency_count)
      break
    case 'duration':
      values = sessions
        .filter(s => s.duration_seconds != null)
        .map(s => s.duration_seconds)
      break
    case 'rating':
      values = sessions
        .filter(s => s.rating_value != null)
        .map(s => s.rating_value)
      break
    default:
      values = sessions
        .filter(s => s.percentage != null)
        .map(s => s.percentage)
  }

  if (values.length === 0) {
    return { value: null, formatted: 'No data', dataPoints: 0 }
  }

  const avg = values.reduce((sum, v) => sum + v, 0) / values.length

  let formatted
  switch (dataMethod) {
    case 'trial':
    case 'percentage':
      formatted = `${Math.round(avg)}%`
      break
    case 'frequency':
      formatted = `${avg.toFixed(1)} per session`
      break
    case 'duration':
      formatted = avg >= 60 ? `${(avg / 60).toFixed(1)} min` : `${Math.round(avg)}s`
      break
    case 'rating':
      formatted = `${avg.toFixed(1)} rating`
      break
    default:
      formatted = `${Math.round(avg)}%`
  }

  return { value: Math.round(avg * 100) / 100, formatted, dataPoints: values.length }
}

/**
 * Auto-set baseline from the first session data points.
 * Only sets baseline if it hasn't been set yet (baseline_auto = false or baseline is empty).
 *
 * @param {string} programId
 * @param {string} dataMethod
 * @param {object} program - the current program record
 * @returns {{ baseline: string, updated: boolean }}
 */
export async function autoSetBaseline(programId, dataMethod, program) {
  // Don't overwrite manually-set baselines
  if (program.baseline && program.baseline !== '0%' && program.baseline !== '' && program.baseline_auto !== true) {
    return { baseline: program.baseline, updated: false }
  }

  const { data: sessions } = await api
    .from('session_data')
    .select('percentage, frequency_count, duration_seconds, rating_value, created_at')
    .eq('program_id', programId)
    .order('created_at', { ascending: true })
    .limit(3) // First 3 data points for baseline

  if (!sessions || sessions.length === 0) {
    return { baseline: program.baseline || '0%', updated: false }
  }

  let values = []
  switch (dataMethod) {
    case 'trial':
    case 'percentage':
      values = sessions.filter(s => s.percentage != null).map(s => s.percentage)
      break
    case 'frequency':
      values = sessions.filter(s => s.frequency_count != null).map(s => s.frequency_count)
      break
    case 'duration':
      values = sessions.filter(s => s.duration_seconds != null).map(s => s.duration_seconds)
      break
    case 'rating':
      values = sessions.filter(s => s.rating_value != null).map(s => s.rating_value)
      break
  }

  if (values.length === 0) return { baseline: program.baseline || '0%', updated: false }

  const avg = values.reduce((sum, v) => sum + v, 0) / values.length
  let baseline

  switch (dataMethod) {
    case 'trial':
    case 'percentage':
      baseline = `${Math.round(avg)}%`
      break
    case 'frequency':
      baseline = `${avg.toFixed(1)} per session`
      break
    case 'duration':
      baseline = avg >= 60 ? `${(avg / 60).toFixed(1)} min` : `${Math.round(avg)}s`
      break
    case 'rating':
      baseline = `${avg.toFixed(1)}/5 rating`
      break
    default:
      baseline = `${Math.round(avg)}%`
  }

  // Save to DB
  await api.from('client_programs').update({
    baseline,
    baseline_auto: true,
    baseline_date: sessions[0].created_at,
  }).eq('id', programId)

  return { baseline, updated: true }
}
