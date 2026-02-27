import { Component } from 'react'

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
        {/* Warning icon */}
        <svg
          className="w-12 h-12 text-warm-400 mb-4"
          fill="none"
          viewBox="0 0 48 48"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            d="M24 6L4 42h40L24 6z"
            strokeLinejoin="round"
          />
          <path
            d="M24 18v10"
            strokeLinecap="round"
          />
          <circle cx="24" cy="34" r="1.5" fill="currentColor" stroke="none" />
        </svg>

        {/* Error message */}
        <p className="text-warm-700 font-medium mb-1">
          The {viewName} view ran into a problem
        </p>
        <p className="text-warm-400 text-sm mb-1 max-w-sm">
          This is usually caused by a temporary glitch or unexpected data.
        </p>
        <p className="text-warm-400 text-sm mb-6 max-w-sm">
          Click <strong className="text-warm-500">Retry</strong> to reload the view, or <strong className="text-warm-500">Go Home</strong> to start fresh.
        </p>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={this.resetErrorBoundary}
            className="px-5 py-2 min-h-[44px] bg-sage-500 text-white rounded-xl hover:bg-sage-600 active:bg-sage-700 transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-400 focus-visible:ring-offset-2"
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
              className="text-xs text-warm-400 hover:text-warm-500 transition-colors min-h-[44px] px-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-300 rounded"
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
