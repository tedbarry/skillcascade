import useSubscription, { PLAN_LABELS, FEATURE_META } from '../hooks/useSubscription.js'

/**
 * FeatureGate — wraps content that requires a paid plan.
 * Shows an upgrade prompt if the user's plan doesn't include the feature.
 */
export default function FeatureGate({ feature, children }) {
  const { hasFeature, getRequiredPlan, plan } = useSubscription()

  if (hasFeature(feature)) return children

  const requiredPlan = getRequiredPlan(feature)
  const meta = FEATURE_META[feature] || { label: feature, description: '' }
  const planLabel = PLAN_LABELS[requiredPlan] || requiredPlan

  return <UpgradePrompt featureLabel={meta.label} description={meta.description} requiredPlan={planLabel} />
}

function UpgradePrompt({ featureLabel, description, requiredPlan }) {
  return (
    <div className="flex items-center justify-center min-h-[400px] px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-warm-50 rounded-2xl border border-warm-200 p-8">
          {/* Lock icon */}
          <div className="mx-auto w-12 h-12 rounded-full bg-sage-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>

          <h3 className="text-lg font-bold text-warm-800 font-display mb-2">
            {featureLabel}
          </h3>

          {description && (
            <p className="text-sm text-warm-500 mb-4 leading-relaxed">
              {description}
            </p>
          )}

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sage-50 border border-sage-200 text-xs font-medium text-sage-700 mb-5">
            Requires {requiredPlan} plan
          </div>

          <div>
            <button
              onClick={() => {
                // Navigate to pricing view via URL params
                const url = new URL(window.location)
                url.searchParams.set('view', 'pricing')
                window.history.pushState({}, '', url)
                window.dispatchEvent(new PopStateEvent('popstate'))
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-sage-500 text-white rounded-lg text-sm font-semibold hover:bg-sage-600 transition-colors min-h-[44px]"
            >
              View Plans
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
