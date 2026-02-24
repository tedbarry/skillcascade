import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

const Landing = lazy(() => import('./pages/Landing.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const Signup = lazy(() => import('./pages/Signup.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))

function LoadingSpinner() {
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

export default function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:clientId?"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </AuthProvider>
    </ErrorBoundary>
  )
}
