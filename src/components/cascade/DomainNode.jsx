import { memo } from 'react'

const DOMAIN_COLORS = {
  d1: '#e07b6e', d2: '#d4956a', d3: '#c9a84c', d4: '#8fb570',
  d5: '#5da87a', d6: '#4a9e9e', d7: '#6889b5', d8: '#8b7bb5', d9: '#a86e9a',
}

const STATE_CONFIG = {
  locked:       { fill: '#2a2a2a', stroke: '#444',    textColor: '#888',    label: 'Locked' },
  blocked:      { fill: '#3a2020', stroke: '#8b4444', textColor: '#ccc',    label: 'Blocked' },
  'needs-work': { fill: '#3a2525', stroke: '#e8928a', textColor: '#f5c4c0', label: 'Needs Work' },
  developing:   { fill: '#3a3520', stroke: '#e5b76a', textColor: '#f5e0b0', label: 'Developing' },
  mastered:     { fill: '#1e3525', stroke: '#7fb589', textColor: '#b5e8bf', label: 'Mastered' },
}

/**
 * DomainNode — A single domain node in the tiered SVG graph.
 *
 * Props:
 *   node       — { id, name, domain, state, avg, assessed, total, healthPct, independent }
 *   pos        — { x, y }
 *   dims       — { nodeW, nodeH, fontSize, subFontSize }
 *   style      — override { fill, stroke, textColor } or null for default
 *   highlight  — 'bottleneck' | 'selected' | 'dimmed' | null
 *   badges     — [{ text, color }] to render above node
 *   onClick    — (nodeId) => void
 *   onHover    — (event, node) => void
 *   onHoverEnd — () => void
 *   isPhone    — boolean
 *   children   — additional SVG elements to render inside the node group
 */
export default memo(function DomainNode({
  node,
  pos,
  dims,
  style: overrideStyle,
  highlight,
  badges = [],
  onClick,
  onHover,
  onHoverEnd,
  isPhone = false,
  children,
}) {
  const { nodeW, nodeH, fontSize, subFontSize } = dims
  const domainColor = DOMAIN_COLORS[node.id] || '#888'
  const config = STATE_CONFIG[node.state] || STATE_CONFIG.locked
  const hasData = node.assessed > 0

  const style = overrideStyle || {
    fill: config.fill,
    stroke: config.stroke,
    textColor: config.textColor,
  }

  const opacity = highlight === 'dimmed' ? 0.35 : 1
  const strokeWidth = highlight === 'bottleneck' || highlight === 'selected' ? 2.5 : 1.5

  return (
    <g
      style={{ cursor: 'pointer', opacity }}
      tabIndex={0}
      role="button"
      aria-label={`${node.name}: ${hasData ? node.avg.toFixed(1) + '/3' : 'Not assessed'}`}
      onClick={() => onClick?.(node.id)}
      onMouseEnter={(e) => onHover?.(e, node)}
      onMouseMove={(e) => onHover?.(e, node)}
      onMouseLeave={() => onHoverEnd?.()}
      onTouchStart={(e) => {
        onHover?.(e, node)
        onClick?.(node.id)
      }}
    >
      {/* Invisible expanded hit area for phone touch */}
      {isPhone && (
        <rect
          x={pos.x - nodeW / 2 - 4} y={pos.y - nodeH / 2 - 4}
          width={nodeW + 8} height={nodeH + 8}
          fill="transparent"
        />
      )}

      {/* Badges above node */}
      {badges.map((badge, i) => (
        <g key={i}>
          <rect
            x={pos.x - 40} y={pos.y - nodeH / 2 - 20 - i * 20}
            width={80} height={16} rx={8}
            fill={badge.bg || '#3a2020'} stroke={badge.color} strokeWidth={1}
            opacity={0.9}
          />
          <text
            x={pos.x} y={pos.y - nodeH / 2 - 12 - i * 20}
            textAnchor="middle" dominantBaseline="middle"
            fill={badge.color} fontSize="8" fontWeight="700" fontFamily="monospace"
          >{badge.text}</text>
        </g>
      ))}

      {/* INDEPENDENT badge */}
      {node.independent && badges.length === 0 && (
        <>
          <rect
            x={pos.x - 38} y={pos.y - nodeH / 2 - 16}
            width={76} height={14} rx={7}
            fill="#444" opacity={0.6}
          />
          <text
            x={pos.x} y={pos.y - nodeH / 2 - 9}
            textAnchor="middle" dominantBaseline="middle"
            fill="#999" fontSize="8" fontWeight="700" fontFamily="monospace"
          >INDEPENDENT</text>
        </>
      )}

      {/* Node rect */}
      <rect
        x={pos.x - nodeW / 2} y={pos.y - nodeH / 2}
        width={nodeW} height={nodeH}
        rx={isPhone ? 8 : 10}
        fill={style.fill}
        stroke={highlight === 'bottleneck' ? '#ff8800' : style.stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={node.independent ? '6,4' : 'none'}
        opacity={node.independent ? 0.7 : 1}
      />

      {/* Domain color accent — left edge strip */}
      {hasData && (
        <rect
          x={pos.x - nodeW / 2 + 1}
          y={pos.y - nodeH / 2 + 4}
          width={3}
          height={nodeH - 8}
          rx={1.5}
          fill={domainColor}
          opacity={0.6}
          pointerEvents="none"
        />
      )}

      {/* Domain number badge */}
      <circle
        cx={pos.x - nodeW / 2 + (isPhone ? 14 : 18)}
        cy={pos.y}
        r={isPhone ? 10 : 12}
        fill={domainColor}
        opacity={0.5}
        pointerEvents="none"
      />
      <text
        x={pos.x - nodeW / 2 + (isPhone ? 14 : 18)}
        y={pos.y + 1}
        textAnchor="middle" dominantBaseline="middle"
        fill="#fff"
        fontSize={isPhone ? 9 : 11} fontWeight="700" fontFamily="monospace"
        opacity={0.9}
        pointerEvents="none"
      >{node.domain}</text>

      {/* Domain name */}
      <text
        x={pos.x + 6}
        y={pos.y - (hasData ? (isPhone ? 8 : 12) : (isPhone ? 4 : 7))}
        textAnchor="middle"
        fill={style.textColor}
        fontSize={fontSize} fontWeight="600"
        fontFamily="Plus Jakarta Sans, Inter, sans-serif"
        pointerEvents="none"
      >{node.name}</text>

      {/* Score + assessed count */}
      {hasData && (
        <text
          x={pos.x + 6}
          y={pos.y + 2}
          textAnchor="middle"
          fill={style.textColor}
          fontSize={subFontSize} fontWeight="600"
          fontFamily="monospace"
          opacity={0.9}
          pointerEvents="none"
        >{node.avg.toFixed(1)}/3 · {node.assessed}/{node.total}</text>
      )}

      {/* State label */}
      <text
        x={pos.x + 6}
        y={pos.y + (hasData ? (isPhone ? 12 : 14) : (isPhone ? 10 : 12))}
        textAnchor="middle"
        fill={style.textColor}
        fontSize={isPhone ? 7 : subFontSize}
        opacity={0.6}
        fontFamily="Inter, sans-serif"
        pointerEvents="none"
      >{node.independent ? 'Independent' : hasData ? config.label : node.subtitle}</text>

      {/* Health bar */}
      {hasData && (
        <>
          <rect
            x={pos.x - nodeW / 2 + 4}
            y={pos.y + nodeH / 2 - 5}
            width={nodeW - 8} height={3} rx={1.5}
            fill="#1a1a1e"
            pointerEvents="none"
          />
          <rect
            x={pos.x - nodeW / 2 + 4}
            y={pos.y + nodeH / 2 - 5}
            width={(nodeW - 8) * (node.healthPct || 0)}
            height={3} rx={1.5}
            fill={domainColor}
            opacity={0.7}
            pointerEvents="none"
          />
        </>
      )}

      {/* Per-view children (badges, overlays, etc.) */}
      {children}
    </g>
  )
})

export { DOMAIN_COLORS, STATE_CONFIG }
