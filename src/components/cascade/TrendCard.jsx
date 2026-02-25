import { memo } from 'react'
import { motion } from 'framer-motion'
import DomainSparkline from './DomainSparkline.jsx'

const DOMAIN_COLORS = {
  d1: '#e07b6e', d2: '#d4956a', d3: '#c9a84c', d4: '#8fb570',
  d5: '#5da87a', d6: '#4a9e9e', d7: '#6889b5', d8: '#8b7bb5', d9: '#a86e9a',
}

const STATE_CONFIG = {
  locked:       { label: 'Locked',     color: '#666' },
  blocked:      { label: 'Blocked',    color: '#8b4444' },
  'needs-work': { label: 'Needs Work', color: '#e8928a' },
  developing:   { label: 'Developing', color: '#e5b76a' },
  mastered:     { label: 'Mastered',   color: '#7fb589' },
}

/**
 * TrendCard — Domain card with large sparkline for the Risk Monitor grid.
 *
 * Props:
 *   node          — domain node from useCascadeGraph
 *   scores        — [number] score history across snapshots
 *   isHighlighted — boolean (risk-affected highlight)
 *   highlightColor — string (risk type color for border)
 *   isDimmed      — boolean
 *   onClick       — () => void
 *   isCompact     — boolean (phone: horizontal row)
 */
export default memo(function TrendCard({
  node,
  scores = [],
  isHighlighted = false,
  highlightColor = null,
  isDimmed = false,
  onClick,
  isCompact = false,
}) {
  const color = DOMAIN_COLORS[node.id] || '#888'
  const stateInfo = STATE_CONFIG[node.state] || STATE_CONFIG.locked
  const hasAssessment = node.assessed > 0

  // Phone: compact horizontal row
  if (isCompact) {
    return (
      <motion.button
        onClick={onClick}
        animate={{ opacity: isDimmed ? 0.35 : 1 }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors min-h-[44px] ${
          isHighlighted ? 'ring-1' : ''
        }`}
        style={{
          backgroundColor: isHighlighted ? '#1a1a24' : '#16161e',
          borderColor: isHighlighted ? highlightColor : 'transparent',
          ringColor: isHighlighted ? highlightColor : undefined,
        }}
      >
        <div
          className="w-2 h-8 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-200 truncate">{node.name}</div>
          <div className="text-[10px]" style={{ color: stateInfo.color }}>{stateInfo.label}</div>
        </div>
        <DomainSparkline
          scores={scores}
          width={80}
          height={24}
          color={color}
          large={false}
        />
        <span className="text-xs font-mono text-gray-400 w-10 text-right shrink-0">
          {hasAssessment ? node.avg.toFixed(1) : '—'}
        </span>
      </motion.button>
    )
  }

  // Desktop/Tablet: card with large sparkline
  return (
    <motion.button
      onClick={onClick}
      animate={{ opacity: isDimmed ? 0.35 : 1 }}
      whileHover={{ scale: 1.01 }}
      className={`text-left rounded-xl p-3 transition-all min-h-[44px] ${
        isHighlighted ? 'ring-1 shadow-lg' : ''
      }`}
      style={{
        backgroundColor: isHighlighted ? '#1a1a24' : '#16161e',
        borderLeft: `3px solid ${isHighlighted ? highlightColor || color : color}`,
        ringColor: isHighlighted ? highlightColor : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
            style={{ backgroundColor: color + '25', color }}
          >
            {node.domain}
          </div>
          <span className="text-xs font-medium text-gray-200">{node.name}</span>
        </div>
        <span className="text-xs font-mono text-gray-500">
          {hasAssessment ? `${node.avg.toFixed(1)}/3` : '—'}
        </span>
      </div>

      {/* Large sparkline */}
      <DomainSparkline
        scores={scores}
        width={200}
        height={60}
        color={color}
        large
      />

      {/* State label */}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px]" style={{ color: stateInfo.color }}>
          {stateInfo.label}
        </span>
        <span className="text-[9px] text-gray-600">
          {node.assessed}/{node.total} assessed
        </span>
      </div>
    </motion.button>
  )
})
