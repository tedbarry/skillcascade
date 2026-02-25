import { useState, useCallback, useMemo, useEffect, memo } from 'react'
import TieredGraph from './TieredGraph.jsx'
import SubAreaPanel from './SubAreaPanel.jsx'
import { DOMAIN_COLORS } from './DomainNode.jsx'
import useTieredPositions from '../../hooks/useTieredPositions.js'
import useCascadeGraph from '../../hooks/useCascadeGraph.js'
import useResponsive from '../../hooks/useResponsive.js'
import { framework, DOMAIN_DEPENDENCIES } from '../../data/framework.js'

/**
 * BottleneckFinderView — "What's holding us back?"
 * Auto-identifies the bottleneck domain. Edge annotations show impact.
 * Click cascade with text labels. Sub-area detail for bottleneck pre-expanded.
 */
export default memo(function BottleneckFinderView({
  assessments = {},
  snapshots = [],
  clientName = '',
  onNavigateToAssess,
}) {
  const { isPhone } = useResponsive()
  const {
    nodes, edges, impactRanking, cascadeState,
    triggerCascade, resetCascade, getSubAreaHealth,
  } = useCascadeGraph(assessments, snapshots)
  const { positions, dims } = useTieredPositions(nodes)
  const [expandedDomain, setExpandedDomain] = useState(null)
  const hasData = useMemo(() => Object.keys(assessments).length > 0, [assessments])

  // Identify bottleneck: highest leverage score among weak domains (not independent)
  const bottleneck = useMemo(() => {
    if (!hasData) return null
    const candidates = impactRanking.filter(r => {
      const node = nodes.find(n => n.id === r.domainId)
      return node && !node.independent && node.assessed > 0 && node.avg < 2.0
    })
    return candidates.length > 0 ? candidates[0] : null
  }, [impactRanking, nodes, hasData])

  const bottleneckId = bottleneck?.domainId || null

  // Auto-expand bottleneck sub-areas on mount
  useEffect(() => {
    if (bottleneckId && !expandedDomain) {
      setExpandedDomain(bottleneckId)
    }
  }, [bottleneckId])

  const subAreas = useMemo(() => {
    if (!expandedDomain) return []
    return getSubAreaHealth(expandedDomain)
  }, [expandedDomain, getSubAreaHealth])

  // Build downstream map for edge annotations
  const downstreamOf = useMemo(() => {
    const map = {}
    Object.entries(DOMAIN_DEPENDENCIES).forEach(([domainId, deps]) => {
      deps.forEach(dep => {
        if (!map[dep]) map[dep] = []
        map[dep].push(domainId)
      })
    })
    return map
  }, [])

  const handleNodeClick = useCallback((domainId) => {
    if (domainId === expandedDomain) {
      setExpandedDomain(null)
      return
    }
    // Trigger cascade to show propagation
    if (!nodes.find(n => n.id === domainId)?.independent) {
      resetCascade()
      setTimeout(() => triggerCascade(domainId), 50)
    }
    setExpandedDomain(domainId)
  }, [expandedDomain, resetCascade, triggerCascade, nodes])

  // Mastery cascade detection
  const isMasteryCascade = useMemo(() => {
    if (!cascadeState.active || !cascadeState.source) return false
    const source = nodes.find(n => n.id === cascadeState.source)
    return source && source.healthPct >= 0.67
  }, [cascadeState, nodes])

  // Node styling: bottleneck highlighted, cascade affected show text
  const nodeStyleFn = useCallback((node) => {
    if (cascadeState.active) {
      if (node.id === cascadeState.source) {
        return isMasteryCascade
          ? { fill: '#2a2a15', stroke: '#ffd700', textColor: '#ffe680' }
          : { fill: '#5c1a1a', stroke: '#ff4444', textColor: '#ff8888' }
      }
      if (cascadeState.affected[node.id]) {
        const impact = cascadeState.affected[node.id].impactStrength
        return isMasteryCascade
          ? { fill: `rgba(42,42,21,${Math.max(0.3, impact)})`, stroke: `rgba(255,215,0,${Math.max(0.3, impact)})`, textColor: `rgba(255,230,128,${Math.max(0.3, impact)})` }
          : { fill: `rgba(92,26,26,${Math.max(0.3, impact)})`, stroke: `rgba(255,68,68,${Math.max(0.3, impact)})`, textColor: `rgba(255,136,136,${Math.max(0.3, impact)})` }
      }
      if (!node.independent) {
        return { fill: '#1e2520', stroke: '#5a8a5a', textColor: '#8ab88a' }
      }
    }
    return null // use default
  }, [cascadeState, isMasteryCascade])

  const nodeHighlightFn = useCallback((node) => {
    if (node.id === bottleneckId && !cascadeState.active) return 'bottleneck'
    if (expandedDomain && expandedDomain !== node.id && !cascadeState.active) return 'dimmed'
    return null
  }, [bottleneckId, expandedDomain, cascadeState.active])

  const nodeBadgesFn = useCallback((node) => {
    const badges = []
    if (node.id === bottleneckId && !cascadeState.active) {
      badges.push({ text: 'BOTTLENECK', color: '#ff8800', bg: '#3a2510' })
    }
    if (cascadeState.active && cascadeState.affected[node.id]) {
      const impact = cascadeState.affected[node.id]
      const pct = Math.round(impact.impactStrength * 100)
      badges.push({
        text: `Impact: ${pct}%`,
        color: isMasteryCascade ? '#ffd700' : '#ff4444',
        bg: isMasteryCascade ? '#2a2a15' : '#3a1515',
      })
    }
    if (cascadeState.active && node.id === cascadeState.source) {
      badges.push({
        text: isMasteryCascade ? 'STRENGTH SOURCE' : 'CASCADE SOURCE',
        color: isMasteryCascade ? '#ffd700' : '#ff4444',
        bg: isMasteryCascade ? '#2a2a15' : '#3a1515',
      })
    }
    return badges
  }, [bottleneckId, cascadeState, isMasteryCascade])

  // Edge styling
  const edgeStyleFn = useCallback((edge) => {
    if (cascadeState.active) {
      const sourceAffected = edge.from === cascadeState.source || cascadeState.affected[edge.from]
      const targetAffected = cascadeState.affected[edge.to]
      if (sourceAffected && targetAffected) {
        return {
          stroke: isMasteryCascade ? '#ffd700' : '#ff4444',
          opacity: 0.7,
          width: 2.5,
          dash: 'none',
        }
      }
      return { stroke: '#445', opacity: 0.2, width: 1, dash: '4,4' }
    }
    // Highlight weak edges from bottleneck
    if (edge.isWeak || (bottleneckId && edge.from === bottleneckId)) {
      return { stroke: '#ff8800', opacity: 0.6, width: 2 }
    }
    return { stroke: '#556', opacity: 0.4, width: 1.5 }
  }, [cascadeState, isMasteryCascade, bottleneckId])

  // Edge annotations for weak connections
  const edgeAnnotationFn = useCallback((edge) => {
    if (cascadeState.active) return null // let badges handle it during cascade
    if (!hasData) return null
    const sourceNode = nodes.find(n => n.id === edge.from)
    if (sourceNode && sourceNode.avg < 2.0 && sourceNode.assessed > 0 && !sourceNode.independent) {
      const targetDomain = framework.find(d => d.id === edge.to)
      return `Limits ${targetDomain?.name || edge.to}`
    }
    return null
  }, [cascadeState.active, hasData, nodes])

  // Summary sentence
  const summaryText = useMemo(() => {
    if (!bottleneck) return hasData ? 'No significant bottlenecks detected.' : 'Add assessment data to identify bottlenecks.'
    const domain = framework.find(d => d.id === bottleneck.domainId)
    return `Weakness in ${domain?.name || ''} affects ${bottleneck.downstreamDomains} downstream domain${bottleneck.downstreamDomains !== 1 ? 's' : ''}, limiting ${bottleneck.downstreamSkills} skills.`
  }, [bottleneck, hasData])

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Summary banner */}
      <div className={`${isPhone ? 'px-3 py-2' : 'px-4 py-2'} bg-[#1a1a1e]/90 border-b border-[#333]/60 text-center`}>
        <p className={`text-xs ${bottleneck ? 'text-orange-300' : 'text-gray-500'}`}>
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
          edgeAnnotationFn={edgeAnnotationFn}
          title="BOTTLENECK ANALYSIS"
          footer={cascadeState.active
            ? `${Object.keys(cascadeState.affected).length} domain${Object.keys(cascadeState.affected).length !== 1 ? 's' : ''} affected · Click elsewhere to reset`
            : 'Click a domain to see cascade impact'
          }
        />

        {/* Sub-area panel */}
        {expandedDomain && (
          <SubAreaPanel
            domainId={expandedDomain}
            subAreas={subAreas}
            onClose={() => { setExpandedDomain(null); resetCascade() }}
            onNavigateToAssess={onNavigateToAssess}
            sortBy="weakness"
            criticalThreshold={1.5}
          />
        )}
      </div>
    </div>
  )
})
