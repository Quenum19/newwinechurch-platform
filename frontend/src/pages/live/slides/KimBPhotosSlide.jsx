/**
 * KimBPhotosSlide — Slide dédiée aux photos de KIM B pendant sa prestation.
 *
 * Diaporama plein écran calqué sur PhotosAmbianceSlide : 3 photos qui défilent
 * en fondu enchaîné toutes les 6 secondes. Les images sont servies depuis
 * `frontend/public/artistes/kim-b/` (statiques, pas d'upload).
 *
 * Layout : cover fullscreen + nom "KIM B" discret en overlay bas gauche.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const INTERVAL_MS = 6000

// Photos statiques déposées dans frontend/public/artistes/kim-b/
// Note : le chemin absolu (/artistes/...) est servi par Vite en dev
// et par le déploiement Hostinger en prod (dist/ recopié dans public_html).
const PHOTOS = [
  '/artistes/kim-b/1.jpg',
  '/artistes/kim-b/2.jpg',
  '/artistes/kim-b/3.jpg',
]

export default function KimBPhotosSlide() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (PHOTOS.length <= 1) return
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % PHOTOS.length)
    }, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  const currentPhoto = PHOTOS[index]

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0A0A0A', overflow: 'hidden' }}>
      {/* Photo en fondu enchaîné, cover full écran */}
      <AnimatePresence mode="sync">
        <motion.div
          key={currentPhoto + index}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 1.6, ease: 'easeInOut' }}
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url("${currentPhoto}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#0A0A0A',
          }}
        />
      </AnimatePresence>

      {/* Nom artiste en overlay bas-gauche */}
      <div style={{
        position: 'absolute', bottom: '3vh', left: '3vw',
        zIndex: 4,
        fontFamily: "'Anton', sans-serif",
        fontSize: 'clamp(2.5rem, 4vw, 4.5rem)',
        color: '#E6C877',
        letterSpacing: '.08em',
        textShadow: '0 2px 16px rgba(0,0,0,.95)',
        textTransform: 'uppercase',
      }}>
        KIM B
      </div>
    </div>
  )
}
