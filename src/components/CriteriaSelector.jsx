import { useState } from 'react'
import { CRITERIA_PRESETS } from '../hooks/useGoalPreferences.js'

/**
 * Reusable mastery criteria selector with custom input option.
 * Used in SettingsDropdown and SkillGoalView.
 */
export default function CriteriaSelector({ value, onChange, className = '' }) {
  const isPreset = CRITERIA_PRESETS.some(p => p.value === value)
  const [showCustom, setShowCustom] = useState(!isPreset && !!value)
  const [customDraft, setCustomDraft] = useState(!isPreset ? value : '')

  const handleSelectChange = (e) => {
    const val = e.target.value
    if (val === '__custom') {
      setShowCustom(true)
      if (customDraft) onChange(customDraft)
    } else {
      setShowCustom(false)
      onChange(val)
    }
  }

  const handleCustomSave = () => {
    if (customDraft.trim()) {
      onChange(customDraft.trim())
    }
  }

  return (
    <div className={className}>
      <select
        value={showCustom ? '__custom' : (isPreset ? value : '__custom')}
        onChange={handleSelectChange}
        className="w-full px-2 py-1.5 min-h-[44px] rounded border border-warm-200 text-[11px] text-warm-700 bg-white focus:outline-none focus:ring-1 focus:ring-sage-300"
      >
        {CRITERIA_PRESETS.map(p => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
        <option value="__custom">Custom...</option>
      </select>
      {showCustom && (
        <div className="mt-1.5 flex gap-1.5">
          <input
            type="text"
            value={customDraft}
            onChange={(e) => setCustomDraft(e.target.value)}
            onBlur={handleCustomSave}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCustomSave() }}
            placeholder="e.g., 92% accuracy across 4 consecutive sessions"
            className="flex-1 px-2 py-1.5 min-h-[44px] rounded border border-warm-200 text-[11px] text-warm-700 bg-white focus:outline-none focus:ring-1 focus:ring-sage-300 placeholder-warm-300"
            autoFocus
          />
        </div>
      )}
    </div>
  )
}
