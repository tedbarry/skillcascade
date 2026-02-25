import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { framework, DOMAIN_DEPENDENCIES } from '../data/framework.js'
import {
  computeDomainHealth,
  computeCascadeStrength,
  computeImpactRanking,
  computeSubAreaHealth,
  detectCascadeRisks,
  findPrerequisiteChain,
  computePathReadiness,
  simulateCascade,
} from '../data/cascadeModel.js'

/**
 * Layout — same positions as SkillTree / old CascadeAnimation
 */
const NODE_LAYOUT = {
  d1: { col: 1, tier: 0 },
  d2: { col: 1, tier: 1 },
  d3: { col: 1, tier: 2 },
  d4: { col: 1, tier: 3 },
  d5: { col: 1, tier: 4 },
  d6: { col: 1, tier: 5 },
  d7: { col: 1, tier: 6 },
  d8: { col: 0, tier: 3 },
  d9: { col: 2, tier: 3 },
}

const EDGES = [
  { from: 'd1', to: 'd2', type: 'primary' },
  { from: 'd2', to: 'd3', type: 'primary' },
  { from: 'd3', to: 'd4', type: 'primary' },
  { from: 'd4', to: 'd5', type: 'primary' },
  { from: 'd5', to: 'd6', type: 'primary' },
  { from: 'd6', to: 'd7', type: 'primary' },
  { from: 'd2', to: 'd6', type: 'secondary' },
  { from: 'd3', to: 'd7', type: 'secondary' },
]

/**
 * useCascadeGraph — React hook wrapping cascade computations with memoization.
 *
 * @param {Object} assessments - Current assessment data { skillId: level }
 * @param {Array} snapshots - Array of historical snapshots
 * @param {Object} whatIfOverrides - Optional what-if domain overrides { domainId: targetAvg }
 * @returns Graph data, cascade state, and action dispatchers
 */
export default function useCascadeGraph(assessments = {}, snapshots = [], whatIfOverrides = null) {
  // What-if: use simulated assessments when overrides are active
  const effectiveAssessments = useMemo(() => {
    if (!whatIfOverrides || Object.keys(whatIfOverrides).length === 0) return assessments
    return simulateCascade(assessments, whatIfOverrides)
  }, [assessments, whatIfOverrides])

  // Domain health map
  const domainHealth = useMemo(
    () => computeDomainHealth(effectiveAssessments),
    [effectiveAssessments]
  )

  // Impact ranking
  const impactRanking = useMemo(
    () => computeImpactRanking(effectiveAssessments),
    [effectiveAssessments]
  )

  // Cascade risks
  const cascadeRisks = useMemo(
    () => detectCascadeRisks(effectiveAssessments, snapshots),
    [effectiveAssessments, snapshots]
  )

  // Graph nodes with positions
  const nodes = useMemo(() => {
    return framework.map((domain) => {
      const layout = NODE_LAYOUT[domain.id]
      const health = domainHealth[domain.id] || { avg: 0, assessed: 0, total: 0, healthPct: 0, state: 'locked' }
      const ranking = impactRanking.find((r) => r.domainId === domain.id)

      return {
        id: domain.id,
        name: domain.name,
        domain: domain.domain,
        subtitle: domain.subtitle,
        col: layout.col,
        tier: layout.tier,
        ...health,
        leverageScore: ranking?.leverageScore ?? 0,
        downstreamDomains: ranking?.downstreamDomains ?? 0,
        downstreamSkills: ranking?.downstreamSkills ?? 0,
        independent: domain.id === 'd8' || domain.id === 'd9',
      }
    })
  }, [domainHealth, impactRanking])

  // Graph edges with health-based styling data
  const edges = useMemo(() => {
    return EDGES.map((edge) => {
      const fromHealth = domainHealth[edge.from] || { avg: 0, healthPct: 0, state: 'locked' }
      const isWeak = fromHealth.assessed > 0 && fromHealth.avg < 1.5

      return {
        ...edge,
        sourceHealthPct: fromHealth.healthPct,
        sourceState: fromHealth.state,
        isWeak,
      }
    })
  }, [domainHealth])

  // ─── Cascade Animation State ───

  const [cascadeState, setCascadeState] = useState({
    active: false,
    source: null,
    affected: {},   // Map<domainId, { impactStrength, tier, pathFromSource }>
    phase: 0,       // Current animation phase (tier being animated)
    maxTier: 0,
  })

  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const triggerCascade = useCallback((domainId) => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const strength = computeCascadeStrength(domainId, effectiveAssessments)
    const maxTier = Math.max(0, ...Object.values(strength).map((s) => s.tier))

    setCascadeState({
      active: true,
      source: domainId,
      affected: {},
      phase: 0,
      maxTier,
    })

    // Animate tier by tier
    let currentPhase = 0
    const animateNext = () => {
      currentPhase++

      const affectedAtTier = {}
      Object.entries(strength).forEach(([id, data]) => {
        if (data.tier <= currentPhase) {
          affectedAtTier[id] = data
        }
      })

      setCascadeState((prev) => ({
        ...prev,
        affected: affectedAtTier,
        phase: currentPhase,
      }))

      if (currentPhase < maxTier) {
        timerRef.current = setTimeout(animateNext, 600)
      }
    }

    timerRef.current = setTimeout(animateNext, 400)
  }, [effectiveAssessments])

  const resetCascade = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setCascadeState({ active: false, source: null, affected: {}, phase: 0, maxTier: 0 })
  }, [])

  // ─── Sub-area expansion ───

  const getSubAreaHealth = useCallback(
    (domainId) => computeSubAreaHealth(domainId, effectiveAssessments),
    [effectiveAssessments]
  )

  // ─── Path tracing ───

  const getPrerequisiteChain = useCallback(
    (goalDomainId) => findPrerequisiteChain(goalDomainId),
    []
  )

  const getPathReadiness = useCallback(
    (chain) => computePathReadiness(chain, effectiveAssessments),
    [effectiveAssessments]
  )

  return {
    nodes,
    edges,
    domainHealth,
    impactRanking,
    cascadeRisks,
    cascadeState,
    triggerCascade,
    resetCascade,
    getSubAreaHealth,
    getPrerequisiteChain,
    getPathReadiness,
  }
}
