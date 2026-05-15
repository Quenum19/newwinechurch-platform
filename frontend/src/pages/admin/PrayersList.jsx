/** Demandes de prière — Refonte 2026 admin-v2 native. */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Eye, EyeOff, CheckCircle2, Trash2, Heart, Filter, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import { prayers } from '@/api/admin'

const CATEGORY_LABELS = {
  health: 'Santé', family: 'Famille', work: 'Travail',
  finance: 'Finance', spiritual: 'Spirituel', other: 'Autre',
}

export default function PrayersList() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({ per_page: 30 })

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'prayers', filters],
    queryFn: () => prayers.list(filters),
  })

  const togglePublish = useMutation({
    mutationFn: (id) => prayers.togglePublish(id),
    onSuccess: () => {
      toast.success('Statut mis à jour.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'prayers'] })
    },
  })

  const update = useMutation({
    mutationFn: ({ id, payload }) => prayers.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'prayers'] }),
  })

  const remove = useMutation({
    mutationFn: (id) => prayers.delete(id),
    onSuccess: () => {
      toast.success('Demande supprimée.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'prayers'] })
    },
  })

  const items = data?.data ?? []

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1>Demandes de prière</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
          Modérez les demandes avant publication sur le mur communautaire.
        </p>
      </header>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={14} style={{ color: 'var(--adm-text-faint)' }} />
        <select
          className="adm-select w-auto text-sm h-9"
          value={filters.published ?? ''}
          onChange={(e) => setFilters({ ...filters, published: e.target.value === '' ? undefined : e.target.value })}
        >
          <option value="">Tous statuts</option>
          <option value="0">Non publiés</option>
          <option value="1">Publiés sur le mur</option>
        </select>
        <select
          className="adm-select w-auto text-sm h-9"
          value={filters.category ?? ''}
          onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
        >
          <option value="">Toutes catégories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          className="adm-select w-auto text-sm h-9"
          value={filters.answered ?? ''}
          onChange={(e) => setFilters({ ...filters, answered: e.target.value === '' ? undefined : e.target.value })}
        >
          <option value="">Toutes prières</option>
          <option value="0">En attente</option>
          <option value="1">Exhaussées</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="adm-card p-5 h-32 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="adm-card p-12 text-center">
          <MessageSquare size={32} className="mx-auto mb-3" style={{ color: 'var(--adm-text-faint)' }} />
          <p className="text-sm" style={{ color: 'var(--adm-text-muted)' }}>Aucune demande de prière.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <PrayerCard
              key={p.id}
              p={p}
              onTogglePublish={() => togglePublish.mutate(p.id)}
              onToggleAnswered={() => update.mutate({ id: p.id, payload: { is_answered: !p.is_answered } })}
              onEditNote={() => {
                const note = prompt('Note privée admin :', p.admin_note || '')
                if (note !== null) update.mutate({ id: p.id, payload: { admin_note: note } })
              }}
              onDelete={() => { if (confirm('Supprimer cette demande ?')) remove.mutate(p.id) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PrayerCard({ p, onTogglePublish, onToggleAnswered, onEditNote, onDelete }) {
  return (
    <div className="adm-card p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>
              {p.is_anonymous
                ? <span className="italic" style={{ color: 'var(--adm-text-muted)' }}>Anonyme</span>
                : (p.name || p.user?.full_name || 'Anonyme')}
            </span>
            {p.email && (
              <span className="text-xs" style={{ color: 'var(--adm-text-faint)' }}>{p.email}</span>
            )}
            {p.user && <span className="adm-badge adm-badge-accent">membre</span>}
            <span className="adm-badge">{CATEGORY_LABELS[p.category] || p.category}</span>
            {p.is_answered && <span className="adm-badge adm-badge-success">Exhaussée</span>}
            {p.is_published && <span className="adm-badge adm-badge-info">Sur le mur</span>}
          </div>

          <p className="text-sm leading-relaxed" style={{ color: 'var(--adm-text)' }}>{p.request}</p>

          {p.admin_note && (
            <p
              className="mt-2 text-xs italic border-l-2 pl-2"
              style={{ color: 'var(--adm-text-muted)', borderColor: 'var(--adm-accent)' }}
            >
              Note admin : {p.admin_note}
            </p>
          )}

          <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: 'var(--adm-text-faint)' }}>
            <span>{format(new Date(p.created_at), 'd MMM yyyy à HH:mm', { locale: fr })}</span>
            {p.prayed_by_count > 0 && (
              <span className="inline-flex items-center gap-1">
                <Heart size={10} /> {p.prayed_by_count} priant{p.prayed_by_count > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Actions : verticales desktop, horizontales mobile */}
        <div className="flex sm:flex-col sm:items-stretch gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
          <button
            onClick={onTogglePublish}
            className="adm-btn adm-btn-secondary text-xs py-1.5 px-2.5 justify-center"
            style={p.is_published ? { color: 'var(--adm-success)' } : undefined}
          >
            {p.is_published ? <><Eye size={12} /> Publié</> : <><EyeOff size={12} /> Publier</>}
          </button>
          <button
            onClick={onToggleAnswered}
            className="adm-btn adm-btn-secondary text-xs py-1.5 px-2.5 justify-center"
            style={p.is_answered ? { color: 'var(--adm-accent)' } : undefined}
          >
            <CheckCircle2 size={12} /> {p.is_answered ? 'Exhaussée' : 'Exhaucer'}
          </button>
          <button
            onClick={onEditNote}
            className="adm-btn adm-btn-secondary text-xs py-1.5 px-2.5 justify-center"
          >
            Note
          </button>
          <button
            onClick={onDelete}
            className="adm-btn adm-btn-secondary text-xs py-1.5 px-2.5 justify-center"
            style={{ color: 'var(--adm-danger)', borderColor: '#FECACA' }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
