/**
 * Slide 6 — BienvenueSlide
 * Sobre, "MOTS DE BIENVENUE" en Playfair italique élégant.
 */
import { motion } from 'framer-motion'
import GoldParticles from '../components/GoldParticles.jsx'

export default function BienvenueSlide() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0A0A0A', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, #14090C 0%, #0A0A0A 80%)',
      }} />
      <GoldParticles count={20} intensity={0.7} />

      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 3, textAlign: 'center', padding: '5vh',
      }}>
        <motion.div
          initial={{ opacity: 0, letterSpacing: '0.5em' }}
          animate={{ opacity: 1, letterSpacing: '0.15em' }}
          transition={{ duration: 2 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: 'clamp(0.9rem, 1.3vw, 1.3rem)',
            color: '#C9A961',
            textTransform: 'uppercase',
          }}
        >
          Bal 2026 &middot; New Wine Church
        </motion.div>

        {/* Séparateur décoratif */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '20vw' }}
          transition={{ duration: 1.5, delay: 0.5 }}
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, #C9A961, transparent)',
            margin: '3vh 0',
          }}
        />

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, delay: 0.8 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(4rem, 9vw, 9rem)',
            color: '#F5E6C8',
            fontWeight: 400,
            lineHeight: 1.1,
            margin: 0,
            textShadow: '0 0 40px rgba(201,169,97,0.3)',
          }}
        >
          Mots de bienvenue
        </motion.h1>

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '20vw' }}
          transition={{ duration: 1.5, delay: 1.2 }}
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, #C9A961, transparent)',
            margin: '3vh 0',
          }}
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 1 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(1.2rem, 1.8vw, 1.8rem)',
            color: '#C9A961',
            opacity: 0.9,
            margin: 0,
          }}
        >
          Que la soirée commence...
        </motion.p>
      </div>
    </div>
  )
}
