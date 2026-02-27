import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { framework, ASSESSMENT_LEVELS, ASSESSMENT_LABELS, ASSESSMENT_COLORS } from '../data/framework.js'
import { getSkillDescription } from '../data/skillDescriptions.js'
import useResponsive from '../hooks/useResponsive.js'

/**
 * AdaptiveAssessment — Quick screening mode for SkillCascade
 *
 * Cuts a 300+ skill full assessment down to ~15 minutes via a four-phase
 * adaptive funnel:
 *
 *   Phase 1: Domain Screening (9 questions, ~2 min)
 *   Phase 2: Sub-Area Drill-Down (only Mixed/Weak domains)
 *   Phase 3: Skill-Level Detail (only Weak sub-areas)
 *   Phase 4: Summary & Apply
 *
 * Props:
 *   assessments  — current full assessment state
 *   onAssess     — setState updater for assessments
 *   onComplete   — callback when user finishes and applies results
 */

const PHASES = [
  { key: 1, label: 'Domains', short: '1' },
  { key: 2, label: 'Sub-Areas', short: '2' },
  { key: 3, label: 'Skills', short: '3' },
  { key: 4, label: 'Summary', short: '4' },
]

const SCREENING_RATINGS = ['Strong', 'Mixed', 'Weak', 'Skip']

const SCREENING_COLORS = {
  Strong: { bg: 'bg-sage-500', text: 'text-white', border: 'border-sage-500', ring: 'ring-sage-400' },
  Mixed: { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-500', ring: 'ring-amber-400' },
  Weak: { bg: 'bg-coral-500', text: 'text-white', border: 'border-coral-500', ring: 'ring-coral-400' },
  Skip: { bg: 'bg-warm-300', text: 'text-warm-700', border: 'border-warm-300', ring: 'ring-warm-300' },
}

const SCREENING_ICONS = {
  Strong: '\u2713',
  Mixed: '\u223C',
  Weak: '\u2717',
  Skip: '\u2014',
}

// ============================================================================
// Helpers
// ============================================================================

function countSkillsInDomain(domain) {
  let count = 0
  domain.subAreas.forEach((sa) => {
    sa.skillGroups.forEach((sg) => {
      count += sg.skills.length
    })
  })
  return count
}

function countSkillsInSubArea(subArea) {
  let count = 0
  subArea.skillGroups.forEach((sg) => {
    count += sg.skills.length
  })
  return count
}

function getSubAreasForDrillDown(domainRatings) {
  const results = []
  framework.forEach((domain) => {
    const rating = domainRatings[domain.id]
    if (rating === 'Mixed' || rating === 'Weak') {
      domain.subAreas.forEach((sa) => {
        results.push({ ...sa, domain })
      })
    }
  })
  return results
}

function getSkillsForDetail(subAreaRatings) {
  const results = []
  framework.forEach((domain) => {
    domain.subAreas.forEach((sa) => {
      if (subAreaRatings[sa.id] === 'Weak') {
        results.push({ ...sa, domain })
      }
    })
  })
  return results
}

// ============================================================================
// Main Component
// ============================================================================

const ADAPTIVE_DRAFT_KEY = 'skillcascade_adaptive_draft'

export default function AdaptiveAssessment({ assessments, onAssess, onComplete }) {
  // Restore draft from localStorage if available
  const savedDraft = useRef(null)
  try {
    const raw = localStorage.getItem(ADAPTIVE_DRAFT_KEY)
    if (raw) savedDraft.current = JSON.parse(raw)
  } catch { /* ignore */ }

  const [phase, setPhase] = useState(() => savedDraft.current?.phase || 1)
  const [domainRatings, setDomainRatings] = useState(() => savedDraft.current?.domainRatings || {})
  const [subAreaRatings, setSubAreaRatings] = useState(() => savedDraft.current?.subAreaRatings || {})
  const [skillRatings, setSkillRatings] = useState(() => savedDraft.current?.skillRatings || {})
  const [transitioning, setTransitioning] = useState(false)
  const [applied, setApplied] = useState(false)

  const { isPhone } = useResponsive()

  const contentRef = useRef(null)

  // Auto-save adaptive draft to localStorage on state changes
  useEffect(() => {
    const hasData = Object.keys(domainRatings).length > 0 || Object.keys(subAreaRatings).length > 0 || Object.keys(skillRatings).length > 0
    if (!hasData || applied) {
      localStorage.removeItem(ADAPTIVE_DRAFT_KEY)
      return
    }
    try {
      localStorage.setItem(ADAPTIVE_DRAFT_KEY, JSON.stringify({
        phase, domainRatings, subAreaRatings, skillRatings, savedAt: Date.now(),
      }))
    } catch { /* quota — ignore */ }
  }, [phase, domainRatings, subAreaRatings, skillRatings, applied])

  // Scroll to top on phase change
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [phase])

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const drillDownSubAreas = useMemo(
    () => getSubAreasForDrillDown(domainRatings),
    [domainRatings]
  )

  const detailSubAreas = useMemo(
    () => getSkillsForDetail(subAreaRatings),
    [subAreaRatings]
  )

  // Progress calculation
  const progress = useMemo(() => {
    if (phase === 1) {
      const rated = Object.keys(domainRatings).length
      return { rated, total: framework.length }
    }
    if (phase === 2) {
      const rated = drillDownSubAreas.filter((sa) => subAreaRatings[sa.id]).length
      return { rated, total: drillDownSubAreas.length }
    }
    if (phase === 3) {
      let total = 0
      let rated = 0
      detailSubAreas.forEach((sa) => {
        sa.skillGroups.forEach((sg) => {
          sg.skills.forEach((skill) => {
            total++
            if (skillRatings[skill.id] !== undefined) rated++
          })
        })
      })
      return { rated, total }
    }
    return { rated: 0, total: 0 }
  }, [phase, domainRatings, subAreaRatings, skillRatings, drillDownSubAreas, detailSubAreas])

  const progressPct = progress.total > 0 ? Math.round((progress.rated / progress.total) * 100) : 100

  // Can advance?
  const canAdvance = useMemo(() => {
    if (phase === 1) return Object.keys(domainRatings).length === framework.length
    if (phase === 2) return drillDownSubAreas.every((sa) => subAreaRatings[sa.id])
    if (phase === 3) return true // skill level is optional per spec
    return false
  }, [phase, domainRatings, subAreaRatings, drillDownSubAreas])

  // Determine whether phases 2 and 3 have work
  const hasPhase2Work = useMemo(() => {
    return framework.some((d) => {
      const r = domainRatings[d.id]
      return r === 'Mixed' || r === 'Weak'
    })
  }, [domainRatings])

  const hasPhase3Work = useMemo(() => {
    return Object.values(subAreaRatings).some((r) => r === 'Weak')
  }, [subAreaRatings])

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const transitionTo = useCallback((nextPhase) => {
    setTransitioning(true)
    setTimeout(() => {
      setPhase(nextPhase)
      setTransitioning(false)
    }, 200)
  }, [])

  const handleNext = useCallback(() => {
    if (phase === 1) {
      if (hasPhase2Work) {
        transitionTo(2)
      } else {
        // Skip phase 2 and 3 — go straight to summary
        transitionTo(4)
      }
    } else if (phase === 2) {
      if (hasPhase3Work) {
        transitionTo(3)
      } else {
        transitionTo(4)
      }
    } else if (phase === 3) {
      transitionTo(4)
    }
  }, [phase, hasPhase2Work, hasPhase3Work, transitionTo])

  const handleBack = useCallback(() => {
    if (phase === 2) transitionTo(1)
    else if (phase === 3) transitionTo(2)
    else if (phase === 4) {
      if (hasPhase3Work) transitionTo(3)
      else if (hasPhase2Work) transitionTo(2)
      else transitionTo(1)
    }
  }, [phase, hasPhase2Work, hasPhase3Work, transitionTo])

  // ---------------------------------------------------------------------------
  // Apply results to full assessment
  // ---------------------------------------------------------------------------

  const handleApply = useCallback(() => {
    const updates = {}

    framework.forEach((domain) => {
      const domainRating = domainRatings[domain.id]

      domain.subAreas.forEach((sa) => {
        const saRating = subAreaRatings[sa.id]

        sa.skillGroups.forEach((sg) => {
          sg.skills.forEach((skill) => {
            // Priority 1: Individual skill ratings from Phase 3
            if (skillRatings[skill.id] !== undefined) {
              updates[skill.id] = skillRatings[skill.id]
              return
            }

            // Priority 2: Sub-area level ratings from Phase 2
            if (saRating === 'Strong') {
              updates[skill.id] = ASSESSMENT_LEVELS.SOLID
              return
            }
            if (saRating === 'Mixed') {
              updates[skill.id] = ASSESSMENT_LEVELS.DEVELOPING
              return
            }
            // saRating === 'Weak' but no individual skill rating — leave as Needs Work
            if (saRating === 'Weak') {
              updates[skill.id] = ASSESSMENT_LEVELS.NEEDS_WORK
              return
            }

            // Priority 3: Domain level ratings (for domains rated Strong)
            if (domainRating === 'Strong') {
              updates[skill.id] = ASSESSMENT_LEVELS.SOLID
              return
            }

            // Skip or not rated — leave as Not Assessed
            if (domainRating === 'Skip' || saRating === 'Skip') {
              updates[skill.id] = ASSESSMENT_LEVELS.NOT_ASSESSED
            }
          })
        })
      })
    })

    onAssess((prev) => ({ ...prev, ...updates }))
    setApplied(true)
    if (onComplete) onComplete(updates)
  }, [domainRatings, subAreaRatings, skillRatings, onAssess, onComplete])

  // ---------------------------------------------------------------------------
  // Summary stats
  // ---------------------------------------------------------------------------

  const summaryStats = useMemo(() => {
    return framework.map((domain) => {
      const domainRating = domainRatings[domain.id]
      const totalSkills = countSkillsInDomain(domain)

      let strongSAs = 0
      let mixedSAs = 0
      let weakSAs = 0
      let skippedSAs = 0
      let detailedSkills = 0

      domain.subAreas.forEach((sa) => {
        const saRating = subAreaRatings[sa.id]
        if (saRating === 'Strong') strongSAs++
        else if (saRating === 'Mixed') mixedSAs++
        else if (saRating === 'Weak') {
          weakSAs++
          sa.skillGroups.forEach((sg) => {
            sg.skills.forEach((skill) => {
              if (skillRatings[skill.id] !== undefined) detailedSkills++
            })
          })
        } else skippedSAs++
      })

      return {
        domain,
        domainRating,
        totalSkills,
        totalSubAreas: domain.subAreas.length,
        strongSAs,
        mixedSAs,
        weakSAs,
        skippedSAs,
        detailedSkills,
      }
    })
  }, [domainRatings, subAreaRatings, skillRatings])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full bg-warm-50">
      {/* ---- Step indicator + progress bar ---- */}
      <div className="bg-white border-b border-warm-200 shrink-0">
        <div className="max-w-4xl mx-auto px-6 py-4">
          {/* Phase steps */}
          <div className="flex items-center justify-center gap-1 mb-3">
            {PHASES.map((p, i) => {
              const isCurrent = p.key === phase
              const isComplete = p.key < phase
              const isSkipped =
                (p.key === 2 && !hasPhase2Work && phase > 1) ||
                (p.key === 3 && !hasPhase3Work && phase > 2)

              return (
                <div key={p.key} className="flex items-center">
                  {i > 0 && (
                    <div className={`w-8 sm:w-12 h-0.5 mx-1 transition-colors duration-300 ${
                      isComplete || isCurrent ? 'bg-sage-400' : 'bg-warm-200'
                    }`} />
                  )}
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                        isCurrent
                          ? 'bg-sage-500 text-white ring-4 ring-sage-100 scale-110'
                          : isComplete
                            ? 'bg-sage-500 text-white'
                            : isSkipped
                              ? 'bg-warm-200 text-warm-400 line-through'
                              : 'bg-warm-100 text-warm-400'
                      }`}
                    >
                      {isComplete ? '\u2713' : p.short}
                    </div>
                    <span className={`text-[10px] font-medium whitespace-nowrap transition-colors duration-300 ${
                      isCurrent
                        ? 'text-sage-700'
                        : isComplete
                          ? 'text-sage-500'
                          : 'text-warm-400'
                    }`}>
                      {p.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Progress bar */}
          {phase < 4 && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-warm-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-sage-500 transition-all duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs text-warm-500 font-medium whitespace-nowrap">
                {progress.rated}/{progress.total} rated
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ---- Main content ---- */}
      <div
        ref={contentRef}
        className={`flex-1 overflow-y-auto transition-opacity duration-200 ${
          transitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="max-w-4xl mx-auto px-6 py-8">
          {phase === 1 && (
            <Phase1DomainScreening
              domainRatings={domainRatings}
              onRate={(domainId, rating) =>
                setDomainRatings((prev) => ({ ...prev, [domainId]: rating }))
              }
            />
          )}

          {phase === 2 && (
            <Phase2SubAreaDrillDown
              subAreas={drillDownSubAreas}
              subAreaRatings={subAreaRatings}
              domainRatings={domainRatings}
              onRate={(saId, rating) =>
                setSubAreaRatings((prev) => ({ ...prev, [saId]: rating }))
              }
            />
          )}

          {phase === 3 && (
            <Phase3SkillDetail
              subAreas={detailSubAreas}
              skillRatings={skillRatings}
              onRate={(skillId, level) =>
                setSkillRatings((prev) => ({ ...prev, [skillId]: level }))
              }
            />
          )}

          {phase === 4 && (
            <Phase4Summary
              summaryStats={summaryStats}
              applied={applied}
              onApply={handleApply}
            />
          )}
        </div>
      </div>

      {/* ---- Bottom navigation bar ---- */}
      <div className="bg-white border-t border-warm-200 shrink-0">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={phase === 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              phase === 1
                ? 'text-warm-300 cursor-not-allowed'
                : 'text-warm-600 hover:bg-warm-100 hover:text-warm-800'
            }`}
          >
            <span>{'\u2190'}</span>
            <span>Back</span>
          </button>

          <div className="text-xs text-warm-400">
            {phase < 4 ? `Phase ${phase} of 4` : 'Review & Apply'}
          </div>

          {phase < 4 ? (
            <button
              onClick={handleNext}
              disabled={!canAdvance}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                canAdvance
                  ? 'bg-sage-500 text-white hover:bg-sage-600 shadow-sm hover:shadow'
                  : 'bg-warm-200 text-warm-400 cursor-not-allowed'
              }`}
            >
              <span>Next</span>
              <span>{'\u2192'}</span>
            </button>
          ) : (
            !applied && (
              <button
                onClick={handleApply}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold bg-sage-500 text-white hover:bg-sage-600 shadow-sm hover:shadow transition-all min-h-[44px]"
              >
                <span>Apply to Full Assessment</span>
                <span>{'\u2192'}</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Phase 1 — Domain Screening
// ============================================================================

function Phase1DomainScreening({ domainRatings, onRate }) {
  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-warm-800 font-display mb-2">
          Quick Domain Screening
        </h2>
        <p className="text-sm text-warm-500 max-w-lg mx-auto">
          Rate each domain at a high level. This takes about 2 minutes. Domains
          marked "Mixed" or "Weak" will be explored in more detail next.
        </p>
      </div>

      <div className="grid gap-3">
        {framework.map((domain) => {
          const currentRating = domainRatings[domain.id]
          const skillCount = countSkillsInDomain(domain)

          return (
            <div
              key={domain.id}
              className={`bg-white rounded-xl border-2 p-5 transition-all duration-200 ${
                currentRating
                  ? `${getScreeningBorderClass(currentRating)} shadow-sm`
                  : 'border-warm-200 hover:border-warm-300 hover:shadow-sm'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Domain info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-warm-100 text-warm-500 text-xs font-bold shrink-0">
                      {domain.domain}
                    </span>
                    <h3 className="text-lg font-bold text-warm-800 font-display">
                      {domain.name}
                    </h3>
                    <span className="text-xs text-warm-400 hidden sm:inline">
                      {domain.subtitle}
                    </span>
                  </div>
                  <p className="text-sm text-warm-600 italic leading-relaxed mt-1">
                    {domain.coreQuestion}
                  </p>
                  <p className="text-[11px] text-warm-400 mt-1">
                    {domain.subAreas.length} sub-areas &middot; {skillCount} skills
                  </p>
                </div>

                {/* Rating buttons */}
                <div className="flex flex-wrap gap-2 shrink-0 sm:pt-1">
                  {SCREENING_RATINGS.map((rating) => {
                    const isSelected = currentRating === rating
                    const colors = SCREENING_COLORS[rating]

                    return (
                      <button
                        key={rating}
                        onClick={() => onRate(domain.id, rating)}
                        className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 min-w-[72px] min-h-[44px] ${
                          isSelected
                            ? `${colors.bg} ${colors.text} ring-2 ring-offset-2 ${colors.ring} scale-105 shadow-md`
                            : 'bg-warm-100 text-warm-500 hover:bg-warm-200 hover:text-warm-700 hover:scale-[1.02]'
                        }`}
                      >
                        <span className="block text-base leading-none mb-0.5">
                          {SCREENING_ICONS[rating]}
                        </span>
                        <span className="block text-[11px]">{rating}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getScreeningBorderClass(rating) {
  if (rating === 'Strong') return 'border-sage-400'
  if (rating === 'Mixed') return 'border-amber-400'
  if (rating === 'Weak') return 'border-coral-400'
  return 'border-warm-300'
}

// ============================================================================
// Phase 2 — Sub-Area Drill-Down
// ============================================================================

function Phase2SubAreaDrillDown({ subAreas, subAreaRatings, domainRatings, onRate }) {
  // Group sub-areas by domain
  const grouped = useMemo(() => {
    const groups = []
    let currentDomainId = null
    let currentGroup = null

    subAreas.forEach((sa) => {
      if (sa.domain.id !== currentDomainId) {
        currentDomainId = sa.domain.id
        currentGroup = { domain: sa.domain, subAreas: [] }
        groups.push(currentGroup)
      }
      currentGroup.subAreas.push(sa)
    })

    return groups
  }, [subAreas])

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-warm-800 font-display mb-2">
          Sub-Area Drill-Down
        </h2>
        <p className="text-sm text-warm-500 max-w-lg mx-auto">
          These domains need more detail. Rate each sub-area within them.
          Sub-areas marked "Weak" will be explored at the skill level next.
        </p>
      </div>

      <div className="space-y-8">
        {grouped.map(({ domain, subAreas: sas }) => (
          <div key={domain.id}>
            {/* Domain header */}
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-warm-100 text-warm-500 text-sm font-bold shrink-0">
                {domain.domain}
              </span>
              <div>
                <h3 className="text-lg font-bold text-warm-800 font-display leading-tight">
                  {domain.name}
                </h3>
                <p className="text-xs text-warm-400">
                  Rated "{domainRatings[domain.id]}" &mdash; {sas.length} sub-areas to review
                </p>
              </div>
              <RatingPill rating={domainRatings[domain.id]} small />
            </div>

            {/* Sub-area cards */}
            <div className="grid gap-3">
              {sas.map((sa) => {
                const currentRating = subAreaRatings[sa.id]
                const skillCount = countSkillsInSubArea(sa)

                return (
                  <div
                    key={sa.id}
                    className={`bg-white rounded-lg border-2 px-5 py-4 transition-all duration-200 ${
                      currentRating
                        ? `${getScreeningBorderClass(currentRating)} shadow-sm`
                        : 'border-warm-200 hover:border-warm-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-warm-700 leading-snug">
                          {sa.name}
                        </h4>
                        <p className="text-[11px] text-warm-400 mt-0.5">
                          {sa.skillGroups.length} skill groups &middot; {skillCount} skills
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 shrink-0">
                        {SCREENING_RATINGS.map((rating) => {
                          const isSelected = currentRating === rating
                          const colors = SCREENING_COLORS[rating]

                          return (
                            <button
                              key={rating}
                              onClick={() => onRate(sa.id, rating)}
                              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 min-w-[60px] min-h-[44px] ${
                                isSelected
                                  ? `${colors.bg} ${colors.text} ring-2 ring-offset-1 ${colors.ring} scale-105 shadow-sm`
                                  : 'bg-warm-100 text-warm-500 hover:bg-warm-200 hover:text-warm-700'
                              }`}
                            >
                              <span className="block text-sm leading-none mb-0.5">
                                {SCREENING_ICONS[rating]}
                              </span>
                              <span className="block text-[10px]">{rating}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Phase 3 — Skill-Level Detail
// ============================================================================

function Phase3SkillDetail({ subAreas, skillRatings, onRate }) {
  const [expandedSA, setExpandedSA] = useState(() => {
    // Auto-expand first sub-area
    return subAreas.length > 0 ? subAreas[0].id : null
  })

  // Update expansion when subAreas change
  useEffect(() => {
    if (subAreas.length > 0 && !subAreas.find((sa) => sa.id === expandedSA)) {
      setExpandedSA(subAreas[0].id)
    }
  }, [subAreas, expandedSA])

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-warm-800 font-display mb-2">
          Skill-Level Detail
        </h2>
        <p className="text-sm text-warm-500 max-w-lg mx-auto">
          These sub-areas were marked "Weak". Rate individual skills for precise
          assessment. Use the quick-fill buttons to speed things up.
        </p>
      </div>

      <div className="space-y-4">
        {subAreas.map((sa) => {
          const isExpanded = expandedSA === sa.id

          // Count rated skills in this sub-area
          let totalSkills = 0
          let ratedSkills = 0
          sa.skillGroups.forEach((sg) => {
            sg.skills.forEach((skill) => {
              totalSkills++
              if (skillRatings[skill.id] !== undefined) ratedSkills++
            })
          })

          return (
            <div
              key={sa.id}
              className="bg-white rounded-xl border border-warm-200 overflow-hidden transition-shadow duration-200 hover:shadow-sm"
            >
              {/* Sub-area header — collapsible */}
              <button
                onClick={() => setExpandedSA(isExpanded ? null : sa.id)}
                className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-warm-50 transition-colors min-h-[44px]"
              >
                <span className="text-xs text-warm-400 w-4">
                  {isExpanded ? '\u25BE' : '\u25B8'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-warm-400 font-medium">
                      {sa.domain.name}
                    </span>
                    <span className="text-warm-300">{'\u203A'}</span>
                    <h4 className="text-sm font-semibold text-warm-700 truncate">
                      {sa.name}
                    </h4>
                  </div>
                </div>

                {/* Mini progress */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-20 h-1.5 bg-warm-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sage-500 transition-all duration-300"
                      style={{
                        width: `${totalSkills > 0 ? (ratedSkills / totalSkills) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-warm-400 w-10 text-right">
                    {ratedSkills}/{totalSkills}
                  </span>
                </div>
              </button>

              {/* Expanded skill list */}
              {isExpanded && (
                <div className="border-t border-warm-100 px-5 py-4">
                  {/* Bulk actions */}
                  <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-warm-100">
                    <span className="text-xs text-warm-400 mr-1">Quick fill:</span>
                    {[
                      ASSESSMENT_LEVELS.NOT_ASSESSED,
                      ASSESSMENT_LEVELS.NEEDS_WORK,
                      ASSESSMENT_LEVELS.DEVELOPING,
                      ASSESSMENT_LEVELS.SOLID,
                    ].map((level) => (
                      <button
                        key={level}
                        onClick={() => {
                          sa.skillGroups.forEach((sg) => {
                            sg.skills.forEach((skill) => {
                              onRate(skill.id, level)
                            })
                          })
                        }}
                        className="text-[10px] px-2.5 py-1 rounded-md font-medium transition-all hover:scale-105 border border-warm-200 hover:border-warm-300 min-h-[44px]"
                        style={{
                          backgroundColor: ASSESSMENT_COLORS[level] + '20',
                          color:
                            level === ASSESSMENT_LEVELS.NOT_ASSESSED ? '#777' : undefined,
                        }}
                      >
                        All "{ASSESSMENT_LABELS[level]}"
                      </button>
                    ))}
                  </div>

                  {/* Skill groups */}
                  <div className="space-y-6">
                    {sa.skillGroups.map((sg) => (
                      <div key={sg.id}>
                        <h5 className="text-sm font-semibold text-warm-700 mb-3">
                          {sg.name}
                        </h5>
                        <div className="space-y-2">
                          {sg.skills.map((skill) => (
                            <SkillRater
                              key={skill.id}
                              skill={skill}
                              level={
                                skillRatings[skill.id] ??
                                ASSESSMENT_LEVELS.NOT_ASSESSED
                              }
                              onRate={(level) => onRate(skill.id, level)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Individual skill rating row — matches AssessmentPanel SkillRater
 */
function SkillRater({ skill, level, onRate }) {
  const [showDesc, setShowDesc] = useState(false)
  const desc = getSkillDescription(skill.id)

  return (
    <div className="flex items-start gap-4 py-2 px-3 rounded-lg hover:bg-warm-50 transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="text-sm text-warm-700 leading-snug group-hover:text-warm-900 transition-colors">
            {skill.name}
          </div>
          {desc && (
            <button
              onClick={() => setShowDesc(!showDesc)}
              className="text-warm-300 hover:text-warm-500 transition-colors shrink-0"
              title="Show description"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
        </div>
        {showDesc && desc && (
          <div className="mt-2 ml-0.5 text-xs space-y-1 border-l-2 border-warm-200 pl-3">
            <p className="text-warm-600">{desc.description}</p>
            {desc.looks_like && <p className="text-sage-600"><span className="font-medium">Present:</span> {desc.looks_like}</p>}
            {desc.absence && <p className="text-coral-600"><span className="font-medium">Absent:</span> {desc.absence}</p>}
          </div>
        )}
      </div>
      <div className="flex gap-1.5 shrink-0">
        {[
          ASSESSMENT_LEVELS.NOT_ASSESSED,
          ASSESSMENT_LEVELS.NEEDS_WORK,
          ASSESSMENT_LEVELS.DEVELOPING,
          ASSESSMENT_LEVELS.SOLID,
        ].map((val) => {
          const isSelected = level === val
          const labels = {
            [ASSESSMENT_LEVELS.NOT_ASSESSED]: '\u2014',
            [ASSESSMENT_LEVELS.NEEDS_WORK]: '1',
            [ASSESSMENT_LEVELS.DEVELOPING]: '2',
            [ASSESSMENT_LEVELS.SOLID]: '3',
          }
          return (
            <button
              key={val}
              onClick={() => onRate(val)}
              title={ASSESSMENT_LABELS[val]}
              aria-pressed={level === val}
              className={`w-8 h-8 min-w-[44px] min-h-[44px] rounded-lg text-xs font-bold transition-all ${
                isSelected
                  ? 'ring-2 ring-offset-1 ring-warm-400 scale-110 shadow-sm'
                  : 'opacity-40 hover:opacity-80 hover:scale-105'
              }`}
              style={{
                backgroundColor: ASSESSMENT_COLORS[val],
                color: val === ASSESSMENT_LEVELS.NOT_ASSESSED ? '#666' : '#fff',
              }}
            >
              {labels[val]}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Phase 4 — Summary
// ============================================================================

function Phase4Summary({ summaryStats, applied, onApply }) {
  const totalSkillsAffected = useMemo(() => {
    return summaryStats.reduce((sum, s) => sum + s.totalSkills, 0)
  }, [summaryStats])

  const strongDomains = summaryStats.filter((s) => s.domainRating === 'Strong')
  const mixedDomains = summaryStats.filter((s) => s.domainRating === 'Mixed')
  const weakDomains = summaryStats.filter((s) => s.domainRating === 'Weak')
  const skippedDomains = summaryStats.filter(
    (s) => s.domainRating === 'Skip' || !s.domainRating
  )

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-warm-800 font-display mb-2">
          Screening Summary
        </h2>
        <p className="text-sm text-warm-500 max-w-lg mx-auto">
          Review your adaptive screening results below. When ready, apply them
          to populate the full assessment.
        </p>
      </div>

      {/* Overall counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard
          label="Strong"
          count={strongDomains.length}
          color="bg-sage-50 text-sage-700 border-sage-200"
        />
        <StatCard
          label="Mixed"
          count={mixedDomains.length}
          color="bg-amber-50 text-amber-700 border-amber-200"
        />
        <StatCard
          label="Weak"
          count={weakDomains.length}
          color="bg-coral-50 text-coral-700 border-coral-200"
        />
        <StatCard
          label="Skipped"
          count={skippedDomains.length}
          color="bg-warm-50 text-warm-500 border-warm-200"
        />
      </div>

      {/* Domain breakdown */}
      <div className="space-y-3 mb-8">
        {summaryStats.map(({ domain, domainRating, totalSkills, totalSubAreas, strongSAs, mixedSAs, weakSAs, skippedSAs, detailedSkills }) => (
          <div
            key={domain.id}
            className="bg-white rounded-lg border border-warm-200 px-5 py-4"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-warm-100 text-warm-500 text-xs font-bold shrink-0">
                {domain.domain}
              </span>
              <h4 className="text-sm font-bold text-warm-800 font-display flex-1">
                {domain.name}
              </h4>
              <RatingPill rating={domainRating} />
            </div>

            {/* Sub-area breakdown (for Mixed/Weak domains) */}
            {(domainRating === 'Mixed' || domainRating === 'Weak') && (
              <div className="ml-10 mt-2">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-warm-500">
                  {strongSAs > 0 && (
                    <span>
                      <span className="inline-block w-2 h-2 rounded-full bg-sage-400 mr-1" />
                      {strongSAs} strong sub-area{strongSAs !== 1 ? 's' : ''}
                    </span>
                  )}
                  {mixedSAs > 0 && (
                    <span>
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />
                      {mixedSAs} mixed
                    </span>
                  )}
                  {weakSAs > 0 && (
                    <span>
                      <span className="inline-block w-2 h-2 rounded-full bg-coral-400 mr-1" />
                      {weakSAs} weak
                      {detailedSkills > 0 && (
                        <span className="text-warm-400">
                          {' '}({detailedSkills} skill{detailedSkills !== 1 ? 's' : ''} detailed)
                        </span>
                      )}
                    </span>
                  )}
                  {skippedSAs > 0 && (
                    <span>
                      <span className="inline-block w-2 h-2 rounded-full bg-warm-300 mr-1" />
                      {skippedSAs} skipped
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Mapping explanation */}
            <div className="ml-10 mt-2 text-[11px] text-warm-400">
              {domainRating === 'Strong' && (
                <span>All {totalSkills} skills will be set to Solid (3)</span>
              )}
              {domainRating === 'Mixed' && (
                <span>
                  {totalSubAreas} sub-areas mapped individually &middot;{' '}
                  {totalSkills} skills total
                </span>
              )}
              {domainRating === 'Weak' && (
                <span>
                  {totalSubAreas} sub-areas mapped individually &middot;{' '}
                  {totalSkills} skills total
                </span>
              )}
              {(domainRating === 'Skip' || !domainRating) && (
                <span>All {totalSkills} skills will remain Not Assessed (0)</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Apply button */}
      {!applied ? (
        <div className="text-center">
          <p className="text-xs text-warm-400 mb-3">
            This will update {totalSkillsAffected} skills in the full assessment.
            Existing ratings will be overwritten.
          </p>
          <button
            onClick={onApply}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-base font-bold bg-sage-500 text-white hover:bg-sage-600 shadow-md hover:shadow-lg transition-all hover:scale-[1.02] min-h-[44px]"
          >
            <span>Apply to Full Assessment</span>
            <span>{'\u2192'}</span>
          </button>
        </div>
      ) : (
        <div className="text-center bg-sage-50 border border-sage-200 rounded-xl p-6">
          <div className="text-3xl mb-2">{'\u2713'}</div>
          <h3 className="text-lg font-bold text-sage-800 font-display mb-1">
            Results Applied
          </h3>
          <p className="text-sm text-sage-600">
            {totalSkillsAffected} skills have been updated in the full assessment.
            You can now switch to the full Assess view to review or refine
            individual ratings.
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Shared small components
// ============================================================================

function StatCard({ label, count, color }) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-center ${color}`}>
      <div className="text-2xl font-bold font-display">{count}</div>
      <div className="text-xs font-medium">{label}</div>
    </div>
  )
}

function RatingPill({ rating, small = false }) {
  if (!rating) return null

  const colorMap = {
    Strong: 'bg-sage-100 text-sage-700',
    Mixed: 'bg-amber-100 text-amber-700',
    Weak: 'bg-coral-100 text-coral-700',
    Skip: 'bg-warm-100 text-warm-500',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${
        colorMap[rating] || 'bg-warm-100 text-warm-500'
      } ${small ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}
    >
      <span>{SCREENING_ICONS[rating]}</span>
      <span>{rating}</span>
    </span>
  )
}
