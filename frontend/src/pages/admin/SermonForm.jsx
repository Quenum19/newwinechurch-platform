/** Formulaire sermon — Refonte 2026 admin-v2 native. */
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ArrowLeft, Headphones, Film, Upload, X, Loader2 } from 'lucide-react'
import { useState } from 'react'

import ImageUploader from '@/components/admin/ImageUploader.jsx'
import { sermons } from '@/api/admin'

export default function SermonForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: sermon, isLoading } = useQuery({
    queryKey: ['admin', 'sermons', id],
    queryFn: () => sermons.get(id),
    enabled: isEdit,
  })

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    values: sermon ? {
      title: sermon.title ?? '',
      description: sermon.description ?? '',
      scripture_reference: sermon.scripture_reference ?? '',
      sermon_date: sermon.sermon_date ?? new Date().toISOString().slice(0, 10),
      type: sermon.type ?? 'video',
      video_url: sermon.video_url ?? '',
      audio_url: sermon.audio_url ?? '',
      youtube_url: sermon.youtube_url ?? '',
      duration_seconds: sermon.duration_seconds ?? '',
      is_featured: sermon.is_featured ?? false,
      is_published: sermon.is_published ?? false,
    } : {
      type: 'video',
      sermon_date: new Date().toISOString().slice(0, 10),
      is_published: false,
    },
  })

  const save = useMutation({
    mutationFn: (formData) => isEdit ? sermons.update(id, formData) : sermons.create(formData),
    onSuccess: (data) => {
      toast.success(isEdit ? 'Sermon mis à jour.' : 'Sermon créé.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'sermons'] })
      if (!isEdit && data?.id) navigate(`/admin/sermons/${data.id}`)
    },
    onError: (err) => {
      const errs = err?.response?.data?.errors
      const first = errs ? Object.values(errs).flat()[0] : err?.response?.data?.message
      toast.error(first || 'Erreur de sauvegarde.')
    },
  })

  const [audioFile, setAudioFile] = useState(null)
  const [videoFile, setVideoFile] = useState(null)

  const onSubmit = (data) => {
    const fd = new FormData()
    Object.entries(data).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '') return
      if (k === 'thumbnail') return
      if (typeof v === 'boolean') fd.append(k, v ? '1' : '0')
      else fd.append(k, v)
    })
    if (data.thumbnail instanceof File) fd.append('thumbnail', data.thumbnail)
    if (audioFile instanceof File) fd.append('audio_file', audioFile)
    if (videoFile instanceof File) fd.append('video_file', videoFile)
    save.mutate(fd)
  }

  if (isEdit && isLoading) {
    return <div className="adm-card h-96 animate-pulse" />
  }

  return (
    <div className="space-y-5 sm:space-y-6 max-w-5xl">
      <Link
        to="/admin/sermons"
        className="inline-flex items-center gap-1 text-sm transition hover:underline"
        style={{ color: 'var(--adm-text-muted)' }}
      >
        <ArrowLeft size={14} /> Retour à la liste
      </Link>

      <header>
        <h1>{isEdit ? (sermon?.title || 'Modifier le sermon') : 'Nouveau sermon'}</h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Colonne gauche : infos */}
          <div className="lg:col-span-2 space-y-4">
            <div className="adm-card p-4 sm:p-6 space-y-4">
              <Field label="Titre" required error={errors.title && 'Requis'}>
                <input {...register('title', { required: true })} className="adm-input" />
              </Field>
              <Field label="Description">
                <textarea
                  rows={5}
                  {...register('description')}
                  placeholder="Résumé du message…"
                  className="adm-textarea"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Field label="Référence biblique">
                  <input {...register('scripture_reference')} placeholder="ex: Jean 3:16" className="adm-input" />
                </Field>
                <Field label="Date du sermon" required>
                  <input type="date" {...register('sermon_date', { required: true })} className="adm-input" />
                </Field>
              </div>
            </div>

            <div className="adm-card p-4 sm:p-6 space-y-4">
              <h2>Médias</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Field label="Type">
                  <select {...register('type')} className="adm-select">
                    <option value="video">Vidéo</option>
                    <option value="audio">Audio</option>
                    <option value="live_replay">Replay live</option>
                  </select>
                </Field>
                <Field label="Durée (secondes)">
                  <input type="number" {...register('duration_seconds')} className="adm-input" />
                </Field>
              </div>
              <Field label="URL vidéo (S3, Vimeo…)">
                <input type="url" {...register('video_url')} className="adm-input" />
              </Field>
              <Field label="URL audio (MP3)">
                <input type="url" {...register('audio_url')} className="adm-input" />
              </Field>
              <Field label="URL YouTube">
                <input type="url" {...register('youtube_url')} className="adm-input" />
              </Field>

              <div className="pt-4 border-t" style={{ borderColor: 'var(--adm-border)' }}>
                <p
                  className="text-[11px] uppercase tracking-wider font-medium mb-3"
                  style={{ color: 'var(--adm-text-faint)' }}
                >
                  Ou upload direct depuis l'ordinateur
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FilePickerCard
                    icon={Headphones}
                    label="Audio (MP3, WAV, M4A…)"
                    accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.opus"
                    value={audioFile}
                    onChange={setAudioFile}
                    maxSizeMo={200}
                    currentUrl={sermon?.audio_url}
                    helper="Max 200 Mo. Écrase l'URL audio si renseigné."
                  />
                  <FilePickerCard
                    icon={Film}
                    label="Vidéo (MP4, MOV, WebM)"
                    accept="video/*,.mp4,.mov,.webm,.m4v"
                    value={videoFile}
                    onChange={setVideoFile}
                    maxSizeMo={500}
                    currentUrl={sermon?.video_url}
                    helper="Max 500 Mo. Écrase l'URL vidéo si renseigné."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite : visibilité + thumbnail */}
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
                Publier (visible publiquement)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--adm-text)' }}>
                <input
                  type="checkbox"
                  {...register('is_featured')}
                  className="h-4 w-4 rounded border-zinc-300"
                  style={{ accentColor: 'var(--adm-accent)' }}
                />
                Mettre en avant
              </label>
            </div>

            <div className="adm-card p-4 sm:p-5">
              <Controller
                name="thumbnail"
                control={control}
                render={({ field }) => (
                  <ImageUploader
                    label="Vignette"
                    currentUrl={sermon?.thumbnail ? `/storage/${sermon.thumbnail}` : null}
                    onChange={field.onChange}
                    helper="JPG, PNG, WebP, HEIC. Max 30 Mo — optimisé automatiquement."
                  />
                )}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--adm-border)' }}>
          <button type="submit" disabled={save.isPending} className="adm-btn adm-btn-primary">
            {save.isPending
              ? <><Loader2 size={14} className="animate-spin" /> …</>
              : (isEdit ? 'Enregistrer' : 'Créer le sermon')}
          </button>
          <Link to="/admin/sermons" className="adm-btn adm-btn-ghost">Annuler</Link>
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

function FilePickerCard({ icon: Icon, label, accept, value, onChange, currentUrl, helper, maxSizeMo = 200 }) {
  const inputId = `file-${label.replace(/\s+/g, '-').toLowerCase()}`
  const hasExisting = !value && currentUrl
  const handleSelect = (file) => {
    if (!file) { onChange(null); return }
    if (file.size > maxSizeMo * 1024 * 1024) {
      alert(`Fichier trop lourd : ${(file.size / (1024 * 1024)).toFixed(1)} Mo. Max ${maxSizeMo} Mo.`)
      return
    }
    onChange(file)
  }
  return (
    <div
      className="rounded-lg p-3 space-y-2"
      style={{ background: 'var(--adm-card-hover)', border: '1px solid var(--adm-border)' }}
    >
      <label
        htmlFor={inputId}
        className="block text-xs font-medium"
        style={{ color: 'var(--adm-text)' }}
      >
        <Icon size={14} className="inline mr-1" style={{ color: 'var(--adm-accent)' }} /> {label}
      </label>
      <input
        id={inputId}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleSelect(e.target.files?.[0] ?? null)}
      />
      {value ? (
        <div
          className="flex items-center gap-2 text-xs px-2 py-2 rounded"
          style={{ background: '#fff', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
        >
          <span className="truncate flex-1">{value.name}</span>
          <span className="shrink-0 tabular-nums" style={{ color: 'var(--adm-text-faint)' }}>
            {(value.size / (1024 * 1024)).toFixed(1)} Mo
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 hover:text-red-600 transition"
            style={{ color: 'var(--adm-text-muted)' }}
            aria-label="Retirer le fichier"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="flex items-center justify-center gap-2 px-3 py-3 border border-dashed rounded text-xs cursor-pointer transition"
          style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-muted)' }}
        >
          <Upload size={14} /> Choisir un fichier
        </label>
      )}
      {hasExisting && (
        <p className="text-[10px] truncate" title={currentUrl} style={{ color: 'var(--adm-text-faint)' }}>
          Actuel : {currentUrl}
        </p>
      )}
      {helper && <p className="text-[10px]" style={{ color: 'var(--adm-text-faint)' }}>{helper}</p>}
    </div>
  )
}
