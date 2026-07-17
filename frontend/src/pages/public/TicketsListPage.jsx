/** Liste publique des événements ticketés. */
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Ticket, AlertTriangle, Layers, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import Spinner from '@/components/ui/Spinner.jsx'
import PublicSectionHeader from '@/components/public/PublicSection.jsx'
import { publicTickets, publicSeries } from '@/api/public'

export default function TicketsListPage() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['public', 'tickets', 'events'],
    queryFn: publicTickets.events,
    staleTime: 60 * 1000,
  })
  const { data: series = [] } = useQuery({
    queryKey: ['public', 'series'],
    queryFn: publicSeries.list,
    staleTime: 60 * 1000,
  })

  // Filtre les events seuls (sans série) pour la grille — les events de série
  // s'affichent dans leur série au-dessus.
  const standalone = events.filter((e) => !series.some((s) => s.next_event?.id === e.id || s.events?.some(se => se.id === e.id)))

  return (
    <div className="bg-public-bone min-h-screen">
      <header className="container-nwc pt-16 lg:pt-24 pb-10">
        <PublicSectionHeader
          eyebrow="Billetterie"
          title={<>Réserve<br/><span className="text-public-flame">ton ticket.</span></>}
          desc="Inscris-toi gratuitement à nos événements et reçois ton ticket par email avec QR code."
        />
      </header>

      {/* Séries d'événements */}
      {series.length > 0 && (
        <section className="container-nwc pb-12">
          <p className="tag-mono text-public-flame mb-4">Cycles & séries</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {series.map((s) => <SeriesCard key={s.id} series={s}/>)}
          </div>
        </section>
      )}

      <section className="container-nwc pb-24">
        {series.length > 0 && standalone.length > 0 && (
          <p className="tag-mono text-public-flame mb-4">Événements uniques</p>
        )}
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size={32}/></div>
        ) : standalone.length === 0 && series.length === 0 ? (
          <div className="border-2 border-public-ink/15 p-12 text-center">
            <Ticket size={48} className="mx-auto text-public-ink/30 mb-4"/>
            <p className="font-display uppercase text-2xl text-public-ink">Aucun événement avec billetterie pour le moment.</p>
            <p className="mt-2 text-public-ink/60">Reviens bientôt — un nouvel événement est en préparation.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {standalone.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </section>
    </div>
  )
}

function SeriesCard({ series }) {
  const nextDate = series.next_event?.starts_at ? new Date(series.next_event.starts_at) : null
  return (
    <Link to={`/billetterie/serie/${series.slug}`} className="group block">
      <div className="aspect-video relative bg-public-coffee overflow-hidden">
        {series.cover_image ? (
          <img src={series.cover_image} alt="" loading="lazy"
               className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"/>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-public-flame/40 to-public-coffee"/>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-public-ink/70 via-transparent"/>
        <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 bg-public-flame text-public-bone font-mono text-[10px] uppercase tracking-widest">
          <Layers size={9}/> Série · {series.upcoming_count} date{series.upcoming_count > 1 ? 's' : ''}
        </div>
      </div>
      <div className="mt-4">
        <h3 className="font-display uppercase text-2xl text-public-ink group-hover:text-public-flame transition leading-tight">
          {series.display_title || series.title}
        </h3>
        {nextDate && (
          <p className="mt-2 tag-mono text-public-ink/60 inline-flex items-center gap-2">
            <Calendar size={12}/> Prochaine : {format(nextDate, "EEEE d MMM", { locale: fr })}
          </p>
        )}
        {series.default_location && (
          <p className="mt-1 text-sm text-public-ink/50 inline-flex items-center gap-1">
            <MapPin size={12}/> {series.default_location}
          </p>
        )}
        <p className="mt-3 inline-flex items-center gap-1 text-xs uppercase tracking-wider font-mono text-public-flame">
          Voir toutes les dates <ChevronRight size={12}/>
        </p>
      </div>
    </Link>
  )
}

function EventCard({ event }) {
  const date = event.starts_at ? new Date(event.starts_at) : null
  const fillRate = event.tickets_capacity && event.tickets_sold
    ? Math.round((event.tickets_sold / event.tickets_capacity) * 100)
    : 0
  const remaining = event.tickets_capacity ? (event.tickets_capacity - (event.tickets_sold || 0)) : null
  const showLowStock = remaining !== null && remaining > 0 && remaining < event.tickets_capacity * 0.2

  return (
    <Link to={`/billetterie/${event.slug}`} className="group block">
      <div className="aspect-video relative bg-public-coffee overflow-hidden">
        {event.cover_image ? (
          <img src={event.cover_image} alt="" loading="lazy"
               className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-public-flame/40 to-public-coffee" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-public-ink/70 via-transparent"/>
        {date && (
          <div className="absolute top-3 left-3 bg-public-bone text-public-ink p-2.5 leading-none">
            <p className="tag-mono text-public-flame">{format(date, 'MMM', { locale: fr })}</p>
            <p className="font-display text-3xl mt-0.5">{format(date, 'd')}</p>
          </div>
        )}
        <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 bg-public-flame text-public-bone font-mono text-[10px] uppercase tracking-widest">
          <Ticket size={9}/> Entrée gratuite
        </div>
        {showLowStock && (
          <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2 py-1 bg-red-600 text-white font-mono text-[10px] uppercase tracking-widest">
            <AlertTriangle size={9}/> Plus que {remaining}
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className="font-display uppercase text-2xl text-public-ink group-hover:text-public-flame transition leading-tight">
          {event.display_title || event.title}
        </h3>
        {date && (
          <p className="mt-2 tag-mono text-public-ink/60 inline-flex items-center gap-2">
            <Calendar size={12}/> {format(date, "EEEE · HH'h'mm", { locale: fr })}
          </p>
        )}
        {event.location && (
          <p className="mt-1 text-sm text-public-ink/50 inline-flex items-center gap-1">
            <MapPin size={12}/> {event.display_location || event.location}
          </p>
        )}
        {event.tickets_capacity && (
          <div className="mt-3">
            <div className="h-1 bg-public-ink/10">
              <div className="h-full bg-public-flame transition-all" style={{ width: `${fillRate}%` }} />
            </div>
            <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-public-ink/50">
              {event.tickets_sold || 0} / {event.tickets_capacity} inscrits
            </p>
          </div>
        )}
      </div>
    </Link>
  )
}
