/**
 * Slide 1 — DefaultSlide
 * Affiche fullscreen du bal + particules dorées + logo NWC discret + verset tournant.
 */
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import GoldParticles from '../components/GoldParticles.jsx'

// Versets tournants — thème lumière/joie/fête
const VERSES = [
  { text: 'La joie de l’Éternel est votre force.', ref: 'Néhémie 8:10' },
  { text: 'Vous êtes la lumière du monde.', ref: 'Matthieu 5:14' },
  { text: 'Un temps pour danser, un temps pour rire.', ref: 'Ecclésiaste 3:4' },
  { text: 'C’est ici la journée que l’Éternel a faite ; qu’elle soit pour nous un sujet d’allégresse et de joie !', ref: 'Psaume 118:24' },
]

export default function DefaultSlide({ state }) {
  const [verseIdx, setVerseIdx] = useState(0)
  const affiche = state?.event?.cover_image

  useEffect(() => {
    const t = setInterval(() => setVerseIdx((i) => (i + 1) % VERSES.length), 8000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0A0A0A', overflow: 'hidden' }}>
      {/* Affiche en fond, sombrement légendaire */}
      {affiche ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${affiche})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.55)',
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, #1a0f14 0%, #0A0A0A 70%)',
          }}
        />
      )}

      {/* Voile dégradé sombre pour le contraste */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.85) 100%)',
      }} />

      <GoldParticles count={50} />

      {/* Verset tournant en bas centre */}
      <div style={{
        position: 'absolute',
        bottom: '8vh', left: 0, right: 0,
        display: 'flex', justifyContent: 'center', zIndex: 3,
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={verseIdx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 1.2 }}
            style={{ textAlign: 'center', maxWidth: '70vw' }}
          >
            <p style={{
              fontFamily: '"Playfair Display", serif',
              fontStyle: 'italic',
              fontSize: 'clamp(1.5rem, 2.5vw, 2.6rem)',
              color: '#F5E6C8',
              textShadow: '0 2px 20px rgba(0,0,0,0.8)',
              margin: 0,
              lineHeight: 1.3,
            }}>
              « {VERSES[verseIdx].text} »
            </p>
            <p style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: 'clamp(0.9rem, 1.2vw, 1.2rem)',
              color: '#C9A961',
              letterSpacing: '0.3em',
              marginTop: '1rem',
              textTransform: 'uppercase',
            }}>
              {VERSES[verseIdx].ref}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Logo NWC discret bas droite */}
      <div style={{
        position: 'absolute', bottom: '3vh', right: '3vw', zIndex: 3,
        opacity: 0.5,
        display: 'flex', alignItems: 'center', gap: '0.6rem',
      }}>
        <img src="/logos/logo_newwine.png" alt="NWC" style={{ height: '3.5vh', filter: 'brightness(0) invert(1)' }} />
        <span style={{
          fontFamily: '"Playfair Display", serif',
          color: '#C9A961',
          fontSize: '1rem',
          letterSpacing: '0.2em',
        }}>
          BAL 2026
        </span>
      </div>
    </div>
  )
}
