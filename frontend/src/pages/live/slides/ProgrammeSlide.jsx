/**
 * Slide — Programme du soir (timeline visuelle sobre).
 */
import { motion } from 'framer-motion'
import GoldParticles from '../components/GoldParticles.jsx'

const PROGRAM = [
  { time: '18h00', label: 'Arrivée' },
  { time: '18h45', label: 'Mur des stars & cocktail' },
  { time: '20h30', label: 'Installation' },
  { time: '20h40', label: 'Dancing Stars' },
  { time: '20h50', label: 'Mots de bienvenue' },
  { time: '21h05', label: 'Repas' },
  { time: '22h35', label: 'Vote Roi & Reine' },
  { time: '22h45', label: 'Discours Pasteur' },
  { time: '23h05', label: 'Défilé' },
  { time: '00h10', label: 'Prestations rappeurs' },
  { time: '00h40', label: 'Proclamation résultats' },
  { time: '1h30',  label: 'Ouverture officielle du bal' },
]

export default function ProgrammeSlide() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, #1a0f14 0%, #0A0A0A 75%)', overflow: 'hidden' }}>
      <GoldParticles count={25} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 3, padding: '4vh 6vw' }}>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(1rem, 1.6vw, 1.6rem)',
            color: '#C9A961',
            textTransform: 'uppercase',
            letterSpacing: '0.4em',
            margin: 0,
          }}
        >
          Programme de la soirée
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 1 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: 'clamp(3rem, 6vw, 6rem)',
            color: '#F5E6C8',
            fontWeight: 700,
            margin: '1rem 0 3rem',
            fontStyle: 'italic',
            textShadow: '0 0 30px rgba(201, 169, 97, 0.35)',
          }}
        >
          A Dark Night in Elegance
        </motion.h1>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            columnGap: '6rem',
            rowGap: '0.9rem',
            fontFamily: '"Playfair Display", serif',
          }}
        >
          {PROGRAM.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '1.2rem' }}>
              <span style={{
                color: '#C9A961',
                fontSize: 'clamp(0.9rem, 1.4vw, 1.4rem)',
                fontWeight: 700,
                minWidth: '5ch',
                letterSpacing: '0.1em',
              }}>{p.time}</span>
              <span style={{
                color: '#F5E6C8',
                fontSize: 'clamp(1rem, 1.5vw, 1.5rem)',
              }}>{p.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
