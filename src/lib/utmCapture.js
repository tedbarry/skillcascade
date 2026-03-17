/**
 * UTM / referral parameter capture.
 * Stores UTM params in localStorage on first visit so they persist through the signup flow.
 */

import { safeGetItem, safeSetItem } from './safeStorage.js'

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref']
const STORAGE_KEY = 'skillcascade_utm'

/**
 * Capture UTM params from the current URL and store them in localStorage.
 * Only stores on first visit (doesn't overwrite existing params).
 */
export function captureUtmParams() {
  // Don't overwrite if already captured
  if (safeGetItem(STORAGE_KEY)) return

  const params = new URLSearchParams(window.location.search)
  const utm = {}
  let hasAny = false

  for (const key of UTM_KEYS) {
    const value = params.get(key)
    if (value) {
      utm[key] = value
      hasAny = true
    }
  }

  if (hasAny) {
    safeSetItem(STORAGE_KEY, JSON.stringify(utm))
  }
}

/**
 * Get stored UTM params (or empty object if none).
 */
export function getStoredUtmParams() {
  try {
    const raw = safeGetItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}
