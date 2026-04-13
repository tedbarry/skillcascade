import { useState, useEffect, useMemo, useRef } from 'react'
import { api } from '../../lib/api.js'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Dot } from 'recharts'

/**
 * Program Graph — shows session data over time for a single program.
 * Renders inside the Learning Tree expanded program view.
 */

export default function ProgramGraph({ programId, measurementType, criteria, compact = false }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!programId) return
    async function load() {
      setLoading(true)
      // Query session_data — direct columns only
      const { data: sessions } = await api
        .from('session_data')
        .select('percentage, frequency_count, duration_seconds, created_at, session_id, run_id')
        .eq('program_id', programId)
        .order('created_at', { ascending: true })
        .limit(50)

      const rows = sessions || []

      // Fetch related sessions and session_runs separately
      const sessionIds = [...new Set(rows.map(s => s.session_id).filter(Boolean))]
      const runIds = [...new Set(rows.map(s => s.run_id).filter(Boolean))]

      const sessionMap = {}
      const runMap = {}

      if (sessionIds.length > 0) {
        const { data: sessionsData } = await api
          .from('sessions')
          .select('id, session_date, status')
          .in('id', sessionIds)
        for (const s of (sessionsData || [])) sessionMap[s.id] = s
      }

      if (runIds.length > 0) {
        const { data: runsData } = await api
          .from('session_runs')
          .select('id, run_date')
          .in('id', runIds)
        for (const r of (runsData || [])) runMap[r.id] = r
      }

      // Attach joined data
      for (const s of rows) {
        s.sessions = s.session_id ? sessionMap[s.session_id] || null : null
        s.session_runs = s.run_id ? runMap[s.run_id] || null : null
      }

      const chartData = rows.map((s, i) => {
        // Prefer run_date from session_runs, then session_date from sessions, then created_at
        const date = s.session_runs?.run_date || s.sessions?.session_date || new Date(s.created_at).toLocaleDateString()
        const shortDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })

        return {
          session: i + 1,
          date: shortDate,
          value: measurementType === 'frequency' ? s.frequency_count
            : measurementType === 'duration' ? s.duration_seconds
            : s.percentage != null ? Math.round(s.percentage) : null,
        }
      }).filter(d => d.value != null)

      setData(chartData)
      setLoading(false)
    }
    load()
  }, [programId, measurementType])

  // Parse mastery criterion number (e.g., "80% across 5 sessions" → 80)
  const masteryLine = useMemo(() => {
    if (!criteria) return null
    const match = criteria.match(/(\d+)%/)
    return match ? parseInt(match[1]) : null
  }, [criteria])

  const yLabel = measurementType === 'frequency' ? 'Count' : measurementType === 'duration' ? 'Seconds' : '%'
  const yDomain = measurementType === 'percentage' || !measurementType ? [0, 100] : undefined
  const lineColor = '#10B981'

  // Export as image
  const handleExport = () => {
    const svg = chartRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      canvas.width = img.width * 2
      canvas.height = img.height * 2
      ctx.scale(2, 2)
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      const a = document.createElement('a')
      a.download = 'graph.png'
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  if (loading) {
    return <div className="flex items-center justify-center py-4"><span className="w-4 h-4 border-2 border-sage-300 border-t-sage-600 rounded-full animate-spin" /></div>
  }

  if (data.length === 0) {
    return <p className="text-[11px] text-warm-500 text-center py-3">No session data yet.</p>
  }

  const height = compact ? 120 : 200

  return (
    <div ref={chartRef}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-warm-500">{data.length} session{data.length !== 1 ? 's' : ''}</p>
        {!compact && (
          <button onClick={handleExport} className="text-[10px] text-sage-600 hover:text-sage-700 font-medium">
            Export PNG
          </button>
        )}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" opacity={0.5} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: '#9a8574' }}
            tickLine={false}
            axisLine={{ stroke: '#D6D3D1' }}
          />
          <YAxis
            domain={yDomain}
            tick={{ fontSize: 9, fill: '#9a8574' }}
            tickLine={false}
            axisLine={{ stroke: '#D6D3D1' }}
            width={30}
            label={compact ? undefined : { value: yLabel, angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#9a8574' } }}
          />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E7E5E4', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            formatter={(value) => [`${value}${measurementType === 'percentage' || !measurementType ? '%' : ''}`, 'Value']}
          />
          {masteryLine && (
            <ReferenceLine
              y={masteryLine}
              stroke="#10B981"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={compact ? undefined : { value: `${masteryLine}% mastery`, position: 'right', style: { fontSize: 9, fill: '#10B981' } }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={2}
            dot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: lineColor }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
