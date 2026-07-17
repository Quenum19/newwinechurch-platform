/** Création cellule — Refonte 2026 admin-v2 native. */
import { useNavigate, Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

import BackButton from '@/components/admin/BackButton.jsx'
import { cells } from '@/api/admin'

export default function CellCreate() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: '', description: '', zone: '',
      meeting_day: '', meeting_time: '', meeting_location: '',
      status: 'active',
    },
  })

  const create = useMutation({
    mutationFn: (payload) => cells.create(payload),
    onSuccess: (created) => {
      toast.success('Cellule créée.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'cells'] })
      if (created?.id) navigate(`/admin/cellules/${created.id}`)
      else navigate('/admin/cellules')
    },
    onError: (err) => {
      const errs = err?.response?.data?.errors
      const first = errs ? Object.values(errs).flat()[0] : err?.response?.data?.message
      toast.error(first || 'Erreur de création.')
    },
  })

  return (
    <div className="space-y-5 sm:space-y-6 max-w-3xl">
      <BackButton to="/admin/cellules" label="Retour à la liste" />

      <header>
        <h1>Nouvelle cellule</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
          Une cellule est un petit groupe qui se réunit dans une maison.
        </p>
      </header>

      <form onSubmit={handleSubmit((d) => create.mutate(d))} className="adm-card p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Field label="Nom" required error={errors.name && 'Requis'}>
            <input
              {...register('name', { required: true })}
              placeholder="ex: Cellule Cocody"
              className="adm-input"
            />
          </Field>
          <Field label="Zone">
            <input
              {...register('zone')}
              placeholder="ex: Cocody-Bonoumin"
              className="adm-input"
            />
          </Field>
        </div>

        <Field label="Description (optionnel)">
          <textarea
            rows={3}
            {...register('description')}
            placeholder="Vision, public visé, objectifs…"
            className="adm-textarea"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Field label="Jour de réunion">
            <select {...register('meeting_day')} className="adm-select">
              <option value="">— choisir —</option>
              <option value="lundi">Lundi</option>
              <option value="mardi">Mardi</option>
              <option value="mercredi">Mercredi</option>
              <option value="jeudi">Jeudi</option>
              <option value="vendredi">Vendredi</option>
              <option value="samedi">Samedi</option>
              <option value="dimanche">Dimanche</option>
            </select>
          </Field>
          <Field label="Heure">
            <input type="time" {...register('meeting_time')} className="adm-input" />
          </Field>
          <Field label="Statut">
            <select {...register('status')} className="adm-select">
              <option value="active">Active</option>
              <option value="paused">En pause</option>
              <option value="archived">Archivée</option>
            </select>
          </Field>
        </div>

        <Field label="Lieu de réunion">
          <input
            {...register('meeting_location')}
            placeholder="ex: Chez Pierre, rue 12 villa 45"
            className="adm-input"
          />
        </Field>

        <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--adm-border)' }}>
          <button type="submit" disabled={create.isPending} className="adm-btn adm-btn-primary">
            {create.isPending ? <><Loader2 size={14} className="animate-spin" /> …</> : 'Créer la cellule'}
          </button>
          <Link to="/admin/cellules" className="adm-btn adm-btn-ghost">Annuler</Link>
        </div>
      </form>
    </div>
  )
}

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-sm mb-1.5" style={{ color: 'var(--adm-text)' }}>
        {label}
        {required && <span className="ml-1" style={{ color: 'var(--adm-danger)' }}>*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs mt-1" style={{ color: 'var(--adm-danger)' }}>{error}</p>
      )}
    </div>
  )
}
