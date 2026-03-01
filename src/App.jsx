import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { ToastProvider } from './components/Toast.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import OfflineBanner from './components/OfflineBanner.jsx'

const Landing = lazy(() => import('./pages/Landing.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const Signup = lazy(() => import('./pages/Signup.jsx'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'))
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const Legal = lazy(() => import('./pages/Legal.jsx'))
const Contact = lazy(() => import('./pages/Contact.jsx'))

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-50">
      <div className="text-center px-6">
        <h1 className="text-6xl font-bold text-warm-300 font-display">404</h1>
        <p className="mt-3 text-lg text-warm-600">Page not found</p>
        <p className="mt-1 text-sm text-warm-400">The page you're looking for doesn't exist.</p>
        <Link
          to="/"
          className="inline-block mt-6 px-5 py-2.5 rounded-lg bg-sage-500 text-white text-sm font-medium hover:bg-sage-600 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}

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

const pageFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15, ease: 'easeInOut' },
}

export default function App() {
  const location = useLocation()

  return (
    <ErrorBoundary>
    <AuthProvider>
    <ToastProvider>
      <OfflineBanner />
      <main id="main-content">
      <Suspense fallback={<LoadingSpinner />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<motion.div {...pageFade}><Landing /></motion.div>} />
            <Route path="/login" element={<motion.div {...pageFade}><Login /></motion.div>} />
            <Route path="/signup" element={<motion.div {...pageFade}><Signup /></motion.div>} />
            <Route path="/forgot-password" element={<motion.div {...pageFade}><ForgotPassword /></motion.div>} />
            <Route path="/reset-password" element={<motion.div {...pageFade}><ResetPassword /></motion.div>} />
            <Route path="/legal/:page" element={<motion.div {...pageFade}><Legal /></motion.div>} />
            <Route path="/contact" element={<motion.div {...pageFade}><Contact /></motion.div>} />
            <Route
              path="/dashboard"
              element={
                <motion.div {...pageFade}>
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                </motion.div>
              }
            />
            <Route
              path="/profile/:clientId?"
              element={
                <motion.div {...pageFade}>
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                </motion.div>
              }
            />
            <Route path="*" element={<motion.div {...pageFade}><NotFound /></motion.div>} />
          </Routes>
        </AnimatePresence>
      </Suspense>
      </main>
    </ToastProvider>
    </AuthProvider>
    </ErrorBoundary>
  )
}
