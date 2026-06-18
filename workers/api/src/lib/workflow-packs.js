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
    productName: 'SkillCascade Passage Notes Automation',
    description: 'Local-first Passage note drafting and review-tab automation for BCBA notes.',
    monthlyEnv: 'STRIPE_PASSAGE_NOTES_PRICE_ID',
    annualEnv: 'STRIPE_PASSAGE_NOTES_ANNUAL_PRICE_ID',
    monthlyAmountCents: 150000,
    annualAmountCents: 1500000,
    successPath: '/workflow-packs/passage-notes/onboarding?checkout=success',
    clinicalAccess: true,
    clinicalPlan: 'passage_notes',
  },
  {
    id: WORKFLOW_PACK_IDS.agencyOps,
    checkoutPlan: 'agency_ops',
    name: 'Agency Ops',
    productName: 'SkillCascade Agency Ops',
    description: 'Approval-gated ABA agency operations workflows, starting with note QA and handoffs.',
    monthlyEnv: 'STRIPE_AGENCY_OPS_PRICE_ID',
    annualEnv: 'STRIPE_AGENCY_OPS_ANNUAL_PRICE_ID',
    monthlyAmountCents: 79900,
    annualAmountCents: 799000,
    successPath: '/workflow-packs/agency-ops/onboarding?checkout=success',
    clinicalAccess: false,
    clinicalPlan: null,
  },
]

export const REPORT_GENERATOR_CREDIT_CHECKOUT = {
  id: WORKFLOW_PACK_IDS.reportGenerator,
  checkoutPlan: 'report_generator',
  name: 'Report Generator',
  productName: 'SkillCascade Report Generator Credits',
  description: 'One-time credits for source-backed ABA initial assessment report drafting.',
  successPath: '/workflow-packs/report-generator/onboarding?checkout=report-credits-success',
}

const WORKFLOW_PACK_PLAN_ACCESS = {
  [WORKFLOW_PACK_IDS.passageNotes]: new Set([
    'passage_notes',
    'passage_bcba_notes',
    'notes_all',
    'clinic_enterprise',
    'clinical_platform',
  ]),
  [WORKFLOW_PACK_IDS.reportGenerator]: new Set([
    'reports',
    'reports_all',
    'clinic_enterprise',
  ]),
  [WORKFLOW_PACK_IDS.agencyOps]: new Set([
    'agency_ops',
    'clinic_enterprise',
  ]),
}

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

export function workflowPackPriceConfig(pack, annual = false) {
  if (!pack) return null
  return {
    interval: annual ? 'year' : 'month',
    envName: annual ? pack.annualEnv : pack.monthlyEnv,
    amountCents: annual ? pack.annualAmountCents : pack.monthlyAmountCents,
    currency: 'usd',
    lookupKey: `${pack.checkoutPlan}_${annual ? 'annual' : 'monthly'}`,
  }
}

export function formatAmountCents(amountCents) {
  const amount = Number(amountCents)
  if (!Number.isFinite(amount)) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100)
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

  const clinicalPlan = String(profile?.clinical_plan || '').toLowerCase()
  const allowedPlans = WORKFLOW_PACK_PLAN_ACCESS[packId]
  if (allowedPlans?.has(clinicalPlan)) return true

  if (packId === WORKFLOW_PACK_IDS.passageNotes) {
    return profile?.clinical_access === true
  }

  return false
}

let subscriptionColumnsEnsured = false
let workflowPackBillingTableEnsured = false

export async function ensureWorkflowPackSubscriptionColumns(env, dbQuery) {
  if (subscriptionColumnsEnsured) return
  await dbQuery(env, "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS clinical_access boolean NOT NULL DEFAULT false")
  await dbQuery(env, "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS clinical_plan text")
  await dbQuery(env, "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS clinical_seats integer NOT NULL DEFAULT 0")
  await dbQuery(env, "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS workflow_pack_access jsonb NOT NULL DEFAULT '{}'::jsonb")
  subscriptionColumnsEnsured = true
}

export async function ensureWorkflowPackBillingTable(env, dbQuery) {
  if (workflowPackBillingTableEnsured) return
  await dbQuery(env, `
    CREATE TABLE IF NOT EXISTS workflow_pack_price_configs (
      pack_id text PRIMARY KEY,
      checkout_plan text NOT NULL,
      stripe_product_id text,
      monthly_price_id text,
      annual_price_id text,
      monthly_amount_cents integer NOT NULL,
      annual_amount_cents integer NOT NULL,
      currency text NOT NULL DEFAULT 'usd',
      provisioned_by text,
      provisioned_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `)
  workflowPackBillingTableEnsured = true
}

export async function loadWorkflowPackPriceConfigMap(env, dbQuery) {
  await ensureWorkflowPackBillingTable(env, dbQuery)
  const result = await dbQuery(env, `
    SELECT pack_id, checkout_plan, stripe_product_id, monthly_price_id, annual_price_id,
           monthly_amount_cents, annual_amount_cents, currency, provisioned_at, updated_at
    FROM workflow_pack_price_configs
  `)
  return new Map((result.rows || []).map((row) => [row.pack_id, row]))
}

export function workflowPackDbPriceId(configMap, pack, annual = false) {
  if (!pack || !configMap) return ''
  const row = configMap instanceof Map ? configMap.get(pack.id) : configMap[pack.id]
  if (!row) return ''
  return annual ? row.annual_price_id || '' : row.monthly_price_id || ''
}

export function resolveWorkflowPackPriceId(env, pack, configMap, annual = false) {
  return workflowPackPriceId(env, pack, annual) || workflowPackDbPriceId(configMap, pack, annual)
}

export function workflowPackPriceSource(env, pack, configMap, annual = false) {
  if (workflowPackPriceId(env, pack, annual)) return 'env'
  if (workflowPackDbPriceId(configMap, pack, annual)) return 'db'
  return ''
}
