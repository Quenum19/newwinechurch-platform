/** Sermons — Refonte 2026 admin-v2 native. */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Eye, EyeOff, Star, Trash2, Mic, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import DataTable from '@/components/admin/DataTable.jsx'
import { sermons } from '@/api/admin'

export default function SermonsList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({ page: 1, per_page: 20 })

  const togglePublish = useMutation({
    mutationFn: (id) => sermons.togglePublish(id),
    onSuccess: () => {
      toast.success('Statut mis à jour.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'sermons'] })
    },
  })

  const remove = useMutation({
    mutationFn: (id) => sermons.delete(id),
    onSuccess: () => {
      toast.success('Sermon archivé.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'sermons'] })
    },
  })

  const columns = [
    {
      key: 'thumbnail', label: '',
      render: (s) => (
        <div
          className="h-10 w-16 rounded overflow-hidden flex items-center justify-center shrink-0"
          style={{ background: 'var(--adm-card-hover)' }}
        >
          {s.thumbnail
            ? <img src={`/storage/${s.thumbnail}`} alt="" className="h-full w-full object-cover" loading="lazy" />
            : <Mic size={16} style={{ color: 'var(--adm-text-faint)' }} />}
        </div>
      ),
    },
    {
      key: 'title', label: 'Titre', sortable: true,
      render: (s) => (
        <div className="min-w-0">
          <div className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>{s.title}</div>
          {s.scripture_reference && (
            <div className="text-xs italic truncate" style={{ color: 'var(--adm-accent)' }}>{s.scripture_reference}</div>
          )}
        </div>
      ),
    },
    {
      key: 'speaker', label: 'Prédicateur',
      render: (s) => <span className="text-sm" style={{ color: 'var(--adm-text)' }}>{s.speaker?.name || '—'}</span>,
    },
    {
      key: 'sermon_date', label: 'Date', sortable: true,
      render: (s) => (
        <span className="text-xs tabular-nums" style={{ color: 'var(--adm-text-muted)' }}>
          {s.sermon_date && format(new Date(s.sermon_date), 'dd MMM yyyy', { locale: fr })}
        </span>
      ),
    },
    {
      key: 'type', label: 'Type',
      render: (s) => (
        <span className="adm-badge capitalize">
          {s.type === 'live_replay' ? 'Replay' : s.type}
        </span>
      ),
    },
    {
      key: 'views_count', label: 'Vues', sortable: true,
      render: (s) => (
        <span className="text-sm tabular-nums" style={{ color: 'var(--adm-text-muted)' }}>
          {Number(s.views_count || 0).toLocaleString('fr-FR')}
        </span>
      ),
    },
    {
      key: 'is_featured', label: '',
      render: (s) => s.is_featured
        ? <Star size={14} fill="currentColor" style={{ color: 'var(--adm-warning)' }} />
        : null,
    },
    {
      key: 'is_published', label: 'Statut',
      render: (s) => (
        <span className={`adm-badge ${s.is_published ? 'adm-badge-success' : 'adm-badge'}`}>
          {s.is_published ? 'Publié' : 'Brouillon'}
        </span>
      ),
    },
    {
      key: 'actions', label: '',
      cellClassName: 'text-right whitespace-nowrap',
      render: (s) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => togglePublish.mutate(s.id)}
            className="p-1.5 rounded hover:bg-zinc-100 transition"
            style={{ color: s.is_published ? 'var(--adm-text-muted)' : 'var(--adm-accent)' }}
            title={s.is_published ? 'Dépublier' : 'Publier'}
            aria-label={s.is_published ? 'Dépublier' : 'Publier'}
          >
            {s.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button
            onClick={() => { if (confirm('Archiver ce sermon ?')) remove.mutate(s.id) }}
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
          <h1>Sermons</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
            Bibliothèque des messages prédicés.
          </p>
        </div>
        <Link to="/admin/sermons/nouveau" className="adm-btn adm-btn-primary">
          <Plus size={14} /> Nouveau sermon
        </Link>
      </header>

      <DataTable
        queryKey={['admin', 'sermons']}
        queryFn={sermons.list}
        columns={columns}
        filters={filters}
        onFiltersChange={setFilters}
        searchPlaceholder="Titre, description, référence biblique…"
        emptyMessage="Aucun sermon."
        onRowClick={(s) => navigate(`/admin/sermons/${s.id}`)}
        mobileRow={(s) => <SermonMobileRow s={s} />}
        filtersSlot={
          <>
            <select
              className="adm-select w-auto text-sm h-9"
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined, page: 1 })}
            >
              <option value="">Tous statuts</option>
              <option value="published">Publiés</option>
              <option value="draft">Brouillons</option>
            </select>
            <select
              className="adm-select w-auto text-sm h-9"
              value={filters.type || ''}
              onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined, page: 1 })}
            >
              <option value="">Tous types</option>
              <option value="audio">Audio</option>
              <option value="video">Vidéo</option>
              <option value="live_replay">Replay live</option>
            </select>
          </>
        }
      />
    </div>
  )
}

function SermonMobileRow({ s }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-14 w-20 rounded overflow-hidden flex items-center justify-center shrink-0"
        style={{ background: 'var(--adm-card-hover)' }}
      >
        {s.thumbnail
          ? <img src={`/storage/${s.thumbnail}`} alt="" className="h-full w-full object-cover" loading="lazy" />
          : <Mic size={18} style={{ color: 'var(--adm-text-faint)' }} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>{s.title}</span>
          {s.is_featured && <Star size={12} fill="currentColor" style={{ color: 'var(--adm-warning)' }} />}
        </div>
        {s.scripture_reference && (
          <div className="text-xs italic truncate" style={{ color: 'var(--adm-accent)' }}>{s.scripture_reference}</div>
        )}
        <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--adm-text-muted)' }}>
          <span className={`adm-badge ${s.is_published ? 'adm-badge-success' : 'adm-badge'}`}>
            {s.is_published ? 'Publié' : 'Brouillon'}
          </span>
          {s.speaker?.name && <span className="truncate">{s.speaker.name}</span>}
        </div>
      </div>
      <ChevronRight size={14} style={{ color: 'var(--adm-text-faint)' }} className="shrink-0" />
    </div>
  )
}
