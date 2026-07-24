import { useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Stage from '../components/Stage.jsx'

/**
 * VoteSlide V4 — LED-SAFE STRICT (pattern MurStars).
 * Fond NOIR PUR #000000 + radial ambré très sombre. OR PLAT #E6C877 uniquement
 * (aucun gradient text WebkitBackgroundClip — perdus sur écran LED).
 * Textes XXL uniquement (≥ 60px). Structure épurée : QR + accroche + compteur.
 *
 * Layout :
 *   - Titre "VOTE ROI & REINE" (Cinzel 90px, or plat)
 *   - Filet or ✦ filet or
 *   - HERO 2 colonnes : QR 440×440 (ivoire + bordure or pulsante) | CTA
 *       · "Scanne pour voter"     Playfair italic 82px ivoire
 *       · "ton Roi & ta Reine"    Great Vibes 140px or plat
 *   - Compteur : "VOTES 300"   Anton 300px or PLAT (no gradient)
 *
 * Ambiance MurStars-like : projecteur central sweep, 30 twinkles ✦, 22
 * particules or montantes, cadre présidentiel double filet + 4 losanges.
 * Compteur animé count-up ease-out cubic 1200 ms sur changement.
 *
 * PAS de médaillons candidats (trop petits sur LED).
 * PAS de framer-motion. Keyframes préfixés nw…
 */

// PRNG déterministe (positions stables entre renders)
const rnd = (s) => {
  const x = Math.sin(s) * 10000
  return x - Math.floor(x)
}

export default function VoteSlide({ state }) {
  const stats = state?.stats ?? {}
  const config = state?.config ?? {}

  // ---- QR : chaîne de fallback robuste ----
  //   1. SVG string fourni par le backend (state.config.vote_qr_svg)
  //   2. URL/data-URI (state.config.vote_qr)
  //   3. Génération CÔTÉ CLIENT via qrcode.react à partir de l'URL de vote
  //      (state.config.vote_url ou construite depuis state.event.id + origin)
  //   4. Placeholder visuel si aucun eventId disponible
  const qrSvg = typeof config.vote_qr_svg === 'string' ? config.vote_qr_svg : null
  const qrSrc = typeof config.vote_qr === 'string' ? config.vote_qr : null
  const eventId = state?.event?.id
  const qrUrl =
    config.vote_url ||
    (eventId && typeof window !== 'undefined'
      ? `${window.location.origin}/bal/vote/${eventId}`
      : null)

  // Debug : log ce qui arrive (console navigateur sur /live/bal/{id})
  useEffect(() => {
    console.log('[VoteSlide] config =', config, '| eventId =', eventId, '| qrUrl =', qrUrl)
  }, [config, eventId, qrUrl])

  // ---- Compteur animé (count-up ease-out cubic, 1200 ms) ----
  const votesTarget = Number(stats.votes_count ?? 0)
  const [displayVotes, setDisplayVotes] = useState(0)
  const rafRef = useRef(null)
  const fromRef = useRef(0)

  useEffect(() => {
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

  // ---- 30 étincelles procédurales scintillantes (comme MurStars) ----
  const twinkles = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const left = rnd(i * 2.1) * 94 + 3
      const top = rnd(i * 3.3) * 86 + 6
      const size = 15 + rnd(i * 1.7) * 60          // 15–75px
      const dur = 1.8 + rnd(i * 4) * 2.6           // 1.8–4.4s
      const upDur = (4 + rnd(i) * 3).toFixed(1)    // 4–7s
      const delay = (-rnd(i * 6) * dur).toFixed(2)
      const variant = i % 3
      return { left, top, size, dur, upDur, delay, variant }
    })
  }, [])

  // ---- 22 particules or montantes (comme MurStars) ----
  const particles = useMemo(() => {
    return Array.from({ length: 22 }, (_, i) => {
      const size = 2 + rnd(i * 1.3) * 4
      const left = rnd(i * 2.1) * 100
      const dur = 9 + rnd(i * 3.7) * 10
      const delay = -rnd(i * 5.2) * dur
      const startY = 200 + rnd(i * 1.9) * 880
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

  return (
    <Stage>
      <style>{`
        @keyframes nwTwinkleA { 0%,100%{opacity:.2; transform:scale(.7) rotate(-15deg)} 50%{opacity:1; transform:scale(1.25) rotate(15deg)} }
        @keyframes nwTwinkleB { 0%,100%{opacity:.3; transform:scale(.85) rotate(10deg)} 50%{opacity:.95; transform:scale(1.15) rotate(-10deg)} }
        @keyframes nwTwinkleC { 0%,100%{opacity:.25; transform:scale(1) rotate(0deg)} 50%{opacity:1; transform:scale(1.35) rotate(20deg)} }
        @keyframes nwUp { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes nwRise { 0%{transform:translateY(20px);opacity:0} 12%{opacity:.9} 88%{opacity:.9} 100%{transform:translateY(-1080px);opacity:0} }
        @keyframes nwSpotSweep { 0%,100%{transform:translateX(-50%) rotate(-18deg); opacity:.55} 50%{transform:translateX(-50%) rotate(18deg); opacity:.8} }
        @keyframes nwStarPulse { 0%,100%{transform:scale(1); text-shadow:0 0 30px rgba(214,178,95,.6)} 50%{transform:scale(1.14); text-shadow:0 0 55px rgba(214,178,95,.95)} }
        @keyframes nwQrPulse { 0%,100%{box-shadow:0 0 50px rgba(230,200,119,.4), 0 0 0 4px #E6C877} 50%{box-shadow:0 0 90px rgba(230,200,119,.7), 0 0 0 4px #FFE9A8} }
        @keyframes nwCountGlow { 0%,100%{text-shadow:0 0 60px rgba(230,200,119,.55), 0 4px 8px rgba(0,0,0,.85)} 50%{text-shadow:0 0 120px rgba(230,200,119,.9), 0 4px 8px rgba(0,0,0,.85)} }
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
        {/* Fond radial ambré très sombre (comme MurStars) */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 100% at 50% 40%, #1a1408 0%, #0a0704 55%, #000000 100%)',
        }} />

        {/* Projecteur central sweep */}
        <div style={{
          position: 'absolute', top: -80, left: '50%',
          width: 480, height: 1400,
          background: 'linear-gradient(180deg, rgba(245,230,200,.28) 0%, rgba(230,200,119,.12) 40%, rgba(214,178,95,.04) 75%, transparent 100%)',
          filter: 'blur(26px)',
          transformOrigin: 'top center',
          animation: 'nwSpotSweep 6.5s ease-in-out infinite',
          pointerEvents: 'none',
          mixBlendMode: 'screen',
        }} />

        {/* Particules or montantes (22) */}
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

        {/* Étincelles ✦ scintillantes (30) */}
        {twinkles.map((t, i) => {
          const anim = t.variant === 0 ? 'nwTwinkleA' : t.variant === 1 ? 'nwTwinkleB' : 'nwTwinkleC'
          return (
            <div key={`t-${i}`} style={{
              position: 'absolute',
              left: `${t.left}%`, top: `${t.top}%`,
              fontFamily: "'Cinzel',serif", fontSize: t.size,
              color: 'rgba(230,200,119,.65)',
              textShadow: '0 0 18px rgba(214,178,95,.6)',
              animation: `${anim} ${t.dur}s ease-in-out infinite, nwUp ${t.upDur}s ease-in-out infinite`,
              animationDelay: `${t.delay}s`,
              pointerEvents: 'none',
            }}>✦</div>
          )
        })}

        {/* Cadre présidentiel — double filet or + 4 losanges */}
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
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '80px 90px',
        }}>
          {/* Titre "VOTE ROI & REINE" — Cinzel 90px OR PLAT */}
          <div style={{
            fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 90,
            lineHeight: 1, letterSpacing: '.14em', textIndent: '.14em',
            color: '#E6C877',
            textShadow: '0 0 40px rgba(201,169,97,.5), 0 3px 6px rgba(0,0,0,.85)',
          }}>VOTE ROI &amp; REINE</div>

          {/* Filet or ✦ filet or */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 30, marginTop: 24,
          }}>
            <span style={{ width: 260, height: 2, background: 'rgba(214,178,95,.75)' }} />
            <span style={{
              fontFamily: "'Cinzel',serif", fontSize: 60, color: '#E6C877',
              animation: 'nwStarPulse 3s ease-in-out infinite',
            }}>✦</span>
            <span style={{ width: 260, height: 2, background: 'rgba(214,178,95,.75)' }} />
          </div>

          {/* HERO : QR + CTA (2 colonnes) */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 90, marginTop: 46,
          }}>
            {/* QR géant 440×440 */}
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'relative',
                width: 440, height: 440,
                padding: 26,
                background: '#F5E6C8',
                borderRadius: 12,
                animation: 'nwQrPulse 3.4s ease-in-out infinite',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {qrSvg ? (
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
                ) : qrUrl ? (
                  // FALLBACK CLIENT : génère le QR côté navigateur avec
                  // qrcode.react — MÊME URL que le PDF supports.
                  <QRCodeSVG
                    value={qrUrl}
                    size={396}
                    bgColor="#F5E6C8"
                    fgColor="#0A0A0A"
                    level="M"
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  // Placeholder ultime (aucun eventId dispo — cas très rare)
                  <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    border: '4px solid #C9A961',
                    borderRadius: 8,
                    color: '#7E662E',
                  }}>
                    <div style={{
                      fontFamily: "'Cinzel',serif", fontSize: 140, lineHeight: 1,
                    }}>▣</div>
                    <div style={{
                      fontFamily: "'Anton',sans-serif", fontSize: 62,
                      letterSpacing: '.14em', marginTop: 10,
                    }}>QR VOTE</div>
                  </div>
                )}
              </div>
            </div>

            {/* CTA droite — textes XXL uniquement (≥ 82px) */}
            <div style={{ textAlign: 'left', maxWidth: 720 }}>
              <div style={{
                fontFamily: "'Playfair Display',serif", fontStyle: 'italic',
                fontSize: 82, color: '#F5E6C8', lineHeight: 1.05,
                textShadow: '0 3px 12px rgba(0,0,0,.9)',
              }}>Scanne pour voter</div>
              <div style={{
                fontFamily: "'Great Vibes',cursive", fontSize: 140, lineHeight: .95,
                color: '#E6C877',
                textShadow: '0 0 60px rgba(201,169,97,.55), 0 3px 8px rgba(0,0,0,.85)',
                marginTop: 12,
              }}>ton Roi &amp; ta Reine</div>
            </div>
          </div>

          {/* COMPTEUR XXL — OR PLAT (pas de gradient text) */}
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'center',
            gap: 48, marginTop: 40,
          }}>
            <div style={{
              fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 96,
              letterSpacing: '.22em', textIndent: '.22em', color: '#E6C877',
              alignSelf: 'center',
              textShadow: '0 0 35px rgba(201,169,97,.5), 0 3px 8px rgba(0,0,0,.85)',
            }}>VOTES</div>
            <div style={{
              fontFamily: "'Anton',sans-serif", fontSize: 300, lineHeight: .85,
              textTransform: 'uppercase',
              color: '#E6C877',
              animation: 'nwCountGlow 6s ease-in-out infinite',
            }}>{votesFmt}</div>
          </div>
        </div>
      </div>
    </Stage>
  )
}
