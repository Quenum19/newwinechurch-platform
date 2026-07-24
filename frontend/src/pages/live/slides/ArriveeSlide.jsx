import { useEffect, useMemo, useRef, useState } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * ArriveeSlide V3 — Compteur d'arrivées XXL, charte LED-safe (base MurStars).
 * ------------------------------------------------------------------
 * Charte STRICTE écran LED :
 *   - Fond radial ambré identique MurStars — JAMAIS de rouge/bordeaux
 *     (le rouge cramé passe magenta sur LED d'église).
 *   - Palette : or plat #E6C877, highlights #FFE9A8/#EECF80, ivoire #F5E6C8.
 *   - Tailles XXL pour lisibilité longue distance : compteur Anton 400px,
 *     libellés Cinzel 44–60px, nom du dernier arrivé Anton 96px, message
 *     Playfair italic 46px. Aucun texte < 32px.
 *
 * Composition :
 *   - Anneau or plat 720×720 autour du compteur (progression fluide
 *     synchronisée avec le count-up 1200ms ease-out cubic).
 *   - Compteur central gradient or "sur X invités attendus".
 *   - Ligne "DERNIER ARRIVÉ" encadrée de deux dots or pulsants + filets or.
 *   - Nom du dernier arrivé Anton 96px ivoire (léger float).
 *   - Message tournant (5s) Playfair italic — fade-in via keyframe & key.
 *
 * Ambiance MurStars : 2 projecteurs balayants (nwSpotSweep), 22 particules
 * or montantes (nwRise), cadre présidentiel double filet + 4 losanges 20×20.
 * Aucune framer-motion, uniquement CSS.
 */
export default function ArriveeSlide({ state }) {
  const stats = state?.stats ?? {}

  const target = Number(stats.arrivees_count ?? 0)
  const totalExpected = Number(stats.total_expected ?? 200)

  // latest_arrival tolérant : string OU objet { full_name, arrived_at }
  const rawLatest = stats.latest_arrival
  const latestArrival = useMemo(() => {
    if (!rawLatest) return null
    if (typeof rawLatest === 'string') return rawLatest.trim() || null
    return (rawLatest.full_name ?? '').trim() || null
  }, [rawLatest])

  // Messages tournants (fallback élégant si rien fourni)
  const messages = useMemo(() => {
    const msgs = state?.messages
    if (Array.isArray(msgs) && msgs.length > 0) return msgs
    return ['Bienvenue à toutes et à tous']
  }, [state?.messages])

  // ---------- Count-up 1200ms ease-out cubic (relance à chaque update de target) ----------
  const [count, setCount] = useState(0)
  const rafRef = useRef(null)
  const fromRef = useRef(0)
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const start = fromRef.current
    const t0 = performance.now()
    const dur = 1200
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur)
      const e = 1 - Math.pow(1 - k, 3) // ease-out cubic
      const v = Math.round(start + (target - start) * e)
      setCount(v)
      if (k < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target])

  // ---------- Rotation messages toutes les 5000ms ----------
  const [msgIdx, setMsgIdx] = useState(0)
  useEffect(() => {
    if (messages.length <= 1) return
    const iv = setInterval(() => setMsgIdx((i) => i + 1), 5000)
    return () => clearInterval(iv)
  }, [messages.length])

  // ---------- Anneau or plat (SVG) synchronisé avec count-up ----------
  const RING_R = 344
  const ringCirc = 2 * Math.PI * RING_R
  const currentRatio = totalExpected > 0
    ? Math.max(0, Math.min(1, count / totalExpected))
    : 0
  const ringOffset = ringCirc * (1 - currentRatio)

  // ---------- 22 particules or montantes (positions déterministes) ----------
  const particles = useMemo(() => {
    const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x) }
    return Array.from({ length: 22 }, (_, i) => {
      const size = 2 + rnd(i * 1.3) * 4
      const left = rnd(i * 2.1) * 100
      const dur = 9 + rnd(i * 3.7) * 10
      const delay = -rnd(i * 5.2) * dur
      const startY = 200 + rnd(i * 1.9) * 880
      return { size, left, dur, delay, startY }
    })
  }, [])

  const cornerBase = {
    position: 'absolute', width: 20, height: 20,
    background: '#E6C877', transform: 'rotate(45deg)',
    boxShadow: '0 0 12px rgba(214,178,95,.7)',
  }

  const countDisplay = count.toLocaleString('fr-FR')
  const totalDisplay = totalExpected.toLocaleString('fr-FR')
  const currentMsg = messages[msgIdx % messages.length]

  return (
    <Stage>
      <style>{`
        @keyframes nwRise { 0%{transform:translateY(20px);opacity:0} 12%{opacity:.9} 88%{opacity:.9} 100%{transform:translateY(-1080px);opacity:0} }
        @keyframes nwSpotSweepA { 0%,100%{transform:translateX(-50%) rotate(-22deg); opacity:.55} 50%{transform:translateX(-50%) rotate(22deg); opacity:.85} }
        @keyframes nwSpotSweepC { 0%,100%{transform:translateX(-50%) rotate(-18deg); opacity:.5} 50%{transform:translateX(-50%) rotate(18deg); opacity:.8} }
        @keyframes nwRingGlow { 0%,100%{filter:drop-shadow(0 0 10px rgba(230,200,119,.5))} 50%{filter:drop-shadow(0 0 22px rgba(230,200,119,.85))} }
        @keyframes nwCountGlow { 0%,100%{text-shadow:0 0 70px rgba(201,169,97,.4),0 3px 6px rgba(0,0,0,.7); filter:brightness(.98)} 50%{text-shadow:0 0 150px rgba(201,169,97,.75),0 3px 6px rgba(0,0,0,.7); filter:brightness(1.08)} }
        @keyframes nwPulseDot { 0%,100%{transform:scale(1); box-shadow:0 0 14px rgba(230,200,119,.75)} 50%{transform:scale(1.4); box-shadow:0 0 28px rgba(230,200,119,1)} }
        @keyframes nwFloatSlow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes nwMsgIn { 0%{opacity:0; transform:translateY(12px)} 45%{opacity:1; transform:none} 100%{opacity:1; transform:none} }
      `}</style>

      <div style={{
        position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
        background: '#0A0A0A', color: '#F5E6C8', fontFamily: "'Cormorant Garamond',serif",
      }}>
        {/* Fond radial ambré — copie exacte MurStars (JAMAIS de rouge) */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 100% at 50% 40%, #211a10 0%, #0d0a06 56%, #060402 100%)',
        }} />

        {/* Projecteurs balayants gauche + droite (screen blend, blur 22px) */}
        <div style={{
          position: 'absolute', top: -80, left: '22%',
          width: 460, height: 1400,
          background: 'linear-gradient(180deg, rgba(238,207,128,.32) 0%, rgba(230,200,119,.16) 35%, rgba(214,178,95,.05) 70%, transparent 100%)',
          filter: 'blur(22px)',
          transformOrigin: 'top center',
          animation: 'nwSpotSweepA 5s ease-in-out infinite',
          pointerEvents: 'none', mixBlendMode: 'screen',
        }} />
        <div style={{
          position: 'absolute', top: -80, left: '78%',
          width: 440, height: 1400,
          background: 'linear-gradient(180deg, rgba(238,207,128,.3) 0%, rgba(230,200,119,.14) 35%, rgba(214,178,95,.05) 70%, transparent 100%)',
          filter: 'blur(22px)',
          transformOrigin: 'top center',
          animation: 'nwSpotSweepC 4.4s ease-in-out infinite',
          pointerEvents: 'none', mixBlendMode: 'screen',
        }} />

        {/* 22 particules or montantes */}
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

        {/* Cadre présidentiel double filet or + 4 losanges 20×20 */}
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

        {/* Bloc central : ring + counter, dernier arrivé, message */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', gap: 24, padding: '48px 80px',
        }}>
          {/* ---------- Anneau or plat 720×720 + compteur XXL ---------- */}
          <div style={{
            position: 'relative', width: 720, height: 720,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg viewBox="0 0 720 720" style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              transform: 'rotate(-90deg)',
              animation: 'nwRingGlow 4s ease-in-out infinite',
            }}>
              {/* Fond de piste discret */}
              <circle cx="360" cy="360" r={RING_R}
                fill="none" stroke="rgba(214,178,95,.16)" strokeWidth="8" />
              {/* Progression or plat (pas de dégradé — LED-safe) */}
              <circle cx="360" cy="360" r={RING_R}
                fill="none" stroke="#E6C877" strokeWidth="14" strokeLinecap="round"
                strokeDasharray={ringCirc.toFixed(1)}
                strokeDashoffset={ringOffset.toFixed(1)}
                style={{ transition: 'stroke-dashoffset .35s linear' }}
              />
            </svg>

            {/* Contenu central de l'anneau */}
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              lineHeight: 1,
            }}>
              {/* Compteur XXL Anton 400 (gradient or) */}
              <div style={{
                fontFamily: "'Anton',sans-serif",
                fontSize: 400, lineHeight: 0.86,
                background: 'linear-gradient(180deg,#FFF6D8,#E6C877 48%,#C9A961 66%,#8a6d2f)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'nwCountGlow 5s ease-in-out infinite',
                letterSpacing: '.005em',
              }}>{countDisplay}</div>

              {/* Libellé "ARRIVÉES" Cinzel 60 or highlight */}
              <div style={{
                fontFamily: "'Cinzel',serif", fontWeight: 700,
                fontSize: 60, letterSpacing: '.14em', textIndent: '.14em',
                color: '#EECF80',
                textShadow: '0 0 30px rgba(201,169,97,.5)',
                marginTop: 10,
              }}>ARRIVÉES</div>

              {/* "SUR X ATTENDUS" Cinzel 34 (jamais < 32px) */}
              <div style={{
                fontFamily: "'Cinzel',serif", fontWeight: 500,
                fontSize: 34, letterSpacing: '.22em', textIndent: '.22em',
                color: '#D9CBB0',
                marginTop: 8,
              }}>SUR {totalDisplay} ATTENDUS</div>
            </div>
          </div>

          {/* ---------- Dernier arrivé ---------- */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 4,
          }}>
            {/* Ligne label : filet or + dot pulsant + LABEL + dot + filet or */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 22,
            }}>
              <span style={{ width: 120, height: 2, background: 'rgba(214,178,95,.7)' }} />
              <span style={{
                width: 14, height: 14, borderRadius: '50%',
                background: '#E6C877',
                animation: 'nwPulseDot 1.8s ease-in-out infinite',
              }} />
              <span style={{
                fontFamily: "'Cinzel',serif", fontWeight: 700,
                fontSize: 44, letterSpacing: '.28em', textIndent: '.28em',
                color: '#E6C877',
                textShadow: '0 0 30px rgba(201,169,97,.5)',
              }}>DERNIER ARRIVÉ</span>
              <span style={{
                width: 14, height: 14, borderRadius: '50%',
                background: '#E6C877',
                animation: 'nwPulseDot 1.8s ease-in-out infinite .9s',
              }} />
              <span style={{ width: 120, height: 2, background: 'rgba(214,178,95,.7)' }} />
            </div>

            {/* Nom Anton 96 ivoire (float doux) */}
            <div style={{
              fontFamily: "'Anton',sans-serif",
              fontSize: 96, lineHeight: 1.02,
              color: '#F5E6C8',
              letterSpacing: '.01em', textTransform: 'uppercase',
              textShadow: '0 0 40px rgba(245,230,200,.35), 0 3px 6px rgba(0,0,0,.75)',
              maxWidth: 1600,
              overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              animation: 'nwFloatSlow 4s ease-in-out infinite',
            }}>
              {latestArrival ?? 'En attente…'}
            </div>
          </div>

          {/* ---------- Message tournant Playfair italic 46 ---------- */}
          <div
            key={msgIdx}
            style={{
              fontFamily: "'Playfair Display',serif", fontStyle: 'italic',
              fontSize: 46, lineHeight: 1.15,
              color: '#F0E6CF',
              textShadow: '0 0 24px rgba(201,169,97,.25)',
              animation: 'nwMsgIn .8s ease',
              minHeight: 54,
              maxWidth: 1500,
            }}
          >{currentMsg}</div>
        </div>
      </div>
    </Stage>
  )
}
