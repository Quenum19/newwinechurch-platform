import { useEffect, useState, useMemo } from 'react'
import Stage from '../components/Stage.jsx'

/**
 * PhotosAmbianceSlide V2 — Défilé plein écran des photos de la soirée.
 *
 * Design "A Dark Night in Elegance" :
 *  - Fond radial chaud + photo courante en Ken Burns (nwKen 8s alternate)
 *    + fondu enchaîné (nwFade 6s) synchronisé sur le changement (6s).
 *  - Flash caméra périodique (nwFlashCam) — clin d'œil paparazzi.
 *  - Cadre or + 4 losanges dans les coins.
 *  - Bandeau bas : #BalNWC2026 ✦ A Dark Night in Elegance.
 *  - Compteur "n / total" en bas droite quand photos disponibles.
 *  - Écran vide : "MOMENTS DE LA SOIRÉE / Souvenirs / Vos plus belles photos,
 *    en direct" (typographie Cinzel + Great Vibes + Playfair Display).
 *
 * state.photos accepte [{url}, ...] OU [url1, url2, ...].
 * Le changement de photo (6000 ms) et toutes les durées/keyframes sont
 * repris à l'identique du design Claude Design — ne pas modifier.
 */
export default function PhotosAmbianceSlide({ state }) {
  const photos = useMemo(
    () => (state?.photos ?? []).map(p => (typeof p === 'string' ? p : p?.url)).filter(Boolean),
    [state?.photos]
  )
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (photos.length <= 1) return
    const iv = setInterval(() => {
      setIdx(i => i + 1)
    }, 6000)
    return () => clearInterval(iv)
  }, [photos.length])

  useEffect(() => {
    if (idx >= photos.length && photos.length > 0) setIdx(0)
  }, [photos.length, idx])

  const hasPhotos = photos.length > 0
  const cur = hasPhotos ? idx % photos.length : 0
  const currentUrl = hasPhotos ? photos[cur] : null
  const counter = hasPhotos ? `${cur + 1} / ${photos.length}` : ''

  const cornerBase = {
    position: 'absolute',
    width: 14,
    height: 14,
    background: '#E6C877',
    transform: 'rotate(45deg)',
    boxShadow: '0 0 8px rgba(214,178,95,.6)',
    pointerEvents: 'none',
  }

  return (
    <Stage>
      <style>{`
        @keyframes nwKen { 0%{transform:scale(1.12) translate(-1.4%,1%)} 100%{transform:scale(1.02) translate(1.4%,-1%)} }
        @keyframes nwFlashCam { 0%,100%{opacity:0} 3%{opacity:.8} 8%{opacity:0} }
        @keyframes nwFade { 0%{opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{opacity:0} }
        @keyframes nwTwinkle { 0%,100%{opacity:.3} 50%{opacity:1} }
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
        {/* Fond radial chaud */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 100% at 50% 30%, #211a10 0%, #0d0a06 56%, #060402 100%)',
        }} />

        {/* Photo courante (Ken Burns + fondu) */}
        {hasPhotos && (
          <>
            <div
              key={cur}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url("${currentUrl}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                animation: 'nwKen 8s ease-in-out infinite alternate, nwFade 6s ease-in-out infinite',
              }}
            />
            {/* Flash caméra */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: '#fff',
              animation: 'nwFlashCam 6s ease-out infinite',
              pointerEvents: 'none',
            }} />
          </>
        )}

        {/* Écran vide : typographie souvenir */}
        {!hasPhotos && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: "'Cinzel',serif", fontWeight: 500, fontSize: 26,
              letterSpacing: '.5em', textIndent: '.5em',
              color: '#C9A961',
            }}>MOMENTS DE LA SOIRÉE</div>
            <div style={{
              fontFamily: "'Great Vibes',cursive", fontSize: 150,
              color: '#EECF80', lineHeight: .9,
              textShadow: '0 0 70px rgba(201,169,97,.4)',
            }}>Souvenirs</div>
            <div style={{
              fontFamily: "'Playfair Display',serif", fontStyle: 'italic',
              fontSize: 30, color: '#F0E6CF', marginTop: 12,
            }}>Vos plus belles photos, en direct</div>
          </div>
        )}

        {/* Scrim de lisibilité (bas) */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(0deg, rgba(0,0,0,.82) 0%, rgba(0,0,0,.3) 26%, transparent 55%)',
          pointerEvents: 'none',
        }} />

        {/* Cadre or */}
        <div style={{
          position: 'absolute', inset: 22,
          border: '2px solid rgba(214,178,95,.85)',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,.3)',
          pointerEvents: 'none',
        }} />

        {/* 4 losanges */}
        <div style={{ ...cornerBase, top: 44, left: 44 }} />
        <div style={{ ...cornerBase, top: 44, right: 44 }} />
        <div style={{ ...cornerBase, bottom: 44, left: 44 }} />
        <div style={{ ...cornerBase, bottom: 44, right: 44 }} />

        {/* Bandeau bas gauche : hashtag + signature */}
        <div style={{
          position: 'absolute', left: 60, bottom: 56,
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <span style={{
            fontFamily: "'Anton',sans-serif", fontSize: 44,
            color: '#F5E6C8', letterSpacing: '.02em',
          }}>#BalNWC2026</span>
          <span style={{
            fontFamily: "'Cinzel',serif", fontSize: 24, color: '#C9A961',
          }}>✦</span>
          <span style={{
            fontFamily: "'Playfair Display',serif", fontStyle: 'italic',
            fontSize: 26, color: '#D9CBB0',
          }}>A Dark Night in Elegance</span>
        </div>

        {/* Compteur bas droite */}
        {hasPhotos && (
          <div style={{
            position: 'absolute', right: 60, bottom: 60,
            fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 22,
            letterSpacing: '.14em', color: '#E6C877',
          }}>{counter}</div>
        )}
      </div>
    </Stage>
  )
}
