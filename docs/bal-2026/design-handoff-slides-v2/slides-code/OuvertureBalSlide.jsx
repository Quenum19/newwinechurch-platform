/**
 * Slide — OUVERTURE OFFICIELLE DU BAL (moment cinéma).
 */
import { motion } from 'framer-motion'
import GoldParticles from '../components/GoldParticles.jsx'

export default function OuvertureBalSlide() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0A0A0A 0%, #1a0f14 50%, #0A0A0A 100%)', overflow: 'hidden' }}>
      <GoldParticles count={55} intensity={1}/>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 3, textAlign: 'center' }}>
        <motion.p
          initial={{ opacity: 0, letterSpacing: '0.2em' }}
          animate={{ opacity: 1, letterSpacing: '0.6em' }}
          transition={{ duration: 2 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(1.5rem, 2.5vw, 2.5rem)',
            color: '#C9A961',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          C'est parti
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: 'clamp(4rem, 10vw, 10rem)',
            color: '#F5E6C8',
            textShadow: '0 0 60px rgba(201, 169, 97, 0.7), 0 0 100px rgba(139, 26, 47, 0.4)',
            margin: '2rem 0',
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: '0.02em',
          }}
        >
          OUVERTURE OFFICIELLE
        </motion.h1>
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(3rem, 7vw, 7rem)',
            color: '#C9A961',
            margin: 0,
            fontWeight: 700,
            textShadow: '0 0 40px rgba(201, 169, 97, 0.5)',
          }}
        >
          du Bal
        </motion.h2>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 1 }}
          style={{ fontSize: '3rem', marginTop: '2rem', color: '#C9A961', letterSpacing: '1rem' }}
        >
          ★  ★  ★
        </motion.div>
      </div>
    </div>
  )
}
