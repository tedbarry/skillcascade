import { framework, isAssessed } from '../data/framework.js'
import { buildAssessmentRecommendations } from './assessmentRecommendationEngine.js'
import {
  deriveClinicalEvidenceRows,
  getAuthEvidenceStatusForGoal,
  summarizeClinicalEvidenceRows,
} from './clinicalEvidenceSpine.js'
import { getGoalProvenanceBadge } from './recommendationDraftAdapters.js'

function countAssessmentCoverage(assessments = {}) {
  let totalSkills = 0
  let assessedSkills = 0

  for (const domain of framework) {
    for (const subArea of domain.subAreas) {
      for (const skillGroup of subArea.skillGroups) {
        for (const skill of skillGroup.skills) {
          totalSkills += 1
          if (isAssessed(assessments[skill.id])) assessedSkills += 1
        }
      }
    }
  }

  return {
    totalSkills,
    assessedSkills,
    completionPct: totalSkills > 0 ? Math.round((assessedSkills / totalSkills) * 100) : 0,
    hasAssessmentData: assessedSkills > 0,
  }
}

function getReportTime(report = {}) {
  if (Number.isFinite(report.createdAt)) return report.createdAt
  const dateText = report.created_at || report.createdAt || report.updated_at || report.updatedAt
  const timestamp = Date.parse(dateText)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function countGoalEvidence(programs = [], decisions = []) {
  const counts = {
    totalGoals: 0,
    assessmentSupported: 0,
    libraryVerified: 0,
    adapted: 0,
    assessmentDirect: 0,
    custom: 0,
    needsSupport: 0,
  }

  for (const program of programs || []) {
    if (program?.deleted_at) continue
    counts.totalGoals += 1
    const evidence = getAuthEvidenceStatusForGoal(program, decisions)
    const provenance = getGoalProvenanceBadge(program)

    if (evidence.status === 'assessment_supported') counts.assessmentSupported += 1
    if (evidence.status === 'library_verified') counts.libraryVerified += 1
    if (evidence.status === 'adapted') counts.adapted += 1
    if (evidence.status === 'assessment_direct') counts.assessmentDirect += 1
    if (evidence.status === 'needs_support') counts.needsSupport += 1
    if (provenance.status === 'custom') counts.custom += 1
  }

  return counts
}

function buildNextActions({
  coverage,
  evidenceSummary,
  goalEvidence,
  reports,
  recommendations,
  hasClient,
} = {}) {
  const actions = []

  if (!hasClient) {
    actions.push({
      id: 'select-client',
      label: 'Select a real client',
      detail: 'Clinical decisions, Learning Tree imports, and auth support are client-specific.',
      view: 'clients',
      tone: 'warm',
      priority: 100,
    })
  }

  if (!coverage.hasAssessmentData && recommendations.length === 0) {
    actions.push({
      id: 'complete-assessment',
      label: 'Complete assessment signals',
      detail: 'Rate enough clinically relevant skills to generate medically necessary goal recommendations.',
      view: 'quick-assess',
      tone: 'sage',
      priority: 95,
    })
  }

  if (evidenceSummary.pending > 0) {
    actions.push({
      id: 'review-evidence',
      label: `Review ${evidenceSummary.pending} recommendation${evidenceSummary.pending === 1 ? '' : 's'}`,
      detail: 'Import, link, exclude, or request more assessment before goals enter the treatment plan.',
      view: 'clinical-evidence',
      tone: 'blue',
      priority: 90,
    })
  }

  if (recommendations.length > 0 && evidenceSummary.imported + evidenceSummary.linked === 0) {
    actions.push({
      id: 'import-first-goal',
      label: 'Import assessment-backed goals',
      detail: 'Move reviewed canonical goals into the Learning Tree with immutable source snapshots.',
      view: 'clinical-evidence',
      tone: 'sage',
      priority: 82,
    })
  }

  const unsupportedGoalCount = goalEvidence.needsSupport + goalEvidence.adapted
  if (unsupportedGoalCount > 0) {
    actions.push({
      id: 'strengthen-goal-support',
      label: 'Strengthen goal support',
      detail: `${unsupportedGoalCount} Learning Tree goal${unsupportedGoalCount === 1 ? '' : 's'} need clearer canonical or assessment support.`,
      view: 'learning-tree',
      tone: 'amber',
      priority: 75,
    })
  }

  if (goalEvidence.totalGoals > 0) {
    actions.push({
      id: 'prepare-auth-report',
      label: reports.length > 0 ? 'Refresh auth-report support' : 'Draft auth-report support',
      detail: 'Use the same Learning Tree and evidence status to support authorization language.',
      view: 'reports',
      tone: 'blue',
      priority: reports.length > 0 ? 52 : 68,
    })
  }

  if (coverage.hasAssessmentData && recommendations.length === 0) {
    actions.push({
      id: 'recheck-assessment',
      label: 'Review assessment coverage',
      detail: 'No medically necessary recommendation cluster is currently detected from scored items.',
      view: 'assess',
      tone: 'warm',
      priority: 45,
    })
  }

  if (goalEvidence.totalGoals === 0 && coverage.hasAssessmentData) {
    actions.push({
      id: 'browse-library',
      label: 'Browse verified goal library',
      detail: 'Use medically necessary canonical goals when assessment recommendations do not yet cover the client need.',
      view: 'goal-library',
      tone: 'sage',
      priority: 40,
    })
  }

  return actions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 4)
}

function buildTopRecommendationRows(rows = []) {
  return [...rows]
    .filter((row) => !['imported', 'linked', 'excluded'].includes(row.decisionStatus))
    .sort((a, b) => (b.recommendation?.priorityScore || 0) - (a.recommendation?.priorityScore || 0))
    .slice(0, 3)
    .map((row) => ({
      id: row.id,
      title: row.target?.name || row.recommendation?.goalFamilyTitle || 'Assessment recommendation',
      family: row.recommendation?.goalFamilyTitle || row.target?.stg_name || 'Canonical goal family',
      priorityScore: row.recommendation?.priorityScore ?? null,
      decisionLabel: row.decisionBadge?.label || 'Pending BCBA Decision',
      supportLabel: row.authReportSupport?.label || 'Needs review',
    }))
}

export function buildBcbaCommandCenterSummary({
  assessments = {},
  recommendations = null,
  programs = [],
  decisions = [],
  reports = [],
  snapshots = [],
  hasClient = true,
} = {}) {
  const coverage = countAssessmentCoverage(assessments)
  const assessmentRecommendations = Array.isArray(recommendations)
    ? recommendations
    : buildAssessmentRecommendations(assessments)
  const activePrograms = (programs || []).filter((program) => !program?.deleted_at)
  const evidenceRows = deriveClinicalEvidenceRows({
    recommendations: assessmentRecommendations,
    decisions,
    programs: activePrograms,
  })
  const evidenceSummary = summarizeClinicalEvidenceRows(evidenceRows, activePrograms)
  const goalEvidence = countGoalEvidence(activePrograms, decisions)
  const sortedReports = [...(reports || [])].sort((a, b) => getReportTime(b) - getReportTime(a))
  const latestReport = sortedReports[0] || null

  return {
    coverage,
    recommendations: assessmentRecommendations,
    evidenceRows,
    evidenceSummary,
    goalEvidence,
    reports: {
      totalReports: reports.length,
      latestReport,
      latestReportAt: latestReport ? getReportTime(latestReport) : null,
    },
    snapshots: {
      totalSnapshots: snapshots.length,
    },
    topRecommendations: buildTopRecommendationRows(evidenceRows),
    nextActions: buildNextActions({
      coverage,
      evidenceSummary,
      goalEvidence,
      reports,
      recommendations: assessmentRecommendations,
      hasClient,
    }),
  }
}
