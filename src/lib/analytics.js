/**
 * Usage analytics — tracks feature usage to Supabase.
 * All tracking is privacy-safe: no PII, no client health data in event properties.
 * Events are buffered in memory and flushed in batches.
 */

import { supabase } from './supabase.js'

let sessionId = null
let userId = null
let orgId = null
let eventBuffer = []
let flushInterval = null
let sessionStartTime = null
let identified = false

const FLUSH_INTERVAL_MS = 30_000 // 30 seconds
const BUFFER_LIMIT = 20

function getDeviceType() {
  const w = window.innerWidth
  if (w < 640) return 'phone'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

/**
 * Initialize analytics session. Call once on app load.
 */
export function initAnalytics() {
  // Reuse session ID within the same tab
  const existing = sessionStorage.getItem('sc_session_id')
  if (existing) {
    sessionId = existing
  } else {
    sessionId = crypto.randomUUID()
    sessionStorage.setItem('sc_session_id', sessionId)
  }
  sessionStartTime = Date.now()

  // Periodic flush
  flushInterval = setInterval(flush, FLUSH_INTERVAL_MS)

  // Flush on tab hide or before unload
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
  window.addEventListener('beforeunload', flush)
}

/**
 * Identify the current user and create the session row.
 * Call after login when profile is available.
 */
export async function identify(user, traits = {}) {
  if (!sessionId || identified) return
  userId = user.id
  orgId = traits.org_id || null

  try {
    await supabase.from('usage_sessions').insert({
      id: sessionId,
      user_id: userId,
      org_id: orgId,
      role: traits.role || null,
      plan: traits.plan || 'free',
      started_at: new Date(sessionStartTime || Date.now()).toISOString(),
      device_type: getDeviceType(),
      screen_width: window.innerWidth,
      screen_height: window.innerHeight,
      user_agent: navigator.userAgent.slice(0, 255),
    })
    identified = true
  } catch {
    // Silently fail — analytics should never break the app
  }
}

/**
 * Track a usage event.
 * @param {string} eventType - Category: view_open, feature_use, onboarding, error, session
 * @param {string} eventName - Specific action: sunburst, export_pdf, tour_complete, etc.
 * @param {object} [metadata] - Extra context (never include PHI)
 */
export function track(eventType, eventName, metadata = {}) {
  if (!sessionId) return

  eventBuffer.push({
    session_id: sessionId,
    user_id: userId,
    org_id: orgId,
    event_type: eventType,
    event_name: eventName,
    metadata,
    created_at: new Date().toISOString(),
  })

  if (eventBuffer.length >= BUFFER_LIMIT) flush()
}

/**
 * Flush buffered events to Supabase.
 */
async function flush() {
  if (!identified || eventBuffer.length === 0) return

  const batch = eventBuffer.splice(0)

  try {
    await supabase.from('usage_events').insert(batch)

    // Update session duration (event_count derived from usage_events table)
    const elapsed = Math.round((Date.now() - (sessionStartTime || Date.now())) / 1000)
    await supabase
      .from('usage_sessions')
      .update({ duration_seconds: elapsed })
      .eq('id', sessionId)
  } catch {
    // Put events back on failure so they retry next flush
    eventBuffer.unshift(...batch)
  }
}

/**
 * End the current session. Call on logout.
 */
export async function endSession() {
  if (!sessionId || !identified) return

  // Final flush
  await flush()

  try {
    const elapsed = Math.round((Date.now() - (sessionStartTime || Date.now())) / 1000)
    await supabase
      .from('usage_sessions')
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds: elapsed,
      })
      .eq('id', sessionId)
  } catch {
    // Silently fail
  }

  // Cleanup
  if (flushInterval) clearInterval(flushInterval)
  sessionStorage.removeItem('sc_session_id')
  sessionId = null
  userId = null
  orgId = null
  eventBuffer = []
  identified = false
}

/**
 * Reset analytics state (backward compat with old PostHog API).
 */
export function reset() {
  endSession()
}
