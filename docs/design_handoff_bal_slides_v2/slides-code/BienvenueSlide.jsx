/**
 * Slide — MOTS DE BIENVENUE avec message chaleureux personnalisé au Bal.
 */
import { motion } from 'framer-motion'
import GoldParticles from '../components/GoldParticles.jsx'

export default function BienvenueSlide({ state }) {
  const title = state?.event?.title ?? 'A Dark Night in Elegance'

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, #1a0f14 0%, #0A0A0A 75%)', overflow: 'hidden' }}>
      <GoldParticles count={30} intensity={0.7}/>

      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 3, textAlign: 'center', padding: '5vh 6vw',
      }}>
        {/* Petit tag en haut */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: 'clamp(1rem, 1.6vw, 1.6rem)',
            color: '#C9A961',
            letterSpacing: '0.6em',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          Bienvenue à
        </motion.p>

        {/* Titre principal — nom du bal */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, delay: 0.2 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(5rem, 10vw, 11rem)',
            fontWeight: 700,
            color: '#F5E6C8',
            textShadow: '0 0 50px rgba(201, 169, 97, 0.5)',
            margin: '2rem 0',
            lineHeight: 1,
          }}
        >
          {title}
        </motion.h1>

        {/* Séparateur doré */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.8 }}
          style={{
            width: '30vw',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #C9A961, transparent)',
            margin: '1.5rem 0',
          }}
        />

        {/* Message d'accueil */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 1 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(1.5rem, 2.6vw, 2.6rem)',
            color: '#F5E6C8',
            opacity: 0.9,
            margin: '1rem 0 0',
            maxWidth: '80vw',
            lineHeight: 1.4,
          }}
        >
          Merci d'être là ce soir.<br/>
          Vivons ensemble une soirée d'élégance,<br/>
          de partage et de souvenirs inoubliables.
        </motion.p>

        {/* Signature étoile */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 1 }}
          style={{
            color: '#C9A961',
            fontSize: 'clamp(1.5rem, 2vw, 2rem)',
            letterSpacing: '1.5rem',
            marginTop: '2rem',
          }}
        >
          ★
        </motion.div>
      </div>
    </div>
  )
}
