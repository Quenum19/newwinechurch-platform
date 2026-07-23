/**
 * NoirSlide V2 — Écran noir de bascule (fade-in 400ms) + losange or discret
 * qui respire au bas de l'écran (repère régie, quasi invisible public).
 */
export default function NoirSlide() {
  return (
    <>
      <style>{`
        @keyframes nwNoirIn { 0%{opacity:0} 100%{opacity:1} }
        @keyframes nwNoirPulse { 0%,100%{opacity:.12} 50%{opacity:.28} }
      `}</style>
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#000',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: '#000',
          animation: 'nwNoirIn .4s ease forwards',
        }} />
        <div style={{
          position: 'absolute',
          left: '50%',
          bottom: 40,
          transform: 'translateX(-50%)',
          width: 8,
          height: 8,
          background: '#C9A961',
          transformOrigin: 'center',
          animation: 'nwNoirPulse 3s ease-in-out infinite',
        }} />
      </div>
    </>
  )
}
