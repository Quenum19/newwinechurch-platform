/** Galerie médias avec drag-drop multi-upload. */
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { Trash2, Upload, Eye, EyeOff, Image as ImageIcon, Video } from 'lucide-react'

import Spinner from '@/components/ui/Spinner.jsx'
import { media, departments } from '@/api/admin'

export default function MediaGalleryPage() {
  const queryClient = useQueryClient()
  const [filterType, setFilterType] = useState('')
  const [filterDept, setFilterDept] = useState('') // id ou ''
  const [uploadDept, setUploadDept] = useState('') // sélection au moment de l'upload

  // Liste des départements pour les dropdowns.
  const { data: deptsRaw } = useQuery({
    queryKey: ['admin', 'departments', { per_page: 100 }],
    queryFn: () => departments.list({ per_page: 100 }),
    staleTime: 5 * 60_000,
  })
  const deptsList = deptsRaw?.data ?? []

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'media', { file_type: filterType, department_id: filterDept }],
    queryFn: () => media.list({
      file_type: filterType || undefined,
      department_id: filterDept || undefined,
      per_page: 60,
    }),
  })

  const uploadMutation = useMutation({
    mutationFn: ({ files, departmentId }) =>
      media.upload(files, { departmentId: departmentId || undefined }),
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
    },
  })

  const togglePublish = useMutation({
    mutationFn: (id) => media.togglePublish(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'media'] }),
  })

  const onDrop = useCallback((acceptedFiles) => {
    if (! acceptedFiles?.length) return
    if (acceptedFiles.length > 20) {
      toast.error('Maximum 20 fichiers par upload.')
      return
    }
    uploadMutation.mutate({ files: acceptedFiles, departmentId: uploadDept })
  }, [uploadMutation, uploadDept])

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

  return (
    <div className="space-y-6">
      <header>
        <p className="text-script text-2xl text-gold-400">Galerie</p>
        <h1 className="font-serif text-3xl text-white">Photos & vidéos</h1>
        <p className="text-white/60 mt-1 text-sm">Drag-and-drop pour uploader. Les images sont optimisées automatiquement (WebP).</p>
      </header>

      {/* Sélecteur département au moment de l'upload */}
      <div className="card-nwc p-4 space-y-3">
        <label className="text-xs uppercase tracking-wider text-white/50">
          Département lié (optionnel) — applique le rattachement aux fichiers uploadés ci-dessous
        </label>
        <select
          value={uploadDept}
          onChange={(e) => setUploadDept(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-ink-950 border border-white/10 text-sm text-white"
        >
          <option value="">— Aucun département (galerie générale) —</option>
          {deptsList.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
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
          {uploadDept && (
            <span className="ml-2 text-gold-300">
              · Sera rattaché à : {deptsList.find((d) => d.id == uploadDept)?.name}
            </span>
          )}
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

        {/* Filtre département */}
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="ml-auto px-3 py-1.5 rounded-lg bg-ink-950 border border-white/10 text-xs text-white"
        >
          <option value="">Tous départements</option>
          {deptsList.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
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
          {items.map((m) => (
            <div key={m.id} className="card-nwc overflow-hidden group relative aspect-square">
              {m.file_type === 'image' ? (
                <img
                  src={`/storage/${m.file_path}`}
                  alt={m.title || ''}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <video
                  src={`/storage/${m.file_path}`}
                  className="w-full h-full object-cover"
                  controls={false}
                  preload="metadata"
                />
              )}

              {/* Overlay actions */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-2">
                {m.title && <p className="text-xs text-white truncate mb-1">{m.title}</p>}
                <div className="flex gap-1 justify-end">
                  <button
                    onClick={() => togglePublish.mutate(m.id)}
                    className="p-1.5 rounded bg-black/60 hover:bg-white/10 text-white"
                    title={m.is_published ? 'Dépublier' : 'Publier'}
                  >
                    {m.is_published ? <Eye size={12}/> : <EyeOff size={12}/>}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Supprimer ce média ?')) remove.mutate(m.id)
                    }}
                    className="p-1.5 rounded bg-black/60 hover:bg-accent/40 text-accent"
                    title="Supprimer"
                  >
                    <Trash2 size={12}/>
                  </button>
                </div>
              </div>

              {! m.is_published && (
                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-xs text-white/70">
                  Caché
                </div>
              )}
              {m.file_type === 'video' && (
                <div className="absolute top-1 right-1 p-1 bg-black/60 rounded">
                  <Video size={12} className="text-white"/>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
