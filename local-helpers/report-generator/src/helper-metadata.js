import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const packageJson = require('../package.json')
const appRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const buildManifestPath = join(appRoot, 'helper-build-manifest.json')

export const HELPER_VERSION = packageJson.version || '0.0.0'

export const LOCAL_DATA_POLICY = {
  appInstallDir: '%LOCALAPPDATA%\\SkillCascade\\ReportGeneratorHelper',
  customerDataDir: '%USERPROFILE%\\.skillcascade\\report-generator-helper',
  standardTemplateId: 'skillcascade-standard-initial-assessment-v1',
  customerTemplateUpload: false,
  updatesPreserveCustomerData: true,
}

export const LOCAL_PORT_POLICY = {
  host: '127.0.0.1',
  defaultPort: 4181,
  discoveryStart: 4181,
  discoveryEnd: 4199,
  collisionBehavior: 'choose-next-available-loopback-port',
}

export async function readBuildManifest() {
  try {
    return JSON.parse(await readFile(buildManifestPath, 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return null
  }
}

export async function helperInstallState() {
  return {
    localOnly: true,
    helperVersion: HELPER_VERSION,
    buildManifest: await readBuildManifest(),
    localDataPolicy: LOCAL_DATA_POLICY,
    localPortPolicy: LOCAL_PORT_POLICY,
    updatePolicy: {
      replaceAppFilesOnly: true,
      preserveCustomerData: true,
      requiresUserApproval: true,
      autoUpdateEnabled: false,
    },
    licensingPolicy: {
      readinessEndpoint: '/api/local-report-generator/license-readiness',
      legacyReadinessEndpoint: '/api/local-report-pilot/license-readiness',
      localHelperStoresBillingSecrets: false,
      skillCascadeWorkflowPackIsAuthority: true,
      localHelperCanReportReadinessOnly: true,
      localInstallIdentityStoredInCustomerDataDir: true,
    },
  }
}
