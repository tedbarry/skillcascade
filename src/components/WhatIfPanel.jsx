import { useMemo } from 'react'
import { framework, DOMAIN_DEPENDENCIES } from '../data/framework.js'
import { computeDomainHealth, simulateCascade } from '../data/cascadeModel.js'
import useResponsive from '../hooks/useResponsive.js'

const DOMAIN_COLORS = {
  d1: '#e07b6e', d2: '#d4956a', d3: '#c9a84c', d4: '#8fb570',
  d5: '#5da87a', d6: '#4a9e9e', d7: '#6889b5', d8: '#8b7bb5', d9: '#a86e9a',
}

export default function WhatIfPanel({ assessments = {}, overrides, onOverridesChange, onClose }) {
  const { isPhone } = useResponsive()
  const baseHealth = useMemo(() => computeDomainHealth(assessments), [assessments])

  // Compute simulated health from overrides (the real simulation, not raw assessments)
  const simHealth = useMemo(() => {
    if (!overrides || Object.keys(overrides).length === 0) return baseHealth
    const simAssessments = simulateCascade(assessments, overrides)
    return computeDomainHealth(simAssessments)
  }, [assessments, overrides, baseHealth])

  // Cascade effect diff: compare base vs sim to find unblocked domains, state changes, skills ready
  const cascadeEffects = useMemo(() => {
    if (!overrides || Object.keys(overrides).length === 0) return null

    const effects = []

    // Find domains that changed state
    framework.forEach((domain) => {
      const base = baseHealth[domain.id]
      const sim = simHealth[domain.id]
      if (!base || !sim) return

      // Check if a domain became unblocked (was blocked, now isn't)
      if (base.state === 'blocked' && sim.state !== 'blocked' && sim.state !== 'locked') {
        effects.push({
          type: 'unblocked',
          domainId: domain.id,
          name: domain.name,
          newState: sim.state,
          skillCount: sim.total,
        })
      }

      // Check if state improved (needs-work → developing, developing → mastered)
      const stateRank = { locked: 0, blocked: 1, 'needs-work': 2, developing: 3, mastered: 4 }
      if ((stateRank[sim.state] || 0) > (stateRank[base.state] || 0) && base.state !== 'blocked') {
        effects.push({
          type: 'improved',
          domainId: domain.id,
          name: domain.name,
          from: base.state,
          to: sim.state,
        })
      }
    })

    // Count total newly ready skills (from blocked → any assessable state)
    let newlyReadySkills = 0
    let unblockedDomains = 0
    effects.forEach((e) => {
      if (e.type === 'unblocked') {
        unblockedDomains++
        newlyReadySkills += e.skillCount
      }
    })

    if (effects.length === 0 && Object.keys(overrides).length > 0) {
      // Still show slider changes even if no cascade effects
      const changes = []
      Object.entries(overrides).forEach(([domainId, targetAvg]) => {
        const base = baseHealth[domainId]
        if (!base || Math.abs(base.avg - targetAvg) < 0.05) return
        const domain = framework.find((d) => d.id === domainId)
        changes.push({ domainId, name: domain?.name || domainId, from: base.avg, to: targetAvg })
      })
      return { effects: [], changes, unblockedDomains: 0, newlyReadySkills: 0 }
    }

    // Build changes list for overridden domains
    const changes = []
    Object.entries(overrides).forEach(([domainId, targetAvg]) => {
      const base = baseHealth[domainId]
      if (!base || Math.abs(base.avg - targetAvg) < 0.05) return
      const domain = framework.find((d) => d.id === domainId)
      changes.push({ domainId, name: domain?.name || domainId, from: base.avg, to: targetAvg })
    })

    return { effects, changes, unblockedDomains, newlyReadySkills }
  }, [overrides, baseHealth, simHealth])

  const handleSliderChange = (domainId, value) => {
    const newOverrides = { ...overrides }
    const base = baseHealth[domainId]
    if (base && Math.abs(value - base.avg) < 0.05) {
      delete newOverrides[domainId]
    } else {
      newOverrides[domainId] = value
    }
    onOverridesChange(newOverrides)
  }

  const handleReset = () => {
    onOverridesChange({})
  }

  const panelClass = isPhone
    ? 'fixed inset-x-0 bottom-0 z-50 bg-[#1e1e24] border-t border-[#333] rounded-t-2xl max-h-[70vh] overflow-y-auto'
    : 'w-80 bg-[#1e1e24] border-l border-[#333] overflow-y-auto shrink-0'

  return (
    <div className={panelClass}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1e1e24] px-4 py-3 border-b border-[#333] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">What-If Simulator</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">Drag sliders to explore scenarios</p>
        </div>
        <div className="flex items-center gap-2">
          {overrides && Object.keys(overrides).length > 0 && (
            <button
              onClick={handleReset}
              className="text-[10px] px-2 py-1 rounded bg-[#333] text-gray-400 hover:text-gray-200 transition-colors"
            >
              Reset
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors text-lg leading-none"
          >
            {'\u00D7'}
          </button>
        </div>
      </div>

      {/* Domain sliders */}
      <div className="px-4 py-3 space-y-4">
        {framework.map((domain) => {
          const health = baseHealth[domain.id]
          if (!health) return null

          const currentValue = overrides?.[domain.id] ?? health.avg
          const isModified = overrides?.[domain.id] !== undefined
          const color = DOMAIN_COLORS[domain.id]

          return (
            <div key={domain.id}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center"
                    style={{ backgroundColor: color + '30', color }}
                  >
                    {domain.domain}
                  </span>
                  <span className={`text-xs font-medium ${isModified ? 'text-blue-300' : 'text-gray-300'}`}>
                    {domain.name}
                  </span>
                </div>
                <span className={`text-xs font-mono ${isModified ? 'text-blue-400' : 'text-gray-500'}`}>
                  {currentValue.toFixed(1)}/3
                  {isModified && (
                    <span className="text-gray-600 ml-1">
                      (was {health.avg.toFixed(1)})
                    </span>
                  )}
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={currentValue}
                onChange={(e) => handleSliderChange(domain.id, parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${color} 0%, ${color} ${(currentValue / 3) * 100}%, #333 ${(currentValue / 3) * 100}%, #333 100%)`,
                  accentColor: color,
                }}
              />

              {/* Base score marker */}
              <div className="relative h-2 -mt-0.5">
                <div
                  className="absolute w-0.5 h-2 bg-gray-500 rounded"
                  style={{ left: `${(health.avg / 3) * 100}%` }}
                  title={`Actual: ${health.avg.toFixed(1)}`}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Cascade effects summary */}
      {cascadeEffects && (
        <div className="px-4 py-3 border-t border-[#333]">
          {/* Headline effect */}
          {cascadeEffects.unblockedDomains > 0 && (
            <div className="bg-green-900/20 border border-green-700/30 rounded-lg px-3 py-2 mb-3">
              <p className="text-xs text-green-400 font-medium">
                {cascadeEffects.changes.length > 0 && `If ${cascadeEffects.changes.map(c => c.name).join(', ')} ${cascadeEffects.changes.length === 1 ? 'reaches' : 'reach'} target: `}
                <span className="font-bold">
                  {cascadeEffects.unblockedDomains} domain{cascadeEffects.unblockedDomains !== 1 ? 's' : ''} unblocked, +{cascadeEffects.newlyReadySkills} skills ready to target
                </span>
              </p>
            </div>
          )}

          <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {cascadeEffects.effects.length > 0 ? 'Cascade Effects' : 'Simulation Changes'}
          </h4>

          {/* Unblocked domains */}
          {cascadeEffects.effects.filter(e => e.type === 'unblocked').map((e) => (
            <div key={e.domainId} className="flex items-center gap-2 text-xs mb-1.5">
              <span className="text-green-500">{'\u2713'}</span>
              <span className="text-green-400 font-medium">{e.name}</span>
              <span className="text-gray-500">unblocked ({e.skillCount} skills)</span>
            </div>
          ))}

          {/* Improved domains */}
          {cascadeEffects.effects.filter(e => e.type === 'improved').map((e) => (
            <div key={e.domainId} className="flex items-center gap-2 text-xs mb-1.5">
              <span className="text-blue-400">{'\u2191'}</span>
              <span className="text-blue-300">{e.name}</span>
              <span className="text-gray-500">{e.from} {'\u2192'} {e.to}</span>
            </div>
          ))}

          {/* Slider value changes */}
          {cascadeEffects.changes.length > 0 && cascadeEffects.effects.length === 0 && (
            <div className="space-y-1.5">
              {cascadeEffects.changes.map((d) => (
                <div key={d.domainId} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400">{d.name}:</span>
                  <span className="text-gray-500">{d.from.toFixed(1)}</span>
                  <span className="text-gray-600">{'\u2192'}</span>
                  <span className={d.to > d.from ? 'text-green-400' : 'text-red-400'}>
                    {d.to.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Read-only notice */}
      <div className="px-4 py-2 border-t border-[#333]">
        <p className="text-[9px] text-gray-600 italic text-center">
          Read-only simulation — does not modify real assessments
        </p>
      </div>
    </div>
  )
}
