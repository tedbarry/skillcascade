import { useMemo, memo } from 'react'
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'
import { getDomainScores, ASSESSMENT_COLORS, ASSESSMENT_LEVELS } from '../data/framework.js'
import { computeDomainHealth } from '../data/cascadeModel.js'

const STATE_INDICATORS = {
  blocked: { symbol: '\u25BC', color: '#8b4444', label: 'Blocked' },
  'needs-work': { symbol: '\u25CF', color: '#e8928a', label: 'Needs Work' },
  mastered: { symbol: '\u2713', color: '#7fb589', label: 'Mastered' },
}

/**
 * Custom tooltip for the radar chart
 */
function CustomTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0]?.payload
  if (!data) return null

  const completionPct = data.total > 0 ? Math.round((data.assessed / data.total) * 100) : 0

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-warm-200 rounded-lg shadow-lg px-4 py-3 max-w-xs">
      <div className="font-semibold text-warm-800 text-sm mb-1">{data.domain}</div>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs mt-1">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-warm-600">{entry.name}:</span>
          <span className="font-medium text-warm-800">
            {entry.value.toFixed(2)} / 3.0
          </span>
        </div>
      ))}
      <div className="text-[10px] mt-2 space-y-0.5">
        <div className="text-warm-500">
          {data.assessed} of {data.total} skills assessed ({completionPct}%)
        </div>
        {completionPct < 50 && completionPct > 0 && (
          <div className="text-coral-500 font-medium">
            Low coverage — score may not be representative
          </div>
        )}
        {completionPct === 0 && (
          <div className="text-warm-400 italic">No skills assessed yet</div>
        )}
      </div>
    </div>
  )
}

/**
 * Custom axis tick — wraps long domain names
 */
function CustomTick({ payload, x, y, textAnchor, stateMap }) {
  const name = payload.value
  const parts = name.length > 14 ? name.split(/[\s&]+/, 2) : [name]
  const state = stateMap?.[payload.index]
  const indicator = state ? STATE_INDICATORS[state] : null

  return (
    <g>
      <text
        x={x}
        y={y}
        textAnchor={textAnchor}
        fill="#5f3e2a"
        fontSize={11}
        fontWeight={500}
        fontFamily="Plus Jakarta Sans, Inter, sans-serif"
      >
        {parts.map((part, i) => (
          <tspan key={i} x={x} dy={i === 0 ? 0 : 14}>
            {part}
          </tspan>
        ))}
      </text>
      {indicator && (
        <text
          x={x}
          y={y + (parts.length > 1 ? 26 : 14)}
          textAnchor={textAnchor}
          fill={indicator.color}
          fontSize={9}
          fontWeight={700}
          fontFamily="system-ui, sans-serif"
        >
          {indicator.symbol} {indicator.label}
        </text>
      )}
    </g>
  )
}

function scoreColor(score, assessed) {
  if (assessed === 0) return '#9ca3af'
  if (score >= 2.5) return ASSESSMENT_COLORS[ASSESSMENT_LEVELS.SOLID]
  if (score >= 1.5) return ASSESSMENT_COLORS[ASSESSMENT_LEVELS.DEVELOPING]
  return ASSESSMENT_COLORS[ASSESSMENT_LEVELS.NEEDS_WORK]
}

export default memo(function RadarChart({
  assessments = {},
  compareAssessments = null,
  compareLabel = 'Previous',
  width = 600,
  height = 500,
}) {
  const scores = useMemo(() => getDomainScores(assessments), [assessments])
  const compareScores = useMemo(
    () => (compareAssessments ? getDomainScores(compareAssessments) : null),
    [compareAssessments]
  )

  const chartData = useMemo(() => {
    return scores.map((s, i) => ({
      domain: s.domain,
      domainId: s.domainId,
      score: parseFloat(s.score.toFixed(2)),
      assessed: s.assessed,
      total: s.total,
      ...(compareScores
        ? { compareScore: parseFloat(compareScores[i].score.toFixed(2)) }
        : {}),
    }))
  }, [scores, compareScores])

  const overallAvg = useMemo(() => {
    const withScores = scores.filter((s) => s.assessed > 0)
    if (withScores.length === 0) return 0
    return withScores.reduce((sum, s) => sum + s.score, 0) / withScores.length
  }, [scores])

  const totalAssessed = scores.reduce((sum, s) => sum + s.assessed, 0)
  const totalSkills = scores.reduce((sum, s) => sum + s.total, 0)
  const overallCompletion = totalSkills > 0 ? Math.round((totalAssessed / totalSkills) * 100) : 0
  const overallColor = scoreColor(overallAvg, totalAssessed)

  // State map for axis indicators (only show blocked/needs-work/mastered)
  const stateMap = useMemo(() => {
    const health = computeDomainHealth(assessments)
    return scores.map(s => {
      const h = health[s.domainId]
      if (!h || h.assessed === 0) return null
      if (h.state === 'blocked' || h.state === 'needs-work' || h.state === 'mastered') return h.state
      return null
    })
  }, [assessments, scores])

  return (
    <div role="img" aria-label="Radar chart showing domain scores">
      {/* Summary bar */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div>
          <div className="text-xs text-warm-400 uppercase tracking-wider font-semibold">
            Overall Score
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-bold font-display" style={{ color: overallColor }}>
              {totalAssessed > 0 ? overallAvg.toFixed(1) : '—'}
            </span>
            <span className="text-sm text-warm-400">/ 3.0</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-warm-500">
            <span className="font-semibold text-warm-700">{totalAssessed}</span> of {totalSkills} skills assessed
          </div>
          <div className="text-[10px] text-warm-400 mt-0.5">
            {overallCompletion}% complete
          </div>
          <div className="w-32 h-1.5 bg-warm-200 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${overallCompletion}%`,
                backgroundColor: overallColor,
              }}
            />
          </div>
        </div>
      </div>

      {/* Note about scoring */}
      <div className="text-[10px] text-warm-400 px-2 mb-3 italic">
        Scores reflect the average of assessed skills only. Unassessed skills are excluded, not counted as zero.
        Check completion % per domain to gauge reliability.
      </div>

      {/* Radar chart */}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsRadarChart data={chartData} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid
            stroke="#e8d5c0"
            strokeWidth={0.5}
            gridType="polygon"
          />
          <PolarAngleAxis
            dataKey="domain"
            tick={<CustomTick stateMap={stateMap} />}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 3]}
            tickCount={4}
            tick={{ fontSize: 9, fill: '#b07d4f' }}
            axisLine={false}
          />

          {compareScores && (
            <Radar
              name={compareLabel}
              dataKey="compareScore"
              stroke="#c49a6c"
              fill="#c49a6c"
              fillOpacity={0.15}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
            />
          )}

          <Radar
            name="Current"
            dataKey="score"
            stroke="#4f8460"
            fill="#4f8460"
            fillOpacity={0.2}
            strokeWidth={2.5}
            dot={{
              r: 4,
              fill: '#4f8460',
              stroke: '#fff',
              strokeWidth: 2,
            }}
            activeDot={{
              r: 6,
              fill: '#4f8460',
              stroke: '#fff',
              strokeWidth: 2,
            }}
          />

          <Tooltip content={<CustomTooltip />} />
          {compareScores && <Legend wrapperStyle={{ fontSize: 12 }} />}
        </RechartsRadarChart>
      </ResponsiveContainer>

      {/* Domain breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 px-2">
        {scores.map((s) => {
          const color = scoreColor(s.score, s.assessed)
          const completionPct = s.total > 0 ? Math.round((s.assessed / s.total) * 100) : 0
          const lowCoverage = completionPct > 0 && completionPct < 50

          return (
            <div
              key={s.domainId}
              className={`bg-white rounded-lg px-3 py-2 ${
                lowCoverage
                  ? 'border border-dashed border-warm-300'
                  : 'border border-warm-200'
              }`}
            >
              <div className="text-[10px] text-warm-400 truncate">{s.domain}</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span
                  className="text-sm font-bold"
                  style={{ color, opacity: s.assessed === 0 ? 0.4 : 1 }}
                >
                  {s.assessed > 0 ? s.score.toFixed(1) : '—'}
                </span>
                <span className="text-[10px] text-warm-300">/ 3</span>
              </div>
              {/* Score bar */}
              <div className="w-full h-1 bg-warm-100 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(s.score / 3) * 100}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              {/* Completion indicator */}
              <div className="flex items-center gap-1 mt-1">
                <div className="flex-1 h-0.5 bg-warm-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-warm-300"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
                <span className={`text-[9px] ${lowCoverage ? 'text-coral-400 font-medium' : 'text-warm-300'}`}>
                  {completionPct}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})
