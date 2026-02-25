import { memo, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { framework } from '../../data/framework.js'
import DomainSparkline from './DomainSparkline.jsx'
import useResponsive from '../../hooks/useResponsive.js'

const RISK_CONFIG = {
  inversion: { icon: '\u26A0', label: 'Inversion', bg: '#3a2525', border: '#e8928a', text: '#f5c4c0', badge: '#e8928a' },
  regression: { icon: '\u2193', label: 'Regression', bg: '#3a2020', border: '#ff6666', text: '#ffaaaa', badge: '#ff6666' },
  bottleneck: { icon: '\u29B8', label: 'Bottleneck', bg: '#3a3520', border: '#e5b76a', text: '#f5e0b0', badge: '#e5b76a' },
  stalling: { icon: '\u23F8', label: 'Stalling', bg: '#2a2a30', border: '#aaa', text: '#ccc', badge: '#999' },
}

/**
 * RiskPanel — Risk card list with sparklines and graph highlighting.
 *
 * Props:
 *   risks            — [{ type, severity, title, description, affectedDomains, actionDomainId }]
 *   domainScoreHistory — { [domainId]: [number] } scores over time for sparklines
 *   selectedRisk     — index of currently selected/highlighted risk
 *   onSelectRisk     — (index) => void
 *   onNavigateToAssess — (subAreaId) => void
 *   onClose          — () => void
 *   isBottomSheet    — boolean
 */
export default memo(function RiskPanel({
  risks = [],
  domainScoreHistory = {},
  selectedRisk = null,
  onSelectRisk,
  onNavigateToAssess,
  onClose,
  isBottomSheet = false,
}) {
  const { isPhone, isTablet } = useResponsive()

  const riskCounts = useMemo(() => {
    const counts = {}
    risks.forEach(r => {
      counts[r.type] = (counts[r.type] || 0) + 1
    })
    return counts
  }, [risks])

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#333] shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-orange-400 text-sm">{'\u26A0'}</span>
            <span className="text-sm font-semibold text-gray-200">
              Risk Alerts
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-orange-900/40 text-orange-400 font-bold">
                {risks.length}
              </span>
            </span>
          </div>
          {/* Type counts */}
          <div className="flex gap-2 mt-1">
            {Object.entries(riskCounts).map(([type, count]) => {
              const cfg = RISK_CONFIG[type] || RISK_CONFIG.bottleneck
              return (
                <span key={type} className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: cfg.badge + '20', color: cfg.badge }}>
                  {cfg.icon} {count} {cfg.label}
                </span>
              )
            })}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >{'\u00D7'}</button>
      </div>

      {/* Risk cards */}
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {risks.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">{'\u2713'}</div>
            <p className="text-sm text-green-400 font-medium">No Risks Detected</p>
            <p className="text-xs text-gray-500 mt-1">All domains are stable and progressing.</p>
          </div>
        ) : (
          risks.map((risk, i) => {
            const cfg = RISK_CONFIG[risk.type] || RISK_CONFIG.bottleneck
            const isSelected = selectedRisk === i

            return (
              <button
                key={i}
                onClick={() => onSelectRisk?.(isSelected ? null : i)}
                className={`w-full text-left rounded-lg border px-3 py-3 transition-all min-h-[44px] ${
                  isSelected ? 'ring-1 ring-white/20 scale-[1.01]' : 'hover:brightness-110'
                }`}
                style={{
                  backgroundColor: cfg.bg,
                  borderColor: isSelected ? cfg.border : cfg.border + '40',
                }}
              >
                {/* Title row */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="w-6 h-6 rounded flex items-center justify-center text-xs shrink-0"
                    style={{ backgroundColor: cfg.badge + '25', color: cfg.badge }}
                  >
                    {cfg.icon}
                  </span>
                  <span className="text-xs font-semibold flex-1" style={{ color: cfg.text }}>
                    {risk.title}
                  </span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0"
                    style={{ backgroundColor: cfg.badge + '20', color: cfg.badge }}
                  >
                    {risk.severity.toFixed(1)}
                  </span>
                </div>

                {/* Description */}
                <p className="text-[11px] text-gray-400 leading-relaxed mb-2">
                  {risk.description}
                </p>

                {/* Affected domains with sparklines */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {risk.affectedDomains.slice(0, 3).map((dId) => {
                      const scores = domainScoreHistory[dId] || []
                      return (
                        <div key={dId} className="flex items-center gap-1 bg-[#222] rounded px-1.5 py-0.5">
                          <span className="text-[9px] font-mono text-gray-400">
                            {dId.toUpperCase()}
                          </span>
                          {scores.length >= 2 && (
                            <DomainSparkline scores={scores} width={32} height={12} color={cfg.badge} showDot={false} />
                          )}
                        </div>
                      )
                    })}
                    {risk.affectedDomains.length > 3 && (
                      <span className="text-[9px] text-gray-600">+{risk.affectedDomains.length - 3}</span>
                    )}
                  </div>

                  {onNavigateToAssess && risk.actionDomainId && (
                    <span
                      className="text-[10px] font-medium px-2 py-1 rounded"
                      style={{ color: cfg.badge, backgroundColor: cfg.badge + '15' }}
                    >
                      Assess {'\u2192'}
                    </span>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )

  // Phone: bottom sheet
  if (isBottomSheet) {
    return (
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-50 bg-[#12121a] border-t border-[#333] rounded-t-xl shadow-2xl"
        style={{ maxHeight: '70vh' }}
      >
        <div className="w-10 h-1 bg-[#444] rounded-full mx-auto mt-2 mb-1" />
        {content}
      </motion.div>
    )
  }

  // Desktop/Tablet: sidebar
  return (
    <div className={`${isTablet ? 'fixed right-0 top-0 bottom-0 z-40 w-[320px]' : 'w-[360px] shrink-0'} bg-[#12121a] border-l border-[#333] flex flex-col overflow-hidden`}>
      {isTablet && <div className="fixed inset-0 bg-black/30 -z-10" onClick={onClose} />}
      {content}
    </div>
  )
})
