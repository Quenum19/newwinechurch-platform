/**
 * Marquee — bande typo défilante infinie.
 *
 * Implémentation CSS pure (animate-marquee défini dans tailwind.config.js).
 * Le contenu est dupliqué pour boucle seamless. Ne consomme aucun JS au runtime.
 * Pause au hover pour accessibilité.
 *
 * Respect prefers-reduced-motion : la marquee s'arrête.
 */
import { cn } from '@/utils/cn'

export default function Marquee({
  children,
  className = '',
  separator = '★',
  speed = 'normal', // 'slow' | 'normal' | 'fast'
}) {
  const speedClass = {
    slow: 'animate-marquee [animation-duration:60s]',
    normal: 'animate-marquee',
    fast: 'animate-marquee-fast',
  }[speed]

  // Wrappe chaque enfant avec un séparateur, et duplique tout pour la boucle.
  const items = Array.isArray(children) ? children : [children]
  const renderTrack = (key) => (
    <div key={key} className={cn('flex shrink-0 items-center gap-8 sm:gap-12 pr-8 sm:pr-12', speedClass)} aria-hidden={key !== 0}>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-8 sm:gap-12">
          {item}
          <span className="text-public-flame select-none">{separator}</span>
        </span>
      ))}
    </div>
  )

  return (
    <div
      className={cn(
        'overflow-hidden flex motion-reduce:[&>div]:!animate-none',
        '[&:hover>div]:[animation-play-state:paused]', // pause au hover
        className,
      )}
    >
      {renderTrack(0)}
      {renderTrack(1)}
    </div>
  )
}
