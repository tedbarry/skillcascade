import { memo } from 'react'
import { motion } from 'framer-motion'

const DOMAIN_COLORS = {
  d1: '#e07b6e', d2: '#d4956a', d3: '#c9a84c', d4: '#8fb570',
  d5: '#5da87a', d6: '#4a9e9e', d7: '#6889b5', d8: '#8b7bb5', d9: '#a86e9a',
}

/**
 * ProgressBar — Vertical progress column for a single domain.
 * Light-theme friendly. Used by ProgressStoryView.
 *
 * Props:
 *   domainId     — e.g. 'd3'
 *   name         — plain-language domain name
 *   healthPct    — 0 to 1
 *   statusLabel  — "Strong", "Growing", "Getting Started", "Not Yet Started"
 *   assessed     — number of assessed skills
 *   total        — total skills
 *   delta        — +/- change from baseline (optional)
 *   onClick      — () => void
 *   animate      — boolean (default true)
 */
export default memo(function ProgressBar({
  domainId,
  name,
  healthPct = 0,
  statusLabel = '',
  assessed = 0,
  total = 0,
  delta = null,
  onClick,
  animate = true,
}) {
  const color = DOMAIN_COLORS[domainId] || '#888'
  const heightPct = Math.max(2, healthPct * 100)

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 px-2 py-3 rounded-xl hover:bg-gray-100/60 transition-colors min-w-[80px] max-w-[120px] flex-1 min-h-[44px]"
    >
      {/* Bar container */}
      <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden relative flex items-end">
        <motion.div
          className="w-full rounded-lg"
          style={{ backgroundColor: color }}
          initial={animate ? { height: 0 } : { height: `${heightPct}%` }}
          animate={{ height: `${heightPct}%` }}
          transition={animate ? { duration: 0.8, ease: 'easeOut', delay: 0.1 } : { duration: 0 }}
        />
        {/* Delta overlay */}
        {delta !== null && Math.abs(delta) > 0.05 && (
          <div className={`absolute top-1 right-1 text-[10px] font-bold px-1 rounded ${
            delta > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {delta > 0 ? '+' : ''}{(delta * 100).toFixed(0)}%
          </div>
        )}
      </div>

      {/* Status label */}
      <div className="text-center">
        <div className="text-[11px] font-semibold text-gray-800 leading-tight">{name}</div>
        <div className="text-[10px] mt-0.5" style={{ color }}>
          {statusLabel}
        </div>
        <div className="text-[9px] text-gray-400 mt-0.5">
          {assessed > 0 ? `${Math.round(healthPct * 100)}% of skills` : 'Not started'}
        </div>
      </div>
    </button>
  )
})
