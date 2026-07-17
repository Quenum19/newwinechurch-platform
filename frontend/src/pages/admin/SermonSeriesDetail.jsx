/**
 * Détail d'une série admin — vue album.
 *
 * Affiche le cover + métadonnées + liste chrono des sermons.
 * Le bouton "Ajouter un sermon" pré-sélectionne la série dans le form.
 */
import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Layers, Edit3, Plus, Eye, EyeOff, Star, Mic,
  Calendar, ChevronRight, ImageIcon, Trash2,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import Modal from '@/components/ui/Modal.jsx'
import Spinner from '@/components/ui/Spinner.jsx'
import BackButton from '@/components/admin/BackButton.jsx'
import { sermonSeries, sermons } from '@/api/admin'

export default function SermonSeriesDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(null)

  // On charge la série + sa liste de sermons depuis l'endpoint sermons (filtré).
  const { data: series, isLoading: loadingSeries } = useQuery({
    queryKey: ['admin', 'sermon-series', id],
    queryFn: async () => {
      const list = await sermonSeries.list({ per_page: 100 })
      return (list?.data ?? []).find((s) => String(s.id) === String(id)) ?? null
    },
  })

  const { data: sermonsBundle, isLoading: loadingSermons } = useQuery({
    queryKey: ['admin', 'sermons', 'by-series', id],
    queryFn: () => sermons.list({ series_id: id, per_page: 50, sort: 'sermon_date', direction: 'asc' }),
    enabled: !!id,
  })

  const sermonItems = sermonsBundle?.data ?? []

  const removeSeries = useMutation({
    mutationFn: () => sermonSeries.delete(id),
    onSuccess: () => {
      toast.success('Série supprimée.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'sermon-series'] })
      navigate('/admin/sermons/series')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Suppression impossible.'),
  })

  const togglePublish = useMutation({
    mutationFn: (sid) => sermons.togglePublish(sid),
    onSuccess: () => {
      toast.success('Statut mis à jour.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'sermons'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'sermons', 'by-series', id] })
    },
  })

  if (loadingSeries) return <div className="adm-card h-64 animate-pulse" />
  if (!series) return (
    <div className="adm-card p-6 text-center">
      <p>Série introuvable.</p>
      <Link to="/admin/sermons/series" className="adm-btn mt-4">Retour aux séries</Link>
    </div>
  )

  const totalSeconds = sermonItems.reduce((acc, s) => acc + (s.duration_seconds || 0), 0)
  const totalMinutes = Math.round(totalSeconds / 60)

  return (
    <div className="space-y-5 sm:space-y-6">
      <BackButton to="/admin/sermons/series" label="Toutes les séries" />

      {/* Hero série */}
      <div className="adm-card overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          <div
            className="aspect-video md:aspect-auto md:min-h-[200px] flex items-center justify-center"
            style={{ background: series.cover_image ? 'transparent' : 'var(--adm-card-hover)' }}
          >
            {series.cover_image ? (
              <img src={series.cover_image} alt={series.title} className="h-full w-full object-cover" />
            ) : (
              <Layers size={56} style={{ color: 'var(--adm-text-faint)' }} />
            )}
          </div>
          <div className="md:col-span-2 p-5 sm:p-6 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--adm-accent)' }}>
                  Série
                </span>
                <span className={`adm-badge ${series.is_active ? 'adm-badge-success' : ''}`}>
                  {series.is_active ? 'Active' : 'Archivée'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold leading-tight">{series.title}</h1>
              {series.description && (
                <p className="mt-2 text-sm" style={{ color: 'var(--adm-text-muted)' }}>{series.description}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-4 text-xs" style={{ color: 'var(--adm-text-muted)' }}>
                {(series.started_at || series.ended_at) && (
                  <div className="inline-flex items-center gap-1.5">
                    <Calendar size={12} />
                    {series.started_at && format(new Date(series.started_at), 'MMM yyyy', { locale: fr })}
                    {series.ended_at ? ` → ${format(new Date(series.ended_at), 'MMM yyyy', { locale: fr })}` : (series.started_at ? ' → …' : '')}
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5"><Mic size={12} /> {sermonItems.length} sermons</div>
                {totalMinutes > 0 && <div className="inline-flex items-center gap-1.5">⏱ ~{totalMinutes} min total</div>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to={`/admin/sermons/nouveau?series_id=${series.id}`}
                className="adm-btn adm-btn-primary"
              >
                <Plus size={14} /> Ajouter un sermon
              </Link>
              <Link to={`/admin/sermons/series/${series.id}/edit`} className="adm-btn">
                <Edit3 size={14} /> Modifier la série
              </Link>
              {series.sermons_count === 0 && (
                <button
                  onClick={() => setConfirmDelete(series)}
                  className="adm-btn"
                  style={{ color: 'var(--adm-danger)' }}
                >
                  <Trash2 size={14} /> Supprimer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Liste sermons de la série */}
      <section>
        <header className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Messages dans cette série</h2>
          <span className="text-xs" style={{ color: 'var(--adm-text-muted)' }}>
            Tri chronologique
          </span>
        </header>

        {loadingSermons ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : sermonItems.length === 0 ? (
          <div className="adm-card p-8 text-center">
            <ImageIcon size={32} style={{ color: 'var(--adm-text-faint)' }} className="mx-auto mb-2" />
            <p className="text-sm" style={{ color: 'var(--adm-text-muted)' }}>
              Aucun sermon dans cette série.
            </p>
            <Link
              to={`/admin/sermons/nouveau?series_id=${series.id}`}
              className="adm-btn adm-btn-primary mt-4 inline-flex"
            >
              <Plus size={14} /> Créer le premier sermon
            </Link>
          </div>
        ) : (
          <div className="adm-card divide-y" style={{ borderColor: 'var(--adm-border)' }}>
            {sermonItems.map((s, i) => (
              <SermonRow
                key={s.id}
                sermon={s}
                index={i + 1}
                onTogglePublish={() => togglePublish.mutate(s.id)}
              />
            ))}
          </div>
        )}
      </section>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Supprimer cette série ?"
        description={confirmDelete?.title}
        size="sm"
      >
        <p>Cette action est définitive.</p>
        <Modal.Footer>
          <button onClick={() => setConfirmDelete(null)} className="adm-btn">Annuler</button>
          <button
            onClick={() => removeSeries.mutate()}
            disabled={removeSeries.isPending}
            className="adm-btn adm-btn-danger"
          >
            {removeSeries.isPending ? 'Suppression…' : 'Supprimer'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

function SermonRow({ sermon, index, onTogglePublish }) {
  return (
    <Link
      to={`/admin/sermons/${sermon.id}`}
      className="flex items-center gap-3 p-3 sm:p-4 transition hover:bg-zinc-50"
    >
      <span className="w-7 text-center text-xs tabular-nums shrink-0" style={{ color: 'var(--adm-text-faint)' }}>
        {String(index).padStart(2, '0')}
      </span>
      <div className="h-12 w-20 rounded overflow-hidden flex items-center justify-center shrink-0" style={{ background: 'var(--adm-card-hover)' }}>
        {sermon.thumbnail
          ? <img src={sermon.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
          : <Mic size={16} style={{ color: 'var(--adm-text-faint)' }} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>{sermon.title}</span>
          {sermon.is_featured && <Star size={11} fill="currentColor" style={{ color: 'var(--adm-warning)' }} />}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px]" style={{ color: 'var(--adm-text-muted)' }}>
          {sermon.sermon_date && (
            <span className="tabular-nums">{format(new Date(sermon.sermon_date), 'dd MMM yyyy', { locale: fr })}</span>
          )}
          {sermon.scripture_reference && <span className="italic" style={{ color: 'var(--adm-accent)' }}>{sermon.scripture_reference}</span>}
        </div>
      </div>
      <span className={`adm-badge text-[10px] shrink-0 ${sermon.is_published ? 'adm-badge-success' : ''}`}>
        {sermon.is_published ? 'Publié' : 'Brouillon'}
      </span>
      <button
        onClick={(e) => { e.preventDefault(); onTogglePublish() }}
        className="p-1.5 rounded hover:bg-zinc-100 transition shrink-0"
        style={{ color: sermon.is_published ? 'var(--adm-text-muted)' : 'var(--adm-accent)' }}
        title={sermon.is_published ? 'Dépublier' : 'Publier'}
      >
        {sermon.is_published ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
      <ChevronRight size={14} style={{ color: 'var(--adm-text-faint)' }} className="shrink-0" />
    </Link>
  )
}
