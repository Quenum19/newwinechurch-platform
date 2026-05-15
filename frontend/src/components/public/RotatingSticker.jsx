/**
 * RotatingSticker — sticker circulaire avec texte qui suit un cercle, en rotation infinie.
 *
 * Inspiration : badges des sites de mode / drops sneakers (Off-White, Nike SB, Aimé Leon Dore).
 * Touche d'identité signature, donne vie à un coin de la page sans agresser.
 *
 * Implémentation : SVG <textPath> + animation CSS rotate (déjà dans tailwind.config.js).
 * Respect prefers-reduced-motion : ne tourne plus mais reste visible.
 */
import { cn } from '@/utils/cn'

export default function RotatingSticker({
  text = '★ NEW WINE CHURCH ★ COCODY ★ DIMANCHE 13H ',
  size = 140,
  className = '',
  textColor = 'currentColor',
  accent = 'currentColor',
}) {
  // Le texte est dupliqué dans le path pour bien remplir le cercle quel que soit la longueur.
  const id = `circle-${Math.random().toString(36).slice(2, 9)}`

  return (
    <div
      className={cn('relative motion-safe:animate-sticker-rotate', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <path id={id} d="M 50 50 m -36, 0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" fill="none" />
        </defs>
        <text
          fontFamily="'Anton', Impact, sans-serif"
          fontSize="9"
          letterSpacing="0.18em"
          fill={textColor}
          style={{ textTransform: 'uppercase' }}
        >
          <textPath href={`#${id}`} startOffset="0%">
            {text}
          </textPath>
        </text>
        {/* Étoile centrale en accent */}
        <text
          x="50"
          y="56"
          textAnchor="middle"
          fontSize="22"
          fill={accent}
          style={{ fontWeight: 700 }}
        >
          ★
        </text>
      </svg>
    </div>
  )
}
