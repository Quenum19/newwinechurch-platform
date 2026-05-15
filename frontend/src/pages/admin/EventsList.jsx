/** Événements — Refonte 2026 admin-v2 native. */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Users, Trash2, MapPin, Calendar, ChevronRight } from 'lucide-react'
import { format, isPast } from 'date-fns'
import { fr } from 'date-fns/locale'

import DataTable from '@/components/admin/DataTable.jsx'
import { events } from '@/api/admin'

export default function EventsList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({ page: 1, per_page: 20 })

  const remove = useMutation({
    mutationFn: (id) => events.delete(id),
    onSuccess: () => {
      toast.success('Événement archivé.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] })
    },
  })

  const columns = [
    {
      key: 'title', label: 'Événement', sortable: true,
      render: (e) => (
        <div className="min-w-0">
          <div className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>{e.title}</div>
          {e.location && (
            <div className="text-xs inline-flex items-center gap-1 mt-0.5 truncate" style={{ color: 'var(--adm-text-muted)' }}>
              <MapPin size={10} /> {e.location}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'starts_at', label: 'Date', sortable: true,
      render: (e) => {
        if (!e.starts_at) return <span style={{ color: 'var(--adm-text-faint)' }}>—</span>
        const past = isPast(new Date(e.starts_at))
        return (
          <div>
            <div className="text-sm tabular-nums" style={{ color: past ? 'var(--adm-text-muted)' : 'var(--adm-text)' }}>
              {format(new Date(e.starts_at), 'dd MMM yyyy', { locale: fr })}
            </div>
            <div className="text-xs tabular-nums" style={{ color: 'var(--adm-text-faint)' }}>
              {format(new Date(e.starts_at), 'HH:mm', { locale: fr })}
            </div>
          </div>
        )
      },
    },
    {
      key: 'type', label: 'Type',
      render: (e) => <span className="adm-badge capitalize">{e.type}</span>,
    },
    {
      key: 'attendees_count', label: 'Inscrits',
      render: (e) => e.registration_required ? (
        <Link
          to={`/admin/evenements/${e.id}/inscrits`}
          onClick={(ev) => ev.stopPropagation()}
          className="inline-flex items-center gap-1 text-sm tabular-nums hover:underline"
          style={{ color: 'var(--adm-accent)' }}
        >
          <Users size={12} /> {e.attendees_count ?? 0}
          {e.max_attendees && (
            <span style={{ color: 'var(--adm-text-faint)' }}> / {e.max_attendees}</span>
          )}
        </Link>
      ) : <span style={{ color: 'var(--adm-text-faint)' }}>—</span>,
    },
    {
      key: 'is_published', label: 'Statut',
      render: (e) => (
        <span className={`adm-badge ${e.is_published ? 'adm-badge-success' : 'adm-badge'}`}>
          {e.is_published ? 'Publié' : 'Brouillon'}
        </span>
      ),
    },
    {
      key: 'actions', label: '',
      cellClassName: 'text-right',
      render: (e) => (
        <button
          onClick={(ev) => {
            ev.stopPropagation()
            if (confirm('Archiver cet événement ?')) remove.mutate(e.id)
          }}
          className="p-1.5 rounded hover:bg-red-50 transition"
          style={{ color: 'var(--adm-danger)' }}
          title="Archiver"
          aria-label="Archiver"
        >
          <Trash2 size={14} />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Événements</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
            Agenda de l'église — cultes, formations, sorties, concerts.
          </p>
        </div>
        <Link to="/admin/evenements/nouveau" className="adm-btn adm-btn-primary">
          <Plus size={14} /> Nouvel événement
        </Link>
      </header>

      <DataTable
        queryKey={['admin', 'events']}
        queryFn={events.list}
        columns={columns}
        filters={filters}
        onFiltersChange={setFilters}
        searchPlaceholder="Titre de l'événement…"
        emptyMessage="Aucun événement."
        onRowClick={(e) => navigate(`/admin/evenements/${e.id}`)}
        mobileRow={(e) => <EventMobileRow e={e} />}
        filtersSlot={
          <>
            <select
              className="adm-select w-auto text-sm h-9"
              value={filters.when || ''}
              onChange={(e) => setFilters({ ...filters, when: e.target.value || undefined, page: 1 })}
            >
              <option value="">Tous</option>
              <option value="upcoming">À venir</option>
              <option value="past">Passés</option>
            </select>
            <select
              className="adm-select w-auto text-sm h-9"
              value={filters.type || ''}
              onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined, page: 1 })}
            >
              <option value="">Tous types</option>
              <option value="culte">Culte</option>
              <option value="priere">Prière</option>
              <option value="evangelisation">Évangélisation</option>
              <option value="concert">Concert</option>
              <option value="formation">Formation</option>
              <option value="autre">Autre</option>
            </select>
          </>
        }
      />
    </div>
  )
}

function EventMobileRow({ e }) {
  const past = e.starts_at && isPast(new Date(e.starts_at))
  return (
    <div className="flex items-center gap-3">
      {e.starts_at && (
        <div
          className="shrink-0 text-center px-2 py-1 rounded-lg border min-w-[52px]"
          style={{ borderColor: 'var(--adm-border)', background: past ? '#F4F4F5' : 'var(--adm-accent-soft)' }}
        >
          <div
            className="text-base font-semibold leading-none tabular-nums"
            style={{ color: past ? 'var(--adm-text-muted)' : 'var(--adm-accent)' }}
          >
            {new Date(e.starts_at).getDate()}
          </div>
          <div className="text-[10px] uppercase tracking-widest mt-0.5"
               style={{ color: past ? 'var(--adm-text-faint)' : 'var(--adm-accent)' }}>
            {format(new Date(e.starts_at), 'MMM', { locale: fr })}
          </div>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>{e.title}</span>
          <span className={`adm-badge ${e.is_published ? 'adm-badge-success' : 'adm-badge'}`}>
            {e.is_published ? 'Publié' : 'Brouillon'}
          </span>
        </div>
        <div className="text-xs flex items-center gap-3 mt-0.5 flex-wrap" style={{ color: 'var(--adm-text-muted)' }}>
          {e.location && <span className="inline-flex items-center gap-1 truncate"><MapPin size={11} /> {e.location}</span>}
          {e.registration_required && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Users size={11} /> {e.attendees_count ?? 0}
              {e.max_attendees && ` / ${e.max_attendees}`}
            </span>
          )}
        </div>
      </div>
      <ChevronRight size={14} style={{ color: 'var(--adm-text-faint)' }} className="shrink-0" />
    </div>
  )
}
