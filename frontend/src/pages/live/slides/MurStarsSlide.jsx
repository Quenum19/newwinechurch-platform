import { useMemo } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * MurStarsSlide V2 — "Mur des Stars".
 * Fond radial ambré + grande étoile Cinzel 1500px qui tourne lentement (100s).
 * Deux faisceaux diagonaux + 16 étincelles procédurales (nwTwinkle + nwUp).
 * Cadre présidentiel double filet or + 4 losanges aux coins.
 * Titre "Mur des Stars" (Anton 250px, gradient or, nwGlowP 6s) encadré de
 * 2 étoiles Cinzel 120px pulsantes (nwStarPulse 3s décalées de 1.5s).
 * Sous-titre Great Vibes 96px "Prends ta photo" entre 2 filets or,
 * puis Playfair italic 46px "et deviens une étoile de la soirée".
 * Fidèle au design handoff MurStarsSlideV2.dc.html — durées et keyframes intactes.
 */
export default function MurStarsSlide({ state }) {
  // state prop conservée pour compat future (compteur, event tag, etc.)
  void state

  const twinkles = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    return Array.from({ length: 16 }, (_, i) => {
      const left = rnd(i * 2.1) * 94 + 3
      const top = rnd(i * 3.3) * 86 + 6
      const size = 20 + rnd(i * 1.7) * 36
      const dur = 2.4 + rnd(i * 4) * 2.6
      const upDur = (4 + rnd(i) * 3).toFixed(1)
      const delay = (-rnd(i * 6) * dur).toFixed(2)
      return { left, top, size, dur, upDur, delay }
    })
  }, [])

  const cornerBase = {
    position: 'absolute', width: 20, height: 20,
    background: '#E6C877', transform: 'rotate(45deg)',
    boxShadow: '0 0 12px rgba(214,178,95,.7)',
  }

  return (
    <Stage>
      <style>{`
        @keyframes nwTwinkle { 0%,100%{opacity:.25; transform:scale(.85)} 50%{opacity:1; transform:scale(1.18)} }
        @keyframes nwSpinSlow { to{transform:translate(-50%,-50%) rotate(360deg)} }
        @keyframes nwGlowP { 0%,100%{text-shadow:0 0 70px rgba(201,169,97,.4),0 3px 6px rgba(0,0,0,.7)} 50%{text-shadow:0 0 130px rgba(201,169,97,.65),0 3px 6px rgba(0,0,0,.7)} }
        @keyframes nwStarPulse { 0%,100%{transform:scale(1); text-shadow:0 0 30px rgba(214,178,95,.6)} 50%{transform:scale(1.14); text-shadow:0 0 55px rgba(214,178,95,.95)} }
        @keyframes nwUp { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
      `}</style>
      <div style={{
        position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
        background: '#0A0A0A', color: '#F5E6C8', fontFamily: "'Cormorant Garamond',serif",
      }}>
        {/* Fond radial ambré */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 100% at 50% 40%, #211a10 0%, #0d0a06 56%, #060402 100%)',
        }} />

        {/* Grande étoile qui tourne lentement (1500px, 100s) */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          fontFamily: "'Cinzel',serif", fontSize: 1500, lineHeight: 1,
          color: 'rgba(230,200,119,.05)',
          animation: 'nwSpinSlow 100s linear infinite',
        }}>★</div>

        {/* Deux faisceaux diagonaux */}
        <div style={{
          position: 'absolute', top: '-12%', left: '22%',
          width: '26%', height: '130%',
          background: 'linear-gradient(180deg, rgba(230,200,119,.13), transparent 70%)',
          transform: 'skewX(-10deg)', filter: 'blur(8px)',
        }} />
        <div style={{
          position: 'absolute', top: '-12%', right: '22%',
          width: '26%', height: '130%',
          background: 'linear-gradient(180deg, rgba(230,200,119,.11), transparent 70%)',
          transform: 'skewX(10deg)', filter: 'blur(8px)',
        }} />

        {/* 16 étincelles procédurales */}
        {twinkles.map((t, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${t.left}%`, top: `${t.top}%`,
            fontFamily: "'Cinzel',serif", fontSize: t.size,
            color: 'rgba(230,200,119,.55)',
            textShadow: '0 0 16px rgba(214,178,95,.5)',
            animation: `nwTwinkle ${t.dur}s ease-in-out infinite, nwUp ${t.upDur}s ease-in-out infinite`,
            animationDelay: `${t.delay}s`,
          }}>✦</div>
        ))}

        {/* Cadre présidentiel */}
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
        <div style={{ ...cornerBase, top: 56, left: 56 }} />
        <div style={{ ...cornerBase, top: 56, right: 56 }} />
        <div style={{ ...cornerBase, bottom: 56, left: 56 }} />
        <div style={{ ...cornerBase, bottom: 56, right: 56 }} />

        {/* Bloc central */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center',
        }}>
          {/* Deux étoiles pulsantes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 60 }}>
            <span style={{
              fontFamily: "'Cinzel',serif", fontSize: 120, color: '#E6C877',
              animation: 'nwStarPulse 3s ease-in-out infinite',
            }}>★</span>
            <span style={{
              fontFamily: "'Cinzel',serif", fontSize: 120, color: '#E6C877',
              animation: 'nwStarPulse 3s ease-in-out infinite 1.5s',
            }}>★</span>
          </div>

          {/* Titre Anton 250px */}
          <div style={{
            fontFamily: "'Anton',sans-serif", fontSize: 250, lineHeight: .88,
            textTransform: 'uppercase', letterSpacing: '.01em',
            background: 'linear-gradient(180deg,#FFF6D8,#E6C877 48%,#C9A961 66%,#8a6d2f)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'nwGlowP 6s ease-in-out infinite',
            margin: '20px 0 6px',
          }}>Mur des<br />Stars</div>

          {/* Filet or + Great Vibes + filet or */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 34, marginTop: 26 }}>
            <span style={{ width: 150, height: 2, background: 'rgba(214,178,95,.7)' }} />
            <span style={{
              fontFamily: "'Great Vibes',cursive", fontSize: 96, lineHeight: .9,
              color: '#EECF80', textShadow: '0 0 60px rgba(201,169,97,.4)',
            }}>Prends ta photo</span>
            <span style={{ width: 150, height: 2, background: 'rgba(214,178,95,.7)' }} />
          </div>

          {/* Sous-titre italique */}
          <div style={{
            fontFamily: "'Playfair Display',serif", fontStyle: 'italic',
            fontSize: 46, color: '#F5E6C8', marginTop: 22,
          }}>et deviens une étoile de la soirée</div>
        </div>
      </div>
    </Stage>
  )
}
