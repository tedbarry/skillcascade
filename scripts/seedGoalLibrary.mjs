/**
 * Seed the Goal Library database tables from the parsed JSON.
 * Run: node scripts/seedGoalLibrary.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://walshlbzxyzqxbbzsrcs.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY in the local shell before running seedGoalLibrary.mjs.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const data = JSON.parse(
  readFileSync('src/data/goalLibraryParsed.json', 'utf8')
)

async function seed() {
  console.log('Starting Goal Library seed...')

  let domainCount = 0
  let ltgCount = 0
  let stgCount = 0
  let targetCount = 0

  for (let di = 0; di < data.domains.length; di++) {
    const domain = data.domains[di]

    // Insert domain
    const { data: domainRow, error: domainErr } = await supabase
      .from('goal_domains')
      .insert({
        name: domain.name,
        description: domain.description || null,
        display_order: di,
        scope: 'system',
      })
      .select('id')
      .single()

    if (domainErr) {
      console.error('Domain insert failed:', domain.name, domainErr.message)
      continue
    }
    domainCount++
    console.log(`Domain: ${domain.name} (${domainRow.id})`)

    for (let li = 0; li < domain.ltgs.length; li++) {
      const ltg = domain.ltgs[li]

      const { data: ltgRow, error: ltgErr } = await supabase
        .from('goal_ltgs')
        .insert({
          domain_id: domainRow.id,
          name: ltg.name,
          description: ltg.description || null,
          display_order: li,
          scope: 'system',
        })
        .select('id')
        .single()

      if (ltgErr) {
        console.error('  LTG insert failed:', ltg.name, ltgErr.message)
        continue
      }
      ltgCount++

      for (let si = 0; si < ltg.stgs.length; si++) {
        const stg = ltg.stgs[si]

        const { data: stgRow, error: stgErr } = await supabase
          .from('goal_stgs')
          .insert({
            ltg_id: ltgRow.id,
            name: stg.name,
            objective: stg.objective || null,
            operational_definition: stg.operational_definition || null,
            examples: stg.examples || null,
            non_examples: stg.non_examples || null,
            measurement_type: stg.measurement_type || 'percentage',
            default_criteria: stg.default_criteria || null,
            probable_function: stg.probable_function || null,
            proactive_strategies: stg.proactive_strategies || null,
            ferb: stg.ferb || null,
            deescalation: stg.deescalation || null,
            goal_type: stg.goal_type || 'increase',
            skill_mappings: stg.skill_mappings || null,
            display_order: si,
            scope: 'system',
          })
          .select('id')
          .single()

        if (stgErr) {
          console.error('    STG insert failed:', stg.name, stgErr.message)
          continue
        }
        stgCount++

        // Insert targets if any
        if (stg.targets && stg.targets.length > 0) {
          for (let ti = 0; ti < stg.targets.length; ti++) {
            const target = stg.targets[ti]
            const { error: targetErr } = await supabase
              .from('goal_targets')
              .insert({
                stg_id: stgRow.id,
                name: target.name,
                description: target.description || null,
                display_order: ti,
              })

            if (targetErr) {
              console.error('      Target insert failed:', target.name, targetErr.message)
            } else {
              targetCount++
            }
          }
        }
      }
    }
  }

  console.log('\n=== Seed Complete ===')
  console.log(`Domains: ${domainCount}`)
  console.log(`LTGs: ${ltgCount}`)
  console.log(`STGs: ${stgCount}`)
  console.log(`Targets: ${targetCount}`)
}

seed().catch(console.error)
