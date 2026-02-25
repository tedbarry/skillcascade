import { useState, useCallback, useMemo, memo } from 'react'
import TieredGraph from './TieredGraph.jsx'
import SubAreaPanel from './SubAreaPanel.jsx'
import useTieredPositions from '../../hooks/useTieredPositions.js'
import useCascadeGraph from '../../hooks/useCascadeGraph.js'
import useResponsive from '../../hooks/useResponsive.js'

/**
 * StatusMapView — "Where are we?"
 * Quick 2-second overview of all 9 domains.
 * Click a domain to see sub-area detail. No cascade, no modes.
 */
export default memo(function StatusMapView({
  assessments = {},
  snapshots = [],
  clientName = '',
  onNavigateToAssess,
}) {
  const { isPhone } = useResponsive()
  const { nodes, edges, domainHealth, getSubAreaHealth } = useCascadeGraph(assessments, snapshots)
  const { positions, dims } = useTieredPositions(nodes)
  const [expandedDomain, setExpandedDomain] = useState(null)
  const hasData = useMemo(() => Object.keys(assessments).length > 0, [assessments])

  const handleNodeClick = useCallback((domainId) => {
    setExpandedDomain(prev => prev === domainId ? null : domainId)
  }, [])

  const subAreas = useMemo(() => {
    if (!expandedDomain) return []
    return getSubAreaHealth(expandedDomain)
  }, [expandedDomain, getSubAreaHealth])

  // Default edge styling — colored by source health
  const edgeStyleFn = useCallback((edge) => {
    const healthPct = edge.sourceHealthPct || 0
    if (edge.isWeak) {
      return { stroke: '#e8928a', opacity: 0.7, width: 2.5 }
    }
    if (hasData && healthPct > 0) {
      const green = Math.round(100 + healthPct * 155)
      return {
        stroke: `rgb(${80 - healthPct * 30}, ${green}, ${100 - healthPct * 10})`,
        opacity: 0.4 + healthPct * 0.4,
        width: 1 + healthPct,
      }
    }
    return { stroke: '#556', opacity: 0.4, width: 1.5 }
  }, [hasData])

  // Highlight selected domain
  const nodeHighlightFn = useCallback((node) => {
    if (expandedDomain && expandedDomain !== node.id) return 'dimmed'
    if (expandedDomain === node.id) return 'selected'
    return null
  }, [expandedDomain])

  const title = hasData
    ? 'STATUS OVERVIEW'
    : 'DEVELOPMENTAL CONNECTOME · NO DATA YET'

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <TieredGraph
        nodes={nodes}
        edges={edges}
        positions={positions}
        dims={dims}
        isPhone={isPhone}
        onNodeClick={handleNodeClick}
        edgeStyleFn={edgeStyleFn}
        nodeHighlightFn={nodeHighlightFn}
        title={title}
      />

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
