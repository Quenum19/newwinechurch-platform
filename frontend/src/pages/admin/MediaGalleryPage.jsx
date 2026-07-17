/** Galerie médias avec drag-drop multi-upload — rattachement département OU événement. */
import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { Trash2, Upload, Eye, EyeOff, Image as ImageIcon, Video, Calendar, Building2, Check, CheckSquare, Square, X, ChevronLeft, ChevronRight, Download } from 'lucide-react'

import Spinner from '@/components/ui/Spinner.jsx'
import Modal from '@/components/ui/Modal.jsx'
import BulkActionBar from '@/components/admin/BulkActionBar.jsx'
import ResetFiltersButton from '@/components/admin/ResetFiltersButton.jsx'
import useMultiSelect from '@/hooks/useMultiSelect'
import { useAutoplayVideo, videoMimeFromPath } from '@/hooks/useAutoplayVideo'
import { media, departments, events } from '@/api/admin'

export default function MediaGalleryPage() {
  const queryClient = useQueryClient()
  const [filterType, setFilterType] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterEvent, setFilterEvent] = useState('')
  const [uploadDept, setUploadDept] = useState('')
  const [uploadEvent, setUploadEvent] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const sel = useMultiSelect()

  const { data: deptsRaw } = useQuery({
    queryKey: ['admin', 'departments', { per_page: 100 }],
    queryFn: () => departments.list({ per_page: 100 }),
    staleTime: 5 * 60_000,
  })
  const deptsList = deptsRaw?.data ?? []

  // Liste des événements (récents, à venir + passés) pour rattachement.
  const { data: eventsRaw } = useQuery({
    queryKey: ['admin', 'events', { per_page: 200 }],
    queryFn: () => events.list({ per_page: 200, sort: 'starts_at', direction: 'desc' }),
    staleTime: 2 * 60_000,
  })
  const eventsList = eventsRaw?.data ?? []

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'media', { file_type: filterType, department_id: filterDept, event_id: filterEvent }],
    queryFn: () => media.list({
      file_type: filterType || undefined,
      department_id: filterDept || undefined,
      event_id: filterEvent || undefined,
      per_page: 60,
    }),
  })

  const uploadMutation = useMutation({
    mutationFn: ({ files, departmentId, eventId }) =>
      media.upload(files, {
        departmentId: departmentId || undefined,
        eventId: eventId || undefined,
      }),
    onSuccess: (res) => {
      toast.success(res?.message || 'Médias ajoutés.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'media'] })
    },
    onError: () => toast.error('Erreur upload.'),
  })

  const remove = useMutation({
    mutationFn: (id) => media.delete(id),
    onSuccess: () => {
      toast.success('Média supprimé.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'media'] })
      setConfirmDelete(null)
    },
  })

  const togglePublish = useMutation({
    mutationFn: (id) => media.togglePublish(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'media'] }),
  })

  // Action groupée : invalide la liste + désélectionne tout après succès.
  const bulk = useMutation({
    mutationFn: ({ action, ids, payload }) => media.bulk(action, ids, payload),
    onSuccess: (res) => {
      toast.success(res?.message || 'Action effectuée.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'media'] })
      sel.clear()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Action impossible.'),
  })

  const onDrop = useCallback((acceptedFiles) => {
    if (! acceptedFiles?.length) return
    if (acceptedFiles.length > 20) {
      toast.error('Maximum 20 fichiers par upload.')
      return
    }
    uploadMutation.mutate({
      files: acceptedFiles,
      departmentId: uploadDept,
      eventId: uploadEvent,
    })
  }, [uploadMutation, uploadDept, uploadEvent])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png':  [],
      'image/webp': [],
      'image/gif':  [],
      'video/mp4':  [],
      'video/quicktime': [],
      'video/webm': [],
    },
    maxSize: 50 * 1024 * 1024,
  })

  const items = data?.data?.data ?? data?.data ?? []
  const activeEvent = eventsList.find((e) => String(e.id) === String(uploadEvent))
  const activeDept  = deptsList.find((d) => String(d.id) === String(uploadDept))
  const visibleIds = items.map((m) => m.id)
  const allVisibleSelected = sel.allSelected(visibleIds)

  return (
    <div className="space-y-6">
      <header>
        <p className="text-script text-2xl text-gold-400">Galerie</p>
        <h1 className="font-serif text-3xl text-white">Photos & vidéos</h1>
        <p className="text-white/60 mt-1 text-sm">
          Drag-and-drop pour uploader. Les images sont optimisées automatiquement (WebP).
          Tu peux rattacher un média à un <strong>département</strong> et/ou à un <strong>événement</strong> précis.
        </p>
      </header>

      {/* Sélecteurs au moment de l'upload */}
      <div className="card-nwc p-4 space-y-3">
        <p className="text-xs uppercase tracking-wider text-white/50">
          Rattachements (optionnels) — appliqués aux fichiers uploadés ci-dessous
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-white/40 inline-flex items-center gap-1">
              <Calendar size={11}/> Événement
            </span>
            <select
              value={uploadEvent}
              onChange={(e) => setUploadEvent(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-ink-950 border border-white/10 text-sm text-white"
            >
              <option value="">— Aucun événement —</option>
              {eventsList.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} {e.starts_at && `(${new Date(e.starts_at).toLocaleDateString('fr-FR')})`}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-white/40 inline-flex items-center gap-1">
              <Building2 size={11}/> Département
            </span>
            <select
              value={uploadDept}
              onChange={(e) => setUploadDept(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-ink-950 border border-white/10 text-sm text-white"
            >
              <option value="">— Aucun département (galerie générale) —</option>
              {deptsList.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>
        </div>
        {(activeEvent || activeDept) && (
          <p className="text-[11px] text-gold-300">
            Sera rattaché à :
            {activeEvent && <span className="ml-1">📅 {activeEvent.title}</span>}
            {activeEvent && activeDept && <span> ·</span>}
            {activeDept && <span className="ml-1">🏛 {activeDept.name}</span>}
          </p>
        )}
      </div>

      {/* Zone d'upload */}
      <div
        {...getRootProps()}
        className={`card-nwc border-2 border-dashed cursor-pointer transition p-10 text-center ${
          isDragActive ? 'border-gold-500 bg-gold-500/5' : 'border-white/10 hover:border-white/20'
        }`}
      >
        <input {...getInputProps()} />
        <Upload size={36} className="mx-auto text-gold-400 mb-3"/>
        <p className="text-white">
          {isDragActive ? 'Déposez les fichiers ici…' : 'Glissez-déposez des fichiers ou cliquez pour parcourir'}
        </p>
        <p className="text-xs text-white/40 mt-1">
          JPG, PNG, WebP, GIF, MP4. Max 50 Mo · 20 fichiers/upload.
        </p>
        {uploadMutation.isPending && <Spinner size={20} className="mx-auto mt-3"/>}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap items-center">
        <button
          onClick={() => setFilterType('')}
          className={`btn-ghost text-xs py-1.5 ${!filterType && 'bg-white/5 text-gold-300'}`}
        >Tous</button>
        <button
          onClick={() => setFilterType('image')}
          className={`btn-ghost text-xs py-1.5 ${filterType === 'image' && 'bg-white/5 text-gold-300'}`}
        ><ImageIcon size={12}/> Images</button>
        <button
          onClick={() => setFilterType('video')}
          className={`btn-ghost text-xs py-1.5 ${filterType === 'video' && 'bg-white/5 text-gold-300'}`}
        ><Video size={12}/> Vidéos</button>

        <select
          value={filterEvent}
          onChange={(e) => setFilterEvent(e.target.value)}
          className="ml-auto px-3 py-1.5 rounded-lg bg-ink-950 border border-white/10 text-xs text-white max-w-[220px]"
          title="Filtrer par événement"
        >
          <option value="">Tous événements</option>
          {eventsList.map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>

        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-ink-950 border border-white/10 text-xs text-white"
          title="Filtrer par département"
        >
          <option value="">Tous départements</option>
          {deptsList.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        {/* Tout sélectionner sur la page courante */}
        {items.length > 0 && (
          <button
            onClick={() => sel.toggleAll(visibleIds)}
            className="btn-ghost text-xs py-1.5 inline-flex items-center gap-1.5"
            title={allVisibleSelected ? 'Tout désélectionner' : 'Tout sélectionner sur cette page'}
          >
            {allVisibleSelected ? <CheckSquare size={13}/> : <Square size={13}/>}
            {allVisibleSelected ? 'Tout désélectionner' : `Tout sélectionner (${items.length})`}
          </button>
        )}

        <ResetFiltersButton
          filters={{ filterType, filterDept, filterEvent }}
          onReset={() => { setFilterType(''); setFilterDept(''); setFilterEvent('') }}
        />
      </div>

      {/* Grille */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size={32}/></div>
      ) : items.length === 0 ? (
        <div className="card-nwc p-10 text-center text-white/50">
          Aucun média pour le moment. Uploadez votre première photo ou vidéo ci-dessus.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {items.map((m) => {
            const isPicked = sel.isSelected(m.id)
            const hasSelection = sel.count > 0
            return (
              <div
                key={m.id}
                className={`card-nwc overflow-hidden group relative aspect-square transition ${
                  isPicked ? 'ring-2 ring-gold-400 ring-offset-2 ring-offset-ink-900' : ''
                }`}
              >
                {/* Zone cliquable principale :
                    - Si une sélection est déjà active, clic = toggle (mode sélection).
                    - Sinon clic = ouvre la lightbox sur cette image. */}
                <div
                  onClick={(e) => {
                    if (hasSelection) sel.toggle(m.id, e, visibleIds)
                    else setLightboxIndex(items.indexOf(m))
                  }}
                  className="cursor-pointer w-full h-full"
                >
                  {m.file_type === 'image' ? (
                    <img
                      src={m.file_path}
                      alt={m.title || ''}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <AutoplayVideoTile src={m.file_path} />
                  )}
                </div>

                {/* Checkbox sélection — visible si picked ou au hover */}
                <button
                  onClick={(e) => { e.stopPropagation(); sel.toggle(m.id, e, visibleIds) }}
                  className={`absolute top-2 left-2 h-6 w-6 rounded flex items-center justify-center transition z-10
                    ${isPicked
                      ? 'bg-gold-400 text-ink-900 opacity-100'
                      : 'bg-black/70 text-white opacity-0 group-hover:opacity-100 hover:bg-black/90'}`}
                  title={isPicked ? 'Désélectionner' : 'Sélectionner'}
                  aria-label={isPicked ? 'Désélectionner' : 'Sélectionner'}
                >
                  {isPicked ? <Check size={14} /> : <Square size={12} />}
                </button>

                {/* Overlay actions — masqué si mode sélection actif */}
                {!hasSelection && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-2 pointer-events-none">
                    {m.title && <p className="text-xs text-white truncate mb-1">{m.title}</p>}
                    {(m.event?.title || m.department?.name) && (
                      <p className="text-[10px] text-white/70 truncate mb-1">
                        {m.event?.title && <>📅 {m.event.title}</>}
                        {m.event?.title && m.department?.name && ' · '}
                        {m.department?.name && <>🏛 {m.department.name}</>}
                      </p>
                    )}
                    <div className="flex gap-1 justify-end pointer-events-auto">
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePublish.mutate(m.id) }}
                        className="p-1.5 rounded bg-black/60 hover:bg-white/10 text-white"
                        title={m.is_published ? 'Dépublier' : 'Publier'}
                      >
                        {m.is_published ? <Eye size={12}/> : <EyeOff size={12}/>}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(m) }}
                        className="p-1.5 rounded bg-black/60 hover:bg-accent/40 text-accent"
                        title="Supprimer"
                      >
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </div>
                )}

                {! m.is_published && (
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-xs text-white/70">
                    Caché
                  </div>
                )}
                {m.file_type === 'video' && !m.is_published === false && (
                  <div className="absolute top-2 right-2 p-1 bg-black/60 rounded">
                    <Video size={12} className="text-white"/>
                  </div>
                )}
                {m.event?.title && (
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-gold-500/80 rounded text-[10px] text-black truncate max-w-[80%]">
                    📅 {m.event.title}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <BulkActionBar
        count={sel.count}
        onClear={sel.clear}
        label="média"
        actions={[
          { key: 'publish',   label: 'Publier',   icon: Eye,    onClick: () => bulk.mutate({ action: 'publish',   ids: sel.ids }) },
          { key: 'unpublish', label: 'Dépublier', icon: EyeOff, onClick: () => bulk.mutate({ action: 'unpublish', ids: sel.ids }) },
          {
            key: 'delete', label: 'Supprimer', icon: Trash2, variant: 'danger', confirm: true,
            confirmTitle: 'Supprimer ces médias ?',
            confirmText: `Les fichiers (${sel.count}) seront définitivement supprimés du serveur. Action irréversible.`,
            confirmCta: 'Supprimer définitivement',
            onClick: () => bulk.mutate({ action: 'delete', ids: sel.ids }),
          },
        ]}
      />

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Supprimer ce média ?"
        description={confirmDelete?.title || 'Action définitive'}
        size="sm"
      >
        <p>Le fichier sera supprimé du serveur. Cette action est irréversible.</p>
        <Modal.Footer>
          <button onClick={() => setConfirmDelete(null)} className="adm-btn">Annuler</button>
          <button
            onClick={() => remove.mutate(confirmDelete.id)}
            disabled={remove.isPending}
            className="adm-btn adm-btn-danger"
          >
            {remove.isPending ? 'Suppression…' : 'Supprimer'}
          </button>
        </Modal.Footer>
      </Modal>

      {lightboxIndex !== null && items[lightboxIndex] && (
        <AdminLightbox
          items={items}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(d) => setLightboxIndex((lightboxIndex + d + items.length) % items.length)}
        />
      )}
    </div>
  )
}

/**
 * Petit composant vidéo qui auto-play en preview quand visible.
 * Wrap autour du hook useAutoplayVideo pour pouvoir l'appeler par item dans une map().
 */
function AutoplayVideoTile({ src }) {
  const videoRef = useAutoplayVideo({ threshold: 0.4 })
  return (
    <video
      ref={videoRef}
      className="w-full h-full object-cover"
      preload="auto"
      playsInline
      muted
      loop
    >
      <source src={src} type={videoMimeFromPath(src)} />
      {src?.endsWith('.mov') && <source src={src} type="video/mp4" />}
    </video>
  )
}

/**
 * Lightbox admin — affichage plein écran avec navigation clavier (← → Esc)
 * et swipe touch. Affiche image OU vidéo selon file_type.
 * Header avec titre + rattachements + bouton download.
 */
function AdminLightbox({ items, index, onClose, onNavigate }) {
  const item = items[index]

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onNavigate(-1)
      if (e.key === 'ArrowRight') onNavigate(1)
    }
    window.addEventListener('keydown', handler)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = prev
    }
  }, [onClose, onNavigate])

  const [touchStart, setTouchStart] = useState(null)
  const onTouchStart = (e) => setTouchStart(e.touches[0].clientX)
  const onTouchEnd = (e) => {
    if (touchStart === null) return
    const delta = e.changedTouches[0].clientX - touchStart
    if (Math.abs(delta) > 60) onNavigate(delta < 0 ? 1 : -1)
    setTouchStart(null)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Aperçu média"
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 text-white/90 border-b border-white/10" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">
            {item.title || (item.file_type === 'video' ? 'Vidéo' : 'Photo')}
          </p>
          <p className="text-[11px] text-white/60 truncate">
            <span className="tabular-nums">{index + 1} / {items.length}</span>
            {item.event?.title && <> · 📅 {item.event.title}</>}
            {item.department?.name && <> · 🏛 {item.department.name}</>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={item.file_path}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="p-2 rounded text-white/80 hover:text-white hover:bg-white/10 transition"
            title="Télécharger"
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={18}/>
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded text-white/80 hover:text-white hover:bg-white/10 transition"
            aria-label="Fermer (Esc)"
            title="Fermer (Esc)"
          >
            <X size={20}/>
          </button>
        </div>
      </div>

      {/* Media + navigation — encadré (pas plein écran) pour respiration. */}
      <div className="flex-1 flex items-center justify-center relative px-4 py-6 sm:px-12" onClick={(e) => e.stopPropagation()}>
        {items.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(-1) }}
            className="absolute left-2 sm:left-4 p-3 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition z-10"
            aria-label="Précédent (←)"
            title="Précédent (←)"
          >
            <ChevronLeft size={26}/>
          </button>
        )}

        <div className="max-w-[min(900px,85vw)] max-h-[70vh] w-auto h-auto flex items-center justify-center">
          {item.file_type === 'video' ? (
            <video
              key={item.id}
              src={item.file_path}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-[70vh] block rounded shadow-2xl"
            />
          ) : (
            <img
              src={item.file_path}
              alt={item.title || ''}
              className="max-w-full max-h-[70vh] object-contain block select-none rounded shadow-2xl"
            />
          )}
        </div>

        {items.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(1) }}
            className="absolute right-2 sm:right-4 p-3 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition z-10"
            aria-label="Suivant (→)"
            title="Suivant (→)"
          >
            <ChevronRight size={26}/>
          </button>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 text-center text-[11px] text-white/40 font-mono border-t border-white/10">
        ← → pour naviguer · Esc pour fermer
      </div>
    </div>
  )
}
