/**
 * Smart Goal Router — classifies goals into the correct LTG→STG hierarchy.
 *
 * Used by: Learning Tree sync, AddGoalDialog, GoalEngine, AI Assistant
 *
 * Matching strategy (in order of confidence):
 * 1. Exact STG name match (confidence: 1.0)
 * 2. Exact target name match → parent STG (confidence: 0.95)
 * 3. Fuzzy contains match (confidence: 0.8)
 * 4. Keyword overlap with 2+ words (confidence: 0.6-0.8)
 * 5. Single keyword match (confidence: 0.4-0.5)
 * 6. Domain-only match → suggest new STG (confidence: 0.2)
 */

import goalRouterIndex from '../data/goalRouterIndex.json'

// ─── Build lookup indices ─────────────────────────────────────
const _stgIndex = []   // { domain, ltg, stg, name (lowercase) }
const _targetIndex = [] // { domain, ltg, stg, name (lowercase) }
const ROUTER_DOMAINS = goalRouterIndex.domains || []

for (const d of ROUTER_DOMAINS) {
  for (const ltg of (d.ltgs || [])) {
    for (const stg of (ltg.stgs || [])) {
      _stgIndex.push({
        domain: d.name,
        ltgName: ltg.name,
        stgName: stg.name,
        key: stg.name.toLowerCase().trim(),
        goalType: stg.goal_type || 'increase',
        measurementType: stg.measurement_type || 'percentage',
        criteria: stg.default_criteria || '',
      })
      for (const t of (stg.targets || [])) {
        const n = (t.name || '').toLowerCase().trim()
        if (n) {
          _targetIndex.push({
            domain: d.name,
            ltgName: ltg.name,
            stgName: stg.name,
            key: n,
          })
        }
      }
    }
  }
}

// ABA stopwords — generic clinical terms that create false matches
const STOPWORDS = new Set(['the', 'will', 'client', 'decrease', 'increase', 'instances', 'with', 'across', 'during', 'when', 'that', 'from', 'session', 'sessions', 'prompt', 'prompts', 'prompted', 'appropriate', 'appropriately', 'independently', 'given', 'without', 'within', 'using', 'demonstrate', 'display', 'engage', 'maintain', 'respond', 'following', 'verbal', 'behavior', 'behaviors'])

// Domain hint keywords for fallback classification
const DOMAIN_KEYWORDS = {
  'Parent Training': ['caregiver will', 'parent will', 'caregiver', 'parent training', 'parent collaboration', 'home practice', 'bip implementation', 'token economy', 'prompting hierarchy'],
  Behavior: ['aggression', 'compliance', 'noncompliance', 'non-compliance', 'tantrum', 'elopement', 'destructi', 'unsafe', 'maladaptive', 'decrease', 'reduce', 'disruptive', 'refusal', 'prompt depend', 'silly', 'inappropriate', 'off-task', 'off task'],
  Communication: ['communicat', 'conversation', 'mand', 'tact', 'request', 'ask', 'answer', 'question', 'tone', 'volume', 'manner', 'polite', 'respond', 'feedback', 'advocate', 'help', 'direction', 'retell', 'inference', 'language', 'comprehension', 'express', 'break card', 'say please', 'verbal cue'],
  Social: ['peer', 'social', 'interact', 'join', 'initiat', 'group', 'turn-tak', 'turn tak', 'personal space', 'coping', 'emotion', 'perspective', 'transition', 'flexib', 'tolera', 'leisure', 'hygiene', 'organiz', 'waiting', 'impulse', 'self-monitor', 'self monitor', 'boundary', 'boundaries', 'authority', 'problem solving'],
}

/**
 * Route a goal to the best matching LTG→STG placement.
 *
 * @param {string} goalName - The goal/program name
 * @param {string} [objective] - Optional objective text for better matching
 * @param {string} [domainHint] - Optional domain hint (e.g. 'maladaptive', 'communication')
 * @returns {{ domain: string, ltgName: string, stgName: string, confidence: number, isNewStg: boolean, isNewLtg: boolean, goalType?: string, measurementType?: string, criteria?: string }}
 */
export function routeGoal(goalName, objective, domainHint) {
  if (!goalName) return { domain: 'Communication', ltgName: 'General', stgName: goalName || 'Unnamed', confidence: 0, isNewStg: true, isNewLtg: true }

  const g = goalName.toLowerCase().trim()
  const fullText = objective ? `${g} ${objective.toLowerCase().trim()}` : g

  // ── 1. Exact STG name match ──
  const exactStg = _stgIndex.find(s => s.key === g)
  if (exactStg) {
    return {
      domain: exactStg.domain,
      ltgName: exactStg.ltgName,
      stgName: exactStg.stgName,
      confidence: 1.0,
      isNewStg: false,
      isNewLtg: false,
      goalType: exactStg.goalType,
      measurementType: exactStg.measurementType,
      criteria: exactStg.criteria,
    }
  }

  // ── 2. Exact target name match ──
  const exactTarget = _targetIndex.find(t => t.key === g)
  if (exactTarget) {
    return {
      domain: exactTarget.domain,
      ltgName: exactTarget.ltgName,
      stgName: exactTarget.stgName,
      confidence: 0.95,
      isNewStg: false,
      isNewLtg: false,
    }
  }

  // ── 3. Contains match (STG or target name is substring) ──
  for (const s of _stgIndex) {
    if (g.includes(s.key) || s.key.includes(g)) {
      return {
        domain: s.domain,
        ltgName: s.ltgName,
        stgName: s.stgName,
        confidence: 0.8,
        isNewStg: false,
        isNewLtg: false,
        goalType: s.goalType,
        measurementType: s.measurementType,
        criteria: s.criteria,
      }
    }
  }
  for (const t of _targetIndex) {
    if (g.includes(t.key) || t.key.includes(g)) {
      return {
        domain: t.domain,
        ltgName: t.ltgName,
        stgName: t.stgName,
        confidence: 0.75,
        isNewStg: false,
        isNewLtg: false,
      }
    }
  }

  // ── 4. Keyword overlap (2+ words) ──
  const gWords = new Set(fullText.split(/\s+/).filter(w => w.length > 3 && !STOPWORDS.has(w)))
  let bestMatch = null
  let bestScore = 0

  for (const s of _stgIndex) {
    const sWords = new Set(s.key.split(/\s+/).filter(w => w.length > 3))
    let overlap = 0
    for (const w of gWords) { if (sWords.has(w)) overlap++ }
    const score = sWords.size > 0 ? overlap / Math.max(sWords.size, 1) : 0
    if (overlap >= 2 && score > bestScore) {
      bestScore = score
      bestMatch = s
    }
  }
  if (bestMatch && bestScore > 0) {
    return {
      domain: bestMatch.domain,
      ltgName: bestMatch.ltgName,
      stgName: bestMatch.stgName,
      confidence: Math.min(0.4 + bestScore * 0.4, 0.8),
      isNewStg: false,
      isNewLtg: false,
      goalType: bestMatch.goalType,
      measurementType: bestMatch.measurementType,
      criteria: bestMatch.criteria,
    }
  }

  // ── 5. Single keyword match ──
  for (const s of _stgIndex) {
    const sWords = s.key.split(/\s+/).filter(w => w.length > 3 && !STOPWORDS.has(w))
    for (const w of gWords) {
      if (sWords.includes(w)) {
        return {
          domain: s.domain,
          ltgName: s.ltgName,
          stgName: s.stgName,
          confidence: 0.4,
          isNewStg: false,
          isNewLtg: false,
        }
      }
    }
  }

  // Also check targets for keyword
  for (const t of _targetIndex) {
    const tWords = t.key.split(/\s+/).filter(w => w.length > 3 && !STOPWORDS.has(w))
    for (const w of gWords) {
      if (tWords.includes(w)) {
        return {
          domain: t.domain,
          ltgName: t.ltgName,
          stgName: t.stgName,
          confidence: 0.35,
          isNewStg: false,
          isNewLtg: false,
        }
      }
    }
  }

  // ── 6. Domain hint or keyword-based domain detection ──
  let detectedDomain = null

  // Use explicit domain hint if provided
  const domainMap = {
    maladaptive: 'Behavior', replacement: 'Behavior', behavior: 'Behavior',
    communication: 'Communication', comm: 'Communication',
    social: 'Social', socialization: 'Social', socialGroup: 'Social',
    parent: 'Parent Training',
  }
  if (domainHint && domainMap[domainHint.toLowerCase()]) {
    detectedDomain = domainMap[domainHint.toLowerCase()]
  }

  // Keyword-based domain detection from goal text
  if (!detectedDomain) {
    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      for (const kw of keywords) {
        if (fullText.includes(kw)) {
          detectedDomain = domain
          break
        }
      }
      if (detectedDomain) break
    }
  }

  if (!detectedDomain) detectedDomain = 'Communication' // safe default

  // Find the best LTG in that domain to nest under
  const domainLtgs = _stgIndex.filter(s => s.domain === detectedDomain)
  const ltgNames = [...new Set(domainLtgs.map(s => s.ltgName))]

  // Pick the most general LTG or the first one
  const generalLtg = ltgNames.find(n =>
    n.includes('General') || n.includes('Functional') || n.includes('Adaptive') || n.includes('Other')
  ) || ltgNames[0] || 'General'

  return {
    domain: detectedDomain,
    ltgName: generalLtg,
    stgName: goalName, // Use the goal name as the new STG name
    confidence: 0.2,
    isNewStg: true,
    isNewLtg: !ltgNames.includes(generalLtg),
  }
}

/**
 * Check if a goal is misplaced — returns a better placement if found.
 *
 * @param {string} goalName - The goal name
 * @param {string} currentLtg - Where it's currently placed
 * @returns {{ suggestedLtg: string, suggestedStg: string, confidence: number } | null}
 */
export function checkMisplacement(goalName, currentLtg) {
  const result = routeGoal(goalName)
  if (result.confidence >= 0.6 && result.ltgName !== currentLtg) {
    return {
      suggestedLtg: result.ltgName,
      suggestedStg: result.stgName,
      confidence: result.confidence,
    }
  }
  return null
}

/**
 * Get all LTG names for a domain (for dropdown options).
 */
export function getLtgsForDomain(domain) {
  const ltgs = new Set()
  for (const s of _stgIndex) {
    if (s.domain === domain) ltgs.add(s.ltgName)
  }
  return [...ltgs].sort()
}

/**
 * Get all STG names for an LTG (for dropdown options).
 */
export function getStgsForLtg(ltgName) {
  return _stgIndex
    .filter(s => s.ltgName === ltgName)
    .map(s => s.stgName)
    .sort()
}

/**
 * Get all domains.
 */
export function getDomains() {
  return ROUTER_DOMAINS.map(d => d.name)
}
