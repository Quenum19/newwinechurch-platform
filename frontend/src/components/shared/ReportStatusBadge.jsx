/**
 * ReportStatusBadge — pastille colorée du status d'un rapport.
 * Statuts : draft, submitted, reviewed, approved, rejected.
 */
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

const STYLES = {
  draft:     { bg: 'bg-white/10',        text: 'text-white/70',    fallback: 'Brouillon' },
  submitted: { bg: 'bg-blue-500/15',     text: 'text-blue-300',    fallback: 'Soumis' },
  reviewed:  { bg: 'bg-gold-500/15',     text: 'text-gold-300',    fallback: 'Revu' },
  approved:  { bg: 'bg-emerald-500/15',  text: 'text-emerald-300', fallback: 'Approuvé' },
  rejected:  { bg: 'bg-red-500/15',      text: 'text-red-300',     fallback: 'Rejeté' },
}

export default function ReportStatusBadge({ status, className }) {
  const { t } = useTranslation()
  const key = STYLES[status] ? status : 'draft'
  const s = STYLES[key]
  const label = t(`common.reportStatus.${key}`, s.fallback)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
        s.bg, s.text, className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', s.text.replace('text-', 'bg-'))} />
      {label}
    </span>
  )
}
