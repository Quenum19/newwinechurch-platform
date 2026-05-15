/**
 * AuthImagesPage — Superadmin : gestion des images affichées sur le hero
 * des pages connexion/inscription. Une image est tirée au hasard à chaque
 * affichage de /connexion ou /rejoindre.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Eye, EyeOff, Upload, X, Image as ImageIcon } from 'lucide-react'

import { authImages } from '@/api/admin'

export default function AuthImagesPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(null)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin', 'auth-images'],
    queryFn: authImages.list,
  })

  const toggle = useMutation({
    mutationFn: authImages.toggle,
    onSuccess: (r) => {
      toast.success(r?.message ?? 'OK')
      qc.invalidateQueries({ queryKey: ['admin', 'auth-images'] })
    },
  })

  const remove = useMutation({
    mutationFn: authImages.remove,
    onSuccess: () => {
      toast.success('Image supprimée.')
      qc.invalidateQueries({ queryKey: ['admin', 'auth-images'] })
    },
  })

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Images d'accueil (auth)</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
            Affichées au hasard sur <code>/connexion</code> et <code>/rejoindre</code>.
            Tu peux ajouter un verset facultatif qui sera superposé sur l'image.
          </p>
        </div>
        <button onClick={() => setEditing({})} className="adm-btn adm-btn-primary">
          <Plus size={14} /> Ajouter une image
        </button>
      </header>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="adm-card h-56 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="adm-card p-10 text-center" style={{ color: 'var(--adm-text-muted)' }}>
          <ImageIcon size={28} className="mx-auto mb-2 opacity-40" />
          Aucune image. Ajoute-en pour personnaliser les pages auth.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((img) => (
            <ImageCard
              key={img.id}
              image={img}
              onEdit={() => setEditing(img)}
              onToggle={() => toggle.mutate(img.id)}
              onDelete={() => {
                if (confirm('Supprimer cette image ?')) remove.mutate(img.id)
              }}
            />
          ))}
        </div>
      )}

      {editing !== null && (
        <ImageModal
          image={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            qc.invalidateQueries({ queryKey: ['admin', 'auth-images'] })
          }}
        />
      )}
    </div>
  )
}

function ImageCard({ image, onEdit, onToggle, onDelete }) {
  return (
    <article className="adm-card overflow-hidden">
      <div className="relative aspect-[4/3] bg-zinc-100">
        <img src={image.url} alt={image.title ?? ''} className="absolute inset-0 h-full w-full object-cover" />
        <span className={`absolute top-2 right-2 adm-badge ${image.is_active ? 'adm-badge-success' : 'adm-badge-neutral'}`}>
          {image.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div className="p-3 space-y-1">
        <p className="font-medium text-sm" style={{ color: 'var(--adm-text)' }}>
          {image.title || '(Sans titre)'}
        </p>
        {image.verse_ref && (
          <p className="text-xs italic" style={{ color: 'var(--adm-text-muted)' }}>
            « {image.verse_text?.slice(0, 90)}{image.verse_text?.length > 90 ? '…' : ''} » — {image.verse_ref}
          </p>
        )}
      </div>
      <div className="flex gap-1 px-3 py-2" style={{ borderTop: '1px solid var(--adm-border)' }}>
        <button onClick={onEdit} className="adm-btn-icon" title="Modifier"><Edit2 size={14} /></button>
        <button onClick={onToggle} className="adm-btn-icon" title={image.is_active ? 'Désactiver' : 'Activer'}>
          {image.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button onClick={onDelete} className="adm-btn-icon" style={{ color: '#b91c1c' }} title="Supprimer">
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  )
}

function ImageModal({ image, onClose, onSaved }) {
  const isNew = !image?.id
  const [form, setForm] = useState({
    title:      image?.title ?? '',
    verse_ref:  image?.verse_ref ?? '',
    verse_text: image?.verse_text ?? '',
    sort_order: image?.sort_order ?? 99,
    is_active:  image?.is_active ?? true,
  })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(image?.url ?? null)

  const save = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined) fd.append(k, typeof v === 'boolean' ? (v ? '1' : '0') : v)
      })
      if (file) fd.append('image', file)
      return isNew ? authImages.create(fd) : authImages.update(image.id, fd)
    },
    onSuccess: () => {
      toast.success(isNew ? 'Image ajoutée.' : 'Mise à jour.')
      onSaved()
    },
    onError: (err) => {
      const errs = err?.response?.data?.errors
      const first = errs ? Object.values(errs).flat()[0] : err?.response?.data?.message
      toast.error(first || 'Erreur.')
    },
  })

  const onFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) return toast.error('Image trop lourde (max 5 Mo).')
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/40 overflow-y-auto">
      <div className="adm-card p-5 sm:p-6 w-full max-w-lg my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg" style={{ color: 'var(--adm-text)' }}>
            {isNew ? 'Ajouter une image' : 'Modifier l\'image'}
          </h2>
          <button onClick={onClose} className="adm-btn-icon"><X size={16} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--adm-text-faint)' }}>
              {isNew ? 'Photo *' : 'Photo (laissée vide = inchangée)'}
            </label>
            {preview && (
              <div className="mb-2 relative aspect-[4/3] rounded-lg overflow-hidden border" style={{ borderColor: 'var(--adm-border)' }}>
                <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
              </div>
            )}
            <label className="adm-btn adm-btn-secondary cursor-pointer">
              <Upload size={14} /> Choisir un fichier (JPG/PNG/WebP)
              <input type="file" accept="image/*" className="hidden" onChange={onFile} />
            </label>
          </div>

          <ModalField label="Titre (interne)">
            <input value={form.title}
                   onChange={(e) => setForm({ ...form, title: e.target.value })}
                   className="adm-input w-full" placeholder="ex: Adoration jeunesse" />
          </ModalField>

          <ModalField label="Référence du verset" hint="ex: Matthieu 5:13-14">
            <input value={form.verse_ref}
                   onChange={(e) => setForm({ ...form, verse_ref: e.target.value })}
                   className="adm-input w-full" placeholder="Matthieu 5:13-14" />
          </ModalField>

          <ModalField label="Texte du verset" hint="Affiché en superposition. Saute des lignes avec Entrée.">
            <textarea value={form.verse_text}
                      onChange={(e) => setForm({ ...form, verse_text: e.target.value })}
                      rows={3} className="adm-input w-full"
                      placeholder="Vous êtes le sel de la terre." />
          </ModalField>

          <div className="grid grid-cols-2 gap-3">
            <ModalField label="Ordre">
              <input type="number" value={form.sort_order}
                     onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                     min="0" max="999" className="adm-input w-full" />
            </ModalField>
            <ModalField label="Actif">
              <label className="flex items-center gap-2 mt-2 text-sm cursor-pointer" style={{ color: 'var(--adm-text)' }}>
                <input type="checkbox" checked={form.is_active}
                       onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Image visible sur les pages auth
              </label>
            </ModalField>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4" style={{ borderTop: '1px solid var(--adm-border)' }}>
          <button onClick={onClose} className="adm-btn adm-btn-secondary">Annuler</button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || (isNew && !file)}
            className="adm-btn adm-btn-primary"
          >
            {save.isPending ? 'Enregistrement…' : (isNew ? 'Ajouter' : 'Enregistrer')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalField({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--adm-text-faint)' }}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs" style={{ color: 'var(--adm-text-faint)' }}>{hint}</p>}
    </div>
  )
}
