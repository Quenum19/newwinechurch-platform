import { useEffect, useMemo, useRef, useState } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * ArriveeSlide V2 — Compteur d'arrivées cinématique.
 * Fond cover (state.event.cover_image) très flouté + scrims radiaux dark rouge/or.
 * Anneau or animé (SVG dashoffset qui se remplit selon ratio arrivees / total_expected).
 * Compteur XXL Anton 300px (gold gradient text), count-up 1600ms cubic ease-out.
 * Pill "Dernier arrivé" avec burst ring + halo, message tournant Playfair italic (5s).
 * 20 particules or montantes, cadre double filet + losanges aux coins, projecteur balayant 9s.
 */
export default function ArriveeSlide({ state }) {
  const event = state?.event ?? {}
  const stats = state?.stats ?? {}
  const cover = event.cover_image ?? ''
  const hasCover = !!cover

  // target : nombre courant d'arrivées (avec fallback élégant)
  const target = stats.arrivees_count ?? 0
  const totalExpected = stats.total_expected ?? 200

  // latest_arrival peut être soit une string, soit un objet { full_name, arrived_at }
  const rawLatest = stats.latest_arrival
  const latestArrival = useMemo(() => {
    if (!rawLatest) return '—'
    if (typeof rawLatest === 'string') return rawLatest
    return rawLatest.full_name ?? '—'
  }, [rawLatest])

  // messages tournants (fallback élégant si rien fourni)
  const messages = useMemo(() => {
    const msgs = state?.messages
    if (Array.isArray(msgs) && msgs.length > 0) return msgs
    return [
      "La salle se remplit d'élégance…",
      'Chaque invité est une étoile de la soirée',
      'Bienvenue dans la nuit de tous les prestiges',
      'Le gala peut commencer à briller',
    ]
  }, [state?.messages])

  // ------- Count-up animé (1600ms, ease-out cubic) -------
  const [count, setCount] = useState(0)
  const rafRef = useRef(null)
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const t0 = performance.now()
    const dur = 1600
    const startVal = 0
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur)
      const e = 1 - Math.pow(1 - k, 3)
      setCount(Math.round(startVal + (target - startVal) * e))
      if (k < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target])

  // ------- Rotation messages toutes les 5000ms -------
  const [msgIdx, setMsgIdx] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => setMsgIdx((i) => i + 1), 5000)
    return () => clearInterval(iv)
  }, [])

  // ------- Anneau or (SVG) -------
  const ringCirc = 2 * Math.PI * 288
  const ratio = Math.max(0, Math.min(1, totalExpected > 0 ? target / totalExpected : 0))
  const ringOffset = ringCirc * (1 - ratio)

  // ------- Particules or (20, positions déterministes via sinus) -------
  const particles = useMemo(() => {
    const rnd = (s) => {
      const x = Math.sin(s) * 10000
      return x - Math.floor(x)
    }
    return Array.from({ length: 20 }, (_, i) => {
      const size = 2 + rnd(i * 1.3) * 3
      const left = rnd(i * 2.1) * 100
      const dur = 10 + rnd(i * 3.7) * 9
      const delay = -rnd(i * 5.2) * dur
      const y = 200 + rnd(i * 1.9) * 760
      return { size, left, dur, delay, y }
    })
  }, [])

  // ------- Losanges aux coins -------
  const cornerBase = {
    position: 'absolute',
    width: 14,
    height: 14,
    background: '#E6C877',
    transform: 'rotate(45deg)',
    boxShadow: '0 0 8px rgba(214,178,95,.6)',
  }

  const countDisplay = count.toLocaleString('fr-FR')

  return (
    <Stage>
      <style>{`
        @keyframes nwRise { 0%{transform:translateY(20px);opacity:0} 12%{opacity:.9} 88%{opacity:.9} 100%{transform:translateY(-1080px);opacity:0} }
        @keyframes nwHeart { 0%,100%{transform:scale(1)} 8%{transform:scale(1.045)} 16%{transform:scale(1)} 24%{transform:scale(1.03)} 32%{transform:scale(1)} }
        @keyframes nwSweep { 0%{transform:translateX(-60%) skewX(-12deg);opacity:0} 30%{opacity:.55} 70%{opacity:.55} 100%{transform:translateX(160%) skewX(-12deg);opacity:0} }
        @keyframes nwBurst { 0%{transform:scale(.6);opacity:0} 30%{opacity:.9} 100%{transform:scale(1.9);opacity:0} }
        @keyframes nwPillIn { 0%{transform:translateY(14px);opacity:0} 100%{transform:translateY(0);opacity:1} }
        @keyframes nwRingGlow { 0%,100%{filter:drop-shadow(0 0 6px rgba(230,200,119,.45))} 50%{filter:drop-shadow(0 0 16px rgba(230,200,119,.8))} }
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
        {/* Cover floutée (si dispo) */}
        {hasCover && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url("${cover}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(22px) brightness(.34) saturate(1.1)',
            transform: 'scale(1.15)',
          }} />
        )}

        {/* Scrim radial principal (dark rouge/or) */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(120% 100% at 50% 30%, #1a0f14 0%, #0d0a06 58%, #060402 100%)',
        }} />
        {/* Vignette centre */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(60% 55% at 50% 46%, transparent 46%, rgba(0,0,0,.68) 100%)',
        }} />

        {/* Projecteur balayant */}
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: '40%',
          background: 'linear-gradient(90deg, transparent, rgba(230,200,119,.10), transparent)',
          animation: 'nwSweep 9s ease-in-out infinite',
        }} />

        {/* Particules or montantes */}
        {particles.map((p, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: p.y,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: 'radial-gradient(circle,#FFE9A8,rgba(201,169,97,.1))',
            boxShadow: `0 0 ${p.size * 3}px rgba(230,200,119,.6)`,
            animation: `nwRise ${p.dur}s linear infinite`,
            animationDelay: `${p.delay}s`,
            pointerEvents: 'none',
          }} />
        ))}

        {/* Cadre double filet */}
        <div style={{
          position: 'absolute',
          inset: 22,
          border: '2px solid rgba(214,178,95,.9)',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,.3)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          inset: 30,
          border: '1px solid rgba(214,178,95,.5)',
          pointerEvents: 'none',
        }} />
        {/* Losanges 4 coins */}
        <div style={{ ...cornerBase, top: 44, left: 44 }} />
        <div style={{ ...cornerBase, top: 44, right: 44 }} />
        <div style={{ ...cornerBase, bottom: 44, left: 44 }} />
        <div style={{ ...cornerBase, bottom: 44, right: 44 }} />

        {/* Bloc central */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          {/* Eyebrow */}
          <div style={{
            fontFamily: "'Cinzel',serif",
            fontWeight: 600,
            fontSize: 34,
            letterSpacing: '.52em',
            textIndent: '.52em',
            color: '#E6C877',
          }}>ILS SONT ARRIVÉS</div>

          {/* Compteur + anneau */}
          <div style={{
            position: 'relative',
            width: 620,
            height: 620,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '6px 0',
          }}>
            <svg viewBox="0 0 620 620" style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              transform: 'rotate(-90deg)',
              animation: 'nwRingGlow 4s ease-in-out infinite',
            }}>
              <circle cx="310" cy="310" r="288" fill="none" stroke="rgba(214,178,95,.14)" strokeWidth="6" />
              <circle
                cx="310"
                cy="310"
                r="288"
                fill="none"
                stroke="url(#nwGold)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={ringCirc.toFixed(1)}
                strokeDashoffset={ringOffset.toFixed(1)}
                style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.16,1,.3,1)' }}
              />
              <defs>
                <linearGradient id="nwGold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFE9A8" />
                  <stop offset="1" stopColor="#C9A961" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              animation: 'nwHeart 3.2s ease-in-out infinite',
            }}>
              <div style={{
                fontFamily: "'Anton',sans-serif",
                fontSize: 300,
                lineHeight: 0.9,
                color: '#ECCE7D',
                background: 'linear-gradient(180deg,#FFE9A8,#E6C877 55%,#B08A3F)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 90px rgba(201,169,97,.4)',
              }}>{countDisplay}</div>
              <div style={{
                fontFamily: "'Cinzel',serif",
                fontWeight: 600,
                fontSize: 30,
                letterSpacing: '.3em',
                textIndent: '.3em',
                color: '#D9CBB0',
                marginTop: -6,
              }}>/ {totalExpected} INVITÉS ATTENDUS</div>
            </div>
          </div>

          {/* Dernier arrivé */}
          <div style={{ position: 'relative', marginTop: 8 }}>
            <div style={{
              position: 'absolute',
              inset: -6,
              borderRadius: 999,
              border: '2px solid rgba(230,200,119,.6)',
              animation: 'nwBurst 3.2s ease-out infinite',
            }} />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '14px 34px',
              borderRadius: 999,
              background: 'linear-gradient(180deg, rgba(139,26,47,.5), rgba(95,23,32,.5))',
              border: '1px solid rgba(214,178,95,.7)',
              boxShadow: '0 0 30px rgba(0,0,0,.4)',
              animation: 'nwPillIn .8s ease',
            }}>
              <span style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#E6C877',
                boxShadow: '0 0 14px rgba(230,200,119,1)',
              }} />
              <span style={{
                fontFamily: "'Cinzel',serif",
                fontWeight: 600,
                fontSize: 26,
                letterSpacing: '.26em',
                textIndent: '.26em',
                color: '#F3E2B6',
              }}>DERNIER ARRIVÉ</span>
              <span style={{
                width: 1,
                height: 34,
                background: 'rgba(214,178,95,.5)',
              }} />
              <span style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 40,
                color: '#F5E6C8',
              }}>{latestArrival}</span>
            </div>
          </div>

          {/* Message tournant */}
          <div style={{
            fontFamily: "'Playfair Display',serif",
            fontStyle: 'italic',
            fontSize: 38,
            color: '#F0E6CF',
            marginTop: 34,
            opacity: 0.9,
            minHeight: 48,
          }}>{messages[msgIdx % messages.length]}</div>
        </div>
      </div>
    </Stage>
  )
}
