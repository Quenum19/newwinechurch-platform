/** Formulaire sermon — Refonte 2026 admin-v2 native. */
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Headphones, Film, Upload, X, Loader2, Search, Mic, Plus, Tag, Check } from 'lucide-react'
import { useEffect, useState } from 'react'

import ImageUploader from '@/components/admin/ImageUploader.jsx'
import BackButton from '@/components/admin/BackButton.jsx'
import BilingualField from '@/components/admin/BilingualField.jsx'
import Modal from '@/components/ui/Modal.jsx'
import { sermons, members, sermonThemes } from '@/api/admin'

export default function SermonForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  // Pré-sélection série depuis ?series_id= (bouton "Ajouter un sermon" sur SeriesDetail).
  const prefillSeriesId = searchParams.get('series_id') || ''

  const { data: sermon, isLoading } = useQuery({
    queryKey: ['admin', 'sermons', id],
    queryFn: () => sermons.get(id),
    enabled: isEdit,
  })

  const { register, handleSubmit, control, formState: { errors }, setValue, watch } = useForm({
    values: sermon ? {
      title: sermon.title ?? '',
      title_en: sermon.title_en ?? '',
      description: sermon.description ?? '',
      description_en: sermon.description_en ?? '',
      scripture_reference: sermon.scripture_reference ?? '',
      sermon_date: sermon.sermon_date ?? new Date().toISOString().slice(0, 10),
      type: sermon.type ?? 'video',
      // Prédicateur : interne (speaker_id) OU externe (texte libre), exclusifs.
      speaker_id: sermon.speaker?.is_guest ? '' : (sermon.speaker?.id ?? ''),
      external_speaker_name: sermon.external_speaker_name ?? '',
      series_id: sermon.series?.id ?? '',
      video_url: sermon.video_url ?? '',
      audio_url: sermon.audio_url ?? '',
      youtube_url: sermon.youtube_url ?? '',
      duration_seconds: sermon.duration_seconds ?? '',
      is_featured: sermon.is_featured ?? false,
      is_published: sermon.is_published ?? false,
      theme_ids: (sermon.themes ?? []).map((t) => t.id),
    } : {
      type: 'video',
      sermon_date: new Date().toISOString().slice(0, 10),
      is_published: false,
      theme_ids: [],
      series_id: prefillSeriesId,
    },
  })

  // Liste des séries pour le dropdown (chargée 1 fois, cache 5 min).
  const { data: seriesList = [] } = useQuery({
    queryKey: ['admin', 'sermon-series-options'],
    queryFn: () => sermons.series(),
    staleTime: 5 * 60 * 1000,
  })

  // Catalogue des thèmes (pour le multi-select).
  const { data: themesList = [] } = useQuery({
    queryKey: ['admin', 'sermon-themes'],
    queryFn: () => sermons.themes(),
    staleTime: 60 * 1000,
  })

  const save = useMutation({
    mutationFn: (formData) => isEdit ? sermons.update(id, formData) : sermons.create(formData),
    onSuccess: (data) => {
      toast.success(isEdit ? 'Sermon mis à jour.' : 'Sermon créé.')
      // Invalide la liste + le détail (pour que la nouvelle thumbnail + état
      // is_published soient relus depuis l'API au prochain mount).
      queryClient.invalidateQueries({ queryKey: ['admin', 'sermons'] })
      if (isEdit) queryClient.invalidateQueries({ queryKey: ['admin', 'sermons', id] })
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
    // Champs qu'on doit pouvoir EFFACER (envoyer vide → null en base) sinon
    // un switch entre prédicateur interne et externe laisserait l'ancien
    // pendre. Laravel les recevra comme '', `nullable` les normalise en null.
    const allowEmpty = new Set(['speaker_id', 'external_speaker_name', 'series_id'])
    Object.entries(data).forEach(([k, v]) => {
      if (k === 'thumbnail') return
      if (k === 'theme_ids') return // traité séparément
      const isEmpty = v === null || v === undefined || v === ''
      if (isEmpty && !allowEmpty.has(k)) return
      if (typeof v === 'boolean') fd.append(k, v ? '1' : '0')
      else fd.append(k, v ?? '')
    })
    // Thèmes : sérialisés en JSON. Le backend parse via normalizeThemeIds.
    // Toujours envoyer (même tableau vide) pour permettre de retirer tous les thèmes.
    fd.append('themes', JSON.stringify(data.theme_ids ?? []))

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
      <BackButton to="/admin/sermons" label="Retour à la liste" />

      <header>
        <h1>{isEdit ? (sermon?.title || 'Modifier le sermon') : 'Nouveau sermon'}</h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Colonne gauche : infos */}
          <div className="lg:col-span-2 space-y-4">
            <div className="adm-card p-4 sm:p-6 space-y-4">
              <Controller
                control={control}
                name="title"
                rules={{ required: true }}
                render={({ field: fr }) => (
                  <Controller
                    control={control}
                    name="title_en"
                    render={({ field: en }) => (
                      <BilingualField
                        label="Titre" required
                        valueFr={fr.value} onChangeFr={fr.onChange}
                        valueEn={en.value} onChangeEn={en.onChange}
                        errorFr={errors.title && 'Requis'}
                      />
                    )}
                  />
                )}
              />
              <Controller
                control={control}
                name="description"
                render={({ field: fr }) => (
                  <Controller
                    control={control}
                    name="description_en"
                    render={({ field: en }) => (
                      <BilingualField
                        label="Description" type="textarea" rows={5}
                        valueFr={fr.value} onChangeFr={fr.onChange}
                        valueEn={en.value} onChangeEn={en.onChange}
                        placeholder="Résumé du message…"
                        placeholderEn="Message summary…"
                      />
                    )}
                  />
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Field label="Référence biblique">
                  <input {...register('scripture_reference')} placeholder="ex: Jean 3:16" className="adm-input" />
                </Field>
                <Field label="Date du sermon" required>
                  <input type="date" {...register('sermon_date', { required: true })} className="adm-input" />
                </Field>
              </div>

              {/* Champ caché pour external_speaker_name — piloté par SpeakerSelect. */}
              <input type="hidden" {...register('external_speaker_name')} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Field label="Prédicateur" helper="Cherche un membre, ou tape un nom libre pour un invité">
                  <SpeakerSelect
                    speakerId={watch('speaker_id')}
                    externalName={watch('external_speaker_name')}
                    initialSpeaker={sermon?.speaker}
                    onPickMember={(user) => {
                      setValue('speaker_id', user.id, { shouldDirty: true })
                      setValue('external_speaker_name', '', { shouldDirty: true })
                    }}
                    onPickGuest={(name) => {
                      setValue('speaker_id', '', { shouldDirty: true })
                      setValue('external_speaker_name', name, { shouldDirty: true })
                    }}
                    onClear={() => {
                      setValue('speaker_id', '', { shouldDirty: true })
                      setValue('external_speaker_name', '', { shouldDirty: true })
                    }}
                  />
                </Field>
                <Field label="Série (optionnel)" helper={<>Regroupe ce message dans une collection. <Link to="/admin/sermons/series/nouveau" className="underline" style={{ color: 'var(--adm-accent)' }}>Créer une série</Link></>}>
                  <select {...register('series_id')} className="adm-select">
                    <option value="">— Aucune série —</option>
                    {seriesList.map((s) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Thèmes — multi-select avec création inline. Clé de l'archivage long terme. */}
              <Field
                label="Thèmes / tags"
                helper="Ajoute autant de thèmes que pertinent. Pour retrouver ce message facilement dans 20 ans."
              >
                <Controller
                  name="theme_ids"
                  control={control}
                  render={({ field }) => (
                    <ThemePicker
                      selectedIds={field.value || []}
                      onChange={field.onChange}
                      themes={themesList}
                    />
                  )}
                />
              </Field>
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
                    // Le backend renvoie déjà une URL absolue (https://api.../storage/...).
                    // L'ancien code rajoutait /storage/ → double-préfixe → URL cassée.
                    currentUrl={sermon?.thumbnail || null}
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

/**
 * Sélecteur de prédicateur dual.
 *
 * Deux modes mutuellement exclusifs :
 *   - INTERNE : un membre (avec compte) sélectionné via autocomplete → speaker_id
 *   - EXTERNE : saisie libre d'un nom (invité sans compte) → external_speaker_name
 *
 * UX : pendant la recherche, on propose toujours en bas du dropdown
 * "Utiliser '...' comme prédicateur invité" pour basculer en saisie libre
 * sans étape supplémentaire.
 */
function SpeakerSelect({ speakerId, externalName, initialSpeaker, onPickMember, onPickGuest, onClear }) {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: results, isFetching } = useQuery({
    queryKey: ['admin', 'members', 'search', debounced],
    queryFn: () => members.list({ search: debounced, per_page: 8 }),
    enabled: debounced.trim().length >= 2,
    staleTime: 30 * 1000,
  })

  const isMemberPicked = !!speakerId && initialSpeaker && Number(initialSpeaker.id) === Number(speakerId)
  const isGuestPicked  = !speakerId && !!externalName

  // Vue compacte : un membre sélectionné
  if (isMemberPicked && !open) {
    const u = initialSpeaker
    const displayName = u.name || u.full_name || [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email
    return (
      <div className="flex items-center justify-between gap-2 adm-input cursor-pointer" onClick={() => { setOpen(true); setSearch('') }}>
        <div className="flex items-center gap-2 min-w-0">
          {u.avatar ? (
            <img src={u.avatar} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
          ) : (
            <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] text-white shrink-0" style={{ background: 'var(--adm-accent)' }}>
              <Mic size={12} />
            </div>
          )}
          <span className="text-sm truncate" style={{ color: 'var(--adm-text)' }}>{displayName}</span>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClear() }}
          className="p-1 rounded hover:bg-zinc-100 shrink-0"
          style={{ color: 'var(--adm-text-faint)' }}
          title="Retirer"
        >
          <X size={12} />
        </button>
      </div>
    )
  }

  // Vue compacte : un invité (texte libre) sélectionné
  if (isGuestPicked && !open) {
    return (
      <div className="flex items-center justify-between gap-2 adm-input cursor-pointer" onClick={() => { setOpen(true); setSearch(externalName) }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] text-white shrink-0" style={{ background: 'var(--adm-accent-muted, #9b6b3a)' }}>
            <Mic size={12} />
          </div>
          <span className="text-sm truncate" style={{ color: 'var(--adm-text)' }}>{externalName}</span>
          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0" style={{ background: 'var(--adm-card-hover)', color: 'var(--adm-text-muted)' }}>
            Invité
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClear() }}
          className="p-1 rounded hover:bg-zinc-100 shrink-0"
          style={{ color: 'var(--adm-text-faint)' }}
          title="Retirer"
        >
          <X size={12} />
        </button>
      </div>
    )
  }

  // Mode recherche/saisie
  const trimmed = search.trim()
  const list = results?.data ?? []
  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--adm-text-faint)' }} />
        <input
          type="text"
          placeholder="Tape un nom (membre ou invité)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          className="adm-input w-full pl-9"
        />
      </div>
      {open && trimmed.length >= 1 && (
        <div className="absolute z-10 mt-1 w-full max-h-72 overflow-y-auto rounded-md border shadow-md" style={{ background: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
          {trimmed.length >= 2 ? (
            isFetching ? (
              <p className="text-center py-3 text-xs" style={{ color: 'var(--adm-text-muted)' }}>Recherche…</p>
            ) : list.length === 0 ? (
              <p className="text-center py-3 text-xs italic" style={{ color: 'var(--adm-text-muted)' }}>
                Aucun membre trouvé.
              </p>
            ) : (
              list.map((u) => {
                const displayName = u.name || u.full_name || [u.first_name, u.last_name].filter(Boolean).join(' ')
                return (
                  <button
                    key={u.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { onPickMember(u); setSearch(''); setOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-50 transition"
                  >
                    {u.avatar ? (
                      <img src={u.avatar} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] text-white shrink-0" style={{ background: 'var(--adm-accent)' }}>
                        {(u.first_name?.[0] || u.name?.[0] || '?').toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm truncate" style={{ color: 'var(--adm-text)' }}>{displayName}</p>
                      {u.email && <p className="text-[11px] truncate" style={{ color: 'var(--adm-text-faint)' }}>{u.email}</p>}
                    </div>
                  </button>
                )
              })
            )
          ) : (
            <p className="text-center py-2 text-[11px] italic" style={{ color: 'var(--adm-text-faint)' }}>
              Tape au moins 2 lettres pour chercher un membre.
            </p>
          )}

          {/* Toujours proposer la saisie libre — pour les invités externes. */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onPickGuest(trimmed); setSearch(''); setOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left border-t transition hover:bg-zinc-50"
            style={{ borderColor: 'var(--adm-border)' }}
          >
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: 'var(--adm-accent-muted, #9b6b3a)' }}>
              <Plus size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-sm truncate" style={{ color: 'var(--adm-text)' }}>
                Utiliser <strong>« {trimmed} »</strong> comme prédicateur invité
              </p>
              <p className="text-[11px]" style={{ color: 'var(--adm-text-faint)' }}>
                Texte libre — pas de compte associé.
              </p>
            </div>
          </button>
        </div>
      )}
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

/**
 * ThemePicker — multi-select avec recherche + création inline.
 *
 * Affiche les thèmes sélectionnés en chips colorées (couleur du thème),
 * un input pour filtrer la liste, et un bouton "+ Créer un thème" qui ouvre
 * une modale légère (pas besoin d'aller dans la page Thèmes pour ajouter).
 */
function ThemePicker({ selectedIds, onChange, themes }) {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#C9A961')

  const selected = themes.filter((t) => selectedIds.includes(t.id))
  const available = themes.filter((t) =>
    !selectedIds.includes(t.id) &&
    (!filter.trim() || t.name.toLowerCase().includes(filter.trim().toLowerCase())),
  )

  const add    = (id) => onChange([...selectedIds, id])
  const remove = (id) => onChange(selectedIds.filter((x) => x !== id))

  const createTheme = useMutation({
    mutationFn: (payload) => sermonThemes.create(payload),
    onSuccess: (theme) => {
      toast.success(`Thème "${theme.name}" créé.`)
      queryClient.invalidateQueries({ queryKey: ['admin', 'sermon-themes'] })
      onChange([...selectedIds, theme.id])
      setShowCreate(false)
      setNewName(''); setNewColor('#C9A961'); setFilter('')
    },
    onError: (err) => {
      const errs = err?.response?.data?.errors
      const first = errs ? Object.values(errs).flat()[0] : err?.response?.data?.message
      toast.error(first || 'Erreur création thème.')
    },
  })

  return (
    <div className="space-y-2">
      {/* Chips sélectionnées */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((t) => {
            const color = t.color || '#6B5F4E'
            return (
              <span
                key={t.id}
                className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full border text-xs"
                style={{ borderColor: color + '55', background: color + '15', color: 'var(--adm-text)' }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                {t.name}
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="p-0.5 rounded-full hover:bg-white/60"
                  style={{ color: 'var(--adm-text-muted)' }}
                  aria-label={`Retirer ${t.name}`}
                >
                  <X size={10} />
                </button>
              </span>
            )
          })}
        </div>
      )}

      {/* Input filtre + bouton créer */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Tag size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--adm-text-faint)' }} />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrer ou chercher un thème…"
            className="adm-input w-full pl-8 text-sm h-9"
          />
        </div>
        <button
          type="button"
          onClick={() => { setNewName(filter); setShowCreate(true) }}
          className="adm-btn text-xs h-9 whitespace-nowrap"
          title="Créer un nouveau thème"
        >
          <Plus size={12} /> Créer
        </button>
      </div>

      {/* Liste disponibles */}
      <div className="rounded-md border p-2 max-h-44 overflow-y-auto" style={{ borderColor: 'var(--adm-border)', background: 'var(--adm-card-hover)' }}>
        {available.length === 0 ? (
          <p className="text-center text-[11px] py-2 italic" style={{ color: 'var(--adm-text-faint)' }}>
            {filter.trim()
              ? `Aucun thème trouvé pour "${filter}". Clique "Créer" pour l'ajouter.`
              : 'Tous les thèmes sont déjà sélectionnés.'}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {available.map((t) => {
              const color = t.color || '#6B5F4E'
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => add(t.id)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs transition hover:scale-105"
                  style={{ borderColor: color + '44', background: color + '08', color: 'var(--adm-text)' }}
                  title={t.description || 'Ajouter'}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                  {t.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal création express */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nouveau thème"
        description="Sera ajouté au catalogue et appliqué à ce sermon."
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!newName.trim()) return toast.error('Donne un nom au thème.')
            createTheme.mutate({ name: newName.trim(), color: newColor })
          }}
          className="space-y-3"
        >
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--adm-text-muted)' }}>
              Nom *
            </span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="adm-input mt-1"
              maxLength={100}
              autoFocus
              placeholder='ex: "Conférence"'
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--adm-text-muted)' }}>
              Couleur
            </span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value.toUpperCase())}
                className="h-9 w-14 rounded border cursor-pointer"
              />
              <span className="text-xs tabular-nums" style={{ color: 'var(--adm-text-muted)' }}>{newColor}</span>
            </div>
          </label>
          <Modal.Footer>
            <button type="button" onClick={() => setShowCreate(false)} className="adm-btn">Annuler</button>
            <button type="submit" disabled={createTheme.isPending} className="adm-btn adm-btn-primary">
              <Check size={12} /> {createTheme.isPending ? 'Création…' : 'Créer et ajouter'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>
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
