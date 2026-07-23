/**
 * ==============================================================
 *  GoldParticles — Particules dorées scintillantes en fond
 *
 *  Rendu léger 100% CSS/Framer Motion, pas de canvas :
 *  - N particules positionnées aléatoirement (memoized)
 *  - Chaque particule : opacité + translateY qui pulsent en boucle
 *  - GPU-friendly (transform + opacity uniquement)
 *  - Adaptatif : le nombre de particules est passable en prop
 * ==============================================================
 */
import { useMemo } from 'react'
import { motion } from 'framer-motion'

/**
 * @param {object} props
 * @param {number} [props.count=40] — Nombre de particules
 * @param {number} [props.intensity=1] — Multiplicateur d'opacité (0 à 2)
 */
export default function GoldParticles({ count = 40, intensity = 1 }) {
  // Positions/tailles/durées calculées une fois (évite le re-render à chaque frame).
  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 4 + 2, // 2-6 px
        duration: Math.random() * 4 + 3, // 3-7s
        delay: Math.random() * 5,
        travel: Math.random() * 60 + 40, // 40-100px de déplacement vertical
      })),
    [count]
  )

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 0 }}
          animate={{
            opacity: [0, 0.9 * intensity, 0],
            y: [-p.travel, p.travel],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(201,169,97,1) 0%, rgba(201,169,97,0.5) 50%, transparent 100%)',
            boxShadow: '0 0 8px rgba(201,169,97,0.8)',
          }}
        />
      ))}
    </div>
  )
}
