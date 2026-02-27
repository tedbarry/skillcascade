/**
 * Inline SVG chart generators for standalone HTML reports.
 * Pure functions returning SVG markup strings — no React or D3 dependencies.
 */

const LEVEL_COLORS = {
  0: '#9ca3af', // Not Assessed
  1: '#e8928a', // Needs Work
  2: '#e5b76a', // Developing
  3: '#7fb589', // Solid
}

const ADAPTIVE_BANDS = [
  { min: 0, max: 1.0, label: 'Low', color: '#fce0dd', textColor: '#b63a2e' },
  { min: 1.0, max: 1.5, label: 'Mod. Low', color: '#fef3c7', textColor: '#92400e' },
  { min: 1.5, max: 2.5, label: 'Adequate', color: '#fefce8', textColor: '#78350f' },
  { min: 2.5, max: 3.0, label: 'High', color: '#dce8de', textColor: '#31543d' },
]

function getBarColor(score) {
  if (score >= 2.5) return '#4f8460'
  if (score >= 1.5) return '#d4956a'
  if (score >= 1.0) return '#d97706'
  return '#d44d3f'
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/* ─────────────────────────────────────────────
   Domain Bar Chart (Vineland-style horizontal bars)
   ───────────────────────────────────────────── */

export function generateDomainBarChart(scores) {
  const W = 700, H = 360
  const leftMargin = 180, rightMargin = 50, topMargin = 40, bottomMargin = 30
  const chartW = W - leftMargin - rightMargin
  const chartH = H - topMargin - bottomMargin
  const rowH = chartH / 9
  const maxScore = 3

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:700px;font-family:'Segoe UI',system-ui,sans-serif;">`

  // Background bands
  for (const band of ADAPTIVE_BANDS) {
    const x1 = leftMargin + (band.min / maxScore) * chartW
    const x2 = leftMargin + (band.max / maxScore) * chartW
    svg += `<rect x="${x1}" y="${topMargin}" width="${x2 - x1}" height="${chartH}" fill="${band.color}" opacity="0.5"/>`
  }

  // Band labels at top
  for (const band of ADAPTIVE_BANDS) {
    const x = leftMargin + ((band.min + band.max) / 2 / maxScore) * chartW
    svg += `<text x="${x}" y="${topMargin - 8}" text-anchor="middle" font-size="9" fill="${band.textColor}" font-weight="600">${band.label}</text>`
  }

  // Gridlines
  for (const v of [1.0, 1.5, 2.0, 2.5]) {
    const x = leftMargin + (v / maxScore) * chartW
    svg += `<line x1="${x}" y1="${topMargin}" x2="${x}" y2="${topMargin + chartH}" stroke="#d4c4b0" stroke-width="0.5" stroke-dasharray="3,3"/>`
  }

  // Bars
  for (let i = 0; i < scores.length && i < 9; i++) {
    const s = scores[i]
    const y = topMargin + i * rowH
    const barH = rowH * 0.6
    const barY = y + (rowH - barH) / 2
    const barW = (Math.min(s.score, maxScore) / maxScore) * chartW
    const color = getBarColor(s.score)

    // Domain label
    svg += `<text x="${leftMargin - 8}" y="${y + rowH / 2 + 4}" text-anchor="end" font-size="11" fill="#3d2a1c" font-weight="500">${escapeHtml(s.domain)}</text>`

    // Bar background
    svg += `<rect x="${leftMargin}" y="${barY}" width="${chartW}" height="${barH}" rx="3" fill="#f5ebe0" opacity="0.4"/>`

    // Bar
    if (s.score > 0) {
      svg += `<rect x="${leftMargin}" y="${barY}" width="${Math.max(barW, 4)}" height="${barH}" rx="3" fill="${color}"/>`
    }

    // Score label
    const labelX = leftMargin + barW + 6
    svg += `<text x="${labelX}" y="${y + rowH / 2 + 4}" font-size="10" fill="#5f3e2a" font-weight="600">${s.score.toFixed(1)}</text>`

    // Coverage (assessed/total)
    svg += `<text x="${W - 8}" y="${y + rowH / 2 + 4}" text-anchor="end" font-size="9" fill="#9a8a7a">${s.assessed}/${s.total}</text>`
  }

  // X-axis labels
  for (let v = 0; v <= 3; v++) {
    const x = leftMargin + (v / maxScore) * chartW
    svg += `<text x="${x}" y="${topMargin + chartH + 16}" text-anchor="middle" font-size="9" fill="#7d5235">${v}</text>`
  }

  // Border
  svg += `<rect x="${leftMargin}" y="${topMargin}" width="${chartW}" height="${chartH}" fill="none" stroke="#d4c4b0" stroke-width="0.5"/>`

  svg += '</svg>'
  return svg
}

/* ─────────────────────────────────────────────
   Radar Chart (Spider chart — 9 domains)
   ───────────────────────────────────────────── */

export function generateRadarChart(scores) {
  const SIZE = 400
  const cx = SIZE / 2, cy = SIZE / 2
  const R = 140 // max radius
  const axes = scores.length
  const angleStep = (2 * Math.PI) / axes

  function polar(angle, r) {
    // Start from top (−π/2)
    const a = angle - Math.PI / 2
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  }

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="100%" style="max-width:400px;font-family:'Segoe UI',system-ui,sans-serif;">`

  // Concentric reference rings
  for (const level of [1, 2, 3]) {
    const r = (level / 3) * R
    let ring = ''
    for (let i = 0; i < axes; i++) {
      const p = polar(i * angleStep, r)
      ring += (i === 0 ? 'M' : 'L') + `${p.x.toFixed(1)},${p.y.toFixed(1)}`
    }
    ring += 'Z'
    svg += `<path d="${ring}" fill="none" stroke="#e8d5c0" stroke-width="0.5"/>`
    // Level label
    const labelP = polar(0, r)
    svg += `<text x="${labelP.x + 4}" y="${labelP.y - 3}" font-size="8" fill="#9a8a7a">${level}</text>`
  }

  // Axis lines
  for (let i = 0; i < axes; i++) {
    const p = polar(i * angleStep, R)
    svg += `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="#e8d5c0" stroke-width="0.5"/>`
  }

  // Data polygon
  let poly = ''
  const dataPoints = []
  for (let i = 0; i < axes; i++) {
    const score = Math.min(scores[i].score, 3)
    const r = (score / 3) * R
    const p = polar(i * angleStep, r)
    dataPoints.push(p)
    poly += (i === 0 ? 'M' : 'L') + `${p.x.toFixed(1)},${p.y.toFixed(1)}`
  }
  poly += 'Z'
  svg += `<path d="${poly}" fill="rgba(79,132,96,0.2)" stroke="#4f8460" stroke-width="2"/>`

  // Data points
  for (const p of dataPoints) {
    svg += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="#4f8460" stroke="white" stroke-width="1.5"/>`
  }

  // Domain labels (outside the chart)
  for (let i = 0; i < axes; i++) {
    const p = polar(i * angleStep, R + 28)
    const anchor = p.x < cx - 10 ? 'end' : p.x > cx + 10 ? 'start' : 'middle'

    // Truncate long names
    let name = scores[i].domain
    if (name.length > 18) name = name.substring(0, 17) + '\u2026'

    svg += `<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" font-size="9" fill="#3d2a1c" font-weight="500">${escapeHtml(name)}</text>`
  }

  svg += '</svg>'
  return svg
}

/* ─────────────────────────────────────────────
   Mastery Grid (ABLLS-R style color grid)
   ───────────────────────────────────────────── */

export function generateMasteryGrid(assessments, frameworkData) {
  const cellSize = 6
  const cellGap = 1
  const domainGap = 8
  const labelW = 160
  const saLabelH = 14
  const leftPad = labelW + 8

  // Calculate dimensions
  let maxCols = 0
  for (const domain of frameworkData) {
    let cols = 0
    for (const sa of domain.subAreas) {
      const skillCount = sa.skillGroups.reduce((sum, sg) => sum + sg.skills.length, 0)
      cols += skillCount + 2 // gap between sub-areas
    }
    if (cols > maxCols) maxCols = cols
  }

  const gridW = maxCols * (cellSize + cellGap)
  const W = leftPad + gridW + 20
  const rowH = saLabelH + cellSize + domainGap
  const H = 50 + frameworkData.length * rowH + 30

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${Math.min(W, 800)}px;font-family:'Segoe UI',system-ui,sans-serif;">`

  // Legend
  const legendY = 10
  const legendItems = [
    { label: 'Not Assessed', color: LEVEL_COLORS[0] },
    { label: 'Needs Work', color: LEVEL_COLORS[1] },
    { label: 'Developing', color: LEVEL_COLORS[2] },
    { label: 'Solid', color: LEVEL_COLORS[3] },
  ]
  let legendX = leftPad
  for (const item of legendItems) {
    svg += `<rect x="${legendX}" y="${legendY}" width="10" height="10" rx="1" fill="${item.color}"/>`
    svg += `<text x="${legendX + 14}" y="${legendY + 9}" font-size="9" fill="#5f3e2a">${item.label}</text>`
    legendX += 90
  }

  // Domains
  let y = 46
  for (const domain of frameworkData) {
    // Domain label
    svg += `<text x="${labelW}" y="${y + saLabelH + cellSize / 2}" text-anchor="end" font-size="10" fill="#3d2a1c" font-weight="600">${escapeHtml(domain.name)}</text>`

    let x = leftPad
    for (const sa of domain.subAreas) {
      // Sub-area tick mark
      svg += `<line x1="${x}" y1="${y + saLabelH - 2}" x2="${x}" y2="${y + saLabelH + cellSize + 2}" stroke="#d4c4b0" stroke-width="0.5"/>`

      for (const sg of sa.skillGroups) {
        for (const skill of sg.skills) {
          const level = assessments[skill.id] ?? 0
          const color = LEVEL_COLORS[level]
          svg += `<rect x="${x}" y="${y + saLabelH}" width="${cellSize}" height="${cellSize}" rx="1" fill="${color}"/>`
          x += cellSize + cellGap
        }
      }
      x += cellSize // extra gap between sub-areas
    }

    y += rowH
  }

  svg += '</svg>'
  return svg
}
