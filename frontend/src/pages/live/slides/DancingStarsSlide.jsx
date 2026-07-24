import { useMemo } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * DancingStarsSlide V4 — RESTAURATION du rideau ROUGE BORDEAUX profond
 * (comme dans le design original Claude Design). L'utilisateur accepte que
 * le rouge crame légèrement sur LED — c'est un moment scénique dramatique
 * et le bordeaux fait partie intégrante de l'identité "grand théâtre".
 *
 * Règles LED-safe strictes (hors rideau bordeaux) :
 *  - Fond principal : #000000 NOIR PUR (pas #0A0A0A qui vire au gris)
 *  - Or : PLAT #C9A961 / #E6C877 (aucun WebkitBackgroundClip:text — le
 *    dégradé se perd sur LED et donne un texte marbré illisible)
 *  - Aucun texte < 60px (illisible sur LED à distance)
 *
 * Cycle rideau 12s TRÈS visible :
 *   0-15% fermé complet → 15-35% ouverture (2.4s) → 35-65% ouvert (3.6s) →
 *   65-85% fermeture (2.4s) → 85-100% fermé.
 * Chaque pan fait 52% de large (léger chevauchement au centre quand fermé)
 * et translate de ±101% (garantit qu'il sort COMPLÈTEMENT du cadre).
 *
 * Titre masqué derrière le rideau (z-index 3) → révélé QUE quand les
 * pans sont sortis (z-index 4), effet "révélation" scénique.
 */
export default function DancingStarsSlide({ state }) {
  // state prop conservée pour compat future
  void state

  // Twinkles ✦ pseudo-aléatoires (formule déterministe)
  const twinkles = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    return Array.from({ length: 10 }, (_, i) => {
      const left = rnd(i * 2.7) * 80 + 10
      const top = rnd(i * 3.9) * 60 + 16
      const size = 18 + rnd(i * 1.5) * 22
      const dur = 2.5 + rnd(i * 4) * 2
      const delay = (-rnd(i * 3) * dur).toFixed(2)
      return { left, top, size, dur, delay }
    })
  }, [])

  // Velours ROUGE BORDEAUX profond — pattern répété pour évoquer les plis.
  // Restauré du design original Claude Design (rideau de théâtre classique).
  const velvet =
    'repeating-linear-gradient(90deg,#3a121b 0px,#6b1f2c 26px,#4a1622 52px,#2a0f14 78px)'

  const cornerBase = {
    position: 'absolute', width: 20, height: 20,
    background: '#E6C877', transform: 'rotate(45deg)',
    boxShadow: '0 0 12px rgba(214,178,95,.7)', zIndex: 8,
  }

  return (
    <Stage>
      <style>{`
        /* Rideau — cycle 12s, mouvement TRÈS visible.
           0-15% fermé → 15-35% ouvre → 35-65% ouvert → 65-85% ferme → 85-100% fermé */
        @keyframes nwOpenL {
          0%, 15%    { transform: translateX(0) }
          35%, 65%   { transform: translateX(-101%) }
          85%, 100%  { transform: translateX(0) }
        }
        @keyframes nwOpenR {
          0%, 15%    { transform: translateX(0) }
          35%, 65%   { transform: translateX(101%) }
          85%, 100%  { transform: translateX(0) }
        }
        @keyframes nwSpotSweepA { 0%,100%{transform:translateX(-50%) rotate(-22deg); opacity:.55} 50%{transform:translateX(-50%) rotate(22deg); opacity:.85} }
        @keyframes nwSpotSweepB { 0%,100%{transform:translateX(-50%) rotate(20deg); opacity:.7} 50%{transform:translateX(-50%) rotate(-20deg); opacity:.4} }
        @keyframes nwGlowP { 0%,100%{text-shadow:0 0 70px rgba(201,169,97,.45),0 3px 6px rgba(0,0,0,.75); filter:brightness(.98)} 50%{text-shadow:0 0 140px rgba(201,169,97,.85),0 3px 6px rgba(0,0,0,.75); filter:brightness(1.08)} }
        @keyframes nwScriptGlow { 0%,100%{text-shadow:0 0 50px rgba(230,200,119,.5),0 3px 6px rgba(0,0,0,.75)} 50%{text-shadow:0 0 110px rgba(230,200,119,.85),0 3px 6px rgba(0,0,0,.75)} }
        @keyframes nwStagePulse { 0%,100%{opacity:.4; transform:translate(-50%,-50%) scale(1)} 50%{opacity:.75; transform:translate(-50%,-50%) scale(1.08)} }
        @keyframes nwTwinkle { 0%,100%{opacity:.3} 50%{opacity:1} }
      `}</style>

      <div style={{
        position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
        background: '#000000', color: '#F5E6C8', fontFamily: "'Cormorant Garamond',serif",
      }}>
        {/* Fond NOIR PUR (LED-safe : #000000, pas #0A0A0A qui devient gris) */}
        <div style={{
          position: 'absolute', inset: 0,
          background: '#000000',
        }} />

        {/* Lueur de scène ambrée qui respire (subtile, sous le rideau) */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 1200, height: 800,
          background: 'radial-gradient(closest-side, rgba(230,200,119,.18), transparent 70%)',
          animation: 'nwStagePulse 5s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* Twinkles ✦ or */}
        {twinkles.map((t, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${t.left}%`, top: `${t.top}%`,
            zIndex: 2,
            fontFamily: "'Cinzel',serif",
            fontSize: t.size,
            color: 'rgba(230,200,119,.6)',
            textShadow: '0 0 18px rgba(214,178,95,.55)',
            animation: `nwTwinkle ${t.dur}s ease-in-out infinite`,
            animationDelay: `${t.delay}s`,
            pointerEvents: 'none',
          }}>✦</div>
        ))}

        {/* Spots croisés or (blur 22px, mixBlendMode screen — LED-safe) */}
        <div style={{
          position: 'absolute', top: -80, left: '35%',
          width: 440, height: 1400,
          background: 'linear-gradient(180deg, rgba(238,207,128,.32) 0%, rgba(230,200,119,.16) 35%, rgba(214,178,95,.05) 70%, transparent 100%)',
          filter: 'blur(22px)',
          transformOrigin: 'top center',
          animation: 'nwSpotSweepA 5.4s ease-in-out infinite',
          pointerEvents: 'none', mixBlendMode: 'screen',
          zIndex: 2,
        }} />
        <div style={{
          position: 'absolute', top: -80, left: '65%',
          width: 420, height: 1400,
          background: 'linear-gradient(180deg, rgba(245,230,200,.3) 0%, rgba(230,200,119,.14) 40%, rgba(214,178,95,.04) 75%, transparent 100%)',
          filter: 'blur(22px)',
          transformOrigin: 'top center',
          animation: 'nwSpotSweepB 6.2s ease-in-out infinite',
          pointerEvents: 'none', mixBlendMode: 'screen',
          zIndex: 2,
        }} />

        {/* TITRE — derrière le rideau (z-index 3), révélé quand les pans s'ouvrent.
            Or PLAT partout (pas de WebkitBackgroundClip qui dégrade sur LED). */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          {/* Sur-titre Cinzel 46px — or plat #E6C877 */}
          <div style={{
            fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 46,
            letterSpacing: '.52em', textIndent: '.52em',
            color: '#E6C877',
            textShadow: '0 0 24px rgba(201,169,97,.55), 0 2px 12px rgba(0,0,0,.95)',
            marginBottom: 22,
          }}>LE RIDEAU SE LÈVE</div>

          {/* DANCING — Anton 320px, or plat #E6C877 (pas de gradient) */}
          <div style={{
            fontFamily: "'Anton',sans-serif", fontSize: 320, lineHeight: .82,
            textTransform: 'uppercase', letterSpacing: '.01em',
            color: '#E6C877',
            animation: 'nwGlowP 5s ease-in-out infinite',
            margin: '4px 0 0',
          }}>DANCING</div>

          {/* Stars — Great Vibes 280px, or plat #EECF80 (script) */}
          <div style={{
            fontFamily: "'Great Vibes',cursive", fontSize: 280, lineHeight: .9,
            color: '#EECF80',
            animation: 'nwScriptGlow 5s ease-in-out infinite 1.2s',
            marginTop: -40,
          }}>Stars</div>
        </div>

        {/* RIDEAU — deux pans BORDEAUX qui s'ouvrent puis se ferment, boucle 12s.
            z-index 4 : passe DEVANT le titre (masqué quand fermé, révélé ouvert). */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none', overflow: 'hidden' }}>
          {/* Pan gauche — 52% pour léger chevauchement au centre */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0, left: 0, width: '52%',
            background: velvet,
            boxShadow: 'inset -30px 0 40px rgba(0,0,0,.7)',
            animation: 'nwOpenL 12s cubic-bezier(.65,0,.35,1) infinite',
            willChange: 'transform',
          }}>
            {/* liseré or intérieur (bord droit du pan gauche) */}
            <div style={{
              position: 'absolute', top: 0, bottom: 0, right: 0, width: 60,
              background: 'linear-gradient(90deg,transparent,rgba(255,230,170,.18))',
            }} />
          </div>
          {/* Pan droit */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0, right: 0, width: '52%',
            background: velvet,
            boxShadow: 'inset 30px 0 40px rgba(0,0,0,.7)',
            animation: 'nwOpenR 12s cubic-bezier(.65,0,.35,1) infinite',
            willChange: 'transform',
          }}>
            {/* liseré or intérieur (bord gauche du pan droit) */}
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: 0, width: 60,
              background: 'linear-gradient(270deg,transparent,rgba(255,230,170,.18))',
            }} />
          </div>
        </div>

        {/* Lambrequin haut fixe (bordeaux, filet or) */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 90, zIndex: 5,
          background: velvet,
          boxShadow: '0 8px 24px rgba(0,0,0,.7)',
          borderBottom: '3px solid rgba(214,178,95,.7)',
        }} />

        {/* Cadre or présidentiel (au-dessus du rideau, z-index 7) */}
        <div style={{
          position: 'absolute', inset: 28, zIndex: 7,
          border: '3px solid rgba(214,178,95,.95)',
          boxShadow: 'inset 0 0 80px rgba(0,0,0,.4)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: 40, zIndex: 7,
          border: '1px solid rgba(214,178,95,.55)',
          pointerEvents: 'none',
        }} />

        {/* 4 losanges 20×20 aux coins */}
        <div style={{ ...cornerBase, top: 56, left: 56 }} />
        <div style={{ ...cornerBase, top: 56, right: 56 }} />
        <div style={{ ...cornerBase, bottom: 56, left: 56 }} />
        <div style={{ ...cornerBase, bottom: 56, right: 56 }} />
      </div>
    </Stage>
  )
}
