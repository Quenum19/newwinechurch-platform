import { useEffect, useMemo, useRef, useState } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * ProclamationSlide V4 — Climax du bal : proclamation Roi & Reine 2026.
 * Refonte STRICTE LED-safe alignée sur MurStarsSlide : plus AUCUN gradient
 * de texte (WebkitBackgroundClip perdu sur LED), plus AUCUN rouge/rubis
 * (vire au magenta cramé), or PLAT #E6C877 partout, tous textes >= 60px.
 *
 * - Fond radial ambré très sombre (identique MurStars : #211a10 -> #060402)
 * - Halo pulsant OR au centre (nwHalo)
 * - Flash blanc initial 1.3s (nwFlash)
 * - Couronne SVG géante 200×140 en haut, or plat + perles or/ivoire
 * - Titre "VOS MAJESTÉS 2026" Cinzel 90px OR PLAT #E6C877 (pas gradient)
 * - Sous-titre "couronnés par vos votes" Playfair italic 60px ivoire
 * - 2 piédestaux 3D (perspective 1600px, translateZ 40px, rotateY ±6°) :
 *     • Petite couronne 100×70 or au sommet du médaillon
 *     • Médaillon 380×380 rond, anneau conic-gradient OR pur, halo or
 *     • Label "LE ROI" / "LA REINE" Cinzel 60px or plat (sous le médaillon)
 *     • Nom Anton 130px or PLAT #E6C877 (pas gradient)
 *     • Compteur count-up Anton 130px or PLAT #E6C877
 *     • Barre or 380px transition width 1.4s cubic-bezier
 * - 30 confettis palette OR/IVOIRE uniquement
 * - Cadre présidentiel double filet or + 4 losanges 20×20 aux coins
 * - Fallback photo : médaillon or + initiale Great Vibes 150px ivoire
 */
export default function ProclamationSlide({ state }) {
  const st = state ?? {}
  const res = st.results ?? {}
  const roi = res.roi ?? { name: '—', votes: 0, photo: null }
  const reine = res.reine ?? { name: '—', votes: 0, photo: null }
  const maxV = Math.max(roi.votes || 0, reine.votes || 0, 1)

  // Count-up progression p ∈ [0,1] — durée 1500ms, ease-out cubic
  const [p, setP] = useState(0)
  const rafRef = useRef(null)
  useEffect(() => {
    const t0 = performance.now()
    const dur = 1500
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur)
      setP(1 - Math.pow(1 - k, 3))
      if (k < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [roi.votes, reine.votes])

  // 30 confettis pseudo-aléatoires déterministes — palette OR + IVOIRE UNIQUEMENT
  // (jamais #8B1A2F : rouge vire au magenta cramé sur LED)
  const confetti = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    const cols = ['#FFE9A8', '#E6C877', '#C9A961', '#F5E6C8', '#FFF6D8']
    return Array.from({ length: 30 }, (_, i) => {
      const left = rnd(i * 2.3) * 100
      const dur = 5 + rnd(i * 1.7) * 4
      const delay = -rnd(i * 3.1) * dur
      const w = 6 + rnd(i * 4.4) * 8
      const h = w * (1.4 + rnd(i * 2) * 0.8)
      const col = cols[i % cols.length]
      const swayDur = 1.6 + rnd(i * 5) * 1.8
      return { left, dur, delay, w, h, col, swayDur }
    })
  }, [])

  // Losange or aux 4 coins (identique MurStars pour cohérence de série)
  const cornerBase = {
    position: 'absolute',
    width: 20,
    height: 20,
    background: '#E6C877',
    transform: 'rotate(45deg)',
    boxShadow: '0 0 12px rgba(214,178,95,.7)',
  }

  // Fabrique d'un piédestal (Roi ou Reine)
  const buildRoyal = (d, label, tz, ry) => {
    const votes = d.votes || 0
    return {
      label,
      tz,
      ry,
      hasPhoto: !!d.photo,
      photo: d.photo || null,
      initial: (d.name || '?').trim().charAt(0).toUpperCase(),
      name: d.name || '—',
      barPct: ((votes / maxV) * 100 * p).toFixed(1) + '%',
      votesDisplay: Math.round(votes * p).toLocaleString('fr-FR'),
    }
  }
  const royals = [
    buildRoyal(roi, 'LE ROI', 40, 6),
    buildRoyal(reine, 'LA REINE', 40, -6),
  ]

  return (
    <Stage>
      <style>{`
        @keyframes nwConfetti { 0%{transform:translateY(-80px) rotateZ(0deg) rotateX(0deg);opacity:0} 8%{opacity:1} 100%{transform:translateY(1180px) rotateZ(720deg) rotateX(540deg);opacity:.9} }
        @keyframes nwSway { 0%,100%{margin-left:-26px} 50%{margin-left:26px} }
        @keyframes nwFlash { 0%{opacity:0} 15%{opacity:.85} 100%{opacity:0} }
        @keyframes nwCrownShine { 0%,100%{filter:drop-shadow(0 0 10px rgba(230,200,119,.5))} 50%{filter:drop-shadow(0 0 26px rgba(255,233,168,.9))} }
        @keyframes nwFacet { 0%,100%{opacity:.25} 50%{opacity:.9} }
        @keyframes nwRiseP { 0%{transform:translateY(60px) scale(.94);opacity:0} 100%{transform:translateY(0) scale(1);opacity:1} }
        @keyframes nwGlowP { 0%,100%{text-shadow:0 0 70px rgba(201,169,97,.4),0 3px 6px rgba(0,0,0,.7); filter:brightness(.98)} 50%{text-shadow:0 0 150px rgba(201,169,97,.75),0 3px 6px rgba(0,0,0,.7); filter:brightness(1.08)} }
        @keyframes nwHalo { 0%,100%{opacity:.5; transform:scale(1)} 50%{opacity:.85; transform:scale(1.06)} }
      `}</style>

      <div style={{
        position: 'relative',
        width: 1920,
        height: 1080,
        overflow: 'hidden',
        background: '#000000',
        color: '#F5E6C8',
        fontFamily: "'Cormorant Garamond',serif",
      }}>
        {/* Fond radial ambré très sombre — IDENTIQUE MurStarsSlide (LED-safe) */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 100% at 50% 40%, #211a10 0%, #0d0a06 56%, #060402 100%)',
        }} />

        {/* Halo OR qui respire au centre */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(46% 46% at 50% 40%, rgba(230,200,119,.18), transparent 70%)',
          animation: 'nwHalo 5s ease-in-out infinite',
        }} />

        {/* Flash blanc initial (1.3s, run once) */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: 0,
          background: '#FFF6D8',
          animation: 'nwFlash 1.3s ease-out 1',
          pointerEvents: 'none',
        }} />

        {/* Confettis (30 pièces, OR/IVOIRE uniquement — aucun rouge) */}
        {confetti.map((c, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: -80,
            left: `${c.left}%`,
            animation: `nwSway ${c.swayDur}s ease-in-out infinite`,
          }}>
            <div style={{
              width: c.w,
              height: c.h,
              background: c.col,
              opacity: 0.92,
              borderRadius: 1,
              boxShadow: '0 0 6px rgba(0,0,0,.3)',
              animation: `nwConfetti ${c.dur}s linear infinite`,
              animationDelay: `${c.delay}s`,
              transformStyle: 'preserve-3d',
            }} />
          </div>
        ))}

        {/* Cadre présidentiel double filet or (identique MurStars) */}
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

        {/* Losanges 20×20 aux 4 coins */}
        <div style={{ ...cornerBase, top: 56, left: 56 }} />
        <div style={{ ...cornerBase, top: 56, right: 56 }} />
        <div style={{ ...cornerBase, bottom: 56, left: 56 }} />
        <div style={{ ...cornerBase, bottom: 56, right: 56 }} />

        {/* Défs SVG partagées — gradients de FILL (OK sur LED, ce n'est pas du texte) */}
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <linearGradient id="nwCrownGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFF6D8" />
              <stop offset=".45" stopColor="#E6C877" />
              <stop offset="1" stopColor="#7E662E" />
            </linearGradient>
            <linearGradient id="nwCrownBase" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#E6C877" />
              <stop offset="1" stopColor="#B08A3F" />
            </linearGradient>
          </defs>
        </svg>

        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Couronne SVG géante 200×140 — OR + perles OR/IVOIRE (ex-rubis rouges) */}
          <div style={{ animation: 'nwCrownShine 4s ease-in-out infinite' }}>
            <svg width="200" height="140" viewBox="0 0 200 140">
              <path
                d="M28 116 L20 44 L64 82 L100 24 L136 82 L180 44 L172 116 Z"
                fill="url(#nwCrownGold)"
                stroke="#7E662E"
                strokeWidth="1.5"
              />
              <rect
                x="30" y="112" width="140" height="18" rx="4"
                fill="url(#nwCrownBase)"
                stroke="#7E662E"
                strokeWidth="1.5"
              />
              {/* Perles OR/IVOIRE (jamais de rubis rouge) */}
              <circle cx="100" cy="18" r="9" fill="#FFF6D8" stroke="#E6C877" strokeWidth="2" />
              <circle cx="20" cy="40" r="6" fill="#FFE9A8" stroke="#E6C877" strokeWidth="1.5" />
              <circle cx="180" cy="40" r="6" fill="#FFE9A8" stroke="#E6C877" strokeWidth="1.5" />
              <circle cx="64" cy="120" r="3.5" fill="#FFF6D8" />
              <circle cx="100" cy="120" r="3.5" fill="#FFF6D8" />
              <circle cx="136" cy="120" r="3.5" fill="#FFF6D8" />
              {/* Facette centrale scintillante */}
              <polygon
                points="100,24 136,82 64,82"
                fill="rgba(255,246,216,.35)"
                style={{ animation: 'nwFacet 3s ease-in-out infinite' }}
              />
            </svg>
          </div>

          {/* Titre "VOS MAJESTÉS 2026" — Cinzel 90px OR PLAT (aucun gradient texte) */}
          <div style={{
            fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 90,
            lineHeight: 1,
            letterSpacing: '.15em', textIndent: '.15em',
            marginTop: 18,
            color: '#E6C877',
            textShadow: '0 0 60px rgba(230,200,119,.55), 0 3px 8px rgba(0,0,0,.75)',
            animation: 'nwGlowP 5s ease-in-out infinite',
          }}>VOS MAJESTÉS 2026</div>

          {/* Sous-titre Playfair italic 60px ivoire */}
          <div style={{
            fontFamily: "'Playfair Display',serif", fontStyle: 'italic',
            fontSize: 60, color: '#F5E6C8', marginTop: 18,
            textShadow: '0 2px 10px rgba(0,0,0,.7)',
          }}>couronnés par vos votes</div>

          {/* Duo piédestaux 3D */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            gap: 200, marginTop: 44, perspective: '1600px',
          }}>
            {royals.map((r, i) => (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                transformStyle: 'preserve-3d',
                transform: `translateZ(${r.tz}px) rotateY(${r.ry}deg)`,
                animation: 'nwRiseP .9s cubic-bezier(.16,1,.3,1) both',
              }}>
                {/* Médaillon 380×380 */}
                <div style={{ position: 'relative', width: 380, height: 380, marginBottom: 22 }}>
                  {/* Petite couronne 100×70 au sommet — perles OR/IVOIRE */}
                  <div style={{
                    position: 'absolute', top: -76, left: '50%',
                    transform: 'translateX(-50%)',
                    animation: 'nwCrownShine 4s ease-in-out infinite',
                  }}>
                    <svg width="100" height="70" viewBox="0 0 200 140">
                      <path
                        d="M28 116 L20 44 L64 82 L100 24 L136 82 L180 44 L172 116 Z"
                        fill="url(#nwCrownGold)"
                        stroke="#7E662E"
                        strokeWidth="1.5"
                      />
                      <rect
                        x="30" y="112" width="140" height="18" rx="4"
                        fill="url(#nwCrownBase)"
                        stroke="#7E662E"
                        strokeWidth="1.5"
                      />
                      {/* Perle centrale OR (jamais de rubis rouge) */}
                      <circle cx="100" cy="18" r="9" fill="#FFF6D8" stroke="#E6C877" strokeWidth="2" />
                    </svg>
                  </div>

                  {/* Anneau conic-gradient OR PUR — aucun stop rouge */}
                  <div style={{
                    position: 'absolute', inset: -16, borderRadius: '50%',
                    background: 'conic-gradient(from 0deg,#7E662E,#FFE9A8,#C9A961,#FFF6D8,#E6C877,#7E662E)',
                    boxShadow: '0 0 60px rgba(230,200,119,.65)',
                  }} />
                  {/* Liseré intérieur sombre */}
                  <div style={{
                    position: 'absolute', inset: -3, borderRadius: '50%',
                    background: '#0d0a06',
                  }} />
                  {/* Photo — ou fond médaillon or si absente */}
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    backgroundImage: r.hasPhoto ? `url("${r.photo}")` : 'none',
                    background: r.hasPhoto
                      ? undefined
                      : 'conic-gradient(from 45deg,#7E662E,#E6C877,#FFE9A8,#C9A961,#FFF6D8,#E6C877,#7E662E)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }} />
                  {/* Bordure OR (aucun bordeaux) */}
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    border: '3px solid rgba(230,200,119,.75)',
                    boxShadow: 'inset 0 0 30px rgba(0,0,0,.45)',
                  }} />
                  {/* Fallback typographique Great Vibes 150px IVOIRE (aucun bordeaux) */}
                  {!r.hasPhoto && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Great Vibes',cursive",
                      fontSize: 150,
                      lineHeight: 1,
                      color: '#F5E6C8',
                      textShadow: '0 4px 24px rgba(0,0,0,.7), 0 0 40px rgba(230,200,119,.5)',
                    }}>{r.initial}</div>
                  )}
                </div>

                {/* Label "LE ROI" / "LA REINE" — Cinzel 60px OR PLAT (sous le médaillon) */}
                <div style={{
                  fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 60,
                  lineHeight: 1,
                  letterSpacing: '.36em', textIndent: '.36em',
                  color: '#E6C877',
                  textShadow: '0 0 30px rgba(230,200,119,.55), 0 2px 6px rgba(0,0,0,.75)',
                  marginTop: 10,
                }}>{r.label}</div>

                {/* Nom — Anton 130px OR PLAT #E6C877 (aucun gradient texte) */}
                <div style={{
                  fontFamily: "'Anton',sans-serif", fontSize: 130,
                  lineHeight: .95,
                  letterSpacing: '.02em',
                  color: '#E6C877',
                  textShadow: '0 0 50px rgba(201,169,97,.55), 0 3px 10px rgba(0,0,0,.8)',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  maxWidth: 560,
                  marginTop: 14,
                }}>{r.name}</div>

                {/* Compteur votes — Anton 130px OR PLAT #E6C877 (aucun gradient texte) */}
                <div style={{
                  fontFamily: "'Anton',sans-serif", fontSize: 130,
                  lineHeight: 1,
                  letterSpacing: '.04em',
                  marginTop: 18,
                  color: '#E6C877',
                  textShadow: '0 0 60px rgba(201,169,97,.55), 0 3px 10px rgba(0,0,0,.8)',
                }}>{r.votesDisplay}</div>

                {/* Barre or 380px (transition width 1.4s cubic-bezier) */}
                <div style={{
                  width: 380, height: 8, borderRadius: 99,
                  background: 'rgba(214,178,95,.18)',
                  marginTop: 22, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: r.barPct,
                    borderRadius: 99,
                    background: '#E6C877',
                    boxShadow: '0 0 16px rgba(230,200,119,.85)',
                    transition: 'width 1.4s cubic-bezier(.16,1,.3,1)',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Stage>
  )
}
