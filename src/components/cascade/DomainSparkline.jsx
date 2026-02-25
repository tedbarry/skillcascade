import { memo, useMemo } from 'react'

/**
 * DomainSparkline — Tiny SVG polyline showing domain score trend.
 *
 * Props:
 *   scores    — [number] array of avg scores across snapshots (0-3)
 *   width     — SVG width (default 40)
 *   height    — SVG height (default 14)
 *   color     — line color
 *   showDot   — show dot at latest point
 */
export default memo(function DomainSparkline({
  scores = [],
  width = 40,
  height = 14,
  color = '#6889b5',
  showDot = true,
}) {
  const points = useMemo(() => {
    if (scores.length < 2) return null
    const maxScore = 3
    const pad = 2
    const w = width - pad * 2
    const h = height - pad * 2

    return scores.map((score, i) => {
      const x = pad + (i / (scores.length - 1)) * w
      const y = pad + h - (score / maxScore) * h
      return `${x},${y}`
    }).join(' ')
  }, [scores, width, height])

  if (!points || scores.length < 2) {
    return (
      <svg width={width} height={height}>
        <line x1={2} y1={height / 2} x2={width - 2} y2={height / 2} stroke="#333" strokeWidth="1" strokeDasharray="2,2" />
      </svg>
    )
  }

  const lastX = 2 + ((scores.length - 1) / (scores.length - 1)) * (width - 4)
  const lastY = 2 + (height - 4) - (scores[scores.length - 1] / 3) * (height - 4)

  // Trend direction for area fill
  const trend = scores[scores.length - 1] - scores[0]

  return (
    <svg width={width} height={height}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDot && (
        <circle cx={lastX} cy={lastY} r="2" fill={color} />
      )}
      {/* Trend indicator */}
      {Math.abs(trend) > 0.2 && (
        <text
          x={width - 1}
          y={height - 1}
          textAnchor="end"
          fill={trend > 0 ? '#7fb589' : '#e8928a'}
          fontSize="6"
          fontFamily="monospace"
        >
          {trend > 0 ? '+' : ''}{trend.toFixed(1)}
        </text>
      )}
    </svg>
  )
})
