import { useMemo, useRef, useState, useCallback, memo } from 'react'
import { framework } from '../../data/framework.js'
import { getDomainFromId } from '../../data/skillDependencies.js'
import useResponsive from '../../hooks/useResponsive.js'
import ExplorerTooltip from './ExplorerTooltip.jsx'

const DOMAIN_COLORS = {
  d1: '#e07b6e', d2: '#d4956a', d3: '#c9a84c', d4: '#8fb570',
  d5: '#5da87a', d6: '#4a9e9e', d7: '#6889b5', d8: '#8b7bb5', d9: '#a86e9a',
}

// Cascade depth ordering for column assignment
const DOMAIN_COLUMN = {
  d1: 0, d2: 1, d3: 2, d4: 3, d5: 4, d6: 5, d7: 6, d8: 3, d9: 4,
}

const NODE_W = 160
const NODE_H = 52
const COL_GAP = 190
const ROW_GAP = 20
const PADDING = 40

/**
 * SubAreaWebView — Level 2 of the Dependency Explorer.
 * Tier-layered DAG showing sub-area dependencies with domain coloring.
 */
export default memo(function SubAreaWebView({
  explorer,
  filterDomainId,
  assessments,
  onDrillToSubArea,
  onDrillToSkill,
  onDrillToDomain,
}) {
  const { isPhone } = useResponsive()
  const containerRef = useRef(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: null })

  const graphData = useMemo(
    () => explorer.getSubAreaGraph(filterDomainId),
    [explorer, filterDomainId]
  )

  // Compute layout positions: group nodes by domain column, stack vertically
  const { nodePositions, svgWidth, svgHeight } = useMemo(() => {
    const { nodes } = graphData
    if (nodes.length === 0) return { nodePositions: {}, svgWidth: 400, svgHeight: 300 }

    // Group nodes by column (domain cascade depth)
    const columns = {}
    nodes.forEach(node => {
      const col = DOMAIN_COLUMN[node.domainId] ?? 3
      if (!columns[col]) columns[col] = []
      columns[col].push(node)
    })

    // Sort within columns: by domain name, then sub-area index
    Object.values(columns).forEach(colNodes => {
      colNodes.sort((a, b) => {
        if (a.domainId !== b.domainId) return (DOMAIN_COLUMN[a.domainId] ?? 0) - (DOMAIN_COLUMN[b.domainId] ?? 0)
        return a.id.localeCompare(b.id)
      })
    })

    // Assign x,y positions
    const positions = {}
    const usedCols = Object.keys(columns).map(Number).sort((a, b) => a - b)
    const colIndexMap = Object.fromEntries(usedCols.map((c, i) => [c, i]))

    let maxY = 0
    usedCols.forEach(col => {
      const colIdx = colIndexMap[col]
      const x = PADDING + colIdx * (NODE_W + COL_GAP)
      columns[col].forEach((node, rowIdx) => {
        const y = PADDING + rowIdx * (NODE_H + ROW_GAP)
        positions[node.id] = { x, y, node }
        maxY = Math.max(maxY, y)
      })
    })

    const width = PADDING * 2 + usedCols.length * (NODE_W + COL_GAP) - COL_GAP
    const height = maxY + NODE_H + PADDING

    return { nodePositions: positions, svgWidth: width, svgHeight: height }
  }, [graphData])

  // Edge paths
  const edgePaths = useMemo(() => {
    const { edges } = graphData
    return edges.map(edge => {
      const from = nodePositions[edge.from]
      const to = nodePositions[edge.to]
      if (!from || !to) return null

      const x1 = from.x + NODE_W
      const y1 = from.y + NODE_H / 2
      const x2 = to.x
      const y2 = to.y + NODE_H / 2

      // Bezier curve
      const cx1 = x1 + (x2 - x1) * 0.4
      const cx2 = x2 - (x2 - x1) * 0.4
      const path = `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`

      return { ...edge, path, x1, y1, x2, y2 }
    }).filter(Boolean)
  }, [graphData, nodePositions])

  const handleNodeHover = useCallback((e, node) => {
    setHoveredNode(node.id)
    const healthPct = Math.round(node.healthPct * 100)
    const readinessPct = Math.round(node.readiness * 100)
    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      content: (
        <div>
          <div className="font-medium">{node.name}</div>
          <div className="text-gray-300">{node.domainName}</div>
          <div className="text-gray-400 mt-1">{healthPct}% health · {readinessPct}% ready</div>
          <div className="text-gray-500">{node.assessed}/{node.total} assessed</div>
          <div className="text-gray-500 mt-1 text-[10px]">Click to see skills</div>
        </div>
      ),
    })
  }, [])

  const handleNodeLeave = useCallback(() => {
    setHoveredNode(null)
    setTooltip(t => ({ ...t, visible: false }))
  }, [])

  const handleNodeClick = useCallback((node) => {
    onDrillToSubArea(node.id)
  }, [onDrillToSubArea])

  // Connected edges for highlight
  const connectedEdges = useMemo(() => {
    if (!hoveredNode) return new Set()
    const set = new Set()
    graphData.edges.forEach(e => {
      if (e.from === hoveredNode || e.to === hoveredNode) {
        set.add(`${e.from}->${e.to}`)
      }
    })
    return set
  }, [hoveredNode, graphData.edges])

  const connectedNodes = useMemo(() => {
    if (!hoveredNode) return new Set()
    const set = new Set([hoveredNode])
    graphData.edges.forEach(e => {
      if (e.from === hoveredNode) set.add(e.to)
      if (e.to === hoveredNode) set.add(e.from)
    })
    return set
  }, [hoveredNode, graphData.edges])

  // Phone: vertical card layout
  if (isPhone) {
    // Group nodes by domain
    const byDomain = {}
    graphData.nodes.forEach(node => {
      if (!byDomain[node.domainId]) byDomain[node.domainId] = []
      byDomain[node.domainId].push(node)
    })

    return (
      <div ref={containerRef} className="flex-1 overflow-auto p-4 relative">
        <div className="mb-3">
          <p className="text-[11px] text-gray-500">
            Lines show which sub-areas must develop before others can progress.
            <span className="text-gray-400 font-medium"> Tap any sub-area to see its skills.</span>
          </p>
        </div>

        {graphData.nodes.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">No sub-area data available</div>
        )}

        {Object.entries(byDomain).map(([domainId, nodes]) => {
          const domain = framework.find(d => d.id === domainId)
          const color = DOMAIN_COLORS[domainId]
          return (
            <div key={domainId} className="mb-4">
              <button
                onClick={() => onDrillToDomain(domainId)}
                className="flex items-center gap-2 mb-2 min-h-[32px]"
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs font-semibold text-gray-300">{domain?.name}</span>
              </button>
              <div className="space-y-2 pl-1">
                {nodes.map(node => {
                  const healthPct = Math.round(node.healthPct * 100)
                  const readinessPct = Math.round(node.readiness * 100)
                  return (
                    <button
                      key={node.id}
                      onClick={() => handleNodeClick(node)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-left hover:border-gray-600 transition-colors min-h-[44px]"
                      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-gray-200 truncate mr-2">{node.name}</span>
                        <span className="text-[10px] text-gray-500 flex-shrink-0">{node.skillCount} skills</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px]">
                        <span className="text-gray-400">Health {healthPct}%</span>
                        <span className={`${node.ready ? 'text-green-400' : 'text-amber-400'}`}>
                          {node.ready ? 'Ready' : `${readinessPct}% ready`}
                        </span>
                      </div>
                      {/* Health bar */}
                      <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(2, healthPct)}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Desktop/Tablet: SVG DAG
  return (
    <div ref={containerRef} className="flex-1 overflow-auto relative">
      <div className="px-5 pt-3 pb-1">
        <p className="text-[11px] text-gray-500">
          Each box is a sub-area. Lines show prerequisite relationships between them.
          <span className="text-gray-400 font-medium"> Click any sub-area to explore its individual skills.</span>
          {' '}Hover to highlight connections.
        </p>
      </div>
      {graphData.nodes.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">No sub-area data available</div>
      ) : (
        <svg
          width="100%"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full"
        >
          {/* Edges */}
          {edgePaths.map((edge, i) => {
            const edgeKey = `${edge.from}->${edge.to}`
            const isHighlighted = hoveredNode === null || connectedEdges.has(edgeKey)
            const fromDomain = getDomainFromId(edge.from)
            const color = DOMAIN_COLORS[fromDomain] || '#666'

            return (
              <path
                key={i}
                d={edge.path}
                fill="none"
                stroke={color}
                strokeWidth={isHighlighted ? 1.5 : 0.5}
                strokeDasharray={edge.crossDomain ? undefined : '4 2'}
                opacity={isHighlighted ? 0.6 : 0.12}
                className="transition-all duration-200"
                markerEnd={`url(#arrow-${fromDomain})`}
              />
            )
          })}

          {/* Arrow markers at edge targets */}
          <defs>
            {Object.entries(DOMAIN_COLORS).map(([id, color]) => (
              <marker
                key={id}
                id={`arrow-${id}`}
                viewBox="0 0 6 6"
                refX={5}
                refY={3}
                markerWidth={5}
                markerHeight={5}
                orient="auto"
              >
                <path d="M 0 0 L 6 3 L 0 6 z" fill={color} />
              </marker>
            ))}
          </defs>

          {/* Nodes */}
          {Object.entries(nodePositions).map(([saId, { x, y, node }]) => {
            const color = DOMAIN_COLORS[node.domainId] || '#888'
            const isHovered = hoveredNode === saId
            const isConnected = hoveredNode === null || connectedNodes.has(saId)
            const healthPct = Math.round(node.healthPct * 100)

            return (
              <g
                key={saId}
                transform={`translate(${x}, ${y})`}
                className="cursor-pointer"
                onMouseEnter={(e) => handleNodeHover(e, node)}
                onMouseLeave={handleNodeLeave}
                onTouchStart={(e) => { e.preventDefault(); handleNodeHover(e.touches[0], node) }}
                onClick={() => handleNodeClick(node)}
              >
                {/* Background */}
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={10}
                  fill={isHovered ? '#1e293b' : '#0f172a'}
                  stroke={isHovered ? color : (isConnected ? color + '60' : '#1e293b')}
                  strokeWidth={isHovered ? 2 : 1}
                  opacity={isConnected ? 1 : 0.3}
                  className="transition-all duration-200"
                />

                {/* Domain color left border */}
                <rect
                  x={0}
                  y={0}
                  width={4}
                  height={NODE_H}
                  rx={2}
                  fill={color}
                  opacity={isConnected ? 1 : 0.3}
                />

                {/* Sub-area name */}
                <text
                  x={12}
                  y={20}
                  fill={isConnected ? '#e5e5e5' : '#666'}
                  fontSize={10}
                  fontWeight={500}
                  className="transition-all duration-200"
                >
                  {node.name.length > 20 ? node.name.slice(0, 18) + '\u2026' : node.name}
                </text>

                {/* Health % + readiness */}
                <text x={12} y={35} fill="#888" fontSize={9}>
                  {healthPct}% health
                  {!node.ready && (
                    <tspan fill="#f59e0b"> · prereqs needed</tspan>
                  )}
                </text>

                {/* Health bar */}
                <rect x={12} y={42} width={NODE_W - 24} height={4} rx={2} fill="#1e293b" />
                <rect
                  x={12}
                  y={42}
                  width={Math.max(2, (NODE_W - 24) * node.healthPct)}
                  height={4}
                  rx={2}
                  fill={color}
                  opacity={0.8}
                />
              </g>
            )
          })}
        </svg>
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
