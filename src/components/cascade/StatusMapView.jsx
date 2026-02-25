import { useState, useCallback, useMemo, memo } from 'react'
import StatusTile from './StatusTile.jsx'
import SubAreaPanel from './SubAreaPanel.jsx'
import useCascadeGraph from '../../hooks/useCascadeGraph.js'
import useResponsive from '../../hooks/useResponsive.js'

/**
 * StatusMapView — "Where are we?"
 * 9-tile dashboard grid with radial health gauges.
 * Glanceable in 2 seconds. Click tile → sub-area detail.
 */
export default memo(function StatusMapView({
  assessments = {},
  snapshots = [],
  clientName = '',
  onNavigateToAssess,
}) {
  const { isPhone, isTablet } = useResponsive()
  const { nodes, getSubAreaHealth } = useCascadeGraph(assessments, snapshots)
  const [expandedDomain, setExpandedDomain] = useState(null)
  const hasData = useMemo(() => Object.keys(assessments).length > 0, [assessments])

  const handleTileClick = useCallback((domainId) => {
    setExpandedDomain(prev => prev === domainId ? null : domainId)
  }, [])

  const subAreas = useMemo(() => {
    if (!expandedDomain) return []
    return getSubAreaHealth(expandedDomain)
  }, [expandedDomain, getSubAreaHealth])

  // Status counts for summary
  const statusCounts = useMemo(() => {
    let mastered = 0, developing = 0, needsWork = 0, unassessed = 0
    nodes.forEach(n => {
      if (n.assessed === 0) { unassessed++; return }
      if (n.state === 'mastered') mastered++
      else if (n.state === 'developing') developing++
      else needsWork++
    })
    return { mastered, developing, needsWork, unassessed }
  }, [nodes])

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 overflow-auto">
        {/* Summary header */}
        <div className={`${isPhone ? 'px-4 py-3' : 'px-6 py-4'} border-b border-[#333]/40`}>
          <h2 className="text-xs font-mono tracking-widest text-gray-500 uppercase mb-1">
            Status Overview
          </h2>
          {hasData ? (
            <p className="text-xs text-gray-400">
              {statusCounts.mastered > 0 && <span className="text-[#7fb589]">{statusCounts.mastered} mastered</span>}
              {statusCounts.developing > 0 && <span>{statusCounts.mastered > 0 ? ' · ' : ''}<span className="text-[#e5b76a]">{statusCounts.developing} developing</span></span>}
              {statusCounts.needsWork > 0 && <span>{(statusCounts.mastered + statusCounts.developing) > 0 ? ' · ' : ''}<span className="text-[#e8928a]">{statusCounts.needsWork} needs work</span></span>}
              {statusCounts.unassessed > 0 && <span className="text-gray-600"> · {statusCounts.unassessed} not assessed</span>}
            </p>
          ) : (
            <p className="text-xs text-gray-600">Add assessment data to see domain status.</p>
          )}
        </div>

        {/* Tile grid */}
        <div className={`${isPhone ? 'px-3 py-3' : 'px-6 py-5'}`}>
          {isPhone ? (
            // Phone: single-column compact rows
            <div className="space-y-2">
              {nodes.map(node => (
                <StatusTile
                  key={node.id}
                  node={node}
                  selected={expandedDomain === node.id}
                  onClick={() => handleTileClick(node.id)}
                  isCompact
                />
              ))}
            </div>
          ) : (
            // Desktop/Tablet: 3×3 grid
            <div className={`grid grid-cols-3 ${isTablet ? 'gap-3' : 'gap-4'} max-w-3xl mx-auto`}>
              {nodes.map(node => (
                <StatusTile
                  key={node.id}
                  node={node}
                  selected={expandedDomain === node.id}
                  onClick={() => handleTileClick(node.id)}
                />
              ))}
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
