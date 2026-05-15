/** Spinner branded NWC (cercle or qui tourne). */
import { cn } from '@/utils/cn'

export default function Spinner({ size = 24, className = '' }) {
  return (
    <svg
      className={cn('animate-spin text-gold-500', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Chargement"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}
