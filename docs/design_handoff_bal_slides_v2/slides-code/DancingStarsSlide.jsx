/**
 * Slide 5 — DancingStarsSlide
 * Rideau doré animé + titre énorme, avant caméra live.
 */
import { motion } from 'framer-motion'

export default function DancingStarsSlide() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0A0A0A', overflow: 'hidden' }}>
      {/* Rideau doré animé : bandes verticales qui ondulent */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          repeating-linear-gradient(
            90deg,
            rgba(201,169,97,0.15) 0px,
            rgba(201,169,97,0.05) 40px,
            rgba(201,169,97,0.2) 80px
          )
        `,
      }} />

      {/* Reflet lumineux qui balaie */}
      <motion.div
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute',
          top: 0, bottom: 0, width: '30%',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,233,168,0.35) 50%, transparent 100%)',
        }}
      />

      {/* Vignette sombre */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)',
      }} />

      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 3, textAlign: 'center', padding: '5vh',
      }}>
        <motion.div
          animate={{
            textShadow: [
              '0 0 40px rgba(255,233,168,0.6)',
              '0 0 90px rgba(255,233,168,0.9)',
              '0 0 40px rgba(255,233,168,0.6)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <p style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(2rem, 3.5vw, 3.5rem)',
            color: '#C9A961',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            margin: 0,
          }}>
            ★ ★ ★
          </p>
          <h1 style={{
            fontFamily: 'Anton, Impact, sans-serif',
            fontSize: 'clamp(8rem, 18vw, 18rem)',
            color: 'transparent',
            background: 'linear-gradient(180deg, #FFF6D8 0%, #FFE9A8 30%, #C9A961 70%, #7E662E 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            lineHeight: 0.95,
            margin: '1vh 0',
            letterSpacing: '0.02em',
          }}>
            DANCING
          </h1>
          <h1 style={{
            fontFamily: 'Anton, Impact, sans-serif',
            fontSize: 'clamp(8rem, 18vw, 18rem)',
            color: 'transparent',
            background: 'linear-gradient(180deg, #FFF6D8 0%, #FFE9A8 30%, #C9A961 70%, #7E662E 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            lineHeight: 0.95,
            margin: 0,
            letterSpacing: '0.02em',
          }}>
            STARS
          </h1>
        </motion.div>
      </div>
    </div>
  )
}
