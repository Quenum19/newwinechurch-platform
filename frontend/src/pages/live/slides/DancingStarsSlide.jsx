import { useMemo } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * DancingStarsSlide V2 — Le rideau de scène s'ouvre une fois pour révéler
 * la photo ou la vidéo des danseurs. Titre dynamique "DANCING / Stars"
 * avec cascade lettre-par-lettre (Anton), script Great Vibes pour "Stars",
 * respiration douce et shimmer or animé. Sur-titre "LE RIDEAU SE LÈVE"
 * qui se fane après quelques secondes. Cadre or présidentiel + losanges
 * conservés au-dessus. Aucun texte parasite : si aucun média n'est fourni,
 * fond noir élégant.
 *
 * Sources média (par ordre de priorité) :
 *   - state.video_url             (vidéo, .mp4/.webm/.mov)
 *   - state.config.dancing_media  (image OU vidéo, détection par extension)
 *   - state.dancing_photo         (image)
 */
export default function DancingStarsSlide({ state }) {
  // ── Média derrière le rideau (photo ou vidéo, priorité descendante) ──
  const media = useMemo(() => {
    return (
      state?.video_url ||
      state?.config?.dancing_media ||
      state?.dancing_photo ||
      ''
    )
  }, [state?.video_url, state?.config?.dancing_media, state?.dancing_photo])

  const isVideo = useMemo(() => {
    if (!media) return false
    return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(media)
  }, [media])

  // ── Twinkles ✦ pseudo-aléatoires (formule déterministe) ──
  const twinkles = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    return Array.from({ length: 10 }, (_, i) => {
      const left = rnd(i * 2.7) * 80 + 10
      const top = rnd(i * 3.9) * 60 + 16
      const size = 18 + rnd(i * 1.5) * 22
      const dur = 2.5 + rnd(i * 4) * 2
      const delay = -rnd(i * 3) * dur
      return { left, top, size, dur, delay }
    })
  }, [])

  // ── Rotation individuelle par lettre (±3deg, déterministe) ──
  const letterRot = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    return Array.from({ length: 20 }, (_, i) => Number((rnd(i * 7.13) * 6 - 3).toFixed(2)))
  }, [])

  // ── Lettres à animer ──
  const dancingLetters = 'DANCING'.split('')
  const starsLetters = 'Stars'.split('')

  // ── Velours rouge à plis (fidèle .dc.html) ──
  const velvet = 'repeating-linear-gradient(90deg,#3a121b 0px,#6b1f2c 26px,#4a1622 52px,#2a0f14 78px)'

  const cornerBase = {
    position: 'absolute', width: 20, height: 20,
    background: '#E6C877', transform: 'rotate(45deg)',
    boxShadow: '0 0 12px rgba(214,178,95,.7)', zIndex: 8,
  }

  return (
    <Stage>
      <style>{`
        /* Rideau CYCLIQUE : fermé → ouvre → montre vidéo qq sec → ferme → ouvre → boucle
           Cycle 10s : fermé 0.8s / ouverture 1.4s / ouvert 4.5s / fermeture 1.4s / fermé 1.9s
           La vidéo derrière tourne en continu, révélée à chaque cycle. */
        @keyframes nwCurtainCycleL {
          0%, 8%    { transform: translateX(0) }
          22%       { transform: translateX(-101%) }
          67%       { transform: translateX(-101%) }
          81%, 100% { transform: translateX(0) }
        }
        @keyframes nwCurtainCycleR {
          0%, 8%    { transform: translateX(0) }
          22%       { transform: translateX(101%) }
          67%       { transform: translateX(101%) }
          81%, 100% { transform: translateX(0) }
        }
        @keyframes nwCurtainSheen {
          0%   { transform: translateX(-140%) skewX(-12deg) }
          100% { transform: translateX(260%) skewX(-12deg) }
        }
        @keyframes nwSpotCross {
          0%   { transform: translateX(-44vw) rotate(-14deg) }
          100% { transform: translateX(44vw) rotate(14deg) }
        }
        @keyframes nwStagePulse {
          0%,100% { opacity: .4; transform: translate(-50%,-50%) scale(1) }
          50%     { opacity: .75; transform: translate(-50%,-50%) scale(1.1) }
        }
        @keyframes nwTwinkle {
          0%,100% { opacity: .3 }
          50%     { opacity: 1 }
        }
        /* Cascade lettre : chute + rebond doux */
        @keyframes nwLetterDrop {
          0%   { opacity: 0; transform: translateY(60px) }
          60%  { opacity: 1; transform: translateY(-6px) }
          100% { opacity: 1; transform: translateY(0) }
        }
        /* Respiration continue une fois la cascade terminée */
        @keyframes nwLetterBreathe {
          0%,100% { transform: translateY(0) }
          50%     { transform: translateY(-5px) }
        }
        /* Shimmer or : le dégradé se déplace horizontalement dans la typo */
        @keyframes nwShimmer {
          0%   { background-position: 200% 50% }
          100% { background-position: -200% 50% }
        }
        /* Entrée du script "Stars" — legger, retardé après DANCING */
        @keyframes nwStarsIn {
          0%   { opacity: 0; transform: translateY(30px) scale(.94); filter: blur(4px) }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0) }
        }
        @keyframes nwStarsGlow {
          0%,100% { text-shadow: 0 0 40px rgba(230,200,119,.55), 0 3px 6px rgba(0,0,0,.7) }
          50%     { text-shadow: 0 0 100px rgba(230,200,119,.9),  0 3px 6px rgba(0,0,0,.7) }
        }
        /* Sur-titre "LE RIDEAU SE LÈVE" : visible ~2.7s puis se fane */
        @keyframes nwOverlineOut {
          0%,60% { opacity: 1; transform: translateY(0) }
          100%   { opacity: 0; transform: translateY(-10px) }
        }
      `}</style>

      <div style={{
        position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
        background: '#0A0A0A', color: '#F5E6C8', fontFamily: "'Cormorant Garamond',serif",
      }}>
        {/* Fond radial nuit (derrière tout, visible si aucun média) */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 100% at 50% 40%, #2a0f14 0%, #12080a 58%, #060402 100%)',
        }} />

        {/* MÉDIA DES DANSEURS (photo OU vidéo, révélé par l'ouverture du rideau)
            Aucun texte parasite : si média absent, on laisse juste le noir élégant. */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, overflow: 'hidden' }}>
          {media && (isVideo ? (
            <video
              key={media}
              src={media}
              autoPlay muted loop playsInline
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%', objectFit: 'cover',
              }}
            />
          ) : (
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url("${media}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }} />
          ))}
          {/* Vignette qui adoucit les bords du média */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(70% 70% at 50% 45%, transparent 40%, rgba(0,0,0,.55) 100%)',
          }} />
        </div>

        {/* Lueur de scène (au-dessus du média, sous le titre) */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 1200, height: 800,
          background: 'radial-gradient(closest-side, rgba(230,200,119,.2), transparent 70%)',
          animation: 'nwStagePulse 5s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 3,
        }} />

        {/* Twinkles ✦ */}
        {twinkles.map((t, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${t.left}%`, top: `${t.top}%`,
            zIndex: 5,
            fontFamily: "'Cinzel',serif",
            fontSize: t.size,
            color: 'rgba(230,200,119,.5)',
            animation: `nwTwinkle ${t.dur}s ease-in-out infinite`,
            animationDelay: `${t.delay.toFixed(2)}s`,
            pointerEvents: 'none',
          }}>✦</div>
        ))}

        {/* Spots croisés */}
        <div style={{
          position: 'absolute', top: '-20%', left: '38%',
          width: 200, height: '150%',
          background: 'linear-gradient(180deg, rgba(230,200,119,.18), transparent 74%)',
          filter: 'blur(9px)',
          animation: 'nwSpotCross 7s ease-in-out infinite alternate',
          pointerEvents: 'none',
          zIndex: 5,
        }} />
        <div style={{
          position: 'absolute', top: '-20%', right: '38%',
          width: 200, height: '150%',
          background: 'linear-gradient(180deg, rgba(230,200,119,.15), transparent 74%)',
          filter: 'blur(9px)',
          animation: 'nwSpotCross 8.5s ease-in-out infinite alternate-reverse',
          pointerEvents: 'none',
          zIndex: 5,
        }} />

        {/* RIDEAU : deux pans, fermés au montage, s'ouvrent en 2s puis restent ouverts */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none', overflow: 'hidden' }}>
          {/* Pan gauche */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0, left: 0, width: '52%',
            background: velvet,
            boxShadow: 'inset -30px 0 40px rgba(0,0,0,.6)',
            animation: 'nwCurtainCycleL 10s cubic-bezier(.7,0,.25,1) infinite',
          }}>
            <div style={{
              position: 'absolute', top: 0, bottom: 0, right: 0, width: 60,
              background: 'linear-gradient(90deg,transparent,rgba(255,230,170,.14))',
            }} />
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: 0, width: 50,
              background: 'linear-gradient(90deg,transparent,rgba(255,230,170,.12),transparent)',
              animation: 'nwCurtainSheen 2.4s linear infinite',
            }} />
          </div>
          {/* Pan droit */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0, right: 0, width: '52%',
            background: velvet,
            boxShadow: 'inset 30px 0 40px rgba(0,0,0,.6)',
            animation: 'nwCurtainCycleR 10s cubic-bezier(.7,0,.25,1) infinite',
          }}>
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: 0, width: 60,
              background: 'linear-gradient(270deg,transparent,rgba(255,230,170,.14))',
            }} />
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: 0, width: 50,
              background: 'linear-gradient(90deg,transparent,rgba(255,230,170,.12),transparent)',
              animation: 'nwCurtainSheen 2.8s linear infinite .4s',
            }} />
          </div>
        </div>

        {/* Lambrequin haut (reste au-dessus du rideau après ouverture) */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 90,
          zIndex: 5,
          background: velvet,
          boxShadow: '0 8px 24px rgba(0,0,0,.6)',
          borderBottom: '3px solid rgba(214,178,95,.6)',
        }} />

        {/* TITRE : sur-titre + DANCING (Anton, cascade) + Stars (Great Vibes) */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 6,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          {/* Sur-titre discret qui se fane après ~2.7s */}
          <div style={{
            fontFamily: "'Cinzel',serif", fontWeight: 400, fontSize: 22,
            letterSpacing: '.6em', textIndent: '.6em',
            color: 'rgba(230,200,119,.85)', textShadow: '0 2px 12px rgba(0,0,0,.9)',
            marginBottom: 26,
            animation: 'nwOverlineOut 4.5s ease-out 0s both',
          }}>LE RIDEAU SE LÈVE</div>

          {/* "DANCING" — Anton monumentale, cascade + respiration + shimmer or */}
          <div style={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            fontFamily: "'Anton',sans-serif", fontSize: 240, lineHeight: .82,
            textTransform: 'uppercase', letterSpacing: '.02em',
            marginBottom: -6,
          }}>
            {dancingLetters.map((ch, i) => {
              // Wrapper : rotation statique par lettre (préserve l'inclinaison sous les animations)
              // Inner  : cascade + respiration + shimmer (animations sur transform / background-position)
              const dropDelay = (i * 0.09).toFixed(2)
              const breatheDelay = (0.9 + i * 0.09).toFixed(2)
              const shimmerDelay = (1.0 + i * 0.05).toFixed(2)
              return (
                <span key={i} style={{
                  display: 'inline-block',
                  transform: `rotate(${letterRot[i]}deg)`,
                  padding: '0 2px',
                }}>
                  <span style={{
                    display: 'inline-block',
                    background: 'linear-gradient(100deg, #8a6d2f 0%, #FFF6D8 20%, #E6C877 40%, #FFF6D8 60%, #E6C877 80%, #8a6d2f 100%)',
                    backgroundSize: '300% 100%',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 3px 6px rgba(0,0,0,.7))',
                    animation:
                      `nwLetterDrop 0.9s cubic-bezier(.16,1,.3,1) ${dropDelay}s both, ` +
                      `nwLetterBreathe 3s ease-in-out ${breatheDelay}s infinite, ` +
                      `nwShimmer 5s ease-in-out ${shimmerDelay}s infinite`,
                  }}>{ch}</span>
                </span>
              )
            })}
          </div>

          {/* "Stars" — Great Vibes script, entrée retardée + halo doré + respiration */}
          <div style={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            fontFamily: "'Great Vibes',cursive", fontSize: 230, lineHeight: .9,
            color: '#EECF80',
            marginTop: -14,
            animation:
              'nwStarsIn 1.4s cubic-bezier(.16,1,.3,1) 1.0s both, ' +
              'nwStarsGlow 4s ease-in-out 2.4s infinite',
          }}>
            {starsLetters.map((ch, i) => {
              const rot = (letterRot[i + 10] / 2).toFixed(2)
              const breatheDelay = (2.4 + i * 0.14).toFixed(2)
              return (
                <span key={i} style={{
                  display: 'inline-block',
                  transform: `rotate(${rot}deg)`,
                  padding: '0 1px',
                }}>
                  <span style={{
                    display: 'inline-block',
                    animation: `nwLetterBreathe 3.6s ease-in-out ${breatheDelay}s infinite`,
                  }}>{ch}</span>
                </span>
              )
            })}
          </div>
        </div>

        {/* Cadre présidentiel or (au-dessus de tout, y compris rideau) */}
        <div style={{
          position: 'absolute', inset: 28, zIndex: 7,
          border: '3px solid rgba(214,178,95,.9)',
          boxShadow: 'inset 0 0 80px rgba(0,0,0,.4)',
          pointerEvents: 'none',
        }} />

        {/* 4 losanges aux coins */}
        <div style={{ ...cornerBase, top: 56, left: 56 }} />
        <div style={{ ...cornerBase, top: 56, right: 56 }} />
        <div style={{ ...cornerBase, bottom: 56, left: 56 }} />
        <div style={{ ...cornerBase, bottom: 56, right: 56 }} />
      </div>
    </Stage>
  )
}
