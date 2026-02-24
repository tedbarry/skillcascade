import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { framework, ASSESSMENT_LEVELS, ASSESSMENT_LABELS } from '../data/framework.js'

/* ─────────────────────────────────────────────
   SVG Icons (inline, no emojis)
   ───────────────────────────────────────────── */

const ICONS = {
  reports: (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="2" width="14" height="16" rx="2" />
      <path d="M7 6h6M7 10h6M7 14h3" />
    </svg>
  ),
  bip: (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2h7l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" />
      <path d="M12 2v4h4" />
      <path d="M8 10h4M8 13h4" />
    </svg>
  ),
  ltg: (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7" />
      <circle cx="10" cy="10" r="4" />
      <circle cx="10" cy="10" r="1" fill="currentColor" />
    </svg>
  ),
  goals: (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17V5M3 5l4 3 4-4 6 4" />
      <path d="M17 8v3M14 9v5M11 7v7M7 11v3" />
    </svg>
  ),
  analyzer: (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M13 13l4 4" />
      <path d="M7 8.5h3M8.5 7v3" />
    </svg>
  ),
  classifier: (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="7" height="7" rx="1" />
      <rect x="11" y="2" width="7" height="7" rx="1" />
      <rect x="2" y="11" width="7" height="7" rx="1" />
      <rect x="11" y="11" width="7" height="7" rx="1" />
    </svg>
  ),
  subcategory: (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h14v2H3zM3 8h10v2H3zM3 13h14v2H3z" />
      <path d="M15 8l2 1-2 1" />
    </svg>
  ),
  opdef: (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2h10a2 2 0 012 2v14l-3-2-3 2-3-2-3 2V4a2 2 0 012-2z" />
      <path d="M7 7h6M7 10h4" />
    </svg>
  ),
}

/* ─────────────────────────────────────────────
   AI Tool definitions
   ───────────────────────────────────────────── */

const AI_TOOLS = [
  {
    id: 'reports',
    name: 'Report Writer',
    description: 'Write deficit summaries, observations, and titration plans',
    actions: ['Summarize deficits', 'Hypothetical observation', 'Real observation', 'Titration plan'],
  },
  {
    id: 'bip',
    name: 'BIP Creator',
    description: 'Create operational definitions with intervention strategies',
    actions: ['Write operational definition'],
  },
  {
    id: 'ltg',
    name: 'Long-Term Goals',
    description: 'Generate concise long-term goals with functions and teaching points',
    actions: ['Create long-term goal'],
  },
  {
    id: 'goals',
    name: 'Goal Writer',
    description: 'Write measurable ABA goals with variations and measurements',
    actions: ['Write ABA goal'],
  },
  {
    id: 'analyzer',
    name: 'Goal Analyzer',
    description: 'Check if goals are behavioral or mentalistic, rewrite if needed',
    actions: ['Classify a goal', 'Rewrite a goal'],
  },
  {
    id: 'classifier',
    name: 'Domain Classifier',
    description: 'Classify goals into Behavior/Communication/Social with goal levels',
    actions: ['Classify a skill/goal', 'Batch classify', 'Suggest parent LTG'],
  },
  {
    id: 'subcategory',
    name: 'Subcategory Creator',
    description: 'Break any concept into 8-15 structured subcategories',
    actions: ['ABA/IEP mode', 'General mode'],
  },
  {
    id: 'opdef',
    name: 'Op. Definition',
    description: 'Generate precise operational definitions for any behavior',
    actions: ['Write operational definition'],
  },
]

/* ─────────────────────────────────────────────
   Assessment data helpers
   ───────────────────────────────────────────── */

/**
 * Compute a summary of the client's assessment state for use in
 * prompts and preview responses.
 */
function summarizeAssessments(assessments) {
  let totalSkills = 0
  let assessed = 0
  let needsWork = 0
  let developing = 0
  let solid = 0

  const domainSummaries = []

  for (const domain of framework) {
    let dTotal = 0
    let dAssessed = 0
    let dNeedsWork = 0
    let dDeveloping = 0
    let dSolid = 0
    let dScoreSum = 0

    const weakSubAreas = []

    for (const sa of domain.subAreas) {
      let saTotal = 0
      let saAssessed = 0
      let saScoreSum = 0

      for (const sg of sa.skillGroups) {
        for (const skill of sg.skills) {
          totalSkills++
          dTotal++
          saTotal++
          const level = assessments[skill.id]
          if (level !== undefined && level !== ASSESSMENT_LEVELS.NOT_ASSESSED) {
            assessed++
            dAssessed++
            saAssessed++
            saScoreSum += level
            dScoreSum += level
            if (level === ASSESSMENT_LEVELS.NEEDS_WORK) { needsWork++; dNeedsWork++ }
            if (level === ASSESSMENT_LEVELS.DEVELOPING) { developing++; dDeveloping++ }
            if (level === ASSESSMENT_LEVELS.SOLID) { solid++; dSolid++ }
          }
        }
      }

      const saAvg = saAssessed > 0 ? saScoreSum / saAssessed : 0
      if (saAssessed > 0 && saAvg < 2.0) {
        weakSubAreas.push({ name: sa.name, avg: saAvg, assessed: saAssessed, total: saTotal })
      }
    }

    const dAvg = dAssessed > 0 ? dScoreSum / dAssessed : 0

    domainSummaries.push({
      id: domain.id,
      name: domain.name,
      avg: Math.round(dAvg * 100) / 100,
      assessed: dAssessed,
      total: dTotal,
      needsWork: dNeedsWork,
      developing: dDeveloping,
      solid: dSolid,
      weakSubAreas,
    })
  }

  // Sort weakest domains first
  const weakestDomains = [...domainSummaries]
    .filter((d) => d.assessed > 0)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 3)

  return {
    totalSkills,
    assessed,
    needsWork,
    developing,
    solid,
    notAssessed: totalSkills - assessed,
    percentAssessed: totalSkills > 0 ? Math.round((assessed / totalSkills) * 100) : 0,
    domainSummaries,
    weakestDomains,
  }
}

/* ─────────────────────────────────────────────
   System prompt builder (exported for future API use)
   ───────────────────────────────────────────── */

/**
 * Build the system prompt that would be sent to the AI API.
 * Includes the tool-specific instructions plus a JSON summary
 * of the client's current assessment state.
 *
 * @param {string} toolId - One of the AI_TOOLS ids
 * @param {string} clientName - The current client name
 * @param {object} assessments - The assessment state object { skillId: level }
 * @returns {string} The complete system prompt
 */
export function buildSystemPrompt(toolId, clientName, assessments) {
  const summary = summarizeAssessments(assessments)

  const toolInstructions = {
    reports: `You are a BCBA Report Writer for SkillCascade assessments. You specialize in writing clinical-quality deficit summaries, observation reports, and titration/service plans.

When writing deficit summaries:
- Analyze the assessment data across all 9 developmental domains
- Identify patterns of weakness and strength
- Write concise, professional summaries (100-200 words)
- Focus on functional impact and clinical significance
- Use person-first language and avoid deficit-only framing

When writing observations:
- Hypothetical observations: Create a plausible observation narrative based on the assessment profile
- Real observations: Help structure and refine actual observation notes
- Include antecedent-behavior-consequence sequences where relevant

When writing titration plans:
- Recommend service hours based on deficit severity and breadth
- Justify intensity with specific domain data
- Include graduated step-down criteria`,

    bip: `You are a Behavior Intervention Plan (BIP) Creator for SkillCascade. You help BCBAs write comprehensive BIPs.

When writing operational definitions:
- Define the target behavior in observable, measurable terms
- Include examples and non-examples
- Specify the topography, frequency, duration, and intensity
- Include contextual variables from the assessment data

When creating intervention strategies:
- Base strategies on the client's assessed strengths and weaknesses
- Include antecedent modifications, replacement behaviors, and consequence strategies
- Reference specific skill domains from the assessment
- Include data collection procedures`,

    ltg: `You are a Long-Term Goal (LTG) Generator for SkillCascade. You create concise, functional long-term goals.

When creating long-term goals:
- Write goals that are broad enough to encompass multiple short-term objectives
- Include the function the skill serves (e.g., "in order to independently navigate daily routines")
- Identify 3-5 key teaching points that would fall under each LTG
- Reference the client's current assessment level in the relevant domain
- Goals should be achievable within 6-12 months
- Use action verbs and measurable outcomes`,

    goals: `You are an ABA Goal Writer for SkillCascade. You write precise, measurable behavioral goals.

When writing ABA goals:
- Follow the format: [Learner] will [behavior] [condition] [criteria] [timeframe]
- Include at least 2 variations (different conditions or criteria levels)
- Specify the measurement system (frequency, duration, percentage, etc.)
- Include mastery criteria and generalization targets
- Reference specific skills from the assessment framework
- Ensure goals are socially significant and functional`,

    analyzer: `You are a Goal Analyzer for SkillCascade. You evaluate whether goals are truly behavioral or contain mentalistic language.

When classifying goals:
- Identify mentalistic terms (e.g., "understand," "know," "feel," "appreciate")
- Explain why the goal is behavioral or mentalistic
- Rate confidence level in classification

When rewriting goals:
- Replace mentalistic terms with observable, measurable behaviors
- Maintain the original intent of the goal
- Provide the rewritten goal in proper ABA goal format
- Explain the changes made and why`,

    classifier: `You are a Domain Classifier for SkillCascade. You categorize skills and goals into the appropriate developmental domains.

When classifying:
- Categorize into Behavior, Communication, or Social domains
- Assign a goal level (foundational, emerging, established)
- Explain the rationale for classification
- Identify if the skill spans multiple domains

When batch classifying:
- Process multiple skills efficiently
- Flag any ambiguous classifications
- Provide summary statistics

When suggesting parent LTGs:
- Based on a set of short-term goals, identify the overarching long-term goal
- Ensure the LTG captures the functional intent`,

    subcategory: `You are a Subcategory Creator for SkillCascade. You break broad concepts into structured, hierarchical subcategories.

In ABA/IEP mode:
- Break skills into 8-15 developmentally sequenced subcategories
- Follow a least-to-most complexity progression
- Each subcategory should be teachable and measurable
- Include prerequisite skills and generalization targets
- Align with the SkillCascade framework structure

In General mode:
- Break any concept into 8-15 meaningful subcategories
- Use logical grouping and hierarchical structure
- Provide clear, concise labels for each subcategory`,

    opdef: `You are an Operational Definition Writer for SkillCascade. You generate precise, clinical-quality operational definitions.

When writing operational definitions:
- Define behavior in observable, measurable terms
- Include 3+ examples of the behavior
- Include 3+ non-examples (similar but distinct behaviors)
- Specify onset and offset criteria
- Note any relevant contextual factors from the assessment data
- Ensure reliability (two observers could agree on occurrence)
- Use clinical ABA terminology appropriately`,
  }

  const domainDataJson = JSON.stringify(
    summary.domainSummaries.map((d) => ({
      domain: d.name,
      average: d.avg,
      assessed: `${d.assessed}/${d.total}`,
      needsWork: d.needsWork,
      developing: d.developing,
      solid: d.solid,
      weakAreas: d.weakSubAreas.map((w) => w.name),
    })),
    null,
    2
  )

  return `${toolInstructions[toolId] || 'You are an AI assistant for SkillCascade, an ABA therapy skill assessment tool.'}

=== CLIENT CONTEXT ===
Client: ${clientName}
Assessment progress: ${summary.percentAssessed}% assessed (${summary.assessed}/${summary.totalSkills} skills)
Overall distribution: ${summary.needsWork} Needs Work | ${summary.developing} Developing | ${summary.solid} Solid | ${summary.notAssessed} Not Assessed
Weakest domains: ${summary.weakestDomains.map((d) => `${d.name} (avg ${d.avg})`).join(', ') || 'Insufficient data'}

=== DOMAIN ASSESSMENT DATA ===
${domainDataJson}

=== FRAMEWORK CONTEXT ===
SkillCascade uses a 9-domain developmental-functional framework:
1. Regulation (Body, Emotion, Arousal)
2. Self-Awareness & Insight
3. Executive Function
4. Problem Solving & Judgment
5. Communication
6. Social Understanding & Perspective
7. Identity & Self-Concept
8. Safety & Survival Skills (Override)
9. Support System Skills (Caregiver/Environment)

Domains 1-7 follow a developmental cascade: lower domains are prerequisites for higher ones. Domain 8 (Safety) and Domain 9 (Support System) operate independently.

Assessment levels: Not Assessed (0), Needs Work (1), Developing (2), Solid (3).

Please use this data to inform your responses. Reference specific domain scores, weak areas, and skill counts when relevant.`
}

/* ─────────────────────────────────────────────
   Preview response generator
   ───────────────────────────────────────────── */

/**
 * Generate a preview response that demonstrates what the AI tool
 * would do, using actual assessment data. This is shown when no
 * API key is configured.
 */
function generatePreviewResponse(toolId, action, clientName, assessments) {
  const summary = summarizeAssessments(assessments)
  const weakDomainNames = summary.weakestDomains.map((d) => d.name).join(', ')
  const hasData = summary.assessed > 0

  const noDataFallback = `I don't have enough assessment data yet for ${clientName}. Start by assessing skills in the Assessment panel -- even a partial assessment across a few domains will let me generate useful output here.`

  if (!hasData && action !== 'General mode') {
    return noDataFallback
  }

  const responses = {
    reports: {
      'Summarize deficits': `I'll analyze ${clientName}'s assessment data across ${summary.domainSummaries.filter((d) => d.assessed > 0).length} domains. Currently ${summary.needsWork} skills rated Needs Work, ${summary.developing} rated Developing. I would generate a ~100 word deficit summary focusing on the weakest domains: ${weakDomainNames || 'insufficient data'}.

[PREVIEW] Here's an outline of what the deficit summary would cover:
- Primary deficit areas: ${weakDomainNames || 'TBD'}
- ${summary.needsWork} skills requiring immediate intervention
- ${summary.developing} skills in emerging stages that could be consolidated
- Cross-domain impact analysis based on the cascade model
- Functional implications for daily living and learning

Connect an API key in settings to generate the full clinical summary.`,

      'Hypothetical observation': `Based on ${clientName}'s profile (${summary.percentAssessed}% assessed), I would construct a hypothetical observation narrative showing how the identified deficits manifest in a naturalistic setting.

[PREVIEW] The observation would include:
- Setting description (e.g., structured learning environment)
- 3-4 key behavioral sequences highlighting deficit areas${summary.weakestDomains.length > 0 ? ` in ${summary.weakestDomains[0].name}` : ''}
- Antecedent-behavior-consequence chains
- Notation of environmental supports present/absent
- Regulation patterns observed during transitions

This would be approximately 200-300 words of clinical-quality observation narrative.`,

      'Real observation': `I'll help you structure an observation for ${clientName}. I would ask you to describe what you observed, then help organize it into a clinical format.

[PREVIEW] I would guide you through:
1. Setting and context
2. Specific behaviors observed (using assessment domain language)
3. ABC sequences for notable incidents
4. Comparison to assessment profile (${summary.assessed} skills assessed)
5. Clinical interpretation and recommendations

Paste your raw observation notes and I'll format them professionally.`,

      'Titration plan': `Based on ${clientName}'s assessment profile (${summary.needsWork} skills Needs Work, ${summary.developing} Developing across ${summary.domainSummaries.filter((d) => d.assessed > 0).length} domains), I would generate a service titration plan.

[PREVIEW] The plan would recommend:
- Initial service intensity based on deficit breadth and severity
- Focus domains: ${weakDomainNames || 'TBD'}
- Phase 1 targets (foundation skills in weakest domains)
- Graduated step-down criteria tied to assessment benchmarks
- Reassessment schedule aligned with snapshot intervals`,
    },

    bip: {
      'Write operational definition': `I'll write an operational definition based on ${clientName}'s assessment profile. I would ask you to specify the target behavior, then generate a complete definition referencing relevant skill gaps.

[PREVIEW] The definition would include:
- Observable, measurable description of the target behavior
- 3+ examples and 3+ non-examples
- Onset and offset criteria
- Relevant context from the assessment (${summary.weakestDomains.length > 0 ? `noting deficits in ${weakDomainNames}` : 'referencing current skill levels'})
- Recommended measurement system`,
    },

    ltg: {
      'Create long-term goal': `I'll generate a long-term goal for ${clientName} based on the assessment data. ${summary.weakestDomains.length > 0 ? `The weakest domain is ${summary.weakestDomains[0].name} (avg ${summary.weakestDomains[0].avg}).` : ''}

[PREVIEW] The LTG would include:
- A broad, functional goal statement achievable in 6-12 months
- The function the skill serves for the learner
- 3-5 teaching points that fall under the goal
- Current baseline from assessment: ${summary.weakestDomains.length > 0 ? `${summary.weakestDomains[0].name} at ${summary.weakestDomains[0].avg}/3.0` : 'reference domain data'}
- Alignment with the SkillCascade cascade hierarchy`,
    },

    goals: {
      'Write ABA goal': `I'll write a measurable ABA goal for ${clientName}. I would ask which skill area to target, then generate a goal with variations.

[PREVIEW] Each goal would follow the format:
[Learner] will [behavior] [condition] [criteria] [timeframe]

For ${clientName}, based on ${summary.assessed} assessed skills:
- At least 2 goal variations (different conditions/criteria)
- Measurement system specification
- Mastery criteria (e.g., 80% across 3 sessions)
- Generalization targets across settings
${summary.weakestDomains.length > 0 ? `\nSuggested target domain: ${summary.weakestDomains[0].name} (lowest avg: ${summary.weakestDomains[0].avg})` : ''}`,
    },

    analyzer: {
      'Classify a goal': `Paste a goal and I'll analyze whether it is truly behavioral or contains mentalistic language.

[PREVIEW] I would evaluate:
- Identification of any mentalistic terms ("understand," "know," "feel")
- Whether the behavior is observable and measurable
- Confidence rating in the classification
- Specific recommendations for improvement if needed
- Reference to ${clientName}'s assessment context for relevance`,

      'Rewrite a goal': `Paste a goal and I'll rewrite it to be fully behavioral, removing any mentalistic language while preserving the intent.

[PREVIEW] The rewrite would:
- Replace mentalistic terms with observable behaviors
- Maintain the original functional intent
- Use proper ABA goal format
- Include an explanation of each change
- Align with ${clientName}'s current skill levels where relevant`,
    },

    classifier: {
      'Classify a skill/goal': `I'll classify a skill or goal into Behavior, Communication, or Social domains with an appropriate goal level.

[PREVIEW] For each item, I would provide:
- Primary domain classification
- Goal level: Foundational / Emerging / Established
- Rationale for the classification
- Whether it spans multiple domains
- Alignment with ${clientName}'s ${summary.domainSummaries.filter((d) => d.assessed > 0).length} assessed domains`,

      'Batch classify': `Paste a list of skills or goals and I'll classify them all at once.

[PREVIEW] Batch output would include:
- A table with each item, domain, and level
- Summary statistics (how many per domain)
- Flagged items with ambiguous classification
- Coverage analysis against ${clientName}'s assessment framework
- ${summary.assessed} skills already assessed for reference`,

      'Suggest parent LTG': `Based on a set of short-term goals, I'll identify the overarching long-term goal.

[PREVIEW] I would analyze:
- Common functional themes across the goals
- Developmental level alignment with the cascade model
- A concise LTG that captures the shared intent
- How it maps to ${clientName}'s weakest areas: ${weakDomainNames || 'TBD'}`,
    },

    subcategory: {
      'ABA/IEP mode': `Tell me a broad skill or concept, and I'll break it into 8-15 developmentally sequenced subcategories suitable for ABA/IEP programming.

[PREVIEW] Each subcategory would include:
- A clear, teachable label
- Developmental sequence (least to most complex)
- Prerequisite skills
- Measurement approach
- Alignment with the SkillCascade 9-domain framework
${summary.weakestDomains.length > 0 ? `\nSuggested starting concept: a skill from ${summary.weakestDomains[0].name} (weakest domain)` : ''}`,

      'General mode': `Tell me any concept and I'll break it into 8-15 structured subcategories.

[PREVIEW] The output would include:
- 8-15 logically grouped subcategories
- Hierarchical organization
- Clear, concise labels
- Brief description of each subcategory
- Suggested further breakdown for complex items`,
    },

    opdef: {
      'Write operational definition': `I'll generate a precise operational definition for any behavior.

[PREVIEW] The definition would include:
- Observable, measurable behavior description
- 3+ examples of the behavior occurring
- 3+ non-examples (topographically similar but distinct)
- Onset and offset criteria
- Contextual variables from ${clientName}'s assessment
- Inter-observer reliability considerations
${summary.weakestDomains.length > 0 ? `\nContext: ${clientName}'s weakest areas are ${weakDomainNames}, which may inform behavioral context.` : ''}`,
    },
  }

  const toolResponses = responses[toolId]
  if (!toolResponses) return 'This tool is not yet configured for preview mode.'

  return toolResponses[action] || `I'll help with "${action}" for ${clientName}. Connect an API key in settings to enable full AI responses.`
}

/* ─────────────────────────────────────────────
   Message component
   ───────────────────────────────────────────── */

function ChatMessage({ message }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-sage-500 text-white rounded-br-sm'
            : isSystem
              ? 'bg-warm-100 text-warm-600 border border-warm-200 rounded-bl-sm'
              : 'bg-white text-warm-700 border border-warm-200 shadow-sm rounded-bl-sm'
        }`}
      >
        {/* Role label for non-user messages */}
        {!isUser && (
          <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${
            isSystem ? 'text-warm-400' : 'text-sage-500'
          }`}>
            {isSystem ? 'System' : 'AI Assistant'}
          </div>
        )}
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Tool Picker card
   ───────────────────────────────────────────── */

function ToolChip({ tool, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${
        isSelected
          ? 'bg-sage-50 border-sage-300 text-sage-800 shadow-sm'
          : 'bg-white border-warm-200 text-warm-600 hover:border-warm-300 hover:bg-warm-50'
      }`}
    >
      <span className={`shrink-0 ${isSelected ? 'text-sage-600' : 'text-warm-400'}`}>
        {ICONS[tool.id]}
      </span>
      <span className="text-xs font-medium whitespace-nowrap">{tool.name}</span>
    </button>
  )
}

/* ─────────────────────────────────────────────
   Close icon
   ───────────────────────────────────────────── */

function CloseIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2.94 5.22a1 1 0 011.26-.44L18 10l-13.8 5.22a1 1 0 01-1.36-1.12L4.6 10 2.84 6.34a1 1 0 01.1-.88z" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2L1 18h18L10 2z" />
      <path d="M10 8v4M10 14.5v.5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7" />
      <path d="M7 10l2 2 4-4" />
    </svg>
  )
}

/* ─────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────── */

export default function AIAssistantPanel({ isOpen, onClose, clientName, assessments }) {
  const [selectedToolId, setSelectedToolId] = useState('reports')
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isApiConnected, setIsApiConnected] = useState(false)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const toolScrollRef = useRef(null)

  const selectedTool = AI_TOOLS.find((t) => t.id === selectedToolId)

  // Check API connection status
  useEffect(() => {
    const key = localStorage.getItem('skillcascade_ai_api_key')
    setIsApiConnected(!!key && key.length > 0)
  }, [isOpen])

  // Compute overall assessment progress
  const assessmentProgress = useMemo(() => {
    const summary = summarizeAssessments(assessments || {})
    return summary.percentAssessed
  }, [assessments])

  // Load saved conversation or show welcome when tool/client changes
  useEffect(() => {
    if (!selectedTool) return
    const storageKey = `skillcascade_ai_chat_${clientName || 'default'}_${selectedToolId}`
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 1) {
          setMessages(parsed)
          return
        }
      }
    } catch { /* ignore */ }
    setMessages([
      {
        id: 'welcome',
        role: 'system',
        content: `Ready to help with ${selectedTool.name.toLowerCase()} for ${clientName || 'this client'}. Select a quick action below or type a message.`,
      },
    ])
  }, [selectedToolId, clientName])

  // Persist conversation when messages change
  useEffect(() => {
    if (messages.length <= 1) return // don't save just the welcome message
    const storageKey = `skillcascade_ai_chat_${clientName || 'default'}_${selectedToolId}`
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages))
    } catch { /* storage full, ignore */ }
  }, [messages, clientName, selectedToolId])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleQuickAction = useCallback(
    async (action) => {
      const userMsg = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: action,
      }

      if (isApiConnected) {
        setMessages((prev) => [...prev, userMsg])
        setIsLoading(true)
        try {
          const response = await callOpenAI(action, messages)
          const aiMsg = { id: `ai-${Date.now()}`, role: 'assistant', content: response }
          setMessages((prev) => [...prev, aiMsg])
        } catch (err) {
          const errorMsg = { id: `error-${Date.now()}`, role: 'system', content: `Error: ${err.message}` }
          setMessages((prev) => [...prev, errorMsg])
        } finally {
          setIsLoading(false)
        }
      } else {
        const previewContent = generatePreviewResponse(
          selectedToolId, action, clientName || 'this client', assessments || {}
        )
        const aiMsg = { id: `ai-${Date.now()}`, role: 'assistant', content: previewContent }
        setMessages((prev) => [...prev, userMsg, aiMsg])
      }
    },
    [selectedToolId, clientName, assessments, isApiConnected, messages]
  )

  const [isLoading, setIsLoading] = useState(false)
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [keyDraft, setKeyDraft] = useState('')

  function handleSaveKey() {
    const key = keyDraft.trim()
    if (key) {
      localStorage.setItem('skillcascade_ai_api_key', key)
      setIsApiConnected(true)
    } else {
      localStorage.removeItem('skillcascade_ai_api_key')
      setIsApiConnected(false)
    }
    setShowKeyInput(false)
    setKeyDraft('')
  }

  async function callOpenAI(userText, history) {
    const apiKey = localStorage.getItem('skillcascade_ai_api_key')
    if (!apiKey) throw new Error('No API key configured')

    const systemPrompt = buildSystemPrompt(selectedToolId, clientName || 'this client', assessments || {})

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...history
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userText },
    ]

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: apiMessages,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `API error: ${res.status}`)
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content || 'No response generated.'
  }

  const handleSendMessage = useCallback(async () => {
    const text = inputValue.trim()
    if (!text || isLoading) return

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    }

    setInputValue('')

    if (isApiConnected) {
      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)

      try {
        const response = await callOpenAI(text, messages)
        const aiMsg = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: response,
        }
        setMessages((prev) => [...prev, aiMsg])
      } catch (err) {
        const errorMsg = {
          id: `error-${Date.now()}`,
          role: 'system',
          content: `Error: ${err.message}. Check your API key in the connection bar below.`,
        }
        setMessages((prev) => [...prev, errorMsg])
      } finally {
        setIsLoading(false)
      }
    } else {
      const closestAction = selectedTool?.actions?.find((a) =>
        text.toLowerCase().includes(a.toLowerCase().split(' ')[0])
      )

      const previewContent = closestAction
        ? generatePreviewResponse(selectedToolId, closestAction, clientName || 'this client', assessments || {})
        : `I understand you're asking about "${text}" in the context of ${selectedTool?.name}. This is preview mode -- connect an API key below to get full AI-powered responses.\n\nIn the meantime, try one of the quick actions above to see what this tool can do with ${clientName}'s assessment data (${assessmentProgress}% assessed).`

      const aiMsg = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: previewContent,
      }

      setMessages((prev) => [...prev, userMsg, aiMsg])
    }
  }, [inputValue, isLoading, isApiConnected, selectedToolId, selectedTool, clientName, assessments, assessmentProgress, messages])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSendMessage()
      }
    },
    [handleSendMessage]
  )

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-warm-900/50 backdrop-blur-sm transition-opacity duration-300 print:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-[400px] max-w-[calc(100vw-48px)] bg-warm-50 border-l border-warm-200 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out print:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="AI Assistant"
      >
        {/* ── Header ── */}
        <div className="shrink-0 bg-white border-b border-warm-200 px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-sage-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-sage-600" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 2a6 6 0 016 6c0 2.5-1.5 4.5-3 5.5V15a1 1 0 01-1 1H8a1 1 0 01-1-1v-1.5C5.5 12.5 4 10.5 4 8a6 6 0 016-6z" />
                  <path d="M8 17h4M9 17v1a1 1 0 002 0v-1" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-warm-800 font-display leading-none">
                  AI Assistant
                </h2>
                <p className="text-[11px] text-warm-400 mt-0.5">
                  {clientName || 'No client selected'} — {assessmentProgress}% assessed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const storageKey = `skillcascade_ai_chat_${clientName || 'default'}_${selectedToolId}`
                  localStorage.removeItem(storageKey)
                  setMessages([{
                    id: 'welcome',
                    role: 'system',
                    content: `Ready to help with ${selectedTool?.name.toLowerCase()} for ${clientName || 'this client'}. Select a quick action below or type a message.`,
                  }])
                }}
                className="p-1.5 rounded-lg text-warm-400 hover:text-warm-600 hover:bg-warm-100 transition-colors"
                aria-label="New conversation"
                title="New conversation"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-warm-400 hover:text-warm-600 hover:bg-warm-100 transition-colors"
                aria-label="Close AI Assistant"
              >
                <CloseIcon />
              </button>
            </div>
          </div>
        </div>

        {/* ── Tool Picker ── */}
        <div className="shrink-0 bg-white border-b border-warm-200 px-4 py-2.5">
          <div
            ref={toolScrollRef}
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin"
            style={{ scrollbarWidth: 'thin' }}
          >
            {AI_TOOLS.map((tool) => (
              <ToolChip
                key={tool.id}
                tool={tool}
                isSelected={tool.id === selectedToolId}
                onClick={() => setSelectedToolId(tool.id)}
              />
            ))}
          </div>
        </div>

        {/* ── Selected Tool Header ── */}
        {selectedTool && (
          <div className="shrink-0 px-5 py-3.5 bg-white border-b border-warm-200">
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-sage-600">{ICONS[selectedTool.id]}</span>
              <h3 className="text-sm font-semibold text-warm-800">{selectedTool.name}</h3>
            </div>
            <p className="text-[11px] text-warm-500 leading-snug">{selectedTool.description}</p>
          </div>
        )}

        {/* ── Quick Actions ── */}
        {selectedTool && selectedTool.actions.length > 0 && (
          <div className="shrink-0 px-5 py-3 bg-warm-50 border-b border-warm-200">
            <div className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-2">
              Quick Actions
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedTool.actions.map((action) => (
                <button
                  key={action}
                  onClick={() => handleQuickAction(action)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white border border-warm-200 text-warm-600 hover:border-sage-300 hover:text-sage-700 hover:bg-sage-50 transition-all font-medium"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex justify-start mb-3">
              <div className="bg-white text-warm-500 border border-warm-200 shadow-sm rounded-xl rounded-bl-sm px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-sage-400 rounded-full animate-pulse" />
                  <div className="w-2 h-2 bg-sage-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-sage-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                  <span className="text-xs text-warm-400 ml-1">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Input Bar ── */}
        <div className="shrink-0 bg-white border-t border-warm-200 px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 text-sm text-warm-800 placeholder-warm-400 bg-warm-50 border border-warm-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-200 resize-none transition-colors"
              rows={1}
              style={{ minHeight: '40px', maxHeight: '120px' }}
              onInput={(e) => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className={`p-2.5 rounded-xl transition-all shrink-0 ${
                inputValue.trim()
                  ? 'bg-sage-500 text-white hover:bg-sage-600 shadow-sm'
                  : 'bg-warm-100 text-warm-300 cursor-not-allowed'
              }`}
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </div>
        </div>

        {/* ── Connection Status ── */}
        <div className={`shrink-0 border-t text-xs ${
          isApiConnected ? 'bg-sage-50 border-sage-200' : 'bg-warm-100 border-warm-200'
        }`}>
          {showKeyInput ? (
            <div className="px-4 py-3 space-y-2">
              <label className="block text-xs font-medium text-warm-600">OpenAI API Key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  placeholder="sk-..."
                  className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-warm-200 bg-white text-warm-700 focus:outline-none focus:border-sage-400"
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                />
                <button
                  onClick={handleSaveKey}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-sage-500 text-white hover:bg-sage-600"
                >
                  Save
                </button>
                <button
                  onClick={() => { setShowKeyInput(false); setKeyDraft('') }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-warm-200 text-warm-500 hover:bg-warm-50"
                >
                  Cancel
                </button>
              </div>
              <p className="text-[10px] text-warm-400">Key is stored in your browser only. Never sent to our servers.</p>
            </div>
          ) : (
            <div className="px-4 py-2.5 flex items-center gap-2">
              {isApiConnected ? (
                <>
                  <CheckIcon />
                  <span className="font-medium text-sage-600">Connected</span>
                  <span className="text-sage-400">— AI responses enabled</span>
                  <button
                    onClick={() => setShowKeyInput(true)}
                    className="ml-auto text-[10px] text-sage-400 hover:text-sage-600 underline"
                  >
                    Change key
                  </button>
                </>
              ) : (
                <>
                  <WarningIcon />
                  <span className="text-warm-500">
                    <span className="font-medium">Preview mode</span>
                  </span>
                  <button
                    onClick={() => setShowKeyInput(true)}
                    className="ml-auto text-[10px] font-medium text-sage-600 hover:text-sage-700 underline"
                  >
                    Add API key
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
