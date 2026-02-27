/**
 * SkeletonLoader — Content-shaped loading placeholders
 * Replaces spinning loaders with shimmer skeletons that match the layout being loaded.
 */

function Shimmer({ className = '' }) {
  return (
    <div className={`bg-warm-200 rounded animate-pulse ${className}`} />
  )
}

/** Generic card skeleton */
export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-warm-200 p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <Shimmer className="w-8 h-8 rounded-full shrink-0" />
        <Shimmer className="h-4 w-32" />
      </div>
      <Shimmer className="h-2 w-full mb-2" />
      <Shimmer className="h-2 w-3/4" />
    </div>
  )
}

/** Chart/visualization area skeleton */
export function SkeletonChart({ className = '' }) {
  return (
    <div className={`flex flex-col items-center w-full ${className}`}>
      <Shimmer className="h-5 w-48 mb-2" />
      <Shimmer className="h-3 w-64 mb-6" />
      <div className="w-full max-w-lg aspect-square rounded-2xl bg-warm-100 border border-warm-200 flex items-center justify-center">
        <div className="w-3/4 h-3/4 rounded-full border-4 border-warm-200 animate-pulse" />
      </div>
    </div>
  )
}

/** List of items skeleton */
export function SkeletonList({ rows = 5, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Shimmer className="w-6 h-6 rounded shrink-0" />
          <div className="flex-1">
            <Shimmer className="h-3.5 mb-1.5" style={{ width: `${60 + Math.random() * 30}%` }} />
            <Shimmer className="h-2.5" style={{ width: `${40 + Math.random() * 20}%` }} />
          </div>
          <Shimmer className="w-12 h-6 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  )
}

/** 3x3 card grid skeleton (for cascade status map, domain grid, etc.) */
export function SkeletonGrid({ cols = 3, rows = 3, className = '' }) {
  return (
    <div className={`grid gap-3 ${className}`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols * rows }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

/** Dashboard home skeleton */
export function SkeletonDashboard() {
  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 animate-pulse">
      <Shimmer className="h-7 w-48 mb-2" />
      <Shimmer className="h-4 w-72 mb-8" />
      <div className="grid grid-cols-[auto_1fr] gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-warm-200 p-6 w-[140px] h-[160px]">
          <div className="w-24 h-24 rounded-full border-4 border-warm-200 mx-auto" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-warm-50 rounded-xl p-4">
              <Shimmer className="h-8 w-12 mb-2" />
              <Shimmer className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
      <SkeletonGrid cols={3} rows={3} />
    </div>
  )
}

/** Assessment panel skeleton */
export function SkeletonAssessment() {
  return (
    <div className="w-full max-w-4xl mx-auto p-4 animate-pulse">
      <div className="flex gap-4">
        <div className="w-64 shrink-0 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Shimmer key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
        <div className="flex-1">
          <Shimmer className="h-6 w-48 mb-4" />
          <SkeletonList rows={6} />
        </div>
      </div>
    </div>
  )
}

/** Generic view loader (replaces spinning loader) */
export default function SkeletonLoader({ variant = 'chart' }) {
  switch (variant) {
    case 'dashboard': return <SkeletonDashboard />
    case 'chart': return <SkeletonChart />
    case 'list': return <SkeletonList />
    case 'grid': return <SkeletonGrid />
    case 'assessment': return <SkeletonAssessment />
    case 'card': return <SkeletonCard />
    default: return <SkeletonChart />
  }
}
