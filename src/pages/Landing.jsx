import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'

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

function DashboardIcon({ className = '' }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
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

const DEMO_TABS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: DashboardIcon,
    title: 'Your Command Center',
    desc: 'See every client\'s developmental profile at a glance. Domain health grid, completion stats, cascade alerts, and quick actions \u2014 all on one screen.',
    bullets: ['Domain health grid with 9 color-coded cards', 'Real-time cascade alerts & risk detection', 'Quick actions prioritized by leverage', 'Snapshot timeline for progress tracking'],
    mockup: 'dashboard',
  },
  {
    id: 'visualize',
    label: 'Visualize',
    icon: BirdIcon,
    title: 'Four Ways to See the Data',
    desc: 'Sunburst, radar, skill tree, and dependency explorer give you every angle on a learner\'s developmental profile.',
    bullets: ['Sunburst hierarchy drill-down', 'Radar domain comparison', 'Skill tree with bottleneck detection', 'Dependency explorer (chord \u2192 web \u2192 skill)'],
    mockup: 'visualize',
  },
  {
    id: 'assess',
    label: 'Assess',
    icon: TargetIcon,
    title: 'Smarter Assessment',
    desc: 'Full 300-skill assessment or adaptive quick screening that identifies key gaps in minutes. Auto-saves, keyboard navigation, and bulk rate support.',
    bullets: ['Adaptive branching (~2 min)', 'Full 300+ skill assessment', 'Import from Central Reach / Raven / Passage', 'Auto-save with undo/redo'],
    mockup: 'assess',
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    icon: SparkleIcon,
    title: 'Clinical Intelligence Engine',
    desc: 'Five purpose-driven views: status map, bottleneck finder, intervention planner, risk monitor, and progress story. Two modes: directive and discovery.',
    bullets: ['Bottleneck detection across domains', 'Auto-prioritized intervention targets', '7 risk pattern types detected', 'Narrative summaries for stakeholders'],
    mockup: 'intelligence',
  },
  {
    id: 'ai',
    label: 'AI Tools',
    icon: ZapIcon,
    title: '8 Specialized AI Assistants',
    desc: 'Write goals, BIPs, session notes, operational definitions, and reports \u2014 all pre-loaded with the client\'s current assessment data.',
    bullets: ['Goal writing assistant', 'BIP & session note generator', 'Operational definitions', 'Pre-loaded with assessment context'],
    mockup: 'ai',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileIcon,
    title: 'Professional Reports in Seconds',
    desc: 'Four report types: parent summary, progress report, clinical assessment (insurance-ready with BCBA signature block), and custom. Download or print.',
    bullets: ['Insurance-ready clinical assessment', 'Vineland-style domain profiles', 'Auto-generated narratives', 'BCBA signature block'],
    mockup: 'reports',
  },
]

/* ── Demo Mockup Illustrations ───────────────────────────── */

function DashboardMockup() {
  const domains = [
    { name: 'Regulation', pct: 87, color: '#7fb589', state: 'Solid' },
    { name: 'Self-Awareness', pct: 78, color: '#c4956a', state: 'Developing' },
    { name: 'Exec Function', pct: 59, color: '#d4856a', state: 'Developing' },
    { name: 'Problem Solving', pct: 61, color: '#d4856a', state: 'Blocked' },
    { name: 'Communication', pct: 47, color: '#e8725c', state: 'Needs Work' },
    { name: 'Social Understand.', pct: 53, color: '#d4856a', state: 'Blocked' },
  ]
  return (
    <div className="bg-warm-700/50 rounded-xl border border-warm-600/30 overflow-hidden">
      {/* Top stats bar */}
      <div className="grid grid-cols-4 gap-px bg-warm-600/20">
        {[
          { label: 'Assessed', value: '282/282', accent: '#7fb589' },
          { label: 'Solid', value: '86', accent: '#7fb589' },
          { label: 'Needs Work', value: '81', accent: '#e8725c' },
          { label: 'Alerts', value: '4', accent: '#e8725c' },
        ].map(s => (
          <div key={s.label} className="bg-warm-700/60 p-2.5 text-center">
            <div className="text-sm font-bold" style={{ color: s.accent }}>{s.value}</div>
            <div className="text-[9px] text-warm-400">{s.label}</div>
          </div>
        ))}
      </div>
      {/* Domain grid */}
      <div className="p-3">
        <div className="text-[10px] text-warm-400 font-medium uppercase tracking-wider mb-2">Domain Health</div>
        <div className="grid grid-cols-3 gap-1.5">
          {domains.map(d => (
            <div key={d.name} className="bg-warm-800/40 rounded-lg p-2">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-[9px] text-warm-300 truncate">{d.name}</span>
              </div>
              <div className="h-1 bg-warm-700/50 rounded-full overflow-hidden mb-1">
                <div className="h-full rounded-full" style={{ width: `${d.pct}%`, backgroundColor: d.color }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[8px] text-warm-500">{d.state}</span>
                <span className="text-[9px] font-semibold" style={{ color: d.color }}>{d.pct}%</span>
              </div>
            </div>
          ))}
        </div>
        {/* Alert preview */}
        <div className="mt-2 bg-warm-800/40 rounded-lg p-2 border-l-2 border-l-amber-500/60">
          <div className="text-[9px] text-warm-400 font-semibold uppercase">Bottleneck</div>
          <div className="text-[10px] text-warm-300">Executive Function blocks 4 higher domains</div>
        </div>
      </div>
    </div>
  )
}

function VisualizeMockup() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Sunburst mockup */}
      <div className="bg-warm-700/50 rounded-xl p-4 border border-warm-600/30">
        <div className="text-[10px] text-warm-400 font-medium mb-2 uppercase tracking-wider">Sunburst</div>
        <svg viewBox="0 0 120 120" className="w-full mx-auto">
          <circle cx="60" cy="60" r="18" fill="#4f8460" opacity="0.9" />
          <path d="M60 60 L60 10 A50 50 0 0 1 103 35 Z" fill="#7fb589" opacity="0.7" />
          <path d="M60 60 L103 35 A50 50 0 0 1 103 85 Z" fill="#c4956a" opacity="0.7" />
          <path d="M60 60 L103 85 A50 50 0 0 1 60 110 Z" fill="#e8a87c" opacity="0.6" />
          <path d="M60 60 L60 110 A50 50 0 0 1 17 85 Z" fill="#d4856a" opacity="0.7" />
          <path d="M60 60 L17 85 A50 50 0 0 1 17 35 Z" fill="#7fb589" opacity="0.6" />
          <path d="M60 60 L17 35 A50 50 0 0 1 60 10 Z" fill="#90c49a" opacity="0.7" />
        </svg>
      </div>
      {/* Radar mockup */}
      <div className="bg-warm-700/50 rounded-xl p-4 border border-warm-600/30">
        <div className="text-[10px] text-warm-400 font-medium mb-2 uppercase tracking-wider">Radar</div>
        <svg viewBox="0 0 120 120" className="w-full mx-auto">
          <polygon points="60,15 95,35 105,70 85,100 60,110 35,100 15,70 25,35" fill="none" stroke="#4a3f35" strokeWidth="0.5" opacity="0.4" />
          <polygon points="60,30 82,43 90,68 75,90 60,97 45,90 30,68 38,43" fill="none" stroke="#4a3f35" strokeWidth="0.5" opacity="0.3" />
          <polygon points="60,45 70,52 74,66 66,78 60,82 54,78 46,66 50,52" fill="none" stroke="#4a3f35" strokeWidth="0.5" opacity="0.2" />
          <polygon points="60,20 88,40 95,72 78,95 60,102 42,95 22,72 32,40" fill="#7fb589" fillOpacity="0.3" stroke="#7fb589" strokeWidth="1.5" />
          {[0,1,2,3,4,5,6,7].map(i => {
            const a = (i * 45 - 90) * Math.PI / 180
            const r = [42, 30, 35, 25, 38, 32, 28, 36][i]
            return <circle key={i} cx={60 + r * Math.cos(a)} cy={60 + r * Math.sin(a)} r="2.5" fill="#7fb589" />
          })}
        </svg>
      </div>
      {/* Skill Tree mockup */}
      <div className="bg-warm-700/50 rounded-xl p-4 border border-warm-600/30">
        <div className="text-[10px] text-warm-400 font-medium mb-2 uppercase tracking-wider">Skill Tree</div>
        <svg viewBox="0 0 120 80" className="w-full">
          <line x1="25" y1="40" x2="55" y2="20" stroke="#7fb589" strokeWidth="1.5" opacity="0.5" />
          <line x1="25" y1="40" x2="55" y2="40" stroke="#7fb589" strokeWidth="1.5" opacity="0.5" />
          <line x1="25" y1="40" x2="55" y2="60" stroke="#7fb589" strokeWidth="1.5" opacity="0.5" />
          <line x1="55" y1="20" x2="95" y2="12" stroke="#c4956a" strokeWidth="1.5" opacity="0.5" />
          <line x1="55" y1="20" x2="95" y2="28" stroke="#c4956a" strokeWidth="1.5" opacity="0.5" />
          <line x1="55" y1="40" x2="95" y2="40" stroke="#c4956a" strokeWidth="1.5" opacity="0.5" />
          <line x1="55" y1="60" x2="95" y2="55" stroke="#d4856a" strokeWidth="1.5" opacity="0.5" />
          <line x1="55" y1="60" x2="95" y2="68" stroke="#d4856a" strokeWidth="1.5" opacity="0.5" />
          <circle cx="25" cy="40" r="8" fill="#4f8460" />
          <circle cx="55" cy="20" r="6" fill="#7fb589" />
          <circle cx="55" cy="40" r="6" fill="#7fb589" />
          <circle cx="55" cy="60" r="6" fill="#d4856a" />
          <circle cx="95" cy="12" r="5" fill="#c4956a" />
          <circle cx="95" cy="28" r="5" fill="#7fb589" />
          <circle cx="95" cy="40" r="5" fill="#c4956a" />
          <circle cx="95" cy="55" r="5" fill="#d4856a" />
          <circle cx="95" cy="68" r="5" fill="#e8a87c" />
        </svg>
      </div>
      {/* Explorer mockup */}
      <div className="bg-warm-700/50 rounded-xl p-4 border border-warm-600/30">
        <div className="text-[10px] text-warm-400 font-medium mb-2 uppercase tracking-wider">Explorer</div>
        <svg viewBox="0 0 120 120" className="w-full mx-auto">
          {/* Chord diagram arcs */}
          <circle cx="60" cy="60" r="48" fill="none" stroke="#4a3f35" strokeWidth="0.5" opacity="0.3" />
          {[0,1,2,3,4,5].map(i => {
            const a = (i * 60 - 90) * Math.PI / 180
            const colors = ['#d4856a','#c4956a','#e8a87c','#7fb589','#90c49a','#4f8460']
            return <circle key={i} cx={60 + 48 * Math.cos(a)} cy={60 + 48 * Math.sin(a)} r="6" fill={colors[i]} opacity="0.8" />
          })}
          <path d="M60 12 Q30 40 12 60" fill="none" stroke="#7fb589" strokeWidth="1.5" opacity="0.4" />
          <path d="M108 60 Q80 30 60 12" fill="none" stroke="#c4956a" strokeWidth="1.5" opacity="0.4" />
          <path d="M90 102 Q60 70 12 60" fill="none" stroke="#d4856a" strokeWidth="1.5" opacity="0.4" />
          <path d="M30 102 Q50 80 90 102" fill="none" stroke="#e8a87c" strokeWidth="1.5" opacity="0.3" />
          <path d="M108 60 Q80 90 30 102" fill="none" stroke="#90c49a" strokeWidth="1.5" opacity="0.3" />
        </svg>
      </div>
    </div>
  )
}

function AssessMockup() {
  const skills = [
    { name: 'Identifies own emotions', level: 2, color: '#c4956a' },
    { name: 'Recognizes others\u2019 feelings', level: 1, color: '#d4856a' },
    { name: 'Labels emotional intensity', level: null, color: null },
  ]
  return (
    <div className="bg-warm-700/50 rounded-xl border border-warm-600/30 overflow-hidden">
      {/* Progress bar */}
      <div className="h-1.5 bg-warm-600/30">
        <div className="h-full bg-sage-500 rounded-r" style={{ width: '62%' }} />
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] text-warm-400 font-medium uppercase tracking-wider">Self-Awareness &rsaquo; Emotional Insight</span>
          <span className="text-[10px] text-sage-400 font-semibold">62%</span>
        </div>
        <div className="space-y-2.5">
          {skills.map((s, i) => (
            <div key={i} className={`flex items-center justify-between p-2.5 rounded-lg ${i === 1 ? 'bg-warm-600/30 ring-1 ring-sage-500/40' : 'bg-warm-700/30'}`}>
              <span className="text-xs text-warm-200 truncate mr-3">{s.name}</span>
              <div className="flex gap-1.5 shrink-0">
                {[0,1,2,3].map(lvl => (
                  <div
                    key={lvl}
                    className={`w-5 h-5 rounded-full border ${
                      s.level !== null && lvl <= s.level
                        ? 'border-transparent'
                        : 'border-warm-500/40 bg-transparent'
                    }`}
                    style={s.level !== null && lvl <= s.level ? { backgroundColor: s.color } : {}}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-warm-600/20">
          <div className="flex gap-1">
            {['Not Assessed','Needs Work','Developing','Solid'].map((l, i) => (
              <div key={l} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#4a3f35','#d4856a','#c4956a','#7fb589'][i] }} />
                <span className="text-[9px] text-warm-500">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function IntelligenceMockup() {
  const tiles = [
    { label: 'REG', pct: 87, color: '#7fb589' },
    { label: 'SA', pct: 78, color: '#c4956a' },
    { label: 'EF', pct: 59, color: '#d4856a' },
    { label: 'PS', pct: 61, color: '#d4856a' },
    { label: 'COM', pct: 47, color: '#e8725c' },
    { label: 'SU', pct: 53, color: '#d4856a' },
    { label: 'ID', pct: 54, color: '#d4856a' },
    { label: 'SAF', pct: 86, color: '#7fb589' },
    { label: 'SS', pct: 75, color: '#c4956a' },
  ]
  return (
    <div className="bg-warm-700/50 rounded-xl p-4 border border-warm-600/30">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-warm-400 font-medium uppercase tracking-wider">Status Map</span>
        <div className="flex gap-1">
          <span className="text-[9px] bg-sage-500/20 text-sage-400 px-1.5 py-0.5 rounded font-medium">Directive</span>
          <span className="text-[9px] bg-warm-600/30 text-warm-400 px-1.5 py-0.5 rounded font-medium">Discovery</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {tiles.map(t => (
          <div key={t.label} className="bg-warm-800/60 rounded-lg p-2 text-center">
            <div className="text-[9px] text-warm-400 font-medium">{t.label}</div>
            <div className="text-sm font-bold mt-0.5" style={{ color: t.color }}>{t.pct}%</div>
          </div>
        ))}
      </div>
      {/* Mini bottleneck bar */}
      <div className="bg-warm-800/40 rounded-lg p-2.5">
        <div className="text-[9px] text-warm-400 mb-1.5 font-medium">Top Leverage</div>
        {[{ name: 'Executive Function', w: '85%', c: '#d4856a' }, { name: 'Communication', w: '72%', c: '#e8725c' }, { name: 'Self-Awareness', w: '55%', c: '#c4956a' }].map(b => (
          <div key={b.name} className="flex items-center gap-2 mb-1">
            <span className="text-[9px] text-warm-300 w-24 truncate">{b.name}</span>
            <div className="flex-1 h-1.5 bg-warm-700/50 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: b.w, backgroundColor: b.c }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AIMockup() {
  return (
    <div className="bg-warm-700/50 rounded-xl border border-warm-600/30 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-warm-600/20">
        <div className="w-2 h-2 rounded-full bg-sage-500" />
        <span className="text-[10px] text-warm-300 font-medium">Goal Writing Assistant</span>
        <span className="text-[9px] text-warm-500 ml-auto">Powered by AI</span>
      </div>
      <div className="p-4 space-y-3">
        {/* User message */}
        <div className="flex justify-end">
          <div className="bg-sage-500/20 border border-sage-500/30 rounded-xl rounded-br-sm px-3 py-2 max-w-[80%]">
            <p className="text-[11px] text-warm-200 leading-relaxed">Write a measurable goal for improving emotional regulation</p>
          </div>
        </div>
        {/* AI response */}
        <div className="flex justify-start">
          <div className="bg-warm-600/30 border border-warm-500/20 rounded-xl rounded-bl-sm px-3 py-2 max-w-[90%]">
            <p className="text-[11px] text-warm-200 leading-relaxed mb-1.5">Based on the assessment data (Regulation: 87%, Self-Awareness: 78%):</p>
            <p className="text-[11px] text-warm-300 leading-relaxed font-medium">&ldquo;Given a frustrating task, the learner will independently use a taught calming strategy within 30 seconds across 4/5 opportunities over 3 consecutive sessions.&rdquo;</p>
            <div className="flex gap-2 mt-2">
              <span className="text-[9px] bg-sage-500/20 text-sage-400 px-1.5 py-0.5 rounded">Copy</span>
              <span className="text-[9px] bg-warm-600/40 text-warm-300 px-1.5 py-0.5 rounded">Refine</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReportsMockup() {
  return (
    <div className="bg-warm-700/50 rounded-xl border border-warm-600/30 overflow-hidden">
      {/* Document header */}
      <div className="bg-warm-600/20 px-4 py-3 border-b border-warm-600/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-warm-200 font-semibold">Clinical Assessment Report</div>
            <div className="text-[9px] text-warm-400">SkillCascade Developmental-Functional Profile</div>
          </div>
          <div className="flex gap-1.5">
            <span className="text-[9px] bg-sage-500/20 text-sage-400 px-2 py-1 rounded font-medium">Download</span>
            <span className="text-[9px] bg-warm-600/40 text-warm-300 px-2 py-1 rounded font-medium">Print</span>
          </div>
        </div>
      </div>
      <div className="p-4">
        {/* Mini domain bar chart */}
        <div className="text-[9px] text-warm-400 font-medium mb-2 uppercase tracking-wider">Domain Score Profile</div>
        <div className="space-y-1 mb-3">
          {[
            { name: 'Regulation', w: '87%', c: '#7fb589' },
            { name: 'Self-Awareness', w: '78%', c: '#c4956a' },
            { name: 'Exec Function', w: '59%', c: '#d4856a' },
            { name: 'Problem Solving', w: '61%', c: '#d4856a' },
            { name: 'Communication', w: '47%', c: '#e8725c' },
          ].map(d => (
            <div key={d.name} className="flex items-center gap-2">
              <span className="text-[9px] text-warm-400 w-20 truncate">{d.name}</span>
              <div className="flex-1 h-2 bg-warm-700/40 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: d.w, backgroundColor: d.c }} />
              </div>
              <span className="text-[9px] text-warm-300 w-7 text-right">{d.w.replace('%','')}</span>
            </div>
          ))}
        </div>
        {/* Narrative preview */}
        <div className="bg-warm-800/40 rounded-lg p-2.5 mb-3">
          <div className="text-[9px] text-warm-400 font-medium mb-1">Clinical Narrative</div>
          <div className="text-[9px] text-warm-500 leading-relaxed">The learner demonstrates relative strength in regulatory skills with emerging capacity in self-awareness...</div>
        </div>
        {/* Signature block */}
        <div className="border-t border-warm-600/20 pt-2.5 flex items-center justify-between">
          <div>
            <div className="text-[9px] text-warm-400">BCBA Signature</div>
            <div className="w-24 h-px bg-warm-500/40 mt-2" />
          </div>
          <div className="text-right">
            <div className="text-[9px] text-warm-400">Date</div>
            <div className="w-16 h-px bg-warm-500/40 mt-2" />
          </div>
        </div>
      </div>
    </div>
  )
}

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
  const [activeDemo, setActiveDemo] = useState('dashboard')
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
          7. Demo Section — Tabbed Feature Showcase
          ──────────────────────────────────────────────────────── */}
      <section id="demo" className="bg-warm-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-28">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-warm-700 border border-warm-600 px-4 py-1.5 text-xs font-semibold text-warm-300 uppercase tracking-wider mb-4">
              Interactive Demo
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white font-display mb-4">
              See What&rsquo;s Inside
            </h2>
            <p className="text-warm-400 max-w-2xl mx-auto text-lg">
              Explore the tools that 200+ BCBAs use every day to transform assessment into action.
            </p>
          </div>

          {/* Tab bar */}
          <div className="flex justify-center mb-8">
            <div className="flex gap-1 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide" role="tablist">
              {DEMO_TABS.map((tab) => {
                const Icon = tab.icon
                const isActive = activeDemo === tab.id
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveDemo(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-white text-warm-800 shadow-lg'
                        : 'text-warm-400 hover:text-warm-200 hover:bg-warm-700/50'
                    }`}
                  >
                    <Icon className={isActive ? 'text-sage-600' : 'text-warm-500'} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab content */}
          {DEMO_TABS.map((tab) => {
            if (tab.id !== activeDemo) return null
            return (
              <div key={tab.id} className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start min-h-[360px]">
                {/* Left: text content */}
                <div className="flex flex-col justify-center">
                  <h3 className="text-2xl sm:text-3xl font-bold text-white font-display mb-4">
                    {tab.title}
                  </h3>
                  <p className="text-warm-300 text-base leading-relaxed mb-6">
                    {tab.desc}
                  </p>
                  <ul className="space-y-2.5 mb-6">
                    {tab.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3 text-sm text-warm-300">
                        <svg className="w-5 h-5 text-sage-400 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <div>
                    <Link
                      to="/dashboard"
                      className="inline-flex items-center gap-2 bg-sage-500 text-white px-6 py-3 rounded-xl hover:bg-sage-600 transition-colors font-semibold text-sm shadow-lg shadow-sage-500/20"
                    >
                      Try It Free
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                  </div>
                </div>

                {/* Right: mockup visual */}
                <div className="flex items-center justify-center">
                  {tab.mockup === 'dashboard' && <div className="w-full max-w-md"><DashboardMockup /></div>}
                  {tab.mockup === 'visualize' && <VisualizeMockup />}
                  {tab.mockup === 'assess' && <div className="w-full max-w-md"><AssessMockup /></div>}
                  {tab.mockup === 'intelligence' && <div className="w-full max-w-md"><IntelligenceMockup /></div>}
                  {tab.mockup === 'ai' && <div className="w-full max-w-md"><AIMockup /></div>}
                  {tab.mockup === 'reports' && <div className="w-full max-w-md"><ReportsMockup /></div>}
                </div>
              </div>
            )
          })}
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
        <Suspense fallback={
          <div className="min-h-screen bg-warm-50 px-4 py-16 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              {/* Skeleton: pricing hero */}
              <div className="text-center">
                <div className="h-6 w-56 rounded-full bg-warm-200 animate-pulse mx-auto mb-5" />
                <div className="h-10 w-80 rounded-lg bg-warm-200 animate-pulse mx-auto mb-4" />
                <div className="h-5 w-64 rounded bg-warm-200 animate-pulse mx-auto mb-8" />
                <div className="flex items-center justify-center gap-3">
                  <div className="h-4 w-16 rounded bg-warm-200 animate-pulse" />
                  <div className="h-7 w-[52px] rounded-full bg-warm-200 animate-pulse" />
                  <div className="h-4 w-14 rounded bg-warm-200 animate-pulse" />
                </div>
              </div>
              {/* Skeleton: 3 pricing cards */}
              <div className="mt-14 grid gap-8 lg:grid-cols-3 items-start">
                {[1,2,3].map(i => (
                  <div key={i} className={`rounded-2xl bg-white border p-7 ${i === 2 ? 'border-sage-300 border-2 shadow-lg' : 'border-warm-200 shadow-md'}`}>
                    {/* Tier name */}
                    <div className="h-5 w-24 rounded bg-warm-200 animate-pulse mb-2" />
                    {/* Description */}
                    <div className="h-4 w-40 rounded bg-warm-200 animate-pulse mb-5" />
                    {/* Price */}
                    <div className="flex items-baseline gap-2">
                      <div className="h-9 w-20 rounded bg-warm-200 animate-pulse" />
                      <div className="h-4 w-14 rounded bg-warm-200 animate-pulse" />
                    </div>
                    {/* Capacity lines */}
                    <div className="mt-4 space-y-1.5">
                      <div className="h-4 w-28 rounded bg-warm-200 animate-pulse" />
                      <div className="h-4 w-24 rounded bg-warm-200 animate-pulse" />
                    </div>
                    {/* CTA button */}
                    <div className="mt-6 h-10 w-full rounded-lg bg-warm-200 animate-pulse" />
                    <div className="h-3 w-48 rounded bg-warm-200 animate-pulse mx-auto mt-2" />
                    {/* Feature list divider */}
                    <div className="mt-4 border-t border-warm-100 pt-6 space-y-3">
                      {[1,2,3,4,5,6,7,8].map(j => (
                        <div key={j} className="flex items-center gap-2.5">
                          <div className="h-4 w-4 rounded-full bg-warm-200 animate-pulse shrink-0" />
                          <div className="h-4 rounded bg-warm-200 animate-pulse" style={{ width: `${55 + (j * 7) % 35}%` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        }>
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
