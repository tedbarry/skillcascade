/**
 * Smart Search — AI-powered contextual search
 *
 * Builds assessment context + KB references, sends to AI proxy,
 * returns a natural language answer with source links.
 */
import { framework, isAssessed } from '../data/framework.js'
import { supabase } from './supabase.js'
import { searchKB, buildKBSearchIndex } from '../data/knowledgeBase/kbSearch.js'
import { getAllEntries } from '../data/knowledgeBase/kbIndex.js'

// Lazily built KB index for AI context lookups
let _kbIndex = null
function getKBIndex() {
  if (!_kbIndex) _kbIndex = buildKBSearchIndex(getAllEntries())
  return _kbIndex
}

/**
 * Build a compact summary of the client's current assessment state.
 * Returns domain-level averages, weakest areas, and unassessed counts.
 */
function buildAssessmentContext(assessments) {
  if (!assessments || Object.keys(assessments).length === 0) {
    return 'No assessment data available for this client yet.'
  }

  const domainStats = []
  let totalAssessed = 0
  let totalSkills = 0

  for (const domain of framework) {
    let sum = 0
    let count = 0
    let unassessed = 0
    const weakSkills = []

    for (const sa of domain.subAreas) {
      for (const sg of sa.skillGroups) {
        for (const skill of sg.skills) {
          totalSkills++
          const level = assessments[skill.id]
          if (isAssessed(level)) {
            totalAssessed++
            sum += level
            count++
            if (level <= 1) weakSkills.push(skill.name)
          } else {
            unassessed++
          }
        }
      }
    }

    const avg = count > 0 ? (sum / count).toFixed(1) : 'N/A'
    const health = count > 0
      ? (sum / count >= 2.5 ? 'strong' : sum / count >= 1.5 ? 'developing' : 'needs attention')
      : 'not assessed'

    domainStats.push({
      name: domain.name,
      shortId: domain.id,
      avg,
      health,
      assessed: count,
      total: count + unassessed,
      weakSkills: weakSkills.slice(0, 5),
    })
  }

  const lines = [
    `Assessment coverage: ${totalAssessed}/${totalSkills} skills rated.`,
    '',
    'Domain health summary:',
  ]

  for (const d of domainStats) {
    lines.push(`- ${d.name} (${d.shortId}): avg ${d.avg}/3.0, ${d.health}, ${d.assessed}/${d.total} rated`)
    if (d.weakSkills.length > 0) {
      lines.push(`  Weak skills: ${d.weakSkills.join(', ')}`)
    }
  }

  const weakDomains = domainStats
    .filter(d => d.health === 'needs attention')
    .map(d => d.name)
  if (weakDomains.length > 0) {
    lines.push('')
    lines.push(`Domains needing attention: ${weakDomains.join(', ')}`)
  }

  return lines.join('\n')
}

/**
 * Build a context string from KB entries matching the query.
 */
function buildKBContext(query) {
  const results = searchKB(getKBIndex(), query, 5)
  if (results.length === 0) return ''

  const lines = ['Relevant knowledge base articles:']
  for (const r of results) {
    lines.push(`- "${r.title}" (${r.category}): ${r.summary || ''}`)
  }
  return lines.join('\n')
}

const SYSTEM_PROMPT = `You are SkillCascade's AI search assistant. SkillCascade is an ABA therapy skill assessment tool used by BCBAs to track 260 developmental skills across 9 domains.

Your job is to answer the user's question using the provided assessment data and knowledge base context. Be specific, actionable, and clinical in your advice.

Rules:
- Reference specific skills, domains, and sub-areas by name when relevant
- If assessment data shows weak areas, prioritize recommendations there
- Suggest specific views or features in the app when relevant (e.g., "Check the Bottleneck Finder view")
- Keep answers concise — 3-5 paragraphs max
- Use markdown formatting for readability (bold, lists, headers)
- If you don't have enough data to answer, say so and suggest what the user should assess first
- Never make up assessment scores or skill names — only reference what's in the provided context`

/**
 * Send a smart search query to the AI proxy.
 *
 * @param {string} query - The user's natural language question
 * @param {Object} assessments - Current client assessments { skillId: level }
 * @param {string} clientName - Current client name (optional)
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 * @returns {Promise<{ answer: string, sources: Array<{ title: string, id: string }> }>}
 */
export async function askSmartSearch(query, assessments = {}, clientName = '', signal) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const { data: { session } } = await supabase.auth.getSession()

  if (!supabaseUrl || !session?.access_token) {
    throw new Error('Sign in to use AI search.')
  }

  // Build contextual data
  const assessmentContext = buildAssessmentContext(assessments)
  const kbContext = buildKBContext(query)

  // Find source references for the response
  const kbResults = searchKB(getKBIndex(), query, 5)
  const sources = kbResults.map(r => ({ title: r.title, id: r.id }))

  const contextBlock = [
    '--- CLIENT ASSESSMENT DATA ---',
    clientName ? `Client: ${clientName}` : 'Client: (current client)',
    assessmentContext,
    '',
    kbContext ? `--- KNOWLEDGE BASE ---\n${kbContext}` : '',
  ].filter(Boolean).join('\n')

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `${contextBlock}\n\n--- USER QUESTION ---\n${query}` },
  ]

  const res = await fetch(`${supabaseUrl}/functions/v1/ai-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      messages,
      model: 'gpt-4o-mini',
      max_tokens: 1500,
      temperature: 0.5,
    }),
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    if (res.status === 429) throw new Error('Rate limit reached. Try again in a minute.')
    if (res.status === 400 && err.error?.includes('No API key')) {
      throw new Error('No API key configured. Set up AI in Settings to use smart search.')
    }
    throw new Error(err.error || `AI search failed (${res.status})`)
  }

  const data = await res.json()
  return {
    answer: data.content || 'No answer generated.',
    sources,
  }
}
