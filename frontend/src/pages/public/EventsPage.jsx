/**
 * Liste publique des événements — Magazine Drop v2.
 *
 * 3 onglets : Tous (défaut) · À venir · Passés.
 * - "Tous" : à venir d'abord (proximité ASC) puis passés (récence DESC),
 *   avec un badge visuel "À venir" / "Passé" pour distinguer.
 * - "À venir" / "Passés" : pas de badge, la date suffit comme contexte.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format, isFuture, isToday, differenceInDays } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { Calendar, MapPin, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import Spinner from '@/components/ui/Spinner.jsx'
import PublicSectionHeader from '@/components/public/PublicSection.jsx'
import { publicEvents } from '@/api/public'
import { cn } from '@/utils/cn'

export default function EventsPage() {
  const { t } = useTranslation()
  // Onglet par défaut : "all" — voir d'un coup tous les événements,
  // les prochains en premier, les passés en bas, comme un vrai agenda.
  const [tab, setTab] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['public', 'events', tab],
    queryFn: () => publicEvents.list({ per_page: 24, scope: tab }),
  })

  const items = data?.data ?? []

  // Le badge n'est utile que dans l'onglet "Tous" — sinon le contexte du
  // tab clique suffit pour comprendre.
  const showBadge = tab === 'all'

  return (
    <div className="bg-public-bone min-h-screen">
      <header className="container-nwc pt-16 lg:pt-24 pb-10">
        <PublicSectionHeader
          eyebrow={t('events.pageTitle', 'Événements')}
          title={<>{t('events.heroTitle1', 'Vivons-le')}<br/><span className="text-public-flame">{t('events.heroTitle2', 'ensemble.')}</span></>}
          desc={t('events.heroDesc', 'Cultes, nuits de prière, formations, évangélisation. Rejoins-nous.')}
        />

        <div className="mt-10 flex gap-1 border-b-2 border-public-ink/15 overflow-x-auto">
          <TabBtn active={tab === 'all'} onClick={() => setTab('all')}>
            {t('events.tabAll', 'Tous')}
          </TabBtn>
          <TabBtn active={tab === 'upcoming'} onClick={() => setTab('upcoming')}>
            {t('events.tabUpcoming', 'À venir')}
          </TabBtn>
          <TabBtn active={tab === 'past'} onClick={() => setTab('past')}>
            {t('events.tabPast', 'Passés')}
          </TabBtn>
        </div>
      </header>

      <section className="container-nwc pb-24">
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size={32}/></div>
        ) : items.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {items.map((e) => <EventCard key={e.id} event={e} showBadge={showBadge} />)}
          </div>
        )}
      </section>
    </div>
  )
}

function EmptyState({ tab }) {
  const { t } = useTranslation()
  const msg = tab === 'upcoming'
    ? t('events.noUpcoming', 'Aucun événement à venir.')
    : tab === 'past'
      ? t('events.noPast', 'Aucun événement passé.')
      : t('events.noEvents', 'Aucun événement pour le moment.')
  return (
    <div className="border-2 border-public-ink/15 p-12 text-center">
      <Calendar size={48} className="mx-auto text-public-ink/30 mb-4"/>
      <p className="font-display uppercase text-2xl text-public-ink">{msg}</p>
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-5 py-3 font-mono text-xs uppercase tracking-widest border-b-2 -mb-[2px] transition whitespace-nowrap',
        active
          ? 'border-public-flame text-public-flame'
          : 'border-transparent text-public-ink/60 hover:text-public-ink',
      )}
    >{children}</button>
  )
}

function EventCard({ event: e, showBadge }) {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr
  const startDate = e.starts_at ? new Date(e.starts_at) : null
  const isUpcoming = startDate ? (isFuture(startDate) || isToday(startDate)) : false
  const isPast = startDate ? !isUpcoming : false

  // Compte à rebours simple — ne s'affiche que pour les events à venir < 30j.
  const daysUntil = startDate && isUpcoming ? differenceInDays(startDate, new Date()) : null
  const showCountdown = daysUntil !== null && daysUntil >= 0 && daysUntil <= 30

  return (
    <Link to={`/evenements/${e.slug}`} className={cn('group block', isPast && 'opacity-90')}>
      <div className="aspect-video relative bg-public-coffee overflow-hidden">
        {e.cover_image ? (
          <img
            src={e.cover_image}
            alt=""
            loading="lazy"
            className={cn(
              'w-full h-full object-cover transition-transform duration-700 group-hover:scale-105',
              isPast && 'grayscale-[40%]',
            )}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-public-flame/40 to-public-coffee"/>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-public-ink/70 via-transparent"/>

        {/* Pavé date (haut-gauche) */}
        {startDate && (
          <div className="absolute top-3 left-3 bg-public-bone text-public-ink p-2.5 leading-none">
            <p className="tag-mono text-public-flame">{format(startDate, 'MMM', { locale: dateLocale })}</p>
            <p className="font-display text-3xl mt-0.5">{format(startDate, 'd')}</p>
          </div>
        )}

        {/* Badge À venir / Passé (uniquement onglet Tous) */}
        {showBadge && startDate && (
          <div className={cn(
            'absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 font-mono text-[10px] uppercase tracking-widest',
            isUpcoming
              ? 'bg-public-flame text-public-bone'
              : 'bg-public-ink/85 text-public-bone/80',
          )}>
            {isUpcoming
              ? <>● {t('events.badgeUpcoming', 'À venir')}</>
              : <>○ {t('events.badgePast', 'Passé')}</>}
          </div>
        )}

        {/* Compte à rebours dans le coin bas, uniquement événements proches */}
        {showCountdown && (
          <div className="absolute bottom-3 right-3 bg-public-bone/95 text-public-ink px-2 py-1 font-mono text-[10px] uppercase tracking-widest inline-flex items-center gap-1">
            <Clock size={10}/>
            {daysUntil === 0
              ? t('events.today', "Aujourd'hui")
              : daysUntil === 1
                ? t('events.tomorrow', 'Demain')
                : t('events.inDays', 'dans {{n}}j', { n: daysUntil })}
          </div>
        )}
      </div>

      <div className="mt-4">
        <h3 className={cn(
          'font-display uppercase text-2xl transition leading-tight',
          isPast ? 'text-public-ink/70 group-hover:text-public-ink' : 'text-public-ink group-hover:text-public-flame',
        )}>
          {e.title}
        </h3>
        {startDate && (
          <p className="mt-2 tag-mono text-public-ink/60">
            {format(startDate, "EEEE · HH'h'mm", { locale: dateLocale })}
          </p>
        )}
        {e.location && (
          <p className="mt-1 text-sm text-public-ink/50 inline-flex items-center gap-1">
            <MapPin size={12}/> {e.location}
          </p>
        )}
      </div>
    </Link>
  )
}
