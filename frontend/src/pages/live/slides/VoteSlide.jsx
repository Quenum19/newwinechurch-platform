/**
 * Slide — VOTE ROI & REINE avec QR code + compteur live + photos candidats.
 */
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import GoldParticles from '../components/GoldParticles.jsx'

export default function VoteSlide({ state }) {
  const eventId = state?.event?.id
  const voteUrl = eventId
    ? `${window.location.origin}/bal/vote/${eventId}`
    : `${window.location.origin}/bal/vote`

  const candidates = state?.candidates ?? []
  const rois = candidates.filter((c) => c.role === 'roi')
  const reines = candidates.filter((c) => c.role === 'reine')

  const votesCount = state?.stats?.votes_count ?? 0
  const totalExpected = state?.stats?.total_expected ?? 0

  const [candidateIdx, setCandidateIdx] = useState(0)
  const carousel = [...rois, ...reines]

  useEffect(() => {
    if (carousel.length === 0) return
    const t = setInterval(() => setCandidateIdx((i) => (i + 1) % carousel.length), 3500)
    return () => clearInterval(t)
  }, [carousel.length])

  const current = carousel[candidateIdx]

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0A0A0A 0%, #1a0f14 50%, #0A0A0A 100%)', overflow: 'hidden' }}>
      <GoldParticles count={40} />
      <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4vw', padding: '5vh 5vw', zIndex: 3, alignItems: 'center' }}>
        {/* Colonne gauche — carrousel candidats + titre */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '2rem' }}>
          <div>
            <p style={{
              fontFamily: '"Playfair Display", serif',
              fontStyle: 'italic',
              fontSize: 'clamp(1rem, 1.6vw, 1.6rem)',
              color: '#C9A961',
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              margin: 0,
            }}>À vous de choisir</p>
            <h1 style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: 'clamp(4rem, 7vw, 7rem)',
              color: '#F5E6C8',
              fontWeight: 700,
              margin: '0.5rem 0 0',
              lineHeight: 1,
              textShadow: '0 0 30px rgba(201, 169, 97, 0.4)',
            }}>
              Roi & Reine 2026
            </h1>
          </div>

          {/* Carrousel candidat */}
          {current ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.6 }}
                style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}
              >
                {current.photo_url ? (
                  <img
                    src={current.photo_url}
                    alt={current.first_name}
                    style={{
                      width: '180px',
                      height: '180px',
                      objectFit: 'cover',
                      borderRadius: '50%',
                      border: '3px solid #C9A961',
                      boxShadow: '0 0 40px rgba(201, 169, 97, 0.5)',
                    }}
                  />
                ) : (
                  <div style={{
                    width: '180px', height: '180px', borderRadius: '50%',
                    background: '#8B1A2F', border: '3px solid #C9A961',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#F5E6C8', fontSize: '3rem', fontWeight: 700,
                  }}>
                    {(current.first_name?.[0] ?? '?').toUpperCase()}
                  </div>
                )}
                <div>
                  <p style={{
                    fontFamily: '"Playfair Display", serif',
                    fontSize: '1.2rem',
                    color: '#C9A961',
                    margin: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '0.2em',
                  }}>
                    Candidat {current.role === 'roi' ? 'Roi' : 'Reine'}
                  </p>
                  <h2 style={{
                    fontFamily: '"Playfair Display", serif',
                    fontSize: '2.8rem',
                    color: '#F5E6C8',
                    fontWeight: 700,
                    margin: '0.3rem 0 0',
                  }}>
                    {current.first_name} {current.last_name}
                  </h2>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <p style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: '1.5rem',
              color: '#8B7960',
              fontStyle: 'italic',
            }}>
              Ajoutez des candidats depuis l'admin…
            </p>
          )}

          {/* Compteur votes */}
          <div style={{
            padding: '1.2rem 2rem',
            background: 'rgba(139, 26, 47, 0.4)',
            border: '2px solid #C9A961',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'baseline',
            gap: '1rem',
            marginTop: '1rem',
          }}>
            <span style={{
              fontFamily: '"Anton", sans-serif',
              fontSize: 'clamp(3rem, 5vw, 5rem)',
              color: '#F5E6C8',
              lineHeight: 1,
              fontWeight: 900,
            }}>{votesCount}</span>
            <span style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: '1.2rem',
              color: '#C9A961',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
            }}>
              vote{votesCount > 1 ? 's' : ''} enregistré{votesCount > 1 ? 's' : ''}
              {totalExpected > 0 && ` / ${totalExpected}`}
            </span>
          </div>
        </div>

        {/* Colonne droite — QR code géant */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
          <p style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: 'clamp(1.2rem, 2vw, 2rem)',
            color: '#C9A961',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            margin: 0,
            textAlign: 'center',
          }}>
            Scanne pour voter
          </p>
          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              padding: '2rem',
              background: '#F5E6C8',
              borderRadius: '20px',
              boxShadow: '0 0 60px rgba(201, 169, 97, 0.6)',
              border: '4px solid #C9A961',
            }}
          >
            <QRCodeSVG
              value={voteUrl}
              size={340}
              level="M"
              includeMargin={false}
              fgColor="#0A0A0A"
              bgColor="#F5E6C8"
            />
          </motion.div>
          <p style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: '1.2rem',
            color: '#F5E6C8',
            textAlign: 'center',
            margin: 0,
            opacity: 0.85,
          }}>
            Un vote par téléphone
          </p>
        </div>
      </div>
    </div>
  )
}
