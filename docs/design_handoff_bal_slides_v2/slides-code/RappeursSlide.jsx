/**
 * Slide — PRESTATION rappeur (nom en énorme).
 * Config attendue : { artiste: 'CLINTON' | 'KIM B' | custom }
 */
import { motion } from 'framer-motion'
import GoldParticles from '../components/GoldParticles.jsx'

export default function RappeursSlide({ state }) {
  const rawArtiste = (state?.config?.artiste || 'PRESTATION').toString()
  const artiste = rawArtiste.toUpperCase()
  const hasName = artiste !== 'PRESTATION'

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0A0A0A 0%, #1a0f14 40%, #2a1a1e 55%, #1a0f14 70%, #0A0A0A 100%)', overflow: 'hidden' }}>
      <GoldParticles count={35} intensity={0.9}/>

      {/* Spotlight animé qui balaye */}
      <motion.div
        animate={{ x: ['-40vw', '40vw', '-40vw'] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '-20%', left: '30%',
          width: '40vw', height: '140vh',
          background: 'radial-gradient(ellipse, rgba(201, 169, 97, 0.25) 0%, transparent 60%)',
          transform: 'rotate(15deg)',
          zIndex: 2,
        }}
      />

      {/* Halo pulsé arrière-plan */}
      <motion.div
        animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.1, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: '15%',
          background: 'radial-gradient(circle, rgba(139, 26, 47, 0.35) 0%, transparent 60%)',
          zIndex: 2,
        }}
      />

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 3, gap: '1.5rem' }}>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(1.3rem, 2.2vw, 2.2rem)',
            color: '#C9A961',
            letterSpacing: '0.6em',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          Live sur scène
        </motion.p>

        <motion.h1
          key={artiste}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: '"Anton", sans-serif',
            fontSize: hasName && artiste.length > 8
              ? 'clamp(7rem, 15vw, 18rem)'
              : 'clamp(10rem, 22vw, 25rem)',
            color: '#F5E6C8',
            textShadow: '0 0 80px rgba(201, 169, 97, 0.85), 0 0 160px rgba(139, 26, 47, 0.6)',
            margin: 0,
            letterSpacing: '0.02em',
            fontWeight: 900,
            lineHeight: 0.9,
            textAlign: 'center',
          }}
        >
          {artiste}
        </motion.h1>

        {/* Ligne dorée qui pulse sous le nom */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          style={{
            width: '30vw',
            height: '3px',
            background: 'linear-gradient(90deg, transparent, #C9A961, transparent)',
            boxShadow: '0 0 20px rgba(201, 169, 97, 0.8)',
          }}
        />

        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            display: 'flex',
            gap: '2rem',
            fontSize: 'clamp(2rem, 3vw, 3rem)',
          }}
        >
          <span>🎤</span>
          <span>🔥</span>
          <span>🎤</span>
        </motion.div>
      </div>
    </div>
  )
}
