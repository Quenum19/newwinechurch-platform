/**
 * Badge "EN DIRECT" pulsant — version palette public.* (cohérente avec Magazine Drop).
 * Pas de bordeaux/or admin, uniquement Flame + Bone.
 */
import { Link } from 'react-router-dom'
import { Radio } from 'lucide-react'
import { useLiveStore } from '@/store/liveStore'
import { useTranslation } from 'react-i18next'

export default function LiveBadge() {
  const current = useLiveStore((s) => s.current)
  const { t } = useTranslation()
  if (! current) return null

  return (
    <Link
      to="/live"
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-public-flame text-public-bone font-mono text-xs uppercase tracking-[0.2em] hover:bg-public-flame-deep transition-colors"
      title={current.title}
    >
      <Radio size={11} className="animate-pulse" />
      <span>{t('live.badge')}</span>
    </Link>
  )
}
