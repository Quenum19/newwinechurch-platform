import { useMemo } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * RappeursSlide V2 — « SUR SCÈNE MAINTENANT » (prestation rappeur).
 * Fond radial rouge + halo pulsé + spot sweep + cadre or double filet + losanges.
 * Bloc central : micro SVG or, sur-titre Cinzel, nom artiste (Anton, taille dynamique),
 * waveform 32 barres animées avec durées/délais pseudo-aléatoires (rnd déterministe).
 */
export default function RappeursSlide({ state }) {
  const artiste = (state?.config?.artiste ?? 'KIM B').toString()

  const nameSize = useMemo(() => {
    const len = artiste.length
    return len > 18 ? '150px' : len > 12 ? '200px' : '260px'
  }, [artiste])

  const bars = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    return Array.from({ length: 32 }, (_, i) => {
      const dur = (0.6 + rnd(i * 2.3) * 0.9).toFixed(2)
      const delay = (-rnd(i * 5) * 1).toFixed(2)
      return { dur, delay }
    })
  }, [])

  const cornerBase = {
    position: 'absolute',
    width: 14, height: 14,
    background: '#E6C877',
    transform: 'rotate(45deg)',
    boxShadow: '0 0 8px rgba(214,178,95,.6)',
  }

  return (
    <Stage>
      <style>{`
        @keyframes nwSpotSweep { 0%{transform:translateX(-42vw) rotate(-15deg)} 100%{transform:translateX(42vw) rotate(15deg)} }
        @keyframes nwHaloPulse { 0%,100%{opacity:.4; transform:translate(-50%,-50%) scale(1)} 50%{opacity:.8; transform:translate(-50%,-50%) scale(1.12)} }
        @keyframes nwLetterIn { 0%{opacity:0; transform:translateY(40px) rotateX(40deg)} 100%{opacity:1; transform:translateY(0) rotateX(0)} }
        @keyframes nwGlowP { 0%,100%{text-shadow:0 0 60px rgba(201,169,97,.4),0 2px 4px rgba(0,0,0,.7)} 50%{text-shadow:0 0 120px rgba(201,169,97,.7),0 2px 4px rgba(0,0,0,.7)} }
        @keyframes nwWave { 0%,100%{height:20%} 50%{height:100%} }
      `}</style>
      <div style={{
        position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
        background: '#0A0A0A', color: '#F5E6C8', fontFamily: "'Cormorant Garamond',serif",
      }}>
        {/* Fond radial rouge sombre */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 100% at 50% 40%, #2a0f14 0%, #12080a 58%, #060402 100%)',
        }} />
        {/* Halo pulsé */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 900, height: 900, borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(139,26,47,.4), transparent 70%)',
          animation: 'nwHaloPulse 3s ease-in-out infinite',
        }} />
        {/* Spot sweep */}
        <div style={{
          position: 'absolute', top: '-30%', left: '50%',
          width: 340, height: '160%',
          background: 'linear-gradient(180deg, rgba(230,200,119,.2), transparent 72%)',
          filter: 'blur(8px)',
          transformOrigin: 'top center',
          animation: 'nwSpotSweep 5s ease-in-out infinite alternate',
        }} />

        {/* Cadre double filet or */}
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
        {/* Losanges des 4 coins */}
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
          {/* Micro SVG or */}
          <svg width="70" height="150" viewBox="0 0 70 150" style={{ marginBottom: 6 }}>
            <defs>
              <linearGradient id="rappeurMg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#FFF6D8" />
                <stop offset=".5" stopColor="#E6C877" />
                <stop offset="1" stopColor="#7E662E" />
              </linearGradient>
            </defs>
            <rect x="26" y="86" width="18" height="46" rx="4" fill="url(#rappeurMg)" />
            <rect x="14" y="126" width="42" height="8" rx="4" fill="url(#rappeurMg)" />
            <rect x="18" y="6" width="34" height="86" rx="17" fill="url(#rappeurMg)" stroke="#7E662E" strokeWidth="1.5" />
            <g stroke="#7E662E" strokeWidth="1.2" opacity=".5">
              <line x1="22" y1="24" x2="48" y2="24" />
              <line x1="22" y1="38" x2="48" y2="38" />
              <line x1="22" y1="52" x2="48" y2="52" />
              <line x1="22" y1="66" x2="48" y2="66" />
            </g>
          </svg>

          <div style={{
            fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 36,
            letterSpacing: '.5em', textIndent: '.5em',
            color: '#E6C877', textShadow: '0 2px 10px rgba(0,0,0,.8)',
          }}>SUR SCÈNE MAINTENANT</div>

          <div style={{
            fontFamily: "'Anton',sans-serif", fontSize: nameSize, lineHeight: .9,
            textTransform: 'uppercase', letterSpacing: '.02em',
            background: 'linear-gradient(180deg,#FFF6D8,#E6C877 50%,#B08A3F)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'nwLetterIn 1s cubic-bezier(.16,1,.3,1) both, nwGlowP 4s ease-in-out 1s infinite',
            maxWidth: 1600,
          }}>{artiste}</div>

          {/* Waveform 32 barres */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, height: 80, marginTop: 34 }}>
            {bars.map((b, i) => (
              <div key={i} style={{
                width: 10,
                height: '40%',
                borderRadius: 6,
                background: 'linear-gradient(180deg,#FFE9A8,#C9A961 60%,#8B1A2F)',
                boxShadow: '0 0 8px rgba(230,200,119,.5)',
                animation: `nwWave ${b.dur}s ease-in-out infinite`,
                animationDelay: `${b.delay}s`,
              }} />
            ))}
          </div>
        </div>
      </div>
    </Stage>
  )
}
