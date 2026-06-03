export const WORKFLOW_PACK_IDS = {
  passageNotes: 'passage-notes',
  reportGenerator: 'report-generator',
  agencyOps: 'agency-ops',
}

export const WORKFLOW_PACK_CHECKOUTS = [
  {
    id: WORKFLOW_PACK_IDS.passageNotes,
    checkoutPlan: 'passage_notes',
    name: 'Passage Runner',
    monthlyEnv: 'STRIPE_PASSAGE_NOTES_PRICE_ID',
    annualEnv: 'STRIPE_PASSAGE_NOTES_ANNUAL_PRICE_ID',
    successPath: '/passage-runner?checkout=success',
    clinicalAccess: true,
    clinicalPlan: 'passage_notes',
  },
  {
    id: WORKFLOW_PACK_IDS.reportGenerator,
    checkoutPlan: 'report_generator',
    name: 'Report Generator',
    monthlyEnv: 'STRIPE_REPORT_GENERATOR_PRICE_ID',
    annualEnv: 'STRIPE_REPORT_GENERATOR_ANNUAL_PRICE_ID',
    successPath: '/report-generator?checkout=success',
    clinicalAccess: false,
    clinicalPlan: null,
  },
  {
    id: WORKFLOW_PACK_IDS.agencyOps,
    checkoutPlan: 'agency_ops',
    name: 'Agency Ops',
    monthlyEnv: 'STRIPE_AGENCY_OPS_PRICE_ID',
    annualEnv: 'STRIPE_AGENCY_OPS_ANNUAL_PRICE_ID',
    successPath: '/agency-ops?checkout=success',
    clinicalAccess: false,
    clinicalPlan: null,
  },
]

export function parseWorkflowPackAccess(rawAccess) {
  if (!rawAccess) return {}
  if (typeof rawAccess === 'string') {
    try {
      const parsed = JSON.parse(rawAccess)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  return typeof rawAccess === 'object' && !Array.isArray(rawAccess) ? rawAccess : {}
}

export function findWorkflowPackCheckout({ workflowPackId, plan } = {}) {
  const normalizedPackId = String(workflowPackId || '').trim()
  const normalizedPlan = String(plan || '').trim()
  return WORKFLOW_PACK_CHECKOUTS.find((pack) => (
    pack.id === normalizedPackId || pack.checkoutPlan === normalizedPlan
  )) || null
}

export function workflowPackPriceId(env, pack, annual = false) {
  if (!pack) return ''
  const key = annual ? pack.annualEnv : pack.monthlyEnv
  return key ? env[key] || '' : ''
}

export function findWorkflowPackByPriceId(env, priceId) {
  if (!priceId) return null
  return WORKFLOW_PACK_CHECKOUTS.find((pack) => (
    env[pack.monthlyEnv] === priceId || env[pack.annualEnv] === priceId
  )) || null
}

export function hasWorkflowPack(profile, packId) {
  if (profile?.is_super_admin) return true

  const status = String(profile?.subscription_status || '').toLowerCase()
  const currentPeriodEnd = profile?.subscription_current_period_end
  const periodExpired = currentPeriodEnd ? new Date(currentPeriodEnd) < new Date() : false
  if (periodExpired || !['active', 'trialing'].includes(status)) return false

  const explicitPackAccess = parseWorkflowPackAccess(profile?.workflow_pack_access)
  if (Object.prototype.hasOwnProperty.call(explicitPackAccess, packId)) {
    return explicitPackAccess[packId] === true
  }

  if (packId === WORKFLOW_PACK_IDS.passageNotes) {
    const clinicalPlan = String(profile?.clinical_plan || '').toLowerCase()
    const allowedPlans = new Set([
      'passage_notes',
      'passage_bcba_notes',
      'notes_all',
      'clinic_enterprise',
      'clinical_platform',
    ])
    return profile?.clinical_access === true || allowedPlans.has(clinicalPlan)
  }

  return false
}

let subscriptionColumnsEnsured = false

export async function ensureWorkflowPackSubscriptionColumns(env, dbQuery) {
  if (subscriptionColumnsEnsured) return
  await dbQuery(env, "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS clinical_access boolean NOT NULL DEFAULT false")
  await dbQuery(env, "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS clinical_plan text")
  await dbQuery(env, "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS clinical_seats integer NOT NULL DEFAULT 0")
  await dbQuery(env, "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS workflow_pack_access jsonb NOT NULL DEFAULT '{}'::jsonb")
  subscriptionColumnsEnsured = true
}
