/**
 * Store global notifications (Zustand).
 *
 * État local synchronisé avec :
 *  - GET /api/notifications (initial load + invalidation TanStack Query)
 *  - WebSocket Reverb : push d'une nouvelle notif via le channel App.Models.User.{id}
 *
 * Le compteur unread sert au badge cloche du MemberLayout.
 */
import { create } from 'zustand'

export const useNotificationStore = create((set, get) => ({
  /** Compteur des non-lues (badge). */
  unreadCount: 0,
  /** Liste partielle des dernières notifs reçues (pour le dropdown). */
  list: [],

  /** Set le compteur depuis la réponse API. */
  setUnreadCount: (n) => set({ unreadCount: Math.max(0, Number(n) || 0) }),

  /** Hydrate la liste depuis l'API. */
  setList: (list) => set({ list: Array.isArray(list) ? list : [] }),

  /** Push une notif reçue par WebSocket (haut de liste, incr count si non lue). */
  addRealtime: (notif) =>
    set((state) => ({
      list:        [{ ...notif, is_read: false }, ...state.list].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    })),

  /** Marquer une notif comme lue (local — l'API gère la persistance via TQ). */
  markRead: (id) =>
    set((state) => {
      const wasUnread = state.list.find((n) => n.id === id && !n.is_read)
      return {
        list: state.list.map((n) => n.id === id ? { ...n, is_read: true } : n),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      }
    }),

  /** Tout marquer lu. */
  markAllRead: () =>
    set((state) => ({
      list: state.list.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    })),

  /** Suppression locale. */
  remove: (id) =>
    set((state) => {
      const removed = state.list.find((n) => n.id === id)
      return {
        list: state.list.filter((n) => n.id !== id),
        unreadCount: removed && !removed.is_read
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      }
    }),

  reset: () => set({ unreadCount: 0, list: [] }),
}))
