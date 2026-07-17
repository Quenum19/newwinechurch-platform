/**
 * Catalogue des thèmes de sermons — UI compacte type "chips" éditable.
 *
 * Logique : les thèmes par défaut (is_default) sont renommables mais pas
 * supprimables. L'admin peut créer librement de nouveaux thèmes. Tout se
 * passe inline + modal (pas de page dédiée par thème).
 */
import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Edit3, Trash2, Lock } from 'lucide-react'

import Modal from '@/components/ui/Modal.jsx'
import Spinner from '@/components/ui/Spinner.jsx'
import SermonsTabs from '@/components/admin/SermonsTabs.jsx'
import { sermonThemes } from '@/api/admin'

const DEFAULT_COLORS = [
  '#C9A961', '#A8423D', '#5B7C4A', '#3A5572',
  '#6B4F7A', '#B8693C', '#4F6E78', '#7A4F4F',
]

export default function SermonThemesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)        // theme being edited (null = no modal)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const { data: themes = [], isLoading } = useQuery({
    queryKey: ['admin', 'sermon-themes'],
    queryFn: () => sermonThemes.list(),
    staleTime: 60 * 1000,
  })

  const remove = useMutation({
    mutationFn: (id) => sermonThemes.delete(id),
    onSuccess: () => {
      toast.success('Thème supprimé.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'sermon-themes'] })
      setConfirmDelete(null)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Suppression impossible.'),
  })

  const filtered = themes.filter((t) =>
    !search.trim() || t.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

  const customCount = themes.filter((t) => !t.is_default).length
  const defaultCount = themes.length - customCount

  return (
    <div className="space-y-5 sm:space-y-6">
      <SermonsTabs />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Thèmes de sermons</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
            Catalogue de tags pour ranger les messages : <strong>{defaultCount}</strong> officiels (protégés) +
            <strong> {customCount}</strong> personnalisés.
          </p>
        </div>
        <button onClick={() => setCreating(true)} className="adm-btn adm-btn-primary">
          <Plus size={14} /> Nouveau thème
        </button>
      </header>

      <div className="adm-card p-4 sm:p-6">
        <input
          type="search"
          placeholder="Filtrer par nom…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="adm-input mb-4 max-w-sm"
        />

        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-10 text-sm italic" style={{ color: 'var(--adm-text-muted)' }}>
            Aucun thème — crée le premier.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {filtered.map((t) => (
              <ThemeChip
                key={t.id}
                theme={t}
                onEdit={() => setEditing(t)}
                onDelete={() => setConfirmDelete(t)}
              />
            ))}
          </div>
        )}

        <p className="text-[11px] mt-4 italic" style={{ color: 'var(--adm-text-faint)' }}>
          <Lock size={10} className="inline mr-1" />
          Les thèmes verrouillés ont été seedés par le système. Tu peux les renommer mais pas les supprimer
          — c'est pour qu'un message tagué "prière" en 2026 reste retrouvable en 2046.
        </p>
      </div>

      {/* Modal création/édition */}
      <ThemeFormModal
        open={creating || !!editing}
        onClose={() => { setCreating(false); setEditing(null) }}
        theme={editing}
      />

      {/* Modal suppression */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Supprimer ce thème ?"
        description={confirmDelete?.name}
        size="sm"
      >
        <p>
          Cette action est définitive. Tous les liens entre ce thème et les sermons seront supprimés
          (les sermons eux-mêmes restent intacts).
        </p>
        {confirmDelete?.sermons_count > 0 && (
          <p className="mt-2 text-red-700 text-sm">
            <strong>{confirmDelete.sermons_count} sermons</strong> utilisent ce thème — retire-le de ces sermons d'abord.
          </p>
        )}
        <Modal.Footer>
          <button onClick={() => setConfirmDelete(null)} className="adm-btn">Annuler</button>
          <button
            onClick={() => remove.mutate(confirmDelete.id)}
            disabled={remove.isPending || confirmDelete?.sermons_count > 0}
            className="adm-btn adm-btn-danger"
          >
            {remove.isPending ? 'Suppression…' : 'Supprimer'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

function ThemeChip({ theme, onEdit, onDelete }) {
  const color = theme.color || '#6B5F4E'
  return (
    <div
      className="group inline-flex items-center gap-2 pl-3 pr-1 py-1.5 rounded-full border transition hover:shadow-sm"
      style={{ borderColor: color + '55', background: color + '12' }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full shrink-0"
        style={{ background: color }}
      />
      <span className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>{theme.name}</span>
      {theme.sermons_count > 0 && (
        <span className="text-[10px] tabular-nums px-1.5 py-0.5 rounded-full" style={{ background: color + '22', color: 'var(--adm-text-muted)' }}>
          {theme.sermons_count}
        </span>
      )}
      <button
        onClick={onEdit}
        className="p-1 rounded-full hover:bg-white/60 transition"
        style={{ color: 'var(--adm-text-muted)' }}
        title="Modifier"
      >
        <Edit3 size={11} />
      </button>
      {!theme.is_default ? (
        <button
          onClick={onDelete}
          className="p-1 rounded-full hover:bg-red-50 transition"
          style={{ color: 'var(--adm-danger)' }}
          title="Supprimer"
        >
          <Trash2 size={11} />
        </button>
      ) : (
        <span className="p-1" title="Thème officiel — non supprimable" style={{ color: 'var(--adm-text-faint)' }}>
          <Lock size={11} />
        </span>
      )}
    </div>
  )
}

function ThemeFormModal({ open, onClose, theme }) {
  const queryClient = useQueryClient()
  const isEdit = !!theme

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(DEFAULT_COLORS[0])

  // Reset le formulaire à chaque transition fermée → ouverte.
  useResetOnOpen(open, () => {
    setName(theme?.name ?? '')
    setDescription(theme?.description ?? '')
    setColor(theme?.color ?? DEFAULT_COLORS[0])
  })

  const save = useMutation({
    mutationFn: (payload) => isEdit ? sermonThemes.update(theme.id, payload) : sermonThemes.create(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Thème mis à jour.' : 'Thème créé.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'sermon-themes'] })
      onClose()
    },
    onError: (err) => {
      const errs = err?.response?.data?.errors
      const first = errs ? Object.values(errs).flat()[0] : err?.response?.data?.message
      toast.error(first || 'Erreur de sauvegarde.')
    },
  })

  const onSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Donne un nom au thème.')
    save.mutate({
      name: name.trim(),
      description: description.trim() || null,
      color,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Modifier "${theme?.name}"` : 'Nouveau thème'}
      description={isEdit && theme?.is_default ? 'Thème officiel : tu peux le renommer mais il restera dans le catalogue.' : null}
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--adm-text-muted)' }}>
            Nom du thème *
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="adm-input mt-1"
            placeholder='ex: "Témoignage"'
            maxLength={100}
            autoFocus
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--adm-text-muted)' }}>
            Description (optionnel)
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="adm-input mt-1"
            rows={2}
            maxLength={250}
            placeholder="Brève phrase qui aide à savoir quand utiliser ce thème."
          />
        </label>

        <div>
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--adm-text-muted)' }}>
            Couleur du badge
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {DEFAULT_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full border-2 transition ${color === c ? 'ring-2 ring-offset-2' : ''}`}
                style={{ background: c, borderColor: c }}
                title={c}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value.toUpperCase())}
              className="h-8 w-12 cursor-pointer rounded border"
              title="Couleur personnalisée"
            />
          </div>
        </div>

        <Modal.Footer>
          <button type="button" onClick={onClose} className="adm-btn">Annuler</button>
          <button type="submit" disabled={save.isPending} className="adm-btn adm-btn-primary">
            {save.isPending ? 'Enregistrement…' : (isEdit ? 'Enregistrer' : 'Créer le thème')}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}

// Petit hook utilitaire : exécute reset() à chaque transition fermé→ouvert.
function useResetOnOpen(open, reset) {
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open && !wasOpen.current) reset()
    wasOpen.current = open
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
}
