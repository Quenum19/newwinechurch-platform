import { useMemo } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * OuvertureBalSlide V3 — Slide "Ouverture du Bal" refonte LED-safe.
 * Fond NOIR PUR (#000) — plus aucun ton rouge/vin qui vire au magenta sur LED.
 * Or PLAT (#E6C877, #C9A961, #FFE9A8) — pas de gradient dans le texte.
 * Feux d'artifice OR/IVOIRE uniquement.
 *
 * Séquence cinématique (comportement conservé) :
 *   0.0s → fond noir + feux d'artifice qui décollent
 *   0.0s / 1.0s / 2.0s → countdown 3 · 2 · 1 (Anton 520px or plat)
 *   3.0s → deux portes 3D bronze foncé s'ouvrent (perspective 1600px, rotateY ±88°)
 *   3.6s → révélation du titre "C'EST PARTI / OUVERTURE / du Bal / ★★★"
 * Keyframes conservés (nwDoorL/R, nwFireLaunch, nwFireBurst, nwCountPop, nwRevealUp).
 */
export default function OuvertureBalSlide({ state }) {
  void state // slide 100% design, aucun state consommé

  // Feux d'artifice — palette OR/IVOIRE uniquement (LED-safe, aucun rouge)
  const fireworks = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    const cols = ['#FFE9A8', '#E6C877', '#FFF6D8', '#EECF80', '#F5E6C8', '#C9A961']
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

  // 4 losanges 20×20 aux coins (LED-safe, or plat)
  const cornerBase = {
    position: 'absolute', width: 20, height: 20,
    background: '#E6C877', transform: 'rotate(45deg)',
    boxShadow: '0 0 12px rgba(230,200,119,.7)',
    zIndex: 5,
  }

  // Countdown 3-2-1 : Anton 520px or PLAT (aucun textShadow rouge)
  const countBase = {
    position: 'absolute',
    fontFamily: "'Anton',sans-serif",
    fontSize: 520,
    color: '#E6C877',
  }

  return (
    <Stage>
      <style>{`
        @keyframes nwDoorL { 0%{transform:perspective(1600px) rotateY(0deg)} 100%{transform:perspective(1600px) rotateY(-88deg)} }
        @keyframes nwDoorR { 0%{transform:perspective(1600px) rotateY(0deg)} 100%{transform:perspective(1600px) rotateY(88deg)} }
        @keyframes nwFireLaunch { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(-380px);opacity:0} }
        @keyframes nwFireBurst { 0%,60%{transform:scale(0);opacity:0} 65%{transform:scale(.3);opacity:1} 100%{transform:scale(1.6);opacity:0} }
        @keyframes nwCountPop { 0%{transform:scale(2.4);opacity:0} 30%{opacity:1} 100%{transform:scale(.4);opacity:0} }
        @keyframes nwRevealUp { 0%{transform:translateY(50px);opacity:0} 100%{transform:translateY(0);opacity:1} }
      `}</style>

      <div style={{
        position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
        background: '#000000', color: '#F5E6C8', fontFamily: "'Cormorant Garamond',serif",
      }}>
        {/* Fond NOIR PUR — plus aucun radial rouge/vin (LED-safe) */}
        <div style={{
          position: 'absolute', inset: 0,
          background: '#000000',
        }} />

        {/* Portes 3D bronze foncé — matériau LED-safe (peu de rouge) */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, width: '50%',
          background: 'linear-gradient(90deg,#1a1108,#3a2a15)',
          borderRight: '3px solid rgba(230,200,119,.6)',
          transformOrigin: 'left center',
          animation: 'nwDoorL 2.6s cubic-bezier(.7,0,.3,1) 3s forwards',
          boxShadow: 'inset -30px 0 60px rgba(0,0,0,.6)',
        }} />
        <div style={{
          position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%',
          background: 'linear-gradient(270deg,#1a1108,#3a2a15)',
          borderLeft: '3px solid rgba(230,200,119,.6)',
          transformOrigin: 'right center',
          animation: 'nwDoorR 2.6s cubic-bezier(.7,0,.3,1) 3s forwards',
          boxShadow: 'inset 30px 0 60px rgba(0,0,0,.6)',
        }} />

        {/* Feux d'artifice OR/IVOIRE — 14 fusées + 18 rayons chacune */}
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

        {/* Cadre présidentiel double filet or + 4 losanges 20×20 aux coins */}
        <div style={{
          position: 'absolute', inset: 28,
          border: '3px solid rgba(230,200,119,.92)',
          boxShadow: 'inset 0 0 80px rgba(0,0,0,.4)',
          pointerEvents: 'none', zIndex: 5,
        }} />
        <div style={{
          position: 'absolute', inset: 40,
          border: '1px solid rgba(230,200,119,.5)',
          pointerEvents: 'none', zIndex: 5,
        }} />
        <div style={{ ...cornerBase, top: 56, left: 56 }} />
        <div style={{ ...cornerBase, top: 56, right: 56 }} />
        <div style={{ ...cornerBase, bottom: 56, left: 56 }} />
        <div style={{ ...cornerBase, bottom: 56, right: 56 }} />

        {/* Countdown 3-2-1 — Anton 520px or plat, timings 0s/1s/2s */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 6, pointerEvents: 'none',
        }}>
          <div style={{ ...countBase, animation: 'nwCountPop 1.6s ease-in 0s 1 both' }}>3</div>
          <div style={{ ...countBase, animation: 'nwCountPop 1.6s ease-in 1s 1 both' }}>2</div>
          <div style={{ ...countBase, animation: 'nwCountPop 1.6s ease-in 2s 1 both' }}>1</div>
        </div>

        {/* Titre révélé à 3.6s — or PLAT uniquement (aucun gradient text) */}
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
            color: '#E6C877',
            marginBottom: 12,
          }}>C'EST PARTI</div>
          <div style={{
            fontFamily: "'Anton',sans-serif", fontSize: 320, lineHeight: .9,
            textTransform: 'uppercase',
            color: '#E6C877',
          }}>OUVERTURE</div>
          <div style={{
            fontFamily: "'Great Vibes',cursive", fontSize: 260, lineHeight: .78,
            color: '#EECF80',
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
