/**
 * Store du live streaming (Agora + Reverb).
 * Permet d'afficher le badge "EN DIRECT" partout dans l'app
 * dès qu'un live est démarré côté admin.
 */
import { create } from 'zustand'

export const useLiveStore = create((set) => ({
  // Stream en cours (null si aucun)
  current: null,

  // Compteur de spectateurs (mis à jour via WebSocket Reverb)
  viewersCount: 0,

  /** Démarre un live (déclenché par WebSocket "live.started"). */
  startLive: (stream) => set({ current: stream, viewersCount: 0 }),

  /** Termine le live (déclenché par WebSocket "live.ended"). */
  endLive: () => set({ current: null, viewersCount: 0 }),

  /** Met à jour le compteur de viewers en temps réel. */
  setViewers: (count) => set({ viewersCount: count }),
}))
