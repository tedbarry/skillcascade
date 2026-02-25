import { useState, useMemo, memo } from 'react'
import { computeDomainHealth } from '../../data/cascadeModel.js'
import { framework } from '../../data/framework.js'
import ProgressBar from './ProgressBar.jsx'
import useResponsive from '../../hooks/useResponsive.js'

function getStatusLabel(healthPct) {
  if (healthPct === 0) return 'Not Yet Started'
  if (healthPct < 0.5) return 'Getting Started'
  if (healthPct < 0.83) return 'Growing'
  return 'Strong'
}

/**
 * BeforeAfterComparison — Side-by-side or swipeable before/after progress bars.
 *
 * Props:
 *   currentAssessments — current assessments
 *   snapshots          — snapshot array
 *   onDomainClick      — (domainId) => void
 */
export default memo(function BeforeAfterComparison({
  currentAssessments = {},
  snapshots = [],
  onDomainClick,
}) {
  const { isPhone } = useResponsive()
  const [panel, setPanel] = useState('now') // 'before' | 'now'

  const hasBaseline = snapshots.length > 0

  const baselineHealth = useMemo(() => {
    if (!hasBaseline) return {}
    return computeDomainHealth(snapshots[0].assessments || {})
  }, [hasBaseline, snapshots])

  const currentHealth = useMemo(
    () => computeDomainHealth(currentAssessments),
    [currentAssessments]
  )

  const domainData = useMemo(() => {
    return framework.map(d => {
      const current = currentHealth[d.id] || { avg: 0, healthPct: 0, assessed: 0, total: 0 }
      const baseline = baselineHealth[d.id] || { avg: 0, healthPct: 0, assessed: 0, total: 0 }
      return {
        id: d.id,
        name: d.name,
        current,
        baseline,
        delta: current.healthPct - baseline.healthPct,
      }
    })
  }, [currentHealth, baselineHealth])

  const renderBars = (useBaseline) => (
    <div className={`flex ${isPhone ? 'gap-1' : 'gap-2'} justify-center flex-wrap`}>
      {domainData.map(d => {
        const health = useBaseline ? d.baseline : d.current
        return (
          <ProgressBar
            key={d.id}
            domainId={d.id}
            name={d.name}
            healthPct={health.healthPct}
            statusLabel={getStatusLabel(health.healthPct)}
            assessed={health.assessed}
            total={health.total}
            delta={!useBaseline && hasBaseline ? d.delta : null}
            onClick={() => onDomainClick?.(d.id)}
          />
        )
      })}
    </div>
  )

  // Phone: swipeable panels
  if (isPhone) {
    return (
      <div className="flex flex-col gap-3">
        {hasBaseline && (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setPanel('before')}
              className={`text-xs font-medium px-4 py-2 rounded-full min-h-[44px] transition-colors ${
                panel === 'before'
                  ? 'bg-gray-200 text-gray-800'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              When We Started
            </button>
            <button
              onClick={() => setPanel('now')}
              className={`text-xs font-medium px-4 py-2 rounded-full min-h-[44px] transition-colors ${
                panel === 'now'
                  ? 'bg-gray-200 text-gray-800'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              Now
            </button>
          </div>
        )}
        {renderBars(panel === 'before')}
      </div>
    )
  }

  // Desktop/Tablet: side-by-side
  if (!hasBaseline) {
    return (
      <div>
        <div className="text-center mb-3">
          <span className="text-sm font-semibold text-gray-700">Current Progress</span>
        </div>
        {renderBars(false)}
      </div>
    )
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="text-center mb-3">
          <span className="text-sm font-semibold text-gray-500">When We Started</span>
          {snapshots[0]?.date && (
            <span className="text-xs text-gray-400 ml-2">
              {new Date(snapshots[0].date).toLocaleDateString()}
            </span>
          )}
        </div>
        {renderBars(true)}
      </div>
      <div className="w-px bg-gray-200 shrink-0" />
      <div className="flex-1">
        <div className="text-center mb-3">
          <span className="text-sm font-semibold text-gray-700">Now</span>
        </div>
        {renderBars(false)}
      </div>
    </div>
  )
})
