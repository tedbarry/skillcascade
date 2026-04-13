/**
 * Shared Goal Parser — used by GoalImporter AND AuthReportForm.
 *
 * Single source of truth for:
 * - AI prompt (clinical purpose reasoning, hierarchy awareness)
 * - Model selection (Claude Sonnet via Bedrock)
 * - Text chunking for long documents
 * - JSON extraction and cleanup
 */

import { callAI } from './aiClient.js'
import { GOAL_HIERARCHY_TEXT } from './goalLibraryArtifacts.js'

const HIERARCHY = GOAL_HIERARCHY_TEXT

const SYSTEM_PROMPT = `You are a Board Certified Behavior Analyst (BCBA) parsing and classifying ABA therapy goals. You deeply understand the clinical PURPOSE behind each goal — not just the words, but what skill the child is learning and why.

CRITICAL FORMATTING RULES:
- Return ONLY a valid JSON array, no other text, no markdown, no code blocks
- Start your response with [ and end with ]
- If you find zero goals, return: [{"id":"goal-1","domain":"communication","program":"No goals found","objective":"Could not parse goals from the provided text","baseline":"","currentLevel":"New","criteria":"","targetDate":"","type":"increase"}]

CRITICAL — DO NOT MISS ANY GOALS:
- Read the ENTIRE document from start to finish
- Goals exist across ALL domains — Behavior, Communication, Social, AND Parent Training
- Do NOT stop after finding behavior goals — keep reading for communication, social, and parent goals
- A typical client has 20-50+ goals across all domains
- If you find fewer than 10 goals, re-read the document — you likely missed some

GOAL FORMATS — goals do NOT always start with "The client will...":
- Full sentence: "The client will decrease instances of aggression"
- Short label: "Duration of sustained attention to non preferred tasks"
- Caregiver: "Caregiver will implement the BIP..."
- Bare skill name: "Eye Contact During Conversations"
- ALL of these are goals that should be extracted.

SOURCE DOCUMENT CONTEXT:
- The document may come from CentralReach, Passage, or similar ABA systems
- Goals are often nested under LTG and STG headers — READ and USE this structure
- The source system's LTG/STG names hint at the clinical purpose

FOR EACH GOAL, think through:
1. What is the CLINICAL PURPOSE? What skill or behavior is being targeted?
2. Is this REDUCING a problem behavior, or BUILDING a new skill?
3. What FUNCTIONAL AREA does this serve?

Return an object with:
- id: "goal-1", "goal-2", etc.
- program: short program name
- objective: full objective text
- domain: "maladaptive", "replacement", "communication", "socialization", "socialGroup", or "parent"
- ltgName: best matching LTG from the hierarchy below (for routing)
- baseline: baseline data if found
- currentLevel: current level if found
- criteria: mastery criteria if found
- targetDate: target date if found
- type: "decrease" (behavior reduction) or "increase" (skill building)
- programType: "behavior_reduction", "skill_acquisition", or "parent_training"
- dataMethod: "frequency", "trial", "duration", "rating", or "percentage"
- mastered: true/false

TARGET HIERARCHY — classify each goal:
${HIERARCHY}

CLASSIFICATION BY CLINICAL PURPOSE:

BEHAVIOR: "Maladaptive Behavior" = ONLY goals that DECREASE harmful behaviors. "Compliance" = goals that BUILD following instructions. "Self-Regulation" = flexibility, resilience, impulse control. "Replacement Behaviors" = FERB, alternatives.

COMMUNICATION: "Functional Communication" = requesting, manding, self-advocacy. "Conversational Skills" = turn-taking, questions, maintaining topic. "Social-Pragmatic Communication" = tone, manners, feedback. "Receptive Language" = following directions, retelling, inferencing.

SOCIAL: "Peer Interaction" = initiating, joining, interacting. "Social Awareness" = social cues, personal space, boundaries. "Emotional Regulation" = coping, waiting, impulse control. "Task Engagement" = staying on task, transitions, completing work.

PARENT TRAINING: If the goal says "Caregiver will..." or "Parent will..." — it ALWAYS goes in parent domain. These are never Behavior/Communication/Social.

KEY: "decrease aggression" = maladaptive. "increase compliance" = Compliance (skill building), NOT maladaptive.`

/**
 * Parse goals from text using AI.
 * Handles chunking for long documents.
 *
 * @param {string} text - The raw text to parse
 * @param {object} options
 * @param {string} options.sourceName - Name of the source file (for logging)
 * @param {Function} options.onProgress - Optional progress callback
 * @returns {Promise<Array>} Parsed goals array
 */
export async function parseGoalsFromText(text, { sourceName = 'document', onProgress } = {}) {
  const MAX_CHUNK = 30000
  const chunks = []

  if (text.length <= MAX_CHUNK) {
    chunks.push(text)
  } else {
    let remaining = text
    while (remaining.length > 0) {
      if (remaining.length <= MAX_CHUNK) {
        chunks.push(remaining)
        break
      }
      let splitAt = remaining.lastIndexOf('\n\n', MAX_CHUNK)
      if (splitAt < MAX_CHUNK * 0.5) splitAt = remaining.lastIndexOf('\n', MAX_CHUNK)
      if (splitAt < MAX_CHUNK * 0.5) splitAt = MAX_CHUNK
      chunks.push(remaining.slice(0, splitAt))
      remaining = remaining.slice(splitAt)
    }
  }

  let allParsed = []

  for (let ci = 0; ci < chunks.length; ci++) {
    const chunkLabel = chunks.length > 1 ? ` (part ${ci + 1} of ${chunks.length})` : ''
    onProgress?.(`Parsing${chunkLabel}...`)

    const response = await callAI({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Parse ALL goals from this ${sourceName}${chunkLabel}. Read the ENTIRE document carefully — extract EVERY goal across all domains. Return a JSON array:\n\n${chunks[ci]}` },
      ],
      model: 'gpt-4o', // Maps to Claude Sonnet on Bedrock
      maxTokens: 12000,
      temperature: 0.1,
    })

    let cleaned = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    let parsed = null
    try {
      if (cleaned.startsWith('[')) parsed = JSON.parse(cleaned)
    } catch {}

    if (!parsed) {
      const match = cleaned.match(/\[[\s\S]*\]/)
      if (match) {
        try { parsed = JSON.parse(match[0]) } catch {}
      }
    }

    if (parsed && Array.isArray(parsed)) {
      allParsed = allParsed.concat(parsed)
    }
  }

  // Add IDs if missing
  allParsed.forEach((g, i) => {
    if (!g.id) g.id = `goal-${i + 1}`
  })

  return allParsed
}

/**
 * Normalize a goal name for duplicate detection.
 */
export function normalizeGoalName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/^the\s+client\s+will\s+/i, '')
    .replace(/^caregiver\s+will\s+/i, '')
    .replace(/^parent\s+will\s+/i, '')
    .replace(/^parents\s+will\s+/i, '')
    .replace(/^decrease\s+instances\s+of\s+/i, '')
    .replace(/^reduce\s+instances\s+of\s+/i, '')
    .replace(/^decrease\s+the\s+/i, '')
    .replace(/^reduce\s+the\s+/i, '')
    .replace(/^increase\s+/i, '')
    .replace(/^decrease\s+/i, '')
    .replace(/^reduce\s+/i, '')
    .replace(/^maintain\s+/i, '')
    .replace(/^demonstrate\s+/i, '')
    .replace(/^display\s+/i, '')
    .replace(/^engage\s+in\s+/i, '')
    .trim()
}
