import { Hono } from 'hono'
import { hasPermission } from '../middleware/auth.js'

const route = new Hono()

const REPORT_GENERATOR_CONTRACT = {
  moduleId: 'report-generator',
  label: 'Report Generator',
  route: '/report-generator',
  mode: 'local-helper-orchestrated',
  localHelper: {
    defaultUrl: 'http://127.0.0.1:4181',
    statusEndpoint: '/api/local-report-pilot/status',
    runEndpoint: '/api/local-report-pilot/run',
    readsLocalFolders: true,
    uploadsSourceFilesToSkillCascade: false,
  },
  sharedApi: {
    auth: 'Protected by the existing SkillCascade API bearer-token flow.',
    permissions: 'Requires reports.view for status and reports.edit before future server-side draft records.',
    phiBoundary: 'This route returns configuration and review gates only. Source document extraction stays in the local helper.',
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
