import { useMemo, useRef, useState, useCallback, memo } from 'react'
import { chord, ribbon } from 'd3-chord'
import { arc } from 'd3-shape'
import { descending } from 'd3-array'
import { framework, DOMAIN_DEPENDENCIES } from '../../data/framework.js'
import useResponsive from '../../hooks/useResponsive.js'
import ExplorerTooltip from './ExplorerTooltip.jsx'
import { DOMAIN_COLORS } from '../../constants/colors.js'

const DOMAIN_IDS = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9']

function getDomainName(id) {
  return framework.find(d => d.id === id)?.name || id
}

/**
 * DomainChordView — Level 1 of the Dependency Explorer.
 * Desktop/Tablet: D3 chord diagram with 9 domain arcs and ribbons.
 * Phone: 9x9 compact heatmap grid.
 */
export default memo(function DomainChordView({
  chordData,
  domainHealth,
  assessments,
  onDrillToDomain,
  onShowFullWeb,
}) {
  const { isPhone } = useResponsive()
  const containerRef = useRef(null)
  const [hoveredDomain, setHoveredDomain] = useState(null)
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: null })

  const { matrix, domainIds } = chordData

  // D3 chord layout
  const chordLayout = useMemo(() => {
    const chordGen = chord()
      .padAngle(0.06)
      .sortSubgroups(descending)
    return chordGen(matrix)
  }, [matrix])

  const arcGen = useMemo(() => arc().innerRadius(160).outerRadius(180), [])
  const healthArcGen = useMemo(() => arc().innerRadius(145).outerRadius(158), [])
  const ribbonGen = useMemo(() => ribbon().radius(140), [])

  const handleArcHover = useCallback((e, i) => {
    setHoveredDomain(i)
    const domainId = domainIds[i]
    const health = domainHealth[domainId]
    const pct = health ? Math.round(health.healthPct * 100) : 0
    const connections = matrix[i].reduce((sum, v) => sum + (v > 0 ? 1 : 0), 0)

    // Prerequisite health summary
    const prereqs = DOMAIN_DEPENDENCIES[domainId] || []
    const metPrereqs = prereqs.filter(pid => {
      const ph = domainHealth[pid]
      return ph && ph.assessed > 0 && ph.avg >= 2.0
    })

    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      content: (
        <div>
          <div className="font-medium">{getDomainName(domainId)}</div>
          <div className="text-gray-300 mt-1">{pct}% health</div>
          <div className="text-gray-400">{connections} connections</div>
          {prereqs.length > 0 && (
            <div className={`mt-1 text-[10px] ${metPrereqs.length === prereqs.length ? 'text-green-400' : 'text-amber-400'}`}>
              Prerequisites: {metPrereqs.length}/{prereqs.length} met
            </div>
          )}
          {prereqs.length === 0 && (
            <div className="mt-1 text-[10px] text-green-400">Foundational domain</div>
          )}
          <div className="text-gray-500 mt-1 text-[10px]">Click to explore</div>
        </div>
      ),
    })
  }, [domainIds, domainHealth, matrix])

  const handleArcLeave = useCallback(() => {
    setHoveredDomain(null)
    setTooltip(t => ({ ...t, visible: false }))
  }, [])

  const handleArcTouch = useCallback((e, i) => {
    e.preventDefault()
    handleArcHover(e.touches[0], i)
  }, [handleArcHover])

  const handleArcClick = useCallback((i) => {
    onDrillToDomain(domainIds[i])
  }, [domainIds, onDrillToDomain])

  // Phone: heatmap grid
  if (isPhone) {
    return (
      <div ref={containerRef} className="flex-1 overflow-auto p-4 relative">
        <div className="text-center mb-4">
          <h3 className="text-sm font-semibold text-gray-300">Domain Dependencies</h3>
          <p className="text-[11px] text-gray-500 mt-1">
            Each number shows how many sub-areas in the row depend on the column.
            <span className="text-gray-400 font-medium"> Tap any row to zoom in.</span>
          </p>
        </div>

        {/* Column headers */}
        <div className="flex items-end mb-1 pl-[100px]">
          {DOMAIN_IDS.map((id, i) => (
            <div
              key={id}
              className="flex-1 text-center text-[9px] text-gray-500 font-medium"
              style={{ minWidth: 32 }}
            >
              {`D${i + 1}`}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        {DOMAIN_IDS.map((rowId, ri) => {
          const health = domainHealth[rowId]
          const pct = health ? Math.round(health.healthPct * 100) : 0
          return (
            <button
              key={rowId}
              onClick={() => onDrillToDomain(rowId)}
              className="flex items-center w-full min-h-[44px] hover:bg-gray-800/50 rounded transition-colors"
            >
              {/* Row label */}
              <div className="w-[100px] flex items-center gap-1.5 flex-shrink-0 pr-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: DOMAIN_COLORS[rowId] }} />
                <span className="text-[10px] text-gray-400 truncate">{`D${ri + 1}`}</span>
                <span className="text-[9px] text-gray-600 ml-auto">{pct}%</span>
              </div>

              {/* Cells */}
              {DOMAIN_IDS.map((colId, ci) => {
                const count = matrix[ri][ci]
                const maxCount = Math.max(1, ...matrix.flat())
                const intensity = count / maxCount
                const color = DOMAIN_COLORS[colId]
                return (
                  <div
                    key={colId}
                    className="flex-1 flex items-center justify-center"
                    style={{ minWidth: 32, height: 32 }}
                  >
                    {count > 0 ? (
                      <div
                        className="w-6 h-6 rounded-sm flex items-center justify-center text-[9px] font-medium"
                        style={{
                          backgroundColor: color + Math.round(intensity * 180 + 40).toString(16).padStart(2, '0'),
                          color: intensity > 0.5 ? '#fff' : '#ccc',
                        }}
                      >
                        {count}
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-sm bg-gray-800/30" />
                    )}
                  </div>
                )
              })}
            </button>
          )
        })}

        <div className="text-center mt-4">
          <p className="text-[10px] text-gray-600">
            Numbers show cross-domain sub-area dependencies.
            Row depends on column.
          </p>
        </div>

        {onShowFullWeb && (
          <button
            onClick={onShowFullWeb}
            className="mt-4 mx-auto flex items-center gap-2 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-4 py-2.5 transition-colors min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            View All Sub-Areas
          </button>
        )}
      </div>
    )
  }

  // Desktop/Tablet: Chord diagram
  const size = 460
  const cx = size / 2
  const cy = size / 2

  return (
    <div ref={containerRef} className="flex-1 overflow-auto flex flex-col items-center justify-center p-6 relative">
      <div className="text-center mb-4">
        <h3 className="text-sm font-semibold text-gray-300">Domain Dependencies</h3>
        <p className="text-[11px] text-gray-500 mt-1">
          Ribbons connect domains that share developmental prerequisites.
          <span className="text-gray-400 font-medium"> Click any domain to zoom in.</span>
        </p>
      </div>

      <svg width="100%" viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: size, maxHeight: size }} role="img" aria-label="Domain dependency chord diagram showing relationships between 9 developmental domains">
        <g transform={`translate(${cx},${cy})`}>
          {/* Ribbons — opacity encodes prerequisite health */}
          {chordLayout.map((chord, i) => {
            const srcDomain = domainIds[chord.source.index]
            const tgtDomain = domainIds[chord.target.index]
            const srcColor = DOMAIN_COLORS[srcDomain]
            const tgtColor = DOMAIN_COLORS[tgtDomain]
            const isHighlighted = hoveredDomain === null ||
              hoveredDomain === chord.source.index ||
              hoveredDomain === chord.target.index
            const gradId = `ribbon-grad-${i}`

            // Assessment-aware: source health affects ribbon visibility
            const srcHealth = domainHealth[srcDomain]?.healthPct ?? 0
            const srcAvg = domainHealth[srcDomain]?.avg ?? 0
            // Brighter if source is healthy (prereqs well-met), dimmer if struggling
            const healthBoost = srcAvg >= 2.0 ? 1.2 : srcAvg >= 1.5 ? 1.0 : 0.7
            const baseOpacity = isHighlighted ? 0.4 * healthBoost : 0.08
            // Red tint if source is struggling (< 1.5 avg)
            const useRedTint = srcAvg > 0 && srcAvg < 1.5

            return (
              <g key={i}>
                <defs>
                  <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={useRedTint ? '#f87171' : srcColor} />
                    <stop offset="100%" stopColor={tgtColor} />
                  </linearGradient>
                </defs>
                <path
                  d={ribbonGen(chord)}
                  fill={`url(#${gradId})`}
                  opacity={Math.min(0.6, baseOpacity)}
                  className="transition-opacity duration-200"
                  aria-label={`Dependency between ${getDomainName(srcDomain)} and ${getDomainName(tgtDomain)}`}
                />
              </g>
            )
          })}

          {/* Arcs */}
          {chordLayout.groups.map((group, i) => {
            const domainId = domainIds[i]
            const color = DOMAIN_COLORS[domainId]
            const health = domainHealth[domainId]
            const healthPct = health?.healthPct ?? 0
            const isHighlighted = hoveredDomain === null || hoveredDomain === i

            // Inner health arc — shows health% as partial fill
            const healthAngle = group.startAngle + (group.endAngle - group.startAngle) * healthPct

            return (
              <g key={domainId} className="cursor-pointer">
                {/* Main arc */}
                <path
                  d={arcGen(group)}
                  fill={color}
                  opacity={isHighlighted ? 1 : 0.3}
                  onMouseEnter={(e) => handleArcHover(e, i)}
                  onMouseLeave={handleArcLeave}
                  onTouchStart={(e) => handleArcTouch(e, i)}
                  onClick={() => handleArcClick(i)}
                  className="transition-opacity duration-200"
                  role="button"
                  aria-label={`${getDomainName(domainId)}, ${Math.round(healthPct * 100)}% health. Press Enter to explore.`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleArcClick(i)
                    }
                  }}
                />

                {/* Health fill arc */}
                {healthPct > 0 && (
                  <path
                    d={healthArcGen({ startAngle: group.startAngle, endAngle: healthAngle })}
                    fill={color}
                    opacity={isHighlighted ? 0.5 : 0.15}
                    pointerEvents="none"
                  />
                )}

                {/* Domain label */}
                {(() => {
                  const midAngle = (group.startAngle + group.endAngle) / 2
                  const labelRadius = 198
                  const x = Math.sin(midAngle) * labelRadius
                  const y = -Math.cos(midAngle) * labelRadius
                  const rotation = (midAngle * 180 / Math.PI)
                  const flip = midAngle > Math.PI
                  return (
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${rotation + (flip ? 180 : 0)}, ${x}, ${y})`}
                      fill={isHighlighted ? '#e5e5e5' : '#666'}
                      fontSize={10}
                      fontWeight={500}
                      pointerEvents="none"
                      className="transition-all duration-200"
                    >
                      {`D${i + 1}`}
                    </text>
                  )
                })()}
              </g>
            )
          })}

          {/* Center label */}
          <text textAnchor="middle" dominantBaseline="central" fill="#888" fontSize={11} y={-6}>
            {hoveredDomain !== null ? getDomainName(domainIds[hoveredDomain]) : '9 Domains'}
          </text>
          <text textAnchor="middle" dominantBaseline="central" fill="#666" fontSize={9} y={10}>
            {hoveredDomain !== null
              ? `${Math.round((domainHealth[domainIds[hoveredDomain]]?.healthPct ?? 0) * 100)}% health`
              : 'Click to explore'
            }
          </text>
        </g>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 max-w-md">
        {DOMAIN_IDS.map((id, i) => (
          <button
            key={id}
            onClick={() => onDrillToDomain(id)}
            onMouseEnter={(e) => handleArcHover(e, i)}
            onMouseLeave={handleArcLeave}
            className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-white transition-colors min-h-[44px] px-1"
          >
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: DOMAIN_COLORS[id] }} />
            {getDomainName(id)}
          </button>
        ))}
      </div>

      {onShowFullWeb && (
        <button
          onClick={onShowFullWeb}
          className="mt-4 flex items-center gap-2 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-4 py-2.5 transition-colors min-h-[44px]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
          View All Sub-Areas
        </button>
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
})
