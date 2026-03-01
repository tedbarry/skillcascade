import { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { framework } from '../../data/framework.js'
import useResponsive from '../../hooks/useResponsive.js'
import { DOMAIN_COLORS } from '../../constants/colors.js'

const TIER_LABELS = {
  1: 'Reflexive',
  2: 'Recognition',
  3: 'Management',
  4: 'Integration',
  5: 'Abstract',
}

const TIER_COLORS = {
  1: '#7fb589',
  2: '#5da87a',
  3: '#e5b76a',
  4: '#d4956a',
  5: '#e07b6e',
}

const STATE_LABELS = {
  0: { label: 'Not assessed', color: '#666' },
  0.5: { label: 'Getting Started', color: '#e8928a' },
  1: { label: 'Needs Work', color: '#e8928a' },
  1.5: { label: 'Developing', color: '#e5b76a' },
  2: { label: 'Developing', color: '#e5b76a' },
  2.5: { label: 'Strong', color: '#7fb589' },
  3: { label: 'Mastered', color: '#7fb589' },
}

function getStateLabel(avg) {
  if (!avg || avg === 0) return STATE_LABELS[0]
  if (avg < 1) return STATE_LABELS[0.5]
  if (avg < 1.5) return STATE_LABELS[1]
  if (avg < 2) return STATE_LABELS[1.5]
  if (avg < 2.5) return STATE_LABELS[2]
  if (avg < 3) return STATE_LABELS[2.5]
  return STATE_LABELS[3]
}

/**
 * SubAreaPanel — Responsive sub-area detail panel.
 * Desktop/tablet: slide-in sidebar from right.
 * Phone: full-screen overlay.
 *
 * Props:
 *   domainId          — e.g. 'd3'
 *   subAreas          — [{ subAreaId, name, avg, assessed, total, healthPct,
 *                          tierBreakdown?, prerequisiteReadiness? }]
 *   onClose           — () => void
 *   onNavigateToAssess — (subAreaId) => void
 *   sortBy            — 'default' | 'weakness' (for bottleneck view)
 *   criticalThreshold — number (sub-areas below this avg get "Critical" tag)
 *   showPrereqs       — boolean (show prerequisite readiness indicators)
 */
export default memo(function SubAreaPanel({
  domainId,
  subAreas,
  onClose,
  onNavigateToAssess,
  sortBy = 'default',
  criticalThreshold = 0,
  showPrereqs = false,
}) {
  const { isPhone, isTablet } = useResponsive()
  const domain = framework.find(d => d.id === domainId)
  const domainColor = DOMAIN_COLORS[domainId] || '#888'

  const sortedSubAreas = sortBy === 'weakness'
    ? [...subAreas].sort((a, b) => a.avg - b.avg)
    : subAreas

  // Phone: full-screen overlay
  if (isPhone) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed inset-0 z-50 bg-[#12121a] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#333]">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              ←
            </button>
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-200">{domain?.name}</div>
              <div className="text-xs text-gray-500">D{domain?.domain} · {subAreas.length} sub-areas</div>
            </div>
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: domainColor }}
            />
          </div>

          {/* Sub-area cards */}
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {sortedSubAreas.map(sa => (
              <SubAreaCard
                key={sa.subAreaId}
                subArea={sa}
                domainColor={domainColor}
                isCritical={criticalThreshold > 0 && sa.avg > 0 && sa.avg < criticalThreshold}
                onNavigateToAssess={onNavigateToAssess}
                showPrereqs={showPrereqs}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // Desktop/Tablet: sidebar
  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`${isTablet ? 'fixed right-0 top-0 bottom-0 z-40 w-[280px]' : 'w-[320px] shrink-0'} bg-[#12121a] border-l border-[#333] flex flex-col overflow-hidden`}
      >
        {/* Backdrop for tablet */}
        {isTablet && (
          <div
            className="fixed inset-0 bg-black/30 -z-10"
            onClick={onClose}
          />
        )}

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#333] shrink-0">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: domainColor }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-200 truncate">{domain?.name}</div>
            <div className="text-xs text-gray-500">{subAreas.length} sub-areas</div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >×</button>
        </div>

        {/* Sub-area cards */}
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {sortedSubAreas.map(sa => (
            <SubAreaCard
              key={sa.subAreaId}
              subArea={sa}
              domainColor={domainColor}
              isCritical={criticalThreshold > 0 && sa.avg > 0 && sa.avg < criticalThreshold}
              onNavigateToAssess={onNavigateToAssess}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  )
})

function SubAreaCard({ subArea, domainColor, isCritical, onNavigateToAssess, showPrereqs = false }) {
  const stateInfo = getStateLabel(subArea.avg)
  const [expanded, setExpanded] = useState(false)
  const prereqs = subArea.prerequisiteReadiness
  const hasPrereqs = showPrereqs && prereqs && prereqs.prereqSubAreas.length > 0
  const prereqReadiness = hasPrereqs ? prereqs.readiness : 1
  const isBlocked = hasPrereqs && prereqReadiness < 0.5

  return (
    <div className="rounded-lg overflow-hidden">
      <button
        onClick={() => {
          if (hasPrereqs) setExpanded(e => !e)
          else onNavigateToAssess?.(subArea.subAreaId)
        }}
        className={`w-full text-left bg-[#1a1a22] hover:bg-[#22222e] border rounded-lg p-3 transition-colors min-h-[44px] ${
          isBlocked ? 'border-red-900/40' : 'border-[#2a2a33]'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs text-gray-200 font-medium leading-tight flex-1">
            {subArea.name}
            {isCritical && (
              <span className="ml-2 text-[9px] font-bold text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded">
                CRITICAL
              </span>
            )}
            {isBlocked && (
              <span className="ml-2 text-[9px] font-bold text-orange-400 bg-orange-900/30 px-1.5 py-0.5 rounded">
                PREREQS UNMET
              </span>
            )}
          </div>
          <div className="text-[10px] font-mono text-gray-500 shrink-0">
            {subArea.avg > 0 ? subArea.avg.toFixed(1) : '—'}/3
          </div>
        </div>

        {/* Health bar */}
        <div className="mt-2 h-1.5 bg-[#12121a] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(subArea.healthPct || 0) * 100}%`,
              backgroundColor: domainColor,
              opacity: 0.7,
            }}
          />
        </div>

        {/* Prerequisite readiness bar (when showPrereqs) */}
        {hasPrereqs && (
          <div className="mt-1 h-1 bg-[#12121a] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${prereqReadiness * 100}%`,
                backgroundColor: prereqReadiness >= 0.8 ? '#7fb589' : prereqReadiness >= 0.5 ? '#e5b76a' : '#e8928a',
              }}
            />
          </div>
        )}

        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[9px]" style={{ color: stateInfo.color }}>
              {stateInfo.label}
            </span>
            {hasPrereqs && (
              <span className="text-[9px] text-gray-600">
                · prereqs {Math.round(prereqReadiness * 100)}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Tier dots */}
            {subArea.tierBreakdown && (
              <div className="flex gap-0.5">
                {Object.entries(subArea.tierBreakdown).sort(([a], [b]) => a - b).map(([tier, data]) => (
                  <div
                    key={tier}
                    className="w-1.5 h-1.5 rounded-full"
                    title={`Tier ${tier} (${TIER_LABELS[tier]}): ${data.met}/${data.total}`}
                    style={{
                      backgroundColor: data.met === data.total ? '#7fb589' : data.met > 0 ? '#e5b76a' : '#444',
                    }}
                  />
                ))}
              </div>
            )}
            <span className="text-[9px] text-gray-600">
              {subArea.assessed}/{subArea.total} assessed
            </span>
          </div>
        </div>
      </button>

      {/* Expanded: show unmet prerequisites */}
      {expanded && hasPrereqs && prereqs.unmetPrereqs.length > 0 && (
        <div className="bg-[#16161e] border-x border-b border-[#2a2a33] rounded-b-lg px-3 py-2 space-y-1">
          <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1">
            Unmet prerequisites ({prereqs.unmetPrereqs.length})
          </div>
          {prereqs.unmetPrereqs.slice(0, 8).map(prereq => (
            <div key={prereq.skillId} className="flex items-center gap-2 text-[10px]">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: TIER_COLORS[prereq.tier] || '#666' }}
              />
              <span className="text-gray-400 truncate flex-1">{prereq.skillName}</span>
              <span className="text-[9px] text-gray-600 shrink-0">
                {prereq.domainId.toUpperCase()} · T{prereq.tier}
              </span>
              <span className="text-[9px] shrink-0" style={{
                color: prereq.currentLevel == null ? '#666' : prereq.currentLevel === 0 ? '#c47070' : prereq.currentLevel < 2 ? '#e8928a' : '#e5b76a'
              }}>
                {prereq.currentLevel == null ? '—' : prereq.currentLevel.toFixed(0)}
              </span>
            </div>
          ))}
          {prereqs.unmetPrereqs.length > 8 && (
            <div className="text-[9px] text-gray-600">
              +{prereqs.unmetPrereqs.length - 8} more
            </div>
          )}
          {onNavigateToAssess && (
            <button
              onClick={() => onNavigateToAssess(subArea.subAreaId)}
              className="mt-1 text-[10px] text-blue-400 hover:text-blue-300 min-h-[44px] flex items-center"
            >
              View in assessment →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
