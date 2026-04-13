/**
 * Re-seed Goal Library with proper 4-tier structure.
 * Clears old system goals and re-inserts from goalLibrary4Tier.json
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = 'https://walshlbzxyzqxbbzsrcs.supabase.co'
const cacheFile = readFileSync('C:/Users/teddy/.claude/paste-cache/c491c60aaa3ec1a8.txt', 'utf8')
const SERVICE_KEY = cacheFile.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)?.[0]

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const data = JSON.parse(readFileSync('src/data/goalLibrary4Tier.json', 'utf8'))

async function reseed() {
  console.log('Clearing old system goals...')

  // Delete in reverse order (targets → stgs → ltgs → domains) to respect foreign keys
  await supabase.from('goal_targets').delete().not('id', 'is', null)
  await supabase.from('goal_stgs').delete().eq('scope', 'system')
  await supabase.from('goal_ltgs').delete().eq('scope', 'system')
  await supabase.from('goal_domains').delete().eq('scope', 'system')
  console.log('Cleared.')

  let domainCount = 0, ltgCount = 0, stgCount = 0, targetCount = 0

  for (let di = 0; di < data.domains.length; di++) {
    const domain = data.domains[di]

    const { data: domainRow, error: domainErr } = await supabase
      .from('goal_domains')
      .insert({ name: domain.name, description: domain.description || null, display_order: di, scope: 'system' })
      .select('id').single()

    if (domainErr) { console.error('Domain failed:', domain.name, domainErr.message); continue }
    domainCount++
    console.log(`Domain: ${domain.name}`)

    for (let li = 0; li < domain.ltgs.length; li++) {
      const ltg = domain.ltgs[li]

      const { data: ltgRow, error: ltgErr } = await supabase
        .from('goal_ltgs')
        .insert({ domain_id: domainRow.id, name: ltg.name, display_order: li, scope: 'system' })
        .select('id').single()

      if (ltgErr) { console.error('  LTG failed:', ltg.name, ltgErr.message); continue }
      ltgCount++

      for (let si = 0; si < ltg.stgs.length; si++) {
        const stg = ltg.stgs[si]

        const { data: stgRow, error: stgErr } = await supabase
          .from('goal_stgs')
          .insert({
            ltg_id: ltgRow.id,
            name: stg.name,
            display_order: si,
            scope: 'system',
            // STG level doesn't have the clinical detail — that's on the targets
          })
          .select('id').single()

        if (stgErr) { console.error('    STG failed:', stg.name, stgErr.message); continue }
        stgCount++

        // Insert targets (what used to be STGs)
        for (let ti = 0; ti < stg.targets.length; ti++) {
          const target = stg.targets[ti]

          const { error: targetErr } = await supabase
            .from('goal_targets')
            .insert({
              stg_id: stgRow.id,
              name: target.name,
              description: JSON.stringify({
                objective: target.objective,
                goal_type: target.goal_type,
                measurement_type: target.measurement_type,
                operational_definition: target.operational_definition,
                examples: target.examples,
                non_examples: target.non_examples,
                default_criteria: target.default_criteria,
                probable_function: target.probable_function,
                proactive_strategies: target.proactive_strategies,
                ferb: target.ferb,
                deescalation: target.deescalation,
              }),
              display_order: ti,
            })

          if (targetErr) { console.error('      Target failed:', target.name, targetErr.message) }
          else targetCount++
        }
      }
    }
  }

  console.log('\n=== Re-seed Complete ===')
  console.log(`Domains: ${domainCount}`)
  console.log(`LTGs: ${ltgCount}`)
  console.log(`STGs: ${stgCount}`)
  console.log(`Targets: ${targetCount}`)
}

reseed().catch(console.error)
