import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { framework, ASSESSMENT_LEVELS, ASSESSMENT_LABELS, ASSESSMENT_COLORS } from '../data/framework.js'
import { getBehavioralIndicator } from '../data/behavioralIndicators.js'
import { getStartHerePriority, getCeilingCoverage, getSkillCeiling } from '../data/skillInfluence.js'
import useResponsive from '../hooks/useResponsive.js'

/**
 * AdaptiveAssessment — "Start Here" cascade-aware initial assessment
 *
 * Replaces the old 4-phase adaptive funnel with a smarter approach:
 *   - Skills are presented in influence-priority order (most impactful first)
 *   - Real per-skill 0-3 ratings (no bulk domain stamps)
 *   - Behavioral indicators show what each level looks like
 *   - Live progress shows ceiling coverage across the framework
 *   - "Done for now" always available — no forced completion
 *
 * Props:
 *   assessments  — current full assessment state { skillId: level }
 *   onAssess     — setState updater for assessments
 *   onComplete   — callback when user finishes
 */

const BATCH_SIZE = 5
const DRAFT_KEY = 'skillcascade_adaptive_draft'
const DRAFT_VERSION = 2

const LEVEL_OPTIONS = [
  { level: ASSESSMENT_LEVELS.NOT_PRESENT, label: 'Not Present', short: 'NP' },
  { level: ASSESSMENT_LEVELS.NEEDS_WORK, label: 'Needs Work', short: 'NW' },
  { level: ASSESSMENT_LEVELS.DEVELOPING, label: 'Developing', short: 'Dev' },
  { level: ASSESSMENT_LEVELS.SOLID, label: 'Solid', short: 'Sol' },
]

export default function AdaptiveAssessment({ assessments, onAssess, onComplete }) {
  const [started, setStarted] = useState(false)
  const [batchIndex, setBatchIndex] = useState(0)
  const { isPhone, isTablet } = useResponsive()
  const contentRef = useRef(null)
  const [expandedSkill, setExpandedSkill] = useState(null)
  const [expandAll, setExpandAll] = useState(false)

  // Restore draft state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const draft = JSON.parse(raw)
        if (draft.version === DRAFT_VERSION) {
          setStarted(true)
          setBatchIndex(draft.batchIndex || 0)
        } else {
          localStorage.removeItem(DRAFT_KEY)
        }
      }
    } catch { /* ignore */ }
  }, [])

  // Save draft on batch change
  useEffect(() => {
    if (!started) return
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        version: DRAFT_VERSION,
        batchIndex,
        savedAt: Date.now(),
      }))
    } catch { /* quota */ }
  }, [started, batchIndex])

  // Stable priority queue — computed once on mount, not re-sorted on every rating.
  // This prevents batches from shifting when a skill gets rated.
  const [stableQueue, setStableQueue] = useState(() => getStartHerePriority(assessments))

  // Re-snapshot queue when session starts (but NOT on every rating)
  useEffect(() => {
    if (started && stableQueue.length === 0) {
      setStableQueue(getStartHerePriority(assessments))
    }
  }, [started])

  // Coverage tracking (this CAN update live — it's just stats, not ordering)
  const coverage = useMemo(
    () => getCeilingCoverage(assessments),
    [assessments]
  )

  // Total rated so far in this session
  const totalRated = useMemo(() => {
    let count = 0
    framework.forEach(d => d.subAreas.forEach(sa => sa.skillGroups.forEach(sg =>
      sg.skills.forEach(s => { if (assessments[s.id] != null) count++ })
    )))
    return count
  }, [assessments])

  // Remaining count (unassessed skills in the stable queue)
  const remainingCount = useMemo(
    () => stableQueue.filter(s => assessments[s.skillId] == null).length,
    [stableQueue, assessments]
  )

  // Current batch of skills from stable queue
  const currentBatch = useMemo(() => {
    const start = batchIndex * BATCH_SIZE
    return stableQueue.slice(start, start + BATCH_SIZE)
  }, [stableQueue, batchIndex])

  // Are there more batches?
  const hasMore = (batchIndex + 1) * BATCH_SIZE < stableQueue.length
  const totalBatches = Math.ceil(stableQueue.length / BATCH_SIZE)

  // Handle rating a skill
  const handleRate = useCallback((skillId, level) => {
    onAssess(prev => ({ ...prev, [skillId]: level }))
  }, [onAssess])

  // Navigation
  const handleNextBatch = useCallback(() => {
    setBatchIndex(prev => prev + 1)
    setExpandedSkill(null)
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [])

  const handlePrevBatch = useCallback(() => {
    setBatchIndex(prev => Math.max(0, prev - 1))
    setExpandedSkill(null)
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [])

  const handleDone = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY)
    if (onComplete) onComplete()
  }, [onComplete])

  // ─── Welcome Screen ───
  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="max-w-lg">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-sage-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <h2 className="text-2xl font-display font-bold text-warm-900 mb-2">Start Here</h2>
          <p className="text-warm-600 mb-6 leading-relaxed">
            Rate the most influential skills first — they set the ceiling for
            everything above them. Each rating you give immediately informs
            what the rest of the framework can look like.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-6 text-center">
            <StatBox
              value={stableQueue.length}
              label="skills to rate"
              color="text-warm-600"
            />
            <StatBox
              value={`${Math.round(coverage.coverage * 100)}%`}
              label="ceilings known"
              color="text-sage-600"
            />
            <StatBox
              value={totalRated}
              label="already rated"
              color="text-warm-500"
            />
          </div>
          <p className="text-xs text-warm-400 mb-4">
            You can stop at any time. The most impactful skills come first,
            so even 15-20 ratings gives useful coverage.
          </p>
          <button
            onClick={() => setStarted(true)}
            className="px-6 py-3 min-h-[44px] bg-sage-500 text-white rounded-lg font-semibold hover:bg-sage-600 transition-colors"
          >
            {totalRated > 0 ? 'Continue Rating' : 'Begin'}
          </button>
        </div>
      </div>
    )
  }

  // ─── Rating Interface ───
  const coveragePct = Math.round(coverage.coverage * 100)
  const goodCoverage = coveragePct >= 80

  return (
    <div className="flex flex-col h-full">
      {/* Progress Bar */}
      <div className={`sticky top-0 z-10 bg-warm-50 border-b border-warm-200 ${isPhone ? 'px-3 py-2' : 'px-4 py-3'}`}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-warm-800">Start Here</h3>
            <span className="text-xs text-warm-500">
              Batch {batchIndex + 1} of {totalBatches}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpandAll(e => !e)}
              className={`px-2.5 py-1.5 min-h-[36px] text-xs font-medium rounded-md border transition-colors ${
                expandAll
                  ? 'border-sage-400 bg-sage-50 text-sage-700'
                  : 'border-warm-300 text-warm-500 hover:bg-warm-100'
              }`}
              title={expandAll ? 'Collapse all descriptions' : 'Show all descriptions'}
            >
              {expandAll ? 'Hide All' : 'Show All'}
            </button>
            <button
              onClick={handleDone}
              className="px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-md bg-sage-500 text-white hover:bg-sage-600 transition-colors"
            >
              Done for now
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-[11px] text-warm-500 mb-1.5">
          <span>
            <span className="font-semibold text-warm-700">{totalRated}</span> rated
          </span>
          <span>
            <span className={`font-semibold ${goodCoverage ? 'text-sage-600' : 'text-warm-700'}`}>
              {coveragePct}%
            </span> ceilings known
          </span>
          <span>
            <span className="font-semibold text-warm-700">{remainingCount}</span> remaining
          </span>
        </div>

        {/* Coverage bar */}
        <div className="h-1.5 bg-warm-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${goodCoverage ? 'bg-sage-500' : 'bg-amber-400'}`}
            style={{ width: `${coveragePct}%` }}
          />
        </div>

        {goodCoverage && (
          <p className="text-[10px] text-sage-600 mt-1 font-medium">
            Great coverage — most skill ceilings are now informed by your ratings.
          </p>
        )}
      </div>

      {/* Skill Cards */}
      <div ref={contentRef} className={`flex-1 overflow-y-auto ${isPhone ? 'px-3 py-3' : 'px-4 py-4'}`}>
        {currentBatch.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">&#127881;</div>
            <h3 className="text-lg font-bold text-warm-800 mb-1">All skills rated!</h3>
            <p className="text-sm text-warm-500 mb-4">
              You've rated every skill in the framework.
            </p>
            <button
              onClick={handleDone}
              className="px-5 py-2.5 min-h-[44px] bg-sage-500 text-white rounded-lg font-semibold hover:bg-sage-600"
            >
              Finish
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Batch group header */}
            {(() => {
              const firstSkill = currentBatch[0]
              return (
                <div className="flex items-center gap-2 text-xs text-warm-500 mb-1">
                  <span className="font-semibold text-warm-600">{firstSkill.domainName}</span>
                  <span className="text-warm-300">|</span>
                  <span>{firstSkill.subAreaName}</span>
                  <span className="ml-auto text-warm-400">Tier {firstSkill.tier}</span>
                </div>
              )
            })()}

            {currentBatch.map((item) => (
              <SkillRatingCard
                key={item.skillId}
                item={item}
                currentLevel={assessments[item.skillId] ?? null}
                assessments={assessments}
                onRate={handleRate}
                expanded={expandAll || expandedSkill === item.skillId}
                onToggleExpand={() => setExpandedSkill(
                  expandedSkill === item.skillId ? null : item.skillId
                )}
                isPhone={isPhone}
              />
            ))}
          </div>
        )}

        {/* Navigation */}
        {currentBatch.length > 0 && (
          <div className="flex items-center justify-between mt-6 pb-4">
            <button
              onClick={handlePrevBatch}
              disabled={batchIndex === 0}
              className="px-4 py-2 min-h-[44px] text-sm font-medium rounded-md border border-warm-300 text-warm-600 hover:bg-warm-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-warm-400">
              {batchIndex + 1} / {totalBatches}
            </span>
            {hasMore ? (
              <button
                onClick={handleNextBatch}
                className="px-4 py-2 min-h-[44px] text-sm font-semibold rounded-md bg-sage-500 text-white hover:bg-sage-600 transition-colors"
              >
                Next batch
              </button>
            ) : (
              <button
                onClick={handleDone}
                className="px-4 py-2 min-h-[44px] text-sm font-semibold rounded-md bg-sage-500 text-white hover:bg-sage-600 transition-colors"
              >
                Finish
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Skill Rating Card ─── */

function SkillRatingCard({ item, currentLevel, assessments, onRate, expanded, onToggleExpand, isPhone }) {
  const ceilingData = useMemo(
    () => getSkillCeiling(item.skillId, assessments),
    [item.skillId, assessments]
  )
  const ceiling = ceilingData?.ceiling ?? 3
  const hasCeiling = ceilingData != null && ceiling < 3

  return (
    <div className={`rounded-lg border transition-all ${
      currentLevel != null
        ? 'border-sage-300 bg-sage-50/30'
        : 'border-warm-200 bg-white'
    }`}>
      {/* Header */}
      <button
        onClick={onToggleExpand}
        className="w-full text-left px-3 py-2.5 flex items-start gap-2 min-h-[44px]"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-warm-800 leading-tight">
              {item.skillName}
            </span>
            {currentLevel != null && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: ASSESSMENT_COLORS[currentLevel] + '20',
                  color: ASSESSMENT_COLORS[currentLevel],
                }}
              >
                {ASSESSMENT_LABELS[currentLevel]}
              </span>
            )}
          </div>
          <p className="text-[11px] text-warm-400 mt-0.5 leading-snug">
            {item.reason}
          </p>
          {hasCeiling && (
            <p className="text-[10px] mt-0.5 text-amber-600 font-medium">
              Ceiling: {ASSESSMENT_LABELS[ceiling]}
              {ceilingData.constrainingPrereqs[0] && (
                <span className="text-warm-400 font-normal">
                  {' '}(limited by prerequisite)
                </span>
              )}
            </p>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-warm-400 mt-0.5 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Rating buttons — always visible */}
      <div className={`px-3 pb-2.5 flex gap-1.5 ${isPhone ? '' : 'gap-2'}`}>
        {LEVEL_OPTIONS.map(opt => {
          const isSelected = currentLevel === opt.level
          const aboveCeiling = hasCeiling && opt.level > ceiling
          return (
            <button
              key={opt.level}
              onClick={() => onRate(item.skillId, opt.level)}
              className={`flex-1 py-1.5 min-h-[36px] rounded-md text-xs font-semibold transition-all ${
                isSelected
                  ? 'ring-2 ring-offset-1 shadow-sm'
                  : aboveCeiling
                    ? 'opacity-40 border border-dashed border-warm-300'
                    : 'border border-warm-200 hover:border-warm-400'
              }`}
              style={isSelected ? {
                backgroundColor: ASSESSMENT_COLORS[opt.level] + '20',
                color: ASSESSMENT_COLORS[opt.level],
                borderColor: ASSESSMENT_COLORS[opt.level],
                boxShadow: `0 0 0 2px ${ASSESSMENT_COLORS[opt.level]}40`,
              } : {}}
              title={aboveCeiling ? `Above ceiling (${ASSESSMENT_LABELS[ceiling]})` : opt.label}
            >
              {isPhone ? opt.short : opt.label}
            </button>
          )
        })}
      </div>

      {/* Expanded: behavioral indicators for all 4 levels */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-warm-100 pt-2">
          <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wide mb-1.5">
            What each level looks like:
          </p>
          <div className="space-y-1.5">
            {LEVEL_OPTIONS.map(opt => {
              const indicator = getBehavioralIndicator(item.skillId, opt.level)
              if (!indicator) return null
              const isActive = currentLevel === opt.level
              return (
                <div
                  key={opt.level}
                  className={`text-[11px] leading-relaxed rounded px-2 py-1.5 ${
                    isActive
                      ? 'ring-1'
                      : 'bg-warm-50'
                  }`}
                  style={isActive ? {
                    backgroundColor: ASSESSMENT_COLORS[opt.level] + '10',
                    borderColor: ASSESSMENT_COLORS[opt.level],
                    ringColor: ASSESSMENT_COLORS[opt.level] + '40',
                  } : {}}
                >
                  <span
                    className="font-bold"
                    style={{ color: ASSESSMENT_COLORS[opt.level] }}
                  >
                    {opt.label}:
                  </span>{' '}
                  <span className="text-warm-600">{indicator}</span>
                </div>
              )
            })}
          </div>
          {item.downstreamCount > 0 && (
            <p className="text-[10px] text-warm-400 mt-2 italic">
              This skill influences {item.downstreamCount} downstream skill{item.downstreamCount !== 1 ? 's' : ''}.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Stat Box ─── */

function StatBox({ value, label, color }) {
  return (
    <div className="text-center">
      <div className={`text-xl font-bold font-display ${color}`}>{value}</div>
      <div className="text-[10px] text-warm-500">{label}</div>
    </div>
  )
}
