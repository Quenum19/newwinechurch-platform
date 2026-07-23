import { useMemo } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * OuvertureBalSlide V2 — Slide "Ouverture du Bal".
 * Séquence cinématique :
 *   0.0s → radial gradient rouge sombre + feux d'artifice qui décollent
 *   1.6s → deux portes 3D s'ouvrent (perspective 1600px, rotateY ±88°)
 *   0.0s / 0.5s / 1.0s → countdown 3 · 2 · 1 (Anton 520px)
 *   2.4s → révélation du titre "C'EST PARTI / Ouverture / du Bal / ★★★"
 * Toutes durées/keyframes/perspective figées — fidélité au design handoff.
 */
export default function OuvertureBalSlide({ state }) {
  void state // slide 100% design, aucun state consommé

  // Feux d'artifice — reproduit exactement renderVals() du .dc.html
  const fireworks = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    const cols = ['#FFE9A8', '#E6C877', '#FFF6D8', '#8B1A2F', '#F5E6C8', '#EECF80']
    return Array.from({ length: 14 }, (_, i) => {
      const left = 8 + rnd(i * 2.3) * 84
      const top = 8 + rnd(i * 3.1) * 40
      const col = cols[i % cols.length]
      const dur = (2.4 + rnd(i * 1.9) * 1.2).toFixed(2)
      const delay = (1.6 + i * 0.32).toFixed(2)
      const burstDelay = (parseFloat(delay) + 0.9).toFixed(2)
      const rayN = 18
      const rayLen = 90 + Math.round(rnd(i * 4.7) * 70)
      const rays = Array.from({ length: rayN }, (_, j) => {
        const ang = j * (360 / rayN)
        return {
          position: 'absolute', left: '50%', top: '50%',
          width: 5, height: rayLen,
          background: `linear-gradient(180deg,${col},transparent)`,
          boxShadow: `0 0 8px ${col}`,
          transformOrigin: 'top center',
          transform: `rotate(${ang}deg)`,
          borderRadius: 4,
        }
      })
      return {
        launch: {
          position: 'absolute',
          left: `${left}%`, top: `${top + 26}%`,
          width: 5, height: 90, borderRadius: 3,
          background: `linear-gradient(180deg,${col},transparent)`,
          boxShadow: `0 0 16px ${col}`,
          opacity: 0,
          animation: `nwFireLaunch 1s ease-out ${delay}s infinite`,
          zIndex: 4,
        },
        burstWrap: {
          position: 'absolute',
          left: `${left}%`, top: `${top}%`,
          width: 260, height: 260,
          animation: `nwFireBurst ${dur}s ease-out ${burstDelay}s infinite`,
          zIndex: 4,
        },
        rays,
      }
    })
  }, [])

  const cornerBase = {
    position: 'absolute', width: 14, height: 14,
    background: '#E6C877', transform: 'rotate(45deg)',
    boxShadow: '0 0 8px rgba(214,178,95,.6)',
    zIndex: 5,
  }

  const countBase = {
    position: 'absolute',
    fontFamily: "'Anton',sans-serif",
    fontSize: 520,
    color: '#ECCE7D',
    textShadow: '0 0 120px rgba(201,169,97,.7)',
  }

  return (
    <Stage>
      <style>{`
        @keyframes nwDoorL { 0%{transform:perspective(1600px) rotateY(0deg)} 100%{transform:perspective(1600px) rotateY(-88deg)} }
        @keyframes nwDoorR { 0%{transform:perspective(1600px) rotateY(0deg)} 100%{transform:perspective(1600px) rotateY(88deg)} }
        @keyframes nwFireLaunch { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(-380px);opacity:0} }
        @keyframes nwFireBurst { 0%,60%{transform:scale(0);opacity:0} 65%{transform:scale(.3);opacity:1} 100%{transform:scale(1.6);opacity:0} }
        @keyframes nwGlowP { 0%,100%{text-shadow:0 0 60px rgba(201,169,97,.4),0 2px 4px rgba(0,0,0,.7)} 50%{text-shadow:0 0 130px rgba(201,169,97,.75),0 2px 4px rgba(0,0,0,.7)} }
        @keyframes nwCountPop { 0%{transform:scale(2.4);opacity:0} 30%{opacity:1} 100%{transform:scale(.4);opacity:0} }
        @keyframes nwRevealUp { 0%{transform:translateY(50px);opacity:0} 100%{transform:translateY(0);opacity:1} }
      `}</style>

      <div style={{
        position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
        background: '#0A0A0A', color: '#F5E6C8', fontFamily: "'Cormorant Garamond',serif",
      }}>
        {/* Fond radial rouge sombre */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 100% at 50% 30%, #2a0f14 0%, #12080a 56%, #060402 100%)',
        }} />

        {/* Portes 3D qui s'ouvrent — perspective 1600px, rotateY ±88° */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, width: '50%',
          background: 'linear-gradient(90deg,#160d10,#2a1a10)',
          borderRight: '3px solid rgba(230,200,119,.6)',
          transformOrigin: 'left center',
          animation: 'nwDoorL 2.6s cubic-bezier(.7,0,.3,1) 3s forwards',
          boxShadow: 'inset -30px 0 60px rgba(0,0,0,.6)',
        }} />
        <div style={{
          position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%',
          background: 'linear-gradient(270deg,#160d10,#2a1a10)',
          borderLeft: '3px solid rgba(230,200,119,.6)',
          transformOrigin: 'right center',
          animation: 'nwDoorR 2.6s cubic-bezier(.7,0,.3,1) 3s forwards',
          boxShadow: 'inset 30px 0 60px rgba(0,0,0,.6)',
        }} />

        {/* Feux d'artifice — 14 fusées + 18 rayons chacune */}
        {fireworks.map((f, i) => (
          <div key={i}>
            <div style={f.launch} />
            <div style={f.burstWrap}>
              {f.rays.map((r, j) => (
                <div key={j} style={r} />
              ))}
            </div>
          </div>
        ))}

        {/* Cadre présidentiel double filet + 4 losanges */}
        <div style={{
          position: 'absolute', inset: 22,
          border: '2px solid rgba(214,178,95,.9)',
          boxShadow: 'inset 0 0 70px rgba(0,0,0,.4)',
          pointerEvents: 'none', zIndex: 5,
        }} />
        <div style={{
          position: 'absolute', inset: 30,
          border: '1px solid rgba(214,178,95,.5)',
          pointerEvents: 'none', zIndex: 5,
        }} />
        <div style={{ ...cornerBase, top: 44, left: 44 }} />
        <div style={{ ...cornerBase, top: 44, right: 44 }} />
        <div style={{ ...cornerBase, bottom: 44, left: 44 }} />
        <div style={{ ...cornerBase, bottom: 44, right: 44 }} />

        {/* Countdown 3-2-1 — timings ralentis (feedback 2026-07-23) : 1s d'espacement */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 6, pointerEvents: 'none',
        }}>
          <div style={{ ...countBase, animation: 'nwCountPop 1.6s ease-in 0s 1 both' }}>3</div>
          <div style={{ ...countBase, animation: 'nwCountPop 1.6s ease-in 1s 1 both' }}>2</div>
          <div style={{ ...countBase, animation: 'nwCountPop 1.6s ease-in 2s 1 both' }}>1</div>
        </div>

        {/* Titre révélé à 3.6s (après countdown ralenti) */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', zIndex: 6,
          animation: 'nwRevealUp 1s ease 3.6s both',
          pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 72,
            letterSpacing: '.5em', textIndent: '.5em',
            color: '#E6C877', textShadow: '0 2px 12px rgba(0,0,0,.8)',
            marginBottom: 12,
          }}>C'EST PARTI</div>
          <div style={{
            fontFamily: "'Anton',sans-serif", fontSize: 300, lineHeight: .9,
            textTransform: 'uppercase',
            background: 'linear-gradient(180deg,#FFF6D8,#E6C877 50%,#8a6d2f)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'nwGlowP 4s ease-in-out infinite',
          }}>Ouverture</div>
          <div style={{
            fontFamily: "'Great Vibes',cursive", fontSize: 260, lineHeight: .78,
            color: '#EECF80',
            textShadow: '0 0 80px rgba(201,169,97,.55)',
          }}>du Bal</div>
          <div style={{
            display: 'flex', gap: 44, marginTop: 32,
            fontFamily: "'Cinzel',serif", fontSize: 68, color: '#E6C877',
          }}>
            <span>{'★'}</span>
            <span>{'★'}</span>
            <span>{'★'}</span>
          </div>
        </div>
      </div>
    </Stage>
  )
}
