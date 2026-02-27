/**
 * Error categorization utility — classifies errors into actionable user messages.
 *
 * Usage:
 *   import { userErrorMessage } from '../lib/errorUtils.js'
 *   catch (err) {
 *     showToast(userErrorMessage(err, 'load assessments'), 'error')
 *   }
 */

const NETWORK_PATTERNS = /network|fetch|failed to fetch|load failed|networkerror|econnrefused|timeout|abort|dns/i
const AUTH_PATTERNS = /unauthorized|forbidden|401|403|jwt|token|session.*expired|not authenticated/i
const QUOTA_PATTERNS = /quota|storage|limit|too large|payload|413|507/i
const NOT_FOUND_PATTERNS = /not found|404|does not exist|no rows/i
const CONFLICT_PATTERNS = /conflict|409|duplicate|already exists|unique/i
const RATE_LIMIT_PATTERNS = /rate limit|429|too many requests|throttle/i

/**
 * Categorize an error and return a user-friendly message with optional retry hint.
 *
 * @param {Error|string} error    — caught error
 * @param {string}       context  — what was being attempted, e.g. "save assessment"
 * @returns {{ category: string, message: string, retry: boolean }}
 */
export function categorizeError(error, context = '') {
  const msg = (error?.message || String(error)).toLowerCase()

  if (NETWORK_PATTERNS.test(msg)) {
    return {
      category: 'network',
      message: `Could not reach the server — check your connection and try again`,
      retry: true,
    }
  }

  if (AUTH_PATTERNS.test(msg)) {
    return {
      category: 'auth',
      message: `Your session may have expired — try signing in again`,
      retry: false,
    }
  }

  if (RATE_LIMIT_PATTERNS.test(msg)) {
    return {
      category: 'rate-limit',
      message: `Too many requests — wait a moment and try again`,
      retry: true,
    }
  }

  if (QUOTA_PATTERNS.test(msg)) {
    return {
      category: 'quota',
      message: `Storage limit reached — try removing old data first`,
      retry: false,
    }
  }

  if (NOT_FOUND_PATTERNS.test(msg)) {
    return {
      category: 'not-found',
      message: context ? `Could not find the requested ${context}` : `The requested resource was not found`,
      retry: false,
    }
  }

  if (CONFLICT_PATTERNS.test(msg)) {
    return {
      category: 'conflict',
      message: `A conflict occurred — the data may have been updated by someone else`,
      retry: true,
    }
  }

  // Default: include context for specificity
  return {
    category: 'unknown',
    message: context ? `Failed to ${context} — please try again` : `Something went wrong — please try again`,
    retry: true,
  }
}

/**
 * Shorthand — returns just the user-facing message string.
 */
export function userErrorMessage(error, context = '') {
  return categorizeError(error, context).message
}
