import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { interpolateAssessments, computeDomainHealth } from '../data/cascadeModel.js'

/**
 * CascadeTimelineSlider — horizontal slider for scrubbing through snapshots.
 * Outputs interpolated assessments for smooth graph morphing.
 */
export default function CascadeTimelineSlider({
  snapshots = [],
  currentAssessments = {},
  onDisplayAssessmentsChange,
  isPhone = false,
}) {
  const [position, setPosition] = useState(1) // 0-1 range across all ticks
  const [isPlaying, setIsPlaying] = useState(false)
  const playRef = useRef(null)

  // Build timeline points: each snapshot + current state
  const timelinePoints = useMemo(() => {
    const points = snapshots.map((snap, i) => ({
      index: i,
      label: snap.label || `Snapshot ${i + 1}`,
      date: snap.date ? new Date(snap.date).toLocaleDateString() : '',
      assessments: snap.assessments || {},
    }))
    points.push({
      index: points.length,
      label: 'Current',
      date: 'Now',
      assessments: currentAssessments,
    })
    return points
  }, [snapshots, currentAssessments])

  const totalTicks = timelinePoints.length - 1

  // Compute interpolated assessments from position
  useEffect(() => {
    if (totalTicks === 0) {
      onDisplayAssessmentsChange(currentAssessments)
      return
    }

    const scaledPos = position * totalTicks
    const lowerIdx = Math.floor(scaledPos)
    const upperIdx = Math.min(lowerIdx + 1, totalTicks)
    const t = scaledPos - lowerIdx

    const a = timelinePoints[lowerIdx]?.assessments || {}
    const b = timelinePoints[upperIdx]?.assessments || {}

    if (t === 0) {
      onDisplayAssessmentsChange(a)
    } else {
      onDisplayAssessmentsChange(interpolateAssessments(a, b, t))
    }
  }, [position, totalTicks, timelinePoints, onDisplayAssessmentsChange, currentAssessments])

  // Delta badges between current position and previous tick
  const deltas = useMemo(() => {
    if (totalTicks === 0) return null

    const scaledPos = position * totalTicks
    const currentIdx = Math.round(scaledPos)
    const prevIdx = Math.max(0, currentIdx - 1)

    if (currentIdx === prevIdx) return null

    const currentHealth = computeDomainHealth(timelinePoints[currentIdx]?.assessments || {})
    const prevHealth = computeDomainHealth(timelinePoints[prevIdx]?.assessments || {})

    const changes = {}
    Object.keys(currentHealth).forEach((domainId) => {
      const curr = currentHealth[domainId]?.avg || 0
      const prev = prevHealth[domainId]?.avg || 0
      const diff = curr - prev
      if (Math.abs(diff) > 0.05) {
        changes[domainId] = diff
      }
    })

    return Object.keys(changes).length > 0 ? changes : null
  }, [position, totalTicks, timelinePoints])

  // Auto-play
  useEffect(() => {
    if (!isPlaying) {
      if (playRef.current) clearInterval(playRef.current)
      return
    }

    // 2s dwell per snapshot: snap to each tick, wait 2s, advance
    playRef.current = setInterval(() => {
      setPosition((prev) => {
        const nextTick = Math.round(prev * totalTicks) + 1
        if (nextTick > totalTicks) {
          setIsPlaying(false)
          return 1
        }
        return nextTick / totalTicks
      })
    }, 2000)

    return () => {
      if (playRef.current) clearInterval(playRef.current)
    }
  }, [isPlaying, totalTicks])

  const currentLabel = useMemo(() => {
    const scaledPos = position * totalTicks
    const idx = Math.round(scaledPos)
    return timelinePoints[idx]?.label || ''
  }, [position, totalTicks, timelinePoints])

  const currentDate = useMemo(() => {
    const scaledPos = position * totalTicks
    const idx = Math.round(scaledPos)
    return timelinePoints[idx]?.date || ''
  }, [position, totalTicks, timelinePoints])

  if (snapshots.length === 0) {
    return (
      <div className="text-center py-3">
        <p className="text-xs text-gray-500">No snapshots yet. Save a snapshot in the Timeline view to enable time travel.</p>
      </div>
    )
  }

  return (
    <div className={`${isPhone ? 'px-3 py-2' : 'px-4 py-3'} bg-[#1a1a1e] border-t border-[#333]`}>
      {/* Current position label */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-7 h-7 rounded-full bg-[#333] hover:bg-[#444] flex items-center justify-center text-gray-300 transition-colors min-h-[44px] min-w-[44px]"
          >
            <span className="text-xs">{isPlaying ? '\u23F8' : '\u25B6'}</span>
          </button>
          <div>
            <span className="text-xs font-medium text-gray-300">{currentLabel}</span>
            {currentDate && <span className="text-[10px] text-gray-500 ml-2">{currentDate}</span>}
          </div>
        </div>

        {/* Delta badges */}
        {deltas && (
          <div className="flex items-center gap-1.5">
            {Object.entries(deltas).slice(0, 4).map(([domainId, diff]) => (
              <span
                key={domainId}
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                  diff > 0 ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
                }`}
              >
                {domainId.toUpperCase()} {diff > 0 ? '\u2191' : '\u2193'}{Math.abs(diff).toFixed(1)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min="0"
          max="1"
          step="0.001"
          value={position}
          onChange={(e) => setPosition(parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #6889b5 0%, #6889b5 ${position * 100}%, #333 ${position * 100}%, #333 100%)`,
          }}
        />

        {/* Tick marks */}
        <div className="flex justify-between mt-1">
          {timelinePoints.map((point, i) => {
            const pct = totalTicks > 0 ? (i / totalTicks) * 100 : 0
            return (
              <button
                key={i}
                onClick={() => setPosition(totalTicks > 0 ? i / totalTicks : 0)}
                className="flex flex-col items-center group min-h-[44px] justify-start pt-0.5"
                style={{ position: 'absolute', left: `${pct}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-gray-600 group-hover:bg-gray-400 transition-colors" />
                {!isPhone && (
                  <span className="text-[8px] text-gray-600 group-hover:text-gray-400 mt-0.5 whitespace-nowrap">
                    {point.label.length > 12 ? point.label.slice(0, 11) + '\u2026' : point.label}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
