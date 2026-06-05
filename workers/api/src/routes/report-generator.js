import { Hono } from 'hono'
import { query } from '../db.js'
import { hasPermission } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/access.js'
import { hasWorkflowPack, WORKFLOW_PACK_IDS } from '../lib/workflow-packs.js'
import {
  buildReportGeneratorOnboarding,
  claimReportGeneratorInstall,
  findUnsafeReportGeneratorPayloadFields,
  listReportGeneratorInstallClaims,
} from '../lib/report-generator-pilot.js'
import {
  REPORT_CREDIT_BUNDLES,
  adjustReportCredits,
  consumeReportCredit,
  getReportCreditBalance,
  listReportCreditLedger,
} from '../lib/report-credits.js'

const route = new Hono()
const REPORT_HELPER_FILENAME = 'SkillCascadeReportHelper-release-20260605-output-guard.zip'
const REPORT_HELPER_OBJECT_KEY = `report-generator/${REPORT_HELPER_FILENAME}`
const REPORT_HELPER_VERSION = 'release-20260605-output-guard'

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
    pickFolderEndpoint: '/api/local-report-generator/pick-folder',
    pickFileEndpoint: '/api/local-report-generator/pick-file',
    preflightEndpoint: '/api/local-report-generator/preflight',
    runEndpoint: '/api/local-report-generator/run',
    legacyEndpoints: {
      status: '/api/local-report-pilot/status',
      installState: '/api/local-report-pilot/install-state',
      licenseReadiness: '/api/local-report-pilot/license-readiness',
      templateProfile: '/api/local-report-pilot/template-profile',
      templateProfiles: '/api/local-report-pilot/template-profiles',
      pickFolder: '/api/local-report-pilot/pick-folder',
      pickFile: '/api/local-report-pilot/pick-file',
      preflight: '/api/local-report-pilot/preflight',
      run: '/api/local-report-pilot/run',
    },
    nativePathPicker: {
      supported: true,
      mode: 'local-helper-opens-native-windows-dialog',
      returnsPathOnly: true,
      sourceFolderCanAlsoBeOutputFolder: true,
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
    helperPackageStatusEndpoint: '/api/report-generator/helper/status',
    helperPackageDownloadEndpoint: '/api/report-generator/helper/download',
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
      helperPackage: {
        filename: REPORT_HELPER_FILENAME,
        version: REPORT_HELPER_VERSION,
        statusPath: '/api/report-generator/helper/status',
        downloadPath: '/api/report-generator/helper/download',
      },
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

route.get('/credits/status', async (c) => {
  const accessError = getAccessError(c)
  if (accessError) return c.json(accessError.payload, accessError.status)

  const profile = c.get('profile')
  const balance = await getReportCreditBalance({
    env: c.env,
    dbQuery: query,
    userId: profile.id,
  })
  const ledger = await listReportCreditLedger({
    env: c.env,
    dbQuery: query,
    userId: profile.id,
    limit: 10,
  })

  return c.json({
    ok: true,
    data: {
      balance,
      unit: 'report_credit',
      bundles: REPORT_CREDIT_BUNDLES,
      ledger,
      checkedAt: new Date().toISOString(),
    },
  })
})

route.post('/credits/consume', async (c) => {
  const accessError = getAccessError(c, 'edit')
  if (accessError) return c.json(accessError.payload, accessError.status)

  const body = await getJsonBody(c)
  const unsafeResponse = rejectUnsafeSeatClaim(c, body)
  if (unsafeResponse) return unsafeResponse

  try {
    const profile = c.get('profile')
    const result = await consumeReportCredit({
      env: c.env,
      dbQuery: query,
      userId: profile.id,
      orgId: profile.org_id || null,
      credits: 1,
      externalEventId: String(body.externalEventId || ''),
      description: 'Report draft generated',
      metadata: {
        helperVersion: String(body.helperVersion || ''),
        templateMode: String(body.templateMode || ''),
      },
    })
    const balance = await getReportCreditBalance({
      env: c.env,
      dbQuery: query,
      userId: profile.id,
    })
    return c.json({
      ok: true,
      data: {
        balance,
        consumed: result.alreadyRecorded ? 0 : 1,
        alreadyRecorded: result.alreadyRecorded,
      },
    })
  } catch (error) {
    if (error.code === 'insufficient_report_credits') {
      return c.json({
        error: error.message,
        code: error.code,
        balance: error.balance || 0,
      }, 402)
    }
    return c.json({
      error: error.message || 'Could not consume report credit.',
      code: 'report_credit_consume_failed',
    }, 400)
  }
})

route.post('/credits/manual-adjustment', async (c) => {
  const accessError = getAccessError(c, 'edit')
  if (accessError) return c.json(accessError.payload, accessError.status)

  const profile = c.get('profile')
  if (!requireAdmin(profile)) {
    return c.json({ error: 'Admin access required.', code: 'admin_required' }, 403)
  }

  const body = await getJsonBody(c)
  const unsafeResponse = rejectUnsafeSeatClaim(c, body)
  if (unsafeResponse) return unsafeResponse

  const targetUserId = String(body.targetUserId || profile.id || '').trim()
  if (!targetUserId) return c.json({ error: 'targetUserId is required.', code: 'target_user_required' }, 400)
  if (targetUserId !== profile.id && !profile.is_super_admin) {
    return c.json({ error: 'Only super admins can adjust another user.', code: 'super_admin_required' }, 403)
  }

  try {
    const entry = await adjustReportCredits({
      env: c.env,
      dbQuery: query,
      userId: targetUserId,
      orgId: profile.org_id || null,
      creditsDelta: Number(body.creditsDelta),
      description: body.description || 'Manual report credit adjustment',
      metadata: {
        reason: String(body.reason || 'admin_adjustment').slice(0, 120),
        adjustedBy: profile.id,
        source: 'report-generator-admin-api',
      },
    })
    const balance = await getReportCreditBalance({
      env: c.env,
      dbQuery: query,
      userId: targetUserId,
    })
    return c.json({
      ok: true,
      data: {
        balance,
        entry: {
          id: entry?.id || '',
          creditsDelta: entry?.credits_delta || Number(body.creditsDelta),
          eventType: 'manual_adjustment',
        },
      },
    })
  } catch (error) {
    return c.json({
      error: error.message || 'Could not adjust report credits.',
      code: 'report_credit_adjustment_failed',
    }, 400)
  }
})

route.get('/helper/status', async (c) => {
  const accessError = getAccessError(c)
  if (accessError) return c.json(accessError.payload, accessError.status)

  const bucket = c.env.CONNECTOR_ARTIFACTS
  if (!bucket) {
    return c.json({
      ok: false,
      code: 'helper_bucket_missing',
      filename: REPORT_HELPER_FILENAME,
      version: REPORT_HELPER_VERSION,
      error: 'Helper package storage is not configured.',
    }, 503)
  }

  const head = await bucket.head(REPORT_HELPER_OBJECT_KEY)
  return c.json({
    ok: Boolean(head),
    filename: REPORT_HELPER_FILENAME,
    version: REPORT_HELPER_VERSION,
    size: head?.size || 0,
    uploadedAt: head?.uploaded?.toISOString?.() || '',
    downloadPath: '/api/report-generator/helper/download',
    installSteps: [
      'Download the helper package.',
      'Unzip it on the Windows computer that has the report files.',
      'Run Install-ReportGeneratorHelper.exe from the unzipped folder.',
      'Return to SkillCascade and click Check setup.',
    ],
    error: head ? '' : 'Helper package is not available yet.',
  }, head ? 200 : 404)
})

route.get('/helper/download', async (c) => {
  const accessError = getAccessError(c)
  if (accessError) return c.json(accessError.payload, accessError.status)

  const bucket = c.env.CONNECTOR_ARTIFACTS
  if (!bucket) {
    return c.json({
      ok: false,
      code: 'helper_bucket_missing',
      error: 'Helper package storage is not configured.',
    }, 503)
  }

  const object = await bucket.get(REPORT_HELPER_OBJECT_KEY)
  if (!object) {
    return c.json({
      ok: false,
      code: 'helper_package_missing',
      filename: REPORT_HELPER_FILENAME,
      error: 'Helper package was not found.',
    }, 404)
  }

  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/zip')
  headers.set('Content-Disposition', `attachment; filename="${REPORT_HELPER_FILENAME}"`)
  headers.set('Cache-Control', 'private, no-store')
  headers.set('X-SkillCascade-Report-Helper-Version', REPORT_HELPER_VERSION)
  if (object.size) headers.set('Content-Length', String(object.size))
  return new Response(object.body, { headers })
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
