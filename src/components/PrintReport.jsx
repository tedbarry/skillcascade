import { useMemo } from 'react'
import { buildPrintData } from '../data/exportUtils.js'
import { ASSESSMENT_COLORS } from '../data/framework.js'

const PILL_COLORS = {
  0: { bg: '#e5e7eb', color: '#6b7280', label: 'N/A' },
  1: { bg: '#fce0dd', color: '#b63a2e', label: 'Needs Work' },
  2: { bg: '#fef3c7', color: '#92400e', label: 'Developing' },
  3: { bg: '#dce8de', color: '#31543d', label: 'Solid' },
}

export default function PrintReport({ assessments, clientName }) {
  const data = useMemo(
    () => buildPrintData(assessments, clientName),
    [assessments, clientName]
  )

  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="hidden print:block" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#1a1a1a', fontSize: '11px', lineHeight: '1.4' }}>

      {/* Page 1: Summary */}
      <div style={{ pageBreakAfter: 'always', padding: '0.5in 0' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
            Skill<span style={{ color: '#4f8460' }}>Cascade</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 600, marginTop: '8px', color: '#3d2a1c' }}>
            Skills Assessment Report
          </div>
          <div style={{ fontSize: '14px', color: '#7d5235', marginTop: '4px' }}>
            {data.clientName} — {reportDate}
          </div>
        </div>

        {/* Domain Scores Summary Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e8d5c0' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#5f3e2a' }}>Domain</th>
              <th style={{ textAlign: 'center', padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#5f3e2a' }}>Avg Score</th>
              <th style={{ textAlign: 'center', padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#5f3e2a' }}>Assessed</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#5f3e2a', width: '40%' }}>Level</th>
            </tr>
          </thead>
          <tbody>
            {data.domains.map((d) => {
              const pct = d.total > 0 ? (d.assessed / d.total) * 100 : 0
              const barColor = d.score >= 2.5 ? '#7fb589' : d.score >= 1.5 ? '#e5b76a' : d.score > 0 ? '#e8928a' : '#d1d5db'
              return (
                <tr key={d.id} style={{ borderBottom: '1px solid #f5ebe0' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>
                    D{d.domain}. {d.name}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>
                    {d.assessed > 0 ? d.score.toFixed(2) : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', color: '#7d5235' }}>
                    {d.assessed}/{d.total}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '8px', backgroundColor: '#f5ebe0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${(d.score / 3) * 100}%`, height: '100%', backgroundColor: barColor, borderRadius: '4px' }} />
                      </div>
                      <span style={{ fontSize: '10px', color: '#9a6740', minWidth: '32px' }}>{Math.round(pct)}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e8d5c0' }}>
          {[
            { label: 'Not Assessed', color: ASSESSMENT_COLORS[0] },
            { label: 'Needs Work', color: ASSESSMENT_COLORS[1] },
            { label: 'Developing', color: ASSESSMENT_COLORS[2] },
            { label: 'Solid', color: ASSESSMENT_COLORS[3] },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: item.color }} />
              <span style={{ fontSize: '10px', color: '#7d5235' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pages 2+: One per domain */}
      {data.domains.map((domain) => (
        <div key={domain.id} style={{ pageBreakBefore: 'always', padding: '0.5in 0' }}>
          {/* Domain header */}
          <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #e8d5c0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#3d2a1c', fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
                D{domain.domain}. {domain.name}
              </div>
              <div style={{ fontSize: '12px', color: '#7d5235' }}>
                Score: <strong>{domain.assessed > 0 ? domain.score.toFixed(2) : 'N/A'}</strong> ({domain.assessed}/{domain.total} assessed)
              </div>
            </div>
            <div style={{ fontSize: '11px', color: '#9a6740', fontStyle: 'italic', marginTop: '4px' }}>
              {domain.coreQuestion}
            </div>
          </div>

          {/* Sub-areas */}
          {domain.subAreas.map((sa) => (
            <div key={sa.id} style={{ marginBottom: '14px', pageBreakInside: 'avoid' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#5f3e2a', marginBottom: '6px', backgroundColor: '#fdf8f0', padding: '4px 8px', borderRadius: '4px' }}>
                {sa.name}
              </div>
              {sa.skillGroups.map((sg) => (
                <div key={sg.id} style={{ marginLeft: '12px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#7d5235', marginBottom: '4px' }}>
                    {sg.name}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginLeft: '8px' }}>
                    {sg.skills.map((skill) => {
                      const pill = PILL_COLORS[skill.level]
                      return (
                        <span
                          key={skill.id}
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '9px',
                            fontWeight: 500,
                            backgroundColor: pill.bg,
                            color: pill.color,
                            lineHeight: '1.6',
                          }}
                        >
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
          <div style={{ position: 'relative', marginTop: '16px', paddingTop: '8px', borderTop: '1px solid #e8d5c0', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#c49a6c' }}>
            <span>SkillCascade — {data.clientName}</span>
            <span>{reportDate}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
