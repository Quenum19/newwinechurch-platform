/**
 * PhotosAmbianceSlide — Défilé plein écran des photos brandées uploadées
 * par les photographes pendant l'événement.
 *
 * Cadrage identique KimBPhotos : object-fit:contain sur l'image nette + la
 * MÊME image floutée (blur 40px + scale 1.15) en fond pour meubler
 * élégamment les bords. Aucun crop du contenu de la photo.
 * Fondu enchaîné 6s + Ken Burns léger.
 * Overlay hashtag discret bas-gauche.
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
      {/* Photo en fondu enchaîné — contain + fond flou (aucun crop) */}
      <AnimatePresence mode="sync">
        <motion.div
          key={currentPhoto + index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: 'easeInOut' }}
          style={{ position: 'absolute', inset: 0 }}
        >
          {/* Fond flouté de la même image */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url("${currentPhoto}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(40px) brightness(.55)',
            transform: 'scale(1.15)',
          }} />
          {/* Voile noir léger pour contraste */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.35)',
          }} />
          {/* Image nette centrée — aucun crop */}
          <motion.img
            src={currentPhoto}
            alt=""
            initial={{ scale: 1.03 }}
            animate={{ scale: 1 }}
            transition={{ duration: 6, ease: 'linear' }}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
