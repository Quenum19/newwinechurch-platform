import { useMemo } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * DefileSlide V2 — "Défilé".
 * Podium 3D en perspective (rotateX 64deg) + tapis rouge grenat, 3 mannequins
 * silhouettes qui défilent (nwWalkLady), 4 projecteurs qui balaient depuis le
 * haut, 8 twinkles ✦, cadre présidentiel + losanges, titre "Défilé" Anton
 * 220px avec glow qui respire, sous-titre Cinzel espacé.
 */
export default function DefileSlide({ state }) {
  const st = state ?? {}
  const subtitle = st.subtitle ?? "Le tapis rouge est à vous"

  const ladies = useMemo(() => (
    Array.from({ length: 3 }, (_, i) => {
      const dur = 8 + i * 1.4
      const delay = (-i * 2.7).toFixed(2)
      return { dur, delay }
    })
  ), [])

  const twinkles = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    return Array.from({ length: 8 }, (_, i) => {
      const left = rnd(i * 2.7) * 84 + 8
      const top = rnd(i * 3.9) * 40 + 8
      const size = 16 + rnd(i * 1.5) * 20
      const dur = 2.5 + rnd(i * 4) * 2
      const delay = (-rnd(i * 3) * dur).toFixed(2)
      return { left, top, size, dur, delay }
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
        @keyframes nwBeamA { 0%,100%{transform:rotate(-16deg); opacity:.4} 50%{transform:rotate(6deg); opacity:.8} }
        @keyframes nwBeamB { 0%,100%{transform:rotate(14deg); opacity:.35} 50%{transform:rotate(-8deg); opacity:.7} }
        @keyframes nwWalkLady { 0%{transform:translateX(-560px) scale(.62); opacity:0} 12%{opacity:.9} 84%{opacity:.9} 100%{transform:translateX(560px) scale(1.28); opacity:0} }
        @keyframes nwGown { 0%,100%{transform:rotate(-1.5deg)} 50%{transform:rotate(1.5deg)} }
        @keyframes nwGlowP { 0%,100%{text-shadow:0 0 70px rgba(201,169,97,.4),0 3px 6px rgba(0,0,0,.75)} 50%{text-shadow:0 0 140px rgba(201,169,97,.7),0 3px 6px rgba(0,0,0,.75)} }
        @keyframes nwTwinkle { 0%,100%{opacity:.3} 50%{opacity:1} }
      `}</style>
      <div style={{
        position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
        background: '#0A0A0A', color: '#F5E6C8', fontFamily: "'Cormorant Garamond',serif",
      }}>
        {/* Fond radial nuit chaude */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 100% at 50% 6%, #1a0f10 0%, #0d0a06 56%, #060402 100%)',
        }} />

        {/* SCENE + tapis rouge en perspective */}
        <div style={{ position: 'absolute', inset: 0, perspective: 1200, overflow: 'hidden' }}>
          {/* Tapis rouge / podium */}
          <div style={{
            position: 'absolute', left: '50%', bottom: 0,
            width: 760, height: 820,
            transform: 'translateX(-50%) rotateX(64deg)',
            transformOrigin: 'bottom center',
            background: 'linear-gradient(180deg, #5f1720 0%, #8B1A2F 55%, #b0263f 100%)',
            boxShadow: '0 0 160px rgba(139,26,47,.7)',
            borderLeft: '4px solid rgba(230,200,119,.55)',
            borderRight: '4px solid rgba(230,200,119,.55)',
          }} />

          {/* Mannequins qui défilent */}
          <div style={{
            position: 'absolute', left: '50%', bottom: 120,
            transformStyle: 'preserve-3d',
          }}>
            {ladies.map((l, i) => (
              <div key={i} style={{
                position: 'absolute', left: -75, bottom: 0,
                filter: 'drop-shadow(0 0 40px rgba(0,0,0,.7))',
                animation: `nwWalkLady ${l.dur}s ease-in-out infinite`,
                animationDelay: `${l.delay}s`,
              }}>
                <svg width="150" height="360" viewBox="0 0 150 360" style={{ animation: 'nwGown 3.6s ease-in-out infinite' }}>
                  <circle cx="75" cy="42" r="26" fill="#050303" />
                  <path d="M75 66 L96 120 L86 150 L92 340 Q75 356 58 340 L64 150 L54 120 Z" fill="#050303" />
                  <path d="M92 340 Q75 300 58 340 L52 356 L98 356 Z" fill="#050303" />
                </svg>
              </div>
            ))}
          </div>
        </div>

        {/* Projecteurs — 4 faisceaux depuis le haut */}
        <div style={{
          position: 'absolute', top: '-16%', left: '50%',
          width: 260, height: '150%',
          transformOrigin: 'top center',
          background: 'linear-gradient(180deg, rgba(230,200,119,.24), transparent 74%)',
          filter: 'blur(5px)',
          animation: 'nwBeamA 6s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', top: '-16%', left: '32%',
          width: 180, height: '150%',
          transformOrigin: 'top center',
          background: 'linear-gradient(180deg, rgba(230,200,119,.16), transparent 74%)',
          filter: 'blur(7px)',
          animation: 'nwBeamB 7s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', top: '-16%', right: '32%',
          width: 180, height: '150%',
          transformOrigin: 'top center',
          background: 'linear-gradient(180deg, rgba(230,200,119,.16), transparent 74%)',
          filter: 'blur(7px)',
          animation: 'nwBeamA 8s ease-in-out infinite',
        }} />
        {/* Vignette centrale */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(62% 62% at 50% 40%, transparent 42%, rgba(0,0,0,.6) 100%)',
        }} />

        {/* Twinkles ✦ */}
        {twinkles.map((t, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${t.left}%`, top: `${t.top}%`,
            fontFamily: "'Cinzel',serif",
            fontSize: t.size,
            color: 'rgba(230,200,119,.5)',
            animation: `nwTwinkle ${t.dur}s ease-in-out infinite`,
            animationDelay: `${t.delay}s`,
            pointerEvents: 'none',
          }}>✦</div>
        ))}

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
        {/* 4 losanges */}
        <div style={{ ...cornerBase, top: 56, left: 56 }} />
        <div style={{ ...cornerBase, top: 56, right: 56 }} />
        <div style={{ ...cornerBase, bottom: 56, left: 56 }} />
        <div style={{ ...cornerBase, bottom: 56, right: 56 }} />

        {/* Bloc titre */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 150,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', textAlign: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: "'Playfair Display',serif", fontStyle: 'italic',
            fontSize: 46, color: '#F5E6C8',
            textShadow: '0 2px 12px rgba(0,0,0,.9)',
          }}>Place à l'élégance</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 50, marginTop: 6 }}>
            <span style={{
              fontFamily: "'Cinzel',serif", fontSize: 80, color: '#E6C877',
              animation: 'nwTwinkle 3s ease-in-out infinite',
            }}>★</span>
            <span style={{
              fontFamily: "'Anton',sans-serif", fontSize: 220,
              letterSpacing: '.05em', textTransform: 'uppercase',
              background: 'linear-gradient(180deg,#FFF6D8,#E6C877 50%,#8a6d2f)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'nwGlowP 5s ease-in-out infinite',
            }}>Défilé</span>
            <span style={{
              fontFamily: "'Cinzel',serif", fontSize: 80, color: '#E6C877',
              animation: 'nwTwinkle 3s ease-in-out infinite 1.5s',
            }}>★</span>
          </div>

          <div style={{
            fontFamily: "'Cinzel',serif", fontWeight: 500, fontSize: 34,
            letterSpacing: '.4em', textIndent: '.4em',
            color: '#E6C877', marginTop: 14,
            textShadow: '0 2px 10px rgba(0,0,0,.9)',
          }}>{subtitle}</div>
        </div>
      </div>
    </Stage>
  )
}
