export const PRODUCTIZATION_PHASES = [
  {
    id: 'intake',
    label: 'Assessment Intake',
    status: 'foundation',
    owner: 'Hosted app',
    summary: 'Collect source documents, classify them, and build a missing-field map before any report text is drafted.',
    gates: ['source inventory', 'PHI boundary', 'missing-data review'],
    outputs: ['source ledger', 'redacted operator summary', 'missing-field checklist'],
  },
  {
    id: 'report',
    label: 'Report Drafting',
    status: 'build-next',
    owner: 'Hosted app',
    summary: 'Draft initial assessment reports in the established Word format while preserving house style and clinician review.',
    gates: ['template match', 'clinician approval', 'no invented data'],
    outputs: ['draft docx', 'highlighted gaps', 'evidence trace'],
  },
  {
    id: 'goals',
    label: 'Goal Planner',
    status: 'build-next',
    owner: 'Hosted app',
    summary: 'Recommend behavior, communication, social, and parent training goals from evaluation evidence and the canonical library.',
    gates: ['medical necessity', 'FERB mapping', 'BCBA selection'],
    outputs: ['goal table', 'FERB map', 'long-short-objective hierarchy'],
  },
  {
    id: 'centralreach',
    label: 'CentralReach Tree Prep',
    status: 'guarded',
    owner: 'Desktop companion',
    summary: 'Turn approved goal rows into a dry-run learning tree plan before supervised CentralReach mutation.',
    gates: ['dry run', 'explicit approval', 'post-write verification'],
    outputs: ['tree preview', 'mutation checklist', 'verification report'],
  },
  {
    id: 'commercial',
    label: 'Commercial Packaging',
    status: 'later',
    owner: 'Hosted app',
    summary: 'Package the workflow as licensed access with seats, audit logs, billing, support, and update channels.',
    gates: ['license check', 'audit trail', 'support boundary'],
    outputs: ['org accounts', 'seat controls', 'usage/audit dashboard'],
  },
]

export const PRODUCTIZATION_GUARDRAILS = [
  {
    id: 'aws-phi-zone',
    label: 'AWS-first PHI zone',
    detail: 'PHI-capable prompts, files, reports, and logs must stay on approved AWS/BAA-covered paths.',
    severity: 'must',
  },
  {
    id: 'human-approval',
    label: 'Human approval before external action',
    detail: 'Report finalization, emails, CentralReach writes, uploads, billing, and clinical record mutations require approval.',
    severity: 'must',
  },
  {
    id: 'no-secret-sprawl',
    label: 'No committed or cached secrets',
    detail: 'Secrets belong in ignored local env files or platform secret managers, never paste caches or source.',
    severity: 'must',
  },
  {
    id: 'draft-first',
    label: 'Draft-first clinical outputs',
    detail: 'AI can draft and organize; the clinician/operator decides what becomes final.',
    severity: 'must',
  },
  {
    id: 'desktop-thin-client',
    label: 'Desktop app stays thin',
    detail: 'The optional installer should assist local files and browser automation, not expose the proprietary engine offline.',
    severity: 'should',
  },
]

export const PRODUCTIZATION_ACTIONS = [
  {
    id: 'job-model',
    phase: 'intake',
    priority: 'now',
    title: 'Create draft job model',
    detail: 'Define assessment jobs, sources, missing fields, goal candidates, approvals, and export artifacts.',
  },
  {
    id: 'upload-ledger',
    phase: 'intake',
    priority: 'now',
    title: 'Build source ledger',
    detail: 'Track which documents were used, which sections were extracted, and which fields are still unverified.',
  },
  {
    id: 'docx-export',
    phase: 'report',
    priority: 'next',
    title: 'Wire Word export',
    detail: 'Generate the initial assessment draft in the existing template shape with highlighted gaps.',
  },
  {
    id: 'goal-review',
    phase: 'goals',
    priority: 'next',
    title: 'Add goal review queue',
    detail: 'Let the BCBA accept, revise, reject, and map goals before they enter reports or learning trees.',
  },
  {
    id: 'tree-dry-run',
    phase: 'centralreach',
    priority: 'guarded',
    title: 'Add CentralReach dry run',
    detail: 'Preview the exact Behavior, Communication, Social, and Parent Training tree before any live write.',
  },
]

export function buildProductizationSummary({
  phases = PRODUCTIZATION_PHASES,
  guardrails = PRODUCTIZATION_GUARDRAILS,
  actions = PRODUCTIZATION_ACTIONS,
} = {}) {
  const activePhases = phases.filter((phase) => phase.status !== 'later')
  const mustGuardrails = guardrails.filter((guardrail) => guardrail.severity === 'must')
  const nowActions = actions.filter((action) => action.priority === 'now')

  return {
    phaseCount: phases.length,
    activePhaseCount: activePhases.length,
    guardrailCount: guardrails.length,
    mustGuardrailCount: mustGuardrails.length,
    nextActionCount: nowActions.length,
    nextPhaseLabels: activePhases.map((phase) => phase.label),
  }
}

export function getProductizationStageTone(status) {
  switch (status) {
    case 'foundation':
      return 'border-sage-200 bg-sage-50 text-sage-800'
    case 'build-next':
      return 'border-blue-200 bg-blue-50 text-blue-800'
    case 'guarded':
      return 'border-amber-200 bg-amber-50 text-amber-800'
    case 'later':
      return 'border-warm-200 bg-warm-50 text-warm-600'
    default:
      return 'border-warm-200 bg-white text-warm-700'
  }
}
