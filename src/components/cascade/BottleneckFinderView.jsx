import { useState, useCallback, useMemo, useEffect, memo } from 'react'
import PipelineFlow from './PipelineFlow.jsx'
import SubAreaPanel from './SubAreaPanel.jsx'
import useCascadeGraph from '../../hooks/useCascadeGraph.js'
import useResponsive from '../../hooks/useResponsive.js'
import { framework } from '../../data/framework.js'

/**
 * BottleneckFinderView — "What's holding us back?"
 * Horizontal pipeline flow where pipe thickness = domain health.
 * Bottleneck = dramatic constriction. Click triggers cascade wave.
 */
export default memo(function BottleneckFinderView({
  assessments = {},
  snapshots = [],
  clientName = '',
  onNavigateToAssess,
}) {
  const { isPhone } = useResponsive()
  const {
    nodes, impactRanking, cascadeState,
    triggerCascade, resetCascade, getSubAreaHealth,
  } = useCascadeGraph(assessments, snapshots)
  const [expandedDomain, setExpandedDomain] = useState(null)
  const hasData = useMemo(() => Object.keys(assessments).length > 0, [assessments])

  // Identify bottleneck: highest leverage score among weak non-independent domains
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

  // Mastery cascade detection
  const isMasteryCascade = useMemo(() => {
    if (!cascadeState.active || !cascadeState.source) return false
    const source = nodes.find(n => n.id === cascadeState.source)
    return source && source.healthPct >= 0.67
  }, [cascadeState, nodes])

  const handleSegmentClick = useCallback((domainId) => {
    if (domainId === expandedDomain) {
      setExpandedDomain(null)
      resetCascade()
      return
    }
    // Trigger cascade for non-independent domains
    if (!nodes.find(n => n.id === domainId)?.independent) {
      resetCascade()
      setTimeout(() => triggerCascade(domainId), 50)
    }
    setExpandedDomain(domainId)
  }, [expandedDomain, resetCascade, triggerCascade, nodes])

  // Summary sentence
  const summaryText = useMemo(() => {
    if (!bottleneck) return hasData ? 'No significant bottlenecks detected.' : 'Add assessment data to identify bottlenecks.'
    const domain = framework.find(d => d.id === bottleneck.domainId)
    return `Weakness in ${domain?.name || ''} affects ${bottleneck.downstreamDomains} downstream domain${bottleneck.downstreamDomains !== 1 ? 's' : ''}, limiting ${bottleneck.downstreamSkills} skills.`
  }, [bottleneck, hasData])

  const footerText = useMemo(() => {
    if (cascadeState.active) {
      const count = Object.keys(cascadeState.affected).length
      return `${count} domain${count !== 1 ? 's' : ''} affected \u00B7 Click elsewhere to reset`
    }
    return 'Click a segment to see cascade impact'
  }, [cascadeState])

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Summary banner */}
      <div className={`${isPhone ? 'px-3 py-2' : 'px-5 py-3'} border-b border-[#333]/40`}>
        <h2 className="text-[10px] font-mono tracking-widest text-gray-600 uppercase">
          Bottleneck Finder
        </h2>
        <p className={`text-xs mt-0.5 ${bottleneck ? 'text-orange-300' : 'text-gray-500'}`}>
          {summaryText}
        </p>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Pipeline visualization */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <PipelineFlow
            nodes={nodes}
            bottleneckId={bottleneckId}
            cascadeState={cascadeState}
            isMasteryCascade={isMasteryCascade}
            onSegmentClick={handleSegmentClick}
          />
          {/* Footer */}
          <div className="px-4 py-1.5 text-center border-t border-[#333]/30">
            <span className="text-[10px] text-gray-600 font-mono">{footerText}</span>
          </div>
        </div>

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
