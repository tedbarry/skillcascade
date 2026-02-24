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

export function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractKeywords(text) {
  const words = normalizeText(text).split(' ')
  return new Set(words.filter((w) => w.length > 2 && !STOPWORDS.has(w)))
}

export function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0
  let intersection = 0
  for (const w of setA) {
    if (setB.has(w)) intersection++
  }
  const union = setA.size + setB.size - intersection
  return union === 0 ? 0 : intersection / union
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
