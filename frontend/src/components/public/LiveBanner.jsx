/**
 * LiveBanner — bandeau "EN DIRECT" plein-écran au top de la page publique.
 *
 * Visibilité maximale, pattern emprunté aux grands sites de live (Twitch, YouTube,
 * Linear releases) : bandeau orange flame avec pulse animé + CTA explicite.
 *
 * Affiché uniquement quand un live est actif. Auto-fade-in. Sticky au top.
 */
import { Link } from 'react-router-dom'
import { useLiveStore } from '@/store/liveStore'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'

export default function LiveBanner() {
  const current = useLiveStore((s) => s.current)
  const { t } = useTranslation()
  if (! current) return null

  return (
    <Link
      to="/live"
      className="block bg-public-flame text-public-bone hover:bg-public-flame-deep transition-colors group"
      aria-label={`${t('live.ariaLive', 'Direct en cours')} : ${current.title}`}
    >
      <div className="container-nwc flex items-center justify-center sm:justify-between gap-3 py-2.5 text-center sm:text-left">
        <div className="flex items-center gap-3 min-w-0">
          {/* Pulse dot */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-public-bone opacity-75 animate-ping"/>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-public-bone"/>
          </span>

          <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em] font-semibold shrink-0">
            {t('live.badge') || 'EN DIRECT'}
          </span>

          <span className="hidden sm:inline-block w-px h-4 bg-public-bone/30 shrink-0"/>

          <span className="font-display uppercase text-sm sm:text-base truncate">
            {current.title}
          </span>
        </div>

        <span className="hidden sm:inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest shrink-0 group-hover:translate-x-1 transition-transform">
          {t('live.watchNow', 'Regarder maintenant')} <ChevronRight size={14}/>
        </span>
      </div>
    </Link>
  )
}
