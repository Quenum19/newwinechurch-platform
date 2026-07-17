/** Articles blog — Refonte 2026 admin-v2 native. */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Eye, EyeOff, Star, Trash2, BookOpen, ChevronRight, Check, Square, CheckSquare } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import DataTable from '@/components/admin/DataTable.jsx'
import BulkActionBar from '@/components/admin/BulkActionBar.jsx'
import ResetFiltersButton from '@/components/admin/ResetFiltersButton.jsx'
import useMultiSelect from '@/hooks/useMultiSelect'
import { posts } from '@/api/admin'

const STATUS_META = {
  published: { cls: 'adm-badge-success', label: 'Publié' },
  draft:     { cls: 'adm-badge-warning', label: 'Brouillon' },
  archived:  { cls: 'adm-badge',         label: 'Archivé' },
}

export default function PostsList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({ page: 1, per_page: 20 })
  const sel = useMultiSelect()

  const { data: pageData } = useQuery({
    queryKey: ['admin', 'posts', filters],
    queryFn: () => posts.list(filters),
    keepPreviousData: true,
  })
  const visibleIds = (pageData?.data ?? []).map((p) => p.id)
  const allVisibleSelected = sel.allSelected(visibleIds)

  const bulk = useMutation({
    mutationFn: ({ action, ids }) => posts.bulk(action, ids),
    onSuccess: (res) => {
      toast.success(res?.message || 'Action effectuée.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] })
      sel.clear()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Action impossible.'),
  })

  const togglePublish = useMutation({
    mutationFn: (id) => posts.togglePublish(id),
    onSuccess: () => {
      toast.success('Statut mis à jour.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] })
    },
  })
  const remove = useMutation({
    mutationFn: (id) => posts.delete(id),
    onSuccess: () => {
      toast.success('Article archivé.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] })
    },
  })

  const columns = [
    {
      key: '_select', label: '', cellClassName: 'w-10',
      render: (p) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); sel.toggle(p.id, e, visibleIds) }}
          className={`h-5 w-5 rounded flex items-center justify-center transition ${
            sel.isSelected(p.id) ? 'bg-[var(--adm-accent)] text-white' : 'border-2 hover:bg-zinc-100'
          }`}
          style={{ borderColor: sel.isSelected(p.id) ? 'transparent' : 'var(--adm-border)' }}
          aria-label="Sélectionner"
        >{sel.isSelected(p.id) && <Check size={12} strokeWidth={3} />}</button>
      ),
    },
    {
      key: 'cover_image', label: '',
      render: (p) => (
        <div
          className="h-10 w-16 rounded overflow-hidden flex items-center justify-center shrink-0"
          style={{ background: 'var(--adm-card-hover)' }}
        >
          {p.cover_image
            ? <img src={`/storage/${p.cover_image}`} alt="" className="h-full w-full object-cover" loading="lazy" />
            : <BookOpen size={16} style={{ color: 'var(--adm-text-faint)' }} />}
        </div>
      ),
    },
    {
      key: 'title', label: 'Titre', sortable: true,
      render: (p) => (
        <div className="min-w-0">
          <div className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>{p.title}</div>
          {p.excerpt && (
            <div className="text-xs truncate" style={{ color: 'var(--adm-text-muted)' }}>{p.excerpt}</div>
          )}
        </div>
      ),
    },
    {
      key: 'category', label: 'Catégorie',
      render: (p) => p.category ? (
        <span
          className="adm-badge"
          style={{
            background: (p.category.color || '#71717A') + '22',
            color: p.category.color || 'var(--adm-text-muted)',
            borderColor: 'transparent',
          }}
        >
          {p.category.name}
        </span>
      ) : <span style={{ color: 'var(--adm-text-faint)' }}>—</span>,
    },
    {
      key: 'author', label: 'Auteur',
      render: (p) => <span className="text-sm" style={{ color: 'var(--adm-text)' }}>{p.author?.name || '—'}</span>,
    },
    {
      key: 'published_at', label: 'Publié le', sortable: true,
      render: (p) => (
        <span className="text-xs tabular-nums" style={{ color: 'var(--adm-text-muted)' }}>
          {p.published_at ? format(new Date(p.published_at), 'dd MMM yyyy', { locale: fr }) : '—'}
        </span>
      ),
    },
    {
      key: 'views_count', label: 'Vues', sortable: true,
      render: (p) => (
        <span className="text-sm tabular-nums" style={{ color: 'var(--adm-text-muted)' }}>
          {Number(p.views_count || 0).toLocaleString('fr-FR')}
        </span>
      ),
    },
    {
      key: 'is_featured', label: '',
      render: (p) => p.is_featured
        ? <Star size={14} fill="currentColor" style={{ color: 'var(--adm-warning)' }} />
        : null,
    },
    {
      key: 'status', label: 'Statut',
      render: (p) => {
        const m = STATUS_META[p.status] ?? STATUS_META.draft
        return <span className={`adm-badge ${m.cls}`}>{m.label}</span>
      },
    },
    {
      key: 'actions', label: '',
      cellClassName: 'text-right whitespace-nowrap',
      render: (p) => {
        const isPublished = p.status === 'published'
        return (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => togglePublish.mutate(p.id)}
              disabled={togglePublish.isPending}
              className="p-1.5 rounded hover:bg-zinc-100 transition disabled:opacity-50"
              style={{ color: isPublished ? 'var(--adm-success)' : 'var(--adm-text-muted)' }}
              title={isPublished ? 'Visible — masquer' : 'Masqué — publier'}
              aria-label={isPublished ? 'Masquer' : 'Publier'}
            >
              {isPublished ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <button
              onClick={() => { if (confirm('Archiver cet article ?')) remove.mutate(p.id) }}
              className="p-1.5 rounded hover:bg-red-50 transition"
              style={{ color: 'var(--adm-danger)' }}
              title="Archiver"
              aria-label="Archiver"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Blog</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
            Articles & témoignages publiés sur le site.
          </p>
        </div>
        <Link to="/admin/blog/nouveau" className="adm-btn adm-btn-primary">
          <Plus size={14} /> Nouvel article
        </Link>
      </header>

      <DataTable
        queryKey={['admin', 'posts']}
        queryFn={posts.list}
        columns={columns}
        filters={filters}
        onFiltersChange={setFilters}
        searchPlaceholder="Titre, extrait…"
        emptyMessage="Aucun article."
        onRowClick={(p) => navigate(`/admin/blog/${p.id}`)}
        mobileRow={(p) => <PostMobileRow p={p} />}
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
              <option value="archived">Archivés</option>
            </select>
            {visibleIds.length > 0 && (
              <button
                onClick={() => sel.toggleAll(visibleIds)}
                className="adm-btn adm-btn-secondary text-xs h-9"
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
        label="article"
        actions={[
          { key: 'publish',   label: 'Publier',   icon: Eye,    onClick: () => bulk.mutate({ action: 'publish',   ids: sel.ids }) },
          { key: 'unpublish', label: 'Brouillon', icon: EyeOff, onClick: () => bulk.mutate({ action: 'unpublish', ids: sel.ids }) },
          {
            key: 'delete', label: 'Archiver', icon: Trash2, variant: 'danger', confirm: true,
            confirmTitle: 'Archiver ces articles ?',
            confirmText: `${sel.count} article(s) seront archivés.`,
            confirmCta: 'Archiver',
            onClick: () => bulk.mutate({ action: 'delete', ids: sel.ids }),
          },
        ]}
      />
    </div>
  )
}

function PostMobileRow({ p }) {
  const m = STATUS_META[p.status] ?? STATUS_META.draft
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-14 w-20 rounded overflow-hidden flex items-center justify-center shrink-0"
        style={{ background: 'var(--adm-card-hover)' }}
      >
        {p.cover_image
          ? <img src={`/storage/${p.cover_image}`} alt="" className="h-full w-full object-cover" loading="lazy" />
          : <BookOpen size={18} style={{ color: 'var(--adm-text-faint)' }} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>{p.title}</span>
          {p.is_featured && <Star size={12} fill="currentColor" style={{ color: 'var(--adm-warning)' }} />}
        </div>
        {p.excerpt && (
          <div className="text-xs truncate" style={{ color: 'var(--adm-text-muted)' }}>{p.excerpt}</div>
        )}
        <div className="flex items-center gap-2 mt-1 text-xs">
          <span className={`adm-badge ${m.cls}`}>{m.label}</span>
          {p.category && (
            <span style={{ color: 'var(--adm-text-muted)' }}>{p.category.name}</span>
          )}
        </div>
      </div>
      <ChevronRight size={14} style={{ color: 'var(--adm-text-faint)' }} className="shrink-0" />
    </div>
  )
}
