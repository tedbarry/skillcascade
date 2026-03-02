/**
 * Client-side KB search engine.
 * Token-based fuzzy matching — same algorithm as SearchOverlay.
 */

/**
 * Build a lightweight search index from KB entries.
 * Only searchable fields — no body content.
 */
export function buildKBSearchIndex(entries) {
  return entries.map(e => ({
    id: e.id,
    title: e.title,
    titleLower: e.title.toLowerCase(),
    category: e.category,
    summary: e.summary || '',
    searchable: [e.title, ...(e.tags || []), e.summary || '', e.category].join(' ').toLowerCase(),
  }))
}

/**
 * Search KB entries. Returns scored, sorted results.
 */
export function searchKB(index, query, maxResults = 50) {
  if (!query || query.trim().length < 2) return []

  const queryLower = query.toLowerCase().trim()
  const tokens = queryLower.split(/\s+/).filter(Boolean)

  return index
    .filter(entry => tokens.every(token => entry.searchable.includes(token)))
    .map(entry => ({ ...entry, score: scoreResult(entry, tokens, queryLower) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
}

function scoreResult(entry, tokens, queryLower) {
  let score = 0
  if (entry.titleLower === queryLower) score += 100
  if (entry.titleLower.startsWith(queryLower)) score += 50
  if (tokens.every(t => entry.titleLower.includes(t))) score += 30
  // Boost concept/view entries over individual skills
  if (entry.category === 'clinical') score += 15
  if (entry.category === 'views') score += 10
  if (entry.category === 'getting-started') score += 10
  if (entry.category === 'assessment') score += 8
  return score
}
