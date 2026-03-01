import { useMemo } from 'react'
import { buildPrintData } from '../data/exportUtils.js'
import { ASSESSMENT_COLORS, framework, ASSESSMENT_LEVELS, isAssessed } from '../data/framework.js'
import { computeDomainHealth, detectCascadeRisks } from '../data/cascadeModel.js'
import { generateClinicalSummary, generateParentSummary } from '../lib/narratives.js'
import { computeImpactRanking } from '../data/cascadeModel.js'

const PILL_COLORS = {
  null: { bg: '#e5e7eb', color: '#6b7280', label: 'Not Assessed' },
  0: { bg: '#f5dede', color: '#8b4444', label: 'Not Present' },
  1: { bg: '#fce0dd', color: '#b63a2e', label: 'Needs Work' },
  2: { bg: '#fef3c7', color: '#92400e', label: 'Developing' },
  3: { bg: '#dce8de', color: '#31543d', label: 'Solid' },
}

const STATE_LABELS = {
  locked: 'Not Started', blocked: 'Blocked', 'needs-work': 'Needs Work',
  developing: 'Developing', mastered: 'Solid',
}

function MiniProgressBar({ value, max = 3, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ flex: 1, height: '6px', backgroundColor: '#f0ebe4', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '3px', transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '9px', color: '#9a6740', minWidth: '28px', textAlign: 'right' }}>{Math.round(pct)}%</span>
    </div>
  )
}

export default function PrintReport({ assessments, clientName, snapshots = [], branding }) {
  const data = useMemo(() => buildPrintData(assessments, clientName), [assessments, clientName])
  const domainHealth = useMemo(() => computeDomainHealth(assessments), [assessments])
  const risks = useMemo(() => detectCascadeRisks(assessments, snapshots), [assessments, snapshots])
  const impactRanking = useMemo(() => computeImpactRanking(assessments), [assessments])

  const clinicalSummary = useMemo(() => {
    try { return generateClinicalSummary(domainHealth, impactRanking, risks, []) } catch { return '' }
  }, [domainHealth, impactRanking, risks])

  const parentSummary = useMemo(() => {
    try { return generateParentSummary(domainHealth, clientName) } catch { return '' }
  }, [domainHealth, clientName])

  // Overall stats
  const stats = useMemo(() => {
    let total = 0, assessed = 0, solidCount = 0
    framework.forEach(d => d.subAreas.forEach(sa => sa.skillGroups.forEach(sg => sg.skills.forEach(skill => {
      total++
      const level = assessments[skill.id]
      if (isAssessed(level)) {
        assessed++
        if (level === ASSESSMENT_LEVELS.SOLID) solidCount++
      }
    }))))
    return { total, assessed, solidCount, pct: total > 0 ? Math.round((assessed / total) * 100) : 0 }
  }, [assessments])

  const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const orgName = branding?.orgName || 'SkillCascade'

  return (
    <div className="hidden print:block" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#1a1a1a', fontSize: '11px', lineHeight: '1.5' }}>

      {/* ═══ PAGE 1: EXECUTIVE SUMMARY ═══ */}
      <div style={{ pageBreakAfter: 'always', padding: '0.25in 0' }}>
        {/* Header with branding */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingBottom: '16px', borderBottom: '3px solid #4f8460' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Plus Jakarta Sans, Inter, sans-serif', color: '#3d2a1c' }}>
              {orgName !== 'SkillCascade' ? orgName : <>Skill<span style={{ color: '#4f8460' }}>Cascade</span></>}
            </div>
            {branding?.tagline && <div style={{ fontSize: '10px', color: '#9a6740', marginTop: '2px' }}>{branding.tagline}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#3d2a1c' }}>Developmental Skills Assessment</div>
            <div style={{ fontSize: '11px', color: '#7d5235', marginTop: '2px' }}>{reportDate}</div>
          </div>
        </div>

        {/* Client info bar */}
        <div style={{ backgroundColor: '#fdf8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e8d5c0' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#3d2a1c' }}>{data.clientName}</div>
            <div style={{ fontSize: '10px', color: '#9a6740', marginTop: '2px' }}>Comprehensive Skills Profile</div>
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#4f8460' }}>{stats.pct}%</div>
              <div style={{ fontSize: '9px', color: '#9a6740' }}>Assessed</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#4f8460' }}>{stats.solidCount}</div>
              <div style={{ fontSize: '9px', color: '#9a6740' }}>Solid Skills</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: risks.length > 0 ? '#d44d3f' : '#4f8460' }}>{risks.length}</div>
              <div style={{ fontSize: '9px', color: '#9a6740' }}>Active Alerts</div>
            </div>
          </div>
        </div>

        {/* Domain Scores Summary Table */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#3d2a1c', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Domain Overview</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #d4b896' }}>
                <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: '10px', fontWeight: 700, color: '#5f3e2a', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Domain</th>
                <th style={{ textAlign: 'center', padding: '6px 10px', fontSize: '10px', fontWeight: 700, color: '#5f3e2a', width: '60px' }}>Score</th>
                <th style={{ textAlign: 'center', padding: '6px 10px', fontSize: '10px', fontWeight: 700, color: '#5f3e2a', width: '70px' }}>Status</th>
                <th style={{ textAlign: 'center', padding: '6px 10px', fontSize: '10px', fontWeight: 700, color: '#5f3e2a', width: '80px' }}>Coverage</th>
                <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: '10px', fontWeight: 700, color: '#5f3e2a', width: '35%' }}>Progress</th>
              </tr>
            </thead>
            <tbody>
              {data.domains.map((d, i) => {
                const health = domainHealth[d.id] || {}
                const barColor = health.state === 'mastered' ? '#7fb589' : health.state === 'developing' ? '#e5b76a' : health.state === 'needs-work' || health.state === 'blocked' ? '#e8928a' : '#d1d5db'
                const statusColor = health.state === 'mastered' ? '#31543d' : health.state === 'developing' ? '#92400e' : health.state === 'needs-work' || health.state === 'blocked' ? '#b63a2e' : '#6b7280'
                const statusBg = health.state === 'mastered' ? '#dce8de' : health.state === 'developing' ? '#fef3c7' : health.state === 'needs-work' || health.state === 'blocked' ? '#fce0dd' : '#f3f4f6'
                return (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f5ebe0', backgroundColor: i % 2 === 0 ? '#fff' : '#fdfaf7' }}>
                    <td style={{ padding: '7px 10px', fontWeight: 500, fontSize: '11px' }}>
                      <span style={{ color: '#9a6740', fontWeight: 600, marginRight: '4px' }}>D{d.domain}.</span>
                      {d.name}
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700, fontSize: '12px' }}>
                      {d.assessed > 0 ? d.score.toFixed(1) : '—'}
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: '10px', fontSize: '9px', fontWeight: 600, backgroundColor: statusBg, color: statusColor }}>
                        {STATE_LABELS[health.state] || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'center', fontSize: '10px', color: '#7d5235' }}>
                      {d.assessed}/{d.total}
                    </td>
                    <td style={{ padding: '7px 10px' }}>
                      <MiniProgressBar value={d.score} max={3} color={barColor} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Clinical Summary */}
        {clinicalSummary && (
          <div style={{ marginBottom: '16px', padding: '12px 14px', backgroundColor: '#f0f5f1', borderRadius: '6px', border: '1px solid #b8d1bd' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#31543d', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Clinical Summary</div>
            <div style={{ fontSize: '10px', color: '#3d2a1c', lineHeight: '1.6' }}>{clinicalSummary}</div>
          </div>
        )}

        {/* Parent-Friendly Summary */}
        {parentSummary && (
          <div style={{ padding: '12px 14px', backgroundColor: '#fdf8f0', borderRadius: '6px', border: '1px solid #e8d5c0' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#7d5235', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Caregiver Summary</div>
            <div style={{ fontSize: '10px', color: '#3d2a1c', lineHeight: '1.6' }}>{parentSummary}</div>
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #e8d5c0' }}>
          {[
            { label: 'Not Assessed', color: '#9ca3af' },
            { label: 'Not Present (0)', color: ASSESSMENT_COLORS[0] },
            { label: 'Needs Work (1)', color: ASSESSMENT_COLORS[1] },
            { label: 'Developing (2)', color: ASSESSMENT_COLORS[2] },
            { label: 'Solid (3)', color: ASSESSMENT_COLORS[3] },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: item.color }} />
              <span style={{ fontSize: '9px', color: '#7d5235' }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Page footer */}
        <div style={{ marginTop: '16px', paddingTop: '8px', borderTop: '1px solid #e8d5c0', display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#c49a6c' }}>
          <span>{orgName} — Developmental Skills Assessment</span>
          <span>Page 1 of {data.domains.length + 1} | {reportDate}</span>
        </div>
      </div>

      {/* ═══ PAGES 2+: ONE PER DOMAIN ═══ */}
      {data.domains.map((domain, pageIdx) => {
        const health = domainHealth[domain.id] || {}
        return (
          <div key={domain.id} style={{ pageBreakBefore: 'always', padding: '0.25in 0' }}>
            {/* Domain header */}
            <div style={{ marginBottom: '14px', paddingBottom: '10px', borderBottom: '3px solid #4f8460' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#3d2a1c', fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
                    <span style={{ color: '#9a6740' }}>D{domain.domain}.</span> {domain.name}
                  </div>
                  <div style={{ fontSize: '10px', color: '#9a6740', fontStyle: 'italic', marginTop: '2px' }}>
                    {domain.coreQuestion}
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: '120px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: health.state === 'mastered' ? '#4f8460' : health.state === 'developing' ? '#b07d4f' : '#d44d3f' }}>
                    {domain.assessed > 0 ? domain.score.toFixed(1) : '—'}
                    <span style={{ fontSize: '11px', fontWeight: 400, color: '#9a6740' }}>/3</span>
                  </div>
                  <div style={{ fontSize: '9px', color: '#9a6740' }}>{domain.assessed} of {domain.total} assessed</div>
                </div>
              </div>
            </div>

            {/* Sub-areas */}
            {domain.subAreas.map((sa) => (
              <div key={sa.id} style={{ marginBottom: '12px', pageBreakInside: 'avoid' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#5f3e2a', marginBottom: '5px', backgroundColor: '#fdf8f0', padding: '4px 10px', borderRadius: '4px', borderLeft: '3px solid #d4b896' }}>
                  {sa.name}
                </div>
                {sa.skillGroups.map((sg) => (
                  <div key={sg.id} style={{ marginLeft: '14px', marginBottom: '7px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#7d5235', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
                      {sg.name}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginLeft: '4px' }}>
                      {sg.skills.map((skill) => {
                        const pill = PILL_COLORS[skill.level]
                        return (
                          <span
                            key={skill.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 7px',
                              borderRadius: '10px',
                              fontSize: '8.5px',
                              fontWeight: 500,
                              backgroundColor: pill.bg,
                              color: pill.color,
                              lineHeight: '1.5',
                            }}
                          >
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: ASSESSMENT_COLORS[skill.level] || '#9ca3af', display: 'inline-block', flexShrink: 0 }} />
                            {skill.name}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Page footer */}
            <div style={{ position: 'relative', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #e8d5c0', display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#c49a6c' }}>
              <span>{orgName} — {data.clientName}</span>
              <span>Page {pageIdx + 2} of {data.domains.length + 1} | {reportDate}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
