import { useState, useMemo, useCallback } from 'react'
import {
  framework,
  ASSESSMENT_LEVELS,
  ASSESSMENT_LABELS,
  ASSESSMENT_COLORS,
  DOMAIN_DEPENDENCIES,
  isAssessed,
} from '../data/framework.js'
import { getSkillDescription } from '../data/skillDescriptions.js'
import { getBehavioralIndicator } from '../data/behavioralIndicators.js'
import { getTeachingPlaybook } from '../data/teachingPlaybook.js'
import { downloadFile, csvEscape } from '../data/exportUtils.js'
import { getSkillCeiling, computeSkillInfluence } from '../data/skillInfluence.js'
import { getSubAreaFromId } from '../data/skillDependencies.js'
import EmptyState from './EmptyState.jsx'
import useResponsive from '../hooks/useResponsive.js'
import useContextualHint from '../hooks/useContextualHint.js'
import ContextualHint from './ContextualHint.jsx'

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */

const DOMAIN_DEPS = DOMAIN_DEPENDENCIES

/**
 * Foundation domain IDs — D1 and D2 are the first two tiers.
 * Gaps here block nearly everything above.
 */
const FOUNDATION_IDS = new Set(['d1', 'd2'])

/**
 * Priority tier labels and theming
 */
const PRIORITY_CONFIG = {
  1: {
    label: 'Foundation Gaps',
    subtitle: 'These skills block progress across multiple higher domains. Address first.',
    color: '#e06b5f',        // coral-400
    bg: '#fdf2f1',           // coral-50
    border: '#f5b8b2',       // coral-200
    badgeBg: '#fce0dd',      // coral-100
    badgeText: '#b63a2e',    // coral-600
  },
  2: {
    label: 'Ready to Target',
    subtitle: 'Prerequisites are met. These skills can be effectively addressed now.',
    color: '#c49a6c',        // warm-400 (gold-ish)
    bg: '#fdf8f0',           // warm-50
    border: '#e8d5c0',       // warm-200
    badgeBg: '#f5ebe0',      // warm-100
    badgeText: '#9a6740',    // warm-600
  },
  3: {
    label: 'Blocked',
    subtitle: 'Prerequisite domains need strengthening before targeting these.',
    color: '#9ca3af',        // gray
    bg: '#f9fafb',
    border: '#e5e7eb',
    badgeBg: '#f3f4f6',
    badgeText: '#6b7280',
  },
}

/* ─────────────────────────────────────────────
   Analysis helpers
   ───────────────────────────────────────────── */

/**
 * Compute the average assessed score for a domain.
 * Returns { avg, assessed, total }.
 */
function getDomainAvg(domainId, assessments) {
  const domain = framework.find((d) => d.id === domainId)
  if (!domain) return { avg: 0, assessed: 0, total: 0 }

  let total = 0
  let assessed = 0
  let scoreSum = 0

  domain.subAreas.forEach((sa) => {
    sa.skillGroups.forEach((sg) => {
      sg.skills.forEach((skill) => {
        total++
        const level = assessments[skill.id]
        if (isAssessed(level)) {
          assessed++
          scoreSum += level
        }
      })
    })
  })

  return { avg: assessed > 0 ? scoreSum / assessed : 0, assessed, total }
}

/**
 * Check whether all prerequisite domains for a given domain meet the
 * readiness threshold (avg >= 2.0).
 */
function prerequisitesMet(domainId, assessments) {
  const deps = DOMAIN_DEPS[domainId] || []
  if (deps.length === 0) return true

  return deps.every((depId) => {
    const { avg, assessed } = getDomainAvg(depId, assessments)
    // If nothing assessed yet in a prerequisite, consider it not met
    return assessed > 0 && avg >= 2.0
  })
}

/**
 * Count how many domains (directly or transitively) depend on a given domain.
 */
function countDownstreamDomains(domainId) {
  let count = 0
  Object.entries(DOMAIN_DEPS).forEach(([id, deps]) => {
    if (deps.includes(domainId)) count++
  })
  return count
}

/**
 * Count total skills across all downstream domains that are blocked by a gap
 * in the given domain.
 */
function countDownstreamSkills(domainId) {
  const downstreamIds = Object.entries(DOMAIN_DEPS)
    .filter(([, deps]) => deps.includes(domainId))
    .map(([id]) => id)

  let count = 0
  downstreamIds.forEach((dId) => {
    const domain = framework.find((d) => d.id === dId)
    if (domain) {
      domain.subAreas.forEach((sa) => {
        sa.skillGroups.forEach((sg) => {
          count += sg.skills.length
        })
      })
    }
  })
  return count
}

/**
 * Generate the rationale text for a recommendation.
 */
function getRationale(domainId, priority, assessments) {
  if (priority === 1) {
    const downstream = countDownstreamDomains(domainId)
    if (downstream > 0) {
      return `Foundation skill \u2014 blocks ${downstream} higher domain${downstream !== 1 ? 's' : ''}`
    }
    return 'Foundation skill \u2014 critical base for development'
  }

  if (priority === 2) {
    const deps = DOMAIN_DEPS[domainId] || []
    if (deps.length > 0) {
      const depNames = deps
        .map((dId) => framework.find((d) => d.id === dId)?.name)
        .filter(Boolean)
      return `Prerequisites met (${depNames.join(', ')})`
    }
    return 'No prerequisites \u2014 ready to target'
  }

  // priority 3
  const deps = DOMAIN_DEPS[domainId] || []
  const weakDeps = deps.filter((depId) => {
    const { avg, assessed } = getDomainAvg(depId, assessments)
    return assessed === 0 || avg < 2.0
  })
  const weakNames = weakDeps
    .map((dId) => framework.find((d) => d.id === dId)?.name)
    .filter(Boolean)
  return `Blocked by: ${weakNames.join(', ')}`
}

/**
 * Core analysis: walk the entire framework and produce prioritized
 * skill-level recommendations.
 */
function analyzeGaps(assessments) {
  const recommendations = []
  const influence = computeSkillInfluence(assessments)

  framework.forEach((domain) => {
    const domainAvg = getDomainAvg(domain.id, assessments)
    const prereqsMet = prerequisitesMet(domain.id, assessments)
    const isFoundation = FOUNDATION_IDS.has(domain.id)
    const downstream = countDownstreamDomains(domain.id)
    const downstreamSkills = countDownstreamSkills(domain.id)

    domain.subAreas.forEach((sa) => {
      sa.skillGroups.forEach((sg) => {
        sg.skills.forEach((skill) => {
          const level = assessments[skill.id] ?? null

          // Only recommend skills that aren't already "Solid"
          if (level === ASSESSMENT_LEVELS.SOLID) return

          // Determine priority tier
          let priority
          if (isFoundation) {
            priority = 1
          } else if (prereqsMet) {
            priority = 2
          } else {
            priority = 3
          }

          // Ceiling data
          const ceilingData = getSkillCeiling(skill.id, assessments)
          const ceiling = ceilingData?.ceiling ?? 3
          const inf = influence[skill.id]
          const capsDownstream = inf?.directDownstream || 0

          // Enhance rationale with ceiling info
          let rationale = getRationale(domain.id, priority, assessments)
          if (capsDownstream > 0 && (level == null || level < 2)) {
            rationale = `Caps ${capsDownstream} downstream skill${capsDownstream !== 1 ? 's' : ''}`
          }

          recommendations.push({
            skillId: skill.id,
            skillName: skill.name,
            domainId: domain.id,
            domainName: domain.name,
            domainNumber: domain.domain,
            subAreaId: sa.id,
            subAreaName: sa.name,
            skillGroupName: sg.name,
            level,
            priority,
            rationale,
            downstream,
            downstreamSkills,
            ceiling,
            capsDownstream,
          })
        })
      })
    })
  })

  // Sort within each priority: by ceiling impact (skills that cap more go first),
  // then downstream impact, then domain, then level
  recommendations.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    if (a.capsDownstream !== b.capsDownstream) return b.capsDownstream - a.capsDownstream
    if (a.downstreamSkills !== b.downstreamSkills) return b.downstreamSkills - a.downstreamSkills
    if (a.domainNumber !== b.domainNumber) return a.domainNumber - b.domainNumber
    if (a.level !== b.level) return a.level - b.level
    return 0
  })

  return recommendations
}

/* ─────────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────────── */

function SummaryCard({ label, count, color, bg, border, icon }) {
  return (
    <div
      className="rounded-xl px-5 py-4 border transition-all"
      style={{ backgroundColor: bg, borderColor: border }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shrink-0"
          style={{ backgroundColor: color + '18', color }}
        >
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold text-warm-800 font-display leading-none">
            {count}
          </div>
          <div className="text-xs text-warm-500 mt-0.5">{label}</div>
        </div>
      </div>
    </div>
  )
}

function RatingBadge({ level }) {
  const color = isAssessed(level) ? ASSESSMENT_COLORS[level] : '#9ca3af'
  const label = isAssessed(level) ? ASSESSMENT_LABELS[level] : 'Not Assessed'

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{
        backgroundColor: color + '25',
        color:
          !isAssessed(level)
            ? '#6b7280'
            : level === ASSESSMENT_LEVELS.NEEDS_WORK
            ? '#b63a2e'
            : level === ASSESSMENT_LEVELS.DEVELOPING
            ? '#9a6740'
            : '#31543d',
      }}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}

function SkillCard({ rec, onNavigateToAssess, isExpanded, onToggle, assessments }) {
  const [showTeachingNotes, setShowTeachingNotes] = useState(false)
  const config = PRIORITY_CONFIG[rec.priority]
  const desc = isExpanded ? getSkillDescription(rec.skillId) : null
  const playbook = isExpanded ? getTeachingPlaybook(rec.skillId) : null
  const targetLevel = isAssessed(rec.level) ? Math.min(rec.level + 1, 3) : 1
  const dataCollectionHint = !isAssessed(rec.level) || rec.level === 0
    ? 'Probe-based: structured trials to establish baseline'
    : rec.level === 1
    ? 'Trial-based: discrete trial data across settings'
    : 'Maintenance: periodic probes to confirm consistency'

  return (
    <div
      className="rounded-xl border px-5 py-4 transition-all hover:shadow-md group"
      style={{ borderColor: config.border, backgroundColor: '#fff' }}
    >
      {/* Top row: breadcrumb + rating */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="text-[11px] text-warm-400 leading-snug min-w-0">
          <span className="font-medium text-warm-500">D{rec.domainNumber}</span>
          <span className="mx-1.5">{'\u203A'}</span>
          <span>{rec.subAreaName}</span>
          <span className="mx-1.5">{'\u203A'}</span>
          <span className="text-warm-300">{rec.skillGroupName}</span>
        </div>
        <RatingBadge level={rec.level} />
      </div>

      {/* Skill name — clickable to expand */}
      <button
        onClick={onToggle}
        className="w-full text-left mb-2.5 flex items-center gap-2"
      >
        <span
          className="text-[10px] transition-transform duration-200 shrink-0 text-warm-400"
          style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          {'\u25B6'}
        </span>
        <h4 className="text-sm font-semibold text-warm-800 leading-snug">
          {rec.skillName}
        </h4>
      </button>

      {/* Expanded: operational definition */}
      {isExpanded && (
        <div className="mb-3 ml-5 space-y-2 border-l-2 pl-3" style={{ borderColor: config.border }}>
          {desc ? (
            <>
              <div>
                <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-0.5">Operational Definition</p>
                <p className="text-[11px] text-warm-600 leading-relaxed">{desc.description}</p>
              </div>
              {desc.looks_like && (
                <div>
                  <p className="text-[10px] font-semibold text-sage-600 uppercase tracking-wider mb-0.5">Observable When Present</p>
                  <p className="text-[11px] text-warm-600 leading-relaxed">{desc.looks_like}</p>
                </div>
              )}
              {desc.absence && (
                <div>
                  <p className="text-[10px] font-semibold text-coral-600 uppercase tracking-wider mb-0.5">Observable When Absent</p>
                  <p className="text-[11px] text-warm-600 leading-relaxed">{desc.absence}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-[11px] text-warm-400 italic">No operational definition available for this skill.</p>
          )}
          {/* Behavioral Indicators: current → target */}
          {(() => {
            const currentInd = getBehavioralIndicator(rec.skillId, rec.level)
            const targetInd = getBehavioralIndicator(rec.skillId, targetLevel)
            if (!currentInd && !targetInd) return null
            return (
              <div className="space-y-1.5">
                {currentInd && (
                  <div className="rounded-md px-2.5 py-1.5 text-[11px] leading-relaxed" style={{ backgroundColor: ASSESSMENT_COLORS[rec.level] + '12', borderLeft: `3px solid ${ASSESSMENT_COLORS[rec.level]}` }}>
                    <span className="font-medium" style={{ color: ASSESSMENT_COLORS[rec.level] }}>Current ({ASSESSMENT_LABELS[rec.level]}):</span>{' '}
                    <span className="text-warm-600">{currentInd}</span>
                  </div>
                )}
                {targetInd && (
                  <div className="rounded-md px-2.5 py-1.5 text-[11px] leading-relaxed" style={{ backgroundColor: ASSESSMENT_COLORS[targetLevel] + '12', borderLeft: `3px solid ${ASSESSMENT_COLORS[targetLevel]}` }}>
                    <span className="font-medium" style={{ color: ASSESSMENT_COLORS[targetLevel] }}>Target ({ASSESSMENT_LABELS[targetLevel]}):</span>{' '}
                    <span className="text-warm-600">{targetInd}</span>
                  </div>
                )}
              </div>
            )
          })()}
          {/* Teaching Notes — collapsible */}
          {playbook && (
            <div>
              <button
                onClick={() => setShowTeachingNotes(!showTeachingNotes)}
                className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors"
                style={{ color: showTeachingNotes ? '#6b7280' : '#9ca3af' }}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
                {showTeachingNotes ? 'Hide Teaching Notes' : 'Show Teaching Notes'}
              </button>
              {showTeachingNotes && (
                <div className="mt-1.5 space-y-1.5">
                  {playbook.context && (
                    <div>
                      <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-0.5">Context</p>
                      <p className="text-[11px] text-warm-600 leading-relaxed">{playbook.context}</p>
                    </div>
                  )}
                  {playbook.strategies?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-0.5">Strategies</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {playbook.strategies.map((s, i) => (
                          <li key={i} className="text-[11px] text-warm-600 leading-relaxed">{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {playbook.barriers && (
                    <div>
                      <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-0.5">Common Barriers</p>
                      <p className="text-[11px] text-warm-600 leading-relaxed">{playbook.barriers}</p>
                    </div>
                  )}
                  {playbook.measurement && (
                    <div>
                      <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-0.5">Measurement</p>
                      <p className="text-[11px] text-warm-600 leading-relaxed">{playbook.measurement}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Ceiling narrative */}
          {(() => {
            if (!assessments) return null
            const ceilingData = getSkillCeiling(rec.skillId, assessments)
            if (!ceilingData) return null
            const skillLevel = assessments[rec.skillId]
            if (skillLevel == null) return null
            const limiting = ceilingData.constrainingPrereqs.filter(p => p.imposedCeiling < 3)
            if (limiting.length === 0) return null
            const top = limiting[0]
            const prereqName = framework.flatMap(d => d.subAreas.flatMap(sa => sa.skillGroups.flatMap(sg => sg.skills))).find(s => s.id === top.id)?.name || top.id
            const prereqLabel = top.level != null ? ASSESSMENT_LABELS[top.level] : 'Not Assessed'
            const ceilingLabel = ASSESSMENT_LABELS[ceilingData.ceiling] || `${ceilingData.ceiling}`
            const prereqBtn = onNavigateToAssess ? (
              <button
                onClick={() => onNavigateToAssess(getSubAreaFromId(top.id))}
                className="underline underline-offset-2 decoration-blue-500 text-blue-700 hover:text-blue-900 font-semibold bg-blue-50 px-0.5 rounded not-italic transition-colors cursor-pointer"
              >
                {prereqName}
              </button>
            ) : <span className="font-medium">{prereqName}</span>

            if (skillLevel > ceilingData.ceiling) {
              return (
                <p className="text-xs text-amber-600 italic mt-1">
                  {rec.skillName} is rated above its ceiling ({ASSESSMENT_LABELS[skillLevel]} vs {ceilingLabel}).{' '}
                  {prereqBtn} at {prereqLabel} is the limiting factor.
                </p>
              )
            }
            if (ceilingData.ceiling < 3) {
              return (
                <p className="text-xs text-amber-600 italic mt-1">
                  Capped at {ceilingLabel} by {prereqBtn} ({prereqLabel}).{' '}
                  Improving <span className="font-medium not-italic">{prereqName}</span> would raise this ceiling.
                </p>
              )
            }
            return null
          })()}
          {/* Baseline → Target */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Baseline</span>
            <RatingBadge level={rec.level} />
            <span className="text-warm-400">{'\u2192'}</span>
            <span className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Target</span>
            <RatingBadge level={targetLevel} />
          </div>
          {/* Data collection suggestion */}
          <div>
            <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-0.5">Data Collection</p>
            <p className="text-[11px] text-warm-600">{dataCollectionHint}</p>
          </div>
        </div>
      )}

      {/* Bottom row: rationale + downstream + action */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Rationale */}
          <span
            className="text-[11px] px-2 py-0.5 rounded-md font-medium truncate"
            style={{ backgroundColor: config.badgeBg, color: config.badgeText }}
          >
            {rec.rationale}
          </span>

          {/* Ceiling info — show when this skill caps downstream */}
          {rec.capsDownstream > 0 && (
            <span className="text-[10px] text-purple-400 whitespace-nowrap shrink-0">
              Caps {rec.capsDownstream} skill{rec.capsDownstream !== 1 ? 's' : ''}
            </span>
          )}

          {/* Downstream count — show for all priorities with downstream impact */}
          {rec.downstreamSkills > 0 && !rec.capsDownstream && (
            <span className="text-[10px] text-warm-400 whitespace-nowrap shrink-0">
              Unlocks {rec.downstreamSkills} skill{rec.downstreamSkills !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Navigate button */}
        <button
          onClick={() => onNavigateToAssess(rec.subAreaId)}
          className="text-[11px] font-semibold px-3 py-1.5 min-h-[44px] rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center"
          style={{
            backgroundColor: config.color + '15',
            color: config.badgeText,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = config.color + '28'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = config.color + '15'
          }}
        >
          Jump to Assess {'\u2192'}
        </button>
      </div>
    </div>
  )
}

function TierSection({ priority, recommendations, onNavigateToAssess, defaultExpanded, assessments }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [expandedSkillId, setExpandedSkillId] = useState(null)
  const config = PRIORITY_CONFIG[priority]
  const count = recommendations.length

  if (count === 0) return null

  // Group by domain for a cleaner view
  const byDomain = useMemo(() => {
    const groups = {}
    recommendations.forEach((rec) => {
      if (!groups[rec.domainId]) {
        groups[rec.domainId] = {
          domainId: rec.domainId,
          domainName: rec.domainName,
          domainNumber: rec.domainNumber,
          skills: [],
        }
      }
      groups[rec.domainId].skills.push(rec)
    })
    return Object.values(groups).sort((a, b) => a.domainNumber - b.domainNumber)
  }, [recommendations])

  return (
    <div className="mb-6">
      {/* Section header — clickable to collapse/expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl border transition-all text-left group hover:shadow-sm"
        style={{ backgroundColor: config.bg, borderColor: config.border }}
        aria-expanded={expanded}
        aria-label={`${config?.label || priority} priority — ${count} skill${count !== 1 ? 's' : ''}`}
      >
        {/* Expand/collapse chevron */}
        <span
          className="text-sm transition-transform duration-200 shrink-0"
          style={{
            color: config.color,
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          {'\u25B6'}
        </span>

        {/* Priority badge */}
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
          style={{ backgroundColor: config.color + '20', color: config.color }}
        >
          P{priority}
        </span>

        {/* Label + subtitle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-warm-800">
              {config.label}
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: config.badgeBg, color: config.badgeText }}
            >
              {count} skill{count !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-[11px] text-warm-400 mt-0.5 truncate">
            {config.subtitle}
          </p>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 space-y-5 pl-2">
          {byDomain.map((group) => (
            <div key={group.domainId}>
              {/* Domain sub-header */}
              <div className="flex items-center gap-2 mb-2.5 px-3">
                <span
                  className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                  style={{ backgroundColor: config.color + '15', color: config.color }}
                >
                  {group.domainNumber}
                </span>
                <span className="text-xs font-semibold text-warm-600">
                  {group.domainName}
                </span>
                <span className="text-[10px] text-warm-300">
                  {group.skills.length} skill{group.skills.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Skill cards */}
              <div className="space-y-2">
                {group.skills.map((rec) => (
                  <SkillCard
                    key={rec.skillId}
                    rec={rec}
                    onNavigateToAssess={onNavigateToAssess}
                    isExpanded={expandedSkillId === rec.skillId}
                    onToggle={() => setExpandedSkillId(prev => prev === rec.skillId ? null : rec.skillId)}
                    assessments={assessments}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────── */

export default function GoalEngine({ assessments = {}, onNavigateToAssess, focusDomain = null, onClearFocus, clientName = '' }) {
  const { isPhone } = useResponsive()
  const hint = useContextualHint('hint-goals')
  const allRecommendations = useMemo(() => analyzeGaps(assessments), [assessments])

  // Filter by focus domain if set
  const recommendations = useMemo(() => {
    if (!focusDomain) return allRecommendations
    return allRecommendations.filter(r => r.domainId === focusDomain)
  }, [allRecommendations, focusDomain])

  const focusDomainName = useMemo(() => {
    if (!focusDomain) return null
    const d = framework.find(f => f.id === focusDomain)
    return d?.name || focusDomain
  }, [focusDomain])

  // Split into tiers
  const tier1 = useMemo(() => recommendations.filter((r) => r.priority === 1), [recommendations])
  const tier2 = useMemo(() => recommendations.filter((r) => r.priority === 2), [recommendations])
  const tier3 = useMemo(() => recommendations.filter((r) => r.priority === 3), [recommendations])

  const totalGaps = recommendations.length

  // Check if any skills have been assessed at all
  const hasAssessments = useMemo(() => {
    return Object.values(assessments).some(
      (level) => isAssessed(level)
    )
  }, [assessments])

  const handleNavigate = useCallback(
    (subAreaId) => {
      if (onNavigateToAssess) onNavigateToAssess(subAreaId)
    },
    [onNavigateToAssess]
  )

  const handleExportGoals = useCallback(() => {
    const rows = [['Client', 'Domain', 'Sub-Area', 'Skill', 'Current Level', 'Current Score',
      'Target Level', 'Target Score', 'Current Behavioral Indicator', 'Target Behavioral Indicator',
      'Operational Definition', 'Observable When Present',
      'Observable When Absent', 'Rationale', 'Priority', 'Downstream Impact']]

    for (const rec of recommendations) {
      const desc = getSkillDescription(rec.skillId)
      const currentLabel = isAssessed(rec.level) ? ASSESSMENT_LABELS[rec.level] : 'Not Assessed'
      const currentScore = isAssessed(rec.level) ? String(rec.level) : ''
      const targetLevel = isAssessed(rec.level) ? Math.min(rec.level + 1, ASSESSMENT_LEVELS.SOLID) : ASSESSMENT_LEVELS.NEEDS_WORK
      const targetLabel = ASSESSMENT_LABELS[targetLevel]

      rows.push([
        clientName || '',
        rec.domainName,
        rec.subAreaName,
        rec.skillName,
        currentLabel,
        currentScore,
        targetLabel,
        String(targetLevel),
        getBehavioralIndicator(rec.skillId, rec.level) || '',
        getBehavioralIndicator(rec.skillId, targetLevel) || '',
        desc?.description || '',
        desc?.looks_like || '',
        desc?.absence || '',
        rec.rationale,
        `P${rec.priority}`,
        rec.downstreamSkills > 0 ? `Unlocks ${rec.downstreamSkills} skills` : '',
      ])
    }

    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n')
    const filename = clientName
      ? `${clientName.replace(/[^a-zA-Z0-9]/g, '_')}_goals.csv`
      : 'goals_export.csv'
    downloadFile(csv, filename, 'text/csv;charset=utf-8')
  }, [recommendations, clientName])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
        {/* Contextual hint */}
        <ContextualHint show={hint.show} onDismiss={hint.dismiss} className="mb-4">
          Goals are auto-prioritized by ceiling impact — foundation skills that cap the most developmental surface come first. Each goal shows exactly which skills depend on it.
        </ContextualHint>

        {/* Page header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-warm-800 font-display">
              Goal Engine
            </h2>
            <p className="text-sm text-warm-500 mt-1">
              Auto-suggested treatment targets based on cascade dependency logic.
              Skills are prioritized by their position in the developmental hierarchy.
            </p>
          </div>
          {hasAssessments && totalGaps > 0 && (
            <button
              onClick={handleExportGoals}
              className="text-xs font-semibold px-3 py-2 min-h-[44px] rounded-lg border border-warm-200 bg-white text-warm-600 hover:bg-warm-50 hover:border-warm-300 transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Goals
            </button>
          )}
        </div>

        {/* Empty state */}
        {!hasAssessments && (
          <EmptyState preset="no-goals" onAction={() => handleNavigate('d1-sa1')} />
        )}

        {/* Dashboard content */}
        {hasAssessments && (
          <>
            {/* Focus domain banner */}
            {focusDomain && focusDomainName && (
              <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-sm text-amber-800">
                  Showing goals for <strong>{focusDomainName}</strong>
                </span>
                {onClearFocus && (
                  <button
                    onClick={onClearFocus}
                    className="text-xs text-amber-600 hover:text-amber-800 ml-auto transition-colors min-h-[44px] flex items-center"
                  >
                    Show all domains
                  </button>
                )}
              </div>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <SummaryCard
                label="Total Gaps"
                count={totalGaps}
                color="#7d5235"
                bg="#fdf8f0"
                border="#e8d5c0"
                icon="#"
              />
              <SummaryCard
                label="Foundation Gaps"
                count={tier1.length}
                color={PRIORITY_CONFIG[1].color}
                bg={PRIORITY_CONFIG[1].bg}
                border={PRIORITY_CONFIG[1].border}
                icon="!"
              />
              <SummaryCard
                label="Ready to Target"
                count={tier2.length}
                color={PRIORITY_CONFIG[2].color}
                bg={PRIORITY_CONFIG[2].bg}
                border={PRIORITY_CONFIG[2].border}
                icon={'\u2713'}
              />
              <SummaryCard
                label="Blocked"
                count={tier3.length}
                color={PRIORITY_CONFIG[3].color}
                bg={PRIORITY_CONFIG[3].bg}
                border={PRIORITY_CONFIG[3].border}
                icon={'\u29B8'}
              />
            </div>

            {/* All solid message */}
            {totalGaps === 0 && (
              <div className="text-center py-12 px-8">
                <div className="w-16 h-16 rounded-2xl bg-sage-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl text-sage-500">{'\u2713'}</span>
                </div>
                <h3 className="text-lg font-semibold text-warm-700 mb-2 font-display">
                  All Assessed Skills Are Solid
                </h3>
                <p className="text-sm text-warm-500 max-w-md mx-auto">
                  Every assessed skill is currently rated Solid. Continue
                  monitoring to ensure maintenance, or assess any remaining
                  unevaluated skills.
                </p>
              </div>
            )}

            {/* Priority tier sections */}
            {totalGaps > 0 && (
              <div>
                <TierSection
                  priority={1}
                  recommendations={tier1}
                  onNavigateToAssess={handleNavigate}
                  defaultExpanded={isPhone ? false : true}
                  assessments={assessments}
                />
                <TierSection
                  priority={2}
                  recommendations={tier2}
                  onNavigateToAssess={handleNavigate}
                  defaultExpanded={isPhone ? false : tier1.length === 0}
                  assessments={assessments}
                />
                <TierSection
                  priority={3}
                  recommendations={tier3}
                  onNavigateToAssess={handleNavigate}
                  defaultExpanded={false}
                  assessments={assessments}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
