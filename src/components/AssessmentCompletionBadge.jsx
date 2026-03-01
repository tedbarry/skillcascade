import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { framework, ASSESSMENT_LEVELS, isAssessed } from '../data/framework.js'

/**
 * Compact completion ring badge for the header bar.
 * Shows % of skills assessed with a mini ring + number.
 */
export default function AssessmentCompletionBadge({ assessments = {}, onClick }) {
  const stats = useMemo(() => {
    let total = 0, assessed = 0
    framework.forEach(d => d.subAreas.forEach(sa => sa.skillGroups.forEach(sg => sg.skills.forEach(skill => {
      total++
      const level = assessments[skill.id]
      if (isAssessed(level)) assessed++
    }))))
    return { total, assessed, pct: total > 0 ? Math.round((assessed / total) * 100) : 0 }
  }, [assessments])

  const r = 10
  const c = 2 * Math.PI * r
  const offset = c - (stats.pct / 100) * c
  const color = stats.pct >= 80 ? '#4f8460' : stats.pct >= 40 ? '#e5b76a' : '#e8928a'

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-1 min-h-[44px] rounded-lg hover:bg-warm-50 active:bg-warm-100 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
      title={`${stats.assessed}/${stats.total} skills assessed (${stats.pct}%)`}
      aria-label={`Assessment completion: ${stats.pct}% — ${stats.assessed} of ${stats.total} skills assessed`}
      role="status"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" className="shrink-0">
        <circle cx="12" cy="12" r={r} fill="none" stroke="#e8d5c0" strokeWidth="2.5" />
        <motion.circle
          cx="12" cy="12" r={r} fill="none"
          stroke={color} strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          transform="rotate(-90 12 12)"
        />
      </svg>
      <span className="text-xs font-semibold text-warm-600 group-hover:text-warm-800 transition-colors">
        {stats.pct}%
      </span>
    </button>
  )
}

/**
 * Freshness indicator — shows how recent the assessment data is.
 * Returns a colored dot + text label.
 */
export function FreshnessBadge({ lastAssessedDate, className = '' }) {
  const freshness = useMemo(() => {
    if (!lastAssessedDate) return { label: 'No data', color: 'text-warm-400', dot: 'bg-warm-300' }
    const days = Math.floor((Date.now() - new Date(lastAssessedDate).getTime()) / (1000 * 60 * 60 * 24))
    if (days <= 7) return { label: 'Fresh', color: 'text-sage-600', dot: 'bg-sage-500', days }
    if (days <= 30) return { label: `${days}d ago`, color: 'text-warm-500', dot: 'bg-warm-400', days }
    if (days <= 90) return { label: `${days}d ago`, color: 'text-warm-600', dot: 'bg-warm-500', days }
    return { label: `${days}d ago`, color: 'text-coral-500', dot: 'bg-coral-400', days }
  }, [lastAssessedDate])

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${freshness.dot}`} />
      <span className={`text-[10px] font-medium ${freshness.color}`}>{freshness.label}</span>
    </span>
  )
}
