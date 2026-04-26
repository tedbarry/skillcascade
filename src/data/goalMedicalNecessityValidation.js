const REQUIRED_VERIFICATION_CATEGORIES = [
  'public_function_code',
  'practice_standard',
  'payer_criteria',
]

function parseGoalDetail(target) {
  if (!target?.description) return {}
  try {
    return JSON.parse(target.description)
  } catch {
    return {}
  }
}

function normalizeLinkedName(name = '') {
  return name.toLowerCase().trim()
}

function buildDomainSummary(targets = []) {
  const summary = {}
  for (const target of targets) {
    const domainName = target.domain_name || 'Unknown'
    summary[domainName] ||= { goals: 0, decreaseGoals: 0, increaseGoals: 0 }
    summary[domainName].goals += 1
    if ((target.goal_type || 'increase') === 'decrease') {
      summary[domainName].decreaseGoals += 1
    } else {
      summary[domainName].increaseGoals += 1
    }
  }
  return summary
}

function buildTagSummary(targets = []) {
  const summary = {}
  for (const target of targets) {
    const detail = parseGoalDetail(target)
    for (const tag of detail.medical_necessity_tags || []) {
      summary[tag] = (summary[tag] || 0) + 1
    }
  }
  return summary
}

export function validateCoreGoalLibrary(coreGoalLibrary) {
  const errors = []
  const targets = coreGoalLibrary?.targets || []
  const existingNames = new Set(targets.map((target) => normalizeLinkedName(target.name || '')))

  for (const target of targets) {
    const label = target.name || target.id || 'Unnamed goal'
    const detail = parseGoalDetail(target)
    const sourceCategories = new Set((detail.verification_sources || []).map((source) => source.category))
    const isBehaviorPriorityGoal =
      target.domain_name === 'Behavior' ||
      (Array.isArray(detail.linked_maladaptive_names) && detail.linked_maladaptive_names.length > 0) ||
      (Array.isArray(detail.linked_ferb_names) && detail.linked_ferb_names.length > 0)

    if (!detail.objective) {
      errors.push(`${label}: missing objective`)
    }
    if (!detail.library_description) {
      errors.push(`${label}: missing library description`)
    }
    if (!detail.recommended_when) {
      errors.push(`${label}: missing recommended_when`)
    }
    if (!detail.medical_necessity) {
      errors.push(`${label}: missing medical_necessity`)
    }
    if (!Array.isArray(detail.assessment_signals) || detail.assessment_signals.length === 0) {
      errors.push(`${label}: missing assessment signals`)
    }
    if (!Array.isArray(detail.medical_necessity_tags) || detail.medical_necessity_tags.length === 0) {
      errors.push(`${label}: missing medical necessity tags`)
    }
    if (!detail.verification_summary) {
      errors.push(`${label}: missing verification summary`)
    }
    if (!Array.isArray(detail.verification_sources) || detail.verification_sources.length === 0) {
      errors.push(`${label}: missing verification sources`)
    }

    for (const category of REQUIRED_VERIFICATION_CATEGORIES) {
      if (!sourceCategories.has(category)) {
        errors.push(`${label}: missing verification source category "${category}"`)
      }
    }

    if (isBehaviorPriorityGoal) {
      if (!detail.probable_function) {
        errors.push(`${label}: missing probable function for behavior-priority goal`)
      }
      if (!detail.ferb && (!Array.isArray(detail.linked_ferb_names) || detail.linked_ferb_names.length === 0)) {
        errors.push(`${label}: missing FERB guidance for behavior-priority goal`)
      }
    }

    for (const linkedName of detail.linked_ferb_names || []) {
      if (!existingNames.has(normalizeLinkedName(linkedName))) {
        errors.push(`${label}: linked FERB not found in library -> ${linkedName}`)
      }
    }

    for (const linkedName of detail.linked_maladaptive_names || []) {
      if (!existingNames.has(normalizeLinkedName(linkedName))) {
        errors.push(`${label}: linked maladaptive goal not found in library -> ${linkedName}`)
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      totalGoals: targets.length,
      domainCounts: buildDomainSummary(targets),
      tagCounts: buildTagSummary(targets),
    },
  }
}
