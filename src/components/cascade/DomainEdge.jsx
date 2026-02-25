import { memo } from 'react'

/**
 * DomainEdge — A single edge (arrow) between two domain nodes.
 *
 * Props:
 *   from        — { x, y }
 *   to          — { x, y }
 *   edge        — { from, to, type }
 *   dims        — { nodeH }
 *   style       — { stroke, opacity, width, dash }
 *   annotation  — string text to show at edge midpoint (e.g., "Limits D4")
 */
export default memo(function DomainEdge({
  from,
  to,
  edge,
  dims,
  style = {},
  annotation,
}) {
  if (!from || !to) return null

  const { nodeH } = dims
  const stroke = style.stroke || '#556'
  const opacity = style.opacity ?? 0.4
  const lineWidth = style.width || 1.5
  const dash = style.dash || (edge.type === 'secondary' ? '6,4' : 'none')

  // Compute path
  let d
  const isPrimary = edge.type === 'primary'
  if (isPrimary) {
    d = `M${from.x},${from.y - nodeH / 2} L${to.x},${to.y + nodeH / 2}`
  } else {
    const midY = (from.y - nodeH / 2 + to.y + nodeH / 2) / 2
    const curveX = from.x + (to.x - from.x) * 0.5 + (edge.from === 'd2' ? -50 : 50)
    d = `M${from.x},${from.y - nodeH / 2} Q${curveX},${midY} ${to.x},${to.y + nodeH / 2}`
  }

  // Annotation midpoint
  const midX = (from.x + to.x) / 2 + (isPrimary ? 0 : (edge.from === 'd2' ? -25 : 25))
  const midY = (from.y - nodeH / 2 + to.y + nodeH / 2) / 2

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={lineWidth}
        opacity={opacity}
        strokeDasharray={dash}
        strokeLinecap="round"
        markerEnd={`url(#arrow-${stroke === '#ff4444' ? 'red' : stroke === '#ffd700' ? 'gold' : stroke === '#ff8800' ? 'orange' : 'default'})`}
      />
      {annotation && (
        <g>
          <rect
            x={midX - annotation.length * 3.2}
            y={midY - 8}
            width={annotation.length * 6.4}
            height={16}
            rx={4}
            fill="#1a1a1e"
            stroke="#444"
            strokeWidth={0.5}
            opacity={0.9}
          />
          <text
            x={midX}
            y={midY + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={stroke}
            fontSize="8"
            fontFamily="monospace"
            fontWeight="600"
          >{annotation}</text>
        </g>
      )}
    </g>
  )
})
