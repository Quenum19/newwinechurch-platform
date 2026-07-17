/** Création département — Refonte 2026 admin-v2 native. */
import { useNavigate, Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

import BackButton from '@/components/admin/BackButton.jsx'
import { departments } from '@/api/admin'

export default function DepartmentCreate() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      name: '', description: '', icon: 'sparkles',
      color: '#8B1A2F', status: 'active', display_order: 0,
    },
  })

  const currentColor = watch('color')

  const create = useMutation({
    mutationFn: (payload) => departments.create(payload),
    onSuccess: (created) => {
      toast.success('Département créé.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] })
      if (created?.id) navigate(`/admin/departements/${created.id}`)
      else navigate('/admin/departements')
    },
    onError: (err) => {
      const errs = err?.response?.data?.errors
      const first = errs ? Object.values(errs).flat()[0] : err?.response?.data?.message
      toast.error(first || 'Erreur de création.')
    },
  })

  return (
    <div className="space-y-5 sm:space-y-6 max-w-3xl">
      <BackButton to="/admin/departements" label="Retour à la liste" />

      <header>
        <h1>Nouveau département</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
          Une fois créé, tu pourras assigner un gouverneur et ajouter des membres.
        </p>
      </header>

      <form onSubmit={handleSubmit((d) => create.mutate(d))} className="adm-card p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Field label="Nom (FR) *" error={errors.name && 'Requis'}>
            <input
              {...register('name', { required: true })}
              placeholder="ex: Accueil & Réception"
              className="adm-input"
            />
          </Field>
          <Field label="Name (EN)" helper="Facultatif — fallback FR si vide">
            <input
              {...register('name_en')}
              placeholder="ex: Welcome & Reception"
              className="adm-input"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <Field label="Description FR (optionnel)">
            <textarea
              rows={3}
              {...register('description')}
              placeholder="Mission, valeurs, modalités…"
              className="adm-textarea"
            />
          </Field>
          <Field label="Description EN (optionnel)">
            <textarea
              rows={3}
              {...register('description_en')}
              placeholder="Mission, values…"
              className="adm-textarea"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Field label="Icône Lucide" helper="ex: shield, megaphone, music">
            <input {...register('icon')} placeholder="sparkles" className="adm-input" />
          </Field>
          <Field label="Couleur thème">
            <div className="flex items-center gap-2">
              <input
                type="color"
                {...register('color')}
                className="h-9 w-12 rounded border cursor-pointer"
                style={{ borderColor: 'var(--adm-border)' }}
              />
              <code
                className="text-xs font-mono px-2 py-1 rounded flex-1"
                style={{ background: 'var(--adm-card-hover)', color: 'var(--adm-text)' }}
              >
                {currentColor}
              </code>
            </div>
          </Field>
          <Field label="Statut">
            <select {...register('status')} className="adm-select">
              <option value="active">Actif</option>
              <option value="pending">À pourvoir</option>
            </select>
          </Field>
        </div>

        <Field label="Ordre d'affichage" helper="Plus le nombre est petit, plus le département apparaît tôt dans les listes.">
          <input type="number" {...register('display_order')} className="adm-input" />
        </Field>

        <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--adm-border)' }}>
          <button type="submit" disabled={create.isPending} className="adm-btn adm-btn-primary">
            {create.isPending ? <><Loader2 size={14} className="animate-spin" /> …</> : 'Créer le département'}
          </button>
          <Link to="/admin/departements" className="adm-btn adm-btn-ghost">Annuler</Link>
        </div>
      </form>
    </div>
  )
}

function Field({ label, required, error, helper, children }) {
  return (
    <div>
      <label className="block text-sm mb-1.5" style={{ color: 'var(--adm-text)' }}>
        {label}
        {required && <span className="ml-1" style={{ color: 'var(--adm-danger)' }}>*</span>}
      </label>
      {children}
      {helper && !error && (
        <p className="text-xs mt-1" style={{ color: 'var(--adm-text-muted)' }}>{helper}</p>
      )}
      {error && <p className="text-xs mt-1" style={{ color: 'var(--adm-danger)' }}>{error}</p>}
    </div>
  )
}
