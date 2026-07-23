import { useMemo } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * BienvenueSlide V2 — Mot de bienvenue cinématique.
 * Lustre suspendu qui oscille (nwChand 7s), halo qui respire (nwHalo 6s),
 * 22 particules or montantes (nwRise) + 8 twinkles.
 * Titre "Bienvenue" en Great Vibes 300px (nwGreatIn 1.4s + nwScript 6s).
 * Bandeau speaker en bas (photo ou initiale médaillon bordeaux).
 */
export default function BienvenueSlide({ state }) {
  const welcomeText = state?.welcome_text
    ?? "C'est un honneur de vous recevoir en cette soirée de prestige. Que cette nuit soit à la hauteur de votre élégance."
  const speaker = state?.speaker ?? null
  const hasSpeaker = !!speaker
  const speakerName = speaker?.name ?? ''
  const speakerRole = speaker?.role ?? ''
  const speakerPhoto = speaker?.photo ?? ''
  const speakerInitial = speakerPhoto
    ? ''
    : ((speakerName || '?').charAt(0).toUpperCase())

  // 22 particules or montantes (identique au source .dc.html)
  const particles = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    return Array.from({ length: 22 }, (_, i) => {
      const size = 2 + rnd(i * 1.3) * 3.5
      const left = rnd(i * 2.1) * 100
      const dur = 10 + rnd(i * 3.7) * 9
      const delay = -rnd(i * 5.2) * dur
      const y = 200 + rnd(i * 1.9) * 820
      return { size, left, dur, delay, y }
    })
  }, [])

  // 8 twinkles (étoiles ✦ scintillantes)
  const twinkles = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    return Array.from({ length: 8 }, (_, i) => {
      const left = rnd(i * 2.7) * 90 + 5
      const top = rnd(i * 3.9) * 70 + 8
      const size = 14 + rnd(i * 1.5) * 18
      const dur = 2.5 + rnd(i * 4) * 2
      const delay = (-rnd(i * 3) * dur).toFixed(2)
      return { left, top, size, dur, delay }
    })
  }, [])

  const cornerBase = {
    position: 'absolute', width: 14, height: 14,
    background: '#E6C877', transform: 'rotate(45deg)',
    boxShadow: '0 0 8px rgba(214,178,95,.6)',
  }

  const avatarStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 64, height: 64, borderRadius: '50%',
    background: speakerPhoto
      ? `url("${speakerPhoto}") center/cover`
      : 'linear-gradient(135deg,#8B1A2F,#5f1720)',
    border: '2px solid rgba(214,178,95,.8)',
    fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 28,
    color: '#F5E6C8',
  }

  return (
    <Stage>
      <style>{`
        @keyframes nwRise { 0%{transform:translateY(20px);opacity:0} 12%{opacity:.85} 88%{opacity:.85} 100%{transform:translateY(-1080px);opacity:0} }
        @keyframes nwHalo { 0%,100%{opacity:.4; transform:translate(-50%,-50%) scale(1)} 50%{opacity:.72; transform:translate(-50%,-50%) scale(1.08)} }
        @keyframes nwChand { 0%,100%{transform:translateX(-50%) rotate(-1.4deg)} 50%{transform:translateX(-50%) rotate(1.4deg)} }
        @keyframes nwGreatIn { 0%{opacity:0; transform:translateY(24px) scale(.96)} 100%{opacity:1; transform:translateY(0) scale(1)} }
        @keyframes nwScript { 0%,100%{text-shadow:0 0 60px rgba(201,169,97,.4),0 3px 10px rgba(0,0,0,.6)} 50%{text-shadow:0 0 110px rgba(201,169,97,.65),0 3px 10px rgba(0,0,0,.6)} }
        @keyframes nwTwinkle { 0%,100%{opacity:.3} 50%{opacity:1} }
      `}</style>
      <div style={{
        position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
        background: '#0A0A0A', color: '#F5E6C8', fontFamily: "'Cormorant Garamond',serif",
      }}>
        {/* Fond radial chaud */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 100% at 50% 26%, #211a10 0%, #0d0a06 56%, #060402 100%)',
        }} />

        {/* Lustre suspendu qui oscille */}
        <div style={{
          position: 'absolute', top: -30, left: '50%',
          transformOrigin: 'top center',
          animation: 'nwChand 7s ease-in-out infinite',
        }}>
          <svg width="220" height="260" viewBox="0 0 220 260">
            <line x1="110" y1="0" x2="110" y2="60" stroke="rgba(214,178,95,.6)" strokeWidth="2"/>
            <ellipse cx="110" cy="90" rx="90" ry="26" fill="none" stroke="rgba(214,178,95,.55)" strokeWidth="2"/>
            <ellipse cx="110" cy="130" rx="62" ry="18" fill="none" stroke="rgba(214,178,95,.45)" strokeWidth="2"/>
            <g fill="#E6C877">
              <circle cx="30" cy="96" r="4"/>
              <circle cx="60" cy="104" r="4"/>
              <circle cx="110" cy="108" r="5"/>
              <circle cx="160" cy="104" r="4"/>
              <circle cx="190" cy="96" r="4"/>
              <circle cx="66" cy="140" r="4"/>
              <circle cx="110" cy="146" r="5"/>
              <circle cx="154" cy="140" r="4"/>
            </g>
            <g stroke="rgba(214,178,95,.5)" strokeWidth="1.6" fill="none">
              <path d="M30 96 Q22 130 34 150"/>
              <path d="M190 96 Q198 130 186 150"/>
            </g>
          </svg>
        </div>

        {/* Halo qui respire */}
        <div style={{
          position: 'absolute', top: '52%', left: '50%',
          width: 1000, height: 600,
          background: 'radial-gradient(closest-side, rgba(230,200,119,.16), transparent)',
          animation: 'nwHalo 6s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* 22 particules or montantes */}
        {particles.map((p, i) => (
          <div key={`p-${i}`} style={{
            position: 'absolute',
            left: `${p.left}%`, top: p.y,
            width: p.size, height: p.size, borderRadius: '50%',
            background: 'radial-gradient(circle,#FFE9A8,rgba(201,169,97,.12))',
            boxShadow: `0 0 ${p.size * 3}px rgba(230,200,119,.65)`,
            animation: `nwRise ${p.dur}s linear infinite`,
            animationDelay: `${p.delay}s`,
            pointerEvents: 'none',
          }} />
        ))}

        {/* 8 twinkles ✦ */}
        {twinkles.map((t, i) => (
          <div key={`t-${i}`} style={{
            position: 'absolute',
            left: `${t.left}%`, top: `${t.top}%`,
            fontFamily: "'Cinzel',serif",
            fontSize: t.size,
            color: 'rgba(230,200,119,.55)',
            animation: `nwTwinkle ${t.dur}s ease-in-out infinite`,
            animationDelay: `${t.delay}s`,
            pointerEvents: 'none',
          }}>✦</div>
        ))}

        {/* Double cadre or */}
        <div style={{
          position: 'absolute', inset: 22,
          border: '2px solid rgba(214,178,95,.9)',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,.3)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: 30,
          border: '1px solid rgba(214,178,95,.5)',
          pointerEvents: 'none',
        }} />

        {/* Losanges aux coins */}
        <div style={{ ...cornerBase, top: 44, left: 44 }} />
        <div style={{ ...cornerBase, top: 44, right: 44 }} />
        <div style={{ ...cornerBase, bottom: 44, left: 44 }} />
        <div style={{ ...cornerBase, bottom: 44, right: 44 }} />

        {/* Bloc central */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '0 120px',
        }}>
          {/* Titre "Bienvenue" */}
          <div style={{
            fontFamily: "'Great Vibes',cursive",
            fontSize: 300, lineHeight: .86,
            color: '#EECF80',
            margin: '0 0 6px',
            animation: 'nwGreatIn 1.4s cubic-bezier(.16,1,.3,1) both, nwScript 6s ease-in-out 1.4s infinite',
          }}>Bienvenue</div>

          {/* Séparateur or */}
          <div style={{
            width: 460, height: 2,
            background: 'linear-gradient(90deg,transparent,#C9A961,transparent)',
            marginBottom: 30,
          }} />

          {/* Message d'accueil */}
          <div style={{
            fontFamily: "'Playfair Display',serif",
            fontStyle: 'italic',
            fontSize: 46, lineHeight: 1.5,
            color: '#F5E6C8',
            maxWidth: 1200,
          }}>{welcomeText}</div>

          {/* Bandeau speaker */}
          {hasSpeaker && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 20,
              marginTop: 44, padding: '14px 30px',
              border: '1px solid rgba(214,178,95,.6)',
              borderRadius: 999,
              background: 'linear-gradient(180deg, rgba(33,26,16,.6), rgba(13,10,6,.6))',
            }}>
              <div style={avatarStyle}>{speakerInitial}</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{
                  fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 24,
                  color: '#F5E6C8', letterSpacing: '.06em',
                }}>{speakerName}</div>
                <div style={{
                  fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic',
                  fontSize: 20, color: '#C9A961',
                }}>{speakerRole}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Stage>
  )
}
