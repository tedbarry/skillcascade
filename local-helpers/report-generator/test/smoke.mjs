import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Document, Packer, Paragraph, TextRun } from 'docx'
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
  await writeFile(join(sourceFolder, 'intake.md'), [
    'Diagnosis: autism spectrum disorder is documented in the reviewed records.',
    'Family history includes caregiver participation and parent report.',
    'Developmental history notes delayed milestones and early intervention.',
    'Educational history includes school placement and IEP support.',
    'Behavior profile includes aggression, noncompliance, unsafe behavior, and elopement.',
    'Communication profile indicates functional request and break communication needs.',
    'Social profile indicates reciprocal interaction and peer play needs.',
    'Parent training should address caregiver prompting, reinforcement, generalization, and safety response.',
  ].join(' '))
  await writeFile(join(sourceFolder, 'legacy-report.doc'), 'unsupported binary placeholder')
  const templatePath = join(root, 'template.docx')
  const template = new Document({
    sections: [
      {
        children: [
          new Paragraph({ children: [new TextRun('{report_title}')] }),
          new Paragraph({ children: [new TextRun('Client: {client_label}')] }),
          new Paragraph({ children: [new TextRun('Diagnosis: {diagnosis_summary}')] }),
          new Paragraph({ children: [new TextRun('Family: {family_history}')] }),
          new Paragraph({ children: [new TextRun('{#goals}{long_term_goal}: {objective}{/goals}')] }),
        ],
      },
    ],
  })
  await writeFile(templatePath, await Packer.toBuffer(template))

  const aliasTemplatePath = join(root, 'alias-template.docx')
  const aliasTemplate = new Document({
    sections: [
      {
        children: [
          new Paragraph({ children: [new TextRun('{report_title}')] }),
          new Paragraph({ children: [new TextRun('Client: {client_name}')] }),
          new Paragraph({ children: [new TextRun('{#goals}{long_term_goal}: {goal_text}{/goals}')] }),
        ],
      },
    ],
  })
  await writeFile(aliasTemplatePath, await Packer.toBuffer(aliasTemplate))

  return { sourceFolder, outputDir, templatePath, aliasTemplatePath }
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
  assert.equal(statusPayload.installState.localDataPolicy.updatesPreserveCustomerData, true)
  assert.equal(statusPayload.installState.localPortPolicy.collisionBehavior, 'choose-next-available-loopback-port')
  assert.equal(statusPayload.installState.licensingPolicy.skillCascadeWorkflowPackIsAuthority, true)
  assert.equal(statusPayload.endpoints.licenseReadiness, `${helperApi}/license-readiness`)
  assert.equal(statusPayload.endpoints.pickFolder, `${helperApi}/pick-folder`)
  assert.equal(statusPayload.endpoints.pickFile, `${helperApi}/pick-file`)
  assert.equal(statusPayload.legacyEndpoints.licenseReadiness, `${legacyHelperApi}/license-readiness`)
  assert.equal(statusPayload.legacyEndpoints.pickFolder, `${legacyHelperApi}/pick-folder`)
  assert.equal(statusPayload.pathPickers.folderEndpoint, `${helperApi}/pick-folder`)
  assert.equal(statusPayload.pathPickers.fileEndpoint, `${helperApi}/pick-file`)
  assert.equal(statusPayload.pathPickers.returnsPathOnly, true)
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

  const { sourceFolder, outputDir, templatePath, aliasTemplatePath } = await createSourceFixture()

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
    body: JSON.stringify({ templatePath }),
  })
  assert.equal(templateProfileResponse.status, 200)
  assert.equal(templateProfileResponse.headers.get('access-control-allow-origin'), origin)
  const templateProfilePayload = await templateProfileResponse.json()
  assert.equal(templateProfilePayload.ok, true)
  assert.equal(templateProfilePayload.profile.status, 'ready')
  assert.equal(templateProfilePayload.profile.goalLoop.detected, true)
  assert.ok(templateProfilePayload.profile.supportedTags.includes('client_label'))
  assert.ok(templateProfilePayload.profile.supportedTags.includes('goals.objective'))

  const saveTemplateProfileResponse = await fetch(`${baseUrl}${helperApi}/template-profiles`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      templatePath: aliasTemplatePath,
      label: 'Smoke Customer Template',
      fieldAliases: {
        client_name: 'client_label',
        'goals.goal_text': 'goals.objective',
      },
    }),
  })
  assert.equal(saveTemplateProfileResponse.status, 200)
  const saveTemplateProfilePayload = await saveTemplateProfileResponse.json()
  assert.equal(saveTemplateProfilePayload.ok, true)
  assert.equal(saveTemplateProfilePayload.result.label, 'Smoke Customer Template')
  assert.equal(saveTemplateProfilePayload.result.fieldAliases.client_name, 'client_label')
  assert.equal(saveTemplateProfilePayload.result.aliasSummary.aliasCount, 2)
  assert.ok(saveTemplateProfilePayload.result.aliasSummary.mappedUnsupportedTags.some((item) => item.tag === 'client_name'))
  assert.ok(saveTemplateProfilePayload.result.aliasSummary.mappedUnsupportedTags.some((item) => item.tag === 'goals.goal_text'))

  const savedTemplateProfilesResponse = await fetch(`${baseUrl}${helperApi}/template-profiles`, {
    headers: { Origin: origin },
  })
  assert.equal(savedTemplateProfilesResponse.status, 200)
  const savedTemplateProfilesPayload = await savedTemplateProfilesResponse.json()
  assert.equal(savedTemplateProfilesPayload.ok, true)
  assert.equal(savedTemplateProfilesPayload.result.profileCount, 1)
  assert.equal(savedTemplateProfilesPayload.result.profiles[0].id, saveTemplateProfilePayload.result.id)

  const noTemplatePreflightResponse = await fetch(`${baseUrl}${helperApi}/preflight`, {
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
  assert.equal(noTemplatePreflightResponse.status, 200)
  const noTemplatePreflightPayload = await noTemplatePreflightResponse.json()
  assert.equal(noTemplatePreflightPayload.ok, true)
  assert.equal(noTemplatePreflightPayload.result.okToRun, false)
  assert.ok(noTemplatePreflightPayload.result.blockers.some((blocker) => blocker.includes('No Word template selected')))

  const fallbackPreflightResponse = await fetch(`${baseUrl}${helperApi}/preflight`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceFolder,
      outputDir,
      allowFallbackTemplate: true,
    }),
  })
  assert.equal(fallbackPreflightResponse.status, 200)
  const fallbackPreflightPayload = await fallbackPreflightResponse.json()
  assert.equal(fallbackPreflightPayload.ok, true)
  assert.equal(fallbackPreflightPayload.result.okToRun, true)
  assert.ok(fallbackPreflightPayload.result.warnings.some((warning) => warning.includes('fallback QA DOCX')))

  const localPreflightResponse = await fetch(`${baseUrl}${helperApi}/preflight`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceFolder,
      outputDir,
      templateProfileId: saveTemplateProfilePayload.result.id,
    }),
  })
  assert.equal(localPreflightResponse.status, 200)
  const localPreflightPayload = await localPreflightResponse.json()
  assert.equal(localPreflightPayload.ok, true)
  assert.equal(localPreflightPayload.result.okToRun, true)
  assert.equal(localPreflightPayload.result.sourceTextReturned, false)
  assert.equal(localPreflightPayload.result.sourceSummary.supportedFileCount, 1)
  assert.equal(localPreflightPayload.result.sourceSummary.unsupportedFileCount, 1)
  assert.equal(localPreflightPayload.result.templateSummary.savedTemplateProfileId, saveTemplateProfilePayload.result.id)

  const sameFolderPreflightResponse = await fetch(`${baseUrl}${helperApi}/preflight`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceFolder,
      outputDir: sourceFolder,
      templateProfileId: saveTemplateProfilePayload.result.id,
    }),
  })
  assert.equal(sameFolderPreflightResponse.status, 200)
  const sameFolderPreflightPayload = await sameFolderPreflightResponse.json()
  assert.equal(sameFolderPreflightPayload.ok, true)
  assert.equal(sameFolderPreflightPayload.result.okToRun, true)
  assert.equal(sameFolderPreflightPayload.result.outputDir, sourceFolder)
  assert.equal(sameFolderPreflightPayload.result.outputStrategy, 'source-folder')
  assert.equal(sameFolderPreflightPayload.result.sourceSummary.supportedFileCount, 1)

  const blockedRunResponse = await fetch(`${baseUrl}${helperApi}/run`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceFolder,
      outputDir,
      clientLabel: 'Blocked No Template Client',
    }),
  })
  assert.equal(blockedRunResponse.status, 400)
  const blockedRunPayload = await blockedRunResponse.json()
  assert.equal(blockedRunPayload.ok, false)
  assert.match(blockedRunPayload.error, /No Word template selected/)

  const fallbackRunResponse = await fetch(`${baseUrl}${helperApi}/run`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceFolder,
      outputDir,
      clientLabel: 'Fallback Client',
      reportTitle: 'Fallback QA Draft',
      allowFallbackTemplate: true,
    }),
  })
  assert.equal(fallbackRunResponse.status, 200)
  const fallbackRunPayload = await fallbackRunResponse.json()
  assert.equal(fallbackRunPayload.ok, true)
  assert.equal(fallbackRunPayload.result.templateMode, 'fallback-generated-docx')
  assert.ok(fallbackRunPayload.result.qa.warnings.some((warning) => warning.includes('Fallback QA DOCX')))

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
      templateProfileId: saveTemplateProfilePayload.result.id,
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
  assert.equal(runPayload.result.templateMode, 'placeholder-template')
  assert.equal(runPayload.result.templateProfileId, saveTemplateProfilePayload.result.id)
  assert.equal(runPayload.result.templateProfileLabel, 'Smoke Customer Template')
  assert.equal(runPayload.result.templateFieldAliases.client_name, 'client_label')
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
  assert.ok(evidenceLedger.sections.some((section) => section.evidence.some((item) => item.excerpt)))
  assert.equal(runPayload.result.clinicalProfile.sections.some((section) => (
    section.sourceEvidence.some((item) => Object.prototype.hasOwnProperty.call(item, 'text') || Object.prototype.hasOwnProperty.call(item, 'excerpt'))
  )), false)
  assert.equal(runPayload.result.goalPlan.goals.some((goal) => (
    goal.sourceEvidence.some((item) => Object.prototype.hasOwnProperty.call(item, 'text') || Object.prototype.hasOwnProperty.call(item, 'excerpt'))
  )), false)
  const renderedOutput = await mammoth.extractRawText({ path: runPayload.result.outputPath })
  assert.match(renderedOutput.value, /Client: Release Client/)
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
      templateProfileId: saveTemplateProfilePayload.result.id,
    }),
  })
  assert.equal(sameFolderRunResponse.status, 200)
  const sameFolderRunPayload = await sameFolderRunResponse.json()
  assert.equal(sameFolderRunPayload.ok, true)
  assert.equal(sameFolderRunPayload.result.outputStrategy, 'source-folder')
  assert.ok(sameFolderRunPayload.result.outputPath.startsWith(sourceFolder))
  assert.equal(sameFolderRunPayload.result.sourcePacket.sources.length, 1)

  const postSameFolderPreflightResponse = await fetch(`${baseUrl}${helperApi}/preflight`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceFolder,
      outputDir: sourceFolder,
      templateProfileId: saveTemplateProfilePayload.result.id,
    }),
  })
  assert.equal(postSameFolderPreflightResponse.status, 200)
  const postSameFolderPreflightPayload = await postSameFolderPreflightResponse.json()
  assert.equal(postSameFolderPreflightPayload.ok, true)
  assert.equal(postSameFolderPreflightPayload.result.okToRun, true)
  assert.equal(postSameFolderPreflightPayload.result.sourceSummary.supportedFileCount, 1)
  assert.equal(postSameFolderPreflightPayload.result.sourceSummary.unsupportedFileCount, 1)

  console.log(JSON.stringify({
    ok: true,
    statusCode: statusResponse.status,
    installStateCode: installStateResponse.status,
    licenseReadinessCode: licenseReadinessResponse.status,
    licenseReady: licenseReadinessPayload.result.status,
    preflightCode: preflightResponse.status,
    localPreflightCode: localPreflightResponse.status,
    localPreflightReady: localPreflightPayload.result.okToRun,
    sameFolderReady: postSameFolderPreflightPayload.result.okToRun,
    sameFolderOutputCreated: true,
    fallbackTemplateMode: fallbackRunPayload.result.templateMode,
    templateProfileCode: templateProfileResponse.status,
    templateProfileStatus: templateProfilePayload.profile.status,
    savedTemplateProfileCount: savedTemplateProfilesPayload.result.profileCount,
    aliasCount: saveTemplateProfilePayload.result.aliasSummary.aliasCount,
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
