/**
 * Slide DEFAUT — Affiche du bal en fond + logo NWC discret.
 * Pas de versets (retirés selon feedback), plus sobre.
 */
import GoldParticles from '../components/GoldParticles.jsx'

export default function DefaultSlide({ state }) {
  const affiche = state?.event?.cover_image
  const title = state?.event?.title ?? 'A Dark Night in Elegance'

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0A0A0A', overflow: 'hidden' }}>
      {/* Affiche en fond, légèrement assombrie pour laisser le brand visible */}
      {affiche ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${affiche})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundColor: '#0A0A0A',
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, #1a0f14 0%, #0A0A0A 70%)',
          }}
        />
      )}

      <GoldParticles count={25} intensity={0.7}/>

      {/* Signature discrète bas droite */}
      <div style={{
        position: 'absolute',
        bottom: '3vh', right: '3vw',
        zIndex: 3,
        opacity: 0.65,
        display: 'flex',
        alignItems: 'center',
        gap: '0.7rem',
      }}>
        <img
          src="/logos/logo_newwine.png"
          alt=""
          style={{ height: '3.5vh', filter: 'brightness(0) invert(1)' }}
        />
        <span style={{
          fontFamily: '"Playfair Display", serif',
          color: '#C9A961',
          fontSize: 'clamp(0.9rem, 1.2vw, 1.2rem)',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
        }}>
          BAL 2026
        </span>
      </div>
    </div>
  )
}
