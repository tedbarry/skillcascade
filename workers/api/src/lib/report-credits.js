import { WORKFLOW_PACK_IDS } from './workflow-packs.js'

export const REPORT_CREDIT_BUNDLES = [
  {
    id: 'report-credit-1',
    name: 'Single report',
    credits: 1,
    amountCents: 5000,
    priceLabel: '$50',
    unitPriceLabel: '$50/report',
    savingsLabel: '',
  },
  {
    id: 'report-credit-5',
    name: '5-report pack',
    credits: 5,
    amountCents: 22500,
    priceLabel: '$225',
    unitPriceLabel: '$45/report',
    savingsLabel: 'Save 10%',
  },
  {
    id: 'report-credit-10',
    name: '10-report pack',
    credits: 10,
    amountCents: 40000,
    priceLabel: '$400',
    unitPriceLabel: '$40/report',
    savingsLabel: 'Save 20%',
  },
]

export function findReportCreditBundle(bundleId) {
  const normalized = String(bundleId || '').trim()
  return REPORT_CREDIT_BUNDLES.find((bundle) => bundle.id === normalized) || null
}

export async function ensureReportCreditLedgerTable(env, dbQuery) {
  await dbQuery(env, `
    CREATE TABLE IF NOT EXISTS report_generator_credit_ledger (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      org_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
      workflow_pack_id text NOT NULL DEFAULT '${WORKFLOW_PACK_IDS.reportGenerator}',
      credits_delta integer NOT NULL,
      event_type text NOT NULL,
      bundle_id text,
      amount_cents integer,
      stripe_checkout_session_id text UNIQUE,
      stripe_payment_intent_id text,
      external_event_id text UNIQUE,
      description text,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `)
  await dbQuery(env, `
    CREATE INDEX IF NOT EXISTS idx_report_generator_credit_ledger_user
      ON report_generator_credit_ledger(user_id, created_at DESC)
  `)
  await dbQuery(env, `
    CREATE INDEX IF NOT EXISTS idx_report_generator_credit_ledger_org
      ON report_generator_credit_ledger(org_id, created_at DESC)
  `)
}

export async function getReportCreditBalance({ env, dbQuery, userId }) {
  await ensureReportCreditLedgerTable(env, dbQuery)
  const result = await dbQuery(env,
    `SELECT COALESCE(SUM(credits_delta), 0)::int AS balance
     FROM report_generator_credit_ledger
     WHERE user_id = $1`,
    [userId]
  )
  return Number(result.rows[0]?.balance || 0)
}

export async function listReportCreditLedger({ env, dbQuery, userId, limit = 20 }) {
  await ensureReportCreditLedgerTable(env, dbQuery)
  const result = await dbQuery(env,
    `SELECT id, credits_delta, event_type, bundle_id, amount_cents, description, metadata, created_at
     FROM report_generator_credit_ledger
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, Math.max(1, Math.min(Number(limit) || 20, 50))]
  )
  return result.rows || []
}

export async function grantReportCredits({
  env,
  dbQuery,
  userId,
  orgId = null,
  bundle,
  stripeCheckoutSessionId = '',
  stripePaymentIntentId = '',
  metadata = {},
}) {
  if (!bundle?.credits) throw new Error('Report credit bundle is required.')
  await ensureReportCreditLedgerTable(env, dbQuery)
  const result = await dbQuery(env,
    `INSERT INTO report_generator_credit_ledger (
       user_id, org_id, credits_delta, event_type, bundle_id, amount_cents,
       stripe_checkout_session_id, stripe_payment_intent_id, description, metadata
     )
     VALUES ($1, $2, $3, 'purchase', $4, $5, NULLIF($6, ''), NULLIF($7, ''), $8, $9::jsonb)
     ON CONFLICT (stripe_checkout_session_id) DO NOTHING
     RETURNING *`,
    [
      userId,
      orgId,
      bundle.credits,
      bundle.id,
      bundle.amountCents,
      stripeCheckoutSessionId,
      stripePaymentIntentId,
      `${bundle.credits} report credit${bundle.credits === 1 ? '' : 's'} purchased`,
      JSON.stringify(metadata),
    ]
  )
  return result.rows[0] || null
}

export async function consumeReportCredit({
  env,
  dbQuery,
  userId,
  orgId = null,
  credits = 1,
  externalEventId,
  description = 'Report draft generated',
  metadata = {},
}) {
  const creditCount = Math.max(1, Number(credits) || 1)
  if (!externalEventId) throw new Error('A credit consumption idempotency key is required.')
  await ensureReportCreditLedgerTable(env, dbQuery)

  const existing = await dbQuery(env,
    `SELECT id, credits_delta
     FROM report_generator_credit_ledger
     WHERE external_event_id = $1
     LIMIT 1`,
    [externalEventId]
  )
  if (existing.rows[0]) return { entry: existing.rows[0], alreadyRecorded: true }

  const balance = await getReportCreditBalance({ env, dbQuery, userId })
  if (balance < creditCount) {
    const error = new Error('Not enough report credits.')
    error.code = 'insufficient_report_credits'
    error.balance = balance
    throw error
  }

  const result = await dbQuery(env,
    `INSERT INTO report_generator_credit_ledger (
       user_id, org_id, credits_delta, event_type, external_event_id, description, metadata
     )
     VALUES ($1, $2, $3, 'consume', $4, $5, $6::jsonb)
     RETURNING *`,
    [
      userId,
      orgId,
      -creditCount,
      externalEventId,
      description,
      JSON.stringify(metadata),
    ]
  )
  return { entry: result.rows[0], alreadyRecorded: false }
}
