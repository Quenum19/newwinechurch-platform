/** Formulaire de témoignage — texte + photo + vidéo (uploadée OU URL externe). */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Loader2, Upload, X, Film, ExternalLink } from 'lucide-react'

import ImageUploader from '@/components/admin/ImageUploader.jsx'
import BackButton from '@/components/admin/BackButton.jsx'
import { testimonials } from '@/api/admin'

export default function TestimonialForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [videoFile, setVideoFile] = useState(null)

  const { data: t, isLoading } = useQuery({
    queryKey: ['admin', 'testimonials', id],
    queryFn: () => testimonials.get(id),
    enabled: isEdit,
  })

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    values: t ? {
      name: t.name ?? '',
      age: t.age ?? '',
      role: t.role ?? '',
      location: t.location ?? '',
      quote: t.quote ?? '',
      video_url: t.video_url ?? '',
      is_published: t.is_published ?? false,
      is_featured: t.is_featured ?? false,
      sort_order: t.sort_order ?? 100,
    } : {
      is_published: true,
      is_featured: false,
      sort_order: 100,
    },
  })

  const save = useMutation({
    mutationFn: (fd) => isEdit ? testimonials.update(id, fd) : testimonials.create(fd),
    onSuccess: (data) => {
      toast.success(isEdit ? 'Témoignage mis à jour.' : 'Témoignage créé.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'testimonials'] })
      if (!isEdit && data?.id) navigate(`/admin/temoignages/${data.id}`)
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
      if (k === 'image_file') return
      if (v === null || v === undefined || v === '') return
      if (typeof v === 'boolean') fd.append(k, v ? '1' : '0')
      else fd.append(k, v)
    })
    if (data.image_file instanceof File) fd.append('image_file', data.image_file)
    if (videoFile instanceof File) fd.append('video_file', videoFile)
    save.mutate(fd)
  }

  if (isEdit && isLoading) return <div className="adm-card h-96 animate-pulse" />

  return (
    <div className="space-y-5 sm:space-y-6 max-w-4xl">
      <BackButton to="/admin/temoignages" label="Retour aux témoignages" />

      <header>
        <h1>{isEdit ? (t?.name || 'Modifier le témoignage') : 'Nouveau témoignage'}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
          Une vie transformée à partager. Texte obligatoire, photo + vidéo optionnels.
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Colonne principale : infos + citation */}
          <div className="lg:col-span-2 space-y-4">
            <div className="adm-card p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Prénom" required error={errors.name && 'Requis'}>
                  <input {...register('name', { required: true })} className="adm-input" placeholder="ex: Marianne" maxLength={100} />
                </Field>
                <Field label="Âge">
                  <input type="number" {...register('age')} className="adm-input" placeholder="ex: 24" min="1" max="120" />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Rôle / Contexte" helper='ex: "Cellule Cocody", "Membre depuis 2 ans"'>
                  <input {...register('role')} className="adm-input" maxLength={150} />
                </Field>
                <Field label="Ville">
                  <input {...register('location')} className="adm-input" placeholder="ex: Abidjan" maxLength={100} />
                </Field>
              </div>
              <Field label="Témoignage" required error={errors.quote && 'Requis'} helper="Court et puissant. 2-4 phrases idéalement.">
                <textarea
                  rows={5}
                  {...register('quote', { required: true })}
                  className="adm-textarea"
                  maxLength={2000}
                  placeholder="J'étais perdu, NWC m'a donné une famille…"
                />
              </Field>
            </div>

            {/* Vidéo : uploadée OU URL externe */}
            <div className="adm-card p-4 sm:p-6 space-y-4">
              <h2 className="text-base font-semibold">Vidéo (optionnel)</h2>
              <p className="text-xs" style={{ color: 'var(--adm-text-muted)' }}>
                Tu peux soit <strong>uploader une vidéo</strong> chez nous, soit donner une <strong>URL YouTube / Vimeo</strong>.
                L'upload local est prioritaire si les deux sont remplis.
              </p>

              <div className="flex items-center gap-3 p-3 rounded border" style={{ borderColor: 'var(--adm-border)' }}>
                <Film size={18} style={{ color: 'var(--adm-text-muted)' }} />
                <label className="flex-1 cursor-pointer">
                  <span className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>
                    {videoFile ? videoFile.name : (t?.video_path ? 'Vidéo actuelle conservée' : 'Choisir un fichier vidéo')}
                  </span>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--adm-text-faint)' }}>
                    MP4, WebM, MOV — max 200 Mo
                  </p>
                </label>
                {videoFile && (
                  <button
                    type="button"
                    onClick={() => setVideoFile(null)}
                    className="p-1 rounded hover:bg-zinc-100"
                    style={{ color: 'var(--adm-text-muted)' }}
                  >
                    <X size={14} />
                  </button>
                )}
                {!videoFile && t?.video_path && (
                  <a href={t.video_path} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: 'var(--adm-accent)' }}>
                    Voir
                  </a>
                )}
              </div>

              <Field label="ou URL externe (YouTube, Vimeo…)" helper="Ignoré si tu uploades un fichier ci-dessus.">
                <div className="relative">
                  <ExternalLink size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--adm-text-faint)' }} />
                  <input
                    type="url"
                    {...register('video_url')}
                    className="adm-input pl-9"
                    placeholder="https://www.youtube.com/watch?v=..."
                    maxLength={500}
                  />
                </div>
              </Field>
            </div>
          </div>

          {/* Sidebar : visibilité + photo */}
          <div className="space-y-4">
            <div className="adm-card p-4 sm:p-5 space-y-3">
              <h2 className="text-base font-semibold">Visibilité</h2>
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--adm-text)' }}>
                <input type="checkbox" {...register('is_published')} className="adm-checkbox" />
                Publié sur le site
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--adm-text)' }}>
                <input type="checkbox" {...register('is_featured')} className="adm-checkbox" />
                Mis en avant (carrousel home)
              </label>
              <Field label="Ordre d'affichage" helper="Plus petit = affiché en premier">
                <input type="number" {...register('sort_order')} className="adm-input" min="0" max="9999" />
              </Field>
            </div>

            <div className="adm-card p-4 sm:p-5">
              <Controller
                name="image_file"
                control={control}
                render={({ field }) => (
                  <ImageUploader
                    label="Photo de la personne"
                    currentUrl={t?.image_path || null}
                    onChange={field.onChange}
                    onFileChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-2">
              <button type="submit" disabled={save.isPending} className="adm-btn adm-btn-primary justify-center">
                {save.isPending
                  ? <><Loader2 size={14} className="animate-spin" /> …</>
                  : (isEdit ? 'Enregistrer' : 'Créer le témoignage')}
              </button>
              <BackButton to="/admin/temoignages" label="Annuler" />
            </div>
          </div>
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
      {error && <p className="text-xs mt-1" style={{ color: 'var(--adm-danger)' }}>{error}</p>}
      {helper && <p className="text-[11px] mt-1" style={{ color: 'var(--adm-text-faint)' }}>{helper}</p>}
    </div>
  )
}
