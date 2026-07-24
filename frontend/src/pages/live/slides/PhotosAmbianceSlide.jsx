/**
 * PhotosAmbianceSlide V2 — Défilé plein écran des photos brandées uploadées
 * par les photographes pendant l'événement, avec cadre or présidentiel.
 *
 * Cadrage identique KimBPhotos : object-fit:contain sur l'image nette + la
 * MÊME image floutée (blur 28px + brightness .85 + saturate 1.25 + scale 1.2)
 * en fond pour meubler élégamment les bords. Aucun crop du contenu de la photo.
 * Fondu enchaîné 6s + Ken Burns léger.
 *
 * Ajouté V2 : wrapper Stage 1920×1080 + cadre présidentiel double filet or
 * + 4 losanges or aux coins + bandeau bas discret événement, pour cohérence
 * visuelle avec MurStars / DefaultSlide.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Stage from '../components/Stage.jsx'
import GoldParticles from '../components/GoldParticles.jsx'

const INTERVAL_MS = 6000

const cornerBase = {
  position: 'absolute', width: 20, height: 20,
  background: '#E6C877', transform: 'rotate(45deg)',
  boxShadow: '0 0 12px rgba(214,178,95,.7)',
  zIndex: 6,
}

/**
 * Cadre présidentiel + losanges + bandeau bas — overlay par-dessus les
 * photos (pointer-events:none, z-index élevé).
 */
function GoldFrame() {
  return (
    <>
      {/* Cadre or double filet */}
      <div style={{
        position: 'absolute', inset: 28,
        border: '3px solid rgba(214,178,95,.92)',
        boxShadow: 'inset 0 0 80px rgba(0,0,0,.4)',
        pointerEvents: 'none',
        zIndex: 5,
      }} />
      <div style={{
        position: 'absolute', inset: 40,
        border: '1px solid rgba(214,178,95,.5)',
        pointerEvents: 'none',
        zIndex: 5,
      }} />

      {/* 4 losanges or aux coins */}
      <div style={{ ...cornerBase, top: 56, left: 56 }} />
      <div style={{ ...cornerBase, top: 56, right: 56 }} />
      <div style={{ ...cornerBase, bottom: 56, left: 56 }} />
      <div style={{ ...cornerBase, bottom: 56, right: 56 }} />

      {/* Bandeau bas discret événement */}
      <div style={{
        position: 'absolute', left: 40, right: 40, bottom: 40,
        height: 76,
        background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.55) 55%, rgba(0,0,0,.85) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 6,
      }}>
        <span style={{
          fontFamily: "'Cinzel',serif",
          fontSize: 46,
          letterSpacing: '.14em',
          color: '#E6C877',
          textShadow: '0 0 24px rgba(214,178,95,.5), 0 2px 4px rgba(0,0,0,.7)',
          textTransform: 'uppercase',
        }}>
          A Dark Night in Elegance&nbsp;&nbsp;✦&nbsp;&nbsp;24 Juillet
        </span>
      </div>
    </>
  )
}

export default function PhotosAmbianceSlide({ state }) {
  const photos = state?.photos ?? []
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (photos.length <= 1) return
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % photos.length)
    }, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [photos.length])

  useEffect(() => {
    if (index >= photos.length) setIndex(0)
  }, [photos.length, index])

  // === Cas vide : invitation typographique + cadre or ===
  if (photos.length === 0) {
    return (
      <Stage>
        <div style={{
          position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
          background: '#0A0A0A',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at center, #1F1610 0%, #0A0A0A 80%)',
          }} />
          <GoldParticles count={25} intensity={0.7} />

          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            zIndex: 3, textAlign: 'center', padding: '5vh',
          }}>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              style={{
                fontFamily: 'Anton, Impact, sans-serif',
                fontSize: 176,
                color: '#C9A961',
                letterSpacing: '0.02em',
                margin: 0,
                lineHeight: 1,
              }}
            >
              PHOTOS DU SOIR
            </motion.h1>

            <p style={{
              fontFamily: '"Playfair Display", serif',
              fontStyle: 'italic',
              fontSize: 48,
              color: '#F5E6C8',
              marginTop: 48,
            }}>
              Les premières photos arrivent bientôt…
            </p>
          </div>

          <GoldFrame />
        </div>
      </Stage>
    )
  }

  const currentPhoto = photos[index]

  return (
    <Stage>
      <div style={{
        position: 'relative', width: 1920, height: 1080, overflow: 'hidden',
        background: '#0A0A0A',
      }}>
        {/* Photo en fondu enchaîné — contain + fond flou (aucun crop) */}
        <AnimatePresence mode="sync">
          <motion.div
            key={currentPhoto + index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: 'easeInOut' }}
            style={{ position: 'absolute', inset: 0 }}
          >
            {/* Fond flouté de la même image — VISIBLE (assez lumineux pour
                meubler les bandes latérales avec les couleurs floues de la
                photo, pas du noir) */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url("${currentPhoto}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(28px) brightness(.85) saturate(1.25)',
              transform: 'scale(1.2)',
            }} />
            {/* Image nette centrée — aucun crop + Ken Burns léger */}
            <motion.img
              src={currentPhoto}
              alt=""
              initial={{ scale: 1.03 }}
              animate={{ scale: 1 }}
              transition={{ duration: 6, ease: 'linear' }}
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Cadre or présidentiel + losanges + bandeau bas événement */}
        <GoldFrame />
      </div>
    </Stage>
  )
}
