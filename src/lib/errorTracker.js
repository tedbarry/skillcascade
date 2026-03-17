/**
 * Error tracking utility.
 * Writes errors to usage_events via the existing track() function.
 * Rate limited to max 10 errors per session to prevent spam.
 */

import { track } from './analytics.js'

let errorCount = 0
const MAX_ERRORS_PER_SESSION = 10

/**
 * Track an error event.
 * @param {Error|string} error - The error object or message
 * @param {object} [context] - Additional context (component name, action, etc.)
 */
export function trackError(error, context = {}) {
  if (errorCount >= MAX_ERRORS_PER_SESSION) return
  errorCount++

  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack?.slice(0, 500) : undefined

  track('error', message, {
    stack,
    url: window.location.href,
    userAgent: navigator.userAgent.slice(0, 255),
    ...context,
  })
}
