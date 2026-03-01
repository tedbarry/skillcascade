import { useState, useMemo } from 'react'

/* ─────────────────────────────────────────────
   Mock Marketplace Data
   ───────────────────────────────────────────── */

const MARKETPLACE_ITEMS = [
  // Assessment Packs
  {
    id: 'ap-001',
    type: 'assessment',
    title: 'Early Learner Profile (Ages 2-5)',
    author: 'Dr. Sarah Mitchell, BCBA-D',
    description: 'Comprehensive assessment framework targeting 85 foundational skills for young learners. Covers pre-verbal communication, basic self-regulation, early play skills, and sensory responses.',
    itemCount: 85,
    downloads: 2340,
    rating: 4.8,
    price: 'free',
    tags: ['early intervention', 'foundational', 'ages 2-5'],
    featured: true,
  },
  {
    id: 'ap-002',
    type: 'assessment',
    title: 'Adolescent Transition Skills',
    author: 'Transition Works Collective',
    description: '120 skills focused on preparing teens for greater independence. Includes vocational readiness, community navigation, self-advocacy, and daily living competencies.',
    itemCount: 120,
    downloads: 1856,
    rating: 4.6,
    price: 12,
    tags: ['adolescent', 'transition', 'independence'],
    featured: false,
  },
  {
    id: 'ap-003',
    type: 'assessment',
    title: 'School Readiness Assessment',
    author: 'Learning Bridge ABA',
    description: '60 skills aligned to kindergarten expectations including classroom routines, group instruction readiness, and basic academic precursors.',
    itemCount: 60,
    downloads: 3120,
    rating: 4.9,
    price: 'free',
    tags: ['school readiness', 'kindergarten', 'academic'],
    featured: true,
  },
  {
    id: 'ap-004',
    type: 'assessment',
    title: 'Adult Independent Living',
    author: 'Independence Path ABA',
    description: '95 skills for adult clients covering household management, financial basics, transportation, health management, and community participation.',
    itemCount: 95,
    downloads: 987,
    rating: 4.4,
    price: 15,
    tags: ['adult', 'independent living', 'community'],
    featured: false,
  },
  // Goal Banks
  {
    id: 'gb-001',
    type: 'goals',
    title: 'Foundation Goals: Regulation & Self-Awareness',
    author: 'Dr. Amara Johnson, BCBA-D',
    description: '40 pre-written, measurable treatment goals addressing Domains 1 and 2. Each goal includes suggested measurement criteria and baseline recommendations.',
    itemCount: 40,
    downloads: 4210,
    rating: 4.7,
    price: 'free',
    tags: ['regulation', 'self-awareness', 'D1', 'D2'],
    featured: true,
  },
  {
    id: 'gb-002',
    type: 'goals',
    title: 'Communication Goals: Expressive & Receptive',
    author: 'SpeakEasy ABA Services',
    description: '55 goals spanning expressive and receptive communication in Domain 5. Covers requesting, labeling, conversational skills, and comprehension milestones.',
    itemCount: 55,
    downloads: 3650,
    rating: 4.5,
    price: 8,
    tags: ['communication', 'expressive', 'receptive', 'D5'],
    featured: false,
  },
  {
    id: 'gb-003',
    type: 'goals',
    title: 'Social Skills Goal Bank',
    author: 'Connect & Thrive ABA',
    description: '45 goals targeting social cognition (D4) and social interaction (D6). Includes peer interaction, perspective-taking, and cooperative play goals.',
    itemCount: 45,
    downloads: 2890,
    rating: 4.6,
    price: 'free',
    tags: ['social skills', 'D4', 'D6', 'peer interaction'],
    featured: false,
  },
  {
    id: 'gb-004',
    type: 'goals',
    title: 'Executive Function Goals',
    author: 'Dr. Kevin Park, BCBA',
    description: '35 goals for executive functioning (D3) and cognitive skills (D7). Targets planning, organization, flexible thinking, and problem-solving.',
    itemCount: 35,
    downloads: 1540,
    rating: 4.3,
    price: 6,
    tags: ['executive function', 'D3', 'D7', 'planning'],
    featured: false,
  },
  // Skill Libraries
  {
    id: 'sl-001',
    type: 'skills',
    title: 'Sensory Processing Skills',
    author: 'Sensory Foundations Group',
    description: '30 additional sensory-specific skill definitions covering sensory modulation, discrimination, and sensory-motor integration.',
    itemCount: 30,
    downloads: 1980,
    rating: 4.5,
    price: 'free',
    tags: ['sensory', 'modulation', 'integration'],
    featured: false,
  },
  {
    id: 'sl-002',
    type: 'skills',
    title: 'Play Skills Development',
    author: 'PlayWorks ABA',
    description: '25 play-based skill definitions spanning exploratory play, constructive play, pretend play, and cooperative games.',
    itemCount: 25,
    downloads: 2450,
    rating: 4.7,
    price: 'free',
    tags: ['play', 'pretend', 'cooperative'],
    featured: true,
  },
  {
    id: 'sl-003',
    type: 'skills',
    title: 'Self-Care & Daily Living',
    author: 'Life Skills Academy',
    description: '40 ADL skills covering hygiene, dressing, feeding, and personal safety routines with clear operational definitions.',
    itemCount: 40,
    downloads: 1670,
    rating: 4.4,
    price: 5,
    tags: ['ADL', 'self-care', 'daily living'],
    featured: false,
  },
  {
    id: 'sl-004',
    type: 'skills',
    title: 'Academic Readiness Skills',
    author: 'SchoolBridge BCBA Team',
    description: '35 pre-academic skills including letter recognition, number concepts, writing readiness, and following multi-step classroom instructions.',
    itemCount: 35,
    downloads: 2100,
    rating: 4.6,
    price: 7,
    tags: ['academic', 'pre-academic', 'school'],
    featured: false,
  },
  // Report Templates
  {
    id: 'rt-001',
    type: 'template',
    title: 'IEP Progress Report Template',
    author: 'School Collaboration Network',
    description: 'Structured report template for school IEP meetings. Maps SkillCascade domains to educational standards with visual progress indicators.',
    itemCount: 1,
    downloads: 5430,
    rating: 4.9,
    price: 'free',
    tags: ['IEP', 'school', 'progress report'],
    featured: false,
  },
  {
    id: 'rt-002',
    type: 'template',
    title: 'Insurance Authorization Report',
    author: 'ABA Admin Solutions',
    description: 'Professional report format for insurance authorization and funding requests. Includes clinical justification sections and standardized outcome measures.',
    itemCount: 1,
    downloads: 4870,
    rating: 4.8,
    price: 10,
    tags: ['insurance', 'authorization', 'funding'],
    featured: false,
  },
  {
    id: 'rt-003',
    type: 'template',
    title: 'Parent-Friendly Progress Summary',
    author: 'Family First ABA',
    description: 'Simplified visual report designed for parent conferences. Uses plain language, visual charts, and celebration highlights to communicate progress.',
    itemCount: 1,
    downloads: 3920,
    rating: 4.7,
    price: 'free',
    tags: ['parent', 'visual', 'summary'],
    featured: false,
  },
  {
    id: 'rt-004',
    type: 'template',
    title: 'Clinical Case Presentation',
    author: 'Dr. Rachel Torres, BCBA-D',
    description: 'Comprehensive template for supervision sessions or clinical team meetings. Structured for case conceptualization, data review, and treatment planning.',
    itemCount: 1,
    downloads: 1290,
    rating: 4.5,
    price: 8,
    tags: ['clinical', 'supervision', 'case presentation'],
    featured: false,
  },
]

/* ─────────────────────────────────────────────
   Type config
   ───────────────────────────────────────────── */

const TYPE_CONFIG = {
  assessment: {
    label: 'Assessment Pack',
    unit: 'skills',
    pillBg: 'bg-sage-100',
    pillText: 'text-sage-700',
    accent: 'sage',
  },
  goals: {
    label: 'Goal Bank',
    unit: 'goals',
    pillBg: 'bg-warm-100',
    pillText: 'text-warm-700',
    accent: 'warm',
  },
  skills: {
    label: 'Skill Library',
    unit: 'skills',
    pillBg: 'bg-sage-50',
    pillText: 'text-sage-600',
    accent: 'sage',
  },
  template: {
    label: 'Report Template',
    unit: 'template',
    pillBg: 'bg-coral-100',
    pillText: 'text-coral-700',
    accent: 'coral',
  },
}

const TYPE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'assessment', label: 'Assessments' },
  { value: 'goals', label: 'Goal Banks' },
  { value: 'skills', label: 'Skill Libraries' },
  { value: 'template', label: 'Templates' },
]

const PRICE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
]

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
]

/* ─────────────────────────────────────────────
   SVG Icons (inline, no libraries)
   ───────────────────────────────────────────── */

function IconSearch({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  )
}

function IconDownload({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}

function IconCheck({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function IconEye({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IconStore({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
    </svg>
  )
}

function IconSparkle({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  )
}

function IconUploadCloud({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 3.75 3.75 0 013.572 5.345A4.5 4.5 0 0118 19.5H6.75z" />
    </svg>
  )
}

function IconChevronLeft({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

function IconChevronRight({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function IconX({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

/* ─────────────────────────────────────────────
   Star rating component
   ───────────────────────────────────────────── */

function StarRating({ rating, size = 'w-4 h-4' }) {
  const stars = []
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      stars.push(
        <svg key={i} className={`${size} text-warm-500`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )
    } else if (i - rating < 1) {
      stars.push(
        <svg key={i} className={`${size} text-warm-500`} viewBox="0 0 20 20">
          <defs>
            <linearGradient id={`half-${i}`}>
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path fill={`url(#half-${i})`} stroke="currentColor" strokeWidth="0.5" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )
    } else {
      stars.push(
        <svg key={i} className={`${size} text-warm-300`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )
    }
  }
  return <div className="flex items-center gap-0.5">{stars}</div>
}

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function formatDownloads(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

/* ─────────────────────────────────────────────
   Marketplace Component
   ───────────────────────────────────────────── */

export default function Marketplace() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [priceFilter, setPriceFilter] = useState('all')
  const [sortBy, setSortBy] = useState('popular')
  const [installedIds, setInstalledIds] = useState(() => {
    try {
      const saved = localStorage.getItem('skillcascade_marketplace_installed')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })
  const [toast, setToast] = useState(null)
  const [featuredScroll, setFeaturedScroll] = useState(0)
  const [previewItem, setPreviewItem] = useState(null)

  const featuredItems = useMemo(
    () => MARKETPLACE_ITEMS.filter((item) => item.featured),
    []
  )

  const filteredItems = useMemo(() => {
    let items = MARKETPLACE_ITEMS

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.author.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
      )
    }

    // Type filter
    if (typeFilter !== 'all') {
      items = items.filter((item) => item.type === typeFilter)
    }

    // Price filter
    if (priceFilter === 'free') {
      items = items.filter((item) => item.price === 'free')
    } else if (priceFilter === 'paid') {
      items = items.filter((item) => item.price !== 'free')
    }

    // Sort
    items = [...items].sort((a, b) => {
      if (sortBy === 'popular') return b.downloads - a.downloads
      if (sortBy === 'rating') return b.rating - a.rating
      if (sortBy === 'newest') return 0 // mock: maintain order as "newest"
      if (sortBy === 'price-asc') {
        const pa = a.price === 'free' ? 0 : a.price
        const pb = b.price === 'free' ? 0 : b.price
        return pa - pb
      }
      return 0
    })

    return items
  }, [search, typeFilter, priceFilter, sortBy])

  function handleInstall(item) {
    if (installedIds.has(item.id)) {
      // Uninstall
      setInstalledIds((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        localStorage.setItem('skillcascade_marketplace_installed', JSON.stringify([...next]))
        return next
      })
      setToast({ message: `"${item.title}" uninstalled`, type: 'success' })
      setTimeout(() => setToast(null), 3000)
      return
    }
    setInstalledIds((prev) => {
      const next = new Set([...prev, item.id])
      localStorage.setItem('skillcascade_marketplace_installed', JSON.stringify([...next]))
      return next
    })
    setToast({ message: `"${item.title}" installed successfully`, type: 'success' })
    setTimeout(() => setToast(null), 3000)
  }

  function scrollFeatured(direction) {
    const container = document.getElementById('featured-scroll')
    if (!container) return
    const scrollAmount = 340
    const newPos = direction === 'left'
      ? Math.max(0, container.scrollLeft - scrollAmount)
      : container.scrollLeft + scrollAmount
    container.scrollTo({ left: newPos, behavior: 'smooth' })
    setFeaturedScroll(newPos)
  }

  return (
    <div className="min-h-screen bg-warm-50">
      {/* ── Toast Notification ─────────────────── */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-sage-600 text-white px-5 py-3 rounded-lg shadow-lg animate-[fadeIn_0.2s_ease-out]">
          <IconCheck className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-white/70 hover:text-white transition-colors"
            aria-label="Dismiss notification"
          >
            <IconX />
          </button>
        </div>
      )}

      {/* ── Header ─────────────────────────────── */}
      <header className="bg-white border-b border-warm-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-sage-100 flex items-center justify-center text-sage-600">
                <IconStore className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-warm-900">
                  Marketplace
                </h1>
                <p className="text-warm-500 text-sm mt-0.5">
                  Community-created assessments, goals, skills, and templates
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-warm-400">
                <IconSearch className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search packs, goals, templates..."
                className="w-full pl-10 pr-4 py-2.5 bg-warm-50 border border-warm-200 rounded-lg text-sm text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-warm-400 hover:text-warm-600"
                  aria-label="Clear search"
                >
                  <IconX />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ── Filter Bar ───────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">
          {/* Type filter pills */}
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  typeFilter === f.value
                    ? 'bg-sage-600 text-white shadow-sm'
                    : 'bg-white text-warm-600 border border-warm-200 hover:border-warm-300 hover:bg-warm-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 sm:ml-auto">
            {/* Price filter */}
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-warm-200 rounded-lg text-sm text-warm-700 focus:outline-none focus:ring-2 focus:ring-sage-300 cursor-pointer"
            >
              {PRICE_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 bg-white border border-warm-200 rounded-lg text-sm text-warm-700 focus:outline-none focus:ring-2 focus:ring-sage-300 cursor-pointer"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Featured Section ─────────────────── */}
        {!search && typeFilter === 'all' && priceFilter === 'all' && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <IconSparkle className="w-5 h-5 text-warm-500" />
                <h2 className="font-display text-lg font-semibold text-warm-800">
                  Featured
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => scrollFeatured('left')}
                  className="p-1.5 rounded-lg text-warm-400 hover:text-warm-600 hover:bg-warm-100 transition-colors"
                  aria-label="Scroll featured left"
                >
                  <IconChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scrollFeatured('right')}
                  className="p-1.5 rounded-lg text-warm-400 hover:text-warm-600 hover:bg-warm-100 transition-colors"
                  aria-label="Scroll featured right"
                >
                  <IconChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              id="featured-scroll"
              className="flex gap-5 overflow-x-auto scrollbar-hide pb-2"
            >
              {featuredItems.map((item) => {
                const config = TYPE_CONFIG[item.type]
                const isInstalled = installedIds.has(item.id)
                return (
                  <div
                    key={item.id}
                    className="flex-shrink-0 w-80 bg-white rounded-xl border border-warm-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${config.pillBg} ${config.pillText}`}>
                        {config.label}
                      </span>
                      {item.price === 'free' ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-sage-100 text-sage-700">
                          Free
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-warm-100 text-warm-700">
                          ${item.price}
                        </span>
                      )}
                    </div>

                    <h3 className="font-display font-semibold text-warm-900 mb-1 line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-warm-500 mb-2">{item.author}</p>

                    <div className="flex items-center gap-3 mb-3">
                      <StarRating rating={item.rating} />
                      <span className="text-xs text-warm-500">{item.rating}</span>
                    </div>

                    <p className="text-sm text-warm-600 mb-4 line-clamp-2">
                      {item.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-warm-500 mb-4">
                      <span className="flex items-center gap-1">
                        <IconDownload className="w-3.5 h-3.5" />
                        {formatDownloads(item.downloads)}
                      </span>
                      <span>
                        {item.itemCount} {item.itemCount === 1 ? config.unit : config.unit + 's'}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setPreviewItem(item)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-warm-200 rounded-lg text-sm text-warm-700 hover:bg-warm-50 transition-colors">
                        <IconEye className="w-3.5 h-3.5" />
                        Preview
                      </button>
                      <button
                        onClick={() => handleInstall(item)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isInstalled
                            ? 'bg-sage-100 text-sage-600 hover:bg-red-50 hover:text-red-600'
                            : 'bg-sage-600 text-white hover:bg-sage-700'
                        }`}
                      >
                        {isInstalled ? (
                          <>
                            <IconCheck className="w-3.5 h-3.5" />
                            Installed
                          </>
                        ) : (
                          <>
                            <IconDownload className="w-3.5 h-3.5" />
                            Install
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Results Count ────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-warm-500">
            {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} found
          </p>
        </div>

        {/* ── Item Grid ────────────────────────── */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
            {filteredItems.map((item) => {
              const config = TYPE_CONFIG[item.type]
              const isInstalled = installedIds.has(item.id)
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-warm-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
                >
                  {/* Top row: type badge + price */}
                  <div className="flex items-start justify-between mb-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${config.pillBg} ${config.pillText}`}>
                      {config.label}
                    </span>
                    {item.price === 'free' ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-sage-100 text-sage-700">
                        Free
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-warm-100 text-warm-700">
                        ${item.price}
                      </span>
                    )}
                  </div>

                  {/* Title + author */}
                  <h3 className="font-display font-semibold text-warm-900 mb-1 line-clamp-2 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-warm-500 mb-2">{item.author}</p>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-2">
                    <StarRating rating={item.rating} size="w-3.5 h-3.5" />
                    <span className="text-xs text-warm-500">{item.rating}</span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-warm-600 mb-3 line-clamp-2 flex-1">
                    {item.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-warm-500 mb-3">
                    <span className="flex items-center gap-1">
                      <IconDownload className="w-3 h-3" />
                      {formatDownloads(item.downloads)} downloads
                    </span>
                    <span>
                      {item.itemCount} {item.itemCount === 1 ? config.unit : config.unit + 's'}
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-warm-50 border border-warm-100 rounded text-xs text-warm-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto">
                    <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-warm-200 rounded-lg text-sm text-warm-700 hover:bg-warm-50 transition-colors">
                      <IconEye className="w-3.5 h-3.5" />
                      Preview
                    </button>
                    <button
                      onClick={() => handleInstall(item)}
                      disabled={isInstalled}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isInstalled
                          ? 'bg-sage-100 text-sage-600 cursor-default'
                          : 'bg-sage-600 text-white hover:bg-sage-700'
                      }`}
                    >
                      {isInstalled ? (
                        <>
                          <IconCheck className="w-3.5 h-3.5" />
                          Installed
                        </>
                      ) : (
                        <>
                          <IconDownload className="w-3.5 h-3.5" />
                          Install
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ── Empty State ──────────────────────── */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-warm-100 flex items-center justify-center text-warm-400 mb-4">
              <IconSearch className="w-7 h-7" />
            </div>
            <h3 className="font-display text-lg font-semibold text-warm-800 mb-2">
              No items found
            </h3>
            <p className="text-sm text-warm-500 max-w-md mb-6">
              No marketplace items match your current filters. Try broadening your search
              or adjusting the category and price filters.
            </p>
            <button
              onClick={() => {
                setSearch('')
                setTypeFilter('all')
                setPriceFilter('all')
              }}
              className="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* ── Submit Your Own CTA ──────────────── */}
        <section className="bg-white rounded-xl border border-warm-200 p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-coral-50 flex items-center justify-center text-coral-500 shrink-0">
              <IconUploadCloud className="w-7 h-7" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-display text-lg font-semibold text-warm-900 mb-1">
                Share your expertise with the community
              </h3>
              <p className="text-sm text-warm-600 max-w-xl">
                Created a custom assessment, goal bank, or report template? Submit it to
                the SkillCascade Marketplace and help fellow BCBAs deliver better outcomes.
                Free and paid submissions welcome.
              </p>
            </div>
            <button className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-coral-500 text-white text-sm font-medium rounded-lg hover:bg-coral-600 transition-colors">
              <IconUploadCloud className="w-4 h-4" />
              Submit content
            </button>
          </div>
        </section>
      </div>

      {/* ── Preview Modal ──────────────────────── */}
      {previewItem && (() => {
        const config = TYPE_CONFIG[previewItem.type]
        const isInstalled = installedIds.has(previewItem.id)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setPreviewItem(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${config.pillBg} ${config.pillText}`}>
                    {config.label}
                  </span>
                  <button onClick={() => setPreviewItem(null)} className="text-warm-400 hover:text-warm-600 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Close preview">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <h2 className="font-display text-xl font-bold text-warm-900 mb-1">{previewItem.title}</h2>
                <p className="text-sm text-warm-500 mb-3">{previewItem.author}</p>
                <div className="flex items-center gap-3 mb-4">
                  <StarRating rating={previewItem.rating} />
                  <span className="text-sm text-warm-600">{previewItem.rating}</span>
                  <span className="text-sm text-warm-400">|</span>
                  <span className="text-sm text-warm-500">{formatDownloads(previewItem.downloads)} downloads</span>
                </div>
                <p className="text-sm text-warm-700 leading-relaxed mb-4">{previewItem.description}</p>
                <div className="flex flex-wrap gap-4 text-sm text-warm-600 mb-4">
                  <span>{previewItem.itemCount} {previewItem.itemCount === 1 ? config.unit : config.unit + 's'}</span>
                  <span>{previewItem.price === 'free' ? 'Free' : `$${previewItem.price}`}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {previewItem.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-warm-50 border border-warm-100 rounded text-xs text-warm-500">{tag}</span>
                  ))}
                </div>
                <button
                  onClick={() => { handleInstall(previewItem); if (!isInstalled) setPreviewItem(null) }}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isInstalled
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-sage-600 text-white hover:bg-sage-700'
                  }`}
                >
                  {isInstalled ? (
                    <><IconCheck className="w-4 h-4" /> Uninstall</>
                  ) : (
                    <><IconDownload className="w-4 h-4" /> Install</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
