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
  savedTemplateProfiles: '%USERPROFILE%\\.skillcascade\\report-generator-helper\\template-profiles.json',
  updatesPreserveCustomerData: true,
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
