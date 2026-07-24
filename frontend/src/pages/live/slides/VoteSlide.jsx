import { useEffect, useMemo, useRef, useState } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * VoteSlide V3 — LED-safe (NOIR + OR uniquement, aucun rouge/bordeaux).
 * Refonte inspirée de MurStarsSlide (référence LED impeccable).
 *
 * Layout :
 *   - Titre "VOTE ROI & REINE" (Cinzel 60px, letterSpacing large)
 *   - Filet or ✦ filet or
 *   - QR central géant (vrai QR via state.config.vote_qr[_svg] sinon placeholder)
 *   - Sous-titre "Scanne pour voter" (Playfair italic 50px)
 *   - Signature "ton Roi & ta Reine" (Great Vibes 100px)
 *   - Compteur XXL "VOTES : 42" (Anton 220px, gradient or)
 *   - Médaillons candidats (jusqu'à 6) ronds 110px, bordure or + halo
 *
 * Ambiance : suspense + participation — 24 étincelles procédurales, 18 particules
 * or montantes, projecteur doux latéral, cadre présidentiel double filet + 4
 * losanges aux coins. Compteur animé en count-up (requestAnimationFrame,
 * ease-out cubic, 1200 ms) au montage et à chaque changement de votesCount.
 */

// PRNG déterministe (positions stables entre renders)
const rnd = (s) => {
  const x = Math.sin(s) * 10000
  return x - Math.floor(x)
}

// Fallback 4 candidats (2 roi, 2 reine)
const DEFAULT_CANDIDATES = [
  { id: 'd1', first_name: 'Emmanuel', last_name: 'N.', photo_url: null, role: 'roi' },
  { id: 'd2', first_name: 'David',    last_name: 'T.', photo_url: null, role: 'roi' },
  { id: 'd3', first_name: 'Grâce',    last_name: 'K.', photo_url: null, role: 'reine' },
  { id: 'd4', first_name: 'Sarah',    last_name: 'M.', photo_url: null, role: 'reine' },
]

export default function VoteSlide({ state }) {
  const stats = state?.stats ?? {}
  const config = state?.config ?? {}

  const rawCandidates =
    state?.candidates && state.candidates.length > 0 ? state.candidates : DEFAULT_CANDIDATES
  const candidates = rawCandidates.slice(0, 6)

  // ---- QR : soit vrai SVG string, soit URL/data-URI, sinon placeholder or ----
  const qrSvg = typeof config.vote_qr_svg === 'string' ? config.vote_qr_svg : null
  const qrSrc = typeof config.vote_qr === 'string' ? config.vote_qr : null
  const hasRealQr = Boolean(qrSvg || qrSrc)

  // ---- Compteur animé (count-up ease-out cubic, 1200 ms) ----
  const votesTarget = Number(stats.votes_count ?? 0)
  const [displayVotes, setDisplayVotes] = useState(0)
  const rafRef = useRef(null)
  const fromRef = useRef(0)

  useEffect(() => {
    // On animate depuis la valeur actuellement affichée vers la cible
    fromRef.current = displayVotes
    const from = fromRef.current
    const to = votesTarget
    if (from === to) return
    const dur = 1200
    const t0 = performance.now()
    const easeOutCubic = (k) => 1 - Math.pow(1 - k, 3)
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur)
      const v = Math.round(from + (to - from) * easeOutCubic(k))
      setDisplayVotes(v)
      if (k < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [votesTarget])

  const votesFmt = displayVotes.toLocaleString('fr-FR')

  // ---- Étincelles procédurales (24) ----
  const twinkles = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const left = rnd(i * 2.1) * 94 + 3
      const top = rnd(i * 3.3) * 86 + 6
      const size = 14 + rnd(i * 1.7) * 46
      const dur = 2 + rnd(i * 4) * 2.4
      const upDur = (4 + rnd(i) * 3).toFixed(1)
      const delay = (-rnd(i * 6) * dur).toFixed(2)
      const variant = i % 3
      return { left, top, size, dur, upDur, delay, variant }
    })
  }, [])

  // ---- Particules or montantes (18) ----
  const particles = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => {
      const size = 2 + rnd(i * 1.3) * 4
      const left = rnd(i * 2.1) * 100
      const dur = 10 + rnd(i * 3.7) * 9
      const delay = -rnd(i * 5.2) * dur
      const startY = 240 + rnd(i * 1.9) * 800
      return { size, left, dur, delay, startY }
    })
  }, [])

  // ---- Losanges des coins (cadre présidentiel) ----
  const cornerBase = {
    position: 'absolute',
    width: 20,
    height: 20,
    background: '#E6C877',
    transform: 'rotate(45deg)',
    boxShadow: '0 0 12px rgba(214,178,95,.7)',
  }

  // ---- Helpers candidats ----
  const nameOf = (c) => {
    const base = [c.first_name, c.last_name].filter(Boolean).join(' ').trim()
    return base || c.name || '—'
  }
  const initialOf = (c) => {
    const n = nameOf(c)
    return n && n !== '—' ? n.charAt(0).toUpperCase() : '?'
  }

  return (
    <Stage>
      <style>{`
        @keyframes nwTwinkleA { 0%,100%{opacity:.2; transform:scale(.7) rotate(-15deg)} 50%{opacity:1; transform:scale(1.25) rotate(15deg)} }
        @keyframes nwTwinkleB { 0%,100%{opacity:.3; transform:scale(.85) rotate(10deg)} 50%{opacity:.95; transform:scale(1.15) rotate(-10deg)} }
        @keyframes nwTwinkleC { 0%,100%{opacity:.25; transform:scale(1) rotate(0deg)} 50%{opacity:1; transform:scale(1.35) rotate(20deg)} }
        @keyframes nwUp { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes nwRise { 0%{transform:translateY(20px);opacity:0} 12%{opacity:.9} 88%{opacity:.9} 100%{transform:translateY(-1080px);opacity:0} }
        @keyframes nwGlowP { 0%,100%{text-shadow:0 0 70px rgba(201,169,97,.4),0 3px 6px rgba(0,0,0,.7); filter:brightness(.98)} 50%{text-shadow:0 0 150px rgba(201,169,97,.75),0 3px 6px rgba(0,0,0,.7); filter:brightness(1.08)} }
        @keyframes nwFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes nwRipple { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(1.28);opacity:0} }
        @keyframes nwSpotSweep { 0%,100%{transform:translateX(-50%) rotate(-18deg); opacity:.55} 50%{transform:translateX(-50%) rotate(18deg); opacity:.8} }
        @keyframes nwQrPulse { 0%,100%{box-shadow:0 0 50px rgba(230,200,119,.4), 0 0 0 4px #E6C877} 50%{box-shadow:0 0 90px rgba(230,200,119,.7), 0 0 0 4px #FFE9A8} }
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
        {/* Fond radial LED-safe (identique MurStars) */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 100% at 50% 40%, #211a10 0%, #0d0a06 56%, #060402 100%)',
        }} />

        {/* Halo or central très doux */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(38% 42% at 50% 50%, rgba(230,200,119,.10), transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Projecteur doux central (sweep) */}
        <div style={{
          position: 'absolute', top: -80, left: '50%',
          width: 480, height: 1400,
          background: 'linear-gradient(180deg, rgba(245,230,200,.22) 0%, rgba(230,200,119,.10) 40%, rgba(214,178,95,.03) 75%, transparent 100%)',
          filter: 'blur(26px)',
          transformOrigin: 'top center',
          animation: 'nwSpotSweep 6.5s ease-in-out infinite',
          pointerEvents: 'none',
          mixBlendMode: 'screen',
        }} />

        {/* Particules or montantes */}
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

        {/* Étincelles ✦ scintillantes */}
        {twinkles.map((t, i) => {
          const anim = t.variant === 0 ? 'nwTwinkleA' : t.variant === 1 ? 'nwTwinkleB' : 'nwTwinkleC'
          return (
            <div key={`t-${i}`} style={{
              position: 'absolute',
              left: `${t.left}%`, top: `${t.top}%`,
              fontFamily: "'Cinzel',serif", fontSize: t.size,
              color: 'rgba(230,200,119,.55)',
              textShadow: '0 0 18px rgba(214,178,95,.55)',
              animation: `${anim} ${t.dur}s ease-in-out infinite, nwUp ${t.upDur}s ease-in-out infinite`,
              animationDelay: `${t.delay}s`,
              pointerEvents: 'none',
            }}>✦</div>
          )
        })}

        {/* Cadre présidentiel */}
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

        {/* -------- BLOC CENTRAL -------- */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'flex-start',
          textAlign: 'center', padding: '92px 90px 70px',
        }}>
          {/* Titre "VOTE ROI & REINE" (Cinzel 60px, letterSpacing large) */}
          <div style={{
            fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 60,
            letterSpacing: '.32em', textIndent: '.32em', color: '#EECF80',
            textShadow: '0 0 30px rgba(201,169,97,.4)',
          }}>VOTE ROI &amp; REINE</div>

          {/* Filet or ✦ filet or */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 26, marginTop: 18,
          }}>
            <span style={{ width: 240, height: 2, background: 'rgba(214,178,95,.7)' }} />
            <span style={{ fontFamily: "'Cinzel',serif", fontSize: 34, color: '#E6C877' }}>✦</span>
            <span style={{ width: 240, height: 2, background: 'rgba(214,178,95,.7)' }} />
          </div>

          {/* -------- HERO : QR + CTA + Compteur (3 colonnes) -------- */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 80, marginTop: 34,
          }}>
            {/* QR géant central */}
            <div style={{ position: 'relative' }}>
              {/* Ripples or (2 anneaux) */}
              <div style={{
                position: 'absolute', inset: -18, borderRadius: 24,
                border: '3px solid rgba(230,200,119,.6)',
                animation: 'nwRipple 2.6s ease-out infinite',
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute', inset: -18, borderRadius: 24,
                border: '3px solid rgba(230,200,119,.45)',
                animation: 'nwRipple 2.6s ease-out infinite 1.3s',
                pointerEvents: 'none',
              }} />

              {/* Cadre ivoire + bordure or 4pt (pulsante) */}
              <div style={{
                position: 'relative',
                width: 340, height: 340,
                padding: 22,
                background: '#F5E6C8',
                borderRadius: 12,
                animation: 'nwQrPulse 3.4s ease-in-out infinite',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {qrSvg ? (
                  // SVG string fourni par le back (billetterie)
                  <div
                    style={{ width: '100%', height: '100%' }}
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                ) : qrSrc ? (
                  <img
                    src={qrSrc}
                    alt="QR code vote"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  // Placeholder — pas de vrai QR
                  <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    color: '#7E662E',
                  }}>
                    <div style={{
                      fontFamily: "'Cinzel',serif", fontSize: 90, lineHeight: 1,
                    }}>▣</div>
                    <div style={{
                      fontFamily: "'Anton',sans-serif", fontSize: 46,
                      letterSpacing: '.14em', marginTop: 4,
                    }}>QR VOTE</div>
                  </div>
                )}
              </div>
            </div>

            {/* CTA droite */}
            <div style={{ textAlign: 'left', maxWidth: 520 }}>
              <div style={{
                fontFamily: "'Playfair Display',serif", fontStyle: 'italic',
                fontSize: 50, color: '#F5E6C8', lineHeight: 1.05,
              }}>Scanne pour voter</div>
              <div style={{
                fontFamily: "'Great Vibes',cursive", fontSize: 100, lineHeight: .95,
                color: '#EECF80', textShadow: '0 0 60px rgba(201,169,97,.45)',
                marginTop: 6,
              }}>ton Roi &amp; ta Reine</div>
              <div style={{
                fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic',
                fontSize: 28, color: '#D9CBB0', marginTop: 14, letterSpacing: '.03em',
              }}>Code ticket reçu par email · 1 vote unique</div>
            </div>
          </div>

          {/* -------- COMPTEUR XXL -------- */}
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'center',
            gap: 34, marginTop: 26,
          }}>
            <div style={{
              fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 46,
              letterSpacing: '.28em', color: '#C9A961',
              alignSelf: 'center',
            }}>VOTES</div>
            <div style={{
              fontFamily: "'Anton',sans-serif", fontSize: 220, lineHeight: .85,
              textTransform: 'uppercase',
              background: 'linear-gradient(180deg,#FFF6D8,#E6C877 48%,#C9A961 68%,#8a6d2f)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'nwGlowP 6s ease-in-out infinite',
            }}>{votesFmt}</div>
          </div>

          {/* -------- MÉDAILLONS CANDIDATS -------- */}
          {candidates.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              gap: 46, marginTop: 18,
            }}>
              {candidates.map((c, i) => {
                const name = nameOf(c)
                const initial = initialOf(c)
                const isReine = String(c.role || '').toLowerCase() === 'reine'
                const roleLabel = isReine ? 'REINE' : 'ROI'
                const roleGlyph = isReine ? '♕' : '♔'
                const animDur = (4 + i * 0.5).toFixed(1)
                const animDelay = (i * 0.28).toFixed(2)
                const avatarBg = c.photo_url
                  ? `url("${c.photo_url}") center/cover`
                  : 'linear-gradient(135deg,#7E662E,#C9A961 55%,#E6C877)'
                return (
                  <div key={c.id ?? i} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    animation: `nwFloat ${animDur}s ease-in-out infinite`,
                    animationDelay: `${animDelay}s`,
                    minWidth: 140,
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 110, height: 110, borderRadius: '50%',
                      background: avatarBg,
                      border: '2px solid #E6C877',
                      boxShadow: '0 0 20px rgba(230,200,119,.4), 0 0 0 4px rgba(10,10,10,.6) inset',
                      fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 46,
                      color: '#0d0a06', textShadow: '0 1px 0 rgba(255,233,168,.4)',
                      overflow: 'hidden',
                    }}>{c.photo_url ? '' : initial}</div>
                    <div style={{
                      fontFamily: "'Cinzel',serif", fontSize: 16, fontWeight: 600,
                      letterSpacing: '.22em', color: '#C9A961',
                      marginTop: 10,
                    }}>
                      <span style={{ marginRight: 6 }}>{roleGlyph}</span>{roleLabel}
                    </div>
                    <div style={{
                      fontFamily: "'Anton',sans-serif", fontSize: 30, lineHeight: 1,
                      color: '#F5E6C8', marginTop: 4, letterSpacing: '.02em',
                      textTransform: 'uppercase',
                    }}>{name}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Stage>
  )
}
