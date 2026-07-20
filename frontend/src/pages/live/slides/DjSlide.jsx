/**
 * Slide — DJ (ambiance boîte de nuit).
 */
import { motion } from 'framer-motion'
import GoldParticles from '../components/GoldParticles.jsx'

export default function DjSlide() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, #1a0f14 0%, #0A0A0A 70%)', overflow: 'hidden' }}>
      <GoldParticles count={70} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: 'clamp(1rem, 1.8vw, 1.8rem)',
            color: '#C9A961',
            letterSpacing: '0.6em',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          Que ça bouge
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2 }}
          style={{
            fontFamily: '"Anton", sans-serif',
            fontSize: 'clamp(8rem, 20vw, 22rem)',
            color: '#F5E6C8',
            textShadow: '0 0 60px rgba(201, 169, 97, 0.5)',
            margin: '2rem 0',
            fontWeight: 900,
            letterSpacing: '0.1em',
          }}
        >
          DJ SET
        </motion.h1>
        {/* Égaliseur animé */}
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-end', height: '80px', marginTop: '2rem' }}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <motion.div
              key={i}
              animate={{ height: ['30%', '100%', '50%', '90%', '30%'] }}
              transition={{ duration: 1 + (i * 0.15) % 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 }}
              style={{
                width: '14px',
                background: 'linear-gradient(180deg, #C9A961 0%, #8B1A2F 100%)',
                borderRadius: '3px',
                boxShadow: '0 0 20px rgba(201, 169, 97, 0.6)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
