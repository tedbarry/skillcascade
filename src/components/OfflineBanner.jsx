import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useNetworkStatus from '../hooks/useNetworkStatus.js'

/**
 * OfflineBanner — shows a slim fixed banner when the browser goes offline.
 * Displays a "Back online" confirmation for 3 seconds after reconnection.
 * Place at the top level of the app (inside ToastProvider, outside Routes).
 */
export default function OfflineBanner() {
  const { isOnline, wasOffline } = useNetworkStatus()
  const [showReconnected, setShowReconnected] = useState(false)

  // When we come back online after being offline, show confirmation briefly
  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true)
      const timer = setTimeout(() => setShowReconnected(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline])

  const showBanner = !isOnline || showReconnected

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="overflow-hidden print:hidden"
        >
          <div
            className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${
              isOnline
                ? 'bg-sage-50 text-sage-700 border-b border-sage-200'
                : 'bg-amber-50 text-amber-800 border-b border-amber-200'
            }`}
            role="alert"
            aria-live="assertive"
          >
            {isOnline ? (
              <>
                <svg className="w-4 h-4 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Back online
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                You're offline — changes won't be saved until you reconnect
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
