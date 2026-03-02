import { memo } from 'react'
import { motion } from 'framer-motion'

const RISK_CONFIG = {
  inversion: { icon: '\u26A0', label: 'Inversion', bg: '#3a2525', border: '#e8928a', text: '#f5c4c0' },
  regression: { icon: '\u2193', label: 'Regression', bg: '#3a2020', border: '#ff6666', text: '#ffaaaa' },
  bottleneck: { icon: '\u29B8', label: 'Bottleneck', bg: '#3a3520', border: '#e5b76a', text: '#f5e0b0' },
  stalling: { icon: '\u23F8', label: 'Stalling', bg: '#2a2a30', border: '#aaa', text: '#ccc' },
}

/**
 * RiskBanner — Full-width risk alert banner for the Risk Monitor.
 *
 * Props:
 *   risk       — { type, severity, title, description, affectedDomains, actionDomainId }
 *   isSelected — boolean
 *   onClick    — () => void
 *   onAssess   — () => void
 *   isCompact  — boolean (phone)
 */
export default memo(function RiskBanner({
  risk,
  isSelected = false,
  onClick,
  onAssess,
  isCompact = false,
}) {
  const cfg = RISK_CONFIG[risk.type] || RISK_CONFIG.bottleneck

  return (
    <motion.button
      role="alert"
      onClick={onClick}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={`w-full text-left rounded-lg transition-all min-h-[44px] ${
        isSelected ? 'ring-1 ring-white/15 scale-[1.005]' : 'hover:brightness-110'
      }`}
      style={{
        backgroundColor: cfg.bg,
        borderLeft: `4px solid ${cfg.border}`,
      }}
    >
      <div className={`flex items-center gap-3 ${isCompact ? 'px-3 py-2' : 'px-4 py-3'}`}>
        {/* Icon */}
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
          style={{ backgroundColor: cfg.border + '20', color: cfg.border }}
        >
          {cfg.icon}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold" style={{ color: cfg.text }}>
              {risk.title}
            </span>
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0"
              style={{ backgroundColor: cfg.border + '20', color: cfg.border }}
            >
              {risk.severity.toFixed(1)}
            </span>
          </div>
          {!isCompact && (
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">
              {risk.description}
            </p>
          )}
        </div>

        {/* Affected count */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] text-gray-500 font-mono">
            {risk.affectedDomains.length} domain{risk.affectedDomains.length !== 1 ? 's' : ''}
          </span>
          {onAssess && risk.actionDomainId && (
            <button
              className="text-[10px] font-medium px-2 py-1 rounded cursor-pointer min-h-[44px] flex items-center"
              style={{ color: cfg.border, backgroundColor: cfg.border + '30', border: `1px solid ${cfg.border}40` }}
              onClick={(e) => { e.stopPropagation(); onAssess() }}
            >
              View {'\u2192'}
            </button>
          )}
        </div>
      </div>
    </motion.button>
  )
})
