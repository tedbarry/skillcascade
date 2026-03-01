import { useRef, useEffect, useState, memo } from 'react'
import { hierarchy, partition } from 'd3-hierarchy'
import { arc } from 'd3-shape'
import { interpolate } from 'd3-interpolate'
import { select } from 'd3-selection'
import 'd3-transition' // side-effect: patches selection.prototype.transition
import { ASSESSMENT_COLORS, ASSESSMENT_LABELS, ASSESSMENT_LEVELS, isAssessed, framework } from '../data/framework.js'
import { DOMAIN_COLORS } from '../constants/colors.js'

/**
 * Domain colors — warm, distinct, accessible
 */
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

function getNodeColor(d, assessments) {
  if (d.depth === 0) return '#fdf8f0'

  // Leaf node (individual skill): color by assessment
  if (!d.children && !d._children) {
    const level = assessments[d.data.id] ?? null
    if (isAssessed(level)) {
      return ASSESSMENT_COLORS[level]
    }
  }

  // Branch node: compute average of assessed leaf descendants
  if (d.children || d._children) {
    const leaves = d.leaves()
    const assessed = leaves.filter((l) => {
      const level = assessments[l.data.id]
      return isAssessed(level)
    })
    if (assessed.length > 0) {
      const avg = assessed.reduce((sum, l) => sum + assessments[l.data.id], 0) / assessed.length
      if (avg >= 2.5) return ASSESSMENT_COLORS[ASSESSMENT_LEVELS.SOLID]
      if (avg >= 1.5) return ASSESSMENT_COLORS[ASSESSMENT_LEVELS.DEVELOPING]
      return ASSESSMENT_COLORS[ASSESSMENT_LEVELS.NEEDS_WORK]
    }
  }

  // Unassessed: use domain color with depth-based opacity
  const domainId = getDomainId(d)
  if (domainId && DOMAIN_COLORS[domainId]) {
    const opacity = d.depth === 1 ? 1 : d.depth === 2 ? 0.7 : 0.5
    return adjustOpacity(DOMAIN_COLORS[domainId], opacity)
  }

  return '#9ca3af'
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
  return text.slice(0, maxLen - 1) + '\u2026'
}

function getArcAriaLabel(d, assessments) {
  const depthLabel = d.depth === 1 ? 'Domain' : d.depth === 2 ? 'Sub-area' : 'Skill'
  const name = d.data.name

  // Leaf node: show individual assessment
  if (!d.children && !d._children) {
    const level = assessments[d.data.id] ?? null
    const levelLabel = isAssessed(level) ? (ASSESSMENT_LABELS[level] || 'Not assessed') : 'Not assessed'
    return `${depthLabel}: ${name}, ${levelLabel}. Press Enter to drill down.`
  }

  // Branch node: show average score
  const leaves = d.leaves()
  const assessed = leaves.filter((l) => {
    const level = assessments[l.data.id]
    return isAssessed(level)
  })
  const avgLevel =
    assessed.length > 0
      ? (assessed.reduce((sum, l) => sum + assessments[l.data.id], 0) / assessed.length).toFixed(1)
      : null

  const scoreText = avgLevel !== null
    ? `average score ${avgLevel} out of 3, ${assessed.length} of ${leaves.length} assessed`
    : 'not assessed'

  return `${depthLabel}: ${name}, ${scoreText}. Press Enter to drill down.`
}

export default memo(function Sunburst({ data, assessments = {}, width = 800, height = 800, onSelect }) {
  const svgRef = useRef(null)
  const chartRef = useRef(null)       // D3 elements: { root, path, label, parentCircle, svg, radius, arcGen }
  const assessmentsRef = useRef(assessments)
  const currentNodeRef = useRef(null)  // Currently zoomed-to node
  const [tooltip, setTooltip] = useState(null)
  const touchTimerRef = useRef(null)
  const [breadcrumb, setBreadcrumb] = useState([{ name: 'Client', depth: 0, node: null }])

  // Keep assessments ref current
  assessmentsRef.current = assessments

  // ---- Color-only update when assessments change (no D3 rebuild) ----
  useEffect(() => {
    if (!chartRef.current) return
    const { path } = chartRef.current
    path.attr('fill', (d) => getNodeColor(d, assessmentsRef.current))
  }, [assessments])

  // ---- Build breadcrumb trail from a node ----
  function buildBreadcrumb(node) {
    const trail = []
    let n = node
    while (n) {
      trail.unshift({ name: n.data.name, depth: n.depth, node: n })
      n = n.parent
    }
    return trail
  }

  // ---- Zoom to a given node ----
  function zoomTo(p) {
    const chart = chartRef.current
    if (!chart) return

    const { root, path, label, parentCircle, svg, radius } = chart

    currentNodeRef.current = p
    setBreadcrumb(buildBreadcrumb(p))

    if (onSelect && p.data.id) {
      onSelect(p.data)
    }

    // Update center circle datum to the new node's parent (or root)
    parentCircle.datum(p.parent || root)

    // Compute target positions
    root.each((d) => {
      d.target = {
        x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        y0: Math.max(0, d.y0 - p.depth),
        y1: Math.max(0, d.y1 - p.depth),
      }
    })

    const t = svg.transition().duration(600)

    const makeArc = arc()
      .startAngle((d) => d.current.x0)
      .endAngle((d) => d.current.x1)
      .padAngle((d) => Math.min((d.current.x1 - d.current.x0) / 2, 0.005))
      .padRadius(radius * 1.5)
      .innerRadius((d) => d.current.y0 * radius)
      .outerRadius((d) => Math.max(d.current.y0 * radius, d.current.y1 * radius - 1))

    path
      .transition(t)
      .tween('data', (d) => {
        const i = interpolate(d.current, d.target)
        return (t) => (d.current = i(t))
      })
      .filter(function (d) {
        return +this.getAttribute('fill-opacity') || arcVisible(d.target)
      })
      .attr('fill-opacity', (d) => (arcVisible(d.target) ? (d.children ? 0.85 : 0.7) : 0))
      .attr('pointer-events', (d) => (arcVisible(d.target) ? 'auto' : 'none'))
      .attr('tabindex', (d) => (arcVisible(d.target) ? 0 : -1))
      .attrTween('d', (d) => () => makeArc(d))

    label
      .filter(function (d) {
        return +this.getAttribute('fill-opacity') || labelVisible(d.target)
      })
      .transition(t)
      .attr('fill-opacity', (d) => +labelVisible(d.target))
      .attrTween('transform', (d) => () => labelTransform(d.current, radius))

    // Update label text for new arc sizes after zoom
    // Labels run radially — constrained by ring thickness, not arc length
    label.text((d) => {
      const target = d.target || d.current
      const ringThickness = (target.y1 - target.y0) * radius
      const charWidth = d.depth === 1 ? 6.5 : d.depth === 2 ? 5 : 4.3
      const defaultMax = d.depth === 1 ? 16 : d.depth === 2 ? 14 : 12
      const maxLen = Math.min(defaultMax, Math.floor(ringThickness * 0.9 / charWidth))
      if (maxLen < 3) return ''
      return truncateLabel(d.data.name, maxLen)
    })
  }

  // ---- Build D3 chart (only when structure or dimensions change) ----
  useEffect(() => {
    if (!svgRef.current || !data) return

    select(svgRef.current).selectAll('*').remove()

    const radius = Math.min(width, height) / 6

    const root_ = hierarchy(data)
      .sum((d) => d.value || 0)
      .sort((a, b) => b.value - a.value)

    const root = partition().size([2 * Math.PI, root_.height + 1])(root_)
    root.each((d) => (d.current = d))

    const arcGen = arc()
      .startAngle((d) => d.current.x0)
      .endAngle((d) => d.current.x1)
      .padAngle((d) => Math.min((d.current.x1 - d.current.x0) / 2, 0.005))
      .padRadius(radius * 1.5)
      .innerRadius((d) => d.current.y0 * radius)
      .outerRadius((d) => Math.max(d.current.y0 * radius, d.current.y1 * radius - 1))

    const svg = select(svgRef.current)
      .attr('viewBox', [-width / 2, -height / 2, width, height])
      .style('font', '10px Inter, sans-serif')

    const g = svg.append('g')

    // Arcs
    const path = g
      .append('g')
      .selectAll('path')
      .data(root.descendants().slice(1))
      .join('path')
      .attr('fill', (d) => getNodeColor(d, assessmentsRef.current))
      .attr('fill-opacity', (d) => (arcVisible(d.current) ? (d.children ? 0.85 : 0.7) : 0))
      .attr('pointer-events', (d) => (arcVisible(d.current) ? 'auto' : 'none'))
      .attr('d', (d) => arcGen(d))
      .style('cursor', 'pointer')
      .style('stroke', '#fdf8f0')
      .style('stroke-width', '0.5px')
      .attr('role', 'button')
      .attr('aria-label', (d) => getArcAriaLabel(d, assessmentsRef.current))
      .attr('tabindex', (d) => (arcVisible(d.current) ? 0 : -1))
      .on('keydown', (event, d) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          zoomTo(d)
        }
      })

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
        const assessed = leaves.filter((l) => {
          const level = assessmentsRef.current[l.data.id]
          return isAssessed(level)
        })
        const avgLevel =
          assessed.length > 0
            ? assessed.reduce((sum, l) => sum + assessmentsRef.current[l.data.id], 0) / assessed.length
            : null

        const skillLevel = assessmentsRef.current[d.data.id]

        setTooltip({
          x: event.offsetX,
          y: event.offsetY,
          name: d.data.name,
          path: trail.join(' \u2192 '),
          depth: d.depth,
          level:
            isAssessed(skillLevel)
              ? ASSESSMENT_LABELS[skillLevel]
              : avgLevel !== null
                ? `Avg: ${avgLevel.toFixed(1)}/3`
                : 'Not assessed',
          childCount: leaves.length,
          assessedCount: assessed.length,
        })

        select(event.currentTarget)
          .attr('fill-opacity', 1)
          .style('stroke', '#3d2a1c')
          .style('stroke-width', '1.5px')
      })
      .on('mousemove', (event) => {
        setTooltip((prev) => (prev ? { ...prev, x: event.offsetX, y: event.offsetY } : null))
      })
      .on('mouseleave', (event, d) => {
        setTooltip(null)
        select(event.currentTarget)
          .attr('fill-opacity', d.children ? 0.85 : 0.7)
          .style('stroke', '#fdf8f0')
          .style('stroke-width', '0.5px')
      })
      .on('touchend', (event, d) => {
        const svgRect = svgRef.current.getBoundingClientRect()
        const touch = event.changedTouches[0]

        const trail = []
        let node = d
        while (node.parent) {
          trail.unshift(node.data.name)
          node = node.parent
        }

        const leaves = d.leaves ? d.leaves() : [d]
        const assessed = leaves.filter((l) => {
          const level = assessmentsRef.current[l.data.id]
          return isAssessed(level)
        })
        const avgLevel =
          assessed.length > 0
            ? assessed.reduce((sum, l) => sum + assessmentsRef.current[l.data.id], 0) / assessed.length
            : null

        const skillLevel = assessmentsRef.current[d.data.id]

        setTooltip({
          x: touch.clientX - svgRect.left,
          y: touch.clientY - svgRect.top,
          name: d.data.name,
          path: trail.join(' \u2192 '),
          depth: d.depth,
          level:
            isAssessed(skillLevel)
              ? ASSESSMENT_LABELS[skillLevel]
              : avgLevel !== null
                ? `Avg: ${avgLevel.toFixed(1)}/3`
                : 'Not assessed',
          childCount: leaves.length,
          assessedCount: assessed.length,
        })

        select(event.currentTarget)
          .attr('fill-opacity', 1)
          .style('stroke', '#3d2a1c')
          .style('stroke-width', '1.5px')

        if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
        touchTimerRef.current = setTimeout(() => {
          setTooltip(null)
          select(event.currentTarget)
            .attr('fill-opacity', d.children ? 0.85 : 0.7)
            .style('stroke', '#fdf8f0')
            .style('stroke-width', '0.5px')
        }, 3000)
      })

    // Click to zoom in
    path.on('click', (event, d) => zoomTo(d))

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
        // Labels run radially — constrained by ring thickness, not arc length
        const ringThickness = (d.current.y1 - d.current.y0) * radius
        const charWidth = d.depth === 1 ? 6.5 : d.depth === 2 ? 5 : 4.3
        const defaultMax = d.depth === 1 ? 16 : d.depth === 2 ? 14 : 12
        const maxLen = Math.min(defaultMax, Math.floor(ringThickness * 0.9 / charWidth))
        if (maxLen < 3) return ''
        return truncateLabel(d.data.name, maxLen)
      })

    // Center circle — click to zoom OUT
    const parentCircle = g
      .append('circle')
      .datum(root)
      .attr('r', radius)
      .attr('fill', '#fdf8f0')
      .attr('pointer-events', 'all')
      .style('cursor', 'pointer')
      .attr('role', 'button')
      .attr('aria-label', 'Go up one level. Press Enter to zoom out.')
      .attr('tabindex', 0)
      .on('click', () => {
        // Zoom out one level: go to the parent of the current zoomed node
        const current = currentNodeRef.current || root
        if (current.parent) {
          zoomTo(current.parent)
        }
        // Already at root — do nothing
      })
      .on('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          const current = currentNodeRef.current || root
          if (current.parent) {
            zoomTo(current.parent)
          }
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

    // Store refs
    chartRef.current = { root, path, label, parentCircle, svg, radius, arcGen }
    currentNodeRef.current = root
    setBreadcrumb([{ name: 'Client', depth: 0, node: root }])
  }, [data, width, height]) // NOT assessments — that's handled by the color-only effect

  return (
    <div className="relative">
      {/* Breadcrumb — clickable navigation */}
      <div className="flex items-center gap-1.5 mb-3 text-sm text-warm-600 min-h-[28px] flex-wrap">
        {breadcrumb.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-warm-400">{'›'}</span>}
            {i < breadcrumb.length - 1 ? (
              <button
                onClick={() => {
                  if (item.node) zoomTo(item.node)
                }}
                className="text-sage-600 hover:text-sage-800 hover:underline transition-colors"
              >
                {item.name}
              </button>
            ) : (
              <span className="text-warm-800 font-medium">{item.name}</span>
            )}
          </span>
        ))}
      </div>

      {/* Chart */}
      <div className="relative inline-block">
        <svg ref={svgRef} width={width} height={height} role="img" aria-label="Skills sunburst chart showing assessment levels across domains" />

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

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-warm-600">
        {[
          { label: 'Not Assessed', color: 'var(--color-not-assessed)' },
          { label: 'Needs Work', color: 'var(--color-needs-work)' },
          { label: 'Developing', color: 'var(--color-developing)' },
          { label: 'Solid', color: 'var(--color-solid)' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
})
