import { useState, useCallback, useMemo, useEffect, memo } from 'react'
import PipelineFlow from './PipelineFlow.jsx'
import SubAreaPanel from './SubAreaPanel.jsx'
import useCascadeGraph from '../../hooks/useCascadeGraph.js'
import useResponsive from '../../hooks/useResponsive.js'
import { framework, ASSESSMENT_LABELS } from '../../data/framework.js'
import { computeSkillInfluence, getSkillCeiling } from '../../data/skillInfluence.js'
import { getTeachingPlaybook } from '../../data/teachingPlaybook.js'
import { generateSkillNarrative } from '../../lib/narratives.js'
import { getSubAreaFromId } from '../../data/skillDependencies.js'

const LEVEL_LABELS = { 0: 'Not Present', 1: 'Needs Work', 2: 'Developing', 3: 'Solid' }

/**
 * BottleneckFinderView — "What's holding us back?"
 * Horizontal pipeline flow where pipe thickness = domain health.
 * Bottleneck = dramatic constriction. Click triggers cascade wave.
 */
export default memo(function BottleneckFinderView({
  assessments = {},
  snapshots = [],
  clientName = '',
  onNavigateToAssess,
}) {
  const { isPhone } = useResponsive()
  const {
    nodes, impactRanking, cascadeState,
    triggerCascade, resetCascade, getEnhancedSubAreaHealth,
    skillBottlenecks,
  } = useCascadeGraph(assessments, snapshots)
  const [expandedDomain, setExpandedDomain] = useState(null)
  const hasData = useMemo(() => Object.keys(assessments).length > 0, [assessments])

  // Identify bottleneck: highest leverage score among weak domains
  const bottleneck = useMemo(() => {
    if (!hasData) return null
    const candidates = impactRanking.filter(r => {
      const node = nodes.find(n => n.id === r.domainId)
      return node && node.assessed > 0 && node.avg < 2.0
    })
    return candidates.length > 0 ? candidates[0] : null
  }, [impactRanking, nodes, hasData])

  const bottleneckId = bottleneck?.domainId || null

  // Auto-expand bottleneck sub-areas on mount
  useEffect(() => {
    if (bottleneckId && !expandedDomain) {
      setExpandedDomain(bottleneckId)
    }
  }, [bottleneckId])

  const subAreas = useMemo(() => {
    if (!expandedDomain) return []
    return getEnhancedSubAreaHealth(expandedDomain)
  }, [expandedDomain, getEnhancedSubAreaHealth])

  // Mastery cascade detection
  const isMasteryCascade = useMemo(() => {
    if (!cascadeState.active || !cascadeState.source) return false
    const source = nodes.find(n => n.id === cascadeState.source)
    return source && source.healthPct >= 0.67
  }, [cascadeState, nodes])

  const handleSegmentClick = useCallback((domainId) => {
    if (domainId === expandedDomain) {
      setExpandedDomain(null)
      resetCascade()
      return
    }
    resetCascade()
    setTimeout(() => triggerCascade(domainId), 50)
    setExpandedDomain(domainId)
  }, [expandedDomain, resetCascade, triggerCascade, nodes])

  // Top skill-level bottleneck with influence data
  const topSkillBottleneck = useMemo(() => {
    if (!hasData || skillBottlenecks.length === 0) return null
    return skillBottlenecks[0]
  }, [hasData, skillBottlenecks])

  const influence = useMemo(() => computeSkillInfluence(assessments), [assessments])

  // Prescriptive action card data
  const actionCard = useMemo(() => {
    if (!topSkillBottleneck) return null
    const playbook = getTeachingPlaybook(topSkillBottleneck.skillId)
    if (!playbook || !playbook.strategies || playbook.strategies.length === 0) return null
    const currentLevel = topSkillBottleneck.currentLevel ?? 0
    const nextLevel = Math.min(3, currentLevel + 1)
    const inf = influence[topSkillBottleneck.skillId]
    const downstreamCount = inf?.directDownstream || topSkillBottleneck.blockedCount || 0
    return {
      skillName: topSkillBottleneck.skillName,
      strategy: playbook.strategies[0],
      currentLabel: LEVEL_LABELS[currentLevel] || 'Not Present',
      nextLabel: LEVEL_LABELS[nextLevel],
      downstreamCount,
    }
  }, [topSkillBottleneck, influence])

  // Summary sentence
  const summaryText = useMemo(() => {
    if (!bottleneck) return hasData ? 'No significant bottlenecks detected.' : 'Add assessment data to identify bottlenecks.'
    const domain = framework.find(d => d.id === bottleneck.domainId)
    const base = `Weakness in ${domain?.name || ''} affects ${bottleneck.downstreamDomains} downstream domain${bottleneck.downstreamDomains !== 1 ? 's' : ''}, limiting ${bottleneck.downstreamSkills} skills.`
    if (topSkillBottleneck) {
      const inf = influence[topSkillBottleneck.skillId]
      if (inf && inf.directDownstream > 0) {
        return `${base} Top constraint: "${topSkillBottleneck.skillName}" caps ${inf.directDownstream} downstream skill${inf.directDownstream !== 1 ? 's' : ''}.`
      }
      if (topSkillBottleneck.blockedCount > 3) {
        return `${base} Top skill bottleneck: "${topSkillBottleneck.skillName}" blocks ${topSkillBottleneck.blockedCount} skills.`
      }
    }
    return base
  }, [bottleneck, hasData, topSkillBottleneck, influence])

  const footerText = useMemo(() => {
    if (cascadeState.active) {
      const count = Object.keys(cascadeState.affected).length
      return `${count} domain${count !== 1 ? 's' : ''} affected \u00B7 Click elsewhere to reset`
    }
    return 'Click a segment to see cascade impact'
  }, [cascadeState])

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Summary banner */}
      <div className={`${isPhone ? 'px-3 py-2' : 'px-5 py-3'} border-b border-[#333]/40`}>
        <h2 className="text-[10px] font-mono tracking-widest text-gray-600 uppercase">
          Bottleneck Finder
        </h2>
        <p className={`text-xs mt-0.5 ${bottleneck ? 'text-orange-300' : 'text-gray-500'}`}>
          {summaryText}
        </p>
      </div>

      {/* Prescriptive action card */}
      {actionCard && (
        <div className={`${isPhone ? 'mx-3 my-2' : 'mx-5 my-2'} rounded-lg bg-[#1a2420] border border-[#2a3f35] ${isPhone ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
          <div className="text-[10px] font-mono tracking-widest text-gray-500 uppercase mb-1">What to do</div>
          <p className="text-[11px] text-gray-300 leading-relaxed">
            Target <span className="text-white font-medium">{actionCard.skillName}</span> with {actionCard.strategy.toLowerCase()}.
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            Improving from {actionCard.currentLabel} to {actionCard.nextLabel} raises ceilings on {actionCard.downstreamCount} skill{actionCard.downstreamCount !== 1 ? 's' : ''}.
          </p>
          {(() => {
            if (!topSkillBottleneck) return null
            const skillNarr = generateSkillNarrative(topSkillBottleneck.skillId, topSkillBottleneck.currentLevel)
            const ceilingData = getSkillCeiling(topSkillBottleneck.skillId, assessments)
            const skillLevel = assessments[topSkillBottleneck.skillId]
            const limiting = ceilingData?.constrainingPrereqs?.filter(p => p.imposedCeiling < 3) || []
            const top = limiting[0]
            let ceilingJsx = null
            if (top && skillLevel != null) {
              const prereqName = framework.flatMap(d => d.subAreas.flatMap(sa => sa.skillGroups.flatMap(sg => sg.skills))).find(s => s.id === top.id)?.name || top.id
              const prereqLabel = top.level != null ? ASSESSMENT_LABELS[top.level] : 'Not Assessed'
              const ceilingLabel = ASSESSMENT_LABELS[ceilingData.ceiling] || `${ceilingData.ceiling}`
              const prereqBtn = onNavigateToAssess ? (
                <button
                  onClick={() => onNavigateToAssess(getSubAreaFromId(top.id))}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-blue-500/50 bg-blue-900/40 text-blue-300 font-semibold not-italic no-underline hover:bg-blue-800/50 hover:border-blue-400 transition-colors cursor-pointer"
                >
                  {prereqName}
                </button>
              ) : <span className="font-medium">{prereqName}</span>

              if (skillLevel > ceilingData.ceiling) {
                ceilingJsx = (
                  <p className="text-[10px] text-amber-500/70 italic">
                    {topSkillBottleneck.skillName} is rated above its ceiling ({ASSESSMENT_LABELS[skillLevel]} vs {ceilingLabel}).{' '}
                    {prereqBtn} at {prereqLabel} is the limiting factor.
                  </p>
                )
              } else if (ceilingData.ceiling < 3) {
                ceilingJsx = (
                  <p className="text-[10px] text-amber-500/70 italic">
                    Capped at {ceilingLabel} by {prereqBtn} ({prereqLabel}).{' '}
                    Improving <span className="font-medium not-italic">{prereqName}</span> would raise this ceiling.
                  </p>
                )
              }
            }
            if (!skillNarr && !ceilingJsx) return null
            return (
              <div className="mt-1.5 space-y-0.5">
                {skillNarr && <p className="text-[10px] text-gray-500 italic">{skillNarr}</p>}
                {ceilingJsx}
              </div>
            )
          })()}
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Pipeline visualization */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <PipelineFlow
            nodes={nodes}
            bottleneckId={bottleneckId}
            cascadeState={cascadeState}
            isMasteryCascade={isMasteryCascade}
            onSegmentClick={handleSegmentClick}
          />
          {/* Footer */}
          <div className="px-4 py-1.5 text-center border-t border-[#333]/30">
            <span className="text-[10px] text-gray-600 font-mono">{footerText}</span>
          </div>
        </div>

        {/* Sub-area panel */}
        {expandedDomain && (
          <SubAreaPanel
            domainId={expandedDomain}
            subAreas={subAreas}
            onClose={() => { setExpandedDomain(null); resetCascade() }}
            onNavigateToAssess={onNavigateToAssess}
            sortBy="weakness"
            criticalThreshold={1.5}
            showPrereqs
          />
        )}
      </div>
    </div>
  )
})
