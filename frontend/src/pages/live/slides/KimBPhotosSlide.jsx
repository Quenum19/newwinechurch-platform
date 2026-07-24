/**
 * KimBPhotosSlide — Diaporama plein écran des photos de KIM B pendant sa
 * prestation. Les URLs sont livrées via `state.config.kim_b_photos`.
 *
 * Cadrage adapté aux photos portrait ET paysage :
 *   - fond flouté de la MÊME image (blur 40px + scale 1.15) pour meubler
 *     élégamment les bords quand la photo est portrait
 *   - image nette en object-fit: contain par-dessus (aucun crop du visage)
 *   - fondu enchaîné 6s + Ken Burns léger
 * Overlay "KIM B" (Anton or) en bas-gauche.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const INTERVAL_MS = 6000

export default function KimBPhotosSlide({ state }) {
  useEffect(() => {
    console.log('[KimBPhotosSlide] state.config =', state?.config)
  }, [state?.config])

  const photos = state?.config?.kim_b_photos ?? []
  const eventTitle = state?.event?.title ?? 'A Dark Night in Elegance'
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

  if (photos.length === 0) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#0A0A0A', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 100% at 50% 40%, #211a10 0%, #0d0a06 56%, #060402 100%)',
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
            color: '#E6C877',
            letterSpacing: '0.02em',
            margin: 0, lineHeight: 1,
          }}>KIM B</h1>
          <p style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(1.5rem, 2.4vw, 2.4rem)',
            color: '#F5E6C8',
            marginTop: '3vh',
          }}>Aucune photo pour l'instant.</p>
          <p style={{
            fontFamily: '"Cormorant Garamond", serif',
            fontSize: 'clamp(1rem, 1.4vw, 1.4rem)',
            color: '#8B7960',
            marginTop: '1vh',
          }}>Régie : uploade les photos KIM B dans le panneau prévu.</p>
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: 'easeInOut' }}
          style={{ position: 'absolute', inset: 0 }}
        >
          {/* Fond flouté de la même image — remplit élégamment les bords en portrait */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url("${currentPhoto}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(40px) brightness(.55)',
            transform: 'scale(1.15)',
          }} />
          {/* Voile noir léger pour renforcer contraste */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.35)',
          }} />
          {/* Image nette centrée (contain — aucun crop du visage) */}
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

      {/* Bandeau bas : KIM B (Anton or) + ornement ✦ + nom event (Great Vibes or)
          Sur fond dégradé sombre pour lisibilité même si la photo est claire en bas. */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        zIndex: 4,
        padding: '3vh 4vw 3vh',
        background: 'linear-gradient(0deg, rgba(0,0,0,.92) 0%, rgba(0,0,0,.75) 55%, rgba(0,0,0,0) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '3vw',
      }}>
        {/* KIM B — gauche */}
        <div style={{
          fontFamily: "'Anton', sans-serif",
          fontSize: 'clamp(3rem, 5vw, 5.5rem)',
          color: '#E6C877',
          letterSpacing: '.08em',
          textShadow: '0 2px 20px rgba(0,0,0,.95), 0 0 30px rgba(0,0,0,.6)',
          textTransform: 'uppercase',
          lineHeight: 1,
        }}>KIM B</div>

        {/* Ornement séparateur ✦ */}
        <div style={{
          flex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '1.5vw',
        }}>
          <span style={{
            flex: 1, maxWidth: '20vw', height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(230,200,119,.7), rgba(230,200,119,.7), transparent)',
          }} />
          <span style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 'clamp(1.5rem, 2.4vw, 2.6rem)',
            color: '#E6C877',
            textShadow: '0 0 20px rgba(214,178,95,.6)',
          }}>✦</span>
          <span style={{
            flex: 1, maxWidth: '20vw', height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(230,200,119,.7), rgba(230,200,119,.7), transparent)',
          }} />
        </div>

        {/* Nom event — droite (Great Vibes or) */}
        <div style={{
          textAlign: 'right',
          fontFamily: "'Great Vibes', cursive",
          fontSize: 'clamp(2.6rem, 4.4vw, 4.8rem)',
          color: '#EECF80',
          textShadow: '0 2px 20px rgba(0,0,0,.95), 0 0 40px rgba(201,169,97,.55)',
          lineHeight: 1,
        }}>{eventTitle}</div>
      </div>
    </div>
  )
}
