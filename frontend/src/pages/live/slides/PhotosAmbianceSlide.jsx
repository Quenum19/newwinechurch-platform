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
import EventFrame from '../components/EventFrame.jsx'

const INTERVAL_MS = 6000

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

          <EventFrame />
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
        <EventFrame />
      </div>
    </Stage>
  )
}
