/**
 * Inbox complète des notifications utilisateur.
 *
 * Accessible via cloche → "Voir toutes" OU fallback quand pas de deep-link.
 * Rôle-agnostique (staff, gouverneur, leader, membre) : chaque user voit ses
 * propres notifs.
 *
 *  - Filtres : toutes / non-lues / par type
 *  - Pagination curseur (charger plus)
 *  - Clic → navigation vers la page cible (via buildNotifLink)
 *  - Actions : marquer lu, supprimer, tout marquer lu
 */
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatDistanceToNow, format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import {
  Bell, Check, Trash2, ChevronRight, Filter, RefreshCw,
  Ticket, TrendingUp, Clock, ShieldAlert, Sparkles, ListOrdered,
  FileText, AlertTriangle, Award, Users, CalendarClock,
} from 'lucide-react'

import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/store/notificationStore'
import {
  useNotifications, useMarkNotificationRead,
  useMarkAllNotificationsRead, useDeleteNotification,
} from '@/api/notifications'

/** Meta d'affichage par type (icône + couleur + label). */
function buildTypeMeta(t) {
  return {
    // Rapports & cellules
    DepartmentReportSubmittedNotification: { icon: FileText,      color: 'text-[#B0273A]',   bg: 'bg-[#FCE7EB]',  label: t('notifications.types.deptReportSubmitted', 'Rapport département') },
    DepartmentReportReviewedNotification:  { icon: Check,         color: 'text-emerald-700', bg: 'bg-emerald-100', label: t('notifications.types.deptReportReviewed', 'Rapport revu') },
    CellReportSubmittedNotification:       { icon: FileText,      color: 'text-[#B0273A]',   bg: 'bg-[#FCE7EB]',  label: t('notifications.types.cellReportSubmitted', 'Rapport cellule') },
    ReportOverdueNotification:             { icon: AlertTriangle, color: 'text-red-700',     bg: 'bg-red-100',    label: t('notifications.types.reportOverdue', 'Rapport en retard') },
    CellMissingReportNotification:         { icon: AlertTriangle, color: 'text-orange-700',  bg: 'bg-orange-100', label: t('notifications.types.cellMissingReport', 'Rapport manquant') },
    GovernorAppointedNotification:         { icon: Award,         color: 'text-[#B79358]',   bg: 'bg-[#F5EFE2]',  label: t('notifications.types.governorAppointed', 'Nomination') },
    CellLeaderAppointedNotification:       { icon: Users,         color: 'text-[#B79358]',   bg: 'bg-[#F5EFE2]',  label: t('notifications.types.cellLeaderAppointed', 'Nomination') },
    WeeklyDigestNotification:              { icon: CalendarClock, color: 'text-blue-700',    bg: 'bg-blue-100',   label: t('notifications.types.weeklyDigest', 'Digest hebdo') },
    // Billetterie (Sprint B)
    NouvelleInscriptionAdminNotification:  { icon: Ticket,        color: 'text-[#B0273A]',   bg: 'bg-[#FCE7EB]',  label: t('notifications.types.newTicket', 'Nouvelle inscription') },
    DigestQuotidienBilletterieNotification:{ icon: CalendarClock, color: 'text-blue-700',    bg: 'bg-blue-100',   label: t('notifications.types.dailyDigest', 'Digest billetterie') },
    AlerteCapaciteNotification:            { icon: TrendingUp,    color: 'text-orange-700',  bg: 'bg-orange-100', label: t('notifications.types.capacityAlert', 'Alerte capacité') },
    AlerteWaitlistNotification:            { icon: ListOrdered,   color: 'text-purple-700',  bg: 'bg-purple-100', label: t('notifications.types.waitlistAlert', 'Liste d\'attente') },
    RappelJourJ1Notification:              { icon: Clock,         color: 'text-emerald-700', bg: 'bg-emerald-100',label: t('notifications.types.j1Reminder', 'Rappel J-1') },
    BienvenueNouveauMembreNotification:    { icon: Sparkles,      color: 'text-[#B79358]',   bg: 'bg-[#F5EFE2]',  label: t('notifications.types.welcome', 'Bienvenue') },
    AlerteAnomalieSecuriteNotification:    { icon: ShieldAlert,   color: 'text-red-700',     bg: 'bg-red-100',    label: t('notifications.types.securityAlert', 'Alerte sécurité') },
  }
}

/** Extrait titre depuis payload (data.title en priorité). */
function extractTitle(t, typeMeta, notif) {
  const d = notif.data?.data ?? notif.data ?? {}
  if (d.title && typeof d.title === 'string') return d.title
  return typeMeta[notif.type]?.label ?? t('notifications.defaultTitle', 'Notification')
}

/** Extrait message depuis payload (data.body en priorité). */
function extractMessage(notif) {
  const d = notif.data?.data ?? notif.data ?? {}
  if (d.body && typeof d.body === 'string') return d.body
  return ''
}

/** Extrait URL de navigation depuis payload. */
function extractLink(notif) {
  const d = notif.data?.data ?? notif.data ?? {}
  if (d.url && typeof d.url === 'string' && d.url.startsWith('/')) return d.url
  return null
}

export default function NotificationsInboxPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr
  const typeMeta = buildTypeMeta(t)

  const [unreadOnly, setUnreadOnly] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')

  const params = useMemo(() => {
    const p = { per_page: 50 }
    if (unreadOnly) p.unread_only = 1
    if (typeFilter) p.type = typeFilter
    return p
  }, [unreadOnly, typeFilter])

  const { data, isLoading, refetch, isFetching } = useNotifications(params)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const deleteOne = useDeleteNotification()

  const markReadLocal = useNotificationStore((s) => s.markRead)
  const markAllReadLocal = useNotificationStore((s) => s.markAllRead)
  const removeLocal = useNotificationStore((s) => s.remove)

  const items = data?.data ?? []

  // Liste des types disponibles pour le filtre
  const availableTypes = useMemo(() => {
    const set = new Set(items.map((n) => n.type).filter(Boolean))
    return [...set].sort()
  }, [items])

  const handleClick = (n) => {
    if (!n.is_read) {
      markReadLocal(n.id)
      markRead.mutate(n.id)
    }
    const link = extractLink(n)
    if (link) navigate(link)
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    removeLocal(id)
    deleteOne.mutate(id)
  }

  const handleMarkAll = () => {
    markAllReadLocal()
    markAllRead.mutate()
  }

  const handleMarkOne = (e, n) => {
    e.stopPropagation()
    if (n.is_read) return
    markReadLocal(n.id)
    markRead.mutate(n.id)
  }

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--adm-accent)] mb-1">
            <Bell size={12} className="inline mr-1"/>{t('notifications.inbox.tag', 'Boîte de réception')}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--adm-text)' }}>
            {t('notifications.inbox.title', 'Mes notifications')}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {t('notifications.inbox.subtitle', 'Toutes les notifications que tu as reçues, classées par date.')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="adm-btn adm-btn-ghost"
            title={t('notifications.inbox.refresh', 'Actualiser')}
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''}/>
          </button>
          <button
            onClick={handleMarkAll}
            disabled={markAllRead.isPending}
            className="adm-btn adm-btn-primary"
          >
            <Check size={14}/>
            {t('notifications.inbox.markAllRead', 'Tout marquer comme lu')}
          </button>
        </div>
      </header>

      {/* Filtres */}
      <section className="adm-card p-3 sm:p-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="h-4 w-4 accent-[color:var(--adm-accent)]"
          />
          <span>{t('notifications.inbox.unreadOnly', 'Non-lues uniquement')}</span>
        </label>
        {availableTypes.length > 1 && (
          <div className="inline-flex items-center gap-2">
            <Filter size={14} className="text-zinc-500"/>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="adm-select text-sm"
            >
              <option value="">{t('notifications.inbox.allTypes', 'Tous les types')}</option>
              {availableTypes.map((tp) => (
                <option key={tp} value={tp}>{typeMeta[tp]?.label ?? tp}</option>
              ))}
            </select>
          </div>
        )}
        <span className="ml-auto text-xs text-zinc-500">
          {t('notifications.inbox.total', '{{n}} notification(s)', { n: items.length })}
        </span>
      </section>

      {/* Liste */}
      {isLoading ? (
        <div className="adm-card p-16 text-center text-zinc-500">
          {t('notifications.inbox.loading', 'Chargement…')}
        </div>
      ) : items.length === 0 ? (
        <div className="adm-card p-16 text-center">
          <Bell size={40} className="mx-auto mb-4 opacity-30 text-zinc-400"/>
          <p className="text-base text-zinc-600">
            {unreadOnly
              ? t('notifications.inbox.emptyUnread', 'Aucune notification non-lue.')
              : t('notifications.inbox.empty', 'Tu n\'as encore reçu aucune notification.')}
          </p>
        </div>
      ) : (
        <ul className="adm-card divide-y overflow-hidden" style={{ borderColor: 'var(--adm-border)' }}>
          {items.map((n) => {
            const meta = typeMeta[n.type] ?? { icon: Bell, color: 'text-zinc-600', bg: 'bg-zinc-100', label: t('notifications.defaultTitle', 'Notification') }
            const Icon = meta.icon
            const title = extractTitle(t, typeMeta, n)
            const message = extractMessage(n)
            const link = extractLink(n)
            const hasLink = link !== null

            return (
              <li
                key={n.id}
                onClick={() => handleClick(n)}
                className={`group px-4 sm:px-5 py-4 cursor-pointer transition ${
                  !n.is_read ? 'bg-[#FDF9EE]' : 'bg-white'
                } hover:bg-[#F0E7D1]/60`}
              >
                <div className="flex gap-4 items-start">
                  <div className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${meta.bg} ${meta.color}`}>
                    <Icon size={18}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm ${!n.is_read ? 'font-bold' : 'font-semibold'} text-[#1F1A14]`}>
                        {title}
                      </span>
                      {!n.is_read && (
                        <span className="h-2 w-2 rounded-full bg-[#B0273A] shrink-0" aria-label="non lue"/>
                      )}
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 ml-auto">
                        {meta.label}
                      </span>
                    </div>
                    {message && (
                      <p className="text-sm text-[#3F362A] mt-1 leading-relaxed">
                        {message}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[11px] text-zinc-500">
                        {n.created_at
                          ? format(new Date(n.created_at), "d MMM 'à' HH:mm", { locale: dateLocale })
                          : ''}
                        {' · '}
                        {n.created_at
                          ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: dateLocale })
                          : ''}
                      </span>
                      {hasLink && (
                        <span className="text-[11px] text-[color:var(--adm-accent)] font-medium inline-flex items-center gap-0.5">
                          {t('notifications.inbox.openLink', 'Ouvrir')} <ChevronRight size={11}/>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                    {!n.is_read && (
                      <button
                        onClick={(e) => handleMarkOne(e, n)}
                        className="p-1.5 text-zinc-400 hover:text-emerald-700 rounded transition"
                        title={t('notifications.inbox.markRead', 'Marquer comme lue')}
                      >
                        <Check size={14}/>
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(e, n.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-700 rounded transition"
                      title={t('notifications.inbox.delete', 'Supprimer')}
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
