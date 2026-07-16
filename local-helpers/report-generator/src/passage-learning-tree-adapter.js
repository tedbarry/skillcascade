import {
  DEFAULT_PASSAGE_CDP_URL,
  ensureVerifiedPassageSession,
  normalizePassageCdpUrl,
  PASSAGE_ORIGIN,
} from './passage-managed-session.js'

export const PASSAGE_DOMAIN_LABELS = {
  behavior: 'Behavior Reduction Domain',
  communication: 'Communication Domain',
  social: 'Social Domain',
  parentTraining: 'Parent Training Domain',
}

export const PASSAGE_DOMAIN_LABEL_ALIASES = {
  behavior: ['Behavior Reduction Domain', 'Behavior Domain'],
  communication: ['Communication Domain'],
  social: ['Social Domain', 'Social Skills Domain'],
  parentTraining: ['Parent Training Domain'],
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeName(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function normalizeKey(value) {
  return cleanText(value).toLowerCase()
}

export function resolvePassageDomainLabel(labels = [], domain = '') {
  const aliases = PASSAGE_DOMAIN_LABEL_ALIASES[domain]
    || [PASSAGE_DOMAIN_LABELS[domain]].filter(Boolean)
  const byValue = new Map(labels.map((label) => [normalizeKey(label.value), label]))
  for (const alias of aliases) {
    const match = byValue.get(normalizeKey(alias))
    if (match) return match
  }
  return null
}

function initialsFromName(value) {
  return cleanText(value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function displayNameForClient(client = {}) {
  return client.name || client.clientName || [client.firstName, client.lastName].filter(Boolean).join(' ')
}

function safeError(error) {
  return String(error?.message || error).replace(/(Bearer|token|cookie|password)[^\s]*/gi, '$1[redacted]').slice(0, 500)
}

function domainKey(domain) {
  const value = normalizeName(domain)
  if (value.includes('parent')) return 'parentTraining'
  if (value.includes('social')) return 'social'
  if (value.includes('behavior')) return 'behavior'
  return 'communication'
}

function groupNameForRow(row = {}) {
  const domain = domainKey(row.domain)
  if (domain === 'parentTraining') return 'Parent Training'
  if (domain === 'communication') return 'Communication'
  if (domain === 'social') {
    return /group|peer/i.test(`${row.longTermGoal || ''} ${row.shortTermGoal || ''}`) ? 'Social Skills Group' : 'Socialization'
  }
  return row.dataCollectionType === 'datafrequency2' ? 'Behavior - Reduction' : 'Behavior - Replacement'
}

function goalTypeForRow(row = {}) {
  return row.dataCollectionType === 'datafrequency2' ? 'Behavior' : 'Skill'
}

function targetTypeForRow(row = {}) {
  return row.dataCollectionType === 'datafrequency2' ? 'Frequency' : 'Trial'
}

function goalKeyFromRow(row = {}) {
  return `${normalizeKey(groupNameForRow(row))}::${normalizeKey(row.longTermGoal || row.domain || 'Goal')}`
}

function goalKeyFromPassage(goal = {}) {
  return `${normalizeKey(goal.groupName)}::${normalizeKey(goal.title)}`
}

function targetKeyFromRow(row = {}) {
  return `${normalizeKey(row.shortTermGoal || row.objective)}::${normalizeKey(row.objective)}::${targetTypeForRow(row)}`
}

function targetKeyFromPassage(target = {}) {
  return `${normalizeKey(target.title)}::${normalizeKey(target.description)}::${target.type || ''}`
}

function targetMasteryDate(row = {}) {
  const explicit = row.targetMasteryDate || row.masteryDate || row.targetDate
  if (explicit) {
    const parsed = new Date(explicit)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  const date = new Date()
  date.setUTCMonth(date.getUTCMonth() + 6)
  return date
}

export function passageGoalPayload(row = {}, clientId) {
  const type = goalTypeForRow(row)
  const payload = {
    clientId,
    groupName: groupNameForRow(row),
    title: cleanText(row.longTermGoal || row.domain || 'Goal'),
    type,
    treatmentPhase: 'Treatment',
    description: cleanText(row.longTermGoal || row.objective || ''),
    notes: '',
    linkedLabels: [],
    labels: [],
    fakeResponseField: '',
    dataCollectionType: targetTypeForRow(row),
  }

  if (type === 'Behavior') {
    Object.assign(payload, {
      operationalDefinition: `${payload.title} is defined according to the operational definition and decrease objective in the source assessment report.`,
      hypothesizedFunction: 'Antecedents and functions should be interpreted from the source assessment report and ongoing clinical data.',
      antecedentStrategy: 'Use proactive structure, clear expectations, reinforcement, choice-making, and prompt appropriate replacement responses before escalation.',
      consequencesStrategy: 'Maintain safety, use neutral affect, prompt replacement behavior when feasible, and reinforce safe adaptive responding.',
      replacementBehavior: 'The client will use an appropriate communication, coping, or safety response instead of the target behavior.',
      dataCollection: 'Frequency recording and ABC data as clinically indicated.',
    })
  } else {
    Object.assign(payload, {
      teachingMethod: 'Natural environment teaching, direct instruction, modeling/role-play, reinforcement, and programmed practice as clinically appropriate.',
      discriminativeStimulus: 'Relevant natural or structured opportunity matching the target objective.',
      promptingInstructions: 'Use the prompt level written in each target objective and fade prompts systematically.',
      expectedResponse: 'Learner/caregiver response described by the target objective.',
      reinforcementStrategy: 'Behavior-specific praise, token reinforcement, visual feedback, calm adult attention, and access to preferred activities or breaks as appropriate.',
      errorCorrectionStrategy: 'Use neutral feedback, model or role-play the expected response, least-to-most prompting, and represent the opportunity when appropriate.',
    })
  }

  return payload
}

function passageTargetPayload(row = {}, goalId) {
  const type = targetTypeForRow(row)
  const isFrequency = type === 'Frequency'
  const payload = {
    goalId,
    type,
    treatmentPhase: 'Treatment',
    title: cleanText(row.shortTermGoal || row.objective || 'Target'),
    description: cleanText(row.objective || row.shortTermGoal || ''),
    discriminativeStimulus: 'Relevant natural or structured opportunity matching the target objective.',
    linkedLabels: [],
    labels: [],
    targetMasteryCriteria: {
      threshold: isFrequency ? 'LessThanOrEqualTo' : 'GreaterThanOrEqualTo',
      measureType: isFrequency ? 'Occurrences' : 'PercentIndependent',
      measureValue: isFrequency ? 1 : 80,
      masteredOverValue: isFrequency ? 14 : 3,
      masteredOverType: 'Sessions',
      targetMasteryDate: targetMasteryDate(row),
    },
    fakeResponseField: '',
  }

  if (isFrequency) {
    Object.assign(payload, {
      autoRecordZero: { isEnabled: false, phases: ['Treatment'] },
    })
  } else {
    Object.assign(payload, {
      promptFading: { isEnabled: false, steps: [] },
      responses: ['Independent', 'NoResponse', 'Prompted'],
      trialsPerSession: Number(row.trialCount || row.maxTrials || 10),
      customPrompts: [],
    })
  }

  return payload
}

function summarizeClient(client, goals = []) {
  return {
    found: Boolean(client?.id),
    initials: client ? initialsFromName(displayNameForClient(client)) : '',
    status: client?.status || '',
    activeGoalCount: goals.length,
    activeTargetCount: goals.reduce((sum, goal) => sum + (goal.targets?.length || 0), 0),
  }
}

function summarizePlan(plan) {
  return {
    sourceGoalRows: plan.rows.length,
    destinationExistingGoalCount: plan.destinationGoalsBefore.length,
    destinationExistingTargetCount: plan.destinationGoalsBefore.reduce((sum, goal) => sum + (goal.targets?.length || 0), 0),
    goalsToCreate: plan.goalsToCreate.length,
    targetsToCreate: plan.targetsToCreate.length,
    existingGoalsToReuse: plan.existingGoalsToReuse.length,
    goalLabelUpdates: plan.goalLabelUpdates.length,
    targetLabelUpdates: plan.targetLabelUpdates.length,
  }
}

function verifyPlan(plan, destinationGoalsAfter) {
  const destinationGoalsByKey = new Map(destinationGoalsAfter.map((goal) => [goalKeyFromPassage(goal), goal]))
  let matchedTargets = 0
  const missingGoals = []
  const missingTargets = []
  for (const row of plan.rows) {
    const goal = destinationGoalsByKey.get(goalKeyFromRow(row))
    if (!goal) {
      missingGoals.push(goalKeyFromRow(row))
      continue
    }
    const targetKeys = new Set((goal.targets || []).map(targetKeyFromPassage))
    if (targetKeys.has(targetKeyFromRow(row))) matchedTargets += 1
    else missingTargets.push(`${goalKeyFromRow(row)}::${targetKeyFromRow(row)}`)
  }

  return {
    expectedTargetCount: plan.rows.length,
    destinationGoalCount: destinationGoalsAfter.length,
    destinationTargetCount: destinationGoalsAfter.reduce((sum, goal) => sum + (goal.targets?.length || 0), 0),
    matchedTargetCount: matchedTargets,
    missingGoalCount: missingGoals.length,
    missingTargetCount: missingTargets.length,
    missingGoals,
    missingTargets,
  }
}

export function isMissingPassageAbcScaffold(response = {}) {
  if (Number(response.status) === 404) return true
  const itemStatuses = Array.isArray(response.itemStatuses) ? response.itemStatuses : []
  return itemStatuses.some((item) => /abc does not exist|client.?s abc does not exist/i.test(String(item?.message || '')))
}

export async function ensurePassageProgrammingScaffold(cookieHeader, clientId, options = {}) {
  const live = options.live === true
  const getDetailed = options.getDetailed || trpcGetDetailed
  const post = options.post || trpcPost
  const input = { 0: { json: { clientId }, meta: { values: {} } } }
  const before = await getDetailed(cookieHeader, 'abc.getOne', input, 20_000)
  const missing = isMissingPassageAbcScaffold(before)

  if (!before.ok && !missing) {
    throw new Error(`Passage ABC scaffold preflight failed with status ${before.status}.`)
  }
  if (before.ok && !before.data?.id) {
    throw new Error('Passage ABC scaffold preflight returned an invalid scaffold record.')
  }
  if (!missing) {
    return {
      state: 'already_present',
      created: false,
      beforeStatus: before.status,
      afterStatus: before.status,
      verified: true,
    }
  }
  if (!live) {
    return {
      state: 'would_create',
      created: false,
      beforeStatus: before.status,
      afterStatus: before.status,
      verified: false,
    }
  }

  await post(cookieHeader, 'abc.create', { clientId }, 20_000)
  const after = await getDetailed(cookieHeader, 'abc.getOne', input, 20_000)
  if (!after.ok || !after.data?.id) {
    throw new Error(`Passage ABC scaffold verification failed with status ${after.status}.`)
  }
  return {
    state: 'created',
    created: true,
    beforeStatus: before.status,
    afterStatus: after.status,
    verified: true,
  }
}

function passageProgrammingBatchInput(clientId) {
  return {
    0: { json: { id: clientId }, meta: { values: {} } },
    1: { json: null, meta: { values: ['undefined'] } },
    2: {
      json: { clientId, type: null, treatmentPhases: [], includeArchived: false },
      meta: { values: { type: ['undefined'] } },
    },
    3: { json: { clientId }, meta: { values: {} } },
  }
}

export async function verifyPassageProgrammingReadiness(cookieHeader, clientId, options = {}) {
  const getDetailed = options.getDetailed || trpcGetDetailed
  const result = await getDetailed(
    cookieHeader,
    'clients.getOne,departments.getAll,goals.getAll,abc.getOne',
    passageProgrammingBatchInput(clientId),
    25_000,
  )
  if (!result.ok) {
    throw new Error(`Passage programming readiness failed with status ${result.status}.`)
  }
  return {
    ok: true,
    status: result.status,
    itemCount: result.itemStatuses.length,
    failedItemCount: result.itemStatuses.filter((item) => !item.ok).length,
  }
}

function mockAdapterResult({ live, treePlan, destinationLabel = 'Mock Passage Client' }) {
  const rows = treePlan.expectedRows || []
  const goalKeys = new Set(rows.map(goalKeyFromRow))
  return {
    ok: true,
    blocked: false,
    blockers: [],
    warnings: ['Mock Passage adapter used for local smoke testing only.'],
    proof: {
      adapter: 'passage-web-app-trpc',
      adapterMode: live ? 'mock_live_external_write' : 'mock_adapter_dry_run',
      passageOrigin: PASSAGE_ORIGIN,
      liveExternalWriteAttempted: live,
      destination: { found: true, initials: initialsFromName(destinationLabel), status: 'Mock' },
      planSummary: {
        sourceGoalRows: rows.length,
        goalsToCreate: goalKeys.size,
        targetsToCreate: rows.length,
        existingGoalsToReuse: 0,
        goalLabelUpdates: goalKeys.size,
        targetLabelUpdates: rows.length,
      },
      writeSummary: live ? {
        createdGoalCount: goalKeys.size,
        createdTargetCount: rows.length,
        reusedExistingGoalCount: 0,
        goalLabelWriteCount: goalKeys.size,
        targetLabelWriteCount: rows.length,
      } : null,
      verificationSummary: live ? {
        expectedTargetCount: rows.length,
        matchedTargetCount: rows.length,
        missingGoalCount: 0,
        missingTargetCount: 0,
      } : null,
      programmingScaffold: {
        state: live ? 'mock_created' : 'mock_would_create',
        created: live,
        verified: live,
      },
      programmingReadiness: live ? {
        ok: true,
        status: 200,
        itemCount: 4,
        failedItemCount: 0,
      } : null,
    },
  }
}

export async function runPassageLearningTreeAdapter(body = {}, treePlan = {}) {
  const adapter = body.destinationAdapter && typeof body.destinationAdapter === 'object'
    ? body.destinationAdapter
    : body.adapter && typeof body.adapter === 'object'
      ? body.adapter
      : {}
  const executionMode = cleanText(body.executionMode || body.writeMode || '').toLowerCase()
  const live = executionMode === 'live_external_write' || body.liveExternalWrite === true
  const rows = Array.isArray(treePlan.expectedRows) ? treePlan.expectedRows : []
  const blockers = []
  const warnings = []

  if (adapter.mockPassage === true) {
    if (process.env.REPORT_HELPER_ALLOW_MOCK_PASSAGE_ADAPTER !== '1') {
      return {
        ok: false,
        blocked: true,
        blockers: ['Mock Passage adapter is disabled outside the helper smoke-test environment.'],
        warnings,
        proof: null,
      }
    }
    return mockAdapterResult({ live, treePlan, destinationLabel: adapter.clientName || body.clientLabel })
  }

  if (!rows.length) blockers.push('No learning-tree goal rows are available for Passage setup.')
  const credentialScope = cleanText(adapter.credentialScope || body.credentialScope || 'default') || 'default'
  let cdpUrl = cleanText(adapter.cdpUrl || process.env.REPORT_HELPER_PASSAGE_CDP_URL || process.env.PASSAGE_CDP_URL || DEFAULT_PASSAGE_CDP_URL)
  try {
    cdpUrl = normalizePassageCdpUrl(cdpUrl)
  } catch (error) {
    blockers.push(`Passage browser setup is not safe: ${safeError(error)}`)
  }
  const verifiedSession = blockers.length ? null : await ensureVerifiedPassageSession({
    credentialScope,
    cdpUrl,
  }).catch((error) => {
    blockers.push(`Passage account verification failed: ${safeError(error)}`)
    return null
  })
  const cookieHeader = verifiedSession?.cookieHeader || ''
  const accountGateProof = verifiedSession?.accountProof || null
  if (!cookieHeader && !blockers.length) {
    blockers.push('No verified Passage browser session was available for the saved account.')
  }

  const profile = cookieHeader ? await trpcGet(cookieHeader, 'users.profile', { 0: { json: null, meta: { values: ['undefined'] } } }).catch((error) => {
    blockers.push(`Could not read Passage user profile: ${safeError(error)}`)
    return null
  }) : null
  if (cookieHeader && !profile?.id) blockers.push('Passage profile could not be read from the local browser session.')

  const clients = cookieHeader && profile ? await loadVisibleClients(cookieHeader, profile).catch((error) => {
    blockers.push(`Could not read Passage client list: ${safeError(error)}`)
    return []
  }) : []
  const destinationClient = findDestinationClient(clients, body, adapter)
  if (clients.length && !destinationClient?.id) blockers.push('The requested Passage client was not found or was ambiguous. Enter the exact Passage client name or client id.')

  const destinationGoalsBefore = destinationClient?.id ? await loadGoals(cookieHeader, destinationClient.id, false).catch((error) => {
    blockers.push(`Could not read Passage goals for destination client: ${safeError(error)}`)
    return []
  }) : []
  const programmingScaffold = destinationClient?.id && cookieHeader
    ? await ensurePassageProgrammingScaffold(cookieHeader, destinationClient.id, { live }).catch((error) => {
        blockers.push(`Could not prepare Passage programming: ${safeError(error)}`)
        return null
      })
    : null

  const labelSetup = cookieHeader ? await ensureDomainLabels(cookieHeader, live, warnings, blockers) : null
  const plan = destinationClient?.id && labelSetup
    ? buildPassagePlan(rows, destinationGoalsBefore, destinationClient.id, labelSetup.labelsByDomain)
    : emptyPlan(rows, destinationGoalsBefore)

  const baseProof = {
    adapter: 'passage-web-app-trpc',
    adapterMode: live ? 'live_external_write' : 'adapter_dry_run',
    passageOrigin: PASSAGE_ORIGIN,
    liveExternalWriteAttempted: Boolean(programmingScaffold?.created),
    cdpConnected: Boolean(cookieHeader),
    credentialScope,
    accountGate: accountGateProof ? {
      safe: accountGateProof.safe === true,
      reason: accountGateProof.reason || '',
      profileDetected: accountGateProof.profileDetected === true,
      profileFingerprint: accountGateProof.profileFingerprint || '',
      configuredFingerprint: accountGateProof.configuredFingerprint || '',
    } : null,
    profileRead: Boolean(profile?.id),
    destination: summarizeClient(destinationClient, destinationGoalsBefore),
    programmingScaffold,
    labelSummary: labelSetup?.summary || null,
    planSummary: summarizePlan(plan),
    writeSummary: null,
    verificationSummary: null,
    safety: {
      sourceDocumentsUploaded: false,
      phiStoredBySkillCascade: false,
      notesSigned: false,
      notesSubmitted: false,
      billingTouched: false,
    },
  }

  if (blockers.length || !live) {
    return {
      ok: blockers.length === 0,
      blocked: blockers.length > 0,
      blockers,
      warnings,
      proof: baseProof,
    }
  }

  const writeSummary = await executePassagePlan(cookieHeader, plan)
  const destinationGoalsAfter = await loadGoals(cookieHeader, destinationClient.id, false)
  const verificationSummary = verifyPlan(plan, destinationGoalsAfter)
  if (verificationSummary.missingGoalCount || verificationSummary.missingTargetCount) {
    blockers.push(`Passage verification found missing items: goals=${verificationSummary.missingGoalCount}, targets=${verificationSummary.missingTargetCount}.`)
  }
  const programmingReadiness = await verifyPassageProgrammingReadiness(cookieHeader, destinationClient.id).catch((error) => {
    blockers.push(`Passage programming page is not ready: ${safeError(error)}`)
    return null
  })

  return {
    ok: blockers.length === 0,
    blocked: blockers.length > 0,
    blockers,
    warnings,
    proof: {
      ...baseProof,
      liveExternalWriteAttempted: true,
      destinationAfter: summarizeClient(destinationClient, destinationGoalsAfter),
      writeSummary,
      verificationSummary,
      programmingReadiness,
    },
  }
}

function buildPassagePlan(rows, destinationGoalsBefore, destinationClientId, labelsByDomain) {
  const destinationGoalsByKey = new Map(destinationGoalsBefore.map((goal) => [goalKeyFromPassage(goal), goal]))
  const rowsByGoalKey = new Map()
  for (const row of rows) {
    const key = goalKeyFromRow(row)
    if (!rowsByGoalKey.has(key)) rowsByGoalKey.set(key, [])
    rowsByGoalKey.get(key).push(row)
  }

  const goalsToCreate = []
  const targetsToCreate = []
  const existingGoalsToReuse = []
  const goalLabelUpdates = []
  const targetLabelUpdates = []

  for (const [goalKey, goalRows] of rowsByGoalKey.entries()) {
    const firstRow = goalRows[0]
    const existingGoal = destinationGoalsByKey.get(goalKey)
    const goalLabelId = labelsByDomain[domainKey(firstRow.domain)]?.id
    if (!existingGoal) {
      goalsToCreate.push({
        key: goalKey,
        labelIds: goalLabelId ? [goalLabelId] : [],
        payload: passageGoalPayload(firstRow, destinationClientId),
      })
    } else {
      existingGoalsToReuse.push({ key: goalKey, destinationId: existingGoal.id })
      if (goalLabelId && hasMissingLabels(existingGoal, [goalLabelId])) goalLabelUpdates.push({ id: existingGoal.id, labelIds: [goalLabelId] })
    }

    const existingTargetsByKey = new Map((existingGoal?.targets || []).map((target) => [targetKeyFromPassage(target), target]))
    for (const row of goalRows) {
      const targetKey = targetKeyFromRow(row)
      const targetLabelId = labelsByDomain[domainKey(row.domain)]?.id
      const existingTarget = existingTargetsByKey.get(targetKey)
      if (existingTarget) {
        if (targetLabelId && hasMissingLabels(existingTarget, [targetLabelId])) targetLabelUpdates.push({ id: existingTarget.id, labelIds: [targetLabelId] })
        continue
      }
      targetsToCreate.push({
        goalKey,
        targetKey,
        labelIds: targetLabelId ? [targetLabelId] : [],
        payloadTemplate: passageTargetPayload(row, ''),
      })
    }
  }

  return {
    rows,
    destinationClientId,
    destinationGoalsBefore,
    goalsToCreate,
    targetsToCreate,
    existingGoalsToReuse,
    goalLabelUpdates,
    targetLabelUpdates,
  }
}

function emptyPlan(rows, destinationGoalsBefore) {
  return {
    rows,
    destinationGoalsBefore,
    goalsToCreate: [],
    targetsToCreate: [],
    existingGoalsToReuse: [],
    goalLabelUpdates: [],
    targetLabelUpdates: [],
  }
}

async function executePassagePlan(cookieHeader, plan) {
  const destinationGoalIdByKey = new Map(plan.existingGoalsToReuse.map((item) => [item.key, item.destinationId]))
  const goalLabelUpdates = [...plan.goalLabelUpdates]
  const targetLabelUpdates = [...plan.targetLabelUpdates]
  const writeLog = []

  for (const goal of plan.goalsToCreate) {
    const created = await trpcPost(cookieHeader, 'goals.create', goal.payload, 25_000)
    const id = extractId(created)
    if (!id) throw new Error(`Passage goals.create returned no id for ${goal.key}.`)
    destinationGoalIdByKey.set(goal.key, id)
    if (goal.labelIds.length) goalLabelUpdates.push({ id, labelIds: goal.labelIds })
    writeLog.push({ procedure: 'goals.create', key: goal.key, returnedId: id })
  }

  for (const target of plan.targetsToCreate) {
    const goalId = destinationGoalIdByKey.get(target.goalKey)
    if (!goalId) throw new Error(`Missing Passage goal id for ${target.goalKey}.`)
    const created = await trpcPost(cookieHeader, 'targets.create', { ...target.payloadTemplate, goalId }, 25_000)
    const id = extractId(created)
    if (!id) throw new Error(`Passage targets.create returned no id for ${target.targetKey}.`)
    if (target.labelIds.length) targetLabelUpdates.push({ id, labelIds: target.labelIds })
    writeLog.push({ procedure: 'targets.create', goalKey: target.goalKey, targetKey: target.targetKey, returnedId: id })
  }

  const goalLabelWriteCount = await applyLabelUpdates(cookieHeader, 'goals.bulkUpdate', 'goalIds', goalLabelUpdates, writeLog)
  const targetLabelWriteCount = await applyLabelUpdates(cookieHeader, 'targets.bulkUpdate', 'targetIds', targetLabelUpdates, writeLog)

  return {
    createdGoalCount: plan.goalsToCreate.length,
    createdTargetCount: plan.targetsToCreate.length,
    reusedExistingGoalCount: plan.existingGoalsToReuse.length,
    goalLabelWriteCount,
    targetLabelWriteCount,
    writeLog,
  }
}

async function ensureDomainLabels(cookieHeader, live, warnings, blockers) {
  const groups = await trpcGet(cookieHeader, 'goalLabels.getAllGroups', {
    0: { json: null, meta: { values: ['undefined'] } },
  }, 15_000)
  if (!Array.isArray(groups) || groups.length < 1) {
    blockers.push('No Passage goal-label group was found.')
    return null
  }

  let labels = await trpcGet(cookieHeader, 'goalLabels.getAllLabels', {
    0: { json: null, meta: { values: ['undefined'] } },
  }, 15_000)
  if (!Array.isArray(labels)) labels = []

  const labelGroupId = groups.find((group) => group.value === 'Uncategorized')?.id || groups[0].id
  const createdLabels = []
  for (const [domain, labelValue] of Object.entries(PASSAGE_DOMAIN_LABELS)) {
    if (resolvePassageDomainLabel(labels, domain)) continue
    if (!live) {
      warnings.push(`Passage label will be created during live write: ${labelValue}.`)
      continue
    }
    const created = await trpcPost(cookieHeader, 'goalLabels.createLabel', { labelGroupId, value: labelValue }, 20_000)
    labels.push(created)
    createdLabels.push(created.value)
  }

  if (live && createdLabels.length) {
    labels = await trpcGet(cookieHeader, 'goalLabels.getAllLabels', {
      0: { json: null, meta: { values: ['undefined'] } },
    }, 15_000)
  }

  const labelsByDomain = {}
  for (const [domain, labelValue] of Object.entries(PASSAGE_DOMAIN_LABELS)) {
    const label = resolvePassageDomainLabel(labels, domain)
    labelsByDomain[domain] = { value: label?.value || labelValue, id: label?.id || null }
    if (live && !label?.id) blockers.push(`Missing Passage label after setup: ${labelValue}`)
  }

  return {
    labelsByDomain,
    summary: {
      selectedLabels: Object.fromEntries(Object.entries(labelsByDomain).map(([domain, label]) => [domain, label.value])),
      createdLabels,
    },
  }
}

function findDestinationClient(clients, body = {}, adapter = {}) {
  const requestedId = cleanText(adapter.clientId || body.passageClientId || body.destinationClientId)
  if (requestedId) {
    const matches = clients.filter((client) => client.id === requestedId)
    return matches.length === 1 ? matches[0] : null
  }

  const requestedName = normalizeName(adapter.clientName || adapter.passageClientName || body.passageClientName || body.clientLabel)
  if (!requestedName) return null
  const matches = clients.filter((client) => normalizeName(displayNameForClient(client)) === requestedName)
  return matches.length === 1 ? matches[0] : null
}

async function loadVisibleClients(cookieHeader, profile) {
  const teamMemberId = profile?.teamMember?.id || profile?.id || ''
  const all = []
  if (teamMemberId) {
    const assigned = await trpcGet(cookieHeader, 'teamMembers.getAssignedClients', {
      0: { json: { id: teamMemberId } },
    }, 15_000).catch(() => [])
    if (Array.isArray(assigned)) all.push(...assigned)
  }
  const demographics = await trpcGet(cookieHeader, 'reporting.clientDemographics', {
    0: { json: null, meta: { values: ['undefined'] } },
  }, 15_000).catch(() => [])
  if (Array.isArray(demographics)) all.push(...demographics)
  const clients = await trpcGet(cookieHeader, 'clients.getAll', {
    0: { json: null, meta: { values: ['undefined'] } },
  }, 15_000).catch(() => [])
  if (Array.isArray(clients)) all.push(...clients)

  const byId = new Map()
  for (const client of all) {
    if (client?.id) byId.set(client.id, client)
  }
  return [...byId.values()]
}

async function loadGoals(cookieHeader, clientId, includeArchived) {
  const data = await trpcGet(cookieHeader, 'goals.getAll', {
    0: {
      json: { clientId, type: null, treatmentPhases: [], includeArchived },
      meta: { values: { type: ['undefined'] } },
    },
  }, 20_000)
  return Array.isArray(data) ? data : []
}

async function applyLabelUpdates(cookieHeader, procedure, idField, updates, writeLog) {
  let count = 0
  const grouped = new Map()
  for (const update of updates) {
    const key = [...update.labelIds].sort().join('|')
    if (!key) continue
    if (!grouped.has(key)) grouped.set(key, { labelIds: [...update.labelIds].sort(), ids: [] })
    grouped.get(key).ids.push(update.id)
  }
  for (const group of grouped.values()) {
    const changes = procedure === 'targets.bulkUpdate'
      ? {
          phase: null,
          automationTemplateId: null,
          labelIds: group.labelIds,
          discriminativeStimulus: null,
          trialsPerSession: null,
        }
      : {
          phase: null,
          goalGroupName: null,
          labelIds: group.labelIds,
          discriminativeStimulus: null,
        }
    await trpcPost(cookieHeader, procedure, { [idField]: group.ids, changes }, 30_000)
    count += group.ids.length
    writeLog.push({ procedure, count: group.ids.length, labelIds: group.labelIds })
  }
  return count
}

function labelsFor(item = {}) {
  const linked = Array.isArray(item.linkedLabels) ? item.linkedLabels : Array.isArray(item.labels) ? item.labels : []
  return linked.map((label) => label.id).filter(Boolean)
}

function hasMissingLabels(item, expectedLabelIds = []) {
  if (!expectedLabelIds.length) return false
  const actual = new Set(labelsFor(item))
  return expectedLabelIds.some((id) => !actual.has(id))
}

function extractId(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value.id || value.goal?.id || value.target?.id || value.data?.id || ''
}

async function buildCookieHeaderFromCdp(cdpUrl) {
  if (typeof WebSocket !== 'function') throw new Error('This Node runtime does not expose WebSocket for Chrome DevTools.')
  const tabs = await (await fetch(`${cdpUrl}/json/list`, { signal: AbortSignal.timeout(5_000) })).json()
  const tab = tabs.find((item) => String(item.url || '').includes('clinical.passagehealth.com') && item.type === 'page')
  if (!tab?.webSocketDebuggerUrl) return ''
  const ws = new WebSocket(tab.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message)
      pending.delete(message.id)
    }
  }
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
    setTimeout(() => reject(new Error('Timed out connecting to Chrome debugger websocket.')), 5_000)
  })
  const send = (method, params = {}) => new Promise((resolve) => {
    const requestId = ++id
    pending.set(requestId, resolve)
    ws.send(JSON.stringify({ id: requestId, method, params }))
  })
  const response = await send('Network.getCookies', { urls: [PASSAGE_ORIGIN] })
  ws.close()
  return (response.result?.cookies || []).map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')
}

async function trpcGet(cookieHeader, procedure, input, timeoutMs = 15_000) {
  const result = await trpcGetDetailed(cookieHeader, procedure, input, timeoutMs)
  if (!result.ok) {
    const message = result.itemStatuses.find((item) => !item.ok)?.message || 'Passage request failed.'
    throw new Error(`${procedure} ${result.status}: ${message.slice(0, 240)}`)
  }
  return result.data
}

async function trpcGetDetailed(cookieHeader, procedure, input, timeoutMs = 15_000) {
  const url = `${PASSAGE_ORIGIN}/api/trpc/${procedure}?batch=1&input=${encodeURIComponent(JSON.stringify(input))}`
  const response = await fetch(url, {
    headers: { cookie: cookieHeader, accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  })
  const text = await response.text()
  let parsed = null
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = null
  }
  const items = Array.isArray(parsed) ? parsed : []
  const itemStatuses = items.map((item) => ({
    ok: Boolean(item?.result),
    code: item?.error?.code ?? null,
    message: String(item?.error?.message || ''),
  }))
  return {
    ok: response.ok && items.length > 0 && itemStatuses.every((item) => item.ok),
    status: response.status,
    itemStatuses,
    data: items?.[0]?.result?.data?.json ?? null,
  }
}

async function trpcPost(cookieHeader, procedure, input, timeoutMs = 25_000) {
  const bodyInput = superJsonInput(input)
  const response = await fetch(`${PASSAGE_ORIGIN}/api/trpc/${procedure}?batch=1`, {
    method: 'POST',
    headers: {
      cookie: cookieHeader,
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ 0: bodyInput }),
    signal: AbortSignal.timeout(timeoutMs),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`${procedure} ${response.status}: ${text.slice(0, 240)}`)
  return JSON.parse(text)?.[0]?.result?.data?.json
}

function superJsonInput(input) {
  const values = {}
  const json = serializeSuperJson(input, '', values)
  return Object.keys(values).length ? { json, meta: { values } } : { json }
}

function serializeSuperJson(value, pathKey, values) {
  if (value instanceof Date) {
    if (pathKey) values[pathKey] = ['Date']
    return value.toISOString()
  }
  if (value === undefined) {
    if (pathKey) values[pathKey] = ['undefined']
    return null
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => serializeSuperJson(item, pathKey ? `${pathKey}.${index}` : `${index}`, values))
  }
  if (value && typeof value === 'object') {
    const out = {}
    for (const [key, child] of Object.entries(value)) {
      out[key] = serializeSuperJson(child, pathKey ? `${pathKey}.${key}` : key, values)
    }
    return out
  }
  return value
}
