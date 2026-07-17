/**
 * Polling adaptatif pour la liste de présence.
 *  - Onglet actif (visible + focus) → 5 s
 *  - Onglet inactif (hidden ou blur) → 30 s
 *  - Gère l'ETag automatiquement (304 → skip)
 *  - Notifie le caller quand un nouveau scan arrive (pour son + notif)
 *
 * Retourne : { data, isLoading, error, refetch, latestArrivalId }
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { fetchAttendance } from '@/api/attendance'

const ACTIVE_INTERVAL_MS   = 5_000
const INACTIVE_INTERVAL_MS = 30_000

export function useAttendancePolling(eventId, { enabled = true, sinceMinutes = 0, onNewArrival } = {}) {
  const [data, setData] = useState(null)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [latestArrivalId, setLatestArrivalId] = useState(null)

  const etagRef       = useRef(null)
  const timerRef      = useRef(null)
  const isActiveRef   = useRef(!document.hidden)
  const lastTopIdRef  = useRef(null)
  const onNewArrivalRef = useRef(onNewArrival)

  useEffect(() => { onNewArrivalRef.current = onNewArrival }, [onNewArrival])

  const tick = useCallback(async () => {
    if (!enabled || !eventId) return
    try {
      const res = await fetchAttendance(eventId, {
        lastEtag: etagRef.current,
        sinceMinutes,
      })
      if (res.notModified) return
      etagRef.current = res.etag
      setData({
        event: res.event,
        stats: res.stats,
        rows:  res.rows,
        now:   res.now,
      })
      setError(null)

      // Détection nouveau scan → callback
      const topRow = res.rows?.[0]
      const topId = topRow?.id ?? null
      if (topId && topId !== lastTopIdRef.current) {
        // Ne pas notifier au tout premier chargement (lastTopIdRef null)
        if (lastTopIdRef.current !== null) {
          setLatestArrivalId(topId)
          onNewArrivalRef.current?.(topRow)
        }
        lastTopIdRef.current = topId
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [enabled, eventId, sinceMinutes])

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const interval = isActiveRef.current ? ACTIVE_INTERVAL_MS : INACTIVE_INTERVAL_MS
    timerRef.current = setTimeout(async () => {
      await tick()
      schedule()
    }, interval)
  }, [tick])

  // Boot : fetch immédiat puis boucle
  useEffect(() => {
    if (!enabled || !eventId) return
    tick().finally(schedule)
    return () => timerRef.current && clearTimeout(timerRef.current)
  }, [enabled, eventId, tick, schedule])

  // Visibilité onglet
  useEffect(() => {
    const onVis = () => {
      const wasActive = isActiveRef.current
      isActiveRef.current = !document.hidden
      if (!wasActive && isActiveRef.current) {
        // Passage inactif → actif : refresh immédiat
        tick().finally(schedule)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onVis)
    window.addEventListener('blur', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onVis)
      window.removeEventListener('blur', onVis)
    }
  }, [tick, schedule])

  const refetch = useCallback(() => {
    etagRef.current = null // force fetch full
    return tick()
  }, [tick])

  return { data, isLoading, error, refetch, latestArrivalId }
}
