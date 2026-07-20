/**
 * BalHubPage — Point d'entrée du système Bal live.
 *
 * Liste tous les événements ticketed et propose pour chacun les 5 accès :
 * Régie · Candidats · Photos · PDF supports · Écran live (nouvel onglet).
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Monitor, Users, Camera, FileText, ExternalLink, Crown, Calendar,
  MapPin, Sparkles, Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import api from '@/api/axios'

export default function BalHubPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'events', 'for-bal'],
    queryFn: () => api.get('/admin/events', { params: { per_page: 100 } }).then((r) => r.data.data ?? []),
  })

  // Filtre events ticketés
  const events = useMemo(() => {
    const list = (data ?? []).filter((e) => e.ticketing_enabled)
    // Tri : le plus récent en premier (par starts_at descendant)
    return list.sort((a, b) => {
      const da = a.starts_at ? new Date(a.starts_at).getTime() : 0
      const db = b.starts_at ? new Date(b.starts_at).getTime() : 0
      return db - da
    })
  }, [data])

  return (
    <div className="space-y-5 max-w-5xl">
      <header>
        <p className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--adm-accent)] mb-1">
          <Sparkles size={12} className="inline mr-1"/>
          Bal live — Régie & vote
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--adm-text)' }}>
          Événements avec écran live
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Choisis un événement pour piloter son écran, gérer les candidats Roi/Reine, uploader les photos ambiance ou imprimer les supports de table.
        </p>
      </header>

      {isLoading ? (
        <div className="adm-card p-16 text-center text-zinc-500">
          <Loader2 size={24} className="animate-spin inline"/>
        </div>
      ) : events.length === 0 ? (
        <div className="adm-card p-16 text-center">
          <Calendar size={40} className="mx-auto mb-4 opacity-30 text-zinc-400"/>
          <p className="text-base text-zinc-600">Aucun événement avec billetterie activée.</p>
          <Link to="/admin/evenements" className="adm-btn adm-btn-primary mt-4 inline-flex">
            Voir tous les événements
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((event) => <EventCard key={event.id} event={event}/>)}
        </div>
      )}
    </div>
  )
}

function EventCard({ event }) {
  const start = event.starts_at ? new Date(event.starts_at) : null
  const now = new Date()
  const isPast = start && start < now
  const isToday = start && start.toDateString() === now.toDateString()

  return (
    <div className={`adm-card p-5 border-l-4 ${
      isToday ? 'border-l-emerald-500 ring-2 ring-emerald-500/30' :
      isPast ? 'border-l-zinc-300 opacity-70' :
      'border-l-[color:var(--adm-accent)]'
    }`}>
      {/* Titre + date */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold leading-tight" style={{ color: 'var(--adm-text)' }}>
            {event.display_title || event.title}
          </h2>
          {isToday && (
            <span className="shrink-0 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest bg-emerald-500 text-white rounded">
              🔴 LIVE
            </span>
          )}
        </div>
        {start && (
          <p className="text-xs text-zinc-500 mt-1 inline-flex items-center gap-1">
            <Calendar size={11}/> {format(start, "EEE d MMM yyyy · HH'h'mm", { locale: fr })}
          </p>
        )}
        {event.location && (
          <p className="text-xs text-zinc-500 mt-0.5 inline-flex items-center gap-1">
            <MapPin size={11}/> <span className="truncate">{event.display_location || event.location}</span>
          </p>
        )}
      </div>

      {/* Grille d'actions */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          to={`/admin/bal/${event.id}/regie`}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[color:var(--adm-accent)] text-white rounded hover:opacity-90 transition"
        >
          <Monitor size={14}/> Régie
        </Link>
        <a
          href={`/live/bal/${event.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider border-2 border-[color:var(--adm-accent)]/40 text-[color:var(--adm-accent)] rounded hover:bg-[color:var(--adm-accent)]/5 transition"
        >
          <ExternalLink size={14}/> Écran live
        </a>
        <Link
          to={`/admin/bal/${event.id}/candidats`}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider bg-white border border-zinc-300 text-zinc-700 rounded hover:bg-zinc-50 transition"
        >
          <Crown size={13}/> Candidats
        </Link>
        <Link
          to={`/admin/bal/${event.id}/photos`}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider bg-white border border-zinc-300 text-zinc-700 rounded hover:bg-zinc-50 transition"
        >
          <Camera size={13}/> Photos
        </Link>
        <a
          href={`${import.meta.env.VITE_API_URL || '/api'}/admin/events/${event.id}/bal/table-supports`}
          target="_blank"
          rel="noopener noreferrer"
          className="col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider bg-white border border-zinc-300 text-zinc-700 rounded hover:bg-zinc-50 transition"
        >
          <FileText size={13}/> PDF supports de table (recto vote / verso follow us)
        </a>
      </div>
    </div>
  )
}
