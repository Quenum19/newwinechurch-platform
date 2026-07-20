/**
 * Slide — Programme du soir (grande lisibilité, écran large).
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

export default function ProgrammeSlide({ state }) {
  const title = state?.event?.title ?? 'A Dark Night in Elegance'

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, #1a0f14 0%, #0A0A0A 75%)', overflow: 'hidden' }}>
      <GoldParticles count={18} intensity={0.6}/>
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3,
        padding: '5vh 5vw',
      }}>
        {/* Header */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(1.4rem, 2.2vw, 2.2rem)',
            color: '#C9A961',
            textTransform: 'uppercase',
            letterSpacing: '0.5em',
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
            fontStyle: 'italic',
            fontSize: 'clamp(4rem, 7vw, 7.5rem)',
            color: '#F5E6C8',
            fontWeight: 700,
            margin: '1.5rem 0 3rem',
            textShadow: '0 0 30px rgba(201, 169, 97, 0.35)',
            textAlign: 'center',
            lineHeight: 1.05,
          }}
        >
          {title}
        </motion.h1>

        {/* Grille programme — texte grande taille */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            columnGap: '6rem',
            rowGap: '1.4rem',
            fontFamily: '"Playfair Display", serif',
            width: '100%',
            maxWidth: '1300px',
          }}
        >
          {PROGRAM.map((p, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '2rem',
                borderBottom: '1px solid rgba(201, 169, 97, 0.15)',
                paddingBottom: '0.6rem',
              }}
            >
              <span style={{
                color: '#C9A961',
                fontSize: 'clamp(1.4rem, 2.2vw, 2.2rem)',
                fontWeight: 700,
                minWidth: '5.5ch',
                letterSpacing: '0.05em',
                fontVariantNumeric: 'tabular-nums',
              }}>{p.time}</span>
              <span style={{
                color: '#F5E6C8',
                fontSize: 'clamp(1.4rem, 2.3vw, 2.3rem)',
                fontWeight: 400,
              }}>{p.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
