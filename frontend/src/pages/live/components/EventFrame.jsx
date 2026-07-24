/**
 * EventFrame — Overlay décoratif façon "affiche du bal" à mettre par-dessus
 * les slides photos (KimBPhotos, PhotosAmbiance, Default). Reproduit les
 * éléments graphiques du template d'affiche officielle :
 *   - Cadre or double filet + 4 losanges aux coins
 *   - Badge "24 JUILLET" bordeaux en haut-droite
 *   - Logo NewWine en bas-gauche (image /logos/logo_newwine.png)
 *   - Bloc titre bas-droite : "BAL & DINE GALA / ★ A DARK NIGHT / ─ IN ─ / Elegance"
 *
 * Tout est en pointerEvents:none pour laisser passer les clics.
 * Positionné en absolute inset:0, à imbriquer DANS le canvas 1920×1080.
 */
export default function EventFrame() {
  const cornerBase = {
    position: 'absolute', width: 20, height: 20,
    background: '#E6C877', transform: 'rotate(45deg)',
    boxShadow: '0 0 12px rgba(214,178,95,.7)',
    zIndex: 6,
  }

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

      {/* Badge "24 JUILLET" bordeaux — haut-droite */}
      <div style={{
        position: 'absolute', top: 90, right: 90,
        zIndex: 7,
        padding: '18px 32px',
        background: 'linear-gradient(180deg, #8a2531, #5f1720)',
        border: '2pt solid rgba(214,178,95,.85)',
        borderRadius: 8,
        textAlign: 'center',
        boxShadow: '0 6px 20px rgba(0,0,0,.5)',
        pointerEvents: 'none',
      }}>
        <div style={{
          fontFamily: "'Anton', sans-serif",
          fontSize: 78,
          lineHeight: 1,
          color: '#EECF80',
          letterSpacing: '.02em',
          textShadow: '0 2px 8px rgba(0,0,0,.6)',
        }}>24</div>
        <div style={{
          fontFamily: "'Cinzel', serif",
          fontWeight: 600,
          fontSize: 22,
          letterSpacing: '.4em',
          textIndent: '.4em',
          color: '#EECF80',
          marginTop: 6,
        }}>JUILLET</div>
      </div>

      {/* Logo NewWine — bas-gauche */}
      <div style={{
        position: 'absolute', bottom: 90, left: 90,
        zIndex: 7,
        pointerEvents: 'none',
      }}>
        <img
          src="/logos/logo_newwine.png"
          alt=""
          style={{
            width: 160, height: 'auto',
            filter: 'drop-shadow(0 4px 16px rgba(0,0,0,.6))',
            opacity: .92,
          }}
        />
      </div>

      {/* Bloc titre — bas-droite (BAL & DINE GALA / ★ A DARK NIGHT / IN / Elegance) */}
      <div style={{
        position: 'absolute', bottom: 90, right: 90,
        zIndex: 7,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
        gap: 6, pointerEvents: 'none',
      }}>
        <div style={{
          fontFamily: "'Cinzel', serif",
          fontWeight: 600, fontSize: 26,
          letterSpacing: '.5em', textIndent: '.5em',
          color: '#F5E6C8',
          textShadow: '0 2px 10px rgba(0,0,0,.9)',
        }}>BAL &amp; DINE GALA</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{
            fontFamily: "'Cinzel', serif", fontSize: 68,
            color: '#E6C877',
            textShadow: '0 0 24px rgba(214,178,95,.6)',
          }}>★</span>
          <div style={{
            fontFamily: "'Cinzel', serif",
            fontWeight: 700, fontSize: 58,
            letterSpacing: '.08em',
            color: '#E6C877',
            textShadow: '0 2px 12px rgba(0,0,0,.95)',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}>A Dark Night</div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginTop: 2,
        }}>
          <span style={{ width: 40, height: 1, background: 'rgba(214,178,95,.8)' }} />
          <span style={{
            fontFamily: "'Cinzel', serif",
            fontWeight: 500, fontSize: 22,
            letterSpacing: '.5em', textIndent: '.5em',
            color: '#E6C877',
            textTransform: 'uppercase',
          }}>in</span>
          <span style={{ width: 40, height: 1, background: 'rgba(214,178,95,.8)' }} />
        </div>

        <div style={{
          fontFamily: "'Great Vibes', cursive",
          fontSize: 96, lineHeight: .9,
          color: '#EECF80',
          textShadow: '0 2px 20px rgba(0,0,0,.9), 0 0 40px rgba(201,169,97,.55)',
          marginTop: -8,
        }}>Elegance</div>
      </div>
    </>
  )
}
