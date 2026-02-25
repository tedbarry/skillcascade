import { useState, useCallback, useMemo, memo } from 'react'
import { AnimatePresence } from 'framer-motion'
import RankedDomainRow from './RankedDomainRow.jsx'
import PlannerSidebar from './PlannerSidebar.jsx'
import useCascadeGraph from '../../hooks/useCascadeGraph.js'
import useResponsive from '../../hooks/useResponsive.js'
import { framework } from '../../data/framework.js'
import { computeDomainHealth, simulateCascade } from '../../data/cascadeModel.js'

/**
 * InterventionPlannerView — "What should I target?"
 * Ranked leverage list with what-if simulation sidebar.
 * Domains sorted by leverage score — #1 gets gold "Recommended" treatment.
 */
export default memo(function InterventionPlannerView({
  assessments = {},
  snapshots = [],
  clientName = '',
  onNavigateToAssess,
}) {
  const { isPhone, isTablet } = useResponsive()
  const [selectedDomain, setSelectedDomain] = useState(null)
  const [targetValue, setTargetValue] = useState(null)

  // What-if overrides for simulation
  const whatIfOverrides = useMemo(() => {
    if (!selectedDomain || targetValue === null) return null
    return { [selectedDomain]: targetValue }
  }, [selectedDomain, targetValue])

  const {
    nodes, domainHealth, impactRanking,
  } = useCascadeGraph(assessments, snapshots, whatIfOverrides)
  const hasData = useMemo(() => Object.keys(assessments).length > 0, [assessments])

  // Compute what-if deltas for all domains
  const whatIfDeltas = useMemo(() => {
    if (!whatIfOverrides) return {}
    const baseHealth = computeDomainHealth(assessments)
    const simAssessments = simulateCascade(assessments, whatIfOverrides)
    const simHealth = computeDomainHealth(simAssessments)

    const deltas = {}
    framework.forEach(d => {
      if (d.id === selectedDomain) return
      const base = baseHealth[d.id]
      const sim = simHealth[d.id]
      if (!base || !sim) return
      const healthDelta = (sim.avg || 0) - (base.avg || 0)
      const unblocked = base.state === 'blocked' && sim.state !== 'blocked' && sim.state !== 'locked'
      if (Math.abs(healthDelta) > 0.01 || unblocked) {
        deltas[d.id] = { healthDelta, unblocked, newState: sim.state }
      }
    })
    return deltas
  }, [assessments, whatIfOverrides, selectedDomain])

  // Separate ranked (non-independent, assessed) and independent domains
  const { rankedDomains, independentDomains } = useMemo(() => {
    const ranked = []
    const independent = []

    // Sort by leverage score
    const sorted = [...impactRanking].sort((a, b) => b.leverageScore - a.leverageScore)

    sorted.forEach(r => {
      const node = nodes.find(n => n.id === r.domainId)
      if (!node) return
      if (node.independent) {
        independent.push({ node, ranking: r })
      } else {
        ranked.push({ node, ranking: r })
      }
    })

    return { rankedDomains: ranked, independentDomains: independent }
  }, [impactRanking, nodes])

  const maxLeverage = useMemo(() =>
    Math.max(1, ...impactRanking.map(r => r.leverageScore)),
    [impactRanking]
  )

  // Find recommended (highest leverage among non-mastered, assessed)
  const recommendedId = useMemo(() => {
    if (!hasData) return null
    const rec = rankedDomains.find(({ node }) =>
      node.state !== 'mastered' && node.assessed > 0
    )
    return rec?.node.id || null
  }, [rankedDomains, hasData])

  const handleRowClick = useCallback((domainId) => {
    if (domainId === selectedDomain) {
      setSelectedDomain(null)
      setTargetValue(null)
      return
    }
    const health = domainHealth[domainId]
    setSelectedDomain(domainId)
    setTargetValue(health?.avg || 0)
  }, [selectedDomain, domainHealth])

  // Summary
  const summaryText = useMemo(() => {
    if (!hasData) return 'Add assessment data to see intervention recommendations.'
    if (recommendedId) {
      const d = framework.find(f => f.id === recommendedId)
      const r = impactRanking.find(r => r.domainId === recommendedId)
      return `Highest leverage: ${d?.name} — affects ${r?.downstreamDomains || 0} domains, ${r?.downstreamSkills || 0} skills.`
    }
    return 'All domains assessed. Select a domain to explore scenarios.'
  }, [hasData, recommendedId, impactRanking])

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Summary header */}
      <div className={`${isPhone ? 'px-3 py-2' : 'px-4 py-2'} bg-[#12121a] border-b border-[#333]/60`}>
        <h2 className="text-[10px] font-mono tracking-widest text-gray-600 uppercase">
          Intervention Planner
        </h2>
        <p className={`text-xs mt-0.5 ${recommendedId ? 'text-[#ffd700]' : 'text-gray-500'}`}>
          {summaryText}
        </p>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Ranked list */}
        <div className="flex-1 overflow-auto p-3 space-y-1.5">
          {/* Ranked domains */}
          {rankedDomains.map(({ node, ranking }, i) => (
            <RankedDomainRow
              key={node.id}
              rank={i + 1}
              node={node}
              ranking={ranking}
              maxLeverage={maxLeverage}
              isRecommended={node.id === recommendedId && !selectedDomain}
              isSelected={node.id === selectedDomain}
              onClick={() => handleRowClick(node.id)}
              isCompact={isPhone}
              delta={whatIfDeltas[node.id] || null}
            />
          ))}

          {/* Separator */}
          {independentDomains.length > 0 && (
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-[#333]" />
              <span className="text-[9px] text-gray-600 font-mono">INDEPENDENT</span>
              <div className="flex-1 h-px bg-[#333]" />
            </div>
          )}

          {/* Independent domains */}
          {independentDomains.map(({ node, ranking }) => (
            <RankedDomainRow
              key={node.id}
              rank={0}
              node={node}
              ranking={ranking}
              maxLeverage={maxLeverage}
              isIndependent
              isSelected={node.id === selectedDomain}
              onClick={() => handleRowClick(node.id)}
              isCompact={isPhone}
              delta={whatIfDeltas[node.id] || null}
            />
          ))}
        </div>

        {/* Planner sidebar */}
        <AnimatePresence>
          {selectedDomain && (
            <PlannerSidebar
              key={selectedDomain}
              selectedDomain={selectedDomain}
              assessments={assessments}
              domainHealth={domainHealth}
              impactRanking={impactRanking}
              targetValue={targetValue}
              onTargetChange={setTargetValue}
              onClose={() => { setSelectedDomain(null); setTargetValue(null) }}
              isBottomSheet={isPhone}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
})
