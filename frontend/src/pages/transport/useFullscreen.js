/**
 * useFullscreen(ref) — pseudo-plein écran CSS-only, compatible mobile.
 *
 * Pourquoi CSS-only et pas l'API Fullscreen native ?
 *   → sur iPhone Safari, `element.requestFullscreen()` N'EXISTE PAS.
 *     Les chauffeurs Transport utilisent l'app essentiellement sur téléphone,
 *     donc on veut un comportement qui marche PARTOUT (iOS/Android/desktop).
 *
 * Implémentation : simple state React. Le consommateur applique les classes
 * `fixed inset-0 z-50` (ou équivalent) quand `isFullscreen === true`.
 *
 * Bonus :
 *   - lock le scroll body en plein écran (évite le rubber-band iOS derrière)
 *   - Escape sort du plein écran (desktop)
 *   - onChange(isFullscreen) permet à Leaflet/MapLibre de resize après toggle
 */
import { useCallback, useEffect, useState } from 'react'

export function useFullscreen(_ref, { onChange } = {}) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Lock scroll body quand plein écran (mobile-friendly)
  useEffect(() => {
    if (! isFullscreen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isFullscreen])

  // Escape pour sortir (desktop)
  useEffect(() => {
    if (! isFullscreen) return
    const onKey = (e) => { if (e.key === 'Escape') setIsFullscreen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isFullscreen])

  // Notifie le consommateur pour resize map (Leaflet.invalidateSize / MapLibre.resize)
  useEffect(() => {
    onChange?.(isFullscreen)
  }, [isFullscreen, onChange])

  const enter  = useCallback(() => setIsFullscreen(true), [])
  const exit   = useCallback(() => setIsFullscreen(false), [])
  const toggle = useCallback(() => setIsFullscreen((v) => ! v), [])

  return { isFullscreen, toggle, enter, exit }
}
