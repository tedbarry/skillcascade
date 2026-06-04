import { Hono } from 'hono'
import { query } from '../db.js'
import { hasPermission } from '../middleware/auth.js'
import { hasWorkflowPack, WORKFLOW_PACK_IDS } from '../lib/workflow-packs.js'
import {
  buildReportGeneratorOnboarding,
  claimReportGeneratorInstall,
  findUnsafeReportGeneratorPayloadFields,
  listReportGeneratorInstallClaims,
} from '../lib/report-generator-pilot.js'

const route = new Hono()

const REPORT_GENERATOR_CONTRACT = {
  moduleId: 'report-generator',
  label: 'Report Generator',
  route: '/report-generator',
  mode: 'local-helper-orchestrated',
  localHelper: {
    defaultUrl: 'http://127.0.0.1:4181',
    statusEndpoint: '/api/local-report-generator/status',
    installStateEndpoint: '/api/local-report-generator/install-state',
    licenseReadinessEndpoint: '/api/local-report-generator/license-readiness',
    templateProfileEndpoint: '/api/local-report-generator/template-profile',
    templateProfilesEndpoint: '/api/local-report-generator/template-profiles',
    preflightEndpoint: '/api/local-report-generator/preflight',
    runEndpoint: '/api/local-report-generator/run',
    legacyEndpoints: {
      status: '/api/local-report-pilot/status',
      installState: '/api/local-report-pilot/install-state',
      licenseReadiness: '/api/local-report-pilot/license-readiness',
      templateProfile: '/api/local-report-pilot/template-profile',
      templateProfiles: '/api/local-report-pilot/template-profiles',
      preflight: '/api/local-report-pilot/preflight',
      run: '/api/local-report-pilot/run',
    },
    readsLocalFolders: true,
    uploadsSourceFilesToSkillCascade: false,
  },
  sharedApi: {
    auth: 'Protected by the existing SkillCascade API bearer-token flow.',
    permissions: 'Requires reports.view for status and reports.edit before future server-side draft records.',
    phiBoundary: 'This route returns configuration and review gates only. Source document extraction stays in the local helper.',
  },
  templateProfile: {
    mode: 'local-docx-inspection',
    savedProfileMode: 'local-workstation-json-store',
    supportedTemplateTags: [
      'report_title',
      'client_label',
      'generated_at',
      'diagnosis_summary',
      'family_history',
      'developmental_history',
      'educational_history',
      'behavior_profile',
      'communication_profile',
      'social_profile',
      'caregiver_training',
      'missing_fields',
      'goals',
      'goals.domain',
      'goals.long_term_goal',
      'goals.short_term_goal',
      'goals.objective',
      'goals.baseline',
      'goals.current_level',
      'goals.criteria',
      'goals.target_date',
      'goals.graphs',
    ],
    unsupportedTagBehavior: 'Flag in local profile and render review markers for unmapped placeholders.',
    savedProfileBehavior: 'Customer template paths and profile summaries are saved only in the local helper data folder.',
    aliasMapBehavior: 'Saved profiles may map customer placeholder names to supported helper fields; unmapped unsupported placeholders stay visible as review markers.',
    aliasEditorMode: 'frontend-maps-unsupported-customer-placeholders-to-supported-helper-fields',
  },
  installAndLicensing: {
    helperReportsVersion: true,
    helperReportsLocalInstallFingerprint: true,
    serverSeatClaimEndpoint: '/api/report-generator/seat-claims',
    licenseReadinessMode: 'helper-identifies-install-skillcascade-authorizes-access',
    helperStoresBillingSecrets: false,
    helperCanGrantAccess: false,
    skillCascadeWorkflowPackIsAuthority: true,
    updatesPreserveCustomerData: true,
    autoUpdateEnabledInRelease: false,
  },
  reviewGates: [
    'BCBA review required before report finalization.',
    'No automatic signing.',
    'No automatic submission.',
    'No live CentralReach, Passage, payer, email, or Word Online write from this module.',
    'Unsupported or missing source fields must stay visible in QA.',
  ],
  supportedSourceTypes: ['.docx', '.txt', '.md'],
  plannedAdapters: [
    'customer_docx_template_profile',
    'goal_bank_mapping',
    'source_evidence_ledger',
    'review_summary_json',
    'editable_docx_export',
  ],
}

function getAccessError(c, action = 'view') {
  const profile = c.get('profile')

  if (!hasPermission(profile, 'reports', action)) {
    return { status: 403, payload: { error: 'Forbidden', code: 'permission_required' } }
  }
  if (!hasWorkflowPack(profile, WORKFLOW_PACK_IDS.reportGenerator)) {
    return {
      status: 403,
      payload: {
        error: 'Report Generator access required.',
        code: 'workflow_pack_required',
        requiredPack: WORKFLOW_PACK_IDS.reportGenerator,
      },
    }
  }

  return null
}

async function getJsonBody(c) {
  return c.req.json().catch(() => ({}))
}

function rejectUnsafeSeatClaim(c, body) {
  const unsafeFields = findUnsafeReportGeneratorPayloadFields(body)
  if (!unsafeFields.length) return null

  return c.json({
    error: 'This endpoint is PHI-free. Send only the helper install fingerprint and readiness metadata.',
    code: 'phi_not_allowed',
    unsafeFields,
  }, 400)
}

route.get('/status', async (c) => {
  const accessError = getAccessError(c)
  if (accessError) return c.json(accessError.payload, accessError.status)

  const profile = c.get('profile')

  return c.json({
    ok: true,
    data: {
      ...REPORT_GENERATOR_CONTRACT,
      userCanEdit: hasPermission(profile, 'reports', 'edit'),
      checkedAt: new Date().toISOString(),
    },
  })
})

route.get('/onboarding', async (c) => {
  const accessError = getAccessError(c)
  if (accessError) return c.json(accessError.payload, accessError.status)

  const profile = c.get('profile')
  return c.json({
    ok: true,
    data: buildReportGeneratorOnboarding({
      profile,
      userCanEdit: hasPermission(profile, 'reports', 'edit'),
    }),
  })
})

route.get('/seat-claims', async (c) => {
  const accessError = getAccessError(c)
  if (accessError) return c.json(accessError.payload, accessError.status)

  const profile = c.get('profile')
  const data = await listReportGeneratorInstallClaims({
    env: c.env,
    dbQuery: query,
    profile,
  })
  return c.json({ ok: true, data })
})

route.post('/seat-claims', async (c) => {
  const accessError = getAccessError(c)
  if (accessError) return c.json(accessError.payload, accessError.status)

  const body = await getJsonBody(c)
  const unsafeResponse = rejectUnsafeSeatClaim(c, body)
  if (unsafeResponse) return unsafeResponse

  try {
    const data = await claimReportGeneratorInstall({
      env: c.env,
      dbQuery: query,
      profile: c.get('profile'),
      body,
    })
    return c.json({ ok: true, data }, 201)
  } catch (error) {
    return c.json({ error: error.message, code: 'seat_claim_failed' }, 400)
  }
})

export default route
