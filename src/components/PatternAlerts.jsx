import { useState, useMemo } from 'react'
import {
  framework,
  ASSESSMENT_LEVELS,
  ASSESSMENT_LABELS,
  ASSESSMENT_COLORS,
} from '../data/framework.js'

/* ─────────────────────────────────────────────
   Constants & Config
   ───────────────────────────────────────────── */

const ALERT_TYPES = {
  REGRESSION: 'regression',
  PLATEAU: 'plateau',
  FOUNDATION: 'foundation',
  GAPS: 'gaps',
}

const ALERT_CONFIG = {
  [ALERT_TYPES.REGRESSION]: {
    label: 'Regression Detected',
    subtitle: 'Skills that dropped one or more levels since the last snapshot.',
    color: '#d44d3f',       // coral-500 / red
    bg: '#fdf2f1',          // coral-50
    border: '#f5b8b2',      // coral-200
    badgeBg: '#fce0dd',     // coral-100
    badgeText: '#b63a2e',   // coral-600
  },
  [ALERT_TYPES.PLATEAU]: {
    label: 'Plateau',
    subtitle: 'Domains where the average score has not moved across recent snapshots.',
    color: '#c49a6c',       // warm-400 / orange-gold
    bg: '#fdf8f0',          // warm-50
    border: '#e8d5c0',      // warm-200
    badgeBg: '#f5ebe0',     // warm-100
    badgeText: '#9a6740',   // warm-600
  },
  [ALERT_TYPES.FOUNDATION]: {
    label: 'Foundation Weakness',
    subtitle: 'Regulation or Self-Awareness lags behind higher domains, violating the cascade model.',
    color: '#e06b5f',       // coral-400
    bg: '#fdf2f1',          // coral-50
    border: '#f5b8b2',      // coral-200
    badgeBg: '#fce0dd',     // coral-100
    badgeText: '#b63a2e',   // coral-600
  },
  [ALERT_TYPES.GAPS]: {
    label: 'Unassessed Gaps',
    subtitle: 'Domains where more than half of skills have not been assessed.',
    color: '#9ca3af',       // gray-400
    bg: '#f9fafb',          // gray-50
    border: '#e5e7eb',      // gray-200
    badgeBg: '#f3f4f6',     // gray-100
    badgeText: '#6b7280',   // gray-500
  },
}

const FOUNDATION_IDS = new Set(['d1', 'd2'])

/* ─────────────────────────────────────────────
   SVG Icons (inline, no emojis)
   ───────────────────────────────────────────── */

const ICONS = {
  regression: (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5l5 5 3-3 6 6" />
      <path d="M14 13h3v-3" />
    </svg>
  ),
  plateau: (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10h14" />
      <path d="M3 6h3v8H3zM8 6h3v8H8zM13 6h4v8h-4z" />
    </svg>
  ),
  foundation: (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2L2 7h16L10 2z" />
      <path d="M4 7v8M8 7v8M12 7v8M16 7v8" />
      <path d="M2 15h16" />
      <path d="M4 11l2-2 2 2" />
    </svg>
  ),
  gaps: (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7" />
      <path d="M10 7v3M10 13h.01" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7" />
      <path d="M7 10l2 2 4-4" />
    </svg>
  ),
  chevron: (
    <span className="text-sm inline-block">{'\u25B6'}</span>
  ),
  jumpTo: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 10h10M12 7l3 3-3 3" />
    </svg>
  ),
}

/* ─────────────────────────────────────────────
   Analysis helpers
   ───────────────────────────────────────────── */

/**
 * Get average score and assessment counts for a domain given an assessments map.
 */
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

/**
 * Detect skill regressions by comparing current assessments against the most
 * recent snapshot. A regression is any skill that was rated higher in the
 * snapshot than it is currently.
 */
function detectRegressions(assessments, snapshots) {
  if (snapshots.length === 0) return []

  const latest = snapshots[snapshots.length - 1]
  const prev = latest.assessments || {}
  const alerts = []

  framework.forEach((domain) => {
    const regressions = []
    domain.subAreas.forEach((sa) => {
      sa.skillGroups.forEach((sg) => {
        sg.skills.forEach((skill) => {
          const prevLevel = prev[skill.id]
          const currLevel = assessments[skill.id]

          // Only compare if previous was actually assessed
          if (
            prevLevel !== undefined &&
            prevLevel !== ASSESSMENT_LEVELS.NOT_ASSESSED &&
            currLevel !== undefined &&
            currLevel < prevLevel
          ) {
            regressions.push({
              skillId: skill.id,
              skillName: skill.name,
              subAreaId: sa.id,
              subAreaName: sa.name,
              previousLevel: prevLevel,
              currentLevel: currLevel,
              drop: prevLevel - currLevel,
            })
          }
        })
      })
    })

    if (regressions.length > 0) {
      alerts.push({
        type: ALERT_TYPES.REGRESSION,
        domainId: domain.id,
        domainName: domain.name,
        domainNumber: domain.domain,
        skills: regressions,
        snapshotLabel: latest.label || 'Previous snapshot',
      })
    }
  })

  return alerts
}

/**
 * Detect domains that have plateaued — where the average score has not moved
 * more than 0.1 across the last 2+ snapshots (including current). Only flag
 * domains that are not already in the "Solid" range (avg >= 2.5).
 */
function detectPlateaus(assessments, snapshots) {
  if (snapshots.length < 1) return []

  const alerts = []

  framework.forEach((domain) => {
    // Build a sequence of averages: snapshots + current
    const avgs = []

    for (const snap of snapshots) {
      const stats = getDomainStats(domain, snap.assessments || {})
      if (stats.assessed > 0) {
        avgs.push(stats.avg)
      }
    }

    const currentStats = getDomainStats(domain, assessments)
    if (currentStats.assessed > 0) {
      avgs.push(currentStats.avg)
    }

    // Need at least 2 data points to detect a plateau
    if (avgs.length < 2) return

    // Check if every consecutive pair differs by at most 0.1
    let isFlat = true
    for (let i = 1; i < avgs.length; i++) {
      if (Math.abs(avgs[i] - avgs[i - 1]) > 0.1) {
        isFlat = false
        break
      }
    }

    // Skip if already solid
    const latestAvg = avgs[avgs.length - 1]
    if (latestAvg >= 2.5) return

    if (isFlat) {
      // Find the first sub-area in this domain as the navigation target
      const firstSubArea = domain.subAreas[0]
      alerts.push({
        type: ALERT_TYPES.PLATEAU,
        domainId: domain.id,
        domainName: domain.name,
        domainNumber: domain.domain,
        subAreaId: firstSubArea?.id,
        avg: latestAvg,
        dataPoints: avgs.length,
      })
    }
  })

  return alerts
}

/**
 * Detect foundation weakness — when D1 (Regulation) or D2 (Self-Awareness)
 * score significantly below the higher domains (D3+). This flags a violation
 * of the cascade model where higher skills may be fragile.
 */
function detectFoundationWeakness(assessments) {
  const alerts = []

  // Get D1 and D2 stats
  const foundationDomains = framework.filter((d) => FOUNDATION_IDS.has(d.id))
  const higherDomains = framework.filter(
    (d) => !FOUNDATION_IDS.has(d.id) && d.id !== 'd8' && d.id !== 'd9'
  )

  // Compute averages for higher domains that have been assessed
  const higherAvgs = higherDomains
    .map((d) => getDomainStats(d, assessments))
    .filter((s) => s.assessed > 0)

  if (higherAvgs.length === 0) return alerts

  const higherOverallAvg =
    higherAvgs.reduce((sum, s) => sum + s.avg, 0) / higherAvgs.length

  if (higherOverallAvg <= 2.0) return alerts

  foundationDomains.forEach((domain) => {
    const stats = getDomainStats(domain, assessments)
    if (stats.assessed === 0) return

    if (stats.avg < 2.0) {
      const gap = higherOverallAvg - stats.avg
      const firstSubArea = domain.subAreas[0]

      // Find which higher domains exceed 2.0
      const exceeding = higherDomains
        .map((d) => {
          const s = getDomainStats(d, assessments)
          return { domainName: d.name, avg: s.avg, assessed: s.assessed }
        })
        .filter((s) => s.assessed > 0 && s.avg > 2.0)

      alerts.push({
        type: ALERT_TYPES.FOUNDATION,
        domainId: domain.id,
        domainName: domain.name,
        domainNumber: domain.domain,
        subAreaId: firstSubArea?.id,
        foundationAvg: stats.avg,
        higherAvg: higherOverallAvg,
        gap,
        exceedingDomains: exceeding,
      })
    }
  })

  return alerts
}

/**
 * Detect unassessed gaps — domains where >50% of skills are still Not Assessed.
 */
function detectUnassessedGaps(assessments) {
  const alerts = []

  framework.forEach((domain) => {
    const stats = getDomainStats(domain, assessments)
    const unassessedPct = stats.total > 0 ? (stats.total - stats.assessed) / stats.total : 1

    if (unassessedPct > 0.5) {
      const firstSubArea = domain.subAreas[0]
      alerts.push({
        type: ALERT_TYPES.GAPS,
        domainId: domain.id,
        domainName: domain.name,
        domainNumber: domain.domain,
        subAreaId: firstSubArea?.id,
        assessed: stats.assessed,
        total: stats.total,
        pctUnassessed: Math.round(unassessedPct * 100),
      })
    }
  })

  return alerts
}

/**
 * Run all detection analyses and return grouped alerts.
 */
function analyzePatterns(assessments, snapshots) {
  const regressions = detectRegressions(assessments, snapshots)
  const plateaus = detectPlateaus(assessments, snapshots)
  const foundation = detectFoundationWeakness(assessments)
  const gaps = detectUnassessedGaps(assessments)

  return {
    [ALERT_TYPES.REGRESSION]: regressions,
    [ALERT_TYPES.PLATEAU]: plateaus,
    [ALERT_TYPES.FOUNDATION]: foundation,
    [ALERT_TYPES.GAPS]: gaps,
  }
}

/* ─────────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────────── */

/**
 * Collapsible section for a group of alerts of the same type.
 */
function AlertSection({ type, alerts, onNavigateToAssess, defaultExpanded }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const config = ALERT_CONFIG[type]

  if (!alerts || alerts.length === 0) return null

  const alertCount =
    type === ALERT_TYPES.REGRESSION
      ? alerts.reduce((sum, a) => sum + a.skills.length, 0)
      : alerts.length

  const countLabel = type === ALERT_TYPES.REGRESSION
    ? `${alertCount} skill${alertCount !== 1 ? 's' : ''}`
    : `${alertCount} domain${alertCount !== 1 ? 's' : ''}`

  return (
    <div className="mb-4">
      {/* Section header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl border transition-all text-left group hover:shadow-sm"
        style={{ backgroundColor: config.bg, borderColor: config.border }}
      >
        {/* Chevron */}
        <span
          className="text-sm transition-transform duration-200 shrink-0"
          style={{
            color: config.color,
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          {'\u25B6'}
        </span>

        {/* Icon */}
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: config.color + '20', color: config.color }}
        >
          {ICONS[type]}
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
              {countLabel}
            </span>
          </div>
          <p className="text-[11px] text-warm-400 mt-0.5 truncate">
            {config.subtitle}
          </p>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 space-y-2 pl-2">
          {type === ALERT_TYPES.REGRESSION &&
            alerts.map((alert) => (
              <RegressionCard
                key={alert.domainId}
                alert={alert}
                onNavigateToAssess={onNavigateToAssess}
              />
            ))}
          {type === ALERT_TYPES.PLATEAU &&
            alerts.map((alert) => (
              <PlateauCard
                key={alert.domainId}
                alert={alert}
                onNavigateToAssess={onNavigateToAssess}
              />
            ))}
          {type === ALERT_TYPES.FOUNDATION &&
            alerts.map((alert) => (
              <FoundationCard
                key={alert.domainId}
                alert={alert}
                onNavigateToAssess={onNavigateToAssess}
              />
            ))}
          {type === ALERT_TYPES.GAPS &&
            alerts.map((alert) => (
              <GapsCard
                key={alert.domainId}
                alert={alert}
                onNavigateToAssess={onNavigateToAssess}
              />
            ))}
        </div>
      )}
    </div>
  )
}

/**
 * Card showing skill regressions within a single domain.
 */
function RegressionCard({ alert, onNavigateToAssess }) {
  const config = ALERT_CONFIG[ALERT_TYPES.REGRESSION]

  return (
    <div
      className="rounded-lg border px-4 py-3"
      style={{ borderColor: config.border, backgroundColor: '#fff' }}
    >
      {/* Domain header */}
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
          style={{ backgroundColor: config.color + '15', color: config.color }}
        >
          {alert.domainNumber}
        </span>
        <span className="text-xs font-semibold text-warm-700">
          {alert.domainName}
        </span>
        <span className="text-[10px] text-warm-300">
          {alert.skills.length} skill{alert.skills.length !== 1 ? 's' : ''} regressed
        </span>
      </div>

      {/* Skill rows */}
      <div className="space-y-1.5">
        {alert.skills.map((skill) => (
          <div
            key={skill.skillId}
            className="flex items-center gap-2 text-xs group"
          >
            {/* Level change indicator */}
            <div className="flex items-center gap-1 shrink-0">
              <span
                className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center"
                style={{
                  backgroundColor: ASSESSMENT_COLORS[skill.previousLevel] + '30',
                  color: ASSESSMENT_COLORS[skill.previousLevel],
                }}
              >
                {skill.previousLevel}
              </span>
              <span className="text-warm-300">{'\u2192'}</span>
              <span
                className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center"
                style={{
                  backgroundColor: ASSESSMENT_COLORS[skill.currentLevel] + '30',
                  color: ASSESSMENT_COLORS[skill.currentLevel],
                }}
              >
                {skill.currentLevel}
              </span>
            </div>

            {/* Skill name */}
            <span className="text-warm-600 flex-1 min-w-0 truncate">
              {skill.skillName}
            </span>

            {/* Level labels */}
            <span className="text-[10px] text-warm-300 shrink-0 hidden sm:inline">
              {ASSESSMENT_LABELS[skill.previousLevel]} {'\u2192'} {ASSESSMENT_LABELS[skill.currentLevel]}
            </span>

            {/* Jump button */}
            {onNavigateToAssess && (
              <button
                onClick={() => onNavigateToAssess(skill.subAreaId)}
                className="text-warm-300 hover:text-sage-600 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                title={`Jump to ${skill.subAreaName}`}
              >
                {ICONS.jumpTo}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Snapshot reference */}
      <div className="mt-2.5 pt-2 border-t border-warm-100">
        <span className="text-[10px] text-warm-300">
          Compared against: {alert.snapshotLabel}
        </span>
      </div>
    </div>
  )
}

/**
 * Card showing a plateaued domain.
 */
function PlateauCard({ alert, onNavigateToAssess }) {
  const config = ALERT_CONFIG[ALERT_TYPES.PLATEAU]

  return (
    <div
      className="rounded-lg border px-4 py-3 flex items-center gap-4"
      style={{ borderColor: config.border, backgroundColor: '#fff' }}
    >
      {/* Domain number */}
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
        style={{ backgroundColor: config.color + '20', color: config.color }}
      >
        {alert.domainNumber}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-warm-700">
          {alert.domainName}
        </div>
        <div className="text-[11px] text-warm-400 mt-0.5">
          Average score has held at {alert.avg.toFixed(1)} across {alert.dataPoints} data point{alert.dataPoints !== 1 ? 's' : ''}.
          Consider reviewing intervention strategies or skill targets.
        </div>
      </div>

      {/* Score badge */}
      <div className="text-center shrink-0">
        <div
          className="text-sm font-bold"
          style={{ color: config.color }}
        >
          {alert.avg.toFixed(1)}
        </div>
        <div className="text-[9px] text-warm-300">avg</div>
      </div>

      {/* Jump */}
      {onNavigateToAssess && alert.subAreaId && (
        <button
          onClick={() => onNavigateToAssess(alert.subAreaId)}
          className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1.5 rounded-md bg-warm-50 text-warm-500 hover:bg-warm-100 hover:text-warm-700 transition-colors shrink-0"
        >
          {ICONS.jumpTo}
          <span>Assess</span>
        </button>
      )}
    </div>
  )
}

/**
 * Card showing a foundation weakness (cascade violation).
 */
function FoundationCard({ alert, onNavigateToAssess }) {
  const config = ALERT_CONFIG[ALERT_TYPES.FOUNDATION]

  return (
    <div
      className="rounded-lg border px-4 py-3"
      style={{ borderColor: config.border, backgroundColor: '#fff' }}
    >
      <div className="flex items-start gap-3">
        {/* Domain badge */}
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
          style={{ backgroundColor: config.color + '20', color: config.color }}
        >
          D{alert.domainNumber}
        </span>

        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-warm-700">
            {alert.domainName} is lagging behind higher domains
          </div>

          {/* Score comparison */}
          <div className="flex items-center gap-3 mt-2">
            <div className="text-center">
              <div
                className="text-base font-bold"
                style={{ color: config.color }}
              >
                {alert.foundationAvg.toFixed(1)}
              </div>
              <div className="text-[9px] text-warm-300">{alert.domainName}</div>
            </div>
            <div className="text-warm-200 text-xs">vs</div>
            <div className="text-center">
              <div className="text-base font-bold text-sage-600">
                {alert.higherAvg.toFixed(1)}
              </div>
              <div className="text-[9px] text-warm-300">Higher domains</div>
            </div>
            <div
              className="text-[10px] font-medium px-2 py-0.5 rounded-full ml-1"
              style={{ backgroundColor: config.badgeBg, color: config.badgeText }}
            >
              -{alert.gap.toFixed(1)} gap
            </div>
          </div>

          {/* Cascade warning */}
          <p className="text-[11px] text-warm-400 mt-2">
            The cascade model expects foundational skills (D1, D2) to be stable before
            higher domains are targeted. Skills in{' '}
            {alert.exceedingDomains.map((d) => d.domainName).join(', ')}{' '}
            may be fragile without this foundation.
          </p>
        </div>

        {/* Jump */}
        {onNavigateToAssess && alert.subAreaId && (
          <button
            onClick={() => onNavigateToAssess(alert.subAreaId)}
            className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1.5 rounded-md bg-warm-50 text-warm-500 hover:bg-warm-100 hover:text-warm-700 transition-colors shrink-0 mt-0.5"
          >
            {ICONS.jumpTo}
            <span>Assess</span>
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Card showing an unassessed domain gap.
 */
function GapsCard({ alert, onNavigateToAssess }) {
  const config = ALERT_CONFIG[ALERT_TYPES.GAPS]

  return (
    <div
      className="rounded-lg border px-4 py-3 flex items-center gap-4"
      style={{ borderColor: config.border, backgroundColor: '#fff' }}
    >
      {/* Domain number */}
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
        style={{ backgroundColor: config.color + '20', color: config.color }}
      >
        {alert.domainNumber}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-warm-700">
          {alert.domainName}
        </div>
        <div className="text-[11px] text-warm-400 mt-0.5">
          {alert.pctUnassessed}% of skills unassessed ({alert.assessed} of {alert.total} completed).
          Completing this domain will give a fuller clinical picture.
        </div>
      </div>

      {/* Progress indicator */}
      <div className="w-20 shrink-0">
        <div className="w-full h-1.5 bg-warm-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-warm-300 transition-all"
            style={{
              width: `${alert.total > 0 ? (alert.assessed / alert.total) * 100 : 0}%`,
            }}
          />
        </div>
        <div className="text-[9px] text-warm-300 text-center mt-0.5">
          {alert.assessed}/{alert.total}
        </div>
      </div>

      {/* Jump */}
      {onNavigateToAssess && alert.subAreaId && (
        <button
          onClick={() => onNavigateToAssess(alert.subAreaId)}
          className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1.5 rounded-md bg-warm-50 text-warm-500 hover:bg-warm-100 hover:text-warm-700 transition-colors shrink-0"
        >
          {ICONS.jumpTo}
          <span>Assess</span>
        </button>
      )}
    </div>
  )
}

/**
 * Positive state: no alerts found.
 */
function NoConcerns() {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-sage-50 text-sage-500 mb-4">
        {ICONS.check}
      </div>
      <h3 className="text-lg font-semibold text-warm-700 mb-2">
        No Concerns Detected
      </h3>
      <p className="text-sm text-warm-400 max-w-md mx-auto">
        No regressions, plateaus, foundation gaps, or significant unassessed areas
        were found. Continue monitoring with regular snapshots to track progress.
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────── */

export default function PatternAlerts({
  assessments = {},
  snapshots = [],
  onNavigateToAssess,
}) {
  const alertGroups = useMemo(
    () => analyzePatterns(assessments, snapshots),
    [assessments, snapshots]
  )

  // Count totals for the summary banner
  const totalAlerts = useMemo(() => {
    let count = 0
    let domainSet = new Set()

    Object.entries(alertGroups).forEach(([type, alerts]) => {
      if (type === ALERT_TYPES.REGRESSION) {
        alerts.forEach((a) => {
          count += a.skills.length
          domainSet.add(a.domainId)
        })
      } else {
        alerts.forEach((a) => {
          count++
          domainSet.add(a.domainId)
        })
      }
    })

    return { count, domains: domainSet.size }
  }, [alertGroups])

  const hasAlerts = totalAlerts.count > 0

  return (
    <div className="w-full">
      {/* Summary banner */}
      <div
        className={`rounded-xl border px-6 py-4 mb-6 ${
          hasAlerts
            ? 'bg-coral-50 border-coral-200'
            : 'bg-sage-50 border-sage-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              hasAlerts
                ? 'bg-coral-100 text-coral-500'
                : 'bg-sage-100 text-sage-500'
            }`}
          >
            {hasAlerts ? ICONS.gaps : ICONS.check}
          </span>
          <div>
            <h2 className="text-sm font-semibold text-warm-800">
              {hasAlerts
                ? `${totalAlerts.count} alert${totalAlerts.count !== 1 ? 's' : ''} detected across ${totalAlerts.domains} domain${totalAlerts.domains !== 1 ? 's' : ''}`
                : 'No concerns detected'}
            </h2>
            <p className="text-[11px] text-warm-400 mt-0.5">
              {hasAlerts
                ? 'Review the alerts below for patterns that may affect intervention planning.'
                : 'The current profile shows no regressions, plateaus, or foundation gaps.'}
            </p>
          </div>
        </div>
      </div>

      {/* Alert sections or positive state */}
      {hasAlerts ? (
        <div>
          <AlertSection
            type={ALERT_TYPES.REGRESSION}
            alerts={alertGroups[ALERT_TYPES.REGRESSION]}
            onNavigateToAssess={onNavigateToAssess}
            defaultExpanded={true}
          />
          <AlertSection
            type={ALERT_TYPES.FOUNDATION}
            alerts={alertGroups[ALERT_TYPES.FOUNDATION]}
            onNavigateToAssess={onNavigateToAssess}
            defaultExpanded={true}
          />
          <AlertSection
            type={ALERT_TYPES.PLATEAU}
            alerts={alertGroups[ALERT_TYPES.PLATEAU]}
            onNavigateToAssess={onNavigateToAssess}
            defaultExpanded={true}
          />
          <AlertSection
            type={ALERT_TYPES.GAPS}
            alerts={alertGroups[ALERT_TYPES.GAPS]}
            onNavigateToAssess={onNavigateToAssess}
            defaultExpanded={false}
          />
        </div>
      ) : (
        <NoConcerns />
      )}
    </div>
  )
}
