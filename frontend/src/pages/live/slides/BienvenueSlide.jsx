import { useMemo } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * BienvenueSlide V3 — refonte LED-safe.
 * Charte alignée sur MurStarsSlide (seul slide qui rend impeccable sur l'écran
 * LED de la salle) : fond radial ambré identique, palette or/ivoire uniquement,
 * AUCUNE teinte bordeaux/rouge (elles cramaient en magenta), tailles minimums
 * respectées (titre Great Vibes 300px, message Playfair 50px, nom speaker
 * Cinzel 62px, rôle Playfair 44px), cadre présidentiel double filet + 4
 * losanges or 20×20 aux coins.
 *
 * Slots :
 *  - state.welcome_text  → message d'accueil (défaut "Merci d'être avec nous")
 *  - state.speaker       → { name, role, photo? } — médaillon rond 200×200
 *                          bordure or + halo pulsant (nwSpeakerHalo 5s). Sans
 *                          photo : initiale en Great Vibes 120px sur médaillon
 *                          gradient or vif (jamais bordeaux).
 *
 * Animations (préfixe `nw` pour éviter collision globale) :
 *  nwRise, nwHalo, nwChand, nwGreatIn, nwScript, nwTwinkle, nwSpeakerHalo,
 *  nwFadeUp.
 */
export default function BienvenueSlide({ state }) {
  const welcomeText = state?.welcome_text ?? "Merci d'être avec nous"
  const speaker = state?.speaker ?? null
  const hasSpeaker = !!speaker
  const speakerName = speaker?.name ?? ''
  const speakerRole = speaker?.role ?? ''
  const speakerPhoto = speaker?.photo ?? ''
  const speakerInitial = speakerPhoto
    ? ''
    : ((speakerName || '?').charAt(0).toUpperCase())

  // 22 particules or montantes — identiques à MurStars
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

  // 14 étincelles ✦ — taille min 22px pour rester visibles sur LED
  const twinkles = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    return Array.from({ length: 14 }, (_, i) => {
      const left = rnd(i * 2.7) * 90 + 5
      const top = rnd(i * 3.9) * 78 + 6
      const size = 22 + rnd(i * 1.5) * 34   // 22–56px
      const dur = 2.4 + rnd(i * 4) * 2.2
      const delay = (-rnd(i * 3) * dur).toFixed(2)
      return { left, top, size, dur, delay }
    })
  }, [])

  // Losanges 20×20 or vif — identiques MurStars
  const cornerBase = {
    position: 'absolute', width: 20, height: 20,
    background: '#E6C877', transform: 'rotate(45deg)',
    boxShadow: '0 0 12px rgba(214,178,95,.7)',
  }

  // Médaillon speaker rond 200×200 or vif (jamais bordeaux)
  const avatarSize = 200
  const avatarStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: avatarSize, height: avatarSize, borderRadius: '50%',
    background: speakerPhoto
      ? `url("${speakerPhoto}") center/cover`
      : 'linear-gradient(180deg,#FFF6D8 0%,#FFE9A8 32%,#E6C877 60%,#C9A961 100%)',
    border: '4px solid #E6C877',
    fontFamily: "'Great Vibes',cursive",
    fontSize: 120, lineHeight: 1,
    color: '#0d0a06',
    animation: 'nwSpeakerHalo 5s ease-in-out infinite',
    flexShrink: 0,
    overflow: 'hidden',
  }

  return (
    <Stage>
      <style>{`
        @keyframes nwRise { 0%{transform:translateY(20px);opacity:0} 12%{opacity:.9} 88%{opacity:.9} 100%{transform:translateY(-1080px);opacity:0} }
        @keyframes nwHalo { 0%,100%{opacity:.42; transform:translate(-50%,-50%) scale(1)} 50%{opacity:.75; transform:translate(-50%,-50%) scale(1.08)} }
        @keyframes nwChand { 0%,100%{transform:translateX(-50%) rotate(-1.4deg)} 50%{transform:translateX(-50%) rotate(1.4deg)} }
        @keyframes nwGreatIn { 0%{opacity:0; transform:translateY(24px) scale(.96)} 100%{opacity:1; transform:translateY(0) scale(1)} }
        @keyframes nwScript { 0%,100%{text-shadow:0 0 70px rgba(230,200,119,.45),0 3px 10px rgba(0,0,0,.7); filter:brightness(.98)} 50%{text-shadow:0 0 140px rgba(230,200,119,.8),0 3px 10px rgba(0,0,0,.7); filter:brightness(1.08)} }
        @keyframes nwTwinkle { 0%,100%{opacity:.25; transform:scale(.85) rotate(-10deg)} 50%{opacity:1; transform:scale(1.2) rotate(10deg)} }
        @keyframes nwSpeakerHalo { 0%,100%{box-shadow:0 0 50px rgba(230,200,119,.55), inset 0 0 30px rgba(0,0,0,.28)} 50%{box-shadow:0 0 95px rgba(230,200,119,.9), inset 0 0 30px rgba(0,0,0,.28)} }
        @keyframes nwFadeUp { 0%{opacity:0; transform:translateY(24px)} 100%{opacity:1; transform:translateY(0)} }
      `}</style>
      <div style={{
        position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
        background: '#0A0A0A', color: '#F5E6C8', fontFamily: "'Cormorant Garamond',serif",
      }}>
        {/* Fond radial LED-safe — identique MurStarsSlide */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 100% at 50% 40%, #211a10 0%, #0d0a06 56%, #060402 100%)',
        }} />

        {/* Lustre suspendu qui oscille (or uniquement) */}
        <div style={{
          position: 'absolute', top: -30, left: '50%',
          transformOrigin: 'top center',
          animation: 'nwChand 7s ease-in-out infinite',
        }}>
          <svg width="240" height="270" viewBox="0 0 220 260">
            <line x1="110" y1="0" x2="110" y2="60" stroke="rgba(230,200,119,.7)" strokeWidth="2"/>
            <ellipse cx="110" cy="90" rx="92" ry="26" fill="none" stroke="rgba(230,200,119,.65)" strokeWidth="2"/>
            <ellipse cx="110" cy="130" rx="62" ry="18" fill="none" stroke="rgba(230,200,119,.55)" strokeWidth="2"/>
            <g fill="#E6C877">
              <circle cx="30" cy="96" r="5"/>
              <circle cx="60" cy="104" r="5"/>
              <circle cx="110" cy="108" r="6"/>
              <circle cx="160" cy="104" r="5"/>
              <circle cx="190" cy="96" r="5"/>
              <circle cx="66" cy="140" r="5"/>
              <circle cx="110" cy="146" r="6"/>
              <circle cx="154" cy="140" r="5"/>
            </g>
            <g stroke="rgba(230,200,119,.6)" strokeWidth="1.6" fill="none">
              <path d="M30 96 Q22 130 34 150"/>
              <path d="M190 96 Q198 130 186 150"/>
            </g>
          </svg>
        </div>

        {/* Halo doré qui respire */}
        <div style={{
          position: 'absolute', top: '52%', left: '50%',
          width: 1100, height: 640,
          background: 'radial-gradient(closest-side, rgba(230,200,119,.18), transparent)',
          animation: 'nwHalo 6s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* 22 particules or montantes */}
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

        {/* 14 étincelles ✦ scintillantes (min 22px pour LED) */}
        {twinkles.map((t, i) => (
          <div key={`t-${i}`} style={{
            position: 'absolute',
            left: `${t.left}%`, top: `${t.top}%`,
            fontFamily: "'Cinzel',serif",
            fontSize: t.size,
            color: 'rgba(230,200,119,.65)',
            textShadow: '0 0 18px rgba(214,178,95,.6)',
            animation: `nwTwinkle ${t.dur}s ease-in-out infinite`,
            animationDelay: `${t.delay}s`,
            pointerEvents: 'none',
          }}>✦</div>
        ))}

        {/* Cadre présidentiel — grille MurStars (28 / 40 / 56) */}
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
          textAlign: 'center', padding: '0 120px',
        }}>
          {/* Titre "Bienvenue" — Great Vibes 300px, or highlight, halo pulsant */}
          <div style={{
            fontFamily: "'Great Vibes',cursive",
            fontSize: 300, lineHeight: .86,
            color: '#EECF80',
            margin: '0 0 12px',
            animation: 'nwGreatIn 1.4s cubic-bezier(.16,1,.3,1) both, nwScript 6s ease-in-out 1.4s infinite',
          }}>Bienvenue</div>

          {/* Séparateur or vif — plus épais et plus lumineux pour LED */}
          <div style={{
            width: 540, height: 3,
            background: 'linear-gradient(90deg, transparent 0%, #E6C877 22%, #FFE9A8 50%, #E6C877 78%, transparent 100%)',
            boxShadow: '0 0 14px rgba(230,200,119,.55)',
            marginBottom: 36,
          }} />

          {/* Message d'accueil — Playfair italic 50px, ivoire pur */}
          <div style={{
            fontFamily: "'Playfair Display',serif",
            fontStyle: 'italic',
            fontSize: 50, lineHeight: 1.42,
            color: '#F5E6C8',
            maxWidth: 1400,
            textShadow: '0 2px 8px rgba(0,0,0,.65)',
            opacity: 0,
            animation: 'nwFadeUp 1s ease-out .8s forwards',
          }}>{welcomeText}</div>

          {/* Bandeau speaker — médaillon or 200×200 + nom Cinzel 62px + rôle Playfair 44px */}
          {hasSpeaker && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 44,
              marginTop: 66,
              padding: '22px 52px 22px 22px',
              border: '2px solid rgba(230,200,119,.85)',
              borderRadius: 140,
              background: 'linear-gradient(180deg, rgba(33,26,16,.72), rgba(13,10,6,.78))',
              boxShadow: '0 0 40px rgba(0,0,0,.45), inset 0 0 30px rgba(0,0,0,.35)',
              opacity: 0,
              animation: 'nwFadeUp 1s ease-out 1.2s forwards',
              maxWidth: 1500,
            }}>
              <div style={avatarStyle}>{speakerInitial}</div>
              <div style={{ textAlign: 'left', minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 62,
                  color: '#F5E6C8', letterSpacing: '.04em',
                  lineHeight: 1.05,
                  textShadow: '0 0 22px rgba(230,200,119,.35), 0 2px 6px rgba(0,0,0,.7)',
                }}>{speakerName}</div>
                {speakerRole && (
                  <div style={{
                    fontFamily: "'Playfair Display',serif", fontStyle: 'italic',
                    fontSize: 44, color: '#EECF80',
                    marginTop: 8,
                    textShadow: '0 2px 6px rgba(0,0,0,.6)',
                  }}>{speakerRole}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Stage>
  )
}
