import { useMemo } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * ProgrammeSlide V2 — Déroulé de la soirée.
 * Fond radial cuivré + 14 particules or montantes.
 * Cadre présidentiel double filet + losanges aux coins.
 * Sur-titre Cinzel "DÉROULÉ DE LA SOIRÉE" + titre Anton 130px "Programme" (gradient or, glow qui respire).
 * Séparateur ◆ + grille 2 colonnes des lignes horaires (Cinzel 36px or / Playfair 38px ivoire).
 * Signature state : state.config.program = [{ time, label }, ...]
 */
const DEFAULT_PROGRAM = [
  { time: '18h00', label: 'Accueil' },
  { time: '19h00', label: 'Dîner' },
  { time: '21h00', label: 'Défilé' },
  { time: '22h00', label: 'Vote Roi & Reine' },
  { time: '23h00', label: 'Proclamation des résultats' },
  { time: '00h00', label: 'Ouverture officielle du bal' },
]

export default function ProgrammeSlide({ state }) {
  const cfg = state?.config ?? {}
  const program = useMemo(() => {
    const src = cfg.program ?? DEFAULT_PROGRAM
    return src
      .map((p) => (Array.isArray(p) ? { time: p[0], label: p[1] } : p))
      .slice(0, 12)
  }, [cfg.program])

  const particles = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    return Array.from({ length: 14 }, (_, i) => {
      const size = 2 + rnd(i * 1.3) * 3
      const left = rnd(i * 2.1) * 100
      const dur = 12 + rnd(i * 3.7) * 8
      const delay = -rnd(i * 5.2) * dur
      const startY = 300 + rnd(i * 1.9) * 600
      return { size, left, dur, delay, startY }
    })
  }, [])

  const cornerBase = {
    position: 'absolute', width: 14, height: 14,
    background: '#E6C877', transform: 'rotate(45deg)',
    boxShadow: '0 0 8px rgba(214,178,95,.6)',
  }

  return (
    <Stage>
      <style>{`
        @keyframes nwRise { 0%{transform:translateY(20px);opacity:0} 12%{opacity:.85} 88%{opacity:.85} 100%{transform:translateY(-1080px);opacity:0} }
        @keyframes nwRowIn { 0%{transform:translateX(-24px);opacity:0} 100%{transform:translateX(0);opacity:1} }
        @keyframes nwGlowP { 0%,100%{text-shadow:0 0 50px rgba(201,169,97,.35),0 2px 4px rgba(0,0,0,.6)} 50%{text-shadow:0 0 90px rgba(201,169,97,.55),0 2px 4px rgba(0,0,0,.6)} }
        @keyframes nwActive { 0%,100%{box-shadow:inset 3px 0 0 #E6C877, 0 0 22px rgba(230,200,119,.28); background:rgba(120,26,38,.34)} 50%{box-shadow:inset 3px 0 0 #FFE9A8, 0 0 40px rgba(230,200,119,.5); background:rgba(120,26,38,.46)} }
        @keyframes nwTwinkle { 0%,100%{opacity:.3} 50%{opacity:1} }
      `}</style>
      <div style={{
        position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
        background: '#0A0A0A', color: '#F5E6C8', fontFamily: "'Cormorant Garamond',serif",
      }}>
        {/* Fond radial cuivré */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 100% at 50% 20%, #211a10 0%, #0d0a06 56%, #060402 100%)',
        }} />

        {/* Particules or montantes */}
        {particles.map((p, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${p.left}%`, top: p.startY,
            width: p.size, height: p.size, borderRadius: '50%',
            background: 'radial-gradient(circle,#FFE9A8,rgba(201,169,97,.1))',
            boxShadow: `0 0 ${p.size * 3}px rgba(230,200,119,.5)`,
            animation: `nwRise ${p.dur}s linear infinite`,
            animationDelay: `${p.delay}s`,
            pointerEvents: 'none',
          }} />
        ))}

        {/* Cadre présidentiel */}
        <div style={{
          position: 'absolute', inset: 22,
          border: '2px solid rgba(214,178,95,.9)',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,.3)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: 30,
          border: '1px solid rgba(214,178,95,.5)', pointerEvents: 'none',
        }} />
        <div style={{ ...cornerBase, top: 44, left: 44 }} />
        <div style={{ ...cornerBase, top: 44, right: 44 }} />
        <div style={{ ...cornerBase, bottom: 44, left: 44 }} />
        <div style={{ ...cornerBase, bottom: 44, right: 44 }} />

        {/* Bloc central */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', padding: '70px 120px',
        }}>
          <div style={{
            fontFamily: "'Cinzel',serif", fontWeight: 500, fontSize: 32,
            letterSpacing: '.5em', textIndent: '.5em',
            color: '#C9A961',
          }}>DÉROULÉ DE LA SOIRÉE</div>

          <div style={{
            fontFamily: "'Anton',sans-serif", fontSize: 130, lineHeight: .95,
            textTransform: 'uppercase', letterSpacing: '.02em',
            background: 'linear-gradient(180deg,#FFF6D8,#E6C877 52%,#8a6d2f)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'nwGlowP 6s ease-in-out infinite',
          }}>Programme</div>

          {/* Séparateur ◆ */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 22,
            margin: '16px 0 40px',
          }}>
            <span style={{ width: 90, height: 2, background: 'rgba(214,178,95,.7)' }} />
            <span style={{
              fontFamily: "'Cinzel',serif", fontSize: 30, color: '#C9A961',
            }}>◆</span>
            <span style={{ width: 90, height: 2, background: 'rgba(214,178,95,.7)' }} />
          </div>

          {/* Grille programme 2 colonnes */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '10px 80px', width: '100%',
          }}>
            {program.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 28,
                padding: '14px 20px', borderRadius: 5,
                borderBottom: '1px solid rgba(214,178,95,.16)',
                animation: `nwRowIn .6s ease ${(0.4 + i * 0.05).toFixed(2)}s both`,
              }}>
                <div style={{
                  fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 36,
                  color: '#C9A961', letterSpacing: '.04em', minWidth: 200,
                }}>{r.time}</div>
                <div style={{
                  fontFamily: "'Playfair Display',serif", fontSize: 38,
                  color: '#F5E6C8', flex: 1,
                }}>{r.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Stage>
  )
}
