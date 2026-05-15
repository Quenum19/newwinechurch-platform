/** Formulaire événement — Refonte 2026 admin-v2 native. */
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ArrowLeft, Loader2 } from 'lucide-react'

import ImageUploader from '@/components/admin/ImageUploader.jsx'
import { events } from '@/api/admin'

const formatForInput = (iso) => iso ? iso.slice(0, 16) : ''

export default function EventForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: event, isLoading } = useQuery({
    queryKey: ['admin', 'events', id],
    queryFn: () => events.get(id),
    enabled: isEdit,
  })

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm({
    values: event ? {
      title: event.title ?? '',
      description: event.description ?? '',
      type: event.type ?? 'culte',
      location: event.location ?? '',
      address: event.address ?? '',
      starts_at: formatForInput(event.starts_at),
      ends_at: formatForInput(event.ends_at),
      max_attendees: event.max_attendees ?? '',
      registration_required: event.registration_required ?? false,
      registration_deadline: formatForInput(event.registration_deadline),
      is_online: event.is_online ?? false,
      online_link: event.online_link ?? '',
      is_featured: event.is_featured ?? false,
      is_published: event.is_published ?? true,
    } : { type: 'culte', is_published: true, registration_required: false, is_online: false },
  })

  const isOnline = watch('is_online')
  const requireReg = watch('registration_required')

  const save = useMutation({
    mutationFn: (formData) => isEdit ? events.update(id, formData) : events.create(formData),
    onSuccess: (data) => {
      toast.success(isEdit ? 'Événement mis à jour.' : 'Événement créé.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] })
      if (!isEdit && data?.id) navigate(`/admin/evenements/${data.id}`)
    },
    onError: (err) => {
      const errs = err?.response?.data?.errors
      const first = errs ? Object.values(errs).flat()[0] : err?.response?.data?.message
      toast.error(first || 'Erreur de sauvegarde.')
    },
  })

  const onSubmit = (data) => {
    const fd = new FormData()
    Object.entries(data).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '') return
      if (k === 'cover_image') return
      if (typeof v === 'boolean') fd.append(k, v ? '1' : '0')
      else fd.append(k, v)
    })
    if (data.cover_image instanceof File) fd.append('cover_image', data.cover_image)
    save.mutate(fd)
  }

  if (isEdit && isLoading) {
    return <div className="adm-card h-96 animate-pulse" />
  }

  return (
    <div className="space-y-5 sm:space-y-6 max-w-5xl">
      <Link
        to="/admin/evenements"
        className="inline-flex items-center gap-1 text-sm transition hover:underline"
        style={{ color: 'var(--adm-text-muted)' }}
      >
        <ArrowLeft size={14} /> Retour à la liste
      </Link>

      <header>
        <h1>{isEdit ? (event?.title || 'Modifier l\'événement') : 'Nouvel événement'}</h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-4">
          <div className="adm-card p-4 sm:p-6 space-y-4">
            <Field label="Titre" required error={errors.title && 'Requis'}>
              <input {...register('title', { required: true })} className="adm-input" />
            </Field>
            <Field label="Description" required error={errors.description && 'Requis'}>
              <textarea
                rows={5}
                {...register('description', { required: true })}
                className="adm-textarea"
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Field label="Type">
                <select {...register('type')} className="adm-select">
                  <option value="culte">Culte</option>
                  <option value="priere">Prière</option>
                  <option value="evangelisation">Évangélisation</option>
                  <option value="concert">Concert</option>
                  <option value="formation">Formation</option>
                  <option value="autre">Autre</option>
                </select>
              </Field>
              <Field label="Lieu">
                <input
                  {...register('location')}
                  placeholder="ex: NWC Cocody-Bonoumin"
                  className="adm-input"
                />
              </Field>
            </div>
            <Field label="Adresse complète">
              <input {...register('address')} className="adm-input" />
            </Field>
          </div>

          <div className="adm-card p-4 sm:p-6 space-y-4">
            <h2>Dates</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Field label="Début" required>
                <input
                  type="datetime-local"
                  {...register('starts_at', { required: true })}
                  className="adm-input"
                />
              </Field>
              <Field label="Fin (optionnel)">
                <input type="datetime-local" {...register('ends_at')} className="adm-input" />
              </Field>
            </div>
          </div>

          <div className="adm-card p-4 sm:p-6 space-y-4">
            <h2>Inscriptions</h2>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--adm-text)' }}>
              <input
                type="checkbox"
                {...register('registration_required')}
                className="h-4 w-4 rounded border-zinc-300"
                style={{ accentColor: 'var(--adm-accent)' }}
              />
              Inscription obligatoire
            </label>
            {requireReg && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pl-6">
                <Field label="Capacité max">
                  <input type="number" placeholder="ex: 100" {...register('max_attendees')} className="adm-input" />
                </Field>
                <Field label="Date limite">
                  <input type="datetime-local" {...register('registration_deadline')} className="adm-input" />
                </Field>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--adm-text)' }}>
              <input
                type="checkbox"
                {...register('is_online')}
                className="h-4 w-4 rounded border-zinc-300"
                style={{ accentColor: 'var(--adm-accent)' }}
              />
              Événement en ligne
            </label>
            {isOnline && (
              <div className="pl-6">
                <Field label="Lien en ligne (Zoom, YouTube…)">
                  <input type="url" {...register('online_link')} className="adm-input" />
                </Field>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="adm-card p-4 sm:p-5 space-y-3">
            <h2>Visibilité</h2>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--adm-text)' }}>
              <input
                type="checkbox"
                {...register('is_published')}
                className="h-4 w-4 rounded border-zinc-300"
                style={{ accentColor: 'var(--adm-accent)' }}
              />
              Publié
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--adm-text)' }}>
              <input
                type="checkbox"
                {...register('is_featured')}
                className="h-4 w-4 rounded border-zinc-300"
                style={{ accentColor: 'var(--adm-accent)' }}
              />
              Mis en avant
            </label>
          </div>

          <div className="adm-card p-4 sm:p-5">
            <Controller
              name="cover_image"
              control={control}
              render={({ field }) => (
                <ImageUploader
                  label="Image de couverture"
                  currentUrl={event?.cover_image ? `/storage/${event.cover_image}` : null}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <button type="submit" disabled={save.isPending} className="adm-btn adm-btn-primary justify-center">
              {save.isPending
                ? <><Loader2 size={14} className="animate-spin" /> …</>
                : (isEdit ? 'Enregistrer' : 'Créer l\'événement')}
            </button>
            <Link to="/admin/evenements" className="adm-btn adm-btn-ghost justify-center">Annuler</Link>
          </div>
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
      {error && <p className="text-xs mt-1" style={{ color: 'var(--adm-danger)' }}>{error}</p>}
    </div>
  )
}
