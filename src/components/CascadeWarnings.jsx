import useResponsive from '../hooks/useResponsive.js'

const RISK_ICONS = {
  inversion: '\u26A0',   // Warning triangle
  regression: '\u2193',  // Down arrow
  bottleneck: '\u29B8',  // Circled reverse solidus
}

const RISK_COLORS = {
  inversion: { bg: '#3a2525', border: '#e8928a', text: '#f5c4c0', badge: '#e8928a' },
  regression: { bg: '#3a2020', border: '#ff6666', text: '#ffaaaa', badge: '#ff6666' },
  bottleneck: { bg: '#3a3520', border: '#e5b76a', text: '#f5e0b0', badge: '#e5b76a' },
}

export default function CascadeWarnings({ risks = [], onJumpToAssess, onClose }) {
  const { isPhone } = useResponsive()

  if (risks.length === 0) {
    return (
      <div className={`${isPhone ? 'px-4 py-6' : 'w-72 px-4 py-6'} bg-[#1e1e24] border-l border-[#333]`}>
        <div className="text-center">
          <div className="text-2xl mb-2">{'\u2713'}</div>
          <p className="text-sm text-green-400 font-medium">No Cascade Risks</p>
          <p className="text-xs text-gray-500 mt-1">No foundation inversions, regressions, or bottlenecks detected.</p>
        </div>
      </div>
    )
  }

  const panelClass = isPhone
    ? 'fixed inset-x-0 bottom-0 z-50 bg-[#1e1e24] border-t border-[#333] rounded-t-2xl max-h-[70vh] overflow-y-auto'
    : 'w-80 bg-[#1e1e24] border-l border-[#333] overflow-y-auto shrink-0'

  return (
    <div className={panelClass}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1e1e24] px-4 py-3 border-b border-[#333] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-orange-400 text-sm">{'\u26A0'}</span>
          <h3 className="text-sm font-semibold text-gray-200">
            Cascade Warnings
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-orange-900/40 text-orange-400 font-bold">
              {risks.length}
            </span>
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 transition-colors text-lg leading-none"
        >
          {'\u00D7'}
        </button>
      </div>

      {/* Risk cards */}
      <div className="px-3 py-3 space-y-2.5">
        {risks.map((risk, i) => {
          const colors = RISK_COLORS[risk.type] || RISK_COLORS.bottleneck
          const icon = RISK_ICONS[risk.type] || '\u26A0'

          return (
            <div
              key={i}
              className="rounded-lg border px-3 py-3"
              style={{ backgroundColor: colors.bg, borderColor: colors.border + '40' }}
            >
              {/* Title row */}
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="w-6 h-6 rounded flex items-center justify-center text-xs shrink-0"
                  style={{ backgroundColor: colors.badge + '25', color: colors.badge }}
                >
                  {icon}
                </span>
                <span className="text-xs font-semibold" style={{ color: colors.text }}>
                  {risk.title}
                </span>
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded font-mono ml-auto shrink-0"
                  style={{ backgroundColor: colors.badge + '20', color: colors.badge }}
                >
                  {risk.severity.toFixed(1)}
                </span>
              </div>

              {/* Description */}
              <p className="text-[11px] text-gray-400 leading-relaxed mb-2">
                {risk.description}
              </p>

              {/* Affected domains */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {risk.affectedDomains.slice(0, 4).map((dId) => (
                    <span
                      key={dId}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-[#333] text-gray-400 font-mono"
                    >
                      {dId.toUpperCase()}
                    </span>
                  ))}
                  {risk.affectedDomains.length > 4 && (
                    <span className="text-[9px] text-gray-600">
                      +{risk.affectedDomains.length - 4}
                    </span>
                  )}
                </div>

                {onJumpToAssess && risk.actionDomainId && (
                  <button
                    onClick={() => onJumpToAssess(risk.actionDomainId + '-sa1')}
                    className="text-[10px] font-medium px-2 py-1 rounded transition-colors min-h-[44px] flex items-center"
                    style={{
                      color: colors.badge,
                      backgroundColor: colors.badge + '15',
                    }}
                  >
                    Assess {'\u2192'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
