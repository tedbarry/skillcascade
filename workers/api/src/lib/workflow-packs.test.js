import { describe, expect, it } from 'vitest'
import {
  WORKFLOW_PACK_CHECKOUTS,
  WORKFLOW_PACK_IDS,
  hasWorkflowPack,
  resolveWorkflowPackPriceId,
} from './workflow-packs.js'

function profile(overrides = {}) {
  return {
    is_super_admin: false,
    subscription_status: 'active',
    subscription_current_period_end: '2099-01-01T00:00:00.000Z',
    workflow_pack_access: {},
    clinical_access: false,
    clinical_plan: null,
    ...overrides,
  }
}

describe('workflow-packs access helper', () => {
  it('allows super admins to reach all workflow packs', () => {
    const owner = profile({ is_super_admin: true, subscription_status: 'expired' })

    expect(hasWorkflowPack(owner, WORKFLOW_PACK_IDS.passageNotes)).toBe(true)
    expect(hasWorkflowPack(owner, WORKFLOW_PACK_IDS.reportGenerator)).toBe(true)
    expect(hasWorkflowPack(owner, WORKFLOW_PACK_IDS.agencyOps)).toBe(true)
  })

  it('honors explicit pack access and explicit denial', () => {
    expect(hasWorkflowPack(profile({
      workflow_pack_access: { 'agency-ops': true },
    }), WORKFLOW_PACK_IDS.agencyOps)).toBe(true)

    expect(hasWorkflowPack(profile({
      clinical_plan: 'clinic_enterprise',
      workflow_pack_access: { 'agency-ops': false },
    }), WORKFLOW_PACK_IDS.agencyOps)).toBe(false)
  })

  it('keeps Passage-only access from unlocking Agency Ops', () => {
    const passageOnly = profile({
      clinical_access: true,
      clinical_plan: 'passage_notes',
      workflow_pack_access: { 'passage-notes': true },
    })

    expect(hasWorkflowPack(passageOnly, WORKFLOW_PACK_IDS.passageNotes)).toBe(true)
    expect(hasWorkflowPack(passageOnly, WORKFLOW_PACK_IDS.agencyOps)).toBe(false)
  })

  it('allows Agency Ops through its plan entitlement', () => {
    expect(hasWorkflowPack(profile({
      clinical_plan: 'agency_ops',
    }), WORKFLOW_PACK_IDS.agencyOps)).toBe(true)
    expect(hasWorkflowPack(profile({
      clinical_plan: 'clinic_enterprise',
    }), WORKFLOW_PACK_IDS.agencyOps)).toBe(true)
  })

  it('blocks expired subscriptions even with plan entitlements', () => {
    expect(hasWorkflowPack(profile({
      subscription_status: 'active',
      subscription_current_period_end: '2000-01-01T00:00:00.000Z',
      clinical_plan: 'agency_ops',
    }), WORKFLOW_PACK_IDS.agencyOps)).toBe(false)
  })

  it('resolves workflow-pack price IDs from env first, then DB-backed config', () => {
    const pack = WORKFLOW_PACK_CHECKOUTS.find((item) => item.id === WORKFLOW_PACK_IDS.passageNotes)
    const configMap = new Map([
      [WORKFLOW_PACK_IDS.passageNotes, {
        monthly_price_id: 'price_db_monthly',
        annual_price_id: 'price_db_annual',
      }],
    ])

    expect(resolveWorkflowPackPriceId({}, pack, configMap, false)).toBe('price_db_monthly')
    expect(resolveWorkflowPackPriceId({}, pack, configMap, true)).toBe('price_db_annual')
    expect(resolveWorkflowPackPriceId({ STRIPE_PASSAGE_NOTES_PRICE_ID: 'price_env_monthly' }, pack, configMap, false)).toBe('price_env_monthly')
  })
})
