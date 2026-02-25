import { useState, useCallback, useMemo, memo } from 'react'
import { AnimatePresence } from 'framer-motion'
import RiskBanner from './RiskBanner.jsx'
import TrendCard from './TrendCard.jsx'
import SubAreaPanel from './SubAreaPanel.jsx'
import useCascadeGraph from '../../hooks/useCascadeGraph.js'
import useResponsive from '../../hooks/useResponsive.js'
import { framework } from '../../data/framework.js'
import { computeDomainHealth } from '../../data/cascadeModel.js'

const RISK_BORDER_COLORS = {
  inversion: '#e8928a',
  regression: '#ff6666',
  bottleneck: '#e5b76a',
  stalling: '#aaa',
}

/**
 * RiskMonitorView — "What's at risk?"
 * Alert-first layout: risk banners at top, 3×3 sparkline trend grid below.
 * A monitoring station / hospital vitals dashboard.
 */
export default memo(function RiskMonitorView({
  assessments = {},
  snapshots = [],
  clientName = '',
  onNavigateToAssess,
}) {
  const { isPhone, isTablet } = useResponsive()
  const { nodes, cascadeRisks, domainHealth, getSubAreaHealth } = useCascadeGraph(assessments, snapshots)
  const [selectedRisk, setSelectedRisk] = useState(null)
  const [expandedDomain, setExpandedDomain] = useState(null)
  const hasData = useMemo(() => Object.keys(assessments).length > 0, [assessments])

  // Build domain score history from snapshots for sparklines
  const domainScoreHistory = useMemo(() => {
    const history = {}
    framework.forEach(d => { history[d.id] = [] })

    snapshots.forEach(snap => {
      const health = computeDomainHealth(snap.assessments || {})
      framework.forEach(d => {
        history[d.id].push(health[d.id]?.avg || 0)
      })
    })
    // Add current
    framework.forEach(d => {
      history[d.id].push(domainHealth[d.id]?.avg || 0)
    })

    return history
  }, [snapshots, domainHealth])

  // Domains highlighted by selected risk
  const highlightedDomains = useMemo(() => {
    if (selectedRisk === null || !cascadeRisks[selectedRisk]) return new Set()
    return new Set(cascadeRisks[selectedRisk].affectedDomains)
  }, [selectedRisk, cascadeRisks])

  // Get highlight color for a domain
  const getDomainHighlight = useCallback((domainId) => {
    if (highlightedDomains.size === 0) return null
    if (!highlightedDomains.has(domainId)) return null
    const risk = cascadeRisks[selectedRisk]
    return RISK_BORDER_COLORS[risk?.type] || '#e5b76a'
  }, [highlightedDomains, selectedRisk, cascadeRisks])

  const handleRiskClick = useCallback((index) => {
    setSelectedRisk(prev => prev === index ? null : index)
  }, [])

  const handleTrendClick = useCallback((domainId) => {
    setExpandedDomain(prev => prev === domainId ? null : domainId)
  }, [])

  const subAreas = useMemo(() => {
    if (!expandedDomain) return []
    return getSubAreaHealth(expandedDomain)
  }, [expandedDomain, getSubAreaHealth])

  // Summary
  const summaryText = useMemo(() => {
    if (!hasData) return 'Add assessment data to monitor risks.'
    if (cascadeRisks.length === 0) return 'No risks detected. All domains are stable.'
    const types = {}
    cascadeRisks.forEach(r => { types[r.type] = (types[r.type] || 0) + 1 })
    const parts = Object.entries(types).map(([type, count]) => `${count} ${type}${count !== 1 ? 's' : ''}`)
    return `${cascadeRisks.length} risk${cascadeRisks.length !== 1 ? 's' : ''}: ${parts.join(', ')}`
  }, [hasData, cascadeRisks])

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 overflow-auto">
        {/* Summary header */}
        <div className={`${isPhone ? 'px-3 py-2' : 'px-5 py-3'} border-b border-[#333]/40`}>
          <h2 className="text-[10px] font-mono tracking-widest text-gray-600 uppercase">
            Risk Monitor
          </h2>
          <p className={`text-xs mt-0.5 ${cascadeRisks.length > 0 ? 'text-orange-300' : 'text-green-400'}`}>
            {summaryText}
          </p>
        </div>

        {/* Risk banners */}
        <div className={`${isPhone ? 'px-3 pt-3' : 'px-5 pt-4'} space-y-2`}>
          <AnimatePresence>
            {cascadeRisks.length === 0 && hasData ? (
              <div className="rounded-lg bg-[#1a2a1a] border-l-4 border-[#7fb589] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-green-400 text-sm">{'\u2713'}</span>
                  <span className="text-sm font-medium text-green-300">All Clear</span>
                </div>
                <p className="text-[11px] text-green-400/60 mt-0.5">
                  No inversions, regressions, or bottlenecks detected.
                </p>
              </div>
            ) : (
              cascadeRisks.map((risk, i) => (
                <RiskBanner
                  key={`${risk.type}-${i}`}
                  risk={risk}
                  isSelected={selectedRisk === i}
                  onClick={() => handleRiskClick(i)}
                  onAssess={onNavigateToAssess ? () => onNavigateToAssess(risk.actionDomainId + '-sa1') : null}
                  isCompact={isPhone}
                />
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Trend grid */}
        <div className={`${isPhone ? 'px-3 py-3' : 'px-5 py-4'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono tracking-widest text-gray-600 uppercase">
              Domain Trends
            </span>
            <span className="text-[9px] text-gray-600">
              {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} + current
            </span>
          </div>

          {isPhone ? (
            // Phone: single-column
            <div className="space-y-2">
              {nodes.map(node => {
                const highlight = getDomainHighlight(node.id)
                return (
                  <TrendCard
                    key={node.id}
                    node={node}
                    scores={domainScoreHistory[node.id] || []}
                    isHighlighted={!!highlight}
                    highlightColor={highlight}
                    isDimmed={highlightedDomains.size > 0 && !highlightedDomains.has(node.id)}
                    onClick={() => handleTrendClick(node.id)}
                    isCompact
                  />
                )
              })}
            </div>
          ) : (
            // Desktop/Tablet: 3×3 grid
            <div className={`grid grid-cols-3 ${isTablet ? 'gap-2' : 'gap-3'} max-w-4xl`}>
              {nodes.map(node => {
                const highlight = getDomainHighlight(node.id)
                return (
                  <TrendCard
                    key={node.id}
                    node={node}
                    scores={domainScoreHistory[node.id] || []}
                    isHighlighted={!!highlight}
                    highlightColor={highlight}
                    isDimmed={highlightedDomains.size > 0 && !highlightedDomains.has(node.id)}
                    onClick={() => handleTrendClick(node.id)}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sub-area panel */}
      {expandedDomain && (
        <SubAreaPanel
          domainId={expandedDomain}
          subAreas={subAreas}
          onClose={() => setExpandedDomain(null)}
          onNavigateToAssess={onNavigateToAssess}
        />
      )}
    </div>
  )
})
