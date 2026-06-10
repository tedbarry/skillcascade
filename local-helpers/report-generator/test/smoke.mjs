import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import mammoth from 'mammoth'
import JSZip from 'jszip'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const port = Number(process.env.REPORT_HELPER_SMOKE_PORT || 4199)
const baseUrl = `http://127.0.0.1:${port}`
const origin = 'http://127.0.0.1:5173'
const dataDir = mkdtempSync(join(tmpdir(), 'skillcascade-report-helper-data-'))
const helperApi = '/api/local-report-generator'
const legacyHelperApi = '/api/local-report-pilot'
const checkedBox = '\u2612'
const uncheckedBox = '\u2610'
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
    checkboxFontRunCount: (allXml.match(/MS Gothic/g) || []).length,
    unresolvedPhraseHits: unresolvedTemplatePhrases.filter((phrase) => plainText.includes(phrase)),
    plainText,
  }
}

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
  assert.equal(standardPreflightPayload.result.coverageMatrix.status, 'review-needed')
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
  assert.equal(runPayload.result.qa.liveWriteAttempted, false)
  assert.equal(runPayload.result.qa.autoSignAttempted, false)
  assert.equal(runPayload.result.qa.autoSubmitAttempted, false)
  assert.equal(runPayload.result.templateMode, 'skillcascade-standard-docx')
  assert.equal(runPayload.result.templateProfileId, '')
  assert.equal(runPayload.result.templateProfileLabel, '')
  assert.equal(Object.keys(runPayload.result.templateFieldAliases).length, 0)
  assert.equal(runPayload.result.standardTemplate.mode, 'skillcascade-standard-docx')
  assert.equal(runPayload.result.evidenceReadiness.ready, true)
  assert.equal(runPayload.result.coverageMatrix.status, 'review-needed')
  assert.equal(runPayload.result.coverageMatrix.summary.goalDomainsWithGoals.includes('Behavior'), true)
  assert.equal(runPayload.result.qa.standardTemplateClone.ok, true)
  assert.ok(runPayload.result.qa.standardTemplateClone.highlightCount >= 1)
  assert.equal(runPayload.result.qa.standardTemplateClone.contentControlCount, 0)
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
  assert.equal(evidenceLedger.coverageMatrix.status, 'review-needed')
  assert.ok(evidenceLedger.sections.some((section) => section.evidence.some((item) => item.excerpt)))
  const reviewSummary = JSON.parse(await readFile(runPayload.result.reviewPath, 'utf8'))
  assert.equal(reviewSummary.coverageMatrix.status, 'review-needed')
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
  assert.match(renderedOutput.value, /classification of Autism/)
  assert.match(renderedOutput.value, /unable to function in traditional academic environments/)
  assert.match(renderedOutput.value, /Eye contact was inconsistent/)
  assert.match(renderedOutput.value, /need for repetition and simplification/)
  assert.match(renderedOutput.value, /The BCBA will utilize a blend of evidence-based ABA principles/)
  assert.match(renderedOutput.value, /Results of Preference Assessment: An interview informed/)
  assert.match(renderedOutput.value, /Parent involvement is expected to be a central component/)
  assert.match(renderedOutput.value, /Maladaptive behaviors to decrease/)
  assert.match(renderedOutput.value, /The maladaptive behaviors of physical aggression, verbal aggression, non-compliance, property destruction, profane language, elopement, and unsafe behaviors/)
  assert.match(renderedOutput.value, /Client will engage in reciprocal, functional communication/)
  assert.match(renderedOutput.value, /Client will engage in socially appropriate interaction/)
  assert.match(renderedOutput.value, /Program\/Behavior/)
  assert.match(cloneInspection.plainText, new RegExp(`Communication:\\s*${uncheckedBox} Mild\\s+${uncheckedBox} Moderate\\s+${checkedBox} Severe`))
  assert.match(cloneInspection.plainText, new RegExp(`Suicidality\\?\\s*${checkedBox} Not present`))
  assert.match(cloneInspection.plainText, new RegExp(`Homicidality\\?\\s*${checkedBox} Not present`))
  assert.match(cloneInspection.plainText, new RegExp(`${checkedBox} This treatment plan was developed and reviewed with parent/caregiver`))
  assert.equal(renderedOutput.value.includes('Short-Term Goal'), false)
  assert.equal(renderedOutput.value.includes('Reviewer QA Appendix'), false)
  assert.equal(renderedOutput.value.includes('Source Packet Reviewed'), false)
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
    standardTemplateCloneQa: runPayload.result.qa.standardTemplateClone.ok,
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
