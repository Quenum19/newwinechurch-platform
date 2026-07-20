/**
 * Slide — Proclamation résultats Roi & Reine (suspense + reveal).
 */
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import GoldParticles from '../components/GoldParticles.jsx'

export default function ProclamationSlide({ state }) {
  const results = state?.results
  const [phase, setPhase] = useState('suspense') // 'suspense' | 'reveal-roi' | 'reveal-reine'

  useEffect(() => {
    setPhase('suspense')
    const t1 = setTimeout(() => setPhase('reveal-roi'), 3500)
    const t2 = setTimeout(() => setPhase('reveal-reine'), 7000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [results?.roi?.id, results?.reine?.id])

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0A0A0A 0%, #1a0f14 50%, #0A0A0A 100%)', overflow: 'hidden' }}>
      <GoldParticles count={100} />

      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3, padding: '4vh 4vw' }}>
        <AnimatePresence mode="wait">
          {phase === 'suspense' && (
            <motion.div
              key="suspense"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.5 }}
              style={{ textAlign: 'center' }}
            >
              <motion.p
                animate={{ letterSpacing: ['0.5em', '1em', '0.5em'] }}
                transition={{ duration: 3, repeat: Infinity }}
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
                initial={{ scale: 3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1, delay: 1 }}
                style={{
                  fontSize: 'clamp(8rem, 15vw, 16rem)',
                  color: '#F5E6C8',
                  textShadow: '0 0 60px rgba(201, 169, 97, 0.6)',
                  marginTop: '2rem',
                  fontFamily: '"Anton", sans-serif',
                  fontWeight: 900,
                }}
              >
                👑
              </motion.div>
            </motion.div>
          )}

          {phase === 'reveal-roi' && results?.roi && (
            <motion.div
              key="roi"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}
            >
              <p style={{
                fontFamily: '"Playfair Display", serif',
                fontSize: 'clamp(2rem, 3vw, 3rem)',
                color: '#C9A961',
                letterSpacing: '0.4em',
                textTransform: 'uppercase',
                margin: 0,
              }}>Roi 2026</p>

              {results.roi.photo_url ? (
                <img
                  src={results.roi.photo_url}
                  alt={results.roi.first_name}
                  style={{
                    width: '280px', height: '280px',
                    objectFit: 'cover', borderRadius: '50%',
                    border: '6px solid #C9A961',
                    boxShadow: '0 0 80px rgba(201, 169, 97, 0.8)',
                  }}
                />
              ) : (
                <div style={{
                  width: '280px', height: '280px', borderRadius: '50%',
                  background: '#8B1A2F', border: '6px solid #C9A961',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#F5E6C8', fontSize: '6rem', fontWeight: 700,
                }}>
                  👑
                </div>
              )}

              <h1 style={{
                fontFamily: '"Playfair Display", serif',
                fontSize: 'clamp(4rem, 8vw, 8rem)',
                color: '#F5E6C8',
                fontWeight: 700,
                margin: 0,
                textShadow: '0 0 40px rgba(201, 169, 97, 0.6)',
              }}>
                {results.roi.first_name} {results.roi.last_name}
              </h1>

              <p style={{
                fontFamily: '"Playfair Display", serif',
                fontSize: '1.5rem',
                color: '#C9A961',
                margin: 0,
              }}>
                {results.roi.votes} vote{results.roi.votes > 1 ? 's' : ''}
              </p>
            </motion.div>
          )}

          {phase === 'reveal-reine' && (
            <motion.div
              key="reveal-both"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4vw', alignItems: 'center', width: '100%' }}
            >
              {['roi', 'reine'].map((role) => {
                const w = results?.[role]
                if (!w) return <div key={role}/>
                return (
                  <motion.div
                    key={role}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: role === 'reine' ? 0.3 : 0 }}
                    style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}
                  >
                    <p style={{
                      fontFamily: '"Playfair Display", serif',
                      fontSize: 'clamp(1.5rem, 2.4vw, 2.4rem)',
                      color: '#C9A961',
                      letterSpacing: '0.4em',
                      textTransform: 'uppercase',
                      margin: 0,
                    }}>{role === 'roi' ? 'Roi 2026' : 'Reine 2026'}</p>

                    {w.photo_url ? (
                      <img
                        src={w.photo_url}
                        alt={w.first_name}
                        style={{
                          width: '220px', height: '220px',
                          objectFit: 'cover', borderRadius: '50%',
                          border: '5px solid #C9A961',
                          boxShadow: '0 0 60px rgba(201, 169, 97, 0.7)',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '220px', height: '220px', borderRadius: '50%',
                        background: '#8B1A2F', border: '5px solid #C9A961',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#F5E6C8', fontSize: '5rem', fontWeight: 700,
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
                      {w.first_name} {w.last_name}
                    </h1>

                    <p style={{
                      fontFamily: '"Playfair Display", serif',
                      fontSize: '1.2rem',
                      color: '#C9A961',
                      margin: 0,
                    }}>
                      {w.votes} vote{w.votes > 1 ? 's' : ''}
                    </p>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
