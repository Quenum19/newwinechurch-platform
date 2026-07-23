import { useEffect, useMemo, useRef, useState } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * ProclamationSlide V2 — Climax du bal : proclamation Roi & Reine 2026.
 * Fidèle EXACT au .dc.html livré par Claude Design.
 * - Couronne SVG custom (200×140) avec dégradé or, rubis et facette animée
 * - 2 piédestaux 3D (perspective 1600px, rotateY ±6°, translateZ 40px)
 * - Médaillons 380×380 avec anneau conic-gradient or, halo & petite couronne
 * - Barres de votes progressives (transition 1.4s) + compteur count-up 1500ms ease-out cubic
 * - 30 confettis 5 couleurs avec sway latéral
 * - Halo respirant, flash initial, gradient nocturne, cadre double filet + losanges
 * - Fallback typographique Great Vibes si pas de photo
 */
export default function ProclamationSlide({ state }) {
  const st = state ?? {}
  const res = st.results ?? {}
  const roi = res.roi ?? { name: '—', votes: 0, photo: null }
  const reine = res.reine ?? { name: '—', votes: 0, photo: null }
  const maxV = Math.max(roi.votes || 0, reine.votes || 0, 1)

  // Count-up progression p ∈ [0,1] — durée 1500ms, ease-out cubic (identique .dc.html)
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

  // 30 confettis pseudo-aléatoires déterministes (même formule que le .dc.html)
  const confetti = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    const cols = ['#FFE9A8', '#E6C877', '#C9A961', '#8B1A2F', '#F5E6C8']
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

  // Losange or aux 4 coins (même formule que .dc.html)
  const cornerBase = {
    position: 'absolute',
    width: 14,
    height: 14,
    background: '#E6C877',
    transform: 'rotate(45deg)',
    boxShadow: '0 0 8px rgba(214,178,95,.6)',
  }

  // Fabrique d'un piédestal (Roi ou Reine) — MÊMES valeurs exactes que .dc.html
  const buildRoyal = (d, label, labelColor, tz, ry) => {
    const votes = d.votes || 0
    return {
      label,
      labelColor,
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
    buildRoyal(roi, 'LE ROI', '#E6C877', 40, 6),
    buildRoyal(reine, 'LA REINE', '#F3E2B6', 40, -6),
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
        @keyframes nwGlowP { 0%,100%{text-shadow:0 0 60px rgba(201,169,97,.35),0 2px 4px rgba(0,0,0,.6)} 50%{text-shadow:0 0 100px rgba(201,169,97,.55),0 2px 4px rgba(0,0,0,.6)} }
        @keyframes nwHalo { 0%,100%{opacity:.5; transform:scale(1)} 50%{opacity:.85; transform:scale(1.06)} }
      `}</style>

      <div style={{
        position: 'relative',
        width: 1920,
        height: 1080,
        overflow: 'hidden',
        background: '#0A0A0A',
        color: '#F5E6C8',
        fontFamily: "'Cormorant Garamond',serif",
      }}>
        {/* Gradient nocturne radial */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 100% at 50% 20%, #2a0f14 0%, #12080a 55%, #060402 100%)',
        }} />

        {/* Halo qui respire */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(46% 46% at 50% 40%, rgba(230,200,119,.14), transparent 70%)',
          animation: 'nwHalo 5s ease-in-out infinite',
        }} />

        {/* Flash initial (1.3s, run once) */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: 0,
          background: '#FFF6D8',
          animation: 'nwFlash 1.3s ease-out 1',
          pointerEvents: 'none',
        }} />

        {/* Confettis (30 pièces) */}
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
              opacity: 0.9,
              borderRadius: 1,
              boxShadow: '0 0 6px rgba(0,0,0,.3)',
              animation: `nwConfetti ${c.dur}s linear infinite`,
              animationDelay: `${c.delay}s`,
              transformStyle: 'preserve-3d',
            }} />
          </div>
        ))}

        {/* Cadre double filet */}
        <div style={{
          position: 'absolute', inset: 22,
          border: '2px solid rgba(214,178,95,.9)',
          boxShadow: 'inset 0 0 70px rgba(0,0,0,.32)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: 30,
          border: '1px solid rgba(214,178,95,.5)',
          pointerEvents: 'none',
        }} />

        {/* Losanges aux 4 coins */}
        <div style={{ ...cornerBase, top: 44, left: 44 }} />
        <div style={{ ...cornerBase, top: 44, right: 44 }} />
        <div style={{ ...cornerBase, bottom: 44, left: 44 }} />
        <div style={{ ...cornerBase, bottom: 44, right: 44 }} />

        {/* Colonne centrale */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Couronne SVG custom (200×140) */}
          <div style={{ animation: 'nwCrownShine 4s ease-in-out infinite' }}>
            <svg width="200" height="140" viewBox="0 0 200 140">
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#FFF6D8" />
                  <stop offset=".45" stopColor="#E6C877" />
                  <stop offset="1" stopColor="#7E662E" />
                </linearGradient>
                <linearGradient id="cg2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#E6C877" />
                  <stop offset="1" stopColor="#B08A3F" />
                </linearGradient>
              </defs>
              <path d="M28 116 L20 44 L64 82 L100 24 L136 82 L180 44 L172 116 Z" fill="url(#cg)" stroke="#7E662E" strokeWidth="1.5" />
              <rect x="30" y="112" width="140" height="18" rx="4" fill="url(#cg2)" stroke="#7E662E" strokeWidth="1.5" />
              <circle cx="100" cy="18" r="9" fill="#8B1A2F" stroke="#FFE9A8" strokeWidth="2" />
              <circle cx="20" cy="40" r="6" fill="#8B1A2F" stroke="#FFE9A8" strokeWidth="1.5" />
              <circle cx="180" cy="40" r="6" fill="#8B1A2F" stroke="#FFE9A8" strokeWidth="1.5" />
              <circle cx="64" cy="120" r="3.5" fill="#8B1A2F" />
              <circle cx="100" cy="120" r="3.5" fill="#8B1A2F" />
              <circle cx="136" cy="120" r="3.5" fill="#8B1A2F" />
              <polygon points="100,24 136,82 64,82" fill="rgba(255,246,216,.35)" style={{ animation: 'nwFacet 3s ease-in-out infinite' }} />
            </svg>
          </div>

          <div style={{
            fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 44,
            letterSpacing: '.4em', textIndent: '.4em',
            color: '#E6C877', marginTop: 8,
            animation: 'nwGlowP 5s ease-in-out infinite',
          }}>VOS MAJESTÉS 2026</div>

          <div style={{
            fontFamily: "'Playfair Display',serif", fontStyle: 'italic',
            fontSize: 30, color: '#F0E6CF', marginTop: 6,
          }}>couronnés par vos votes</div>

          {/* Duo pédestaux 3D */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            gap: 180, marginTop: 34, perspective: '1600px',
          }}>
            {royals.map((r, i) => (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                transformStyle: 'preserve-3d',
                transform: `translateZ(${r.tz}px) rotateY(${r.ry}deg)`,
                animation: 'nwRiseP .9s cubic-bezier(.16,1,.3,1) both',
              }}>
                {/* Label */}
                <div style={{
                  fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 30,
                  letterSpacing: '.38em', textIndent: '.38em',
                  color: r.labelColor,
                }}>{r.label}</div>

                {/* Médaillon 380×380 */}
                <div style={{ position: 'relative', width: 380, height: 380, margin: '20px 0' }}>
                  {/* Petite couronne au-dessus */}
                  <div style={{
                    position: 'absolute', top: -88, left: '50%',
                    transform: 'translateX(-50%)',
                    animation: 'nwCrownShine 4s ease-in-out infinite',
                  }}>
                    <svg width="130" height="90" viewBox="0 0 200 140">
                      <path d="M28 116 L20 44 L64 82 L100 24 L136 82 L180 44 L172 116 Z" fill="url(#cg)" stroke="#7E662E" strokeWidth="1.5" />
                      <rect x="30" y="112" width="140" height="18" rx="4" fill="url(#cg2)" stroke="#7E662E" strokeWidth="1.5" />
                      <circle cx="100" cy="18" r="9" fill="#8B1A2F" stroke="#FFE9A8" strokeWidth="2" />
                    </svg>
                  </div>

                  {/* Anneau conic gradient or */}
                  <div style={{
                    position: 'absolute', inset: -16, borderRadius: '50%',
                    background: 'conic-gradient(from 0deg,#7E662E,#FFE9A8,#C9A961,#FFF6D8,#7E662E)',
                    boxShadow: '0 0 50px rgba(230,200,119,.55)',
                  }} />
                  {/* Anneau intérieur noir (crée le liseré) */}
                  <div style={{
                    position: 'absolute', inset: -3, borderRadius: '50%',
                    background: '#0A0A0A',
                  }} />
                  {/* Photo (ou fond médaillon si absente) */}
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    backgroundImage: r.hasPhoto ? `url("${r.photo}")` : 'none',
                    backgroundColor: '#160d10',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }} />
                  {/* Bordure rubis */}
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    border: '3px solid rgba(139,26,47,.7)',
                  }} />
                  {/* Fallback typographique Great Vibes */}
                  {!r.hasPhoto && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Great Vibes',cursive",
                      fontSize: 150,
                      color: 'rgba(230,200,119,.85)',
                    }}>{r.initial}</div>
                  )}
                </div>

                {/* Nom (Anton 72px) */}
                <div style={{
                  fontFamily: "'Anton',sans-serif", fontSize: 72,
                  letterSpacing: '.02em',
                  color: '#F5E6C8',
                  textShadow: '0 0 40px rgba(201,169,97,.4)',
                }}>{r.name}</div>

                {/* Barre de progression (transition width 1.4s) */}
                <div style={{
                  width: 280, height: 10, borderRadius: 99,
                  background: 'rgba(214,178,95,.16)',
                  marginTop: 18, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: r.barPct,
                    borderRadius: 99,
                    background: 'linear-gradient(90deg,#FFE9A8,#C9A961)',
                    boxShadow: '0 0 14px rgba(230,200,119,.7)',
                    transition: 'width 1.4s cubic-bezier(.16,1,.3,1)',
                  }} />
                </div>

                {/* Compteur votes */}
                <div style={{
                  fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 34,
                  letterSpacing: '.14em',
                  color: '#E6C877', marginTop: 14,
                }}>
                  {r.votesDisplay}{' '}
                  <span style={{ fontSize: 20, color: '#D9CBB0', letterSpacing: '.2em' }}>VOTES</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Stage>
  )
}
