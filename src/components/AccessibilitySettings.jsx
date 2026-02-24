import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'skillcascade_accessibility'

const DEFAULT_SETTINGS = {
  fontSize: 'normal',
  highContrast: false,
  reduceMotion: false,
  dyslexiaFont: false,
  focusIndicators: false,
  colorBlindMode: 'none',
}

const FONT_SIZE_OPTIONS = [
  { value: 'small', label: 'Small', scale: 0.875 },
  { value: 'normal', label: 'Normal', scale: 1 },
  { value: 'large', label: 'Large', scale: 1.125 },
  { value: 'x-large', label: 'Extra Large', scale: 1.25 },
]

const COLOR_BLIND_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'protanopia', label: 'Protanopia', desc: 'red-green' },
  { value: 'deuteranopia', label: 'Deuteranopia', desc: 'red-green' },
  { value: 'tritanopia', label: 'Tritanopia', desc: 'blue-yellow' },
]

const ASSESSMENT_COLORS = {
  none: {
    'Not Assessed': 'var(--color-not-assessed)',
    'Needs Work': 'var(--color-needs-work)',
    'Developing': 'var(--color-developing)',
    'Solid': 'var(--color-solid)',
  },
  protanopia: {
    'Not Assessed': 'var(--color-not-assessed)',
    'Needs Work': '#d4a017',
    'Developing': '#6b8cc7',
    'Solid': '#2d6a4f',
  },
  deuteranopia: {
    'Not Assessed': 'var(--color-not-assessed)',
    'Needs Work': '#d4a017',
    'Developing': '#7ba3d9',
    'Solid': '#1a5c3a',
  },
  tritanopia: {
    'Not Assessed': 'var(--color-not-assessed)',
    'Needs Work': '#c44536',
    'Developing': '#8b6fc0',
    'Solid': '#2d8a6e',
  },
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch { /* ignore corrupt data */ }
  return { ...DEFAULT_SETTINGS }
}

function applyToDocument(settings) {
  const html = document.documentElement
  const scale = FONT_SIZE_OPTIONS.find(o => o.value === settings.fontSize)?.scale ?? 1
  html.style.setProperty('--accessibility-font-scale', scale)

  const classMap = {
    'a11y-high-contrast': settings.highContrast,
    'a11y-reduce-motion': settings.reduceMotion,
    'a11y-dyslexia': settings.dyslexiaFont,
    'a11y-focus': settings.focusIndicators,
    'a11y-cb-protanopia': settings.colorBlindMode === 'protanopia',
    'a11y-cb-deuteranopia': settings.colorBlindMode === 'deuteranopia',
    'a11y-cb-tritanopia': settings.colorBlindMode === 'tritanopia',
  }

  Object.entries(classMap).forEach(([cls, active]) => {
    if (active) html.classList.add(cls)
    else html.classList.remove(cls)
  })
}

/* ── Toggle switch sub-component ─────────────────────────── */
function ToggleSwitch({ enabled, onToggle, id }) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      id={id}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
        enabled ? 'bg-sage-500' : 'bg-warm-300'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

/* ── Main component ──────────────────────────────────────── */
export default function AccessibilitySettings({ onSettingsChange }) {
  const [settings, setSettings] = useState(loadSettings)

  // Apply on mount + whenever settings change
  useEffect(() => {
    applyToDocument(settings)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    onSettingsChange?.(settings)
  }, [settings, onSettingsChange])

  // Also respect prefers-reduced-motion on mount
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches && !settings.reduceMotion) {
      setSettings(prev => ({ ...prev, reduceMotion: true }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const update = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  function resetDefaults() {
    setSettings({ ...DEFAULT_SETTINGS })
  }

  const currentScale = FONT_SIZE_OPTIONS.find(o => o.value === settings.fontSize)?.scale ?? 1
  const activeColorSet = ASSESSMENT_COLORS[settings.colorBlindMode] || ASSESSMENT_COLORS.none

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────── */}
      <div>
        <h3 className="font-display text-lg font-semibold text-warm-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Accessibility
        </h3>
        <p className="text-sm text-warm-500 mt-0.5">Customize your experience</p>
      </div>

      {/* ── Font Size ────────────────────────────────────── */}
      <section>
        <label className="block text-sm font-medium text-warm-700 mb-2">Font Size</label>
        <div className="flex gap-1.5">
          {FONT_SIZE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => update('fontSize', opt.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                settings.fontSize === opt.value
                  ? 'bg-sage-500 text-white'
                  : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {/* Live preview */}
        <div
          className="mt-2 p-3 bg-warm-50 rounded-md border border-warm-200 text-warm-700"
          style={{ fontSize: `${currentScale}rem` }}
        >
          The quick brown fox jumps over the lazy dog.
        </div>
      </section>

      {/* ── High Contrast ────────────────────────────────── */}
      <section className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <label htmlFor="a11y-high-contrast" className="block text-sm font-medium text-warm-700">
            High Contrast
          </label>
          <p className="text-xs text-warm-500 mt-0.5">
            Increases contrast between text and backgrounds
          </p>
        </div>
        <ToggleSwitch
          id="a11y-high-contrast"
          enabled={settings.highContrast}
          onToggle={() => update('highContrast', !settings.highContrast)}
        />
      </section>

      {/* ── Reduce Motion ────────────────────────────────── */}
      <section className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <label htmlFor="a11y-reduce-motion" className="block text-sm font-medium text-warm-700">
            Reduce Motion
          </label>
          <p className="text-xs text-warm-500 mt-0.5">
            Disables animations and transitions
          </p>
          <p className="text-xs text-warm-400 mt-0.5 italic">
            Respects your system's prefers-reduced-motion setting by default
          </p>
        </div>
        <ToggleSwitch
          id="a11y-reduce-motion"
          enabled={settings.reduceMotion}
          onToggle={() => update('reduceMotion', !settings.reduceMotion)}
        />
      </section>

      {/* ── Dyslexia-Friendly ────────────────────────────── */}
      <section className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <label htmlFor="a11y-dyslexia" className="block text-sm font-medium text-warm-700">
            Dyslexia-Friendly
          </label>
          <p className="text-xs text-warm-500 mt-0.5">
            Increases letter spacing and line height for easier reading
          </p>
        </div>
        <ToggleSwitch
          id="a11y-dyslexia"
          enabled={settings.dyslexiaFont}
          onToggle={() => update('dyslexiaFont', !settings.dyslexiaFont)}
        />
      </section>

      {/* ── Focus Indicators ─────────────────────────────── */}
      <section className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <label htmlFor="a11y-focus" className="block text-sm font-medium text-warm-700">
            Focus Indicators
          </label>
          <p className="text-xs text-warm-500 mt-0.5">
            Shows prominent focus outlines when navigating with keyboard
          </p>
        </div>
        <ToggleSwitch
          id="a11y-focus"
          enabled={settings.focusIndicators}
          onToggle={() => update('focusIndicators', !settings.focusIndicators)}
        />
      </section>

      {/* ── Color Blind Mode ─────────────────────────────── */}
      <section>
        <label className="block text-sm font-medium text-warm-700 mb-2">Color Blind Mode</label>
        <div className="space-y-1.5">
          {COLOR_BLIND_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`flex items-center gap-2.5 p-2 rounded-md cursor-pointer transition-colors ${
                settings.colorBlindMode === opt.value
                  ? 'bg-sage-50 ring-1 ring-sage-300'
                  : 'hover:bg-warm-50'
              }`}
            >
              <input
                type="radio"
                name="colorBlindMode"
                value={opt.value}
                checked={settings.colorBlindMode === opt.value}
                onChange={() => update('colorBlindMode', opt.value)}
                className="sr-only"
              />
              {/* Custom radio indicator */}
              <span className={`flex items-center justify-center w-4 h-4 rounded-full border-2 transition-colors ${
                settings.colorBlindMode === opt.value
                  ? 'border-sage-500'
                  : 'border-warm-300'
              }`}>
                {settings.colorBlindMode === opt.value && (
                  <span className="w-2 h-2 rounded-full bg-sage-500" />
                )}
              </span>
              <span className="text-sm text-warm-700">{opt.label}</span>
              {opt.desc && (
                <span className="text-xs text-warm-400">({opt.desc})</span>
              )}
            </label>
          ))}
        </div>

        {/* Color preview */}
        <div className="mt-3 p-3 bg-warm-50 rounded-md border border-warm-200">
          <p className="text-xs text-warm-500 mb-2 font-medium">Assessment Color Preview</p>
          <div className="grid grid-cols-2 gap-2">
            {/* Normal colors */}
            <div>
              <p className="text-[10px] text-warm-400 mb-1 uppercase tracking-wide">Normal</p>
              <div className="flex gap-1.5">
                {Object.entries(ASSESSMENT_COLORS.none).map(([name, color]) => (
                  <div key={name} className="flex flex-col items-center gap-0.5">
                    <div
                      className="w-7 h-7 rounded-md border border-warm-200"
                      style={{ backgroundColor: color }}
                      title={name}
                    />
                    <span className="text-[9px] text-warm-500 leading-tight text-center">{name.split(' ').pop()}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Adjusted colors */}
            <div>
              <p className="text-[10px] text-warm-400 mb-1 uppercase tracking-wide">Adjusted</p>
              <div className="flex gap-1.5">
                {Object.entries(activeColorSet).map(([name, color]) => (
                  <div key={name} className="flex flex-col items-center gap-0.5">
                    <div
                      className="w-7 h-7 rounded-md border border-warm-200"
                      style={{ backgroundColor: color }}
                      title={name}
                    />
                    <span className="text-[9px] text-warm-500 leading-tight text-center">{name.split(' ').pop()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Reset Button ─────────────────────────────────── */}
      <div className="pt-2 border-t border-warm-200">
        <button
          onClick={resetDefaults}
          className="flex items-center gap-1.5 text-sm text-warm-500 hover:text-coral-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}
