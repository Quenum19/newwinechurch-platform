/**
 * PublicSection — bandeau d'en-tête éditorial réutilisable.
 *
 * Style cohérent partout (Sermons, Events, Blog, Galerie, etc.) :
 *  - Tag mono "01 — Section"
 *  - Heading Anton XXL
 *  - Sous-titre Fraunces italic
 *
 * Props :
 *  - eyebrow : libellé small caps mono ("Galerie", "Messages", etc.)
 *  - title   : ReactNode — peut contenir <br/> et span colorés
 *  - desc    : ReactNode — sous-titre éditorial
 *  - children: actions éventuelles (boutons, filtres) à droite
 */
import { cn } from '@/utils/cn'

export default function PublicSectionHeader({ eyebrow, title, desc, children, className = '' }) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-6', className)}>
      <div className="max-w-3xl">
        {eyebrow && <p className="tag-mono text-public-flame mb-2">{eyebrow}</p>}
        <h1 className="heading-anton text-5xl sm:text-6xl lg:text-8xl text-public-ink leading-[0.92]">
          {title}
        </h1>
        {desc && (
          <p className="editorial-quote text-xl sm:text-2xl text-public-ink/80 mt-5 max-w-2xl">
            {desc}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}
