import { useRef, useEffect, useState, useMemo, memo } from 'react'
import { framework, getDomainScores, DOMAIN_DEPENDENCIES, ASSESSMENT_LEVELS, ASSESSMENT_COLORS, ASSESSMENT_LABELS } from '../data/framework.js'

/**
 * Layout tiers — vertical position based on prerequisite depth
 * Main chain flows bottom to top: D1 → D2 → D3 → D4 → D5 → D6 → D7
 * D8, D9 are independent (side columns)
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

/**
 * Direct (non-transitive) dependency edges for visual clarity
 */
const EDGES = [
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

/**
 * Determine node state from assessment scores
 */
function getNodeState(score, assessed, total, prereqsSolid) {
  if (assessed === 0) return 'locked'
  if (!prereqsSolid && score < 2.0) return 'blocked'
  if (score < 1.5) return 'needs-work'
  if (score < 2.5) return 'developing'
  return 'mastered'
}

const STATE_CONFIG = {
  locked: {
    fill: '#2a2a2a',
    stroke: '#444',
    glow: 'none',
    textColor: '#666',
    label: 'Locked',
  },
  blocked: {
    fill: '#3a2020',
    stroke: '#8b4444',
    glow: '#e8928a',
    textColor: '#ccc',
    label: 'Blocked',
  },
  'needs-work': {
    fill: '#3a2525',
    stroke: '#e8928a',
    glow: '#e8928a',
    textColor: '#f5c4c0',
    label: 'Needs Work',
  },
  developing: {
    fill: '#3a3520',
    stroke: '#e5b76a',
    glow: '#e5b76a',
    textColor: '#f5e0b0',
    label: 'Developing',
  },
  mastered: {
    fill: '#1e3525',
    stroke: '#7fb589',
    glow: '#7fb589',
    textColor: '#b5e8bf',
    label: 'Mastered',
  },
}

/**
 * Find the recommended next target domain
 */
function getRecommendedTarget(domainScores) {
  const scoreMap = {}
  domainScores.forEach((s) => (scoreMap[s.domainId] = s))

  // Walk from bottom of chain upward
  const chain = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7']

  for (const id of chain) {
    const s = scoreMap[id]
    if (!s || s.assessed === 0) return id // First unassessed domain
    if (s.score < 2.5) return id // First non-mastered domain
  }

  // Check D8, D9
  for (const id of ['d8', 'd9']) {
    const s = scoreMap[id]
    if (!s || s.assessed === 0 || s.score < 2.5) return id
  }

  return null // All mastered
}

export default memo(function SkillTree({ assessments = {}, onSelectDomain }) {
  const svgRef = useRef(null)
  const [expandedDomain, setExpandedDomain] = useState(null)
  const [tooltip, setTooltip] = useState(null)
  const tooltipTimerRef = useRef(null)

  const domainScores = useMemo(() => getDomainScores(assessments), [assessments])
  const recommendedTarget = useMemo(() => getRecommendedTarget(domainScores), [domainScores])

  const scoreMap = useMemo(() => {
    const map = {}
    domainScores.forEach((s) => (map[s.domainId] = s))
    return map
  }, [domainScores])

  // Compute node states
  const nodeStates = useMemo(() => {
    const states = {}
    framework.forEach((domain) => {
      const s = scoreMap[domain.id] || { score: 0, assessed: 0, total: 0 }
      const deps = DOMAIN_DEPENDENCIES[domain.id] || []
      const prereqsSolid = deps.length === 0 || deps.every((depId) => {
        const depScore = scoreMap[depId]
        return depScore && depScore.score >= 2.0
      })
      states[domain.id] = getNodeState(s.score, s.assessed, s.total, prereqsSolid)
    })
    return states
  }, [scoreMap])

  // Dimensions
  const width = 900
  const baseHeight = 920
  const nodeW = 200
  const nodeH = 64
  const tierSpacing = 96
  const colSpacing = 280

  // Dynamically extend SVG height when a domain is expanded
  const expandedExtra = useMemo(() => {
    if (!expandedDomain) return 0
    const domain = framework.find((d) => d.id === expandedDomain)
    if (!domain) return 0
    return domain.subAreas.length * 38 + 40
  }, [expandedDomain])

  const height = baseHeight + expandedExtra

  // Compute positions (bottom-up: tier 0 at bottom)
  const positions = useMemo(() => {
    const pos = {}
    const centerX = width / 2
    const bottomY = baseHeight - 100

    Object.entries(NODE_LAYOUT).forEach(([id, { col, tier }]) => {
      pos[id] = {
        x: centerX + (col - 1) * colSpacing,
        y: bottomY - tier * tierSpacing,
      }
    })
    return pos
  }, [])

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ maxWidth: width, background: 'linear-gradient(180deg, #1a1a1e 0%, #1e1e24 50%, #1a1a1e 100%)' }}
        className="mx-auto block"
      >
        <defs>
          {/* Glow filters */}
          {Object.entries(STATE_CONFIG).map(([state, config]) =>
            config.glow !== 'none' ? (
              <filter key={state} id={`glow-${state}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feFlood floodColor={config.glow} floodOpacity="0.5" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="shadow" />
                <feMerge>
                  <feMergeNode in="shadow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ) : null
          )}
          {/* Pulse filter for recommended target */}
          <filter id="glow-pulse" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feFlood floodColor="#f0d060" floodOpacity="0.7" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Arrow marker */}
          <marker id="arrow" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="5" orient="auto">
            <path d="M0,0 L10,3 L0,6" fill="#555" />
          </marker>
          <marker id="arrow-weak" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="5" orient="auto">
            <path d="M0,0 L10,3 L0,6" fill="#8b4444" />
          </marker>
        </defs>

        {/* Background grid */}
        <g opacity="0.06">
          {Array.from({ length: Math.ceil(width / 40) }, (_, i) => (
            <line key={`v${i}`} x1={i * 40} y1={0} x2={i * 40} y2={height} stroke="#fff" strokeWidth="0.5" />
          ))}
          {Array.from({ length: Math.ceil(height / 40) }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 40} x2={width} y2={i * 40} stroke="#fff" strokeWidth="0.5" />
          ))}
        </g>

        {/* Tier labels */}
        <g>
          <text x={15} y={baseHeight - 58} fill="#444" fontSize="9" fontFamily="monospace">FOUNDATION</text>
          <text x={15} y={baseHeight - 58 - 6 * tierSpacing} fill="#444" fontSize="9" fontFamily="monospace">HIGHEST ORDER</text>
          <text x={15} y={positions.d8.y + 4} fill="#444" fontSize="9" fontFamily="monospace">OVERRIDE</text>
          <text x={width - 70} y={positions.d9.y + 4} fill="#444" fontSize="9" fontFamily="monospace">SYSTEM</text>
        </g>

        {/* Dependency edges */}
        <g>
          {EDGES.map((edge, i) => {
            const from = positions[edge.from]
            const to = positions[edge.to]
            if (!from || !to) return null

            // Check if the prerequisite is weak — makes the edge red
            const fromScore = scoreMap[edge.from]
            const isWeak = fromScore && fromScore.assessed > 0 && fromScore.score < 1.5
            const isRequires = edge.type === 'requires'

            // Curved path for supports edges
            let path
            if (isRequires) {
              path = `M${from.x},${from.y - nodeH / 2} L${to.x},${to.y + nodeH / 2}`
            } else {
              const midY = (from.y - nodeH / 2 + to.y + nodeH / 2) / 2
              const curveX = from.x + (to.x - from.x) * 0.5 + (edge.from === 'd2' ? -60 : 60)
              path = `M${from.x},${from.y - nodeH / 2} Q${curveX},${midY} ${to.x},${to.y + nodeH / 2}`
            }

            return (
              <path
                key={i}
                d={path}
                fill="none"
                stroke={isWeak ? '#8b4444' : '#444'}
                strokeWidth={isRequires ? 2 : 1}
                strokeDasharray={isRequires ? 'none' : '6,4'}
                markerEnd={isWeak ? 'url(#arrow-weak)' : 'url(#arrow)'}
                opacity={isRequires ? 0.8 : 0.4}
              />
            )
          })}
        </g>

        {/* Domain nodes */}
        <g>
          {framework.map((domain) => {
            const pos = positions[domain.id]
            if (!pos) return null

            const state = nodeStates[domain.id]
            const config = STATE_CONFIG[state]
            const score = scoreMap[domain.id]
            const isRecommended = domain.id === recommendedTarget
            const isExpanded = expandedDomain === domain.id

            return (
              <g key={domain.id}>
                {/* Pulse ring for recommended target */}
                {isRecommended && (
                  <rect
                    x={pos.x - nodeW / 2 - 4}
                    y={pos.y - nodeH / 2 - 4}
                    width={nodeW + 8}
                    height={nodeH + 8}
                    rx={14}
                    fill="none"
                    stroke="#f0d060"
                    strokeWidth="2"
                    filter="url(#glow-pulse)"
                    opacity="0.8"
                  >
                    <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="stroke-width" values="2;4;2" dur="2s" repeatCount="indefinite" />
                  </rect>
                )}

                {/* Node background */}
                <rect
                  x={pos.x - nodeW / 2}
                  y={pos.y - nodeH / 2}
                  width={nodeW}
                  height={nodeH}
                  rx={10}
                  fill={config.fill}
                  stroke={config.stroke}
                  strokeWidth={isExpanded ? 2.5 : 1.5}
                  filter={config.glow !== 'none' ? `url(#glow-${state})` : undefined}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setExpandedDomain(isExpanded ? null : domain.id)
                    if (onSelectDomain) onSelectDomain(domain)
                  }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.closest('svg').getBoundingClientRect()
                    setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      domain: domain.name,
                      question: domain.coreQuestion,
                      score: score?.score || 0,
                      assessed: score?.assessed || 0,
                      total: score?.total || 0,
                      state,
                      isRecommended,
                      keyInsight: domain.keyInsight,
                    })
                  }}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.closest('svg').getBoundingClientRect()
                    setTooltip((prev) => prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null)
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  onTouchStart={(e) => {
                    const touch = e.touches[0]
                    const rect = e.currentTarget.closest('svg').getBoundingClientRect()
                    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
                    setTooltip({
                      x: touch.clientX - rect.left,
                      y: touch.clientY - rect.top,
                      domain: domain.name,
                      question: domain.coreQuestion,
                      score: score?.score || 0,
                      assessed: score?.assessed || 0,
                      total: score?.total || 0,
                      state,
                      isRecommended,
                      keyInsight: domain.keyInsight,
                    })
                    tooltipTimerRef.current = setTimeout(() => setTooltip(null), 3000)
                  }}
                />

                {/* Domain number badge */}
                <circle
                  cx={pos.x - nodeW / 2 + 18}
                  cy={pos.y}
                  r={12}
                  fill={config.stroke}
                  opacity={0.3}
                  pointerEvents="none"
                />
                <text
                  x={pos.x - nodeW / 2 + 18}
                  y={pos.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={config.textColor}
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="monospace"
                  pointerEvents="none"
                >
                  {domain.domain}
                </text>

                {/* Domain name */}
                <text
                  x={pos.x + 6}
                  y={pos.y - 7}
                  textAnchor="middle"
                  fill={config.textColor}
                  fontSize="13"
                  fontWeight="600"
                  fontFamily="Plus Jakarta Sans, Inter, sans-serif"
                  pointerEvents="none"
                >
                  {domain.name}
                </text>

                {/* Score / state label */}
                <text
                  x={pos.x + 6}
                  y={pos.y + 12}
                  textAnchor="middle"
                  fill={config.textColor}
                  fontSize="10"
                  opacity={0.7}
                  fontFamily="Inter, sans-serif"
                  pointerEvents="none"
                >
                  {score && score.assessed > 0
                    ? `${score.score.toFixed(1)}/3 · ${score.assessed}/${score.total} assessed`
                    : config.label
                  }
                </text>

                {/* Recommended badge */}
                {isRecommended && (
                  <>
                    <rect
                      x={pos.x + nodeW / 2 - 60}
                      y={pos.y - nodeH / 2 - 10}
                      width={56}
                      height={18}
                      rx={9}
                      fill="#f0d060"
                      pointerEvents="none"
                    />
                    <text
                      x={pos.x + nodeW / 2 - 32}
                      y={pos.y - nodeH / 2 - 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#1a1a1e"
                      fontSize="8"
                      fontWeight="700"
                      fontFamily="monospace"
                      pointerEvents="none"
                    >
                      NEXT UP
                    </text>
                  </>
                )}

                {/* Expanded sub-areas */}
                {isExpanded && (
                  <SubAreaNodes
                    domain={domain}
                    pos={pos}
                    nodeW={nodeW}
                    nodeH={nodeH}
                    assessments={assessments}
                  />
                )}
              </g>
            )
          })}
        </g>

        {/* Title */}
        <text x={width / 2} y={28} textAnchor="middle" fill="#888" fontSize="11" fontFamily="monospace" letterSpacing="2">
          SKILL TREE · DEVELOPMENTAL DOMAINS
        </text>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 max-w-xs"
          style={{
            left: tooltip.x + 16,
            top: tooltip.y - 8,
            transform: tooltip.x > width * 0.6 ? 'translateX(-110%)' : 'none',
          }}
        >
          <div className="bg-[#2a2a30]/95 backdrop-blur-sm border border-[#444] rounded-lg shadow-2xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-sm" style={{ color: STATE_CONFIG[tooltip.state]?.textColor }}>
                {tooltip.domain}
              </span>
              {tooltip.isRecommended && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 font-bold">
                  RECOMMENDED
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 italic mb-2">{tooltip.question}</p>
            {tooltip.assessed > 0 ? (
              <div className="text-xs text-gray-300">
                Score: <span className="font-bold" style={{ color: STATE_CONFIG[tooltip.state]?.stroke }}>{tooltip.score.toFixed(1)}/3</span>
                {' · '}
                {tooltip.assessed}/{tooltip.total} skills assessed
              </div>
            ) : (
              <div className="text-xs text-gray-500">Not yet assessed</div>
            )}
            {tooltip.keyInsight && (
              <p className="text-[10px] text-gray-500 mt-1.5 border-t border-gray-700 pt-1.5">
                {tooltip.keyInsight}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-4">
        {Object.entries(STATE_CONFIG).map(([state, config]) => (
          <div key={state} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm border"
              style={{ backgroundColor: config.fill, borderColor: config.stroke }}
            />
            <span className="text-xs text-warm-500">{config.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm border border-yellow-400 bg-yellow-400/10" />
          <span className="text-xs text-warm-500">Recommended</span>
        </div>
      </div>
    </div>
  )
})

/**
 * Expanded sub-area nodes that fan out from a domain
 */
function SubAreaNodes({ domain, pos, nodeW, nodeH, assessments }) {
  const subAreas = domain.subAreas
  const count = subAreas.length
  const saW = 160
  const saH = 32
  const gap = 6
  const totalH = count * (saH + gap) - gap
  const startY = pos.y + nodeH / 2 + 16
  const xOffset = pos.x > 450 ? -saW - 30 : nodeW / 2 + 30

  return (
    <g>
      {subAreas.map((sa, i) => {
        const saY = startY + i * (saH + gap)
        const saX = pos.x + xOffset - saW / 2

        // Compute sub-area score
        let total = 0, assessed = 0, scoreSum = 0
        sa.skillGroups.forEach((sg) => {
          sg.skills.forEach((skill) => {
            total++
            const level = assessments[skill.id]
            if (level !== undefined && level !== ASSESSMENT_LEVELS.NOT_ASSESSED) {
              assessed++
              scoreSum += level
            }
          })
        })
        const avg = assessed > 0 ? scoreSum / assessed : 0
        const pct = total > 0 ? assessed / total : 0

        const color = assessed === 0 ? '#555' : avg >= 2.5 ? '#7fb589' : avg >= 1.5 ? '#e5b76a' : '#e8928a'

        return (
          <g key={sa.id}>
            {/* Connector line */}
            <line
              x1={pos.x + (xOffset > 0 ? nodeW / 2 : -nodeW / 2)}
              y1={pos.y}
              x2={saX + (xOffset > 0 ? 0 : saW)}
              y2={saY + saH / 2}
              stroke="#444"
              strokeWidth="1"
              strokeDasharray="3,3"
              opacity="0.5"
            />

            {/* Sub-area node */}
            <rect
              x={saX}
              y={saY}
              width={saW}
              height={saH}
              rx={6}
              fill="#252528"
              stroke={color}
              strokeWidth="1"
              opacity="0.9"
            />

            {/* Progress bar background */}
            <rect
              x={saX + 2}
              y={saY + saH - 5}
              width={saW - 4}
              height={3}
              rx={1.5}
              fill="#1a1a1e"
            />
            {/* Progress bar fill */}
            <rect
              x={saX + 2}
              y={saY + saH - 5}
              width={(saW - 4) * pct}
              height={3}
              rx={1.5}
              fill={color}
              opacity="0.7"
            />

            {/* Sub-area name */}
            <text
              x={saX + 8}
              y={saY + saH / 2 - 2}
              fill="#ccc"
              fontSize="9"
              fontFamily="Inter, sans-serif"
              dominantBaseline="middle"
            >
              {sa.name.length > 22 ? sa.name.slice(0, 21) + '…' : sa.name}
            </text>

            {/* Score */}
            <text
              x={saX + saW - 8}
              y={saY + saH / 2 - 2}
              fill={color}
              fontSize="9"
              fontWeight="600"
              fontFamily="monospace"
              textAnchor="end"
              dominantBaseline="middle"
            >
              {assessed > 0 ? avg.toFixed(1) : '—'}
            </text>
          </g>
        )
      })}
    </g>
  )
}
