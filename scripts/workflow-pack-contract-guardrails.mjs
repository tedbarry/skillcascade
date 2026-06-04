import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { WORKFLOW_PACKS, WORKFLOW_PACK_IDS } from '../src/data/workflowPacks.js'

const ROOT = process.cwd()
const REQUIRED_HANDSHAKE = 'SC-WORKFLOW-PACK-HANDSHAKE-2026-06-04'

const requiredPacks = [
  {
    id: WORKFLOW_PACK_IDS.passageNotes,
    route: '/passage-runner',
    onboardingRoute: '/workflow-packs/passage-notes/onboarding',
    workerRouteFile: 'workers/api/src/routes/passage-runner.js',
    workerPackId: 'WORKFLOW_PACK_IDS.passageNotes',
  },
  {
    id: WORKFLOW_PACK_IDS.reportGenerator,
    route: '/report-generator',
    extraRoutes: ['/reports'],
    onboardingRoute: '/workflow-packs/report-generator/onboarding',
    workerRouteFile: 'workers/api/src/routes/report-generator.js',
    workerPackId: 'WORKFLOW_PACK_IDS.reportGenerator',
  },
  {
    id: WORKFLOW_PACK_IDS.agencyOps,
    route: '/agency-ops',
    onboardingRoute: '/workflow-packs/agency-ops/onboarding',
    workerRouteFile: 'workers/api/src/routes/agency-ops.js',
    workerPackId: 'WORKFLOW_PACK_IDS.agencyOps',
  },
]

const findings = []

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath)
  if (!fs.existsSync(fullPath)) {
    findings.push({
      file: relativePath,
      message: 'Required workflow-pack contract file is missing.',
    })
    return ''
  }
  return fs.readFileSync(fullPath, 'utf8')
}

function includes(text, value) {
  return text.includes(value)
}

function assert(condition, file, message) {
  if (!condition) findings.push({ file, message })
}

function packById(packId) {
  return WORKFLOW_PACKS.find((pack) => pack.id === packId)
}

function assertAppRouteGated(appText, pack) {
  assert(
    includes(appText, `path="${pack.route}"`) || includes(appText, `path="${pack.route}/:packId?"`),
    'src/App.jsx',
    `${pack.id} route ${pack.route} is not mounted in App.jsx.`,
  )
  assert(
    includes(appText, `packId={${pack.workerPackId}}`),
    'src/App.jsx',
    `${pack.id} route is not visibly wrapped in WorkflowPackGate with ${pack.workerPackId}.`,
  )
  for (const route of pack.extraRoutes || []) {
    assert(
      includes(appText, `path="${route}"`),
      'src/App.jsx',
      `${pack.id} extra route ${route} is not mounted in App.jsx.`,
    )
  }
}

const integrationContract = read('docs/workflow-pack-integration-contract.md')
const handshake = read('docs/WORKFLOW-PACK-CHAT-HANDSHAKE-2026-06-04.md')
const appText = read('src/App.jsx')
const clientPackText = read('src/data/workflowPacks.js')
const workerPackText = read('workers/api/src/lib/workflow-packs.js')
const pricingText = read('src/components/PricingPage.jsx')
const toolsHomeText = read('src/pages/ToolsHome.jsx')
const onboardingText = read('src/pages/WorkflowPackOnboarding.jsx')
const consoleText = read('src/pages/WorkflowPacksConsole.jsx')

assert(
  includes(handshake, REQUIRED_HANDSHAKE),
  'docs/WORKFLOW-PACK-CHAT-HANDSHAKE-2026-06-04.md',
  'Chat handshake phrase is missing.',
)
assert(
  includes(integrationContract, 'WORKFLOW-PACK-CHAT-HANDSHAKE-2026-06-04.md'),
  'docs/workflow-pack-integration-contract.md',
  'Integration contract does not point other chats to the handshake file.',
)
assert(
  includes(pricingText, 'WORKFLOW_PACKS') && includes(pricingText, '/tools'),
  'src/components/PricingPage.jsx',
  'Pricing page is not visibly wired to workflow-pack source data and the signed-in tools home.',
)
assert(
  includes(appText, 'path="/tools"') && includes(appText, 'ToolsHome'),
  'src/App.jsx',
  'Signed-in tools home route /tools is missing from the app shell.',
)
assert(
  includes(toolsHomeText, 'WORKFLOW_PACK_IDS') && includes(toolsHomeText, 'useWorkflowPackAccess') && includes(toolsHomeText, '/api/stripe-checkout'),
  'src/pages/ToolsHome.jsx',
  'Tools home is not visibly wired to workflow-pack access and checkout.',
)
assert(
  includes(onboardingText, 'WORKFLOW_PACKS') && includes(onboardingText, 'useParams') && includes(onboardingText, 'PACK_SETUP'),
  'src/pages/WorkflowPackOnboarding.jsx',
  'Workflow-pack onboarding page is not visibly using workflow-pack source data.',
)
assert(
  includes(consoleText, 'WORKFLOW_PACKS') && includes(consoleText, 'provision-stripe-prices'),
  'src/pages/WorkflowPacksConsole.jsx',
  'Workflow-pack console is not visibly using source data and billing provisioning.',
)

for (const requiredPack of requiredPacks) {
  const pack = packById(requiredPack.id)
  assert(pack, 'src/data/workflowPacks.js', `${requiredPack.id} is missing from WORKFLOW_PACKS.`)
  if (!pack) continue

  assert(pack.route === requiredPack.route, 'src/data/workflowPacks.js', `${pack.id} route should be ${requiredPack.route}.`)
  assert(
    pack.onboardingRoute === requiredPack.onboardingRoute,
    'src/data/workflowPacks.js',
    `${pack.id} onboarding route should be ${requiredPack.onboardingRoute}.`,
  )
  assert(Boolean(pack.checkoutPlan), 'src/data/workflowPacks.js', `${pack.id} is missing checkoutPlan.`)
  assert(Boolean(pack.purchaseMode), 'src/data/workflowPacks.js', `${pack.id} is missing purchaseMode.`)
  assert(Array.isArray(pack.boundaries) && pack.boundaries.length > 0, 'src/data/workflowPacks.js', `${pack.id} needs buyer-facing safety boundaries.`)
  assertAppRouteGated(appText, requiredPack)

  assert(
    includes(workerPackText, pack.id) && includes(workerPackText, pack.checkoutPlan),
    'workers/api/src/lib/workflow-packs.js',
    `${pack.id} is not mirrored in worker-side workflow pack checkout/access source.`,
  )

  const workerRouteText = read(requiredPack.workerRouteFile)
  assert(
    includes(workerRouteText, 'hasWorkflowPack') && includes(workerRouteText, requiredPack.workerPackId),
    requiredPack.workerRouteFile,
    `${pack.id} worker route is not visibly protected by hasWorkflowPack(${requiredPack.workerPackId}).`,
  )
}

if (findings.length > 0) {
  console.error('\nWorkflow-pack contract guardrails failed.\n')
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.message}`)
  }
  console.error('\nFix these before telling Teddy another chat is aligned with the SkillCascade workflow-pack shelf.\n')
  process.exit(1)
}

console.log('Workflow-pack contract guardrails passed.')
