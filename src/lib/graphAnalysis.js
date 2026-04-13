/**
 * Graph Intelligence — statistical analysis + AI narrative generation
 * for program data and session trends.
 */
import { callAI } from './aiClient.js'

/**
 * Calculate linear regression slope from data points.
 * @param {Array<{x: number, y: number}>} points
 * @returns {{ slope: number, intercept: number, r2: number }}
 */
function linearRegression(points) {
  const n = points.length
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 }

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0
  for (const p of points) {
    sumX += p.x
    sumY += p.y
    sumXY += p.x * p.y
    sumX2 += p.x * p.x
    sumY2 += p.y * p.y
  }

  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 }

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  // R-squared
  const ssRes = points.reduce((acc, p) => acc + Math.pow(p.y - (slope * p.x + intercept), 2), 0)
  const mean = sumY / n
  const ssTot = points.reduce((acc, p) => acc + Math.pow(p.y - mean, 2), 0)
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot

  return { slope, intercept, r2 }
}

/**
 * Analyze graph data for a single program.
 * @param {Array<{date: string, value: number}>} dataPoints - Session data points
 * @param {Object} [options]
 * @param {number} [options.masteryCriteria=80] - Mastery threshold percentage
 * @param {number} [options.masteryConsecutive=3] - Consecutive sessions needed
 * @returns {{ trend, slope, variability, mean, lastValue, masteryPrediction, consecutiveAboveCriteria, dataCount, narrative }}
 */
export function analyzeGraphData(dataPoints, options = {}) {
  const { masteryCriteria = 80, masteryConsecutive = 3 } = options

  if (!dataPoints || dataPoints.length === 0) {
    return {
      trend: 'insufficient',
      slope: 0,
      variability: 0,
      mean: 0,
      lastValue: null,
      masteryPrediction: null,
      consecutiveAboveCriteria: 0,
      dataCount: 0,
      narrative: 'Insufficient data for analysis.',
    }
  }

  const values = dataPoints.map(p => p.value).filter(v => v != null)
  const n = values.length
  if (n < 2) {
    return {
      trend: 'insufficient',
      slope: 0,
      variability: 0,
      mean: values[0] || 0,
      lastValue: values[0] || null,
      masteryPrediction: null,
      consecutiveAboveCriteria: values[0] >= masteryCriteria ? 1 : 0,
      dataCount: n,
      narrative: 'Only one data point — more sessions needed to establish a trend.',
    }
  }

  // Linear regression
  const points = values.map((v, i) => ({ x: i, y: v }))
  const { slope, intercept, r2 } = linearRegression(points)

  // Basic stats
  const mean = values.reduce((a, b) => a + b, 0) / n
  const variance = values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / n
  const variability = Math.sqrt(variance)
  const lastValue = values[values.length - 1]

  // Trend classification
  let trend = 'stable'
  const slopePerSession = slope
  if (Math.abs(slopePerSession) < 1.5) trend = 'stable'
  else if (slopePerSession > 0) trend = 'improving'
  else trend = 'declining'

  // Consecutive sessions above mastery criteria (from the end)
  let consecutiveAboveCriteria = 0
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] >= masteryCriteria) consecutiveAboveCriteria++
    else break
  }

  // Mastery prediction — estimate sessions until mastery criteria met
  let masteryPrediction = null
  if (lastValue < masteryCriteria && slope > 0.5) {
    const sessionsNeeded = Math.ceil((masteryCriteria - lastValue) / slope)
    masteryPrediction = Math.max(1, sessionsNeeded) + masteryConsecutive
  } else if (consecutiveAboveCriteria >= masteryConsecutive) {
    masteryPrediction = 0 // Already met
  }

  // Auto-generate brief narrative
  const trendWord = trend === 'improving' ? 'an upward' : trend === 'declining' ? 'a downward' : 'a stable'
  let narrative = `Data shows ${trendWord} trend across ${n} sessions (slope: ${slope.toFixed(1)}%/session, R²: ${r2.toFixed(2)}). `
  narrative += `Current level: ${lastValue}%, average: ${mean.toFixed(0)}%, variability: ${variability.toFixed(1)}. `

  if (consecutiveAboveCriteria >= masteryConsecutive) {
    narrative += `Mastery criteria met — ${consecutiveAboveCriteria} consecutive sessions at/above ${masteryCriteria}%.`
  } else if (masteryPrediction != null && masteryPrediction > 0) {
    narrative += `At current trajectory, mastery criteria may be met in approximately ${masteryPrediction} sessions.`
  } else if (trend === 'declining') {
    narrative += `Declining performance suggests intervention review may be warranted.`
  } else if (trend === 'stable' && lastValue < masteryCriteria) {
    narrative += `Performance is stable but below criteria — consider modifying the teaching procedure.`
  }

  return {
    trend,
    slope: parseFloat(slope.toFixed(2)),
    variability: parseFloat(variability.toFixed(1)),
    mean: parseFloat(mean.toFixed(1)),
    lastValue,
    masteryPrediction,
    consecutiveAboveCriteria,
    dataCount: n,
    r2: parseFloat(r2.toFixed(3)),
    narrative,
  }
}

/**
 * Analyze multiple programs at once (batch analysis for Client AI Agent).
 * @param {Array<{name: string, domain: string, status: string, dataPoints: Array}>} programs
 * @returns {{ improving: Array, stable: Array, declining: Array, insufficient: Array, readyForAdvancement: Array, needsReview: Array }}
 */
export function batchAnalyzePrograms(programs) {
  const results = {
    improving: [],
    stable: [],
    declining: [],
    insufficient: [],
    readyForAdvancement: [],
    needsReview: [],
  }

  for (const prog of programs) {
    const analysis = analyzeGraphData(prog.dataPoints)
    const entry = { ...prog, analysis }

    if (analysis.trend === 'insufficient') {
      results.insufficient.push(entry)
    } else if (analysis.trend === 'improving') {
      results.improving.push(entry)
    } else if (analysis.trend === 'declining') {
      results.declining.push(entry)
      results.needsReview.push(entry)
    } else {
      results.stable.push(entry)
    }

    // Check mastery readiness
    if (analysis.consecutiveAboveCriteria >= 3 || analysis.masteryPrediction === 0) {
      results.readyForAdvancement.push(entry)
    }

    // Programs with <3 data points in last 2 weeks need more sessions
    if (analysis.dataCount < 3) {
      results.needsReview.push(entry)
    }
  }

  return results
}

/**
 * Call AI to generate a clinical narrative for graph data.
 * @param {string} programName
 * @param {Array<{date: string, value: number}>} dataPoints
 * @param {Object} [context] - Additional context (domain, status, criteria, clientName)
 * @param {AbortSignal} [signal]
 * @returns {Promise<string>}
 */
export async function getAIGraphNarrative(programName, dataPoints, context = {}, signal) {
  const analysis = analyzeGraphData(dataPoints)
  const { domain, status, criteria, clientName } = context

  const dataStr = dataPoints.slice(-20).map(p =>
    `${p.date}: ${p.value}%`
  ).join('\n')

  const messages = [
    {
      role: 'system',
      content: `You are a clinical data analyst for a BCBA (Board Certified Behavior Analyst). Write concise, professional clinical narratives about ABA program data. Use clinical terminology appropriate for authorization reports and progress notes. Be specific about numbers and trends. Do not use markdown formatting — write in plain prose paragraphs.`
    },
    {
      role: 'user',
      content: `Analyze this ABA program data and write a clinical narrative (2-3 sentences):

Program: ${programName}
${domain ? `Domain: ${domain}` : ''}
${status ? `Phase: ${status}` : ''}
${criteria ? `Mastery Criteria: ${criteria}` : 'Mastery Criteria: 80% across 3 consecutive sessions'}
${clientName ? `Client: ${clientName}` : ''}

Statistical Analysis:
- Trend: ${analysis.trend} (slope: ${analysis.slope}%/session)
- Mean: ${analysis.mean}%, Last value: ${analysis.lastValue}%
- Variability: ${analysis.variability}
- Data points: ${analysis.dataCount}
- Consecutive above criteria: ${analysis.consecutiveAboveCriteria}
${analysis.masteryPrediction != null ? `- Estimated sessions to mastery: ${analysis.masteryPrediction}` : ''}

Raw Data (recent):
${dataStr}

Write a clinical narrative suitable for an authorization report. Include specific percentages and session counts. If mastery criteria are met, recommend phase advancement. If declining, suggest intervention review.`
    }
  ]

  return callAI({ messages, model: 'gpt-4o-mini', maxTokens: 500, temperature: 0.4, signal })
}
