/**
 * Slide 4 — InstallationSlide
 * Invitation à rejoindre la salle + aperçu programme.
 */
import { motion } from 'framer-motion'
import GoldParticles from '../components/GoldParticles.jsx'

const NEXT_STEPS = [
  { time: '19:30', label: 'Mots de bienvenue' },
  { time: '19:45', label: 'Dîner' },
  { time: '20:30', label: 'Dancing Stars' },
  { time: '21:15', label: 'Défilé' },
]

export default function InstallationSlide() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0A0A0A', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, #1a0f14 0%, #0A0A0A 100%)',
      }} />
      <GoldParticles count={35} />

      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 3, textAlign: 'center', padding: '5vh',
      }}>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontFamily: 'Anton, Impact, sans-serif',
            fontSize: 'clamp(4rem, 10vw, 10rem)',
            color: '#C9A961',
            letterSpacing: '0.02em',
            lineHeight: 1,
            margin: 0,
            textShadow: '0 0 60px rgba(201,169,97,0.5)',
          }}
        >
          ★ REJOIGNEZ LA SALLE ★
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(1.5rem, 2.5vw, 2.5rem)',
            color: '#F5E6C8',
            marginTop: '3vh',
          }}
        >
          Installez-vous, la soirée va commencer
        </motion.p>

        {/* Aperçu du programme */}
        <div style={{
          marginTop: '6vh',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '2vw',
          maxWidth: '80vw',
        }}>
          {NEXT_STEPS.map((step, i) => (
            <motion.div
              key={step.time}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.15 }}
              style={{
                padding: '2vh 1.5vw',
                border: '1px solid rgba(201,169,97,0.3)',
                borderRadius: '4px',
                background: 'rgba(255,255,255,0.02)',
                backdropFilter: 'blur(6px)',
              }}
            >
              <p style={{
                fontFamily: '"Geist Mono", monospace',
                color: '#C9A961',
                fontSize: 'clamp(1.5rem, 2vw, 2rem)',
                margin: 0,
                fontWeight: 600,
              }}>
                {step.time}
              </p>
              <p style={{
                fontFamily: '"Playfair Display", serif',
                color: '#F5E6C8',
                fontSize: 'clamp(1rem, 1.3vw, 1.3rem)',
                margin: '1vh 0 0',
              }}>
                {step.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
