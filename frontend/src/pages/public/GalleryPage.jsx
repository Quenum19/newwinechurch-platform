/**
 * Page publique — Galerie photos & vidéos.
 *
 * Choix design v2 :
 *  - Grille UNIFORME aspect-square (pas masonry — tailles incohérentes éliminées)
 *  - Vidéos jouent en auto silencieuses quand visibles (IntersectionObserver)
 *  - Pagination serveur (24/page) — scalable même avec 10k+ médias
 *  - Lightbox full-screen avec navigation clavier + swipe touch
 *  - Loading lazy + skeleton placeholders
 */
import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Image as ImageIcon, Video, X, ChevronLeft, ChevronRight, Play, Calendar, Building2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { publicDepartments, publicEvents, publicMedia } from '@/api/public'
import { useSeoMeta } from '@/hooks/useSeoMeta'
import { useAutoplayVideo, videoMimeFromPath } from '@/hooks/useAutoplayVideo'
import { cn } from '@/utils/cn'

const PER_PAGE = 24

export default function GalleryPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState('') // '' | 'image' | 'video'
  const [page, setPage] = useState(1)
  const [openIndex, setOpenIndex] = useState(null)

  // Filtres via URL : ?event=slug ou ?departement=slug (exclusifs).
  const eventSlug = searchParams.get('event') ?? ''
  const deptSlug = searchParams.get('departement') ?? ''

  const { data: deptsList } = useQuery({
    queryKey: ['public', 'departments'],
    queryFn:  publicDepartments.list,
    staleTime: 5 * 60 * 1000,
  })
  const activeDept = deptsList?.data?.find((d) => d.slug === deptSlug)

  // Si filtre événement actif → on charge l'event pour breadcrumb + titre.
  const { data: activeEvent } = useQuery({
    queryKey: ['public', 'events', 'detail', eventSlug],
    queryFn: () => publicEvents.get(eventSlug),
    enabled: !!eventSlug,
    staleTime: 5 * 60 * 1000,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['public', 'media', { file_type: filter, page, department: deptSlug, event: eventSlug }],
    queryFn: () => publicMedia.list({
      file_type: filter || undefined,
      event: eventSlug || undefined,
      department: !eventSlug && deptSlug ? deptSlug : undefined,
      per_page: PER_PAGE,
      page,
    }),
    keepPreviousData: true,
  })

  const items = data?.data ?? []
  const meta = data?.meta ?? null
  const totalPages = meta?.last_page ?? 1

  // Reset page quand un filtre change.
  useEffect(() => { setPage(1) }, [filter, deptSlug, eventSlug])

  // Deep link ?lightbox=ID — ouvre directement la lightbox sur le média demandé
  // (utilisé depuis la home : on clique une vignette → arrive ici avec le bon item).
  // On attend que les items soient chargés pour trouver l'index correspondant.
  const lightboxId = searchParams.get('lightbox')
  useEffect(() => {
    if (! lightboxId) return
    if (! data?.data?.length) return
    const idx = data.data.findIndex((m) => String(m.id) === String(lightboxId))
    if (idx >= 0) {
      setOpenIndex(idx)
      // On retire le param de l'URL pour ne pas re-ouvrir si l'utilisateur ferme.
      const next = new URLSearchParams(searchParams)
      next.delete('lightbox')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxId, data])

  // Update URL helper (sans reload).
  const setDept = (slug) => {
    const next = new URLSearchParams(searchParams)
    if (slug) next.set('departement', slug)
    else next.delete('departement')
    next.delete('event') // exclusif avec event
    setSearchParams(next, { replace: true })
  }
  const clearEvent = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('event')
    setSearchParams(next, { replace: true })
  }

  // === SEO contextuel ===
  useSeoMeta({
    title: activeDept
      ? t('gallery.seoTitleDept', 'Activités {{name}} — Galerie NWC', { name: activeDept.name })
      : t('gallery.seoTitleDefault', 'Galerie — New Wine Church'),
    description: activeDept
      ? t('gallery.seoDescDept', 'Photos et vidéos des activités du département {{name}}.', { name: activeDept.name })
      : t('gallery.seoDescDefault', 'Photos et vidéos de la communauté New Wine Church.'),
  })

  return (
    <div className="bg-public-bone min-h-screen">
      <header className="container-nwc pt-16 pb-12 lg:pt-24 lg:pb-16">
        {/* Breadcrumb contextuel — événement prioritaire sur département */}
        {activeEvent && (
          <nav className="mb-4 font-mono text-xs uppercase tracking-widest text-public-ink/60 flex items-center gap-2 flex-wrap">
            <Link to="/galerie" className="hover:text-public-flame">{t('gallery.pageTitle', 'Galerie')}</Link>
            <ChevronRight size={12} />
            <Link to={`/evenements/${activeEvent.slug}`} className="hover:text-public-flame">
              {activeEvent.display_title || activeEvent.title}
            </Link>
            <button
              onClick={clearEvent}
              className="ml-2 inline-flex items-center gap-1 text-public-flame hover:underline"
            >
              <X size={11} /> {t('gallery.removeFilter', 'retirer')}
            </button>
          </nav>
        )}
        {!activeEvent && activeDept && (
          <nav className="mb-4 font-mono text-xs uppercase tracking-widest text-public-ink/60 flex items-center gap-2 flex-wrap">
            <Link to="/galerie" className="hover:text-public-flame">{t('gallery.pageTitle', 'Galerie')}</Link>
            <ChevronRight size={12} />
            <Link to={`/communaute/${activeDept.slug}`} className="hover:text-public-flame">
              {activeDept.name}
            </Link>
            <button
              onClick={() => setDept('')}
              className="ml-2 inline-flex items-center gap-1 text-public-flame hover:underline"
              aria-label={t('gallery.removeFilterAria', 'Retirer le filtre département')}
            >
              <X size={11} /> {t('gallery.removeFilter', 'retirer')}
            </button>
          </nav>
        )}
        <p className="tag-mono text-public-flame mb-3">{t('gallery.pageTitle', 'Galerie')}</p>
        <h1 className="heading-anton text-5xl sm:text-7xl lg:text-9xl text-public-ink">
          {activeEvent ? (
            <>{t('gallery.heroTitleEventLine1', 'Souvenirs')}<br/>
              <span className="text-public-flame">{activeEvent.display_title || activeEvent.title}</span></>
          ) : activeDept ? (
            <>{t('gallery.heroTitleDeptLine1', 'Activités')}<br/>
              <span className="text-public-flame">{activeDept.name}</span></>
          ) : (
            <>{t('gallery.heroTitleLine1', "On l'a vécu")}<br/>
              <span className="text-public-flame">{t('gallery.heroTitleLine2', 'ensemble.')}</span></>
          )}
        </h1>
        <p className="editorial-quote text-xl sm:text-2xl text-public-ink/80 mt-6 max-w-2xl">
          {activeEvent
            ? t('gallery.heroDescEvent', 'Les photos et vidéos de cet événement.')
            : activeDept
              ? t('gallery.heroDescDept', 'Les photos et vidéos du département {{name}}.', { name: activeDept.name })
              : t('gallery.heroDescDefault', `Les visages, la lumière, les moments. Tout ce qu'une photo dit mieux qu'un texte.`)}
        </p>

        {/* Filtres */}
        <div className="mt-10 flex gap-2 flex-wrap items-center">
          <FilterTab active={filter === ''}      onClick={() => setFilter('')}>{t('gallery.all', 'Tout')}</FilterTab>
          <FilterTab active={filter === 'image'} onClick={() => setFilter('image')}>
            <ImageIcon size={14}/> {t('gallery.photos', 'Photos')}
          </FilterTab>
          <FilterTab active={filter === 'video'} onClick={() => setFilter('video')}>
            <Video size={14}/> {t('gallery.videos', 'Vidéos')}
          </FilterTab>

          {/* Sélecteur département */}
          <select
            value={deptSlug}
            onChange={(e) => setDept(e.target.value)}
            className="px-4 py-2 font-mono text-xs uppercase tracking-widest border-2 border-public-ink/30 bg-public-bone text-public-ink hover:border-public-ink focus:border-public-flame focus:outline-none transition"
            aria-label={t('gallery.filterByDepartment', 'Filtrer par département')}
          >
            <option value="">{t('gallery.allDepartments', 'Tous départements')}</option>
            {(deptsList?.data ?? []).map((d) => (
              <option key={d.id} value={d.slug}>{d.name}</option>
            ))}
          </select>

          {meta && (
            <span className="ml-auto self-center tag-mono text-public-ink/40">
              {meta.total} {meta.total > 1 ? t('gallery.mediaPlural', 'médias') : t('gallery.mediaSingular', 'média')}
            </span>
          )}
        </div>
      </header>

      <section className="container-nwc pb-12">
        {isLoading ? (
          <GallerySkeleton/>
        ) : items.length === 0 ? (
          <EmptyState/>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
            {items.map((m, i) => (
              <MediaTile
                key={m.id}
                item={m}
                onClick={() => setOpenIndex(i)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="container-nwc pb-24 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="btn-outline-ink disabled:opacity-30 disabled:cursor-not-allowed py-2 px-4 text-xs"
          >
            <ChevronLeft size={14}/> {t('common.previous', 'Précédent')}
          </button>
          <span className="font-mono text-xs uppercase tracking-widest text-public-ink/60 px-4">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="btn-outline-ink disabled:opacity-30 disabled:cursor-not-allowed py-2 px-4 text-xs"
          >
            {t('common.next', 'Suivant')} <ChevronRight size={14}/>
          </button>
        </div>
      )}

      {openIndex !== null && items[openIndex] && (
        <Lightbox
          items={items}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onNavigate={(d) => setOpenIndex((openIndex + d + items.length) % items.length)}
        />
      )}
    </div>
  )
}

function FilterTab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-4 py-2 font-mono text-xs uppercase tracking-widest border-2 transition',
        active
          ? 'bg-public-ink text-public-bone border-public-ink'
          : 'bg-transparent text-public-ink border-public-ink/30 hover:border-public-ink',
      )}
    >
      {children}
    </button>
  )
}

/** Tile avec ratio carré uniforme + autoplay vidéo on intersection. */
function MediaTile({ item, onClick }) {
  const { t } = useTranslation()
  const isVideo = item.file_type === 'video'
  const videoRef = useAutoplayVideo({ threshold: 0.4 })

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } }}
      // aspectRatio inline = filet de sécurité au cas où l'utilitaire Tailwind échoue
      // sur un élément peu standard (était <button> avant — collapse à 0×0 chez certains).
      style={{ aspectRatio: '1 / 1' }}
      className="w-full group relative bg-public-coffee overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-public-flame focus:ring-offset-2 focus:ring-offset-public-bone"
      aria-label={item.title || (isVideo ? t('media.video', 'Vidéo') : t('media.photo', 'Photo'))}
    >
      {isVideo ? (
        <>
          {/* Fallback toujours présent derrière la vidéo — visible si décodage
              impossible (ex: codec MOV non supporté). La vidéo passe au-dessus
              dès qu'elle a chargé sa première frame. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-public-coffee via-public-ink to-public-coffee"
          >
            <Play size={42} fill="currentColor" className="text-public-flame/80"/>
          </div>

          {/* On laisse TOUJOURS la balise vidéo : le navigateur affiche le
              poster si dispo ; s'il ne sait pas décoder, on voit le fallback
              derrière (pas pire que de masquer). */}
          <video
            ref={videoRef}
            poster={item.thumbnail ? item.thumbnail : undefined}
            className="absolute inset-0 w-full h-full object-cover"
            preload="auto"
            playsInline
            muted
            loop
          >
            <source src={item.file_path} type={videoMimeFromPath(item.file_path)}/>
            {item.file_path?.endsWith('.mov') && (
              <source src={item.file_path} type="video/mp4"/>
            )}
          </video>

          <div className="absolute top-2 right-2 inline-flex items-center gap-1 bg-public-ink/80 backdrop-blur-sm px-2 py-1 text-public-bone font-mono text-[10px] uppercase tracking-widest pointer-events-none">
            <Video size={9}/> {t('media.video', 'Vidéo')}
          </div>
          {/* Bouton Play visible en permanence (semi-transparent) — devient
              opaque au hover pour signifier la cliquabilité. */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-14 w-14 rounded-full bg-public-flame/85 group-hover:bg-public-flame group-hover:scale-110 transition flex items-center justify-center shadow-xl">
              <Play size={20} fill="white" className="text-white ml-0.5"/>
            </div>
          </div>
        </>
      ) : (
        <img
          src={item.file_path}
          alt={item.title || ''}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      )}
      {item.title && (
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-public-ink/90 via-public-ink/40 to-transparent opacity-0 group-hover:opacity-100 transition">
          <p className="text-public-bone font-display uppercase text-sm tracking-wide truncate">
            {item.title}
          </p>
        </div>
      )}
    </div>
  )
}

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="aspect-square bg-public-stone-soft/40 animate-pulse"
        />
      ))}
    </div>
  )
}

function EmptyState() {
  const { t } = useTranslation()
  return (
    <div className="border-2 border-public-ink/15 p-12 text-center">
      <ImageIcon size={48} className="mx-auto text-public-ink/30 mb-4"/>
      <p className="font-display uppercase text-2xl text-public-ink">{t('gallery.emptyTitle', 'Galerie en construction.')}</p>
      <p className="mt-2 text-public-stone">{t('gallery.emptyHint', 'Les premières photos arrivent très vite.')}</p>
    </div>
  )
}

// ============================================================
// LIGHTBOX — overlay full-screen avec navigation clavier + swipe
// ============================================================
function Lightbox({ items, index, onClose, onNavigate }) {
  const { t } = useTranslation()
  const item = items[index]

  // Navigation clavier (Esc, ←, →) — proprement attachée.
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onNavigate(-1)
      if (e.key === 'ArrowRight') onNavigate(1)
    }
    window.addEventListener('keydown', handler)
    // Empêche le scroll body pendant lightbox.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose, onNavigate])

  // Swipe touch mobile.
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
      aria-label={item.title || t('gallery.previewAria', 'Aperçu média')}
      className="fixed inset-0 z-50 bg-public-ink/95 backdrop-blur-md flex flex-col"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header — compteur + bouton fermer */}
      <div
        className="flex items-center justify-between px-4 py-3 text-public-bone/90 border-b border-public-bone/10"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="font-mono text-xs uppercase tracking-widest text-public-bone/60 tabular-nums">
          {String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
        </span>
        <button
          onClick={onClose}
          className="p-2 rounded text-public-bone/80 hover:text-public-bone hover:bg-public-bone/10 transition"
          aria-label={t('common.close', 'Fermer')}
          title={t('common.close', 'Fermer')}
        >
          <X size={20}/>
        </button>
      </div>

      {/* Média + flèches — encadré pour respirer */}
      <div
        className="flex-1 flex items-center justify-center relative px-4 py-6 sm:px-12"
        onClick={(e) => e.stopPropagation()}
      >
        {items.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(-1) }}
            className="absolute left-2 sm:left-4 p-3 rounded-full bg-public-ink/40 text-public-bone/80 hover:text-public-bone hover:bg-public-ink/70 transition z-10"
            aria-label={t('common.previous', 'Précédent')}
          >
            <ChevronLeft size={28}/>
          </button>
        )}

        <div className="max-w-[min(1000px,88vw)] max-h-[70vh] w-auto h-auto flex items-center justify-center">
          {item.file_type === 'video' ? (
            <video
              key={item.id}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-[70vh] block rounded shadow-2xl"
            >
              <source src={item.file_path} type={videoMimeFromPath(item.file_path)}/>
              {item.file_path?.endsWith('.mov') && (
                <source src={item.file_path} type="video/mp4"/>
              )}
              <p className="text-public-bone font-mono text-sm p-4">
                {t('gallery.videoUnsupported', "Ton navigateur n'arrive pas à lire cette vidéo.")} {' '}
                <a href={item.file_path} className="text-public-flame underline">
                  {t('gallery.downloadFile', 'Télécharger le fichier')}
                </a>.
              </p>
            </video>
          ) : (
            <img
              src={item.file_path}
              alt={item.title || ''}
              className="max-w-full max-h-[70vh] object-contain block rounded shadow-2xl select-none"
            />
          )}
        </div>

        {items.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(1) }}
            className="absolute right-2 sm:right-4 p-3 rounded-full bg-public-ink/40 text-public-bone/80 hover:text-public-bone hover:bg-public-ink/70 transition z-10"
            aria-label={t('common.next', 'Suivant')}
          >
            <ChevronRight size={28}/>
          </button>
        )}
      </div>

      {/* Footer — fiche descriptive (titre + rattachements) */}
      <div
        className="px-4 py-4 border-t border-public-bone/10"
        onClick={(e) => e.stopPropagation()}
      >
        {(item.title || item.event || item.department) && (
          <div className="max-w-3xl mx-auto text-center space-y-2">
            {item.title && (
              <p className="text-public-bone font-display uppercase tracking-wide text-base">
                {item.title}
              </p>
            )}
            {(item.event?.title || item.department?.name) && (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {item.event?.title && (
                  <Link
                    to={`/evenements/${item.event.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-public-flame/15 hover:bg-public-flame/30 text-public-flame font-mono text-[11px] uppercase tracking-widest transition border border-public-flame/40"
                    title={t('gallery.chipEventHint', "Voir la fiche de l'événement")}
                  >
                    <Calendar size={11}/> {item.event.display_title || item.event.title}
                  </Link>
                )}
                {item.department?.name && (
                  <Link
                    to={`/communaute/${item.department.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-public-bone/10 hover:bg-public-bone/25 text-public-bone font-mono text-[11px] uppercase tracking-widest transition border border-public-bone/30"
                    title={t('gallery.chipDeptHint', 'Voir le département')}
                  >
                    <Building2 size={11}/> {item.department.name}
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
        <p className="mt-3 text-center text-[10px] text-public-bone/40 font-mono uppercase tracking-widest">
          ← → {t('gallery.navHint', 'pour naviguer')} · ESC {t('common.close', 'fermer')}
        </p>
      </div>
    </div>
  )
}
