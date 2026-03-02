import { useMemo, useEffect, useRef, useState, useCallback, memo } from 'react'
import { framework } from '../../data/framework.js'
import { getDomainFromId, getSubAreaFromId } from '../../data/skillDependencies.js'
import { getSkillDescription } from '../../data/skillDescriptions.js'
import { getBehavioralIndicator } from '../../data/behavioralIndicators.js'
import { getSkillCeiling, computeSkillInfluence } from '../../data/skillInfluence.js'
import { generateSkillNarrative } from '../../lib/narratives.js'
import useResponsive from '../../hooks/useResponsive.js'
import ExplorerTooltip from './ExplorerTooltip.jsx'
import { DOMAIN_COLORS } from '../../constants/colors.js'
import { ASSESSMENT_COLORS, ASSESSMENT_LABELS, isAssessed } from '../../data/framework.js'

function getStatusColor(level) {
  if (!isAssessed(level)) return '#666'
  return ASSESSMENT_COLORS[level] ?? '#666'
}

function getStatusLabel(level) {
  if (!isAssessed(level)) return 'Not Assessed'
  return ASSESSMENT_LABELS[level] ?? 'Unknown'
}

/** Get edge color based on whether prerequisite is met */
function getEdgeColor(met, fromLevel) {
  if (fromLevel === null || fromLevel === undefined) return '#555'
  if (met) return '#4ade80' // green
  if (fromLevel >= 1) return '#fbbf24' // amber
  return '#f87171' // red
}

/** Compute forward cascade from a skill through the graph */
function computeForwardCascade(skillId, edges, maxHops = 3) {
  const result = new Map() // skillId → { distance, met }
  const queue = [{ id: skillId, distance: 0 }]
  const visited = new Set([skillId])

  while (queue.length > 0) {
    const { id, distance } = queue.shift()
    if (distance >= maxHops) continue

    edges.forEach(edge => {
      if (edge.from === id && !visited.has(edge.to)) {
        visited.add(edge.to)
        result.set(edge.to, { distance: distance + 1, met: edge.met })
        queue.push({ id: edge.to, distance: distance + 1 })
      }
    })
  }

  return result
}

// Layout constants
const NODE_W = 200
const NODE_H = 48
const SAT_W = 160
const SAT_H = 36
const TIER_GAP = 60
const ROW_GAP = 16
const PADDING = 30
const SAT_MARGIN = 80

/**
 * SkillExplorerView — Level 3 "Skill Constellation" view.
 * Shows all skills in a sub-area as a connected graph with assessment-aware edges.
 * Cross-domain prerequisites/dependents shown as satellite nodes.
 */
export default memo(function SkillExplorerView({
  explorer,
  focusSkillId,
  focusSubAreaId,
  assessments,
  onRecenterSkill,
  onDrillToSkill,
  onCrossNavigate,
  onNavigateBack,
  navHistoryDepth = 0,
}) {
  const { isPhone } = useResponsive()
  const containerRef = useRef(null)
  const [selectedSkillId, setSelectedSkillId] = useState(focusSkillId || null)
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: null })

  // Get the full skill graph for this sub-area
  const graphData = useMemo(() => {
    if (!focusSubAreaId) return { nodes: [], edges: [], satellites: [] }
    return explorer.getSubAreaSkillGraph(focusSubAreaId)
  }, [focusSubAreaId, explorer])

  // Auto-select focusSkillId when it changes (e.g. from cross-domain nav)
  useEffect(() => {
    if (focusSkillId && graphData.nodes.some(n => n.id === focusSkillId)) {
      setSelectedSkillId(focusSkillId)
    }
  }, [focusSkillId, graphData.nodes])

  // Forward cascade from selected skill
  const cascadeMap = useMemo(() => {
    if (!selectedSkillId) return new Map()
    // Build combined edge list (local + cross-domain)
    return computeForwardCascade(selectedSkillId, graphData.edges)
  }, [selectedSkillId, graphData.edges])

  // Layout: group local nodes by tier
  const { nodeLayout, satUpLayout, satDownLayout, svgWidth, svgHeight } = useMemo(() => {
    const { nodes, satellites } = graphData
    if (nodes.length === 0) return { nodeLayout: [], satUpLayout: [], satDownLayout: [], svgWidth: 400, svgHeight: 300 }

    // Group by tier
    const tiers = {}
    nodes.forEach(n => {
      const t = n.tier || 1
      if (!tiers[t]) tiers[t] = []
      tiers[t].push(n)
    })
    const tierKeys = Object.keys(tiers).map(Number).sort((a, b) => a - b)

    // Compute column positions
    const layout = []
    let maxY = 0
    tierKeys.forEach((tier, colIdx) => {
      const x = PADDING + SAT_MARGIN + SAT_W + TIER_GAP + colIdx * (NODE_W + TIER_GAP)
      tiers[tier].forEach((node, rowIdx) => {
        const y = PADDING + rowIdx * (NODE_H + ROW_GAP)
        layout.push({ ...node, x, y, tier })
        maxY = Math.max(maxY, y)
      })
    })

    // Satellite layout — upstream on far left, downstream on far right
    const upSats = satellites.filter(s => s.direction === 'upstream')
    const downSats = satellites.filter(s => s.direction === 'downstream')

    const satUpX = PADDING
    const satDownX = PADDING + SAT_MARGIN + SAT_W + TIER_GAP + tierKeys.length * (NODE_W + TIER_GAP)

    const satUp = upSats.map((s, i) => ({
      ...s,
      x: satUpX,
      y: PADDING + i * (SAT_H + ROW_GAP),
    }))

    const satDown = downSats.map((s, i) => ({
      ...s,
      x: satDownX,
      y: PADDING + i * (SAT_H + ROW_GAP),
    }))

    const allMaxY = Math.max(
      maxY + NODE_H,
      satUp.length > 0 ? satUp[satUp.length - 1].y + SAT_H : 0,
      satDown.length > 0 ? satDown[satDown.length - 1].y + SAT_H : 0,
      300
    )

    const width = satDownX + SAT_W + PADDING
    const height = allMaxY + PADDING + 10

    return { nodeLayout: layout, satUpLayout: satUp, satDownLayout: satDown, svgWidth: width, svgHeight: height }
  }, [graphData])

  // Build position lookup for edge drawing
  const positionMap = useMemo(() => {
    const map = {}
    nodeLayout.forEach(n => { map[n.id] = { x: n.x, y: n.y, w: NODE_W, h: NODE_H } })
    satUpLayout.forEach(n => { map[n.id] = { x: n.x, y: n.y, w: SAT_W, h: SAT_H } })
    satDownLayout.forEach(n => { map[n.id] = { x: n.x, y: n.y, w: SAT_W, h: SAT_H } })
    return map
  }, [nodeLayout, satUpLayout, satDownLayout])

  const handleNodeHover = useCallback((e, node) => {
    const domainName = framework.find(d => d.id === node.domainId)?.name || ''
    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      content: (
        <div>
          <div className="font-medium">{node.name}</div>
          <div className="text-gray-300 mt-0.5">{domainName} · {node.subAreaName || ''}</div>
          <div className="text-gray-400 mt-1">Tier {node.tier} · {getStatusLabel(node.level)}</div>
          {node.readiness && !node.readiness.ready && (
            <div className="text-amber-400 mt-1 text-[10px]">
              {node.readiness.unmetDirect?.length || 0} unmet prerequisites
            </div>
          )}
          {node.downstreamCount > 0 && (
            <div className="text-blue-300 text-[10px]">Unlocks {node.downstreamCount} skills</div>
          )}
          <div className="text-gray-500 mt-1 text-[10px]">
            {node.isCrossDomain ? 'Click to navigate' : 'Click for details'}
          </div>
        </div>
      ),
    })
  }, [])

  const handleNodeLeave = useCallback(() => {
    setTooltip(t => ({ ...t, visible: false }))
  }, [])

  const handleNodeClick = useCallback((node) => {
    if (node.isCrossDomain && onCrossNavigate) {
      onCrossNavigate(node)
    } else {
      setSelectedSkillId(prev => prev === node.id ? null : node.id)
    }
  }, [onCrossNavigate])

  // Build clickable ceiling narrative for a skill node
  const renderCeilingNarrative = useCallback((nodeId, textClass = 'text-xs') => {
    if (!assessments) return null
    const ceilingData = getSkillCeiling(nodeId, assessments)
    if (!ceilingData) return null
    const skillLevel = assessments[nodeId]
    if (skillLevel == null) return null
    const limiting = ceilingData.constrainingPrereqs.filter(p => p.imposedCeiling < 3)
    if (limiting.length === 0) return null
    const top = limiting[0]
    const prereqName = framework.flatMap(d => d.subAreas.flatMap(sa => sa.skillGroups.flatMap(sg => sg.skills))).find(s => s.id === top.id)?.name || top.id
    const prereqLabel = top.level != null ? ASSESSMENT_LABELS[top.level] : 'Not Assessed'
    const ceilingLabel = ASSESSMENT_LABELS[ceilingData.ceiling] || `${ceilingData.ceiling}`
    const prereqSubArea = getSubAreaFromId(top.id)
    const isLocal = prereqSubArea === focusSubAreaId
    const handlePrereqClick = () => {
      if (isLocal) {
        setSelectedSkillId(top.id)
      } else if (onCrossNavigate) {
        const domainId = getDomainFromId(top.id)
        const domain = framework.find(d => d.id === domainId)
        onCrossNavigate({ id: top.id, domainId, domainName: domain?.name, subAreaId: prereqSubArea })
      }
    }
    const prereqBtn = (
      <button
        onClick={handlePrereqClick}
        className="underline underline-offset-2 decoration-blue-400 text-blue-400 hover:text-blue-300 font-medium transition-colors not-italic cursor-pointer"
      >
        {prereqName}
      </button>
    )
    const skillName = framework.flatMap(d => d.subAreas.flatMap(sa => sa.skillGroups.flatMap(sg => sg.skills))).find(s => s.id === nodeId)?.name || nodeId
    if (skillLevel > ceilingData.ceiling) {
      return (
        <p className={`${textClass} text-amber-500/70 italic mt-1`}>
          {skillName} is rated above its ceiling ({ASSESSMENT_LABELS[skillLevel]} vs {ceilingLabel}).{' '}
          {prereqBtn} at {prereqLabel} is the limiting factor.
        </p>
      )
    }
    if (ceilingData.ceiling < 3) {
      return (
        <p className={`${textClass} text-amber-500/70 italic mt-1`}>
          Capped at {ceilingLabel} by {prereqBtn} ({prereqLabel}).{' '}
          Improving <span className="font-medium not-italic">{prereqName}</span> would raise this ceiling.
        </p>
      )
    }
    return null
  }, [assessments, focusSubAreaId, onCrossNavigate])

  // Selected skill detail data
  const selectedDetail = useMemo(() => {
    if (!selectedSkillId) return null
    const node = graphData.nodes.find(n => n.id === selectedSkillId)
    if (!node) return null
    const desc = getSkillDescription(selectedSkillId)
    const downstreamInGraph = graphData.edges.filter(e => e.from === selectedSkillId)
    const upstreamInGraph = graphData.edges.filter(e => e.to === selectedSkillId)
    const totalCascade = cascadeMap.size
    const blockedCount = [...cascadeMap.values()].filter(c => !c.met).length
    return { node, desc, downstreamInGraph, upstreamInGraph, totalCascade, blockedCount }
  }, [selectedSkillId, graphData, cascadeMap])

  // Fallback: no sub-area selected
  if (!focusSubAreaId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        Select a sub-area to explore its skills
      </div>
    )
  }

  // Empty sub-area
  if (graphData.nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        No skills found in this sub-area
      </div>
    )
  }

  // Sub-area info for header
  const saNode = graphData.nodes[0]
  const subAreaColor = DOMAIN_COLORS[saNode?.domainId] || '#888'

  // ─── Phone Layout: Tier-grouped cards ───
  if (isPhone) {
    // Group by tier
    const tiers = {}
    graphData.nodes.forEach(n => {
      const t = n.tier || 1
      if (!tiers[t]) tiers[t] = []
      tiers[t].push(n)
    })
    const tierKeys = Object.keys(tiers).map(Number).sort((a, b) => a - b)

    return (
      <div ref={containerRef} className="flex-1 overflow-auto p-4 relative">
        {/* Sub-area header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: subAreaColor }} />
          <div>
            <div className="text-xs font-semibold text-gray-300">{saNode?.subAreaName}</div>
            <div className="text-[10px] text-gray-500">{saNode?.domainName} · {graphData.nodes.length} skills</div>
          </div>
        </div>

        {/* Cross-domain upstream satellites */}
        {graphData.satellites.filter(s => s.direction === 'upstream').length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Cross-Domain Prerequisites
            </div>
            <div className="space-y-1.5">
              {graphData.satellites.filter(s => s.direction === 'upstream').map(sat => (
                <SatelliteCard key={sat.id} skill={sat} onNavigate={onCrossNavigate} />
              ))}
            </div>
          </div>
        )}

        {/* Tier-grouped local skills */}
        {tierKeys.map(tier => (
          <div key={tier} className="mb-4">
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Tier {tier}
            </div>
            <div className="space-y-1.5">
              {tiers[tier].map(node => (
                <SkillCard
                  key={node.id}
                  node={node}
                  isSelected={selectedSkillId === node.id}
                  cascadeInfo={cascadeMap.get(node.id)}
                  selectedSkillId={selectedSkillId}
                  edges={graphData.edges}
                  onSelect={() => handleNodeClick(node)}
                  onCrossNavigate={onCrossNavigate}
                  graphData={graphData}
                  assessments={assessments}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Cross-domain downstream satellites */}
        {graphData.satellites.filter(s => s.direction === 'downstream').length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Cross-Domain Dependents
            </div>
            <div className="space-y-1.5">
              {graphData.satellites.filter(s => s.direction === 'downstream').map(sat => (
                <SatelliteCard key={sat.id} skill={sat} onNavigate={onCrossNavigate} />
              ))}
            </div>
          </div>
        )}

        {/* Detail panel */}
        {selectedDetail && (
          <DetailPanel detail={selectedDetail} cascadeMap={cascadeMap} graphData={graphData} assessments={assessments} />
        )}

        <ExplorerTooltip
          x={tooltip.x}
          y={tooltip.y}
          content={tooltip.content}
          visible={tooltip.visible}
          containerRef={containerRef}
        />
      </div>
    )
  }

  // ─── Desktop/Tablet: SVG Constellation ───
  return (
    <div ref={containerRef} className="flex-1 overflow-auto flex flex-col relative">
      {/* Sub-area header */}
      <div className="flex items-center gap-2 px-5 pt-3 pb-1">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: subAreaColor }} />
        <div>
          <span className="text-xs font-semibold text-gray-300">{saNode?.subAreaName}</span>
          <span className="text-[10px] text-gray-500 ml-2">{saNode?.domainName} · {graphData.nodes.length} skills</span>
        </div>
        <p className="text-[10px] text-gray-600 ml-auto">
          Click a skill for details. Edge colors show prerequisite status.
        </p>
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full"
        style={{ maxHeight: Math.max(svgHeight, 400) }}
      >
        <defs>
          <marker id="edge-arrow-met" viewBox="0 0 6 6" refX={5} refY={3} markerWidth={5} markerHeight={5} orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#4ade80" />
          </marker>
          <marker id="edge-arrow-unmet" viewBox="0 0 6 6" refX={5} refY={3} markerWidth={5} markerHeight={5} orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#f87171" />
          </marker>
          <marker id="edge-arrow-partial" viewBox="0 0 6 6" refX={5} refY={3} markerWidth={5} markerHeight={5} orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#fbbf24" />
          </marker>
          <marker id="edge-arrow-unknown" viewBox="0 0 6 6" refX={5} refY={3} markerWidth={5} markerHeight={5} orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#555" />
          </marker>
        </defs>

        {/* Tier column labels */}
        {(() => {
          const tiers = new Set(nodeLayout.map(n => n.tier))
          return [...tiers].sort((a, b) => a - b).map(tier => {
            const firstInTier = nodeLayout.find(n => n.tier === tier)
            if (!firstInTier) return null
            return (
              <text
                key={`tier-${tier}`}
                x={firstInTier.x + NODE_W / 2}
                y={12}
                textAnchor="middle"
                fill="#666"
                fontSize={9}
                fontWeight={600}
              >
                TIER {tier}
              </text>
            )
          })
        })()}

        {/* Satellite labels */}
        {satUpLayout.length > 0 && (
          <text x={PADDING + SAT_W / 2} y={12} textAnchor="middle" fill="#666" fontSize={9} fontWeight={600}>
            PREREQUISITES
          </text>
        )}
        {satDownLayout.length > 0 && (
          <text x={satDownLayout[0].x + SAT_W / 2} y={12} textAnchor="middle" fill="#666" fontSize={9} fontWeight={600}>
            DEPENDENTS
          </text>
        )}

        {/* Edges */}
        {graphData.edges.map((edge, i) => {
          const from = positionMap[edge.from]
          const to = positionMap[edge.to]
          if (!from || !to) return null

          const x1 = from.x + from.w
          const y1 = from.y + from.h / 2
          const x2 = to.x
          const y2 = to.y + to.h / 2

          const cx1 = x1 + (x2 - x1) * 0.35
          const cx2 = x2 - (x2 - x1) * 0.35
          const path = `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`

          const color = getEdgeColor(edge.met, edge.fromLevel)
          const markerEnd = edge.met ? 'url(#edge-arrow-met)'
            : (edge.fromLevel !== null && edge.fromLevel >= 1) ? 'url(#edge-arrow-partial)'
            : edge.fromLevel === null ? 'url(#edge-arrow-unknown)'
            : 'url(#edge-arrow-unmet)'

          // Thickness: 1-3px based on downstream importance
          const fromNode = graphData.nodes.find(n => n.id === edge.from) ||
                           graphData.satellites.find(n => n.id === edge.from)
          const downCount = fromNode?.downstreamCount || 1
          const thickness = Math.min(3, 1 + downCount * 0.3)

          // Highlight: dim edges not connected to selected skill
          const isRelated = !selectedSkillId ||
            edge.from === selectedSkillId ||
            edge.to === selectedSkillId ||
            cascadeMap.has(edge.to)
          const opacity = isRelated ? 0.7 : 0.15

          return (
            <path
              key={`edge-${i}`}
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={thickness}
              strokeDasharray={edge.crossDomain ? '6 3' : undefined}
              opacity={opacity}
              markerEnd={markerEnd}
              className="transition-opacity duration-200"
            />
          )
        })}

        {/* Local skill nodes */}
        {nodeLayout.map(node => {
          const isSelected = selectedSkillId === node.id
          const cascadeInfo = cascadeMap.get(node.id)
          const statusColor = getStatusColor(node.level)
          const domainColor = DOMAIN_COLORS[node.domainId] || '#888'
          const fillOpacity = isAssessed(node.level) ? 0.15 + (node.level / 3) * 0.35 : 0.05

          // Cascade tint
          let cascadeTint = null
          if (cascadeInfo && selectedSkillId) {
            const selectedNode = graphData.nodes.find(n => n.id === selectedSkillId)
            const selectedLevel = selectedNode?.level
            const attenuation = Math.pow(0.7, cascadeInfo.distance - 1)
            if (selectedLevel !== null && selectedLevel !== undefined) {
              cascadeTint = selectedLevel >= 2
                ? `rgba(74, 222, 128, ${0.12 * attenuation})` // green
                : `rgba(248, 113, 113, ${0.12 * attenuation})` // red
            }
          }

          // Readiness arc (outer ring)
          const readinessPct = node.readiness?.readiness ?? 1
          const readinessColor = readinessPct >= 1 ? '#4ade80' : readinessPct >= 0.5 ? '#fbbf24' : '#f87171'

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              className="cursor-pointer"
              onMouseEnter={(e) => handleNodeHover(e, node)}
              onMouseLeave={handleNodeLeave}
              onTouchStart={(e) => { e.preventDefault(); handleNodeHover(e.touches[0], node) }}
              onClick={() => handleNodeClick(node)}
            >
              {/* Cascade tint overlay */}
              {cascadeTint && (
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={8}
                  fill={cascadeTint}
                />
              )}

              {/* Background */}
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={8}
                fill={isSelected ? '#1a2a3a' : '#0f172a'}
                stroke={isSelected ? '#f59e0b' : statusColor}
                strokeWidth={isSelected ? 2 : 1}
                opacity={0.95}
              />

              {/* Fill bar (assessment level) */}
              {isAssessed(node.level) && (
                <rect
                  x={0}
                  y={0}
                  width={NODE_W * (node.level / 3)}
                  height={NODE_H}
                  rx={8}
                  fill={statusColor}
                  opacity={fillOpacity}
                />
              )}

              {/* Readiness indicator — left border */}
              <rect
                x={0}
                y={0}
                width={4}
                height={NODE_H * readinessPct}
                fill={readinessColor}
                rx={2}
                opacity={0.8}
              />

              {/* Domain color dot */}
              <circle cx={14} cy={NODE_H / 2} r={5} fill={domainColor} />

              {/* Skill name */}
              <text x={24} y={17} fill="#e5e5e5" fontSize={10} fontWeight={isSelected ? 600 : 500}>
                {node.name.length > 22 ? node.name.slice(0, 20) + '\u2026' : node.name}
              </text>

              {/* Domain · Tier · Status */}
              <text x={24} y={32} fill="#888" fontSize={8}>
                <tspan fill={domainColor}>{node.domainName?.split(' ')[0] || ''}</tspan>
                {' · T'}{node.tier}{' · '}
                <tspan fill={statusColor}>{getStatusLabel(node.level)}</tspan>
              </text>

              {/* Downstream count badge */}
              {node.downstreamCount > 0 && (
                <g transform={`translate(${NODE_W - 22}, 4)`}>
                  <rect width={18} height={14} rx={7} fill="#1e3a5f" stroke="#3b82f6" strokeWidth={0.5} />
                  <text x={9} y={10} textAnchor="middle" fill="#93c5fd" fontSize={8} fontWeight={600}>
                    {node.downstreamCount}
                  </text>
                </g>
              )}

              {/* Pulse animation for intervention opportunities */}
              {node.readiness?.ready && isAssessed(node.level) && node.level < 2 && (
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={8}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth={1.5}
                  opacity={0.6}
                  className="animate-pulse"
                />
              )}
            </g>
          )
        })}

        {/* Upstream satellite nodes */}
        {satUpLayout.map(sat => {
          const domainColor = DOMAIN_COLORS[sat.domainId] || '#888'
          const statusColor = getStatusColor(sat.level)
          return (
            <g
              key={`sat-up-${sat.id}`}
              transform={`translate(${sat.x}, ${sat.y})`}
              className="cursor-pointer"
              onMouseEnter={(e) => handleNodeHover(e, sat)}
              onMouseLeave={handleNodeLeave}
              onTouchStart={(e) => { e.preventDefault(); handleNodeHover(e.touches[0], sat) }}
              onClick={() => handleNodeClick(sat)}
            >
              <rect
                width={SAT_W}
                height={SAT_H}
                rx={6}
                fill="#0d1117"
                stroke={domainColor + '80'}
                strokeWidth={1}
                strokeDasharray="4 2"
              />
              <circle cx={10} cy={SAT_H / 2} r={4} fill={domainColor} />
              <text x={18} y={13} fill="#aaa" fontSize={8} fontWeight={500}>
                {sat.name.length > 18 ? sat.name.slice(0, 16) + '\u2026' : sat.name}
              </text>
              <text x={18} y={26} fill="#666" fontSize={7}>
                <tspan fill={domainColor}>{sat.domainName?.split(' ')[0] || ''}</tspan>
                {' · '}<tspan fill={statusColor}>{getStatusLabel(sat.level)}</tspan>
              </text>
              {/* Navigate arrow */}
              <text x={SAT_W - 14} y={SAT_H / 2 + 3} fill="#666" fontSize={10}>{'\u2192'}</text>
            </g>
          )
        })}

        {/* Downstream satellite nodes */}
        {satDownLayout.map(sat => {
          const domainColor = DOMAIN_COLORS[sat.domainId] || '#888'
          const statusColor = getStatusColor(sat.level)
          return (
            <g
              key={`sat-down-${sat.id}`}
              transform={`translate(${sat.x}, ${sat.y})`}
              className="cursor-pointer"
              onMouseEnter={(e) => handleNodeHover(e, sat)}
              onMouseLeave={handleNodeLeave}
              onTouchStart={(e) => { e.preventDefault(); handleNodeHover(e.touches[0], sat) }}
              onClick={() => handleNodeClick(sat)}
            >
              <rect
                width={SAT_W}
                height={SAT_H}
                rx={6}
                fill="#0d1117"
                stroke={domainColor + '80'}
                strokeWidth={1}
                strokeDasharray="4 2"
              />
              <circle cx={10} cy={SAT_H / 2} r={4} fill={domainColor} />
              <text x={18} y={13} fill="#aaa" fontSize={8} fontWeight={500}>
                {sat.name.length > 18 ? sat.name.slice(0, 16) + '\u2026' : sat.name}
              </text>
              <text x={18} y={26} fill="#666" fontSize={7}>
                <tspan fill={domainColor}>{sat.domainName?.split(' ')[0] || ''}</tspan>
                {' · '}<tspan fill={statusColor}>{getStatusLabel(sat.level)}</tspan>
              </text>
              <text x={SAT_W - 14} y={SAT_H / 2 + 3} fill="#666" fontSize={10}>{'\u2192'}</text>
            </g>
          )
        })}
      </svg>

      {/* Detail panel below graph */}
      {selectedDetail && (
        <DetailPanel detail={selectedDetail} cascadeMap={cascadeMap} graphData={graphData} assessments={assessments} />
      )}

      <ExplorerTooltip
        x={tooltip.x}
        y={tooltip.y}
        content={tooltip.content}
        visible={tooltip.visible}
        containerRef={containerRef}
      />
    </div>
  )
})

/** Detail panel shown below graph when a skill is selected */
function DetailPanel({ detail, cascadeMap, graphData, assessments }) {
  const { node, desc, downstreamInGraph, upstreamInGraph, totalCascade, blockedCount } = detail
  const statusColor = getStatusColor(node.level)
  const domainColor = DOMAIN_COLORS[node.domainId] || '#888'
  const ceilingData = useMemo(() => getSkillCeiling(node.id, assessments || {}), [node.id, assessments])

  return (
    <div className="border-t border-gray-800 bg-gray-900/80 px-5 py-4">
      <div className="flex items-start gap-3">
        {/* Left: skill info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: domainColor }} />
            <h4 className="text-sm font-semibold text-gray-100 truncate">{node.name}</h4>
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ backgroundColor: statusColor + '20', color: statusColor }}
            >
              {getStatusLabel(node.level)}
            </span>
          </div>
          <div className="text-[10px] text-gray-500 mb-2">
            {node.domainName} · {node.subAreaName} · Tier {node.tier}
          </div>

          {/* Description */}
          {desc && (
            <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">{desc.description}</p>
          )}
          {/* Behavioral indicator */}
          {isAssessed(node.level) && (() => {
            const indicator = getBehavioralIndicator(node.id, node.level)
            if (!indicator) return null
            return (
              <p
                className="text-[11px] leading-relaxed mb-2 px-2 py-1.5 rounded"
                style={{ backgroundColor: statusColor + '15', borderLeft: `3px solid ${statusColor}` }}
              >
                <span className="font-medium" style={{ color: statusColor }}>{getStatusLabel(node.level)}:</span>{' '}
                <span className="text-gray-300">{indicator}</span>
              </p>
            )
          })()}
          {/* Skill & ceiling narratives */}
          {(() => {
            const skillNarr = generateSkillNarrative(node.id, assessments?.[node.id])
            return skillNarr ? <p className="text-xs text-gray-400 italic mt-2">{skillNarr}</p> : null
          })()}
          {renderCeilingNarrative(node.id, 'text-xs')}
        </div>

        {/* Right: readiness + impact */}
        <div className="w-48 flex-shrink-0 space-y-2">
          {/* Readiness */}
          <div className="bg-gray-800 rounded-lg px-3 py-2">
            <div className="text-[10px] font-semibold text-gray-400 mb-1">Prerequisites</div>
            {node.readiness?.prereqCount === 0 ? (
              <div className="text-[10px] text-green-400">Foundational — no prerequisites</div>
            ) : (
              <>
                <div className="text-[10px] text-gray-300">
                  {node.readiness.prereqCount - (node.readiness.unmetDirect?.length || 0) - (node.readiness.unmetStructural?.length || 0)} of {node.readiness.prereqCount} met
                </div>
                {node.readiness.unmetDirect?.length > 0 && (
                  <div className="text-[10px] text-red-400 mt-0.5">
                    Unmet: {node.readiness.unmetDirect.length} direct
                  </div>
                )}
                {/* Readiness bar */}
                <div className="w-full h-1 bg-gray-700 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(node.readiness.readiness ?? 0) * 100}%`,
                      backgroundColor: (node.readiness.readiness ?? 0) >= 1 ? '#4ade80' : (node.readiness.readiness ?? 0) >= 0.5 ? '#fbbf24' : '#f87171',
                    }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Ceiling constraint */}
          {ceilingData && (
            <div className="bg-gray-800 rounded-lg px-3 py-2">
              <div className="text-[10px] font-semibold text-gray-400 mb-1">Skill Ceiling</div>
              <div className="text-[10px] text-gray-300">
                Max: <span className="font-semibold" style={{
                  color: ceilingData.ceiling >= 3 ? '#4ade80' : ceilingData.ceiling >= 2 ? '#fbbf24' : '#f87171'
                }}>
                  {ASSESSMENT_LABELS[ceilingData.ceiling]}
                </span>
              </div>
              {ceilingData.ceiling < 3 && ceilingData.constrainingPrereqs[0] && (
                <div className="text-[10px] text-amber-400/80 mt-0.5">
                  Limited by prerequisite at {ASSESSMENT_LABELS[ceilingData.constrainingPrereqs[0].level ?? 0]}
                </div>
              )}
              {isAssessed(node.level) && node.level > ceilingData.ceiling && (
                <div className="text-[10px] text-red-400 mt-0.5 font-medium">
                  &#9888; Rated above ceiling — may be fragile
                </div>
              )}
            </div>
          )}

          {/* Downstream impact */}
          <div className="bg-gray-800 rounded-lg px-3 py-2">
            <div className="text-[10px] font-semibold text-gray-400 mb-1">Downstream Impact</div>
            {totalCascade === 0 ? (
              <div className="text-[10px] text-gray-500">End-of-chain skill</div>
            ) : (
              <div className="text-[10px] text-gray-300">
                Affects <span className="font-semibold text-blue-300">{totalCascade}</span> downstream skills
                {isAssessed(node.level) && node.level < 2 && blockedCount > 0 && (
                  <span className="text-red-400 ml-1">· blocking {blockedCount}</span>
                )}
                {isAssessed(node.level) && node.level >= 2 && (
                  <span className="text-green-400 ml-1">· enabling</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Phone card for a local skill */
function SkillCard({ node, isSelected, cascadeInfo, selectedSkillId, edges, onSelect, onCrossNavigate, graphData, assessments }) {
  const statusColor = getStatusColor(node.level)
  const domainColor = DOMAIN_COLORS[node.domainId] || '#888'
  const readinessPct = Math.round((node.readiness?.readiness ?? 1) * 100)
  const desc = isSelected ? getSkillDescription(node.id) : null
  const ceilingData = useMemo(() => isSelected ? getSkillCeiling(node.id, assessments || {}) : null, [isSelected, node.id, assessments])

  // Cascade tint class
  let cascadeBorder = ''
  if (cascadeInfo && selectedSkillId) {
    const selectedNode = graphData.nodes.find(n => n.id === selectedSkillId)
    if (selectedNode?.level !== null && selectedNode?.level !== undefined) {
      cascadeBorder = selectedNode.level >= 2
        ? 'border-green-500/30'
        : 'border-red-500/30'
    }
  }

  return (
    <div>
      <button
        onClick={onSelect}
        className={`w-full flex items-center gap-2.5 bg-gray-900 border rounded-lg px-3 py-2 text-left transition-colors min-h-[44px] ${
          isSelected
            ? 'border-amber-500/60 bg-gray-800'
            : cascadeBorder || 'border-gray-800 hover:border-gray-600'
        }`}
      >
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-200 truncate">{node.name}</div>
          <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
            <span style={{ color: domainColor }}>{node.domainName?.split(' ')[0]}</span>
            <span>T{node.tier}</span>
            <span style={{ color: statusColor }}>{getStatusLabel(node.level)}</span>
            {node.readiness && !node.readiness.ready && (
              <span className="text-amber-400">{readinessPct}% ready</span>
            )}
            {node.downstreamCount > 0 && (
              <span className="text-blue-400">{'\u2192'}{node.downstreamCount}</span>
            )}
          </div>
        </div>
        <svg className={`w-4 h-4 text-gray-600 flex-shrink-0 transition-transform ${isSelected ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Expanded detail */}
      {isSelected && (
        <div className="bg-gray-800 rounded-b-lg px-3 py-3 -mt-1 border border-t-0 border-amber-500/30 space-y-2">
          {desc && (
            <p className="text-[11px] text-gray-400 leading-relaxed">{desc.description}</p>
          )}
          {/* Behavioral indicator */}
          {isAssessed(node.level) && (() => {
            const indicator = getBehavioralIndicator(node.id, node.level)
            if (!indicator) return null
            return (
              <p className="text-[11px] leading-relaxed px-2 py-1.5 rounded"
                style={{ backgroundColor: statusColor + '15', borderLeft: `3px solid ${statusColor}` }}>
                <span className="font-medium" style={{ color: statusColor }}>{getStatusLabel(node.level)}:</span>{' '}
                <span className="text-gray-300">{indicator}</span>
              </p>
            )
          })()}
          {/* Readiness */}
          {node.readiness?.prereqCount > 0 && (
            <div className="text-[10px]">
              <span className="text-gray-500">Prerequisites: </span>
              <span className={node.readiness.ready ? 'text-green-400' : 'text-amber-400'}>
                {node.readiness.prereqCount - (node.readiness.unmetDirect?.length || 0)} of {node.readiness.prereqCount} met
              </span>
            </div>
          )}
          {/* Downstream */}
          {node.downstreamCount > 0 && (
            <div className="text-[10px] text-gray-400">
              Affects {node.downstreamCount} downstream skills
            </div>
          )}
          {/* Ceiling */}
          {ceilingData && (
            <div className="text-[10px]">
              <span className="text-gray-500">Ceiling: </span>
              <span style={{ color: ceilingData.ceiling >= 3 ? '#4ade80' : ceilingData.ceiling >= 2 ? '#fbbf24' : '#f87171' }}>
                {ASSESSMENT_LABELS[ceilingData.ceiling]}
              </span>
              {isAssessed(node.level) && node.level > ceilingData.ceiling && (
                <span className="text-red-400 ml-1">&#9888; above ceiling</span>
              )}
            </div>
          )}
          {/* Skill & ceiling narratives */}
          {(() => {
            const skillNarr = generateSkillNarrative(node.id, assessments?.[node.id])
            return skillNarr ? <p className="text-[10px] text-gray-400 italic">{skillNarr}</p> : null
          })()}
          {renderCeilingNarrative(node.id, 'text-[10px]')}
          {/* Cross-domain connections */}
          {graphData.satellites.filter(s => s.linkedLocalSkillId === node.id).map(sat => (
            <button
              key={sat.id}
              onClick={() => onCrossNavigate?.(sat)}
              className="flex items-center gap-2 text-[10px] text-gray-400 hover:text-white transition-colors min-h-[32px]"
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DOMAIN_COLORS[sat.domainId] }} />
              <span>{sat.direction === 'upstream' ? '\u2190' : '\u2192'} {sat.name}</span>
              <span className="text-gray-600">({sat.domainName?.split(' ')[0]})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Phone card for a cross-domain satellite skill */
function SatelliteCard({ skill, onNavigate }) {
  const domainColor = DOMAIN_COLORS[skill.domainId] || '#888'
  const statusColor = getStatusColor(skill.level)

  return (
    <button
      onClick={() => onNavigate?.(skill)}
      className="w-full flex items-center gap-2.5 bg-gray-900/60 border border-dashed border-gray-700 rounded-lg px-3 py-2 text-left hover:border-gray-500 transition-colors min-h-[44px]"
    >
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: domainColor }} />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-300 truncate">{skill.name}</div>
        <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
          <span style={{ color: domainColor }}>{skill.domainName?.split(' ')[0]}</span>
          <span>{skill.subAreaName}</span>
          <span style={{ color: statusColor }}>{getStatusLabel(skill.level)}</span>
        </div>
      </div>
      <span className="text-[10px] text-gray-600">{'\u2192'} Navigate</span>
    </button>
  )
}
