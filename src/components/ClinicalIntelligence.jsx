import { useState, useMemo, memo, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useClinicalIntelligence from '../hooks/useClinicalIntelligence.js'
import useResponsive from '../hooks/useResponsive.js'
import { framework } from '../data/framework.js'

const CascadeView = lazy(() => import('./cascade/CascadeView.jsx'))

const DOMAIN_COLORS = {
  d1: '#e07b6e', d2: '#d4956a', d3: '#c9a84c', d4: '#8fb570',
  d5: '#5da87a', d6: '#4a9e9e', d7: '#6889b5', d8: '#8b7bb5', d9: '#a86e9a',
}

const STATE_LABELS = {
  locked: 'Not Assessed',
  blocked: 'Blocked',
  'needs-work': 'Needs Work',
  developing: 'Developing',
  mastered: 'Mastered',
}

const STATE_DOT_COLORS = {
  locked: '#555',
  blocked: '#8b4444',
  'needs-work': '#e8928a',
  developing: '#e5b76a',
  mastered: '#7fb589',
}

const RISK_COLORS = {
  inversion: '#e8928a',
  regression: '#ff6666',
  bottleneck: '#e5b76a',
  stalling: '#aaa',
  'score-inversion': '#b594d6',
  'prerequisite-gap': '#d694b5',
  'uneven-profile': '#94a8d6',
  plateau: '#d6c494',
}

/* ─── Sub-components ─── */

function HeadlineBanner({ headline, narratives, onAssess, onGoal, isPhone }) {
  const { topAction, topRisk, topStrength } = headline

  if (!topAction && !topRisk) {
    return (
      <div className={`${isPhone ? 'px-3 py-3' : 'px-5 py-4'} border-b border-[#333]/40`}>
        <p className="text-sm text-gray-500">{narratives.clinicalSummary}</p>
      </div>
    )
  }

  return (
    <div className={`${isPhone ? 'px-3 py-3' : 'px-5 py-4'} border-b border-[#333]/40`}>
      {/* Top priority */}
      {topAction && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-mono tracking-widest text-amber-500/80 uppercase font-bold">
              Top Priority
            </span>
            {topRisk && (
              <span className="text-[9px] font-mono bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded">
                {topRisk.type?.replace(/-/g, ' ')}
              </span>
            )}
          </div>
          <p className={`${isPhone ? 'text-sm' : 'text-base'} font-medium text-gray-200 leading-snug`}>
            Target <span style={{ color: DOMAIN_COLORS[topAction.domainId] }}>{topAction.skillName}</span>
            {topAction.blockedCount > 0 && (
              <span className="text-gray-500 text-sm"> — blocks {topAction.blockedCount} skills</span>
            )}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {onAssess && (
              <button
                onClick={() => onAssess(topAction.domainId + '-sa1')}
                className="text-[11px] font-medium bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 px-3 py-1.5 rounded-lg transition-colors min-h-[32px]"
              >
                Assess Now
              </button>
            )}
            {onGoal && (
              <button
                onClick={() => onGoal(topAction.domainId)}
                className="text-[11px] font-medium bg-[#2a2a33] text-gray-400 hover:text-gray-300 px-3 py-1.5 rounded-lg transition-colors min-h-[32px]"
              >
                Set Goal
              </button>
            )}
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="flex items-center gap-3 text-[10px] text-gray-600">
        {topRisk && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {headline.topRisk.type?.replace(/-/g, ' ')}
          </span>
        )}
        {topStrength && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            {topStrength.domainName} strongest
          </span>
        )}
      </div>
    </div>
  )
}

function TargetSkillCard({ skill, index, isExpanded, onToggle, onAssess, isPhone }) {
  const color = DOMAIN_COLORS[skill.domainId] || '#888'

  return (
    <motion.div
      layout
      className={`rounded-lg transition-all ${isExpanded ? 'ring-1 ring-white/10' : ''}`}
      style={{ backgroundColor: index === 0 ? '#1c1a28' : '#16161e' }}
    >
      <button
        onClick={onToggle}
        className={`w-full text-left ${isPhone ? 'px-3 py-2.5' : 'px-4 py-3'} min-h-[44px]`}
      >
        <div className="flex items-center gap-3">
          {/* Rank */}
          <span
            className="text-lg font-bold font-mono w-6 shrink-0"
            style={{ color: index === 0 ? '#ffd700' : '#666' }}
          >
            {index + 1}
          </span>
          {/* Color dot */}
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">{skill.skillName}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">
              {skill.domainName} {'\u00B7'} Tier {skill.tier}
              {skill.blockedCount > 0 && ` \u00B7 Blocks ${skill.blockedCount} skills`}
            </p>
          </div>
          {/* Assess button */}
          {onAssess && (
            <button
              onClick={(e) => { e.stopPropagation(); onAssess(skill.domainId + '-sa1') }}
              className="text-[10px] text-gray-500 hover:text-amber-400 px-2 py-1 rounded transition-colors shrink-0 min-h-[32px]"
            >
              Assess
            </button>
          )}
        </div>
      </button>

      {/* Discovery expansion */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`${isPhone ? 'px-3 pb-3' : 'px-4 pb-3'} pt-0 ml-9`}>
              <div className="border-t border-[#333]/40 pt-2">
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {skill.reason}
                  {skill.blockedCount > 0 && `. Improving this skill from its current level would unlock progress for ${skill.blockedCount} downstream skill${skill.blockedCount !== 1 ? 's' : ''} across the developmental cascade.`}
                </p>
                {skill.currentLevel !== undefined && (
                  <p className="text-[10px] text-gray-600 mt-1">
                    Current level: {skill.currentLevel}/3
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function DomainPill({ domainId, state, avg, assessed, isPhone }) {
  const color = DOMAIN_COLORS[domainId] || '#888'
  const dotColor = STATE_DOT_COLORS[state] || '#555'
  const domain = framework.find(d => d.id === domainId)
  const hasData = assessed > 0

  return (
    <div
      className={`${isPhone ? 'px-2 py-1.5' : 'px-3 py-2'} rounded-lg bg-[#16161e] flex items-center gap-2 shrink-0`}
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 font-medium truncate">
          D{domain?.domain} {domain?.name}
        </p>
        <p className="text-[9px] text-gray-600">
          {hasData ? `${avg.toFixed(1)}/3 \u00B7 ${STATE_LABELS[state]}` : 'Not assessed'}
        </p>
      </div>
    </div>
  )
}

function RiskCard({ risk, isPhone }) {
  const color = RISK_COLORS[risk.type] || '#e5b76a'
  const typeLabel = risk.type?.replace(/-/g, ' ').toUpperCase() || 'RISK'

  return (
    <div
      className="rounded-lg px-3 py-2.5"
      style={{
        backgroundColor: `${color}08`,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded"
          style={{ color, backgroundColor: `${color}15` }}
        >
          {typeLabel}
        </span>
        {risk.severity && (
          <span className="text-[9px] text-gray-600 font-mono">
            severity {typeof risk.severity === 'number' ? risk.severity.toFixed(1) : risk.severity}
          </span>
        )}
      </div>
      <p className="text-[11px] text-gray-400 mt-1">{risk.description || risk.message || ''}</p>
    </div>
  )
}

/* ─── Main Component ─── */

export default memo(function ClinicalIntelligence({
  assessments = {},
  snapshots = [],
  clientName = '',
  onNavigateToAssess,
  onSelectNode,
}) {
  const { isPhone, isTablet } = useResponsive()
  const intelligence = useClinicalIntelligence(assessments, snapshots, clientName)
  const {
    headline,
    targetSkills,
    risks,
    domainInsights,
    narratives,
    domainHealth,
    hasData,
  } = intelligence

  const [mode, setMode] = useState('directive') // 'directive' | 'discovery'
  const [expandedSkill, setExpandedSkill] = useState(null)
  const [showDetailedViews, setShowDetailedViews] = useState(false)

  // Toggle skill expansion
  const handleSkillToggle = (index) => {
    setExpandedSkill(prev => prev === index ? null : index)
  }

  // Domain pills ordered by leverage
  const domainPills = useMemo(() => {
    return framework
      .map(d => ({
        id: d.id,
        ...(domainHealth[d.id] || { avg: 0, assessed: 0, total: 0, state: 'locked' }),
      }))
      .sort((a, b) => {
        // Assessed before unassessed, then by avg descending
        if (a.assessed > 0 && b.assessed === 0) return -1
        if (a.assessed === 0 && b.assessed > 0) return 1
        return b.avg - a.avg
      })
  }, [domainHealth])

  if (showDetailedViews) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className={`${isPhone ? 'px-3 py-2' : 'px-5 py-2'} border-b border-[#333]/40 flex items-center gap-3`}>
          <button
            onClick={() => setShowDetailedViews(false)}
            className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors min-h-[32px]"
          >
            {'\u2190'} Back to Intelligence
          </button>
          <span className="text-[10px] text-gray-600 font-mono">Detailed Cascade Views</span>
        </div>
        <Suspense fallback={<div className="flex-1 flex items-center justify-center text-gray-600 text-sm">Loading...</div>}>
          <CascadeView
            assessments={assessments}
            snapshots={snapshots}
            clientName={clientName}
            onSelectNode={onSelectNode}
            onNavigateToAssess={onNavigateToAssess}
          />
        </Suspense>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Headline banner */}
      <HeadlineBanner
        headline={headline}
        narratives={narratives}
        onAssess={onNavigateToAssess}
        isPhone={isPhone}
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto">
        {!hasData ? (
          <div className={`${isPhone ? 'px-3 py-8' : 'px-5 py-12'} text-center`}>
            <p className="text-gray-500 text-sm">Complete an assessment to generate clinical insights.</p>
            <p className="text-gray-600 text-[11px] mt-2">
              The engine will analyze domain health, detect risks, and recommend intervention targets.
            </p>
          </div>
        ) : isPhone ? (
          /* ─── Phone: Single column ─── */
          <div className="px-3 py-3 space-y-4">
            {/* Mode toggle */}
            <ModeToggle mode={mode} onModeChange={setMode} />

            {/* Target skills */}
            <Section title="Target These Skills" count={targetSkills.length}>
              <div className="space-y-1.5">
                {targetSkills.map((skill, i) => (
                  <TargetSkillCard
                    key={skill.skillId}
                    skill={skill}
                    index={i}
                    isExpanded={mode === 'discovery' || expandedSkill === i}
                    onToggle={() => handleSkillToggle(i)}
                    onAssess={onNavigateToAssess}
                    isPhone
                  />
                ))}
              </div>
            </Section>

            {/* Clinical summary */}
            {mode === 'discovery' && (
              <div className="rounded-lg bg-[#16161e] px-3 py-2.5">
                <p className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-1">Clinical Summary</p>
                <p className="text-[11px] text-gray-400 leading-relaxed">{narratives.clinicalSummary}</p>
              </div>
            )}

            {/* Domain status — horizontal scroll */}
            <Section title="Domain Status">
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-none">
                {domainPills.map(d => (
                  <DomainPill key={d.id} domainId={d.id} state={d.state} avg={d.avg} assessed={d.assessed} isPhone />
                ))}
              </div>
            </Section>

            {/* Risks */}
            {risks.hasActiveRisks && (
              <Section title="Active Risks" count={risks.combined.length}>
                <div className="space-y-1.5">
                  {risks.combined.slice(0, 5).map((risk, i) => (
                    <RiskCard key={i} risk={risk} isPhone />
                  ))}
                </div>
              </Section>
            )}

            {/* Rationale */}
            {mode === 'discovery' && (
              <div className="rounded-lg bg-[#16161e] px-3 py-2.5">
                <p className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-1">Why These Targets</p>
                <p className="text-[11px] text-gray-400 leading-relaxed">{narratives.interventionRationale}</p>
              </div>
            )}

            {/* Link to detailed views */}
            <button
              onClick={() => setShowDetailedViews(true)}
              className="w-full text-center text-[11px] text-gray-600 hover:text-gray-400 py-2 transition-colors"
            >
              View detailed cascade visualizations {'\u2192'}
            </button>
          </div>
        ) : (
          /* ─── Tablet/Desktop: Two columns ─── */
          <div className={`${isTablet ? 'px-4 py-3' : 'px-5 py-4'} flex gap-4 min-h-0`}>
            {/* Left: Target skills (60%) */}
            <div className="flex-[3] min-w-0 space-y-4">
              {/* Mode toggle */}
              <ModeToggle mode={mode} onModeChange={setMode} />

              {/* Target skills */}
              <Section title="Target These Skills" count={targetSkills.length}>
                <div className="space-y-2">
                  {targetSkills.map((skill, i) => (
                    <TargetSkillCard
                      key={skill.skillId}
                      skill={skill}
                      index={i}
                      isExpanded={mode === 'discovery' || expandedSkill === i}
                      onToggle={() => handleSkillToggle(i)}
                      onAssess={onNavigateToAssess}
                    />
                  ))}
                </div>
              </Section>

              {/* Clinical summary + rationale in discovery mode */}
              {mode === 'discovery' && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-[#16161e] px-4 py-3">
                    <p className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-1.5">Clinical Summary</p>
                    <p className="text-[11px] text-gray-400 leading-relaxed">{narratives.clinicalSummary}</p>
                  </div>
                  <div className="rounded-lg bg-[#16161e] px-4 py-3">
                    <p className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-1.5">Why These Targets</p>
                    <p className="text-[11px] text-gray-400 leading-relaxed">{narratives.interventionRationale}</p>
                  </div>
                </div>
              )}

              {/* Detailed views link */}
              <button
                onClick={() => setShowDetailedViews(true)}
                className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
              >
                View detailed cascade visualizations {'\u2192'}
              </button>
            </div>

            {/* Right: Status + Risks (40%) */}
            <div className="flex-[2] min-w-0 space-y-4">
              {/* Domain status grid */}
              <Section title="Domain Status">
                <div className="space-y-1.5">
                  {domainPills.map(d => (
                    <DomainPill key={d.id} domainId={d.id} state={d.state} avg={d.avg} assessed={d.assessed} />
                  ))}
                </div>
              </Section>

              {/* Risks */}
              {risks.hasActiveRisks && (
                <Section title="Active Risks" count={risks.combined.length}>
                  <div className="space-y-1.5">
                    {risks.combined.slice(0, 5).map((risk, i) => (
                      <RiskCard key={i} risk={risk} />
                    ))}
                  </div>
                </Section>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

/* ─── Shared UI Pieces ─── */

function ModeToggle({ mode, onModeChange }) {
  return (
    <div className="flex items-center gap-1 bg-[#16161e] rounded-lg p-0.5 w-fit">
      <button
        onClick={() => onModeChange('directive')}
        className={`text-[10px] font-medium px-3 py-1.5 rounded-md transition-all min-h-[32px] ${
          mode === 'directive'
            ? 'bg-[#2a2a33] text-gray-200 shadow-sm'
            : 'text-gray-600 hover:text-gray-400'
        }`}
      >
        Tell me what to do
      </button>
      <button
        onClick={() => onModeChange('discovery')}
        className={`text-[10px] font-medium px-3 py-1.5 rounded-md transition-all min-h-[32px] ${
          mode === 'discovery'
            ? 'bg-[#2a2a33] text-gray-200 shadow-sm'
            : 'text-gray-600 hover:text-gray-400'
        }`}
      >
        Show me why
      </button>
    </div>
  )
}

function Section({ title, count, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-mono tracking-widest text-gray-600 uppercase">{title}</span>
        {count !== undefined && (
          <span className="text-[9px] text-gray-600 bg-[#2a2a33] px-1.5 py-0.5 rounded">{count}</span>
        )}
      </div>
      {children}
    </div>
  )
}
