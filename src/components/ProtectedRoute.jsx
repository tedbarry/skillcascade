import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

// Maintenance mode — only these emails can access the app
const ALLOWED_EMAILS = [
  'teddybahary@gmail.com',
  'debbieh@supportiveaba.com',
]
const MAINTENANCE_MODE = false

function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-xl border border-warm-200 shadow-sm p-8">
          <img
            src="/brand/maintenance-page.jpg"
            alt="System maintenance"
            className="w-48 max-w-[200px] h-auto rounded-xl mx-auto mb-5"
          />
          <h1 className="text-xl font-bold text-warm-800 font-display mb-2">
            Skill<span className="text-sage-500">Cascade</span>
          </h1>
          <h2 className="text-lg font-semibold text-warm-700 mb-3">
            Upgrading Our Systems
          </h2>
          <p className="text-sm text-warm-500 leading-relaxed mb-4">
            We're making infrastructure improvements to enhance security and performance.
            The platform will be back shortly.
          </p>
          <p className="text-xs text-warm-500">
            Questions? Reach us at{' '}
            <a href="mailto:support@skillcascade.com" className="text-sage-500 hover:text-sage-600">
              support@skillcascade.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-2xl font-bold text-warm-800 font-display animate-pulse">
            Skill<span className="text-sage-500">Cascade</span>
          </h1>
          <div className="w-6 h-6 border-2 border-sage-200 border-t-sage-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Maintenance mode — block non-whitelisted users
  if (MAINTENANCE_MODE && !ALLOWED_EMAILS.includes(user.email?.toLowerCase())) {
    return <MaintenancePage />
  }

  return children
}
