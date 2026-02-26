import { useState, memo } from 'react'

const GUIDE_STEPS = [
  {
    title: 'How Skills Connect',
    body: 'This explorer shows how developmental domains, sub-areas, and individual skills depend on each other. Understanding these connections helps you target the right foundation skills.',
    icon: (
      <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
  },
  {
    title: 'Level 1: Domain Overview',
    body: 'You start here. The circle shows all 9 developmental domains. Colored ribbons connect domains that share dependencies. Click any domain arc or legend label to zoom in.',
    icon: (
      <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.564A.562.562 0 019 14.437V9.564z" />
      </svg>
    ),
  },
  {
    title: 'Level 2: Sub-Area Map',
    body: 'After clicking a domain, you see its sub-areas and their cross-domain prerequisites. Lines show which sub-areas feed into others. Click any sub-area box to see individual skills.',
    icon: (
      <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    title: 'Level 3: Skill Dependencies',
    body: 'Pick a skill to see exactly what it requires (left side) and what depends on it (right side). Color-coded by assessment status. Click any skill to recenter the tree on it.',
    icon: (
      <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
      </svg>
    ),
  },
  {
    title: 'Navigate with Breadcrumbs',
    body: 'The bar at the top shows where you are. Click any part of the breadcrumb trail to jump back. Use "Show All" at Level 2 to see all 47 sub-areas at once.',
    icon: (
      <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
      </svg>
    ),
  },
]

const STORAGE_KEY = 'skillcascade_explorer_guide_dismissed'

/**
 * ExplorerGuide — Step-through walkthrough overlay for the dependency explorer.
 * Shows on first visit, dismisses permanently via localStorage.
 */
export default memo(function ExplorerGuide({ onDismiss }) {
  const [step, setStep] = useState(0)
  const current = GUIDE_STEPS[step]
  const isLast = step === GUIDE_STEPS.length - 1

  function handleNext() {
    if (isLast) {
      localStorage.setItem(STORAGE_KEY, 'true')
      onDismiss()
    } else {
      setStep(step + 1)
    }
  }

  function handleSkip() {
    localStorage.setItem(STORAGE_KEY, 'true')
    onDismiss()
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-sm mx-4 overflow-hidden">
        {/* Step content */}
        <div className="p-6 text-center">
          <div className="mb-4 flex justify-center">{current.icon}</div>
          <h3 className="text-base font-semibold text-gray-100 mb-2">{current.title}</h3>
          <p className="text-sm text-gray-400 leading-relaxed">{current.body}</p>
        </div>

        {/* Step indicator */}
        <div className="flex justify-center gap-1.5 pb-4">
          {GUIDE_STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? 'bg-amber-400' : i < step ? 'bg-gray-600' : 'bg-gray-800'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center border-t border-gray-800 px-4 py-3 gap-3">
          <button
            onClick={handleSkip}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors min-h-[36px] px-3"
          >
            Skip guide
          </button>
          <div className="flex-1" />
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-3 min-h-[36px] transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className="text-xs font-medium text-gray-900 bg-amber-400 hover:bg-amber-300 rounded-lg px-4 min-h-[36px] transition-colors"
          >
            {isLast ? 'Start Exploring' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
})

export { STORAGE_KEY }
