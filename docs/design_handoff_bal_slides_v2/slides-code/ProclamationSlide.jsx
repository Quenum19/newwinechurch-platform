/**
 * Slide — Proclamation résultats Roi & Reine
 * Séquence orchestrée :
 *   1. SUSPENSE (5s) — pulsation "Résultats" + couronne qui grandit
 *   2. REVEAL ROI (7s) — carte roi + barre progressive de votes + confettis
 *   3. INTERLUDE (2s) — "Et maintenant… la REINE"
 *   4. REVEAL REINE (7s) — carte reine + barre progressive + confettis
 *   5. DUO FINAL (persistant) — les 2 côte à côte, ambiance royale
 */
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import GoldParticles from '../components/GoldParticles.jsx'

const PHASES = {
  SUSPENSE:     'suspense',
  INTERLUDE_1:  'interlude-1',
  REVEAL_ROI:   'reveal-roi',
  INTERLUDE_2:  'interlude-2',
  REVEAL_REINE: 'reveal-reine',
  DUO:          'duo',
}

// Timings en ms
const T = {
  SUSPENSE:     5000,
  INTERLUDE_1:  2000,
  REVEAL_ROI:   7000,
  INTERLUDE_2:  2500,
  REVEAL_REINE: 7000,
}

export default function ProclamationSlide({ state }) {
  const results = state?.results
  const [phase, setPhase] = useState(PHASES.SUSPENSE)

  useEffect(() => {
    setPhase(PHASES.SUSPENSE)
    const t1 = setTimeout(() => setPhase(PHASES.INTERLUDE_1), T.SUSPENSE)
    const t2 = setTimeout(() => setPhase(PHASES.REVEAL_ROI), T.SUSPENSE + T.INTERLUDE_1)
    const t3 = setTimeout(() => setPhase(PHASES.INTERLUDE_2), T.SUSPENSE + T.INTERLUDE_1 + T.REVEAL_ROI)
    const t4 = setTimeout(() => setPhase(PHASES.REVEAL_REINE), T.SUSPENSE + T.INTERLUDE_1 + T.REVEAL_ROI + T.INTERLUDE_2)
    const t5 = setTimeout(() => setPhase(PHASES.DUO), T.SUSPENSE + T.INTERLUDE_1 + T.REVEAL_ROI + T.INTERLUDE_2 + T.REVEAL_REINE)
    return () => { [t1, t2, t3, t4, t5].forEach(clearTimeout) }
  }, [results?.roi?.id, results?.reine?.id])

  const bg = 'linear-gradient(135deg, #0A0A0A 0%, #1a0f14 50%, #0A0A0A 100%)'

  return (
    <div style={{ position: 'absolute', inset: 0, background: bg, overflow: 'hidden' }}>
      <GoldParticles count={40} intensity={0.9}/>

      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3, padding: '4vh 4vw' }}>
        <AnimatePresence mode="wait">
          {phase === PHASES.SUSPENSE && <SuspensePhase key="s"/>}
          {phase === PHASES.INTERLUDE_1 && <InterludePhase key="i1" text="Et maintenant..." subtitle="Le Roi 2026"/>}
          {phase === PHASES.REVEAL_ROI && <RevealPhase key="r" winner={results?.roi} label="Roi 2026"/>}
          {phase === PHASES.INTERLUDE_2 && <InterludePhase key="i2" text="Et maintenant..." subtitle="La Reine 2026"/>}
          {phase === PHASES.REVEAL_REINE && <RevealPhase key="re" winner={results?.reine} label="Reine 2026"/>}
          {phase === PHASES.DUO && <DuoPhase key="d" roi={results?.roi} reine={results?.reine}/>}
        </AnimatePresence>
      </div>

      {/* Confettis dorés — visibles sur reveal + duo */}
      {(phase === PHASES.REVEAL_ROI || phase === PHASES.REVEAL_REINE || phase === PHASES.DUO) && <Confetti/>}
    </div>
  )
}

// ─── PHASE 1 : SUSPENSE ────────────────────────────────────────

function SuspensePhase() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.15 }}
      transition={{ duration: 0.6 }}
      style={{ textAlign: 'center' }}
    >
      <motion.p
        animate={{ letterSpacing: ['0.4em', '1em', '0.4em'] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          fontFamily: '"Playfair Display", serif',
          fontStyle: 'italic',
          fontSize: 'clamp(2rem, 4vw, 4rem)',
          color: '#C9A961',
          textTransform: 'uppercase',
          margin: 0,
        }}
      >
        Résultats
      </motion.p>
      <motion.div
        animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          fontSize: 'clamp(10rem, 18vw, 20rem)',
          color: '#F5E6C8',
          textShadow: '0 0 80px rgba(201, 169, 97, 0.8), 0 0 160px rgba(201, 169, 97, 0.4)',
          marginTop: '2rem',
          fontFamily: '"Anton", sans-serif',
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        👑
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
        style={{
          fontFamily: '"Playfair Display", serif',
          fontStyle: 'italic',
          fontSize: 'clamp(1.2rem, 2vw, 2rem)',
          color: '#F5E6C8',
          opacity: 0.8,
          marginTop: '2rem',
          letterSpacing: '0.3em',
        }}
      >
        Le suspense est à son comble...
      </motion.p>
    </motion.div>
  )
}

// ─── PHASE 2 & 4 : INTERLUDE ───────────────────────────────────

function InterludePhase({ text, subtitle }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.8 }}
      style={{ textAlign: 'center' }}
    >
      <motion.p
        initial={{ opacity: 0, letterSpacing: '0.1em' }}
        animate={{ opacity: 1, letterSpacing: '0.4em' }}
        transition={{ duration: 1.2 }}
        style={{
          fontFamily: '"Playfair Display", serif',
          fontStyle: 'italic',
          fontSize: 'clamp(2.5rem, 5vw, 5rem)',
          color: '#F5E6C8',
          textShadow: '0 0 30px rgba(201, 169, 97, 0.4)',
          margin: 0,
        }}
      >
        {text}
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        style={{
          fontFamily: '"Playfair Display", serif',
          fontSize: 'clamp(2rem, 3.5vw, 3.5rem)',
          color: '#C9A961',
          marginTop: '1rem',
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}
      >
        {subtitle}
      </motion.p>
    </motion.div>
  )
}

// ─── PHASE 3 & 5 : REVEAL ──────────────────────────────────────

function RevealPhase({ winner, label }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!winner) return
    // Progression 0 → 100% en 3s, boum à la fin
    let raf
    const start = performance.now()
    const tick = (now) => {
      const elapsed = now - start
      const p = Math.min(elapsed / 3000, 1)
      // Ease-out cubic pour un effet "arrivée en trombe puis stabilise"
      const eased = 1 - Math.pow(1 - p, 3)
      setProgress(eased * 100)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [winner?.id])

  if (!winner) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ textAlign: 'center', color: '#8B7960', fontStyle: 'italic', fontSize: '1.5rem' }}
      >
        Aucun vote pour {label}
      </motion.div>
    )
  }

  const votes = winner.votes ?? 0
  const displayedVotes = Math.round((votes * progress) / 100)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', width: 'min(700px, 80vw)' }}
    >
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{
          fontFamily: '"Playfair Display", serif',
          fontSize: 'clamp(2rem, 3.2vw, 3.2rem)',
          color: '#C9A961',
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          margin: 0,
        }}
      >
        {label}
      </motion.p>

      {/* Photo avec halo pulsant */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.3, duration: 1, ease: 'backOut' }}
        style={{ position: 'relative' }}
      >
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.15, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: '-30px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201, 169, 97, 0.55) 0%, transparent 70%)',
          }}
        />
        {winner.photo_url ? (
          <img
            src={winner.photo_url}
            alt=""
            style={{
              position: 'relative',
              width: 'clamp(220px, 30vw, 320px)',
              height: 'clamp(220px, 30vw, 320px)',
              objectFit: 'cover',
              borderRadius: '50%',
              border: '6px solid #C9A961',
              boxShadow: '0 0 80px rgba(201, 169, 97, 0.8)',
            }}
          />
        ) : (
          <div style={{
            position: 'relative',
            width: 'clamp(220px, 30vw, 320px)',
            height: 'clamp(220px, 30vw, 320px)',
            borderRadius: '50%',
            background: '#8B1A2F',
            border: '6px solid #C9A961',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'clamp(5rem, 10vw, 10rem)',
          }}>
            👑
          </div>
        )}
      </motion.div>

      {/* Nom en grand */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.8 }}
        style={{
          fontFamily: '"Playfair Display", serif',
          fontSize: 'clamp(3.5rem, 7vw, 7rem)',
          color: '#F5E6C8',
          fontWeight: 700,
          margin: 0,
          textShadow: '0 0 40px rgba(201, 169, 97, 0.6)',
          lineHeight: 1,
        }}
      >
        {winner.first_name} {winner.last_name}
      </motion.h1>

      {/* Barre de progression des votes qui monte */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.6 }}
        style={{ width: '100%' }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '0.6rem',
          fontFamily: '"Playfair Display", serif',
        }}>
          <span style={{
            fontSize: 'clamp(1rem, 1.4vw, 1.4rem)',
            color: '#C9A961',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}>
            Votes reçus
          </span>
          <motion.span
            style={{
              fontSize: 'clamp(2.5rem, 4.5vw, 4.5rem)',
              color: '#F5E6C8',
              fontWeight: 900,
              fontVariantNumeric: 'tabular-nums',
              fontFamily: '"Anton", sans-serif',
              lineHeight: 1,
              textShadow: '0 0 20px rgba(201, 169, 97, 0.6)',
            }}
          >
            {displayedVotes}
          </motion.span>
        </div>
        <div style={{
          height: '18px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '9px',
          overflow: 'hidden',
          border: '1.5px solid rgba(201, 169, 97, 0.4)',
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #C9A961 0%, #F5E6C8 50%, #C9A961 100%)',
            boxShadow: '0 0 20px rgba(201, 169, 97, 0.9)',
            transition: 'width 60ms linear',
          }}/>
        </div>
      </motion.div>

      {/* Étoiles finales quand progress atteint 100% */}
      {progress >= 99 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 8 }}
          style={{
            fontSize: 'clamp(2rem, 4vw, 4rem)',
            color: '#C9A961',
            letterSpacing: '1.5rem',
          }}
        >
          ★ ★ ★
        </motion.div>
      )}
    </motion.div>
  )
}

// ─── PHASE 6 : DUO FINAL ───────────────────────────────────────

function DuoPhase({ roi, reine }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '4vw',
        alignItems: 'center',
        width: '100%',
      }}
    >
      {[
        { data: roi, label: 'Roi 2026' },
        { data: reine, label: 'Reine 2026' },
      ].map(({ data: w, label }, idx) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: idx * 0.35, ease: 'backOut' }}
          style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}
        >
          <p style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: 'clamp(1.5rem, 2.4vw, 2.4rem)',
            color: '#C9A961',
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            margin: 0,
          }}>
            {label}
          </p>

          {w?.photo_url ? (
            <img
              src={w.photo_url}
              alt=""
              style={{
                width: 'clamp(180px, 22vw, 260px)',
                height: 'clamp(180px, 22vw, 260px)',
                objectFit: 'cover',
                borderRadius: '50%',
                border: '5px solid #C9A961',
                boxShadow: '0 0 60px rgba(201, 169, 97, 0.7)',
              }}
            />
          ) : (
            <div style={{
              width: 'clamp(180px, 22vw, 260px)',
              height: 'clamp(180px, 22vw, 260px)',
              borderRadius: '50%',
              background: '#8B1A2F',
              border: '5px solid #C9A961',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'clamp(4rem, 8vw, 8rem)',
            }}>
              👑
            </div>
          )}

          <h1 style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: 'clamp(2.5rem, 5vw, 5rem)',
            color: '#F5E6C8',
            fontWeight: 700,
            margin: 0,
            textShadow: '0 0 30px rgba(201, 169, 97, 0.5)',
            lineHeight: 1,
          }}>
            {w?.first_name} {w?.last_name}
          </h1>

          <p style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: 'clamp(1.1rem, 1.6vw, 1.6rem)',
            color: '#C9A961',
            margin: 0,
          }}>
            {w?.votes ?? 0} vote{(w?.votes ?? 0) > 1 ? 's' : ''}
          </p>
        </motion.div>
      ))}
    </motion.div>
  )
}

// ─── Confettis dorés (chute lente) ────────────────────────────

function Confetti() {
  const pieces = Array.from({ length: 24 }).map((_, i) => ({
    id: i,
    left: (i * 7 + (i % 3) * 5) % 100,
    delay: (i * 0.15) % 3,
    duration: 3 + (i % 4),
    size: 6 + (i % 4) * 2,
    color: i % 3 === 0 ? '#C9A961' : i % 3 === 1 ? '#F5E6C8' : '#B08A3F',
    rotation: (i * 43) % 360,
  }))

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4, overflow: 'hidden' }}>
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: '-10vh', opacity: 0, rotate: 0 }}
          animate={{ y: '110vh', opacity: [0, 1, 1, 0], rotate: p.rotation + 720 }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 1.6}px`,
            background: p.color,
            boxShadow: `0 0 10px ${p.color}`,
          }}
        />
      ))}
    </div>
  )
}
