import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import mammoth from 'mammoth'
import JSZip from 'jszip'
import {
  ensurePassageProgrammingScaffold,
  isMissingPassageAbcScaffold,
  passageGoalPayload,
  resolvePassageDomainLabel,
  verifyPassageProgrammingReadiness,
} from '../src/passage-learning-tree-adapter.js'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const port = Number(process.env.REPORT_HELPER_SMOKE_PORT || 4199)
const baseUrl = `http://127.0.0.1:${port}`
const origin = 'http://127.0.0.1:5173'
const dataDir = mkdtempSync(join(tmpdir(), 'skillcascade-report-helper-data-'))
const passageCredentialDir = mkdtempSync(join(tmpdir(), 'skillcascade-report-helper-passage-credentials-'))
const helperApi = '/api/local-report-generator'
const legacyHelperApi = '/api/local-report-pilot'
const checkedBox = '\u2612'
const uncheckedBox = '\u2610'

assert.equal(resolvePassageDomainLabel([{ id: 'behavior', value: 'behavior domain' }], 'behavior')?.id, 'behavior')
assert.equal(resolvePassageDomainLabel([{ id: 'communication', value: 'communication domain' }], 'communication')?.id, 'communication')
assert.equal(resolvePassageDomainLabel([{ id: 'social', value: 'social skills domain' }], 'social')?.id, 'social')
assert.equal(resolvePassageDomainLabel([{ id: 'parent', value: 'parent training domain' }], 'parentTraining')?.id, 'parent')
assert.equal(isMissingPassageAbcScaffold({ status: 404, itemStatuses: [] }), true)
assert.equal(isMissingPassageAbcScaffold({ status: 403, itemStatuses: [] }), false)
assert.equal(passageGoalPayload({ domain: 'Behavior', dataCollectionType: 'datafrequency2', longTermGoal: 'Behavior' }, 'client').dataCollectionType, 'Frequency')
assert.equal(passageGoalPayload({ domain: 'Communication', dataCollectionType: 'datapercent', longTermGoal: 'Communication' }, 'client').dataCollectionType, 'Trial')

let scaffoldPostCount = 0
const scaffoldResponses = [
  { ok: false, status: 404, itemStatuses: [{ ok: false, message: 'This clients ABC does not exist.' }], data: null },
  { ok: true, status: 200, itemStatuses: [{ ok: true, message: '' }], data: { id: 'abc' } },
]
const scaffoldProof = await ensurePassageProgrammingScaffold('cookie', 'client', {
  live: true,
  getDetailed: async () => scaffoldResponses.shift(),
  post: async () => {
    scaffoldPostCount += 1
    return { id: 'abc' }
  },
})
assert.equal(scaffoldProof.state, 'created')
assert.equal(scaffoldProof.verified, true)
assert.equal(scaffoldPostCount, 1)

let dryRunPostCount = 0
const dryRunScaffoldProof = await ensurePassageProgrammingScaffold('cookie', 'client', {
  live: false,
  getDetailed: async () => ({ ok: false, status: 404, itemStatuses: [], data: null }),
  post: async () => {
    dryRunPostCount += 1
  },
})
assert.equal(dryRunScaffoldProof.state, 'would_create')
assert.equal(dryRunPostCount, 0)
await assert.rejects(
  ensurePassageProgrammingScaffold('cookie', 'client', {
    live: true,
    getDetailed: async () => ({ ok: false, status: 403, itemStatuses: [], data: null }),
  }),
  /preflight failed/i,
)
const programmingReadiness = await verifyPassageProgrammingReadiness('cookie', 'client', {
  getDetailed: async () => ({
    ok: true,
    status: 200,
    itemStatuses: Array.from({ length: 4 }, () => ({ ok: true, message: '' })),
  }),
})
assert.equal(programmingReadiness.ok, true)
assert.equal(programmingReadiness.itemCount, 4)
await assert.rejects(
  verifyPassageProgrammingReadiness('cookie', 'client', {
    getDetailed: async () => ({
      ok: false,
      status: 207,
      itemStatuses: [{ ok: false, message: 'This clients ABC does not exist.' }],
    }),
  }),
  /readiness failed/i,
)
const unresolvedTemplatePhrases = [
  'Write what ABA methods',
  'Please specify specific long term goals',
  'Client is a(n)',
  'full term/premature',
  'school name full time',
  'Four to five sentences',
  'Please identify as Mild',
  'Click or tap here',
  'REVIEW_UNSUPPORTED_TEMPLATE_FIELD',
  'Review required:',
  'source packet',
  'can delete',
]

async function countDocxTables(docxPath) {
  const zip = await JSZip.loadAsync(await readFile(docxPath))
  const xml = await zip.file('word/document.xml')?.async('string')
  if (!xml) return 0
  return (xml.match(/<w:tbl[\s>]/g) || []).length
}

async function inspectDocxCloneContract(docxPath) {
  const zip = await JSZip.loadAsync(await readFile(docxPath))
  const xmlFiles = Object.keys(zip.files).filter((filename) => (
    filename.startsWith('word/') && filename.endsWith('.xml')
  ))
  const documentXml = await zip.file('word/document.xml')?.async('string')
  assert.ok(documentXml, 'generated DOCX should contain word/document.xml')

  let allXml = ''
  for (const filename of xmlFiles) {
    allXml += `${await zip.file(filename).async('string')}\n`
  }
  const plainText = documentXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return {
    tableCount: (documentXml.match(/<w:tbl[\s>]/g) || []).length,
    highlightCount: (allXml.match(/<w:highlight[\s>]/g) || []).length,
    contentControlCount: (documentXml.match(/<w:sdt[\s>]/g) || []).length,
    checkboxControlCount: (allXml.match(/<w14:checkbox|<w:checkBox|FORMCHECKBOX/g) || []).length,
    checkboxFontRunCount: (documentXml.match(/Segoe UI Symbol/g) || []).length,
    legacyCheckboxFontRunCount: (documentXml.match(/MS Gothic/g) || []).length,
    unresolvedPhraseHits: unresolvedTemplatePhrases.filter((phrase) => plainText.includes(phrase)),
    plainText,
  }
}

function escapePdfText(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function minimalPdfBuffer(lines = []) {
  const textOps = lines.map((line) => `(${escapePdfText(line)}) Tj T*`).join('\n')
  const stream = `BT\n/F1 11 Tf\n72 750 Td\n14 TL\n${textOps}\nET`
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += object
  }
  const xrefOffset = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(pdf, 'utf8')
}

function startServer() {
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: packageRoot,
    env: {
      ...process.env,
      PORT: String(port),
      REPORT_HELPER_DATA_DIR: dataDir,
      REPORT_HELPER_PASSAGE_LOCAL_CREDENTIAL_DIR: passageCredentialDir,
      REPORT_HELPER_ALLOW_MOCK_PASSAGE_ADAPTER: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdoutText = ''
  child.stderrText = ''
  child.stdout.on('data', (chunk) => { child.stdoutText += chunk.toString('utf8') })
  child.stderr.on('data', (chunk) => { child.stderrText += chunk.toString('utf8') })
  return child
}

async function waitForStatus() {
  let lastError
  for (let i = 0; i < 40; i += 1) {
    try {
      const response = await fetch(`${baseUrl}${helperApi}/status`)
      if (response.ok) return
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error([
    'helper did not become ready',
    `lastError: ${lastError?.message || 'none'}`,
    `stdout:\n${server.stdoutText || '(empty)'}`,
    `stderr:\n${server.stderrText || '(empty)'}`,
  ].join('\n'))
}

async function createSourceFixture() {
  const root = await mkdtemp(join(tmpdir(), 'skillcascade-report-helper-'))
  const sourceFolder = join(root, 'source')
  const outputDir = join(root, 'output')
  await mkdir(sourceFolder, { recursive: true })
  await mkdir(outputDir, { recursive: true })
  await writeFile(join(sourceFolder, 'psychological-evaluation.md'), [
    'Mock Provider Header',
    'Phone: 555-0000',
    'License: fake test line that should not appear in the report narrative.',
    '',
    'Reason for Referral:',
    'The client was referred for a comprehensive ADOS-2 evaluation due to severe emotional dysregulation, aggressive escalation, social withdrawal, communication deficits, and inability to function in academic settings.',
    '',
    'Developmental and Psychosocial History:',
    'Records indicate early developmental delays including delayed speech, delayed motor milestones, and delayed walking. Current concerns include communication below age expectations, difficulty articulating thoughts, difficulty expressing emotions, and explosive behavior after internalizing distress.',
    '',
    'Behavioral Observations:',
    'During the evaluation, the client demonstrated difficulty with reciprocal social interaction. Eye contact was inconsistent and poorly integrated with communication, and spontaneous social initiation was limited. Communication was below age expectations, with difficulty organizing thoughts, limited elaboration, poor conversational reciprocity, and need for repetition and simplification of questions. The client appeared emotionally constricted and internally preoccupied and could escalate when challenged or frustrated.',
    'Additional assessment information indicates social communication, eye contact, emotional regulation, and conversation concerns that should not be copied into observation prose.',
    'Additional collateral information indicates reciprocal communication and emotional-regulation concerns that should not be copied into observation prose.',
    '',
    'ADOS-2 Results:',
    'ADOS-2 Module 3 was administered. Social Affect Total: 19. RRB Total: 4. ADOS-2 Classification: Autism. Comparison Score: 10 (High level of autism spectrum-related symptoms).',
    '',
    'Interpretation of Results:',
    'Results indicate high autism symptom severity, severe social communication impairment, limited reciprocity, poor emotional expression, behavioral rigidity, and real-world communication breakdowns.',
    '',
    'DSM-5-TR Diagnostic Criteria Alignment:',
    'Criterion A:',
    'The client demonstrates severe deficits in social-emotional reciprocity, nonverbal communication, and relationship development.',
    'Criterion B:',
    'The client demonstrates rigidity, resistance to change, sensory sensitivity, repetitive maladaptive escalation cycles, and cognitive inflexibility.',
    '',
    'Functional Impairment Across Settings:',
    'Home: internalized distress followed by explosive aggression, instability, and safety concerns.',
    'School: unable to function in traditional academic environments due to communication, comprehension, and behavior deficits.',
    'Social: marked isolation and inability to form or maintain relationships.',
    '',
    'Diagnostic Impression:',
    'Autism Spectrum Disorder (F84.0), Level 2-3 support needs, with co-occurring ADHD, anxiety, and depression symptoms.',
    '',
    'Medical Necessity for ABA Services:',
    'ABA services are medically necessary due to severe communication deficits, emotional dysregulation, aggression linked to communication breakdown, rigidity, poor adaptability, and risk of crisis involvement without treatment.',
  ].join('\n'))
  await writeFile(join(sourceFolder, 'intake.md'), [
    'Intake and caregiver interview identify presenting concerns and parent report.',
    'Family history includes caregiver participation and parent report.',
    'Developmental history notes delayed milestones and early intervention.',
    'Educational history includes school placement and IEP support.',
    'Behavior profile includes physical aggression, verbal aggression, non-compliance, property destruction, profane language, elopement, and unsafe behaviors.',
    'Communication profile indicates functional request and break communication needs.',
    'Social profile indicates reciprocal interaction and peer play needs.',
    'Parent training should address caregiver prompting, reinforcement, generalization, and safety response.',
  ].join(' '))
  await writeFile(join(sourceFolder, 'vineland.pdf'), minimalPdfBuffer([
    'Vineland-3 Comprehensive Report.',
    'The Adaptive Behavior Composite ABC standard score is 60, with a percentile rank of 1.',
    'Communication standard score is 58, with a percentile rank of 1.',
    'The standard score for Daily Living Skills is 70, with a percentile rank of 2.',
    'Socialization standard score is 48, with a percentile rank of 1.',
    'The Maladaptive Behavior domain includes v-scale scores of 21 for Internalizing and 24 for Externalizing.',
    'Communication domain, Daily Living Skills, and Socialization domain results support functional communication, adaptive, and social goal planning.',
  ]))
  await writeFile(join(sourceFolder, 'legacy-report.doc'), 'unsupported binary placeholder')

  return { sourceFolder, outputDir }
}

async function createEvaluationAndVinelandOnlyFixture() {
  const root = await mkdtemp(join(tmpdir(), 'skillcascade-report-helper-no-intake-'))
  const sourceFolder = join(root, 'source')
  const outputDir = join(root, 'output')
  await mkdir(sourceFolder, { recursive: true })
  await mkdir(outputDir, { recursive: true })
  await writeFile(join(sourceFolder, 'psychological-evaluation.md'), [
    'Psychological evaluation and diagnostic report.',
    'Diagnosis: Autism Spectrum Disorder F84.0.',
    'Records describe aggression, non-compliance, unsafe behavior, rigid thinking, transitions, and functional impairment.',
    'Communication deficits include expressive language, receptive language, pragmatic language, conversation, and functional communication needs.',
    'Social deficits include reciprocal interaction, peer interaction, social communication, play, and perspective-taking needs.',
    'Caregiver training needs include home generalization, reinforcement, prompting, and parent training.',
  ].join('\n'))
  await writeFile(join(sourceFolder, 'vineland.md'), [
    'Vineland-3 adaptive behavior report.',
    'Adaptive Behavior Composite, Communication domain, Daily Living Skills, and Socialization domain results support adaptive functioning needs.',
    'Daily living, community, self-care, socialization, expressive communication, and receptive communication deficits are noted.',
  ].join('\n'))

  return { sourceFolder, outputDir }
}

async function createUnsupportedBehaviorFixture() {
  const root = await mkdtemp(join(tmpdir(), 'skillcascade-report-helper-unsupported-behavior-'))
  const sourceFolder = join(root, 'source')
  const outputDir = join(root, 'output')
  await mkdir(sourceFolder, { recursive: true })
  await mkdir(outputDir, { recursive: true })
  await writeFile(join(sourceFolder, 'psychological-evaluation.md'), [
    'Psychological evaluation and diagnostic report.',
    'Diagnosis: Autism Spectrum Disorder F84.0.',
    'Reason for Referral:',
    'The diagnostic evaluation supports Autism Spectrum Disorder F84.0 and clinically significant social communication deficits, restricted interests, rigidity, transition difficulty, sensory sensitivity, and adaptive functioning delays.',
    'Educational History:',
    'The client currently attends school and requires support with classroom participation, reciprocal communication, group instruction, and transitions.',
    'Behavioral Observations:',
    'No physical aggression, property destruction, profane language, or elopement was reported in the reviewed evaluation.',
    'Communication deficits include expressive language, receptive language, pragmatic language, conversation, self-advocacy, and functional communication needs.',
    'Social deficits include reciprocal interaction, peer interaction, social communication, play, flexibility, and perspective-taking needs.',
    'Caregiver training needs include home generalization, reinforcement, prompting, visual supports, and parent training.',
    'ADOS-2 Results:',
    'ADOS-2 Module 3 was administered. Social Affect Total: 15. RRB Total: 5. ADOS-2 Classification: Autism. Comparison Score: 8 (High level of autism spectrum-related symptoms).',
  ].join('\n'))
  await writeFile(join(sourceFolder, 'vineland.pdf'), minimalPdfBuffer([
    'Vineland-3 Comprehensive Report.',
    'The Adaptive Behavior Composite ABC standard score is 64, with a percentile rank of 1.',
    'Communication standard score is 62, with a percentile rank of 1.',
    'The standard score for Daily Living Skills is 72, with a percentile rank of 3.',
    'Socialization standard score is 55, with a percentile rank of 1.',
    'Communication domain, Daily Living Skills, and Socialization domain results support adaptive functioning needs.',
  ]))

  return { sourceFolder, outputDir }
}

async function createVinelandMaladaptiveItemFixture() {
  const root = await mkdtemp(join(tmpdir(), 'skillcascade-report-helper-vineland-maladaptive-'))
  const sourceFolder = join(root, 'source')
  const outputDir = join(root, 'output')
  await mkdir(sourceFolder, { recursive: true })
  await mkdir(outputDir, { recursive: true })
  await writeFile(join(sourceFolder, 'psychological-evaluation.md'), [
    'Psychological evaluation and diagnostic report.',
    'Diagnosis: Autism Spectrum Disorder F84.0.',
    'Communication deficits include expressive language, receptive language, pragmatic language, conversation, and functional communication needs.',
    'Social deficits include reciprocal interaction, peer interaction, social communication, play, flexibility, and perspective-taking needs.',
    'Caregiver training needs include home generalization, reinforcement, prompting, and parent training.',
  ].join('\n'))
  await writeFile(join(sourceFolder, 'vineland.pdf'), minimalPdfBuffer([
    'Vineland-3 Comprehensive Report.',
    'Adaptive Behavior Composite, Communication domain, Daily Living Skills, and Socialization domain results support adaptive functioning needs.',
    'MALADAPTIVE BEHAVIOR ITEMS.',
    'Has temper tantrums 1.',
    'Disobeys those in authority 2.',
    'Is physically aggressive 2.',
    'Is verbally abusive 2.',
    "Destroys their or another's possessions on purpose 2.",
    'Wanders or darts away without regard for safety 2.',
    'Threatens to hurt or kill someone 1.',
  ]))

  return { sourceFolder, outputDir }
}

const server = startServer()

try {
  await waitForStatus()

  const statusResponse = await fetch(`${baseUrl}${helperApi}/status`, {
    headers: { Origin: origin },
  })
  assert.equal(statusResponse.status, 200)
  assert.equal(statusResponse.headers.get('access-control-allow-origin'), origin)
  assert.equal(statusResponse.headers.get('access-control-allow-credentials'), 'true')
  const statusPayload = await statusResponse.json()
  assert.equal(statusPayload.localOnly, true)
  assert.equal(statusPayload.helperUrl, baseUrl)
  assert.equal(statusPayload.port, port)
  assert.equal(statusPayload.portDiscovery.startPort, 4181)
  assert.equal(statusPayload.portDiscovery.endPort, 4199)
  assert.equal(statusPayload.safety.cloudUpload, false)
  assert.ok(statusPayload.helperVersion)
  assert.equal(statusPayload.runProofVersion, 1)
  assert.equal(statusPayload.creditProof, 'server-validated-run-proof-v1')
  assert.equal(statusPayload.customerTemplateUpload, false)
  assert.equal(statusPayload.standardTemplate.mode, 'skillcascade-standard-docx')
  assert.equal(statusPayload.supervisorReviewedStyle.id, 'supervisor-reviewed-aba-initial-v1')
  assert.equal(statusPayload.supervisorReviewedStyle.checkboxFont, 'Segoe UI Symbol')
  assert.equal(statusPayload.supervisorReviewedStyle.outputPolicy.standardTemplateOnly, true)
  assert.equal(statusPayload.requiredEvidenceCategories.length, 3)
  assert.equal(
    statusPayload.requiredEvidenceCategories.find((category) => category.id === 'intake_or_caregiver_history')?.required,
    false,
  )
  assert.ok(statusPayload.assessmentAdapters.some((adapter) => adapter.id === 'vineland'))
  assert.equal(statusPayload.installState.localDataPolicy.updatesPreserveCustomerData, true)
  assert.equal(statusPayload.installState.localPortPolicy.collisionBehavior, 'choose-next-available-loopback-port')
  assert.equal(statusPayload.installState.licensingPolicy.skillCascadeWorkflowPackIsAuthority, true)
  assert.equal(statusPayload.endpoints.licenseReadiness, `${helperApi}/license-readiness`)
  assert.equal(statusPayload.endpoints.pickFolder, `${helperApi}/pick-folder`)
  assert.equal(statusPayload.endpoints.programSetupPreview, `${helperApi}/program-setup/preview`)
  assert.equal(statusPayload.endpoints.programSetupWrite, `${helperApi}/program-setup/write`)
  assert.equal(statusPayload.endpoints.programSetupVerify, `${helperApi}/program-setup/verify`)
  assert.equal(statusPayload.endpoints.passageCredentialStatus, `${helperApi}/passage-credential/status`)
  assert.equal(statusPayload.endpoints.passageCredentialSetup, `${helperApi}/passage-credential/setup`)
  assert.equal(statusPayload.endpoints.passageCredentialVerify, `${helperApi}/passage-credential/verify`)
  assert.equal(statusPayload.endpoints.passageCredentialClear, `${helperApi}/passage-credential/clear`)
  assert.equal(statusPayload.endpoints.passageBrowserStart, `${helperApi}/passage-browser/start`)
  assert.equal(statusPayload.endpoints.templateProfile, undefined)
  assert.equal(statusPayload.endpoints.templateProfiles, undefined)
  assert.equal(statusPayload.legacyEndpoints.licenseReadiness, `${legacyHelperApi}/license-readiness`)
  assert.equal(statusPayload.legacyEndpoints.pickFolder, `${legacyHelperApi}/pick-folder`)
  assert.equal(statusPayload.legacyEndpoints.programSetupPreview, `${legacyHelperApi}/program-setup/preview`)
  assert.equal(statusPayload.pathPickers.folderEndpoint, `${helperApi}/pick-folder`)
  assert.equal(statusPayload.pathPickers.fileEndpoint, undefined)
  assert.equal(statusPayload.pathPickers.returnsPathOnly, true)
  assert.equal(statusPayload.templatePolicy.customTemplateAccepted, false)
  assert.equal(statusPayload.programSetup.workflow, 'initial-assessment-learning-tree')
  assert.equal(statusPayload.programSetup.contract.id, 'initial-assessment-learning-tree-v1')
  assert.equal(statusPayload.programSetup.contract.centralReach.percentTrialCount, 10)
  assert.equal(statusPayload.programSetup.liveAdapterContract.id, 'initial-assessment-learning-tree-live-adapter-v1')
  assert.equal(statusPayload.programSetup.liveAdapterContract.liveWritesDefault, false)
  assert.equal(statusPayload.programSetup.liveAdapterContract.liveAdapters.passage.implemented, true)
  assert.equal(statusPayload.programSetup.liveAdapterContract.liveAdapters.passage.requiresConfiguredLocalCredential, true)
  assert.equal(statusPayload.programSetup.liveAdapterContract.liveAdapters.passage.requiresVerifiedAccountGate, true)
  assert.equal(statusPayload.programSetup.passageCredential.credentialSetup.configured, false)
  assert.equal(statusPayload.programSetup.passageCredential.contract.accountGateRequired, true)
  assert.equal(statusPayload.programSetup.passageCredential.contract.credentialNeverReturnedToWebsite, true)
  assert.ok(statusPayload.programSetup.supportedWriteModes.includes('live_external_write'))
  assert.equal(statusPayload.programSetup.requiredLiveConfirmation, 'CREATE LEARNING TREE')
  assert.equal(statusPayload.programSetup.liveExternalWrites, 'passage-approval-gated')
  assert.equal(statusPayload.programSetup.currentWriteMode, 'local-setup-package-plus-passage-live-adapter')
  assert.equal(statusPayload.licenseReadiness.localOnly, true)
  assert.equal(statusPayload.licenseReadiness.authority.localHelperStoresBillingSecrets, false)
  assert.equal(statusPayload.licenseReadiness.authority.localHelperCanGrantAccess, false)
  assert.ok(statusPayload.licenseReadiness.installFingerprint)

  const credentialSetupResponse = await fetch(`${baseUrl}${helperApi}/passage-credential/setup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Origin: origin },
    body: JSON.stringify({
      credentialScope: 'smoke-test',
      email: 'provider@example.test',
      password: 'not-a-real-password',
      verify: false,
    }),
  })
  assert.equal(credentialSetupResponse.status, 200)
  const credentialSetupPayload = await credentialSetupResponse.json()
  assert.equal(credentialSetupPayload.ok, true)
  assert.equal(credentialSetupPayload.result.credentialSetup.configured, true)
  assert.equal(credentialSetupPayload.result.credentialSetup.credentialScope, 'smoke-test')
  const credentialSetupJson = JSON.stringify(credentialSetupPayload)
  assert.equal(credentialSetupJson.includes('not-a-real-password'), false)
  assert.equal(credentialSetupJson.includes('provider@example.test'), false)
  assert.match(credentialSetupPayload.result.credentialSetup.accountMasked, /^pr\*\*\*@example\.test$/)

  const credentialStatusResponse = await fetch(`${baseUrl}${helperApi}/passage-credential/status?credentialScope=smoke-test`, {
    headers: { Origin: origin },
  })
  assert.equal(credentialStatusResponse.status, 200)
  const credentialStatusPayload = await credentialStatusResponse.json()
  assert.equal(credentialStatusPayload.ok, true)
  assert.equal(credentialStatusPayload.result.credentialSetup.configured, true)
  assert.equal(JSON.stringify(credentialStatusPayload).includes('not-a-real-password'), false)

  const credentialClearResponse = await fetch(`${baseUrl}${helperApi}/passage-credential/clear`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Origin: origin },
    body: JSON.stringify({ credentialScope: 'smoke-test' }),
  })
  assert.equal(credentialClearResponse.status, 200)
  const credentialClearPayload = await credentialClearResponse.json()
  assert.equal(credentialClearPayload.ok, true)
  assert.equal(credentialClearPayload.result.credentialSetup.configured, false)

  const installStateResponse = await fetch(`${baseUrl}${helperApi}/install-state`, {
    headers: { Origin: origin },
  })
  assert.equal(installStateResponse.status, 200)
  const installStatePayload = await installStateResponse.json()
  assert.equal(installStatePayload.ok, true)
  assert.equal(installStatePayload.result.updatePolicy.autoUpdateEnabled, false)
  assert.equal(installStatePayload.result.licensingPolicy.readinessEndpoint, `${helperApi}/license-readiness`)
  assert.equal(installStatePayload.result.licensingPolicy.legacyReadinessEndpoint, `${legacyHelperApi}/license-readiness`)
  if (installStatePayload.result.buildManifest) {
    assert.equal(installStatePayload.result.buildManifest.updatesPreserveCustomerData, true)
    assert.ok(installStatePayload.result.buildManifest.packageVersion)
  }

  const licenseReadinessResponse = await fetch(`${baseUrl}${helperApi}/license-readiness`, {
    headers: { Origin: origin },
  })
  assert.equal(licenseReadinessResponse.status, 200)
  const licenseReadinessPayload = await licenseReadinessResponse.json()
  assert.equal(licenseReadinessPayload.ok, true)
  assert.equal(licenseReadinessPayload.result.localOnly, true)
  assert.equal(licenseReadinessPayload.result.installFingerprint, statusPayload.licenseReadiness.installFingerprint)
  assert.equal(licenseReadinessPayload.result.authority.requiredWorkflowPack, 'report-generator')
  assert.equal(licenseReadinessPayload.result.authority.localHelperStoresBillingSecrets, false)
  assert.equal(licenseReadinessPayload.result.authority.localHelperCanGrantAccess, false)
  assert.equal(licenseReadinessPayload.result.seatClaim.recommendedKey, licenseReadinessPayload.result.installFingerprint)

  const preflightResponse = await fetch(`${baseUrl}${helperApi}/run`, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
      'Access-Control-Request-Private-Network': 'true',
    },
  })
  assert.equal(preflightResponse.status, 204)
  assert.equal(preflightResponse.headers.get('access-control-allow-private-network'), 'true')
  assert.equal(preflightResponse.headers.get('access-control-allow-credentials'), 'true')

  const { sourceFolder, outputDir } = await createSourceFixture()

  const legacyStatusResponse = await fetch(`${baseUrl}${legacyHelperApi}/status`, {
    headers: { Origin: origin },
  })
  assert.equal(legacyStatusResponse.status, 200)
  const legacyStatusPayload = await legacyStatusResponse.json()
  assert.equal(legacyStatusPayload.ok, true)
  assert.equal(legacyStatusPayload.endpoints.run, `${helperApi}/run`)

  const templateProfileResponse = await fetch(`${baseUrl}${helperApi}/template-profile`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ templatePath: join(sourceFolder, 'customer-template.docx') }),
  })
  assert.equal(templateProfileResponse.status, 410)
  const templateProfilePayload = await templateProfileResponse.json()
  assert.equal(templateProfilePayload.ok, false)
  assert.match(templateProfilePayload.error, /standard initial assessment template/i)

  const savedTemplateProfilesResponse = await fetch(`${baseUrl}${helperApi}/template-profiles`, {
    headers: { Origin: origin },
  })
  assert.equal(savedTemplateProfilesResponse.status, 410)
  const savedTemplateProfilesPayload = await savedTemplateProfilesResponse.json()
  assert.equal(savedTemplateProfilesPayload.ok, false)
  assert.match(savedTemplateProfilesPayload.error, /standard initial assessment template/i)

  const standardPreflightResponse = await fetch(`${baseUrl}${helperApi}/preflight`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceFolder,
      outputDir,
    }),
  })
  assert.equal(standardPreflightResponse.status, 200)
  const standardPreflightPayload = await standardPreflightResponse.json()
  assert.equal(standardPreflightPayload.ok, true)
  assert.equal(standardPreflightPayload.result.okToRun, true)
  assert.equal(standardPreflightPayload.result.sourceTextReturned, false)
  assert.equal(standardPreflightPayload.result.sourceSummary.supportedFileCount, 3)
  assert.equal(standardPreflightPayload.result.sourceSummary.unsupportedFileCount, 1)
  assert.ok(standardPreflightPayload.result.sourceSummary.supportedExtensions.includes('.pdf'))
  assert.equal(standardPreflightPayload.result.standardTemplate.mode, 'skillcascade-standard-docx')
  assert.equal(standardPreflightPayload.result.supervisorReviewedStyle.id, 'supervisor-reviewed-aba-initial-v1')
  assert.equal(standardPreflightPayload.result.templateSummary.styleRuleId, 'supervisor-reviewed-aba-initial-v1')
  assert.equal(standardPreflightPayload.result.templateSummary.customerTemplateUpload, false)
  assert.equal(standardPreflightPayload.result.evidenceReadiness.ready, true)
  assert.equal(standardPreflightPayload.result.evidenceReadiness.categories.length, 3)
  assert.ok(standardPreflightPayload.result.assessmentAdapters.some((adapter) => adapter.id === 'vineland'))
  assert.ok(standardPreflightPayload.result.deficitProfile.supportedGoalDomains.includes('Communication'))
  assert.equal(standardPreflightPayload.result.coverageMatrix.status, 'review-needed')
  assert.equal(standardPreflightPayload.result.coverageMatrix.sourceTextReturned, false)
  assert.equal(standardPreflightPayload.result.coverageMatrix.summary.requiredEvidenceFound, 2)
  assert.equal(standardPreflightPayload.result.coverageMatrix.summary.requiredEvidenceTotal, 2)
  assert.equal(standardPreflightPayload.result.coverageMatrix.summary.recommendedEvidenceFound, 1)
  assert.equal(standardPreflightPayload.result.coverageMatrix.summary.recommendedEvidenceTotal, 1)
  assert.equal(standardPreflightPayload.result.coverageMatrix.summary.sourceSupportedSectionCount, 8)
  assert.ok(standardPreflightPayload.result.coverageMatrix.goalDomainCoverage.some((domain) => domain.domain === 'Communication' && domain.goalCount > 0))

  const noIntakeFixture = await createEvaluationAndVinelandOnlyFixture()
  const noIntakePreflightResponse = await fetch(`${baseUrl}${helperApi}/preflight`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(noIntakeFixture),
  })
  assert.equal(noIntakePreflightResponse.status, 200)
  const noIntakePreflightPayload = await noIntakePreflightResponse.json()
  assert.equal(noIntakePreflightPayload.ok, true)
  assert.equal(noIntakePreflightPayload.result.okToRun, true)
  assert.equal(noIntakePreflightPayload.result.evidenceReadiness.ready, true)
  assert.equal(noIntakePreflightPayload.result.evidenceReadiness.missingRequired.length, 0)
  assert.equal(
    noIntakePreflightPayload.result.evidenceReadiness.categories.find((category) => category.id === 'intake_or_caregiver_history')?.status,
    'missing',
  )
  assert.equal(noIntakePreflightPayload.result.coverageMatrix.summary.requiredEvidenceFound, 2)
  assert.equal(noIntakePreflightPayload.result.coverageMatrix.summary.requiredEvidenceTotal, 2)
  assert.equal(noIntakePreflightPayload.result.coverageMatrix.summary.recommendedEvidenceFound, 0)
  assert.equal(noIntakePreflightPayload.result.coverageMatrix.summary.recommendedEvidenceTotal, 1)

  const unsupportedBehaviorFixture = await createUnsupportedBehaviorFixture()
  const unsupportedBehaviorRunResponse = await fetch(`${baseUrl}${helperApi}/run`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...unsupportedBehaviorFixture,
      clientLabel: 'Unsupported Behavior Guard Client',
    }),
  })
  assert.equal(unsupportedBehaviorRunResponse.status, 200)
  const unsupportedBehaviorRunPayload = await unsupportedBehaviorRunResponse.json()
  assert.equal(unsupportedBehaviorRunPayload.ok, true)
  assert.equal(unsupportedBehaviorRunPayload.result.goalPlan.domains.Behavior || 0, 0)
  assert.equal(unsupportedBehaviorRunPayload.result.goalPlan.standardBehaviorPackApplied, false)
  assert.equal(
    unsupportedBehaviorRunPayload.result.goalPlan.goals.some((goal) => goal.id === 'behavior-aggression' || goal.id === 'behavior-property-destruction' || goal.id === 'behavior-elopement' || goal.id === 'behavior-unsafe-behavior'),
    false,
  )
  assert.equal(unsupportedBehaviorRunPayload.result.assessmentAdapters.some((adapter) => adapter.id === 'vineland'), true)
  assert.equal(unsupportedBehaviorRunPayload.result.sourcePacket.sources.some((source) => source.extension === '.pdf' && source.pageCount >= 1), true)
  const unsupportedBehaviorOutput = await mammoth.extractRawText({ path: unsupportedBehaviorRunPayload.result.outputPath })
  assert.equal(unsupportedBehaviorOutput.value.includes('not currently able to attend a traditional school setting'), false)
  assert.match(unsupportedBehaviorOutput.value, /currently attends school|attend school or participate in an educational program/)
  assert.equal(unsupportedBehaviorOutput.value.includes('The client will decrease instances of physical aggression.'), false)
  assert.equal(unsupportedBehaviorOutput.value.includes('The client will decrease elopement.'), false)
  assert.equal(unsupportedBehaviorOutput.value.includes('The client will decrease unsafe behaviors.'), false)
  assert.match(unsupportedBehaviorOutput.value, /Vineland-3 results indicated an Adaptive Behavior Composite standard score of 64/)

  const vinelandMaladaptiveFixture = await createVinelandMaladaptiveItemFixture()
  const vinelandMaladaptiveRunResponse = await fetch(`${baseUrl}${helperApi}/run`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...vinelandMaladaptiveFixture,
      clientLabel: 'Vineland Maladaptive Item Client',
    }),
  })
  assert.equal(vinelandMaladaptiveRunResponse.status, 200)
  const vinelandMaladaptiveRunPayload = await vinelandMaladaptiveRunResponse.json()
  assert.equal(vinelandMaladaptiveRunPayload.ok, true)
  const vinelandBehaviorGoalIds = new Set(vinelandMaladaptiveRunPayload.result.goalPlan.goals
    .filter((goal) => goal.domain === 'Behavior')
    .map((goal) => goal.id))
  for (const goalId of [
    'behavior-aggression',
    'behavior-verbal-aggression',
    'behavior-noncompliance',
    'behavior-property-destruction',
    'behavior-elopement',
    'behavior-unsafe-behavior',
  ]) {
    assert.equal(vinelandBehaviorGoalIds.has(goalId), true, `${goalId} should be selected from Vineland item evidence`)
  }
  assert.equal(vinelandBehaviorGoalIds.has('behavior-profane-language'), false)
  assert.equal(vinelandMaladaptiveRunPayload.result.coverageMatrix.goalDomainCoverage.find((domain) => domain.domain === 'Behavior')?.goalCount, 6)

  const customTemplatePreflightResponse = await fetch(`${baseUrl}${helperApi}/preflight`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceFolder,
      outputDir,
      templatePath: join(sourceFolder, 'customer-template.docx'),
    }),
  })
  assert.equal(customTemplatePreflightResponse.status, 200)
  const customTemplatePreflightPayload = await customTemplatePreflightResponse.json()
  assert.equal(customTemplatePreflightPayload.ok, true)
  assert.equal(customTemplatePreflightPayload.result.okToRun, false)
  assert.ok(customTemplatePreflightPayload.result.blockers.some((blocker) => /customer word templates are disabled/i.test(blocker)))
  assert.equal(customTemplatePreflightPayload.result.templateSummary.mode, 'skillcascade-standard-docx')

  const sameFolderPreflightResponse = await fetch(`${baseUrl}${helperApi}/preflight`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceFolder,
      outputDir: sourceFolder,
    }),
  })
  assert.equal(sameFolderPreflightResponse.status, 200)
  const sameFolderPreflightPayload = await sameFolderPreflightResponse.json()
  assert.equal(sameFolderPreflightPayload.ok, true)
  assert.equal(sameFolderPreflightPayload.result.okToRun, true)
  assert.equal(sameFolderPreflightPayload.result.outputDir, sourceFolder)
  assert.equal(sameFolderPreflightPayload.result.outputStrategy, 'source-folder')
  assert.equal(sameFolderPreflightPayload.result.sourceSummary.supportedFileCount, 3)

  const standardRunResponse = await fetch(`${baseUrl}${helperApi}/run`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceFolder,
      outputDir,
      clientLabel: 'Standard Client',
    }),
  })
  assert.equal(standardRunResponse.status, 200)
  const standardRunPayload = await standardRunResponse.json()
  assert.equal(standardRunPayload.ok, true)
  assert.equal(standardRunPayload.result.templateMode, 'skillcascade-standard-docx')
  assert.equal(standardRunPayload.result.standardTemplate.customerTemplateUpload, false)
  assert.equal(standardRunPayload.result.evidenceReadiness.ready, true)
  assert.ok(standardRunPayload.result.assessmentAdapters.some((adapter) => adapter.id === 'vineland'))
  assert.equal(standardRunPayload.result.coverageMatrix.status, 'review-needed')
  assert.equal(standardRunPayload.result.coverageMatrix.summary.selectedGoalCount, standardRunPayload.result.goalPlan.goals.length)

  const runResponse = await fetch(`${baseUrl}${helperApi}/run`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceFolder,
      outputDir,
      clientLabel: 'Release Client',
      reportTitle: 'SkillCascade Local Helper Smoke Draft',
    }),
  })
  assert.equal(runResponse.status, 200)
  assert.equal(runResponse.headers.get('access-control-allow-origin'), origin)
  const runPayload = await runResponse.json()
  assert.equal(runPayload.ok, true)
  assert.equal(runPayload.result.localOnly, true)
  assert.equal(runPayload.result.runProof.localOnly, true)
  assert.equal(runPayload.result.runProof.localRunId, runPayload.result.id)
  assert.equal(runPayload.result.runProof.idempotencyKey, runPayload.result.id)
  assert.equal(runPayload.result.runProof.helperVersion, statusPayload.helperVersion)
  assert.equal(runPayload.result.runProof.templateMode, 'skillcascade-standard-docx')
  assert.equal(runPayload.result.runProof.templateId, 'skillcascade-standard-initial-assessment-v1')
  assert.equal(runPayload.result.runProof.qaStatus, 'ready-for-bcba-review')
  assert.equal(runPayload.result.runProof.outputCreated, true)
  assert.equal(runPayload.result.runProof.reviewCreated, true)
  assert.equal(runPayload.result.runProof.evidenceLedgerCreated, true)
  assert.equal(runPayload.result.qa.liveWriteAttempted, false)
  assert.equal(runPayload.result.qa.autoSignAttempted, false)
  assert.equal(runPayload.result.qa.autoSubmitAttempted, false)
  assert.equal(runPayload.result.templateMode, 'skillcascade-standard-docx')
  assert.equal(runPayload.result.templateProfileId, '')
  assert.equal(runPayload.result.templateProfileLabel, '')
  assert.match(basename(runPayload.result.outputPath), /^ReleaseClientAssessment[A-Z][a-z]+\d{2}\.docx$/)
  assert.equal(Object.keys(runPayload.result.templateFieldAliases).length, 0)
  assert.equal(runPayload.result.standardTemplate.mode, 'skillcascade-standard-docx')
  assert.equal(runPayload.result.supervisorReviewedStyle.id, 'supervisor-reviewed-aba-initial-v1')
  assert.equal(runPayload.result.evidenceReadiness.ready, true)
  assert.equal(runPayload.result.coverageMatrix.status, 'review-needed')
  assert.equal(runPayload.result.coverageMatrix.summary.goalDomainsWithGoals.includes('Behavior'), true)
  assert.equal(runPayload.result.qa.standardTemplateClone.ok, true)
  assert.equal(runPayload.result.qa.standardTemplateClone.styleRuleId, 'supervisor-reviewed-aba-initial-v1')
  assert.equal(runPayload.result.qa.standardTemplateClone.checkboxFont, 'Segoe UI Symbol')
  assert.deepEqual(runPayload.result.qa.standardTemplateClone.visibleArtifactHits, [])
  assert.deepEqual(runPayload.result.qa.standardTemplateClone.unsupportedAssessmentReferences, [])
  assert.ok(runPayload.result.qa.standardTemplateClone.highlightCount >= 1)
  assert.equal(runPayload.result.qa.standardTemplateClone.contentControlCount, 0)
  assert.equal(runPayload.result.sourcePacket.sources.some((source) => 'text' in source), false)
  assert.equal(runPayload.result.sourcePacket.sources.some((source) => source.extension === '.pdf' && source.pageCount >= 1), true)
  assert.equal(runPayload.result.sourcePacket.unsupportedFiles.some((source) => source.filename === 'legacy-report.doc'), true)

  const outputStats = await stat(runPayload.result.outputPath)
  const reviewStats = await stat(runPayload.result.reviewPath)
  const evidenceLedgerStats = await stat(runPayload.result.evidenceLedgerPath)
  assert.ok(outputStats.size > 1000)
  assert.ok(reviewStats.size > 100)
  assert.ok(evidenceLedgerStats.size > 100)
  const evidenceLedger = JSON.parse(await readFile(runPayload.result.evidenceLedgerPath, 'utf8'))
  assert.equal(evidenceLedger.localOnly, true)
  assert.equal(evidenceLedger.containsPhi, true)
  assert.equal(evidenceLedger.dataPolicy.browserResponseContainsExcerpts, false)
  assert.equal(evidenceLedger.coverageMatrix.status, 'review-needed')
  assert.ok(evidenceLedger.sections.some((section) => section.evidence.some((item) => item.excerpt)))
  const reviewSummary = JSON.parse(await readFile(runPayload.result.reviewPath, 'utf8'))
  assert.equal(reviewSummary.coverageMatrix.status, 'review-needed')
  assert.equal(reviewSummary.supervisorReviewedStyle.id, 'supervisor-reviewed-aba-initial-v1')
  assert.equal(reviewSummary.evidenceSummary.coverageStatus, 'review-needed')
  assert.equal(reviewSummary.evidenceSummary.missingSectionCount, 0)
  assert.equal(runPayload.result.clinicalProfile.sections.some((section) => (
    section.sourceEvidence.some((item) => Object.prototype.hasOwnProperty.call(item, 'text') || Object.prototype.hasOwnProperty.call(item, 'excerpt'))
  )), false)
  assert.equal(runPayload.result.goalPlan.goals.some((goal) => (
    goal.sourceEvidence.some((item) => Object.prototype.hasOwnProperty.call(item, 'text') || Object.prototype.hasOwnProperty.call(item, 'excerpt'))
  )), false)
  const renderedOutput = await mammoth.extractRawText({ path: runPayload.result.outputPath })
  const cloneInspection = await inspectDocxCloneContract(runPayload.result.outputPath)
  assert.equal(await countDocxTables(runPayload.result.outputPath), 15)
  assert.equal(cloneInspection.tableCount, 15)
  assert.ok(cloneInspection.highlightCount >= 1)
  assert.equal(cloneInspection.contentControlCount, 0)
  assert.equal(cloneInspection.checkboxControlCount, 0)
  assert.ok(cloneInspection.checkboxFontRunCount >= 10)
  assert.equal(cloneInspection.legacyCheckboxFontRunCount, 0)
  assert.deepEqual(cloneInspection.unresolvedPhraseHits, [])
  assert.match(renderedOutput.value, /Client Name:/)
  assert.match(renderedOutput.value, /Release Client/)
  assert.match(renderedOutput.value, /Not provided in reviewed records/)
  assert.match(renderedOutput.value, /Biopsychosocial Information:/)
  assert.match(renderedOutput.value, /97151/)
  assert.match(renderedOutput.value, /97153/)
  assert.match(renderedOutput.value, /97155/)
  assert.match(renderedOutput.value, /97156/)
  assert.match(renderedOutput.value, /Medical Necessity:/)
  assert.match(renderedOutput.value, /Research has demonstrated that ABA methodology is effective/)
  assert.match(renderedOutput.value, /Maladaptive Behavior Type I/)
  assert.match(renderedOutput.value, /Maladaptive Behavior Type II/)
  assert.match(renderedOutput.value, /Behavior Intervention Plan:/)
  assert.match(renderedOutput.value, /Communication Skills:/)
  assert.match(renderedOutput.value, /Socialization skills:/)
  assert.match(renderedOutput.value, /Social Skills Group:/)
  assert.match(renderedOutput.value, /Parent Goals:/)
  assert.match(renderedOutput.value, /Verbal Aggression/)
  assert.match(renderedOutput.value, /Profane Language/)
  assert.match(renderedOutput.value, /Non-Compliance/)
  assert.match(renderedOutput.value, /Property Destruction/)
  assert.match(renderedOutput.value, /Elopement/)
  assert.match(renderedOutput.value, /Unsafe Behaviors/)
  assert.match(renderedOutput.value, /Group Discussions/)
  assert.match(renderedOutput.value, /Group Instruction/)
  assert.match(renderedOutput.value, /Structured Peer Play/)
  assert.match(renderedOutput.value, /Peer Tolerance/)
  assert.match(renderedOutput.value, /Feedback Tolerance/)
  assert.match(renderedOutput.value, /ADOS-2/)
  assert.match(renderedOutput.value, /Social Affect total of 19/)
  assert.match(renderedOutput.value, /Restricted and Repetitive Behavior total of 4/)
  assert.match(renderedOutput.value, /Comparison Score of 10/)
  assert.match(renderedOutput.value, /classification was Autism/)
  assert.match(renderedOutput.value, /Vineland-3 results indicated an Adaptive Behavior Composite standard score of 60/)
  assert.match(renderedOutput.value, /Communication results reflected a standard score of 58/)
  assert.match(renderedOutput.value, /Socialization results reflected a standard score of 48/)
  assert.match(renderedOutput.value, /unable to function in traditional academic environments/)
  assert.match(renderedOutput.value, /Eye contact was inconsistent/)
  assert.match(renderedOutput.value, /need for repetition and simplification/)
  assert.match(renderedOutput.value, /During the observation, Release/)
  assert.match(renderedOutput.value, /During structured interaction and task demands, Release/)
  assert.equal(/diagnostic observation\/source review/i.test(renderedOutput.value), false)
  assert.equal(/Additional observation findings indicate/i.test(renderedOutput.value), false)
  assert.equal(/Additional assessment information indicates/i.test(renderedOutput.value), false)
  assert.equal(/Additional collateral information indicates/i.test(renderedOutput.value), false)
  assert.equal(renderedOutput.value.includes('The following techniques will be utilized to support the client in acquiring the skills that are related to the core deficits of autism'), false)
  assert.equal(renderedOutput.value.includes('The BCBA will utilize a blend of evidence-based ABA principles'), false)
  for (const standaloneTechnique of ['Prompting', 'Shaping', 'Chaining', 'Task Analysis']) {
    assert.equal(new RegExp(`(^|\\n)${standaloneTechnique}(\\n|$)`).test(renderedOutput.value), false)
  }
  assert.equal(new RegExp(`(^|\\n)New(\\n|$)`).test(renderedOutput.value), false)
  assert.match(renderedOutput.value, /Graphs are intentionally omitted for this initial assessment/)
  assert.equal(renderedOutput.value.includes('Assessment interpretation should be finalized'), false)
  assert.match(renderedOutput.value, /Results of Preference Assessment: An interview informed/)
  assert.match(renderedOutput.value, /Access to preferred activities, breaks from difficult demands/)
  assert.match(renderedOutput.value, /Behavior-specific praise, tokens/)
  assert.match(renderedOutput.value, /FR1 to FR2 schedule/)
  assert.match(renderedOutput.value, /Parent involvement is expected to be a central component/)
  assert.match(renderedOutput.value, /Maladaptive behaviors to decrease/)
  assert.match(renderedOutput.value, /The maladaptive behaviors of/)
  for (const behaviorLabel of ['physical aggression', 'verbal aggression', 'non-compliance', 'property destruction', 'profane language', 'elopement', 'unsafe behavior']) {
    assert.match(renderedOutput.value, new RegExp(behaviorLabel, 'i'))
  }
  assert.match(renderedOutput.value, /Release will engage in reciprocal, functional communication/)
  assert.match(renderedOutput.value, /Release will engage in socially appropriate interaction/)
  assert.equal(renderedOutput.value.includes('The individual exhibits some difficulty or delay in acquiring skills'), false)
  assert.equal(renderedOutput.value.includes('The individual exhibits significant difficulty or delay in acquiring skills'), false)
  assert.equal(renderedOutput.value.includes('The individual exhibits extreme difficulty or delay in acquiring skills'), false)
  assert.match(renderedOutput.value, /Reason for Referral: Release's parents sought ABA treatment to mitigate the interfering effects of their child's ASD diagnosis/)
  assert.match(renderedOutput.value, /Program\/Behavior/)
  assert.match(cloneInspection.plainText, new RegExp(`Communication:\\s*${uncheckedBox} Mild\\s+${uncheckedBox} Moderate\\s+${checkedBox} Severe`))
  assert.match(cloneInspection.plainText, new RegExp(`Have you communicated with child.s PCP\\?\\s*${checkedBox} Y\\s+${uncheckedBox} N\\s+${uncheckedBox} Member declined`))
  assert.match(cloneInspection.plainText, new RegExp(`Suicidality\\?\\s*${checkedBox} Not present`))
  assert.match(cloneInspection.plainText, new RegExp(`Homicidality\\?\\s*${checkedBox} Not present`))
  assert.match(cloneInspection.plainText, new RegExp(`${checkedBox} This treatment plan was developed and reviewed with parent/caregiver`))
  assert.equal(renderedOutput.value.includes('Short-Term Goal'), false)
  assert.equal(renderedOutput.value.includes('Reviewer QA Appendix'), false)
  assert.equal(renderedOutput.value.includes('Source Packet Reviewed'), false)
  assert.equal(/source packet/i.test(renderedOutput.value), false)
  assert.equal(/can delete/i.test(renderedOutput.value), false)
  assert.equal(renderedOutput.value.includes('Write what ABA methods'), false)
  assert.equal(renderedOutput.value.includes('Please specify specific long term goals'), false)
  assert.equal(renderedOutput.value.includes('Not provided in the source packet; BCBA to verify before finalization.'), false)
  assert.equal(renderedOutput.value.includes('Mock Provider Header'), false)
  assert.equal(renderedOutput.value.includes('License: fake test line'), false)
  assert.equal(renderedOutput.value.includes('Initial observation details should be finalized'), false)
  assert.equal(renderedOutput.value.includes('Additional observation details should be added'), false)
  assert.equal(renderedOutput.value.includes('no recognized standardized assessment adapter'), false)
  assert.equal(runPayload.result.assessmentAdapters.some((adapter) => adapter.id === 'ados2'), true)
  assert.equal(runPayload.result.assessmentAdapters.some((adapter) => adapter.id === 'vbmapp'), false)
  assert.equal(runPayload.result.assessmentAdapters.some((adapter) => adapter.id === 'speech_language'), false)
  assert.equal(runPayload.result.assessmentAdapters.some((adapter) => adapter.id === 'ot_sensory'), false)
  assert.equal(runPayload.result.goalPlan.domains.Behavior, 7)
  assert.equal(runPayload.result.goalPlan.domains['Social Skills Group'], 5)
  assert.equal(runPayload.result.goalPlan.standardBehaviorPackApplied, true)
  assert.ok(runPayload.result.qa.warnings.some((warning) => /standard severe-behavior initial assessment pack/i.test(warning)))
  assert.ok(runPayload.result.goalPlan.goals.length >= 40)
  const behaviorGoals = runPayload.result.goalPlan.goals.filter((goal) => goal.domain === 'Behavior')
  const increaseGoals = runPayload.result.goalPlan.goals.filter((goal) => goal.domain !== 'Behavior')
  const behaviorBaselineValues = behaviorGoals.map((goal) => {
    const match = goal.baseline.match(/^([5-8]) instances per session$/)
    assert.ok(match, `behavior baseline must be 5-8 instances per session: ${goal.id}`)
    return Number(match[1])
  })
  const increaseBaselineValues = increaseGoals.map((goal) => {
    const match = goal.baseline.match(/^(\d{1,2})%$/)
    assert.ok(match, `increase-goal baseline must be a percentage: ${goal.id}`)
    const value = Number(match[1])
    assert.ok(value >= 0 && value <= 17, `increase-goal baseline must be 0-17%: ${goal.id}`)
    return value
  })
  assert.ok(new Set(behaviorBaselineValues).size >= 4)
  assert.ok(new Set(increaseBaselineValues).size >= 8)
  assert.equal(renderedOutput.value.includes('Baseline data will be collected'), false)
  assert.ok(renderedOutput.value.includes("Reason for Referral: Release's parents sought ABA treatment"))
  assert.ok(renderedOutput.value.includes('Release will engage in reciprocal, functional communication'))
  assert.ok(renderedOutput.value.includes('Release will engage in socially appropriate interaction'))
  assert.equal(renderedOutput.value.includes("Reason for Referral: The client's parents"), false)
  assert.equal(renderedOutput.value.includes('Client will engage in reciprocal, functional communication'), false)
  for (const goal of behaviorGoals) {
    assert.ok(renderedOutput.value.toLowerCase().includes(`${goal.shortTermGoalName}: ${goal.baseline}`.toLowerCase()))
  }
  assert.ok(renderedOutput.value.split(/\s+/).length >= 3500)
  assert.equal(renderedOutput.value.includes('REVIEW_UNSUPPORTED_TEMPLATE_FIELD'), false)

  const setupPreviewResponse = await fetch(`${baseUrl}${helperApi}/program-setup/preview`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reportResult: runPayload.result,
      goalPlan: runPayload.result.goalPlan,
      outputDir,
      clientLabel: 'Release Client',
      destination: 'centralreach',
    }),
  })
  assert.equal(setupPreviewResponse.status, 200)
  const setupPreviewPayload = await setupPreviewResponse.json()
  assert.equal(setupPreviewPayload.ok, true)
  assert.equal(setupPreviewPayload.result.okToPrepare, true)
  assert.equal(setupPreviewPayload.result.safety.liveExternalWriteAttempted, false)
  assert.equal(setupPreviewPayload.result.treePlan.contract.id, 'initial-assessment-learning-tree-v1')
  assert.equal(setupPreviewPayload.result.treePlan.destination, 'centralreach')
  assert.equal(setupPreviewPayload.result.treePlan.summary.goalCount, runPayload.result.goalPlan.goals.length)
  assert.equal(setupPreviewPayload.result.treePlan.summary.frequencyGoalCount, 7)
  assert.ok(setupPreviewPayload.result.treePlan.summary.percentGoalCount >= 30)
  assert.equal(setupPreviewPayload.result.treePlan.summary.byDomain.Behavior, 7)
  assert.equal(setupPreviewPayload.result.treePlan.summary.byDomain.Social, runPayload.result.goalPlan.domains.Social + runPayload.result.goalPlan.domains['Social Skills Group'])
  assert.ok(setupPreviewPayload.result.treePlan.expectedRows.every((row) => (
    row.dataCollectionType === 'datafrequency2' || row.trialCount === 10
  )))

  const setupUnapprovedResponse = await fetch(`${baseUrl}${helperApi}/program-setup/write`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reportResult: runPayload.result,
      goalPlan: runPayload.result.goalPlan,
      outputDir,
      clientLabel: 'Release Client',
      destination: 'centralreach',
    }),
  })
  assert.equal(setupUnapprovedResponse.status, 200)
  const setupUnapprovedPayload = await setupUnapprovedResponse.json()
  assert.equal(setupUnapprovedPayload.ok, true)
  assert.equal(setupUnapprovedPayload.result.prepared, false)
  assert.equal(setupUnapprovedPayload.result.blocked, true)
  assert.ok(setupUnapprovedPayload.result.blockers.some((blocker) => /approval is required/i.test(blocker)))

  const setupWriteResponse = await fetch(`${baseUrl}${helperApi}/program-setup/write`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reportResult: runPayload.result,
      goalPlan: runPayload.result.goalPlan,
      outputDir,
      clientLabel: 'Release Client',
      destination: 'centralreach',
      approval: { approved: true },
    }),
  })
  assert.equal(setupWriteResponse.status, 200)
  const setupWritePayload = await setupWriteResponse.json()
  assert.equal(setupWritePayload.ok, true)
  assert.equal(setupWritePayload.result.prepared, true)
  assert.equal(setupWritePayload.result.writeProof.localOnly, true)
  assert.equal(setupWritePayload.result.writeProof.liveExternalWriteAttempted, false)
  assert.equal(setupWritePayload.result.writeProof.externalWriteMode, 'not_attempted_local_setup_package_only')
  assert.ok(setupWritePayload.result.setupPackagePath.endsWith('release-client-initial-learning-tree-setup.json'))
  const setupPackageStats = await stat(setupWritePayload.result.setupPackagePath)
  assert.ok(setupPackageStats.size > 1000)
  const setupPackage = JSON.parse(await readFile(setupWritePayload.result.setupPackagePath, 'utf8'))
  assert.equal(setupPackage.treePlan.planHash, setupWritePayload.result.writeProof.planHash)

  const setupVerifyResponse = await fetch(`${baseUrl}${helperApi}/program-setup/verify`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reportResult: runPayload.result,
      goalPlan: runPayload.result.goalPlan,
      clientLabel: 'Release Client',
      destination: 'centralreach',
      writeProof: setupWritePayload.result.writeProof,
    }),
  })
  assert.equal(setupVerifyResponse.status, 200)
  const setupVerifyPayload = await setupVerifyResponse.json()
  assert.equal(setupVerifyPayload.ok, true)
  assert.equal(setupVerifyPayload.result.verified, true)
  assert.equal(setupVerifyPayload.result.verification.planHashMatches, true)
  assert.equal(setupVerifyPayload.result.verification.liveExternalWriteAttempted, false)

  const setupLiveWriteResponse = await fetch(`${baseUrl}${helperApi}/program-setup/write`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reportResult: runPayload.result,
      goalPlan: runPayload.result.goalPlan,
      outputDir,
      clientLabel: 'Release Client',
      destination: 'centralreach',
      executionMode: 'live_external_write',
      destinationAdapter: {
        enabled: true,
        capability: 'learning_tree_setup_v1',
      },
      approval: {
        approved: true,
        externalWriteApproved: true,
        confirmation: 'CREATE LEARNING TREE',
      },
    }),
  })
  assert.equal(setupLiveWriteResponse.status, 200)
  const setupLiveWritePayload = await setupLiveWriteResponse.json()
  assert.equal(setupLiveWritePayload.ok, true)
  assert.equal(setupLiveWritePayload.result.prepared, false)
  assert.equal(setupLiveWritePayload.result.blocked, true)
  assert.equal(setupLiveWritePayload.result.adapterBoundary.liveExternalWriteAttempted, false)
  assert.ok(setupLiveWritePayload.result.blockers.some((blocker) => /CentralReach learning-tree writes are not implemented/i.test(blocker)))

  const setupAdapterDryRunResponse = await fetch(`${baseUrl}${helperApi}/program-setup/write`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reportResult: runPayload.result,
      goalPlan: runPayload.result.goalPlan,
      outputDir,
      clientLabel: 'Release Client',
      destination: 'centralreach',
      executionMode: 'adapter_dry_run',
      destinationAdapter: {
        enabled: true,
        capability: 'learning_tree_setup_v1',
      },
      approval: { approved: true },
    }),
  })
  assert.equal(setupAdapterDryRunResponse.status, 200)
  const setupAdapterDryRunPayload = await setupAdapterDryRunResponse.json()
  assert.equal(setupAdapterDryRunPayload.ok, true)
  assert.equal(setupAdapterDryRunPayload.result.prepared, true)
  assert.equal(setupAdapterDryRunPayload.result.writeProof.externalWriteMode, 'adapter_dry_run_proof_only')
  assert.equal(setupAdapterDryRunPayload.result.writeProof.liveExternalWriteAttempted, false)
  assert.equal(setupAdapterDryRunPayload.result.writeProof.destinationAdapterContractId, 'initial-assessment-learning-tree-live-adapter-v1')

  const passageAdapterDryRunResponse = await fetch(`${baseUrl}${helperApi}/program-setup/write`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reportResult: runPayload.result,
      goalPlan: runPayload.result.goalPlan,
      outputDir,
      clientLabel: 'Release Client',
      destination: 'passage',
      executionMode: 'adapter_dry_run',
      destinationAdapter: {
        enabled: true,
        capability: 'learning_tree_setup_v1',
        mockPassage: true,
        clientName: 'Release Client',
      },
      approval: { approved: true },
    }),
  })
  assert.equal(passageAdapterDryRunResponse.status, 200)
  const passageAdapterDryRunPayload = await passageAdapterDryRunResponse.json()
  assert.equal(passageAdapterDryRunPayload.ok, true)
  assert.equal(passageAdapterDryRunPayload.result.prepared, true)
  assert.equal(passageAdapterDryRunPayload.result.writeProof.externalWriteMode, 'passage_adapter_dry_run')
  assert.equal(passageAdapterDryRunPayload.result.writeProof.liveExternalWriteAttempted, false)
  assert.equal(passageAdapterDryRunPayload.result.writeProof.destinationAdapterProof.adapter, 'passage-web-app-trpc')
  assert.equal(passageAdapterDryRunPayload.result.writeProof.destinationAdapterProof.liveExternalWriteAttempted, false)

  const passageLiveWriteResponse = await fetch(`${baseUrl}${helperApi}/program-setup/write`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reportResult: runPayload.result,
      goalPlan: runPayload.result.goalPlan,
      outputDir,
      clientLabel: 'Release Client',
      destination: 'passage',
      executionMode: 'live_external_write',
      destinationAdapter: {
        enabled: true,
        capability: 'learning_tree_setup_v1',
        mockPassage: true,
        clientName: 'Release Client',
      },
      approval: {
        approved: true,
        externalWriteApproved: true,
        confirmation: 'CREATE LEARNING TREE',
      },
    }),
  })
  assert.equal(passageLiveWriteResponse.status, 200)
  const passageLiveWritePayload = await passageLiveWriteResponse.json()
  assert.equal(passageLiveWritePayload.ok, true)
  assert.equal(passageLiveWritePayload.result.prepared, true)
  assert.equal(passageLiveWritePayload.result.writeProof.externalWriteMode, 'passage_live_external_write')
  assert.equal(passageLiveWritePayload.result.writeProof.liveExternalWriteAttempted, true)
  assert.equal(passageLiveWritePayload.result.writeProof.destinationAdapterProof.verificationSummary.missingGoalCount, 0)
  assert.equal(passageLiveWritePayload.result.writeProof.destinationAdapterProof.verificationSummary.missingTargetCount, 0)

  const sameFolderRunResponse = await fetch(`${baseUrl}${helperApi}/run`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceFolder,
      outputDir: sourceFolder,
      clientLabel: 'Same Folder Client',
      reportTitle: 'Same Folder Output Draft',
    }),
  })
  assert.equal(sameFolderRunResponse.status, 200)
  const sameFolderRunPayload = await sameFolderRunResponse.json()
  assert.equal(sameFolderRunPayload.ok, true)
  assert.equal(sameFolderRunPayload.result.outputStrategy, 'source-folder')
  assert.ok(sameFolderRunPayload.result.outputPath.startsWith(sourceFolder))
  assert.equal(sameFolderRunPayload.result.sourcePacket.sources.length, 3)

  const postSameFolderPreflightResponse = await fetch(`${baseUrl}${helperApi}/preflight`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceFolder,
      outputDir: sourceFolder,
    }),
  })
  assert.equal(postSameFolderPreflightResponse.status, 200)
  const postSameFolderPreflightPayload = await postSameFolderPreflightResponse.json()
  assert.equal(postSameFolderPreflightPayload.ok, true)
  assert.equal(postSameFolderPreflightPayload.result.okToRun, true)
  assert.equal(postSameFolderPreflightPayload.result.sourceSummary.supportedFileCount, 3)
  assert.equal(postSameFolderPreflightPayload.result.sourceSummary.unsupportedFileCount, 1)

  console.log(JSON.stringify({
    ok: true,
    statusCode: statusResponse.status,
    installStateCode: installStateResponse.status,
    licenseReadinessCode: licenseReadinessResponse.status,
    licenseReady: licenseReadinessPayload.result.status,
    preflightCode: preflightResponse.status,
    standardPreflightCode: standardPreflightResponse.status,
    standardPreflightReady: standardPreflightPayload.result.okToRun,
    customTemplatePreflightCode: customTemplatePreflightResponse.status,
    customTemplateBlocked: !customTemplatePreflightPayload.result.okToRun,
    sameFolderReady: postSameFolderPreflightPayload.result.okToRun,
    sameFolderOutputCreated: true,
    standardTemplateMode: standardRunPayload.result.templateMode,
    templateProfileCode: templateProfileResponse.status,
    templateProfileBlocked: templateProfilePayload.ok === false,
    savedTemplateProfilesBlocked: savedTemplateProfilesPayload.ok === false,
    runCode: runResponse.status,
    standardTemplateCloneQa: runPayload.result.qa.standardTemplateClone.ok,
    goalCount: runPayload.result.goalPlan.goals.length,
    learningTreeSetupPreviewed: setupPreviewPayload.result.okToPrepare,
    learningTreeSetupPrepared: setupWritePayload.result.prepared,
    learningTreeSetupVerified: setupVerifyPayload.result.verified,
    liveWriteBlocked: setupLiveWritePayload.result.blocked,
    adapterDryRunPrepared: setupAdapterDryRunPayload.result.prepared,
    outputCreated: true,
    reviewCreated: true,
    evidenceLedgerCreated: true,
    runProofCreated: Boolean(runPayload.result.runProof),
    liveWriteAttempted: runPayload.result.qa.liveWriteAttempted,
    autoSignAttempted: runPayload.result.qa.autoSignAttempted,
    autoSubmitAttempted: runPayload.result.qa.autoSubmitAttempted,
  }, null, 2))
} finally {
  server.kill()
}
