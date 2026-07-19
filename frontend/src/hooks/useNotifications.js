/**
 * Hook bootstrap notifications utilisateur.
 *
 *  - Charge le compteur non-lu au login (via TanStack Query).
 *  - Souscrit au channel privé Echo "App.Models.User.{id}" pour recevoir
 *    en temps réel les notifications Laravel broadcastées.
 *  - Affiche un toast (react-hot-toast) pour chaque notif entrante.
 *  - Synchronise le store Zustand pour le badge cloche.
 *
 * À appeler une seule fois au montage du MemberLayout/AdminLayout.
 */
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/store/notificationStore'
import { initEcho, getEcho } from '@/echo'
import { useNotifications, useNotificationsCount } from '@/api/notifications'

/** Labels FR par type de notification (slug class basename). */
const TYPE_LABELS = {
  DepartmentReportSubmittedNotification:  'Nouveau rapport département',
  DepartmentReportReviewedNotification:   'Rapport département revu',
  CellReportSubmittedNotification:        'Nouveau rapport cellule',
  ReportOverdueNotification:              'Rapport en retard',
  CellMissingReportNotification:          'Rapport cellule manquant',
  GovernorAppointedNotification:          'Nomination gouverneur',
  CellLeaderAppointedNotification:        'Nomination leader',
  WeeklyDigestNotification:               'Digest hebdomadaire',
}

export function useNotificationBootstrap() {
  const user = useAuthStore((s) => s.user)
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)
  const setList        = useNotificationStore((s) => s.setList)
  const addRealtime    = useNotificationStore((s) => s.addRealtime)
  const currentList    = useNotificationStore((s) => s.list)

  // Sync initial via TanStack Query.
  const { data: countData } = useNotificationsCount()
  const { data: listData } = useNotifications({ per_page: 20 })

  useEffect(() => {
    if (countData) setUnreadCount(countData.unread ?? 0)
  }, [countData, setUnreadCount])

  useEffect(() => {
    if (!listData?.data) return

    // Merge intelligent : les updates locaux (is_read=true fait par un clic
    // optimistic) NE DOIVENT PAS être écrasés par le refetch serveur. On garde
    // is_read=true si soit le serveur soit le local l'a marqué. Empêche
    // "la notif que je viens de lire réapparaît non-lue quand je rouvre".
    const localById = new Map(currentList.map((n) => [n.id, n]))
    const merged = listData.data.map((serverN) => {
      const localN = localById.get(serverN.id)
      // Si local a is_read=true, on garde ; sinon on prend le serveur.
      const is_read = (localN?.is_read === true) || (serverN.is_read === true)
      return { ...serverN, is_read }
    })
    setList(merged)
  }, [listData, setList, currentList])

  // Subscribe Echo (canal privé personnel — broadcastings Laravel par défaut).
  useEffect(() => {
    if (!user?.id) return
    const echo = initEcho()
    if (!echo) return

    const channelName = `App.Models.User.${user.id}`
    const channel = echo.private(channelName)

    // Laravel Notifications broadcaste via .notification (event name).
    channel.notification((notif) => {
      const typeLabel = TYPE_LABELS[notif.type?.split('\\').pop()] ?? 'Nouvelle notification'

      // Toast immédiat.
      toast.success(typeLabel, {
        duration: 5000,
        position: 'top-right',
      })

      // Push dans le store pour le dropdown cloche.
      addRealtime({
        id:         notif.id ?? `tmp-${Date.now()}`,
        type:       notif.type?.split('\\').pop() ?? 'Notification',
        class:      notif.type,
        data:       notif,
        created_at: new Date().toISOString(),
      })
    })

    return () => {
      try { echo.leave(channelName) } catch { /* noop */ }
    }
  }, [user?.id, addRealtime])
}
