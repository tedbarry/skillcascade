/* ─────────────────────────────────────────────
   Chat Similarity — client-side duplicate detection
   Pure utility, no React, no AI tokens.
   ───────────────────────────────────────────── */

const STOPWORDS = new Set([
  // Standard English
  'a','an','the','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','shall','should','may','might','must','can','could',
  'i','me','my','we','our','you','your','he','him','his','she','her','it','its',
  'they','them','their','this','that','these','those','am','not','no','or','and',
  'but','if','so','as','at','by','for','in','of','on','to','up','with','from',
  'about','into','through','during','before','after','above','below','between',
  'out','off','over','under','again','then','once','here','there','when','where',
  'why','how','all','each','every','both','few','more','most','other','some','such',
  'than','too','very','just','also','now','what','which','who','whom',
  // Common prompt verbs / filler
  'write','create','generate','help','please','make','give','tell','show','explain',
  'describe','provide','list','suggest','need','want','like','using','use','get',
])

/* ─────────────────────────────────────────────
   ABA Domain Synonym Map
   Each array shares a canonical term (first entry).
   Words map to their canonical form before comparison.
   ───────────────────────────────────────────── */

const SYNONYM_GROUPS = [
  // ── Behavior types ──
  ['elopement', 'running away', 'bolting', 'fleeing', 'eloping', 'runaway', 'absconding', 'wandering off', 'leaving area'],
  ['aggression', 'hitting', 'attacking', 'aggressive', 'combative', 'violent', 'fighting', 'striking', 'kicking', 'biting', 'scratching', 'pushing'],
  ['self injury', 'sib', 'self harm', 'self injurious', 'self mutilation', 'head banging', 'self hitting', 'self biting'],
  ['noncompliance', 'non compliance', 'refusal', 'refusing', 'noncompliant', 'non compliant', 'defiance', 'defiant', 'oppositional'],
  ['tantrum', 'meltdown', 'outburst', 'emotional outburst', 'crying episode', 'screaming'],
  ['stereotypy', 'stimming', 'self stimulatory', 'repetitive behavior', 'stim', 'self stimulation'],
  ['pica', 'eating non food', 'mouthing objects', 'ingesting non edible'],
  ['property destruction', 'destroying', 'breaking things', 'damaging property', 'throwing objects', 'breaking objects'],
  ['echolalia', 'echoing', 'repeating words', 'scripting', 'vocal stereotypy'],
  ['toileting', 'toilet training', 'potty training', 'bathroom', 'enuresis', 'encopresis', 'incontinence'],

  // ── Clinical / assessment terms ──
  ['deficit', 'deficits', 'problem', 'problems', 'challenge', 'challenges', 'weakness', 'weaknesses', 'area of need', 'areas of need', 'difficulty', 'difficulties', 'concern', 'concerns'],
  ['strength', 'strengths', 'mastered', 'mastery', 'proficient', 'competent', 'strong area'],
  ['goal', 'goals', 'objective', 'objectives', 'target', 'targets', 'benchmark', 'benchmarks'],
  ['baseline', 'current level', 'present level', 'starting point', 'initial assessment'],
  ['maintenance', 'maintaining', 'generalization', 'generalizing', 'retention', 'carryover'],
  ['prompt', 'prompting', 'cue', 'cueing', 'prompt level', 'assistance level'],
  ['reinforcement', 'reinforcer', 'reward', 'preferred item', 'motivator', 'incentive'],
  ['extinction', 'planned ignoring', 'withholding reinforcement', 'ignoring behavior'],
  ['antecedent', 'trigger', 'precursor', 'setting event', 'discriminative stimulus'],
  ['consequence', 'outcome', 'result', 'response to behavior', 'contingency'],
  ['frequency', 'rate', 'how often', 'occurrences', 'count', 'tally'],
  ['duration', 'how long', 'length of time', 'time spent'],
  ['latency', 'response time', 'time to respond', 'delay'],
  ['intensity', 'severity', 'magnitude', 'how severe', 'how intense'],
  ['interval', 'interval recording', 'time sampling', 'momentary time sampling'],

  // ── Document / plan types ──
  ['bip', 'behavior intervention plan', 'behavior plan', 'behaviour plan', 'behavior support plan', 'bsp'],
  ['operational definition', 'op def', 'opdef', 'behavior definition', 'behavioral definition'],
  ['functional assessment', 'fba', 'functional behavior assessment', 'functional analysis', 'fa'],
  ['treatment plan', 'tx plan', 'intervention plan', 'therapy plan', 'service plan'],
  ['progress report', 'progress note', 'session note', 'progress summary', 'status report'],
  ['iep', 'individualized education program', 'education plan', 'individualized education plan'],
  ['observation', 'observation report', 'direct observation', 'behavioral observation'],
  ['titration', 'titration plan', 'fading plan', 'reduction plan', 'thinning plan'],
  ['ltg', 'long term goal', 'long term goals', 'annual goal', 'annual goals'],
  ['stg', 'short term goal', 'short term goals', 'short term objective', 'short term objectives'],

  // ── Actions / task verbs ──
  ['summarize', 'summary', 'summarise', 'overview', 'recap', 'synopsis', 'brief'],
  ['analyze', 'analyse', 'analysis', 'assess', 'evaluate', 'evaluation', 'review'],
  ['classify', 'categorize', 'categorise', 'sort', 'label', 'identify type'],
  ['rewrite', 'rephrase', 'revise', 'edit', 'improve', 'rework', 'fix wording'],
  ['reduce', 'decrease', 'lower', 'minimize', 'diminish', 'lessen'],
  ['increase', 'improve', 'raise', 'enhance', 'boost', 'build'],

  // ── People / roles ──
  ['client', 'student', 'learner', 'patient', 'individual', 'child', 'kiddo'],
  ['bcba', 'analyst', 'behavior analyst', 'supervisor', 'board certified behavior analyst'],
  ['rbt', 'technician', 'behavior technician', 'therapist', 'paraprofessional', 'line therapist', 'direct staff'],
  ['caregiver', 'parent', 'guardian', 'family member', 'family'],
]

// Build lookup: word/phrase → canonical form
const SYNONYM_MAP = new Map()
for (const group of SYNONYM_GROUPS) {
  const canonical = group[0]
  for (const term of group) {
    // Handle multi-word phrases: store both the phrase and individual words
    const normalized = term.toLowerCase().replace(/[^\w\s]/g, '').trim()
    SYNONYM_MAP.set(normalized, canonical)
  }
}

/**
 * Resolve a word (or bigram) to its canonical synonym, if one exists.
 */
function resolveSynonym(word) {
  return SYNONYM_MAP.get(word) || word
}

export function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractKeywords(text) {
  const normalized = normalizeText(text)
  const words = normalized.split(' ')
  const keywords = new Set()

  // Check bigrams first (for multi-word synonyms like "running away", "self injury")
  let i = 0
  while (i < words.length) {
    let matched = false
    // Try trigram
    if (i + 2 < words.length) {
      const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`
      const resolved = SYNONYM_MAP.get(trigram)
      if (resolved) {
        keywords.add(resolved)
        i += 3
        matched = true
      }
    }
    // Try bigram
    if (!matched && i + 1 < words.length) {
      const bigram = `${words[i]} ${words[i + 1]}`
      const resolved = SYNONYM_MAP.get(bigram)
      if (resolved) {
        keywords.add(resolved)
        i += 2
        matched = true
      }
    }
    // Single word
    if (!matched) {
      const w = words[i]
      if (w.length > 2 && !STOPWORDS.has(w)) {
        keywords.add(resolveSynonym(w))
      }
      i++
    }
  }

  return keywords
}

/**
 * Levenshtein edit distance between two strings.
 * Used for typo tolerance (e.g., "elopemnt" ↔ "elopement").
 */
export function editDistance(a, b) {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  // Use single-row DP for memory efficiency
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        curr[j - 1] + 1,      // insert
        prev[j] + 1,          // delete
        prev[j - 1] + cost,   // substitute
      )
    }
    prev = curr
  }
  return prev[b.length]
}

/**
 * Check if two words are "close enough" to count as a match.
 * Exact match, or edit distance within a length-scaled threshold.
 */
function wordsMatch(a, b) {
  if (a === b) return true
  // Allow 1 edit for words 4-6 chars, 2 edits for 7+ chars
  const maxDist = Math.min(a.length, b.length) >= 7 ? 2 : 1
  // Quick reject: length difference alone exceeds threshold
  if (Math.abs(a.length - b.length) > maxDist) return false
  return editDistance(a, b) <= maxDist
}

/**
 * Fuzzy Jaccard similarity — like Jaccard, but uses edit distance
 * so typos and minor misspellings still count as matching keywords.
 */
export function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0

  const arrB = [...setB]
  const matchedB = new Set()
  let fuzzyMatches = 0

  for (const wordA of setA) {
    // Try exact match first (fast path)
    if (setB.has(wordA)) {
      fuzzyMatches++
      matchedB.add(wordA)
      continue
    }
    // Fuzzy match against unmatched words in B
    for (const wordB of arrB) {
      if (matchedB.has(wordB)) continue
      if (wordsMatch(wordA, wordB)) {
        fuzzyMatches++
        matchedB.add(wordB)
        break
      }
    }
  }

  const union = setA.size + setB.size - fuzzyMatches
  return union === 0 ? 0 : fuzzyMatches / union
}

/**
 * Find the best matching previous message above a similarity threshold.
 * Returns { score, entry } or null.
 */
export function findSimilarMessage(text, index) {
  if (!index || index.length === 0) return null

  const normalized = normalizeText(text)
  const keywords = extractKeywords(text)

  let bestScore = 0
  let bestEntry = null

  for (const entry of index) {
    // Exact normalized match
    if (normalized === entry.normalized) {
      return { score: 1.0, entry }
    }

    // Substring containment for short queries (< 8 words)
    const words = normalized.split(' ')
    if (words.length < 8) {
      if (entry.normalized.includes(normalized) || normalized.includes(entry.normalized)) {
        const lenRatio = Math.min(normalized.length, entry.normalized.length) /
                         Math.max(normalized.length, entry.normalized.length)
        if (lenRatio > 0.5) {
          const substringScore = 0.7 + (lenRatio * 0.3)
          if (substringScore > bestScore) {
            bestScore = substringScore
            bestEntry = entry
          }
          continue
        }
      }
    }

    // Jaccard keyword similarity
    const score = jaccardSimilarity(keywords, entry.keywords)
    if (score > bestScore) {
      bestScore = score
      bestEntry = entry
    }
  }

  if (bestScore >= 0.6 && bestEntry) {
    return { score: bestScore, entry: bestEntry }
  }
  return null
}

// ── localStorage index management ──

function getIndexKey(client, toolId) {
  return `skillcascade_ai_index_${client || 'default'}_${toolId}`
}

export function loadSearchIndex(client, toolId) {
  try {
    const raw = localStorage.getItem(getIndexKey(client, toolId))
    if (!raw) return []
    const entries = JSON.parse(raw)
    // Rehydrate keyword Sets from arrays
    return entries.map((e) => ({ ...e, keywords: new Set(e.keywords) }))
  } catch {
    return []
  }
}

export function saveSearchIndex(client, toolId, index) {
  try {
    // Cap at 100 entries, serialize Sets as arrays
    const capped = index.slice(0, 100)
    const serializable = capped.map((e) => ({ ...e, keywords: [...e.keywords] }))
    localStorage.setItem(getIndexKey(client, toolId), JSON.stringify(serializable))
  } catch { /* storage full */ }
}

export function addToSearchIndex(client, toolId, index, userText, chatId, msgId) {
  const normalized = normalizeText(userText)
  const keywords = extractKeywords(userText)
  if (keywords.size === 0) return index // skip trivially short messages

  // Don't add duplicates
  if (index.some((e) => e.normalized === normalized)) return index

  const updated = [
    { normalized, keywords, text: userText, chatId, msgId },
    ...index,
  ].slice(0, 100)

  saveSearchIndex(client, toolId, updated)
  return updated
}

/**
 * Rebuild the search index from scratch using the full chat list.
 * Only indexes user messages that have a following assistant response.
 */
export function rebuildSearchIndex(client, toolId, chatList) {
  const entries = []
  for (const chat of chatList) {
    const msgs = chat.messages || []
    for (let i = 0; i < msgs.length - 1; i++) {
      if (msgs[i].role === 'user' && msgs[i + 1].role === 'assistant') {
        const normalized = normalizeText(msgs[i].content)
        const keywords = extractKeywords(msgs[i].content)
        if (keywords.size === 0) continue
        // Avoid duplicates
        if (!entries.some((e) => e.normalized === normalized)) {
          entries.push({
            normalized,
            keywords,
            text: msgs[i].content,
            chatId: chat.id,
            msgId: msgs[i].id,
          })
        }
      }
    }
  }
  const capped = entries.slice(0, 100)
  saveSearchIndex(client, toolId, capped)
  return capped
}

/**
 * Given a match entry, retrieve the original Q&A pair from the chat list.
 * Returns { question, answer, chatTitle } or null if the chat/message no longer exists.
 */
export function getMatchedResponse(chatList, chatId, msgId) {
  const chat = chatList.find((c) => c.id === chatId)
  if (!chat) return null

  const msgs = chat.messages || []
  const idx = msgs.findIndex((m) => m.id === msgId)
  if (idx < 0 || idx >= msgs.length - 1) return null
  if (msgs[idx + 1].role !== 'assistant') return null

  return {
    question: msgs[idx].content,
    answer: msgs[idx + 1].content,
    chatTitle: chat.title || 'Untitled chat',
  }
}
