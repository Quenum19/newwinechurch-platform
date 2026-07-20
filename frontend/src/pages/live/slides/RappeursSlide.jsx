/**
 * Slide — Prestation rappeur (nom en énorme).
 * Config attendue : { artiste: 'CLINTON' | 'KIM B' | custom }
 */
import { motion } from 'framer-motion'
import GoldParticles from '../components/GoldParticles.jsx'

export default function RappeursSlide({ state }) {
  const artiste = (state?.config?.artiste || 'PRESTATION').toString().toUpperCase()

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #0A0A0A 0%, #1a0f14 50%, #0A0A0A 100%)', overflow: 'hidden' }}>
      <GoldParticles count={80} />
      {/* Éclairs dorés */}
      <div style={{
        position: 'absolute',
        top: '10%', left: '10%',
        width: '80%', height: '80%',
        background: 'radial-gradient(circle, rgba(201,169,97,0.15) 0%, transparent 70%)',
        animation: 'flash-gold 1.8s ease-in-out infinite',
      }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
        <motion.p
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: 'clamp(1.2rem, 2vw, 2rem)',
            color: '#C9A961',
            letterSpacing: '0.5em',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          Live sur scène
        </motion.p>
        <motion.h1
          key={artiste}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{
            fontFamily: '"Anton", sans-serif',
            fontSize: 'clamp(10rem, 22vw, 25rem)',
            color: '#F5E6C8',
            textShadow: '0 0 80px rgba(201, 169, 97, 0.7), 0 0 160px rgba(139, 26, 47, 0.5)',
            margin: '2rem 0',
            letterSpacing: '0.02em',
            fontWeight: 900,
            lineHeight: 0.9,
          }}
        >
          {artiste}
        </motion.h1>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          style={{ display: 'flex', gap: '1.5rem', fontSize: '2rem', color: '#C9A961' }}
        >
          <span>🎤</span><span>🔥</span><span>🎤</span>
        </motion.div>
      </div>
      <style>{`
        @keyframes flash-gold {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  )
}
