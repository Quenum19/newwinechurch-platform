/**
 * Séries de sermons — liste admin avec création/édition rapide.
 *
 * Une série = un "album" qui regroupe plusieurs messages d'un fil thématique
 * narratif (ex: "Convention 2026", "Identité en Christ vol.1"). C'est le
 * conteneur le plus structuré du système d'archivage long terme.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Layers, ChevronRight, Edit3, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import DataTable from '@/components/admin/DataTable.jsx'
import SermonsTabs from '@/components/admin/SermonsTabs.jsx'
import Modal from '@/components/ui/Modal.jsx'
import { sermonSeries } from '@/api/admin'

export default function SermonSeriesList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({ page: 1, per_page: 20 })
  const [confirmDelete, setConfirmDelete] = useState(null)

  const remove = useMutation({
    mutationFn: (id) => sermonSeries.delete(id),
    onSuccess: () => {
      toast.success('Série supprimée.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'sermon-series'] })
      setConfirmDelete(null)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Suppression impossible.')
    },
  })

  const columns = [
    {
      key: 'cover_image', label: '',
      render: (s) => (
        <div
          className="h-10 w-16 rounded overflow-hidden flex items-center justify-center shrink-0"
          style={{ background: 'var(--adm-card-hover)' }}
        >
          {s.cover_image
            ? <img src={s.cover_image} alt="" className="h-full w-full object-cover" loading="lazy" />
            : <Layers size={16} style={{ color: 'var(--adm-text-faint)' }} />}
        </div>
      ),
    },
    {
      key: 'title', label: 'Titre', sortable: true,
      render: (s) => (
        <div className="min-w-0">
          <div className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>{s.title}</div>
          {s.description && (
            <div className="text-xs truncate" style={{ color: 'var(--adm-text-muted)' }}>{s.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'started_at', label: 'Période', sortable: true,
      render: (s) => {
        if (!s.started_at && !s.ended_at) return <span className="text-xs italic" style={{ color: 'var(--adm-text-faint)' }}>—</span>
        const start = s.started_at && format(new Date(s.started_at), 'MMM yyyy', { locale: fr })
        const end   = s.ended_at   && format(new Date(s.ended_at),   'MMM yyyy', { locale: fr })
        return (
          <span className="text-xs tabular-nums" style={{ color: 'var(--adm-text-muted)' }}>
            {start || '?'} {end ? `→ ${end}` : (s.started_at ? '→ …' : '')}
          </span>
        )
      },
    },
    {
      key: 'sermons_count', label: 'Sermons', sortable: true,
      render: (s) => (
        <span className="adm-badge tabular-nums">{s.sermons_count ?? 0}</span>
      ),
    },
    {
      key: 'is_active', label: 'Statut',
      render: (s) => (
        <span className={`adm-badge ${s.is_active ? 'adm-badge-success' : ''}`}>
          {s.is_active ? 'Active' : 'Archivée'}
        </span>
      ),
    },
    {
      key: 'actions', label: '',
      cellClassName: 'text-right whitespace-nowrap',
      render: (s) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/admin/sermons/series/${s.id}/edit`)}
            className="p-1.5 rounded hover:bg-zinc-100 transition"
            style={{ color: 'var(--adm-text-muted)' }}
            title="Modifier"
            aria-label="Modifier"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={() => setConfirmDelete(s)}
            className="p-1.5 rounded hover:bg-red-50 transition"
            style={{ color: 'var(--adm-danger)' }}
            title="Supprimer"
            aria-label="Supprimer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5 sm:space-y-6">
      <SermonsTabs />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Séries de sermons</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
            Regroupe plusieurs messages dans un fil thématique (ex: "Convention 2026", "Identité en Christ vol.1").
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/sermons/series/nouveau')}
          className="adm-btn adm-btn-primary"
        >
          <Plus size={14} /> Nouvelle série
        </button>
      </header>

      <DataTable
        queryKey={['admin', 'sermon-series']}
        queryFn={sermonSeries.list}
        columns={columns}
        filters={filters}
        onFiltersChange={setFilters}
        searchPlaceholder="Titre, description…"
        emptyMessage="Aucune série pour le moment — crée la première !"
        onRowClick={(s) => navigate(`/admin/sermons/series/${s.id}`)}
        mobileRow={(s) => <SeriesMobileRow s={s} />}
        filtersSlot={
          <select
            className="adm-select w-auto text-sm h-9"
            value={filters.is_active ?? ''}
            onChange={(e) => setFilters({ ...filters, is_active: e.target.value || undefined, page: 1 })}
          >
            <option value="">Toutes</option>
            <option value="1">Actives</option>
            <option value="0">Archivées</option>
          </select>
        }
      />

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Supprimer cette série ?"
        description={confirmDelete?.title}
        size="sm"
      >
        <p>
          Cette action est définitive. {confirmDelete?.sermons_count > 0 && (
            <strong className="text-red-700">
              {confirmDelete.sermons_count} sermons sont liés à cette série —
              tu dois d'abord les déplacer pour pouvoir supprimer.
            </strong>
          )}
        </p>
        <Modal.Footer>
          <button onClick={() => setConfirmDelete(null)} className="adm-btn">
            Annuler
          </button>
          <button
            onClick={() => remove.mutate(confirmDelete.id)}
            disabled={remove.isPending}
            className="adm-btn adm-btn-danger"
          >
            {remove.isPending ? 'Suppression…' : 'Supprimer'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

function SeriesMobileRow({ s }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-14 w-20 rounded overflow-hidden flex items-center justify-center shrink-0"
        style={{ background: 'var(--adm-card-hover)' }}
      >
        {s.cover_image
          ? <img src={s.cover_image} alt="" className="h-full w-full object-cover" loading="lazy" />
          : <Layers size={18} style={{ color: 'var(--adm-text-faint)' }} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>{s.title}</div>
        <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--adm-text-muted)' }}>
          <span className="adm-badge tabular-nums">{s.sermons_count ?? 0} sermons</span>
          <span className={`adm-badge ${s.is_active ? 'adm-badge-success' : ''}`}>
            {s.is_active ? 'Active' : 'Archivée'}
          </span>
        </div>
      </div>
      <ChevronRight size={14} style={{ color: 'var(--adm-text-faint)' }} className="shrink-0" />
    </div>
  )
}
