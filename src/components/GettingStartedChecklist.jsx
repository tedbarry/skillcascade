import { memo, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { safeGetItem, safeSetItem } from '../lib/safeStorage.js'

const DISMISSED_KEY = 'skillcascade_checklist_dismissed'

/**
 * GettingStartedChecklist — Collapsible onboarding progress card.
 * 5 milestones, professional tone, no gamification.
 *
 * Props:
 *   hasClient           — boolean (real client selected)
 *   assessedCount       — number (skills assessed on real client)
 *   viewsVisited        — Set<string> (view keys visited)
 *   reportsVisited      — boolean
 *   snapshotCount       — number (real client snapshots)
 *   onNavigate          — (viewKey) => void
 */
export default memo(function GettingStartedChecklist({
  hasClient = false,
  assessedCount = 0,
  viewsVisited = new Set(),
  reportsVisited = false,
  snapshotCount = 0,
  onNavigate,
}) {
  const [dismissed, setDismissed] = useState(() => safeGetItem(DISMISSED_KEY) === 'true')
  const [collapsed, setCollapsed] = useState(false)

  const milestones = useMemo(() => [
    {
      id: 'explore',
      label: 'Explore sample data',
      description: 'Visit 2+ views to see what SkillCascade can do',
      done: viewsVisited.size >= 2,
      action: null, // no specific action
    },
    {
      id: 'client',
      label: 'Create your first client',
      description: 'Set up a real learner profile',
      done: hasClient,
      action: () => onNavigate?.('clients'),
    },
    {
      id: 'assess',
      label: 'Rate 10 skills with Start Here',
      description: 'Even a few ratings unlock cascade insights',
      done: hasClient && assessedCount >= 10,
      action: () => onNavigate?.('quick-assess'),
    },
    {
      id: 'report',
      label: 'View your first report',
      description: 'See how assessment data becomes clinical reports',
      done: reportsVisited && hasClient,
      action: () => onNavigate?.('reports'),
    },
    {
      id: 'snapshot',
      label: 'Save a snapshot',
      description: 'Capture a baseline to track progress over time',
      done: snapshotCount > 0,
      action: null,
    },
  ], [viewsVisited, hasClient, assessedCount, reportsVisited, snapshotCount, onNavigate])

  const completedCount = milestones.filter(m => m.done).length
  const allDone = completedCount === milestones.length
  const progressPct = (completedCount / milestones.length) * 100

  if (dismissed) return null
  // Auto-hide when all done
  if (allDone) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 bg-white border border-warm-200 rounded-xl overflow-hidden shadow-sm"
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-3 min-h-[44px] hover:bg-warm-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-warm-800">Getting Started</div>
          <div className="text-xs text-warm-500">{completedCount}/{milestones.length}</div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); setDismissed(true); safeSetItem(DISMISSED_KEY, 'true') }}
            className="text-[10px] text-warm-400 hover:text-warm-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            Hide
          </button>
          <svg
            className={`w-4 h-4 text-warm-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Progress bar */}
      <div className="px-4 pb-1">
        <div className="h-1.5 bg-warm-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-sage-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Milestones */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-2 space-y-1.5">
              {milestones.map(m => (
                <div key={m.id} className="flex items-center gap-3 py-1.5">
                  {/* Checkmark */}
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    m.done ? 'bg-sage-500 text-white' : 'border-2 border-warm-200'
                  }`}>
                    {m.done && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm ${m.done ? 'text-warm-400 line-through' : 'text-warm-700'}`}>
                      {m.label}
                    </div>
                    {!m.done && (
                      <div className="text-[11px] text-warm-400">{m.description}</div>
                    )}
                  </div>
                  {/* Go button */}
                  {!m.done && m.action && (
                    <button
                      onClick={m.action}
                      className="text-xs font-medium text-sage-600 hover:text-sage-700 bg-sage-50 hover:bg-sage-100 rounded px-3 py-1.5 min-h-[44px] flex items-center transition-colors shrink-0"
                    >
                      Go
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})
