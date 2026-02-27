import { useMemo, useRef, useState, useCallback, memo } from 'react'
import { linkHorizontal } from 'd3-shape'
import { framework } from '../../data/framework.js'
import { getDomainFromId } from '../../data/skillDependencies.js'
import useResponsive from '../../hooks/useResponsive.js'
import ExplorerTooltip from './ExplorerTooltip.jsx'

const DOMAIN_COLORS = {
  d1: '#e07b6e', d2: '#d4956a', d3: '#c9a84c', d4: '#8fb570',
  d5: '#5da87a', d6: '#4a9e9e', d7: '#6889b5', d8: '#8b7bb5', d9: '#a86e9a',
}

const LEVEL_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e'] // 0,1,2,3

function getStatusColor(level) {
  return LEVEL_COLORS[level] ?? '#666'
}

function getStatusLabel(level) {
  return ['Not assessed', 'Needs work', 'Developing', 'Mastered'][level] ?? 'Unknown'
}

/**
 * SkillExplorerView — Level 3 of the Dependency Explorer.
 * Shows upstream prerequisites and downstream dependents for a selected skill.
 * Desktop: horizontal tree. Phone: vertical accordion.
 */
export default memo(function SkillExplorerView({
  explorer,
  focusSkillId,
  focusSubAreaId,
  assessments,
  onRecenterSkill,
  onDrillToSkill,
}) {
  const { isPhone } = useResponsive()
  const containerRef = useRef(null)
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: null })
  const [expandedUpstream, setExpandedUpstream] = useState(true)
  const [expandedDownstream, setExpandedDownstream] = useState(true)

  // If we came from a sub-area click, show skill picker first
  const subAreaSkills = useMemo(() => {
    if (!focusSubAreaId || focusSkillId) return null
    return explorer.getSubAreaSkills(focusSubAreaId)
  }, [focusSubAreaId, focusSkillId, explorer])

  // Get tree data for the focused skill
  const treeData = useMemo(() => {
    if (!focusSkillId) return null
    return explorer.getSkillTree(focusSkillId)
  }, [focusSkillId, explorer])

  const handleNodeHover = useCallback((e, skill, type) => {
    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      content: (
        <div>
          <div className="font-medium">{skill.name}</div>
          <div className="text-gray-300 mt-1">Tier {skill.tier} · {getStatusLabel(skill.level)}</div>
          {type && <div className="text-gray-400">{type}</div>}
          <div className="text-gray-500 mt-1 text-[10px]">Click to recenter</div>
        </div>
      ),
    })
  }, [])

  const handleNodeLeave = useCallback(() => {
    setTooltip(t => ({ ...t, visible: false }))
  }, [])

  // Skill picker for sub-area drill-down
  if (subAreaSkills && !focusSkillId) {
    const domainId = getDomainFromId(focusSubAreaId)
    const domain = framework.find(d => d.id === domainId)
    const subArea = domain?.subAreas.find(sa => sa.id === focusSubAreaId)
    const color = DOMAIN_COLORS[domainId] || '#888'

    return (
      <div ref={containerRef} className="flex-1 overflow-auto p-4 relative">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <h3 className="text-sm font-semibold text-gray-300">{subArea?.name}</h3>
          </div>
          <p className="text-[11px] text-gray-500">Select a skill to explore its dependencies</p>
        </div>

        <div className="space-y-1.5">
          {subAreaSkills.map(skill => {
            const statusColor = getStatusColor(skill.level)
            return (
              <button
                key={skill.id}
                onClick={() => onDrillToSkill(skill.id)}
                className="w-full flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-left hover:border-gray-600 transition-colors min-h-[44px]"
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-200 truncate">{skill.name}</div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                    <span>Tier {skill.tier}</span>
                    <span>{getStatusLabel(skill.level)}</span>
                    {skill.hasPrereqs && <span className="text-amber-500">has prereqs</span>}
                    {skill.hasDependents && <span className="text-blue-400">has dependents</span>}
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (!treeData || !treeData.root) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        Select a skill to explore its dependencies
      </div>
    )
  }

  const { root, upstream, downstream } = treeData

  // Phone: vertical accordion layout
  if (isPhone) {
    return (
      <div ref={containerRef} className="flex-1 overflow-auto p-4 relative">
        {/* Upstream prerequisites */}
        <button
          onClick={() => setExpandedUpstream(!expandedUpstream)}
          className="flex items-center justify-between w-full mb-2 min-h-[36px]"
        >
          <span className="text-xs font-semibold text-gray-400">
            Prerequisites ({upstream.length})
          </span>
          <svg
            className={`w-4 h-4 text-gray-600 transition-transform ${expandedUpstream ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expandedUpstream && (
          <div className="space-y-1.5 mb-4">
            {upstream.length === 0 && (
              <div className="text-[11px] text-gray-600 py-2">No prerequisites — foundational skill</div>
            )}
            {upstream.map(skill => (
              <SkillCard
                key={skill.id}
                skill={skill}
                type={skill.isDirect ? 'Direct prerequisite' : 'Structural prerequisite'}
                onSelect={() => onRecenterSkill(skill.id)}
                onHover={handleNodeHover}
                onLeave={handleNodeLeave}
                direction="upstream"
              />
            ))}
          </div>
        )}

        {/* Selected skill (center) */}
        <div className="bg-gray-800 border-2 border-amber-500/60 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DOMAIN_COLORS[root.domainId] }} />
            <span className="text-sm font-semibold text-gray-100">{root.name}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-gray-400">Tier {root.tier}</span>
            <span style={{ color: getStatusColor(root.level) }}>{getStatusLabel(root.level)}</span>
          </div>
        </div>

        {/* Downstream dependents */}
        <button
          onClick={() => setExpandedDownstream(!expandedDownstream)}
          className="flex items-center justify-between w-full mb-2 min-h-[36px]"
        >
          <span className="text-xs font-semibold text-gray-400">
            Dependents ({downstream.length})
          </span>
          <svg
            className={`w-4 h-4 text-gray-600 transition-transform ${expandedDownstream ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expandedDownstream && (
          <div className="space-y-1.5">
            {downstream.length === 0 && (
              <div className="text-[11px] text-gray-600 py-2">No dependents — end-of-chain skill</div>
            )}
            {downstream.map(skill => (
              <SkillCard
                key={skill.id}
                skill={skill}
                type="Depends on selected skill"
                onSelect={() => onRecenterSkill(skill.id)}
                onHover={handleNodeHover}
                onLeave={handleNodeLeave}
                direction="downstream"
              />
            ))}
          </div>
        )}

        <ExplorerTooltip
          x={tooltip.x}
          y={tooltip.y}
          content={tooltip.content}
          visible={tooltip.visible}
          containerRef={containerRef}
        />
      </div>
    )
  }

  // Desktop/Tablet: horizontal tree layout
  const treeWidth = 900
  const centerX = treeWidth / 2
  const nodeR = 6
  const levelH = 60

  // Build upstream tree (left side)
  const upstreamLayout = useMemo(() => {
    if (upstream.length === 0) return []
    // Group by domain for visual clustering
    const byDomain = {}
    upstream.forEach(s => {
      if (!byDomain[s.domainId]) byDomain[s.domainId] = []
      byDomain[s.domainId].push(s)
    })
    const domains = Object.keys(byDomain).sort()
    const totalNodes = upstream.length
    const nodes = []
    let idx = 0
    domains.forEach(domId => {
      byDomain[domId].forEach(skill => {
        const y = 60 + idx * levelH
        const x = centerX - 180
        nodes.push({ ...skill, x, y, idx: idx++ })
      })
    })
    return nodes
  }, [upstream, centerX])

  // Build downstream tree (right side)
  const downstreamLayout = useMemo(() => {
    if (downstream.length === 0) return []
    return downstream.map((skill, idx) => ({
      ...skill,
      x: centerX + 180,
      y: 60 + idx * levelH,
    }))
  }, [downstream, centerX])

  const rootY = Math.max(
    upstreamLayout.length > 0 ? (upstreamLayout[0].y + upstreamLayout[upstreamLayout.length - 1].y) / 2 : 200,
    downstreamLayout.length > 0 ? (downstreamLayout[0].y + downstreamLayout[downstreamLayout.length - 1].y) / 2 : 200,
    120
  )

  const svgHeight = Math.max(
    upstreamLayout.length * levelH + 120,
    downstreamLayout.length * levelH + 120,
    340
  )

  return (
    <div ref={containerRef} className="flex-1 overflow-auto relative">
      <svg width="100%" viewBox={`0 0 ${treeWidth} ${svgHeight}`}>
        <defs>
          <marker id="arrow-to-root" viewBox="0 0 6 6" refX={5} refY={3} markerWidth={5} markerHeight={5} orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#888" />
          </marker>
          <marker id="arrow-from-root" viewBox="0 0 6 6" refX={5} refY={3} markerWidth={5} markerHeight={5} orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#888" />
          </marker>
        </defs>

        {/* Upstream links */}
        {upstreamLayout.map(skill => {
          const path = linkHorizontal()({
            source: [skill.x + 80, skill.y],
            target: [centerX - 60, rootY],
          })
          return (
            <path
              key={`up-link-${skill.id}`}
              d={path}
              fill="none"
              stroke={DOMAIN_COLORS[skill.domainId] || '#666'}
              strokeWidth={1.2}
              opacity={0.4}
              markerEnd="url(#arrow-to-root)"
            />
          )
        })}

        {/* Downstream links */}
        {downstreamLayout.map(skill => {
          const path = linkHorizontal()({
            source: [centerX + 60, rootY],
            target: [skill.x - 80, skill.y],
          })
          return (
            <path
              key={`down-link-${skill.id}`}
              d={path}
              fill="none"
              stroke={DOMAIN_COLORS[skill.domainId] || '#666'}
              strokeWidth={1.2}
              opacity={0.4}
              markerEnd="url(#arrow-from-root)"
            />
          )
        })}

        {/* Upstream nodes */}
        {upstreamLayout.map(skill => (
          <g
            key={`up-${skill.id}`}
            transform={`translate(${skill.x - 80}, ${skill.y - 16})`}
            className="cursor-pointer"
            onMouseEnter={(e) => handleNodeHover(e, skill, skill.isDirect ? 'Direct prerequisite' : 'Structural')}
            onMouseLeave={handleNodeLeave}
            onTouchStart={(e) => { e.preventDefault(); handleNodeHover(e.touches[0], skill, 'Prerequisite') }}
            onClick={() => onRecenterSkill(skill.id)}
          >
            <rect
              width={160}
              height={32}
              rx={6}
              fill="#0f172a"
              stroke={getStatusColor(skill.level)}
              strokeWidth={1}
              opacity={0.9}
            />
            <circle cx={12} cy={16} r={5} fill={DOMAIN_COLORS[skill.domainId]} />
            <text x={22} y={13} fill="#ccc" fontSize={9} fontWeight={500}>
              {skill.name.length > 18 ? skill.name.slice(0, 16) + '\u2026' : skill.name}
            </text>
            <text x={22} y={24} fill="#888" fontSize={8}>
              T{skill.tier} · {getStatusLabel(skill.level)}
            </text>
          </g>
        ))}

        {/* Root node (center) */}
        <g transform={`translate(${centerX - 60}, ${rootY - 22})`}>
          <rect
            width={120}
            height={44}
            rx={8}
            fill="#1e293b"
            stroke="#f59e0b"
            strokeWidth={2}
          />
          <circle cx={14} cy={22} r={6} fill={DOMAIN_COLORS[root.domainId]} />
          <text x={26} y={17} fill="#f5f5f5" fontSize={10} fontWeight={600}>
            {root.name.length > 14 ? root.name.slice(0, 12) + '\u2026' : root.name}
          </text>
          <text x={26} y={30} fill="#aaa" fontSize={8}>
            Tier {root.tier} · {getStatusLabel(root.level)}
          </text>
        </g>

        {/* Downstream nodes */}
        {downstreamLayout.map(skill => (
          <g
            key={`down-${skill.id}`}
            transform={`translate(${skill.x}, ${skill.y - 16})`}
            className="cursor-pointer"
            onMouseEnter={(e) => handleNodeHover(e, skill, 'Depends on selected')}
            onMouseLeave={handleNodeLeave}
            onTouchStart={(e) => { e.preventDefault(); handleNodeHover(e.touches[0], skill, 'Dependent') }}
            onClick={() => onRecenterSkill(skill.id)}
          >
            <rect
              width={160}
              height={32}
              rx={6}
              fill="#0f172a"
              stroke={DOMAIN_COLORS[skill.domainId] + '80'}
              strokeWidth={1}
              opacity={0.9}
            />
            <circle cx={12} cy={16} r={5} fill={DOMAIN_COLORS[skill.domainId]} />
            <text x={22} y={13} fill="#ccc" fontSize={9} fontWeight={500}>
              {skill.name.length > 18 ? skill.name.slice(0, 16) + '\u2026' : skill.name}
            </text>
            <text x={22} y={24} fill="#888" fontSize={8}>
              T{skill.tier} · {getStatusLabel(skill.level)}
            </text>
          </g>
        ))}

        {/* Direction labels */}
        <text x={centerX - 200} y={30} fill="#666" fontSize={10} fontWeight={500} textAnchor="middle">
          Prerequisites ({upstream.length})
        </text>
        <text x={centerX + 200} y={30} fill="#666" fontSize={10} fontWeight={500} textAnchor="middle">
          Dependents ({downstream.length})
        </text>
      </svg>

      <ExplorerTooltip
        x={tooltip.x}
        y={tooltip.y}
        content={tooltip.content}
        visible={tooltip.visible}
        containerRef={containerRef}
      />
    </div>
  )
})

/** Shared mobile skill card */
function SkillCard({ skill, type, onSelect, onHover, onLeave, direction }) {
  const color = DOMAIN_COLORS[skill.domainId] || '#888'
  const statusColor = getStatusColor(skill.level)
  const domainName = framework.find(d => d.id === skill.domainId)?.name || ''

  return (
    <button
      onClick={onSelect}
      onMouseEnter={(e) => onHover(e, skill, type)}
      onMouseLeave={onLeave}
      onTouchStart={(e) => { e.preventDefault(); onHover(e.touches[0], skill, type) }}
      className="w-full flex items-center gap-2.5 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-left hover:border-gray-600 transition-colors min-h-[44px]"
    >
      {direction === 'upstream' && (
        <svg className="w-3 h-3 text-gray-600 flex-shrink-0 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-200 truncate">{skill.name}</div>
        <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
          <span style={{ color }}>{domainName}</span>
          <span>T{skill.tier}</span>
          <span style={{ color: statusColor }}>{getStatusLabel(skill.level)}</span>
        </div>
      </div>
      {direction === 'downstream' && (
        <svg className="w-3 h-3 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  )
}
