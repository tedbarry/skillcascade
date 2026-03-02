import { useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getEntryById, getEntriesByCategory } from '../../data/knowledgeBase/kbIndex.js'
import { KB_CATEGORIES } from '../../data/knowledgeBase/kbSchema.js'
import { TIER_LABELS, TIER_COLORS } from '../../constants/tiers.js'

// Lazy imports for skill detail data (avoids pulling 750KB into initial bundle)
import { getSkillDescription } from '../../data/skillDescriptions.js'
import { getTeachingPlaybook } from '../../data/teachingPlaybook.js'
import { getBehavioralIndicator } from '../../data/behavioralIndicators.js'
import { getSkillTier, SKILL_PREREQUISITES, buildReversePrereqMap } from '../../data/skillDependencies.js'
import { framework, ASSESSMENT_LABELS } from '../../data/framework.js'

let _reverseMap = null
function getReverseMap() {
  if (!_reverseMap) _reverseMap = buildReversePrereqMap()
  return _reverseMap
}

function findSkillInFramework(skillId) {
  for (const d of framework) {
    for (const sa of d.subAreas) {
      for (const sg of sa.skillGroups) {
        const s = sg.skills.find(sk => sk.id === skillId)
        if (s) return { skill: s, domain: d, subArea: sa, skillGroup: sg }
      }
    }
  }
  return null
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
}

export default function KBEntryView({ entryId }) {
  const entry = useMemo(() => getEntryById(entryId), [entryId])

  // Compute prev/next entries within the same category
  const { prevEntry, nextEntry, currentIndex, totalCount } = useMemo(() => {
    if (!entry) return { prevEntry: null, nextEntry: null, currentIndex: -1, totalCount: 0 }
    const siblings = getEntriesByCategory(entry.category)
    const idx = siblings.findIndex(e => e.id === entry.id)
    return {
      prevEntry: idx > 0 ? siblings[idx - 1] : null,
      nextEntry: idx < siblings.length - 1 ? siblings[idx + 1] : null,
      currentIndex: idx,
      totalCount: siblings.length,
    }
  }, [entry])

  // Scroll to top on entry change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [entryId])

  // Scroll to hash anchor on mount
  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      requestAnimationFrame(() => {
        const el = document.getElementById(hash.slice(1))
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [entryId])

  // Keyboard arrow navigation
  const navigate = useNavigate()
  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowLeft' && prevEntry) {
        navigate(`/kb/${prevEntry.id}`)
      } else if (e.key === 'ArrowRight' && nextEntry) {
        navigate(`/kb/${nextEntry.id}`)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [prevEntry, nextEntry, navigate])

  if (!entry) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <h2 className="text-lg font-semibold text-warm-700">Article Not Found</h2>
        <p className="text-sm text-warm-400 mt-2">This knowledge base article hasn't been written yet.</p>
        <Link to="/kb" className="inline-block mt-4 text-sm text-sage-600 hover:text-sage-700 underline">
          Back to Knowledge Base
        </Link>
      </div>
    )
  }

  const catInfo = KB_CATEGORIES[entry.category]

  return (
    <article className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-warm-400 mb-6">
        <Link to="/kb" className="hover:text-warm-600 transition-colors">Knowledge Base</Link>
        <span className="text-warm-300">/</span>
        <Link to={`/kb?category=${entry.category}`} className="hover:text-warm-600 transition-colors">
          {catInfo?.label || entry.category}
        </Link>
        <span className="text-warm-300">/</span>
        <span className="text-warm-500">{entry.title}</span>
      </nav>

      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-warm-900 font-display">{entry.title}</h1>
        {entry.summary && (
          <p className="text-sm text-warm-500 mt-2 leading-relaxed">{entry.summary}</p>
        )}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-warm-100 text-warm-500">
            {catInfo?.label || entry.category}
          </span>
          {entry.viewLink && (
            <Link
              to={`/dashboard?v=${entry.viewLink}`}
              className="text-[10px] px-2 py-0.5 rounded-full bg-sage-50 text-sage-600 border border-sage-200 hover:bg-sage-100 transition-colors"
            >
              Open in Dashboard
            </Link>
          )}
        </div>
      </header>

      {/* Body content */}
      <div className="prose-warm">
        {entry.skillId ? (
          <SkillContent skillId={entry.skillId} meta={entry._meta} />
        ) : (
          <ManualContent body={entry.body} />
        )}
      </div>

      {/* Related entries */}
      {entry.relatedIds?.length > 0 && (
        <RelatedEntries ids={entry.relatedIds} />
      )}

      {/* Prev / Next navigation */}
      {totalCount > 1 && (
        <PrevNextNav
          prevEntry={prevEntry}
          nextEntry={nextEntry}
          currentIndex={currentIndex}
          totalCount={totalCount}
        />
      )}
    </article>
  )
}

/**
 * Render manual entry body as formatted text.
 * Supports newline-separated paragraphs and basic formatting.
 */
function ManualContent({ body }) {
  if (!body) return <p className="text-sm text-warm-400 italic">Content coming soon.</p>

  return (
    <div className="space-y-3 text-sm text-warm-700 leading-relaxed">
      {body.split('\n\n').map((paragraph, i) => {
        const trimmed = paragraph.trim()
        if (!trimmed) return null

        // Headers (lines starting with ##)
        if (trimmed.startsWith('## ')) {
          const text = trimmed.slice(3)
          return <h2 key={i} id={slugify(text)} className="text-base font-semibold text-warm-800 mt-6 mb-2">{text}</h2>
        }
        if (trimmed.startsWith('### ')) {
          const text = trimmed.slice(4)
          return <h3 key={i} id={slugify(text)} className="text-sm font-semibold text-warm-700 mt-4 mb-1">{text}</h3>
        }

        // Bullet lists (lines starting with -)
        const lines = trimmed.split('\n')
        if (lines.every(l => l.trim().startsWith('- ') || l.trim() === '')) {
          return (
            <ul key={i} className="space-y-1 ml-4">
              {lines.filter(l => l.trim().startsWith('- ')).map((line, j) => (
                <li key={j} className="text-sm text-warm-600 list-disc">{line.trim().slice(2)}</li>
              ))}
            </ul>
          )
        }

        return <p key={i}>{trimmed}</p>
      })}
    </div>
  )
}

/**
 * Rich content for auto-derived skill entries.
 * Pulls from descriptions, playbook, indicators, and dependencies.
 */
function SkillContent({ skillId, meta }) {
  const desc = useMemo(() => getSkillDescription(skillId), [skillId])
  const playbook = useMemo(() => getTeachingPlaybook(skillId), [skillId])
  const tier = meta?.tier || getSkillTier(skillId)
  const prereqIds = SKILL_PREREQUISITES[skillId] || []
  const dependentIds = useMemo(() => getReverseMap()[skillId] || [], [skillId])
  const location = useMemo(() => findSkillInFramework(skillId), [skillId])

  return (
    <div className="space-y-6">
      {/* Location + Tier */}
      <div className="flex items-center gap-2 flex-wrap text-xs text-warm-400">
        {location && (
          <span>
            D{location.domain.domain}: {location.domain.name} &rsaquo; {location.subArea.name} &rsaquo; {location.skillGroup.name}
          </span>
        )}
        {tier && (
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ backgroundColor: TIER_COLORS[tier] + '18', color: TIER_COLORS[tier], border: `1px solid ${TIER_COLORS[tier]}33` }}
          >
            Tier {tier} — {TIER_LABELS[tier]}
          </span>
        )}
      </div>

      {/* Description */}
      {desc && (
        <Section title="What is this skill?">
          <p className="text-sm text-warm-700 leading-relaxed">{desc.description}</p>
          {desc.looks_like && (
            <div className="mt-3 p-3 rounded-lg bg-sage-50 border border-sage-200">
              <p className="text-[10px] font-semibold text-sage-600 uppercase tracking-wider mb-1">What it looks like</p>
              <p className="text-sm text-warm-600 leading-relaxed">{desc.looks_like}</p>
            </div>
          )}
          {desc.absence && (
            <div className="mt-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider mb-1">When absent</p>
              <p className="text-sm text-warm-600 leading-relaxed">{desc.absence}</p>
            </div>
          )}
        </Section>
      )}

      {/* Behavioral Indicators */}
      <Section title="Behavioral Indicators">
        <div className="space-y-2">
          {[0, 1, 2, 3].map(level => {
            const ind = getBehavioralIndicator(skillId, level)
            if (!ind) return null
            return (
              <div key={level} className="flex gap-3 items-start">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded shrink-0 min-w-[70px] text-center"
                  style={{ backgroundColor: ['#c47070', '#e8928a', '#e5b76a', '#7fb589'][level] + '20', color: ['#c47070', '#e8928a', '#e5b76a', '#7fb589'][level] }}
                >
                  {ASSESSMENT_LABELS[level]}
                </span>
                <span className="text-sm text-warm-600 leading-relaxed">{ind}</span>
              </div>
            )
          })}
        </div>
      </Section>

      {/* Teaching Playbook */}
      {playbook && (
        <Section title="Teaching Playbook">
          {playbook.context && (
            <p className="text-sm text-warm-600 leading-relaxed mb-3">{playbook.context}</p>
          )}
          {playbook.strategies?.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">Teaching Strategies</p>
              <ul className="space-y-1 ml-4">
                {playbook.strategies.map((s, i) => (
                  <li key={i} className="text-sm text-warm-600 list-disc">{s}</li>
                ))}
              </ul>
            </div>
          )}
          {playbook.barriers && (
            <div className="mb-3">
              <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">Common Barriers</p>
              <p className="text-sm text-warm-600 leading-relaxed">{playbook.barriers}</p>
            </div>
          )}
          {playbook.measurement && (
            <div className="mb-3">
              <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">Measurement</p>
              <p className="text-sm text-warm-600 leading-relaxed">{playbook.measurement}</p>
            </div>
          )}
          {playbook.generalization && (
            <div className="mb-3">
              <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">Generalization</p>
              <p className="text-sm text-warm-600 leading-relaxed">{playbook.generalization}</p>
            </div>
          )}
        </Section>
      )}

      {/* Dependencies */}
      {(prereqIds.length > 0 || dependentIds.length > 0) && (
        <Section title="Dependencies">
          {prereqIds.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">
                Prerequisites ({prereqIds.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {prereqIds.map(pid => {
                  const info = findSkillInFramework(pid)
                  return (
                    <Link
                      key={pid}
                      to={`/kb/skill-${pid}`}
                      className="text-xs px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      {info?.skill.name || pid}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
          {dependentIds.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">
                Supports ({dependentIds.length} {dependentIds.length === 1 ? 'skill' : 'skills'})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {dependentIds.map(did => {
                  const info = findSkillInFramework(did)
                  return (
                    <Link
                      key={did}
                      to={`/kb/skill-${did}`}
                      className="text-xs px-2 py-1 rounded-md bg-sage-50 border border-sage-200 text-sage-700 hover:bg-sage-100 transition-colors"
                    >
                      {info?.skill.name || did}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </Section>
      )}
    </div>
  )
}

function PrevNextNav({ prevEntry, nextEntry, currentIndex, totalCount }) {
  return (
    <nav className="sticky bottom-0 z-10 bg-white border-t border-warm-200 px-4 py-2 mt-8 -mx-4">
      <div className="flex items-center gap-2">
        {/* Prev */}
        {prevEntry ? (
          <Link
            to={`/kb/${prevEntry.id}`}
            className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg text-sm font-medium min-h-[44px] transition-colors text-warm-600 bg-warm-100 hover:bg-warm-200"
          >
            ← Prev
          </Link>
        ) : (
          <span className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg text-sm font-medium min-h-[44px] text-warm-300">
            ← Prev
          </span>
        )}

        {/* Counter */}
        <span className="text-[10px] text-warm-400 whitespace-nowrap">
          {currentIndex + 1}/{totalCount}
        </span>

        {/* Next */}
        {nextEntry ? (
          <Link
            to={`/kb/${nextEntry.id}`}
            className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg text-sm font-semibold min-h-[44px] transition-colors bg-sage-500 text-white hover:bg-sage-600"
          >
            Next →
          </Link>
        ) : (
          <span className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg text-sm font-medium min-h-[44px] text-warm-300">
            Next →
          </span>
        )}
      </div>
    </nav>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-warm-800 mb-3 pb-1 border-b border-warm-100">{title}</h2>
      {children}
    </section>
  )
}

function RelatedEntries({ ids }) {
  const entries = useMemo(() => {
    return ids.map(id => getEntryById(id)).filter(Boolean).slice(0, 8)
  }, [ids])

  if (entries.length === 0) return null

  return (
    <section className="mt-8 pt-6 border-t border-warm-200">
      <h3 className="text-sm font-semibold text-warm-600 mb-3">Related Articles</h3>
      <div className="flex flex-wrap gap-2">
        {entries.map(entry => (
          <Link
            key={entry.id}
            to={`/kb/${entry.id}`}
            className="text-xs px-3 py-1.5 rounded-lg bg-warm-50 border border-warm-200 text-warm-600 hover:bg-sage-50 hover:border-sage-200 hover:text-sage-700 transition-colors"
          >
            {entry.title}
          </Link>
        ))}
      </div>
    </section>
  )
}
