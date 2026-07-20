/**
 * Slide 2 — ArriveeSlide
 * Gros compteur d'arrivées + dernier arrivé qui flash + message tournant.
 */
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import GoldParticles from '../components/GoldParticles.jsx'

const MESSAGES = [
  'Prends place, la fête commence',
  'Bienvenue au Bal 2026',
  'Ton étoile brille ce soir',
  'La soirée des Ambassadeurs',
]

export default function ArriveeSlide({ state }) {
  const [msgIdx, setMsgIdx] = useState(0)
  const affiche = state?.event?.cover_image
  const count = state?.stats?.arrivees_count ?? 0
  const latest = state?.stats?.latest_arrival
  const expected = state?.stats?.total_expected ?? 0

  useEffect(() => {
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % MESSAGES.length), 5000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0A0A0A', overflow: 'hidden' }}>
      {affiche && (
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${affiche})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.35) blur(2px)',
          }}
        />
      )}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(139,26,47,0.35) 0%, rgba(0,0,0,0.8) 100%)',
      }} />

      <GoldParticles count={35} />

      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 3, textAlign: 'center', padding: '5vh',
      }}>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(1.5rem, 2.5vw, 2.5rem)',
            color: '#C9A961',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          Arrivées en direct
        </motion.p>

        {/* Compteur XXL */}
        <motion.div
          key={count}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          style={{
            fontFamily: 'Anton, Impact, sans-serif',
            fontSize: 'clamp(10rem, 22vw, 22rem)',
            lineHeight: 1,
            color: '#C9A961',
            textShadow: '0 0 60px rgba(201,169,97,0.6), 0 8px 40px rgba(0,0,0,0.9)',
            margin: '2vh 0',
          }}
        >
          {count}
        </motion.div>

        {expected > 0 && (
          <p style={{
            fontFamily: '"Playfair Display", serif',
            color: '#F5E6C8',
            fontSize: 'clamp(1rem, 1.5vw, 1.5rem)',
            opacity: 0.7,
            margin: 0,
          }}>
            sur {expected} attendus
          </p>
        )}

        {/* Dernier arrivé qui flash */}
        <AnimatePresence mode="wait">
          {latest?.full_name && (
            <motion.div
              key={latest.full_name + (latest.arrived_at || '')}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: [0, 1, 1, 1, 0.9],
                scale: [0.9, 1.05, 1, 1, 1],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              style={{
                marginTop: '4vh',
                padding: '1.5vh 3vw',
                border: '2px solid #C9A961',
                borderRadius: '999px',
                background: 'rgba(201,169,97,0.1)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <p style={{ margin: 0, color: '#C9A961', letterSpacing: '0.2em', fontSize: 'clamp(0.8rem, 1vw, 1rem)' }}>
                DERNIER ARRIVÉ
              </p>
              <p style={{
                margin: '0.5vh 0 0',
                color: 'white',
                fontFamily: '"Playfair Display", serif',
                fontSize: 'clamp(1.5rem, 2.5vw, 2.5rem)',
                fontWeight: 700,
              }}>
                {latest.full_name}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message tournant en bas */}
        <div style={{ marginTop: '5vh', height: '4vh' }}>
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIdx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.8 }}
              style={{
                fontFamily: '"Playfair Display", serif',
                fontStyle: 'italic',
                fontSize: 'clamp(1.2rem, 2vw, 2rem)',
                color: '#F5E6C8',
                margin: 0,
              }}
            >
              « {MESSAGES[msgIdx]} »
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
