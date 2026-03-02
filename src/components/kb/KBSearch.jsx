import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildKBSearchIndex, searchKB } from '../../data/knowledgeBase/kbSearch.js'
import { getAllEntries } from '../../data/knowledgeBase/kbIndex.js'
import { KB_CATEGORIES } from '../../data/knowledgeBase/kbSchema.js'

export default function KBSearch({ initialQuery = '', autoFocus = false }) {
  const [query, setQuery] = useState(initialQuery)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const searchIndex = useMemo(() => buildKBSearchIndex(getAllEntries()), [])

  const results = useMemo(() => searchKB(searchIndex, query), [searchIndex, query])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const handleSelect = useCallback((id) => {
    navigate(`/kb/${id}`)
  }, [navigate])

  return (
    <div className="w-full">
      {/* Search input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the knowledge base..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-warm-200 bg-white text-sm text-warm-800 placeholder-warm-400 focus:outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100 transition-all"
          autoComplete="off"
          spellCheck="false"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-300 hover:text-warm-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Results */}
      {query.trim().length >= 2 && (
        <div className="mt-3 rounded-xl border border-warm-200 bg-white overflow-hidden max-h-[60vh] overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-warm-400">No results for "{query}"</p>
              <p className="text-xs text-warm-300 mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="divide-y divide-warm-100">
              {results.map(result => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result.id)}
                  className="w-full text-left px-4 py-3 hover:bg-sage-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-warm-800">{result.title}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-warm-100 text-warm-500 shrink-0">
                      {KB_CATEGORIES[result.category]?.label || result.category}
                    </span>
                  </div>
                  {result.summary && (
                    <p className="text-xs text-warm-400 mt-0.5 line-clamp-1">{result.summary}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
