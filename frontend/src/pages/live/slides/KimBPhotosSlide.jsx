/**
 * KimBPhotosSlide — Diaporama plein écran des photos de KIM B pendant sa
 * prestation. Les URLs sont livrées via `state.config.kim_b_photos` (array
 * d'URLs, uploadées depuis la régie via /admin/events/{id}/bal/kim-b/upload).
 *
 * Comportement calqué sur PhotosAmbianceSlide : fondu enchaîné 6s + scale
 * Ken Burns léger. Overlay "KIM B" en Anton bas-gauche.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const INTERVAL_MS = 6000

export default function KimBPhotosSlide({ state }) {
  const photos = state?.config?.kim_b_photos ?? []
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (photos.length <= 1) return
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % photos.length)
    }, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [photos.length])

  // Reset l'index si les photos changent (nouvel upload)
  useEffect(() => {
    if (index >= photos.length) setIndex(0)
  }, [photos.length, index])

  // === Cas vide : invitation à uploader ===
  if (photos.length === 0) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#0A0A0A', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, #2a0f14 0%, #0A0A0A 80%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 3, textAlign: 'center', padding: '5vh',
        }}>
          <h1 style={{
            fontFamily: "'Anton', Impact, sans-serif",
            fontSize: 'clamp(4rem, 10vw, 11rem)',
            color: '#C9A961',
            letterSpacing: '0.02em',
            margin: 0,
            lineHeight: 1,
          }}>KIM B</h1>
          <p style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(1.5rem, 2.4vw, 2.4rem)',
            color: '#F5E6C8',
            marginTop: '3vh',
          }}>
            Aucune photo pour l'instant.
          </p>
          <p style={{
            fontFamily: '"Cormorant Garamond", serif',
            fontSize: 'clamp(1rem, 1.4vw, 1.4rem)',
            color: '#8B7960',
            marginTop: '1vh',
          }}>
            Régie : uploade les photos KIM B dans le panneau prévu.
          </p>
        </div>
      </div>
    )
  }

  const currentPhoto = photos[index]

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0A0A0A', overflow: 'hidden' }}>
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
