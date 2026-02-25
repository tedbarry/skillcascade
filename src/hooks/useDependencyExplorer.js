import { useMemo } from 'react'
import { framework } from '../data/framework.js'
import { computeDomainHealth, computeSubAreaHealth, computeSubAreaReadiness } from '../data/cascadeModel.js'
import {
  buildDomainChordMatrix,
  buildReversePrereqMap,
  buildReverseSubAreaDeps,
  getSubAreaPrereqs,
  getAllPrerequisites,
  getSkillTier,
  getDomainFromId,
  getSubAreaFromId,
  SUB_AREA_DEPS,
  SKILL_PREREQUISITES,
} from '../data/skillDependencies.js'

const DOMAIN_IDS = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9']

/**
 * useDependencyExplorer — memoized data for the 3-level dependency explorer.
 *
 * Returns chord matrix, reverse maps, sub-area graph data, and skill tree data
 * for the currently selected drill-down level.
 */
export default function useDependencyExplorer(assessments = {}) {
  // Static data (no dependency on assessments)
  const chordData = useMemo(() => buildDomainChordMatrix(), [])
  const reversePrereqMap = useMemo(() => buildReversePrereqMap(), [])
  const reverseSubAreaDeps = useMemo(() => buildReverseSubAreaDeps(), [])

  // Domain health for arc coloring
  const domainHealth = useMemo(() => computeDomainHealth(assessments), [assessments])

  // Sub-area readiness for node coloring in Level 2
  const subAreaReadiness = useMemo(() => computeSubAreaReadiness(assessments), [assessments])

  // Sub-area health per domain — flattened into a single map { subAreaId: healthData }
  const subAreaHealth = useMemo(() => {
    const result = {}
    DOMAIN_IDS.forEach(domainId => {
      const health = computeSubAreaHealth(domainId, assessments)
      health.forEach(sa => { result[sa.id] = sa })
    })
    return result
  }, [assessments])

  /**
   * Get sub-area graph data for Level 2.
   * @param {string|null} filterDomainId - If set, show this domain's sub-areas + their cross-domain prereqs
   * @returns {{ nodes: Array, edges: Array }}
   */
  const getSubAreaGraph = useMemo(() => (filterDomainId) => {
    const nodes = []
    const edges = []
    const included = new Set()

    // Collect sub-areas to show
    if (filterDomainId) {
      // Filtered mode: show domain's sub-areas + their prereqs
      const domain = framework.find(d => d.id === filterDomainId)
      if (domain) {
        domain.subAreas.forEach(sa => included.add(sa.id))
        // Add cross-domain prerequisite sub-areas
        domain.subAreas.forEach(sa => {
          const prereqs = getSubAreaPrereqs(sa.id)
          prereqs.forEach(pid => included.add(pid))
        })
        // Add downstream sub-areas from other domains that depend on this domain
        domain.subAreas.forEach(sa => {
          const downstream = reverseSubAreaDeps[sa.id] || []
          downstream.forEach(did => included.add(did))
        })
      }
    } else {
      // Full web: all 47 sub-areas
      framework.forEach(d => d.subAreas.forEach(sa => included.add(sa.id)))
    }

    // Build nodes
    included.forEach(saId => {
      const domainId = getDomainFromId(saId)
      const domain = framework.find(d => d.id === domainId)
      const subArea = domain?.subAreas.find(sa => sa.id === saId)
      if (!subArea) return

      const health = subAreaHealth[saId]
      const readiness = subAreaReadiness[saId]

      nodes.push({
        id: saId,
        name: subArea.name,
        domainId,
        domainName: domain.name,
        healthPct: health?.healthPct ?? 0,
        avg: health?.avg ?? 0,
        assessed: health?.assessed ?? 0,
        total: health?.total ?? 0,
        readiness: readiness?.readiness ?? 1,
        ready: readiness?.ready ?? true,
        skillCount: subArea.skillGroups.reduce((n, sg) => n + sg.skills.length, 0),
      })
    })

    // Build edges
    included.forEach(saId => {
      const prereqs = getSubAreaPrereqs(saId)
      prereqs.forEach(prereqId => {
        if (included.has(prereqId)) {
          edges.push({
            from: prereqId,
            to: saId,
            crossDomain: getDomainFromId(prereqId) !== getDomainFromId(saId),
          })
        }
      })
    })

    return { nodes, edges }
  }, [subAreaHealth, subAreaReadiness, reverseSubAreaDeps])

  /**
   * Get skill tree data for Level 3.
   * @param {string} skillId - The selected skill
   * @returns {{ root, upstream: Array, downstream: Array }}
   */
  const getSkillTree = useMemo(() => (skillId) => {
    if (!skillId) return { root: null, upstream: [], downstream: [] }

    const domainId = getDomainFromId(skillId)
    const domain = framework.find(d => d.id === domainId)
    let skillName = skillId
    if (domain) {
      domain.subAreas.forEach(sa => {
        sa.skillGroups.forEach(sg => {
          const found = sg.skills.find(s => s.id === skillId)
          if (found) skillName = found.name
        })
      })
    }

    const root = {
      id: skillId,
      name: skillName,
      domainId,
      tier: getSkillTier(skillId),
      level: assessments[skillId] ?? 0,
      subAreaId: getSubAreaFromId(skillId),
    }

    // Upstream: direct prerequisites (recursive 1 level to keep it manageable)
    const { direct, structural } = getAllPrerequisites(skillId, framework)
    const allUpstream = [...new Set([...direct, ...structural])]
    const upstream = allUpstream.map(pid => {
      const pDomain = getDomainFromId(pid)
      const pDomainData = framework.find(d => d.id === pDomain)
      let pName = pid
      if (pDomainData) {
        pDomainData.subAreas.forEach(sa => {
          sa.skillGroups.forEach(sg => {
            const f = sg.skills.find(s => s.id === pid)
            if (f) pName = f.name
          })
        })
      }
      return {
        id: pid,
        name: pName,
        domainId: pDomain,
        tier: getSkillTier(pid),
        level: assessments[pid] ?? 0,
        isDirect: direct.includes(pid),
        subAreaId: getSubAreaFromId(pid),
      }
    })

    // Downstream: skills that depend on this skill
    const downstreamIds = reversePrereqMap[skillId] || []
    const downstream = downstreamIds.map(did => {
      const dDomain = getDomainFromId(did)
      const dDomainData = framework.find(d => d.id === dDomain)
      let dName = did
      if (dDomainData) {
        dDomainData.subAreas.forEach(sa => {
          sa.skillGroups.forEach(sg => {
            const f = sg.skills.find(s => s.id === did)
            if (f) dName = f.name
          })
        })
      }
      return {
        id: did,
        name: dName,
        domainId: dDomain,
        tier: getSkillTier(did),
        level: assessments[did] ?? 0,
        subAreaId: getSubAreaFromId(did),
      }
    })

    return { root, upstream, downstream }
  }, [assessments, reversePrereqMap])

  /**
   * Get skills within a sub-area for Level 2 → Level 3 drill-down.
   */
  const getSubAreaSkills = useMemo(() => (subAreaId) => {
    const domainId = getDomainFromId(subAreaId)
    const domain = framework.find(d => d.id === domainId)
    if (!domain) return []

    const subArea = domain.subAreas.find(sa => sa.id === subAreaId)
    if (!subArea) return []

    const skills = []
    subArea.skillGroups.forEach(sg => {
      sg.skills.forEach(skill => {
        skills.push({
          id: skill.id,
          name: skill.name,
          tier: getSkillTier(skill.id),
          level: assessments[skill.id] ?? 0,
          hasPrereqs: !!(SKILL_PREREQUISITES[skill.id]?.length),
          hasDependents: !!(reversePrereqMap[skill.id]?.length),
        })
      })
    })

    return skills
  }, [assessments, reversePrereqMap])

  return {
    // Level 1: Chord
    chordData,
    domainHealth,

    // Level 2: Sub-Area Web
    getSubAreaGraph,
    subAreaHealth,
    subAreaReadiness,
    reverseSubAreaDeps,

    // Level 3: Skill Explorer
    getSkillTree,
    getSubAreaSkills,
    reversePrereqMap,
  }
}
