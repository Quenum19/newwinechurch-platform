/**
 * KpiCard — card de KPI réutilisable (dashboards gouverneur, leader, membre).
 *
 * Props :
 *  - icon : composant lucide-react
 *  - label : titre du KPI (court, majuscules)
 *  - value : valeur principale (number ou string)
 *  - suffix : suffixe (% ou unité)
 *  - delta : { value: number, label?: string } pour tendance
 *  - tone : 'gold' | 'wine' | 'emerald' | 'red' (couleur accent)
 *  - loading : skeleton si true
 */
import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/utils/cn'

const TONE_BG = {
  gold:    'bg-gold-500/10 text-gold-300',
  wine:    'bg-wine-700/15 text-wine-200',
  emerald: 'bg-emerald-500/10 text-emerald-300',
  red:     'bg-red-500/10 text-red-300',
}

export default function KpiCard({
  icon: Icon,
  label,
  value,
  suffix,
  delta,
  tone = 'gold',
  loading = false,
  className,
  index = 0,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        'rounded-xl bg-ink-900 border border-white/5 p-4 sm:p-5',
        'hover:border-white/10 transition',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', TONE_BG[tone])}>
          {Icon && <Icon size={18} />}
        </div>
        {delta != null && !loading && (
          <span className={cn(
            'text-xs font-medium flex items-center gap-1',
            (delta.value ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400',
          )}>
            {(delta.value ?? 0) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(delta.value).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-[11px] uppercase tracking-wider text-white/40">{label}</p>
      <div className="mt-1 flex items-baseline gap-1">
        {loading ? (
          <span className="h-7 w-16 rounded bg-white/10 animate-pulse" />
        ) : (
          <>
            <span className="text-2xl sm:text-3xl font-semibold text-white tabular-nums">{value ?? '—'}</span>
            {suffix && <span className="text-sm text-white/50">{suffix}</span>}
          </>
        )}
      </div>
      {delta?.label && <p className="mt-1 text-[11px] text-white/40">{delta.label}</p>}
    </motion.div>
  )
}
