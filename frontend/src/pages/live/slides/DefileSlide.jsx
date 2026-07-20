/**
 * Slide — Défilé (avant caméra live prend le relais).
 */
import { motion } from 'framer-motion'
import GoldParticles from '../components/GoldParticles.jsx'

export default function DefileSlide() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0A0A0A 0%, #1a0f14 50%, #0A0A0A 100%)', overflow: 'hidden' }}>
      <GoldParticles count={60} />
      {/* Rayons dorés animés */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 50%, rgba(201,169,97,0.15) 0%, transparent 60%)',
        animation: 'pulse-gold 3s ease-in-out infinite',
      }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ textAlign: 'center' }}
        >
          <div style={{
            fontSize: 'clamp(2rem, 4vw, 4rem)',
            color: '#C9A961',
            letterSpacing: '0.3em',
            marginBottom: '2rem',
          }}>
            ★
          </div>
          <h1 style={{
            fontFamily: '"Anton", "Playfair Display", serif',
            fontSize: 'clamp(8rem, 18vw, 20rem)',
            color: '#F5E6C8',
            textShadow: '0 0 60px rgba(201, 169, 97, 0.6), 0 0 100px rgba(139, 26, 47, 0.4)',
            margin: 0,
            letterSpacing: '0.05em',
            fontWeight: 900,
            lineHeight: 1,
          }}>
            DÉFILÉ
          </h1>
          <div style={{
            fontSize: 'clamp(2rem, 4vw, 4rem)',
            color: '#C9A961',
            letterSpacing: '0.3em',
            marginTop: '2rem',
          }}>
            ★
          </div>
        </motion.div>
      </div>
      <style>{`
        @keyframes pulse-gold {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
