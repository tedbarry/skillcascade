import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { framework, ASSESSMENT_LEVELS, getDomainScores } from '../data/framework.js'

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44

const DOMAIN_LINE_COLORS = {
  d1: '#e07b6e',
  d2: '#d4956a',
  d3: '#c9a84c',
  d4: '#8fb570',
  d5: '#5da87a',
  d6: '#4a9e9e',
  d7: '#6889b5',
  d8: '#8b7bb5',
  d9: '#a86e9a',
}

const PROJECTION_MONTHS = [3, 6, 12]

/* ─────────────────────────────────────────────
   SVG Icons (inline, no emoji, no icon libs)
   ───────────────────────────────────────────── */

const InfoIcon = (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="8" />
    <path d="M10 9v5" />
    <circle cx="10" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
  </svg>
)

const TrendUpIcon = (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 15l5-5 3 3 6-6" />
    <path d="M14 7h3v3" />
  </svg>
)

const TrendDownIcon = (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5l5 5 3-3 6 6" />
    <path d="M14 13h3v-3" />
  </svg>
)

const TrendStableIcon = (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10h14" />
    <path d="M14 7l3 3-3 3" />
  </svg>
)

const CheckIcon = (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 10l3 3 7-7" />
  </svg>
)

const ChartIcon = (
  <svg className="w-10 h-10 text-warm-300" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 35V10" />
    <path d="M5 35h30" />
    <path d="M10 28l7-8 5 4 10-12" />
    <path d="M28 12h4v4" />
    <circle cx="10" cy="28" r="1.5" fill="currentColor" />
    <circle cx="17" cy="20" r="1.5" fill="currentColor" />
    <circle cx="22" cy="24" r="1.5" fill="currentColor" />
    <circle cx="32" cy="12" r="1.5" fill="currentColor" />
  </svg>
)

/* ─────────────────────────────────────────────
   Simple Linear Regression
   ───────────────────────────────────────────── */

function linearRegression(points) {
  const n = points.length
  if (n < 2) return null

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
  for (const { x, y } of points) {
    sumX += x
    sumY += y
    sumXY += x * y
    sumXX += x * x
  }

  const denom = n * sumXX - sumX * sumX
  if (Math.abs(denom) < 1e-12) return { slope: 0, intercept: sumY / n }

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

function clampScore(v) {
  return Math.max(0, Math.min(3, v))
}

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
}

function formatMonths(months) {
  if (months < 1) return 'Less than 1 month'
  if (months < 2) return '~1 month'
  return `~${Math.round(months)} months`
}

function trendInfo(slopePerMonth) {
  if (slopePerMonth > 0.02) return { label: 'Improving', icon: TrendUpIcon, colorClass: 'text-sage-600', bgClass: 'bg-sage-50 border-sage-200' }
  if (slopePerMonth < -0.02) return { label: 'Declining', icon: TrendDownIcon, colorClass: 'text-coral-500', bgClass: 'bg-coral-50 border-coral-200' }
  return { label: 'Stable', icon: TrendStableIcon, colorClass: 'text-warm-500', bgClass: 'bg-warm-50 border-warm-200' }
}

/* ─────────────────────────────────────────────
   Custom Tooltip
   ───────────────────────────────────────────── */

function PredictionTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-warm-200 rounded-lg shadow-lg px-4 py-3 max-w-xs">
      <div className="text-xs text-warm-500 mb-2 font-medium">{label}</div>
      <div className="space-y-1">
        {payload
          .filter((p) => p.value != null)
          .sort((a, b) => (b.value || 0) - (a.value || 0))
          .map((entry) => (
            <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-warm-600 flex-1">{entry.name}</span>
              <span className="font-medium text-warm-800">{(entry.value || 0).toFixed(2)}</span>
            </div>
          ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────── */

export default function ProgressPrediction({
  assessments = {},
  snapshots = [],
  clientName = 'Client',
}) {
  const [visibleDomains, setVisibleDomains] = useState(
    () => new Set(framework.map((d) => d.id))
  )

  /* ── Build predictions per domain ── */
  const predictions = useMemo(() => {
    const now = Date.now()
    const currentScores = getDomainScores(assessments)

    return framework.map((domain) => {
      const currentDomainScore = currentScores.find((s) => s.domainId === domain.id)
      const currentScore = currentDomainScore?.score ?? 0

      // Build time series: snapshots + current
      const points = []
      for (const snap of snapshots) {
        const snapScores = getDomainScores(snap.assessments)
        const snapDomain = snapScores.find((s) => s.domainId === domain.id)
        if (snapDomain && snapDomain.assessed > 0) {
          points.push({ x: snap.timestamp, y: snapDomain.score })
        }
      }

      // Add current if assessed
      if (currentDomainScore && currentDomainScore.assessed > 0) {
        points.push({ x: now, y: currentScore })
      }

      // Sort by time
      points.sort((a, b) => a.x - b.x)

      const hasEnoughData = points.length >= 2

      if (!hasEnoughData) {
        return {
          domainId: domain.id,
          domainName: domain.name,
          currentScore,
          hasEnoughData: false,
          dataPoints: points.length,
          assessed: currentDomainScore?.assessed ?? 0,
        }
      }

      // Normalize timestamps to months from first data point
      const t0 = points[0].x
      const normalized = points.map((p) => ({
        x: (p.x - t0) / MS_PER_MONTH,
        y: p.y,
      }))

      const reg = linearRegression(normalized)
      const slopePerMonth = reg.slope
      const nowMonths = (now - t0) / MS_PER_MONTH

      // Project forward
      const projections = PROJECTION_MONTHS.map((m) => ({
        months: m,
        score: clampScore(reg.intercept + reg.slope * (nowMonths + m)),
        date: now + m * MS_PER_MONTH,
      }))

      // Estimate time to thresholds
      const timeToThreshold = (threshold) => {
        if (currentScore >= threshold) return null // already there
        if (slopePerMonth <= 0) return Infinity // not improving
        const currentProjected = reg.intercept + reg.slope * nowMonths
        const monthsNeeded = (threshold - currentProjected) / slopePerMonth
        return monthsNeeded > 0 ? monthsNeeded : null
      }

      const timeToDeveloping = timeToThreshold(2.0)
      const timeToSolid = timeToThreshold(2.5)

      // Historical data for mini chart
      const historical = points.map((p) => ({
        date: formatDate(p.x),
        timestamp: p.x,
        score: parseFloat(p.y.toFixed(2)),
        type: 'historical',
      }))

      // Projected data for mini chart
      const projected = projections.map((p) => ({
        date: formatDate(p.date),
        timestamp: p.date,
        projected: parseFloat(p.score.toFixed(2)),
        type: 'projected',
      }))

      // Merge: last historical point also gets projected value to connect lines
      const lastHistorical = historical[historical.length - 1]
      const miniChartData = [
        ...historical.slice(0, -1),
        { ...lastHistorical, projected: lastHistorical.score },
        ...projected,
      ]

      const trend = trendInfo(slopePerMonth)

      return {
        domainId: domain.id,
        domainName: domain.name,
        currentScore,
        hasEnoughData: true,
        dataPoints: points.length,
        slopePerMonth,
        trend,
        projections,
        timeToDeveloping,
        timeToSolid,
        miniChartData,
        assessed: currentDomainScore?.assessed ?? 0,
        atSolid: currentScore >= 2.5,
      }
    })
  }, [assessments, snapshots])

  /* ── Categorize domains ── */
  const { onTrack, needsAcceleration, insufficientData } = useMemo(() => {
    const onTrack = []
    const needsAcceleration = []
    const insufficientData = []

    for (const pred of predictions) {
      if (!pred.hasEnoughData) {
        insufficientData.push(pred)
      } else if (pred.atSolid || (pred.timeToDeveloping !== null && pred.timeToDeveloping !== Infinity && pred.timeToDeveloping <= 6) || pred.currentScore >= 2.0) {
        onTrack.push(pred)
      } else {
        needsAcceleration.push(pred)
      }
    }

    return { onTrack, needsAcceleration, insufficientData }
  }, [predictions])

  /* ── Build combined timeline chart data ── */
  const timelineChartData = useMemo(() => {
    const now = Date.now()
    const allTimestamps = new Set()

    // Gather all snapshot timestamps
    for (const snap of snapshots) {
      allTimestamps.add(snap.timestamp)
    }
    allTimestamps.add(now)

    // Add projected timestamps
    for (const m of PROJECTION_MONTHS) {
      allTimestamps.add(now + m * MS_PER_MONTH)
    }

    const sorted = [...allTimestamps].sort((a, b) => a - b)

    // For each timestamp, compute domain scores (historical) or projected
    return sorted.map((ts) => {
      const point = {
        name: formatDate(ts),
        timestamp: ts,
        isProjected: ts > now,
      }

      for (const pred of predictions) {
        if (!pred.hasEnoughData) continue

        if (ts <= now) {
          // Historical: find closest snapshot or current
          if (ts === now) {
            point[pred.domainId] = parseFloat(pred.currentScore.toFixed(2))
          } else {
            const snap = snapshots.find((s) => s.timestamp === ts)
            if (snap) {
              const scores = getDomainScores(snap.assessments)
              const ds = scores.find((s) => s.domainId === pred.domainId)
              if (ds && ds.assessed > 0) {
                point[pred.domainId] = parseFloat(ds.score.toFixed(2))
              }
            }
          }
        } else {
          // Projected: find matching projection
          const proj = pred.projections.find((p) => Math.abs(p.date - ts) < MS_PER_MONTH * 0.5)
          if (proj) {
            point[`${pred.domainId}_proj`] = parseFloat(proj.score.toFixed(2))
          }
        }
      }

      return point
    })
  }, [predictions, snapshots])

  // Split timeline into historical and projected for dual-line rendering
  const { historicalData, projectedData } = useMemo(() => {
    const now = Date.now()
    const historical = timelineChartData.filter((d) => d.timestamp <= now)
    const projected = timelineChartData.filter((d) => d.timestamp >= now)

    // Add current scores to projected first point so lines connect
    if (historical.length > 0 && projected.length > 0) {
      const lastHist = historical[historical.length - 1]
      const firstProj = projected[0]
      for (const pred of predictions) {
        if (!pred.hasEnoughData) continue
        if (firstProj.timestamp === lastHist.timestamp) {
          firstProj[`${pred.domainId}_proj`] = lastHist[pred.domainId]
        }
      }
    }

    return { historicalData: historical, projectedData: projected }
  }, [timelineChartData, predictions])

  const combinedTimelineData = useMemo(() => {
    const now = Date.now()
    return timelineChartData.map((point) => {
      const merged = { ...point }
      // For the current timestamp, copy historical values to projected keys to connect
      if (point.timestamp === now) {
        for (const pred of predictions) {
          if (!pred.hasEnoughData) continue
          if (merged[pred.domainId] != null) {
            merged[`${pred.domainId}_proj`] = merged[pred.domainId]
          }
        }
      }
      return merged
    })
  }, [timelineChartData, predictions])

  function toggleDomain(domainId) {
    setVisibleDomains((prev) => {
      const next = new Set(prev)
      if (next.has(domainId)) next.delete(domainId)
      else next.add(domainId)
      return next
    })
  }

  const domainsWithData = predictions.filter((p) => p.hasEnoughData)

  /* ── No data state ── */
  if (snapshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        {ChartIcon}
        <h3 className="font-display text-lg font-semibold text-warm-700 mt-4 mb-2">
          No Prediction Data Available
        </h3>
        <p className="text-sm text-warm-500 max-w-md">
          Save at least one snapshot to enable progress predictions.
          Predictions improve with more data points over time.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto p-6 space-y-6">

      {/* ── Disclaimer Banner ── */}
      <div className="bg-warm-100 border border-warm-300 rounded-lg px-4 py-3 flex items-start gap-3">
        <span className="text-warm-500 mt-0.5">{InfoIcon}</span>
        <p className="text-xs text-warm-600 leading-relaxed">
          These projections are estimates based on historical patterns.
          Actual progress depends on many factors including intervention quality,
          consistency, and individual differences.
          Use as a planning guide, not a guarantee.
        </p>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-3 gap-3">
        {/* On Track */}
        <div className="bg-sage-50 border border-sage-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sage-600">{TrendUpIcon}</span>
            <h4 className="font-display text-sm font-semibold text-sage-700">On Track</h4>
          </div>
          <div className="text-2xl font-bold text-sage-700 mb-1">{onTrack.length}</div>
          <p className="text-[10px] text-sage-500 leading-snug">
            {onTrack.length === 1 ? 'domain' : 'domains'} projected to reach Developing within 6 months
          </p>
        </div>

        {/* Needs Acceleration */}
        <div className="bg-coral-50 border border-coral-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-coral-500">{TrendDownIcon}</span>
            <h4 className="font-display text-sm font-semibold text-coral-600">Needs Focus</h4>
          </div>
          <div className="text-2xl font-bold text-coral-600 mb-1">{needsAcceleration.length}</div>
          <p className="text-[10px] text-coral-400 leading-snug">
            {needsAcceleration.length === 1 ? 'domain' : 'domains'} projected to stay below Developing after 6 months
          </p>
        </div>

        {/* Insufficient Data */}
        <div className="bg-warm-50 border border-warm-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-warm-400">{InfoIcon}</span>
            <h4 className="font-display text-sm font-semibold text-warm-600">Insufficient Data</h4>
          </div>
          <div className="text-2xl font-bold text-warm-600 mb-1">{insufficientData.length}</div>
          <p className="text-[10px] text-warm-400 leading-snug">
            {insufficientData.length === 1 ? 'domain needs' : 'domains need'} at least 2 data points for prediction
          </p>
        </div>
      </div>

      {/* ── Domain Prediction Cards ── */}
      {domainsWithData.length > 0 && (
        <div>
          <h3 className="font-display text-sm font-semibold text-warm-700 mb-3">
            Domain Predictions for {clientName}
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {domainsWithData.map((pred) => (
              <DomainPredictionCard key={pred.domainId} prediction={pred} />
            ))}
          </div>
        </div>
      )}

      {/* ── Projection Timeline Chart ── */}
      {domainsWithData.length > 0 && (
        <div>
          <h3 className="font-display text-sm font-semibold text-warm-700 mb-1">
            Projection Timeline
          </h3>
          <p className="text-xs text-warm-400 mb-4">
            Solid lines show historical data. Dashed lines show projected growth.
          </p>

          {/* Domain toggles */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-[10px] text-warm-400">Show:</span>
            {framework.map((d) => {
              const pred = predictions.find((p) => p.domainId === d.id)
              if (!pred || !pred.hasEnoughData) return null
              return (
                <button
                  key={d.id}
                  onClick={() => toggleDomain(d.id)}
                  className={`text-[10px] px-2 py-1 rounded-md font-medium transition-all border ${
                    visibleDomains.has(d.id)
                      ? 'border-transparent opacity-100'
                      : 'border-warm-200 opacity-30'
                  }`}
                  style={{
                    backgroundColor: visibleDomains.has(d.id) ? DOMAIN_LINE_COLORS[d.id] + '20' : 'transparent',
                    color: DOMAIN_LINE_COLORS[d.id],
                  }}
                >
                  {d.name}
                </button>
              )
            })}
          </div>

          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={combinedTimelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8d5c0" strokeOpacity={0.5} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#9a6740' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 3]}
                ticks={[0, 1, 2, 3]}
                tick={{ fontSize: 10, fill: '#9a6740' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<PredictionTooltip />} />
              <ReferenceLine y={2.0} stroke="#c49a6c" strokeDasharray="6 3" strokeOpacity={0.6} label={{ value: 'Developing', position: 'left', fontSize: 9, fill: '#c49a6c' }} />
              <ReferenceLine y={2.5} stroke="#7fb589" strokeDasharray="6 3" strokeOpacity={0.6} label={{ value: 'Solid', position: 'left', fontSize: 9, fill: '#7fb589' }} />

              {/* Historical lines (solid) */}
              {framework.map((d) => {
                const pred = predictions.find((p) => p.domainId === d.id)
                if (!pred || !pred.hasEnoughData || !visibleDomains.has(d.id)) return null
                return (
                  <Line
                    key={d.id}
                    type="monotone"
                    dataKey={d.id}
                    name={d.name}
                    stroke={DOMAIN_LINE_COLORS[d.id]}
                    strokeWidth={2}
                    dot={{ r: 3, fill: DOMAIN_LINE_COLORS[d.id], stroke: '#fff', strokeWidth: 1.5 }}
                    connectNulls
                  />
                )
              })}

              {/* Projected lines (dashed) */}
              {framework.map((d) => {
                const pred = predictions.find((p) => p.domainId === d.id)
                if (!pred || !pred.hasEnoughData || !visibleDomains.has(d.id)) return null
                return (
                  <Line
                    key={`${d.id}_proj`}
                    type="monotone"
                    dataKey={`${d.id}_proj`}
                    name={`${d.name} (projected)`}
                    stroke={DOMAIN_LINE_COLORS[d.id]}
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    strokeOpacity={0.6}
                    dot={{ r: 3, fill: DOMAIN_LINE_COLORS[d.id], stroke: '#fff', strokeWidth: 1.5, opacity: 0.6 }}
                    connectNulls
                  />
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Domain Prediction Card
   ───────────────────────────────────────────── */

function DomainPredictionCard({ prediction }) {
  const {
    domainId,
    domainName,
    currentScore,
    slopePerMonth,
    trend,
    projections,
    timeToDeveloping,
    timeToSolid,
    miniChartData,
    atSolid,
  } = prediction

  const color = DOMAIN_LINE_COLORS[domainId]
  const rateLabel = slopePerMonth >= 0
    ? `+${slopePerMonth.toFixed(2)} per month`
    : `${slopePerMonth.toFixed(2)} per month`

  return (
    <div className={`rounded-lg border p-4 ${trend.bgClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-display text-sm font-semibold text-warm-800">{domainName}</h4>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-warm-500">
              Current: <span className="font-semibold text-warm-700">{currentScore.toFixed(2)}</span>
            </span>
            <span className="text-[10px] text-warm-400">of 3.0</span>
          </div>
        </div>

        {atSolid ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sage-100 border border-sage-300">
            <span className="text-sage-600">{CheckIcon}</span>
            <span className="text-xs font-medium text-sage-700">Maintaining</span>
          </div>
        ) : (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${trend.bgClass} border`}>
            <span className={trend.colorClass}>{trend.icon}</span>
            <span className={`text-xs font-medium ${trend.colorClass}`}>{trend.label}</span>
          </div>
        )}
      </div>

      {/* Rate and estimates */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-white/60 rounded-md px-2.5 py-1.5">
          <div className="text-[9px] uppercase tracking-wider text-warm-400 mb-0.5">Rate</div>
          <div className={`text-xs font-semibold ${trend.colorClass}`}>{rateLabel}</div>
        </div>

        <div className="bg-white/60 rounded-md px-2.5 py-1.5">
          <div className="text-[9px] uppercase tracking-wider text-warm-400 mb-0.5">To Developing</div>
          {currentScore >= 2.0 ? (
            <div className="text-xs font-semibold text-sage-600">Reached</div>
          ) : timeToDeveloping === Infinity ? (
            <div className="text-xs font-semibold text-coral-500">May benefit from increased focus</div>
          ) : timeToDeveloping != null ? (
            <div className="text-xs font-semibold text-warm-700">{formatMonths(timeToDeveloping)}</div>
          ) : (
            <div className="text-xs text-warm-400">--</div>
          )}
        </div>

        <div className="bg-white/60 rounded-md px-2.5 py-1.5">
          <div className="text-[9px] uppercase tracking-wider text-warm-400 mb-0.5">To Solid</div>
          {currentScore >= 2.5 ? (
            <div className="text-xs font-semibold text-sage-600">Reached</div>
          ) : timeToSolid === Infinity ? (
            <div className="text-xs font-semibold text-coral-500">May benefit from increased focus</div>
          ) : timeToSolid != null ? (
            <div className="text-xs font-semibold text-warm-700">{formatMonths(timeToSolid)}</div>
          ) : (
            <div className="text-xs text-warm-400">--</div>
          )}
        </div>
      </div>

      {/* Positive framing for declining trends */}
      {trend.label === 'Declining' && (
        <div className="bg-white/70 border border-coral-200 rounded-md px-3 py-2 mb-3">
          <p className="text-[11px] text-coral-600 leading-snug">
            This domain may benefit from increased focus. Consider reviewing
            intervention strategies and consistency of implementation.
          </p>
        </div>
      )}

      {/* Mini chart */}
      <div className="bg-white/50 rounded-lg p-2">
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={miniChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8d5c0" strokeOpacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 8, fill: '#9a6740' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 3]}
              ticks={[0, 1, 2, 3]}
              tick={{ fontSize: 8, fill: '#9a6740' }}
              tickLine={false}
              axisLine={false}
              width={20}
            />
            <ReferenceLine y={2.0} stroke="#c49a6c" strokeDasharray="4 2" strokeOpacity={0.5} />
            <ReferenceLine y={2.5} stroke="#7fb589" strokeDasharray="4 2" strokeOpacity={0.5} />

            {/* Historical line */}
            <Line
              type="monotone"
              dataKey="score"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 2.5, fill: color, stroke: '#fff', strokeWidth: 1 }}
              connectNulls
            />

            {/* Projected line */}
            <Line
              type="monotone"
              dataKey="projected"
              stroke={color}
              strokeWidth={2}
              strokeDasharray="5 3"
              strokeOpacity={0.5}
              dot={{ r: 2.5, fill: color, stroke: '#fff', strokeWidth: 1, opacity: 0.5 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Projection values */}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[9px] text-warm-400">Projected:</span>
        {projections.map((p) => (
          <span key={p.months} className="text-[10px] px-1.5 py-0.5 rounded bg-white/70 text-warm-600">
            <span className="text-warm-400">{p.months}mo:</span>{' '}
            <span className="font-semibold">{p.score.toFixed(1)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
