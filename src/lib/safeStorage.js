/**
 * Safe localStorage wrappers that handle private browsing, quota errors,
 * and disabled storage without throwing.
 */

export function safeGetItem(key, fallback = null) {
  try { return localStorage.getItem(key) ?? fallback } catch { return fallback }
}

export function safeSetItem(key, value) {
  try { localStorage.setItem(key, value) } catch { /* quota or private browsing */ }
}

export function safeRemoveItem(key) {
  try { localStorage.removeItem(key) } catch { /* private browsing */ }
}
