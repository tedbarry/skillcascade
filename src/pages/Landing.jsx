import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'

const CascadeAnimation = lazy(() => import('../components/CascadeAnimation.jsx'))
const PricingPage = lazy(() => import('../components/PricingPage.jsx'))

/* ── Inline SVG Icons ─────────────────────────────────────── */

function BirdIcon({ className = '' }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 8c-1.5 1.5-4 2-6 1.5-.5 2-2 3.5-4 4l-3 1-2 3h10l2-3c2-1 3.5-3 3.5-5.5L21 8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="17" cy="7" r="1" fill="currentColor" />
      <path d="M6 17.5L3 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function CascadeIcon({ className = '' }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="7" height="4" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="8" y="10" width="7" height="4" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="17" width="7" height="4" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 7v3.5a1 1 0 001 1H8M11.5 14v3.5a1 1 0 001 1H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function SparkleIcon({ className = '' }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function TargetIcon({ className = '' }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  )
}

function UsersIcon({ className = '' }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="17.5" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M19 14c2.2.6 3.5 2.5 3.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function TrendIcon({ className = '' }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 20L9 13l4 4 8-10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 7h4v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ZapIcon({ className = '' }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function AlertIcon({ className = '' }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2L2 20h20L12 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 10v4M12 17v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function FileIcon({ className = '' }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 2v6h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function ShieldIcon({ className = '' }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7l-9-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8.5 12.5L10.8 14.8L15.5 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LockIcon({ className = '' }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function CheckCircleIcon({ className = '' }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 12.5L10.8 15.3L16 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MenuIcon({ className = '' }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon({ className = '' }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function QuoteIcon({ className = '' }) {
  return (
    <svg className={className} width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 8H6a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V8c0 4-2 6-4 7M20 8h-4a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V8c0 4-2 6-4 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ArrowDownIcon({ className = '' }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4v16m0 0l-6-6m6 6l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── Data ─────────────────────────────────────────────────── */

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Framework', href: '#framework' },
  { label: 'Demo', href: '#demo' },
  { label: 'Pricing', href: '#pricing' },
]

const STATS = [
  { value: '300+', label: 'Skills Assessed' },
  { value: '9', label: 'Developmental Domains' },
  { value: '47', label: 'Sub-Areas' },
  { value: '8', label: 'AI Tools' },
]

const FEATURES = [
  { icon: BirdIcon, title: "Bird's Eye Assessment", desc: 'See the full picture across 9 developmental domains in a single, unified view.' },
  { icon: CascadeIcon, title: 'Cascade Visualization', desc: 'Understand why foundational gaps cascade into higher-level breakdowns.' },
  { icon: SparkleIcon, title: 'AI-Powered Insights', desc: '8 specialized AI assistants for analysis, recommendations, and reporting.' },
  { icon: TargetIcon, title: 'Goal Engine', desc: 'Auto-generate individualized treatment targets based on assessment data.' },
  { icon: UsersIcon, title: 'Parent Portal', desc: 'Jargon-free progress sharing that keeps caregivers informed and engaged.' },
  { icon: TrendIcon, title: 'Progress Prediction', desc: 'Data-driven growth trajectories that help you plan and measure outcomes.' },
  { icon: ZapIcon, title: 'Quick Assess', desc: 'Adaptive screening that identifies key gaps in minutes, not hours.' },
  { icon: AlertIcon, title: 'Pattern Alerts', desc: 'Catch regression, plateaus, and emerging patterns before they compound.' },
  { icon: FileIcon, title: 'Report Generator', desc: 'Professional school, medical, and progress reports generated in seconds.' },
]

const STEPS = [
  {
    num: '01',
    title: 'Assess',
    desc: 'Complete the adaptive screening or full 300-skill assessment. The system guides you through each domain, adapting to the learner in real time.',
    color: 'bg-coral-100 text-coral-700 border-coral-200',
  },
  {
    num: '02',
    title: 'Visualize',
    desc: 'See the cascade effect across all 9 domains. Instantly identify which foundational gaps are causing higher-level breakdowns.',
    color: 'bg-warm-100 text-warm-700 border-warm-200',
  },
  {
    num: '03',
    title: 'Act',
    desc: 'Use AI-powered tools, auto-generated goals, and data-driven insights to target interventions where they will have the greatest impact.',
    color: 'bg-sage-100 text-sage-700 border-sage-200',
  },
]

const DOMAINS = [
  { num: 1, name: 'Regulation', desc: 'Body, Emotion, Arousal', color: 'bg-coral-100 border-coral-300', tier: 'foundation' },
  { num: 2, name: 'Self-Awareness', desc: 'Insight & Understanding', color: 'bg-coral-50 border-coral-200', tier: 'foundation' },
  { num: 3, name: 'Executive Function', desc: 'Start, Sustain, Shift, Finish', color: 'bg-warm-100 border-warm-300', tier: 'foundation' },
  { num: 4, name: 'Problem Solving', desc: 'Judgment & Strategy', color: 'bg-warm-100 border-warm-200', tier: 'middle' },
  { num: 5, name: 'Communication', desc: 'Functional & Social', color: 'bg-warm-50 border-warm-200', tier: 'middle' },
  { num: 6, name: 'Social Understanding', desc: 'Perspective & Norms', color: 'bg-sage-50 border-sage-200', tier: 'middle' },
  { num: 7, name: 'Identity', desc: 'Self-Concept & Resilience', color: 'bg-sage-100 border-sage-200', tier: 'upper' },
  { num: 8, name: 'Safety & Survival', desc: 'Override Skills', color: 'bg-sage-100 border-sage-300', tier: 'upper' },
  { num: 9, name: 'Support System', desc: 'Caregiver & Environment', color: 'bg-sage-200 border-sage-300', tier: 'upper' },
]

const TESTIMONIALS = [
  {
    quote: "The cascade visualization changed how I think about assessment entirely. I can show parents exactly why we're targeting regulation before social skills -- it's the 'aha' moment every family deserves.",
    name: 'Dr. Sarah Mitchell, BCBA-D',
    role: 'Clinical Director, Bright Horizons ABA',
    initials: 'SM',
  },
  {
    quote: "We cut our assessment-to-treatment time by 60%. The AI goal engine and caseload dashboard mean my team spends less time on paperwork and more time with clients. ROI was immediate.",
    name: 'James Thornton, MBA',
    role: 'CEO, Spectrum Therapy Partners (12 locations)',
    initials: 'JT',
  },
  {
    quote: "For the first time, I actually understand my son's progress reports. The parent portal explains everything in plain language, and the milestone celebrations make therapy feel like a team effort.",
    name: 'Maria Gonzalez',
    role: 'Parent & Family Advocate',
    initials: 'MG',
  },
]

const FOOTER_LINKS = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Framework', href: '#framework' },
    { label: 'Live Demo', href: '#demo' },
    { label: 'Dashboard', href: '/dashboard' },
  ],
  Resources: [
    { label: 'Documentation', href: '#' },
    { label: 'API Reference', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Case Studies', href: '#' },
    { label: 'Webinars', href: '#' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
    { label: 'Partners', href: '#' },
    { label: 'Press', href: '#' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'HIPAA Compliance', href: '#' },
    { label: 'BAA', href: '#' },
    { label: 'Security', href: '#' },
  ],
}

/* ── Main Component ───────────────────────────────────────── */

export default function Landing() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const heroRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (href) => {
    setMobileMenuOpen(false)
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-warm-50 overflow-x-hidden">

      {/* ────────────────────────────────────────────────────────
          1. Sticky Nav
          ──────────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-sm shadow-md'
            : 'bg-transparent'
        }`}
      >
        <div className="flex items-center justify-between px-6 lg:px-8 py-4 max-w-7xl mx-auto">
          <div className="text-2xl font-bold text-warm-800 font-display">
            Skill<span className="text-sage-500">Cascade</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex gap-8 items-center">
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={() => scrollToSection(link.href)}
                className="text-warm-600 hover:text-warm-800 transition-colors text-sm font-medium"
              >
                {link.label}
              </button>
            ))}
            <Link
              to="/dashboard"
              className="bg-sage-500 text-white px-5 py-2.5 rounded-lg hover:bg-sage-600 transition-colors font-medium text-sm"
            >
              Launch App
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden text-warm-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-warm-100 shadow-lg">
            <div className="px-6 py-4 space-y-3">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => scrollToSection(link.href)}
                  className="block w-full text-left text-warm-700 hover:text-warm-900 py-2 text-base font-medium"
                >
                  {link.label}
                </button>
              ))}
              <Link
                to="/dashboard"
                className="block w-full text-center bg-sage-500 text-white px-5 py-3 rounded-lg hover:bg-sage-600 transition-colors font-medium mt-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Launch App
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ────────────────────────────────────────────────────────
          2. Hero
          ──────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative pt-32 pb-20 lg:pt-44 lg:pb-28 overflow-hidden"
      >
        {/* Animated gradient background */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 40%, var(--color-sage-100) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 20%, var(--color-coral-100) 0%, transparent 50%), radial-gradient(ellipse 50% 40% at 20% 60%, var(--color-sage-50) 0%, transparent 50%)',
          }}
        />
        {/* Subtle dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--color-warm-900) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-sage-50 border border-sage-200 px-4 py-1.5 text-xs font-semibold text-sage-700 uppercase tracking-wider mb-8">
            <ShieldIcon className="w-4 h-4 text-sage-500" />
            HIPAA-Compliant Assessment Platform
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-warm-900 font-display leading-[1.1] mb-6 tracking-tight">
            See the skills beneath<br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-sage-600 via-sage-500 to-coral-500 bg-clip-text text-transparent">
              the behavior
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-warm-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            SkillCascade maps 300+ developmental-functional skills across 9 domains,
            revealing why foundational gaps cascade into higher-level breakdowns.
            Visualize, assess, and track — so you can intervene where it matters most.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              to="/dashboard"
              className="bg-sage-500 text-white px-8 py-4 rounded-xl hover:bg-sage-600 transition-colors text-lg font-semibold shadow-lg shadow-sage-500/20"
            >
              Start Free Trial
            </Link>
            <button
              type="button"
              onClick={() => scrollToSection('#demo')}
              className="border-2 border-warm-300 text-warm-700 px-8 py-4 rounded-xl hover:border-warm-400 hover:bg-warm-100/50 transition-colors text-lg font-semibold flex items-center justify-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M10 8l6 4-6 4V8z" fill="currentColor" />
              </svg>
              Watch Demo
            </button>
          </div>

          {/* Social proof */}
          <p className="text-sm text-warm-500 mb-6">
            Trusted by <span className="font-semibold text-warm-700">200+ BCBAs</span> across <span className="font-semibold text-warm-700">50+ therapy practices</span>
          </p>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-6">
            <div className="flex items-center gap-2 text-warm-500 text-xs font-medium">
              <ShieldIcon className="w-4 h-4 text-sage-500" />
              <span>HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-warm-500 text-xs font-medium">
              <CheckCircleIcon className="w-4 h-4 text-sage-500" />
              <span>BACB Aligned</span>
            </div>
            <div className="flex items-center gap-2 text-warm-500 text-xs font-medium">
              <LockIcon className="w-4 h-4 text-sage-500" />
              <span>256-bit Encryption</span>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          3. Key Stats Bar
          ──────────────────────────────────────────────────────── */}
      <section className="bg-warm-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl sm:text-4xl font-extrabold text-white font-display">
                  {stat.value}
                </div>
                <div className="text-warm-300 text-sm mt-1 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          4. Features Grid
          ──────────────────────────────────────────────────────── */}
      <section id="features" className="max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-28">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-coral-50 border border-coral-200 px-4 py-1.5 text-xs font-semibold text-coral-600 uppercase tracking-wider mb-4">
            Everything You Need
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-warm-900 font-display mb-4">
            Assessment tools that actually move the needle
          </h2>
          <p className="text-warm-600 max-w-2xl mx-auto text-lg">
            From initial screening to treatment planning, SkillCascade replaces scattered
            spreadsheets and guesswork with a unified, intelligent platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-white border border-warm-100 rounded-2xl p-6 hover:shadow-lg hover:border-warm-200 transition-all duration-200 group"
            >
              <div className="w-12 h-12 rounded-xl bg-sage-50 border border-sage-100 flex items-center justify-center text-sage-600 mb-4 group-hover:bg-sage-100 transition-colors">
                <Icon />
              </div>
              <h3 className="text-lg font-bold text-warm-800 font-display mb-2">
                {title}
              </h3>
              <p className="text-warm-600 text-sm leading-relaxed">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          5. How It Works
          ──────────────────────────────────────────────────────── */}
      <section className="bg-warm-100/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-28">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-warm-200/60 border border-warm-300/50 px-4 py-1.5 text-xs font-semibold text-warm-700 uppercase tracking-wider mb-4">
              Simple Workflow
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-warm-900 font-display mb-4">
              Three steps to better outcomes
            </h2>
            <p className="text-warm-600 max-w-2xl mx-auto text-lg">
              SkillCascade turns complex developmental assessment into a clear,
              actionable workflow any BCBA can follow.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {STEPS.map((step, i) => (
              <div key={step.num} className="relative">
                <div className="bg-white rounded-2xl p-8 border border-warm-200 h-full">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full border text-sm font-bold mb-5 ${step.color}`}>
                    {step.num}
                  </div>
                  <h3 className="text-xl font-bold text-warm-800 font-display mb-3">
                    {step.title}
                  </h3>
                  <p className="text-warm-600 text-sm leading-relaxed">
                    {step.desc}
                  </p>
                </div>
                {/* Connecting arrow between steps (desktop only) */}
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M2 8h12M10 4l4 4-4 4" stroke="var(--color-warm-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          6. Framework Section
          ──────────────────────────────────────────────────────── */}
      <section id="framework" className="max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-28">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-sage-50 border border-sage-200 px-4 py-1.5 text-xs font-semibold text-sage-700 uppercase tracking-wider mb-4">
            The Science
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-warm-900 font-display mb-4">
            9 Domains, One Cascading System
          </h2>
          <p className="text-warm-600 max-w-2xl mx-auto text-lg">
            Each domain builds on the ones below it. When foundational skills are unstable,
            everything above becomes unreliable. This is the cascade effect.
          </p>
        </div>

        {/* Tiered pyramid layout */}
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Foundation tier label */}
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-coral-500">Foundation</span>
            <div className="flex-1 h-px bg-coral-200" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {DOMAINS.filter((d) => d.tier === 'foundation').map((d) => (
              <div key={d.num} className={`${d.color} border rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-md`}>
                <div className="text-xs font-bold text-warm-500 mb-1 uppercase tracking-wider">Domain {d.num}</div>
                <div className="text-lg font-bold text-warm-800 font-display">{d.name}</div>
                <div className="text-sm text-warm-600">{d.desc}</div>
              </div>
            ))}
          </div>

          {/* Cascade arrow */}
          <div className="flex justify-center py-1">
            <ArrowDownIcon className="text-warm-400 rotate-180" />
          </div>

          {/* Middle tier label */}
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-warm-500">Integration</span>
            <div className="flex-1 h-px bg-warm-200" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {DOMAINS.filter((d) => d.tier === 'middle').map((d) => (
              <div key={d.num} className={`${d.color} border rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-md`}>
                <div className="text-xs font-bold text-warm-500 mb-1 uppercase tracking-wider">Domain {d.num}</div>
                <div className="text-lg font-bold text-warm-800 font-display">{d.name}</div>
                <div className="text-sm text-warm-600">{d.desc}</div>
              </div>
            ))}
          </div>

          {/* Cascade arrow */}
          <div className="flex justify-center py-1">
            <ArrowDownIcon className="text-warm-400 rotate-180" />
          </div>

          {/* Upper tier label */}
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-sage-600">Applied</span>
            <div className="flex-1 h-px bg-sage-200" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {DOMAINS.filter((d) => d.tier === 'upper').map((d) => (
              <div key={d.num} className={`${d.color} border rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-md`}>
                <div className="text-xs font-bold text-warm-500 mb-1 uppercase tracking-wider">Domain {d.num}</div>
                <div className="text-lg font-bold text-warm-800 font-display">{d.name}</div>
                <div className="text-sm text-warm-600">{d.desc}</div>
              </div>
            ))}
          </div>

          {/* Explanatory note */}
          <div className="text-center mt-6">
            <p className="text-sm text-warm-500 italic">
              Gaps in foundation domains cascade upward, making higher-level skills unreliable.
              Effective intervention starts at the bottom.
            </p>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          7. Demo Section
          ──────────────────────────────────────────────────────── */}
      <section id="demo" className="bg-warm-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-28">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-warm-700 border border-warm-600 px-4 py-1.5 text-xs font-semibold text-warm-300 uppercase tracking-wider mb-4">
              Interactive Demo
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white font-display mb-4">
              See Why Foundations Matter
            </h2>
            <p className="text-warm-400 max-w-2xl mx-auto text-lg">
              Click any domain to weaken it and watch the impact cascade upward.
              This is why effective intervention starts at the bottom.
            </p>
          </div>
          <Suspense fallback={<div className="bg-[#1a1a1e] rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto shadow-2xl h-[400px] animate-pulse" />}>
            <div className="bg-[#1a1a1e] rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto shadow-2xl">
              <CascadeAnimation compact />
            </div>
          </Suspense>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          8. Testimonials
          ──────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-28">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-warm-100 border border-warm-200 px-4 py-1.5 text-xs font-semibold text-warm-600 uppercase tracking-wider mb-4">
            What People Say
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-warm-900 font-display mb-4">
            Trusted by clinicians who care about outcomes
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-white border border-warm-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <QuoteIcon className="text-sage-300 mb-4" />
              <p className="text-warm-700 text-sm leading-relaxed mb-6">
                {t.quote}
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-warm-100">
                <div className="w-10 h-10 rounded-full bg-sage-100 border border-sage-200 flex items-center justify-center text-sage-700 text-xs font-bold">
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-warm-800">{t.name}</div>
                  <div className="text-xs text-warm-500">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          9. Pricing Section
          ──────────────────────────────────────────────────────── */}
      <section id="pricing">
        <Suspense fallback={<div className="py-20 text-center"><div className="w-6 h-6 border-2 border-sage-200 border-t-sage-500 rounded-full animate-spin mx-auto" /></div>}>
          <PricingPage />
        </Suspense>
      </section>

      {/* ────────────────────────────────────────────────────────
          10. Final CTA
          ──────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-10 pb-20">
        <div className="rounded-2xl bg-sage-500 px-6 sm:px-12 py-16 text-center relative overflow-hidden">
          {/* Subtle pattern overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
          <div className="relative">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to transform your<br className="hidden sm:block" /> assessment workflow?
            </h2>
            <p className="text-sage-100 max-w-lg mx-auto mb-8 text-base">
              Join 200+ BCBAs who have already made the switch. Start your 14-day
              free trial today -- no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/dashboard"
                className="rounded-xl bg-white px-8 py-4 text-base font-semibold text-sage-700 shadow-lg hover:bg-sage-50 transition-colors"
              >
                Start Free Trial
              </Link>
              <button
                type="button"
                onClick={() => scrollToSection('#demo')}
                className="rounded-xl border-2 border-white/30 bg-transparent px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-colors"
              >
                See the Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          11. Footer
          ──────────────────────────────────────────────────────── */}
      <footer className="bg-warm-900 text-warm-400">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          {/* Footer columns */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1 mb-4 md:mb-0">
              <div className="text-xl font-bold text-white font-display mb-3">
                Skill<span className="text-sage-400">Cascade</span>
              </div>
              <p className="text-sm text-warm-500 leading-relaxed">
                Developmental-functional assessment that reveals the skills beneath the behavior.
              </p>
            </div>

            {/* Link columns */}
            {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
              <div key={heading}>
                <h4 className="text-xs font-bold text-warm-300 uppercase tracking-wider mb-4">
                  {heading}
                </h4>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith('/') ? (
                        <Link
                          to={link.href}
                          className="text-sm text-warm-500 hover:text-white transition-colors"
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          className="text-sm text-warm-500 hover:text-white transition-colors"
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="border-t border-warm-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-warm-600">
              &copy; {new Date().getFullYear()} SkillCascade. All rights reserved.
            </p>
            {/* Social icons */}
            <div className="flex gap-4">
              {/* Twitter/X */}
              <a href="#" className="text-warm-600 hover:text-white transition-colors" aria-label="Twitter">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 4l6.5 8L4 20h2l5.5-6.8L16 20h4l-6.8-8.5L19.5 4h-2l-5.2 6.3L8 4H4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              </a>
              {/* LinkedIn */}
              <a href="#" className="text-warm-600 hover:text-white transition-colors" aria-label="LinkedIn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M8 11v5M8 8v.5M12 16v-4c0-1.1.9-2 2-2s2 .9 2 2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </a>
              {/* GitHub */}
              <a href="#" className="text-warm-600 hover:text-white transition-colors" aria-label="GitHub">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.49.5.09.66-.22.66-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0112 6.8c.85 0 1.7.11 2.5.34 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.85v2.74c0 .27.16.58.67.48A10 10 0 0022 12c0-5.52-4.48-10-10-10z" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
