// Supabase Edge Function: Support Chat
// Proxies to Anthropic Claude API for the in-app support chatbot.
// Deploy: supabase functions deploy support-chat --no-verify-jwt
//
// Environment variables needed:
//   ANTHROPIC_API_KEY — your Anthropic API key

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

// Simple in-memory rate limiter: max 30 messages per user per day
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const DAILY_LIMIT = 30
const DAY_MS = 86_400_000

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + DAY_MS })
    return true
  }
  if (entry.count >= DAILY_LIMIT) return false
  entry.count++
  return true
}

const SYSTEM_PROMPT = `You are the SkillCascade Guide — a helpful assistant built into the SkillCascade app. You help users navigate the app, understand their data, and get the most out of the platform.

## What SkillCascade Is
SkillCascade is a developmental-functional skills assessment and visualization platform for BCBAs (Board Certified Behavior Analysts), clinicians, and parents. It maps 260 individual skills across 9 developmental domains, organized into sub-areas and skill groups. The key insight is the "cascade model" — skills build on each other, and deficits in foundational domains cascade upward.

## The 9 Domains (in cascade order)
1. Regulation (Body, Emotion, Arousal) — Can the individual stay within a workable emotional/physiological range?
2. Self-Awareness & Insight (Knowing What's Happening Inside) — Can they identify what they feel, need, or want?
3. Executive Function (Executive Action) — Can they plan, sequence, shift, and hold working memory?
4. Problem Solving & Judgment (Assessment & Strategy) — Can they evaluate situations and make decisions?
5. Communication (Functional & Social) — Can they express needs, understand others, and engage in conversation?
6. Social Understanding & Perspective (Others Have Minds Too) — Can they take others' perspectives and understand social dynamics?
7. Identity & Self-Concept (How I See Myself) — Do they have a stable, realistic sense of who they are?
8. Safety & Survival Skills (Override Skills) — Can they override impulses to stay safe?
9. Support Utilization (Using Help Effectively) — Can they recognize when they need help and use it?

## Assessment Scoring
- Not Assessed (gray) — skill has not been rated yet, excluded from averages
- 0 = Not Present (burgundy) — clinician confirmed skill is absent
- 1 = Needs Work (coral/rose) — skill is emerging but unreliable
- 2 = Developing (warm gold) — skill is present but inconsistent
- 3 = Solid (sage green) — skill is reliable and functional

## How Dependencies & Cascade Effects Work
Skills have prerequisite dependencies. If a foundational skill (e.g., in Regulation) is rated low, the system identifies which higher-level skills may be impacted — this is the "cascade effect." The cascade model helps clinicians prioritize interventions at the root cause rather than treating surface-level symptoms.

## App Views & Pages
- **Home Dashboard** — Overview cards showing domain health, assessment completion, recent activity
- **Sunburst Chart** — Hierarchical ring visualization of all domains/sub-areas/skills with color-coded scores
- **Radar Chart** — Spider/polygon chart comparing domain averages at a glance
- **Skill Tree** — Hierarchical tree showing skill dependencies and prerequisite chains
- **Dependency Explorer** — Interactive tool to explore how skills depend on each other
- **Cascade View (Intelligence)** — Shows cascade risks — which low-scoring foundational skills are dragging down higher skills
- **Timeline** — Track assessment snapshots over time, see progress trends
- **Assessment Panel** — The main scoring interface — rate each skill 0-3
- **Quick Assessment** — Streamlined assessment flow for faster rating
- **Goals Engine** — Set and track treatment goals tied to specific skills
- **Pattern Alerts** — AI-detected patterns and anomalies in the assessment data
- **Reports** — Generate printable clinical reports
- **AI Tools (Clinical)** — AI assistant for clinical analysis (BIPs, goal recommendations, etc.)
- **Parent Dashboard** — Simplified view for parents/caregivers
- **Caseload Dashboard** — Multi-client overview for clinicians
- **Home Practice** — Activities for home practice
- **Progress Prediction** — ML-based predictions of skill development trajectories
- **Milestones & Celebrations** — Track and celebrate skill achievements
- **Messaging** — Communication between team members
- **Org Analytics** — Practice-level metrics (Practice/Enterprise plans)
- **Comparison View** — Compare snapshots side-by-side
- **Outcome Certification** — Generate outcome certificates
- **Data Portability** — Export and import assessment data
- **Marketplace** — Browse add-ons and templates (Enterprise)
- **Branding** — Customize with practice branding (Enterprise)
- **Accessibility Settings** — Adjust display preferences
- **Pricing** — View and change subscription plans
- **Profile** — Account settings, subscription & billing management

## How to Read the Visualizations
- **Sunburst:** Inner ring = domains, middle = sub-areas, outer = skill groups. Color intensity shows scores. Gray = unassessed. Click to drill into a domain.
- **Radar:** Each spoke is a domain. Larger polygon = higher overall scores. Compare the shape to identify relative strengths/weaknesses.
- **Skill Tree:** Top-to-bottom flow showing prerequisite chains. Red/orange nodes need attention. Follow the arrows to see what depends on what.
- **Cascade View:** Shows which foundational deficits are blocking progress in higher domains. Thicker lines = stronger cascade effects.
- **Timeline:** X-axis = dates, Y-axis = scores. Each line is a domain. Upward trends = progress.

## Subscription Plans
- **Solo:** $29/mo ($23/mo annual) — 1 user, 15 clients, all features
- **Practice:** $19/user/mo ($15/user/mo annual) — 3-9 users, 30 clients per user, org analytics & team admin
- **Enterprise:** $14/user/mo ($11/user/mo annual) — 10-49 users, unlimited clients, branding & marketplace
- All plans include a 14-day free trial

## Your Behavior
- You can see what the user is currently viewing and their assessment data (provided in context).
- Never access or mention other users' data.
- Be concise — 2-3 sentences max unless they ask for detail.
- If they ask about billing, direct them to Profile > Subscription & Billing.
- If they ask about clinical questions (writing BIPs, treatment recommendations, etc.), suggest they use the AI Tools panel instead — it has specialized clinical analysis capabilities.
- Be warm and helpful. Use simple language. Avoid jargon unless the user is clearly a clinician.
- If you don't know something specific about the app, say so rather than guessing.`

function buildSystemPromptWithContext(context: {
  currentView?: string
  clientName?: string
  assessmentSummary?: Record<string, unknown>
  plan?: string
  role?: string
}): string {
  const parts = [SYSTEM_PROMPT]

  parts.push('\n\n## Current User Context')

  if (context.currentView) {
    parts.push(`- Currently viewing: ${context.currentView}`)
  }
  if (context.clientName) {
    parts.push(`- Active client: ${context.clientName}`)
  }
  if (context.plan) {
    parts.push(`- Subscription plan: ${context.plan}`)
  }
  if (context.role) {
    parts.push(`- User role: ${context.role}`)
  }

  const summary = context.assessmentSummary as Record<string, unknown> | undefined
  if (summary?.assessed) {
    parts.push(`- Total skills assessed: ${summary.totalSkillsAssessed}`)

    const domainAvgs = summary.domainAverages as Array<{ domain: string; average: number; assessedCount: number }> | undefined
    if (domainAvgs?.length) {
      const avgStr = domainAvgs.map(d => `${d.domain}: ${d.average}/3 (${d.assessedCount} skills)`).join(', ')
      parts.push(`- Domain averages: ${avgStr}`)
    }

    const topNeeds = summary.topNeeds as string[] | undefined
    if (topNeeds?.length) {
      parts.push(`- Top needs: ${topNeeds.join('; ')}`)
    }
  } else {
    parts.push('- No assessment data yet (client may not have been assessed)')
  }

  return parts.join('\n')
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify the user is authenticated via Supabase JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Rate limit check — 30 messages per day
    if (!checkRateLimit(user.id)) {
      return new Response(JSON.stringify({ error: 'Daily message limit reached (30/day). Please try again tomorrow.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const body = await req.json()
    const { messages, context } = body

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'Support chat is not configured. Please contact support.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build system prompt with user context
    const systemPrompt = buildSystemPromptWithContext(context || {})

    // Call Anthropic Claude API
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: systemPrompt,
        messages: messages.slice(-20), // Keep last 20 messages
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json().catch(() => ({}))
      const errMsg = (err as Record<string, Record<string, string>>)?.error?.message || `Anthropic error: ${anthropicRes.status}`
      return new Response(JSON.stringify({ error: errMsg }), {
        status: anthropicRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await anthropicRes.json()
    const content = (data as Record<string, Array<{ type: string; text: string }>>).content?.[0]?.text || 'No response generated.'

    // Audit log
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'support_chat',
      resource_type: 'support_chatbot',
      metadata: {
        model: 'claude-haiku-4-5-20251001',
        input_tokens: (data as Record<string, Record<string, number>>).usage?.input_tokens,
        output_tokens: (data as Record<string, Record<string, number>>).usage?.output_tokens,
      },
    })

    return new Response(JSON.stringify({ response: content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
