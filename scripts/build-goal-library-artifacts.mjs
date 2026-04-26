import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { CORE_GOAL_LIBRARY } from '../src/data/canonicalGoalLibrary.js'
import { validateCoreGoalLibrary } from '../src/data/goalMedicalNecessityValidation.js'

const SOURCE_PATH = resolve('src/data/goalLibrary4Tier.json')
const ROUTER_INDEX_PATH = resolve('src/data/goalRouterIndex.json')
const HIERARCHY_PATH = resolve('src/data/goalHierarchy.json')

function readGoalLibrary() {
  return JSON.parse(readFileSync(SOURCE_PATH, 'utf8'))
}

function buildRouterIndex(goalLibrary) {
  return {
    domains: (goalLibrary.domains || []).map((domain) => ({
      name: domain.name,
      ltgs: (domain.ltgs || []).map((ltg) => ({
        name: ltg.name,
        stgs: (ltg.stgs || []).map((stg) => ({
          name: stg.name,
          goalType: stg.goal_type || 'increase',
          measurementType: stg.measurement_type || 'percentage',
          criteria: stg.default_criteria || '',
          targets: (stg.targets || []).map((target) => target.name).filter(Boolean),
        })),
      })),
    })),
  }
}

function buildGoalHierarchy(goalLibrary) {
  return (goalLibrary.domains || []).map((domain) => ({
    name: domain.name,
    ltgs: (domain.ltgs || []).map((ltg) => ({
      name: ltg.name,
      stgs: (ltg.stgs || []).map((stg) => stg.name),
    })),
  }))
}

function writeJson(outputPath, data) {
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

function main() {
  const goalLibrary = readGoalLibrary()
  writeJson(ROUTER_INDEX_PATH, buildRouterIndex(goalLibrary))
  writeJson(HIERARCHY_PATH, buildGoalHierarchy(goalLibrary))

  const validation = validateCoreGoalLibrary(CORE_GOAL_LIBRARY)
  if (!validation.ok) {
    throw new Error(`Core goal library medical-necessity validation failed:\n- ${validation.errors.join('\n- ')}`)
  }
}

main()
