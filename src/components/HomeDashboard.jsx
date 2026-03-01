import { useMemo, useState, useEffect, useRef, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useResponsive from '../hooks/useResponsive.js'
import { framework, ASSESSMENT_LEVELS } from '../data/framework.js'
import { computeDomainHealth, detectCascadeRisks, computeImpactRanking } from '../data/cascadeModel.js'
import { DOMAIN_COLORS } from '../constants/colors.js'

/** Animated counter — counts from 0 to target over duration ms */
function AnimatedNumber({ value, duration = 800 }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    if (value === 0) { setDisplay(0); return }
    const start = performance.now()
    startRef.current = start
    function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1 && startRef.current === start) {
        ref.current = requestAnimationFrame(tick)
      }
    }
    ref.current = requestAnimationFrame(tick)
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
  }, [value, duration])

  return <>{display}</>
}

/** Tiny sparkline SVG — shows trend from snapshot data */
function Sparkline({ points, width = 60, height = 16, color = '#7fb589' }) {
  if (!points || points.length < 2) return null
  const max = Math.max(...points, 1)
  const min = Math.min(...points, 0)
  const range = max - min || 1
  const step = width / (points.length - 1)
  const path = points.map((v, i) => {
    const x = i * step
    const y = height - ((v - min) / range) * (height - 2) - 1
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="shrink-0 opacity-60">
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const FRIENDLY_NAMES = {
  d1: 'Regulation', d2: 'Self-Awareness', d3: 'Executive Function',
  d4: 'Problem Solving', d5: 'Communication', d6: 'Social Understanding',
  d7: 'Identity', d8: 'Safety', d9: 'Support Systems',
}

const STATE_LABELS = {
  locked: 'Not Started', blocked: 'Blocked', 'needs-work': 'Needs Work',
  developing: 'Developing', mastered: 'Solid',
}

const STATE_DOT_COLORS = {
  locked: 'bg-warm-300', blocked: 'bg-coral-400', 'needs-work': 'bg-coral-300',
  developing: 'bg-warm-400', mastered: 'bg-sage-500',
}

function CompletionRing({ percent, size = 120, strokeWidth = 8 }) {
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const offset = c - (percent / 100) * c
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-warm-200" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="url(#ringGrad)" strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4f8460" />
          <stop offset="100%" stopColor="#7fb589" />
        </linearGradient>
      </defs>
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="text-2xl font-bold fill-warm-800">
        {Math.round(percent)}%
      </text>
      <text x="50%" y="65%" dominantBaseline="central" textAnchor="middle" className="text-[10px] fill-warm-400">
        assessed
      </text>
    </svg>
  )
}

/** Tiny freshness dot — computed from assessed count */
function FreshnessDot({ assessed, total }) {
  if (assessed === 0) return null
  const pct = assessed / total
  const dotColor = pct >= 0.8 ? 'bg-sage-400' : pct >= 0.4 ? 'bg-warm-400' : 'bg-coral-400'
  const label = pct >= 0.8 ? 'Well covered' : pct >= 0.4 ? 'Partial' : 'Sparse'
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} title={label} />
  )
}

const DomainMiniCard = memo(function DomainMiniCard({ domainId, health, sparklineData, onClick }) {
  const color = DOMAIN_COLORS[domainId]
  const pct = Math.round((health.healthPct || 0) * 100)
  return (
    <motion.button
      whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white rounded-xl border border-warm-200 p-3 sm:p-4 text-left transition-colors hover:border-warm-300 min-h-[44px]"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-xs sm:text-sm font-medium text-warm-700 truncate">{FRIENDLY_NAMES[domainId]}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <FreshnessDot assessed={health.assessed} total={health.total} />
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${
            health.state === 'mastered' ? 'bg-sage-100 text-sage-700' :
            health.state === 'developing' ? 'bg-warm-100 text-warm-600' :
            health.state === 'needs-work' ? 'bg-coral-100 text-coral-600' :
            health.state === 'blocked' ? 'bg-coral-100 text-coral-700' :
            'bg-warm-100 text-warm-500'
          }`}>
            {STATE_LABELS[health.state]}
          </span>
        </div>
      </div>
      {/* Mini progress bar */}
      <div className="h-1.5 bg-warm-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-warm-400">{health.assessed}/{health.total} skills</span>
        <div className="flex items-center gap-1.5">
          {sparklineData && <Sparkline points={sparklineData} color={color} />}
          <span className="text-xs font-semibold" style={{ color }}>{pct}%</span>
        </div>
      </div>
    </motion.button>
  )
})

function AlertCard({ risk }) {
  const borderColors = {
    inversion: 'border-l-coral-500',
    regression: 'border-l-coral-400',
    bottleneck: 'border-l-warm-500',
    'score-inversion': 'border-l-coral-300',
    'prerequisite-gap': 'border-l-coral-200',
    'uneven-profile': 'border-l-sage-400',
    'plateau': 'border-l-warm-400',
  }
  const typeLabels = {
    inversion: 'Skill Inversion',
    regression: 'Regression',
    bottleneck: 'Bottleneck',
    'score-inversion': 'Score Inversion',
    'prerequisite-gap': 'Prereq Gap',
    'uneven-profile': 'Uneven Profile',
    'plateau': 'Plateau',
  }
  return (
    <div className={`bg-white rounded-lg border border-warm-200 border-l-4 ${borderColors[risk.type] || 'border-l-gray-300'} p-3`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-warm-500">{typeLabels[risk.type] || risk.type}</span>
      </div>
      <p className="text-xs text-warm-600 leading-relaxed">{risk.description}</p>
    </div>
  )
}

function QuickActionButton({ icon, label, sublabel, onClick, variant = 'default' }) {
  const base = 'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left min-h-[44px]'
  const variants = {
    default: 'bg-white border-warm-200 hover:border-sage-300 hover:shadow-sm',
    primary: 'bg-sage-500 border-sage-500 text-white hover:bg-sage-600 hover:shadow-md',
    warning: 'bg-warm-50 border-warm-300 hover:border-warm-400 hover:shadow-sm',
  }
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`${base} ${variants[variant]}`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        variant === 'primary' ? 'bg-white/20' : 'bg-sage-50'
      }`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className={`text-sm font-medium ${variant === 'primary' ? 'text-white' : 'text-warm-700'}`}>{label}</div>
        {sublabel && <div className={`text-[11px] ${variant === 'primary' ? 'text-white/70' : 'text-warm-400'}`}>{sublabel}</div>}
      </div>
    </motion.button>
  )
}

const STORAGE_KEY = 'skillcascade_kbd_hint_seen'

export default function HomeDashboard({ assessments = {}, snapshots = [], clientName, onChangeView, onNavigateToAssess }) {
  const { isPhone, isTablet } = useResponsive()

  // Keyboard shortcut hint — auto-dismisses after 3 views
  const [showKbdHint, setShowKbdHint] = useState(() => {
    try {
      const count = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
      return count < 3
    } catch { return true }
  })

  useEffect(() => {
    try {
      const count = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
      if (count < 3) {
        localStorage.setItem(STORAGE_KEY, String(count + 1))
        if (count + 1 >= 3) setShowKbdHint(false)
      }
    } catch { /* localStorage unavailable */ }
  }, [])

  const domainHealth = useMemo(() => computeDomainHealth(assessments), [assessments])
  const risks = useMemo(() => detectCascadeRisks(assessments, snapshots), [assessments, snapshots])
  const impactRanking = useMemo(() => computeImpactRanking(assessments), [assessments])

  // Overall stats
  const stats = useMemo(() => {
    let totalSkills = 0, assessedSkills = 0, solidCount = 0, needsWorkCount = 0
    framework.forEach(d => d.subAreas.forEach(sa => sa.skillGroups.forEach(sg => sg.skills.forEach(skill => {
      totalSkills++
      const level = assessments[skill.id]
      if (level !== undefined && level !== ASSESSMENT_LEVELS.NOT_ASSESSED) {
        assessedSkills++
        if (level === ASSESSMENT_LEVELS.SOLID) solidCount++
        if (level === ASSESSMENT_LEVELS.NEEDS_WORK) needsWorkCount++
      }
    }))))

    const domainStates = Object.values(domainHealth)
    const mastered = domainStates.filter(d => d.state === 'mastered').length
    const developing = domainStates.filter(d => d.state === 'developing').length
    const needsWork = domainStates.filter(d => d.state === 'needs-work' || d.state === 'blocked').length
    const unstarted = domainStates.filter(d => d.state === 'locked').length

    return {
      totalSkills, assessedSkills, solidCount, needsWorkCount,
      completionPct: totalSkills > 0 ? (assessedSkills / totalSkills) * 100 : 0,
      mastered, developing, needsWork, unstarted,
    }
  }, [assessments, domainHealth])

  // Top priority domain
  const topPriority = useMemo(() => {
    if (!impactRanking.length) return null
    const top = impactRanking[0]
    const health = domainHealth[top.domainId]
    if (health?.state === 'mastered') return null
    return { ...top, health }
  }, [impactRanking, domainHealth])

  // Compute sparkline data per domain from snapshots
  const sparklines = useMemo(() => {
    if (snapshots.length < 2) return {}
    const lines = {}
    // Sort snapshots by timestamp
    const sorted = [...snapshots].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    // For each domain, compute health % at each snapshot
    for (const domain of framework) {
      const domainSkills = domain.subAreas.flatMap(sa => sa.skillGroups.flatMap(sg => sg.skills))
      const points = sorted.map(snap => {
        if (!snap.assessments) return 0
        let sum = 0, count = 0
        for (const skill of domainSkills) {
          const level = snap.assessments[skill.id]
          if (level !== undefined && level !== ASSESSMENT_LEVELS.NOT_ASSESSED) {
            sum += level; count++
          }
        }
        return count > 0 ? (sum / count / 3) * 100 : 0
      })
      // Add current as last point
      const currentHealth = domainHealth[domain.id]
      points.push(Math.round((currentHealth?.healthPct || 0) * 100))
      lines[domain.id] = points
    }
    return lines
  }, [snapshots, domainHealth])

  const topRisks = risks.slice(0, 3)

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl sm:text-2xl font-bold text-warm-800 font-display"
        >
          {clientName ? `${clientName}'s Profile` : 'Welcome to SkillCascade'}
        </motion.h1>
        <p className="text-sm text-warm-500 mt-1">
          {clientName ? 'Assessment overview and quick actions' : 'Select a client to get started'}
        </p>
      </div>

      {/* Get started banner when no assessments exist */}
      {stats.assessedSkills === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-sage-50 border border-sage-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sage-800">No assessment data yet</p>
            <p className="text-xs text-sage-600 mt-0.5">Run an assessment to populate this dashboard with insights across all 9 domains.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => onChangeView('quick-assess')} className="px-4 py-2 min-h-[44px] bg-sage-500 text-white rounded-lg text-sm font-medium hover:bg-sage-600 transition-colors">
              Quick Assessment
            </button>
            <button onClick={() => onChangeView('assess')} className="px-4 py-2 min-h-[44px] border border-sage-300 text-sage-700 rounded-lg text-sm font-medium hover:bg-sage-100 transition-colors">
              Full Assessment
            </button>
          </div>
        </motion.div>
      )}

      {/* Progress insight */}
      {snapshots.length > 0 && (() => {
        const latest = snapshots[snapshots.length - 1]
        if (!latest?.assessments) return null
        const prevAssessed = Object.values(latest.assessments).filter(v => v !== ASSESSMENT_LEVELS.NOT_ASSESSED).length
        const diff = stats.assessedSkills - prevAssessed
        if (diff === 0) return null
        return (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4 px-4 py-2.5 bg-sage-50 border border-sage-200 rounded-lg text-sm text-sage-700"
          >
            {diff > 0 ? (
              <>Since your last snapshot, <span className="font-semibold">{diff} new skill{diff !== 1 ? 's' : ''}</span> have been assessed.</>
            ) : (
              <>Assessment data has been revised since your last snapshot.</>
            )}
          </motion.div>
        )
      })()}

      {/* Top row: Completion ring + Quick stats */}
      <div data-tour="home-stats" className={`grid gap-4 sm:gap-6 mb-6 sm:mb-8 ${isPhone ? 'grid-cols-1' : 'grid-cols-[auto_1fr]'}`}>
        {/* Completion ring card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-warm-200 p-5 sm:p-6 flex flex-col items-center justify-center"
        >
          <CompletionRing percent={stats.completionPct} size={isPhone ? 100 : 120} />
          <div className="text-xs text-warm-500 mt-3 text-center">
            {stats.assessedSkills} of {stats.totalSkills} skills
          </div>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Solid', value: stats.solidCount, color: 'text-sage-600', bg: 'bg-sage-50', icon: '3' },
            { label: 'Needs Work', value: stats.needsWorkCount, color: 'text-coral-600', bg: 'bg-coral-50', icon: '1' },
            { label: 'Domains Mastered', value: stats.mastered, color: 'text-sage-600', bg: 'bg-sage-50', icon: 'D' },
            { label: 'Active Alerts', value: risks.length, color: risks.length > 0 ? 'text-coral-600' : 'text-sage-600', bg: risks.length > 0 ? 'bg-coral-50' : 'bg-sage-50', icon: '!' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className={`${stat.bg} rounded-xl p-3 sm:p-4`}
            >
              <div className={`text-2xl sm:text-3xl font-bold ${stat.color}`}><AnimatedNumber value={stat.value} duration={900 + i * 100} /></div>
              <div className="text-[11px] sm:text-xs text-warm-500 mt-0.5">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Domain health grid */}
      <div data-tour="home-domains" className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-warm-700">Domain Health</h2>
          <button
            onClick={() => onChangeView('radar')}
            className="text-xs text-sage-600 hover:text-sage-700 font-medium min-h-[44px] flex items-center"
          >
            View Radar
          </button>
        </div>
        <motion.div
          className={`grid gap-2.5 sm:gap-3 ${isPhone ? 'grid-cols-2' : isTablet ? 'grid-cols-3' : 'grid-cols-3 lg:grid-cols-4'}`}
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        >
          {framework.map((domain) => (
            <motion.div
              key={domain.id}
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
            >
              <DomainMiniCard
                domainId={domain.id}
                health={domainHealth[domain.id] || { healthPct: 0, state: 'locked', assessed: 0, total: 0 }}
                sparklineData={sparklines[domain.id]}
                onClick={() => onNavigateToAssess(domain.subAreas[0]?.id)}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Bottom row: Quick actions + Alerts */}
      <div className={`grid gap-4 sm:gap-6 ${isPhone ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {/* Quick actions */}
        <div data-tour="home-actions">
          <h2 className="text-sm font-semibold text-warm-700 mb-3">Quick Actions</h2>
          <div className="space-y-2">
            {topPriority && (
              <QuickActionButton
                variant="primary"
                icon={<svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                label={`Focus: ${FRIENDLY_NAMES[topPriority.domainId]}`}
                sublabel={`Highest leverage — affects ${topPriority.downstreamDomains} domains`}
                onClick={() => onNavigateToAssess(null)}
              />
            )}
            <QuickActionButton
              icon={<svg className="w-4 h-4 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>}
              label="Full Assessment"
              sublabel="Step through all 300+ skills"
              onClick={() => onChangeView('assess')}
            />
            <QuickActionButton
              icon={<svg className="w-4 h-4 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>}
              label="Quick Assessment"
              sublabel="Adaptive screening (~2 min)"
              onClick={() => onChangeView('quick-assess')}
            />
            <QuickActionButton
              icon={<svg className="w-4 h-4 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}
              label="Generate Report"
              sublabel="Clinical summary for stakeholders"
              onClick={() => onChangeView('reports')}
            />
          </div>
        </div>

        {/* Alerts & Insights */}
        <div data-tour="home-alerts">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-warm-700">Alerts & Insights</h2>
            {risks.length > 3 && (
              <button
                onClick={() => onChangeView('alerts')}
                className="text-xs text-sage-600 hover:text-sage-700 font-medium min-h-[44px] flex items-center"
              >
                View All ({risks.length})
              </button>
            )}
          </div>
          {topRisks.length > 0 ? (
            <div className="space-y-2">
              {topRisks.map((risk) => <AlertCard key={`${risk.type}-${risk.actionDomainId || ''}-${risk.affectedDomains?.[0] || ''}`} risk={risk} />)}
            </div>
          ) : (
            <div className="bg-sage-50 rounded-xl border border-sage-200 p-6 text-center">
              <div className="text-sage-600 text-2xl mb-2">All Clear</div>
              <p className="text-xs text-sage-500">No cascade risks or learning barriers detected.</p>
            </div>
          )}

          {/* Recent snapshots */}
          {snapshots.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-warm-500">Recent Snapshots</h3>
                <button onClick={() => onChangeView('timeline')} className="text-[11px] text-sage-600 hover:text-sage-700 min-h-[44px] flex items-center">
                  Timeline
                </button>
              </div>
              <div className="space-y-1.5">
                {snapshots.slice(0, 3).map((snap) => (
                  <div key={snap.id} className="flex items-center justify-between bg-white rounded-lg border border-warm-200 px-3 py-2">
                    <span className="text-xs text-warm-700 font-medium truncate">{snap.label || 'Snapshot'}</span>
                    <span className="text-[10px] text-warm-400 shrink-0 ml-2">
                      {new Date(snap.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard shortcuts hint — dismisses after 3 views or manual close */}
      <AnimatePresence>
        {showKbdHint && !isPhone && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="mt-6 flex items-center justify-center gap-2 text-warm-400 text-xs"
          >
            <span>
              Press{' '}
              <kbd className="bg-warm-100 border border-warm-200 rounded px-1.5 py-0.5 text-[11px] font-mono text-warm-500">?</kbd>
              {' '}for keyboard shortcuts
            </span>
            <button
              onClick={() => {
                setShowKbdHint(false)
                try { localStorage.setItem(STORAGE_KEY, '3') } catch {}
              }}
              className="p-1 rounded hover:bg-warm-100 transition-colors text-warm-300 hover:text-warm-500"
              aria-label="Dismiss keyboard shortcuts hint"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
