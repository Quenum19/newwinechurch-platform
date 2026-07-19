/**
 * Hub Présence — page centrale d'accès pour l'équipe accueil.
 *
 * Liste les événements avec billetterie activée, triés par date de départ :
 *  - Aujourd'hui (en cours ou dans quelques heures)
 *  - À venir (7 prochains jours)
 *  - Récents (7 derniers jours — pour rapport post-event)
 *
 * Chaque event : accès direct à la liste présence + vue kiosque + rapport.
 * Aucune permission requise au-delà de `view attendance` (contrôlé par la route).
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { format, isSameDay, differenceInHours, differenceInDays } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import {
  Users, Calendar, MapPin, MonitorPlay, FileBarChart2,
  ClipboardList, ChevronRight, Circle, ArrowRight,
} from 'lucide-react'

import { events as adminEvents } from '@/api/admin'

/** Récupère la liste des events admin, filtrés côté client sur ticketing_enabled. */
function useTicketedEvents() {
  return useQuery({
    queryKey: ['admin', 'events', 'ticketed-for-attendance'],
    queryFn:  async () => (await adminEvents.list({ per_page: 100 })) ?? { data: [] },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export default function AttendanceHubPage() {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr

  const { data, isLoading } = useTicketedEvents()
  const allEvents = data?.data ?? []

  // Filtre les events ticketés uniquement
  const ticketedEvents = useMemo(() => {
    return allEvents.filter((e) => e.ticketing_enabled)
  }, [allEvents])

  // Segmente en 3 groupes : aujourd'hui, à venir (7j), récents (7j)
  const { today, upcoming, recent } = useMemo(() => {
    const now = new Date()
    const buckets = { today: [], upcoming: [], recent: [] }

    for (const evt of ticketedEvents) {
      if (!evt.starts_at) continue
      const start = new Date(evt.starts_at)
      const end = evt.ends_at ? new Date(evt.ends_at) : null

      if (isSameDay(start, now) || (end && now >= start && now <= end)) {
        buckets.today.push(evt)
      } else if (start > now && differenceInDays(start, now) <= 7) {
        buckets.upcoming.push(evt)
      } else if (start < now && differenceInDays(now, start) <= 7) {
        buckets.recent.push(evt)
      }
    }
    // Tri
    buckets.today.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
    buckets.upcoming.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
    buckets.recent.sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at))
    return buckets
  }, [ticketedEvents])

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <header>
        <p className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--adm-accent)] mb-1">
          <ClipboardList size={12} className="inline mr-1"/>
          {t('attendance.hub.tag', 'Service Accueil')}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--adm-text)' }}>
          {t('attendance.hub.title', 'Listes de présence')}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {t('attendance.hub.subtitle', 'Choisis un événement pour suivre les arrivées, scanner ou consulter le rapport.')}
        </p>
      </header>

      {isLoading ? (
        <div className="adm-card p-16 text-center text-zinc-500">
          {t('attendance.hub.loading', 'Chargement…')}
        </div>
      ) : ticketedEvents.length === 0 ? (
        <div className="adm-card p-16 text-center">
          <Calendar size={40} className="mx-auto mb-4 opacity-30 text-zinc-400"/>
          <p className="text-base text-zinc-600">
            {t('attendance.hub.noEvents', 'Aucun événement avec billetterie activée pour le moment.')}
          </p>
        </div>
      ) : (
        <>
          {/* AUJOURD'HUI — priorité maximale */}
          {today.length > 0 && (
            <Section
              title={t('attendance.hub.today', "Aujourd'hui")}
              subtitle={t('attendance.hub.todayHint', 'Événements en cours ou qui commencent bientôt')}
              accent
            >
              {today.map((evt) => <EventCard key={evt.id} evt={evt} highlight dateLocale={dateLocale} t={t}/>)}
            </Section>
          )}

          {/* À VENIR — 7 prochains jours */}
          {upcoming.length > 0 && (
            <Section
              title={t('attendance.hub.upcoming', 'À venir')}
              subtitle={t('attendance.hub.upcomingHint', 'Prochains événements ({{n}} dans les 7 jours)', { n: upcoming.length })}
            >
              {upcoming.map((evt) => <EventCard key={evt.id} evt={evt} dateLocale={dateLocale} t={t}/>)}
            </Section>
          )}

          {/* RÉCENTS — 7 derniers jours (rapports) */}
          {recent.length > 0 && (
            <Section
              title={t('attendance.hub.recent', 'Terminés récemment')}
              subtitle={t('attendance.hub.recentHint', 'Consulte le rapport post-événement')}
            >
              {recent.map((evt) => <EventCard key={evt.id} evt={evt} past dateLocale={dateLocale} t={t}/>)}
            </Section>
          )}

          {/* Rien à afficher */}
          {today.length === 0 && upcoming.length === 0 && recent.length === 0 && (
            <div className="adm-card p-16 text-center">
              <Calendar size={40} className="mx-auto mb-4 opacity-30 text-zinc-400"/>
              <p className="text-base text-zinc-600 mb-2">
                {t('attendance.hub.noRelevant', 'Aucun événement dans les 7 prochains ou derniers jours.')}
              </p>
              <p className="text-xs text-zinc-500">
                {t('attendance.hub.noRelevantHint', 'Reviens lorsqu\'un événement s\'approche.')}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Section({ title, subtitle, accent = false, children }) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className={`text-lg font-bold inline-flex items-center gap-2 ${accent ? 'text-[color:var(--adm-accent)]' : ''}`} style={{ color: accent ? undefined : 'var(--adm-text)' }}>
            {accent && <Circle size={10} className="animate-pulse fill-current"/>}
            {title}
          </h2>
          {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {children}
      </div>
    </section>
  )
}

function EventCard({ evt, highlight = false, past = false, dateLocale, t }) {
  const start = evt.starts_at ? new Date(evt.starts_at) : null
  const soldRatio = evt.tickets_capacity
    ? Math.round(((evt.tickets_sold || 0) / evt.tickets_capacity) * 100)
    : 0

  return (
    <div
      className={`adm-card p-4 sm:p-5 transition ${
        highlight ? 'ring-2 ring-[color:var(--adm-accent)]/40' : ''
      } ${past ? 'opacity-75' : ''}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-base leading-tight" style={{ color: 'var(--adm-text)' }}>
            {evt.display_title || evt.title}
          </h3>
          {start && (
            <p className="text-xs text-zinc-500 mt-1 inline-flex items-center gap-1">
              <Calendar size={11}/>
              {format(start, "EEE d MMM · HH:mm", { locale: dateLocale })}
            </p>
          )}
          {evt.location && (
            <p className="text-xs text-zinc-500 mt-0.5 inline-flex items-center gap-1">
              <MapPin size={11}/>
              <span className="truncate">{evt.display_location || evt.location}</span>
            </p>
          )}
        </div>
        {highlight && (
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest bg-[color:var(--adm-accent)] text-white rounded">
            <Circle size={7} className="fill-current animate-pulse"/> LIVE
          </span>
        )}
      </div>

      {/* Compteur tickets */}
      {evt.tickets_capacity > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
            <span>{t('attendance.hub.attendees', 'Attendus')}</span>
            <span className="tabular-nums">
              <strong className="text-[color:var(--adm-accent)]">{evt.tickets_sold || 0}</strong>
              {' / '}
              {evt.tickets_capacity}
            </span>
          </div>
          <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[color:var(--adm-accent)] transition-all"
              style={{ width: `${Math.min(100, soldRatio)}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          to={`/admin/evenements/${evt.id}/presence`}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider bg-[color:var(--adm-accent)] text-white rounded hover:opacity-90 transition"
        >
          <Users size={13}/>
          {t('attendance.hub.viewList', 'Liste')}
        </Link>
        <Link
          to={`/admin/evenements/${evt.id}/presence/kiosque`}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider border-2 border-[color:var(--adm-accent)]/40 text-[color:var(--adm-accent)] rounded hover:bg-[color:var(--adm-accent)]/5 transition"
        >
          <MonitorPlay size={13}/>
          {t('attendance.hub.kiosk', 'Kiosque')}
        </Link>
        {past && (
          <Link
            to={`/admin/evenements/${evt.id}/presence/rapport`}
            className="col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider bg-white border border-zinc-300 text-zinc-700 rounded hover:bg-zinc-50 transition"
          >
            <FileBarChart2 size={13}/>
            {t('attendance.hub.report', 'Rapport post-événement')}
            <ArrowRight size={11}/>
          </Link>
        )}
      </div>
    </div>
  )
}
