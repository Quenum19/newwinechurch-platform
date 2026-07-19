/**
 * NotificationCenter — cloche dans le header avec dropdown des notifs.
 *
 *  - Badge rouge avec compteur non-lues.
 *  - Dropdown 400×500 max scrollable.
 *  - Palette ivoire chaud (#FAF6EE) — accordée aux modals NWC 2026.
 *  - Chaque notif : icône colorée selon type, titre, message, temps relatif.
 *  - CLIC = marque lu + retire de la liste + navigue vers la cible
 *    correspondante (route différente selon le rôle de l'utilisateur :
 *    pasteur/RH/admin → /admin/..., gouverneur → /gouverneur/..., etc.).
 *  - Auto-disparition au marquage comme lu (fait progresser la pile sans
 *    qu'il faille presser "Tout marquer comme lu").
 *  - Sync avec notificationStore + TanStack Query.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell, Check, Trash2, FileText, AlertTriangle, Award, Users,
  CalendarClock, X, ChevronRight,
  Ticket, TrendingUp, Clock, ShieldAlert, Sparkles, ListOrdered,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '@/store/notificationStore'
import { useAuthStore } from '@/store/authStore'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useDeleteNotification,
} from '@/api/notifications'
import { cn } from '@/utils/cn'

function buildTypeMeta(t) {
  return {
    // ============ Rapports & cellules (existant) ============
    DepartmentReportSubmittedNotification: { icon: FileText,      color: 'text-[#B0273A]', bg: 'bg-[#FCE7EB]', label: t('notifications.types.deptReportSubmitted', 'Rapport département') },
    DepartmentReportReviewedNotification:  { icon: Check,         color: 'text-emerald-700', bg: 'bg-emerald-100', label: t('notifications.types.deptReportReviewed', 'Rapport revu') },
    CellReportSubmittedNotification:       { icon: FileText,      color: 'text-[#B0273A]', bg: 'bg-[#FCE7EB]', label: t('notifications.types.cellReportSubmitted', 'Rapport cellule') },
    ReportOverdueNotification:             { icon: AlertTriangle, color: 'text-red-700',    bg: 'bg-red-100',     label: t('notifications.types.reportOverdue', 'Rapport en retard') },
    CellMissingReportNotification:         { icon: AlertTriangle, color: 'text-orange-700', bg: 'bg-orange-100',  label: t('notifications.types.cellMissingReport', 'Rapport manquant') },
    GovernorAppointedNotification:         { icon: Award,         color: 'text-[#B79358]', bg: 'bg-[#F5EFE2]',  label: t('notifications.types.governorAppointed', 'Nomination') },
    CellLeaderAppointedNotification:       { icon: Users,         color: 'text-[#B79358]', bg: 'bg-[#F5EFE2]',  label: t('notifications.types.cellLeaderAppointed', 'Nomination') },
    WeeklyDigestNotification:              { icon: CalendarClock, color: 'text-blue-700',   bg: 'bg-blue-100',    label: t('notifications.types.weeklyDigest', 'Digest hebdo') },

    // ============ Billetterie (Sprint B) ============
    NouvelleInscriptionAdminNotification:  { icon: Ticket,       color: 'text-[#B0273A]',  bg: 'bg-[#FCE7EB]',  label: t('notifications.types.newTicket', 'Nouvelle inscription') },
    DigestQuotidienBilletterieNotification:{ icon: CalendarClock, color: 'text-blue-700',  bg: 'bg-blue-100',    label: t('notifications.types.dailyDigest', 'Digest billetterie') },
    AlerteCapaciteNotification:            { icon: TrendingUp,   color: 'text-orange-700',  bg: 'bg-orange-100',  label: t('notifications.types.capacityAlert', 'Alerte capacité') },
    AlerteWaitlistNotification:            { icon: ListOrdered,  color: 'text-purple-700',  bg: 'bg-purple-100',  label: t('notifications.types.waitlistAlert', 'Liste d\'attente') },
    RappelJourJ1Notification:              { icon: Clock,        color: 'text-emerald-700', bg: 'bg-emerald-100', label: t('notifications.types.j1Reminder', 'Rappel J-1') },
    BienvenueNouveauMembreNotification:    { icon: Sparkles,     color: 'text-[#B79358]',  bg: 'bg-[#F5EFE2]',   label: t('notifications.types.welcome', 'Bienvenue') },
    AlerteAnomalieSecuriteNotification:    { icon: ShieldAlert,  color: 'text-red-700',    bg: 'bg-red-100',      label: t('notifications.types.securityAlert', 'Alerte sécurité') },
  }
}

function buildNotifTitle(t, typeMeta, notif) {
  const d = notif.data?.data ?? notif.data ?? {}
  // Format Sprint B : le payload embarque déjà un titre custom (plus riche
  // que le label générique du type). On l'utilise en priorité.
  if (d.title && typeof d.title === 'string') return d.title
  const meta = typeMeta[notif.type] ?? { label: t('notifications.defaultTitle', 'Notification') }
  return meta.label
}

function buildNotifMessage(t, notif) {
  const d = notif.data?.data ?? notif.data ?? {}
  // Format Sprint B : payload avec body pré-formaté (contexte complet).
  if (d.body && typeof d.body === 'string') return d.body
  const dash = '—'
  switch (notif.type) {
    case 'DepartmentReportSubmittedNotification':
      return `${d.governor ?? t('notifications.aGovernor', 'Un gouverneur')} ${t('notifications.submittedReportOf', 'a soumis le rapport de')} « ${d.dept_name ?? dash} »`
    case 'DepartmentReportReviewedNotification':
      return `« ${d.dept_name ?? dash} » — ${t('notifications.statusLabel', 'statut')} : ${d.status ?? dash}`
    case 'CellReportSubmittedNotification':
      return `${t('notifications.cellReportPrefix', 'Rapport cellule')} « ${d.cell_name ?? dash} » (${d.attendance_count ?? 0} ${t('notifications.attendees', 'présents')})`
    case 'ReportOverdueNotification':
      return `⚠ « ${d.dept_name ?? dash} » — ${t('notifications.reportLate', 'rapport en retard')}`
    case 'CellMissingReportNotification':
      return `« ${d.cell_name ?? dash} » — ${d.weeks_missing ?? 1} ${t('notifications.weeksMissingReport', 'semaine(s) sans rapport')}`
    case 'GovernorAppointedNotification':
      return `${t('notifications.welcomeGovernor', 'Bienvenue ! Tu es nommé gouverneur de')} « ${d.dept_name ?? dash} »`
    case 'CellLeaderAppointedNotification':
      return `${t('notifications.welcomeLeader', 'Tu es nommé leader de')} « ${d.cell_name ?? dash} »`
    case 'WeeklyDigestNotification':
      return `${t('notifications.weeklyDigestPrefix', 'Digest semaine du')} ${d.week_start ?? dash}`
    default:
      return ''
  }
}

/**
 * Détermine la route à ouvrir au clic d'une notification, selon son type
 * ET le rôle de l'utilisateur courant. Idée : un gouverneur qui reçoit la
 * notif d'un rapport département soumis (par lui-même) doit pouvoir l'ouvrir
 * dans /gouverneur/rapports/<id>, pas dans /admin/... auquel il n'a pas accès.
 *
 * Retourne null si la notif n'a pas de cible navigable pour ce rôle (le clic
 * marquera juste comme lu sans navigation).
 */
function buildNotifLink(notif, roles) {
  const d = notif.data?.data ?? notif.data ?? {}

  // Format Sprint B : URL directement dans le payload (déjà validée serveur).
  // Le rôle n'a pas d'impact car les endpoints backend gèrent leur permission.
  if (d.url && typeof d.url === 'string' && d.url.startsWith('/')) return d.url

  const isStaff = roles.includes('superadmin') || roles.includes('pasteur') ||
                  roles.includes('admin') || roles.includes('admin-site') ||
                  roles.includes('rh')
  const isGovernor = roles.includes('gouverneur')
  const isLeader   = roles.includes('leader')

  switch (notif.type) {
    case 'DepartmentReportSubmittedNotification':
    case 'DepartmentReportReviewedNotification':
    case 'ReportOverdueNotification':
      if (!d.report_id) return null
      if (isStaff)     return `/admin/rapports-departement/${d.report_id}`
      if (isGovernor)  return `/gouverneur/rapports/${d.report_id}`
      return null
    case 'CellReportSubmittedNotification':
    case 'CellMissingReportNotification':
      // Pas de page directe au détail rapport cellule côté admin :
      // on ouvre la cellule. Pour le leader, on a /leader/rapports.
      if (isLeader) return '/leader/rapports'
      if (d.cell_id && (isStaff || isGovernor)) {
        return isGovernor ? `/gouverneur/cellules/${d.cell_id}` : `/admin/cellules`
      }
      return null
    case 'GovernorAppointedNotification':
      return '/gouverneur'
    case 'CellLeaderAppointedNotification':
      return '/leader'
    case 'WeeklyDigestNotification':
      if (isStaff)    return '/admin'
      if (isGovernor) return '/gouverneur'
      if (isLeader)   return '/leader'
      return '/mon-espace'
    default:
      // Fallback : au moins ouvrir l'inbox complète (jamais null-click).
      if (isStaff) return '/admin/notifications'
      return '/mon-espace'
  }
}

export default function NotificationCenter() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr
  const typeMeta = buildTypeMeta(t)
  const roles = useAuthStore((s) => s.roles) ?? []

  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const list        = useNotificationStore((s) => s.list)
  const markReadLocal     = useNotificationStore((s) => s.markRead)
  const markAllReadLocal  = useNotificationStore((s) => s.markAllRead)
  const removeLocal       = useNotificationStore((s) => s.remove)

  const markRead    = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const deleteOne   = useDeleteNotification()

  // Click outside.
  useEffect(() => {
    function onDown(e) {
      if (open && containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  /**
   * Clic sur une notif :
   *  1. Marquer comme lue (optimistic local + API async)
   *  2. Naviguer vers la page cible (buildNotifLink garantit toujours une cible)
   *  3. NE PAS retirer de la pile — la notif doit rester visible pour history
   *     (l'utilisateur peut supprimer via l'icône corbeille s'il veut vraiment).
   */
  const handleClick = (n) => {
    // Optimistic update local (décrémente immédiatement le badge)
    if (!n.is_read) {
      markReadLocal(n.id)     // store Zustand : is_read=true + unreadCount--
      markRead.mutate(n.id)   // API : persist en BDD (async)
    }

    // Navigation systématique (buildNotifLink garantit toujours une cible)
    const link = buildNotifLink(n, roles)
    if (link) {
      setOpen(false)
      navigate(link)
    }
  }

  const handleMarkAll = () => {
    markAllReadLocal()
    markAllRead.mutate()
  }
  const handleDelete = (id) => {
    removeLocal(id)
    deleteOne.mutate(id)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-white/70 hover:text-white transition rounded-lg hover:bg-white/5"
        aria-label={`${t('notifications.ariaBell', 'Notifications')} (${unreadCount} ${t('notifications.unread', 'non-lues')})`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 z-[60] w-[min(420px,calc(100vw-2rem))] max-h-[520px] bg-[#FAF6EE] border border-[#E0D5BB] rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.45)] overflow-hidden flex flex-col"
            role="dialog"
            aria-label={t('notifications.center', 'Centre de notifications')}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E8DFC9] bg-[#F5EFE2]">
              <div className="text-[15px] font-semibold text-[#1F1A14]">
                {t('notifications.title', 'Notifications')}
                {unreadCount > 0 && (
                  <span className="ml-2 text-xs font-medium text-[#B0273A]">
                    {unreadCount} {unreadCount > 1 ? t('notifications.unreadPlural', 'non lues') : t('notifications.unreadSingular', 'non lue')}
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-[#6B5F4E] hover:text-[#1F1A14] hover:bg-[#F0E7D1] rounded-md transition"
                aria-label={t('common.close', 'Fermer')}
              >
                <X size={16} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {list.length === 0 ? (
                <div className="px-4 py-12 text-center text-[#8C7E68] text-sm">
                  <Bell size={28} className="mx-auto mb-3 opacity-40" />
                  {t('notifications.empty', 'Aucune notification pour le moment.')}
                </div>
              ) : (
                <ul className="divide-y divide-[#EDE3CC]">
                  <AnimatePresence initial={false}>
                    {list.map((n) => {
                      const meta = typeMeta[n.type] ?? { icon: Bell, color: 'text-[#6B5F4E]', bg: 'bg-[#F0E7D1]' }
                      const Icon = meta.icon
                      const hasLink = buildNotifLink(n, roles) !== null
                      return (
                        <motion.li
                          key={n.id}
                          layout
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 }}
                          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                          className={cn(
                            'group relative px-4 py-3.5 cursor-pointer transition',
                            'hover:bg-[#F0E7D1]',
                            !n.is_read && 'bg-[#FDF9EE]',
                          )}
                          onClick={() => handleClick(n)}
                        >
                          <div className="flex gap-3 items-start">
                            <div className={cn(
                              'shrink-0 h-9 w-9 rounded-full flex items-center justify-center',
                              meta.bg, meta.color,
                            )}>
                              <Icon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-semibold text-[#1F1A14]">
                                  {buildNotifTitle(t, typeMeta, n)}
                                </span>
                                {!n.is_read && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#B0273A] shrink-0" aria-label="non lue" />
                                )}
                                {hasLink && (
                                  <ChevronRight
                                    size={14}
                                    className="ml-auto text-[#A89A82] group-hover:text-[#1F1A14] transition shrink-0"
                                  />
                                )}
                              </div>
                              <p className="text-[13px] text-[#3F362A] mt-0.5 leading-snug line-clamp-2">
                                {buildNotifMessage(t, n)}
                              </p>
                              <p className="text-[11px] text-[#8C7E68] mt-1">
                                {n.created_at && formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: dateLocale })}
                              </p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(n.id) }}
                              className="opacity-0 group-hover:opacity-100 transition p-1 text-[#A89A82] hover:text-[#B0273A] shrink-0"
                              aria-label={t('notifications.deleteOne', 'Supprimer cette notification')}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </motion.li>
                      )
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {/* Footer : "Voir toutes" (toujours visible) + "Tout marquer lu" (si non-lues) */}
            {list.length > 0 && (
              <div className="border-t border-[#E8DFC9] bg-[#F5EFE2] px-4 py-2.5 flex items-center gap-3">
                <button
                  onClick={() => {
                    setOpen(false)
                    // Staff → inbox admin, sinon dashboard perso
                    const isStaff = roles.includes('superadmin') || roles.includes('pasteur') ||
                                    roles.includes('admin') || roles.includes('admin-site') ||
                                    roles.includes('rh') || roles.includes('tresorier') ||
                                    roles.includes('accueil') || roles.includes('admin-site')
                    navigate(isStaff ? '/admin/notifications' : '/mon-espace')
                  }}
                  className="text-[13px] font-medium text-[#6B5F4E] hover:text-[#1F1A14] transition inline-flex items-center gap-1.5"
                >
                  {t('notifications.viewAll', 'Voir toutes')} <ChevronRight size={13}/>
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAll}
                    className="ml-auto text-[13px] font-medium text-[#B0273A] hover:text-[#6E1424] transition inline-flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    {t('notifications.markAllRead', 'Tout marquer comme lu')}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
