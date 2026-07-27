/**
 * EventGalleryPage — Galerie publique post-événement, GÉNÉRIQUE pour tout event.
 *
 * URL : /evenements/{slug}/galerie
 *
 * Fonctionnement :
 *  1. Récupère l'event public via /public/events/{slug} (pour titre/id)
 *  2. Récupère les photos visibles via /public/events/{id}/gallery
 *  3. Grille masonry responsive : 2/3/4 colonnes selon largeur
 *  4. Clic sur photo → lightbox plein écran
 *  5. Dans la lightbox : boutons de téléchargement multi-format
 *     (16:9 avec cadre event, carré, story, original) — toutes les
 *     versions passent obligatoirement par le composer NWC qui applique
 *     le cadre événement au moment de l'upload.
 */
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, X, Image as ImageIcon } from 'lucide-react'
import { publicEvents } from '@/api/public'
import api from '@/api/axios'
import Spinner from '@/components/ui/Spinner.jsx'

const FORMAT_LABELS = {
  tv:        { label: 'Écran 16:9',    hint: 'Avec cadre événement' },
  landscape: { label: 'Paysage 3:2',   hint: 'Format partage social' },
  square:    { label: 'Carré 1:1',     hint: 'Instagram post' },
  story:     { label: 'Story 9:16',    hint: 'Instagram/TikTok story' },
  original:  { label: 'Original',      hint: 'Photo brute non brandée' },
}

export default function EventGalleryPage() {
  const { slug } = useParams()

  // 1. Récupération event
  const { data: event, isLoading: loadingEvent } = useQuery({
    queryKey: ['public', 'event', slug],
    queryFn: () => publicEvents.get(slug),
    staleTime: 60_000,
  })

  // 2. Récupération photos une fois l'event chargé
  const eventId = event?.id
  const { data: gallery, isLoading: loadingGallery } = useQuery({
    queryKey: ['public', 'gallery', eventId],
    queryFn: () => api.get(`/public/events/${eventId}/gallery`).then((r) => r.data),
    enabled: !! eventId,
    staleTime: 30_000,
  })

  const [lightboxIndex, setLightboxIndex] = useState(null)
  const photos = gallery?.photos ?? []

  // Fermeture lightbox par ESC
  useEffect(() => {
    if (lightboxIndex === null) return
    const onKey = (e) => {
      if (e.key === 'Escape') setLightboxIndex(null)
      else if (e.key === 'ArrowLeft') setLightboxIndex((i) => Math.max(0, i - 1))
      else if (e.key === 'ArrowRight') setLightboxIndex((i) => Math.min(photos.length - 1, i + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIndex, photos.length])

  if (loadingEvent) return <div className="min-h-screen flex items-center justify-center"><Spinner/></div>
  if (! event) return <div className="min-h-screen flex items-center justify-center text-public-ink">Événement introuvable.</div>

  const active = lightboxIndex !== null ? photos[lightboxIndex] : null

  return (
    <article className="bg-public-bone min-h-screen">
      <header className="container-nwc pt-8 pb-6">
        <Link to={`/evenements/${slug}`} className="inline-flex items-center gap-2 text-sm font-mono uppercase tracking-widest text-public-ink/60 hover:text-public-flame transition">
          <ArrowLeft size={14}/> Retour à l'événement
        </Link>
        <div className="mt-4 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="tag-mono text-public-flame">Galerie</p>
            <h1 className="text-4xl lg:text-5xl font-display uppercase text-public-ink leading-tight mt-1">
              {event.title}
            </h1>
          </div>
          <div className="text-sm text-public-ink/60 font-mono">
            {gallery?.count ?? 0} photo{(gallery?.count ?? 0) > 1 ? 's' : ''}
          </div>
        </div>
      </header>

      <section className="container-nwc pb-16">
        {loadingGallery ? (
          <div className="py-24 flex justify-center"><Spinner/></div>
        ) : photos.length === 0 ? (
          <div className="border-2 border-public-ink/15 bg-white p-12 text-center">
            <ImageIcon size={48} className="mx-auto text-public-ink/25 mb-3"/>
            <p className="font-display uppercase text-2xl text-public-ink">Aucune photo publiée</p>
            <p className="mt-2 text-public-ink/60">Les photos apparaîtront ici dès que l'équipe les aura mises en ligne.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setLightboxIndex(i)}
                className="group relative aspect-video bg-public-coffee overflow-hidden focus:outline-none focus:ring-2 focus:ring-public-flame"
              >
                <img
                  src={p.preview_url}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-3">
                  <span className="bg-white/95 text-public-ink text-xs font-mono uppercase tracking-widest px-2 py-1">
                    Voir · Télécharger
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Lightbox */}
      {active && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Header lightbox */}
          <div
            className="flex items-center justify-between p-4 text-public-bone flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-mono text-sm text-public-bone/70">
              {lightboxIndex + 1} / {photos.length}
            </div>
            <button
              onClick={() => setLightboxIndex(null)}
              className="p-2 hover:bg-white/10 rounded transition"
              aria-label="Fermer"
            >
              <X size={24}/>
            </button>
          </div>

          {/* Image + nav flèches */}
          <div
            className="flex-1 flex items-center justify-center min-h-0 relative px-4"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxIndex > 0 && (
              <button
                onClick={() => setLightboxIndex((i) => Math.max(0, i - 1))}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-public-bone transition"
                aria-label="Précédente"
              >
                <ArrowLeft size={20}/>
              </button>
            )}
            {lightboxIndex < photos.length - 1 && (
              <button
                onClick={() => setLightboxIndex((i) => Math.min(photos.length - 1, i + 1))}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-public-bone transition"
                aria-label="Suivante"
              >
                <ArrowLeft size={20} className="rotate-180"/>
              </button>
            )}
            <img
              src={active.preview_url}
              alt=""
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Footer download */}
          <div
            className="p-4 bg-black/80 text-public-bone flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-center text-xs font-mono uppercase tracking-widest text-public-bone/60 mb-3">
              Télécharger cette photo
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {Object.entries(active.formats).map(([format, url]) => {
                if (! url) return null
                const meta = FORMAT_LABELS[format] || { label: format }
                return (
                  <a
                    key={format}
                    href={`${import.meta.env.VITE_API_URL || '/api'}/public/events/${eventId}/gallery/${active.id}/download?format=${format}`}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-public-bone/40 hover:border-public-flame hover:bg-public-flame hover:text-white text-sm font-mono uppercase tracking-widest transition"
                    title={meta.hint}
                  >
                    <Download size={14}/> {meta.label}
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </article>
  )
}
