import { useMemo, useState, useEffect } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * DancingStarsSlide — Portage fidèle du design Claude Design (.dc.html V2).
 *
 * Rideau qui s'ouvre puis se ferme, en boucle (cycle 9s).
 * Titre "Dancing Stars" (Anton 280px, gradient or, glow qui respire) qui
 * change de "mode" (scale + letter-spacing + drop-shadow) toutes les 3s
 * pour rester vivant même à l'arrêt.
 *
 * Fond derrière le rideau : lueur de scène + twinkles + spots croisés.
 * PAS de slot photo/vidéo (comportement du design original).
 */
export default function DancingStarsSlide() {
  // Le "mode" du titre change toutes les 3s (fidèle au componentDidMount du .dc.html)
  const [mode, setMode] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => setMode((m) => (m + 1) % 3), 3000)
    return () => clearInterval(iv)
  }, [])

  const titleModes = [
    { transform: 'scale(1)' },
    { transform: 'scale(1.04)', letterSpacing: '.02em' },
    { transform: 'scale(1)', filter: 'drop-shadow(0 0 30px rgba(230,200,119,.6))' },
  ]

  // Twinkles ✦ pseudo-aléatoires (formule déterministe du .dc.html)
  const twinkles = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    return Array.from({ length: 10 }, (_, i) => {
      const left = rnd(i * 2.7) * 80 + 10
      const top = rnd(i * 3.9) * 60 + 16
      const size = 18 + rnd(i * 1.5) * 22
      const dur = 2.5 + rnd(i * 4) * 2
      const delay = (-rnd(i * 3) * dur).toFixed(2)
      return { left, top, size, dur, delay }
    })
  }, [])

  // Velours à plis (fidèle .dc.html)
  const velvet = 'repeating-linear-gradient(90deg,#3a121b 0px,#6b1f2c 26px,#4a1622 52px,#2a0f14 78px)'

  const cornerBase = {
    position: 'absolute', width: 20, height: 20,
    background: '#E6C877', transform: 'rotate(45deg)',
    boxShadow: '0 0 12px rgba(214,178,95,.7)', zIndex: 8,
  }

  return (
    <Stage>
      <style>{`
        /* Cycle rideau 12s : fermé 1.8s → ouverture 2.4s → ouvert 3.6s → fermeture 2.4s → fermé 1.8s */
        @keyframes nwOpenL {
          0%, 15%   { transform: translateX(0) }
          35%, 65%  { transform: translateX(-101%) }
          85%, 100% { transform: translateX(0) }
        }
        @keyframes nwOpenR {
          0%, 15%   { transform: translateX(0) }
          35%, 65%  { transform: translateX(101%) }
          85%, 100% { transform: translateX(0) }
        }
        @keyframes nwCurtainSheen { 0%{transform:translateX(-140%) skewX(-12deg)} 100%{transform:translateX(260%) skewX(-12deg)} }
        @keyframes nwSpotCross { 0%{transform:translateX(-44vw) rotate(-14deg)} 100%{transform:translateX(44vw) rotate(14deg)} }
        @keyframes nwGlowP { 0%,100%{text-shadow:0 0 70px rgba(201,169,97,.45),0 3px 6px rgba(0,0,0,.7)} 50%{text-shadow:0 0 140px rgba(201,169,97,.75),0 3px 6px rgba(0,0,0,.7)} }
        @keyframes nwStagePulse { 0%,100%{opacity:.4; transform:translate(-50%,-50%) scale(1)} 50%{opacity:.75; transform:translate(-50%,-50%) scale(1.1)} }
        @keyframes nwTwinkle { 0%,100%{opacity:.3} 50%{opacity:1} }
      `}</style>

      <div style={{
        position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
        background: '#0A0A0A', color: '#F5E6C8', fontFamily: "'Cormorant Garamond',serif",
      }}>
        {/* Fond radial nuit rougeâtre */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 100% at 50% 40%, #2a0f14 0%, #12080a 58%, #060402 100%)',
        }} />

        {/* Lueur de scène */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 1200, height: 800,
          background: 'radial-gradient(closest-side, rgba(230,200,119,.2), transparent 70%)',
          animation: 'nwStagePulse 5s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* Twinkles ✦ */}
        {twinkles.map((t, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${t.left}%`, top: `${t.top}%`,
            zIndex: 5,
            fontFamily: "'Cinzel',serif",
            fontSize: t.size,
            color: 'rgba(230,200,119,.5)',
            animation: `nwTwinkle ${t.dur}s ease-in-out infinite`,
            animationDelay: `${t.delay}s`,
            pointerEvents: 'none',
          }}>✦</div>
        ))}

        {/* Spots croisés */}
        <div style={{
          position: 'absolute', top: '-20%', left: '38%',
          width: 200, height: '150%',
          background: 'linear-gradient(180deg, rgba(230,200,119,.18), transparent 74%)',
          filter: 'blur(9px)',
          animation: 'nwSpotCross 7s ease-in-out infinite alternate',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '-20%', right: '38%',
          width: 200, height: '150%',
          background: 'linear-gradient(180deg, rgba(230,200,119,.15), transparent 74%)',
          filter: 'blur(9px)',
          animation: 'nwSpotCross 8.5s ease-in-out infinite alternate-reverse',
          pointerEvents: 'none',
        }} />

        {/* TITRE (toujours au-dessus, lisible rideau ouvert ou fermé) */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 6,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: "'Cinzel',serif", fontWeight: 500, fontSize: 34,
            letterSpacing: '.52em', textIndent: '.52em',
            color: '#E6C877', textShadow: '0 2px 12px rgba(0,0,0,.9)',
            marginBottom: 6,
          }}>LE RIDEAU SE LÈVE</div>
          <div style={{
            fontFamily: "'Anton',sans-serif", fontSize: 280, lineHeight: .82,
            textTransform: 'uppercase',
            background: 'linear-gradient(180deg,#FFF6D8,#E6C877 48%,#8a6d2f)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'nwGlowP 5s ease-in-out infinite',
            transition: 'transform .8s ease, letter-spacing .8s ease, filter .8s ease',
            ...titleModes[mode],
          }}>Dancing<br/>Stars</div>
        </div>

        {/* RIDEAU : deux pans qui s'ouvrent puis se ferment, en boucle (cycle 9s) */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none', overflow: 'hidden' }}>
          {/* Pan gauche */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0, left: 0, width: '52%',
            background: velvet,
            boxShadow: 'inset -30px 0 40px rgba(0,0,0,.6)',
            animation: 'nwOpenL 12s cubic-bezier(.65,0,.35,1) infinite',
            willChange: 'transform',
          }}>
            <div style={{
              position: 'absolute', top: 0, bottom: 0, right: 0, width: 60,
              background: 'linear-gradient(90deg,transparent,rgba(255,230,170,.14))',
            }} />
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: 0, width: 50,
              background: 'linear-gradient(90deg,transparent,rgba(255,230,170,.12),transparent)',
              animation: 'nwCurtainSheen 6s linear infinite',
            }} />
          </div>
          {/* Pan droit */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0, right: 0, width: '52%',
            background: velvet,
            boxShadow: 'inset 30px 0 40px rgba(0,0,0,.6)',
            animation: 'nwOpenR 12s cubic-bezier(.65,0,.35,1) infinite',
            willChange: 'transform',
          }}>
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: 0, width: 60,
              background: 'linear-gradient(270deg,transparent,rgba(255,230,170,.14))',
            }} />
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: 0, width: 50,
              background: 'linear-gradient(90deg,transparent,rgba(255,230,170,.12),transparent)',
              animation: 'nwCurtainSheen 7s linear infinite 1s',
            }} />
          </div>
        </div>

        {/* Lambrequin haut */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 90, zIndex: 5,
          background: velvet,
          boxShadow: '0 8px 24px rgba(0,0,0,.6)',
          borderBottom: '3px solid rgba(214,178,95,.6)',
        }} />

        {/* Cadre or présidentiel (au-dessus du rideau) */}
        <div style={{
          position: 'absolute', inset: 28, zIndex: 7,
          border: '3px solid rgba(214,178,95,.9)',
          boxShadow: 'inset 0 0 80px rgba(0,0,0,.4)',
          pointerEvents: 'none',
        }} />

        {/* 4 losanges aux coins */}
        <div style={{ ...cornerBase, top: 56, left: 56 }} />
        <div style={{ ...cornerBase, top: 56, right: 56 }} />
        <div style={{ ...cornerBase, bottom: 56, left: 56 }} />
        <div style={{ ...cornerBase, bottom: 56, right: 56 }} />
      </div>
    </Stage>
  )
}
