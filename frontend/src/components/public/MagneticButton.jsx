/**
 * MagneticButton — bouton qui attire légèrement le curseur (effet "magnetic").
 *
 * Effet : quand le curseur entre dans la zone d'influence (~120px),
 * le bouton se translate vers le curseur de manière atténuée (force 0.25).
 * Sortie : retour à la position initiale en transition douce.
 *
 * Usage :
 *   <MagneticButton as="a" href="..." className="btn-flame">
 *     CTA
 *   </MagneticButton>
 *
 * Respect prefers-reduced-motion : effet désactivé.
 */
import { useRef, useEffect } from 'react'
import { cn } from '@/utils/cn'

export default function MagneticButton({
  as: Component = 'button',
  children,
  className = '',
  strength = 0.25,
  ...props
}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (! el) return

    // Respecte les préférences accessibilité.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = null

    const handleMove = (e) => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const dx = (e.clientX - cx) * strength
        const dy = (e.clientY - cy) * strength
        // Limite la translation max à 14px pour rester subtil.
        const maxOffset = 14
        const tx = Math.max(-maxOffset, Math.min(maxOffset, dx))
        const ty = Math.max(-maxOffset, Math.min(maxOffset, dy))
        el.style.transform = `translate(${tx}px, ${ty}px)`
      })
    }
    const handleLeave = () => {
      if (raf) cancelAnimationFrame(raf)
      el.style.transform = ''
    }

    el.addEventListener('mousemove', handleMove)
    el.addEventListener('mouseleave', handleLeave)
    return () => {
      el.removeEventListener('mousemove', handleMove)
      el.removeEventListener('mouseleave', handleLeave)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [strength])

  return (
    <Component
      ref={ref}
      className={cn('transition-transform duration-300 ease-out will-change-transform', className)}
      {...props}
    >
      {children}
    </Component>
  )
}
