import { useState, useCallback, useRef } from 'react'
import useResponsive from '../../hooks/useResponsive.js'
import { compressImage } from './ImageUpload.jsx'
import { callAI } from '../../lib/aiClient.js'

// ─── Fuzzy Matching Utilities ───────────────────────────────────────────────

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/\.[^.]+$/, '')        // strip file extension
    .replace(/[_\-]+/g, ' ')        // underscores/hyphens → spaces
    .replace(/[^a-z0-9 ]/g, ' ')   // special chars → spaces (not strip — preserves word boundaries)
    .replace(/\s+/g, ' ')           // collapse multiple spaces
    .trim()
}

/** Clean a Passage Health filename: strip leading number, trailing underscore, extension */
function cleanPassageFilename(fileName) {
  return (fileName || '')
    .replace(/\.[^.]+$/, '')        // strip extension
    .replace(/^\d+\s*/, '')         // strip leading number (e.g., "59 ")
    .replace(/_+$/, '')             // strip trailing underscores
    .replace(/[_]+/g, ' ')         // underscores → spaces
    .replace(/\s+/g, ' ')
    .trim()
}

/** Levenshtein distance for fuzzy matching */
function levenshtein(a, b) {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[m][n]
}

/** Score how well a filename/title matches a goal name. Lower = better. */
function matchScore(input, goalName) {
  const a = normalize(input)
  const b = normalize(goalName)
  if (!a || !b) return 999

  // Exact match
  if (a === b) return 0

  // One contains the other
  if (a.includes(b) || b.includes(a)) return 1

  // Word overlap score
  const aWords = a.split(/\s+/)
  const bWords = b.split(/\s+/)
  const overlap = aWords.filter(w => bWords.some(bw => bw.includes(w) || w.includes(bw))).length
  const maxWords = Math.max(aWords.length, bWords.length)
  if (overlap > 0) {
    // Strong word overlap gets a low score
    const overlapScore = 2 + (1 - overlap / maxWords) * 5
    return overlapScore
  }

  // Levenshtein as fallback
  const dist = levenshtein(a, b)
  const maxLen = Math.max(a.length, b.length)
  const ratio = dist / maxLen
  return ratio < 0.4 ? 5 + ratio * 10 : 100 + dist
}

/** Extract short keyword names from a long goal name */
function extractKeywords(goalText) {
  if (!goalText) return []
  const names = []
  // Full name
  names.push(goalText)
  // Strip common prefixes like "The client will decrease instances of"
  const stripped = goalText
    .replace(/^(the\s+)?(client|child|student|learner)\s+(will\s+)?(decrease|increase|reduce|improve|maintain|demonstrate|engage in|display|exhibit|use|utilize)\s+(instances?\s+of\s+|in\s+|the\s+)?/i, '')
    .trim()
  if (stripped && stripped !== goalText) names.push(stripped)
  // Further strip to just the behavior/skill name
  const shortStripped = stripped
    .replace(/\s*(across|within|during|when|in\s+\d|over\s+\d|for\s+\d|as\s+measured|per\s+session|with\s+\d|\.\.\.|\.).*/i, '')
    .trim()
  if (shortStripped && shortStripped.length > 2 && shortStripped !== stripped) names.push(shortStripped)
  return names
}

/** Find the best goal match for a given name. Checks multiple variations. Returns { goalId, score } */
function findBestMatch(name, goals) {
  let best = { goalId: null, score: 999 }
  for (const goal of goals) {
    // Check against multiple name variations for this goal
    const namesToCheck = [
      goal.program,
      goal.skillName,
      goal.objective,
      goal.goalText,
      ...extractKeywords(goal.program || ''),
      ...extractKeywords(goal.objective || goal.goalText || ''),
    ].filter(Boolean)

    for (const goalName of namesToCheck) {
      const score = matchScore(name, goalName)
      if (score < best.score) {
        best = { goalId: goal.id || goal.skillId, score }
      }
    }
  }
  return best
}

// ─── File Processing ────────────────────────────────────────────────────────

async function readFileAsDataUri(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.readAsDataURL(file)
  })
}

async function extractPdfPages(file) {
  const { renderPDFPagesAsImages } = await import('../../lib/pdfUtils.js')
  return renderPDFPagesAsImages(file)
}

/** Use AI to read graph AND match it to a goal from the list. Returns { title, matchIndex } */
async function identifyAndMatchGraph(imageDataUri, goalList, fileName = '') {
  try {
    const numberedGoals = goalList.map((g, i) => `${i + 1}. ${g}`).join('\n')
    const fileHint = fileName ? `\nThe file is named: "${fileName}"` : ''
    const result = await callAI({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `This is a graph from an ABA therapy progress report. Identify what behavior or skill is being measured using ALL available clues:
1. The title or header text on the graph
2. The axis labels
3. Any text visible in the image
4. The filename of the image${fileHint}

Use whichever clue is most informative. If the graph title is cut off or unclear, rely more on the filename.

Then match it to the BEST goal from this numbered list:
${numberedGoals}

Return your answer in this exact format (nothing else):
TITLE: [what the graph shows]
MATCH: [number from the list]

If you're unsure, pick the closest match. Always return a number.`,
            },
            {
              type: 'image_url',
              image_url: { url: imageDataUri },
            },
          ],
        },
      ],
      model: 'gpt-4o-mini',
      maxTokens: 150,
      temperature: 0.1,
    })
    const text = (result || '').trim()
    const titleMatch = text.match(/TITLE:\s*(.+)/i)
    const indexMatch = text.match(/MATCH:\s*(\d+)/i)
    return {
      title: titleMatch ? titleMatch[1].trim() : '',
      matchIndex: indexMatch ? parseInt(indexMatch[1], 10) - 1 : -1,
    }
  } catch (err) {
    console.warn('AI graph matching failed:', err)
    return { title: '', matchIndex: -1 }
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Smart Graph Upload — bulk upload images or PDFs, fuzzy-match to goals,
 * preview & adjust mappings, then confirm.
 *
 * Props:
 *   goals: array of goal objects (id, skillId, program, objective, domain, goalText)
 *   goalGraphs: current { goalId: base64 } map
 *   onConfirm: (updatedGoalGraphs) => void
 */
export default function SmartGraphUpload({ goals, goalGraphs, onConfirm }) {
  const { isPhone, isMobile } = useResponsive()

  // Array of { image: base64, fileName: string, title: string, matchedGoalId: string|null, score: number }
  const [mappings, setMappings] = useState([])
  const [processing, setProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)

  // Deduplicate goals by objective text — same objective in different domains only needs one graph
  const goalOptions = (() => {
    const seen = new Set()
    const opts = []
    for (const g of goals) {
      const obj = (g.objective || g.goalText || '').trim()
      if (!obj || seen.has(obj.toLowerCase())) continue
      seen.add(obj.toLowerCase())
      opts.push({
        id: g.id || g.skillId,
        label: obj,
      })
    }
    return opts
  })()

  // ─── Process uploaded files ───────────────────────────────────────────

  const processFiles = useCallback(async (files) => {
    if (!files || files.length === 0 || goals.length === 0) return
    setProcessing(true)
    setProcessingStatus('Reading files...')

    try {
      const items = [] // { image, fileName, source }

      // 1. Separate PDFs from images
      for (const file of files) {
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          setProcessingStatus(`Extracting pages from ${file.name}...`)
          const pages = await extractPdfPages(file)
          pages.forEach((img, i) => {
            items.push({
              image: img,
              fileName: `${file.name} (page ${i + 1})`,
              source: 'pdf',
              pageIndex: i,
            })
          })
        } else if (file.type.startsWith('image/')) {
          const dataUri = await readFileAsDataUri(file)
          const compressed = await compressImage(dataUri)
          items.push({
            image: compressed,
            fileName: file.name,
            source: 'image',
          })
        }
      }

      if (items.length === 0) {
        setProcessing(false)
        setProcessingStatus('')
        return
      }

      // 2. Match each item to a goal — FILENAME FIRST, AI only as fallback
      setProcessingStatus(`Matching ${items.length} image${items.length > 1 ? 's' : ''} to goals...`)
      const newMappings = []
      const usedGoalIds = new Set()

      // Build multiple name variations per goal — objectives FIRST (most likely to match Passage filenames)
      const goalMatchData = goals.map(g => {
        const id = g.id || g.skillId
        const names = [
          g.objective, g.goalText,  // full objective first — Passage filenames use this
          g.program, g.skillName,   // short program name second
          ...extractKeywords(g.objective || g.goalText || ''),
          ...extractKeywords(g.program || ''),
        ].filter(Boolean)
        return { id, names }
      })

      // Stop words — common words that cause false matches between unrelated goals
      const STOP_WORDS = new Set(['the', 'client', 'will', 'with', 'per', 'session', 'verbal', 'prompt', 'prompts', 'once', 'times', 'that', 'for', 'and', 'from', 'during', 'when', 'use', 'using', 'demonstrate', 'decrease', 'increase', 'instances', 'caregiver', 'behavior', 'plan'])

      // Smart filename→goal matcher
      const matchFilenameToGoal = (fileName) => {
        const cleaned = cleanPassageFilename(fileName)
        const normalizedCleaned = normalize(cleaned)
        if (!normalizedCleaned || normalizedCleaned.length < 3) return { goalId: null, score: 999 }

        let best = { goalId: null, score: 999 }
        for (const gd of goalMatchData) {
          for (const name of gd.names) {
            const normalizedGoal = normalize(name)
            if (!normalizedGoal) continue

            // Direct contains check — but require meaningful length overlap
            // Prevent short goal names (e.g., "verbal") from matching long unrelated filenames
            const shorter = normalizedCleaned.length < normalizedGoal.length ? normalizedCleaned : normalizedGoal
            const longer = normalizedCleaned.length >= normalizedGoal.length ? normalizedCleaned : normalizedGoal
            if (shorter.length >= 10 && longer.includes(shorter)) {
              const lenRatio = shorter.length / longer.length
              const score = lenRatio > 0.5 ? 0 : lenRatio > 0.3 ? 1 : 2
              if (score < best.score) best = { goalId: gd.id, score }
              continue
            }

            // Word overlap — exclude stop words to prevent false matches
            const fileWords = normalizedCleaned.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w))
            const goalWords = normalizedGoal.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w))
            if (goalWords.length === 0) continue

            const matchedWords = goalWords.filter(gw => fileWords.some(fw => fw.includes(gw) || gw.includes(fw)))
            const matchRatio = matchedWords.length / goalWords.length

            // Require higher threshold and minimum matched content words
            if (matchRatio >= 0.7 && matchedWords.length >= 2) {
              const score = Math.round((1 - matchRatio) * 10)
              if (score < best.score) best = { goalId: gd.id, score }
            } else if (matchRatio >= 0.5 && matchedWords.length >= 2) {
              const score = 5 + Math.round((1 - matchRatio) * 10)
              if (score < best.score) best = { goalId: gd.id, score }
            }
          }
        }
        return best
      }

      // AI goal list for fallback
      const goalNameList = goals.map(g => g.objective || g.goalText || g.program || g.skillName || 'Unknown')

      const needsAI = [] // indices that need AI fallback

      // PASS 1: Try filename matching for all items (instant, no API calls)
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const cleanedName = cleanPassageFilename(item.fileName)

        // Detect Windows 8.3 short filenames (e.g., THEC~1, CARE~1, B4~1)
        const isTruncated = /~\d/.test(item.fileName) || cleanedName.length < 8

        let fnMatch = { goalId: null, score: 999 }
        if (!isTruncated) {
          fnMatch = matchFilenameToGoal(item.fileName)
        }

        // Debug logging
        const matchedGoalName = fnMatch.goalId ? goals.find(g => (g.id || g.skillId) === fnMatch.goalId) : null
        console.log(`[GraphMatch] "${cleanedName}"${isTruncated ? ' [TRUNCATED]' : ''} → score:${fnMatch.score} → "${matchedGoalName?.program || matchedGoalName?.objective || 'NO MATCH'}"`)

        if (!isTruncated && fnMatch.goalId && fnMatch.score <= 1) {
          // Strong filename match — use it
          usedGoalIds.add(fnMatch.goalId)
          newMappings.push({
            image: item.image,
            fileName: item.fileName,
            title: cleanedName,
            matchedGoalId: fnMatch.goalId,
            score: fnMatch.score,
          })
        } else {
          if (!isTruncated) console.log(`[GraphMatch] WEAK match for "${cleanedName}", queuing for AI`)
          else console.log(`[GraphMatch] TRUNCATED filename "${item.fileName}", queuing for AI`)
          // Weak/truncated — queue for AI
          newMappings.push({
            image: item.image,
            fileName: item.fileName,
            title: isTruncated ? '' : cleanedName,
            matchedGoalId: null,
            score: 999,
          })
          needsAI.push(i)
        }
      }

      // PASS 2: ONE batch AI call for ALL unmatched — send all images + remaining goals
      if (needsAI.length > 0) {
        setProcessingStatus(`AI matching ${needsAI.length} graphs...`)

        const remainingGoals = goals.filter(g => !usedGoalIds.has(g.id || g.skillId))
        const numberedGoals = remainingGoals.map((g, i) => `${i + 1}. ${g.objective || g.goalText || g.program || g.skillName || 'Unknown'}`).join('\n')

        // Batch AI: send up to 10 images at once
        if (needsAI.length <= 10) {
          // Send all images in ONE call
          const imageContent = needsAI.map((idx, i) => ([
            { type: 'text', text: `Image ${String.fromCharCode(65 + i)}:` },
            { type: 'image_url', image_url: { url: newMappings[idx].image } },
          ])).flat()

          try {
            const result = await callAI({
              messages: [{
                role: 'user',
                content: [
                  { type: 'text', text: `I have ${needsAI.length} graphs from an ABA therapy report and ${remainingGoals.length} unmatched goals. Match each graph to the correct goal.

GOALS:
${numberedGoals}

For each image (A, B, C...), look at the graph title, axis labels, and any visible text. Then tell me which goal number it matches.

Return ONLY in this format, one per line:
A=1
B=3
C=2
(etc.)

Every image must be assigned to exactly one goal. No duplicates.` },
                  ...imageContent,
                ],
              }],
              model: 'gpt-4o-mini',
              maxTokens: 200,
              temperature: 0.1,
            })

            console.log('[GraphMatch] Batch AI result:', result)

            // Parse "A=1\nB=3\nC=2" format
            const lines = (result || '').trim().split(/\n/)
            for (const line of lines) {
              const match = line.match(/([A-Z])\s*=\s*(\d+)/)
              if (!match) continue
              const imageIdx = match[1].charCodeAt(0) - 65 // A=0, B=1, etc.
              const goalIdx = parseInt(match[2], 10) - 1
              if (imageIdx >= 0 && imageIdx < needsAI.length && goalIdx >= 0 && goalIdx < remainingGoals.length) {
                const m = newMappings[needsAI[imageIdx]]
                const goal = remainingGoals[goalIdx]
                m.matchedGoalId = goal.id || goal.skillId
                m.score = 3
                m.title = goal.program || goal.objective || ''
                usedGoalIds.add(m.matchedGoalId)
                console.log(`[GraphMatch] Batch AI: Image ${match[1]} → "${goal.program || goal.objective}"`)
              }
            }
          } catch (err) {
            console.error('[GraphMatch] Batch AI failed:', err)
          }
        } else {
          // More images than remaining goals or too many — do one-by-one
          for (let ai = 0; ai < needsAI.length; ai++) {
            const idx = needsAI[ai]
            const m = newMappings[idx]
            const currentRemaining = goals.filter(g => !usedGoalIds.has(g.id || g.skillId))
            if (currentRemaining.length === 0) break

            if (currentRemaining.length === 1) {
              m.matchedGoalId = currentRemaining[0].id || currentRemaining[0].skillId
              m.score = 4
              m.title = currentRemaining[0].program || currentRemaining[0].objective || ''
              usedGoalIds.add(m.matchedGoalId)
              continue
            }

            setProcessingStatus(`AI reading graph ${ai + 1} of ${needsAI.length}...`)
            const currentNames = currentRemaining.map(g => g.objective || g.goalText || g.program || g.skillName || 'Unknown')
            const aiResult = await identifyAndMatchGraph(m.image, currentNames, m.fileName)
            if (aiResult.matchIndex >= 0 && aiResult.matchIndex < currentRemaining.length) {
              const goal = currentRemaining[aiResult.matchIndex]
              m.matchedGoalId = goal.id || goal.skillId
              m.score = 3
              if (aiResult.title) m.title = aiResult.title
              usedGoalIds.add(m.matchedGoalId)
            }
          }
        }

        // Final elimination pass
        const stillUnmatched = needsAI.filter(idx => !newMappings[idx].matchedGoalId)
        const stillAvailable = goals.filter(g => !usedGoalIds.has(g.id || g.skillId))
        for (let e = 0; e < Math.min(stillUnmatched.length, stillAvailable.length); e++) {
          const m = newMappings[stillUnmatched[e]]
          const goal = stillAvailable[e]
          m.matchedGoalId = goal.id || goal.skillId
          m.score = 6
          usedGoalIds.add(m.matchedGoalId)
          console.log(`[GraphMatch] Elimination: → "${goal.program || goal.objective}"`)
        }
      }

      // 3. Resolve duplicates: if two items map to the same goal, keep the better score
      const goalCounts = {}
      for (const m of newMappings) {
        if (m.matchedGoalId) {
          goalCounts[m.matchedGoalId] = (goalCounts[m.matchedGoalId] || 0) + 1
        }
      }
      // For duplicates, only keep the best match; set others to null for manual assignment
      for (const goalId of Object.keys(goalCounts)) {
        if (goalCounts[goalId] <= 1) continue
        const indices = newMappings
          .map((m, idx) => m.matchedGoalId === goalId ? idx : -1)
          .filter(idx => idx >= 0)
        const bestIdx = indices.reduce((best, idx) =>
          newMappings[idx].score < newMappings[best].score ? idx : best
        , indices[0])
        for (const idx of indices) {
          if (idx !== bestIdx) {
            newMappings[idx].matchedGoalId = null
            newMappings[idx].score = 999
          }
        }
      }

      // Extract leading percentage number from each filename
      for (const m of newMappings) {
        const numMatch = m.fileName.match(/^(\d+)/)
        if (numMatch) m.percentage = parseInt(numMatch[1], 10)
      }

      // Auto-confirm if all images have a match — skip the preview
      const allMatched = newMappings.every(m => m.matchedGoalId)
      if (allMatched && newMappings.length > 0) {
        const updated = { ...(goalGraphs || {}) }
        const percentages = {}
        for (const m of newMappings) {
          if (m.matchedGoalId && m.image) updated[m.matchedGoalId] = m.image
          if (m.matchedGoalId && m.percentage != null) percentages[m.matchedGoalId] = m.percentage
        }
        onConfirm(updated, percentages)
        setMappings([])
        setProcessing(false)
        setProcessingStatus('')
        return
      }

      setMappings(newMappings)
    } catch (err) {
      console.error('Smart graph upload failed:', err)
    } finally {
      setProcessing(false)
      setProcessingStatus('')
    }
  }, [goals, goalGraphs, onConfirm])

  // ─── User Actions ─────────────────────────────────────────────────────

  const handleFileSelect = useCallback((e) => {
    if (e.target.files) processFiles(Array.from(e.target.files))
    e.target.value = '' // allow re-upload of same file
  }, [processFiles])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer?.files) processFiles(Array.from(e.dataTransfer.files))
  }, [processFiles])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const updateMapping = useCallback((index, goalId) => {
    setMappings(prev => prev.map((m, i) => i === index ? { ...m, matchedGoalId: goalId, score: 0 } : m))
  }, [])

  const swapMappings = useCallback((indexA, indexB) => {
    setMappings(prev => {
      const next = [...prev]
      const tmpGoalId = next[indexA].matchedGoalId
      next[indexA] = { ...next[indexA], matchedGoalId: next[indexB].matchedGoalId }
      next[indexB] = { ...next[indexB], matchedGoalId: tmpGoalId }
      return next
    })
  }, [])

  const removeMapping = useCallback((index) => {
    setMappings(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleConfirmAll = useCallback(() => {
    const updated = { ...(goalGraphs || {}) }
    const percentages = {}
    for (const m of mappings) {
      if (m.matchedGoalId && m.image) {
        updated[m.matchedGoalId] = m.image
      }
      if (m.matchedGoalId && m.percentage != null) {
        percentages[m.matchedGoalId] = m.percentage
      }
    }
    onConfirm(updated, percentages)
    setMappings([])
  }, [mappings, goalGraphs, onConfirm])

  const handleClear = useCallback(() => {
    setMappings([])
  }, [])

  // ─── Render helpers ───────────────────────────────────────────────────

  const getGoalLabel = (goalId) => {
    const opt = goalOptions.find(o => o.id === goalId)
    return opt ? opt.label : 'Unassigned'
  }

  const matchQuality = (score) => {
    if (score <= 2) return { label: 'Exact', color: 'text-green-600 bg-green-50' }
    if (score <= 10) return { label: 'Strong', color: 'text-sage-600 bg-sage-50' }
    if (score <= 30) return { label: 'Likely', color: 'text-amber-600 bg-amber-50' }
    return { label: 'Weak', color: 'text-red-500 bg-red-50' }
  }

  const assignedCount = mappings.filter(m => m.matchedGoalId).length

  // ─── Render ───────────────────────────────────────────────────────────

  // If no mappings yet, show upload zone
  if (mappings.length === 0) {
    return (
      <div className="space-y-2">
        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragging(false)}
          onClick={() => !processing && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl px-4 py-4 min-h-[44px] text-center transition-colors ${
            processing ? 'border-warm-200 bg-warm-50 cursor-wait' :
            dragging ? 'border-sage-400 bg-sage-50' : 'border-warm-300 hover:border-sage-400 hover:bg-warm-50 cursor-pointer'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {processing ? (
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-5 h-5 border-2 border-sage-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-[11px] text-warm-500 font-medium">{processingStatus}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 mb-1">
                <svg className="w-5 h-5 text-warm-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <svg className="w-4 h-4 text-warm-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <svg className="w-5 h-5 text-warm-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
              </div>
              <p className="text-[11px] font-medium text-warm-600">Smart Graph Upload</p>
              <p className="text-[10px] text-warm-500 mt-0.5">
                Drop images or a PDF — auto-matches to your goals
              </p>
              <p className="text-[9px] text-warm-500 mt-0.5">
                Filenames like "physical_aggression.png" match automatically. PDFs extract each page.
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  // ─── Mapping Preview Panel ────────────────────────────────────────────

  const weakCount = mappings.filter(m => !m.matchedGoalId || m.score > 10).length

  return (
    <div className="rounded-xl border-2 border-sage-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-sage-50 border-b border-sage-200">
        <div className={`flex ${isPhone ? 'flex-col gap-2' : 'items-center justify-between'}`}>
          <div>
            <p className="text-[13px] font-bold text-warm-800">Review Graph Matches</p>
            <p className="text-[11px] text-warm-500">
              {assignedCount} of {mappings.length} matched
              {weakCount > 0 && <span className="text-amber-600 font-medium"> — {weakCount} need review</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleClear} className="px-3 min-h-[44px] text-[11px] text-warm-500 hover:text-red-500 rounded-lg transition-colors">Clear</button>
            <button
              onClick={handleConfirmAll}
              disabled={assignedCount === 0}
              className="px-5 min-h-[44px] text-[12px] font-semibold text-white bg-sage-600 hover:bg-sage-700 disabled:opacity-40 rounded-full transition-colors"
            >
              Confirm All
            </button>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf,application/pdf" multiple className="hidden" onChange={handleFileSelect} />
          </div>
        </div>
      </div>

      {/* Mapping cards */}
      <div className="divide-y divide-warm-100 max-h-[70vh] overflow-y-auto">
        {mappings.map((m, idx) => {
          const quality = matchQuality(m.score)
          const goalLabel = m.matchedGoalId ? getGoalLabel(m.matchedGoalId) : null
          const isWeak = !m.matchedGoalId || m.score > 10

          return (
            <div key={idx} className={`p-3 ${isWeak ? 'bg-amber-50/40' : ''}`}>
              {/* Status bar */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold text-warm-500 w-5">#{idx + 1}</span>
                {m.matchedGoalId ? (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${quality.color}`}>{quality.label}</span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-red-600 bg-red-50">Needs Assignment</span>
                )}
                {m.title && <span className="text-[10px] text-warm-500 truncate">AI read: <strong className="text-warm-600">"{m.title}"</strong></span>}
                <button onClick={() => removeMapping(idx)} className="ml-auto min-w-[32px] min-h-[32px] flex items-center justify-center text-warm-300 hover:text-red-500 rounded transition-colors">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" /></svg>
                </button>
              </div>

              {/* Graph + matched goal side by side */}
              <div className={`flex ${isPhone ? 'flex-col' : 'items-start'} gap-3`}>
                <div className={`${isPhone ? 'w-full' : 'w-48'} shrink-0`}>
                  <img src={m.image} alt={m.fileName} className={`rounded-lg border border-warm-200 object-contain bg-white ${isPhone ? 'w-full max-h-40' : 'w-48 h-28'}`} />
                </div>

                {!isPhone && (
                  <div className="self-center text-warm-300 shrink-0 pt-2">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M14 7l5 5-5 5" /></svg>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {goalLabel && !isWeak && (
                    <div className="px-3 py-2.5 rounded-lg bg-sage-50 border border-sage-200 mb-2">
                      <p className="text-[12px] font-semibold text-sage-800">{goalLabel}</p>
                    </div>
                  )}
                  <select
                    value={m.matchedGoalId || ''}
                    onChange={(e) => updateMapping(idx, e.target.value || null)}
                    className={`w-full min-h-[44px] px-3 text-[12px] rounded-lg border transition-colors ${
                      isWeak ? 'border-amber-300 text-warm-700 bg-amber-50 font-medium' : 'border-warm-200 text-warm-600 bg-warm-50'
                    }`}
                  >
                    <option value="">— Select a goal —</option>
                    {goalOptions.map(opt => (<option key={opt.id} value={opt.id}>{opt.label}</option>))}
                  </select>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom bar */}
      <div className="px-4 py-3 bg-warm-50 border-t border-warm-200 flex items-center justify-between">
        <button onClick={() => fileInputRef.current?.click()} className="text-[11px] text-sage-600 hover:text-sage-700 font-medium min-h-[44px]">+ Add More</button>
        <button
          onClick={handleConfirmAll}
          disabled={assignedCount === 0}
          className="px-6 min-h-[44px] text-[12px] font-semibold text-white bg-sage-600 hover:bg-sage-700 disabled:opacity-40 rounded-full transition-colors"
        >
          Confirm All ({assignedCount} graphs)
        </button>
      </div>
    </div>
  )
}
