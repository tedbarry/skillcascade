import { memo, useMemo } from 'react'

/**
 * DomainSparkline — SVG polyline showing domain score trend.
 *
 * Props:
 *   scores    — [number] array of avg scores across snapshots (0-3)
 *   width     — SVG width (default 40)
 *   height    — SVG height (default 14)
 *   color     — line color
 *   showDot   — show dot at latest point
 *   large     — boolean: large variant with area fill (for TrendCard)
 */
export default memo(function DomainSparkline({
  scores = [],
  width = 40,
  height = 14,
  color = '#6889b5',
  showDot = true,
  large = false,
}) {
  const pad = large ? 4 : 2
  const maxScore = 3
  const w = width - pad * 2
  const h = height - pad * 2

  const { points, areaPath } = useMemo(() => {
    if (scores.length < 2) return { points: null, areaPath: null }

    const pts = scores.map((score, i) => ({
      x: pad + (i / (scores.length - 1)) * w,
      y: pad + h - (score / maxScore) * h,
    }))

    const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')

    // Area fill path (closed polygon down to bottom)
    const area = `M${pts[0].x},${pad + h} ` +
      pts.map(p => `L${p.x},${p.y}`).join(' ') +
      ` L${pts[pts.length - 1].x},${pad + h} Z`

    return { points: polyline, areaPath: area }
  }, [scores, width, height, pad, w, h])

  if (!points || scores.length < 2) {
    return (
      <svg width={width} height={height}>
        {scores.length === 1 ? (
          // Single data point
          <circle
            cx={width / 2}
            cy={pad + h - (scores[0] / maxScore) * h}
            r={large ? 3 : 2}
            fill={color}
          />
        ) : (
          <line x1={pad} y1={height / 2} x2={width - pad} y2={height / 2} stroke="#333" strokeWidth="1" strokeDasharray="2,2" />
        )}
        {large && scores.length < 2 && (
          <text x={width / 2} y={height - 2} textAnchor="middle" fill="#555" fontSize="8" fontFamily="monospace">
            No trend data
          </text>
        )}
      </svg>
    )
  }

  const lastPt = {
    x: pad + w,
    y: pad + h - (scores[scores.length - 1] / maxScore) * h,
  }
  const trend = scores[scores.length - 1] - scores[0]
  const trendColor = trend >= 0 ? '#7fb589' : '#e8928a'

  return (
    <svg width={width} height={height}>
      {/* Area fill (large variant only) */}
      {large && areaPath && (
        <path d={areaPath} fill={color} opacity={0.08} />
      )}

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={large ? 2 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End dot */}
      {showDot && (
        <circle
          cx={lastPt.x}
          cy={lastPt.y}
          r={large ? 3.5 : 2}
          fill={trend >= 0 ? color : '#e8928a'}
          stroke={large ? '#12121a' : 'none'}
          strokeWidth={large ? 1.5 : 0}
        />
      )}

      {/* Trend indicator */}
      {Math.abs(trend) > 0.2 && (
        <text
          x={width - pad}
          y={large ? 12 : height - 1}
          textAnchor="end"
          fill={trendColor}
          fontSize={large ? 10 : 6}
          fontFamily="monospace"
          fontWeight={large ? 'bold' : 'normal'}
        >
          {trend > 0 ? '+' : ''}{trend.toFixed(1)}
        </text>
      )}
    </svg>
  )
})
