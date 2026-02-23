import { useState, useEffect, useRef, useCallback } from 'react'
import { framework, DOMAIN_DEPENDENCIES } from '../data/framework.js'

/**
 * Layout — same positions as SkillTree for visual consistency
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
  { from: 'd1', to: 'd2' },
  { from: 'd2', to: 'd3' },
  { from: 'd3', to: 'd4' },
  { from: 'd4', to: 'd5' },
  { from: 'd5', to: 'd6' },
  { from: 'd6', to: 'd7' },
  { from: 'd2', to: 'd6', curve: true },
  { from: 'd3', to: 'd7', curve: true },
]

/**
 * Get all domains that depend (directly or transitively) on a given domain
 */
function getDependents(sourceId) {
  const dependents = new Set()
  const queue = [sourceId]

  while (queue.length > 0) {
    const current = queue.shift()
    Object.entries(DOMAIN_DEPENDENCIES).forEach(([domainId, deps]) => {
      if (deps.includes(current) && !dependents.has(domainId)) {
        dependents.add(domainId)
        queue.push(domainId)
      }
    })
  }

  return dependents
}

/**
 * Get the cascade delay tier for each affected domain (how many hops from source)
 */
function getCascadeTiers(sourceId) {
  const tiers = {}
  const visited = new Set([sourceId])
  let currentTier = [sourceId]
  let tierNum = 0

  while (currentTier.length > 0) {
    const nextTier = []
    for (const current of currentTier) {
      Object.entries(DOMAIN_DEPENDENCIES).forEach(([domainId, deps]) => {
        if (deps.includes(current) && !visited.has(domainId)) {
          visited.add(domainId)
          tiers[domainId] = tierNum + 1
          nextTier.push(domainId)
        }
      })
    }
    currentTier = nextTier
    tierNum++
  }

  return tiers
}

const DESCRIPTIONS = {
  d1: 'Without regulation, the person cannot stay calm enough to use any higher skill.',
  d2: 'Without self-awareness, they cannot identify what they feel or why — behavior becomes the only signal.',
  d3: 'Without executive function, they cannot start, sustain, or shift actions — even when they know what to do.',
  d4: 'Without problem-solving, they cannot assess situations or choose effective responses.',
  d5: 'Without communication, they cannot express needs — frustration fills the gap.',
  d6: 'Without social understanding, they misread others and break social expectations without knowing why.',
  d7: 'Without identity resilience, mistakes become identity threats — effort feels too risky.',
}

export default function CascadeAnimation({ compact = false }) {
  const [selectedDomain, setSelectedDomain] = useState(null)
  const [cascadeActive, setCascadeActive] = useState(false)
  const [affectedDomains, setAffectedDomains] = useState(new Set())
  const [cascadeTiers, setCascadeTiers] = useState({})
  const [animationPhase, setAnimationPhase] = useState(0) // 0 = idle, 1+ = tier being animated
  const timerRef = useRef(null)

  const width = compact ? 600 : 900
  const height = compact ? 560 : 820
  const nodeW = compact ? 150 : 200
  const nodeH = compact ? 50 : 64
  const tierSpacing = compact ? 66 : 96
  const colSpacing = compact ? 200 : 280
  const fontSize = compact ? 11 : 13
  const subFontSize = compact ? 8 : 10

  // Compute positions
  const centerX = width / 2
  const bottomY = height - (compact ? 50 : 70)

  const positions = {}
  Object.entries(NODE_LAYOUT).forEach(([id, { col, tier }]) => {
    positions[id] = {
      x: centerX + (col - 1) * colSpacing,
      y: bottomY - tier * tierSpacing,
    }
  })

  // Clean up timers
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const triggerCascade = useCallback((domainId) => {
    // Reset
    if (timerRef.current) clearTimeout(timerRef.current)
    setSelectedDomain(domainId)
    setAffectedDomains(new Set())
    setAnimationPhase(0)
    setCascadeActive(true)

    const tiers = getCascadeTiers(domainId)
    setCascadeTiers(tiers)

    // Find max tier
    const maxTier = Math.max(0, ...Object.values(tiers))

    // Animate tier by tier
    let currentPhase = 0
    const animateNext = () => {
      currentPhase++
      setAnimationPhase(currentPhase)

      // Add domains at this tier
      const domainsAtTier = Object.entries(tiers)
        .filter(([, t]) => t === currentPhase)
        .map(([id]) => id)

      setAffectedDomains((prev) => {
        const next = new Set(prev)
        domainsAtTier.forEach((id) => next.add(id))
        return next
      })

      if (currentPhase < maxTier) {
        timerRef.current = setTimeout(animateNext, 600)
      }
    }

    // Start after a brief pause for the source to "break"
    timerRef.current = setTimeout(animateNext, 400)
  }, [])

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSelectedDomain(null)
    setCascadeActive(false)
    setAffectedDomains(new Set())
    setCascadeTiers({})
    setAnimationPhase(0)
  }, [])

  const isIndependent = (id) => id === 'd8' || id === 'd9'

  function getNodeStyle(domainId) {
    if (domainId === selectedDomain) {
      return { fill: '#5c1a1a', stroke: '#ff4444', textColor: '#ff8888', glow: true, shake: true, independent: false }
    }
    if (affectedDomains.has(domainId)) {
      const tier = cascadeTiers[domainId] || 1
      const intensity = Math.max(0.3, 1 - tier * 0.12)
      return {
        fill: `rgba(92, 26, 26, ${intensity})`,
        stroke: `rgba(255, 68, 68, ${intensity})`,
        textColor: `rgba(255, 136, 136, ${intensity})`,
        glow: true,
        shake: false,
        independent: false,
      }
    }
    if (isIndependent(domainId)) {
      // D8/D9 always neutral/dimmed — never shown as healthy green
      return { fill: '#252530', stroke: '#667', textColor: '#aab', glow: false, shake: false, independent: true }
    }
    if (cascadeActive) {
      // Unaffected during cascade — stays healthy
      return { fill: '#1e3525', stroke: '#7fb589', textColor: '#b5e8bf', glow: false, shake: false, independent: false }
    }
    // Default — neutral/healthy
    return { fill: '#252530', stroke: '#667', textColor: '#aab', glow: false, shake: false, independent: false }
  }

  function getEdgeStyle(fromId, toId) {
    // Edge is "broken" if source is the selected domain or an affected domain,
    // AND the target is an affected domain
    const sourceAffected = fromId === selectedDomain || affectedDomains.has(fromId)
    const targetAffected = affectedDomains.has(toId)

    if (sourceAffected && targetAffected) {
      return { stroke: '#ff4444', opacity: 0.8, width: 2.5, dash: 'none' }
    }
    if (cascadeActive) {
      return { stroke: '#445', opacity: 0.3, width: 1, dash: '4,4' }
    }
    return { stroke: '#556', opacity: 0.5, width: 1.5, dash: 'none' }
  }

  return (
    <div>
      {/* Instruction */}
      {!compact && (
        <div className="text-center mb-4">
          {!cascadeActive ? (
            <p className="text-sm text-warm-500">
              Click any foundation domain below to see how weakness cascades upward.
            </p>
          ) : (
            <div>
              <p className="text-sm text-coral-500 font-medium mb-2">
                {DESCRIPTIONS[selectedDomain] || 'Weakness cascades upward through dependent domains.'}
              </p>
              <button
                onClick={reset}
                className="text-xs px-4 py-1.5 rounded-md bg-warm-200 text-warm-700 hover:bg-warm-300 transition-colors font-medium"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      )}

      {compact && cascadeActive && (
        <div className="text-center mb-3">
          <p className="text-xs text-coral-400 font-medium">
            {DESCRIPTIONS[selectedDomain]}
          </p>
          <button
            onClick={reset}
            className="text-[10px] px-3 py-1 rounded-md bg-warm-200 text-warm-700 hover:bg-warm-300 transition-colors font-medium mt-2"
          >
            Reset
          </button>
        </div>
      )}

      <svg
        width={width}
        height={height}
        className="mx-auto block"
        style={{ background: compact ? 'transparent' : 'linear-gradient(180deg, #1a1a1e 0%, #1e1e24 50%, #1a1a1e 100%)' }}
      >
        <defs>
          {/* Red glow for broken nodes */}
          <filter id="cascade-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feFlood floodColor="#ff4444" floodOpacity="0.6" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Ripple circle animation */}
          <radialGradient id="ripple-gradient">
            <stop offset="0%" stopColor="#ff4444" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ff4444" stopOpacity="0" />
          </radialGradient>

          {/* Animated dash for cascade edges */}
          <style>{`
            @keyframes cascadeShake {
              0%, 100% { transform: translate(0, 0); }
              10% { transform: translate(-2px, 0); }
              20% { transform: translate(2px, 0); }
              30% { transform: translate(-2px, 0); }
              40% { transform: translate(2px, 0); }
              50% { transform: translate(0, 0); }
            }
            @keyframes cascadePulse {
              0%, 100% { opacity: 0.6; }
              50% { opacity: 1; }
            }
            @keyframes rippleExpand {
              0% { r: 0; opacity: 0.6; }
              100% { r: 60; opacity: 0; }
            }
            .cascade-shake {
              animation: cascadeShake 0.5s ease-in-out;
            }
            .cascade-pulse {
              animation: cascadePulse 1s ease-in-out infinite;
            }
          `}</style>
        </defs>

        {/* Background grid */}
        {!compact && (
          <g opacity="0.04">
            {Array.from({ length: Math.ceil(width / 40) }, (_, i) => (
              <line key={`v${i}`} x1={i * 40} y1={0} x2={i * 40} y2={height} stroke="#fff" strokeWidth="0.5" />
            ))}
            {Array.from({ length: Math.ceil(height / 40) }, (_, i) => (
              <line key={`h${i}`} x1={0} y1={i * 40} x2={width} y2={i * 40} stroke="#fff" strokeWidth="0.5" />
            ))}
          </g>
        )}

        {/* Edges */}
        <g>
          {EDGES.map((edge, i) => {
            const from = positions[edge.from]
            const to = positions[edge.to]
            if (!from || !to) return null

            const style = getEdgeStyle(edge.from, edge.to)

            let path
            if (!edge.curve) {
              path = `M${from.x},${from.y - nodeH / 2} L${to.x},${to.y + nodeH / 2}`
            } else {
              const midY = (from.y - nodeH / 2 + to.y + nodeH / 2) / 2
              const curveX = from.x + (to.x - from.x) * 0.5 + (edge.from === 'd2' ? -50 : 50)
              path = `M${from.x},${from.y - nodeH / 2} Q${curveX},${midY} ${to.x},${to.y + nodeH / 2}`
            }

            return (
              <path
                key={i}
                d={path}
                fill="none"
                stroke={style.stroke}
                strokeWidth={style.width}
                strokeDasharray={style.dash}
                opacity={style.opacity}
                className={affectedDomains.has(edge.to) && (edge.from === selectedDomain || affectedDomains.has(edge.from)) ? 'cascade-pulse' : ''}
              />
            )
          })}
        </g>

        {/* Ripple effects on affected nodes */}
        {cascadeActive && Array.from(affectedDomains).map((id) => {
          const pos = positions[id]
          if (!pos) return null
          return (
            <circle
              key={`ripple-${id}`}
              cx={pos.x}
              cy={pos.y}
              fill="url(#ripple-gradient)"
              r="0"
            >
              <animate attributeName="r" from="0" to="60" dur="1.2s" begin="0s" fill="freeze" />
              <animate attributeName="opacity" from="0.5" to="0" dur="1.2s" begin="0s" fill="freeze" />
            </circle>
          )
        })}

        {/* Ripple on source */}
        {cascadeActive && selectedDomain && positions[selectedDomain] && (
          <>
            <circle
              cx={positions[selectedDomain].x}
              cy={positions[selectedDomain].y}
              fill="url(#ripple-gradient)"
              r="0"
            >
              <animate attributeName="r" from="10" to="80" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
            </circle>
          </>
        )}

        {/* Domain nodes */}
        <g>
          {framework.map((domain) => {
            const pos = positions[domain.id]
            if (!pos) return null

            const style = getNodeStyle(domain.id)
            const isClickable = !cascadeActive && domain.id !== 'd8' && domain.id !== 'd9'
            const isSource = domain.id === selectedDomain
            const isAffected = affectedDomains.has(domain.id)
            const cascadeTier = cascadeTiers[domain.id]

            return (
              <g
                key={domain.id}
                className={isSource ? 'cascade-shake' : ''}
                style={{ cursor: isClickable ? 'pointer' : 'default' }}
                onClick={() => {
                  if (isClickable) triggerCascade(domain.id)
                }}
              >
                {/* INDEPENDENT badge for D8/D9 */}
                {style.independent && (
                  <>
                    <rect
                      x={pos.x - 38}
                      y={pos.y - nodeH / 2 - 16}
                      width={76}
                      height={14}
                      rx={7}
                      fill="#444"
                      opacity={0.6}
                    />
                    <text
                      x={pos.x}
                      y={pos.y - nodeH / 2 - 9}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#999"
                      fontSize="8"
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      INDEPENDENT
                    </text>
                  </>
                )}

                {/* Node rect */}
                <rect
                  x={pos.x - nodeW / 2}
                  y={pos.y - nodeH / 2}
                  width={nodeW}
                  height={nodeH}
                  rx={compact ? 8 : 10}
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth={isSource || isAffected ? 2.5 : 1.5}
                  strokeDasharray={style.independent ? '6,4' : 'none'}
                  opacity={style.independent ? 0.7 : 1}
                  filter={style.glow ? 'url(#cascade-glow)' : undefined}
                />

                {/* Domain number */}
                <circle
                  cx={pos.x - nodeW / 2 + (compact ? 14 : 18)}
                  cy={pos.y}
                  r={compact ? 10 : 12}
                  fill={style.stroke}
                  opacity={0.25}
                />
                <text
                  x={pos.x - nodeW / 2 + (compact ? 14 : 18)}
                  y={pos.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={style.textColor}
                  fontSize={compact ? 9 : 11}
                  fontWeight="700"
                  fontFamily="monospace"
                >
                  {domain.domain}
                </text>

                {/* Domain name */}
                <text
                  x={pos.x + 6}
                  y={pos.y - (compact ? 4 : 7)}
                  textAnchor="middle"
                  fill={style.textColor}
                  fontSize={fontSize}
                  fontWeight="600"
                  fontFamily="Plus Jakarta Sans, Inter, sans-serif"
                >
                  {domain.name}
                </text>

                {/* Status text */}
                <text
                  x={pos.x + 6}
                  y={pos.y + (compact ? 10 : 12)}
                  textAnchor="middle"
                  fill={style.textColor}
                  fontSize={subFontSize}
                  opacity={0.7}
                  fontFamily="Inter, sans-serif"
                >
                  {isSource
                    ? '\u26A0 WEAKENED'
                    : isAffected
                      ? `\u2191 Cascade impact (tier ${cascadeTier})`
                      : isIndependent(domain.id)
                        ? 'Independent domain'
                        : cascadeActive
                          ? '\u2713 Stable'
                          : domain.subtitle
                  }
                </text>

                {/* Impact severity bar for affected nodes */}
                {isAffected && (
                  <>
                    <rect
                      x={pos.x - nodeW / 2 + 4}
                      y={pos.y + nodeH / 2 - 6}
                      width={nodeW - 8}
                      height={3}
                      rx={1.5}
                      fill="#2a1515"
                    />
                    <rect
                      x={pos.x - nodeW / 2 + 4}
                      y={pos.y + nodeH / 2 - 6}
                      width={(nodeW - 8) * Math.max(0.15, 1 - (cascadeTier || 1) * 0.15)}
                      height={3}
                      rx={1.5}
                      fill="#ff4444"
                      opacity={0.7}
                    >
                      <animate attributeName="width" from="0" to={(nodeW - 8) * Math.max(0.15, 1 - (cascadeTier || 1) * 0.15)} dur="0.6s" fill="freeze" />
                    </rect>
                  </>
                )}
              </g>
            )
          })}
        </g>

        {/* Cascade explanation overlay */}
        {cascadeActive && (
          <g>
            <text
              x={width / 2}
              y={compact ? 16 : 28}
              textAnchor="middle"
              fill="#ff6666"
              fontSize={compact ? 9 : 11}
              fontFamily="monospace"
              letterSpacing="2"
            >
              CASCADE IMPACT · WEAKNESS RIPPLES UPWARD
            </text>

            {/* Affected count */}
            <text
              x={width / 2}
              y={height - (compact ? 10 : 16)}
              textAnchor="middle"
              fill="#888"
              fontSize="10"
              fontFamily="monospace"
            >
              {affectedDomains.size} domain{affectedDomains.size !== 1 ? 's' : ''} affected by weakness in {framework.find(d => d.id === selectedDomain)?.name}
            </text>
          </g>
        )}

        {/* Idle title */}
        {!cascadeActive && !compact && (
          <text
            x={width / 2}
            y={28}
            textAnchor="middle"
            fill="#888"
            fontSize="11"
            fontFamily="monospace"
            letterSpacing="2"
          >
            CASCADE DEMO · CLICK A DOMAIN TO WEAKEN IT
          </text>
        )}
      </svg>

      {/* Domain selector buttons — always rendered to prevent layout shuffle */}
      {!compact && (
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
          <span className="text-xs text-warm-400 mr-1">{cascadeActive ? 'Try another:' : 'Weaken:'}</span>
          {framework.filter(d => d.id !== 'd8' && d.id !== 'd9').map((domain) => {
            const isSelected = cascadeActive && domain.id === selectedDomain
            return (
              <button
                key={domain.id}
                disabled={isSelected}
                onClick={() => {
                  if (cascadeActive) {
                    reset()
                    setTimeout(() => triggerCascade(domain.id), 100)
                  } else {
                    triggerCascade(domain.id)
                  }
                }}
                className={`text-xs px-3 py-1.5 rounded-md border transition-all font-medium ${
                  isSelected
                    ? 'bg-[#3a2020] text-coral-400 border-coral-500 ring-2 ring-coral-500/30 cursor-default opacity-80'
                    : 'bg-[#2a2a30] text-gray-400 hover:bg-[#3a2525] hover:text-coral-300 border-[#444] hover:border-coral-500'
                }`}
              >
                {domain.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
