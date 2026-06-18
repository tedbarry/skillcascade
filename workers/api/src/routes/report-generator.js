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
const DEFAULT_REPORT_HELPER_RELEASE = {
  channel: 'controlled-release',
  version: 'release-20260618-tree-adapter-v9',
  minimumVersion: 'release-20260618-tree-adapter-v9',
  helperRuntimeVersion: '0.1.0',
  filename: 'SkillCascadeReportHelper-release-20260618-tree-adapter-v9.zip',
  objectKey: 'report-generator/SkillCascadeReportHelper-release-20260618-tree-adapter-v9.zip',
  sha256: 'D83B3E735AC5BBD8EB8A5FD4229543C6E2869EA5E16AE560210A2A4C7588F58F',
  installerName: 'Install-ReportGeneratorHelper.exe',
  packageRootName: 'SkillCascadeReportHelper-release-20260618-tree-adapter-v9',
  requiredInstallFlow: 'download-zip-extract-run-installer-from-extracted-folder',
  autoUpdateEnabled: false,
}
const REPORT_HELPER_MANIFEST_KEY = 'report-generator/latest-helper.json'
const UNLIMITED_OWNER_TEST_BALANCE = 999999
const STANDARD_REPORT_TEMPLATE = {
  id: 'skillcascade-standard-initial-assessment-v1',
  label: 'SkillCascade Standard Initial Assessment',
  reportType: 'initial-assessment',
  mode: 'skillcascade-standard-docx',
  controlledBy: 'skillcascade',
  customerTemplateUpload: false,
}
const INITIAL_ASSESSMENT_PROGRAM_SETUP = {
  id: 'initial-assessment-learning-tree-v1',
  workflow: 'initial-assessment',
  destinations: ['centralreach', 'passage'],
  domainOrder: ['Behavior', 'Communication', 'Social', 'Parent Training'],
  hierarchy: ['domain', 'long_term_cumulative', 'short_term_cumulative', 'final_data_collection_target'],
  dataRules: {
    maladaptiveBehaviorType: 'datafrequency2',
    percentTargetType: 'datapercent',
    percentTrialCount: 10,
    activateCreatedBranches: true,
  },
  localHelperEndpoints: {
    preview: '/api/local-report-generator/program-setup/preview',
    write: '/api/local-report-generator/program-setup/write',
    verify: '/api/local-report-generator/program-setup/verify',
  },
  liveAdapter: {
    contractId: 'initial-assessment-learning-tree-live-adapter-v1',
    supportedModes: ['local_setup_package', 'adapter_dry_run', 'live_external_write'],
    liveWritesDefault: false,
    liveWritesCurrentlyEnabled: false,
    approvalRequired: true,
    requiredConfirmation: 'CREATE LEARNING TREE',
    currentWriteMode: 'local_setup_package_and_adapter_proof_only',
  },
}
const REQUIRED_EVIDENCE_CATEGORIES = [
  {
    id: 'diagnostic_or_psychological_evaluation',
    label: 'Diagnosis / Psychological Evaluation',
    required: true,
    examples: 'diagnostic report, psychological evaluation, or diagnosis document',
  },
  {
    id: 'intake_or_caregiver_history',
    label: 'Intake / Caregiver History',
    required: true,
    examples: 'intake form, caregiver interview, or parent history document',
  },
  {
    id: 'adaptive_or_functional_assessment',
    label: 'Adaptive / Functional Assessment',
    required: true,
    examples: 'Vineland, ABAS, AFLS, VB-MAPP, ABLLS, or similar adaptive/skill assessment',
  },
]
const SUPERVISOR_REVIEWED_REPORT_STYLE = {
  id: 'supervisor-reviewed-aba-initial-v1',
  label: 'Supervisor-reviewed ABA initial report style',
  appliesTo: 'initial-assessment',
  standardTemplateOnly: true,
  checkboxFont: 'Segoe UI Symbol',
  writingRules: [
    'Write report prose as current clinical functioning when supported by records, not as one-time observation language outside observation sections.',
    'Use only source-supported facts; missing facts remain visible as review-needed fields instead of being invented.',
    'Do not mention assessment instruments, scores, graphics, or profile images unless that assessment is detected in the current local records.',
    'Do not leave internal workflow phrases, template instructions, reviewer scaffolding, or customer-template remnants in the visible report.',
    'Use SkillCascade standard initial assessment wording, transition language, medical-necessity language, risk boxes, and PCP coordination defaults.',
  ],
  blockedVisibleReportPhrases: [
    'source packet',
    'local source packet',
    'provided source',
    'sample rationales',
    'can delete',
    'TBD',
    'TODO',
  ],
}

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
    pickFolderEndpoint: '/api/local-report-generator/pick-folder',
    preflightEndpoint: '/api/local-report-generator/preflight',
    runEndpoint: '/api/local-report-generator/run',
    legacyEndpoints: {
      status: '/api/local-report-pilot/status',
      installState: '/api/local-report-pilot/install-state',
      licenseReadiness: '/api/local-report-pilot/license-readiness',
      pickFolder: '/api/local-report-pilot/pick-folder',
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
  standardTemplate: STANDARD_REPORT_TEMPLATE,
  supervisorReviewedStyle: SUPERVISOR_REVIEWED_REPORT_STYLE,
  templatePolicy: {
    customerTemplateUpload: false,
    customTemplateAccepted: false,
    message: 'SkillCascade uses the standard initial assessment template automatically. Customer template upload is not part of this workflow.',
  },
  sourceRequirements: {
    requiredEvidenceCategories: REQUIRED_EVIDENCE_CATEGORIES,
    customerTemplateUpload: false,
    evidenceGate: 'preflight-and-run-block-when-required-clinical-source-categories-are-missing',
    sourceTextReturnPolicy: 'Local helper extracts source text locally but does not return PHI excerpts to SkillCascade.',
  },
  assessmentAdapters: {
    mode: 'local-source-type-detection-and-deficit-crosswalk',
    supportedFamilies: [
      'psychological_evaluation',
      'intake',
      'vineland',
      'srs2',
      'abas',
      'vbmapp',
      'ablls_afls',
      'fba_bip',
      'speech_language',
      'ot_sensory',
      'school_iep',
      'ados2',
    ],
    output: 'detected assessment inputs, source-supported deficit domains, missing-evidence blockers, and goal-domain readiness',
  },
  programSetup: INITIAL_ASSESSMENT_PROGRAM_SETUP,
  installAndLicensing: {
    helperReportsVersion: true,
    helperReportsLocalInstallFingerprint: true,
    latestHelperManifestEndpoint: '/api/report-generator/helper/latest',
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
    'Required diagnosis/evaluation, intake/history, and adaptive/functional assessment evidence must be present before generation.',
    'Visible report text must pass the supervisor-reviewed ABA initial report style QA gate before the helper writes the draft DOCX.',
  ],
  supportedSourceTypes: ['.docx', '.txt', '.md'],
  plannedAdapters: [
    'skillcascade_standard_template_renderer',
    'diagnosis_psych_eval_adapter',
    'intake_history_adapter',
    'vineland_adaptive_crosswalk',
    'srs2_social_crosswalk',
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

function getUnlimitedReportUserIds(env) {
  return new Set(String(env.REPORT_GENERATOR_UNLIMITED_USER_IDS || '')
    .split(/[\s,;]+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean))
}

function hasUnlimitedReportCredits(c, profile) {
  const allowlist = getUnlimitedReportUserIds(c.env)
  return Boolean(profile?.id && allowlist.has(String(profile.id).toLowerCase()))
}

function normalizeHelperRelease(value = {}) {
  const source = value && typeof value === 'object' ? value : {}
  const version = String(source.version || source.currentVersion || DEFAULT_REPORT_HELPER_RELEASE.version).trim()
  const filename = String(source.filename || source.helperZip || DEFAULT_REPORT_HELPER_RELEASE.filename).trim()
  const objectKey = String(source.objectKey || source.r2ObjectKey || (filename ? `report-generator/${filename}` : DEFAULT_REPORT_HELPER_RELEASE.objectKey)).trim()
  const minimumVersion = String(source.minimumVersion || source.requiredVersion || version || DEFAULT_REPORT_HELPER_RELEASE.minimumVersion).trim()
  const supportedVersions = Array.isArray(source.supportedVersions)
    ? source.supportedVersions.map((item) => String(item || '').trim()).filter(Boolean)
    : []

  return {
    channel: String(source.channel || source.releaseChannel || DEFAULT_REPORT_HELPER_RELEASE.channel).trim(),
    version,
    currentVersion: version,
    minimumVersion,
    requiredVersion: minimumVersion,
    helperRuntimeVersion: String(source.helperRuntimeVersion || source.helperVersion || DEFAULT_REPORT_HELPER_RELEASE.helperRuntimeVersion).trim(),
    filename,
    objectKey,
    sha256: String(source.sha256 || source.helperZipSha256 || DEFAULT_REPORT_HELPER_RELEASE.sha256).trim(),
    installerName: String(source.installerName || source.installerLauncher || DEFAULT_REPORT_HELPER_RELEASE.installerName).trim(),
    packageRootName: String(source.packageRootName || source.packageName || filename.replace(/\.zip$/i, '') || DEFAULT_REPORT_HELPER_RELEASE.packageRootName).trim(),
    requiredInstallFlow: String(source.requiredInstallFlow || DEFAULT_REPORT_HELPER_RELEASE.requiredInstallFlow).trim(),
    autoUpdateEnabled: source.autoUpdateEnabled === true,
    supportedVersions: [...new Set([version, minimumVersion, ...supportedVersions].filter(Boolean))],
    downloadPath: '/api/report-generator/helper/download',
    latestPath: '/api/report-generator/helper/latest',
  }
}

async function readJsonObjectFromR2(bucket, objectKey) {
  if (!bucket || !objectKey) return null
  try {
    const object = await bucket.get(objectKey)
    if (!object) return null
    const text = typeof object.text === 'function'
      ? await object.text()
      : typeof object.body?.text === 'function'
        ? await object.body.text()
        : ''
    if (!text) return null
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function getReportHelperRelease(c) {
  const bucket = c.env.CONNECTOR_ARTIFACTS
  const manifestKey = String(c.env.REPORT_HELPER_LATEST_MANIFEST_KEY || REPORT_HELPER_MANIFEST_KEY)
  const manifest = await readJsonObjectFromR2(bucket, manifestKey)
  return normalizeHelperRelease(manifest || DEFAULT_REPORT_HELPER_RELEASE)
}

function helperReleaseAcceptsVersion(release, packageVersion = '', helperVersion = '') {
  const accepted = new Set([
    ...(release?.supportedVersions || []),
    release?.version,
    release?.minimumVersion,
    release?.helperRuntimeVersion,
  ].map((value) => String(value || '').trim()).filter(Boolean))
  const installedPackage = String(packageVersion || '').trim()
  const installedHelper = String(helperVersion || '').trim()
  return Boolean((installedPackage && accepted.has(installedPackage)) || (installedHelper && accepted.has(installedHelper)))
}

function validateReportRunProof(body = {}, release) {
  const proof = body.runProof && typeof body.runProof === 'object' ? body.runProof : null
  if (!proof) {
    const error = new Error('A successful helper run proof is required before consuming a report credit.')
    error.code = 'report_run_proof_required'
    throw error
  }

  const normalized = {
    idempotencyKey: String(proof.idempotencyKey || proof.localRunId || '').trim().slice(0, 160),
    localRunId: String(proof.localRunId || '').trim().slice(0, 160),
    helperVersion: String(proof.helperVersion || '').trim().slice(0, 80),
    packageVersion: String(proof.packageVersion || '').trim().slice(0, 80),
    templateMode: String(proof.templateMode || '').trim().slice(0, 120),
    templateId: String(proof.templateId || '').trim().slice(0, 120),
    generatedAt: String(proof.generatedAt || '').trim().slice(0, 80),
    qaStatus: String(proof.qaStatus || '').trim().slice(0, 80),
    outputCreated: proof.outputCreated === true,
    reviewCreated: proof.reviewCreated === true,
    evidenceLedgerCreated: proof.evidenceLedgerCreated === true,
    localOnly: proof.localOnly !== false,
  }

  if (!normalized.idempotencyKey || !normalized.localRunId) {
    const error = new Error('Run proof must include a local run id and idempotency key.')
    error.code = 'report_run_proof_invalid'
    throw error
  }
  if (!normalized.outputCreated || !normalized.reviewCreated || !normalized.evidenceLedgerCreated) {
    const error = new Error('Run proof must show that the draft, review summary, and evidence ledger were created.')
    error.code = 'report_run_not_created'
    throw error
  }
  if (normalized.qaStatus !== 'ready-for-bcba-review') {
    const error = new Error('Run proof must come from a draft that passed the helper QA gate.')
    error.code = 'report_run_qa_not_ready'
    throw error
  }
  if (normalized.templateMode !== STANDARD_REPORT_TEMPLATE.mode || normalized.templateId !== STANDARD_REPORT_TEMPLATE.id) {
    const error = new Error('Run proof must use the current SkillCascade standard report template.')
    error.code = 'report_run_template_mismatch'
    throw error
  }
  if (!helperReleaseAcceptsVersion(release, normalized.packageVersion, normalized.helperVersion)) {
    const error = new Error('Helper connected, but outdated. Download the latest helper before consuming report credits.')
    error.code = 'helper_update_required'
    error.installed = normalized.packageVersion || normalized.helperVersion || ''
    error.required = release?.minimumVersion || release?.version || ''
    throw error
  }

  return normalized
}

route.get('/status', async (c) => {
  const accessError = getAccessError(c)
  if (accessError) return c.json(accessError.payload, accessError.status)

  const profile = c.get('profile')
  const helperRelease = await getReportHelperRelease(c)

  return c.json({
    ok: true,
    data: {
      ...REPORT_GENERATOR_CONTRACT,
      userCanEdit: hasPermission(profile, 'reports', 'edit'),
      helperPackage: {
        ...helperRelease,
        statusPath: '/api/report-generator/helper/status',
        downloadPath: '/api/report-generator/helper/download',
        latestPath: '/api/report-generator/helper/latest',
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
  const unlimited = hasUnlimitedReportCredits(c, profile)
  const balance = unlimited ? UNLIMITED_OWNER_TEST_BALANCE : await getReportCreditBalance({
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
      unlimited,
      creditMode: unlimited ? 'owner_unlimited_test' : 'metered',
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
    const helperRelease = await getReportHelperRelease(c)
    const runProof = validateReportRunProof(body, helperRelease)
    const externalEventId = `report-run:${profile.id}:${runProof.idempotencyKey}`

    if (hasUnlimitedReportCredits(c, profile)) {
      return c.json({
        ok: true,
        data: {
          balance: UNLIMITED_OWNER_TEST_BALANCE,
          consumed: 0,
          alreadyRecorded: false,
          unlimited: true,
          creditMode: 'owner_unlimited_test',
          runProofAccepted: true,
        },
      })
    }

    const result = await consumeReportCredit({
      env: c.env,
      dbQuery: query,
      userId: profile.id,
      orgId: profile.org_id || null,
      credits: 1,
      externalEventId,
      description: 'Report draft generated',
      metadata: {
        helperVersion: runProof.helperVersion,
        packageVersion: runProof.packageVersion,
        templateMode: runProof.templateMode,
        templateId: runProof.templateId,
        localRunId: runProof.localRunId,
        qaStatus: runProof.qaStatus,
        generatedAt: runProof.generatedAt,
        proofSource: 'local-helper-run-proof',
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
        runProofAccepted: true,
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
      detailCode: error.code || 'unknown',
      requiredVersion: error.required || undefined,
      installedVersion: error.installed || undefined,
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

route.get('/helper/latest', async (c) => {
  const accessError = getAccessError(c)
  if (accessError) return c.json(accessError.payload, accessError.status)

  const release = await getReportHelperRelease(c)
  const bucket = c.env.CONNECTOR_ARTIFACTS
  const head = bucket ? await bucket.head(release.objectKey) : null

  return c.json({
    ok: Boolean(head),
    release,
    filename: release.filename,
    version: release.version,
    currentVersion: release.currentVersion,
    minimumVersion: release.minimumVersion,
    requiredVersion: release.requiredVersion,
    sha256: release.sha256,
    installerName: release.installerName,
    packageRootName: release.packageRootName,
    downloadPath: release.downloadPath,
    size: head?.size || 0,
    uploadedAt: head?.uploaded?.toISOString?.() || '',
    error: head ? '' : 'Helper package is not available yet.',
  }, head ? 200 : 404)
})

route.get('/helper/status', async (c) => {
  const accessError = getAccessError(c)
  if (accessError) return c.json(accessError.payload, accessError.status)

  const bucket = c.env.CONNECTOR_ARTIFACTS
  const release = await getReportHelperRelease(c)
  if (!bucket) {
    return c.json({
      ok: false,
      code: 'helper_bucket_missing',
      release,
      filename: release.filename,
      version: release.version,
      error: 'Helper package storage is not configured.',
    }, 503)
  }

  const head = await bucket.head(release.objectKey)
  return c.json({
    ok: Boolean(head),
    release,
    filename: release.filename,
    version: release.version,
    currentVersion: release.currentVersion,
    minimumVersion: release.minimumVersion,
    requiredVersion: release.requiredVersion,
    sha256: release.sha256,
    installerName: release.installerName,
    packageRootName: release.packageRootName,
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
  const release = await getReportHelperRelease(c)
  if (!bucket) {
    return c.json({
      ok: false,
      code: 'helper_bucket_missing',
      error: 'Helper package storage is not configured.',
    }, 503)
  }

  const object = await bucket.get(release.objectKey)
  if (!object) {
    return c.json({
      ok: false,
      code: 'helper_package_missing',
      filename: release.filename,
      error: 'Helper package was not found.',
    }, 404)
  }

  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/zip')
  headers.set('Content-Disposition', `attachment; filename="${release.filename}"`)
  headers.set('Cache-Control', 'private, no-store')
  headers.set('X-SkillCascade-Report-Helper-Version', release.version)
  headers.set('X-SkillCascade-Report-Helper-Minimum-Version', release.minimumVersion)
  if (release.sha256) headers.set('X-SkillCascade-Report-Helper-SHA256', release.sha256)
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
      release: await getReportHelperRelease(c),
    })
    return c.json({ ok: true, data }, 201)
  } catch (error) {
    return c.json({ error: error.message, code: 'seat_claim_failed' }, 400)
  }
})

export default route
