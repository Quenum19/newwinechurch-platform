import { useMemo } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * DjSlide V2 — Ambiance dancefloor cinématique.
 * Fond radial nuit chaude + deux strobes (screen blend) or & vin.
 * Cadre présidentiel double filet or + losanges aux coins.
 * Platine vinyle : disque conique or, sillon repeating-radial qui tourne (nwSpinDisc 3s),
 * label wine or, point axe noir.
 * "PLACE À LA MUSIQUE" (Cinzel) + "DJ" (Anton 300px, gradient or, glow nwGlowP 4s)
 * + nom DJ optionnel (Playfair italic 72px).
 * Égaliseur : 40 barres 12px, animation nwEq déphasée.
 */
export default function DjSlide({ state }) {
  void state // nom DJ retiré (feedback 2026-07-23) — slide 100% design

  const eq = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    return Array.from({ length: 40 }, (_, i) => {
      const dur = (0.5 + rnd(i * 2.3) * 0.8).toFixed(2)
      const warm = i % 3 === 0
      const delay = (-rnd(i * 5) * 1).toFixed(2)
      return { dur, warm, delay }
    })
  }, [])

  const cornerBase = {
    position: 'absolute',
    width: 14,
    height: 14,
    background: '#E6C877',
    transform: 'rotate(45deg)',
    boxShadow: '0 0 8px rgba(214,178,95,.6)',
  }

  return (
    <Stage>
      <style>{`
        @keyframes nwStrobe { 0%,100%{opacity:0} 48%{opacity:0} 50%{opacity:.5} 52%{opacity:0} }
        @keyframes nwStrobe2 { 0%,100%{opacity:0} 70%{opacity:0} 72%{opacity:.42} 74%{opacity:0} }
        @keyframes nwSpinDisc { to{transform:rotate(360deg)} }
        @keyframes nwEq { 0%,100%{height:26%} 50%{height:100%} }
        @keyframes nwGlowP { 0%,100%{text-shadow:0 0 60px rgba(201,169,97,.4),0 2px 4px rgba(0,0,0,.7)} 50%{text-shadow:0 0 130px rgba(201,169,97,.75),0 2px 4px rgba(0,0,0,.7)} }
      `}</style>
      <div style={{
        position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
        background: '#0A0A0A', color: '#F5E6C8', fontFamily: "'Cormorant Garamond',serif",
      }}>
        {/* Fond radial nuit chaude */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 100% at 50% 44%, #211a10 0%, #0d0a06 56%, #060402 100%)',
        }} />
        {/* Strobe 1 — or */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(230,200,119,.5)',
          mixBlendMode: 'screen',
          animation: 'nwStrobe 2.4s steps(1,end) infinite',
        }} />
        {/* Strobe 2 — vin */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(139,26,47,.6)',
          mixBlendMode: 'screen',
          animation: 'nwStrobe2 3.1s steps(1,end) infinite',
        }} />

        {/* Cadre présidentiel */}
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
        <div style={{ ...cornerBase, top: 44, left: 44 }} />
        <div style={{ ...cornerBase, top: 44, right: 44 }} />
        <div style={{ ...cornerBase, bottom: 44, left: 44 }} />
        <div style={{ ...cornerBase, bottom: 44, right: 44 }} />

        {/* Bloc central */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center',
        }}>
          {/* Platine vinyle */}
          <div style={{ position: 'relative', width: 280, height: 280, marginBottom: 20 }}>
            {/* Bord conique or */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'conic-gradient(from 0deg,#7E662E,#E6C877,#C9A961,#FFF6D8,#7E662E)',
              boxShadow: '0 0 50px rgba(230,200,119,.4)',
            }} />
            {/* Sillon qui tourne */}
            <div style={{
              position: 'absolute', inset: 8, borderRadius: '50%',
              background: 'repeating-radial-gradient(circle at 50% 50%, #14100a 0 3px, #1c1710 3px 6px)',
              animation: 'nwSpinDisc 3s linear infinite',
            }} />
            {/* Label wine */}
            <div style={{
              position: 'absolute', inset: 104, borderRadius: '50%',
              background: 'linear-gradient(135deg,#8B1A2F,#5f1720)',
              border: '3px solid #E6C877',
            }} />
            {/* Axe */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              width: 8, height: 8, borderRadius: '50%',
              background: '#0A0A0A',
              transform: 'translate(-50%,-50%)',
            }} />
          </div>

          {/* Baseline "PLACE À LA MUSIQUE" */}
          <div style={{
            fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 38,
            letterSpacing: '.5em', textIndent: '.5em',
            color: '#E6C877',
            textShadow: '0 2px 10px rgba(0,0,0,.8)',
          }}>PLACE À LA MUSIQUE</div>

          {/* Titre DJ — nom retiré (feedback 2026-07-23) */}
          <div style={{
            fontFamily: "'Anton',sans-serif", fontSize: 300, lineHeight: .9,
            background: 'linear-gradient(180deg,#FFF6D8,#E6C877 50%,#8a6d2f)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'nwGlowP 4s ease-in-out infinite',
          }}>DJ</div>

          {/* Égaliseur — 40 barres */}
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 8,
            height: 90, marginTop: 26,
          }}>
            {eq.map((e, i) => (
              <div key={i} style={{
                width: 12, height: '40%', borderRadius: 5,
                background: `linear-gradient(180deg,${e.warm ? '#8B1A2F' : '#FFE9A8'},#C9A961)`,
                boxShadow: '0 0 8px rgba(230,200,119,.4)',
                animation: `nwEq ${e.dur}s ease-in-out infinite`,
                animationDelay: `${e.delay}s`,
              }} />
            ))}
          </div>
        </div>
      </div>
    </Stage>
  )
}
