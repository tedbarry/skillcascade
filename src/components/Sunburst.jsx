import { useRef, useEffect, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { ASSESSMENT_COLORS, ASSESSMENT_LABELS, ASSESSMENT_LEVELS } from '../data/framework.js'

/**
 * Domain colors — warm, distinct, accessible
 * Used for ring 1 (domains) with lighter/darker variants for inner rings
 */
const DOMAIN_COLORS = {
  d1: '#e07b6e', // Regulation — warm coral
  d2: '#d4956a', // Self-Awareness — amber
  d3: '#c9a84c', // Executive Function — gold
  d4: '#8fb570', // Problem Solving — lime-sage
  d5: '#5da87a', // Communication — sage
  d6: '#4a9e9e', // Social Understanding — teal
  d7: '#6889b5', // Identity — soft blue
  d8: '#8b7bb5', // Safety — lavender
  d9: '#a86e9a', // Support System — mauve
}

function getNodeColor(d, assessments) {
  const data = d.data

  // Center
  if (d.depth === 0) return '#fdf8f0'

  // For skill level (ring 3 leaf nodes or deeper): color by assessment
  if (data.level !== undefined && data.level !== ASSESSMENT_LEVELS.NOT_ASSESSED) {
    return ASSESSMENT_COLORS[data.level]
  }

  // For skill groups / sub-areas: compute average of children
  if (d.children || d._children) {
    const leaves = d.leaves()
    const assessed = leaves.filter(
      (l) => l.data.level !== undefined && l.data.level !== ASSESSMENT_LEVELS.NOT_ASSESSED
    )
    if (assessed.length > 0) {
      const avg = assessed.reduce((sum, l) => sum + l.data.level, 0) / assessed.length
      if (avg >= 2.5) return ASSESSMENT_COLORS[ASSESSMENT_LEVELS.SOLID]
      if (avg >= 1.5) return ASSESSMENT_COLORS[ASSESSMENT_LEVELS.DEVELOPING]
      return ASSESSMENT_COLORS[ASSESSMENT_LEVELS.NEEDS_WORK]
    }
  }

  // Domain ring: use domain color
  const domainId = getDomainId(d)
  if (domainId && DOMAIN_COLORS[domainId]) {
    const opacity = d.depth === 1 ? 1 : d.depth === 2 ? 0.7 : 0.5
    return adjustOpacity(DOMAIN_COLORS[domainId], opacity)
  }

  return ASSESSMENT_COLORS[ASSESSMENT_LEVELS.NOT_ASSESSED]
}

function getDomainId(d) {
  let node = d
  while (node.depth > 1 && node.parent) node = node.parent
  return node.data?.id || null
}

function adjustOpacity(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${opacity})`
}

function arcVisible(d) {
  return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0
}

function labelVisible(d) {
  return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03
}

function labelTransform(d, radius) {
  const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI
  const y = ((d.y0 + d.y1) / 2) * radius
  return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`
}

function truncateLabel(text, maxLen) {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 1) + '…'
}

export default function Sunburst({ data, assessments = {}, width = 800, height = 800, onSelect }) {
  const svgRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [breadcrumb, setBreadcrumb] = useState([])

  const handleClick = useCallback(
    (event, p, root, arc, label, parent, svg, radius) => {
      if (!p) return

      // Build breadcrumb trail
      const trail = []
      let node = p
      while (node) {
        trail.unshift({ name: node.data.name, depth: node.depth })
        node = node.parent
      }
      setBreadcrumb(trail)

      if (onSelect && p.data.id) {
        onSelect(p.data)
      }

      parent.datum(p.parent || root)

      root.each(
        (d) =>
          (d.target = {
            x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            y0: Math.max(0, d.y0 - p.depth),
            y1: Math.max(0, d.y1 - p.depth),
          })
      )

      const t = svg.transition().duration(600)

      arc
        .transition(t)
        .tween('data', (d) => {
          const i = d3.interpolate(d.current, d.target)
          return (t) => (d.current = i(t))
        })
        .filter(function (d) {
          return +this.getAttribute('fill-opacity') || arcVisible(d.target)
        })
        .attr('fill-opacity', (d) => (arcVisible(d.target) ? (d.children ? 0.85 : 0.7) : 0))
        .attr('pointer-events', (d) => (arcVisible(d.target) ? 'auto' : 'none'))
        .attrTween('d', (d) => () => d3.arc()
          .startAngle((d) => d.current.x0)
          .endAngle((d) => d.current.x1)
          .padAngle((d) => Math.min((d.current.x1 - d.current.x0) / 2, 0.005))
          .padRadius(radius * 1.5)
          .innerRadius((d) => d.current.y0 * radius)
          .outerRadius((d) => Math.max(d.current.y0 * radius, d.current.y1 * radius - 1))(d)
        )

      label
        .filter(function (d) {
          return +this.getAttribute('fill-opacity') || labelVisible(d.target)
        })
        .transition(t)
        .attr('fill-opacity', (d) => +labelVisible(d.target))
        .attrTween('transform', (d) => () => labelTransform(d.current, radius))
    },
    [onSelect]
  )

  useEffect(() => {
    if (!svgRef.current || !data) return

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove()

    const radius = Math.min(width, height) / 6

    const hierarchy = d3
      .hierarchy(data)
      .sum((d) => d.value || 0)
      .sort((a, b) => b.value - a.value)

    const root = d3.partition().size([2 * Math.PI, hierarchy.height + 1])(hierarchy)

    root.each((d) => (d.current = d))

    const arcGen = d3
      .arc()
      .startAngle((d) => d.current.x0)
      .endAngle((d) => d.current.x1)
      .padAngle((d) => Math.min((d.current.x1 - d.current.x0) / 2, 0.005))
      .padRadius(radius * 1.5)
      .innerRadius((d) => d.current.y0 * radius)
      .outerRadius((d) => Math.max(d.current.y0 * radius, d.current.y1 * radius - 1))

    const svg = d3
      .select(svgRef.current)
      .attr('viewBox', [-width / 2, -height / 2, width, height])
      .style('font', '10px Inter, sans-serif')

    const g = svg.append('g')

    // Arcs
    const path = g
      .append('g')
      .selectAll('path')
      .data(root.descendants().slice(1))
      .join('path')
      .attr('fill', (d) => getNodeColor(d, assessments))
      .attr('fill-opacity', (d) => (arcVisible(d.current) ? (d.children ? 0.85 : 0.7) : 0))
      .attr('pointer-events', (d) => (arcVisible(d.current) ? 'auto' : 'none'))
      .attr('d', (d) => arcGen(d))
      .style('cursor', 'pointer')
      .style('stroke', '#fdf8f0')
      .style('stroke-width', '0.5px')

    // Hover
    path
      .on('mouseenter', (event, d) => {
        const trail = []
        let node = d
        while (node.parent) {
          trail.unshift(node.data.name)
          node = node.parent
        }

        const leaves = d.leaves ? d.leaves() : [d]
        const assessed = leaves.filter(
          (l) => l.data.level !== undefined && l.data.level !== ASSESSMENT_LEVELS.NOT_ASSESSED
        )
        const avgLevel =
          assessed.length > 0
            ? assessed.reduce((sum, l) => sum + l.data.level, 0) / assessed.length
            : null

        setTooltip({
          x: event.offsetX,
          y: event.offsetY,
          name: d.data.name,
          path: trail.join(' → '),
          depth: d.depth,
          level:
            d.data.level !== undefined
              ? ASSESSMENT_LABELS[d.data.level]
              : avgLevel !== null
                ? `Avg: ${avgLevel.toFixed(1)}/3`
                : 'Not assessed',
          childCount: leaves.length,
          assessedCount: assessed.length,
        })

        d3.select(event.currentTarget)
          .attr('fill-opacity', 1)
          .style('stroke', '#3d2a1c')
          .style('stroke-width', '1.5px')
      })
      .on('mousemove', (event) => {
        setTooltip((prev) => (prev ? { ...prev, x: event.offsetX, y: event.offsetY } : null))
      })
      .on('mouseleave', (event, d) => {
        setTooltip(null)
        d3.select(event.currentTarget)
          .attr('fill-opacity', d.children ? 0.85 : 0.7)
          .style('stroke', '#fdf8f0')
          .style('stroke-width', '0.5px')
      })

    // Click to zoom
    path.on('click', (event, d) =>
      handleClick(event, d, root, path, label, parentCircle, svg, radius)
    )

    // Labels
    const label = g
      .append('g')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .selectAll('text')
      .data(root.descendants().slice(1))
      .join('text')
      .attr('dy', '0.35em')
      .attr('fill', '#3d2a1c')
      .attr('fill-opacity', (d) => +labelVisible(d.current))
      .attr('transform', (d) => labelTransform(d.current, radius))
      .style('font-size', (d) => (d.depth === 1 ? '11px' : d.depth === 2 ? '9px' : '7.5px'))
      .style('font-weight', (d) => (d.depth === 1 ? '600' : '400'))
      .text((d) => {
        const maxLen = d.depth === 1 ? 16 : d.depth === 2 ? 14 : 12
        return truncateLabel(d.data.name, maxLen)
      })

    // Center circle — click to zoom out
    const parentCircle = g
      .append('circle')
      .datum(root)
      .attr('r', radius)
      .attr('fill', '#fdf8f0')
      .attr('pointer-events', 'all')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        if (d.parent) {
          handleClick(event, d.parent || root, root, path, label, parentCircle, svg, radius)
        } else {
          // Already at root, reset breadcrumb
          setBreadcrumb([])
        }
      })

    // Center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.2em')
      .style('font-size', '14px')
      .style('font-weight', '700')
      .style('font-family', 'Plus Jakarta Sans, Inter, sans-serif')
      .style('fill', '#3d2a1c')
      .text('Client')
      .attr('pointer-events', 'none')

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.2em')
      .style('font-size', '10px')
      .style('fill', '#9a6740')
      .text('click to explore')
      .attr('pointer-events', 'none')

    // Set initial breadcrumb
    setBreadcrumb([{ name: 'Client', depth: 0 }])
  }, [data, assessments, width, height, handleClick])

  return (
    <div className="relative">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-3 text-sm text-warm-600 min-h-[28px] flex-wrap">
        {breadcrumb.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-warm-400">›</span>}
            <span className={i === breadcrumb.length - 1 ? 'text-warm-800 font-medium' : ''}>
              {item.name}
            </span>
          </span>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-warm-600">
        {Object.entries(ASSESSMENT_LABELS).map(([level, label]) => (
          <div key={level} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: ASSESSMENT_COLORS[level] }}
            />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="relative inline-block">
        <svg ref={svgRef} width={width} height={height} />

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 bg-white/95 backdrop-blur-sm border border-warm-200 rounded-lg shadow-lg px-4 py-3 max-w-xs"
            style={{
              left: tooltip.x + 16,
              top: tooltip.y - 8,
              transform: tooltip.x > width / 2 ? 'translateX(-110%)' : 'none',
            }}
          >
            <div className="font-semibold text-warm-800 text-sm mb-1">{tooltip.name}</div>
            <div className="text-xs text-warm-500 mb-2">{tooltip.path}</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-warm-700 font-medium">{tooltip.level}</span>
              {tooltip.depth < 4 && tooltip.childCount > 1 && (
                <span className="text-warm-400">
                  ({tooltip.assessedCount}/{tooltip.childCount} skills assessed)
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
