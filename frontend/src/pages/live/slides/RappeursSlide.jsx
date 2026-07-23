import { useMemo, useState, useEffect } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * RappeursSlide V3 — « SUR SCÈNE MAINTENANT » (prestation rappeur).
 *
 * Fond radial rouge + halo pulsé + spot sweep + cadre or double filet + losanges.
 *
 * V3 :
 *  - Photo(s) de l'artiste récupérée(s) depuis :
 *      · state.config.artiste_photo   (string : URL image unique)
 *      · state.config.artiste_photos  (array  : plusieurs URLs → grille + crossfade)
 *    Fallback si aucune photo : layout centré classique (nom + micro + waveform).
 *  - Layout split gauche/droite quand une (ou plusieurs) photo(s) sont présentes :
 *      · Gauche  : grand médaillon carré arrondi 600×600 (bordure or + halo)
 *      · Droite  : micro + sur-titre Cinzel + nom Anton + waveform 32 barres
 *  - Micro SVG or ANIMÉ :
 *      · Balancement latéral (-5° ↔ +5°, 2s ease-in-out infinite)
 *      · Halo or pulsant derrière (opacity + scale, 1.5s)
 *      · Shimmer or via animate SVG sur le stop central du gradient
 *      · Micro-vibrations verticales sur la grille pour simuler le son capté
 */
export default function RappeursSlide({ state }) {
  const artiste = (state?.config?.artiste ?? 'KIM B').toString()

  // Normalisation photos → array unique et filtré
  const photos = useMemo(() => {
    const arr = state?.config?.artiste_photos
    const single = state?.config?.artiste_photo
    if (Array.isArray(arr) && arr.length > 0) return arr.filter(Boolean)
    return single ? [single] : []
  }, [state?.config?.artiste_photo, state?.config?.artiste_photos])

  const hasPhoto = photos.length > 0
  const mode = photos.length === 0 ? 'none'
    : photos.length === 1 ? 'single'
    : photos.length === 2 ? 'grid2'
    : 'grid4'

  // Crossfade cycling toutes les 4s dès qu'il y a plus d'une photo
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (photos.length <= 1) return
    const timer = setInterval(() => setTick((t) => t + 1), 4000)
    return () => clearInterval(timer)
  }, [photos.length])

  // Taille dynamique du nom (plus compacte si photo présente à côté)
  const nameSize = useMemo(() => {
    const len = artiste.length
    if (hasPhoto) {
      return len > 18 ? '96px' : len > 12 ? '140px' : '190px'
    }
    return len > 18 ? '150px' : len > 12 ? '200px' : '260px'
  }, [artiste, hasPhoto])

  // Waveform 32 barres — durées/délais pseudo-aléatoires déterministes
  const bars = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    return Array.from({ length: 32 }, (_, i) => {
      const dur = (0.6 + rnd(i * 2.3) * 0.9).toFixed(2)
      const delay = (-rnd(i * 5) * 1).toFixed(2)
      return { dur, delay }
    })
  }, [])

  const cornerBase = {
    position: 'absolute',
    width: 14, height: 14,
    background: '#E6C877',
    transform: 'rotate(45deg)',
    boxShadow: '0 0 8px rgba(214,178,95,.6)',
  }

  const cinzelSubtitle = {
    fontFamily: "'Cinzel',serif",
    fontWeight: 600,
    letterSpacing: '.5em',
    textIndent: '.5em',
    color: '#E6C877',
    textShadow: '0 2px 10px rgba(0,0,0,.8)',
  }

  const antonName = {
    fontFamily: "'Anton',sans-serif",
    fontSize: nameSize,
    lineHeight: .9,
    textTransform: 'uppercase',
    letterSpacing: '.02em',
    background: 'linear-gradient(180deg,#FFF6D8,#E6C877 50%,#B08A3F)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animation: 'nwLetterIn 1s cubic-bezier(.16,1,.3,1) both, nwGlowP 4s ease-in-out 1s infinite',
    wordBreak: 'break-word',
  }

  return (
    <Stage>
      <style>{`
        @keyframes nwSpotSweep { 0%{transform:translateX(-42vw) rotate(-15deg)} 100%{transform:translateX(42vw) rotate(15deg)} }
        @keyframes nwHaloPulse { 0%,100%{opacity:.4; transform:translate(-50%,-50%) scale(1)} 50%{opacity:.8; transform:translate(-50%,-50%) scale(1.12)} }
        @keyframes nwLetterIn { 0%{opacity:0; transform:translateY(40px) rotateX(40deg)} 100%{opacity:1; transform:translateY(0) rotateX(0)} }
        @keyframes nwGlowP { 0%,100%{text-shadow:0 0 60px rgba(201,169,97,.4),0 2px 4px rgba(0,0,0,.7)} 50%{text-shadow:0 0 120px rgba(201,169,97,.7),0 2px 4px rgba(0,0,0,.7)} }
        @keyframes nwWave { 0%,100%{height:20%} 50%{height:100%} }
        @keyframes nwMicSway { 0%,100%{transform:rotate(-5deg)} 50%{transform:rotate(5deg)} }
        @keyframes nwMicHalo { 0%,100%{opacity:.35; transform:translate(-50%,-50%) scale(1)} 50%{opacity:.85; transform:translate(-50%,-50%) scale(1.18)} }
        @keyframes nwMicVibe { 0%,100%{transform:translateY(0)} 25%{transform:translateY(-1.5px)} 75%{transform:translateY(1.5px)} }
        @keyframes nwPortraitIn { 0%{opacity:0; transform:scale(.94)} 100%{opacity:1; transform:scale(1)} }
      `}</style>
      <div style={{
        position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
        background: '#0A0A0A', color: '#F5E6C8', fontFamily: "'Cormorant Garamond',serif",
      }}>
        {/* Fond radial rouge sombre */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 100% at 50% 40%, #2a0f14 0%, #12080a 58%, #060402 100%)',
        }} />
        {/* Halo pulsé */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 900, height: 900, borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(139,26,47,.4), transparent 70%)',
          animation: 'nwHaloPulse 3s ease-in-out infinite',
        }} />
        {/* Spot sweep */}
        <div style={{
          position: 'absolute', top: '-30%', left: '50%',
          width: 340, height: '160%',
          background: 'linear-gradient(180deg, rgba(230,200,119,.2), transparent 72%)',
          filter: 'blur(8px)',
          transformOrigin: 'top center',
          animation: 'nwSpotSweep 5s ease-in-out infinite alternate',
        }} />

        {/* Cadre double filet or */}
        <div style={{
          position: 'absolute', inset: 22,
          border: '2px solid rgba(214,178,95,.9)',
          boxShadow: 'inset 0 0 70px rgba(0,0,0,.4)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: 30,
          border: '1px solid rgba(214,178,95,.5)',
          pointerEvents: 'none',
        }} />
        {/* Losanges des 4 coins */}
        <div style={{ ...cornerBase, top: 44, left: 44 }} />
        <div style={{ ...cornerBase, top: 44, right: 44 }} />
        <div style={{ ...cornerBase, bottom: 44, left: 44 }} />
        <div style={{ ...cornerBase, bottom: 44, right: 44 }} />

        {/* ================================================================
             LAYOUT — split 2 colonnes si photo(s), sinon centré classique
             ================================================================ */}
        {hasPhoto ? (
          <div style={{
            position: 'absolute', inset: 0,
            padding: '60px 90px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 80,
          }}>
            {/* Colonne gauche : photo(s) — médaillon single ou grille */}
            <PhotoPanel mode={mode} photos={photos} tick={tick} />

            {/* Colonne droite : micro + titre + nom + waveform */}
            <div style={{
              flex: 1, minWidth: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              textAlign: 'center',
            }}>
              <AnimatedMic />
              <div style={{ ...cinzelSubtitle, fontSize: 30, marginTop: 4 }}>
                SUR SCÈNE MAINTENANT
              </div>
              <div style={{ ...antonName, maxWidth: '100%', marginTop: 18 }}>
                {artiste}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 70, marginTop: 26 }}>
                {bars.map((b, i) => (
                  <div key={i} style={{
                    width: 8, height: '40%', borderRadius: 5,
                    background: 'linear-gradient(180deg,#FFE9A8,#C9A961 60%,#8B1A2F)',
                    boxShadow: '0 0 8px rgba(230,200,119,.5)',
                    animation: `nwWave ${b.dur}s ease-in-out infinite`,
                    animationDelay: `${b.delay}s`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            textAlign: 'center',
          }}>
            <AnimatedMic />
            <div style={{ ...cinzelSubtitle, fontSize: 36 }}>
              SUR SCÈNE MAINTENANT
            </div>
            <div style={{ ...antonName, maxWidth: 1600 }}>
              {artiste}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, height: 80, marginTop: 34 }}>
              {bars.map((b, i) => (
                <div key={i} style={{
                  width: 10, height: '40%', borderRadius: 6,
                  background: 'linear-gradient(180deg,#FFE9A8,#C9A961 60%,#8B1A2F)',
                  boxShadow: '0 0 8px rgba(230,200,119,.5)',
                  animation: `nwWave ${b.dur}s ease-in-out infinite`,
                  animationDelay: `${b.delay}s`,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Stage>
  )
}

/* ============================================================================
 *  Sous-composants locaux (pas de nouveau fichier — 100% co-localisé)
 * ==========================================================================*/

/**
 * Micro SVG or ANIMÉ.
 *  - Wrapper (halo + wrapper de rotation) : halo pulsé + balancement latéral
 *  - Grille du micro : micro-vibrations verticales (simulent le son captured)
 *  - Gradient central : shimmer or via <animate> SMIL sur l'offset du stop 50%
 */
function AnimatedMic() {
  return (
    <div style={{
      position: 'relative',
      width: 180, height: 220,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginBottom: 6,
    }}>
      {/* Halo pulsé derrière le micro */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: 240, height: 240, borderRadius: '50%',
        background: 'radial-gradient(closest-side, rgba(230,200,119,.55), rgba(230,200,119,0) 70%)',
        animation: 'nwMicHalo 1.5s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      {/* Balancement latéral, pivot au pied du micro */}
      <div style={{
        animation: 'nwMicSway 2s ease-in-out infinite',
        transformOrigin: '50% 100%',
        filter: 'drop-shadow(0 0 12px rgba(230,200,119,.45))',
      }}>
        <svg width="90" height="180" viewBox="0 0 70 150">
          <defs>
            <linearGradient id="rappeurMg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFF6D8" />
              <stop offset=".5" stopColor="#E6C877">
                {/* Shimmer or : le point brillant monte/descend le long du micro */}
                <animate
                  attributeName="offset"
                  values="0.2;0.8;0.2"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
              </stop>
              <stop offset="1" stopColor="#7E662E" />
            </linearGradient>
          </defs>
          {/* Manche + pied du micro (statiques, portent le balancement du wrapper) */}
          <rect x="26" y="86" width="18" height="46" rx="4" fill="url(#rappeurMg)" />
          <rect x="14" y="126" width="42" height="8" rx="4" fill="url(#rappeurMg)" />
          {/* Grille du micro + stries : micro-vibrations verticales */}
          <g style={{ animation: 'nwMicVibe 0.45s ease-in-out infinite' }}>
            <rect x="18" y="6" width="34" height="86" rx="17"
                  fill="url(#rappeurMg)" stroke="#7E662E" strokeWidth="1.5" />
            <g stroke="#7E662E" strokeWidth="1.2" opacity=".5">
              <line x1="22" y1="24" x2="48" y2="24" />
              <line x1="22" y1="38" x2="48" y2="38" />
              <line x1="22" y1="52" x2="48" y2="52" />
              <line x1="22" y1="66" x2="48" y2="66" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  )
}

/**
 * Panneau photo(s) — zone gauche 600×600.
 *  - mode 'single' : un seul médaillon carré arrondi (bordure or + halo)
 *  - mode 'grid2'  : 2 photos empilées verticalement (600×290 chacune)
 *  - mode 'grid4'  : grille 2×2 (290×290 chacune)
 *  - Crossfade : chaque cellule superpose toutes les photos, seule l'active
 *    est opaque, transition CSS opacity 1.2s ease-in-out.
 *  - Rotation via `tick` (parent) : cellule i affiche photos[(tick + i) % N].
 */
function PhotoPanel({ mode, photos, tick }) {
  const SIZE = 600

  if (mode === 'single') {
    return (
      <div style={{
        position: 'relative',
        width: SIZE, height: SIZE, flexShrink: 0,
        borderRadius: 32,
        border: '2px solid #E6C877',
        boxShadow: '0 0 40px rgba(214,178,95,.4), inset 0 0 40px rgba(0,0,0,.35)',
        overflow: 'hidden',
        animation: 'nwPortraitIn 1s cubic-bezier(.16,1,.3,1) both',
      }}>
        <img
          src={photos[0]}
          alt=""
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {/* Léger vignettage pour ancrer la photo dans le décor sombre */}
        <div style={{
          position: 'absolute', inset: 0,
          boxShadow: 'inset 0 0 80px rgba(0,0,0,.55)',
          pointerEvents: 'none',
        }} />
      </div>
    )
  }

  // Grilles 2×1 (2 photos) ou 2×2 (3+ photos)
  const slotsN  = mode === 'grid2' ? 2 : 4
  const cellCols = mode === 'grid2' ? 1 : 2
  const cellRows = 2
  const gap = 20
  const cellW = mode === 'grid2' ? SIZE : Math.floor((SIZE - gap) / 2)
  const cellH = Math.floor((SIZE - gap * (cellRows - 1)) / cellRows)

  return (
    <div style={{
      width: SIZE, height: SIZE, flexShrink: 0,
      display: 'grid',
      gridTemplateColumns: `repeat(${cellCols}, ${cellW}px)`,
      gridTemplateRows: `repeat(${cellRows}, ${cellH}px)`,
      gap,
      animation: 'nwPortraitIn 1s cubic-bezier(.16,1,.3,1) both',
    }}>
      {Array.from({ length: slotsN }, (_, i) => {
        const activeIdx = ((tick + i) % photos.length + photos.length) % photos.length
        return (
          <div key={i} style={{
            position: 'relative',
            width: cellW, height: cellH,
            borderRadius: 22,
            border: '2px solid #E6C877',
            boxShadow: '0 0 30px rgba(214,178,95,.35)',
            overflow: 'hidden',
            background: '#0A0A0A',
          }}>
            {photos.map((src, j) => (
              <img
                key={j}
                src={src}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%', objectFit: 'cover',
                  opacity: j === activeIdx ? 1 : 0,
                  transition: 'opacity 1.2s ease-in-out',
                }}
              />
            ))}
            <div style={{
              position: 'absolute', inset: 0,
              boxShadow: 'inset 0 0 50px rgba(0,0,0,.55)',
              pointerEvents: 'none',
            }} />
          </div>
        )
      })}
    </div>
  )
}
