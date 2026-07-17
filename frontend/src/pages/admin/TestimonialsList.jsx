/** Témoignages — liste admin. */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Eye, EyeOff, Star, Trash2, MessageCircle, ChevronRight, Video, Image as ImageIcon, Check, Square, CheckSquare } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import DataTable from '@/components/admin/DataTable.jsx'
import Modal from '@/components/ui/Modal.jsx'
import BulkActionBar from '@/components/admin/BulkActionBar.jsx'
import ResetFiltersButton from '@/components/admin/ResetFiltersButton.jsx'
import useMultiSelect from '@/hooks/useMultiSelect'
import { testimonials } from '@/api/admin'

export default function TestimonialsList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({ page: 1, per_page: 20 })
  const [confirmDelete, setConfirmDelete] = useState(null)
  const sel = useMultiSelect()

  const { data: pageData } = useQuery({
    queryKey: ['admin', 'testimonials', filters],
    queryFn: () => testimonials.list(filters),
    keepPreviousData: true,
  })
  const visibleIds = (pageData?.data ?? []).map((t) => t.id)
  const allVisibleSelected = sel.allSelected(visibleIds)

  const bulk = useMutation({
    mutationFn: ({ action, ids }) => testimonials.bulk(action, ids),
    onSuccess: (res) => {
      toast.success(res?.message || 'Action effectuée.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'testimonials'] })
      sel.clear()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Action impossible.'),
  })

  const togglePublish = useMutation({
    mutationFn: (id) => testimonials.togglePublish(id),
    onSuccess: () => {
      toast.success('Statut mis à jour.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'testimonials'] })
    },
  })

  const remove = useMutation({
    mutationFn: (id) => testimonials.delete(id),
    onSuccess: () => {
      toast.success('Témoignage archivé.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'testimonials'] })
      setConfirmDelete(null)
    },
  })

  const columns = [
    {
      key: '_select', label: '', cellClassName: 'w-10',
      render: (t) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); sel.toggle(t.id, e, visibleIds) }}
          className={`h-5 w-5 rounded flex items-center justify-center transition ${
            sel.isSelected(t.id) ? 'bg-[var(--adm-accent)] text-white' : 'border-2 hover:bg-zinc-100'
          }`}
          style={{ borderColor: sel.isSelected(t.id) ? 'transparent' : 'var(--adm-border)' }}
          aria-label="Sélectionner"
        >{sel.isSelected(t.id) && <Check size={12} strokeWidth={3} />}</button>
      ),
    },
    {
      key: 'image_path', label: '',
      render: (t) => (
        <div
          className="h-12 w-12 rounded-full overflow-hidden flex items-center justify-center shrink-0"
          style={{ background: 'var(--adm-card-hover)' }}
        >
          {t.image_path
            ? <img src={t.image_path} alt="" className="h-full w-full object-cover" loading="lazy" />
            : <MessageCircle size={18} style={{ color: 'var(--adm-text-faint)' }} />}
        </div>
      ),
    },
    {
      key: 'name', label: 'Personne', sortable: true,
      render: (t) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>
              {t.name}{t.age && `, ${t.age}`}
            </span>
            {t.is_featured && <Star size={11} fill="currentColor" style={{ color: 'var(--adm-warning)' }} />}
          </div>
          {t.role && (
            <div className="text-xs" style={{ color: 'var(--adm-text-muted)' }}>{t.role}</div>
          )}
        </div>
      ),
    },
    {
      key: 'quote', label: 'Citation',
      render: (t) => (
        <span className="text-sm italic line-clamp-2 max-w-xs" style={{ color: 'var(--adm-text-muted)' }}>
          « {t.quote} »
        </span>
      ),
    },
    {
      key: 'media', label: 'Type',
      render: (t) => (
        <div className="flex gap-1">
          {t.has_video && (
            <span className="adm-badge inline-flex items-center gap-1"><Video size={10}/> Vidéo</span>
          )}
          {t.has_image && (
            <span className="adm-badge inline-flex items-center gap-1"><ImageIcon size={10}/> Photo</span>
          )}
          {!t.has_video && !t.has_image && (
            <span className="adm-badge">Texte</span>
          )}
        </div>
      ),
    },
    {
      key: 'is_published', label: 'Statut',
      render: (t) => (
        <span className={`adm-badge ${t.is_published ? 'adm-badge-success' : ''}`}>
          {t.is_published ? 'Publié' : 'Brouillon'}
        </span>
      ),
    },
    {
      key: 'actions', label: '',
      cellClassName: 'text-right whitespace-nowrap',
      render: (t) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => togglePublish.mutate(t.id)}
            className="p-1.5 rounded hover:bg-zinc-100 transition"
            style={{ color: t.is_published ? 'var(--adm-text-muted)' : 'var(--adm-accent)' }}
            title={t.is_published ? 'Dépublier' : 'Publier'}
          >
            {t.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button
            onClick={() => setConfirmDelete(t)}
            className="p-1.5 rounded hover:bg-red-50 transition"
            style={{ color: 'var(--adm-danger)' }}
            title="Archiver"
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
          <h1>Témoignages</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
            Vies transformées partagées par les membres. Affichés sur la page d'accueil quand publiés.
          </p>
        </div>
        <Link to="/admin/temoignages/nouveau" className="adm-btn adm-btn-primary">
          <Plus size={14} /> Nouveau témoignage
        </Link>
      </header>

      <DataTable
        queryKey={['admin', 'testimonials']}
        queryFn={testimonials.list}
        columns={columns}
        filters={filters}
        onFiltersChange={setFilters}
        searchPlaceholder="Nom, citation, rôle…"
        emptyMessage="Aucun témoignage. Crée le premier !"
        onRowClick={(t) => navigate(`/admin/temoignages/${t.id}`)}
        mobileRow={(t) => <TestimonialMobileRow t={t} />}
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
        label="témoignage"
        actions={[
          { key: 'publish',   label: 'Publier',   icon: Eye,    onClick: () => bulk.mutate({ action: 'publish',   ids: sel.ids }) },
          { key: 'unpublish', label: 'Dépublier', icon: EyeOff, onClick: () => bulk.mutate({ action: 'unpublish', ids: sel.ids }) },
          { key: 'feature',   label: 'Mettre en avant', icon: Star, onClick: () => bulk.mutate({ action: 'feature', ids: sel.ids }) },
          {
            key: 'delete', label: 'Archiver', icon: Trash2, variant: 'danger', confirm: true,
            confirmTitle: 'Archiver ces témoignages ?',
            confirmText: `${sel.count} témoignage(s) seront archivés.`,
            confirmCta: 'Archiver',
            onClick: () => bulk.mutate({ action: 'delete', ids: sel.ids }),
          },
        ]}
      />

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Archiver ce témoignage ?"
        description={confirmDelete?.name}
        size="sm"
      >
        <p>Le témoignage ne sera plus affiché publiquement. Tu peux le restaurer plus tard.</p>
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

function TestimonialMobileRow({ t }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-12 w-12 rounded-full overflow-hidden shrink-0" style={{ background: 'var(--adm-card-hover)' }}>
        {t.image_path
          ? <img src={t.image_path} alt="" className="h-full w-full object-cover" loading="lazy" />
          : <div className="h-full w-full flex items-center justify-center" style={{ color: 'var(--adm-text-faint)' }}><MessageCircle size={18} /></div>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>{t.name}{t.age && `, ${t.age}`}</div>
        <div className="text-xs italic line-clamp-1" style={{ color: 'var(--adm-text-muted)' }}>« {t.quote} »</div>
        <div className="flex items-center gap-1 mt-1">
          <span className={`adm-badge ${t.is_published ? 'adm-badge-success' : ''}`}>
            {t.is_published ? 'Publié' : 'Brouillon'}
          </span>
          {t.has_video && <span className="adm-badge text-[9px]"><Video size={9}/></span>}
        </div>
      </div>
      <ChevronRight size={14} style={{ color: 'var(--adm-text-faint)' }} className="shrink-0" />
    </div>
  )
}
