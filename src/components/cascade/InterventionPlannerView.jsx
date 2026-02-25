import { useState, useCallback, useMemo, memo } from 'react'
import { AnimatePresence } from 'framer-motion'
import * as d3 from 'd3'
import TieredGraph from './TieredGraph.jsx'
import PlannerSidebar from './PlannerSidebar.jsx'
import useTieredPositions from '../../hooks/useTieredPositions.js'
import useCascadeGraph from '../../hooks/useCascadeGraph.js'
import useResponsive from '../../hooks/useResponsive.js'
import { framework } from '../../data/framework.js'

const heatmapScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, 1])

/**
 * InterventionPlannerView — "What should I target?"
 * Combined what-if + impact heatmap + path trace. No mode switching.
 * Highest-leverage domain gets "Recommended" badge. Click → sidebar shows everything.
 */
export default memo(function InterventionPlannerView({
  assessments = {},
  snapshots = [],
  clientName = '',
  onNavigateToAssess,
}) {
  const { isPhone, isTablet } = useResponsive()
  const [selectedDomain, setSelectedDomain] = useState(null)
  const [targetValue, setTargetValue] = useState(null)

  // What-if overrides for simulation
  const whatIfOverrides = useMemo(() => {
    if (!selectedDomain || targetValue === null) return null
    return { [selectedDomain]: targetValue }
  }, [selectedDomain, targetValue])

  const {
    nodes, edges, domainHealth, impactRanking,
  } = useCascadeGraph(assessments, snapshots, whatIfOverrides)
  const { positions, dims } = useTieredPositions(nodes)
  const hasData = useMemo(() => Object.keys(assessments).length > 0, [assessments])

  // Find recommended target (highest leverage among non-mastered, non-independent)
  const recommended = useMemo(() => {
    if (!hasData) return null
    return impactRanking.find(r => {
      const node = nodes.find(n => n.id === r.domainId)
      return node && !node.independent && node.state !== 'mastered' && node.assessed > 0
    }) || null
  }, [impactRanking, nodes, hasData])

  const maxLeverage = useMemo(() =>
    Math.max(1, ...impactRanking.map(r => r.leverageScore)),
    [impactRanking]
  )

  const handleNodeClick = useCallback((domainId) => {
    if (domainId === selectedDomain) {
      setSelectedDomain(null)
      setTargetValue(null)
      return
    }
    const health = domainHealth[domainId]
    setSelectedDomain(domainId)
    setTargetValue(health?.avg || 0)
  }, [selectedDomain, domainHealth])

  // Impact heatmap coloring for all nodes
  const nodeStyleFn = useCallback((node) => {
    if (node.independent || !hasData || node.assessed === 0) return null

    const t = (node.leverageScore || 0) / maxLeverage
    const heatColor = d3.color(heatmapScale(t * 0.85 + 0.15))
    if (!heatColor) return null

    return {
      fill: `rgba(${heatColor.r}, ${heatColor.g}, ${heatColor.b}, 0.25)`,
      stroke: heatColor.formatHex(),
      textColor: d3.interpolateRgb(heatColor.formatHex(), '#ffffff')(0.4),
    }
  }, [hasData, maxLeverage])

  const nodeHighlightFn = useCallback((node) => {
    if (selectedDomain === node.id) return 'selected'
    return null
  }, [selectedDomain])

  const nodeBadgesFn = useCallback((node) => {
    const badges = []
    if (recommended && node.id === recommended.domainId && !selectedDomain) {
      badges.push({ text: 'RECOMMENDED', color: '#ffd700', bg: '#2a2a15' })
    }
    if (selectedDomain === node.id) {
      badges.push({ text: 'TARGET', color: '#6889b5', bg: '#1a2535' })
    }
    if (!node.independent && node.downstreamSkills > 0) {
      badges.push({ text: `Unlocks ${node.downstreamSkills} skills`, color: '#888', bg: '#1a1a22' })
    }
    return badges
  }, [recommended, selectedDomain])

  // Edge styling: highlight path to selected domain
  const edgeStyleFn = useCallback((edge) => {
    if (!hasData) return { stroke: '#556', opacity: 0.4, width: 1.5 }

    const healthPct = edge.sourceHealthPct || 0
    const green = Math.round(100 + healthPct * 155)
    return {
      stroke: hasData && healthPct > 0
        ? `rgb(${80 - healthPct * 30}, ${green}, ${100 - healthPct * 10})`
        : '#556',
      opacity: 0.3 + healthPct * 0.4,
      width: 1 + healthPct * 0.5,
    }
  }, [hasData])

  const title = hasData
    ? 'INTERVENTION PLANNER · LEVERAGE MAP'
    : 'INTERVENTION PLANNER · ADD DATA TO SEE LEVERAGE'

  // Summary text
  const summaryText = useMemo(() => {
    if (!hasData) return 'Add assessment data to see intervention recommendations.'
    if (recommended) {
      const d = framework.find(f => f.id === recommended.domainId)
      return `Highest leverage: ${d?.name} — affects ${recommended.downstreamDomains} domains, ${recommended.downstreamSkills} skills.`
    }
    return 'All domains assessed. Tap a domain to explore scenarios.'
  }, [hasData, recommended])

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Summary banner */}
      <div className={`${isPhone ? 'px-3 py-2' : 'px-4 py-2'} bg-[#1a1a1e]/90 border-b border-[#333]/60 text-center`}>
        <p className={`text-xs ${recommended ? 'text-yellow-300' : 'text-gray-500'}`}>
          {summaryText}
        </p>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <TieredGraph
          nodes={nodes}
          edges={edges}
          positions={positions}
          dims={dims}
          isPhone={isPhone}
          onNodeClick={handleNodeClick}
          nodeStyleFn={nodeStyleFn}
          nodeHighlightFn={nodeHighlightFn}
          nodeBadgesFn={nodeBadgesFn}
          edgeStyleFn={edgeStyleFn}
          title={title}
          footer="Click a domain to plan intervention · Colors = leverage"
        />

        {/* Planner sidebar */}
        <AnimatePresence>
          {selectedDomain && (
            <PlannerSidebar
              key={selectedDomain}
              selectedDomain={selectedDomain}
              assessments={assessments}
              domainHealth={domainHealth}
              impactRanking={impactRanking}
              targetValue={targetValue}
              onTargetChange={setTargetValue}
              onClose={() => { setSelectedDomain(null); setTargetValue(null) }}
              isBottomSheet={isPhone}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
})
