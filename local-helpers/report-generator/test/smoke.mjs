import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import mammoth from 'mammoth'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const port = Number(process.env.REPORT_HELPER_SMOKE_PORT || 4199)
const baseUrl = `http://127.0.0.1:${port}`
const origin = 'http://127.0.0.1:5173'
const dataDir = mkdtempSync(join(tmpdir(), 'skillcascade-report-helper-data-'))
const helperApi = '/api/local-report-generator'
const legacyHelperApi = '/api/local-report-pilot'

function startServer() {
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: packageRoot,
    env: { ...process.env, PORT: String(port), REPORT_HELPER_DATA_DIR: dataDir },
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
    'Psychological evaluation and diagnostic report document diagnosis of autism spectrum disorder under DSM-5 criteria.',
    'The evaluation notes adaptive functioning, communication, social, and behavior needs that require ABA treatment planning.',
  ].join(' '))
  await writeFile(join(sourceFolder, 'intake.md'), [
    'Intake and caregiver interview identify presenting concerns and parent report.',
    'Family history includes caregiver participation and parent report.',
    'Developmental history notes delayed milestones and early intervention.',
    'Educational history includes school placement and IEP support.',
    'Behavior profile includes aggression, noncompliance, unsafe behavior, and elopement.',
    'Communication profile indicates functional request and break communication needs.',
    'Social profile indicates reciprocal interaction and peer play needs.',
    'Parent training should address caregiver prompting, reinforcement, generalization, and safety response.',
  ].join(' '))
  await writeFile(join(sourceFolder, 'vineland.md'), [
    'Vineland-3 Adaptive Behavior Composite indicates adaptive behavior deficits.',
    'Communication domain, Daily Living Skills, and Socialization domain results support functional communication, adaptive, and social goal planning.',
    'V-scale subdomains include receptive, expressive, interpersonal relationships, play and leisure, coping skills, domestic, and community needs.',
  ].join(' '))
  await writeFile(join(sourceFolder, 'legacy-report.doc'), 'unsupported binary placeholder')

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
  assert.equal(statusPayload.customerTemplateUpload, false)
  assert.equal(statusPayload.standardTemplate.mode, 'skillcascade-standard-docx')
  assert.equal(statusPayload.requiredEvidenceCategories.length, 3)
  assert.ok(statusPayload.assessmentAdapters.some((adapter) => adapter.id === 'vineland'))
  assert.equal(statusPayload.installState.localDataPolicy.updatesPreserveCustomerData, true)
  assert.equal(statusPayload.installState.localPortPolicy.collisionBehavior, 'choose-next-available-loopback-port')
  assert.equal(statusPayload.installState.licensingPolicy.skillCascadeWorkflowPackIsAuthority, true)
  assert.equal(statusPayload.endpoints.licenseReadiness, `${helperApi}/license-readiness`)
  assert.equal(statusPayload.endpoints.pickFolder, `${helperApi}/pick-folder`)
  assert.equal(statusPayload.endpoints.templateProfile, undefined)
  assert.equal(statusPayload.endpoints.templateProfiles, undefined)
  assert.equal(statusPayload.legacyEndpoints.licenseReadiness, `${legacyHelperApi}/license-readiness`)
  assert.equal(statusPayload.legacyEndpoints.pickFolder, `${legacyHelperApi}/pick-folder`)
  assert.equal(statusPayload.pathPickers.folderEndpoint, `${helperApi}/pick-folder`)
  assert.equal(statusPayload.pathPickers.fileEndpoint, undefined)
  assert.equal(statusPayload.pathPickers.returnsPathOnly, true)
  assert.equal(statusPayload.templatePolicy.customTemplateAccepted, false)
  assert.equal(statusPayload.licenseReadiness.localOnly, true)
  assert.equal(statusPayload.licenseReadiness.authority.localHelperStoresBillingSecrets, false)
  assert.equal(statusPayload.licenseReadiness.authority.localHelperCanGrantAccess, false)
  assert.ok(statusPayload.licenseReadiness.installFingerprint)

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
  assert.equal(standardPreflightPayload.result.standardTemplate.mode, 'skillcascade-standard-docx')
  assert.equal(standardPreflightPayload.result.templateSummary.customerTemplateUpload, false)
  assert.equal(standardPreflightPayload.result.evidenceReadiness.ready, true)
  assert.equal(standardPreflightPayload.result.evidenceReadiness.categories.length, 3)
  assert.ok(standardPreflightPayload.result.assessmentAdapters.some((adapter) => adapter.id === 'vineland'))
  assert.ok(standardPreflightPayload.result.deficitProfile.supportedGoalDomains.includes('Communication'))
  assert.equal(standardPreflightPayload.result.coverageMatrix.status, 'ready-for-draft')
  assert.equal(standardPreflightPayload.result.coverageMatrix.sourceTextReturned, false)
  assert.equal(standardPreflightPayload.result.coverageMatrix.summary.requiredEvidenceFound, 3)
  assert.equal(standardPreflightPayload.result.coverageMatrix.summary.sourceSupportedSectionCount, 8)
  assert.ok(standardPreflightPayload.result.coverageMatrix.goalDomainCoverage.some((domain) => domain.domain === 'Communication' && domain.goalCount > 0))

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
  assert.equal(standardRunPayload.result.coverageMatrix.status, 'ready-for-draft')
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
  assert.equal(runPayload.result.qa.liveWriteAttempted, false)
  assert.equal(runPayload.result.qa.autoSignAttempted, false)
  assert.equal(runPayload.result.qa.autoSubmitAttempted, false)
  assert.equal(runPayload.result.templateMode, 'skillcascade-standard-docx')
  assert.equal(runPayload.result.templateProfileId, '')
  assert.equal(runPayload.result.templateProfileLabel, '')
  assert.equal(Object.keys(runPayload.result.templateFieldAliases).length, 0)
  assert.equal(runPayload.result.standardTemplate.mode, 'skillcascade-standard-docx')
  assert.equal(runPayload.result.evidenceReadiness.ready, true)
  assert.equal(runPayload.result.coverageMatrix.status, 'ready-for-draft')
  assert.equal(runPayload.result.coverageMatrix.summary.goalDomainsWithGoals.includes('Behavior'), true)
  assert.equal(runPayload.result.sourcePacket.sources.some((source) => 'text' in source), false)
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
  assert.equal(evidenceLedger.coverageMatrix.status, 'ready-for-draft')
  assert.ok(evidenceLedger.sections.some((section) => section.evidence.some((item) => item.excerpt)))
  const reviewSummary = JSON.parse(await readFile(runPayload.result.reviewPath, 'utf8'))
  assert.equal(reviewSummary.coverageMatrix.status, 'ready-for-draft')
  assert.equal(reviewSummary.evidenceSummary.coverageStatus, 'ready-for-draft')
  assert.equal(reviewSummary.evidenceSummary.missingSectionCount, 0)
  assert.equal(runPayload.result.clinicalProfile.sections.some((section) => (
    section.sourceEvidence.some((item) => Object.prototype.hasOwnProperty.call(item, 'text') || Object.prototype.hasOwnProperty.call(item, 'excerpt'))
  )), false)
  assert.equal(runPayload.result.goalPlan.goals.some((goal) => (
    goal.sourceEvidence.some((item) => Object.prototype.hasOwnProperty.call(item, 'text') || Object.prototype.hasOwnProperty.call(item, 'excerpt'))
  )), false)
  const renderedOutput = await mammoth.extractRawText({ path: runPayload.result.outputPath })
  assert.match(renderedOutput.value, /Client: Release Client/)
  assert.match(renderedOutput.value, /Diagnosis And Service Recommendation/)
  assert.match(renderedOutput.value, /97151/)
  assert.match(renderedOutput.value, /97153/)
  assert.match(renderedOutput.value, /97155/)
  assert.match(renderedOutput.value, /97156/)
  assert.match(renderedOutput.value, /Medical Necessity:/)
  assert.match(renderedOutput.value, /Maladaptive Behavior Type I/)
  assert.match(renderedOutput.value, /Maladaptive Behavior Type II/)
  assert.match(renderedOutput.value, /Behavior Intervention Plan:/)
  assert.match(renderedOutput.value, /Source Packet Reviewed/)
  assert.match(renderedOutput.value, /Biopsychosocial History/)
  assert.match(renderedOutput.value, /Clinical Profile And Treatment Needs/)
  assert.match(renderedOutput.value, /Behavior Goals/)
  assert.match(renderedOutput.value, /Communication Goals/)
  assert.match(renderedOutput.value, /Social Goals/)
  assert.match(renderedOutput.value, /Parent Training Goals/)
  assert.match(renderedOutput.value, /Program\/Behavior/)
  assert.equal(renderedOutput.value.includes('Short-Term Goal'), false)
  assert.match(renderedOutput.value, /BCBA Review Checklist/)
  assert.ok(runPayload.result.goalPlan.goals.length >= 30)
  assert.ok(renderedOutput.value.split(/\s+/).length >= 3500)
  assert.equal(renderedOutput.value.includes('REVIEW_UNSUPPORTED_TEMPLATE_FIELD'), false)

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
    goalCount: runPayload.result.goalPlan.goals.length,
    outputCreated: true,
    reviewCreated: true,
    evidenceLedgerCreated: true,
    liveWriteAttempted: runPayload.result.qa.liveWriteAttempted,
    autoSignAttempted: runPayload.result.qa.autoSignAttempted,
    autoSubmitAttempted: runPayload.result.qa.autoSubmitAttempted,
  }, null, 2))
} finally {
  server.kill()
}
