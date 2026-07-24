import { useMemo } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * RappeursSlide V4 — « SUR SCÈNE MAINTENANT » (annonce prestation rappeur).
 *
 * Refonte LED-safe : palette NOIR + OR uniquement (aucun rouge/bordeaux,
 * qui vire au magenta cramé sur écrans LED). Fond radial ambré strict
 * identique à MurStarsSlide, halo central or, waveform monochrome or.
 *
 * Layout centré classique : micro animé + sur-titre Cinzel + nom Anton XXL
 * + waveform 32 barres or. Les photos du rappeur ont leur PROPRE slide
 * dédiée (RappeurPhotosSlide) qui les affiche en diaporama plein écran.
 *
 * Micro SVG or ANIMÉ :
 *  - Balancement latéral (-5° ↔ +5°, 2s ease-in-out infinite)
 *  - Halo or pulsant derrière (opacity + scale, 1.5s)
 *  - Shimmer or via <animate> SVG sur le stop central du gradient
 *  - Micro-vibrations verticales sur la grille pour simuler le son capté
 */
export default function RappeursSlide({ state }) {
  const artiste = (state?.config?.artiste ?? 'KIM B').toString()

  // Taille dynamique du nom (Anton XXL — 260 à 300px)
  const nameSize = useMemo(() => {
    const len = artiste.length
    if (len > 18) return '180px'
    if (len > 12) return '230px'
    if (len > 8)  return '270px'
    return '300px'
  }, [artiste])

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
    width: 20, height: 20,
    background: '#E6C877',
    transform: 'rotate(45deg)',
    boxShadow: '0 0 12px rgba(214,178,95,.7)',
  }

  return (
    <Stage>
      <style>{`
        @keyframes nwSpotSweep { 0%{transform:translateX(-42vw) rotate(-15deg)} 100%{transform:translateX(42vw) rotate(15deg)} }
        @keyframes nwHaloPulse { 0%,100%{opacity:.4; transform:translate(-50%,-50%) scale(1)} 50%{opacity:.8; transform:translate(-50%,-50%) scale(1.12)} }
        @keyframes nwLetterIn { 0%{opacity:0; transform:translateY(40px) rotateX(40deg)} 100%{opacity:1; transform:translateY(0) rotateX(0)} }
        @keyframes nwGlowP { 0%,100%{text-shadow:0 0 70px rgba(201,169,97,.4),0 3px 6px rgba(0,0,0,.7); filter:brightness(.98)} 50%{text-shadow:0 0 150px rgba(201,169,97,.75),0 3px 6px rgba(0,0,0,.7); filter:brightness(1.08)} }
        @keyframes nwWave { 0%,100%{height:20%} 50%{height:100%} }
        @keyframes nwMicSway { 0%,100%{transform:rotate(-5deg)} 50%{transform:rotate(5deg)} }
        @keyframes nwMicHalo { 0%,100%{opacity:.35; transform:translate(-50%,-50%) scale(1)} 50%{opacity:.85; transform:translate(-50%,-50%) scale(1.18)} }
        @keyframes nwMicVibe { 0%,100%{transform:translateY(0)} 25%{transform:translateY(-1.5px)} 75%{transform:translateY(1.5px)} }
      `}</style>
      <div style={{
        position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
        background: '#0A0A0A', color: '#F5E6C8', fontFamily: "'Cormorant Garamond',serif",
      }}>
        {/* Fond radial ambré — LED-safe, identique MurStars */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 100% at 50% 40%, #211a10 0%, #0d0a06 56%, #060402 100%)',
        }} />
        {/* Halo or pulsé (remplace l'ancien halo rouge) */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 900, height: 900, borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(230,200,119,.28), transparent 70%)',
          animation: 'nwHaloPulse 3s ease-in-out infinite',
        }} />
        {/* Spot sweep or */}
        <div style={{
          position: 'absolute', top: '-30%', left: '50%',
          width: 340, height: '160%',
          background: 'linear-gradient(180deg, rgba(230,200,119,.2), transparent 72%)',
          filter: 'blur(8px)',
          transformOrigin: 'top center',
          animation: 'nwSpotSweep 5s ease-in-out infinite alternate',
          mixBlendMode: 'screen',
        }} />

        {/* Cadre présidentiel double filet or */}
        <div style={{
          position: 'absolute', inset: 28,
          border: '3px solid rgba(214,178,95,.92)',
          boxShadow: 'inset 0 0 80px rgba(0,0,0,.4)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: 40,
          border: '1px solid rgba(214,178,95,.5)',
          pointerEvents: 'none',
        }} />
        {/* Losanges des 4 coins */}
        <div style={{ ...cornerBase, top: 56, left: 56 }} />
        <div style={{ ...cornerBase, top: 56, right: 56 }} />
        <div style={{ ...cornerBase, bottom: 56, left: 56 }} />
        <div style={{ ...cornerBase, bottom: 56, right: 56 }} />

        {/* Bloc central : micro + sur-titre + nom + waveform */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center',
        }}>
          <AnimatedMic />
          <div style={{
            fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 46,
            letterSpacing: '.5em', textIndent: '.5em',
            color: '#EECF80', textShadow: '0 2px 10px rgba(0,0,0,.8)',
            marginTop: 4,
          }}>SUR SCÈNE MAINTENANT</div>
          <div style={{
            fontFamily: "'Anton',sans-serif", fontSize: nameSize, lineHeight: .88,
            textTransform: 'uppercase', letterSpacing: '.01em',
            background: 'linear-gradient(180deg,#FFF6D8,#E6C877 48%,#C9A961 66%,#8a6d2f)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'nwLetterIn 1s cubic-bezier(.16,1,.3,1) both, nwGlowP 6s ease-in-out 1s infinite',
            maxWidth: 1700, wordBreak: 'break-word',
            margin: '18px 0 6px',
          }}>{artiste}</div>
          {/* Waveform 32 barres — or plat uniquement (LED-safe) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 90, marginTop: 40 }}>
            {bars.map((b, i) => (
              <div key={i} style={{
                width: 12, height: '40%', borderRadius: 6,
                background: 'linear-gradient(180deg,#FFE9A8,#C9A961 50%,#7E662E)',
                boxShadow: '0 0 10px rgba(230,200,119,.55)',
                animation: `nwWave ${b.dur}s ease-in-out infinite`,
                animationDelay: `${b.delay}s`,
              }} />
            ))}
          </div>
        </div>
      </div>
    </Stage>
  )
}

/**
 * Micro SVG or ANIMÉ (co-localisé). Gradient or + shimmer <animate> SMIL.
 */
function AnimatedMic() {
  return (
    <div style={{
      position: 'relative',
      width: 180, height: 220,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginBottom: 6,
    }}>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: 240, height: 240, borderRadius: '50%',
        background: 'radial-gradient(closest-side, rgba(230,200,119,.55), rgba(230,200,119,0) 70%)',
        animation: 'nwMicHalo 1.5s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
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
                <animate attributeName="offset" values="0.2;0.8;0.2" dur="2.4s" repeatCount="indefinite" />
              </stop>
              <stop offset="1" stopColor="#7E662E" />
            </linearGradient>
          </defs>
          <rect x="26" y="86" width="18" height="46" rx="4" fill="url(#rappeurMg)" />
          <rect x="14" y="126" width="42" height="8" rx="4" fill="url(#rappeurMg)" />
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
