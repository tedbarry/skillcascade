export const WORKFLOW_PACK_IDS = {
  passageNotes: 'passage-notes',
  skillcascadeCore: 'skillcascade-core',
  reportGenerator: 'report-generator',
  agencyOps: 'agency-ops',
}

export const REPORT_CREDIT_BUNDLES = [
  {
    id: 'report-credit-1',
    name: 'Single report',
    credits: 1,
    amountCents: 5000,
    priceLabel: '$50',
    unitPriceLabel: '$50/report',
    savingsLabel: '',
    description: 'Buy one report draft credit for a single assessment or reassessment.',
  },
  {
    id: 'report-credit-5',
    name: '5-report pack',
    credits: 5,
    amountCents: 22500,
    priceLabel: '$225',
    unitPriceLabel: '$45/report',
    savingsLabel: 'Save 10%',
    description: 'A small agency batch for several reports in the same billing cycle.',
  },
  {
    id: 'report-credit-10',
    name: '10-report pack',
    credits: 10,
    amountCents: 40000,
    priceLabel: '$400',
    unitPriceLabel: '$40/report',
    savingsLabel: 'Save 20%',
    description: 'Best for agencies that already know they have a report backlog.',
  },
]

export const WORKFLOW_PACKS = [
  {
    id: WORKFLOW_PACK_IDS.passageNotes,
    name: 'Passage Runner',
    shortName: 'Notes Automation',
    eyebrow: 'Live pilot',
    route: '/passage-runner',
    onboardingRoute: '/workflow-packs/passage-notes/onboarding',
    status: 'available',
    accessLabel: 'Passage Notes pack',
    checkoutPlan: 'passage_notes',
    priceLabel: '$1,500/mo pilot',
    monthlyPriceLabel: '$1,500/mo',
    annualPriceLabel: '$15,000/yr',
    monthlyAmountCents: 150000,
    annualAmountCents: 1500000,
    purchaseMode: 'checkout-or-sales',
    summary:
      'Prepare BCBA Passage notes as saved drafts, open review tabs, and keep signing under the clinician.',
    buyerSummary:
      'For clinics that want Passage note drafting and review queues before a deeper platform rollout.',
    outputs: ['Saved note drafts', 'Review tab queue', 'Unsigned-draft status map'],
    boundaries: ['Never signs notes', 'Local helper required', 'Human review remains required'],
    entitlementPlans: ['passage_notes', 'passage_bcba_notes', 'notes_all', 'clinic_enterprise', 'clinical_platform'],
    allowLegacyClinicalAccess: true,
  },
  {
    id: WORKFLOW_PACK_IDS.skillcascadeCore,
    name: 'SkillCascade Platform',
    shortName: 'Assessment Platform',
    eyebrow: 'Core system',
    route: '/dashboard',
    onboardingRoute: '/dashboard',
    status: 'available',
    accessLabel: 'Platform subscription',
    checkoutPlan: 'skillcascade_core',
    priceLabel: 'Custom access',
    purchaseMode: 'sales-led',
    summary:
      'Assessment, visualization, goals, reports, graph review, and clinical evidence workspaces.',
    buyerSummary:
      'The broader clinical platform. Keep this separate from note automation while the product strategy settles.',
    outputs: ['Assessment workspace', 'Goal and report tools', 'Clinical dashboards'],
    boundaries: ['BCBA review required', 'Not an EHR replacement', 'No automatic external writes'],
    entitlementPlans: [],
    allowLegacyClinicalAccess: false,
  },
  {
    id: WORKFLOW_PACK_IDS.reportGenerator,
    name: 'Report Generator',
    shortName: 'Reports',
    eyebrow: 'Controlled release',
    route: '/report-generator',
    onboardingRoute: '/workflow-packs/report-generator/onboarding',
    status: 'available',
    accessLabel: 'Report workflow pack',
    checkoutPlan: 'report_generator',
    priceLabel: '$50/report',
    monthlyPriceLabel: '$50/report',
    annualPriceLabel: 'Credit packs',
    monthlyAmountCents: 5000,
    annualAmountCents: 0,
    purchaseMode: 'usage-credits',
    usageModel: {
      unit: 'report_credit',
      label: 'Report credits',
      bundles: REPORT_CREDIT_BUNDLES,
    },
    summary:
      'Turn assessments, graphs, notes, and source files into review-ready authorization and reassessment reports.',
    buyerSummary:
      'A controlled-release report workflow for agencies that want local source review, Word template adaptation, and BCBA approval gates.',
    outputs: ['Draft reports', 'Source-backed sections', 'Export-ready files', 'Credit balance'],
    boundaries: ['No unsupported claims', 'Human clinical approval required', 'Source provenance required', 'One credit per generated draft'],
    entitlementPlans: ['reports', 'reports_all', 'clinic_enterprise'],
    allowLegacyClinicalAccess: false,
  },
  {
    id: WORKFLOW_PACK_IDS.agencyOps,
    name: 'Agency Ops',
    shortName: 'Ops Automation',
    eyebrow: 'Scoping',
    route: '/agency-ops',
    onboardingRoute: '/workflow-packs/agency-ops/onboarding',
    status: 'planned',
    accessLabel: 'Agency operations pack',
    checkoutPlan: 'agency_ops',
    priceLabel: '$799/mo pilot',
    monthlyPriceLabel: '$799/mo',
    annualPriceLabel: '$7,990/yr',
    monthlyAmountCents: 79900,
    annualAmountCents: 799000,
    purchaseMode: 'sales-led',
    summary:
      'Workflow packs for note QA, VOB, IntakeQ handoff, scheduling, onboarding, and admin reconciliation.',
    buyerSummary:
      'The operations layer that can be sold module by module after each workflow has a verified source-of-truth path.',
    outputs: ['Review queues', 'Decision logs', 'Approval-gated action drafts'],
    boundaries: ['Approval before sends', 'Approval before external marking', 'No hidden Passage writes'],
    entitlementPlans: ['agency_ops', 'clinic_enterprise'],
    allowLegacyClinicalAccess: false,
  },
]

export function getWorkflowPack(packId) {
  return WORKFLOW_PACKS.find((pack) => pack.id === packId) || WORKFLOW_PACKS[0]
}

export function isSubscriptionActive(subscription) {
  if (!subscription) return false
  if (subscription.current_period_end && new Date(subscription.current_period_end) < new Date()) return false
  return subscription.status === 'active' || subscription.status === 'trialing'
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

export function canAccessWorkflowPack(packId, {
  subscription,
  isSuperAdmin = false,
} = {}) {
  if (isSuperAdmin) return true

  const pack = getWorkflowPack(packId)
  const active = isSubscriptionActive(subscription)
  if (!active) return false

  if (pack.id === WORKFLOW_PACK_IDS.skillcascadeCore) {
    return ['solo', 'practice', 'enterprise'].includes(subscription?.plan)
  }

  const explicitPackAccess = parseWorkflowPackAccess(subscription?.workflow_pack_access)
  if (Object.prototype.hasOwnProperty.call(explicitPackAccess, pack.id)) {
    return explicitPackAccess[pack.id] === true
  }

  const clinicalPlan = String(subscription?.clinical_plan || '').toLowerCase()
  const clinicalAccess = subscription?.clinical_access === true

  if (pack.entitlementPlans.includes(clinicalPlan)) return true
  if (pack.allowLegacyClinicalAccess && clinicalAccess) return true

  return false
}
