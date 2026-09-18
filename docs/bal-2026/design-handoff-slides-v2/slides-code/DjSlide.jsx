/**
 * Slide — DJ · ambiance dancefloor.
 * Renommée simplement "DJ" + expression soirée "Place à la musique".
 */
import { motion } from 'framer-motion'
import GoldParticles from '../components/GoldParticles.jsx'

export default function DjSlide() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, #1a0f14 0%, #0A0A0A 70%)', overflow: 'hidden' }}>
      <GoldParticles count={30} intensity={0.8}/>

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 3, gap: '1.5rem' }}>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(1.3rem, 2.2vw, 2.2rem)',
            color: '#C9A961',
            letterSpacing: '0.7em',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          Place à la musique
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2 }}
          style={{
            fontFamily: '"Anton", sans-serif',
            fontSize: 'clamp(12rem, 28vw, 32rem)',
            color: '#F5E6C8',
            textShadow: '0 0 60px rgba(201, 169, 97, 0.6), 0 0 100px rgba(139, 26, 47, 0.4)',
            margin: 0,
            fontWeight: 900,
            letterSpacing: '0.05em',
            lineHeight: 0.9,
          }}
        >
          DJ
        </motion.h1>

        {/* Égaliseur animé */}
        <div style={{
          display: 'flex',
          gap: '0.9rem',
          alignItems: 'flex-end',
          height: '100px',
          marginTop: '1rem',
        }}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <motion.div
              key={i}
              animate={{ height: ['30%', '100%', '50%', '90%', '30%'] }}
              transition={{
                duration: 1 + ((i * 0.17) % 0.6),
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.08,
              }}
              style={{
                width: '16px',
                background: 'linear-gradient(180deg, #C9A961 0%, #8B1A2F 100%)',
                borderRadius: '4px',
                boxShadow: '0 0 20px rgba(201, 169, 97, 0.6)',
              }}
            />
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(1.4rem, 2.4vw, 2.4rem)',
            color: '#F5E6C8',
            opacity: 0.85,
            margin: '1.5rem 0 0',
            textAlign: 'center',
          }}
        >
          Que la soirée s'enflamme
        </motion.p>
      </div>
    </div>
  )
}
