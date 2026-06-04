import { readFile, writeFile } from 'node:fs/promises'
import { randomUUID, createHash } from 'node:crypto'
import { arch, hostname, platform } from 'node:os'
import { HELPER_VERSION } from './helper-metadata.js'
import { DATA_DIR, dataPath, ensureDataDir } from './local-data.js'

const STATE_VERSION = 1
const LICENSE_READINESS_PATH = dataPath('license-readiness.json')

function nowIso() {
  return new Date().toISOString()
}

function hashValue(value) {
  return createHash('sha256')
    .update(String(value || 'unknown'))
    .digest('hex')
    .slice(0, 24)
}

async function readReadinessState() {
  try {
    const parsed = JSON.parse(await readFile(LICENSE_READINESS_PATH, 'utf8'))
    if (parsed.installId) return parsed
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  const timestamp = nowIso()
  return {
    version: STATE_VERSION,
    localOnly: true,
    installId: randomUUID(),
    createdAt: timestamp,
    lastCheckedAt: timestamp,
  }
}

async function writeReadinessState(state) {
  await ensureDataDir()
  await writeFile(LICENSE_READINESS_PATH, JSON.stringify({
    version: STATE_VERSION,
    localOnly: true,
    installId: state.installId,
    createdAt: state.createdAt,
    lastCheckedAt: state.lastCheckedAt,
  }, null, 2))
}

export async function localLicenseReadiness() {
  const state = await readReadinessState()
  const nextState = { ...state, lastCheckedAt: nowIso() }
  await writeReadinessState(nextState)

  const installFingerprint = hashValue(nextState.installId)

  return {
    localOnly: true,
    status: 'ready-for-skillcascade-license-check',
    helperVersion: HELPER_VERSION,
    installId: nextState.installId,
    installFingerprint,
    dataDir: DATA_DIR,
    statePath: LICENSE_READINESS_PATH,
    createdAt: nextState.createdAt,
    lastCheckedAt: nextState.lastCheckedAt,
    machine: {
      hostnameHash: hashValue(hostname()),
      platform: platform(),
      arch: arch(),
    },
    authority: {
      source: 'skillcascade-workflow-pack',
      requiredWorkflowPack: 'report-generator',
      requiresActiveSubscription: true,
      localHelperStoresBillingSecrets: false,
      localHelperCanGrantAccess: false,
      offlineRunsAreAuthoritative: false,
    },
    seatClaim: {
      mode: 'server-authorized-local-install',
      recommendedKey: installFingerprint,
      sendToSkillCascade: [
        'installFingerprint',
        'helperVersion',
        'currentUserId',
        'currentOrganizationId',
        'workflowPackId',
      ],
      doNotSend: [
        'source document text',
        'client names',
        'billing secrets',
        'local file contents',
      ],
    },
  }
}
