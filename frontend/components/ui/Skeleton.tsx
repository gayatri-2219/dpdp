'use client'
/**
 * Skeleton loaders — warm shimmer, no spinners.
 * Exports: SkeletonCard, SkeletonRow, SkeletonChart, SkeletonTable, SkeletonText
 */

export function SkeletonCard() {
  return (
    <div
      className="rounded-2xl p-5 space-y-3"
      style={{
        background: '#fff',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="skeleton w-10 h-10 rounded-xl" />
        <div className="skeleton w-5 h-5 rounded-full" />
      </div>
      <div className="skeleton h-8 w-24 rounded-lg" />
      <div className="skeleton h-3.5 w-20 rounded" />
      <div className="skeleton h-3 w-28 rounded" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="skeleton w-8 h-8 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3.5 w-48 rounded" />
        <div className="skeleton h-3 w-28 rounded" />
      </div>
      <div className="skeleton h-6 w-16 rounded-full" />
      <div className="skeleton h-6 w-20 rounded-full" />
    </div>
  )
}

export function SkeletonChart() {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: '#fff', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="skeleton h-4 w-36 rounded mb-1.5" />
      <div className="skeleton h-3 w-52 rounded mb-6" />
      <div className="skeleton w-full rounded-xl" style={{ height: '180px' }} />
    </div>
  )
}

export function SkeletonText({ width = '100%', height = '14px' }: { width?: string; height?: string }) {
  return (
    <div
      className="skeleton rounded"
      style={{ width, height }}
    />
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#fff', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="skeleton h-4 w-40 rounded" />
        <div className="skeleton h-7 w-20 rounded-lg" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}
