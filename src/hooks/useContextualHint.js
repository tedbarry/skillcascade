import { useState, useCallback } from 'react'
import { safeGetItem, safeSetItem } from '../lib/safeStorage.js'

const STORAGE_KEY = 'skillcascade_hints_seen'
const DISABLED_KEY = 'skillcascade_tips_disabled'

function getSeenHints() {
  try {
    return JSON.parse(safeGetItem(STORAGE_KEY, '[]'))
  } catch {
    return []
  }
}

function markSeen(hintId) {
  const seen = getSeenHints()
  if (!seen.includes(hintId)) {
    seen.push(hintId)
    safeSetItem(STORAGE_KEY, JSON.stringify(seen))
  }
}

/**
 * useContextualHint — show a first-visit contextual hint, dismiss permanently.
 * @param {string} hintId — unique identifier for this hint
 * @returns {{ show: boolean, dismiss: () => void }}
 */
export default function useContextualHint(hintId) {
  const [dismissed, setDismissed] = useState(() => {
    if (getTipsDisabled()) return true
    return getSeenHints().includes(hintId)
  })

  const dismiss = useCallback(() => {
    markSeen(hintId)
    setDismissed(true)
  }, [hintId])

  return { show: !dismissed, dismiss }
}

export function resetAllHints() {
  safeSetItem(STORAGE_KEY, '[]')
}

export function setTipsDisabled(disabled) {
  safeSetItem(DISABLED_KEY, disabled ? 'true' : 'false')
}

export function getTipsDisabled() {
  return safeGetItem(DISABLED_KEY) === 'true'
}
