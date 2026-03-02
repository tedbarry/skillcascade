import { useMemo } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { getAllEntries, getEntriesByCategory, getCategoryCounts } from '../data/knowledgeBase/kbIndex.js'
import { KB_CATEGORIES } from '../data/knowledgeBase/kbSchema.js'
import { buildKBSearchIndex, searchKB } from '../data/knowledgeBase/kbSearch.js'
import KBCategoryGrid from '../components/kb/KBCategoryGrid.jsx'
import KBEntryView from '../components/kb/KBEntryView.jsx'
import KBSidebar from '../components/kb/KBSidebar.jsx'
import KBSearch from '../components/kb/KBSearch.jsx'
import DomainBrowser from '../components/kb/DomainBrowser.jsx'
import useResponsive from '../hooks/useResponsive.js'

export default function KnowledgeBase() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const category = searchParams.get('category') || ''
  const { isPhone, isDesktop } = useResponsive()

  const categoryCounts = useMemo(() => {
    try { return getCategoryCounts() } catch (e) { console.error('KB categoryCounts error:', e); return {} }
  }, [])
  const searchIndex = useMemo(() => {
    try { return buildKBSearchIndex(getAllEntries()) } catch (e) { console.error('KB searchIndex error:', e); return [] }
  }, [])

  // If viewing a specific entry
  if (slug) {
    return (
      <div className="min-h-screen bg-warm-50">
        <KBHeader isPhone={isPhone} />
        <div className={`max-w-5xl mx-auto px-4 py-6 ${isDesktop ? 'flex gap-8' : ''}`}>
          {isDesktop && <KBSidebar categoryCounts={categoryCounts} activeCategory={null} />}
          <div className="flex-1 min-w-0">
            <KBEntryView entryId={slug} />
          </div>
        </div>
      </div>
    )
  }

  // Search results
  const searchResults = query ? searchKB(searchIndex, query) : null

  // Category filter
  const categoryEntries = category ? getEntriesByCategory(category) : null
  const catInfo = category ? KB_CATEGORIES[category] : null

  return (
    <div className="min-h-screen bg-warm-50">
      <KBHeader isPhone={isPhone} />
      <div className={`max-w-5xl mx-auto px-4 py-6 ${isDesktop ? 'flex gap-8' : ''}`}>
        {isDesktop && <KBSidebar categoryCounts={categoryCounts} activeCategory={category} />}

        <div className="flex-1 min-w-0">
          {/* Search bar */}
          <div className="mb-8">
            <KBSearch initialQuery={query} autoFocus={!!query} />
          </div>

          {/* Search results view */}
          {searchResults ? (
            <div>
              <h2 className="text-sm font-semibold text-warm-600 mb-4">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{query}"
              </h2>
              <EntryList entries={searchResults} />
            </div>
          ) : categoryEntries ? (
            /* Category list view */
            <div>
              <div className="mb-6">
                <Link to="/kb" className="text-xs text-sage-600 hover:text-sage-700 transition-colors">
                  &larr; All categories
                </Link>
                <h2 className="text-xl font-bold text-warm-800 mt-2 font-display">
                  {catInfo?.label || category}
                </h2>
                {catInfo?.description && (
                  <p className="text-sm text-warm-400 mt-1">{catInfo.description}</p>
                )}
              </div>
              {category === 'domains' ? <DomainBrowser /> : <EntryList entries={categoryEntries} />}
            </div>
          ) : (
            /* Home view: category grid */
            <div>
              <div className="mb-8 text-center">
                <h1 className="text-2xl font-bold text-warm-900 font-display">Knowledge Base</h1>
                <p className="text-sm text-warm-400 mt-2">
                  Everything you need to know about SkillCascade — concepts, tools, and clinical guidance.
                </p>
              </div>
              <KBCategoryGrid categoryCounts={categoryCounts} />

              {/* Quick stats */}
              <div className="mt-8 text-center text-xs text-warm-300">
                {getAllEntries().length} articles across {Object.keys(KB_CATEGORIES).length} categories
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-warm-200 mt-12 py-6 text-center">
        <div className="flex items-center justify-center gap-4 text-xs text-warm-400">
          <Link to="/" className="hover:text-warm-600 transition-colors">Home</Link>
          <span className="text-warm-200">|</span>
          <Link to="/dashboard" className="hover:text-warm-600 transition-colors">Dashboard</Link>
          <span className="text-warm-200">|</span>
          <Link to="/contact" className="hover:text-warm-600 transition-colors">Contact</Link>
        </div>
      </footer>
    </div>
  )
}

function KBHeader({ isPhone }) {
  return (
    <header className="bg-white border-b border-warm-200 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link to="/" className="text-lg font-bold text-warm-800 font-display">
          Skill<span className="text-sage-500">Cascade</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/kb"
            className="text-xs text-sage-600 hover:text-sage-700 font-medium transition-colors"
          >
            Knowledge Base
          </Link>
          {!isPhone && (
            <Link
              to="/dashboard"
              className="text-xs px-3 py-1.5 rounded-lg bg-sage-500 text-white hover:bg-sage-600 transition-colors"
            >
              Dashboard
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

function EntryList({ entries }) {
  if (entries.length === 0) {
    return <p className="text-sm text-warm-400 py-8 text-center">No articles found.</p>
  }

  // Group by domain for skill entries, keep flat for others
  const grouped = {}
  const nonSkill = []

  for (const entry of entries) {
    if (entry.skillId || entry.subAreaId) {
      const key = entry.domainId || 'other'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(entry)
    } else {
      nonSkill.push(entry)
    }
  }

  return (
    <div className="space-y-2">
      {nonSkill.map(entry => (
        <EntryCard key={entry.id} entry={entry} />
      ))}
      {Object.entries(grouped).map(([domainId, items]) => (
        <div key={domainId}>
          {items.map(entry => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      ))}
    </div>
  )
}

function EntryCard({ entry }) {
  const catInfo = KB_CATEGORIES[entry.category]
  return (
    <Link
      to={`/kb/${entry.id}`}
      className="block px-4 py-3 rounded-lg bg-white border border-warm-200 hover:border-sage-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-warm-800">{entry.title}</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-warm-100 text-warm-400 shrink-0">
          {catInfo?.label || entry.category}
        </span>
      </div>
      {entry.summary && (
        <p className="text-xs text-warm-400 mt-0.5 line-clamp-2">{entry.summary}</p>
      )}
    </Link>
  )
}
