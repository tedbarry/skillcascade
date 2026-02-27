import { memo } from 'react'
import { motion } from 'framer-motion'
import { DOMAIN_COLORS } from '../../constants/colors.js'

const STATE_CONFIG = {
  locked:       { label: 'Locked',     color: '#666' },
  blocked:      { label: 'Blocked',    color: '#8b4444' },
  'needs-work': { label: 'Needs Work', color: '#e8928a' },
  developing:   { label: 'Developing', color: '#e5b76a' },
  mastered:     { label: 'Mastered',   color: '#7fb589' },
}

/**
 * StatusTile — Single domain tile with radial gauge ring.
 *
 * Props:
 *   node      — from useCascadeGraph nodes[]
 *   selected  — boolean
 *   onClick   — () => void
 *   isCompact — boolean (phone: horizontal row instead of tile)
 */
export default memo(function StatusTile({ node, selected = false, onClick, isCompact = false }) {
  const color = DOMAIN_COLORS[node.id] || '#888'
  const stateInfo = STATE_CONFIG[node.state] || STATE_CONFIG.locked
  const hasAssessment = node.assessed > 0

  // Radial gauge params
  const gaugeRadius = 32
  const gaugeStroke = 5
  const circumference = 2 * Math.PI * gaugeRadius
  const fillLength = hasAssessment ? circumference * node.healthPct : 0

  // Phone: compact horizontal row
  if (isCompact) {
    return (
      <motion.button
        onClick={onClick}
        role="button"
        aria-label={`${node.name}: ${hasAssessment ? Math.round(node.healthPct * 100) : 0}% health`}
        whileTap={{ scale: 0.98 }}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors min-h-[44px] ${
          selected
            ? 'bg-[#1e1e28] ring-1 ring-white/10'
            : 'bg-[#16161e] hover:bg-[#1a1a24]'
        }`}
        style={{ borderLeft: `3px solid ${color}` }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ backgroundColor: color + '25', color }}
        >
          D{node.domain}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-xs font-medium text-gray-200 truncate">{node.name}</div>
          <div className="text-[10px]" style={{ color: stateInfo.color }}>{stateInfo.label}</div>
        </div>
        {/* Health bar */}
        <div className="w-20 shrink-0">
          <div className="h-1.5 bg-[#2a2a33] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(2, node.healthPct * 100)}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
        <div className="text-xs font-mono text-gray-400 w-10 text-right shrink-0">
          {hasAssessment ? `${node.avg.toFixed(1)}` : '—'}
        </div>
      </motion.button>
    )
  }

  // Desktop/Tablet: tile with radial gauge
  return (
    <motion.button
      onClick={onClick}
      role="button"
      aria-label={`${node.name}: ${hasAssessment ? Math.round(node.healthPct * 100) : 0}% health`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative flex flex-col items-center p-4 rounded-xl transition-all min-h-[44px] ${
        selected
          ? 'bg-[#1e1e28] ring-1 ring-white/15 shadow-lg'
          : 'bg-[#16161e] hover:bg-[#1a1a24]'
      }`}
      style={{
        borderLeft: `3px solid ${color}`,
        background: selected
          ? '#1e1e28'
          : `radial-gradient(ellipse at top left, ${color}08, #16161e 60%)`,
      }}
    >
      {/* Domain number badge */}
      <div className="absolute top-3 left-4 flex items-center gap-1.5">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{ backgroundColor: color + '25', color }}
        >
          {node.domain}
        </div>
      </div>

      {/* Radial gauge */}
      <div className="relative my-2">
        <svg width={gaugeRadius * 2 + gaugeStroke * 2} height={gaugeRadius * 2 + gaugeStroke * 2}>
          {/* Background ring */}
          <circle
            cx={gaugeRadius + gaugeStroke}
            cy={gaugeRadius + gaugeStroke}
            r={gaugeRadius}
            fill="none"
            stroke="#2a2a33"
            strokeWidth={gaugeStroke}
          />
          {/* Health fill ring */}
          {hasAssessment && (
            <motion.circle
              cx={gaugeRadius + gaugeStroke}
              cy={gaugeRadius + gaugeStroke}
              r={gaugeRadius}
              fill="none"
              stroke={color}
              strokeWidth={gaugeStroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - fillLength }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
              transform={`rotate(-90, ${gaugeRadius + gaugeStroke}, ${gaugeRadius + gaugeStroke})`}
            />
          )}
        </svg>
        {/* Center score */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-mono font-bold text-gray-200">
            {hasAssessment ? node.avg.toFixed(1) : '—'}
          </span>
        </div>
      </div>

      {/* Domain name */}
      <div className="text-xs font-semibold text-gray-200 text-center leading-tight mt-1">
        {node.name}
      </div>

      {/* State label */}
      <div className="text-[10px] mt-0.5" style={{ color: stateInfo.color }}>
        {stateInfo.label}
      </div>

      {/* Assessed count */}
      <div className="text-[9px] text-gray-600 mt-0.5">
        {node.assessed}/{node.total} assessed
      </div>
    </motion.button>
  )
})
