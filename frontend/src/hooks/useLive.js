/**
 * Hook live streaming :
 *  - Charge l'état actuel (GET /api/live/current) au mount
 *  - S'abonne au channel WebSocket "live" (Reverb) si configuré
 *  - Bascule automatiquement le store global useLiveStore quand un live démarre/se termine
 *
 * À utiliser une seule fois au montage de l'app (cf main.jsx).
 */
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

import { getCurrentLive } from '@/api/live'
import { useLiveStore } from '@/store/liveStore'
import { initEcho } from '@/echo'

export function useLiveBootstrap() {
  const startLive = useLiveStore((s) => s.startLive)
  const endLive   = useLiveStore((s) => s.endLive)

  // Polling fallback toutes les 60s : si Reverb tombe, l'état reste correct.
  const { data: current } = useQuery({
    queryKey: ['live', 'current'],
    queryFn: getCurrentLive,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  // Hydrate le store dès qu'on a la valeur.
  useEffect(() => {
    if (current && current.id) {
      startLive(current)
    } else {
      endLive()
    }
  }, [current, startLive, endLive])

  // Souscription WebSocket "live" pour les transitions instantanées.
  useEffect(() => {
    const echo = initEcho()
    if (! echo) return

    const channel = echo.channel('live')
    channel.listen('.live.started', (payload) => {
      startLive(payload)
    })
    channel.listen('.live.ended', () => {
      endLive()
    })

    return () => {
      echo.leaveChannel('live')
    }
  }, [startLive, endLive])
}
