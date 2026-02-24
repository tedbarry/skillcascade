import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    // Compact inline fallback for view-level boundaries
    if (this.props.fallback) {
      return typeof this.props.fallback === 'function'
        ? this.props.fallback({ error: this.state.error, reset: this.handleReset })
        : this.props.fallback
    }

    // Full-page fallback
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50 p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-warm-800 font-display mb-2">
            Skill<span className="text-sage-500">Cascade</span>
          </h1>
          <p className="text-warm-600 mb-4">Something went wrong. This view encountered an unexpected error.</p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-sage-500 text-white rounded-lg hover:bg-sage-600 transition-colors text-sm font-medium"
          >
            Try again
          </button>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-4 text-left text-xs text-red-600 bg-red-50 rounded-lg p-3 overflow-auto max-h-40">
              {this.state.error.message}
            </pre>
          )}
        </div>
      </div>
    )
  }
}
