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
    description: 'Signed-in user has Report Generator workflow-pack access and reports.view permission.',
  },
  {
    id: 'local_helper_running',
    label: 'Local helper running',
    owner: 'workstation',
    required: true,
    description: 'Helper responds from the workstation at the configured localhost URL.',
  },
  {
    id: 'license_readiness',
    label: 'Install fingerprint ready',
    owner: 'workstation',
    required: true,
    description: 'Helper reports a non-secret install fingerprint that can be claimed by SkillCascade.',
  },
  {
    id: 'template_profile',
    label: 'Customer template profiled',
    owner: 'workstation',
    required: true,
    description: 'Customer Word template is inspected locally before draft generation.',
  },
  {
    id: 'alias_map_reviewed',
    label: 'Template aliases reviewed',
    owner: 'bcba',
    required: true,
    description: 'Unsupported customer placeholders are mapped or left visible as review markers.',
  },
  {
    id: 'local_draft_generated',
    label: 'Local draft generated',
    owner: 'bcba',
    required: true,
    description: 'Editable DOCX and review JSON are created locally; BCBA reviews before use.',
  },
]

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

  const helperVersion = String(body.helperVersion || '').trim().slice(0, 64)
  const packageVersion = String(body.packageVersion || '').trim().slice(0, 64)
  const helperUrl = String(body.helperUrl || '').trim().slice(0, 120)
  const readinessStatus = String(body.readinessStatus || '').trim().slice(0, 80)
  const templateProfileCount = Number.isFinite(Number(body.templateProfileCount))
    ? Math.max(0, Math.min(999, Number(body.templateProfileCount)))
    : 0
  const aliasCount = Number.isFinite(Number(body.aliasCount))
    ? Math.max(0, Math.min(9999, Number(body.aliasCount)))
    : 0

  return {
    installFingerprint,
    helperVersion,
    packageVersion,
    helperUrl,
    readinessStatus,
    templateProfileCount,
    aliasCount,
    metadata: {
      localOnly: true,
      sourceTextReceived: false,
      helperVersion,
      packageVersion,
      readinessStatus,
      templateProfileCount,
      aliasCount,
    },
  }
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
      requiredEndpoints: [
        '/api/local-report-pilot/status',
        '/api/local-report-pilot/install-state',
        '/api/local-report-pilot/license-readiness',
        '/api/local-report-pilot/template-profile',
        '/api/local-report-pilot/template-profiles',
        '/api/local-report-pilot/run',
      ],
      cloudUploadsSourceFiles: false,
    },
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
      helper_version text,
      package_version text,
      helper_url text,
      status text NOT NULL DEFAULT 'claimed',
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      first_claimed_at timestamptz NOT NULL DEFAULT NOW(),
      last_seen_at timestamptz NOT NULL DEFAULT NOW(),
      UNIQUE (org_id, user_id, install_fingerprint)
    )
  `)
  installClaimsTableEnsured = true
}

export async function claimReportGeneratorInstall({ env, dbQuery, profile, body }) {
  const normalized = normalizeInstallClaimPayload(body)
  await ensureReportGeneratorInstallClaimsTable(env, dbQuery)
  const result = await dbQuery(env, `
    INSERT INTO report_generator_install_claims (
      org_id, user_id, install_fingerprint, helper_version, package_version, helper_url, status, metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'claimed', $7::jsonb)
    ON CONFLICT (org_id, user_id, install_fingerprint)
    DO UPDATE SET
      helper_version = EXCLUDED.helper_version,
      package_version = EXCLUDED.package_version,
      helper_url = EXCLUDED.helper_url,
      status = 'claimed',
      metadata = EXCLUDED.metadata,
      last_seen_at = NOW()
    RETURNING id, org_id, user_id, install_fingerprint, helper_version, package_version,
              helper_url, status, metadata, first_claimed_at, last_seen_at
  `, [
    profile.org_id,
    profile.id,
    normalized.installFingerprint,
    normalized.helperVersion || null,
    normalized.packageVersion || null,
    normalized.helperUrl || null,
    JSON.stringify(normalized.metadata),
  ])

  const row = result.rows?.[0] || {
    org_id: profile.org_id,
    user_id: profile.id,
    install_fingerprint: normalized.installFingerprint,
    helper_version: normalized.helperVersion,
    package_version: normalized.packageVersion,
    helper_url: normalized.helperUrl,
    status: 'claimed',
    metadata: normalized.metadata,
  }

  return {
    localOnly: false,
    phiStored: false,
    helperCanGrantAccess: false,
    skillCascadeWorkflowPackIsAuthority: true,
    claim: {
      id: row.id || '',
      orgId: row.org_id,
      userId: row.user_id,
      installFingerprint: row.install_fingerprint,
      helperVersion: row.helper_version || '',
      packageVersion: row.package_version || '',
      helperUrl: row.helper_url || '',
      status: row.status || 'claimed',
      firstClaimedAt: row.first_claimed_at || '',
      lastSeenAt: row.last_seen_at || '',
    },
  }
}

export async function listReportGeneratorInstallClaims({ env, dbQuery, profile }) {
  await ensureReportGeneratorInstallClaimsTable(env, dbQuery)
  const result = await dbQuery(env, `
    SELECT id, org_id, user_id, install_fingerprint, helper_version, package_version,
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
      helperVersion: row.helper_version || '',
      packageVersion: row.package_version || '',
      helperUrl: row.helper_url || '',
      status: row.status || 'claimed',
      firstClaimedAt: row.first_claimed_at || '',
      lastSeenAt: row.last_seen_at || '',
    })),
  }
}
