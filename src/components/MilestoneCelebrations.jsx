import { useMemo } from 'react'
import { framework, ASSESSMENT_LEVELS, getDomainScores } from '../data/framework.js'

/* ─────────────────────────────────────────────
   SVG Icons (inline, no emoji, no icon libraries)
   ───────────────────────────────────────────── */

const ICONS = {
  seedling: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 18V9" />
      <path d="M10 9c0-4 3-6 7-6-1 4-3 6-7 6z" />
      <path d="M10 12c0-3-2.5-5-6-5 .5 3 2.5 5 6 5z" />
    </svg>
  ),
  star: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M10 2l2.4 4.8 5.3.8-3.85 3.7.9 5.3L10 14.1l-4.75 2.5.9-5.3L2.3 7.6l5.3-.8z" />
    </svg>
  ),
  arrow: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 16V4" />
      <path d="M5 8l5-5 5 5" />
      <path d="M4 18h12" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2L3 6v4c0 4.4 3 8.5 7 10 4-1.5 7-5.6 7-10V6l-7-4z" />
      <path d="M7.5 10l2 2 3.5-3.5" />
    </svg>
  ),
  chart: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17V9l4-2v10" />
      <path d="M9 17V5l4-3v15" />
      <path d="M15 17v-7l3-2v9" />
    </svg>
  ),
}

/* ─────────────────────────────────────────────
   Milestone category themes
   ───────────────────────────────────────────── */

const CATEGORY_THEMES = {
  'First Steps': {
    icon: ICONS.seedling,
    bg: '#fdf8f0',
    border: '#e8d5c0',
    iconBg: '#f5ebe0',
    iconColor: '#c49a6c',
    glow: 'rgba(196, 154, 108, 0.15)',
    gradientFrom: '#fdf8f0',
    gradientTo: '#f5ebe0',
  },
  Mastery: {
    icon: ICONS.star,
    bg: '#f2f7f3',
    border: '#b8d4be',
    iconBg: '#dceadf',
    iconColor: '#5a9465',
    glow: 'rgba(90, 148, 101, 0.15)',
    gradientFrom: '#f2f7f3',
    gradientTo: '#dceadf',
  },
  Growth: {
    icon: ICONS.arrow,
    bg: '#f0f5f5',
    border: '#b3cece',
    iconBg: '#d6e6e6',
    iconColor: '#4a8a8a',
    glow: 'rgba(74, 138, 138, 0.15)',
    gradientFrom: '#f0f5f5',
    gradientTo: '#d6e6e6',
  },
  Foundation: {
    icon: ICONS.shield,
    bg: '#f0f4f1',
    border: '#a8c4ad',
    iconBg: '#c8dccb',
    iconColor: '#3d7a4a',
    glow: 'rgba(61, 122, 74, 0.15)',
    gradientFrom: '#f0f4f1',
    gradientTo: '#c8dccb',
  },
  Progress: {
    icon: ICONS.chart,
    bg: '#fdf8f0',
    border: '#e8d5c0',
    iconBg: '#f5ebe0',
    iconColor: '#c49a6c',
    glow: 'rgba(196, 154, 108, 0.15)',
    gradientFrom: '#fdf8f0',
    gradientTo: '#f5ebe0',
  },
}

/* ─────────────────────────────────────────────
   Analysis helpers
   ───────────────────────────────────────────── */

function getAllSkills() {
  const skills = []
  framework.forEach((domain) => {
    domain.subAreas.forEach((sa) => {
      sa.skillGroups.forEach((sg) => {
        sg.skills.forEach((skill) => {
          skills.push(skill)
        })
      })
    })
  })
  return skills
}

function getDomainStats(domain, assessments) {
  let total = 0
  let assessed = 0
  let scoreSum = 0

  domain.subAreas.forEach((sa) => {
    sa.skillGroups.forEach((sg) => {
      sg.skills.forEach((skill) => {
        total++
        const level = assessments[skill.id]
        if (level !== undefined && level !== ASSESSMENT_LEVELS.NOT_ASSESSED) {
          assessed++
          scoreSum += level
        }
      })
    })
  })

  return { total, assessed, avg: assessed > 0 ? scoreSum / assessed : 0 }
}

function getSubAreaStats(subArea, assessments) {
  let total = 0
  let allSolid = true

  subArea.skillGroups.forEach((sg) => {
    sg.skills.forEach((skill) => {
      total++
      const level = assessments[skill.id]
      if (level !== ASSESSMENT_LEVELS.SOLID) {
        allSolid = false
      }
    })
  })

  return { total, allSolid: total > 0 && allSolid }
}

/* ─────────────────────────────────────────────
   Milestone detection (pure function)
   ───────────────────────────────────────────── */

function detectMilestones(assessments, snapshots) {
  if (!assessments) return []

  const milestones = []
  const allSkills = getAllSkills()
  const totalSkills = allSkills.length

  // Count overall assessment stats
  let totalAssessed = 0
  let developingOrBetter = 0
  allSkills.forEach((skill) => {
    const level = assessments[skill.id]
    if (level !== undefined && level !== ASSESSMENT_LEVELS.NOT_ASSESSED) {
      totalAssessed++
      if (level >= ASSESSMENT_LEVELS.DEVELOPING) {
        developingOrBetter++
      }
    }
  })

  // 1. First Steps — first time any skill is assessed and no prior snapshots
  if (totalAssessed > 0 && snapshots.length === 0) {
    milestones.push({
      id: 'first-steps',
      category: 'First Steps',
      title: 'First Steps',
      description: `The journey has begun! ${totalAssessed} skill${totalAssessed > 1 ? 's have' : ' has'} been assessed. Every great achievement starts right here.`,
      when: 'Current',
    })
  }

  // 2. Domain Mastery — any domain averaging >= 2.5
  const domainScores = getDomainScores(assessments)
  domainScores.forEach((ds) => {
    if (ds.assessed > 0 && ds.score >= 2.5) {
      milestones.push({
        id: `domain-mastery-${ds.domainId}`,
        category: 'Mastery',
        title: `Domain Mastery: ${ds.domain}`,
        description: `${ds.domain} skills are now in the Solid range — amazing progress! Average score: ${ds.score.toFixed(1)}/3.0.`,
        when: 'Current',
      })
    }
  })

  // 3. Sub-area Mastery — any sub-area where ALL skills are Solid
  framework.forEach((domain) => {
    domain.subAreas.forEach((sa) => {
      const stats = getSubAreaStats(sa, assessments)
      if (stats.allSolid) {
        milestones.push({
          id: `subarea-mastery-${sa.id}`,
          category: 'Mastery',
          title: `Sub-area Mastery: ${sa.name}`,
          description: `Every skill in ${sa.name} (${domain.name}) is now Solid. What an achievement!`,
          when: 'Current',
        })
      }
    })
  })

  // 4. Big Improvement — compare current vs earliest snapshot, domain improved by >= 0.5
  if (snapshots.length > 0) {
    const earliest = snapshots[0]
    const earliestScores = getDomainScores(earliest.assessments || {})
    const currentScores = getDomainScores(assessments)

    currentScores.forEach((current, i) => {
      const prev = earliestScores[i]
      if (prev.assessed > 0 && current.assessed > 0) {
        const improvement = current.score - prev.score
        if (improvement >= 0.5) {
          milestones.push({
            id: `big-improvement-${current.domainId}`,
            category: 'Growth',
            title: `Big Improvement: ${current.domain}`,
            description: `${current.domain} improved by ${improvement.toFixed(1)} points since the first snapshot. Great progress!`,
            when: earliest.label ? `Since "${earliest.label}"` : 'Since first snapshot',
          })
        }
      }
    })
  }

  // 5. Assessment Complete — all skills in a domain assessed (no NOT_ASSESSED)
  framework.forEach((domain) => {
    const stats = getDomainStats(domain, assessments)
    if (stats.total > 0 && stats.assessed === stats.total) {
      milestones.push({
        id: `assessment-complete-${domain.id}`,
        category: 'Progress',
        title: `Assessment Complete: ${domain.name}`,
        description: `All ${stats.total} skills in ${domain.name} have been assessed. A thorough picture is emerging!`,
        when: 'Current',
      })
    }
  })

  // 6. Growth Streak — 3+ consecutive snapshots showing improvement in any domain
  if (snapshots.length >= 3) {
    framework.forEach((domain) => {
      let streak = 0
      let maxStreak = 0

      for (let i = 1; i < snapshots.length; i++) {
        const prevScores = getDomainScores(snapshots[i - 1].assessments || {})
        const currScores = getDomainScores(snapshots[i].assessments || {})
        const prevDomain = prevScores.find((d) => d.domainId === domain.id)
        const currDomain = currScores.find((d) => d.domainId === domain.id)

        if (prevDomain.assessed > 0 && currDomain.assessed > 0 && currDomain.score > prevDomain.score) {
          streak++
        } else {
          streak = 0
        }
        if (streak > maxStreak) maxStreak = streak
      }

      // Also check latest snapshot vs current
      if (snapshots.length > 0) {
        const lastSnapScores = getDomainScores(snapshots[snapshots.length - 1].assessments || {})
        const currentScores = getDomainScores(assessments)
        const lastDomain = lastSnapScores.find((d) => d.domainId === domain.id)
        const currDomain = currentScores.find((d) => d.domainId === domain.id)

        if (lastDomain.assessed > 0 && currDomain.assessed > 0 && currDomain.score > lastDomain.score) {
          streak++
        } else {
          streak = 0
        }
        if (streak > maxStreak) maxStreak = streak
      }

      if (maxStreak >= 3) {
        milestones.push({
          id: `growth-streak-${domain.id}`,
          category: 'Growth',
          title: `Growth Streak: ${domain.name}`,
          description: `${domain.name} has improved across ${maxStreak + 1} consecutive checkpoints. Consistent, steady growth!`,
          when: `Across ${maxStreak + 1} snapshots`,
        })
      }
    })
  }

  // 7. Foundation Strong — D1 (Regulation) and D2 (Self-Awareness) both averaging >= 2.5
  const d1Score = domainScores.find((d) => d.domainId === 'd1')
  const d2Score = domainScores.find((d) => d.domainId === 'd2')
  if (
    d1Score && d2Score &&
    d1Score.assessed > 0 && d2Score.assessed > 0 &&
    d1Score.score >= 2.5 && d2Score.score >= 2.5
  ) {
    milestones.push({
      id: 'foundation-strong',
      category: 'Foundation',
      title: 'Foundation Strong',
      description: 'Both Regulation and Self-Awareness are in the Solid range. This strong foundation supports growth across all other domains.',
      when: 'Current',
    })
  }

  // 8. Half Way — 50%+ of all skills at Developing or better
  if (totalSkills > 0 && developingOrBetter / totalSkills >= 0.5) {
    milestones.push({
      id: 'half-way',
      category: 'Progress',
      title: 'Halfway There',
      description: `Over half of all skills (${developingOrBetter}/${totalSkills}) are at Developing or better. Amazing momentum!`,
      when: 'Current',
    })
  }

  // 9. Almost There — 80%+ of all skills at Developing or better
  if (totalSkills > 0 && developingOrBetter / totalSkills >= 0.8) {
    milestones.push({
      id: 'almost-there',
      category: 'Progress',
      title: 'Almost There',
      description: `${Math.round((developingOrBetter / totalSkills) * 100)}% of all skills are Developing or better. The finish line is in sight!`,
      when: 'Current',
    })
  }

  return milestones
}

/* ─────────────────────────────────────────────
   Milestone Card
   ───────────────────────────────────────────── */

function MilestoneCard({ milestone, index }) {
  const theme = CATEGORY_THEMES[milestone.category] || CATEGORY_THEMES['Progress']

  return (
    <div className="relative flex gap-4 pb-8 last:pb-0">
      {/* Timeline connector line */}
      <div className="flex flex-col items-center">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{
            backgroundColor: theme.iconBg,
            color: theme.iconColor,
            boxShadow: `0 0 12px ${theme.glow}, 0 0 24px ${theme.glow}`,
          }}
        >
          {theme.icon}
        </div>
        <div
          className="w-0.5 flex-1 mt-2 last:hidden"
          style={{ backgroundColor: theme.border }}
        />
      </div>

      {/* Card content */}
      <div
        className="flex-1 rounded-xl px-5 py-4 -mt-1"
        style={{
          background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
          border: `1px solid ${theme.border}`,
          boxShadow: `0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px ${theme.border}`,
        }}
      >
        {/* Category badge */}
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: theme.iconBg,
              color: theme.iconColor,
            }}
          >
            {milestone.category}
          </span>
          <span className="text-[11px] text-warm-400 italic">
            {milestone.when}
          </span>
        </div>

        {/* Title */}
        <h3
          className="font-display text-sm font-semibold text-warm-800 mb-1"
        >
          {milestone.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-warm-600 leading-relaxed">
          {milestone.description}
        </p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Empty State
   ───────────────────────────────────────────── */

function EmptyState({ clientName }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {/* Decorative seedling */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
        style={{
          backgroundColor: '#f5ebe0',
          color: '#c49a6c',
          boxShadow: '0 0 20px rgba(196, 154, 108, 0.2)',
        }}
      >
        <svg className="w-7 h-7" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 18V9" />
          <path d="M10 9c0-4 3-6 7-6-1 4-3 6-7 6z" />
          <path d="M10 12c0-3-2.5-5-6-5 .5 3 2.5 5 6 5z" />
        </svg>
      </div>

      <h3 className="font-display text-base font-semibold text-warm-700 mb-2">
        Milestones await
      </h3>
      <p className="text-sm text-warm-500 leading-relaxed max-w-xs">
        Every journey starts with a single step. Milestones will appear here as{' '}
        <span className="font-medium text-warm-600">{clientName || 'this client'}</span>{' '}
        grows!
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────── */

export default function MilestoneCelebrations({
  assessments = {},
  snapshots = [],
  clientName = 'Client',
}) {
  const milestones = useMemo(
    () => detectMilestones(assessments, snapshots),
    [assessments, snapshots]
  )

  return (
    <div className="bg-white rounded-2xl border border-warm-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-warm-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#f5ebe0', color: '#c49a6c' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2l2.4 4.8 5.3.8-3.85 3.7.9 5.3L10 14.1l-4.75 2.5.9-5.3L2.3 7.6l5.3-.8z" />
            </svg>
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold text-warm-800">
              Milestones &amp; Achievements
            </h2>
            <p className="text-[11px] text-warm-400">
              {clientName ? `${clientName}\u2019s` : 'Client'} progress celebrations
            </p>
          </div>
        </div>

        {milestones.length > 0 && (
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: '#f5ebe0', color: '#c49a6c' }}
          >
            {milestones.length} milestone{milestones.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-5">
        {milestones.length === 0 ? (
          <EmptyState clientName={clientName} />
        ) : (
          <div className="relative">
            {/* Continuous timeline line behind icons */}
            <div
              className="absolute left-[19px] top-5 bottom-5 w-0.5"
              style={{ backgroundColor: '#e8d5c0', opacity: 0.5 }}
            />

            {/* Milestone cards */}
            <div className="relative">
              {milestones.map((milestone, index) => (
                <MilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
