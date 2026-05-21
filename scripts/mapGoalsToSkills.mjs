/**
 * Batch-map Goal Library STGs to SkillCascade 260-skill framework.
 * Uses AI to find 1-3 most relevant skills per goal.
 * Run: node scripts/mapGoalsToSkills.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://walshlbzxyzqxbbzsrcs.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SC_EMAIL = process.env.SC_EMAIL
const SC_PASSWORD = process.env.SC_PASSWORD
const SKILLS_COMPACT_PATH = process.env.SKILLS_COMPACT_PATH || 'C:/Users/teddy/AppData/Local/Temp/skills_compact.txt'

if (!SERVICE_KEY) {
  throw new Error('Set SUPABASE_SERVICE_ROLE_KEY in the local shell before running mapGoalsToSkills.mjs.')
}

if (!SC_EMAIL || !SC_PASSWORD) {
  throw new Error('Set SC_EMAIL and SC_PASSWORD in the local shell before running mapGoalsToSkills.mjs.')
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Load the compact skill framework
const skillsText = readFileSync(SKILLS_COMPACT_PATH, 'utf8')

const SYSTEM_PROMPT = `You are an expert BCBA mapping ABA therapy goals to a developmental skill framework.

Given a list of ABA goals, map each one to 1-3 skills from the SkillCascade framework below. Choose the skills that the goal MOST DIRECTLY targets or depends on.

RULES:
- Each goal maps to 1-3 skills (prefer 1-2, use 3 only when clearly needed)
- The PRIMARY mapping is the skill the goal most directly teaches/targets
- SECONDARY mappings are prerequisite skills the goal depends on
- If no good match exists, use the closest skill in the same developmental domain
- Return ONLY a JSON array, no other text

SKILLCASCADE FRAMEWORK (259 skills):
${skillsText}

For each goal, return:
{ "goal": "goal name", "mappings": ["skill-id-1", "skill-id-2"] }

Return a JSON array of all mappings.`

// Sign in as a real user to get an auth token for the AI proxy
let authToken = null
async function getAuthToken() {
  if (authToken) return authToken
  // Sign in as the operator to receive an auth token for the AI proxy.
  const { data, error } = await supabase.auth.signInWithPassword({
    email: SC_EMAIL,
    password: SC_PASSWORD,
  })
  if (error) {
    console.error('Auth failed:', error.message)
    console.error('Set SC_EMAIL and SC_PASSWORD env vars for a SkillCascade account')
    process.exit(1)
  }
  authToken = data.session.access_token
  console.log('Authenticated as', data.user.email)
  return authToken
}

async function callAIProxy(goals) {
  const token = await getAuthToken()
  const goalsText = goals.map((g, i) => `${i + 1}. ${g.name}: ${g.objective || ''}`).join('\n')

  const resp = await fetch('https://walshlbzxyzqxbbzsrcs.supabase.co/functions/v1/ai-proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Map these ABA goals to SkillCascade skills:\n\n${goalsText}` },
      ],
      model: 'gpt-4o-mini',
      max_tokens: 3000,
      temperature: 0.2,
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`AI call failed: ${resp.status} — ${err}`)
  }

  const data = await resp.json()
  return data.content
}

async function run() {
  console.log('Loading STGs from database...')
  const { data: stgs, error } = await supabase
    .from('goal_stgs')
    .select('id, name, objective, skill_mappings')
    .is('skill_mappings', null)  // Only map unmapped goals
    .order('display_order')

  if (error) { console.error('Failed to load STGs:', error.message); return }
  console.log(`Found ${stgs.length} unmapped goals`)

  // Process in batches of 15
  const BATCH_SIZE = 15
  let mapped = 0
  let failed = 0

  for (let i = 0; i < stgs.length; i += BATCH_SIZE) {
    const batch = stgs.slice(i, i + BATCH_SIZE)
    console.log(`\nBatch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(stgs.length / BATCH_SIZE)}: ${batch.length} goals`)

    try {
      const response = await callAIProxy(batch)

      // Parse JSON from response
      const cleaned = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      let mappings
      try {
        mappings = JSON.parse(cleaned.startsWith('[') ? cleaned : cleaned.match(/\[[\s\S]*\]/)?.[0] || '[]')
      } catch (parseErr) {
        console.error('  JSON parse failed:', parseErr.message)
        console.error('  Response:', cleaned.slice(0, 200))
        failed += batch.length
        continue
      }

      // Update each STG with its mappings
      for (const mapping of mappings) {
        const stg = batch.find(s =>
          s.name.toLowerCase().includes(mapping.goal?.toLowerCase()?.slice(0, 30)) ||
          mapping.goal?.toLowerCase()?.includes(s.name.toLowerCase().slice(0, 30))
        )

        if (!stg) {
          // Try matching by index
          const idx = mappings.indexOf(mapping)
          if (idx < batch.length) {
            const targetSTG = batch[idx]
            if (mapping.mappings?.length > 0) {
              const { error: updateErr } = await supabase
                .from('goal_stgs')
                .update({ skill_mappings: mapping.mappings })
                .eq('id', targetSTG.id)

              if (updateErr) {
                console.error(`  Failed to update ${targetSTG.name}:`, updateErr.message)
                failed++
              } else {
                console.log(`  ✓ ${targetSTG.name} → [${mapping.mappings.join(', ')}]`)
                mapped++
              }
            }
          }
          continue
        }

        if (mapping.mappings?.length > 0) {
          const { error: updateErr } = await supabase
            .from('goal_stgs')
            .update({ skill_mappings: mapping.mappings })
            .eq('id', stg.id)

          if (updateErr) {
            console.error(`  Failed to update ${stg.name}:`, updateErr.message)
            failed++
          } else {
            console.log(`  ✓ ${stg.name} → [${mapping.mappings.join(', ')}]`)
            mapped++
          }
        }
      }
    } catch (err) {
      console.error(`  Batch failed:`, err.message)
      failed += batch.length
    }

    // Rate limit pause
    if (i + BATCH_SIZE < stgs.length) {
      console.log('  Waiting 2s...')
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  console.log(`\n=== Mapping Complete ===`)
  console.log(`Mapped: ${mapped}`)
  console.log(`Failed: ${failed}`)
  console.log(`Total: ${stgs.length}`)
}

run().catch(console.error)
