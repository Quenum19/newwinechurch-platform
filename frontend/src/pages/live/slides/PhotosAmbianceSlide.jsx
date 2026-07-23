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
      {/* Photo en fondu enchaîné, cover full écran (les cadres 16:9 sont pré-générés
          côté backend avec le bon layout, pas besoin d'overlay ici). */}
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
    </div>
  )
}
