/**
 * Utilitaire pour combiner des classes Tailwind sans conflits.
 * Combine `clsx` (booléens, tableaux) avec `tailwind-merge` (résolution
 * des conflits, ex: "px-2 px-4" → "px-4").
 *
 * Exemple :
 *   cn('px-2 py-1', isActive && 'bg-wine-700', className)
 */
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
