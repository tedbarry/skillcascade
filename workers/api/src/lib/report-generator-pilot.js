import { WORKFLOW_PACK_IDS } from './workflow-packs.js'

let installClaimsTableEnsured = false

const INSTALL_FINGERPRINT_RE = /^[a-z0-9_-]{8,128}$/i
const UNSAFE_PAYLOAD_KEY_PATTERNS = [
  /client/i,
  /patient/i,
  /learner/i,
  /source.*text/i,
  /source.*folder/i,
  /source.*path/i,
  /file.*content/i,
  /document.*text/i,
  /template.*path/i,
  /output.*dir/i,
  /local.*path/i,
  /report.*text/i,
]

export const REPORT_GENERATOR_ONBOARDING_STEPS = [
  {
    id: 'workflow_pack_access',
    label: 'SkillCascade access',
    owner: 'skillcascade',
    required: true,
    description: 'Sign in with an account that has Report Generator access.',
  },
  {
    id: 'local_helper_running',
    label: 'Install helper',
    owner: 'workstation',
    required: true,
    description: 'Download and install the helper on the Windows computer with the report files.',
  },
  {
    id: 'license_readiness',
    label: 'Check setup',
    owner: 'workstation',
    required: true,
    description: 'Return to this page and confirm the helper is connected.',
  },
  {
    id: 'source_folder_ready',
    label: 'Choose source folder',
    owner: 'workstation',
    required: true,
    description: 'Choose the folder with the diagnostic/evaluation, intake, adaptive assessment, and related source records.',
  },
  {
    id: 'evidence_check_reviewed',
    label: 'Check evidence',
    owner: 'bcba',
    required: true,
    description: 'Run Check files and review missing evidence before creating a Word draft.',
  },
  {
    id: 'local_draft_generated',
    label: 'Create draft',
    owner: 'bcba',
    required: true,
    description: 'Create an editable Word draft and review it before use.',
  },
]

export const REPORT_GENERATOR_SUPERVISOR_REVIEWED_STYLE = {
  id: 'supervisor-reviewed-aba-initial-v1',
  label: 'Supervisor-reviewed ABA initial report style',
  appliesTo: 'initial-assessment',
  standardTemplateOnly: true,
  reviewGate: 'helper-blocks-visible-template-artifacts-and-unsupported-assessment-references',
  summary: 'Initial drafts should read like the reviewed house reports from the start: source-supported facts, present-functioning clinical language, standard SkillCascade template sections, clean checkboxes, and no unsupported assessment/tool references.',
}

function flattenKeys(value, prefix = '') {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenKeys(item, `${prefix}[${index}]`))
  }
  return Object.entries(value).flatMap(([key, nested]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return [path, ...flattenKeys(nested, path)]
  })
}

export function findUnsafeReportGeneratorPayloadFields(body = {}) {
  return flattenKeys(body)
    .filter((key) => UNSAFE_PAYLOAD_KEY_PATTERNS.some((pattern) => pattern.test(key)))
}

export function normalizeInstallClaimPayload(body = {}) {
  const installFingerprint = String(body.installFingerprint || '').trim()
  if (!INSTALL_FINGERPRINT_RE.test(installFingerprint)) {
    throw new Error('installFingerprint must be 8-128 safe characters from the local helper license-readiness endpoint.')
  }

  const machine = body.machine && typeof body.machine === 'object' ? body.machine : {}
  const rawDeviceFingerprint = String(
    body.deviceFingerprint
    || body.hostnameHash
    || machine.hostnameHash
    || installFingerprint
  ).trim()
  const deviceFingerprint = INSTALL_FINGERPRINT_RE.test(rawDeviceFingerprint)
    ? rawDeviceFingerprint
    : installFingerprint
  const helperVersion = String(body.helperVersion || '').trim().slice(0, 64)
  const packageVersion = String(body.packageVersion || '').trim().slice(0, 64)
  const helperUrl = String(body.helperUrl || '').trim().slice(0, 120)
  const readinessStatus = String(body.readinessStatus || '').trim().slice(0, 80)
  const deviceLabel = String(body.deviceLabel || machine.deviceLabel || '').trim().replace(/\s+/g, ' ').slice(0, 80)
  const hostnameHash = String(body.hostnameHash || machine.hostnameHash || '').trim().slice(0, 128)
  const platform = String(body.platform || machine.platform || '').trim().slice(0, 40)
  const arch = String(body.arch || machine.arch || '').trim().slice(0, 40)
  const templateProfileCount = Number.isFinite(Number(body.templateProfileCount))
    ? Math.max(0, Math.min(999, Number(body.templateProfileCount)))
    : 0
  const aliasCount = Number.isFinite(Number(body.aliasCount))
    ? Math.max(0, Math.min(9999, Number(body.aliasCount)))
    : 0

  return {
    installFingerprint,
    deviceFingerprint,
    deviceLabel,
    hostnameHash,
    platform,
    arch,
    helperVersion,
    packageVersion,
    helperUrl,
    readinessStatus,
    templateProfileCount,
    aliasCount,
    metadata: {
      localOnly: true,
      sourceTextReceived: false,
      deviceFingerprint,
      deviceLabel,
      hostnameHash,
      platform,
      arch,
      helperVersion,
      packageVersion,
      readinessStatus,
      templateProfileCount,
      aliasCount,
    },
  }
}

export function getReportGeneratorInstallStatus(normalized = {}, release = {}) {
  const acceptedVersions = new Set([
    ...(Array.isArray(release.supportedVersions) ? release.supportedVersions : []),
    release.version,
    release.currentVersion,
    release.minimumVersion,
    release.requiredVersion,
    release.helperRuntimeVersion,
  ].map((value) => String(value || '').trim()).filter(Boolean))
  const installedVersions = [
    normalized.packageVersion,
    normalized.helperVersion,
  ].map((value) => String(value || '').trim()).filter(Boolean)

  if (!installedVersions.length) return 'needs_setup'
  if (acceptedVersions.size && !installedVersions.some((version) => acceptedVersions.has(version))) {
    return 'outdated'
  }
  return 'active'
}

export function buildReportGeneratorOnboarding({ profile, userCanEdit = false } = {}) {
  return {
    workflowPackId: WORKFLOW_PACK_IDS.reportGenerator,
    dataMode: 'non_phi_onboarding_contract',
    user: {
      userId: profile?.id || '',
      orgId: profile?.org_id || '',
      role: profile?.role_slug || profile?.role || 'unknown',
      canGenerateDrafts: userCanEdit,
    },
    helper: {
      defaultUrl: 'http://127.0.0.1:4181',
      discovery: {
        host: '127.0.0.1',
        startPort: 4181,
        endPort: 4199,
        browserAutoDetects: true,
        collisionBehavior: 'helper chooses the next available loopback port without taking over another local app',
      },
      requiredEndpoints: [
        '/api/local-report-generator/status',
        '/api/local-report-generator/install-state',
        '/api/local-report-generator/license-readiness',
        '/api/local-report-generator/template-profile',
        '/api/local-report-generator/template-profiles',
        '/api/local-report-generator/preflight',
        '/api/local-report-generator/run',
      ],
      legacyEndpoints: [
        '/api/local-report-pilot/status',
        '/api/local-report-pilot/install-state',
        '/api/local-report-pilot/license-readiness',
        '/api/local-report-pilot/template-profile',
        '/api/local-report-pilot/template-profiles',
        '/api/local-report-pilot/preflight',
        '/api/local-report-pilot/run',
      ],
      cloudUploadsSourceFiles: false,
    },
    clinicalWriting: REPORT_GENERATOR_SUPERVISOR_REVIEWED_STYLE,
    serverEndpoints: {
      status: '/api/report-generator/status',
      onboarding: '/api/report-generator/onboarding',
      claimInstall: '/api/report-generator/seat-claims',
      listInstallClaims: '/api/report-generator/seat-claims',
    },
    steps: REPORT_GENERATOR_ONBOARDING_STEPS,
    safety: {
      acceptsPhi: false,
      acceptedSeatClaimFields: [
        'installFingerprint',
        'deviceFingerprint',
        'deviceLabel',
        'hostnameHash',
        'platform',
        'arch',
        'helperVersion',
        'packageVersion',
        'helperUrl',
        'readinessStatus',
        'templateProfileCount',
        'aliasCount',
      ],
      rejectedFieldsInclude: [
        'client names',
        'source folder paths',
        'template paths',
        'output folders',
        'document text',
        'file contents',
      ],
      humanReviewRequired: true,
      externalWritesEnabled: false,
    },
  }
}

export async function ensureReportGeneratorInstallClaimsTable(env, dbQuery) {
  if (installClaimsTableEnsured) return
  await dbQuery(env, `
    CREATE TABLE IF NOT EXISTS report_generator_install_claims (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid NOT NULL,
      user_id uuid NOT NULL,
      install_fingerprint text NOT NULL,
      device_fingerprint text,
      device_label text,
      hostname_hash text,
      platform text,
      arch text,
      helper_version text,
      package_version text,
      required_helper_version text,
      helper_url text,
      status text NOT NULL DEFAULT 'claimed',
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      first_claimed_at timestamptz NOT NULL DEFAULT NOW(),
      last_seen_at timestamptz NOT NULL DEFAULT NOW(),
      UNIQUE (org_id, user_id, install_fingerprint)
    )
  `)
  await dbQuery(env, `ALTER TABLE report_generator_install_claims ADD COLUMN IF NOT EXISTS device_fingerprint text`)
  await dbQuery(env, `ALTER TABLE report_generator_install_claims ADD COLUMN IF NOT EXISTS device_label text`)
  await dbQuery(env, `ALTER TABLE report_generator_install_claims ADD COLUMN IF NOT EXISTS hostname_hash text`)
  await dbQuery(env, `ALTER TABLE report_generator_install_claims ADD COLUMN IF NOT EXISTS platform text`)
  await dbQuery(env, `ALTER TABLE report_generator_install_claims ADD COLUMN IF NOT EXISTS arch text`)
  await dbQuery(env, `ALTER TABLE report_generator_install_claims ADD COLUMN IF NOT EXISTS required_helper_version text`)
  installClaimsTableEnsured = true
}

export async function claimReportGeneratorInstall({ env, dbQuery, profile, body, release = {} }) {
  const normalized = normalizeInstallClaimPayload(body)
  const status = getReportGeneratorInstallStatus(normalized, release)
  const requiredHelperVersion = String(release.minimumVersion || release.version || '').trim()
  const metadata = {
    ...normalized.metadata,
    releaseVersion: String(release.version || '').trim(),
    requiredHelperVersion,
    releaseStatus: status,
  }
  await ensureReportGeneratorInstallClaimsTable(env, dbQuery)
  const result = await dbQuery(env, `
    INSERT INTO report_generator_install_claims (
      org_id, user_id, install_fingerprint, device_fingerprint, device_label, hostname_hash,
      platform, arch, helper_version, package_version, required_helper_version, helper_url, status, metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)
    ON CONFLICT (org_id, user_id, install_fingerprint)
    DO UPDATE SET
      device_fingerprint = EXCLUDED.device_fingerprint,
      device_label = EXCLUDED.device_label,
      hostname_hash = EXCLUDED.hostname_hash,
      platform = EXCLUDED.platform,
      arch = EXCLUDED.arch,
      helper_version = EXCLUDED.helper_version,
      package_version = EXCLUDED.package_version,
      required_helper_version = EXCLUDED.required_helper_version,
      helper_url = EXCLUDED.helper_url,
      status = EXCLUDED.status,
      metadata = EXCLUDED.metadata,
      last_seen_at = NOW()
    RETURNING id, org_id, user_id, install_fingerprint, device_fingerprint, device_label,
              hostname_hash, platform, arch, helper_version, package_version, required_helper_version,
              helper_url, status, metadata, first_claimed_at, last_seen_at
  `, [
    profile.org_id,
    profile.id,
    normalized.installFingerprint,
    normalized.deviceFingerprint || null,
    normalized.deviceLabel || null,
    normalized.hostnameHash || null,
    normalized.platform || null,
    normalized.arch || null,
    normalized.helperVersion || null,
    normalized.packageVersion || null,
    requiredHelperVersion || null,
    normalized.helperUrl || null,
    status,
    JSON.stringify(metadata),
  ])

  const row = result.rows?.[0] || {
    org_id: profile.org_id,
    user_id: profile.id,
    install_fingerprint: normalized.installFingerprint,
    device_fingerprint: normalized.deviceFingerprint,
    device_label: normalized.deviceLabel,
    hostname_hash: normalized.hostnameHash,
    platform: normalized.platform,
    arch: normalized.arch,
    helper_version: normalized.helperVersion,
    package_version: normalized.packageVersion,
    required_helper_version: requiredHelperVersion,
    helper_url: normalized.helperUrl,
    status,
    metadata,
  }

  return {
    localOnly: false,
    phiStored: false,
    helperCanGrantAccess: false,
    skillCascadeAccountIsAuthority: true,
    skillCascadeCreditLedgerIsAuthority: true,
    claim: {
      id: row.id || '',
      orgId: row.org_id,
      userId: row.user_id,
      installFingerprint: row.install_fingerprint,
      deviceFingerprint: row.device_fingerprint || '',
      deviceLabel: row.device_label || '',
      hostnameHash: row.hostname_hash || '',
      platform: row.platform || '',
      arch: row.arch || '',
      helperVersion: row.helper_version || '',
      packageVersion: row.package_version || '',
      requiredHelperVersion: row.required_helper_version || requiredHelperVersion || '',
      helperUrl: row.helper_url || '',
      status: row.status || status,
      firstClaimedAt: row.first_claimed_at || '',
      lastSeenAt: row.last_seen_at || '',
    },
  }
}

export async function listReportGeneratorInstallClaims({ env, dbQuery, profile }) {
  await ensureReportGeneratorInstallClaimsTable(env, dbQuery)
  const result = await dbQuery(env, `
    SELECT id, org_id, user_id, install_fingerprint, device_fingerprint, device_label,
           hostname_hash, platform, arch, helper_version, package_version, required_helper_version,
           helper_url, status, metadata, first_claimed_at, last_seen_at
    FROM report_generator_install_claims
    WHERE org_id = $1 AND user_id = $2
    ORDER BY last_seen_at DESC
    LIMIT 20
  `, [profile.org_id, profile.id])

  return {
    phiStored: false,
    claimCount: result.rows?.length || 0,
    claims: (result.rows || []).map((row) => ({
      id: row.id,
      orgId: row.org_id,
      userId: row.user_id,
      installFingerprint: row.install_fingerprint,
      deviceFingerprint: row.device_fingerprint || '',
      deviceLabel: row.device_label || '',
      hostnameHash: row.hostname_hash || '',
      platform: row.platform || '',
      arch: row.arch || '',
      helperVersion: row.helper_version || '',
      packageVersion: row.package_version || '',
      requiredHelperVersion: row.required_helper_version || '',
      helperUrl: row.helper_url || '',
      status: row.status || 'claimed',
      firstClaimedAt: row.first_claimed_at || '',
      lastSeenAt: row.last_seen_at || '',
    })),
  }
}
