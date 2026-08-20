/**
 * TransportTimelapse — Slider temporel qui rejoue l'apparition des inscriptions.
 *
 * Sortie : `activeIds` (Set d'IDs à afficher sur la carte). Le composant parent
 * passe cette valeur à TransportMap3D qui applique la visibilité progressive.
 *
 * Contrôles :
 *  - Play / Pause
 *  - Slider manuel (drag pour scrubber)
 *  - Vitesse : 1x / 4x / 16x (durée totale = 30s / 8s / 2s en base)
 *  - Compteur "N/Total" + timestamp courant
 *  - Bouton "Voir tout" pour terminer instantanément
 *
 * Base : dérive les timestamps triés depuis markers[].created_at.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Rewind, FastForward, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const SPEED_DURATIONS = { 1: 30_000, 4: 8_000, 16: 2_000 } // ms

export default function TransportTimelapse({ markers, onChange }) {
  // Tri chronologique + normalisation
  const timeline = useMemo(() => {
    return [...markers]
      .filter((m) => m.created_at)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((m, i) => ({ id: m.id, ts: new Date(m.created_at).getTime(), full_name: m.full_name, order: i + 1 }))
  }, [markers])

  const total = timeline.length
  const first = timeline[0]?.ts
  const last  = timeline[total - 1]?.ts
  const spanMs = last && first ? (last - first) : 0

  const [progress, setProgress] = useState(1) // 0..1
  const [playing, setPlaying]   = useState(false)
  const [speed, setSpeed]       = useState(4)
  const rafRef = useRef(null)
  const lastFrameRef = useRef(0)

  // Nombre d'inscrits visibles à l'instant `progress`
  const visibleCount = Math.round(progress * total)
  const activeIds = useMemo(
    () => new Set(timeline.slice(0, visibleCount).map((t) => t.id)),
    [timeline, visibleCount],
  )

  // Timestamp courant (interpolé linéairement)
  const currentTs = first && spanMs ? first + progress * spanMs : null

  // Push activeIds au parent
  useEffect(() => {
    onChange?.(activeIds)
  }, [activeIds, onChange])

  // Boucle animation
  useEffect(() => {
    if (! playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }
    const duration = SPEED_DURATIONS[speed] || 8_000
    lastFrameRef.current = performance.now()

    const step = (now) => {
      const dt = now - lastFrameRef.current
      lastFrameRef.current = now
      setProgress((p) => {
        const next = p + dt / duration
        if (next >= 1) {
          setPlaying(false)
          return 1
        }
        return next
      })
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [playing, speed])

  const handlePlayPause = () => {
    if (progress >= 1) setProgress(0) // redémarre
    setPlaying((p) => ! p)
  }

  const handleReset  = () => { setPlaying(false); setProgress(0) }
  const handleShowAll = () => { setPlaying(false); setProgress(1) }

  if (total === 0) return null

  return (
    <div className="adm-card p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--adm-accent)]">
            Timelapse 4D · Historique des inscriptions
          </p>
          <p className="text-sm text-zinc-600 mt-0.5">
            <span className="font-bold tabular-nums text-lg" style={{ color: 'var(--adm-text)' }}>
              {visibleCount}
            </span>
            <span className="text-zinc-400"> / {total}</span>
            {currentTs && (
              <span className="ml-3 text-xs text-zinc-500">
                {format(new Date(currentTs), "d MMM yyyy · HH'h'mm", { locale: fr })}
              </span>
            )}
          </p>
        </div>

        {/* Contrôles vitesse */}
        <div className="flex items-center gap-0.5 bg-zinc-100 rounded p-0.5">
          {[1, 4, 16].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={
                'px-2 py-1 text-[10px] font-mono uppercase tracking-widest rounded transition ' +
                (speed === s ? 'bg-white shadow text-[color:var(--adm-accent)] font-bold' : 'text-zinc-500 hover:text-zinc-800')
              }
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* Slider */}
      <div className="relative mb-3">
        <input
          type="range"
          min="0"
          max="1000"
          value={Math.round(progress * 1000)}
          onChange={(e) => { setPlaying(false); setProgress(+e.target.value / 1000) }}
          className="w-full h-2 bg-zinc-200 rounded-full appearance-none cursor-pointer accent-[color:var(--adm-accent)]"
        />
        {/* Barre visuelle de progression */}
        <div
          className="absolute top-0 left-0 h-2 bg-[color:var(--adm-accent)]/30 rounded-full pointer-events-none"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Boutons transport */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={handleReset}
          title="Recommencer"
          className="h-9 w-9 flex items-center justify-center rounded-full text-zinc-500 hover:text-[color:var(--adm-accent)] hover:bg-zinc-100 transition"
        >
          <RotateCcw size={15}/>
        </button>
        <button
          onClick={() => { setPlaying(false); setProgress((p) => Math.max(0, p - 0.1)) }}
          title="Reculer"
          className="h-9 w-9 flex items-center justify-center rounded-full text-zinc-500 hover:text-[color:var(--adm-accent)] hover:bg-zinc-100 transition"
        >
          <Rewind size={15}/>
        </button>
        <button
          onClick={handlePlayPause}
          title={playing ? 'Pause' : 'Lecture'}
          className="h-11 w-11 flex items-center justify-center rounded-full bg-[color:var(--adm-accent)] text-white shadow-md hover:opacity-90 transition"
        >
          {playing ? <Pause size={18}/> : <Play size={18} className="ml-0.5"/>}
        </button>
        <button
          onClick={() => { setPlaying(false); setProgress((p) => Math.min(1, p + 0.1)) }}
          title="Avancer"
          className="h-9 w-9 flex items-center justify-center rounded-full text-zinc-500 hover:text-[color:var(--adm-accent)] hover:bg-zinc-100 transition"
        >
          <FastForward size={15}/>
        </button>
        <button
          onClick={handleShowAll}
          title="Voir tout"
          className="h-9 w-9 flex items-center justify-center rounded-full text-zinc-500 hover:text-[color:var(--adm-accent)] hover:bg-zinc-100 transition"
        >
          <Eye size={15}/>
        </button>
      </div>
    </div>
  )
}
