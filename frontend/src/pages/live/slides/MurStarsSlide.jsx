import { useMemo } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * MurStarsSlide V2 — "Mur des Stars" — version VIVANTE.
 * Fond radial ambré + grande étoile Cinzel 1500px qui tourne lentement (100s).
 * 3 projecteurs qui BALAIENT réellement (nwSpotSweep 4–6s, transform-origin top,
 * blur 22px) pour un effet cinéma dynamique et bien visible.
 * 30 étincelles procédurales scintillantes (nwTwinkleX opacité .2→1, rotation
 * ±15deg, tailles variées 15–75px) + 22 particules or montantes (nwRise 9–19s).
 * Titre "Mur des Stars" (Anton 250px, gradient or, nwGlowP 6s) encadré de
 * 2 étoiles Cinzel 120px pulsantes (nwStarPulse 3s décalées de 1.5s).
 * Sous-titre Great Vibes 96px "Prends ta photo" entre 2 filets or,
 * puis Playfair italic 46px "et deviens une étoile de la soirée".
 * Cadre présidentiel double filet or + 4 losanges aux coins.
 */
export default function MurStarsSlide({ state }) {
  // state prop conservée pour compat future (compteur, event tag, etc.)
  void state

  // 30 étincelles procédurales — scintillement + rotation + montée verticale
  const twinkles = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    return Array.from({ length: 30 }, (_, i) => {
      const left = rnd(i * 2.1) * 94 + 3
      const top = rnd(i * 3.3) * 86 + 6
      const size = 15 + rnd(i * 1.7) * 60          // 15–75px, plus grande variation
      const dur = 1.8 + rnd(i * 4) * 2.6           // 1.8–4.4s scintillement
      const upDur = (4 + rnd(i) * 3).toFixed(1)    // 4–7s montée
      const delay = (-rnd(i * 6) * dur).toFixed(2)
      const variant = i % 3                        // 3 variantes de scintillement
      return { left, top, size, dur, upDur, delay, variant }
    })
  }, [])

  // 22 particules or montantes — identique DefaultSlide V2
  const particles = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    return Array.from({ length: 22 }, (_, i) => {
      const size = 2 + rnd(i * 1.3) * 4
      const left = rnd(i * 2.1) * 100
      const dur = 9 + rnd(i * 3.7) * 10
      const delay = -rnd(i * 5.2) * dur
      const startY = 200 + rnd(i * 1.9) * 880
      return { size, left, dur, delay, startY }
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
        @keyframes nwTwinkleA { 0%,100%{opacity:.2; transform:scale(.7) rotate(-15deg)} 50%{opacity:1; transform:scale(1.25) rotate(15deg)} }
        @keyframes nwTwinkleB { 0%,100%{opacity:.3; transform:scale(.85) rotate(10deg)} 50%{opacity:.95; transform:scale(1.15) rotate(-10deg)} }
        @keyframes nwTwinkleC { 0%,100%{opacity:.25; transform:scale(1) rotate(0deg)} 50%{opacity:1; transform:scale(1.35) rotate(20deg)} }
        @keyframes nwSpinSlow { to{transform:translate(-50%,-50%) rotate(360deg)} }
        @keyframes nwGlowP { 0%,100%{text-shadow:0 0 70px rgba(201,169,97,.4),0 3px 6px rgba(0,0,0,.7); filter:brightness(.98)} 50%{text-shadow:0 0 150px rgba(201,169,97,.75),0 3px 6px rgba(0,0,0,.7); filter:brightness(1.08)} }
        @keyframes nwStarPulse { 0%,100%{transform:scale(1); text-shadow:0 0 30px rgba(214,178,95,.6)} 50%{transform:scale(1.14); text-shadow:0 0 55px rgba(214,178,95,.95)} }
        @keyframes nwUp { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes nwRise { 0%{transform:translateY(20px);opacity:0} 12%{opacity:.9} 88%{opacity:.9} 100%{transform:translateY(-1080px);opacity:0} }
        @keyframes nwSpotSweepA { 0%,100%{transform:translateX(-50%) rotate(-22deg); opacity:.55} 50%{transform:translateX(-50%) rotate(22deg); opacity:.85} }
        @keyframes nwSpotSweepB { 0%,100%{transform:translateX(-50%) rotate(20deg); opacity:.7} 50%{transform:translateX(-50%) rotate(-20deg); opacity:.4} }
        @keyframes nwSpotSweepC { 0%,100%{transform:translateX(-50%) rotate(-18deg); opacity:.5} 50%{transform:translateX(-50%) rotate(18deg); opacity:.8} }
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

        {/* PROJECTEURS actifs — 3 faisceaux qui BALAIENT (pivot en haut) */}
        {/* Projecteur gauche */}
        <div style={{
          position: 'absolute', top: -80, left: '25%',
          width: 460, height: 1400,
          background: 'linear-gradient(180deg, rgba(238,207,128,.35) 0%, rgba(230,200,119,.18) 35%, rgba(214,178,95,.05) 70%, transparent 100%)',
          filter: 'blur(22px)',
          transformOrigin: 'top center',
          animation: 'nwSpotSweepA 5s ease-in-out infinite',
          pointerEvents: 'none', mixBlendMode: 'screen',
        }} />
        {/* Projecteur central (contre-sens, plus lent) */}
        <div style={{
          position: 'absolute', top: -80, left: '50%',
          width: 380, height: 1400,
          background: 'linear-gradient(180deg, rgba(245,230,200,.3) 0%, rgba(230,200,119,.14) 40%, rgba(214,178,95,.04) 75%, transparent 100%)',
          filter: 'blur(24px)',
          transformOrigin: 'top center',
          animation: 'nwSpotSweepB 6.2s ease-in-out infinite',
          pointerEvents: 'none', mixBlendMode: 'screen',
        }} />
        {/* Projecteur droit */}
        <div style={{
          position: 'absolute', top: -80, left: '75%',
          width: 440, height: 1400,
          background: 'linear-gradient(180deg, rgba(238,207,128,.32) 0%, rgba(230,200,119,.16) 35%, rgba(214,178,95,.05) 70%, transparent 100%)',
          filter: 'blur(22px)',
          transformOrigin: 'top center',
          animation: 'nwSpotSweepC 4.4s ease-in-out infinite',
          pointerEvents: 'none', mixBlendMode: 'screen',
        }} />

        {/* Particules or montantes (22, comme DefaultSlide) */}
        {particles.map((p, i) => (
          <div key={`p-${i}`} style={{
            position: 'absolute',
            left: `${p.left}%`, top: p.startY,
            width: p.size, height: p.size, borderRadius: '50%',
            background: 'radial-gradient(circle,#FFE9A8,rgba(201,169,97,.15))',
            boxShadow: `0 0 ${p.size * 3}px rgba(230,200,119,.7)`,
            animation: `nwRise ${p.dur}s linear infinite`,
            animationDelay: `${p.delay}s`,
            pointerEvents: 'none',
          }} />
        ))}

        {/* 30 étincelles procédurales scintillantes */}
        {twinkles.map((t, i) => {
          const anim = t.variant === 0 ? 'nwTwinkleA' : t.variant === 1 ? 'nwTwinkleB' : 'nwTwinkleC'
          return (
            <div key={`t-${i}`} style={{
              position: 'absolute',
              left: `${t.left}%`, top: `${t.top}%`,
              fontFamily: "'Cinzel',serif", fontSize: t.size,
              color: 'rgba(230,200,119,.65)',
              textShadow: '0 0 18px rgba(214,178,95,.6)',
              animation: `${anim} ${t.dur}s ease-in-out infinite, nwUp ${t.upDur}s ease-in-out infinite`,
              animationDelay: `${t.delay}s`,
              pointerEvents: 'none',
            }}>✦</div>
          )
        })}

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
