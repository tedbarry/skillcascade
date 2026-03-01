import { useState, useMemo } from 'react'
import { framework, ASSESSMENT_LEVELS, getDomainScores, isAssessed } from '../data/framework.js'
import { downloadFile } from '../data/exportUtils.js'

/* ─────────────────────────────────────────────
   SVG Icons (inline, no emoji, no icon libraries)
   ───────────────────────────────────────────── */

const ICONS = {
  certificate: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="16" height="12" rx="2" /><path d="M6 7h8M6 10h5" />
      <circle cx="14" cy="15" r="3" /><path d="M12.5 17.5l1.5 2 1.5-2" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2L3 6v4c0 4.4 3 8.5 7 10 4-1.5 7-5.6 7-10V6l-7-4z" /><path d="M7.5 10l2 2 3.5-3.5" />
    </svg>
  ),
  chat: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h14a1 1 0 011 1v7a1 1 0 01-1 1H7l-4 3V5a1 1 0 011-1z" /><path d="M7 8h6M7 11h3" />
    </svg>
  ),
  brain: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 18V10" /><path d="M10 10C10 7 7 4 4 5c-2 .7-2.5 3.5-1 5 1 1 3 1.5 4 1" />
      <path d="M10 10c0-3 3-6 6-5 2 .7 2.5 3.5 1 5-1 1-3 1.5-4 1" />
    </svg>
  ),
  people: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="6" r="2.5" /><circle cx="13" cy="6" r="2.5" />
      <path d="M2 16c0-3 2.5-5 5-5s5 2 5 5" /><path d="M11 16c0-3 2.5-5 5-5s3 2 3 5" />
    </svg>
  ),
  chart: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17V9l4-2v10" /><path d="M9 17V5l4-3v15" /><path d="M15 17v-7l3-2v9" />
    </svg>
  ),
  trophy: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h8v5c0 2.2-1.8 4-4 4s-4-1.8-4-4V3z" /><path d="M6 5H4c0 2.5 1 4 2 4" />
      <path d="M14 5h2c0 2.5-1 4-2 4" /><path d="M10 12v3M7 17h6M7 15h6" />
    </svg>
  ),
  download: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  ),
  print: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12zm-2.25 0h.008v.008H16.5V12z" />
    </svg>
  ),
  lock: (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="9" width="12" height="8" rx="1.5" /><path d="M7 9V6a3 3 0 016 0v3" />
    </svg>
  ),
  check: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  ),
  arrowUp: (
    <svg className="w-3.5 h-3.5 text-sage-500" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M10 16V4M5 8l5-5 5 5" />
    </svg>
  ),
}

/* ─────────────────────────────────────────────
   Certificate definitions & constants
   ───────────────────────────────────────────── */

const DOMAIN_CERT_THRESHOLD = 2.5

const MILESTONE_DEFS = [
  {
    id: 'foundation-strong',
    title: 'Foundation Strong',
    description: 'Regulation and Self-Awareness both at Solid level',
    requiredDomains: ['d1', 'd2'],
    icon: ICONS.shield,
    color: '#5a9465',
  },
  {
    id: 'communication-champion',
    title: 'Communication Champion',
    description: 'Communication domain at Solid level',
    requiredDomains: ['d5'],
    icon: ICONS.chat,
    color: '#4a8a8a',
  },
  {
    id: 'social-skills-star',
    title: 'Social Skills Star',
    description: 'Problem Solving and Social Understanding both at Solid level',
    requiredDomains: ['d4', 'd6'],
    icon: ICONS.people,
    color: '#8a6aaa',
  },
  {
    id: 'independent-thinker',
    title: 'Independent Thinker',
    description: 'Executive Function and Identity both at Solid level',
    requiredDomains: ['d3', 'd7'],
    icon: ICONS.brain,
    color: '#c49a6c',
  },
]

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function generateCertId(clientName, type, dateStr) {
  let hash = 0
  const seed = `${clientName}-${type}-${dateStr}`
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  return 'SC-' + Math.abs(hash).toString(36).toUpperCase().padStart(8, '0')
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function getSubAreaScores(domain, assessments) {
  return domain.subAreas.map((sa) => {
    let total = 0, count = 0
    for (const sg of sa.skillGroups) {
      for (const skill of sg.skills) {
        const level = assessments[skill.id]
        if (isAssessed(level)) {
          total += level
          count++
        }
      }
    }
    return { name: sa.name, score: count > 0 ? total / count : 0, assessed: count > 0 }
  })
}

/* ─────────────────────────────────────────────
   Certificate HTML generation
   ───────────────────────────────────────────── */

const CERT_STYLES = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#2d2d2d;display:flex;justify-content:center;padding:32px;background:#f5f5f0}.cert{width:700px;background:white;padding:48px}.cert-border{border:3px double #7fb589;padding:40px;position:relative}.cert-border::before,.cert-border::after,.corner-bl::before,.corner-br::before{content:'';position:absolute;width:24px;height:24px;border-color:#5a9465;border-style:solid}.cert-border::before{top:8px;left:8px;border-width:2px 0 0 2px}.cert-border::after{top:8px;right:8px;border-width:2px 2px 0 0}.corner-bl::before{bottom:8px;left:8px;border-width:0 0 2px 2px;position:absolute}.corner-br::before{bottom:8px;right:8px;border-width:0 2px 2px 0;position:absolute}.corner-bl,.corner-br{position:absolute;bottom:0;width:100%;height:100%;pointer-events:none}.corner-bl{left:0}.corner-br{right:0}.logo{text-align:center;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#7fb589;font-weight:600;margin-bottom:6px}.heading{text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:28px;color:#3d5a40;margin-bottom:8px;letter-spacing:1px}.divider{width:80px;height:2px;background:#7fb589;margin:16px auto}.label{text-align:center;font-size:12px;color:#8a8a7a;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px}.client-name{text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#2d2d2d;margin-bottom:20px}.cert-type{text-align:center;font-size:15px;color:#5a9465;font-weight:600;margin-bottom:6px}.cert-desc{text-align:center;font-size:12px;color:#6b6b5a;line-height:1.5;max-width:480px;margin:0 auto 24px}table{width:100%;border-collapse:collapse;margin:16px 0}th{text-align:left;padding:6px 12px;font-size:10px;font-weight:600;color:#5a9465;border-bottom:2px solid #dce8de;text-transform:uppercase;letter-spacing:1px}td{padding:5px 12px;font-size:11px;border-bottom:1px solid #f0f0ea;color:#4a4a3a}.score-bar{display:inline-block;height:6px;border-radius:3px}.score-track{display:inline-block;width:80px;height:6px;border-radius:3px;background:#eeeee6;margin-right:6px}.date{text-align:center;font-size:11px;color:#8a8a7a;margin-top:24px}.sig-line{margin-top:32px;text-align:center}.sig-dash{width:240px;border-top:1px solid #c0c0b0;margin:0 auto 6px}.sig-text{font-size:10px;color:#8a8a7a}.cert-id{text-align:center;font-size:9px;color:#b0b0a0;margin-top:12px;letter-spacing:1px}.growth-positive{color:#4f8460;font-weight:600}.growth-section{margin:16px 0}.overall-growth{text-align:center;font-family:Georgia,serif;font-size:32px;color:#5a9465;margin:12px 0 4px}.overall-label{text-align:center;font-size:11px;color:#8a8a7a;margin-bottom:16px}@media print{body{background:white;padding:0}.cert{box-shadow:none}}`

function buildCertHTML(clientName, certType, title, description, bodyHTML, dateStr) {
  const certId = generateCertId(clientName, certType, dateStr)
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate - ${clientName}</title><style>${CERT_STYLES}</style></head><body>
<div class="cert"><div class="cert-border">
  <div class="corner-bl"></div><div class="corner-br"></div>
  <div class="logo">SkillCascade</div>
  <div class="heading">Certificate of Achievement</div>
  <div class="divider"></div>
  <div class="label">This certifies that</div>
  <div class="client-name">${clientName || 'Client'}</div>
  <div class="cert-type">${title}</div>
  <div class="cert-desc">${description}</div>
  ${bodyHTML}
  <div class="date">${dateStr}</div>
  <div class="sig-line"><div class="sig-dash"></div><div class="sig-text">Certified by SkillCascade Assessment Platform</div></div>
  <div class="cert-id">${certId}</div>
</div></div></body></html>`
}

function buildScoreTable(rows) {
  let html = '<table><tr><th>Area</th><th>Score</th><th>Level</th></tr>'
  for (const r of rows) {
    const pct = Math.round((r.score / 3) * 100)
    const levelLabel = r.score >= 2.5 ? 'Solid' : r.score >= 1.5 ? 'Developing' : r.score > 0 ? 'Needs Work' : 'N/A'
    const barColor = r.score >= 2.5 ? '#7fb589' : r.score >= 1.5 ? '#e5b76a' : r.score > 0 ? '#e8928a' : '#d1d5db'
    html += `<tr><td>${r.name}</td><td><span class="score-track"><span class="score-bar" style="width:${pct}%;background:${barColor}"></span></span>${r.score.toFixed(2)}/3</td><td>${levelLabel}</td></tr>`
  }
  return html + '</table>'
}

function generateDomainCertHTML(clientName, domain, domainScore, assessments) {
  const dateStr = formatDate(Date.now())
  const rows = getSubAreaScores(domain, assessments).filter(s => s.assessed).map(s => ({ name: s.name, score: s.score }))
  return buildCertHTML(clientName, `domain-${domain.id}`, `${domain.name} — Domain Mastery`,
    `Has demonstrated solid mastery across the ${domain.name} domain with an average score of ${domainScore.score.toFixed(2)} out of 3.00, reflecting consistent competence in ${domain.subtitle.toLowerCase()}.`,
    buildScoreTable(rows), dateStr)
}

function generateMilestoneCertHTML(clientName, milestone, scores) {
  const dateStr = formatDate(Date.now())
  const rows = milestone.requiredDomains.map(dId => {
    const s = scores.find(sc => sc.domainId === dId)
    return { name: s.domain, score: s.score }
  })
  return buildCertHTML(clientName, milestone.id, milestone.title,
    milestone.description + '. All required domains have reached Solid level.',
    buildScoreTable(rows), dateStr)
}

function generateProgressCertHTML(clientName, currentScores, earliestSnap) {
  const dateStr = formatDate(Date.now())
  const prevScores = getDomainScores(earliestSnap.assessments)
  const improvedRows = []
  let totalGrowth = 0, growthCount = 0
  for (let i = 0; i < currentScores.length; i++) {
    const curr = currentScores[i], prev = prevScores[i]
    if (prev.assessed > 0 && curr.assessed > 0) {
      const diff = curr.score - prev.score
      if (diff > 0.05) improvedRows.push({ name: curr.domain, prev: prev.score, curr: curr.score, diff })
      totalGrowth += diff
      growthCount++
    }
  }
  const overallPct = growthCount > 0 ? Math.round((totalGrowth / (growthCount * 3)) * 100) : 0
  let body = `<div class="growth-section"><div class="overall-growth">+${Math.max(0, overallPct)}%</div>`
  body += `<div class="overall-label">Overall Growth Since ${formatDate(earliestSnap.timestamp)}</div>`
  if (improvedRows.length > 0) {
    body += '<table><tr><th>Domain</th><th>Previous</th><th>Current</th><th>Change</th></tr>'
    for (const r of improvedRows) body += `<tr><td>${r.name}</td><td>${r.prev.toFixed(2)}</td><td>${r.curr.toFixed(2)}</td><td class="growth-positive">+${r.diff.toFixed(2)}</td></tr>`
    body += '</table>'
  }
  body += '</div>'
  return buildCertHTML(clientName, 'progress', 'Growth & Progress',
    `Documented improvement across developmental domains from ${formatDate(earliestSnap.timestamp)} to present.`, body, dateStr)
}

function generateComprehensiveCertHTML(clientName, scores) {
  const dateStr = formatDate(Date.now())
  const rows = scores.map(s => ({ name: s.domain, score: s.score }))
  return buildCertHTML(clientName, 'comprehensive', 'Comprehensive Assessment Complete',
    'Has completed a full developmental-functional skills assessment across all 9 domains, establishing a complete baseline skill profile.',
    buildScoreTable(rows), dateStr)
}

/* ─────────────────────────────────────────────
   OutcomeCertification Component
   ───────────────────────────────────────────── */

export default function OutcomeCertification({ assessments, clientName, snapshots }) {
  const [previewHTML, setPreviewHTML] = useState(null)
  const [previewTitle, setPreviewTitle] = useState('')
  const scores = useMemo(() => getDomainScores(assessments), [assessments])

  /* Compute which certificates are earned */
  const certificates = useMemo(() => {
    const certs = []

    // Domain mastery certificates
    for (const domain of framework) {
      const ds = scores.find(s => s.domainId === domain.id)
      const earned = ds && ds.assessed > 0 && ds.score >= DOMAIN_CERT_THRESHOLD
      const progress = ds && ds.assessed > 0 ? ds.score / 3 : 0
      const progressLabel = ds && ds.assessed > 0
        ? `${ds.score.toFixed(1)} / 3.0 (need 2.5)`
        : `${ds.assessed} of ${ds.total} assessed`
      certs.push({
        id: `domain-${domain.id}`,
        category: 'domain',
        title: `${domain.name} Mastery`,
        subtitle: domain.subtitle,
        icon: ICONS.certificate,
        earned,
        progress,
        progressLabel,
        generate: () => generateDomainCertHTML(clientName, domain, ds, assessments),
      })
    }

    // Milestone certificates
    for (const ms of MILESTONE_DEFS) {
      const dsArr = ms.requiredDomains.map(dId => scores.find(s => s.domainId === dId))
      const earned = dsArr.every(s => s && s.assessed > 0 && s.score >= DOMAIN_CERT_THRESHOLD)
      const met = dsArr.filter(s => s && s.assessed > 0 && s.score >= DOMAIN_CERT_THRESHOLD).length
      certs.push({
        id: ms.id,
        category: 'milestone',
        title: ms.title,
        subtitle: ms.description,
        icon: ms.icon,
        earned,
        accentColor: ms.color,
        progress: met / ms.requiredDomains.length,
        progressLabel: `${met} of ${ms.requiredDomains.length} domains at Solid`,
        generate: () => generateMilestoneCertHTML(clientName, ms, scores),
      })
    }

    // Progress certificate — requires snapshots showing growth
    const hasSnapshots = snapshots && snapshots.length > 0
    const earliestSnap = hasSnapshots
      ? snapshots.reduce((a, b) => (a.timestamp < b.timestamp ? a : b))
      : null
    const hasGrowth = earliestSnap && scores.some((s, i) => {
      const prev = getDomainScores(earliestSnap.assessments)[i]
      return prev.assessed > 0 && s.assessed > 0 && s.score - prev.score > 0.05
    })
    certs.push({
      id: 'progress',
      category: 'progress',
      title: 'Growth & Progress',
      subtitle: 'Documents improvement over time by comparing snapshots',
      icon: ICONS.chart,
      earned: !!hasGrowth,
      progress: hasSnapshots ? 0.5 : 0,
      progressLabel: hasSnapshots ? 'Snapshots available' : 'No snapshots saved yet',
      generate: hasGrowth
        ? () => generateProgressCertHTML(clientName, scores, earliestSnap)
        : null,
    })

    // Comprehensive assessment certificate — all domains assessed
    const allAssessed = scores.every(s => s.assessed > 0)
    const assessedDomains = scores.filter(s => s.assessed > 0).length
    certs.push({
      id: 'comprehensive',
      category: 'comprehensive',
      title: 'Comprehensive Assessment',
      subtitle: 'Full assessment across all 9 domains completed',
      icon: ICONS.trophy,
      earned: allAssessed,
      progress: assessedDomains / framework.length,
      progressLabel: `${assessedDomains} of ${framework.length} domains assessed`,
      generate: allAssessed
        ? () => generateComprehensiveCertHTML(clientName, scores)
        : null,
    })

    return certs
  }, [assessments, clientName, snapshots, scores])

  const earnedCount = certificates.filter(c => c.earned).length
  const totalCount = certificates.length

  const nextClosest = useMemo(() => {
    const locked = certificates.filter(c => !c.earned && c.progress > 0)
    if (locked.length === 0) return null
    return locked.reduce((best, c) => c.progress > best.progress ? c : best)
  }, [certificates])

  function handleGenerate(cert) {
    if (!cert.earned || !cert.generate) return
    setPreviewTitle(cert.title)
    setPreviewHTML(cert.generate())
  }

  function handleDownload() {
    if (!previewHTML) return
    const safeName = (clientName || 'client').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    const safeTitle = previewTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    downloadFile(previewHTML, `skillcascade-cert-${safeName}-${safeTitle}.html`, 'text/html;charset=utf-8')
  }

  function handlePrint() {
    if (!previewHTML) return
    const win = window.open('', '_blank')
    win.document.write(previewHTML)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  /* Group certificates by category for display */
  const domainCerts = certificates.filter(c => c.category === 'domain')
  const milestoneCerts = certificates.filter(c => c.category === 'milestone')
  const specialCerts = certificates.filter(
    c => c.category === 'progress' || c.category === 'comprehensive'
  )

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-warm-800 font-display">Outcome Certification</h2>
        <p className="text-sm text-warm-500 mt-1">
          Generate professional certificates documenting {clientName ? `${clientName}'s` : 'client'} skill achievements for records, parents, or schools.
        </p>
      </div>

      {/* Preview mode — shows generated certificate in iframe */}
      {previewHTML && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-sage-500 text-white rounded-lg text-sm font-medium hover:bg-sage-600 transition-colors"
            >
              {ICONS.download}
              Download HTML
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-warm-200 text-warm-700 rounded-lg text-sm font-medium hover:bg-warm-50 transition-colors"
            >
              {ICONS.print}
              Print
            </button>
            <button
              onClick={() => { setPreviewHTML(null); setPreviewTitle('') }}
              className="px-4 py-2 text-warm-500 hover:text-warm-700 text-sm"
            >
              Back to Certificates
            </button>
          </div>
          <div className="bg-white rounded-xl border border-warm-200 shadow-sm overflow-hidden">
            <iframe
              srcDoc={previewHTML}
              title="Certificate Preview"
              className="w-full border-0"
              style={{ height: '750px' }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}

      {/* Main content when not previewing */}
      {!previewHTML && (
        <>
          {/* Summary stats */}
          <div className="flex items-center gap-6 text-xs text-warm-500 mb-6 bg-warm-100 rounded-lg px-4 py-3">
            <span>
              <strong className="text-warm-700">{earnedCount}</strong> of{' '}
              <strong className="text-warm-700">{totalCount}</strong> certificates earned
            </span>
            {nextClosest && (
              <span className="flex items-center gap-1.5">
                {ICONS.arrowUp}
                Next: <strong className="text-sage-600">{nextClosest.title}</strong>{' '}
                ({Math.round(nextClosest.progress * 100)}%)
              </span>
            )}
          </div>

          {/* Milestone Certificates */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-warm-700 mb-3 uppercase tracking-wider">
              Milestone Achievements
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {milestoneCerts.map((cert) => (
                <CertCard key={cert.id} cert={cert} onGenerate={handleGenerate} />
              ))}
            </div>
          </div>

          {/* Domain Mastery Certificates */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-warm-700 mb-3 uppercase tracking-wider">
              Domain Mastery
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {domainCerts.map((cert) => (
                <CertCard key={cert.id} cert={cert} onGenerate={handleGenerate} />
              ))}
            </div>
          </div>

          {/* Special Certificates */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-warm-700 mb-3 uppercase tracking-wider">
              Special Certificates
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {specialCerts.map((cert) => (
                <CertCard key={cert.id} cert={cert} onGenerate={handleGenerate} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   CertCard — individual certificate card
   ───────────────────────────────────────────── */

function CertCard({ cert, onGenerate }) {
  const accent = cert.accentColor || '#5a9465'

  return (
    <div
      className={`rounded-xl border-2 p-4 transition-all ${
        cert.earned
          ? 'bg-white border-sage-200 shadow-sm hover:shadow-md'
          : 'bg-warm-50 border-warm-200 opacity-70'
      }`}
    >
      {/* Icon + title row */}
      <div className="flex items-start gap-3 mb-2">
        <div
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
          style={{
            background: cert.earned ? `${accent}18` : '#e5e5dd',
            color: cert.earned ? accent : '#9ca3af',
          }}
        >
          {cert.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-semibold leading-tight ${
            cert.earned ? 'text-warm-800' : 'text-warm-500'
          }`}>
            {cert.title}
          </div>
          <div className="text-[11px] text-warm-400 leading-snug mt-0.5">
            {cert.subtitle}
          </div>
        </div>
      </div>

      {/* Earned state — checkmark and generate button */}
      {cert.earned ? (
        <div className="flex items-center justify-between mt-3">
          <span className="text-[11px] text-sage-600 font-medium flex items-center gap-1">
            {ICONS.check}
            Earned
          </span>
          <button
            onClick={() => onGenerate(cert)}
            className="text-[11px] font-semibold px-3 py-1 rounded-md bg-sage-500 text-white hover:bg-sage-600 transition-colors"
          >
            Generate
          </button>
        </div>
      ) : (
        /* Locked state — progress bar toward earning */
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-warm-400 flex items-center gap-1">
              {ICONS.lock}
              Locked
            </span>
            <span className="text-[10px] text-warm-400">
              {cert.progressLabel}
            </span>
          </div>
          <div className="w-full h-1.5 bg-warm-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.round(cert.progress * 100)}%`,
                background: cert.progress > 0 ? '#c9d5c0' : 'transparent',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
