/** Formulaire création/édition d'une série de sermons. */
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

import ImageUploader from '@/components/admin/ImageUploader.jsx'
import BackButton from '@/components/admin/BackButton.jsx'
import { sermonSeries } from '@/api/admin'

export default function SermonSeriesForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: series, isLoading } = useQuery({
    queryKey: ['admin', 'sermon-series', id],
    queryFn: async () => {
      const list = await sermonSeries.list({ per_page: 100 })
      return (list?.data ?? []).find((s) => String(s.id) === String(id)) ?? null
    },
    enabled: isEdit,
  })

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    values: series ? {
      title: series.title ?? '',
      description: series.description ?? '',
      started_at: series.started_at ?? '',
      ended_at: series.ended_at ?? '',
      is_active: series.is_active ?? true,
    } : {
      is_active: true,
    },
  })

  const save = useMutation({
    mutationFn: (formData) => isEdit ? sermonSeries.update(id, formData) : sermonSeries.create(formData),
    onSuccess: (data) => {
      toast.success(isEdit ? 'Série mise à jour.' : 'Série créée.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'sermon-series'] })
      // Invalide aussi la liste des séries chargée dans SermonForm
      queryClient.invalidateQueries({ queryKey: ['admin', 'sermon-series-options'] })
      if (!isEdit && data?.id) navigate(`/admin/sermons/series/${data.id}`)
      else if (isEdit) navigate(`/admin/sermons/series/${id}`)
      else navigate('/admin/sermons/series')
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
      if (k === 'cover_image') return
      if (v === null || v === undefined || v === '') return
      if (typeof v === 'boolean') fd.append(k, v ? '1' : '0')
      else fd.append(k, v)
    })
    if (data.cover_image instanceof File) fd.append('cover_image', data.cover_image)
    save.mutate(fd)
  }

  if (isEdit && isLoading) return <div className="adm-card h-64 animate-pulse" />

  return (
    <div className="space-y-5 sm:space-y-6 max-w-3xl">
      <BackButton to="/admin/sermons/series" label="Retour aux séries" />

      <header>
        <h1>{isEdit ? (series?.title || 'Modifier la série') : 'Nouvelle série'}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
          Une série regroupe plusieurs sermons d'un même fil thématique.
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        <div className="adm-card p-4 sm:p-6 space-y-4">
          <Field label="Titre" required error={errors.title && 'Requis'}>
            <input
              {...register('title', { required: true })}
              className="adm-input"
              placeholder='ex: "Identité en Christ — vol. 1"'
            />
          </Field>

          <Field label="Description" helper="Présente brièvement le fil narratif de cette série.">
            <textarea
              {...register('description')}
              className="adm-input"
              rows={4}
              placeholder="ex: 8 messages prêchés entre septembre et décembre 2026 sur qui nous sommes en Christ."
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field label="Date de début" helper="Premier message de la série.">
              <input type="date" {...register('started_at')} className="adm-input" />
            </Field>
            <Field label="Date de fin" helper="Laisse vide si la série est en cours.">
              <input type="date" {...register('ended_at')} className="adm-input" />
            </Field>
          </div>

          <Field label="Image de couverture" helper="Cover affichée sur la page série (1600×900 recommandé).">
            <Controller
              name="cover_image"
              control={control}
              render={({ field }) => (
                <ImageUploader
                  onFileChange={(file) => field.onChange(file)}
                  currentUrl={series?.cover_image || null}
                  acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                  maxSizeMB={10}
                />
              )}
            />
          </Field>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('is_active')} className="adm-checkbox" />
            <span className="text-sm" style={{ color: 'var(--adm-text)' }}>Série active (visible publiquement)</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/admin/sermons/series" className="adm-btn">Annuler</Link>
          <button type="submit" disabled={save.isPending} className="adm-btn adm-btn-primary">
            {save.isPending ? <><Loader2 size={14} className="animate-spin" /> Enregistrement…</> : (isEdit ? 'Enregistrer' : 'Créer la série')}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, required, error, helper, children }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--adm-text-muted)' }}>
          {label}{required && <span className="text-red-500">*</span>}
        </span>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
      {children}
      {helper && <p className="text-[11px] mt-1" style={{ color: 'var(--adm-text-faint)' }}>{helper}</p>}
    </label>
  )
}
