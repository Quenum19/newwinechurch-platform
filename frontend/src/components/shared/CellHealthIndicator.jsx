/**
 * CellHealthIndicator — affiche le statut de santé d'une cellule.
 *  - 'good'     : Bonne santé (vert)
 *  - 'warning'  : Attention (orange)
 *  - 'critical' : Critique (rouge)
 */
import { CircleCheck, AlertTriangle, OctagonAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

const META = {
  good:     { Icon: CircleCheck,   color: 'text-emerald-400', bg: 'bg-emerald-500/10', fallback: 'Bonne santé' },
  warning:  { Icon: AlertTriangle, color: 'text-orange-400',  bg: 'bg-orange-500/10',  fallback: 'Attention' },
  critical: { Icon: OctagonAlert,  color: 'text-red-400',     bg: 'bg-red-500/10',     fallback: 'Critique' },
}

export default function CellHealthIndicator({ status = 'good', size = 'md', className }) {
  const { t } = useTranslation()
  const key = META[status] ? status : 'good'
  const m = META[key]
  const Icon = m.Icon
  const isLarge = size === 'lg'
  const label = t(`common.cellHealth.${key}`, m.fallback)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full',
        m.bg, m.color,
        isLarge ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs',
        className,
      )}
      aria-label={`${t('common.cellHealthLabel', 'État cellule')} : ${label}`}
    >
      <Icon size={isLarge ? 16 : 12} />
      <span className="font-medium">{label}</span>
    </span>
  )
}
