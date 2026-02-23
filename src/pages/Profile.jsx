import { Link } from 'react-router-dom'

export default function Profile() {
  return (
    <div className="min-h-screen bg-warm-50">
      <header className="bg-white border-b border-warm-200 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-warm-800 font-display">
          Skill<span className="text-sage-500">Cascade</span>
        </Link>
        <div className="text-sm text-warm-500">Client Profile — Coming Soon</div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-20 text-center">
        <h1 className="text-3xl font-bold text-warm-800 font-display mb-4">
          Client Profile View
        </h1>
        <p className="text-warm-600 mb-8 max-w-xl mx-auto">
          Individual client visualizations, progress timelines, and export features
          are being built.
        </p>
        <Link
          to="/dashboard"
          className="text-sage-600 hover:text-sage-700 font-medium"
        >
          &larr; Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
