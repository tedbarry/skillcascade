import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react'
import { scaleSequential } from 'd3-scale'
import { interpolateYlOrRd } from 'd3-scale-chromatic'
import { color } from 'd3-color'
import { interpolateRgb } from 'd3-interpolate'
import { forceSimulation, forceManyBody, forceLink, forceCenter, forceY, forceCollide, forceX } from 'd3-force'
import useResponsive from '../hooks/useResponsive.js'

const DOMAIN_COLORS = {
  d1: '#e07b6e', d2: '#d4956a', d3: '#c9a84c', d4: '#8fb570',
  d5: '#5da87a', d6: '#4a9e9e', d7: '#6889b5', d8: '#8b7bb5', d9: '#a86e9a',
}

const STATE_COLORS = {
  locked: '#444444',
  blocked: '#8b4444',
  'needs-work': '#e8928a',
  developing: '#e5b76a',
  mastered: '#7fb589',
}

const EDGES_DEF = [
  { from: 'd1', to: 'd2', type: 'requires' },
  { from: 'd2', to: 'd3', type: 'requires' },
  { from: 'd3', to: 'd4', type: 'requires' },
  { from: 'd4', to: 'd5', type: 'requires' },
  { from: 'd5', to: 'd6', type: 'requires' },
  { from: 'd6', to: 'd7', type: 'requires' },
  { from: 'd2', to: 'd6', type: 'supports' },
  { from: 'd3', to: 'd7', type: 'requires' },
  { from: 'd1', to: 'd8', type: 'requires' },
  { from: 'd3', to: 'd8', type: 'supports' },
  { from: 'd1', to: 'd9', type: 'requires' },
  { from: 'd2', to: 'd9', type: 'supports' },
  { from: 'd5', to: 'd9', type: 'requires' },
  { from: 'd8', to: 'd6', type: 'supports' },
  { from: 'd8', to: 'd7', type: 'supports' },
  { from: 'd9', to: 'd6', type: 'supports' },
]

// Tier-based Y positions to preserve hierarchy (foundation at bottom)
const TIER_MAP = { d1: 0, d2: 1, d3: 2, d4: 3, d5: 4, d6: 5, d7: 6, d8: 3, d9: 3 }

// Heatmap color scale
const heatmapScale = scaleSequential(interpolateYlOrRd).domain([0, 1])

function useNeuralSimulation(nodes, edges, containerSize) {
  const simRef = useRef(null)
  const nodesRef = useRef([])
  const linksRef = useRef([])
  const particlesRef = useRef([])
  const effectsRef = useRef([])
  const settledRef = useRef(false)
  const dragRef = useRef(null)

  // Initialize / update simulation when nodes change
  useEffect(() => {
    const { width, height } = containerSize
    if (!width || !height) return

    const cx = width / 2
    const cy = height / 2
    const tierRange = height * 0.7
    const tierOffset = height * 0.15

    // Map nodes to simulation nodes, preserving positions if they exist
    const existingMap = {}
    nodesRef.current.forEach(n => { existingMap[n.id] = n })

    const simNodes = nodes.map(n => {
      const existing = existingMap[n.id]
      const tierY = tierOffset + tierRange - (TIER_MAP[n.id] / 6) * tierRange
      return {
        ...n,
        x: existing?.x ?? (cx + (n.id === 'd8' ? -width * 0.25 : n.id === 'd9' ? width * 0.25 : 0) + (Math.random() - 0.5) * 20),
        y: existing?.y ?? tierY,
        vx: existing?.vx ?? 0,
        vy: existing?.vy ?? 0,
        targetY: tierY,
      }
    })

    const simLinks = EDGES_DEF.map(e => ({
      source: simNodes.find(n => n.id === e.from),
      target: simNodes.find(n => n.id === e.to),
      type: e.type,
    })).filter(l => l.source && l.target)

    nodesRef.current = simNodes
    linksRef.current = simLinks

    // Initialize particles (30 per edge)
    const parts = []
    simLinks.forEach((link, li) => {
      for (let i = 0; i < 30; i++) {
        parts.push({
          linkIndex: li,
          t: i / 30,
          speed: 0.003 + Math.random() * 0.002,
          size: 1.5 + Math.random() * 1,
        })
      }
    })
    particlesRef.current = parts

    // Create d3 force simulation
    if (simRef.current) simRef.current.stop()

    const sim = forceSimulation(simNodes)
      .force('charge', forceManyBody().strength(-400))
      .force('link', forceLink(simLinks).distance(150).strength(0.3))
      .force('center', forceCenter(cx, cy))
      .force('y', forceY(d => d.targetY).strength(0.15))
      .force('collision', forceCollide(60))
      .alphaDecay(0.02)
      .velocityDecay(0.4)
      .on('tick', () => {
        // Keep nodes in bounds
        simNodes.forEach(n => {
          n.x = Math.max(60, Math.min(width - 60, n.x))
          n.y = Math.max(60, Math.min(height - 60, n.y))
        })
      })
      .on('end', () => { settledRef.current = true })

    // Push d8/d9 outward
    sim.force('xPush', forceX(d => {
      if (d.id === 'd8') return cx - width * 0.25
      if (d.id === 'd9') return cx + width * 0.25
      return cx
    }).strength(d => (d.id === 'd8' || d.id === 'd9') ? 0.1 : 0.02))

    simRef.current = sim
    settledRef.current = false

    return () => { sim.stop() }
  }, [nodes.length, containerSize.width, containerSize.height])

  // Update node data without resetting positions
  useEffect(() => {
    nodes.forEach(n => {
      const simNode = nodesRef.current.find(sn => sn.id === n.id)
      if (simNode) {
        simNode.healthPct = n.healthPct
        simNode.state = n.state
        simNode.name = n.name
        simNode.domain = n.domain
        simNode.avg = n.avg
        simNode.assessed = n.assessed
        simNode.total = n.total
        simNode.leverageScore = n.leverageScore
        simNode.downstreamSkills = n.downstreamSkills
      }
    })
  }, [nodes])

  const reheat = useCallback(() => {
    if (simRef.current) {
      simRef.current.alpha(0.3).restart()
      settledRef.current = false
    }
  }, [])

  return { simRef, nodesRef, linksRef, particlesRef, effectsRef, settledRef, dragRef, reheat }
}

export default memo(function CascadeNeuralCanvas({
  nodes = [],
  edges = [],
  cascadeState = {},
  isMasteryCascade = false,
  onNodeClick,
  mode = 'live',
  pathChain = null,
  pathReadiness = null,
  heatmapOn = false,
  hasData = false,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [hoveredNode, setHoveredNode] = useState(null)
  const [tooltip, setTooltip] = useState(null)
  const rafRef = useRef(null)
  const transformRef = useRef({ x: 0, y: 0, scale: 1 })
  const animatingRef = useRef(true)
  const pointerRef = useRef({ down: false, startX: 0, startY: 0, lastX: 0, lastY: 0 })
  const pinchRef = useRef({ active: false, startDist: 0, startScale: 1 })
  const { isPhone, isTablet } = useResponsive()

  // Responsive node sizing
  const nodeRadius = useMemo(() => {
    const base = isPhone ? [25, 40] : isTablet ? [28, 45] : [30, 50]
    return { min: base[0], max: base[1] }
  }, [isPhone, isTablet])

  // Path domain set for path trace mode
  const pathDomainIds = useMemo(() => {
    if (!pathChain) return new Set()
    return new Set(pathChain.map(s => s.domainId))
  }, [pathChain])

  // Observe container size
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setContainerSize({ width, height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const {
    nodesRef, linksRef, particlesRef, effectsRef, settledRef, dragRef, reheat,
  } = useNeuralSimulation(nodes, edges, containerSize)

  // Trigger shockwave effect on cascade
  useEffect(() => {
    if (cascadeState.active && cascadeState.source) {
      const sourceNode = nodesRef.current.find(n => n.id === cascadeState.source)
      if (sourceNode) {
        effectsRef.current.push({
          type: 'shockwave',
          x: sourceNode.x,
          y: sourceNode.y,
          radius: 0,
          maxRadius: 200,
          alpha: 0.8,
          color: isMasteryCascade ? '#ffd700' : '#ff4444',
          startTime: performance.now(),
          duration: 800,
        })
        animatingRef.current = true
      }
    }
  }, [cascadeState.active, cascadeState.source, isMasteryCascade])

  // Keep animation alive when cascade is active
  useEffect(() => {
    if (cascadeState.active) animatingRef.current = true
  }, [cascadeState.active, cascadeState.phase])

  // ─── Drawing ───

  const draw = useCallback((timestamp) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { width, height } = containerSize
    if (!width || !height) return

    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const t = transformRef.current

    // 1. Clear
    ctx.fillStyle = '#0a0a14'
    ctx.fillRect(0, 0, width, height)

    ctx.save()
    ctx.translate(t.x, t.y)
    ctx.scale(t.scale, t.scale)

    // 2. Dot grid (subtle parallax)
    const gridSpacing = 30
    const parallax = 0.3
    const offsetX = (t.x * parallax) % gridSpacing
    const offsetY = (t.y * parallax) % gridSpacing
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    for (let gx = -gridSpacing + offsetX / t.scale; gx < width / t.scale + gridSpacing; gx += gridSpacing) {
      for (let gy = -gridSpacing + offsetY / t.scale; gy < height / t.scale + gridSpacing; gy += gridSpacing) {
        ctx.fillRect(gx - 0.5, gy - 0.5, 1, 1)
      }
    }

    const simNodes = nodesRef.current
    const simLinks = linksRef.current
    const particles = particlesRef.current
    const effects = effectsRef.current

    // Max leverage for heatmap
    const maxLeverage = Math.max(1, ...simNodes.map(n => n.leverageScore || 0))

    // 3. Draw edges (quadratic bezier)
    simLinks.forEach((link, li) => {
      const sx = link.source.x, sy = link.source.y
      const tx = link.target.x, ty = link.target.y
      const mx = (sx + tx) / 2 + (ty - sy) * 0.15
      const my = (sy + ty) / 2 - (tx - sx) * 0.15

      const isActiveEdge = cascadeState.active && (
        (link.source.id === cascadeState.source || cascadeState.affected?.[link.source.id]) &&
        cascadeState.affected?.[link.target.id]
      )

      const isPathEdge = mode === 'pathtrace' && pathDomainIds.has(link.source.id) && pathDomainIds.has(link.target.id)

      let lineColor = DOMAIN_COLORS[link.source.id] || '#556'
      let lineAlpha = 0.4
      let lineWidth = 1.5

      if (isActiveEdge) {
        lineColor = isMasteryCascade ? '#ffd700' : '#ff4444'
        lineAlpha = 0.8
        lineWidth = 2.5
      } else if (isPathEdge) {
        lineColor = '#6889b5'
        lineAlpha = 0.9
        lineWidth = 2.5
      } else if (mode === 'pathtrace' && pathChain) {
        lineAlpha = 0.1
      }

      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.quadraticCurveTo(mx, my, tx, ty)
      ctx.strokeStyle = lineColor
      ctx.globalAlpha = lineAlpha
      ctx.lineWidth = lineWidth
      if (link.type === 'supports' && !isActiveEdge && !isPathEdge) {
        ctx.setLineDash([8, 4])
      }
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
    })

    // 4. Advance + draw particles
    particles.forEach(p => {
      const link = simLinks[p.linkIndex]
      if (!link) return

      const isActiveEdge = cascadeState.active && (
        (link.source.id === cascadeState.source || cascadeState.affected?.[link.source.id]) &&
        cascadeState.affected?.[link.target.id]
      )
      const isPathEdge = mode === 'pathtrace' && pathDomainIds.has(link.source.id) && pathDomainIds.has(link.target.id)

      const speedMult = isActiveEdge ? 3 : 1
      p.t = (p.t + p.speed * speedMult) % 1

      const sx = link.source.x, sy = link.source.y
      const tx = link.target.x, ty = link.target.y
      const mx = (sx + tx) / 2 + (ty - sy) * 0.15
      const my = (sy + ty) / 2 - (tx - sx) * 0.15

      // Quadratic bezier point
      const u = 1 - p.t
      const px = u * u * sx + 2 * u * p.t * mx + p.t * p.t * tx
      const py = u * u * sy + 2 * u * p.t * my + p.t * p.t * ty

      let pColor = DOMAIN_COLORS[link.source.id] || '#556'
      let pAlpha = 0.3

      if (isActiveEdge) {
        pColor = isMasteryCascade ? '#ffd700' : '#ff4444'
        pAlpha = 0.8
      } else if (isPathEdge) {
        pColor = '#6889b5'
        pAlpha = 0.7
      } else if (mode === 'pathtrace' && pathChain) {
        pAlpha = 0.05
      }

      // Glow trail
      ctx.beginPath()
      ctx.arc(px, py, p.size + 1, 0, Math.PI * 2)
      ctx.fillStyle = pColor
      ctx.globalAlpha = pAlpha * 0.3
      ctx.fill()

      // Core dot
      ctx.beginPath()
      ctx.arc(px, py, p.size, 0, Math.PI * 2)
      ctx.fillStyle = pColor
      ctx.globalAlpha = pAlpha
      ctx.fill()
      ctx.globalAlpha = 1
    })

    // 5. Draw node glows (shadowBlur pass)
    simNodes.forEach(node => {
      const r = nodeRadius.min + (node.healthPct || 0) * (nodeRadius.max - nodeRadius.min)
      const domainColor = DOMAIN_COLORS[node.id] || '#888'

      let glowIntensity = 20
      let glowColor = domainColor

      if (cascadeState.active) {
        if (node.id === cascadeState.source) {
          glowColor = isMasteryCascade ? '#ffd700' : '#ff4444'
          glowIntensity = 40
        } else if (cascadeState.affected?.[node.id]) {
          const impact = cascadeState.affected[node.id].impactStrength
          glowColor = isMasteryCascade ? '#ffd700' : '#ff4444'
          glowIntensity = 15 + impact * 30
        } else {
          glowIntensity = 3
        }
      }

      if (mode === 'pathtrace' && pathChain && !pathDomainIds.has(node.id)) {
        glowIntensity = 2
      }

      ctx.save()
      ctx.shadowColor = glowColor
      ctx.shadowBlur = glowIntensity
      ctx.beginPath()
      ctx.arc(node.x, node.y, r * 0.8, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,0.01)'
      ctx.fill()
      ctx.restore()
    })

    // 6. Draw node cores + rings + labels
    simNodes.forEach(node => {
      const r = nodeRadius.min + (node.healthPct || 0) * (nodeRadius.max - nodeRadius.min)
      const domainColor = DOMAIN_COLORS[node.id] || '#888'
      const stateColor = STATE_COLORS[node.state] || '#444'

      let fillAlpha = 1
      let ringColor = domainColor
      let labelAlpha = 1

      // Mode-specific styling
      if (cascadeState.active) {
        if (node.id === cascadeState.source) {
          ringColor = isMasteryCascade ? '#ffd700' : '#ff4444'
        } else if (cascadeState.affected?.[node.id]) {
          const impact = cascadeState.affected[node.id].impactStrength
          ringColor = isMasteryCascade
            ? interpolateRgb(domainColor, '#ffd700')(impact)
            : interpolateRgb(domainColor, '#ff4444')(impact)
        } else {
          fillAlpha = 0.3
          labelAlpha = 0.3
        }
      }

      if (mode === 'pathtrace' && pathChain) {
        if (pathDomainIds.has(node.id)) {
          ringColor = '#6889b5'
        } else {
          fillAlpha = 0.15
          labelAlpha = 0.15
        }
      }

      // Heatmap override
      let fillColor = stateColor
      if (heatmapOn) {
        const ht = (node.leverageScore || 0) / maxLeverage
        const hc = color(heatmapScale(ht * 0.85 + 0.15))
        if (hc) fillColor = hc.formatHex()
      }

      ctx.globalAlpha = fillAlpha

      // Inner fill — radial gradient
      const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r)
      grad.addColorStop(0, fillColor)
      grad.addColorStop(1, 'rgba(10,10,20,0.8)')

      ctx.beginPath()
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2)

      if (node.state === 'locked') {
        // Hollow dashed ring for locked
        ctx.strokeStyle = '#444'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 3])
        ctx.stroke()
        ctx.setLineDash([])
      } else {
        ctx.fillStyle = grad
        ctx.fill()

        // Outer ring
        ctx.beginPath()
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
        ctx.strokeStyle = ringColor
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Mastered: golden inner glow + subtle pulse
      if (node.state === 'mastered') {
        const pulse = 0.5 + 0.2 * Math.sin(timestamp * 0.002)
        ctx.save()
        ctx.globalAlpha = pulse * fillAlpha
        ctx.beginPath()
        ctx.arc(node.x, node.y, r * 0.6, 0, Math.PI * 2)
        const masteryGrad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 0.6)
        masteryGrad.addColorStop(0, 'rgba(255,215,0,0.4)')
        masteryGrad.addColorStop(1, 'rgba(255,215,0,0)')
        ctx.fillStyle = masteryGrad
        ctx.fill()
        ctx.restore()
      }

      // Labels
      ctx.globalAlpha = labelAlpha
      ctx.fillStyle = '#ddd'
      ctx.font = `600 ${isPhone ? 10 : 12}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(node.name, node.x, node.y - r - 6)

      ctx.fillStyle = '#999'
      ctx.font = `${isPhone ? 8 : 10}px system-ui, sans-serif`
      ctx.textBaseline = 'top'
      const scoreText = `D${node.domain} · ${(node.avg || 0).toFixed(1)}/3`
      ctx.fillText(scoreText, node.x, node.y + r + 4)

      // Heatmap badge
      if (heatmapOn && node.downstreamSkills > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.font = `bold ${isPhone ? 7 : 8}px system-ui, sans-serif`
        ctx.fillText(`Unlocks ${node.downstreamSkills} skills`, node.x, node.y + r + (isPhone ? 14 : 18))
      }

      // Path trace step number
      if (mode === 'pathtrace' && pathChain && pathDomainIds.has(node.id)) {
        const stepIdx = pathChain.findIndex(s => s.domainId === node.id)
        if (stepIdx >= 0) {
          ctx.fillStyle = '#6889b5'
          ctx.font = `bold ${isPhone ? 14 : 16}px system-ui, sans-serif`
          ctx.textBaseline = 'middle'
          ctx.fillText(`${stepIdx + 1}`, node.x, node.y)
        }
      }

      ctx.globalAlpha = 1
    })

    // 7. Draw effects (shockwaves)
    const now = timestamp
    for (let i = effects.length - 1; i >= 0; i--) {
      const eff = effects[i]
      const elapsed = now - eff.startTime
      const progress = Math.min(1, elapsed / eff.duration)

      if (eff.type === 'shockwave') {
        eff.radius = progress * eff.maxRadius
        const alpha = eff.alpha * (1 - progress)

        ctx.beginPath()
        ctx.arc(eff.x, eff.y, eff.radius, 0, Math.PI * 2)
        ctx.strokeStyle = eff.color
        ctx.lineWidth = 3 * (1 - progress)
        ctx.globalAlpha = alpha
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      if (progress >= 1) effects.splice(i, 1)
    }

    ctx.restore()

    // Continue animation if needed
    const needsAnimation = !settledRef.current ||
      cascadeState.active ||
      effects.length > 0 ||
      dragRef.current ||
      (mode === 'pathtrace' && pathChain)

    if (needsAnimation || animatingRef.current) {
      rafRef.current = requestAnimationFrame(draw)
      // Allow idle after a few seconds of settlement
      if (settledRef.current && !cascadeState.active && effects.length === 0 && !dragRef.current) {
        animatingRef.current = false
      }
    }
  }, [containerSize, cascadeState, isMasteryCascade, mode, pathChain, pathDomainIds, heatmapOn, isPhone, nodeRadius])

  // Start animation loop
  useEffect(() => {
    animatingRef.current = true
    rafRef.current = requestAnimationFrame(draw)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [draw])

  // Ensure animation restarts on mode/cascade changes
  useEffect(() => {
    animatingRef.current = true
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(draw)
  }, [mode, cascadeState.active, heatmapOn])

  // ─── Interaction handlers ───

  const screenToWorld = useCallback((clientX, clientY) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const t = transformRef.current
    return {
      x: (clientX - rect.left - t.x) / t.scale,
      y: (clientY - rect.top - t.y) / t.scale,
    }
  }, [])

  const findNodeAt = useCallback((wx, wy) => {
    const simNodes = nodesRef.current
    const hitRadius = Math.max(44, nodeRadius.max) // minimum 44px touch target
    for (let i = simNodes.length - 1; i >= 0; i--) {
      const n = simNodes[i]
      const dx = wx - n.x, dy = wy - n.y
      if (dx * dx + dy * dy < hitRadius * hitRadius) return n
    }
    return null
  }, [nodeRadius.max])

  const handlePointerDown = useCallback((e) => {
    if (e.touches && e.touches.length === 2) {
      // Pinch start
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchRef.current = {
        active: true,
        startDist: Math.sqrt(dx * dx + dy * dy),
        startScale: transformRef.current.scale,
      }
      return
    }

    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const world = screenToWorld(clientX, clientY)
    const node = findNodeAt(world.x, world.y)

    pointerRef.current = {
      down: true,
      startX: clientX,
      startY: clientY,
      lastX: clientX,
      lastY: clientY,
      startTime: performance.now(),
      movedSignificantly: false,
    }

    if (node) {
      dragRef.current = { node, startX: node.x, startY: node.y }
      node.fx = node.x
      node.fy = node.y
      reheat()
    }

    animatingRef.current = true
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(draw)
  }, [screenToWorld, findNodeAt, reheat, draw])

  const handlePointerMove = useCallback((e) => {
    if (e.touches && e.touches.length === 2 && pinchRef.current.active) {
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const scale = Math.max(0.3, Math.min(3.0, pinchRef.current.startScale * (dist / pinchRef.current.startDist)))
      transformRef.current.scale = scale
      return
    }

    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY

    if (!pointerRef.current.down) {
      // Hover detection
      const world = screenToWorld(clientX, clientY)
      const node = findNodeAt(world.x, world.y)
      setHoveredNode(node?.id || null)

      if (node) {
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          setTooltip({
            x: clientX - rect.left,
            y: clientY - rect.top - 10,
            node,
          })
        }
      } else {
        setTooltip(null)
      }
      return
    }

    const dx = clientX - pointerRef.current.lastX
    const dy = clientY - pointerRef.current.lastY
    pointerRef.current.lastX = clientX
    pointerRef.current.lastY = clientY

    const totalDx = clientX - pointerRef.current.startX
    const totalDy = clientY - pointerRef.current.startY
    if (Math.abs(totalDx) > 5 || Math.abs(totalDy) > 5) {
      pointerRef.current.movedSignificantly = true
    }

    if (dragRef.current) {
      // Drag node
      const world = screenToWorld(clientX, clientY)
      dragRef.current.node.fx = world.x
      dragRef.current.node.fy = world.y
      reheat()
    } else {
      // Pan
      transformRef.current.x += dx
      transformRef.current.y += dy
    }
  }, [screenToWorld, findNodeAt, reheat])

  const handlePointerUp = useCallback((e) => {
    if (pinchRef.current.active) {
      pinchRef.current.active = false
      return
    }

    const wasDrag = dragRef.current
    const movedSignificantly = pointerRef.current.movedSignificantly

    if (wasDrag) {
      wasDrag.node.fx = null
      wasDrag.node.fy = null
      dragRef.current = null
      reheat()
    }

    // Click detection (no significant movement)
    if (!movedSignificantly && pointerRef.current.down) {
      const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX
      const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY
      const world = screenToWorld(clientX, clientY)
      const node = findNodeAt(world.x, world.y)
      if (node && onNodeClick) {
        onNodeClick(node.id)
      }
    }

    pointerRef.current.down = false
  }, [screenToWorld, findNodeAt, onNodeClick, reheat])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const t = transformRef.current
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const zoom = e.deltaY < 0 ? 1.08 : 0.93
    const newScale = Math.max(0.3, Math.min(3.0, t.scale * zoom))

    // Zoom centered on cursor
    t.x = mouseX - (mouseX - t.x) * (newScale / t.scale)
    t.y = mouseY - (mouseY - t.y) * (newScale / t.scale)
    t.scale = newScale

    animatingRef.current = true
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(draw)
  }, [draw])

  // Attach wheel listener with passive: false
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ minHeight: 400, touchAction: 'none', cursor: hoveredNode ? 'pointer' : 'grab' }}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Tooltip overlay */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-[#1e1e24]/95 border border-[#444] rounded-lg px-3 py-2 text-xs z-10 shadow-xl backdrop-blur-sm"
          style={{
            left: Math.min(tooltip.x, containerSize.width - 180),
            top: tooltip.y - 70,
            maxWidth: 200,
          }}
        >
          <div className="text-gray-200 font-medium">{tooltip.node.name}</div>
          <div className="text-gray-400 mt-0.5">
            D{tooltip.node.domain} · {tooltip.node.state}
          </div>
          <div className="text-gray-400">
            Score: {(tooltip.node.avg || 0).toFixed(1)}/3 · {tooltip.node.assessed || 0}/{tooltip.node.total || 0} assessed
          </div>
          {heatmapOn && tooltip.node.leverageScore > 0 && (
            <div className="text-orange-400 mt-0.5">
              Leverage: {tooltip.node.leverageScore.toFixed(1)} · Unlocks {tooltip.node.downstreamSkills} skills
            </div>
          )}
        </div>
      )}

      {/* Hint */}
      <div className="absolute bottom-3 left-3 text-[10px] text-gray-600 pointer-events-none">
        Drag nodes · Scroll to zoom · Click to cascade
      </div>
    </div>
  )
})
