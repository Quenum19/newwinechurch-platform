/**
 * Slide — DÉFILÉ (avant caméra live).
 * Ambiance projecteurs cinéma, rideaux dorés animés.
 */
import { motion } from 'framer-motion'
import GoldParticles from '../components/GoldParticles.jsx'

export default function DefileSlide() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #0A0A0A 0%, #1a0f14 50%, #0A0A0A 100%)', overflow: 'hidden' }}>
      <GoldParticles count={30} intensity={0.8}/>

      {/* Halo projecteur central */}
      <motion.div
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '-30%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80vw',
          height: '100vh',
          background: 'radial-gradient(ellipse at top, rgba(201, 169, 97, 0.35) 0%, transparent 55%)',
          zIndex: 2,
        }}
      />

      {/* Deux rayons latéraux */}
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        style={{
          position: 'absolute',
          top: 0, left: '10%',
          width: '15%', height: '100%',
          background: 'linear-gradient(180deg, rgba(201, 169, 97, 0.25) 0%, transparent 70%)',
          zIndex: 2,
        }}
      />
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.9 }}
        style={{
          position: 'absolute',
          top: 0, right: '10%',
          width: '15%', height: '100%',
          background: 'linear-gradient(180deg, rgba(201, 169, 97, 0.25) 0%, transparent 70%)',
          zIndex: 2,
        }}
      />

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 3, gap: '2rem' }}>
        <motion.p
          initial={{ opacity: 0, letterSpacing: '0.3em' }}
          animate={{ opacity: 1, letterSpacing: '0.7em' }}
          transition={{ duration: 1.8 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(1.5rem, 2.4vw, 2.4rem)',
            color: '#C9A961',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          Place à l'élégance
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{
            position: 'relative',
            padding: '0 4rem',
          }}
        >
          {/* Étoile gauche */}
          <span style={{
            position: 'absolute',
            left: 0, top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 'clamp(2.5rem, 4vw, 4rem)',
            color: '#C9A961',
          }}>★</span>

          <h1 style={{
            fontFamily: '"Anton", "Playfair Display", serif',
            fontSize: 'clamp(9rem, 20vw, 22rem)',
            color: '#F5E6C8',
            textShadow: '0 0 60px rgba(201, 169, 97, 0.7), 0 0 120px rgba(139, 26, 47, 0.4)',
            margin: 0,
            letterSpacing: '0.05em',
            fontWeight: 900,
            lineHeight: 1,
          }}>
            DÉFILÉ
          </h1>

          {/* Étoile droite */}
          <span style={{
            position: 'absolute',
            right: 0, top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 'clamp(2.5rem, 4vw, 4rem)',
            color: '#C9A961',
          }}>★</span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.6 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(1.3rem, 2vw, 2rem)',
            color: '#F5E6C8',
            opacity: 0.8,
            letterSpacing: '0.2em',
            margin: 0,
          }}
        >
          Que la beauté défile
        </motion.p>
      </div>
    </div>
  )
}
