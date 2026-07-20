/**
 * Slide — BON APPÉTIT + menu du repas.
 */
import { motion } from 'framer-motion'
import GoldParticles from '../components/GoldParticles.jsx'

export default function BonAppetitSlide() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, #1a0f14 0%, #0A0A0A 75%)', overflow: 'hidden' }}>
      <GoldParticles count={40} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
        <motion.p
          initial={{ opacity: 0, letterSpacing: '0.1em' }}
          animate={{ opacity: 1, letterSpacing: '0.4em' }}
          transition={{ duration: 1.5 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(1rem, 1.8vw, 1.8rem)',
            color: '#C9A961',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          Que le repas soit servi
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: 'clamp(6rem, 14vw, 15rem)',
            color: '#F5E6C8',
            textShadow: '0 0 40px rgba(201, 169, 97, 0.4)',
            margin: '1.5rem 0',
            lineHeight: 0.9,
            fontWeight: 700,
          }}
        >
          Bon appétit
        </motion.h1>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          style={{
            display: 'flex', gap: '3rem',
            fontFamily: '"Playfair Display", serif',
            fontSize: 'clamp(1.4rem, 2.4vw, 2.4rem)',
            color: '#F5E6C8',
            marginTop: '2rem',
            letterSpacing: '0.1em',
          }}
        >
          <span>Tchêpe</span>
          <span style={{ color: '#C9A961' }}>·</span>
          <span>Attiéké poulet</span>
        </motion.div>
      </div>
    </div>
  )
}
