import { useMemo } from 'react'
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

/**
 * Custom tooltip for the radar chart
 */
function CustomTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0]?.payload
  if (!data) return null

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
      <div className="text-[10px] text-warm-400 mt-1.5">
        {data.assessed} of {data.total} skills assessed
      </div>
    </div>
  )
}

/**
 * Custom axis tick — wraps long domain names
 */
function CustomTick({ payload, x, y, textAnchor }) {
  const name = payload.value
  // Split long names for readability
  const parts = name.length > 14 ? name.split(/[\s&]+/, 2) : [name]

  return (
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
  )
}

export default function RadarChart({
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

  // Merge data for recharts
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

  // Summary stats
  const overallAvg = useMemo(() => {
    const withScores = scores.filter((s) => s.assessed > 0)
    if (withScores.length === 0) return 0
    return withScores.reduce((sum, s) => sum + s.score, 0) / withScores.length
  }, [scores])

  const totalAssessed = scores.reduce((sum, s) => sum + s.assessed, 0)
  const totalSkills = scores.reduce((sum, s) => sum + s.total, 0)

  // Determine color for overall score
  const overallColor =
    overallAvg >= 2.5
      ? ASSESSMENT_COLORS[ASSESSMENT_LEVELS.SOLID]
      : overallAvg >= 1.5
        ? ASSESSMENT_COLORS[ASSESSMENT_LEVELS.DEVELOPING]
        : overallAvg > 0
          ? ASSESSMENT_COLORS[ASSESSMENT_LEVELS.NEEDS_WORK]
          : ASSESSMENT_COLORS[ASSESSMENT_LEVELS.NOT_ASSESSED]

  return (
    <div>
      {/* Summary bar */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div>
          <div className="text-xs text-warm-400 uppercase tracking-wider font-semibold">
            Overall Score
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-bold font-display" style={{ color: overallColor }}>
              {overallAvg.toFixed(1)}
            </span>
            <span className="text-sm text-warm-400">/ 3.0</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-warm-400">
            {totalAssessed} of {totalSkills} skills assessed
          </div>
          <div className="w-32 h-1.5 bg-warm-200 rounded-full mt-1.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(totalAssessed / totalSkills) * 100}%`,
                backgroundColor: overallColor,
              }}
            />
          </div>
        </div>
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
            tick={<CustomTick />}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 3]}
            tickCount={4}
            tick={{ fontSize: 9, fill: '#b07d4f' }}
            axisLine={false}
          />

          {/* Comparison profile (behind) */}
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

          {/* Current profile */}
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
      <div className="grid grid-cols-3 gap-2 mt-4 px-2">
        {scores.map((s) => {
          const color =
            s.score >= 2.5
              ? ASSESSMENT_COLORS[ASSESSMENT_LEVELS.SOLID]
              : s.score >= 1.5
                ? ASSESSMENT_COLORS[ASSESSMENT_LEVELS.DEVELOPING]
                : s.score > 0
                  ? ASSESSMENT_COLORS[ASSESSMENT_LEVELS.NEEDS_WORK]
                  : ASSESSMENT_COLORS[ASSESSMENT_LEVELS.NOT_ASSESSED]

          return (
            <div
              key={s.domainId}
              className="bg-white border border-warm-200 rounded-lg px-3 py-2"
            >
              <div className="text-[10px] text-warm-400 truncate">{s.domain}</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm font-bold" style={{ color }}>
                  {s.assessed > 0 ? s.score.toFixed(1) : '—'}
                </span>
                <span className="text-[10px] text-warm-300">/ 3</span>
              </div>
              <div className="w-full h-1 bg-warm-100 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(s.score / 3) * 100}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
