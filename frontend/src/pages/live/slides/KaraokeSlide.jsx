/**
 * KaraokeSlide V3 LED-safe (aligné pattern MurStars).
 *
 * Alignements sur MurStars (seul slide qui rend impeccable sur écran LED) :
 *  - Fond radial ambré `#211a10 → #0d0a06 → #060402` (fini bordeaux qui
 *    virait au magenta cramé)
 *  - Or PLAT #E6C877 partout (aucun WebkitBackgroundClip:text — perdus/marbrés sur LED)
 *  - Textes ≥ 60px minimum (ligne active 76px, voisines 46px, respirations 42px)
 *  - Waveform or plat uniquement (retrait des barres bordeaux #8B1A2F)
 *  - Zone spot : reflets or seuls (retrait du tint bordeaux .12)
 *
 * Comportement conservé :
 *  - Empilement vertical + translateY animé pour placer ligne active au centre
 *  - Auto-avance selon state.config.speed (défaut 1) et dur par ligne (défaut 4300ms)
 *  - Personnalisable via state.config = { song_title, speed, lines }
 */
import { useEffect, useMemo, useState } from 'react'
import Stage from '../components/Stage.jsx'

const H = 150       // hauteur de chaque slot ligne (px) — bumpé pour textes XXL
const CENTER_Y = 560 // y-center de la zone spot dans le canvas 1080

// Paroles par défaut — "Premier Amour" (chanson gospel du bal 2026)
const DEFAULT_LINES = [
  { text: "Qui est ce Dieu qui m'a appelé par mon nom bien avant" },
  { text: "Qui est ce Dieu qui a payé le prix pour moi" },
  { text: "Qui est ce Dieu qui a brisé toutes les chaînes" },
  { text: "Qui est ce Dieu qui m'a enseigné l'amour" },
  { text: "C'est toi… ah ah — C'est toi aah ouh", dur: 4800 },
  { text: '…', dur: 2400, breath: true },
  { text: "Moi je n'étais rien, mais j'ai trouvé grâce et valeur à tes yeux", dur: 5000 },
  { text: "Loin de ta face j'ai erré" },
  { text: "Mais ton amour m'a attiré" },
  { text: "Condamné à crever, mais ta compassion m'a rencontré", dur: 5000 },
  { text: "J'ai découvert que j'étais prédestinée" },
  { text: '…', dur: 2400, breath: true },
  { text: 'Je suis libre' },
  { text: 'Délivré de la mort' },
  { text: "Tu m'as restauré" },
  { text: "J'ai rencontré son amour, Il m'a changé", dur: 4800 },
  { text: 'Mon premier amour' },
  { text: 'Je suis libre' },
  { text: 'Délivré de la mort' },
  { text: "Tu m'as restauré" },
  { text: "J'ai rencontré son amour, Il m'a changé", dur: 4800 },
  { text: 'Mon premier amour' },
  { text: '…', dur: 2400, breath: true },
  { text: 'Je suis venu dans ce monde' },
  { text: 'Étrangère je retournerai' },
  { text: "Alors la Croix que tu m'as tendue, je veux la saisir", dur: 5000 },
  { text: "Elle est la preuve d'une grande délivrance" },
  { text: 'Le lieu où toutes mes blessures tu panses' },
  { text: "Le lieu où tu chasses tout c'qui me hante, me hante… Ouuh", dur: 5200 },
  { text: 'Aaah ah ah — Ouh — Aah ah', dur: 5200 },
]

const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }

export default function KaraokeSlide({ state }) {
  const config = state?.config ?? {}
  const speed = Number(config.speed ?? 1) || 1
  const songTitle = config.song_title ?? 'Premier Amour'

  // Lignes personnalisées via state.config.lines (accepte strings ou objets)
  const lines = useMemo(() => {
    const custom = config.lines
    if (Array.isArray(custom) && custom.length > 0) {
      return custom.map((l) =>
        typeof l === 'string' ? { text: l, dur: 4300 } : { dur: 4300, ...l }
      )
    }
    return DEFAULT_LINES
  }, [config.lines])

  // Ligne active — incrémentée automatiquement selon la durée de la ligne courante
  const [active, setActive] = useState(0)
  useEffect(() => {
    const cur = lines[active] || { dur: 4300 }
    const delay = (cur.dur || 4300) / speed
    const timer = setTimeout(() => {
      setActive((a) => (a + 1) % lines.length)
    }, delay)
    return () => clearTimeout(timer)
  }, [active, lines, speed])

  // Reset si la playlist change (nouvelle chanson)
  useEffect(() => { setActive(0) }, [lines])

  // 14 particules or montantes (formule déterministe)
  const particles = useMemo(() =>
    Array.from({ length: 14 }, (_, i) => {
      const size = 2 + rnd(i * 1.3) * 3
      const left = rnd(i * 2.1) * 100
      const dur = 11 + rnd(i * 3.7) * 8
      const delay = -rnd(i * 5.2) * dur
      const y = 200 + rnd(i * 1.9) * 760
      return { size, left, dur, delay, y }
    })
  , [])

  // 28 barres égaliseur
  const eq = useMemo(() =>
    Array.from({ length: 28 }, (_, i) => {
      const d = (0.6 + rnd(i * 2.3) * 0.8).toFixed(2)
      const delay = (-rnd(i * 5)).toFixed(2)
      return { d, delay }
    })
  , [])

  const cornerBase = {
    position: 'absolute', width: 20, height: 20,
    background: '#E6C877', transform: 'rotate(45deg)',
    boxShadow: '0 0 12px rgba(214,178,95,.7)', zIndex: 6,
  }

  const baseLineStyle = {
    height: H,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    textAlign: 'center',
    padding: '0 40px',
    lineHeight: 1.08,
    transition: 'all .6s cubic-bezier(.16,1,.3,1)',
  }

  return (
    <Stage>
      <style>{`
        @keyframes nwRise { 0%{transform:translateY(20px);opacity:0} 12%{opacity:.85} 88%{opacity:.85} 100%{transform:translateY(-1080px);opacity:0} }
        @keyframes nwHalo { 0%,100%{opacity:.5} 50%{opacity:.85} }
        @keyframes nwBandGlow { 0%,100%{opacity:.72} 50%{opacity:1} }
        @keyframes nwActiveGlow { 0%,100%{filter:drop-shadow(0 0 26px rgba(230,200,119,.5))} 50%{filter:drop-shadow(0 0 46px rgba(255,233,168,.85))} }
        @keyframes nwEq { 0%,100%{height:22%} 50%{height:100%} }
        @keyframes nwOrn { 0%,100%{transform:rotate(45deg) scale(1); opacity:.7} 50%{transform:rotate(45deg) scale(1.25); opacity:1} }
        @keyframes nwShaft { 0%,100%{opacity:.35} 50%{opacity:.7} }
      `}</style>

      <div style={{
        position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
        background: '#000000', color: '#F5E6C8', fontFamily: "'Cormorant Garamond',serif",
      }}>
        {/* Fond radial ambré — LED-safe, identique MurStars (fini bordeaux) */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 100% at 50% 40%, #211a10 0%, #0d0a06 56%, #060402 100%)',
        }} />

        {/* Faisceaux latéraux */}
        <div style={{
          position: 'absolute', top: '-16%', left: '30%',
          width: '20%', height: '135%',
          background: 'linear-gradient(180deg, rgba(230,200,119,.18), transparent 72%)',
          transform: 'skewX(-9deg)', filter: 'blur(10px)',
          animation: 'nwShaft 7s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', top: '-16%', right: '30%',
          width: '20%', height: '135%',
          background: 'linear-gradient(180deg, rgba(230,200,119,.15), transparent 72%)',
          transform: 'skewX(9deg)', filter: 'blur(10px)',
          animation: 'nwShaft 8.5s ease-in-out infinite',
        }} />

        {/* Halo central */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 1500, height: 820,
          transform: 'translate(-50%,-50%)',
          background: 'radial-gradient(closest-side, rgba(230,200,119,.16), transparent 72%)',
          animation: 'nwHalo 6s ease-in-out infinite',
        }} />

        {/* Particules or montantes */}
        {particles.map((p, i) => (
          <div key={`p-${i}`} style={{
            position: 'absolute',
            left: `${p.left}%`, top: p.y,
            width: p.size, height: p.size, borderRadius: '50%',
            background: 'radial-gradient(circle,#FFE9A8,rgba(201,169,97,.1))',
            boxShadow: `0 0 ${p.size * 3}px rgba(230,200,119,.6)`,
            animation: `nwRise ${p.dur}s linear infinite`,
            animationDelay: `${p.delay}s`,
            zIndex: 1,
          }} />
        ))}

        {/* Zone spot centrale (où passe la ligne active) */}
        <div style={{
          position: 'absolute',
          top: 480, left: 60, right: 60, height: 160,
          zIndex: 1,
          animation: 'nwBandGlow 5s ease-in-out infinite',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(60% 120% at 50% 50%, rgba(230,200,119,.18), rgba(230,200,119,.06) 55%, transparent 80%)',
            borderRadius: 12,
          }} />
          <div style={{
            position: 'absolute', top: 0, left: '6%', right: '6%', height: 1.5,
            background: 'linear-gradient(90deg,transparent,rgba(214,178,95,.9),transparent)',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: '6%', right: '6%', height: 1.5,
            background: 'linear-gradient(90deg,transparent,rgba(214,178,95,.9),transparent)',
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: 26, width: 12, height: 12, marginTop: -6,
            background: '#E6C877', boxShadow: '0 0 12px rgba(230,200,119,.9)',
            animation: 'nwOrn 3s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', top: '50%', right: 26, width: 12, height: 12, marginTop: -6,
            background: '#E6C877', boxShadow: '0 0 12px rgba(230,200,119,.9)',
            animation: 'nwOrn 3s ease-in-out infinite 1.5s',
          }} />
        </div>

        {/* Cadre or double filet + losanges */}
        <div style={{
          position: 'absolute', inset: 28,
          border: '3px solid rgba(214,178,95,.9)',
          boxShadow: 'inset 0 0 90px rgba(0,0,0,.4)',
          pointerEvents: 'none', zIndex: 5,
        }} />
        <div style={{
          position: 'absolute', inset: 40,
          border: '1px solid rgba(214,178,95,.5)',
          pointerEvents: 'none', zIndex: 5,
        }} />
        <div style={{ ...cornerBase, top: 56, left: 56 }} />
        <div style={{ ...cornerBase, top: 56, right: 56 }} />
        <div style={{ ...cornerBase, bottom: 56, left: 56 }} />
        <div style={{ ...cornerBase, bottom: 56, right: 56 }} />

        {/* En-tête : KARAOKÉ · NEW WINE + titre chanson Great Vibes (LED-safe, agrandi) */}
        <div style={{
          position: 'absolute', top: 50, left: 0, right: 0,
          textAlign: 'center', zIndex: 4,
        }}>
          <div style={{
            fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 32,
            letterSpacing: '.5em', textIndent: '.5em',
            color: '#E6C877',
            textShadow: '0 2px 10px rgba(0,0,0,.8)',
          }}>KARAOKÉ · NEW WINE</div>
          <div style={{
            fontFamily: "'Great Vibes',cursive", fontSize: 110, lineHeight: 1,
            color: '#EECF80',
            textShadow: '0 0 55px rgba(201,169,97,.5)',
            marginTop: 4,
          }}>{songTitle}</div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 18, marginTop: 6,
          }}>
            <span style={{ width: 140, height: 2, background: 'linear-gradient(90deg,transparent,rgba(214,178,95,.85))' }} />
            <span style={{ color: '#E6C877', fontSize: 26 }}>✦</span>
            <span style={{ width: 140, height: 2, background: 'linear-gradient(90deg,rgba(214,178,95,.85),transparent)' }} />
          </div>
        </div>

        {/* Paroles défilantes — empilement + translateY pour placer la ligne active au centre */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 2 }}>
          <div style={{
            position: 'absolute', left: 150, right: 150, top: 0,
            transform: `translateY(${CENTER_Y - (active + 0.5) * H}px)`,
            transition: 'transform .8s cubic-bezier(.16,1,.3,1)',
          }}>
            {lines.map((l, i) => {
              const d = i - active
              const ad = Math.abs(d)
              let lineStyle
              if (l.breath) {
                // Respiration "…" — Cinzel 42px or, atténuée si pas active
                lineStyle = {
                  ...baseLineStyle,
                  fontFamily: "'Cinzel',serif", fontSize: 42,
                  color: `rgba(230,200,119,${d === 0 ? .95 : .4})`,
                }
              } else if (d === 0) {
                // Ligne ACTIVE — Anton 76px OR PLAT (fini gradient text perdu sur LED)
                lineStyle = {
                  ...baseLineStyle,
                  fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 76,
                  letterSpacing: '.01em',
                  color: '#E6C877',
                  textShadow: '0 0 40px rgba(230,200,119,.6), 0 2px 8px rgba(0,0,0,.9)',
                  animation: 'nwActiveGlow 3s ease-in-out infinite',
                }
              } else {
                // Lignes voisines — Playfair italic 48px ivoire, opacité dégressive
                const op = Math.max(0.34, 0.82 - ad * 0.14)
                lineStyle = {
                  ...baseLineStyle,
                  fontFamily: "'Playfair Display',serif", fontStyle: 'italic',
                  fontSize: 48,
                  color: `rgba(245,230,200,${op.toFixed(2)})`,
                }
              }
              return <div key={i} style={lineStyle}>{l.text}</div>
            })}
          </div>
        </div>

        {/* Fondus haut et bas pour l'effet "défilement" — dégradés vers noir pur LED-safe */}
        <div style={{
          position: 'absolute', top: 40, left: 40, right: 40, height: 280,
          zIndex: 3, pointerEvents: 'none',
          background: 'linear-gradient(180deg, #000000 0%, rgba(0,0,0,.72) 46%, transparent 100%)',
        }} />
        <div style={{
          position: 'absolute', bottom: 40, left: 40, right: 40, height: 280,
          zIndex: 3, pointerEvents: 'none',
          background: 'linear-gradient(0deg, #000000 0%, rgba(0,0,0,.72) 46%, transparent 100%)',
        }} />

        {/* Égaliseur bas — 28 barres OR PLAT uniquement (LED-safe, fini bordeaux) */}
        <div style={{
          position: 'absolute', bottom: 64, left: 0, right: 0, zIndex: 4,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          gap: 7, height: 60,
        }}>
          {eq.map((e, i) => (
            <div key={i} style={{
              width: 10, height: '30%', borderRadius: 5,
              background: 'linear-gradient(180deg,#FFE9A8,#C9A961 50%,#7E662E)',
              boxShadow: '0 0 8px rgba(230,200,119,.5)',
              animation: `nwEq ${e.d}s ease-in-out infinite`,
              animationDelay: `${e.delay}s`,
            }} />
          ))}
        </div>
      </div>
    </Stage>
  )
}
