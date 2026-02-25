import { useState, useMemo, useCallback, useRef, useEffect, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as d3 from 'd3'
import { framework, DOMAIN_DEPENDENCIES } from '../data/framework.js'
import { computeDomainHealth, computeSubAreaHealth, findPrerequisiteChain, computePathReadiness } from '../data/cascadeModel.js'
import useCascadeGraph from '../hooks/useCascadeGraph.js'
import useResponsive from '../hooks/useResponsive.js'

const WhatIfPanel = lazy(() => import('./WhatIfPanel.jsx'))
const CascadeTimelineSlider = lazy(() => import('./CascadeTimelineSlider.jsx'))
const CascadeWarnings = lazy(() => import('./CascadeWarnings.jsx'))
const CascadeNeuralCanvas = lazy(() => import('./CascadeNeuralCanvas.jsx'))
const CascadeTerrainMap = lazy(() => import('./CascadeTerrainMap.jsx'))
const CascadeGraph3D = lazy(() => import('./CascadeGraph3D.jsx'))

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */

const DOMAIN_COLORS = {
  d1: '#e07b6e', d2: '#d4956a', d3: '#c9a84c', d4: '#8fb570',
  d5: '#5da87a', d6: '#4a9e9e', d7: '#6889b5', d8: '#8b7bb5', d9: '#a86e9a',
}

const STATE_CONFIG = {
  locked:       { fill: '#2a2a2a', stroke: '#444',    textColor: '#888',    label: 'Locked' },
  blocked:      { fill: '#3a2020', stroke: '#8b4444', textColor: '#ccc',    label: 'Blocked' },
  'needs-work': { fill: '#3a2525', stroke: '#e8928a', textColor: '#f5c4c0', label: 'Needs Work' },
  developing:   { fill: '#3a3520', stroke: '#e5b76a', textColor: '#f5e0b0', label: 'Developing' },
  mastered:     { fill: '#1e3525', stroke: '#7fb589', textColor: '#b5e8bf', label: 'Mastered' },
}

const MODES = {
  LIVE: 'live',
  WHATIF: 'whatif',
  PATHTRACE: 'pathtrace',
  TIMELINE: 'timeline',
  WARNINGS: 'warnings',
}

// Toolbar icons per mode
const MODE_ICONS = {
  [MODES.LIVE]: '\u25C9',       // ◉
  [MODES.WHATIF]: '\u2697\uFE0E', // ⚗
  [MODES.PATHTRACE]: '\u2197',  // ↗
  [MODES.TIMELINE]: '\u25F7',   // ◷
}

const LAYOUTS = {
  TIERED: 'tiered',
  ORBITAL: 'orbital',
  NEURAL: 'neural',
  TERRAIN: 'terrain',
  THREE_D: '3d',
}

// Orbital layout: curated ring + angle for each domain
// Ring 0 = center core. Rings 1-3 = concentric orbits. Evenly spaced within each ring.
const ORBITAL_RINGS = {
  d1: { ring: 0, angle: 0 },
  d2: { ring: 1, angle: -Math.PI / 2 - 0.5 },   // upper-left
  d3: { ring: 1, angle: -Math.PI / 2 + 0.5 },   // upper-right
  d4: { ring: 2, angle: -Math.PI / 2 },          // top center
  d5: { ring: 2, angle: -Math.PI / 2 + 2.1 },   // lower-right
  d6: { ring: 2, angle: -Math.PI / 2 - 2.1 },   // lower-left
  d7: { ring: 3, angle: -Math.PI / 2 },          // crown (top)
  d8: { ring: 2, angle: Math.PI / 2 - 0.4 },     // bottom-left
  d9: { ring: 2, angle: Math.PI / 2 + 0.4 },     // bottom-right
}

// Heatmap color scale (cool blue → warm red)
const heatmapScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, 1])

/* ─────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────── */

export default function CascadeAnimation({
  assessments = {},
  snapshots = [],
  clientName = '',
  onSelectNode,
  onNavigateToAssess,
}) {
  const { isPhone, isTablet, isDesktop } = useResponsive()

  // Mode state
  const [mode, setMode] = useState(MODES.LIVE)
  const [heatmapOn, setHeatmapOn] = useState(false)

  // What-if overrides
  const [whatIfOverrides, setWhatIfOverrides] = useState({})

  // Semantic zoom
  const [expandedDomain, setExpandedDomain] = useState(null)

  // Path tracer
  const [pathGoal, setPathGoal] = useState(null)

  // Timeline
  const [displayAssessments, setDisplayAssessments] = useState(null)

  // Tooltip
  const [tooltip, setTooltip] = useState(null)
  const tooltipTimerRef = useRef(null)

  // Legend visibility
  const [legendOpen, setLegendOpen] = useState(false)

  // Layout mode
  const [layout, setLayout] = useState(LAYOUTS.NEURAL)

  // The assessments used for rendering — timeline can override
  const effectiveAssessments = displayAssessments && mode === MODES.TIMELINE
    ? displayAssessments
    : assessments

  // Hook into cascade graph
  const activeOverrides = mode === MODES.WHATIF ? whatIfOverrides : null
  const {
    nodes,
    edges,
    domainHealth,
    impactRanking,
    cascadeRisks,
    cascadeState,
    triggerCascade,
    resetCascade,
    getSubAreaHealth,
  } = useCascadeGraph(effectiveAssessments, snapshots, activeOverrides)

  // Has any assessment data?
  const hasData = useMemo(() => Object.keys(assessments).length > 0, [assessments])

  // Mastery cascade detection — gold visuals for strong domains
  const isMasteryCascade = useMemo(() => {
    if (!cascadeState.active || !cascadeState.source) return false
    const source = nodes.find(n => n.id === cascadeState.source)
    return source && source.healthPct >= 0.67
  }, [cascadeState, nodes])

  // Path trace chain
  const pathChain = useMemo(() => {
    if (mode !== MODES.PATHTRACE || !pathGoal) return null
    const chain = findPrerequisiteChain(pathGoal)
    return computePathReadiness(chain, effectiveAssessments)
  }, [mode, pathGoal, effectiveAssessments])

  const pathDomainIds = useMemo(() => {
    if (!pathChain) return new Set()
    return new Set(pathChain.map((s) => s.domainId))
  }, [pathChain])

  // Sub-area data for expanded domain
  const subAreas = useMemo(() => {
    if (!expandedDomain) return []
    return computeSubAreaHealth(expandedDomain, effectiveAssessments)
  }, [expandedDomain, effectiveAssessments])

  // ─── Dimensions ───

  const width = isPhone ? 600 : isTablet ? 750 : 900
  const height = isPhone ? 560 : isTablet ? 700 : 820
  const nodeW = isPhone ? 140 : isTablet ? 170 : 200
  const nodeH = isPhone ? 46 : isTablet ? 54 : 64
  const tierSpacing = isPhone ? 62 : isTablet ? 80 : 96
  const colSpacing = isPhone ? 190 : isTablet ? 240 : 280
  const fontSize = isPhone ? 10 : isTablet ? 11 : 13
  const subFontSize = isPhone ? 8 : isTablet ? 9 : 10

  const centerX = width / 2
  const bottomY = height - (isPhone ? 50 : 70)
  const orbitalCenterY = height / 2
  const orbitalBaseRadius = isPhone ? 90 : isTablet ? 115 : 140
  const orbitalRingGap = isPhone ? 80 : isTablet ? 100 : 120

  const positions = useMemo(() => {
    const pos = {}
    if (layout === LAYOUTS.ORBITAL) {
      nodes.forEach((node) => {
        const config = ORBITAL_RINGS[node.id]
        if (!config) return
        if (config.ring === 0) {
          pos[node.id] = { x: centerX, y: orbitalCenterY }
        } else {
          const radius = orbitalBaseRadius + (config.ring - 1) * orbitalRingGap
          pos[node.id] = {
            x: centerX + radius * Math.cos(config.angle),
            y: orbitalCenterY + radius * Math.sin(config.angle),
          }
        }
      })
    } else {
      nodes.forEach((node) => {
        pos[node.id] = {
          x: centerX + (node.col - 1) * colSpacing,
          y: bottomY - node.tier * tierSpacing,
        }
      })
    }
    return pos
  }, [nodes, layout, centerX, bottomY, colSpacing, tierSpacing, orbitalCenterY, orbitalBaseRadius, orbitalRingGap])

  // ─── Mode switching ───

  const switchMode = useCallback((newMode) => {
    resetCascade()
    setExpandedDomain(null)
    setPathGoal(null)
    setDisplayAssessments(null)
    if (newMode === mode) {
      setMode(MODES.LIVE)
    } else {
      setMode(newMode)
    }
    if (newMode !== MODES.WHATIF) {
      setWhatIfOverrides({})
    }
  }, [mode, resetCascade])

  // ─── Node click handling ───

  const handleNodeClick = useCallback((domainId) => {
    if (mode === MODES.PATHTRACE) {
      setPathGoal(domainId)
      return
    }
    if (mode === MODES.LIVE) {
      if (!domainId.startsWith('d8') && !domainId.startsWith('d9')) {
        if (cascadeState.active && cascadeState.source === domainId) {
          resetCascade()
        } else {
          resetCascade()
          setTimeout(() => triggerCascade(domainId), 50)
        }
      }
    }
  }, [mode, cascadeState, triggerCascade, resetCascade])

  const handleNodeDoubleClick = useCallback((domainId) => {
    if (expandedDomain === domainId) {
      setExpandedDomain(null)
    } else {
      setExpandedDomain(domainId)
    }
  }, [expandedDomain])

  // ─── Keyboard navigation ───

  const handleNodeKeyDown = useCallback((e, domainId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleNodeClick(domainId)
    }
  }, [handleNodeClick])

  // ─── Node styling ───

  function getNodeStyle(node) {
    const config = STATE_CONFIG[node.state] || STATE_CONFIG.locked
    const domainColor = DOMAIN_COLORS[node.id] || '#888'

    // Path trace: dim non-path nodes
    if (mode === MODES.PATHTRACE && pathGoal) {
      if (!pathDomainIds.has(node.id)) {
        return { fill: '#1a1a1e', stroke: '#333', textColor: '#555', glow: false, domainColor }
      }
      const step = pathChain?.find((s) => s.domainId === node.id)
      if (step?.status === 'met') return { fill: '#1e3525', stroke: '#7fb589', textColor: '#b5e8bf', glow: true, domainColor }
      if (step?.status === 'close') return { fill: '#3a3520', stroke: '#e5b76a', textColor: '#f5e0b0', glow: true, domainColor }
      return { fill: '#3a2525', stroke: '#e8928a', textColor: '#f5c4c0', glow: true, domainColor }
    }

    // Cascade active: source and affected — gold for mastery, red for weakness
    if (cascadeState.active) {
      if (node.id === cascadeState.source) {
        if (isMasteryCascade) {
          return { fill: '#2a2a15', stroke: '#ffd700', textColor: '#ffe680', glow: true, shake: true, domainColor }
        }
        return { fill: '#5c1a1a', stroke: '#ff4444', textColor: '#ff8888', glow: true, shake: true, domainColor }
      }
      const affected = cascadeState.affected[node.id]
      if (affected) {
        const intensity = Math.max(0.3, affected.impactStrength)
        if (isMasteryCascade) {
          return {
            fill: `rgba(42, 42, 21, ${intensity})`,
            stroke: `rgba(255, 215, 0, ${intensity})`,
            textColor: `rgba(255, 230, 128, ${intensity})`,
            glow: true,
            domainColor,
          }
        }
        return {
          fill: `rgba(92, 26, 26, ${intensity})`,
          stroke: `rgba(255, 68, 68, ${intensity})`,
          textColor: `rgba(255, 136, 136, ${intensity})`,
          glow: true,
          domainColor,
        }
      }
      if (isMasteryCascade) {
        return { fill: '#1e2520', stroke: '#5a8a5a', textColor: '#8ab88a', glow: false, domainColor }
      }
      return { fill: '#1e3525', stroke: '#7fb589', textColor: '#b5e8bf', glow: false, domainColor }
    }

    // Heatmap overlay — proper d3 color scale
    if (heatmapOn) {
      const maxLeverage = Math.max(1, ...impactRanking.map((r) => r.leverageScore))
      const t = node.leverageScore / maxLeverage
      const heatColor = d3.color(heatmapScale(t * 0.85 + 0.15)) // offset to avoid near-white
      return {
        fill: `rgba(${heatColor.r}, ${heatColor.g}, ${heatColor.b}, 0.25)`,
        stroke: heatColor.formatHex(),
        textColor: d3.interpolateRgb(heatColor.formatHex(), '#ffffff')(0.4),
        glow: t > 0.5,
        domainColor,
      }
    }

    // Data-driven default
    if (hasData && node.assessed > 0) {
      return { fill: config.fill, stroke: config.stroke, textColor: config.textColor, glow: node.state === 'mastered', domainColor }
    }

    return { fill: config.fill, stroke: config.stroke, textColor: config.textColor, glow: false, domainColor }
  }

  function getEdgeStyle(edge) {
    const cascadeColor = isMasteryCascade ? '#ffd700' : '#ff4444'

    // Path trace: highlight path edges
    if (mode === MODES.PATHTRACE && pathGoal && pathDomainIds.has(edge.from) && pathDomainIds.has(edge.to)) {
      return { stroke: '#6889b5', opacity: 1, width: 3, dash: 'none', animate: true, arrowId: 'arrow-blue', particleColor: '#6889b5' }
    }
    if (mode === MODES.PATHTRACE && pathGoal) {
      return { stroke: '#333', opacity: 0.2, width: 1, dash: '4,4', animate: false, arrowId: 'arrow-dim' }
    }

    // Cascade active
    if (cascadeState.active) {
      const sourceAffected = edge.from === cascadeState.source || cascadeState.affected[edge.from]
      const targetAffected = cascadeState.affected[edge.to]

      if (sourceAffected && targetAffected) {
        const impact = cascadeState.affected[edge.to]?.impactStrength ?? 0.5
        return {
          stroke: cascadeColor,
          opacity: 0.5 + impact * 0.5,
          width: 1.5 + impact * 2,
          dash: 'none',
          animate: true,
          arrowId: isMasteryCascade ? 'arrow-gold' : 'arrow-red',
          particleColor: cascadeColor,
        }
      }
      return { stroke: '#445', opacity: 0.3, width: 1, dash: '4,4', animate: false, arrowId: 'arrow-dim' }
    }

    // Data-driven default: color by source health
    if (hasData && edge.isWeak) {
      return { stroke: '#e8928a', opacity: 0.7, width: 2.5, dash: 'none', animate: false, arrowId: 'arrow-red' }
    }

    const healthPct = edge.sourceHealthPct
    if (hasData && healthPct > 0) {
      const green = Math.round(100 + healthPct * 155)
      return {
        stroke: `rgb(${80 - healthPct * 30}, ${green}, ${100 - healthPct * 10})`,
        opacity: 0.4 + healthPct * 0.4,
        width: 1 + healthPct,
        dash: edge.type === 'supports' ? '6,4' : 'none',
        animate: false,
        arrowId: 'arrow-green',
      }
    }

    return {
      stroke: '#556',
      opacity: 0.4,
      width: edge.type === 'requires' ? 1.5 : 1,
      dash: edge.type === 'supports' ? '6,4' : 'none',
      animate: false,
      arrowId: 'arrow-default',
    }
  }

  // ─── Tooltip handling ───

  const showTooltip = useCallback((e, node) => {
    const rect = e.currentTarget.closest('svg')?.getBoundingClientRect()
    if (!rect) return
    const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left
    const y = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top
    setTooltip({ x, y, node })
  }, [])

  const hideTooltip = useCallback(() => {
    setTooltip(null)
  }, [])

  const handleTouch = useCallback((e, node) => {
    showTooltip(e, node)
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
    tooltipTimerRef.current = setTimeout(() => setTooltip(null), 3000)
  }, [showTooltip])

  // ─── Timeline display assessments handler ───

  const handleDisplayAssessmentsChange = useCallback((newAssessments) => {
    setDisplayAssessments(newAssessments)
  }, [])

  // Warning count
  const warningCount = cascadeRisks.length

  // ─── Edge path computation (shared between edge rendering and particles) ───

  const edgePaths = useMemo(() => {
    return edges.map((edge, i) => {
      const from = positions[edge.from]
      const to = positions[edge.to]
      if (!from || !to) return null

      let d
      if (layout === LAYOUTS.ORBITAL) {
        // Orbital: radial edge endpoints + curved arcs
        const dx = to.x - from.x
        const dy = to.y - from.y
        const angle = Math.atan2(dy, dx)
        const nodeR = Math.min(nodeW, nodeH) / 2 + 2
        const isFromCenter = edge.from === 'd1'
        const startX = from.x + Math.cos(angle) * (isFromCenter ? 10 : nodeR)
        const startY = from.y + Math.sin(angle) * (isFromCenter ? 10 : nodeR)
        const endX = to.x - Math.cos(angle) * nodeR
        const endY = to.y - Math.sin(angle) * nodeR

        if (isFromCenter) {
          // Radial edges from center: gentle curve
          d = `M${startX},${startY} L${endX},${endY}`
        } else {
          // Inter-ring & same-ring: arc toward center
          const midX = (startX + endX) / 2
          const midY = (startY + endY) / 2
          const toCenterX = centerX - midX
          const toCenterY = orbitalCenterY - midY
          const dist = Math.sqrt(dx * dx + dy * dy)
          const curveFactor = Math.min(0.4, dist * 0.001 + 0.15)
          const ctrlX = midX + toCenterX * curveFactor
          const ctrlY = midY + toCenterY * curveFactor
          d = `M${startX},${startY} Q${ctrlX},${ctrlY} ${endX},${endY}`
        }
      } else {
        // Tiered: vertical flow
        const isRequires = edge.type === 'requires'
        if (isRequires) {
          d = `M${from.x},${from.y - nodeH / 2} L${to.x},${to.y + nodeH / 2}`
        } else {
          const midY = (from.y - nodeH / 2 + to.y + nodeH / 2) / 2
          const curveX = from.x + (to.x - from.x) * 0.5 + (edge.from === 'd2' ? -50 : 50)
          d = `M${from.x},${from.y - nodeH / 2} Q${curveX},${midY} ${to.x},${to.y + nodeH / 2}`
        }
      }
      return { id: `edge-path-${i}`, d, edge }
    }).filter(Boolean)
  }, [edges, positions, nodeH, nodeW, layout, centerX, orbitalCenterY])

  // ─── Render ───

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar — frosted glass */}
      <div className={`flex items-center gap-1.5 ${isPhone ? 'px-2 py-1.5 overflow-x-auto' : 'px-4 py-2'} bg-[#1a1a1e]/80 backdrop-blur-md border-b border-[#333]/80`}>
        {/* Layout toggle — cycle through layouts */}
        {[
          { key: LAYOUTS.TIERED, icon: '\u2630', label: 'Tiered' },
          { key: LAYOUTS.ORBITAL, icon: '\u25CE', label: 'Orbital' },
          { key: LAYOUTS.NEURAL, icon: '\u269B', label: 'Neural' },
          { key: LAYOUTS.TERRAIN, icon: '\u25B2', label: 'Terrain' },
          { key: LAYOUTS.THREE_D, icon: '\u2B21', label: '3D' },
        ].map((l) => (
          <button
            key={l.key}
            onClick={() => setLayout(l.key)}
            className={`text-[10px] px-2 py-1 rounded-md font-medium transition-all min-h-[44px] flex items-center gap-1 border shrink-0 ${
              layout === l.key
                ? 'bg-[#2a2a35] text-blue-300 border-blue-500/30'
                : 'bg-[#2a2a30]/60 text-gray-500 border-[#333] hover:text-gray-400'
            }`}
          >
            {l.icon}
            <span className="hidden sm:inline">{l.label}</span>
          </button>
        ))}

        <span className="w-px h-5 bg-[#333] mx-0.5" />

        <ToolbarButton
          active={mode === MODES.LIVE && !heatmapOn}
          onClick={() => { switchMode(MODES.LIVE); setHeatmapOn(false) }}
          icon={MODE_ICONS[MODES.LIVE]}
          label="Live"
        />
        <ToolbarButton
          active={heatmapOn}
          onClick={() => { setMode(MODES.LIVE); setHeatmapOn(!heatmapOn) }}
          icon={'\u2666'}
          label="Impact"
        />
        <ToolbarButton
          active={mode === MODES.WHATIF}
          onClick={() => switchMode(MODES.WHATIF)}
          icon={MODE_ICONS[MODES.WHATIF]}
          label="What If"
        />
        <ToolbarButton
          active={mode === MODES.PATHTRACE}
          onClick={() => switchMode(MODES.PATHTRACE)}
          icon={MODE_ICONS[MODES.PATHTRACE]}
          label="Path"
        />
        <ToolbarButton
          active={mode === MODES.TIMELINE}
          onClick={() => switchMode(MODES.TIMELINE)}
          icon={MODE_ICONS[MODES.TIMELINE]}
          label="Timeline"
        />

        {/* Warning badge */}
        {warningCount > 0 && (
          <button
            onClick={() => switchMode(mode === MODES.WARNINGS ? MODES.LIVE : MODES.WARNINGS)}
            className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all min-h-[44px] flex items-center gap-1 ${
              mode === MODES.WARNINGS
                ? 'bg-orange-900/40 text-orange-300 ring-1 ring-orange-500/40 shadow-lg shadow-orange-900/20'
                : 'bg-[#2a2a30] text-orange-400 hover:bg-orange-900/30 hover:shadow-lg hover:shadow-orange-900/10'
            }`}
          >
            {'\u26A0'} {warningCount}
          </button>
        )}

        {/* Legend toggle */}
        <button
          onClick={() => setLegendOpen(!legendOpen)}
          className={`text-[10px] px-2 py-1 rounded-lg transition-all min-h-[44px] flex items-center ml-auto ${
            legendOpen ? 'bg-[#333] text-gray-200' : 'text-gray-600 hover:text-gray-400'
          }`}
          title="Toggle legend"
        >
          ?
        </button>

        {/* Breadcrumb for semantic zoom */}
        {expandedDomain && (
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <button onClick={() => setExpandedDomain(null)} className="hover:text-gray-200 min-h-[44px] flex items-center">
              All Domains
            </button>
            <span className="text-gray-600">{'\u203A'}</span>
            <span className="text-gray-300 font-medium">
              {framework.find((d) => d.id === expandedDomain)?.name}
            </span>
          </div>
        )}
      </div>

      {/* Legend strip */}
      <AnimatePresence>
        {legendOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-[#1a1a1e]/90 border-b border-[#333]/60"
          >
            <div className={`flex items-center gap-3 ${isPhone ? 'gap-2 px-2 py-1.5 flex-wrap' : 'px-4 py-1.5'} text-[9px]`}>
              {[
                { color: '#7fb589', label: 'Mastered' },
                { color: '#e5b76a', label: 'Developing' },
                { color: '#e8928a', label: 'Needs Work' },
                { color: '#8b4444', label: 'Blocked' },
                { color: '#444', label: 'Locked' },
              ].map(s => (
                <span key={s.label} className="flex items-center gap-1 text-gray-400">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
              ))}
              <span className="text-gray-600 mx-1">|</span>
              <span className="flex items-center gap-1 text-gray-400">
                <span className="w-4 border-t-2 border-green-600" /> Strong
              </span>
              <span className="flex items-center gap-1 text-gray-400">
                <span className="w-4 border-t-2 border-red-400" /> Weak
              </span>
              <span className="flex items-center gap-1 text-gray-400">
                <span className="w-4 border-t border-dashed border-gray-500" /> Secondary
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Path trace instruction */}
      {mode === MODES.PATHTRACE && !pathGoal && (
        <div className="text-center py-2 bg-[#1e1e24] border-b border-[#333]">
          <p className="text-xs text-blue-400">Click a goal domain to trace its prerequisite path</p>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Canvas / R3F views (replace SVG) */}
        {[LAYOUTS.NEURAL, LAYOUTS.TERRAIN, LAYOUTS.THREE_D].includes(layout) ? (
          <div className="flex-1 relative">
            <Suspense fallback={<div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Loading view...</div>}>
              {layout === LAYOUTS.NEURAL && (
                <CascadeNeuralCanvas
                  nodes={nodes}
                  edges={edges}
                  cascadeState={cascadeState}
                  isMasteryCascade={isMasteryCascade}
                  onNodeClick={handleNodeClick}
                  mode={mode}
                  pathChain={pathChain}
                  pathReadiness={pathChain}
                  heatmapOn={heatmapOn}
                  hasData={hasData}
                />
              )}
              {layout === LAYOUTS.TERRAIN && (
                <CascadeTerrainMap
                  nodes={nodes}
                  edges={edges}
                  cascadeState={cascadeState}
                  isMasteryCascade={isMasteryCascade}
                  onNodeClick={handleNodeClick}
                  mode={mode}
                  pathChain={pathChain}
                  pathReadiness={pathChain}
                  heatmapOn={heatmapOn}
                  hasData={hasData}
                />
              )}
              {layout === LAYOUTS.THREE_D && (
                <CascadeGraph3D
                  nodes={nodes}
                  edges={edges}
                  cascadeState={cascadeState}
                  isMasteryCascade={isMasteryCascade}
                  onNodeClick={handleNodeClick}
                  mode={mode}
                  pathChain={pathChain}
                  pathReadiness={pathChain}
                  heatmapOn={heatmapOn}
                  hasData={hasData}
                />
              )}
            </Suspense>
          </div>
        ) : (
        <div className="flex-1 overflow-auto relative">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            className="mx-auto block"
            style={{ maxWidth: width, background: 'linear-gradient(180deg, #1a1a1e 0%, #1e1e24 50%, #1a1a1e 100%)' }}
          >
            <defs>
              {/* Arrow markers */}
              <marker id="arrow-default" viewBox="0 0 8 6" refX="7" refY="3" markerWidth="8" markerHeight="6" orient="auto">
                <path d="M0,0.5 L7,3 L0,5.5" fill="#556" />
              </marker>
              <marker id="arrow-dim" viewBox="0 0 8 6" refX="7" refY="3" markerWidth="6" markerHeight="5" orient="auto">
                <path d="M0,0.5 L7,3 L0,5.5" fill="#333" />
              </marker>
              <marker id="arrow-green" viewBox="0 0 8 6" refX="7" refY="3" markerWidth="8" markerHeight="6" orient="auto">
                <path d="M0,0.5 L7,3 L0,5.5" fill="#7fb589" />
              </marker>
              <marker id="arrow-red" viewBox="0 0 8 6" refX="7" refY="3" markerWidth="9" markerHeight="7" orient="auto">
                <path d="M0,0.5 L7,3 L0,5.5" fill="#ff4444" />
              </marker>
              <marker id="arrow-gold" viewBox="0 0 8 6" refX="7" refY="3" markerWidth="9" markerHeight="7" orient="auto">
                <path d="M0,0.5 L7,3 L0,5.5" fill="#ffd700" />
              </marker>
              <marker id="arrow-blue" viewBox="0 0 8 6" refX="7" refY="3" markerWidth="9" markerHeight="7" orient="auto">
                <path d="M0,0.5 L7,3 L0,5.5" fill="#6889b5" />
              </marker>

              {/* Glow filters per state */}
              {Object.entries(STATE_CONFIG).map(([state, config]) =>
                config.stroke !== '#444' ? (
                  <filter key={state} id={`glow-${state}`} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feFlood floodColor={config.stroke} floodOpacity="0.5" result="color" />
                    <feComposite in="color" in2="blur" operator="in" result="shadow" />
                    <feMerge>
                      <feMergeNode in="shadow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                ) : null
              )}

              {/* Red cascade glow */}
              <filter id="cascade-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feFlood floodColor="#ff4444" floodOpacity="0.6" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="shadow" />
                <feMerge>
                  <feMergeNode in="shadow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Gold mastery cascade glow */}
              <filter id="cascade-glow-gold" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feFlood floodColor="#ffd700" floodOpacity="0.5" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="shadow" />
                <feMerge>
                  <feMergeNode in="shadow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Blue path glow */}
              <filter id="path-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feFlood floodColor="#6889b5" floodOpacity="0.5" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="shadow" />
                <feMerge>
                  <feMergeNode in="shadow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Heatmap glow */}
              <filter id="heatmap-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="10" result="blur" />
                <feFlood floodColor="#ff6644" floodOpacity="0.6" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="shadow" />
                <feMerge>
                  <feMergeNode in="shadow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Domain-colored mastery glows */}
              {Object.entries(DOMAIN_COLORS).map(([id, color]) => (
                <filter key={`domain-glow-${id}`} id={`domain-glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feFlood floodColor={color} floodOpacity="0.4" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="shadow" />
                  <feMerge>
                    <feMergeNode in="shadow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}

              {/* Ripple gradients */}
              <radialGradient id="ripple-gradient">
                <stop offset="0%" stopColor="#ff4444" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#ff4444" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="ripple-gradient-gold">
                <stop offset="0%" stopColor="#ffd700" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#ffd700" stopOpacity="0" />
              </radialGradient>

              {/* Particle trail glow filter */}
              <filter id="particle-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="3" />
              </filter>

              {/* Orbital center core gradients */}
              <radialGradient id="orbital-core-gradient">
                <stop offset="0%" stopColor="#6889b5" stopOpacity="0.1" />
                <stop offset="40%" stopColor="#4a5568" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#1a1a1e" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="orbital-core-inner">
                <stop offset="0%" stopColor="#6889b5" stopOpacity="0.2" />
                <stop offset="70%" stopColor="#3a4a5a" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#1a1a1e" stopOpacity="0" />
              </radialGradient>

              {/* Flow animation CSS */}
              <style>{`
                @keyframes cascadeShake {
                  0%, 100% { transform: translate(0, 0); }
                  10% { transform: translate(-2px, 0); }
                  20% { transform: translate(2px, 0); }
                  30% { transform: translate(-2px, 0); }
                  40% { transform: translate(2px, 0); }
                  50% { transform: translate(0, 0); }
                }
                @keyframes masteryPulse {
                  0%, 100% { transform: scale(1); }
                  50% { transform: scale(1.03); }
                }
                @keyframes ambientBreath {
                  0%, 100% { opacity: 0.03; }
                  50% { opacity: 0.06; }
                }
                .cascade-shake { animation: cascadeShake 0.5s ease-in-out; }
                .mastery-pulse { animation: masteryPulse 1.5s ease-in-out infinite; transform-origin: center; }
                .domain-node { transition: filter 0.2s ease, opacity 0.2s ease; }
                .domain-node:hover { filter: brightness(1.2) !important; }
                .domain-node:focus-visible .focus-ring { opacity: 1; }
                .domain-node rect.node-rect { transition: fill 0.4s ease, stroke 0.4s ease, stroke-width 0.3s ease, opacity 0.3s ease; }
                .ambient-grid { animation: ambientBreath 6s ease-in-out infinite; }
              `}</style>
            </defs>

            {/* Background — grid for tiered, radial for orbital */}
            {layout !== LAYOUTS.ORBITAL ? (
              <g className="ambient-grid">
                {Array.from({ length: Math.ceil(width / 40) }, (_, i) => (
                  <line key={`v${i}`} x1={i * 40} y1={0} x2={i * 40} y2={height} stroke="#fff" strokeWidth="0.5" />
                ))}
                {Array.from({ length: Math.ceil(height / 40) }, (_, i) => (
                  <line key={`h${i}`} x1={0} y1={i * 40} x2={width} y2={i * 40} stroke="#fff" strokeWidth="0.5" />
                ))}
              </g>
            ) : (
              <g>
                {/* Orbital zone bands — subtle colored rings between orbits */}
                {[3, 2, 1].map((ring) => {
                  const r = orbitalBaseRadius + (ring - 1) * orbitalRingGap
                  return (
                    <circle
                      key={`zone-${ring}`}
                      cx={centerX} cy={orbitalCenterY}
                      r={r + orbitalRingGap * 0.45}
                      fill="none"
                      stroke={ring === 1 ? '#4a6a8a' : ring === 2 ? '#5a5a7a' : '#6a4a6a'}
                      strokeWidth={orbitalRingGap * 0.7}
                      opacity="0.03"
                    />
                  )
                })}

                {/* Orbital ring lines — animated dashed circles */}
                {[1, 2, 3].map((ring) => {
                  const r = orbitalBaseRadius + (ring - 1) * orbitalRingGap
                  const circumference = 2 * Math.PI * r
                  return (
                    <circle
                      key={`ring-${ring}`}
                      cx={centerX} cy={orbitalCenterY}
                      r={r}
                      fill="none"
                      stroke={ring === 1 ? '#4a7a9a' : ring === 2 ? '#6a6a8a' : '#8a5a7a'}
                      strokeWidth="1"
                      opacity="0.15"
                      strokeDasharray={`${circumference * 0.02},${circumference * 0.03}`}
                    >
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from={`0 ${centerX} ${orbitalCenterY}`}
                        to={`${ring % 2 === 0 ? 360 : -360} ${centerX} ${orbitalCenterY}`}
                        dur={`${60 + ring * 20}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  )
                })}

                {/* Radial spoke lines — very faint */}
                {[0, 60, 120, 180, 240, 300].map((deg) => {
                  const rad = deg * Math.PI / 180
                  const outerR = orbitalBaseRadius + orbitalRingGap * 2.5
                  return (
                    <line
                      key={`spoke-${deg}`}
                      x1={centerX + Math.cos(rad) * 30}
                      y1={orbitalCenterY + Math.sin(rad) * 30}
                      x2={centerX + Math.cos(rad) * outerR}
                      y2={orbitalCenterY + Math.sin(rad) * outerR}
                      stroke="#fff" strokeWidth="0.5" opacity="0.03"
                    />
                  )
                })}

                {/* Center core — multi-layered glow */}
                <circle cx={centerX} cy={orbitalCenterY} r={orbitalBaseRadius * 0.6} fill="url(#orbital-core-gradient)" />
                <circle cx={centerX} cy={orbitalCenterY} r={orbitalBaseRadius * 0.35} fill="url(#orbital-core-inner)" />
                <circle cx={centerX} cy={orbitalCenterY} r={6} fill="#6889b5" opacity="0.4">
                  <animate attributeName="r" values="4;8;4" dur="4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0.6;0.3" dur="4s" repeatCount="indefinite" />
                </circle>
              </g>
            )}

            {/* Cascade ambient glow halos behind affected nodes */}
            {cascadeState.active && (
              <g>
                {Object.entries(cascadeState.affected).map(([id, data]) => {
                  const pos = positions[id]
                  if (!pos) return null
                  return (
                    <circle
                      key={`bg-glow-${id}`}
                      cx={pos.x} cy={pos.y}
                      r={tierSpacing * 0.5}
                      fill={isMasteryCascade ? '#ffd700' : '#ff4444'}
                      opacity="0"
                    >
                      <animate attributeName="r" from={tierSpacing * 0.5} to={tierSpacing * 1.2} dur="1s" fill="freeze" />
                      <animate attributeName="opacity" from="0" to={data.impactStrength * 0.06} dur="0.8s" fill="freeze" />
                    </circle>
                  )
                })}
              </g>
            )}

            {/* Tier labels (tiered layout only) */}
            {layout === LAYOUTS.TIERED && (
              <g>
                <text x={15} y={bottomY + 12} fill="#444" fontSize="9" fontFamily="monospace">FOUNDATION</text>
                <text x={15} y={bottomY - 6 * tierSpacing + 12} fill="#444" fontSize="9" fontFamily="monospace">HIGHEST ORDER</text>
              </g>
            )}
            {/* Orbital ring labels */}
            {layout === LAYOUTS.ORBITAL && (
              <g opacity="0.3">
                <text x={centerX} y={orbitalCenterY + 18} textAnchor="middle" fill="#6889b5" fontSize="7" fontFamily="monospace" letterSpacing="2">FOUNDATION</text>
                <text x={centerX + orbitalBaseRadius + 4} y={orbitalCenterY - 10} fill="#4a7a9a" fontSize="6" fontFamily="monospace" letterSpacing="1">INNER</text>
                <text x={centerX + orbitalBaseRadius + orbitalRingGap + 4} y={orbitalCenterY - 10} fill="#6a6a8a" fontSize="6" fontFamily="monospace" letterSpacing="1">MID</text>
                <text x={centerX + orbitalBaseRadius + orbitalRingGap * 2 + 4} y={orbitalCenterY - 10} fill="#8a5a7a" fontSize="6" fontFamily="monospace" letterSpacing="1">OUTER</text>
              </g>
            )}

            {/* Path trace highway glow — wide blurred backdrop under path edges */}
            {mode === MODES.PATHTRACE && pathGoal && (
              <g>
                {edgePaths.map(({ id, d, edge }) => {
                  if (!pathDomainIds.has(edge.from) || !pathDomainIds.has(edge.to)) return null
                  return (
                    <path
                      key={`path-bg-${id}`}
                      d={d}
                      fill="none"
                      stroke="#6889b5"
                      strokeWidth={8}
                      opacity={0.12}
                      strokeLinecap="round"
                      filter="url(#path-glow)"
                    />
                  )
                })}
              </g>
            )}

            {/* Edges with arrow markers */}
            <g>
              {edgePaths.map(({ id, d, edge }) => {
                const style = getEdgeStyle(edge)

                return (
                  <g key={id}>
                    <path
                      id={id}
                      d={d}
                      fill="none"
                      stroke={style.stroke}
                      strokeWidth={style.width}
                      strokeDasharray={style.dash}
                      opacity={style.opacity}
                      markerEnd={`url(#${style.arrowId})`}
                    />
                  </g>
                )
              })}
            </g>

            {/* Neural signal particles on active edges — with phosphorescent trails */}
            <g>
              {edgePaths.map(({ id, d, edge }) => {
                const style = getEdgeStyle(edge)
                if (!style.animate || !style.particleColor) return null

                return (
                  <g key={`particles-${id}`}>
                    {[0, 0.33, 0.66].map((offset, pi) => (
                      <g key={pi}>
                        {/* Trailing glow (larger, dimmer, slightly delayed) */}
                        <circle r="6" fill={style.particleColor} opacity="0" filter="url(#particle-glow)">
                          <animateMotion dur="1.4s" repeatCount="indefinite" begin={`${offset * 1.4 + 0.08}s`}>
                            <mpath href={`#${id}`} />
                          </animateMotion>
                          <animate
                            attributeName="opacity"
                            values="0;0.2;0.2;0"
                            keyTimes="0;0.15;0.85;1"
                            dur="1.4s"
                            repeatCount="indefinite"
                            begin={`${offset * 1.4 + 0.08}s`}
                          />
                        </circle>
                        {/* Bright particle */}
                        <circle r="3" fill={style.particleColor} opacity="0">
                          <animateMotion dur="1.4s" repeatCount="indefinite" begin={`${offset * 1.4}s`}>
                            <mpath href={`#${id}`} />
                          </animateMotion>
                          <animate
                            attributeName="opacity"
                            values="0;0.85;0.85;0"
                            keyTimes="0;0.15;0.85;1"
                            dur="1.4s"
                            repeatCount="indefinite"
                            begin={`${offset * 1.4}s`}
                          />
                          <animate
                            attributeName="r"
                            values="1.5;3.5;1.5"
                            dur="1.4s"
                            repeatCount="indefinite"
                            begin={`${offset * 1.4}s`}
                          />
                        </circle>
                      </g>
                    ))}
                  </g>
                )
              })}
            </g>

            {/* Ripple effects during cascade */}
            {cascadeState.active && Object.entries(cascadeState.affected).map(([id, data]) => {
              const pos = positions[id]
              if (!pos) return null
              const rippleId = isMasteryCascade ? 'ripple-gradient-gold' : 'ripple-gradient'
              return (
                <circle
                  key={`ripple-${id}`}
                  cx={pos.x}
                  cy={pos.y}
                  fill={`url(#${rippleId})`}
                  r="0"
                >
                  <animate attributeName="r" from="0" to="60" dur="1.2s" begin="0s" fill="freeze" />
                  <animate attributeName="opacity" from={data.impactStrength * 0.6} to="0" dur="1.2s" begin="0s" fill="freeze" />
                </circle>
              )
            })}

            {/* Source ripple */}
            {cascadeState.active && cascadeState.source && positions[cascadeState.source] && (
              <circle
                cx={positions[cascadeState.source].x}
                cy={positions[cascadeState.source].y}
                fill={`url(#${isMasteryCascade ? 'ripple-gradient-gold' : 'ripple-gradient'})`}
                r="0"
              >
                <animate attributeName="r" from="10" to="80" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}

            {/* Mastery celebration — golden halo rings pulsing outward from source */}
            {cascadeState.active && isMasteryCascade && cascadeState.source && positions[cascadeState.source] && (
              <g pointerEvents="none">
                <circle cx={positions[cascadeState.source].x} cy={positions[cascadeState.source].y} r={nodeW / 2 + 5} fill="none" stroke="#ffd700" strokeWidth="1.5" opacity="0">
                  <animate attributeName="r" from={nodeW / 2} to={nodeW / 2 + 30} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx={positions[cascadeState.source].x} cy={positions[cascadeState.source].y} r={nodeW / 2 + 5} fill="none" stroke="#ffd700" strokeWidth="1" opacity="0">
                  <animate attributeName="r" from={nodeW / 2} to={nodeW / 2 + 30} dur="2s" begin="0.7s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.4" to="0" dur="2s" begin="0.7s" repeatCount="indefinite" />
                </circle>
              </g>
            )}

            {/* Domain nodes */}
            <g>
              {nodes.map((node) => {
                const pos = positions[node.id]
                if (!pos) return null

                // If another domain is expanded, dim this node unless it's the expanded one
                const isExpanded = expandedDomain === node.id
                const isDimmed = expandedDomain && !isExpanded
                const style = getNodeStyle(node)
                const isSource = cascadeState.source === node.id
                const isAffected = !!cascadeState.affected[node.id]
                const impactData = cascadeState.affected[node.id]
                const domainColor = DOMAIN_COLORS[node.id] || '#888'

                // Warning indicator
                const hasWarning = cascadeRisks.some((r) => r.affectedDomains.includes(node.id))

                // Choose glow filter
                const glowFilter = style.glow
                  ? (mode === MODES.PATHTRACE ? 'url(#path-glow)'
                    : cascadeState.active ? (isMasteryCascade ? 'url(#cascade-glow-gold)' : 'url(#cascade-glow)')
                    : heatmapOn ? 'url(#heatmap-glow)'
                    : node.state === 'mastered' && hasData ? `url(#domain-glow-${node.id})`
                    : `url(#glow-${node.state})`)
                  : undefined

                return (
                  <g
                    key={node.id}
                    className={`domain-node ${isSource ? (isMasteryCascade ? 'mastery-pulse' : 'cascade-shake') : ''}`}
                    style={{ cursor: 'pointer', opacity: isDimmed ? 0.4 : 1 }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${node.name}: ${node.assessed > 0 ? node.avg.toFixed(1) + '/3' : 'Not assessed'}`}
                    onClick={() => handleNodeClick(node.id)}
                    onDoubleClick={() => handleNodeDoubleClick(node.id)}
                    onKeyDown={(e) => handleNodeKeyDown(e, node.id)}
                    onMouseEnter={(e) => showTooltip(e, node)}
                    onMouseMove={(e) => showTooltip(e, node)}
                    onMouseLeave={hideTooltip}
                    onTouchStart={(e) => {
                      handleTouch(e, node)
                      handleNodeClick(node.id)
                    }}
                  >
                    {/* Focus ring for keyboard navigation */}
                    <rect
                      x={pos.x - nodeW / 2 - 3} y={pos.y - nodeH / 2 - 3}
                      width={nodeW + 6} height={nodeH + 6}
                      rx={isPhone ? 11 : 13}
                      fill="none" stroke="#6889b5" strokeWidth="2"
                      opacity="0"
                      className="focus-ring"
                      pointerEvents="none"
                    />

                    {/* Invisible expanded hit area for phone touch */}
                    {isPhone && (
                      <rect
                        x={pos.x - nodeW / 2 - 4} y={pos.y - nodeH / 2 - 4}
                        width={nodeW + 8} height={nodeH + 8}
                        fill="transparent"
                      />
                    )}

                    {/* Warning dot */}
                    {hasWarning && !cascadeState.active && (
                      <circle cx={pos.x + nodeW / 2 - 8} cy={pos.y - nodeH / 2 + 8} r={5} fill="#ff8800">
                        <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}

                    {/* Orbital node halo */}
                    {layout === LAYOUTS.ORBITAL && (
                      <ellipse
                        cx={pos.x} cy={pos.y}
                        rx={nodeW / 2 + 8} ry={nodeH / 2 + 8}
                        fill={domainColor}
                        opacity={0.04}
                        pointerEvents="none"
                      />
                    )}

                    {/* Node rect — CSS-transitioned fills for smooth state changes */}
                    <rect
                      className="node-rect"
                      x={pos.x - nodeW / 2} y={pos.y - nodeH / 2}
                      width={nodeW} height={nodeH}
                      rx={layout === LAYOUTS.ORBITAL ? nodeH / 2 : (isPhone ? 8 : isTablet ? 9 : 10)}
                      fill={style.fill}
                      stroke={style.stroke}
                      strokeWidth={isSource || isAffected || isExpanded ? 2.5 : 1.5}
                      strokeDasharray="none"
                      opacity={1}
                      filter={glowFilter}
                    />

                    {/* Domain color accent — left edge strip */}
                    {hasData && node.assessed > 0 && (
                      <rect
                        x={pos.x - nodeW / 2 + 1}
                        y={pos.y - nodeH / 2 + 4}
                        width={3}
                        height={nodeH - 8}
                        rx={1.5}
                        fill={domainColor}
                        opacity={0.6}
                        pointerEvents="none"
                      />
                    )}

                    {/* Domain number badge */}
                    <circle
                      cx={pos.x - nodeW / 2 + (isPhone ? 14 : 18)}
                      cy={pos.y}
                      r={isPhone ? 10 : 12}
                      fill={domainColor}
                      opacity={0.5}
                      pointerEvents="none"
                    />
                    <text
                      x={pos.x - nodeW / 2 + (isPhone ? 14 : 18)}
                      y={pos.y + 1}
                      textAnchor="middle" dominantBaseline="middle"
                      fill="#fff"
                      fontSize={isPhone ? 9 : 11} fontWeight="700" fontFamily="monospace"
                      opacity={0.9}
                      pointerEvents="none"
                    >
                      {node.domain}
                    </text>

                    {/* Domain name */}
                    <text
                      x={pos.x + 6}
                      y={pos.y - (hasData && node.assessed > 0 ? (isPhone ? 8 : 12) : (isPhone ? 4 : 7))}
                      textAnchor="middle"
                      fill={style.textColor}
                      fontSize={fontSize} fontWeight="600"
                      fontFamily="Plus Jakarta Sans, Inter, sans-serif"
                      pointerEvents="none"
                    >
                      {node.name}
                    </text>

                    {/* Score + assessed count (data-driven) */}
                    {hasData && node.assessed > 0 && (
                      <text
                        x={pos.x + 6}
                        y={pos.y + (isPhone ? 2 : 2)}
                        textAnchor="middle"
                        fill={style.textColor}
                        fontSize={subFontSize} fontWeight="600"
                        fontFamily="monospace"
                        opacity={0.9}
                        pointerEvents="none"
                      >
                        {node.avg.toFixed(1)}/3 {'\u00B7'} {node.assessed}/{node.total}
                      </text>
                    )}

                    {/* Status label */}
                    <text
                      x={pos.x + 6}
                      y={pos.y + (hasData && node.assessed > 0 ? (isPhone ? 12 : 14) : (isPhone ? 10 : 12))}
                      textAnchor="middle"
                      fill={style.textColor}
                      fontSize={isPhone ? 7 : subFontSize}
                      opacity={0.6}
                      fontFamily="Inter, sans-serif"
                      pointerEvents="none"
                    >
                      {isSource
                        ? (isMasteryCascade ? '\u2728 STRENGTH SOURCE' : '\u26A0 CASCADE SOURCE')
                        : isAffected
                          ? (isMasteryCascade
                              ? `\u2191 Enabled ${(impactData.impactStrength * 100).toFixed(0)}%`
                              : `\u2191 Impact ${(impactData.impactStrength * 100).toFixed(0)}%`)
                          : heatmapOn
                            ? `Leverage: ${node.leverageScore.toFixed(0)}`
                            : mode === MODES.PATHTRACE && pathGoal && pathDomainIds.has(node.id)
                              ? (() => {
                                  const step = pathChain?.find((s) => s.domainId === node.id)
                                  return step ? `Step ${step.step}: ${step.status === 'met' ? '\u2713 Met' : step.gap.toFixed(1) + ' gap'}` : ''
                                })()
                              : hasData && node.assessed > 0
                                  ? STATE_CONFIG[node.state]?.label
                                  : node.subtitle
                      }
                    </text>

                    {/* Progress bar — domain-colored */}
                    {hasData && node.assessed > 0 && !isAffected && (
                      <>
                        <rect
                          x={pos.x - nodeW / 2 + 4}
                          y={pos.y + nodeH / 2 - 5}
                          width={nodeW - 8} height={3} rx={1.5}
                          fill="#1a1a1e"
                          pointerEvents="none"
                        />
                        <rect
                          x={pos.x - nodeW / 2 + 4}
                          y={pos.y + nodeH / 2 - 5}
                          width={(nodeW - 8) * node.healthPct}
                          height={3} rx={1.5}
                          fill={domainColor}
                          opacity={0.7}
                          pointerEvents="none"
                        />
                      </>
                    )}

                    {/* Cascade impact severity bar */}
                    {isAffected && (
                      <>
                        <rect
                          x={pos.x - nodeW / 2 + 4}
                          y={pos.y + nodeH / 2 - 5}
                          width={nodeW - 8} height={3} rx={1.5}
                          fill={isMasteryCascade ? '#2a2a15' : '#2a1515'}
                          pointerEvents="none"
                        />
                        <rect
                          x={pos.x - nodeW / 2 + 4}
                          y={pos.y + nodeH / 2 - 5}
                          width={(nodeW - 8) * impactData.impactStrength}
                          height={3} rx={1.5}
                          fill={isMasteryCascade ? '#ffd700' : '#ff4444'}
                          opacity={0.7}
                          pointerEvents="none"
                        >
                          <animate
                            attributeName="width"
                            from="0"
                            to={(nodeW - 8) * impactData.impactStrength}
                            dur="0.6s" fill="freeze"
                          />
                        </rect>
                      </>
                    )}

                    {/* Heatmap leverage overlay badge */}
                    {heatmapOn && node.downstreamSkills > 0 && (
                      <g pointerEvents="none">
                        <rect
                          x={pos.x - nodeW / 2 + 2}
                          y={pos.y - nodeH / 2 - 18}
                          width={nodeW - 4} height={16} rx={8}
                          fill="#1a1a1e" stroke="#555" strokeWidth="0.5"
                          opacity={0.9}
                        />
                        <text
                          x={pos.x}
                          y={pos.y - nodeH / 2 - 10}
                          textAnchor="middle" dominantBaseline="middle"
                          fill="#aaa" fontSize="8" fontFamily="monospace"
                        >
                          Unlocks {node.downstreamSkills} skills across {node.downstreamDomains} domains
                        </text>
                      </g>
                    )}
                  </g>
                )
              })}
            </g>

            {/* Expanded sub-area nodes (semantic zoom) — desktop/tablet: SVG inline */}
            {expandedDomain && !isPhone && (
              <SubAreaNodesSVG
                subAreas={subAreas}
                parentPos={positions[expandedDomain]}
                nodeW={nodeW}
                nodeH={nodeH}
                width={width}
                height={height}
                onNavigateToAssess={onNavigateToAssess}
              />
            )}

            {/* Title */}
            <text
              x={width / 2} y={28}
              textAnchor="middle" fill="#888"
              fontSize="11" fontFamily="monospace" letterSpacing="2"
            >
              {cascadeState.active
                ? (isMasteryCascade
                    ? 'STRENGTH CASCADE \u00B7 ENABLING GROWTH'
                    : 'CASCADE IMPACT \u00B7 WEAKNESS RIPPLES UPWARD')
                : mode === MODES.PATHTRACE && pathGoal
                  ? 'PATH TRACE \u00B7 PREREQUISITE CHAIN'
                  : heatmapOn
                    ? 'DEVELOPMENTAL LEVERAGE \u00B7 IMPACT MAP'
                    : mode === MODES.WHATIF
                      ? 'WHAT-IF SIMULATOR \u00B7 EXPLORE SCENARIOS'
                      : mode === MODES.TIMELINE
                        ? 'TIMELINE \u00B7 PROGRESS OVER TIME'
                        : hasData
                          ? 'DEVELOPMENTAL CONNECTOME \u00B7 CLICK TO CASCADE'
                          : 'CASCADE DEMO \u00B7 CLICK A DOMAIN TO WEAKEN IT'
              }
            </text>

            {/* Bottom status text */}
            {cascadeState.active && (
              <text
                x={width / 2} y={height - 16}
                textAnchor="middle"
                fill={isMasteryCascade ? '#ffd700' : '#888'}
                fontSize="10"
                fontWeight={isMasteryCascade ? '600' : '400'}
                fontFamily="monospace"
              >
                {isMasteryCascade
                  ? `${framework.find(d => d.id === cascadeState.source)?.name} enables ${Object.keys(cascadeState.affected).length} domain${Object.keys(cascadeState.affected).length !== 1 ? 's' : ''} downstream`
                  : `${Object.keys(cascadeState.affected).length} domain${Object.keys(cascadeState.affected).length !== 1 ? 's' : ''} affected by weakness in ${framework.find(d => d.id === cascadeState.source)?.name}`
                }
              </text>
            )}
          </svg>

          {/* Empty state guidance overlay */}
          {!hasData && !cascadeState.active && mode === MODES.LIVE && (
            <div className="absolute inset-0 flex items-end justify-center pb-24 pointer-events-none">
              <div className="bg-[#1e1e24]/90 backdrop-blur-sm rounded-xl px-6 py-4 border border-[#333] max-w-sm text-center pointer-events-auto">
                <h3 className="text-sm font-semibold text-gray-200 mb-1.5">Developmental Connectome</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Click any domain to see how weakness cascades through the developmental hierarchy.
                  Double-click to explore sub-areas.
                </p>
                <p className="text-[10px] text-gray-500 mt-2 border-t border-[#333] pt-2">
                  Add assessment data to see real developmental health, leverage scores, and cascade risks.
                </p>
              </div>
            </div>
          )}

          {/* Tooltip (HTML overlay) */}
          {tooltip && (
            <NodeTooltip
              tooltip={tooltip}
              width={width}
              hasData={hasData}
              heatmapOn={heatmapOn}
              mode={mode}
              pathChain={pathChain}
              isMasteryCascade={isMasteryCascade}
              cascadeState={cascadeState}
            />
          )}

          {/* Mobile full-screen takeover for semantic zoom */}
          <AnimatePresence>
            {expandedDomain && isPhone && (
              <MobileSubAreaOverlay
                key="mobile-subarea"
                domainId={expandedDomain}
                subAreas={subAreas}
                onClose={() => setExpandedDomain(null)}
                onNavigateToAssess={onNavigateToAssess}
              />
            )}
          </AnimatePresence>
        </div>
        )}

        {/* Side panels */}
        <Suspense fallback={null}>
          {mode === MODES.WHATIF && (
            <WhatIfPanel
              assessments={assessments}
              overrides={whatIfOverrides}
              onOverridesChange={setWhatIfOverrides}
              onClose={() => switchMode(MODES.LIVE)}
            />
          )}

          {mode === MODES.WARNINGS && (
            <CascadeWarnings
              risks={cascadeRisks}
              onJumpToAssess={onNavigateToAssess}
              onClose={() => switchMode(MODES.LIVE)}
            />
          )}
        </Suspense>

        {/* Path tracer — side panel on desktop/tablet, bottom sheet on phone */}
        {mode === MODES.PATHTRACE && pathGoal && pathChain && !isPhone && (
          <PathTraceSidebar
            chain={pathChain}
            goalName={framework.find((d) => d.id === pathGoal)?.name}
            onNavigateToAssess={onNavigateToAssess}
            onClose={() => setPathGoal(null)}
            isTablet={isTablet}
          />
        )}
      </div>

      {/* Path trace bottom panel (phone only) */}
      {mode === MODES.PATHTRACE && pathGoal && pathChain && isPhone && (
        <PathTraceBottomPanel
          chain={pathChain}
          goalName={framework.find((d) => d.id === pathGoal)?.name}
          onNavigateToAssess={onNavigateToAssess}
        />
      )}

      {/* Timeline slider */}
      {mode === MODES.TIMELINE && (
        <Suspense fallback={null}>
          <CascadeTimelineSlider
            snapshots={snapshots}
            currentAssessments={assessments}
            onDisplayAssessmentsChange={handleDisplayAssessmentsChange}
            isPhone={isPhone}
          />
        </Suspense>
      )}

      {/* Reset button during cascade */}
      {cascadeState.active && (
        <div className="text-center py-2 bg-[#1a1a1e]/80 backdrop-blur-sm border-t border-[#333]">
          <button
            onClick={resetCascade}
            className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-all min-h-[44px] border ${
              isMasteryCascade
                ? 'bg-[#2a2a25] text-amber-400 border-amber-700/40 hover:bg-amber-900/30 hover:border-amber-500/50'
                : 'bg-[#2a2a30] text-gray-400 border-[#444] hover:bg-[#3a2525] hover:text-red-300 hover:border-red-500/50'
            }`}
          >
            Reset Cascade
          </button>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────────── */

function ToolbarButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] px-3 py-1 rounded-lg font-medium transition-all min-h-[44px] flex items-center gap-1.5 ${
        active
          ? 'bg-[#333]/90 text-gray-100 ring-1 ring-gray-500/40 shadow-lg shadow-black/20'
          : 'bg-[#2a2a30]/80 text-gray-500 hover:bg-[#333]/70 hover:text-gray-300'
      }`}
    >
      {icon && <span className="text-[12px] opacity-70">{icon}</span>}
      {label}
    </button>
  )
}

function NodeTooltip({ tooltip, width, hasData, heatmapOn, mode, pathChain, isMasteryCascade, cascadeState }) {
  const { x, y, node } = tooltip
  const config = STATE_CONFIG[node.state] || STATE_CONFIG.locked
  const domainColor = DOMAIN_COLORS[node.id] || '#888'

  return (
    <div
      className="absolute pointer-events-none z-10 max-w-xs"
      style={{
        left: x + 16,
        top: y - 8,
        transform: x > width * 0.6 ? 'translateX(-110%)' : 'none',
      }}
    >
      <div className="bg-[#2a2a30]/95 backdrop-blur-sm border border-[#444] rounded-lg shadow-2xl px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: domainColor }}
          />
          <span className="font-bold text-sm" style={{ color: config.textColor }}>
            {node.name}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: config.stroke + '25', color: config.textColor }}
          >
            {config.label}
          </span>
        </div>

        {hasData && node.assessed > 0 ? (
          <div className="text-xs text-gray-300 mt-1">
            Score: <span className="font-bold" style={{ color: domainColor }}>
              {node.avg.toFixed(1)}/3
            </span>
            {' \u00B7 '}
            {node.assessed}/{node.total} skills assessed
          </div>
        ) : (
          <div className="text-xs text-gray-500 mt-1">Not yet assessed</div>
        )}

        {/* Cascade impact info in tooltip */}
        {cascadeState?.active && cascadeState.affected[node.id] && (
          <div className={`text-[10px] mt-1.5 border-t border-gray-700 pt-1.5 ${isMasteryCascade ? 'text-amber-300' : 'text-red-300'}`}>
            {isMasteryCascade ? 'Enabled' : 'Impacted'} at {(cascadeState.affected[node.id].impactStrength * 100).toFixed(0)}% (tier {cascadeState.affected[node.id].tier})
          </div>
        )}

        {heatmapOn && node.downstreamSkills > 0 && (
          <div className="text-[10px] text-gray-400 mt-1.5 border-t border-gray-700 pt-1.5">
            Leverage Score: {node.leverageScore.toFixed(0)} ({node.downstreamSkills} downstream skills)
          </div>
        )}

        {mode === 'pathtrace' && pathChain && (
          (() => {
            const step = pathChain.find((s) => s.domainId === node.id)
            if (!step) return null
            return (
              <div className="text-[10px] text-blue-300 mt-1.5 border-t border-gray-700 pt-1.5">
                Step {step.step}: {step.status === 'met' ? 'Met' : `Gap of ${step.gap.toFixed(1)} to threshold`}
              </div>
            )
          })()
        )}

        <p className="text-[9px] text-gray-600 mt-1">Double-click to expand sub-areas</p>
      </div>
    </div>
  )
}

/**
 * PathTraceSidebar — Desktop: side panel for path trace results.
 * Shows prerequisite chain as vertical numbered cards with room for detail.
 */
function PathTraceSidebar({ chain, goalName, onNavigateToAssess, onClose, isTablet }) {
  return (
    <div className={`${isTablet ? 'w-64' : 'w-72'} bg-[#1e1e24] border-l border-[#333] overflow-y-auto shrink-0 flex flex-col`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#333] flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-blue-400">Path to {goalName}</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">{chain.length} steps in prerequisite chain</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 transition-colors text-lg leading-none min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          {'\u00D7'}
        </button>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {chain.map((step, i) => {
          const color = step.status === 'met' ? '#7fb589'
            : step.status === 'close' ? '#e5b76a' : '#e8928a'
          const domainColor = DOMAIN_COLORS[step.domainId] || '#888'
          const statusLabel = step.status === 'met' ? 'Met'
            : step.status === 'close' ? 'Almost' : 'Gap'

          return (
            <div key={step.domainId}>
              {/* Connector line between steps */}
              {i > 0 && (
                <div className="flex justify-center -mt-1 -mb-1">
                  <div className="w-px h-3 bg-gray-700" />
                </div>
              )}

              <button
                onClick={() => onNavigateToAssess?.(step.domainId + '-sa1')}
                className="w-full text-left rounded-lg border px-3 py-2.5 transition-all min-h-[44px] hover:brightness-110"
                style={{
                  borderColor: color + '40',
                  backgroundColor: color + '08',
                }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center shrink-0"
                    style={{ backgroundColor: domainColor + '25', color: domainColor }}
                  >
                    {step.step}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-200 truncate">{step.domainName}</span>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold ml-1 shrink-0"
                        style={{ backgroundColor: color + '20', color }}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono" style={{ color }}>
                        {step.avg.toFixed(1)}/3
                      </span>
                      {step.status !== 'met' && (
                        <span className="text-[9px] text-gray-500">
                          need {(step.avg + step.gap).toFixed(1)}
                        </span>
                      )}
                    </div>
                    {/* Mini progress bar */}
                    <div className="w-full h-1 rounded-full bg-[#1a1a1e] mt-1.5">
                      <div
                        className="h-1 rounded-full"
                        style={{ width: `${step.healthPct * 100}%`, backgroundColor: domainColor }}
                      />
                    </div>
                  </div>
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-[#333] shrink-0">
        <p className="text-[9px] text-gray-600 italic text-center">
          Click a step to assess that domain
        </p>
      </div>
    </div>
  )
}

/**
 * PathTraceBottomPanel — Phone: compact bottom strip for path trace results.
 */
function PathTraceBottomPanel({ chain, goalName, onNavigateToAssess }) {
  return (
    <div className="px-3 py-2 bg-[#1e1e24] border-t border-[#333]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-blue-400">
          Path to {goalName}
        </span>
        <span className="text-[10px] text-gray-500">
          {chain.length} step{chain.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {chain.map((step) => {
          const color = step.status === 'met' ? '#7fb589'
            : step.status === 'close' ? '#e5b76a' : '#e8928a'

          return (
            <button
              key={step.domainId}
              onClick={() => onNavigateToAssess?.(step.domainId + '-sa1')}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all min-h-[44px]"
              style={{
                borderColor: color + '40',
                backgroundColor: color + '10',
              }}
            >
              <span
                className="w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center"
                style={{ backgroundColor: color + '30', color }}
              >
                {step.step}
              </span>
              <div className="text-left">
                <span className="text-[10px] font-medium text-gray-300 block leading-tight">
                  {step.domainName}
                </span>
                <span className="text-[9px] font-mono" style={{ color }}>
                  {step.avg.toFixed(1)}/3
                  {step.status !== 'met' && ` (need ${(step.avg + step.gap).toFixed(1)})`}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * SubAreaNodesSVG — Desktop/tablet: d3-force positioned sub-area nodes inside SVG.
 * Nodes are clustered around the parent domain's position.
 */
function SubAreaNodesSVG({ subAreas, parentPos, nodeW, nodeH, width, height, onNavigateToAssess }) {
  const [positions, setPositions] = useState([])

  // Run d3-force simulation to position sub-areas around parent
  useEffect(() => {
    if (!parentPos || subAreas.length === 0) {
      setPositions([])
      return
    }

    const saW = 160
    const saH = 32

    // Place sub-areas near the parent, offset to the side
    const side = parentPos.x > width / 2 ? -1 : 1
    const clusterCenterX = parentPos.x + side * (nodeW / 2 + saW / 2 + 60)
    const clusterCenterY = parentPos.y

    const simNodes = subAreas.map((sa, i) => ({
      id: sa.subAreaId,
      x: clusterCenterX + (Math.random() - 0.5) * 40,
      y: clusterCenterY + (i - subAreas.length / 2) * (saH + 8),
    }))

    const simulation = d3.forceSimulation(simNodes)
      .force('x', d3.forceX(clusterCenterX).strength(0.3))
      .force('y', d3.forceY(clusterCenterY).strength(0.15))
      .force('collide', d3.forceCollide(saH / 2 + 6))
      .force('boundary', () => {
        simNodes.forEach((n) => {
          n.x = Math.max(saW / 2 + 10, Math.min(width - saW / 2 - 10, n.x))
          n.y = Math.max(saH / 2 + 40, Math.min(height - saH / 2 - 20, n.y))
        })
      })
      .stop()

    // Run synchronously for 60 ticks
    for (let i = 0; i < 60; i++) simulation.tick()

    setPositions(simNodes.map((n) => ({ id: n.id, x: n.x, y: n.y })))

    return () => simulation.stop()
  }, [subAreas, parentPos, nodeW, width, height])

  if (!parentPos || subAreas.length === 0 || positions.length === 0) return null

  const saW = 160
  const saH = 32
  const side = parentPos.x > width / 2 ? -1 : 1

  return (
    <g>
      {subAreas.map((sa, i) => {
        const pos = positions.find((p) => p.id === sa.subAreaId)
        if (!pos) return null

        const saX = pos.x - saW / 2
        const saY = pos.y - saH / 2
        const pct = sa.total > 0 ? sa.assessed / sa.total : 0
        const color = sa.assessed === 0 ? '#555' : sa.avg >= 2.5 ? '#7fb589' : sa.avg >= 1.5 ? '#e5b76a' : '#e8928a'

        return (
          <g
            key={sa.subAreaId}
            style={{ cursor: 'pointer' }}
            onClick={() => onNavigateToAssess?.(sa.subAreaId)}
          >
            {/* Connector from parent to sub-area */}
            <line
              x1={parentPos.x + side * (nodeW / 2)}
              y1={parentPos.y}
              x2={saX + (side > 0 ? 0 : saW)}
              y2={saY + saH / 2}
              stroke="#444" strokeWidth="1" strokeDasharray="3,3" opacity="0.5"
            >
              <animate attributeName="opacity" from="0" to="0.5" dur="0.4s" fill="freeze" />
            </line>

            {/* Sub-area node with fade-in */}
            <g opacity="0">
              <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin={`${i * 0.05}s`} fill="freeze" />

              <rect
                x={saX} y={saY} width={saW} height={saH}
                rx={6} fill="#252528" stroke={color} strokeWidth="1"
              />

              {/* Progress bar */}
              <rect
                x={saX + 2} y={saY + saH - 5}
                width={saW - 4} height={3} rx={1.5} fill="#1a1a1e"
              />
              <rect
                x={saX + 2} y={saY + saH - 5}
                width={(saW - 4) * pct} height={3} rx={1.5}
                fill={color} opacity="0.7"
              />

              {/* Name */}
              <text
                x={saX + 8} y={saY + saH / 2 - 2}
                fill="#ccc" fontSize="9" fontFamily="Inter, sans-serif" dominantBaseline="middle"
              >
                {sa.name.length > 22 ? sa.name.slice(0, 21) + '\u2026' : sa.name}
              </text>

              {/* Score */}
              <text
                x={saX + saW - 8} y={saY + saH / 2 - 2}
                fill={color} fontSize="9" fontWeight="600" fontFamily="monospace"
                textAnchor="end" dominantBaseline="middle"
              >
                {sa.assessed > 0 ? sa.avg.toFixed(1) : '\u2014'}
              </text>
            </g>
          </g>
        )
      })}
    </g>
  )
}

/**
 * MobileSubAreaOverlay — Phone: full-screen Framer Motion overlay for semantic zoom.
 */
function MobileSubAreaOverlay({ domainId, subAreas, onClose, onNavigateToAssess }) {
  const domain = framework.find((d) => d.id === domainId)
  const domainColor = DOMAIN_COLORS[domainId] || '#888'

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-[#1a1a1e] flex flex-col"
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      {/* Header with back button */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#333] shrink-0">
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          {'\u2190'}
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center"
              style={{ backgroundColor: domainColor + '30', color: domainColor }}
            >
              {domain?.domain}
            </span>
            <h3 className="text-sm font-semibold text-gray-200">{domain?.name}</h3>
          </div>
          <p className="text-[10px] text-gray-500 mt-0.5">{subAreas.length} sub-areas</p>
        </div>
      </div>

      {/* Sub-area list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        <AnimatePresence>
          {subAreas.map((sa, i) => {
            const pct = sa.total > 0 ? sa.assessed / sa.total : 0
            const color = sa.assessed === 0 ? '#555' : sa.avg >= 2.5 ? '#7fb589' : sa.avg >= 1.5 ? '#e5b76a' : '#e8928a'

            return (
              <motion.button
                key={sa.subAreaId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onNavigateToAssess?.(sa.subAreaId)}
                className="w-full text-left rounded-lg border px-4 py-3 transition-colors min-h-[44px]"
                style={{ borderColor: color + '40', backgroundColor: '#252528' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-200">{sa.name}</span>
                  <span className="text-xs font-mono font-semibold" style={{ color }}>
                    {sa.assessed > 0 ? sa.avg.toFixed(1) + '/3' : 'Not assessed'}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-[#1a1a1e]">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: `${pct * 100}%`, backgroundColor: color }}
                  />
                </div>

                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-gray-500">
                    {sa.assessed}/{sa.total} assessed
                  </span>
                  <span className="text-[10px]" style={{ color }}>
                    Assess {'\u2192'}
                  </span>
                </div>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
