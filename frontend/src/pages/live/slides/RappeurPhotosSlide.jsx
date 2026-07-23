/**
 * RappeurPhotosSlide — Défilé plein écran des photos du rappeur / de l'artiste.
 *
 * Fonctionnement (calque sur PhotosAmbianceSlide) :
 *  - Récupère state.config.artiste_photos (array d'URLs) ou state.config.rappeur_photos
 *    ou state.rappeur_photos (fallback)
 *  - Fait défiler avec un fondu enchaîné toutes les 6 secondes
 *  - Overlay minimal : nom d'artiste discret en bas
 *  - Si aucune photo : écran "L'artiste arrive"
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import GoldParticles from '../components/GoldParticles.jsx'

const INTERVAL_MS = 6000

export default function RappeurPhotosSlide({ state }) {
  const cfg = state?.config ?? {}
  const photos = (
    cfg.artiste_photos ??
    cfg.rappeur_photos ??
    state?.rappeur_photos ??
    []
  )
    .map((p) => (typeof p === 'string' ? p : p?.url))
    .filter(Boolean)

  const artiste = cfg.artiste ?? cfg.rappeur ?? ''

  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (photos.length <= 1) return
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % photos.length)
    }, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [photos.length])

  useEffect(() => {
    if (index >= photos.length) setIndex(0)
  }, [photos.length, index])

  // === Cas vide : invitation ===
  if (photos.length === 0) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#0A0A0A', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, #2a0f14 0%, #0A0A0A 80%)',
        }} />
        <GoldParticles count={25} intensity={0.7} />

        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 3, textAlign: 'center', padding: '5vh',
        }}>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            style={{
              fontFamily: 'Anton, Impact, sans-serif',
              fontSize: 'clamp(4rem, 10vw, 11rem)',
              color: '#C9A961',
              letterSpacing: '0.02em',
              margin: 0,
              lineHeight: 1,
            }}
          >
            {artiste ? artiste.toUpperCase() : 'PHOTOS RAPPEUR'}
          </motion.h1>

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
            Régie : uploade des photos puis clique « Envoyer photos ».
          </p>
        </div>
      </div>
    )
  }

  const currentPhoto = photos[index]

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

      {/* Overlay nom artiste bas-gauche discret */}
      {artiste && (
        <div style={{
          position: 'absolute', bottom: '3vh', left: '3vw',
          zIndex: 4,
          fontFamily: "'Anton', sans-serif",
          fontSize: 'clamp(2rem, 3.5vw, 3.5rem)',
          color: '#E6C877',
          letterSpacing: '.05em',
          textShadow: '0 2px 12px rgba(0,0,0,.9)',
          textTransform: 'uppercase',
        }}>
          {artiste}
        </div>
      )}
    </div>
  )
}
