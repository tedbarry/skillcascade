import { useMemo } from 'react'
import { framework, ASSESSMENT_LEVELS, getDomainScores, isAssessed } from '../data/framework.js'

/**
 * Parent-friendly domain labels — no clinical jargon
 */
const FRIENDLY_DOMAIN_NAMES = {
  d1: 'Managing Feelings & Energy',
  d2: 'Understanding Themselves',
  d3: 'Planning & Problem Solving',
  d4: 'Understanding Situations',
  d5: 'Expressing Needs & Ideas',
  d6: 'Getting Along with Others',
  d7: 'Thinking & Learning',
  d8: 'Staying Safe',
  d9: 'Support & Environment',
}

/**
 * Short encouraging blurbs for strong domains
 */
const STRENGTH_BLURBS = {
  d1: 'is showing real ability to manage their energy and emotions',
  d2: 'is building a strong sense of what they feel and why',
  d3: 'is getting better at planning ahead and following through',
  d4: 'is learning to size up situations and make good choices',
  d5: 'is finding their voice and communicating what they need',
  d6: 'is developing wonderful skills for connecting with others',
  d7: 'is building a healthy sense of who they are',
  d8: 'is doing well with safety awareness and following safety steps',
  d9: 'has a supportive environment that is helping them grow',
}

/**
 * Gentle descriptions for areas still developing
 */
const GROWING_BLURBS = {
  d1: 'Working on finding ways to manage big feelings and energy levels',
  d2: 'Working on understanding their own feelings and experiences',
  d3: 'Working on getting started with tasks and sticking with them',
  d4: 'Working on understanding different situations and making choices',
  d5: 'Working on sharing what they need and feel with others',
  d6: 'Working on building skills for friendships and social moments',
  d7: 'Working on building confidence and a positive self-image',
  d8: 'Working on recognizing and responding to safety situations',
  d9: 'Working on building a stronger support system around them',
}

/**
 * Parent-friendly assessment level labels
 */
const FRIENDLY_LEVELS = {
  [ASSESSMENT_LEVELS.NOT_PRESENT]: 'Not Yet Explored',
  [ASSESSMENT_LEVELS.NEEDS_WORK]: 'Growing',
  [ASSESSMENT_LEVELS.DEVELOPING]: 'Developing',
  [ASSESSMENT_LEVELS.SOLID]: 'Strong',
}

/**
 * Parent-friendly behavioral indicator templates — generic, warm language.
 * The clinical indicators are too technical for parents; these are universal.
 */
export const PARENT_INDICATOR_TEMPLATES = {
  0: 'This is a skill we haven\'t seen yet — it gives us a clear starting point.',
  1: 'We\'re starting to see the beginnings of this skill. With practice and support, it will grow.',
  2: 'This skill is developing nicely! Some situations are easier than others.',
  3: 'This is a real strength — it shows up reliably in many different situations.',
}

/**
 * SVG progress ring component
 */
function ProgressRing({ percent, size = 96, strokeWidth = 8, color = 'var(--color-sage-400)' }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-warm-200)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  )
}

/**
 * Simple horizontal progress bar
 */
function ProgressBar({ value, max = 3, label }) {
  const percent = max > 0 ? (value / max) * 100 : 0
  const barColor = value >= 2.0 ? 'bg-sage-400' : value >= 1.0 ? 'bg-warm-400' : 'bg-warm-300'

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-warm-600">{label}</span>
          <span className="text-xs text-warm-400">{FRIENDLY_LEVELS[Math.round(value)] || ''}</span>
        </div>
      )}
      <div className="w-full h-2.5 bg-warm-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out`}
          style={{ width: `${Math.max(percent, 2)}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Domain initial circle icon
 */
function DomainIcon({ domainId, variant = 'strength' }) {
  const initial = FRIENDLY_DOMAIN_NAMES[domainId]?.charAt(0) || '?'
  const bgColor = variant === 'strength' ? 'bg-sage-100 text-sage-600' : 'bg-warm-100 text-warm-500'

  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold font-display shrink-0 ${bgColor}`}>
      {initial}
    </div>
  )
}

/**
 * Arrow icon for progress direction
 */
function ProgressArrow({ direction }) {
  if (direction === 'up') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-sage-500">
        <path d="M8 12V4M8 4L4 8M8 4L12 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  // "steady" for same or regression — always gentle
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-warm-400">
      <path d="M3 8H13M13 8L10 5M13 8L10 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Star icon for strengths
 */
function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-sage-400 inline-block">
      <path
        d="M8 1L10.12 5.3L15 6.01L11.5 9.41L12.24 14.26L8 12.04L3.76 14.26L4.5 9.41L1 6.01L5.88 5.3L8 1Z"
        fill="currentColor"
      />
    </svg>
  )
}

/**
 * Heart icon for encouragement
 */
function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="text-coral-300 inline-block">
      <path
        d="M10 17.5C10 17.5 2.5 13 2.5 7.5C2.5 5 4.5 3 7 3C8.5 3 9.7 3.8 10 4.5C10.3 3.8 11.5 3 13 3C15.5 3 17.5 5 17.5 7.5C17.5 13 10 17.5 10 17.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

/**
 * Home icon for practice section
 */
function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-warm-500">
      <path
        d="M3 10L10 3L17 10M5 8.5V16C5 16.3 5.2 16.5 5.5 16.5H8.5V12.5C8.5 12.2 8.7 12 9 12H11C11.3 12 11.5 12.2 11.5 12.5V16.5H14.5C14.8 16.5 15 16.3 15 16V8.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Camera/snapshot icon
 */
function SnapshotIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="text-warm-400">
      <rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="11" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 5L8 3H12L13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/**
 * ParentDashboard — a warm, jargon-free view of assessment data for parents
 */
export default function ParentDashboard({
  assessments = {},
  clientName = 'Your Child',
  snapshots = [],
  onNavigateToAssess,
}) {
  // Compute domain scores
  const domainScores = useMemo(() => getDomainScores(assessments), [assessments])

  // Compute overall progress percentage (skills at Developing or Solid)
  const overallProgress = useMemo(() => {
    let developing = 0
    let total = 0

    framework.forEach((domain) => {
      domain.subAreas.forEach((sa) => {
        sa.skillGroups.forEach((sg) => {
          sg.skills.forEach((skill) => {
            const level = assessments[skill.id]
            if (isAssessed(level)) {
              total++
              if (level >= ASSESSMENT_LEVELS.DEVELOPING) {
                developing++
              }
            }
          })
        })
      })
    })

    return total > 0 ? Math.round((developing / total) * 100) : 0
  }, [assessments])

  // Count total assessed skills
  const totalAssessed = useMemo(() => {
    return Object.values(assessments).filter(
      (v) => isAssessed(v)
    ).length
  }, [assessments])

  // Separate domains into strengths and growing areas
  const { strengths, growing } = useMemo(() => {
    const s = []
    const g = []

    domainScores.forEach((ds) => {
      if (ds.assessed === 0) return
      // Find 2 specific growing skills (level 1) for parent-friendly context
      const domain = framework.find((d) => d.id === ds.domainId)
      const growingSkills = []
      if (domain) {
        for (const sa of domain.subAreas) {
          for (const sg of sa.skillGroups) {
            for (const skill of sg.skills) {
              const level = assessments[skill.id]
              if (level === ASSESSMENT_LEVELS.NEEDS_WORK && growingSkills.length < 2) {
                growingSkills.push(skill.name)
              }
            }
          }
        }
      }

      if (ds.score >= 2.0) {
        s.push({ ...ds, growingSkills })
      } else {
        g.push({ ...ds, growingSkills })
      }
    })

    // Sort strengths by score descending
    s.sort((a, b) => b.score - a.score)
    // Sort growing by score descending so the closest to success come first
    g.sort((a, b) => b.score - a.score)

    return { strengths: s, growing: g }
  }, [domainScores, assessments])

  // Compute progress comparisons if snapshots exist
  const progressComparisons = useMemo(() => {
    if (snapshots.length === 0) return null

    const latestSnapshot = snapshots[snapshots.length - 1]
    const previousScores = getDomainScores(latestSnapshot.assessments)

    return domainScores.map((current) => {
      const previous = previousScores.find((p) => p.domainId === current.domainId)
      const prevScore = previous?.score || 0
      const currentScore = current.score
      const diff = currentScore - prevScore

      let direction = 'steady'
      if (diff > 0.15) direction = 'up'
      // No "down" — we keep it positive with "steady"

      return {
        domainId: current.domainId,
        friendlyName: FRIENDLY_DOMAIN_NAMES[current.domainId],
        previousScore: prevScore,
        currentScore,
        direction,
        assessed: current.assessed > 0,
      }
    }).filter((c) => c.assessed)
  }, [domainScores, snapshots])

  // Determine the first sub-area of a domain for navigation
  function getFirstSubAreaId(domainId) {
    const domain = framework.find((d) => d.id === domainId)
    return domain?.subAreas?.[0]?.id || null
  }

  // Get encouraging welcome message
  function getWelcomeMessage() {
    if (totalAssessed === 0) {
      return `Welcome! This is where you'll see ${clientName}'s progress as skills are explored.`
    }
    if (overallProgress >= 70) {
      return `${clientName} is doing wonderfully! So many skills are developing or strong.`
    }
    if (overallProgress >= 40) {
      return `${clientName} is making meaningful progress across many areas. Every step forward counts!`
    }
    return `${clientName} is on their journey, and every skill explored is a step forward.`
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">

      {/* ─── Welcome Banner ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-warm-200 p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Progress ring */}
          <div className="relative shrink-0">
            <ProgressRing percent={overallProgress} size={96} strokeWidth={8} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold font-display text-warm-800">{overallProgress}%</span>
              <span className="text-[9px] text-warm-400 leading-tight">on track</span>
            </div>
          </div>

          <div className="text-center sm:text-left flex-1">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-warm-800 mb-2">
              {clientName}&apos;s Progress
            </h1>
            <p className="text-warm-500 text-sm leading-relaxed">
              {getWelcomeMessage()}
            </p>
            {totalAssessed > 0 && (
              <p className="text-warm-400 text-xs mt-2">
                {totalAssessed} skills explored so far
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── What's Going Great ──────────────────────────────── */}
      {strengths.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <StarIcon />
            <h2 className="text-lg font-display font-semibold text-warm-800">
              What&apos;s Going Great
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {strengths.map((ds) => (
              <button
                key={ds.domainId}
                onClick={() => onNavigateToAssess?.(getFirstSubAreaId(ds.domainId))}
                className="bg-white rounded-2xl shadow-sm border border-sage-200 p-5 text-left hover:shadow-md hover:border-sage-300 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <DomainIcon domainId={ds.domainId} variant="strength" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-warm-800 group-hover:text-sage-700 transition-colors">
                      {FRIENDLY_DOMAIN_NAMES[ds.domainId]}
                    </h3>
                    <p className="text-xs text-warm-500 mt-1 leading-relaxed">
                      {clientName} {STRENGTH_BLURBS[ds.domainId]}
                    </p>
                    <div className="mt-3">
                      <ProgressBar value={ds.score} max={3} />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-sage-500 font-medium">
                        {ds.assessed} of {ds.total} skills explored
                      </span>
                      <span className="text-[10px] text-warm-300 group-hover:text-sage-400 transition-colors">
                        View details
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ─── Building New Skills ─────────────────────────────── */}
      {growing.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <HeartIcon />
            <h2 className="text-lg font-display font-semibold text-warm-800">
              Building New Skills
            </h2>
          </div>
          <p className="text-xs text-warm-400 mb-4 ml-7">
            Areas where {clientName} is growing and building new abilities
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {growing.map((ds) => (
              <button
                key={ds.domainId}
                onClick={() => onNavigateToAssess?.(getFirstSubAreaId(ds.domainId))}
                className="bg-white rounded-2xl shadow-sm border border-warm-200 p-5 text-left hover:shadow-md hover:border-warm-300 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <DomainIcon domainId={ds.domainId} variant="growing" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-warm-800 group-hover:text-warm-600 transition-colors">
                      {FRIENDLY_DOMAIN_NAMES[ds.domainId]}
                    </h3>
                    <p className="text-xs text-warm-500 mt-1 leading-relaxed">
                      {GROWING_BLURBS[ds.domainId]}
                    </p>
                    {ds.growingSkills?.length > 0 && (
                      <p className="text-[10px] text-warm-400 mt-1 italic">
                        Currently building: {ds.growingSkills.join(', ')}
                      </p>
                    )}
                    <div className="mt-3">
                      <ProgressBar value={ds.score} max={3} />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-warm-400 font-medium">
                        {ds.assessed} of {ds.total} skills explored
                      </span>
                      <span className="text-[10px] text-warm-300 group-hover:text-warm-500 transition-colors">
                        View details
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ─── No Assessments Yet ──────────────────────────────── */}
      {totalAssessed === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-warm-200 p-8 text-center mb-6">
          <div className="mb-4">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto text-warm-300">
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M24 16V28M24 32V33" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="text-lg font-display font-semibold text-warm-700 mb-2">
            Ready to Get Started
          </h3>
          <p className="text-sm text-warm-500 max-w-md mx-auto leading-relaxed">
            Once skills are assessed, this page will show you a clear, friendly picture
            of {clientName}&apos;s strengths and the areas where they&apos;re growing.
            No jargon, no stress — just a helpful snapshot of progress.
          </p>
        </div>
      )}

      {/* ─── Progress Snapshot Comparison ────────────────────── */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <SnapshotIcon />
          <h2 className="text-lg font-display font-semibold text-warm-800">
            Progress Over Time
          </h2>
        </div>

        {progressComparisons && progressComparisons.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-warm-200 p-5">
            <p className="text-xs text-warm-500 mb-4">
              Compared to the last saved snapshot
              {snapshots.length > 0 && (
                <span className="text-warm-400">
                  {' '}({snapshots[snapshots.length - 1].label || 'previous'})
                </span>
              )}
            </p>
            <div className="space-y-3">
              {progressComparisons.map((comp) => (
                <div key={comp.domainId} className="flex items-center gap-3">
                  <div className="w-36 sm:w-44 text-xs text-warm-600 truncate shrink-0">
                    {comp.friendlyName}
                  </div>
                  <div className="flex-1">
                    <div className="w-full h-2 bg-warm-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          comp.currentScore >= 2.0 ? 'bg-sage-400' : 'bg-warm-400'
                        }`}
                        style={{ width: `${(comp.currentScore / 3) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 w-20 justify-end">
                    <ProgressArrow direction={comp.direction} />
                    <span className={`text-xs font-medium ${
                      comp.direction === 'up' ? 'text-sage-600' : 'text-warm-400'
                    }`}>
                      {comp.direction === 'up' ? 'Great!' : 'Steady'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {snapshots.length > 1 && (
              <p className="text-[10px] text-warm-400 mt-4 text-center">
                {snapshots.length} snapshots saved — keep going to see the bigger picture
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-warm-200 p-6 text-center">
            <p className="text-sm text-warm-500 leading-relaxed max-w-md mx-auto">
              Save a progress snapshot to start tracking how {clientName}&apos;s skills change over time.
              Snapshots let you look back and see how far they&apos;ve come — it&apos;s a wonderful
              way to notice growth that can be easy to miss day-to-day.
            </p>
          </div>
        )}
      </section>

      {/* ─── What You Can Do At Home ─────────────────────────── */}
      <section>
        <div className="bg-warm-100 rounded-2xl border border-warm-200 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-warm-200 flex items-center justify-center shrink-0">
              <HomeIcon />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-display font-semibold text-warm-700 mb-1">
                What You Can Do at Home
              </h3>
              <p className="text-xs text-warm-500 leading-relaxed mb-3">
                Small, everyday moments at home can make a big difference. The Home Practice
                module will offer simple, practical ideas you can weave into your daily
                routine — no special materials needed.
              </p>
              <span
                className="inline-block text-xs font-medium text-warm-400 bg-warm-50 rounded-lg px-4 py-2 border border-warm-200 cursor-default"
              >
                Coming Soon
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
