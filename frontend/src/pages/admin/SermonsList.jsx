/** Sermons — Refonte 2026 admin-v2 native. */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Eye, EyeOff, Star, Trash2, Mic, ChevronRight, Layers, Check, Square, CheckSquare } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import DataTable from '@/components/admin/DataTable.jsx'
import SermonsTabs from '@/components/admin/SermonsTabs.jsx'
import BulkActionBar from '@/components/admin/BulkActionBar.jsx'
import ResetFiltersButton from '@/components/admin/ResetFiltersButton.jsx'
import useMultiSelect from '@/hooks/useMultiSelect'
import { sermons } from '@/api/admin'

export default function SermonsList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({ page: 1, per_page: 20 })
  const sel = useMultiSelect()

  // Catalogues pour les filtres dropdowns (cache 5 min).
  const { data: seriesList = [] } = useQuery({
    queryKey: ['admin', 'sermon-series-options'],
    queryFn: () => sermons.series(),
    staleTime: 5 * 60 * 1000,
  })
  const { data: themesList = [] } = useQuery({
    queryKey: ['admin', 'sermon-themes'],
    queryFn: () => sermons.themes(),
    staleTime: 60 * 1000,
  })

  const { data: pageData } = useQuery({
    queryKey: ['admin', 'sermons', filters],
    queryFn: () => sermons.list(filters),
    keepPreviousData: true,
  })
  const visibleIds = (pageData?.data ?? []).map((s) => s.id)
  const allVisibleSelected = sel.allSelected(visibleIds)

  const bulk = useMutation({
    mutationFn: ({ action, ids }) => sermons.bulk(action, ids),
    onSuccess: (res) => {
      toast.success(res?.message || 'Action effectuée.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'sermons'] })
      sel.clear()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Action impossible.'),
  })

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
      key: '_select', label: '', cellClassName: 'w-10',
      render: (s) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); sel.toggle(s.id, e, visibleIds) }}
          className={`h-5 w-5 rounded flex items-center justify-center transition ${
            sel.isSelected(s.id) ? 'bg-[var(--adm-accent)] text-white' : 'border-2 hover:bg-zinc-100'
          }`}
          style={{ borderColor: sel.isSelected(s.id) ? 'transparent' : 'var(--adm-border)' }}
          aria-label="Sélectionner"
        >{sel.isSelected(s.id) && <Check size={12} strokeWidth={3} />}</button>
      ),
    },
    {
      key: 'thumbnail', label: '',
      render: (s) => (
        <div
          className="h-10 w-16 rounded overflow-hidden flex items-center justify-center shrink-0"
          style={{ background: 'var(--adm-card-hover)' }}
        >
          {s.thumbnail
            ? <img src={s.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
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
      render: (s) => (
        <span className="text-sm" style={{ color: 'var(--adm-text)' }}>
          {s.speaker?.name || '—'}
          {s.speaker?.is_guest && (
            <span className="ml-1 text-[10px] uppercase tracking-wide px-1 py-0.5 rounded" style={{ background: 'var(--adm-card-hover)', color: 'var(--adm-text-faint)' }}>
              invité
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'series', label: 'Série',
      render: (s) => s.series?.title
        ? (
          <Link
            to={`/admin/sermons/series/${s.series.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs hover:underline"
            style={{ background: 'var(--adm-card-hover)', color: 'var(--adm-text)' }}
          >
            <Layers size={11} /> {s.series.title}
          </Link>
        )
        : <span className="text-xs italic" style={{ color: 'var(--adm-text-faint)' }}>—</span>,
    },
    {
      key: 'themes', label: 'Thèmes',
      render: (s) => <ThemesCell themes={s.themes ?? []} />,
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
      <SermonsTabs />
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
            <select
              className="adm-select w-auto text-sm h-9 max-w-[180px]"
              value={filters.series_id || ''}
              onChange={(e) => setFilters({ ...filters, series_id: e.target.value || undefined, page: 1 })}
              title="Filtrer par série"
            >
              <option value="">Toutes séries</option>
              {seriesList.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
            <select
              className="adm-select w-auto text-sm h-9 max-w-[180px]"
              value={filters.theme || ''}
              onChange={(e) => setFilters({ ...filters, theme: e.target.value || undefined, page: 1 })}
              title="Filtrer par thème"
            >
              <option value="">Tous thèmes</option>
              {themesList.map((t) => <option key={t.id} value={t.slug}>{t.name}</option>)}
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
        label="sermon"
        actions={[
          { key: 'publish',   label: 'Publier',    icon: Eye,    onClick: () => bulk.mutate({ action: 'publish',   ids: sel.ids }) },
          { key: 'unpublish', label: 'Dépublier',  icon: EyeOff, onClick: () => bulk.mutate({ action: 'unpublish', ids: sel.ids }) },
          { key: 'feature',   label: 'Mettre en avant',  icon: Star, onClick: () => bulk.mutate({ action: 'feature', ids: sel.ids }) },
          {
            key: 'delete', label: 'Archiver', icon: Trash2, variant: 'danger', confirm: true,
            confirmTitle: 'Archiver ces sermons ?',
            confirmText: `${sel.count} sermon(s) seront archivés (corbeille).`,
            confirmCta: 'Archiver',
            onClick: () => bulk.mutate({ action: 'delete', ids: sel.ids }),
          },
        ]}
      />
    </div>
  )
}

function ThemesCell({ themes }) {
  if (!themes || themes.length === 0) {
    return <span className="text-xs italic" style={{ color: 'var(--adm-text-faint)' }}>—</span>
  }
  const visible = themes.slice(0, 3)
  const overflow = themes.length - visible.length
  return (
    <div className="flex flex-wrap gap-1 max-w-[200px]">
      {visible.map((t) => {
        const color = t.color || '#6B5F4E'
        return (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] whitespace-nowrap"
            style={{ background: color + '18', color: 'var(--adm-text)' }}
            title={t.name}
          >
            <span className="h-1 w-1 rounded-full" style={{ background: color }} />
            {t.name}
          </span>
        )
      })}
      {overflow > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: 'var(--adm-card-hover)', color: 'var(--adm-text-muted)' }}>
          +{overflow}
        </span>
      )}
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
          ? <img src={s.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
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
        {s.series?.title && (
          <div className="text-[11px] mt-0.5 inline-flex items-center gap-1" style={{ color: 'var(--adm-text-muted)' }}>
            <Layers size={10} /> {s.series.title}
          </div>
        )}
        <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--adm-text-muted)' }}>
          <span className={`adm-badge ${s.is_published ? 'adm-badge-success' : 'adm-badge'}`}>
            {s.is_published ? 'Publié' : 'Brouillon'}
          </span>
          {s.speaker?.name && <span className="truncate">{s.speaker.name}</span>}
        </div>
        {s.themes?.length > 0 && (
          <div className="mt-1.5">
            <ThemesCell themes={s.themes} />
          </div>
        )}
      </div>
      <ChevronRight size={14} style={{ color: 'var(--adm-text-faint)' }} className="shrink-0" />
    </div>
  )
}
