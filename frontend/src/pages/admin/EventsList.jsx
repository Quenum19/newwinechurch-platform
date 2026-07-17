/** Événements — Refonte 2026 admin-v2 native. */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Plus, Users, Trash2, MapPin, ChevronRight, Eye, EyeOff, Star, Edit3, Calendar, Ticket,
  Check, Square, CheckSquare,
} from 'lucide-react'
import { format, isPast, isFuture, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'

import DataTable from '@/components/admin/DataTable.jsx'
import Modal from '@/components/ui/Modal.jsx'
import BulkActionBar from '@/components/admin/BulkActionBar.jsx'
import ResetFiltersButton from '@/components/admin/ResetFiltersButton.jsx'
import useMultiSelect from '@/hooks/useMultiSelect'
import { events } from '@/api/admin'

export default function EventsList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({ page: 1, per_page: 20 })
  const [confirmDelete, setConfirmDelete] = useState(null)
  const sel = useMultiSelect()

  const { data: pageData } = useQuery({
    queryKey: ['admin', 'events', filters],
    queryFn: () => events.list(filters),
    keepPreviousData: true,
  })
  const visibleIds = (pageData?.data ?? []).map((e) => e.id)
  const allVisibleSelected = sel.allSelected(visibleIds)

  const bulk = useMutation({
    mutationFn: ({ action, ids }) => events.bulk(action, ids),
    onSuccess: (res) => {
      toast.success(res?.message || 'Action effectuée.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] })
      sel.clear()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Action impossible.'),
  })

  const remove = useMutation({
    mutationFn: (id) => events.delete(id),
    onSuccess: () => {
      toast.success('Événement archivé.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] })
      setConfirmDelete(null)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Suppression impossible.'),
  })

  const togglePublish = useMutation({
    mutationFn: (id) => events.togglePublish(id),
    onSuccess: () => {
      toast.success('Statut mis à jour.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Bascule impossible.'),
  })

  const columns = [
    {
      key: '_select', label: '', cellClassName: 'w-10',
      render: (e) => (
        <button
          type="button"
          onClick={(ev) => { ev.stopPropagation(); sel.toggle(e.id, ev, visibleIds) }}
          className={`h-5 w-5 rounded flex items-center justify-center transition ${
            sel.isSelected(e.id) ? 'bg-[var(--adm-accent)] text-white' : 'border-2 hover:bg-zinc-100'
          }`}
          style={{ borderColor: sel.isSelected(e.id) ? 'transparent' : 'var(--adm-border)' }}
          aria-label="Sélectionner"
        >{sel.isSelected(e.id) && <Check size={12} strokeWidth={3} />}</button>
      ),
    },
    {
      key: 'title', label: 'Événement', sortable: true,
      render: (e) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>{e.title}</span>
            {e.is_featured && <Star size={12} fill="currentColor" style={{ color: 'var(--adm-warning)' }} />}
          </div>
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
        const d = new Date(e.starts_at)
        const past = isPast(d) && !isToday(d)
        const today = isToday(d)
        return (
          <div>
            <div className="text-sm tabular-nums" style={{ color: past ? 'var(--adm-text-muted)' : 'var(--adm-text)' }}>
              {format(d, 'dd MMM yyyy', { locale: fr })}
            </div>
            <div className="text-xs tabular-nums flex items-center gap-1.5" style={{ color: 'var(--adm-text-faint)' }}>
              {format(d, 'HH:mm', { locale: fr })}
              {today && <span className="text-[9px] uppercase tracking-wider px-1 py-0.5 rounded" style={{ background: 'var(--adm-accent)', color: 'white' }}>Aujourd'hui</span>}
              {past && !today && <span className="text-[9px] uppercase tracking-wider px-1 py-0.5 rounded" style={{ background: 'var(--adm-card-hover)', color: 'var(--adm-text-faint)' }}>Passé</span>}
              {!past && !today && <span className="text-[9px] uppercase tracking-wider px-1 py-0.5 rounded" style={{ background: 'var(--adm-success, #10b981)' + '20', color: 'var(--adm-success, #10b981)' }}>À venir</span>}
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
      render: (e) => {
        // Si billetterie active → l'info est dans la colonne "Billetterie" (évite doublon)
        if (e.ticketing_enabled) {
          return <span style={{ color: 'var(--adm-text-faint)' }} title="Voir colonne Billetterie">— (billetterie)</span>
        }
        return e.registration_required ? (
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
        ) : <span style={{ color: 'var(--adm-text-faint)' }}>—</span>
      },
    },
    {
      key: 'ticketing', label: 'Billetterie',
      render: (e) => e.ticketing_enabled ? (
        <Link
          to={`/admin/evenements/${e.id}/billetterie`}
          onClick={(ev) => ev.stopPropagation()}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-public-flame/10 text-public-flame hover:bg-public-flame hover:text-white transition"
          title="Tableau de bord billetterie"
        >
          <Ticket size={10}/> {e.tickets_sold ?? 0}
          {e.tickets_capacity && <span className="opacity-60">/ {e.tickets_capacity}</span>}
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
      cellClassName: 'text-right whitespace-nowrap',
      render: (e) => (
        <div className="flex justify-end gap-1" onClick={(ev) => ev.stopPropagation()}>
          <button
            onClick={() => togglePublish.mutate(e.id)}
            className="p-1.5 rounded hover:bg-zinc-100 transition"
            style={{ color: e.is_published ? 'var(--adm-text-muted)' : 'var(--adm-accent)' }}
            title={e.is_published ? 'Dépublier' : 'Publier'}
            aria-label={e.is_published ? 'Dépublier' : 'Publier'}
          >
            {e.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button
            onClick={() => navigate(`/admin/evenements/${e.id}`)}
            className="p-1.5 rounded hover:bg-zinc-100 transition"
            style={{ color: 'var(--adm-text-muted)' }}
            title="Modifier"
            aria-label="Modifier"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={() => setConfirmDelete(e)}
            className="p-1.5 rounded hover:bg-red-50 transition"
            style={{ color: 'var(--adm-danger)' }}
            title="Archiver"
            aria-label="Archiver"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Événements</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
            Agenda de l'église — cultes, formations, sorties, concerts. Les dates passées sont autorisées (archives).
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
              title="Filtrer par période"
            >
              <option value="">Toutes périodes</option>
              <option value="upcoming">À venir</option>
              <option value="past">Passés</option>
            </select>
            <select
              className="adm-select w-auto text-sm h-9"
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined, page: 1 })}
              title="Filtrer par statut de publication"
            >
              <option value="">Tous statuts</option>
              <option value="published">Publiés</option>
              <option value="draft">Brouillons</option>
            </select>
            <select
              className="adm-select w-auto text-sm h-9"
              value={filters.type || ''}
              onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined, page: 1 })}
              title="Filtrer par type"
            >
              <option value="">Tous types</option>
              <option value="culte">Culte</option>
              <option value="priere">Prière</option>
              <option value="evangelisation">Évangélisation</option>
              <option value="concert">Concert</option>
              <option value="formation">Formation</option>
              <option value="autre">Autre</option>
            </select>
            {visibleIds.length > 0 && (
              <button
                onClick={() => sel.toggleAll(visibleIds)}
                className="adm-btn adm-btn-secondary text-xs h-9"
                title={allVisibleSelected ? 'Tout désélectionner' : 'Tout sélectionner sur cette page'}
              >
                {allVisibleSelected ? <CheckSquare size={13}/> : <Square size={13}/>}
                {allVisibleSelected ? 'Désélectionner' : `Tout (${visibleIds.length})`}
              </button>
            )}
            <ResetFiltersButton
              filters={filters}
              onReset={() => setFilters({ page: 1, per_page: 20 })}
            />
          </>
        }
      />

      <BulkActionBar
        count={sel.count}
        onClear={sel.clear}
        label="événement"
        actions={[
          { key: 'publish',   label: 'Publier',   icon: Eye,    onClick: () => bulk.mutate({ action: 'publish',   ids: sel.ids }) },
          { key: 'unpublish', label: 'Dépublier', icon: EyeOff, onClick: () => bulk.mutate({ action: 'unpublish', ids: sel.ids }) },
          { key: 'feature',   label: 'Mettre en avant', icon: Star, onClick: () => bulk.mutate({ action: 'feature', ids: sel.ids }) },
          {
            key: 'delete', label: 'Archiver', icon: Trash2, variant: 'danger', confirm: true,
            confirmTitle: 'Archiver ces événements ?',
            confirmText: `${sel.count} événement(s) seront archivés.`,
            confirmCta: 'Archiver',
            onClick: () => bulk.mutate({ action: 'delete', ids: sel.ids }),
          },
        ]}
      />

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Archiver cet événement ?"
        description={confirmDelete?.title}
        size="sm"
      >
        <p>
          L'événement sera retiré de la liste publique. {confirmDelete?.attendees_count > 0 && (
            <>
              <br/><strong className="text-red-700">
                {confirmDelete.attendees_count} personne(s) sont inscrite(s).
              </strong>
            </>
          )}
        </p>
        <Modal.Footer>
          <button onClick={() => setConfirmDelete(null)} className="adm-btn">Annuler</button>
          <button
            onClick={() => remove.mutate(confirmDelete.id)}
            disabled={remove.isPending}
            className="adm-btn adm-btn-danger"
          >
            {remove.isPending ? 'Archivage…' : 'Archiver'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

function EventMobileRow({ e }) {
  const startDate = e.starts_at ? new Date(e.starts_at) : null
  const past = startDate && isPast(startDate) && !isToday(startDate)
  const today = startDate && isToday(startDate)
  const upcoming = startDate && (isFuture(startDate) || isToday(startDate))
  return (
    <div className="flex items-center gap-3">
      {startDate ? (
        <div
          className="shrink-0 text-center px-2 py-1 rounded-lg border min-w-[52px]"
          style={{ borderColor: 'var(--adm-border)', background: past ? '#F4F4F5' : 'var(--adm-accent-soft, #FEF3F0)' }}
        >
          <div
            className="text-base font-semibold leading-none tabular-nums"
            style={{ color: past ? 'var(--adm-text-muted)' : 'var(--adm-accent)' }}
          >
            {startDate.getDate()}
          </div>
          <div className="text-[10px] uppercase tracking-widest mt-0.5"
               style={{ color: past ? 'var(--adm-text-faint)' : 'var(--adm-accent)' }}>
            {format(startDate, 'MMM', { locale: fr })}
          </div>
        </div>
      ) : (
        <Calendar size={20} className="shrink-0" style={{ color: 'var(--adm-text-faint)' }} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>{e.title}</span>
          {e.is_featured && <Star size={11} fill="currentColor" style={{ color: 'var(--adm-warning)' }} />}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`adm-badge ${e.is_published ? 'adm-badge-success' : 'adm-badge'}`}>
            {e.is_published ? 'Publié' : 'Brouillon'}
          </span>
          {today && <span className="adm-badge" style={{ background: 'var(--adm-accent)', color: 'white' }}>Aujourd'hui</span>}
          {!today && upcoming && <span className="adm-badge adm-badge-success">À venir</span>}
          {past && <span className="adm-badge">Passé</span>}
        </div>
        <div className="text-xs flex items-center gap-3 mt-1 flex-wrap" style={{ color: 'var(--adm-text-muted)' }}>
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
