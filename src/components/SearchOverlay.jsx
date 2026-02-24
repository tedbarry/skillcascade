import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { framework, ASSESSMENT_LEVELS, ASSESSMENT_LABELS, ASSESSMENT_COLORS } from '../data/framework.js'

/**
 * Result type constants for grouping search results
 */
const RESULT_TYPES = {
  DOMAIN: 'domain',
  SUB_AREA: 'subArea',
  SKILL_GROUP: 'skillGroup',
  SKILL: 'skill',
}

const TYPE_LABELS = {
  [RESULT_TYPES.DOMAIN]: 'Domains',
  [RESULT_TYPES.SUB_AREA]: 'Sub-Areas',
  [RESULT_TYPES.SKILL_GROUP]: 'Skill Groups',
  [RESULT_TYPES.SKILL]: 'Skills',
}

const MAX_RESULTS = 20

/**
 * Pre-compute a flat searchable index from the framework hierarchy.
 * Each entry includes: id, name, type, subAreaId (for navigation),
 * breadcrumb parts, and optional skillId for assessment lookups.
 */
function buildSearchIndex() {
  const index = []

  for (const domain of framework) {
    // Domain entry
    index.push({
      id: domain.id,
      name: domain.name,
      nameLower: domain.name.toLowerCase(),
      type: RESULT_TYPES.DOMAIN,
      subAreaId: domain.subAreas[0]?.id ?? null,
      breadcrumb: domain.name,
      breadcrumbParts: [domain.name],
      skillId: null,
    })

    for (const sa of domain.subAreas) {
      // Sub-area entry
      index.push({
        id: sa.id,
        name: sa.name,
        nameLower: sa.name.toLowerCase(),
        type: RESULT_TYPES.SUB_AREA,
        subAreaId: sa.id,
        breadcrumb: `${domain.name} > ${sa.name}`,
        breadcrumbParts: [domain.name, sa.name],
        skillId: null,
      })

      for (const sg of sa.skillGroups) {
        // Skill group entry
        index.push({
          id: sg.id,
          name: sg.name,
          nameLower: sg.name.toLowerCase(),
          type: RESULT_TYPES.SKILL_GROUP,
          subAreaId: sa.id,
          breadcrumb: `${domain.name} > ${sa.name} > ${sg.name}`,
          breadcrumbParts: [domain.name, sa.name, sg.name],
          skillId: null,
        })

        for (const skill of sg.skills) {
          // Individual skill entry
          index.push({
            id: skill.id,
            name: skill.name,
            nameLower: skill.name.toLowerCase(),
            type: RESULT_TYPES.SKILL,
            subAreaId: sa.id,
            breadcrumb: `${domain.name} > ${sa.name} > ${sg.name}`,
            breadcrumbParts: [domain.name, sa.name, sg.name],
            skillId: skill.id,
          })
        }
      }
    }
  }

  return index
}

/**
 * Fuzzy match: case-insensitive, matches if all space-separated query tokens
 * appear somewhere in the name or breadcrumb (partial substring match).
 */
function fuzzyMatch(entry, queryTokens) {
  const searchable = entry.nameLower + ' ' + entry.breadcrumb.toLowerCase()
  return queryTokens.every((token) => searchable.includes(token))
}

/**
 * Score results for ranking. Higher = better match.
 * Prefers: exact name match > name starts with > name contains > breadcrumb only.
 * Also boosts higher-level types (domains > sub-areas > skills).
 */
function scoreResult(entry, queryTokens, queryLower) {
  let score = 0
  const name = entry.nameLower

  // Exact name match
  if (name === queryLower) score += 100

  // Name starts with full query
  if (name.startsWith(queryLower)) score += 50

  // All tokens found in name (not just breadcrumb)
  if (queryTokens.every((t) => name.includes(t))) score += 30

  // Type boost: domains most important, skills least
  const typeBoost = {
    [RESULT_TYPES.DOMAIN]: 15,
    [RESULT_TYPES.SUB_AREA]: 10,
    [RESULT_TYPES.SKILL_GROUP]: 5,
    [RESULT_TYPES.SKILL]: 0,
  }
  score += typeBoost[entry.type] ?? 0

  return score
}

/**
 * SearchOverlay — Cmd+K / Ctrl+K global spotlight search
 *
 * Searches across all domains, sub-areas, skill groups, and individual skills.
 * Results are grouped by type and show breadcrumb paths and assessment status.
 */
export default function SearchOverlay({ isOpen, onClose, onNavigate, assessments }) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Build the search index once on mount
  const searchIndex = useMemo(() => buildSearchIndex(), [])

  // Filter and rank results based on current query
  const { results, totalMatches } = useMemo(() => {
    if (!query.trim()) return { results: [], totalMatches: 0 }

    const queryLower = query.trim().toLowerCase()
    const queryTokens = queryLower.split(/\s+/).filter(Boolean)

    // Find all matches
    const matches = searchIndex.filter((entry) => fuzzyMatch(entry, queryTokens))

    // Score and sort
    matches.sort((a, b) => {
      const sa = scoreResult(a, queryTokens, queryLower)
      const sb = scoreResult(b, queryTokens, queryLower)
      return sb - sa
    })

    const totalMatches = matches.length
    const results = matches.slice(0, MAX_RESULTS)

    return { results, totalMatches }
  }, [query, searchIndex])

  // Group results by type for display, maintaining order within groups
  const groupedResults = useMemo(() => {
    const groups = []
    const typeOrder = [RESULT_TYPES.DOMAIN, RESULT_TYPES.SUB_AREA, RESULT_TYPES.SKILL_GROUP, RESULT_TYPES.SKILL]
    let flatIndex = 0

    for (const type of typeOrder) {
      const items = []
      for (const result of results) {
        if (result.type === type) {
          items.push({ ...result, flatIndex })
          flatIndex++
        }
      }
      if (items.length > 0) {
        groups.push({ type, label: TYPE_LABELS[type], items })
      }
    }

    return groups
  }, [results])

  // Build a flat ordered list for keyboard navigation (matches display order)
  const flatResults = useMemo(() => {
    const flat = []
    for (const group of groupedResults) {
      for (const item of group.items) {
        flat.push(item)
      }
    }
    return flat
  }, [groupedResults])

  // Ensure activeIndex stays in bounds of flatResults
  const clampedActiveIndex = Math.min(activeIndex, Math.max(0, flatResults.length - 1))

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0)
  }, [results])

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveIndex(0)
      // Small delay to ensure the overlay is rendered before focusing
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [isOpen])

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`)
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) => Math.min(prev + 1, flatResults.length - 1))
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) => Math.max(prev - 1, 0))
        return
      }

      if (e.key === 'Enter' && flatResults.length > 0) {
        e.preventDefault()
        const selected = flatResults[clampedActiveIndex]
        if (selected?.subAreaId) {
          onNavigate(selected.subAreaId)
          onClose()
        }
        return
      }
    },
    [flatResults, clampedActiveIndex, onClose, onNavigate]
  )

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isOpen, onClose])

  // Get assessment status for a result entry
  function getAssessmentStatus(entry) {
    if (!assessments || !entry.skillId) return null
    const level = assessments[entry.skillId]
    if (level === undefined || level === ASSESSMENT_LEVELS.NOT_ASSESSED) return null
    return {
      level,
      label: ASSESSMENT_LABELS[level],
      color: ASSESSMENT_COLORS[level],
    }
  }

  // Handle clicking a result
  function handleSelect(entry) {
    if (entry.subAreaId) {
      onNavigate(entry.subAreaId)
      onClose()
    }
  }

  if (!isOpen) return null

  const remainingCount = totalMatches - results.length

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] print:hidden"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-warm-900/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-[640px] mx-4 bg-white rounded-2xl shadow-2xl border border-warm-200 overflow-hidden flex flex-col max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search skills and domains"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-warm-200">
          {/* Magnifying glass SVG */}
          <svg
            className="w-5 h-5 text-warm-400 shrink-0"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="8.5" cy="8.5" r="6" />
            <path d="M13 13 L18 18" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search skills, domains, sub-areas..."
            className="flex-1 text-sm text-warm-800 placeholder-warm-400 bg-transparent outline-none"
            autoComplete="off"
            spellCheck="false"
          />

          {/* Keyboard shortcut hint */}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-warm-100 text-warm-400 text-[10px] font-mono border border-warm-200">
            ESC
          </kbd>
        </div>

        {/* Results area */}
        <div className="overflow-y-auto flex-1" ref={listRef}>
          {/* Empty state */}
          {!query.trim() && (
            <div className="px-5 py-12 text-center">
              <div className="text-warm-400 text-sm">
                Type to search across all skills and domains
              </div>
              <div className="text-warm-300 text-xs mt-2">
                {searchIndex.length} items across {framework.length} domains
              </div>
            </div>
          )}

          {/* No results */}
          {query.trim() && results.length === 0 && (
            <div className="px-5 py-12 text-center">
              <div className="text-warm-400 text-sm">
                No results for "{query}"
              </div>
              <div className="text-warm-300 text-xs mt-2">
                Try a different search term
              </div>
            </div>
          )}

          {/* Grouped results */}
          {groupedResults.map((group) => (
            <div key={group.type}>
              {/* Group header */}
              <div className="px-5 pt-3 pb-1">
                <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">
                  {group.label}
                </span>
              </div>

              {/* Group items */}
              <div className="px-2">
                {group.items.map((item) => {
                  const isActive = item.flatIndex === clampedActiveIndex
                  const status = getAssessmentStatus(item)

                  return (
                    <button
                      key={item.id}
                      data-index={item.flatIndex}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setActiveIndex(item.flatIndex)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-sage-50 text-sage-800'
                          : 'text-warm-700 hover:bg-warm-50'
                      }`}
                    >
                      {/* Assessment status dot */}
                      <div className="w-4 shrink-0 flex items-center justify-center">
                        {status ? (
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: status.color }}
                            title={status.label}
                          />
                        ) : (
                          <TypeIcon type={item.type} />
                        )}
                      </div>

                      {/* Name and breadcrumb */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate leading-tight">
                          {item.name}
                        </div>
                        {item.type !== RESULT_TYPES.DOMAIN && (
                          <div className="text-[11px] text-warm-400 truncate mt-0.5 leading-tight">
                            {item.breadcrumb}
                          </div>
                        )}
                      </div>

                      {/* Assessment label badge */}
                      {status && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                          style={{
                            backgroundColor: status.color + '22',
                            color: status.color,
                          }}
                        >
                          {status.label}
                        </span>
                      )}

                      {/* Enter hint on active item */}
                      {isActive && (
                        <kbd className="hidden sm:inline text-[9px] text-warm-300 font-mono">
                          {'↵'}
                        </kbd>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Remaining count */}
          {remainingCount > 0 && (
            <div className="px-5 py-3 text-center border-t border-warm-100">
              <span className="text-xs text-warm-400">
                +{remainingCount} more result{remainingCount !== 1 ? 's' : ''} — refine your search
              </span>
            </div>
          )}
        </div>

        {/* Footer with keyboard hints */}
        {results.length > 0 && (
          <div className="px-5 py-2.5 border-t border-warm-100 bg-warm-50/50 flex items-center gap-4 text-[10px] text-warm-400 shrink-0">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-warm-100 border border-warm-200 font-mono">{'↑'}</kbd>
              <kbd className="px-1 py-0.5 rounded bg-warm-100 border border-warm-200 font-mono">{'↓'}</kbd>
              <span className="ml-0.5">navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-warm-100 border border-warm-200 font-mono">{'↵'}</kbd>
              <span className="ml-0.5">select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-warm-100 border border-warm-200 font-mono">esc</kbd>
              <span className="ml-0.5">close</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Small inline icon to indicate the result type when no assessment status is available
 */
function TypeIcon({ type }) {
  const iconClass = 'w-2 h-2 rounded-sm shrink-0'

  switch (type) {
    case RESULT_TYPES.DOMAIN:
      return <span className={`${iconClass} bg-sage-400`} />
    case RESULT_TYPES.SUB_AREA:
      return <span className={`${iconClass} bg-warm-400 rounded-full`} />
    case RESULT_TYPES.SKILL_GROUP:
      return <span className={`${iconClass} bg-warm-300`} />
    case RESULT_TYPES.SKILL:
      return <span className="w-1.5 h-1.5 rounded-full bg-warm-200 shrink-0" />
    default:
      return null
  }
}
