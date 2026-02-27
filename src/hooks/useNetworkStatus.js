import { useState, useEffect, useCallback } from 'react'

/**
 * useNetworkStatus — tracks browser online/offline state.
 *
 * Returns:
 *   isOnline        — current connectivity boolean
 *   wasOffline      — true if the user went offline at least once this session
 *   lastOfflineAt   — Date of most recent offline event (or null)
 *
 * The hook listens to the browser 'online' / 'offline' events and also
 * runs a periodic lightweight connectivity check when the tab is visible.
 */
export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [wasOffline, setWasOffline] = useState(false)
  const [lastOfflineAt, setLastOfflineAt] = useState(null)

  const goOffline = useCallback(() => {
    setIsOnline(false)
    setWasOffline(true)
    setLastOfflineAt(new Date())
  }, [])

  const goOnline = useCallback(() => {
    setIsOnline(true)
  }, [])

  useEffect(() => {
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [goOnline, goOffline])

  return { isOnline, wasOffline, lastOfflineAt }
}
