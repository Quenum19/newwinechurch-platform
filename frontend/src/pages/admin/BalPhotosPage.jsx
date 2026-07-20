/**
 * BalPhotosPage — Upload photos ambiance pour l'écran live.
 */
import { useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Camera, Upload, Trash2, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import api from '@/api/axios'

export default function BalPhotosPage() {
  const { eventId } = useParams()
  const qc = useQueryClient()
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const { data: photos = [] } = useQuery({
    queryKey: ['bal', 'photos', eventId],
    queryFn: () => api.get(`/admin/events/${eventId}/bal/photos`).then((r) => r.data.photos ?? []),
  })

  const toggleMutation = useMutation({
    mutationFn: (pid) => api.patch(`/admin/events/${eventId}/bal/photos/${pid}/visibility`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bal', 'photos', eventId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (pid) => api.delete(`/admin/events/${eventId}/bal/photos/${pid}`),
    onSuccess: () => {
      toast.success('Photo supprimée.')
      qc.invalidateQueries({ queryKey: ['bal', 'photos', eventId] })
    },
  })

  const handleUpload = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    let ok = 0, fail = 0

    for (const file of Array.from(files)) {
      try {
        const fd = new FormData()
        fd.append('photo', file)
        await api.post(`/admin/events/${eventId}/bal/photos`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        ok++
      } catch {
        fail++
      }
    }

    setUploading(false)
    if (ok) toast.success(`${ok} photo${ok > 1 ? 's' : ''} uploadée${ok > 1 ? 's' : ''}.`)
    if (fail) toast.error(`${fail} échec${fail > 1 ? 's' : ''}.`)
    qc.invalidateQueries({ queryKey: ['bal', 'photos', eventId] })
    if (fileRef.current) fileRef.current.value = ''
  }

  const visibleCount = photos.filter((p) => p.is_visible).length

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <Link to={`/admin/bal/${eventId}/regie`} className="text-xs font-mono uppercase tracking-widest text-[color:var(--adm-accent)] hover:underline inline-flex items-center gap-1">
          <ArrowLeft size={13}/> Retour régie
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1" style={{ color: 'var(--adm-text)' }}>
          <Camera size={22} className="inline mr-2 text-[color:var(--adm-accent)]"/>
          Photos ambiance
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {visibleCount} photo{visibleCount > 1 ? 's' : ''} visible{visibleCount > 1 ? 's' : ''} à l'écran (sur {photos.length}).
        </p>
      </div>

      <section className="adm-card p-4">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed rounded-lg p-8 text-center hover:border-[color:var(--adm-accent)] transition"
          style={{ borderColor: uploading ? 'var(--adm-accent)' : 'var(--adm-border)' }}
        >
          {uploading ? (
            <Loader2 size={32} className="mx-auto animate-spin text-[color:var(--adm-accent)]"/>
          ) : (
            <>
              <Upload size={32} className="mx-auto text-zinc-400 mb-2"/>
              <p className="font-semibold">Cliquer pour ajouter des photos</p>
              <p className="text-xs text-zinc-500 mt-1">JPEG · PNG · WebP · Multi-sélection possible</p>
            </>
          )}
        </button>
      </section>

      {photos.length === 0 ? (
        <div className="adm-card p-12 text-center text-zinc-500">
          <Camera size={40} className="mx-auto mb-3 opacity-30"/>
          Aucune photo pour l'instant.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="relative group rounded overflow-hidden bg-zinc-100">
              <img
                src={p.url}
                alt=""
                className={`w-full aspect-square object-cover ${!p.is_visible ? 'opacity-40' : ''}`}
              />
              <div className="absolute inset-0 flex items-end p-2 opacity-0 group-hover:opacity-100 transition bg-gradient-to-t from-black/60 to-transparent">
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleMutation.mutate(p.id)}
                    className="p-2 bg-white/90 rounded hover:bg-white"
                    title={p.is_visible ? 'Masquer' : 'Afficher'}
                  >
                    {p.is_visible ? <Eye size={14}/> : <EyeOff size={14}/>}
                  </button>
                  <button
                    onClick={() => confirm('Supprimer cette photo ?') && deleteMutation.mutate(p.id)}
                    className="p-2 bg-white/90 rounded hover:bg-white hover:text-red-600"
                  >
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
