import { useMemo } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * DjSlide V3 — LED-safe (aligné pattern MurStars).
 *
 * Refonte 2026-07-24 pour éviter les dérives chromatiques sur mur LED :
 * - Fond NOIR PUR #000000 (avec radial très sombre #1a1408 → #000)
 *   au lieu du radial nuit chaude qui virait au brun rouge cramé.
 * - Or PLAT partout : "DJ" en `color:#E6C877` + textShadow, plus
 *   aucun `WebkitBackgroundClip:text` qui devenait illisible sur LED.
 * - Strobes uniquement OR (retrait du strobe vin rgba(139,26,47,.6)
 *   qui virait au magenta sur LED).
 * - Label vinyle en brun sombre `#3a2a15 → #5e4a2d` (fini le bordeaux
 *   qui saignait sur LED).
 * - Waveform 40 barres en or plat uniquement, plus de barres bordeaux.
 * - Baseline "PLACE À LA MUSIQUE" boostée à 60px (contrainte ≥ 60px).
 * - Cadre présidentiel + losanges 20×20 (alignés MurStars).
 *
 * Structure conservée :
 *   Vinyle SVG central qui tourne (nwSpinDisc 3s).
 *   "PLACE À LA MUSIQUE" (Cinzel 60px+ or plat).
 *   "DJ" (Anton 300px, or plat, glow nwGlowP 4s).
 *   Waveform 40 barres or plat (nwEq déphasé).
 *   Cadre présidentiel double filet or + 4 losanges 20×20.
 */
export default function DjSlide({ state }) {
  void state // nom DJ retiré (feedback 2026-07-23) — slide 100% design

  // 40 barres égaliseur — palette or uniquement (LED-safe)
  const eq = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    return Array.from({ length: 40 }, (_, i) => {
      const dur = (0.5 + rnd(i * 2.3) * 0.8).toFixed(2)
      const delay = (-rnd(i * 5) * 1).toFixed(2)
      return { dur, delay }
    })
  }, [])

  const cornerBase = {
    position: 'absolute',
    width: 20,
    height: 20,
    background: '#E6C877',
    transform: 'rotate(45deg)',
    boxShadow: '0 0 12px rgba(214,178,95,.7)',
  }

  return (
    <Stage>
      <style>{`
        @keyframes nwStrobe { 0%,100%{opacity:0} 48%{opacity:0} 50%{opacity:.5} 52%{opacity:0} }
        @keyframes nwStrobe2 { 0%,100%{opacity:0} 70%{opacity:0} 72%{opacity:.35} 74%{opacity:0} }
        @keyframes nwSpinDisc { to{transform:rotate(360deg)} }
        @keyframes nwEq { 0%,100%{height:26%} 50%{height:100%} }
        @keyframes nwGlowP { 0%,100%{text-shadow:0 0 60px rgba(201,169,97,.4),0 2px 4px rgba(0,0,0,.7)} 50%{text-shadow:0 0 130px rgba(201,169,97,.75),0 2px 4px rgba(0,0,0,.7)} }
      `}</style>
      <div style={{
        position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
        background: '#000000', color: '#F5E6C8', fontFamily: "'Cormorant Garamond',serif",
      }}>
        {/* Fond radial très sombre (LED-safe : reste proche du noir pur) */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 100% at 50% 44%, #1a1408 0%, #000000 70%, #000000 100%)',
        }} />

        {/* Strobe 1 — or (screen blend) */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(230,200,119,.5)',
          mixBlendMode: 'screen',
          animation: 'nwStrobe 2.4s steps(1,end) infinite',
        }} />
        {/* Strobe 2 — or plus doux (remplace l'ancien strobe vin) */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(230,200,119,.35)',
          mixBlendMode: 'screen',
          animation: 'nwStrobe2 3.1s steps(1,end) infinite',
        }} />

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
            {/* Label brun sombre (LED-safe : remplace le bordeaux) */}
            <div style={{
              position: 'absolute', inset: 104, borderRadius: '50%',
              background: 'linear-gradient(135deg,#3a2a15,#5e4a2d)',
              border: '3px solid #E6C877',
            }} />
            {/* Axe */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              width: 8, height: 8, borderRadius: '50%',
              background: '#000000',
              transform: 'translate(-50%,-50%)',
            }} />
          </div>

          {/* Baseline "PLACE À LA MUSIQUE" — 60px (contrainte ≥ 60px) */}
          <div style={{
            fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 60,
            letterSpacing: '.5em', textIndent: '.5em',
            color: '#E6C877',
            textShadow: '0 2px 12px rgba(0,0,0,.85), 0 0 30px rgba(201,169,97,.35)',
          }}>PLACE À LA MUSIQUE</div>

          {/* Titre DJ — or PLAT (LED-safe : plus de gradient text) */}
          <div style={{
            fontFamily: "'Anton',sans-serif", fontSize: 300, lineHeight: .9,
            color: '#E6C877',
            textShadow: '0 0 60px rgba(201,169,97,.4), 0 4px 10px rgba(0,0,0,.8)',
            animation: 'nwGlowP 4s ease-in-out infinite',
          }}>DJ</div>

          {/* Égaliseur — 40 barres OR uniquement (LED-safe) */}
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 8,
            height: 90, marginTop: 26,
          }}>
            {eq.map((e, i) => (
              <div key={i} style={{
                width: 12, height: '40%', borderRadius: 5,
                background: 'linear-gradient(180deg,#FFE9A8,#C9A961)',
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
