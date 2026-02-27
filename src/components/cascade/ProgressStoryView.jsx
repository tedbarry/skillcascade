import { useState, useMemo, memo } from 'react'
import { computeDomainHealth } from '../../data/cascadeModel.js'
import { framework } from '../../data/framework.js'
import { generateParentSummary, generateDomainNarrative } from '../../lib/narratives.js'
import ProgressBar from './ProgressBar.jsx'
import BeforeAfterComparison from './BeforeAfterComparison.jsx'
import useResponsive from '../../hooks/useResponsive.js'
import { DOMAIN_COLORS } from '../../constants/colors.js'

// Plain-language domain descriptions for parents/stakeholders
const DOMAIN_DESCRIPTIONS = {
  d1: 'Body Awareness is about understanding and coordinating body movements. This is a building block for many other skills.',
  d2: 'Sensory Processing is how we take in and make sense of information from our senses. It supports focus, comfort, and learning.',
  d3: 'Regulation is about managing emotions, energy levels, and attention. Strong regulation helps with learning and social interactions.',
  d4: 'Receptive Communication is understanding what others say and mean. This includes following directions and understanding concepts.',
  d5: 'Expressive Communication is using words, gestures, and other ways to share thoughts and needs with others.',
  d6: 'Social Interaction is connecting with others, taking turns, and understanding social situations.',
  d7: 'Executive Function includes planning, organizing, problem-solving, and flexible thinking.',
  d8: 'Play Skills is engaging in meaningful play, using imagination, and exploring the environment.',
  d9: 'Daily Living Skills covers self-care routines like eating, dressing, and personal hygiene.',
}

function getStatusLabel(healthPct) {
  if (healthPct === 0) return 'Not Yet Started'
  if (healthPct < 0.5) return 'Getting Started'
  if (healthPct < 0.83) return 'Growing'
  return 'Strong'
}

function getStatusEmoji(healthPct) {
  if (healthPct === 0) return ''
  if (healthPct < 0.5) return ''
  if (healthPct < 0.83) return ''
  return ''
}

/**
 * ProgressStoryView — "Explain to stakeholders"
 * Light theme, zero jargon, iPad-friendly.
 * Instantly understandable progress bars with before/after comparison.
 */
export default memo(function ProgressStoryView({
  assessments = {},
  snapshots = [],
  clientName = '',
  onNavigateToAssess,
}) {
  const { isPhone, isTablet } = useResponsive()
  const [expandedDomain, setExpandedDomain] = useState(null)
  const hasData = useMemo(() => Object.keys(assessments).length > 0, [assessments])

  const domainHealth = useMemo(
    () => computeDomainHealth(assessments),
    [assessments]
  )

  // Count domains by status
  const statusSummary = useMemo(() => {
    let strong = 0, growing = 0, starting = 0, notStarted = 0
    framework.forEach(d => {
      const health = domainHealth[d.id]
      if (!health || health.assessed === 0) { notStarted++; return }
      const pct = health.healthPct
      if (pct >= 0.83) strong++
      else if (pct >= 0.5) growing++
      else starting++
    })
    return { strong, growing, starting, notStarted }
  }, [domainHealth])

  const displayName = clientName || 'this learner'

  // Personalized parent summary
  const parentSummary = useMemo(
    () => hasData ? generateParentSummary(domainHealth, displayName) : '',
    [domainHealth, displayName, hasData]
  )

  // Expanded domain detail
  const expandedInfo = useMemo(() => {
    if (!expandedDomain) return null
    const d = framework.find(f => f.id === expandedDomain)
    const health = domainHealth[expandedDomain] || { avg: 0, healthPct: 0, assessed: 0, total: 0 }
    return {
      name: d?.name || '',
      color: DOMAIN_COLORS[expandedDomain] || '#888',
      description: health.assessed > 0
        ? generateDomainNarrative(expandedDomain, domainHealth, [], [])
        : DOMAIN_DESCRIPTIONS[expandedDomain] || '',
      healthPct: health.healthPct,
      statusLabel: getStatusLabel(health.healthPct),
      pctText: health.assessed > 0 ? `Strong in ${Math.round(health.healthPct * 100)}% of skills` : 'Not yet assessed',
      assessed: health.assessed,
      total: health.total,
    }
  }, [expandedDomain, domainHealth])

  return (
    <div
      className="flex-1 overflow-auto"
      style={{
        background: 'linear-gradient(180deg, #fafafa 0%, #f5f0eb 50%, #fafafa 100%)',
        color: '#333',
      }}
    >
      <div className={`${isPhone ? 'px-4 py-5' : 'px-8 py-6'} max-w-4xl mx-auto`}>
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className={`${isPhone ? 'text-lg' : 'text-xl'} font-bold text-gray-800`}>
            {clientName ? `${clientName}'s Progress` : 'Progress Overview'}
          </h2>
          {hasData && (
            <p className="text-sm text-gray-500 mt-1">
              {statusSummary.strong > 0 && `${statusSummary.strong} area${statusSummary.strong !== 1 ? 's' : ''} strong`}
              {statusSummary.growing > 0 && `${statusSummary.strong > 0 ? ' · ' : ''}${statusSummary.growing} growing`}
              {statusSummary.starting > 0 && `${(statusSummary.strong + statusSummary.growing) > 0 ? ' · ' : ''}${statusSummary.starting} getting started`}
            </p>
          )}
          {!hasData && (
            <p className="text-sm text-gray-400 mt-1">
              Add assessment data to see progress.
            </p>
          )}
          {hasData && parentSummary && (
            <p className="text-sm text-gray-600 mt-3 max-w-2xl mx-auto leading-relaxed">
              {parentSummary}
            </p>
          )}
        </div>

        {/* Before/After comparison or simple progress bars */}
        {hasData && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
            <BeforeAfterComparison
              currentAssessments={assessments}
              snapshots={snapshots}
              onDomainClick={setExpandedDomain}
            />
          </div>
        )}

        {/* Quick summary cards */}
        {hasData && !expandedDomain && (
          <div className={`grid ${isPhone ? 'grid-cols-1' : 'grid-cols-3'} gap-3 mb-6`}>
            {statusSummary.strong > 0 && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                <div className="text-2xl mb-1">{getStatusEmoji(0.9)}</div>
                <div className="text-sm font-semibold text-green-800">
                  {statusSummary.strong} Area{statusSummary.strong !== 1 ? 's' : ''} Strong
                </div>
                <div className="text-xs text-green-600 mt-0.5">
                  Great foundation to build on
                </div>
              </div>
            )}
            {statusSummary.growing > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                <div className="text-2xl mb-1">{getStatusEmoji(0.6)}</div>
                <div className="text-sm font-semibold text-blue-800">
                  {statusSummary.growing} Area{statusSummary.growing !== 1 ? 's' : ''} Growing
                </div>
                <div className="text-xs text-blue-600 mt-0.5">
                  Making progress, keep it up
                </div>
              </div>
            )}
            {statusSummary.starting > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <div className="text-2xl mb-1">{getStatusEmoji(0.3)}</div>
                <div className="text-sm font-semibold text-amber-800">
                  {statusSummary.starting} Area{statusSummary.starting !== 1 ? 's' : ''} Getting Started
                </div>
                <div className="text-xs text-amber-600 mt-0.5">
                  Focus areas for growth
                </div>
              </div>
            )}
          </div>
        )}

        {/* Expanded domain detail */}
        {expandedInfo && (
          <div
            className="bg-white rounded-2xl shadow-sm border p-5 mb-6 transition-all"
            style={{ borderColor: expandedInfo.color + '40' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: expandedInfo.color }} />
                  <h3 className="text-base font-semibold text-gray-800">{expandedInfo.name}</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  {expandedInfo.description}
                </p>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium" style={{ color: expandedInfo.color }}>
                    {expandedInfo.statusLabel}
                  </span>
                  <span className="text-xs text-gray-500">
                    {expandedInfo.pctText}
                  </span>
                </div>
                {/* Simple progress bar */}
                <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(2, expandedInfo.healthPct * 100)}%`,
                      backgroundColor: expandedInfo.color,
                    }}
                  />
                </div>
              </div>
              <button
                onClick={() => setExpandedDomain(null)}
                className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center text-lg"
              >{'\u00D7'}</button>
            </div>
          </div>
        )}

        {/* Footer */}
        {hasData && (
          <div className="text-center">
            <p className="text-[11px] text-gray-400">
              Tap any area above to learn more. {snapshots.length > 0 ? 'Showing change since first assessment.' : 'Save snapshots to track progress over time.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
})
