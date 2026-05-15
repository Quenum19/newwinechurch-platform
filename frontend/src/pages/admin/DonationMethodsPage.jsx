/**
 * DonationMethodsPage — Admin CRUD des opérateurs Mobile Money / Wave / cash.
 *
 *  - Liste cards avec logo, couleur, numéro
 *  - Toggle actif/inactif
 *  - Modale création/édition avec upload logo + couleur picker
 *  - Drag-free reordering via champ sort_order
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Eye, EyeOff, Smartphone, Upload, X } from 'lucide-react'

import { donationMethods } from '@/api/admin'

export default function DonationMethodsPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(null) // null = closed, {} = new, {...obj} = edit

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin', 'donation-methods'],
    queryFn: donationMethods.list,
  })

  const toggle = useMutation({
    mutationFn: donationMethods.toggle,
    onSuccess: (resp) => {
      toast.success(resp?.message ?? 'OK')
      qc.invalidateQueries({ queryKey: ['admin', 'donation-methods'] })
    },
  })

  const remove = useMutation({
    mutationFn: donationMethods.remove,
    onSuccess: () => {
      toast.success('Supprimée.')
      qc.invalidateQueries({ queryKey: ['admin', 'donation-methods'] })
    },
  })

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Méthodes de don</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
            Opérateurs Mobile Money + cash affichés sur la page <code>/donner</code>.
          </p>
        </div>
        <button onClick={() => setEditing({})} className="adm-btn adm-btn-primary">
          <Plus size={14} /> Nouvelle méthode
        </button>
      </header>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="adm-card p-4 h-40 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="adm-card p-8 text-center" style={{ color: 'var(--adm-text-muted)' }}>
          Aucune méthode configurée.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((m) => (
            <MethodCard
              key={m.id}
              method={m}
              onEdit={() => setEditing(m)}
              onToggle={() => toggle.mutate(m.id)}
              onDelete={() => {
                if (confirm(`Supprimer "${m.name}" ?`)) remove.mutate(m.id)
              }}
            />
          ))}
        </div>
      )}

      {editing !== null && (
        <MethodModal
          method={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            qc.invalidateQueries({ queryKey: ['admin', 'donation-methods'] })
          }}
        />
      )}
    </div>
  )
}

function MethodCard({ method, onEdit, onToggle, onDelete }) {
  return (
    <article className="adm-card p-4">
      <div className="flex items-center gap-3 mb-3">
        {method.logo_url ? (
          <img src={method.logo_url} alt={method.name}
               className="h-12 w-12 rounded object-contain p-1"
               style={{ background: method.color_hex ?? 'var(--adm-bg-soft)' }} />
        ) : (
          <div
            className="h-12 w-12 rounded flex items-center justify-center text-white font-bold"
            style={{ background: method.color_hex ?? 'var(--adm-accent)' }}
          >
            {method.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold" style={{ color: 'var(--adm-text)' }}>{method.name}</p>
          <p className="text-xs font-mono truncate" style={{ color: 'var(--adm-text-faint)' }}>
            {method.code}
          </p>
        </div>
        <span className={`adm-badge ${method.is_active ? 'adm-badge-success' : 'adm-badge-neutral'}`}>
          {method.is_active ? 'Actif' : 'Inactif'}
        </span>
      </div>

      <dl className="space-y-1 text-sm mb-3">
        {method.account_number && (
          <div className="flex justify-between gap-2">
            <dt style={{ color: 'var(--adm-text-muted)' }}>Numéro</dt>
            <dd className="font-mono truncate" style={{ color: 'var(--adm-text)' }}>{method.account_number}</dd>
          </div>
        )}
        {method.ussd_code && (
          <div className="flex justify-between gap-2">
            <dt style={{ color: 'var(--adm-text-muted)' }}>USSD</dt>
            <dd className="font-mono" style={{ color: 'var(--adm-text)' }}>{method.ussd_code}</dd>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <dt style={{ color: 'var(--adm-text-muted)' }}>Ordre</dt>
          <dd style={{ color: 'var(--adm-text)' }}>{method.sort_order}</dd>
        </div>
      </dl>

      <div className="flex gap-1 pt-2" style={{ borderTop: '1px solid var(--adm-border)' }}>
        <button onClick={onEdit} className="adm-btn-icon" title="Modifier">
          <Edit2 size={14} />
        </button>
        <button onClick={onToggle} className="adm-btn-icon" title={method.is_active ? 'Désactiver' : 'Activer'}>
          {method.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button onClick={onDelete} className="adm-btn-icon" style={{ color: '#b91c1c' }} title="Supprimer">
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  )
}

function MethodModal({ method, onClose, onSaved }) {
  const isNew = !method?.id
  const [form, setForm] = useState({
    name:           method?.name ?? '',
    code:           method?.code ?? '',
    account_number: method?.account_number ?? '',
    recipient_name: method?.recipient_name ?? 'NEW WINE CHURCH',
    color_hex:      method?.color_hex ?? '#8B1A2F',
    ussd_code:      method?.ussd_code ?? '',
    instructions:   method?.instructions ?? '',
    sort_order:     method?.sort_order ?? 99,
    is_active:      method?.is_active ?? true,
  })
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(method?.logo_url ?? null)

  const save = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined) fd.append(k, typeof v === 'boolean' ? (v ? '1' : '0') : v)
      })
      if (logoFile) fd.append('logo', logoFile)
      return isNew ? donationMethods.create(fd) : donationMethods.update(method.id, fd)
    },
    onSuccess: () => {
      toast.success(isNew ? 'Méthode créée.' : 'Mise à jour.')
      onSaved()
    },
    onError: (err) => {
      const errs = err?.response?.data?.errors
      const first = errs ? Object.values(errs).flat()[0] : err?.response?.data?.message
      toast.error(first || 'Erreur.')
    },
  })

  const onLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1024 * 1024) return toast.error('Logo trop lourd (max 1 Mo).')
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/40 overflow-y-auto">
      <div className="adm-card p-5 sm:p-6 w-full max-w-lg my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg" style={{ color: 'var(--adm-text)' }}>
            {isNew ? 'Nouvelle méthode' : 'Modifier la méthode'}
          </h2>
          <button onClick={onClose} className="adm-btn-icon"><X size={16} /></button>
        </div>

        <div className="space-y-4">
          <ModalField label="Nom *">
            <input value={form.name}
                   onChange={(e) => setForm({ ...form, name: e.target.value })}
                   className="adm-input w-full" placeholder="ex: Orange Money" />
          </ModalField>

          {isNew && (
            <ModalField label="Code (machine, snake_case)" hint="Auto-généré à partir du nom si laissé vide.">
              <input value={form.code}
                     onChange={(e) => setForm({ ...form, code: e.target.value })}
                     className="adm-input w-full font-mono" placeholder="orange_money" />
            </ModalField>
          )}

          <div className="grid grid-cols-2 gap-3">
            <ModalField label="Numéro à recevoir">
              <input value={form.account_number}
                     onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                     className="adm-input w-full font-mono" placeholder="+225 07 00 00 00 00" />
            </ModalField>
            <ModalField label="Code USSD">
              <input value={form.ussd_code}
                     onChange={(e) => setForm({ ...form, ussd_code: e.target.value })}
                     className="adm-input w-full font-mono" placeholder="#144#" />
            </ModalField>
          </div>

          <ModalField label="Nom du bénéficiaire">
            <input value={form.recipient_name}
                   onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                   className="adm-input w-full" placeholder="NEW WINE CHURCH" />
          </ModalField>

          <ModalField label="Logo (PNG/JPG/SVG, max 1 Mo)" hint="Optionnel — sinon initiale + couleur affichée.">
            <div className="flex items-center gap-3">
              {logoPreview && (
                <img src={logoPreview} alt="Aperçu"
                     className="h-14 w-14 rounded object-contain p-1"
                     style={{ background: form.color_hex }} />
              )}
              <label className="adm-btn adm-btn-secondary cursor-pointer">
                <Upload size={14} /> Choisir un logo
                <input type="file" accept="image/*" className="hidden" onChange={onLogoChange} />
              </label>
            </div>
          </ModalField>

          <div className="grid grid-cols-2 gap-3">
            <ModalField label="Couleur (#RRGGBB)">
              <div className="flex items-center gap-2">
                <input type="color" value={form.color_hex}
                       onChange={(e) => setForm({ ...form, color_hex: e.target.value })}
                       className="h-9 w-14 rounded border cursor-pointer"
                       style={{ borderColor: 'var(--adm-border)' }} />
                <input value={form.color_hex}
                       onChange={(e) => setForm({ ...form, color_hex: e.target.value })}
                       className="adm-input flex-1 font-mono text-xs" />
              </div>
            </ModalField>
            <ModalField label="Ordre d'affichage">
              <input type="number" value={form.sort_order}
                     onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                     min="0" max="999"
                     className="adm-input w-full" />
            </ModalField>
          </div>

          <ModalField label="Instructions (étapes)"
                      hint="Chaque ligne sera affichée comme une étape sur la page Donner.">
            <textarea value={form.instructions}
                      onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                      rows={5} className="adm-input w-full"
                      placeholder={"1. Composez #144#\n2. Choisissez Transfert\n…"} />
          </ModalField>

          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--adm-text)' }}>
            <input type="checkbox" checked={form.is_active}
                   onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Méthode active (visible sur la page Donner)
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4" style={{ borderTop: '1px solid var(--adm-border)' }}>
          <button onClick={onClose} className="adm-btn adm-btn-secondary">Annuler</button>
          <button onClick={() => save.mutate()} disabled={save.isPending}
                  className="adm-btn adm-btn-primary">
            {save.isPending ? 'Enregistrement…' : (isNew ? 'Créer' : 'Enregistrer')}
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
