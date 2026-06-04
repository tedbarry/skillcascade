import { Hono } from 'hono'
import { hasPermission } from '../middleware/auth.js'
import { hasWorkflowPack, WORKFLOW_PACK_IDS } from '../lib/workflow-packs.js'

const route = new Hono()

const REPORT_GENERATOR_CONTRACT = {
  moduleId: 'report-generator',
  label: 'Report Generator',
  route: '/report-generator',
  mode: 'local-helper-orchestrated',
  localHelper: {
    defaultUrl: 'http://127.0.0.1:4181',
    statusEndpoint: '/api/local-report-pilot/status',
    installStateEndpoint: '/api/local-report-pilot/install-state',
    licenseReadinessEndpoint: '/api/local-report-pilot/license-readiness',
    templateProfileEndpoint: '/api/local-report-pilot/template-profile',
    templateProfilesEndpoint: '/api/local-report-pilot/template-profiles',
    runEndpoint: '/api/local-report-pilot/run',
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
    licenseReadinessMode: 'helper-identifies-install-skillcascade-authorizes-access',
    helperStoresBillingSecrets: false,
    helperCanGrantAccess: false,
    skillCascadeWorkflowPackIsAuthority: true,
    updatesPreserveCustomerData: true,
    autoUpdateEnabledInMvp: false,
  },
  reviewGates: [
    'BCBA review required before report finalization.',
    'No automatic signing.',
    'No automatic submission.',
    'No live CentralReach, Passage, payer, email, or Word Online write from this module.',
    'Unsupported or missing source fields must stay visible in QA.',
  ],
  supportedPilotSources: ['.docx', '.txt', '.md'],
  plannedAdapters: [
    'customer_docx_template_profile',
    'goal_bank_mapping',
    'source_evidence_ledger',
    'review_summary_json',
    'editable_docx_export',
  ],
}

route.get('/status', async (c) => {
  const profile = c.get('profile')

  if (!hasPermission(profile, 'reports', 'view')) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  if (!hasWorkflowPack(profile, WORKFLOW_PACK_IDS.reportGenerator)) {
    return c.json({
      error: 'Report Generator access required.',
      code: 'workflow_pack_required',
      requiredPack: WORKFLOW_PACK_IDS.reportGenerator,
    }, 403)
  }

  return c.json({
    ok: true,
    data: {
      ...REPORT_GENERATOR_CONTRACT,
      userCanEdit: hasPermission(profile, 'reports', 'edit'),
      checkedAt: new Date().toISOString(),
    },
  })
})

export default route
