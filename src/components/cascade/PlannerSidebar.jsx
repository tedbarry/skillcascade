import { useMemo, memo } from 'react'
import { motion } from 'framer-motion'
import { framework, DOMAIN_DEPENDENCIES } from '../../data/framework.js'
import { computeDomainHealth, simulateCascade, findPrerequisiteChain, computePathReadiness, findSkillBottlenecks } from '../../data/cascadeModel.js'
import useResponsive from '../../hooks/useResponsive.js'
import { DOMAIN_COLORS } from '../../constants/colors.js'

const TIER_LABELS = { 1: 'Reflexive', 2: 'Recognition', 3: 'Management', 4: 'Integration', 5: 'Abstract' }

/**
 * PlannerSidebar — Combined what-if + prerequisites + downstream impact.
 *
 * Props:
 *   selectedDomain  — domainId (e.g. 'd3')
 *   assessments     — current assessments
 *   domainHealth    — current { [domainId]: { avg, state, ... } }
 *   impactRanking   — [{ domainId, leverageScore, downstreamDomains, downstreamSkills }]
 *   targetValue     — number (0-3 what-if slider value)
 *   onTargetChange  — (value) => void
 *   onClose         — () => void
 *   isBottomSheet   — boolean (phone mode)
 */
export default memo(function PlannerSidebar({
  selectedDomain,
  assessments,
  domainHealth,
  impactRanking,
  targetValue,
  onTargetChange,
  onClose,
  isBottomSheet = false,
}) {
  const { isPhone, isTablet } = useResponsive()
  const domain = framework.find(d => d.id === selectedDomain)
  const domainColor = DOMAIN_COLORS[selectedDomain] || '#888'
  const currentHealth = domainHealth[selectedDomain] || { avg: 0, assessed: 0, total: 0 }
  const ranking = impactRanking.find(r => r.domainId === selectedDomain)

  // Prerequisites
  const prerequisites = useMemo(() => {
    const chain = findPrerequisiteChain(selectedDomain)
    const readiness = computePathReadiness(chain, assessments)
    return readiness.filter(step => step.domainId !== selectedDomain)
  }, [selectedDomain, assessments])

  // Skill-level bottlenecks for this domain
  const skillBottlenecks = useMemo(() => {
    const allBottlenecks = findSkillBottlenecks(assessments, 50)
    // Filter to only show bottlenecks IN this domain (prerequisite skills that are weak)
    return allBottlenecks
      .filter(b => b.domainId === selectedDomain && (b.currentLevel == null || b.currentLevel < 2))
      .slice(0, 5)
  }, [assessments, selectedDomain])

  // Cascade effects when slider is moved
  const cascadeEffects = useMemo(() => {
    if (targetValue === null || Math.abs(targetValue - currentHealth.avg) < 0.05) return null

    const overrides = { [selectedDomain]: targetValue }
    const simAssessments = simulateCascade(assessments, overrides)
    const simHealth = computeDomainHealth(simAssessments)
    const baseHealth = domainHealth

    const effects = []
    framework.forEach(d => {
      if (d.id === selectedDomain) return
      const base = baseHealth[d.id]
      const sim = simHealth[d.id]
      if (!base || !sim) return

      const stateRank = { locked: 0, blocked: 1, 'needs-work': 2, developing: 3, mastered: 4 }
      const delta = (sim.avg || 0) - (base.avg || 0)
      const stateChanged = (stateRank[sim.state] || 0) > (stateRank[base.state] || 0)
      const unblocked = base.state === 'blocked' && sim.state !== 'blocked' && sim.state !== 'locked'

      if (Math.abs(delta) > 0.01 || stateChanged || unblocked) {
        effects.push({
          domainId: d.id,
          name: d.name,
          delta,
          from: base.state,
          to: sim.state,
          unblocked,
          newlyReady: unblocked ? sim.total : 0,
        })
      }
    })

    const totalUnblocked = effects.filter(e => e.unblocked).reduce((sum, e) => sum + e.newlyReady, 0)
    return { effects, totalUnblocked }
  }, [selectedDomain, targetValue, assessments, domainHealth, currentHealth.avg])

  const content = (
    <div className={`flex flex-col h-full ${isBottomSheet ? 'max-h-[70vh]' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#333] shrink-0">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: domainColor }} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-200 truncate">{domain?.name}</div>
          <div className="text-xs text-gray-500">
            Current: {currentHealth.avg.toFixed(1)}/3 · {currentHealth.assessed}/{currentHealth.total} assessed
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >×</button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Downstream impact */}
        {ranking && (
          <div className="bg-[#1a1a22] rounded-lg p-3 border border-[#2a2a33]">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Downstream Impact</div>
            <div className="text-xs text-gray-300">
              Affects <span className="text-white font-semibold">{ranking.downstreamDomains}</span> domains, <span className="text-white font-semibold">{ranking.downstreamSkills}</span> skills
            </div>
            <div className="text-[10px] text-gray-500 mt-1">
              Leverage score: {ranking.leverageScore.toFixed(1)}
            </div>
          </div>
        )}

        {/* What-if slider */}
        <div className="bg-[#1a1a22] rounded-lg p-3 border border-[#2a2a33]">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">What If Target</div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={3}
              step={0.1}
              value={targetValue ?? currentHealth.avg}
              onChange={(e) => onTargetChange(parseFloat(e.target.value))}
              className="flex-1 accent-[color:var(--accent)]"
              style={{ '--accent': domainColor }}
            />
            <span className="text-sm font-mono text-gray-200 w-10 text-right">
              {(targetValue ?? currentHealth.avg).toFixed(1)}
            </span>
          </div>
          <div className="flex justify-between text-[9px] text-gray-600 mt-1">
            <span>Needs Work</span>
            <span>Developing</span>
            <span>Mastered</span>
          </div>
        </div>

        {/* Cascade effects preview */}
        {cascadeEffects && cascadeEffects.effects.length > 0 && (
          <div className="bg-[#1a1a22] rounded-lg p-3 border border-[#2a2a33]">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
              Predicted Impact
            </div>
            {cascadeEffects.totalUnblocked > 0 && (
              <div className="text-xs text-green-400 mb-2 font-medium">
                {cascadeEffects.totalUnblocked} skills become accessible
              </div>
            )}
            <div className="space-y-1.5">
              {cascadeEffects.effects.map(e => (
                <div key={e.domainId} className="flex items-center justify-between text-xs">
                  <span className="text-gray-300">{e.name}</span>
                  <span className={e.delta > 0 ? 'text-green-400' : e.delta < 0 ? 'text-red-400' : 'text-gray-500'}>
                    {e.unblocked
                      ? 'Unblocks!'
                      : e.delta > 0
                        ? `+${e.delta.toFixed(1)}`
                        : e.delta.toFixed(1)
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prerequisites */}
        {prerequisites.length > 0 && (
          <div className="bg-[#1a1a22] rounded-lg p-3 border border-[#2a2a33]">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Prerequisites</div>
            <div className="space-y-1.5">
              {prerequisites.map(step => {
                const d = framework.find(f => f.id === step.domainId)
                const status = step.status === 'met' ? '\u2713' : step.status === 'close' ? '\u26A0' : '\u2717'
                const statusColor = step.status === 'met' ? 'text-green-400' : step.status === 'close' ? 'text-yellow-400' : 'text-red-400'
                return (
                  <div key={step.domainId} className="flex items-center justify-between text-xs">
                    <span className="text-gray-300">{d?.name || step.domainId}</span>
                    <span className={`${statusColor} font-mono`}>
                      {status} {step.status !== 'met' && `${(step.avg || 0).toFixed(1)}/3`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Skill-level bottlenecks */}
        {skillBottlenecks.length > 0 && (
          <div className="bg-[#1a1a22] rounded-lg p-3 border border-[#2a2a33]">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
              Key Skill Bottlenecks
            </div>
            <div className="space-y-1.5">
              {skillBottlenecks.map(b => (
                <div key={b.skillId} className="flex items-start gap-2 text-[11px]">
                  <span className="text-orange-400 shrink-0 mt-0.5">{'\u25CF'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-300 leading-tight">{b.skillName}</div>
                    <div className="text-[9px] text-gray-600 mt-0.5">
                      {b.domainId.toUpperCase()} · Tier {b.tier} ({TIER_LABELS[b.tier] || '?'}) · Blocks {b.blockedCount} skills
                    </div>
                  </div>
                  <span className="text-[10px] font-mono shrink-0" style={{
                    color: b.currentLevel == null ? '#666' : b.currentLevel === 0 ? '#c47070' : b.currentLevel < 2 ? '#e8928a' : '#e5b76a'
                  }}>
                    {b.currentLevel == null ? '—' : b.currentLevel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // Phone: bottom sheet
  if (isBottomSheet) {
    return (
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-50 bg-[#12121a] border-t border-[#333] rounded-t-xl shadow-2xl"
        style={{ maxHeight: '70vh' }}
      >
        <div className="w-10 h-1 bg-[#444] rounded-full mx-auto mt-2 mb-1" />
        {content}
      </motion.div>
    )
  }

  // Desktop/Tablet: sidebar
  return (
    <div className={`${isTablet ? 'fixed right-0 top-0 bottom-0 z-40 w-[320px]' : 'w-[360px] shrink-0'} bg-[#12121a] border-l border-[#333] flex flex-col overflow-hidden`}>
      {isTablet && <div className="fixed inset-0 bg-black/30 -z-10" onClick={onClose} />}
      {content}
    </div>
  )
})
