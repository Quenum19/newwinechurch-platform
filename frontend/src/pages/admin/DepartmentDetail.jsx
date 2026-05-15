/** Fiche département — Refonte 2026 admin-v2 native. */
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ArrowLeft, Trash2, Users, Loader2 } from 'lucide-react'

import DepartmentMemberManager from '@/components/admin/DepartmentMemberManager.jsx'
import { departments } from '@/api/admin'

export default function DepartmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'departments', id],
    queryFn: () => departments.get(id),
    enabled: !!id,
    retry: 1,
  })

  const dept = data?.data
  const members = data?.members?.data ?? []

  const update = useMutation({
    mutationFn: (payload) => departments.update(id, payload),
    onSuccess: () => {
      toast.success('Département mis à jour.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] })
    },
  })

  const destroy = useMutation({
    mutationFn: () => departments.delete(id),
    onSuccess: () => {
      toast.success('Département supprimé.')
      navigate('/admin/departements')
    },
  })

  const { register, handleSubmit, watch, formState: { isDirty } } = useForm({
    values: dept ? {
      // Préfère les versions brutes FR/EN du Resource pour l'édition.
      name: dept.name_fr ?? dept.name ?? '',
      name_en: dept.name_en ?? '',
      description: dept.description_fr ?? dept.description ?? '',
      description_en: dept.description_en ?? '',
      icon: dept.icon ?? '',
      color: dept.color ?? '#8B1A2F',
      status: dept.status ?? 'active',
      display_order: dept.display_order ?? 0,
    } : undefined,
  })

  const currentColor = watch('color')

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded animate-pulse" style={{ background: '#F4F4F5' }} />
        <div className="adm-card h-96 animate-pulse" />
      </div>
    )
  }
  if (isError || !dept) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/departements"
          className="inline-flex items-center gap-1 text-sm transition hover:underline"
          style={{ color: 'var(--adm-text-muted)' }}
        >
          <ArrowLeft size={14} /> Retour à la liste
        </Link>
        <div className="adm-card p-8 text-center" style={{ color: 'var(--adm-text-muted)' }}>
          Département introuvable.
        </div>
      </div>
    )
  }

  const color = dept.color_theme || dept.color || '#71717A'

  return (
    <div className="space-y-5 sm:space-y-6 max-w-5xl">
      <Link
        to="/admin/departements"
        className="inline-flex items-center gap-1 text-sm transition hover:underline"
        style={{ color: 'var(--adm-text-muted)' }}
      >
        <ArrowLeft size={14} /> Retour à la liste
      </Link>

      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <span
            className="h-12 w-12 rounded-xl flex items-center justify-center text-base font-semibold shrink-0"
            style={{ backgroundColor: color + '22', color }}
          >
            {dept.name?.[0]?.toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate">{dept.name}</h1>
            <p className="text-sm flex items-center gap-3 mt-1" style={{ color: 'var(--adm-text-muted)' }}>
              <span className="inline-flex items-center gap-1">
                <Users size={12} /> {dept.member_count_cache ?? dept.members_count ?? 0} membres
              </span>
              <span>·</span>
              <span className={`adm-badge ${dept.status === 'active' ? 'adm-badge-success' : 'adm-badge-warning'}`}>
                {dept.status === 'active' ? 'Actif' : 'À pourvoir'}
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/admin/departements/${id}/template`)}
            className="adm-btn adm-btn-secondary"
          >
            Template rapport
          </button>
          <button
            onClick={() => { if (confirm('Supprimer ce département ?')) destroy.mutate() }}
            className="adm-btn adm-btn-secondary"
            style={{ color: 'var(--adm-danger)', borderColor: '#FECACA' }}
          >
            <Trash2 size={14} /> Supprimer
          </button>
        </div>
      </header>

      {/* Gestion gouverneur + équipe */}
      <DepartmentMemberManager
        dept={dept}
        members={members}
        onChange={() => queryClient.invalidateQueries({ queryKey: ['admin', 'departments', id] })}
      />

      {/* Édition */}
      <form
        onSubmit={handleSubmit((d) => update.mutate(d))}
        className="adm-card p-4 sm:p-6 space-y-4"
      >
        <h2>Informations</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Field label="Nom (FR) *">
            <input {...register('name')} className="adm-input" required />
          </Field>
          <Field label="Name (EN)" helper="Traduction anglaise (facultatif — fallback FR si vide)">
            <input {...register('name_en')} placeholder="ex: Evangelism" className="adm-input" />
          </Field>
        </div>

        <Field label="Icône (Lucide)" helper="ex: shield, megaphone, music">
          <input {...register('icon')} placeholder="shield" className="adm-input" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
          <Field label="Ordre d'affichage">
            <input type="number" {...register('display_order')} className="adm-input" />
          </Field>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <Field label="Description (FR)">
            <textarea rows={3} {...register('description')} className="adm-textarea" />
          </Field>
          <Field label="Description (EN)" helper="Facultatif — fallback FR si vide">
            <textarea rows={3} {...register('description_en')} className="adm-textarea" />
          </Field>
        </div>

        <div className="pt-3 border-t" style={{ borderColor: 'var(--adm-border)' }}>
          <button
            type="submit"
            disabled={!isDirty || update.isPending}
            className="adm-btn adm-btn-primary"
          >
            {update.isPending ? <><Loader2 size={14} className="animate-spin" /> …</> : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, helper, children }) {
  return (
    <div>
      <label className="block text-sm mb-1.5" style={{ color: 'var(--adm-text)' }}>{label}</label>
      {children}
      {helper && <p className="text-xs mt-1" style={{ color: 'var(--adm-text-muted)' }}>{helper}</p>}
    </div>
  )
}
