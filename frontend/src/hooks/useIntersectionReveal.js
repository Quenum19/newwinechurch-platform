/**
 * useIntersectionReveal — révèle un élément quand il devient visible au scroll.
 *
 * Léger remplacement à Framer Motion `whileInView` quand on veut juste un
 * effet d'apparition simple sans dépendance. Retourne { ref, isVisible }.
 *
 * Usage :
 *   const { ref, isVisible } = useIntersectionReveal()
 *   <div ref={ref} className={isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}>
 */
import { useEffect, useRef, useState } from 'react'

export function useIntersectionReveal({ threshold = 0.15, once = true } = {}) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true) // fallback SSR / vieux navigateurs
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once && ref.current) observer.unobserve(ref.current)
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold }
    )

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [threshold, once])

  return { ref, isVisible }
}
