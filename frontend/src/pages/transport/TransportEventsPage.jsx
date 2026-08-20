/**
 * TransportEventsPage — Liste des events avec address_capture activé.
 *
 * URL : /gouverneur/transport
 * Accès : dept Transport (governor + membres + admin bypass, cf middleware)
 *
 * Le user choisit un event → arrive sur TransportEventDetailPage avec carte.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MapPin, Users, Calendar, ArrowRight, Loader2, Truck } from 'lucide-react'
import api from '@/api/axios'

export default function TransportEventsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['transport', 'events'],
    queryFn: () => api.get('/transport/events').then((r) => r.data),
  })
  const events = data?.events ?? []

  return (
    <div className="space-y-6 max-w-6xl">
      <header>
        <p className="text-xs font-mono uppercase tracking-widest text-[color:var(--adm-accent)] mb-1">
          <Truck size={12} className="inline mr-1"/> Transport
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--adm-text)' }}>
          Événements à desservir
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Choisis un événement pour voir la cartographie des inscrits et organiser les navettes.
        </p>
      </header>

      {isLoading ? (
        <div className="text-center py-16"><Loader2 size={24} className="animate-spin inline"/></div>
      ) : events.length === 0 ? (
        <div className="adm-card p-12 text-center">
          <Truck size={40} className="mx-auto text-zinc-400 mb-3 opacity-40"/>
          <p className="text-sm text-zinc-600">
            Aucun événement ne collecte d'adresses pour l'instant.
          </p>
          <p className="text-xs text-zinc-400 mt-2">
            Les events avec <code>modules_enabled.address_capture = true</code> apparaîtront ici automatiquement.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((e) => {
            const past = e.starts_at && new Date(e.starts_at) < new Date()
            return (
              <Link
                key={e.id}
                to={`/gouverneur/transport/${e.slug}`}
                className="adm-card p-5 hover:border-[color:var(--adm-accent)] transition group flex gap-4 relative"
              >
                {e.cover_image && (
                  <div className="w-24 h-24 shrink-0 rounded overflow-hidden bg-zinc-100">
                    <img src={e.cover_image} alt="" className="w-full h-full object-cover"/>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-1">
                    {past ? 'PASSÉ' : 'À VENIR'}
                  </p>
                  <h3 className="text-base font-bold truncate" style={{ color: 'var(--adm-text)' }}>
                    {e.title}
                  </h3>
                  <div className="mt-2 space-y-1 text-xs text-zinc-500">
                    {e.starts_at && (
                      <div className="flex items-center gap-1.5">
                        <Calendar size={11}/> {format(new Date(e.starts_at), "d MMM yyyy 'à' HH'h'mm", { locale: fr })}
                      </div>
                    )}
                    {e.location && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin size={11}/> {e.location}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[color:var(--adm-accent)] font-semibold">
                      <Users size={11}/> {e.registrations_count} inscrit{e.registrations_count > 1 ? 's' : ''} avec adresse
                    </div>
                  </div>
                </div>
                <ArrowRight size={18} className="text-zinc-400 group-hover:text-[color:var(--adm-accent)] transition self-center"/>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
