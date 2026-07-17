/**
 * Phase 5 — Page publique détail série + liste des occurrences.
 *
 *  /billetterie/serie/{slug}
 */
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Calendar, MapPin, Ticket, Layers, ChevronRight, AlertTriangle,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import Spinner from '@/components/ui/Spinner.jsx'
import { publicSeries } from '@/api/public'

export default function TicketSeriesPage() {
  const { slug } = useParams()
  const { data, isLoading } = useQuery({
    queryKey: ['public', 'series', slug],
    queryFn: () => publicSeries.get(slug),
  })

  if (isLoading) return <div className="min-h-screen bg-public-bone flex items-center justify-center"><Spinner size={32}/></div>

  const series = data?.series
  const occurrences = data?.occurrences ?? []

  if (!series) {
    return (
      <div className="min-h-screen bg-public-bone flex flex-col items-center justify-center px-4">
        <p className="font-display uppercase text-3xl text-public-ink">Série introuvable</p>
        <Link to="/billetterie" className="mt-4 inline-flex items-center gap-2 text-public-flame underline">
          <ArrowLeft size={16}/> Retour à la billetterie
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-public-bone pb-24">
      {/* HERO */}
      <header className="relative bg-public-coffee text-public-bone">
        {series.cover_image && (
          <div className="absolute inset-0">
            <img src={series.cover_image} alt="" className="w-full h-full object-cover opacity-30"/>
            <div className="absolute inset-0 bg-gradient-to-b from-public-ink/40 to-public-coffee"/>
          </div>
        )}
        <div className="container-nwc relative py-12 lg:py-20">
          <Link to="/billetterie" className="inline-flex items-center gap-2 tag-mono text-public-bone/70 hover:text-public-bone mb-6">
            <ArrowLeft size={12}/> Toute la billetterie
          </Link>
          <p className="tag-mono text-public-flame mb-3 inline-flex items-center gap-2">
            <Layers size={11}/> Série · {occurrences.length} date{occurrences.length > 1 ? 's' : ''}
          </p>
          <h1 className="heading-anton text-5xl sm:text-7xl lg:text-8xl leading-[0.92]">{series.display_title || series.title}</h1>
          {series.default_location && (
            <p className="mt-6 inline-flex items-center gap-2 text-sm text-public-bone/80">
              <MapPin size={14}/> {series.default_location}
            </p>
          )}
        </div>
      </header>

      {/* Description */}
      {(series.display_description || series.description) && (
        <section className="container-nwc mt-10">
          <p className="prose-nwc text-public-ink/85 whitespace-pre-line text-base lg:text-lg leading-relaxed max-w-3xl">
            {series.display_description || series.description}
          </p>
        </section>
      )}

      {/* Liste occurrences */}
      <section className="container-nwc mt-10">
        <p className="tag-mono text-public-flame mb-4">Toutes les dates</p>
        {occurrences.length === 0 ? (
          <p className="text-public-ink/60 italic">Aucune date publiée pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {occurrences.map((o) => <OccurrenceCard key={o.id} occurrence={o}/>)}
          </div>
        )}
      </section>
    </div>
  )
}

function OccurrenceCard({ occurrence }) {
  const d = occurrence.starts_at ? new Date(occurrence.starts_at) : null
  const past = occurrence.is_past
  const canReserve = !past && occurrence.ticketing_enabled && occurrence.is_open
  const closed = !past && occurrence.ticketing_enabled && !occurrence.is_open
  const noBilletterie = !occurrence.ticketing_enabled

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-2 transition
                     ${past ? 'border-public-ink/10 opacity-60' :
                       canReserve ? 'border-public-flame/30 hover:border-public-flame' :
                       'border-public-ink/15'}`}>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {d && (
          <div className="bg-public-bone text-public-ink p-2.5 leading-none text-center min-w-[60px]">
            <p className="tag-mono text-public-flame text-[10px]">{format(d, 'MMM', { locale: fr })}</p>
            <p className="font-display text-2xl mt-0.5">{format(d, 'd')}</p>
            <p className="text-[10px] mt-0.5 opacity-60">{format(d, 'HH:mm')}</p>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-display uppercase text-lg text-public-ink truncate">{occurrence.display_title || occurrence.title}</p>
          {(occurrence.display_location || occurrence.location) && (
            <p className="text-xs text-public-ink/60 inline-flex items-center gap-1 mt-0.5">
              <MapPin size={11}/> {occurrence.display_location || occurrence.location}
            </p>
          )}
          {occurrence.ticketing_enabled && occurrence.tickets_capacity && (
            <p className="text-xs mt-1 text-public-ink/70">
              <Ticket size={11} className="inline mr-1 text-public-flame"/>
              {occurrence.tickets_sold ?? 0} / {occurrence.tickets_capacity} inscrits
            </p>
          )}
        </div>
      </div>
      <div className="shrink-0">
        {past ? (
          <span className="inline-flex items-center px-3 py-1.5 text-[10px] uppercase tracking-widest font-mono bg-public-ink/10 text-public-ink/60">
            Passé
          </span>
        ) : canReserve ? (
          <Link to={`/billetterie/${occurrence.slug}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-public-flame text-public-bone font-mono uppercase text-xs tracking-widest hover:bg-public-ink transition">
            S'inscrire <ChevronRight size={14}/>
          </Link>
        ) : closed ? (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] uppercase tracking-widest font-mono bg-orange-100 text-orange-700">
            <AlertTriangle size={10}/> Complet ou fermé
          </span>
        ) : noBilletterie ? (
          <span className="inline-flex items-center px-3 py-1.5 text-[10px] uppercase tracking-widest font-mono bg-public-bone text-public-ink/60">
            Entrée libre
          </span>
        ) : null}
      </div>
    </div>
  )
}
