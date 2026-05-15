/** Création membre — Refonte 2026 admin-v2 native. */
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, Loader2 } from 'lucide-react'

import { members } from '@/api/admin'

export default function MemberCreate() {
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      status: 'active',
      is_baptized: false,
      joined_at: new Date().toISOString().slice(0, 10),
    },
  })

  const create = useMutation({
    mutationFn: members.create,
    onSuccess: (member) => {
      toast.success('Membre créé.')
      navigate(`/admin/membres/${member.id}`)
    },
    onError: (err) => {
      const errs = err?.response?.data?.errors
      const firstMsg = errs ? Object.values(errs).flat()[0] : err?.response?.data?.message
      toast.error(firstMsg || 'Erreur lors de la création.')
    },
  })

  return (
    <div className="space-y-5 sm:space-y-6 max-w-3xl">
      <Link
        to="/admin/membres"
        className="inline-flex items-center gap-1 text-sm transition hover:underline"
        style={{ color: 'var(--adm-text-muted)' }}
      >
        <ArrowLeft size={14} /> Retour à la liste
      </Link>

      <header>
        <h1>Nouveau membre</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
          Si le mot de passe est vide, un mot de passe aléatoire est généré (un email d'invitation est envoyé).
        </p>
      </header>

      <form onSubmit={handleSubmit((d) => create.mutate(d))} className="adm-card p-4 sm:p-6 space-y-4">
        {/* Identité */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Field label="Prénom" required error={errors.first_name?.message || (errors.first_name && 'Requis')}>
            <input {...register('first_name', { required: true })} className="adm-input" />
          </Field>
          <Field label="Nom" required error={errors.name && 'Requis'}>
            <input {...register('name', { required: true })} className="adm-input" />
          </Field>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Field label="Email" required error={errors.email && 'Requis'}>
            <input type="email" {...register('email', { required: true })} className="adm-input" />
          </Field>
          <Field label="Téléphone">
            <input type="tel" {...register('phone')} className="adm-input" />
          </Field>
        </div>

        {/* Statut / Genre / Date de naissance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Field label="Statut">
            <select {...register('status')} className="adm-select">
              <option value="active">Actif</option>
              <option value="pending">En attente</option>
            </select>
          </Field>
          <Field label="Genre">
            <select {...register('gender')} className="adm-select">
              <option value="">—</option>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
          </Field>
          <Field label="Date de naissance">
            <input type="date" {...register('birth_date')} className="adm-input" />
          </Field>
        </div>

        {/* Lieu & date d'arrivée */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Field label="Ville">
            <input {...register('city')} className="adm-input" />
          </Field>
          <Field label="Date d'arrivée NWC">
            <input type="date" {...register('joined_at')} className="adm-input" />
          </Field>
        </div>
        <Field label="Adresse">
          <input {...register('address')} className="adm-input" />
        </Field>

        {/* Mot de passe */}
        <div className="pt-4 border-t" style={{ borderColor: 'var(--adm-border)' }}>
          <h3 className="mb-3">Sécurité</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field label="Mot de passe (optionnel)" helper="8 chars min, mixed case, chiffre, symbole. Vide = généré.">
              <input type="password" autoComplete="new-password" {...register('password')} className="adm-input" />
            </Field>
            <Field label="Confirmer mot de passe">
              <input type="password" autoComplete="new-password" {...register('password_confirmation')} className="adm-input" />
            </Field>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--adm-text)' }}>
          <input
            type="checkbox"
            {...register('is_baptized')}
            className="h-4 w-4 rounded border-zinc-300"
            style={{ accentColor: 'var(--adm-accent)' }}
          />
          Membre baptisé
        </label>

        <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--adm-border)' }}>
          <button type="submit" disabled={create.isPending} className="adm-btn adm-btn-primary">
            {create.isPending ? <><Loader2 size={14} className="animate-spin" /> …</> : 'Créer le membre'}
          </button>
          <Link to="/admin/membres" className="adm-btn adm-btn-ghost">Annuler</Link>
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
      {error && (
        <p className="text-xs mt-1" style={{ color: 'var(--adm-danger)' }}>{error}</p>
      )}
    </div>
  )
}
