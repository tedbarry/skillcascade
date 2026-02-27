import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Relative time formatting
function relativeTime(date) {
  const now = Date.now()
  const diff = now - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString()
}

// Group items by time period
function groupByTime(items) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const weekStart = todayStart - 6 * 86400000

  const groups = { Today: [], 'This Week': [], Earlier: [] }
  for (const item of items) {
    const ts = new Date(item.timestamp).getTime()
    if (ts >= todayStart) groups.Today.push(item)
    else if (ts >= weekStart) groups['This Week'].push(item)
    else groups.Earlier.push(item)
  }
  return groups
}

// Activity type icons
function ActivityIcon({ type }) {
  if (type === 'assessment') {
    return (
      <div className="w-7 h-7 rounded-full bg-sage-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    )
  }
  if (type === 'risk') {
    return (
      <div className="w-7 h-7 rounded-full bg-coral-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-coral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
    )
  }
  // snapshot
  return (
    <div className="w-7 h-7 rounded-full bg-warm-100 flex items-center justify-center flex-shrink-0">
      <svg className="w-3.5 h-3.5 text-warm-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
      </svg>
    </div>
  )
}

export default function NotificationBell({ assessments = {}, snapshots = [], risks = [], onNavigate }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  // Build activity items
  const items = useMemo(() => {
    const activities = []

    // Assessment activity — count of assessed skills
    const assessedCount = Object.keys(assessments).length
    if (assessedCount > 0) {
      activities.push({
        id: 'assessment-count',
        type: 'assessment',
        title: 'Assessment updated',
        description: `${assessedCount} skills assessed`,
        timestamp: new Date().toISOString(),
        navigateTo: 'assess',
      })
    }

    // Risks
    if (risks.length > 0) {
      activities.push({
        id: 'risks',
        type: 'risk',
        title: `${risks.length} risk${risks.length !== 1 ? 's' : ''} detected`,
        description: risks.length <= 3
          ? risks.map(r => r.label || r.subArea || r.domain || 'Unknown').join(', ')
          : `${risks.slice(0, 2).map(r => r.label || r.subArea || r.domain || 'Unknown').join(', ')} and ${risks.length - 2} more`,
        timestamp: new Date().toISOString(),
        navigateTo: 'cascade',
      })
    }

    // Recent snapshots (within 7 days)
    const sevenDaysAgo = Date.now() - 7 * 86400000
    const recentSnapshots = snapshots
      .filter(s => new Date(s.timestamp).getTime() > sevenDaysAgo)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    for (const snap of recentSnapshots) {
      activities.push({
        id: `snapshot-${snap.timestamp}`,
        type: 'snapshot',
        title: `Snapshot: ${snap.label || 'Untitled'}`,
        description: `Saved ${new Date(snap.timestamp).toLocaleDateString()}`,
        timestamp: snap.timestamp,
        navigateTo: 'timeline',
      })
    }

    return activities
  }, [assessments, snapshots, risks])

  const hasNotifications = items.length > 0
  const grouped = useMemo(() => groupByTime(items), [items])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('touchstart', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('touchstart', handleClick)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  const toggle = useCallback(() => setOpen(prev => !prev), [])

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell button */}
      <button
        onClick={toggle}
        onTouchStart={toggle}
        className="relative p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-warm-500 hover:text-warm-700 hover:bg-warm-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
        aria-label={hasNotifications ? `Notifications (${items.length} new)` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {hasNotifications && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-coral-500 rounded-full" />
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full right-0 mt-1 w-72 bg-white rounded-xl shadow-lg border border-warm-200 z-50 overflow-hidden"
            role="menu"
          >
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-warm-100">
              <h3 className="text-xs font-semibold text-warm-700 uppercase tracking-wider">
                Activity
              </h3>
            </div>

            {/* Content */}
            <div className="max-h-[400px] overflow-y-auto">
              {!hasNotifications ? (
                <div className="px-4 py-8 text-center">
                  <svg className="w-8 h-8 mx-auto mb-2 text-warm-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-warm-500">All caught up!</p>
                  <p className="text-[10px] text-warm-400 mt-0.5">No recent activity</p>
                </div>
              ) : (
                Object.entries(grouped).map(([period, periodItems]) => {
                  if (periodItems.length === 0) return null
                  return (
                    <div key={period}>
                      <div className="px-4 py-1.5 bg-warm-50 border-b border-warm-100">
                        <span className="text-[10px] font-medium text-warm-500 uppercase tracking-wider">
                          {period}
                        </span>
                      </div>
                      {periodItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (onNavigate && item.navigateTo) {
                              onNavigate(item.navigateTo)
                              setOpen(false)
                            }
                          }}
                          className="w-full text-left px-4 py-2.5 flex items-start gap-2.5 hover:bg-warm-50 transition-colors border-b border-warm-50 last:border-b-0 cursor-pointer"
                          role="menuitem"
                        >
                          <ActivityIcon type={item.type} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-warm-800 leading-snug">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-warm-500 leading-snug mt-0.5 truncate">
                              {item.description}
                            </p>
                          </div>
                          <span className="text-[10px] text-warm-400 flex-shrink-0 mt-0.5">
                            {relativeTime(item.timestamp)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
