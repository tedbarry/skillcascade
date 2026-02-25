import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'

const DOMAIN_COLORS = {
  d1: '#e07b6e', d2: '#d4956a', d3: '#c9a84c', d4: '#8fb570',
  d5: '#5da87a', d6: '#4a9e9e', d7: '#6889b5', d8: '#8b7bb5', d9: '#a86e9a',
}

const LEVERAGE_COLOR = '#6b5ce7'

/**
 * RankedDomainRow — Single row in the intervention planner ranked list.
 *
 * Props:
 *   rank           — 1-based rank number
 *   node           — domain node from useCascadeGraph
 *   ranking        — { leverageScore, downstreamDomains, downstreamSkills }
 *   maxLeverage    — max leverage score for normalizing bars
 *   isRecommended  — boolean (gold treatment for #1)
 *   isSelected     — boolean (currently selected for what-if)
 *   isIndependent  — boolean (D8/D9)
 *   onClick        — () => void
 *   isCompact      — boolean (phone)
 *   delta          — { healthDelta, newState } from what-if simulation (optional)
 */
export default memo(function RankedDomainRow({
  rank,
  node,
  ranking,
  maxLeverage = 1,
  isRecommended = false,
  isSelected = false,
  isIndependent = false,
  onClick,
  isCompact = false,
  delta = null,
}) {
  const color = DOMAIN_COLORS[node.id] || '#888'
  const healthPct = node.healthPct || 0
  const leveragePct = ranking ? (ranking.leverageScore / Math.max(1, maxLeverage)) : 0

  return (
    <motion.button
      layout
      onClick={onClick}
      className={`w-full text-left rounded-lg transition-all min-h-[44px] ${
        isSelected
          ? 'ring-1 ring-white/15 shadow-lg'
          : 'hover:bg-[#1a1a24]'
      }`}
      style={{
        backgroundColor: isRecommended ? '#1c1a28' : isSelected ? '#1a1a24' : '#16161e',
        borderLeft: isRecommended ? '4px solid #ffd700' : isSelected ? `4px solid ${color}` : '4px solid transparent',
      }}
    >
      <div className={`${isCompact ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
        {/* Top row: rank + name + score */}
        <div className="flex items-center gap-3">
          {/* Rank */}
          <span
            className={`text-lg font-bold font-mono w-7 shrink-0 ${isRecommended ? '' : 'text-gray-600'}`}
            style={isRecommended ? { color: '#ffd700' } : undefined}
          >
            {isIndependent ? '—' : rank}
          </span>

          {/* Domain color dot */}
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />

          {/* Name */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-200 truncate">{node.name}</span>
              {isRecommended && (
                <span className="text-[9px] font-bold tracking-wider text-[#ffd700] bg-[#ffd700]/10 px-2 py-0.5 rounded-full shrink-0">
                  RECOMMENDED
                </span>
              )}
              {delta && Math.abs(delta.healthDelta) > 0.01 && (
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                  delta.healthDelta > 0
                    ? 'text-green-400 bg-green-900/30'
                    : 'text-red-400 bg-red-900/30'
                }`}>
                  {delta.healthDelta > 0 ? '+' : ''}{delta.healthDelta.toFixed(1)}
                </span>
              )}
              {delta?.unblocked && (
                <span className="text-[10px] font-bold text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded shrink-0">
                  Unblocks!
                </span>
              )}
            </div>
          </div>

          {/* Score */}
          <span className="text-sm font-mono text-gray-400 shrink-0">
            {node.assessed > 0 ? `${node.avg.toFixed(1)}/3` : '—'}
          </span>
        </div>

        {/* Bars section */}
        <div className={`${isCompact ? 'mt-2' : 'mt-2.5'} space-y-1.5 ml-10`}>
          {/* Health bar */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-gray-600 w-12 shrink-0">Health</span>
            <div className="flex-1 h-2 bg-[#2a2a33] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(1, healthPct * 100)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Leverage bar (not for independents) */}
          {!isIndependent && ranking && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-gray-600 w-12 shrink-0">Leverage</span>
              <div className="flex-1 h-1.5 bg-[#2a2a33] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: LEVERAGE_COLOR }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(1, leveragePct * 100)}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                />
              </div>
            </div>
          )}

          {/* Stats line */}
          {!isCompact && !isIndependent && ranking && (
            <div className="text-[10px] text-gray-600">
              Affects {ranking.downstreamDomains} domain{ranking.downstreamDomains !== 1 ? 's' : ''}, {ranking.downstreamSkills} skills downstream
            </div>
          )}
          {!isCompact && isIndependent && (
            <div className="text-[10px] text-gray-600">
              Independent — no downstream dependencies
            </div>
          )}
        </div>
      </div>
    </motion.button>
  )
})
