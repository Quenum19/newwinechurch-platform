/**
 * KimBPhotosSlide — Diaporama plein écran des photos de KIM B, avec le cadre
 * "affiche du bal" (EventFrame) par-dessus : cadre or, losanges, badge
 * 24 JUILLET, logo NewWine, bloc titre "BAL & DINE GALA / A DARK NIGHT / IN /
 * Elegance". Overlay "KIM B" (Anton or) discret bas-gauche.
 *
 * Cadrage : object-fit:contain (aucun crop du visage) + fond flouté de la
 * MÊME image pour meubler élégamment les bords en portrait/story.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Stage from '../components/Stage.jsx'
import EventFrame from '../components/EventFrame.jsx'

const INTERVAL_MS = 6000

export default function KimBPhotosSlide({ state }) {
  useEffect(() => {
    console.log('[KimBPhotosSlide] state.config =', state?.config)
  }, [state?.config])

  const photos = state?.config?.kim_b_photos ?? []
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

  // === Cas vide : invitation typographique + cadre événement ===
  if (photos.length === 0) {
    return (
      <Stage>
        <div style={{
          position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
          background: '#000000',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(120% 100% at 50% 40%, #211a10 0%, #0d0a06 56%, #060402 100%)',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            zIndex: 3, textAlign: 'center', padding: 80,
          }}>
            <h1 style={{
              fontFamily: "'Anton', Impact, sans-serif",
              fontSize: 220, color: '#E6C877',
              letterSpacing: '.02em', margin: 0, lineHeight: 1,
            }}>KIM B</h1>
            <p style={{
              fontFamily: '"Playfair Display", serif',
              fontStyle: 'italic', fontSize: 60, color: '#F5E6C8',
              marginTop: 40,
            }}>Aucune photo pour l'instant.</p>
          </div>
          <EventFrame />
        </div>
      </Stage>
    )
  }

  const currentPhoto = photos[index]

  return (
    <Stage>
      <div style={{
        position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
        background: '#000000',
      }}>
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
              filter: 'blur(28px) brightness(.85) saturate(1.25)',
              transform: 'scale(1.2)',
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

        {/* Overlay "KIM B" discret bas-centre-gauche (entre logo et bloc titre) */}
        <div style={{
          position: 'absolute', bottom: 120, left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 8,
          padding: '10px 32px',
          background: 'rgba(0,0,0,.55)',
          border: '1pt solid rgba(214,178,95,.6)',
          borderRadius: 6,
          fontFamily: "'Anton', sans-serif",
          fontSize: 60,
          color: '#E6C877',
          letterSpacing: '.12em',
          textShadow: '0 2px 12px rgba(0,0,0,.9)',
          textTransform: 'uppercase',
          lineHeight: 1,
          pointerEvents: 'none',
        }}>KIM B</div>

        {/* Cadre "affiche du bal" complet par-dessus */}
        <EventFrame />
      </div>
    </Stage>
  )
}
