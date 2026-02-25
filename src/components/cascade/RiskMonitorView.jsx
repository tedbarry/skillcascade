import { useState, useCallback, useMemo, memo } from 'react'
import { AnimatePresence } from 'framer-motion'
import TieredGraph from './TieredGraph.jsx'
import RiskPanel from './RiskPanel.jsx'
import DomainSparkline from './DomainSparkline.jsx'
import useTieredPositions from '../../hooks/useTieredPositions.js'
import useCascadeGraph from '../../hooks/useCascadeGraph.js'
import useResponsive from '../../hooks/useResponsive.js'
import { framework } from '../../data/framework.js'
import { computeDomainHealth } from '../../data/cascadeModel.js'

const RISK_NODE_ICONS = {
  inversion: { symbol: '\u26A0', color: '#e8928a' },
  regression: { symbol: '\u2193', color: '#ff6666' },
  bottleneck: { symbol: '\u29B8', color: '#e5b76a' },
  stalling: { symbol: '\u23F8', color: '#999' },
}

/**
 * RiskMonitorView — "What's at risk?"
 * Clear alerts about regression, stalling, inversions.
 * Risk badges on nodes, sparklines for trends, risk card panel.
 */
export default memo(function RiskMonitorView({
  assessments = {},
  snapshots = [],
  clientName = '',
  onNavigateToAssess,
}) {
  const { isPhone, isTablet } = useResponsive()
  const { nodes, edges, cascadeRisks, domainHealth } = useCascadeGraph(assessments, snapshots)
  const { positions, dims } = useTieredPositions(nodes)
  const [selectedRisk, setSelectedRisk] = useState(null)
  const [showPanel, setShowPanel] = useState(true)
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

  // Map risks to affected domains for node badge rendering
  const domainRiskMap = useMemo(() => {
    const map = {}
    cascadeRisks.forEach((risk, i) => {
      risk.affectedDomains.forEach(dId => {
        if (!map[dId]) map[dId] = []
        // Only add primary risk type per domain
        if (!map[dId].find(r => r.type === risk.type)) {
          map[dId].push({ type: risk.type, riskIndex: i, severity: risk.severity })
        }
      })
    })
    return map
  }, [cascadeRisks])

  // Domains highlighted by selected risk
  const highlightedDomains = useMemo(() => {
    if (selectedRisk === null || !cascadeRisks[selectedRisk]) return new Set()
    return new Set(cascadeRisks[selectedRisk].affectedDomains)
  }, [selectedRisk, cascadeRisks])

  const handleNodeClick = useCallback((domainId) => {
    // Find first risk involving this domain and select it
    const riskIdx = cascadeRisks.findIndex(r => r.affectedDomains.includes(domainId))
    if (riskIdx >= 0) {
      setSelectedRisk(prev => prev === riskIdx ? null : riskIdx)
      setShowPanel(true)
    }
  }, [cascadeRisks])

  // Node styling: highlight risk-affected domains
  const nodeStyleFn = useCallback((node) => {
    if (!hasData) return null
    if (highlightedDomains.size > 0 && highlightedDomains.has(node.id)) {
      const risk = domainRiskMap[node.id]?.[0]
      if (risk) {
        const iconCfg = RISK_NODE_ICONS[risk.type] || RISK_NODE_ICONS.bottleneck
        return { fill: '#2a1a1a', stroke: iconCfg.color, textColor: iconCfg.color }
      }
    }
    return null
  }, [hasData, highlightedDomains, domainRiskMap])

  const nodeHighlightFn = useCallback((node) => {
    if (highlightedDomains.size > 0 && !highlightedDomains.has(node.id)) return 'dimmed'
    return null
  }, [highlightedDomains])

  const nodeBadgesFn = useCallback((node) => {
    const badges = []
    const risks = domainRiskMap[node.id] || []
    risks.forEach(risk => {
      const iconCfg = RISK_NODE_ICONS[risk.type] || RISK_NODE_ICONS.bottleneck
      badges.push({
        text: `${iconCfg.symbol} ${risk.type.charAt(0).toUpperCase() + risk.type.slice(1)}`,
        color: iconCfg.color,
        bg: '#1a1a22',
      })
    })
    return badges
  }, [domainRiskMap])

  // Sparkline rendered inside each node
  const nodeChildrenFn = useCallback((node, pos) => {
    const scores = domainScoreHistory[node.id]
    if (!scores || scores.length < 2) return null

    const sparkW = Math.min(dims.nodeW - 20, 60)
    const sparkH = 14
    const x = pos.x - sparkW / 2
    const y = pos.y + dims.nodeH / 2 - sparkH - 4

    // Build sparkline points directly in SVG
    const maxScore = 3
    const pad = 1
    const w = sparkW - pad * 2
    const h = sparkH - pad * 2

    const points = scores.map((score, i) => {
      const px = x + pad + (i / (scores.length - 1)) * w
      const py = y + pad + h - (score / maxScore) * h
      return `${px},${py}`
    }).join(' ')

    const lastScore = scores[scores.length - 1]
    const trend = lastScore - scores[0]
    const lineColor = trend >= 0 ? '#7fb589' : '#e8928a'

    return (
      <g>
        <polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.7"
        />
        <circle
          cx={x + sparkW - pad}
          cy={y + pad + h - (lastScore / maxScore) * h}
          r="1.5"
          fill={lineColor}
        />
      </g>
    )
  }, [domainScoreHistory, dims])

  // Edge styling
  const edgeStyleFn = useCallback((edge) => {
    if (highlightedDomains.size > 0) {
      if (highlightedDomains.has(edge.from) && highlightedDomains.has(edge.to)) {
        return { stroke: '#e8928a', opacity: 0.7, width: 2.5 }
      }
      return { stroke: '#445', opacity: 0.15, width: 1 }
    }
    if (edge.isWeak) {
      return { stroke: '#e8928a', opacity: 0.6, width: 2 }
    }
    return { stroke: '#556', opacity: 0.4, width: 1.5 }
  }, [highlightedDomains])

  // Summary
  const summaryText = useMemo(() => {
    if (!hasData) return 'Add assessment data to monitor risks.'
    if (cascadeRisks.length === 0) return 'No risks detected. All domains are stable.'
    const inversions = cascadeRisks.filter(r => r.type === 'inversion').length
    const regressions = cascadeRisks.filter(r => r.type === 'regression').length
    const bottlenecks = cascadeRisks.filter(r => r.type === 'bottleneck').length
    const parts = []
    if (inversions > 0) parts.push(`${inversions} inversion${inversions !== 1 ? 's' : ''}`)
    if (regressions > 0) parts.push(`${regressions} regression${regressions !== 1 ? 's' : ''}`)
    if (bottlenecks > 0) parts.push(`${bottlenecks} bottleneck${bottlenecks !== 1 ? 's' : ''}`)
    return `${cascadeRisks.length} risk${cascadeRisks.length !== 1 ? 's' : ''} detected: ${parts.join(', ')}.`
  }, [hasData, cascadeRisks])

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Summary banner */}
      <div className={`${isPhone ? 'px-3 py-2' : 'px-4 py-2'} bg-[#1a1a1e]/90 border-b border-[#333]/60`}>
        <div className="flex items-center justify-between">
          <p className={`text-xs ${cascadeRisks.length > 0 ? 'text-orange-300' : 'text-green-400'}`}>
            {summaryText}
          </p>
          {cascadeRisks.length > 0 && !isPhone && (
            <button
              onClick={() => setShowPanel(p => !p)}
              className="text-[10px] text-gray-500 hover:text-gray-300 px-2 py-1 min-h-[44px] flex items-center"
            >
              {showPanel ? 'Hide Panel' : 'Show Panel'}
            </button>
          )}
        </div>
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
          nodeChildrenFn={nodeChildrenFn}
          edgeStyleFn={edgeStyleFn}
          title="RISK MONITOR"
          footer={cascadeRisks.length > 0
            ? 'Click a domain to see its risks'
            : snapshots.length === 0
              ? 'Save snapshots to enable trend tracking'
              : 'All clear \u2014 no risks detected'
          }
        />

        {/* Risk panel */}
        <AnimatePresence>
          {showPanel && cascadeRisks.length > 0 && (
            <RiskPanel
              risks={cascadeRisks}
              domainScoreHistory={domainScoreHistory}
              selectedRisk={selectedRisk}
              onSelectRisk={setSelectedRisk}
              onNavigateToAssess={onNavigateToAssess}
              onClose={() => setShowPanel(false)}
              isBottomSheet={isPhone}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
})
