import { useEffect, useMemo, useState } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * VoteSlide V2 — Scrutin Roi & Reine.
 * QR géant central, compteur live à gauche, CTA "SCANNE POUR VOTER" à droite,
 * 4 candidats en médaillons en bas. Couronne dorée + titre "Roi & Reine"
 * en gradient or, cadre présidentiel double filet + losanges aux coins,
 * étoiles scintillantes en fond.
 * Fidèle au design VoteSlideV2.dc.html (durées / keyframes / tailles intactes).
 */

// PRNG déterministe (identique au .dc.html)
const rnd = (s) => {
  const x = Math.sin(s) * 10000
  return x - Math.floor(x)
}

// Placeholder QR — 21×21 cellules de 16px, fabriqué avec box-shadow multi-stops.
// L'emprise sera réutilisée pour un vrai QR plus tard.
const buildQrShadow = () => {
  const cells = []
  const N = 21
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const on =
        rnd(x * 3.1 + y * 7.7) > 0.5 ||
        (x < 7 && y < 7) ||
        (x >= N - 7 && y < 7) ||
        (x < 7 && y >= N - 7)
      if (on) cells.push(`${x * 16}px ${y * 16}px 0 7px #1a0f14`)
    }
  }
  return cells.join(',')
}

// Fallback candidats — 2 roi + 2 reine, photos null (initiales rendues).
const DEFAULT_CANDIDATES = [
  { id: 'd1', name: 'Emmanuel N.', votes: 1240, photo: null, category: 'roi' },
  { id: 'd2', name: 'Grâce K.', votes: 1310, photo: null, category: 'reine' },
  { id: 'd3', name: 'David T.', votes: 980, photo: null, category: 'roi' },
  { id: 'd4', name: 'Sarah M.', votes: 1105, photo: null, category: 'reine' },
]

export default function VoteSlide({ state }) {
  const stats = state?.stats ?? {}
  const rawCandidates =
    state?.candidates && state.candidates.length > 0 ? state.candidates : DEFAULT_CANDIDATES

  // Progression 0 → 1 en 1400 ms, ease-out cubique (identique au .dc.html)
  const [p, setP] = useState(0)
  useEffect(() => {
    const t0 = performance.now()
    const dur = 1400
    let raf
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur)
      setP(1 - Math.pow(1 - k, 3))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Étoiles scintillantes — 10 items positionnés par seed déterministe.
  const twinkles = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => {
      const left = rnd(i * 2.7) * 90 + 5
      const top = rnd(i * 3.9) * 80 + 6
      const size = 16 + rnd(i * 1.5) * 20
      const dur = 2.5 + rnd(i * 4) * 2
      const delay = (-rnd(i * 3) * dur).toFixed(2)
      return { left, top, size, dur, delay }
    })
  }, [])

  // Ombre CSS du placeholder QR — calculée une seule fois.
  const qrShadow = useMemo(() => buildQrShadow(), [])

  // Candidats — max 4, animés par p (compteur qui monte).
  const grads = [
    'linear-gradient(135deg,#8B1A2F,#5f1720)',
    'linear-gradient(135deg,#7E662E,#C9A961)',
  ]
  const candidates = rawCandidates.slice(0, 4).map((c, i) => ({
    key: c.id ?? i,
    name: c.name || '—',
    initial: (c.name || '?').charAt(0).toUpperCase(),
    votes: Math.round((c.votes || 0) * p).toLocaleString('fr-FR'),
    avatarBg: c.photo ? `url("${c.photo}") center/cover` : grads[i % 2],
    animDur: (4 + i * 0.6).toFixed(1),
    animDelay: (i * 0.3).toFixed(2),
  }))

  // Compteur global + barre de progression
  const votesTotalRaw =
    stats.votes_count ?? rawCandidates.reduce((a, c) => a + (c.votes || 0), 0)
  const totalExpected = stats.total_expected ?? 200
  const gpct = Math.max(0, Math.min(1, votesTotalRaw / (totalExpected * 4)))
  const votesTotal = Math.round(votesTotalRaw * p).toLocaleString('fr-FR')
  const globalPct = (gpct * 100 * p).toFixed(1) + '%'

  const cornerBase = {
    position: 'absolute',
    width: 20,
    height: 20,
    background: '#E6C877',
    transform: 'rotate(45deg)',
    boxShadow: '0 0 12px rgba(214,178,95,.7)',
  }

  return (
    <Stage>
      <style>{`
        @keyframes nwRipple { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(1.4);opacity:0} }
        @keyframes nwArrow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(12px)} }
        @keyframes nwGlowP { 0%,100%{text-shadow:0 0 60px rgba(201,169,97,.4),0 3px 6px rgba(0,0,0,.7)} 50%{text-shadow:0 0 120px rgba(201,169,97,.65),0 3px 6px rgba(0,0,0,.7)} }
        @keyframes nwFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes nwTwinkle { 0%,100%{opacity:.3} 50%{opacity:1} }
        @keyframes nwCrownGlow { 0%,100%{filter:drop-shadow(0 0 8px rgba(230,200,119,.5))} 50%{filter:drop-shadow(0 0 20px rgba(255,233,168,.9))} }
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
        {/* Fond radial global */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 100% at 50% 24%, #211a10 0%, #0d0a06 56%, #060402 100%)',
        }} />
        {/* Halo doré central */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(44% 46% at 50% 44%, rgba(230,200,119,.12), transparent 70%)',
        }} />

        {/* Étoiles scintillantes */}
        {twinkles.map((t, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${t.left}%`,
            top: `${t.top}%`,
            fontFamily: "'Cinzel',serif",
            fontSize: t.size,
            color: 'rgba(230,200,119,.5)',
            animation: `nwTwinkle ${t.dur}s ease-in-out infinite`,
            animationDelay: `${t.delay}s`,
          }}>✦</div>
        ))}

        {/* Cadre présidentiel double filet */}
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
        {/* Losanges aux 4 coins */}
        <div style={{ ...cornerBase, top: 56, left: 56 }} />
        <div style={{ ...cornerBase, top: 56, right: 56 }} />
        <div style={{ ...cornerBase, bottom: 56, left: 56 }} />
        <div style={{ ...cornerBase, bottom: 56, right: 56 }} />

        {/* Bloc central */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '70px 90px',
        }}>
          {/* Couronne dorée */}
          <div style={{ animation: 'nwCrownGlow 4s ease-in-out infinite', marginBottom: 2 }}>
            <svg width="130" height="90" viewBox="0 0 200 140">
              <defs>
                <linearGradient id="vcg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#FFF6D8" />
                  <stop offset=".5" stopColor="#E6C877" />
                  <stop offset="1" stopColor="#7E662E" />
                </linearGradient>
              </defs>
              <path
                d="M28 116 L20 44 L64 82 L100 24 L136 82 L180 44 L172 116 Z"
                fill="url(#vcg)" stroke="#7E662E" strokeWidth="1.5"
              />
              <rect
                x="30" y="112" width="140" height="18" rx="4"
                fill="#C9A961" stroke="#7E662E" strokeWidth="1.5"
              />
              <circle cx="100" cy="18" r="9" fill="#8B1A2F" stroke="#FFE9A8" strokeWidth="2" />
            </svg>
          </div>

          {/* Kicker */}
          <div style={{
            fontFamily: "'Cinzel',serif", fontWeight: 500, fontSize: 30,
            letterSpacing: '.48em', textIndent: '.48em', color: '#E6C877',
          }}>LE SCRUTIN EST OUVERT</div>

          {/* Titre principal */}
          <div style={{
            fontFamily: "'Anton',sans-serif", fontSize: 150, lineHeight: .9,
            textTransform: 'uppercase',
            background: 'linear-gradient(180deg,#FFF6D8,#E6C877 50%,#8a6d2f)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'nwGlowP 6s ease-in-out infinite',
          }}>Roi &amp; Reine</div>

          {/* HERO : compteur + QR + CTA */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 80, marginTop: 20,
          }}>
            {/* Compteur live (gauche) */}
            <div style={{ textAlign: 'right', minWidth: 360 }}>
              <div style={{
                fontFamily: "'Anton',sans-serif", fontSize: 150, lineHeight: .9,
                color: '#ECCE7D',
                textShadow: '0 0 70px rgba(201,169,97,.45)',
              }}>{votesTotal}</div>
              <div style={{
                fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 28,
                letterSpacing: '.2em', color: '#C9A961',
              }}>VOTES EXPRIMÉS</div>
              <div style={{
                height: 12, borderRadius: 99,
                background: 'rgba(214,178,95,.18)',
                marginTop: 16, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: globalPct, borderRadius: 99,
                  background: 'linear-gradient(90deg,#8B1A2F,#E6C877)',
                  boxShadow: '0 0 16px rgba(230,200,119,.7)',
                  transition: 'width 1.2s ease',
                }} />
              </div>
            </div>

            {/* QR hero (centre) */}
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', inset: -14, borderRadius: 26,
                border: '3px solid rgba(230,200,119,.6)',
                animation: 'nwRipple 2.6s ease-out infinite',
              }} />
              <div style={{
                position: 'absolute', inset: -14, borderRadius: 26,
                border: '3px solid rgba(230,200,119,.5)',
                animation: 'nwRipple 2.6s ease-out infinite 1.3s',
              }} />
              <div style={{
                position: 'relative', padding: 28,
                background: '#F5E6C8', borderRadius: 20,
                boxShadow: '0 0 60px rgba(230,200,119,.45)',
              }}>
                <div style={{ position: 'relative', width: 340, height: 340 }}>
                  {/* Placeholder QR — emprise réservée au vrai QR (NE PAS TOUCHER) */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0,
                    width: 16, height: 16,
                    boxShadow: qrShadow,
                  }} />
                </div>
              </div>
            </div>

            {/* CTA (droite) */}
            <div style={{ textAlign: 'left', minWidth: 360 }}>
              <div style={{
                fontFamily: "'Anton',sans-serif", fontSize: 64, lineHeight: 1,
                color: '#F5E6C8',
              }}>SCANNE</div>
              <div style={{
                fontFamily: "'Anton',sans-serif", fontSize: 64, lineHeight: 1,
                color: '#F5E6C8',
              }}>POUR VOTER</div>
              <div style={{
                fontSize: 60, color: '#E6C877', marginTop: 10,
                animation: 'nwArrow 1.4s ease-in-out infinite',
              }}>⬇</div>
              <div style={{
                fontFamily: "'Cormorant Garamond',serif", fontSize: 26,
                color: '#D9CBB0', marginTop: 8, maxWidth: 340,
              }}>Ton code ticket reçu par email · 1 vote unique</div>
            </div>
          </div>

          {/* Candidats en médaillons */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            gap: 60, marginTop: 44,
          }}>
            {candidates.map((c, i) => (
              <div key={c.key} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                animation: `nwFloat ${c.animDur}s ease-in-out infinite`,
                animationDelay: `${c.animDelay}s`,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 120, height: 120, borderRadius: '50%',
                  background: c.avatarBg,
                  border: '3px solid rgba(214,178,95,.8)',
                  boxShadow: '0 0 24px rgba(0,0,0,.5)',
                  fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 52,
                  color: '#F5E6C8',
                }}>{c.initial}</div>
                <div style={{
                  fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 26,
                  color: '#F5E6C8', marginTop: 12,
                }}>{c.name}</div>
                <div style={{
                  fontFamily: "'Anton',sans-serif", fontSize: 30, color: '#E6C877',
                }}>{c.votes}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Stage>
  )
}
