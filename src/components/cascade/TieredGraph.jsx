import { memo, useMemo, useCallback, useState, useRef } from 'react'
import DomainNode from './DomainNode.jsx'
import DomainEdge from './DomainEdge.jsx'

/**
 * TieredGraph — Shared SVG tiered graph renderer.
 *
 * Pure visualization: renders nodes + edges at fixed positions.
 * Each view passes its own styling/annotation callbacks.
 *
 * Props:
 *   nodes        — from useCascadeGraph
 *   edges        — from useCascadeGraph
 *   positions    — { [nodeId]: { x, y } } from useTieredPositions
 *   dims         — { width, height, nodeW, nodeH, fontSize, subFontSize }
 *   isPhone      — boolean
 *   onNodeClick  — (nodeId) => void
 *   nodeStyleFn  — (node) => { fill, stroke, textColor } | null
 *   nodeHighlightFn — (node) => 'bottleneck' | 'selected' | 'dimmed' | null
 *   nodeBadgesFn — (node) => [{ text, color, bg }]
 *   edgeStyleFn  — (edge) => { stroke, opacity, width, dash }
 *   edgeAnnotationFn — (edge) => string | null
 *   nodeChildrenFn   — (node, pos) => SVG elements to render inside node
 *   title        — string to show at top of graph
 *   footer       — string to show at bottom of graph
 *   svgDefs      — additional SVG <defs> content
 *   children     — additional SVG elements rendered after nodes
 */
export default memo(function TieredGraph({
  nodes,
  edges,
  positions,
  dims,
  isPhone = false,
  onNodeClick,
  nodeStyleFn,
  nodeHighlightFn,
  nodeBadgesFn,
  edgeStyleFn,
  edgeAnnotationFn,
  nodeChildrenFn,
  title,
  footer,
  svgDefs,
  children,
}) {
  const { width, height, nodeW, nodeH } = dims
  const [tooltip, setTooltip] = useState(null)
  const tooltipTimerRef = useRef(null)

  const showTooltip = useCallback((e, node) => {
    const rect = e.currentTarget.closest('svg')?.getBoundingClientRect()
    if (!rect) return
    const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left
    const y = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top
    setTooltip({ x, y, node })
    if (isPhone) {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
      tooltipTimerRef.current = setTimeout(() => setTooltip(null), 3000)
    }
  }, [isPhone])

  const hideTooltip = useCallback(() => setTooltip(null), [])

  // Edge paths
  const edgePaths = useMemo(() => {
    return edges.map((edge) => {
      const from = positions[edge.from]
      const to = positions[edge.to]
      if (!from || !to) return null
      return { edge, from, to }
    }).filter(Boolean)
  }, [edges, positions])

  return (
    <div className="flex-1 overflow-auto relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        className="mx-auto block"
        style={{ maxWidth: width, background: 'linear-gradient(180deg, #1a1a1e 0%, #1e1e24 50%, #1a1a1e 100%)' }}
      >
        <defs>
          {/* Arrow markers */}
          <marker id="arrow-default" viewBox="0 0 8 6" refX="7" refY="3" markerWidth="8" markerHeight="6" orient="auto">
            <path d="M0,0.5 L7,3 L0,5.5" fill="#556" />
          </marker>
          <marker id="arrow-red" viewBox="0 0 8 6" refX="7" refY="3" markerWidth="9" markerHeight="7" orient="auto">
            <path d="M0,0.5 L7,3 L0,5.5" fill="#ff4444" />
          </marker>
          <marker id="arrow-gold" viewBox="0 0 8 6" refX="7" refY="3" markerWidth="9" markerHeight="7" orient="auto">
            <path d="M0,0.5 L7,3 L0,5.5" fill="#ffd700" />
          </marker>
          <marker id="arrow-orange" viewBox="0 0 8 6" refX="7" refY="3" markerWidth="9" markerHeight="7" orient="auto">
            <path d="M0,0.5 L7,3 L0,5.5" fill="#ff8800" />
          </marker>
          <marker id="arrow-green" viewBox="0 0 8 6" refX="7" refY="3" markerWidth="8" markerHeight="6" orient="auto">
            <path d="M0,0.5 L7,3 L0,5.5" fill="#7fb589" />
          </marker>
          <marker id="arrow-blue" viewBox="0 0 8 6" refX="7" refY="3" markerWidth="9" markerHeight="7" orient="auto">
            <path d="M0,0.5 L7,3 L0,5.5" fill="#6889b5" />
          </marker>

          <style>{`
            .domain-node { transition: opacity 0.2s ease; }
            .domain-node:hover rect:first-of-type { filter: brightness(1.15); }
          `}</style>

          {svgDefs}
        </defs>

        {/* Subtle grid background */}
        <g opacity="0.04">
          {Array.from({ length: Math.ceil(width / 40) }, (_, i) => (
            <line key={`v${i}`} x1={i * 40} y1={0} x2={i * 40} y2={height} stroke="#fff" strokeWidth="0.5" />
          ))}
          {Array.from({ length: Math.ceil(height / 40) }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 40} x2={width} y2={i * 40} stroke="#fff" strokeWidth="0.5" />
          ))}
        </g>

        {/* Title */}
        {title && (
          <text
            x={width / 2} y={28}
            textAnchor="middle" fill="#888"
            fontSize="11" fontFamily="monospace" letterSpacing="2"
          >{title}</text>
        )}

        {/* Tier labels */}
        <g>
          <text x={15} y={height - (isPhone ? 38 : 58)} fill="#444" fontSize="9" fontFamily="monospace">FOUNDATION</text>
          <text x={15} y={height - (isPhone ? 38 : 58) - 6 * dims.tierSpacing} fill="#444" fontSize="9" fontFamily="monospace">HIGHEST ORDER</text>
        </g>

        {/* Edges */}
        <g>
          {edgePaths.map(({ edge, from, to }) => (
            <DomainEdge
              key={`${edge.from}-${edge.to}`}
              from={from}
              to={to}
              edge={edge}
              dims={dims}
              style={edgeStyleFn?.(edge)}
              annotation={edgeAnnotationFn?.(edge)}
            />
          ))}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map((node) => {
            const pos = positions[node.id]
            if (!pos) return null
            return (
              <g key={node.id} className="domain-node">
                <DomainNode
                  node={node}
                  pos={pos}
                  dims={dims}
                  style={nodeStyleFn?.(node)}
                  highlight={nodeHighlightFn?.(node)}
                  badges={nodeBadgesFn?.(node) || []}
                  onClick={onNodeClick}
                  onHover={showTooltip}
                  onHoverEnd={hideTooltip}
                  isPhone={isPhone}
                >
                  {nodeChildrenFn?.(node, pos)}
                </DomainNode>
              </g>
            )
          })}
        </g>

        {/* Footer text */}
        {footer && (
          <text
            x={width / 2} y={height - 16}
            textAnchor="middle"
            fill="#888" fontSize="10" fontFamily="monospace"
          >{footer}</text>
        )}

        {/* Additional SVG content from views */}
        {children}
      </svg>

      {/* Tooltip (HTML overlay) */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-[#1e1e24]/95 border border-[#444] rounded-lg px-3 py-2 text-xs z-10 shadow-xl backdrop-blur-sm"
          style={{
            left: Math.min(tooltip.x + 10, (width || 400) - 180),
            top: Math.max(tooltip.y - 80, 10),
            maxWidth: 220,
          }}
        >
          <div className="text-gray-200 font-medium">{tooltip.node.name}</div>
          <div className="text-gray-400 mt-0.5">
            D{tooltip.node.domain} · {tooltip.node.state}
          </div>
          {tooltip.node.assessed > 0 && (
            <div className="text-gray-400">
              Score: {tooltip.node.avg.toFixed(1)}/3 · {tooltip.node.assessed}/{tooltip.node.total} assessed
            </div>
          )}
          {tooltip.node.leverageScore > 0 && (
            <div className="text-gray-500 mt-0.5">
              Leverage: {tooltip.node.leverageScore.toFixed(1)} · Unlocks {tooltip.node.downstreamSkills} skills
            </div>
          )}
        </div>
      )}
    </div>
  )
})
