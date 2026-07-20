/**
 * Slide 3 — MurStarsSlide
 * Grand titre + instructions photo + compteur discret.
 */
import { motion } from 'framer-motion'
import GoldParticles from '../components/GoldParticles.jsx'

export default function MurStarsSlide({ state }) {
  const count = state?.stats?.arrivees_count ?? 0

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0A0A0A', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, #1F1610 0%, #0A0A0A 80%)',
      }} />
      <GoldParticles count={60} intensity={1.3} />

      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 3, textAlign: 'center', padding: '5vh',
      }}>
        {/* Étoiles animées autour du titre */}
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          style={{
            fontFamily: 'Anton, Impact, sans-serif',
            fontSize: 'clamp(4rem, 8vw, 8rem)',
            color: '#C9A961',
            opacity: 0.4,
            position: 'absolute',
            top: '10vh',
          }}
        >
          ★
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          style={{
            fontFamily: 'Anton, Impact, sans-serif',
            fontSize: 'clamp(6rem, 14vw, 15rem)',
            color: 'transparent',
            background: 'linear-gradient(180deg, #FFE9A8 0%, #C9A961 50%, #7E662E 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            letterSpacing: '0.02em',
            lineHeight: 1,
            margin: 0,
            textShadow: '0 0 80px rgba(201,169,97,0.4)',
          }}
        >
          ★ MUR DES STARS ★
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          style={{ marginTop: '5vh' }}
        >
          <p style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(2rem, 3.5vw, 3.5rem)',
            color: '#F5E6C8',
            margin: 0,
          }}>
            Prends ta photo
          </p>
          <p style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: 'clamp(1.5rem, 2.5vw, 2.5rem)',
            color: '#C9A961',
            margin: '1vh 0 0',
            letterSpacing: '0.1em',
          }}>
            Partage avec <strong style={{ color: '#FFE9A8' }}>#BalNWC2026</strong>
          </p>
        </motion.div>

        {count > 0 && (
          <p style={{
            position: 'absolute',
            bottom: '5vh',
            fontFamily: '"Geist Mono", monospace',
            color: '#C9A961',
            opacity: 0.5,
            fontSize: 'clamp(0.9rem, 1.2vw, 1.2rem)',
            letterSpacing: '0.2em',
          }}>
            {count} STARS PRÉSENTES
          </p>
        )}
      </div>
    </div>
  )
}
