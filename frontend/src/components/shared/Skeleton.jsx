/**
 * Skeleton — placeholder de chargement avec animation pulse.
 * Sert pour les listes/cards en attente de données.
 */
import { cn } from '@/utils/cn'

export default function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded bg-white/10', className)} />
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl bg-ink-900 border border-white/5 p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
