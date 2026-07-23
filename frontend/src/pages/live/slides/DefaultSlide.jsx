import { useMemo } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * DefaultSlide V2 — Écran d'attente cinématique.
 * Fond : image cover_image (state.event.cover_image) + scrims radial/linéaire.
 * Cadre présidentiel double filet or + losanges aux coins.
 * Titre "A DARK NIGHT" (Anton 210px, gradient or, glow qui respire) + "Elegance" (Great Vibes 220px).
 * 26 particules or montantes.
 */
export default function DefaultSlide({ state }) {
  const event = state?.event ?? {}
  const subtitle = event.subtitle ?? "Une nuit de prestige, d'élégance et de souvenirs inoubliables."
  const eventTag = event.tag ?? "24 JUILLET · LA MAISON DE LA DESTINÉE"
  const bg = event.cover_image

  const particles = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    return Array.from({ length: 26 }, (_, i) => {
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
        @keyframes nwRise { 0%{transform:translateY(20px);opacity:0} 12%{opacity:.9} 88%{opacity:.9} 100%{transform:translateY(-1080px);opacity:0} }
        @keyframes nwGlow { 0%,100%{text-shadow:0 0 70px rgba(201,169,97,.4),0 3px 6px rgba(0,0,0,.85),0 0 22px rgba(214,178,95,.35)} 50%{text-shadow:0 0 120px rgba(201,169,97,.6),0 3px 6px rgba(0,0,0,.85),0 0 30px rgba(214,178,95,.5)} }
        @keyframes nwDot { 0%,100%{opacity:.25; transform:scale(.8)} 50%{opacity:1; transform:scale(1.25)} }
        @keyframes nwBreathe { 0%,100%{opacity:.72} 50%{opacity:1} }
      `}</style>
      <div style={{
        position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
        background: '#0A0A0A', color: '#F5E6C8', fontFamily: "'Cormorant Garamond',serif",
      }}>
        {/* Image de fond */}
        <div style={{ position: 'absolute', inset: 0 }}>
          {bg ? (
            <img src={bg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'radial-gradient(ellipse at center, #211a10 0%, #0A0A0A 70%)',
            }} />
          )}
        </div>
        {/* Scrims de lisibilité */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(120% 100% at 50% 42%, rgba(10,8,6,.35) 0%, rgba(6,4,2,.72) 60%, rgba(4,3,2,.9) 100%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(0deg, rgba(0,0,0,.9) 0%, rgba(0,0,0,.45) 30%, transparent 62%)',
        }} />

        {/* Particules or montantes */}
        {particles.map((p, i) => (
          <div key={i} style={{
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

        {/* Cadre présidentiel */}
        <div style={{
          position: 'absolute', inset: 28,
          border: '3px solid rgba(214,178,95,.92)',
          boxShadow: '0 0 30px rgba(0,0,0,.5), inset 0 0 80px rgba(0,0,0,.4)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: 40,
          border: '1px solid rgba(214,178,95,.5)', pointerEvents: 'none',
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
          textAlign: 'center', pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 38,
            letterSpacing: '.6em', textIndent: '.6em',
            color: '#E6C877', textShadow: '0 2px 10px rgba(0,0,0,.9)',
          }}>NEW WINE CHURCH</div>

          <div style={{
            fontFamily: "'Anton',sans-serif", fontSize: 210, lineHeight: .92,
            letterSpacing: '.02em', textTransform: 'uppercase',
            color: '#ECCE7D',
            background: 'linear-gradient(180deg,#FFF6D8 0%,#E6C877 46%,#C9A961 64%,#8a6d2f 100%)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginTop: 20,
            animation: 'nwGlow 6s ease-in-out infinite',
          }}>A DARK NIGHT</div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 36, margin: '12px 0 6px' }}>
            <span style={{ width: 170, height: 2, background: 'rgba(214,178,95,.8)' }} />
            <span style={{
              fontFamily: "'Cinzel',serif", fontWeight: 500, fontSize: 44,
              letterSpacing: '.4em', textIndent: '.4em',
              color: '#E6C877', textShadow: '0 2px 8px rgba(0,0,0,.9)',
            }}>IN</span>
            <span style={{ width: 170, height: 2, background: 'rgba(214,178,95,.8)' }} />
          </div>
          <div style={{
            fontFamily: "'Great Vibes',cursive", fontSize: 220, lineHeight: .82,
            color: '#EECF80',
            textShadow: '0 0 80px rgba(201,169,97,.5),0 4px 14px rgba(0,0,0,.85)',
          }}>Elegance</div>

          <div style={{
            fontFamily: "'Playfair Display',serif", fontStyle: 'italic',
            fontSize: 44, color: '#F5E6C8', marginTop: 32,
            textShadow: '0 2px 10px rgba(0,0,0,.9)',
          }}>{subtitle}</div>
        </div>

        {/* Event tag bas */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 80,
          textAlign: 'center', pointerEvents: 'none',
          fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 28,
          letterSpacing: '.5em', textIndent: '.5em',
          color: '#E6C877', textShadow: '0 2px 10px rgba(0,0,0,.95)',
        }}>{eventTag}</div>
      </div>
    </Stage>
  )
}
