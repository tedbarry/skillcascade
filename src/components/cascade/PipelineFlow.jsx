import { memo, useMemo, useCallback, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useResponsive from '../../hooks/useResponsive.js'

const DOMAIN_COLORS = {
  d1: '#e07b6e', d2: '#d4956a', d3: '#c9a84c', d4: '#8fb570',
  d5: '#5da87a', d6: '#4a9e9e', d7: '#6889b5', d8: '#8b7bb5', d9: '#a86e9a',
}

// Main chain order (dependencies flow left to right)
const CHAIN_ORDER = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7']
const INDEPENDENT = ['d8', 'd9']

const MAX_PIPE = 72
const MIN_PIPE = 14

/**
 * PipelineFlow — Horizontal (or vertical on phone) pipeline SVG.
 * Pipe thickness at each segment = domain health.
 * Bottleneck = dramatic constriction.
 *
 * Props:
 *   nodes          — from useCascadeGraph
 *   bottleneckId   — domainId of the identified bottleneck
 *   cascadeState   — { active, source, affected }
 *   isMasteryCascade — boolean
 *   onSegmentClick — (domainId) => void
 */
export default memo(function PipelineFlow({
  nodes,
  bottleneckId = null,
  cascadeState = { active: false, source: null, affected: {} },
  isMasteryCascade = false,
  onSegmentClick,
}) {
  const { isPhone } = useResponsive()
  const [tooltip, setTooltip] = useState(null)
  const svgRef = useRef(null)

  // Get node by id
  const nodeMap = useMemo(() => {
    const map = {}
    nodes.forEach(n => { map[n.id] = n })
    return map
  }, [nodes])

  // Compute pipe heights for each chain domain
  const pipeHeights = useMemo(() => {
    const heights = {}
    CHAIN_ORDER.forEach(id => {
      const node = nodeMap[id]
      if (!node) return
      const pct = node.assessed > 0 ? node.healthPct : 0.3
      heights[id] = MIN_PIPE + pct * (MAX_PIPE - MIN_PIPE)
    })
    return heights
  }, [nodeMap])

  // SVG dimensions
  const segmentWidth = isPhone ? 60 : 100
  const gapWidth = isPhone ? 20 : 30
  const totalChainWidth = CHAIN_ORDER.length * segmentWidth + (CHAIN_ORDER.length - 1) * gapWidth
  const svgWidth = isPhone ? MAX_PIPE + 60 : totalChainWidth + 80
  const svgHeight = isPhone ? totalChainWidth + 120 : MAX_PIPE + 140

  // Build path for pipe — smooth transitions between segments
  const buildPipePath = useCallback((isTop) => {
    if (isPhone) {
      // Vertical: top-to-bottom
      return CHAIN_ORDER.map((id, i) => {
        const h = pipeHeights[id] || MIN_PIPE
        const halfH = h / 2
        const x = svgWidth / 2
        const y = 40 + i * (segmentWidth + gapWidth)
        const sign = isTop ? -1 : 1

        if (i === 0) {
          return `M${x + sign * halfH},${y}`
        }
        const prevH = pipeHeights[CHAIN_ORDER[i - 1]] || MIN_PIPE
        const prevHalfH = prevH / 2
        const prevY = 40 + (i - 1) * (segmentWidth + gapWidth) + segmentWidth

        // Bezier from prev segment end to this segment start
        const cpY = prevY + gapWidth / 2
        return `C${x + sign * prevHalfH},${cpY} ${x + sign * halfH},${cpY} ${x + sign * halfH},${y}`
      }).join(' ') + (() => {
        const lastId = CHAIN_ORDER[CHAIN_ORDER.length - 1]
        const lastH = pipeHeights[lastId] || MIN_PIPE
        const sign = isTop ? -1 : 1
        const x = svgWidth / 2
        const y = 40 + (CHAIN_ORDER.length - 1) * (segmentWidth + gapWidth) + segmentWidth
        return ` L${x + sign * (lastH / 2)},${y}`
      })()
    }

    // Horizontal: left-to-right
    return CHAIN_ORDER.map((id, i) => {
      const h = pipeHeights[id] || MIN_PIPE
      const halfH = h / 2
      const x = 40 + i * (segmentWidth + gapWidth)
      const y = svgHeight / 2
      const sign = isTop ? -1 : 1

      if (i === 0) {
        return `M${x},${y + sign * halfH}`
      }
      const prevH = pipeHeights[CHAIN_ORDER[i - 1]] || MIN_PIPE
      const prevHalfH = prevH / 2
      const prevX = 40 + (i - 1) * (segmentWidth + gapWidth) + segmentWidth

      const cpX = prevX + gapWidth / 2
      return `C${cpX},${y + sign * prevHalfH} ${cpX},${y + sign * halfH} ${x},${y + sign * halfH}`
    }).join(' ') + (() => {
      const lastId = CHAIN_ORDER[CHAIN_ORDER.length - 1]
      const lastH = pipeHeights[lastId] || MIN_PIPE
      const sign = isTop ? -1 : 1
      const x = 40 + (CHAIN_ORDER.length - 1) * (segmentWidth + gapWidth) + segmentWidth
      const y = svgHeight / 2
      return ` L${x},${y + sign * (lastH / 2)}`
    })()
  }, [pipeHeights, isPhone, svgWidth, svgHeight, segmentWidth, gapWidth])

  // Build combined closed path for the pipe fill
  const pipeFillPath = useMemo(() => {
    const top = buildPipePath(true)
    // Build bottom path reversed
    const bottomReversed = [...CHAIN_ORDER].reverse().map((id, i) => {
      const origIdx = CHAIN_ORDER.length - 1 - i
      const h = pipeHeights[id] || MIN_PIPE
      const halfH = h / 2

      if (isPhone) {
        const x = svgWidth / 2
        const y = 40 + origIdx * (segmentWidth + gapWidth) + (i === 0 ? segmentWidth : 0)

        if (i === 0) return `L${x + halfH},${y}`
        const prevId = CHAIN_ORDER[origIdx + 1]
        const prevH = pipeHeights[prevId] || MIN_PIPE
        const prevY = 40 + (origIdx + 1) * (segmentWidth + gapWidth)
        const cpY = prevY - gapWidth / 2
        return `C${x + prevH / 2},${cpY} ${x + halfH},${cpY} ${x + halfH},${y}`
      }

      const y = svgHeight / 2
      const x = 40 + origIdx * (segmentWidth + gapWidth) + (i === 0 ? segmentWidth : 0)

      if (i === 0) return `L${x},${y + halfH}`
      const prevId = CHAIN_ORDER[origIdx + 1]
      const prevH = pipeHeights[prevId] || MIN_PIPE
      const prevX = 40 + (origIdx + 1) * (segmentWidth + gapWidth)
      const cpX = prevX - gapWidth / 2
      return `C${cpX},${y + prevH / 2} ${cpX},${y + halfH} ${x},${y + halfH}`
    }).join(' ')

    return `${top} ${bottomReversed} Z`
  }, [buildPipePath, pipeHeights, isPhone, svgWidth, svgHeight, segmentWidth, gapWidth])

  const handleTooltip = useCallback((e, node) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left
    const y = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top
    setTooltip({ x, y, node })
  }, [])

  return (
    <div className="flex-1 overflow-auto relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width="100%"
        className="mx-auto block"
        style={{
          maxWidth: svgWidth,
          background: 'linear-gradient(180deg, #1a1a1e 0%, #1e1e24 50%, #1a1a1e 100%)',
        }}
      >
        <defs>
          {/* Bottleneck glow filter */}
          <filter id="bottleneck-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="1 0.3 0 0 0  0.3 0.15 0 0 0  0 0 0 0 0  0 0 0 0.6 0" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Cascade glow */}
          <filter id="cascade-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Pipe fill — base shape */}
        <path
          d={pipeFillPath}
          fill="#2a2a33"
          stroke="#444"
          strokeWidth="1"
        />

        {/* Colored overlays per segment */}
        {CHAIN_ORDER.map((id, i) => {
          const node = nodeMap[id]
          if (!node) return null
          const color = DOMAIN_COLORS[id] || '#888'
          const h = pipeHeights[id] || MIN_PIPE
          const halfH = h / 2
          const isBottleneck = id === bottleneckId
          const isCascadeSource = cascadeState.active && cascadeState.source === id
          const isCascadeAffected = cascadeState.active && cascadeState.affected[id]
          const impactStrength = isCascadeAffected ? cascadeState.affected[id].impactStrength : 0

          let fillColor = color
          let fillOpacity = node.assessed > 0 ? 0.15 + node.healthPct * 0.35 : 0.08

          if (isCascadeSource) {
            fillColor = isMasteryCascade ? '#ffd700' : '#ff4444'
            fillOpacity = 0.5
          } else if (isCascadeAffected) {
            fillColor = isMasteryCascade ? '#ffd700' : '#ff4444'
            fillOpacity = 0.15 + impactStrength * 0.4
          } else if (cascadeState.active) {
            fillOpacity = 0.05
          }

          const x = isPhone ? svgWidth / 2 - halfH : 40 + i * (segmentWidth + gapWidth)
          const y = isPhone ? 40 + i * (segmentWidth + gapWidth) : svgHeight / 2 - halfH
          const w = isPhone ? h : segmentWidth
          const segH = isPhone ? segmentWidth : h

          return (
            <g key={id}>
              <rect
                x={x} y={y} width={w} height={segH}
                rx={4}
                fill={fillColor}
                opacity={fillOpacity}
                filter={isBottleneck && !cascadeState.active ? 'url(#bottleneck-glow)' : (isCascadeSource || isCascadeAffected) ? 'url(#cascade-glow)' : undefined}
                className="cursor-pointer"
                onClick={() => onSegmentClick?.(id)}
                onMouseEnter={(e) => handleTooltip(e, node)}
                onTouchStart={(e) => handleTooltip(e, node)}
                onMouseLeave={() => setTooltip(null)}
              />

              {/* Bottleneck pulsing border */}
              {isBottleneck && !cascadeState.active && (
                <rect
                  x={x} y={y} width={w} height={segH}
                  rx={4}
                  fill="none"
                  stroke="#ff8800"
                  strokeWidth="2"
                  opacity="0.8"
                >
                  <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />
                </rect>
              )}
            </g>
          )
        })}

        {/* Labels */}
        {CHAIN_ORDER.map((id, i) => {
          const node = nodeMap[id]
          if (!node) return null
          const color = DOMAIN_COLORS[id] || '#888'
          const isBottleneck = id === bottleneckId
          const isCascadeSource = cascadeState.active && cascadeState.source === id
          const isCascadeAffected = cascadeState.active && cascadeState.affected[id]
          const impactPct = isCascadeAffected ? Math.round(cascadeState.affected[id].impactStrength * 100) : 0

          if (isPhone) {
            const x = svgWidth / 2
            const y = 40 + i * (segmentWidth + gapWidth) + segmentWidth / 2
            return (
              <g key={`label-${id}`}>
                {/* Domain name (left of pipe) */}
                <text x={8} y={y - 4} fill="#ccc" fontSize="10" fontFamily="sans-serif" fontWeight="600">
                  D{node.domain}
                </text>
                <text x={8} y={y + 8} fill="#888" fontSize="8" fontFamily="sans-serif">
                  {node.avg > 0 ? `${node.avg.toFixed(1)}/3` : '—'}
                </text>

                {/* Bottleneck label */}
                {isBottleneck && !cascadeState.active && (
                  <text x={svgWidth - 8} y={y} textAnchor="end" fill="#ff8800" fontSize="9" fontWeight="bold" fontFamily="monospace">
                    BOTTLENECK
                  </text>
                )}

                {/* Cascade labels */}
                {isCascadeSource && (
                  <text x={svgWidth - 8} y={y} textAnchor="end" fill={isMasteryCascade ? '#ffd700' : '#ff4444'} fontSize="9" fontWeight="bold" fontFamily="monospace">
                    SOURCE
                  </text>
                )}
                {isCascadeAffected && (
                  <text x={svgWidth - 8} y={y} textAnchor="end" fill={isMasteryCascade ? '#ffd700' : '#ff4444'} fontSize="9" fontWeight="bold" fontFamily="monospace">
                    {impactPct}%
                  </text>
                )}
              </g>
            )
          }

          // Horizontal labels
          const x = 40 + i * (segmentWidth + gapWidth) + segmentWidth / 2
          const y = svgHeight / 2
          const labelY = y + MAX_PIPE / 2 + 16
          return (
            <g key={`label-${id}`}>
              {/* Domain name below pipe */}
              <text x={x} y={labelY} textAnchor="middle" fill="#ccc" fontSize="11" fontFamily="sans-serif" fontWeight="600">
                D{node.domain} {node.name.split(' ')[0]}
              </text>
              <text x={x} y={labelY + 14} textAnchor="middle" fill="#888" fontSize="9" fontFamily="sans-serif">
                {node.avg > 0 ? `${node.avg.toFixed(1)}/3` : 'Not assessed'}
              </text>

              {/* Bottleneck label above pipe */}
              {isBottleneck && !cascadeState.active && (
                <text x={x} y={y - MAX_PIPE / 2 - 10} textAnchor="middle" fill="#ff8800" fontSize="10" fontWeight="bold" fontFamily="monospace">
                  BOTTLENECK
                </text>
              )}

              {/* Cascade labels above pipe */}
              {isCascadeSource && (
                <text x={x} y={y - MAX_PIPE / 2 - 10} textAnchor="middle" fill={isMasteryCascade ? '#ffd700' : '#ff4444'} fontSize="10" fontWeight="bold" fontFamily="monospace">
                  {isMasteryCascade ? 'STRENGTH' : 'CASCADE'} SOURCE
                </text>
              )}
              {isCascadeAffected && (
                <text x={x} y={y - MAX_PIPE / 2 - 10} textAnchor="middle" fill={isMasteryCascade ? '#ffd700' : '#ff4444'} fontSize="10" fontWeight="bold" fontFamily="monospace">
                  Impact: {impactPct}%
                </text>
              )}
            </g>
          )
        })}

        {/* Independent domains */}
        {INDEPENDENT.map((id, i) => {
          const node = nodeMap[id]
          if (!node) return null
          const color = DOMAIN_COLORS[id] || '#888'
          const r = 16
          const cx = isPhone ? (svgWidth / 2) + (i === 0 ? -40 : 40) : 40 + totalChainWidth / 2 + (i === 0 ? -60 : 60)
          const cy = isPhone ? svgHeight - 30 : svgHeight - 22

          return (
            <g key={id} className="cursor-pointer" onClick={() => onSegmentClick?.(id)}>
              <circle cx={cx} cy={cy} r={r} fill="#2a2a33" stroke={color} strokeWidth="1.5" strokeDasharray="4,3" />
              <text x={cx} y={cy + 1} textAnchor="middle" fill={color} fontSize="9" fontWeight="bold" dominantBaseline="middle">
                D{node.domain}
              </text>
              <text x={cx} y={cy + r + 12} textAnchor="middle" fill="#666" fontSize="8">
                {node.name.split(' ')[0]}
              </text>
            </g>
          )
        })}

        {/* Flow direction indicator */}
        <text
          x={isPhone ? svgWidth / 2 : svgWidth / 2}
          y={isPhone ? 20 : 16}
          textAnchor="middle"
          fill="#555"
          fontSize="9"
          fontFamily="monospace"
        >
          Foundation {isPhone ? '\u2193' : '\u2192'} Higher Order
        </text>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-[#1e1e24]/95 border border-[#444] rounded-lg px-3 py-2 text-xs z-10 shadow-xl"
          style={{
            left: Math.min(tooltip.x + 10, (svgWidth || 400) - 180),
            top: Math.max(tooltip.y - 70, 10),
            maxWidth: 200,
          }}
        >
          <div className="text-gray-200 font-medium">{tooltip.node.name}</div>
          <div className="text-gray-400">
            D{tooltip.node.domain} · {tooltip.node.state}
          </div>
          {tooltip.node.assessed > 0 && (
            <div className="text-gray-400">
              {tooltip.node.avg.toFixed(1)}/3 · {tooltip.node.assessed}/{tooltip.node.total} assessed
            </div>
          )}
        </div>
      )}
    </div>
  )
})
