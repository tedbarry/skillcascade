import { Component } from 'react'
import { track } from '../lib/analytics.js'
import { trackError } from '../lib/errorTracker.js'

/**
 * Enhanced error boundary for individual Dashboard views.
 * Provides a polished fallback UI with retry/navigate actions
 * and optional dev-mode error details.
 */
export default class ViewErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, showDetails: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error(`[ViewErrorBoundary] Error in ${this.props.viewName}:`, error, info.componentStack)
    track('error', 'view_error', { view: this.props.viewName, message: error.message })
    trackError(error, { component: 'ViewErrorBoundary', view: this.props.viewName })
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null, showDetails: false })
    this.props.onRetry?.()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const { viewName, onNavigateHome } = this.props
    const { error, showDetails } = this.state

    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        {/* Error illustration */}
        <img
          src="/brand/error-page.jpg"
          alt="View error"
          className="w-40 max-w-[180px] h-auto rounded-xl mb-2"
        />

        {/* Error message */}
        <p className="text-warm-700 font-medium mb-1">
          The {viewName} view ran into a problem
        </p>
        <p className="text-warm-500 text-sm mb-1 max-w-sm">
          This is usually caused by a temporary glitch or unexpected data.
        </p>
        <p className="text-warm-500 text-sm mb-6 max-w-sm">
          Click <strong className="text-warm-500">Retry</strong> to reload the view, or <strong className="text-warm-500">Go Home</strong> to start fresh.
        </p>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={this.resetErrorBoundary}
            className="px-5 py-2 min-h-[44px] bg-sage-600 text-white rounded-xl hover:bg-sage-700 active:bg-sage-800 transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-400 focus-visible:ring-offset-2"
          >
            Retry
          </button>
          <button
            onClick={onNavigateHome}
            className="px-5 py-2 min-h-[44px] border border-warm-200 text-warm-600 rounded-xl hover:bg-warm-50 active:bg-warm-100 transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-300 focus-visible:ring-offset-2"
          >
            Go Home
          </button>
        </div>

        {/* Dev-mode error details (collapsed by default) */}
        {import.meta.env.DEV && error && (
          <div className="mt-6 w-full max-w-lg">
            <button
              onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
              className="text-xs text-warm-500 hover:text-warm-500 transition-colors min-h-[44px] px-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-300 rounded"
            >
              {showDetails ? 'Hide' : 'Show'} error details
            </button>
            {showDetails && (
              <pre className="mt-2 text-left text-xs text-red-700 bg-red-50 rounded-xl p-4 overflow-auto max-h-48 border border-red-100">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            )}
          </div>
        )}
      </div>
    )
  }
}
