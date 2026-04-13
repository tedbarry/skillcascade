import { useSearchParams } from 'react-router-dom'
import useSubscription from '../hooks/useSubscription.js'

/**
 * ClinicalGate — wraps content that requires the clinical add-on subscription.
 * Shows an upgrade prompt if the user doesn't have clinical_access.
 * While loading, renders children (don't block).
 * Super admins always pass.
 */
export default function ClinicalGate({ children }) {
  const { hasClinical, loading } = useSubscription()

  // Don't block while subscription is loading
  if (loading || hasClinical) return children

  return <ClinicalUpgradePrompt />
}

function ClinicalUpgradePrompt() {
  const [, setSearchParams] = useSearchParams()

  return (
    <div className="flex items-center justify-center min-h-[400px] px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-xl border border-warm-200 p-8 shadow-sm">
          {/* Stethoscope / clinical icon */}
          <div className="mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>

          <h3 className="text-lg font-bold text-warm-800 font-display mb-2">
            Clinical Tools
          </h3>

          <p className="text-sm text-warm-500 mb-4 leading-relaxed">
            Scheduling, session management, notes workflow, client files, and practice intelligence.
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sage-50 border border-sage-200 text-xs font-medium text-sage-700 mb-5">
            Requires Clinical add-on
          </div>

          <div>
            <button
              onClick={() => setSearchParams({ v: 'pricing' }, { replace: false })}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-sage-600 text-white rounded-full text-sm font-semibold hover:bg-sage-700 transition-all min-h-[44px]"
            >
              Upgrade to Clinical
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
