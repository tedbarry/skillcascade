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
  'ceiling-constraint': '#d694e8',
  // Learning barrier types
  'score-inversion': '#b594d6',
  'prerequisite-gap': '#d694b5',
  'uneven-profile': '#94a8d6',
  'plateau': '#d6c494',
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
  const { nodes, cascadeRisks, domainHealth, getEnhancedSubAreaHealth, learningBarriers, constrainedSkills } = useCascadeGraph(assessments, snapshots)
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
    return getEnhancedSubAreaHealth(expandedDomain)
  }, [expandedDomain, getEnhancedSubAreaHealth])

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

        {/* Learning barrier banners */}
        {learningBarriers.length > 0 && (
          <div className={`${isPhone ? 'px-3 pt-2' : 'px-5 pt-3'} space-y-2`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-mono tracking-widest text-gray-600 uppercase">Learning Barriers</span>
              <span className="text-[9px] text-gray-600 bg-[#2a2a33] px-1.5 py-0.5 rounded">{learningBarriers.length}</span>
            </div>
            {learningBarriers.slice(0, 5).map((barrier, i) => {
              const borderColor = RISK_BORDER_COLORS[barrier.type] || '#b594d6'
              return (
                <div
                  key={`barrier-${i}`}
                  className="rounded-lg px-4 py-2.5"
                  style={{
                    backgroundColor: `${borderColor}08`,
                    borderLeft: `3px solid ${borderColor}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded"
                      style={{ color: borderColor, backgroundColor: `${borderColor}15` }}>
                      {barrier.type.replace(/-/g, ' ').toUpperCase()}
                    </span>
                    <span className="text-[9px] text-gray-600 font-mono">
                      severity {barrier.severity.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">{barrier.description}</p>
                </div>
              )
            })}
          </div>
        )}

        {/* Ceiling constraint warnings */}
        {constrainedSkills && constrainedSkills.length > 0 && (
          <div className={`${isPhone ? 'px-3 pt-2' : 'px-5 pt-3'} space-y-2`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-mono tracking-widest text-gray-600 uppercase">Ceiling Constraints</span>
              <span className="text-[9px] text-gray-600 bg-[#2a2a33] px-1.5 py-0.5 rounded">{constrainedSkills.length}</span>
            </div>
            {constrainedSkills.slice(0, 4).map((cs, i) => {
              const borderColor = RISK_BORDER_COLORS['ceiling-constraint']
              let skillName = cs.skillId
              for (const d of framework) {
                for (const sa of d.subAreas) {
                  for (const sg of sa.skillGroups) {
                    for (const s of sg.skills) {
                      if (s.id === cs.skillId) skillName = s.name
                    }
                  }
                }
              }
              return (
                <div
                  key={`ceiling-${i}`}
                  className="rounded-lg px-4 py-2.5"
                  style={{
                    backgroundColor: `${borderColor}08`,
                    borderLeft: `3px solid ${borderColor}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded"
                      style={{ color: borderColor, backgroundColor: `${borderColor}15` }}>
                      ABOVE CEILING
                    </span>
                    <span className="text-[9px] text-gray-600 font-mono">
                      {cs.domainId.toUpperCase()} · gap +{cs.gap}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {skillName} rated level {cs.level} but ceiling is {cs.ceiling} — may be fragile without prereq support
                  </p>
                </div>
              )
            })}
          </div>
        )}

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
          showPrereqs
        />
      )}
    </div>
  )
})
