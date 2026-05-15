/**
 * Hook : autoplay une vidéo quand elle entre dans le viewport (50% visible).
 * Stoppe et reset à 0 quand elle sort. Économise CPU et data — perf-friendly mobile.
 *
 * Respect prefers-reduced-motion : ne joue jamais auto.
 *
 * Bonus UX :
 *  - onLoadedMetadata : seek à 0.1s pour forcer la 1re frame en preview
 *    (sinon Chrome affiche un carré noir tant que play() n'est pas autorisé).
 *  - onError : log discret pour debug (codec/MOV non supporté).
 *
 * Usage :
 *   const ref = useAutoplayVideo()
 *   <video ref={ref} src="..." muted playsInline loop />
 */
import { useEffect, useRef } from 'react'

export function useAutoplayVideo({ threshold = 0.5 } = {}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (! el) return

    // Force la 1re frame en preview même quand autoplay est refusé.
    // Sinon le navigateur affiche un carré noir jusqu'au play() effectif.
    const handleLoaded = () => {
      try {
        if (el.currentTime === 0) el.currentTime = 0.1
      } catch (_) { /* certains navigateurs n'autorisent pas le seek pré-load */ }
    }
    el.addEventListener('loadedmetadata', handleLoaded)

    // Respect accessibilité — même sans autoplay on garde le seek pour la preview.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return () => el.removeEventListener('loadedmetadata', handleLoaded)
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // play() renvoie une Promise — on l'ignore si autoplay-prevented.
          el.play()?.catch(() => {})
        } else {
          el.pause()
        }
      },
      { threshold },
    )
    obs.observe(el)

    return () => {
      obs.disconnect()
      el.removeEventListener('loadedmetadata', handleLoaded)
    }
  }, [threshold])

  return ref
}

/**
 * Devine le MIME type à partir du chemin du fichier.
 * Permet au navigateur de mieux décider s'il peut décoder le flux.
 */
export function videoMimeFromPath(path = '') {
  const ext = path.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'mp4':  return 'video/mp4'
    case 'webm': return 'video/webm'
    case 'mov':  return 'video/quicktime'
    case 'm4v':  return 'video/mp4'
    case 'ogv':  return 'video/ogg'
    default:     return 'video/mp4'
  }
}
