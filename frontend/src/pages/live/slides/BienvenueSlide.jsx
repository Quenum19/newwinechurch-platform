import { useMemo } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * BienvenueSlide V4 — refonte LED-safe "BIG & CLEAR".
 *
 * Retour terrain : sur l'écran LED de la salle, le titre 300px était trop
 * petit, le fond #0A0A0A virait vert-noir avec des bandes de moiré et les
 * gradients WebkitBackgroundClip:text disparaissaient. Cette version
 * applique les règles LED-safe STRICTES :
 *   1. Fond #000000 NOIR PUR (halo radial ambré très sombre par-dessus)
 *   2. Or COULEUR PLATE (#EECF80 titre, #E6C877 filets/losanges,
 *      #F5E6C8 ivoire pour messages) — AUCUN gradient dans le texte
 *   3. Aucun texte sous 60px
 *   4. Titre "Bienvenue" Great Vibes 420px (dominant, occupe le centre)
 *   5. Message Playfair italic 76px ivoire
 *   6. Speaker : nom Cinzel 88px or, rôle Playfair italic 60px ivoire.
 *      Si pas de photo : PAS de médaillon (illisible LED) — juste le nom.
 *   7. Cadre présidentiel or + 4 losanges 20×20 aux coins
 *
 * Slots :
 *  - state.welcome_text  → message d'accueil (défaut "Merci d'être avec nous")
 *  - state.speaker       → { name, role, photo? }
 *
 * Animations (préfixe `nw`) :
 *  nwRise, nwHalo, nwChand, nwGreatIn, nwScript, nwTwinkle, nwFadeUp,
 *  nwSpeakerHalo (uniquement si photo présente).
 */
export default function BienvenueSlide({ state }) {
  const welcomeText = state?.welcome_text ?? "Merci d'être avec nous"
  const speaker = state?.speaker ?? null
  const hasSpeaker = !!speaker && !!speaker?.name
  const speakerName = speaker?.name ?? ''
  const speakerRole = speaker?.role ?? ''
  const speakerPhoto = speaker?.photo ?? ''
  const hasPhoto = hasSpeaker && !!speakerPhoto

  // 14 étincelles ✦ — taille min 26px pour rester visibles sur LED
  const twinkles = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    return Array.from({ length: 14 }, (_, i) => {
      const left = rnd(i * 2.7) * 90 + 5
      const top = rnd(i * 3.9) * 78 + 6
      const size = 26 + rnd(i * 1.5) * 40   // 26–66px
      const dur = 2.4 + rnd(i * 4) * 2.2
      const delay = (-rnd(i * 3) * dur).toFixed(2)
      return { left, top, size, dur, delay }
    })
  }, [])

  // 18 particules or montantes
  const particles = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    return Array.from({ length: 18 }, (_, i) => {
      const size = 3 + rnd(i * 1.3) * 5
      const left = rnd(i * 2.1) * 100
      const dur = 10 + rnd(i * 3.7) * 10
      const delay = -rnd(i * 5.2) * dur
      const startY = 200 + rnd(i * 1.9) * 880
      return { size, left, dur, delay, startY }
    })
  }, [])

  // Losanges 20×20 or vif — pattern MurStars
  const cornerBase = {
    position: 'absolute', width: 20, height: 20,
    background: '#E6C877', transform: 'rotate(45deg)',
    boxShadow: '0 0 12px rgba(214,178,95,.7)',
  }

  // Médaillon speaker (SEULEMENT si photo présente — sinon pas de médaillon)
  const avatarSize = 240
  const avatarStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: avatarSize, height: avatarSize, borderRadius: '50%',
    background: `url("${speakerPhoto}") center/cover`,
    border: '5px solid #E6C877',
    animation: 'nwSpeakerHalo 5s ease-in-out infinite',
    flexShrink: 0,
    overflow: 'hidden',
  }

  return (
    <Stage>
      <style>{`
        @keyframes nwRise { 0%{transform:translateY(20px);opacity:0} 12%{opacity:.9} 88%{opacity:.9} 100%{transform:translateY(-1080px);opacity:0} }
        @keyframes nwHalo { 0%,100%{opacity:.4; transform:translate(-50%,-50%) scale(1)} 50%{opacity:.72; transform:translate(-50%,-50%) scale(1.08)} }
        @keyframes nwChand { 0%,100%{transform:translateX(-50%) rotate(-1.4deg)} 50%{transform:translateX(-50%) rotate(1.4deg)} }
        @keyframes nwGreatIn { 0%{opacity:0; transform:translateY(24px) scale(.96)} 100%{opacity:1; transform:translateY(0) scale(1)} }
        @keyframes nwScript { 0%,100%{text-shadow:0 0 90px rgba(230,200,119,.5),0 4px 12px rgba(0,0,0,.8); filter:brightness(1)} 50%{text-shadow:0 0 160px rgba(230,200,119,.85),0 4px 12px rgba(0,0,0,.8); filter:brightness(1.1)} }
        @keyframes nwTwinkle { 0%,100%{opacity:.28; transform:scale(.85) rotate(-10deg)} 50%{opacity:1; transform:scale(1.2) rotate(10deg)} }
        @keyframes nwSpeakerHalo { 0%,100%{box-shadow:0 0 60px rgba(230,200,119,.6), inset 0 0 30px rgba(0,0,0,.3)} 50%{box-shadow:0 0 110px rgba(230,200,119,.95), inset 0 0 30px rgba(0,0,0,.3)} }
        @keyframes nwFadeUp { 0%{opacity:0; transform:translateY(24px)} 100%{opacity:1; transform:translateY(0)} }
      `}</style>
      <div style={{
        position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
        background: '#000000', color: '#F5E6C8', fontFamily: "'Cormorant Garamond',serif",
      }}>
        {/* Halo radial ambré TRÈS sombre par-dessus le noir pur — évite le moiré vert */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 100% at 50% 40%, #211a10 0%, #060402 55%, #000000 100%)',
        }} />

        {/* Lustre suspendu qui oscille (or plat) */}
        <div style={{
          position: 'absolute', top: -30, left: '50%',
          transformOrigin: 'top center',
          animation: 'nwChand 7s ease-in-out infinite',
        }}>
          <svg width="240" height="270" viewBox="0 0 220 260">
            <line x1="110" y1="0" x2="110" y2="60" stroke="rgba(230,200,119,.75)" strokeWidth="2"/>
            <ellipse cx="110" cy="90" rx="92" ry="26" fill="none" stroke="rgba(230,200,119,.7)" strokeWidth="2"/>
            <ellipse cx="110" cy="130" rx="62" ry="18" fill="none" stroke="rgba(230,200,119,.6)" strokeWidth="2"/>
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
            <g stroke="rgba(230,200,119,.65)" strokeWidth="1.6" fill="none">
              <path d="M30 96 Q22 130 34 150"/>
              <path d="M190 96 Q198 130 186 150"/>
            </g>
          </svg>
        </div>

        {/* Halo doré qui respire — centré derrière le titre */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 1400, height: 780,
          background: 'radial-gradient(closest-side, rgba(230,200,119,.22), transparent)',
          animation: 'nwHalo 6s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* 18 particules or montantes */}
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

        {/* 14 étincelles ✦ scintillantes (min 26px pour LED) */}
        {twinkles.map((t, i) => (
          <div key={`t-${i}`} style={{
            position: 'absolute',
            left: `${t.left}%`, top: `${t.top}%`,
            fontFamily: "'Cinzel',serif",
            fontSize: t.size,
            color: '#E6C877',
            textShadow: '0 0 20px rgba(214,178,95,.7)',
            animation: `nwTwinkle ${t.dur}s ease-in-out infinite`,
            animationDelay: `${t.delay}s`,
            pointerEvents: 'none',
          }}>✦</div>
        ))}

        {/* Cadre présidentiel — double filet + 4 losanges (pattern MurStars) */}
        <div style={{
          position: 'absolute', inset: 28,
          border: '3px solid #E6C877',
          boxShadow: 'inset 0 0 80px rgba(0,0,0,.4)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: 40,
          border: '1px solid rgba(214,178,95,.55)',
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
          textAlign: 'center', padding: '0 100px',
        }}>
          {/* Sur-titre "— NEW WINE CHURCH —" retiré (feedback user) */}

          {/* TITRE "Bienvenue" — Great Vibes 420px, OR PLAT #EECF80, dominant */}
          <div style={{
            fontFamily: "'Great Vibes',cursive",
            fontSize: 420, lineHeight: .82,
            color: '#EECF80',
            margin: '0 0 8px',
            animation: 'nwGreatIn 1.4s cubic-bezier(.16,1,.3,1) both, nwScript 6s ease-in-out 1.4s infinite',
          }}>Bienvenue</div>

          {/* Séparateur : filet or + ✦ + filet or */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 30,
            marginBottom: 40,
            opacity: 0,
            animation: 'nwFadeUp .9s ease-out .6s forwards',
          }}>
            <span style={{
              width: 200, height: 3,
              background: '#E6C877',
              boxShadow: '0 0 14px rgba(230,200,119,.6)',
            }} />
            <span style={{
              fontFamily: "'Cinzel',serif", fontSize: 44,
              color: '#E6C877',
              textShadow: '0 0 18px rgba(214,178,95,.6)',
            }}>✦</span>
            <span style={{
              width: 200, height: 3,
              background: '#E6C877',
              boxShadow: '0 0 14px rgba(230,200,119,.6)',
            }} />
          </div>

          {/* Message d'accueil — Playfair italic 76px, ivoire pur */}
          <div style={{
            fontFamily: "'Playfair Display',serif",
            fontStyle: 'italic',
            fontSize: 76, lineHeight: 1.28,
            color: '#F5E6C8',
            maxWidth: 1500,
            textShadow: '0 3px 10px rgba(0,0,0,.75)',
            opacity: 0,
            animation: 'nwFadeUp 1s ease-out .9s forwards',
          }}>{welcomeText}</div>

          {/* Bloc speaker — nom Cinzel 88px or (+ médaillon SEULEMENT si photo) */}
          {hasSpeaker && (
            <div style={{
              display: 'flex', alignItems: 'center',
              gap: hasPhoto ? 48 : 0,
              flexDirection: hasPhoto ? 'row' : 'column',
              marginTop: 60,
              padding: hasPhoto ? '24px 60px 24px 24px' : '20px 60px',
              border: '3px solid #E6C877',
              borderRadius: hasPhoto ? 160 : 24,
              background: 'linear-gradient(180deg, rgba(33,26,16,.78), rgba(6,4,2,.82))',
              boxShadow: '0 0 50px rgba(0,0,0,.5), inset 0 0 30px rgba(0,0,0,.35)',
              opacity: 0,
              animation: 'nwFadeUp 1s ease-out 1.3s forwards',
              maxWidth: 1600,
            }}>
              {hasPhoto && <div style={avatarStyle} />}
              <div style={{ textAlign: hasPhoto ? 'left' : 'center', minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Cinzel',serif", fontWeight: 700,
                  fontSize: 88, letterSpacing: '.04em',
                  color: '#EECF80',
                  lineHeight: 1.05,
                  textShadow: '0 0 24px rgba(230,200,119,.4), 0 3px 8px rgba(0,0,0,.75)',
                }}>{speakerName}</div>
                {speakerRole && (
                  <div style={{
                    fontFamily: "'Playfair Display',serif", fontStyle: 'italic',
                    fontSize: 60, color: '#F5E6C8',
                    marginTop: 10,
                    textShadow: '0 3px 8px rgba(0,0,0,.7)',
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
