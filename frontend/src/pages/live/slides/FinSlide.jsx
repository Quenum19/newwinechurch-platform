/**
 * Slide — Fin de soirée : remerciements + best of photos si disponibles.
 */
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import GoldParticles from '../components/GoldParticles.jsx'

export default function FinSlide({ state }) {
  const photos = state?.photos ?? []
  const [photoIdx, setPhotoIdx] = useState(0)

  useEffect(() => {
    if (photos.length === 0) return
    const t = setInterval(() => setPhotoIdx((i) => (i + 1) % photos.length), 4500)
    return () => clearInterval(t)
  }, [photos.length])

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, #1a0f14 0%, #0A0A0A 75%)', overflow: 'hidden' }}>
      <GoldParticles count={35} />

      {/* Photo en fond si dispo */}
      {photos.length > 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={photos[photoIdx]}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${photos[photoIdx]})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.4)',
            }}
          />
        </AnimatePresence>
      )}

      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.85) 100%)', zIndex: 2 }} />

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 3, textAlign: 'center', padding: '4vh 4vw' }}>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(4rem, 8vw, 8rem)',
            color: '#F5E6C8',
            textShadow: '0 0 40px rgba(201, 169, 97, 0.5)',
            margin: 0,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          Merci pour cette
          <br/>
          soirée inoubliable
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1.5 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: 'clamp(1.5rem, 2.5vw, 2.5rem)',
            color: '#C9A961',
            marginTop: '3rem',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
          }}
        >
          À très bientôt pour un autre événement
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          style={{ marginTop: '3rem', fontSize: '2.5rem', color: '#C9A961', letterSpacing: '1rem' }}
        >
          ★ ★ ★
        </motion.div>
      </div>
    </div>
  )
}
