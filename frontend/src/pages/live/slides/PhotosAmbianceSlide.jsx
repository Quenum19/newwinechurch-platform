/**
 * PhotosAmbianceSlide — Défilé plein écran des photos brandées uploadées
 * par les photographes pendant l'événement.
 *
 * Fonctionnement :
 *  - Récupère state.photos (URLs déjà brandées 16:9 côté backend)
 *  - Fait défiler avec un fondu enchaîné toutes les 6 secondes
 *  - Overlay minimal : hashtag + compteur discret
 *  - Si aucune photo : invitation à en uploader
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import GoldParticles from '../components/GoldParticles.jsx'

const INTERVAL_MS = 6000

export default function PhotosAmbianceSlide({ state }) {
  const photos = state?.photos ?? []
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (photos.length <= 1) return
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % photos.length)
    }, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [photos.length])

  // Reset l'index si le nombre de photos change (nouvelle uploadée)
  useEffect(() => {
    if (index >= photos.length) setIndex(0)
  }, [photos.length, index])

  // === Cas vide : invitation ===
  if (photos.length === 0) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#0A0A0A', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, #1F1610 0%, #0A0A0A 80%)',
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
            PHOTOS DU SOIR
          </motion.h1>

          <p style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(1.8rem, 3vw, 3rem)',
            color: '#F5E6C8',
            marginTop: '4vh',
          }}>
            Les premières photos arrivent bientôt…
          </p>
        </div>
      </div>
    )
  }

  const currentPhoto = photos[index]

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0A0A0A', overflow: 'hidden' }}>
      {/* Photo en fondu enchaîné, cover fullscreen */}
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
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#0A0A0A',
          }}
        />
      </AnimatePresence>

      {/* Overlay très discret en bas : hashtag + compteur */}
      <div style={{
        position: 'absolute',
        bottom: '3vh',
        left: 0, right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 4vw',
        zIndex: 5,
        pointerEvents: 'none',
      }}>
        <div style={{
          fontFamily: '"Playfair Display", serif',
          fontStyle: 'italic',
          fontSize: 'clamp(1.2rem, 1.8vw, 1.8rem)',
          color: '#F5E6C8',
          textShadow: '0 2px 8px rgba(0,0,0,0.9)',
          letterSpacing: '0.05em',
        }}>
          #BalNWC2026
        </div>
        <div style={{
          fontFamily: '"Geist Mono", monospace',
          fontSize: 'clamp(0.9rem, 1.2vw, 1.2rem)',
          color: '#C9A961',
          textShadow: '0 2px 8px rgba(0,0,0,0.9)',
          letterSpacing: '0.2em',
          opacity: 0.85,
        }}>
          {String(index + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
        </div>
      </div>
    </div>
  )
}
