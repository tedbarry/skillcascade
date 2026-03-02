import { useSearchParams } from 'react-router-dom'
import { useCallback, useMemo } from 'react'

const VIEW_PARAM = 'v'

// Params owned by specific views — cleared when switching views
const VIEW_OWNED_PARAMS = ['i', 'tab', 'l', 'd', 'sa']

/**
 * URL-driven view navigation with browser history support.
 *
 * - navigateTo(view, params) → pushState (creates history entry, back-able)
 * - updateParams(params)     → replaceState (persists position, no history entry)
 *
 * URL format: /dashboard?v=assess&i=12
 */
export default function useViewNavigation(defaultView, validViews) {
  const [searchParams, setSearchParams] = useSearchParams()

  const activeView = useMemo(() => {
    const v = searchParams.get(VIEW_PARAM)
    return v && validViews.includes(v) ? v : defaultView
  }, [searchParams, defaultView, validViews])

  // Read all view-specific params as a plain object
  const viewParams = useMemo(() => {
    const params = {}
    for (const key of VIEW_OWNED_PARAMS) {
      const val = searchParams.get(key)
      if (val !== null) params[key] = val
    }
    return params
  }, [searchParams])

  // Navigate to a new view — pushState creates browser history entry
  const navigateTo = useCallback((view, params = {}) => {
    setSearchParams(() => {
      const next = new URLSearchParams()
      next.set(VIEW_PARAM, view)
      for (const [k, v] of Object.entries(params)) {
        if (v != null && v !== '') next.set(k, String(v))
      }
      return next
    }, { replace: false })
  }, [setSearchParams])

  // Update params within current view — replaceState, no history entry
  const updateParams = useCallback((params) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(params)) {
        if (v == null || v === '') next.delete(k)
        else next.set(k, String(v))
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  return { activeView, viewParams, navigateTo, updateParams }
}
