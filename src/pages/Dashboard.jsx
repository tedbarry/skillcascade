import { Link } from 'react-router-dom'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-warm-50">
      {/* Top bar */}
      <header className="bg-white border-b border-warm-200 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-warm-800 font-display">
          Skill<span className="text-sage-500">Cascade</span>
        </Link>
        <div className="text-sm text-warm-500">Dashboard — Coming Soon</div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-20 text-center">
        <h1 className="text-3xl font-bold text-warm-800 font-display mb-4">
          Assessment Dashboard
        </h1>
        <p className="text-warm-600 mb-8 max-w-xl mx-auto">
          The interactive assessment interface with sunburst charts, radar views,
          and skill trees is being built. Check back soon.
        </p>
        <Link
          to="/"
          className="text-sage-600 hover:text-sage-700 font-medium"
        >
          &larr; Back to Home
        </Link>
      </div>
    </div>
  )
}
