import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { mkdir, mkdtemp, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Document, Packer, Paragraph, TextRun } from 'docx'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const port = Number(process.env.REPORT_HELPER_SMOKE_PORT || 4199)
const baseUrl = `http://127.0.0.1:${port}`
const origin = 'http://127.0.0.1:5173'
const dataDir = mkdtempSync(join(tmpdir(), 'skillcascade-report-helper-data-'))

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
      const response = await fetch(`${baseUrl}/api/local-report-pilot/status`)
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

  return { sourceFolder, outputDir, templatePath }
}

const server = startServer()

try {
  await waitForStatus()

  const statusResponse = await fetch(`${baseUrl}/api/local-report-pilot/status`, {
    headers: { Origin: origin },
  })
  assert.equal(statusResponse.status, 200)
  assert.equal(statusResponse.headers.get('access-control-allow-origin'), origin)
  const statusPayload = await statusResponse.json()
  assert.equal(statusPayload.localOnly, true)
  assert.equal(statusPayload.safety.cloudUpload, false)
  assert.ok(statusPayload.helperVersion)
  assert.equal(statusPayload.installState.localDataPolicy.updatesPreserveCustomerData, true)
  assert.equal(statusPayload.installState.licensingPolicy.skillCascadeWorkflowPackIsAuthority, true)

  const installStateResponse = await fetch(`${baseUrl}/api/local-report-pilot/install-state`, {
    headers: { Origin: origin },
  })
  assert.equal(installStateResponse.status, 200)
  const installStatePayload = await installStateResponse.json()
  assert.equal(installStatePayload.ok, true)
  assert.equal(installStatePayload.result.updatePolicy.autoUpdateEnabled, false)
  if (installStatePayload.result.buildManifest) {
    assert.equal(installStatePayload.result.buildManifest.updatesPreserveCustomerData, true)
    assert.ok(installStatePayload.result.buildManifest.packageVersion)
  }

  const preflightResponse = await fetch(`${baseUrl}/api/local-report-pilot/run`, {
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

  const { sourceFolder, outputDir, templatePath } = await createSourceFixture()

  const templateProfileResponse = await fetch(`${baseUrl}/api/local-report-pilot/template-profile`, {
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

  const saveTemplateProfileResponse = await fetch(`${baseUrl}/api/local-report-pilot/template-profiles`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ templatePath, label: 'Smoke Customer Template' }),
  })
  assert.equal(saveTemplateProfileResponse.status, 200)
  const saveTemplateProfilePayload = await saveTemplateProfileResponse.json()
  assert.equal(saveTemplateProfilePayload.ok, true)
  assert.equal(saveTemplateProfilePayload.result.label, 'Smoke Customer Template')
  assert.equal(saveTemplateProfilePayload.result.profile.status, 'ready')

  const savedTemplateProfilesResponse = await fetch(`${baseUrl}/api/local-report-pilot/template-profiles`, {
    headers: { Origin: origin },
  })
  assert.equal(savedTemplateProfilesResponse.status, 200)
  const savedTemplateProfilesPayload = await savedTemplateProfilesResponse.json()
  assert.equal(savedTemplateProfilesPayload.ok, true)
  assert.equal(savedTemplateProfilesPayload.result.profileCount, 1)
  assert.equal(savedTemplateProfilesPayload.result.profiles[0].id, saveTemplateProfilePayload.result.id)

  const runResponse = await fetch(`${baseUrl}/api/local-report-pilot/run`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceFolder,
      outputDir,
      clientLabel: 'Pilot Client',
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
  assert.equal(runPayload.result.templateProfile.status, 'ready')
  assert.equal(runPayload.result.sourcePacket.sources.some((source) => 'text' in source), false)
  assert.equal(runPayload.result.sourcePacket.unsupportedFiles.some((source) => source.filename === 'legacy-report.doc'), true)

  const outputStats = await stat(runPayload.result.outputPath)
  const reviewStats = await stat(runPayload.result.reviewPath)
  assert.ok(outputStats.size > 1000)
  assert.ok(reviewStats.size > 100)

  console.log(JSON.stringify({
    ok: true,
    statusCode: statusResponse.status,
    installStateCode: installStateResponse.status,
    preflightCode: preflightResponse.status,
    templateProfileCode: templateProfileResponse.status,
    templateProfileStatus: templateProfilePayload.profile.status,
    savedTemplateProfileCount: savedTemplateProfilesPayload.result.profileCount,
    runCode: runResponse.status,
    goalCount: runPayload.result.goalPlan.goals.length,
    outputCreated: true,
    reviewCreated: true,
    liveWriteAttempted: runPayload.result.qa.liveWriteAttempted,
    autoSignAttempted: runPayload.result.qa.autoSignAttempted,
    autoSubmitAttempted: runPayload.result.qa.autoSubmitAttempted,
  }, null, 2))
} finally {
  server.kill()
}
