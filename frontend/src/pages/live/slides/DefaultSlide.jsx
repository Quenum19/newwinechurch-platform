import Stage from '../components/Stage.jsx'

/**
 * DefaultSlide — Affiche du bal AFFICHÉE TELLE QUELLE (aucun flou, aucun
 * texte superposé). L'affiche contient déjà cadre or, losanges, "24 JUILLET",
 * brand "NEW WINE CHURCH · MAISON DE LA DESTINÉE", logo NWC, "BAL & DINE
 * GALA / A DARK NIGHT / IN / Elegance" — les recouvrir la ferait disparaître.
 *
 * Cadrage : object-fit:contain (l'affiche entière visible sans crop) + fond
 * flouté de la même affiche pour combler les bandes latérales (pattern
 * identique KimBPhotos / PhotosAmbianceSlide).
 *
 * Si aucun cover_image : fond radial ambré sombre + titre typographique.
 */
export default function DefaultSlide({ state }) {
  const event = state?.event ?? {}
  const bg = event.cover_image

  if (!bg) {
    return (
      <Stage>
        <div style={{
          position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
          background: 'radial-gradient(ellipse at center, #211a10 0%, #0A0A0A 70%)',
          color: '#F5E6C8', fontFamily: "'Cormorant Garamond',serif",
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 38,
            letterSpacing: '.6em', textIndent: '.6em',
            color: '#E6C877', textShadow: '0 2px 10px rgba(0,0,0,.9)',
          }}>NEW WINE CHURCH</div>
          <div style={{
            fontFamily: "'Anton',sans-serif", fontSize: 210, lineHeight: .92,
            letterSpacing: '.02em', textTransform: 'uppercase',
            background: 'linear-gradient(180deg,#FFF6D8 0%,#E6C877 46%,#C9A961 64%,#8a6d2f 100%)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginTop: 20,
          }}>A DARK NIGHT</div>
          <div style={{
            fontFamily: "'Great Vibes',cursive", fontSize: 220, lineHeight: .82,
            color: '#EECF80',
            textShadow: '0 0 80px rgba(201,169,97,.5)',
          }}>Elegance</div>
        </div>
      </Stage>
    )
  }

  return (
    <Stage>
      <div style={{
        position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
        background: '#0A0A0A',
      }}>
        {/* Fond flouté de la même affiche — remplit les bandes latérales/hautes
            avec les couleurs floues (aucune bande noire) */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("${bg}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(28px) brightness(.85) saturate(1.25)',
          transform: 'scale(1.2)',
        }} />

        {/* Affiche — FORMAT STORY compact au centre (pas trop zoomé).
            Hauteur ~80% (864px), largeur auto (préserve ratio portrait) avec
            maxWidth 30% (576px max). L'affiche apparaît PETITE et DIGNE
            au centre, avec beaucoup de fond flouté autour (velours doré). */}
        <img
          src={bg}
          alt=""
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            height: '80%',
            width: 'auto',
            maxWidth: '30%',
            display: 'block',
            filter: 'drop-shadow(0 12px 48px rgba(0,0,0,.7))',
          }}
        />
      </div>
    </Stage>
  )
}
