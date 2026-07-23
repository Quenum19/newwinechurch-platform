import { useEffect, useState } from 'react'

/**
 * Stage — Conteneur 1920×1080 fixe qui se scale au viewport en gardant le
 * ratio 16:9. Toutes les slides V2 sont dessinées en px fixes 1920×1080 —
 * ce wrapper les rend responsives sans toucher au design.
 */
export default function Stage({ children, background = '#0A0A0A' }) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const update = () => {
      const sx = window.innerWidth / 1920
      const sy = window.innerHeight / 1080
      const s = Math.min(sx, sy)
      setScale(s)
      setOffset({
        x: (window.innerWidth - 1920 * s) / 2,
        y: (window.innerHeight - 1080 * s) / 2,
      })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      background,
    }}>
      <div style={{
        position: 'absolute',
        top: offset.y,
        left: offset.x,
        width: 1920,
        height: 1080,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}>
        {children}
      </div>
    </div>
  )
}
