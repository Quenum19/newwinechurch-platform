/**
 * ==============================================================
 *  Home publique — Direction "Magazine Drop" v2 (simplifiée)
 *
 *  Principes éditoriaux :
 *   - 5 sections claires, pas plus
 *   - "Show, don't tell" : la galerie en 2e position, voir avant lire
 *   - Captiver le jeune : visages, ambiance, prochain culte concret
 *   - Cohérence palette public.* (bone dominant, flame accent, ink intentionnel)
 *
 *  Sections :
 *   1. Hero (slogan + sermon featured + image bg optionnelle)
 *   2. Galerie aperçu — visages réels, vidéos, "On l'a vécu"
 *   3. Prochain culte / live / sermon récent — focus action
 *   4. Témoignages courts (2 voix, pas plus)
 *   5. Donner (Flame band)
 * ==============================================================
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Play, ArrowUpRight, Headphones, MapPin, Copy, Check, Radio, Video, X, ChevronLeft, ChevronRight, Calendar, Ticket, Clock } from 'lucide-react'

import { publicSermons, publicEvents, publicSettings, publicMedia, publicTestimonials } from '@/api/public'
import { useLiveStore } from '@/store/liveStore'
import { useAutoplayVideo, videoMimeFromPath } from '@/hooks/useAutoplayVideo'
import Marquee from '@/components/public/Marquee.jsx'
import MagneticButton from '@/components/public/MagneticButton.jsx'
import RotatingSticker from '@/components/public/RotatingSticker.jsx'

export default function Home() {
  const { t, i18n } = useTranslation()

  const { data: featured } = useQuery({
    queryKey: ['public', 'sermons', 'featured'],
    queryFn: publicSermons.featured,
    staleTime: 5 * 60 * 1000,
  })
  const { data: events } = useQuery({
    queryKey: ['public', 'events', 'upcoming-home'],
    // per_page=10 pour capturer le prochain culte même s'il est derrière des
    // events spéciaux (bal, concert…) dans le tri chronologique.
    queryFn: () => publicEvents.list({ per_page: 10, when: 'upcoming' }),
    staleTime: 5 * 60 * 1000,
  })
  const { data: media } = useQuery({
    queryKey: ['public', 'media', 'home'],
    // 12 médias aléatoires + GARANTIE de 3 vidéos minimum si dispo (pour
    // donner de l'animation à la home — sinon que des photos statiques).
    // staleTime:0 + refetchOnMount:'always' → nouvel échantillon à chaque visite.
    queryFn: () => publicMedia.list({ per_page: 12, random: 1, prefer_videos: 3 }),
    staleTime: 0,
    refetchOnMount: 'always',
  })
  const { data: testimonialsList } = useQuery({
    queryKey: ['public', 'testimonials', 'home'],
    queryFn: () => publicTestimonials.list(),
    staleTime: 5 * 60 * 1000,
  })
  const { data: settings } = useQuery({
    queryKey: ['settings', 'public'],
    queryFn: publicSettings.get,
    staleTime: 10 * 60 * 1000,
  })

  const featuredSermon = (featured?.data ?? [])[0] ?? null
  const upcomingEvents = events?.data ?? []
  const galleryItems = media?.data ?? []
  const donation = settings?.donation ?? {}
  const heroImage = settings?.branding?.hero_image || null
  const heroVideo = settings?.branding?.hero_video || null
  const testimonials = testimonialsList ?? []

  const marqueeItems = (() => {
    const raw = i18n.t('home.marqueeItems', { returnObjects: true })
    return Array.isArray(raw) ? raw : []
  })()

  return (
    <div className="bg-public-bone text-public-ink overflow-x-hidden">
      <Hero
        t={t}
        sermon={featuredSermon}
        marqueeItems={marqueeItems}
        heroImage={heroImage}
        heroVideo={heroVideo}
      />

      <GalleryPreview gallery={galleryItems} />

      <NextStep sermon={featuredSermon} />

      {/* Section "Événements à venir" — affichée seulement si on a des events.
          Grid adaptive : 1 → pleine largeur · 2 → 50/50 · 3 → tiers · 4 → quart. */}
      {upcomingEvents.length > 0 && <UpcomingEvents events={upcomingEvents} t={t} />}

      {/* Section témoignages — affichée UNIQUEMENT si on en a (sinon section omise). */}
      {testimonials.length > 0 && <Testimonials items={testimonials} />}

      <GiveBand donation={donation} />
    </div>
  )
}

// ============================================================
// 1. HERO — slogan Anton XXL + sermon featured + image bg
// ============================================================
function Hero({ t, sermon, marqueeItems, heroImage, heroVideo }) {
  // Priorité : vidéo > image > fond crème par défaut.
  // La vidéo joue en autoplay muet en boucle, fallback image en poster pour
  // éviter le flash noir avant le décodage.
  const hasMedia = !! (heroVideo || heroImage)

  return (
    <section className="relative bg-public-bone pt-12 lg:pt-16 pb-16 lg:pb-24 isolate">
      {hasMedia && (
        <>
          {heroVideo ? (
            <video
              src={heroVideo}
              poster={heroImage || undefined}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover -z-10"
            />
          ) : (
            <img
              src={heroImage}
              alt=""
              aria-hidden="true"
              loading="eager"
              fetchpriority="high"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover -z-10"
            />
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background: `
                linear-gradient(90deg,
                  rgba(244,241,235,0.78) 0%,
                  rgba(244,241,235,0.55) 35%,
                  rgba(244,241,235,0.18) 70%,
                  rgba(244,241,235,0.02) 100%
                ),
                linear-gradient(180deg,
                  rgba(244,241,235,0) 55%,
                  rgba(244,241,235,0.85) 100%
                )
              `,
            }}
          />
        </>
      )}

      {/* Marquee top permanente */}
      <div className="border-y-2 border-public-ink/15 py-3 mb-12 lg:mb-16 -mx-[100vw] px-[100vw] bg-public-bone/85 backdrop-blur-sm">
        <Marquee separator="★">
          {marqueeItems.map((item, i) => (
            <span key={i} className="font-display uppercase text-lg sm:text-xl tracking-wide text-public-ink">
              {item}
            </span>
          ))}
        </Marquee>
      </div>

      <div className="container-nwc relative">
        <div className="grid grid-cols-12 gap-8 lg:gap-12 items-end">

          {/* Gauche */}
          <div className="col-span-12 lg:col-span-7 relative">
            <p className="tag-mono mb-6 lg:mb-8 text-public-ink/60">
              <span className="inline-block w-8 h-px bg-public-ink/40 mr-3 align-middle"/>
              {t('home.location')}
            </p>

            <h1 className="heading-anton text-[15vw] sm:text-[12vw] lg:text-[10rem] xl:text-[12rem] leading-[0.88]">
              <span className="block text-public-ink">{t('home.heroLine1')}</span>
              <span className="block text-public-flame">{t('home.heroLine2')}</span>
            </h1>

            <p className="editorial-quote text-2xl sm:text-3xl mt-8 max-w-xl text-public-ink/85">
              {t('home.heroSubtitle')}
            </p>

            <p className="mt-3 text-base text-public-ink/60">{t('home.heroTagline')}</p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <MagneticButton
                as={Link}
                to={sermon ? `/messages/${sermon.slug}` : '/messages'}
                className="btn-flame group"
              >
                <Play size={14} fill="currentColor"/>
                {t('home.ctaLastMessage')}
                <ArrowUpRight size={16} className="ml-1 transition-transform group-hover:rotate-45"/>
              </MagneticButton>
              <Link to="/contact" className="btn-outline-ink">
                {t('home.ctaFirstTime')}
              </Link>
            </div>
          </div>

          {/* Droite */}
          <div className="col-span-12 lg:col-span-5 relative">
            <FeaturedSermonCard sermon={sermon}/>
            <div className="hidden md:block absolute -bottom-8 -left-8 lg:-bottom-12 lg:-left-12 z-20 text-public-flame">
              <RotatingSticker
                text={t('home.stickerHeroText')}
                size={140}
                textColor="#0A0908"
                accent="#FF4A1C"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeaturedSermonCard({ sermon }) {
  const { t } = useTranslation()
  if (! sermon) {
    return (
      <div className="aspect-[4/5] bg-public-coffee flex items-center justify-center border-2 border-public-ink rotate-[-1deg]">
        <div className="text-center px-6">
          <p className="tag-mono text-public-bone/60 mb-3">{t('home.soon')}</p>
          <p className="font-display text-public-bone text-3xl uppercase leading-none whitespace-pre-line">
            {t('home.nextMessageSoon')}
          </p>
        </div>
      </div>
    )
  }

  const Icon = sermon.type === 'audio' ? Headphones : Play
  return (
    <Link
      to={`/messages/${sermon.slug}`}
      className="group block relative bg-public-ink border-2 border-public-ink rotate-[-1deg] hover:rotate-0 transition-transform duration-500 shadow-[8px_8px_0_0_rgba(10,9,8,0.12)]"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        {sermon.thumbnail ? (
          <img
            src={sermon.thumbnail}
            alt=""
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-public-coffee flex items-center justify-center">
            <Icon size={64} className="text-public-flame"/>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-public-ink via-public-ink/40 to-transparent"/>

        <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 bg-public-flame px-3 py-1.5 text-public-bone font-mono text-xs uppercase tracking-widest">
          <Icon size={11}/>
          {sermon.type === 'audio' ? t('media.audio') : t('media.video')}
        </div>

        {sermon.series?.title && (
          <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 bg-public-bone/95 px-3 py-1.5 text-public-ink font-mono text-[11px] uppercase tracking-widest max-w-[60%] truncate">
            {sermon.series.title}
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="h-20 w-20 rounded-full bg-public-flame flex items-center justify-center shadow-2xl">
            <Play size={28} fill="white" className="text-white ml-1"/>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5 text-public-bone">
          <p className="tag-mono text-public-bone/70 mb-2">{t('home.lastSunday')}</p>
          <h3 className="font-display text-3xl sm:text-4xl uppercase leading-none mb-2">
            {sermon.display_title || sermon.title}
          </h3>
          {sermon.scripture_reference && (
            <p className="font-editorial italic text-public-flame text-lg">
              {sermon.scripture_reference}
            </p>
          )}
          <div className="flex items-center gap-3 mt-3 text-xs text-public-bone/60">
            {sermon.speaker?.name && <span>{sermon.speaker.name}</span>}
            {sermon.duration_seconds && (
              <>
                <span>·</span>
                <span>{Math.round(sermon.duration_seconds / 60)} {t('common.minutes')}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ============================================================
// 2. GALERIE APERÇU — bento de visuels (le "show, don't tell")
// ============================================================
function GalleryPreview({ gallery }) {
  const { t } = useTranslation()
  // On stocke l'ID du média cliqué (pas l'index) — la lightbox charge ensuite
  // TOUS les médias publiés et retrouve la bonne position par ID.
  const [openedId, setOpenedId] = useState(null)

  if (! gallery?.length) return null
  const items = gallery.slice(0, 12)

  return (
    <section className="py-20 lg:py-28 bg-public-bone">
      <div className="container-nwc">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-10 lg:mb-14">
          <div>
            <p className="tag-mono text-public-flame mb-2">{t('home.sectionGallery')}</p>
            <h2 className="heading-anton text-5xl sm:text-6xl lg:text-8xl text-public-ink leading-[0.92]">
              {t('home.sectionGalleryTitle1')}<br/>
              <span className="text-public-flame">{t('home.sectionGalleryTitle2')}</span>
            </h2>
          </div>
          <Link
            to="/galerie"
            className="font-mono text-xs uppercase tracking-widest text-public-ink hover:text-public-flame transition-colors inline-flex items-center gap-2 border-b-2 border-public-ink hover:border-public-flame pb-1"
          >
            {t('home.sectionGalleryCta')}
            <ArrowUpRight size={14}/>
          </Link>
        </div>

        {/*
          Bento aperçu : 12 tuiles aspect-square aléatoires (refresh à chaque
          visite via staleTime:0). Clic = ouverture lightbox locale qui charge
          ensuite l'intégralité des médias publiés pour navigation étendue.
        */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 lg:gap-4">
          {items.map((item) => (
            <BentoMediaTile key={item.id} item={item} onClick={() => setOpenedId(item.id)} />
          ))}
        </div>
      </div>

      {openedId !== null && (
        <HomeLightbox
          initialId={openedId}
          fallbackItems={items}
          onClose={() => setOpenedId(null)}
        />
      )}
    </section>
  )
}

/**
 * Lightbox plein écran de la home — navigation clavier + swipe + autoplay vidéo.
 *
 * Stratégie :
 *  - Affichage immédiat avec `fallbackItems` (les 12 aperçus visibles sur la home).
 *  - En arrière-plan on fetch TOUS les médias publiés (latest, jusqu'à 100).
 *  - Une fois chargé, on bascule sur cette liste complète → l'utilisateur peut
 *    naviguer au-delà des 12 vignettes initiales.
 *  - L'index reste calé sur le média cliqué (recherche par ID).
 */
function HomeLightbox({ initialId, fallbackItems, onClose }) {
  const { t } = useTranslation()

  // Fetch lazy de la liste complète — uniquement quand la lightbox est ouverte.
  const { data: allData } = useQuery({
    queryKey: ['public', 'media', 'lightbox-full'],
    queryFn: () => publicMedia.list({ per_page: 100 }),
    staleTime: 5 * 60 * 1000,
  })

  // Liste effective : tous les médias si chargés, sinon les 12 de fallback.
  const items = (allData?.data?.length ?? 0) > 0 ? allData.data : fallbackItems

  // Index calculé à partir de l'ID — re-calculé quand la liste change pour
  // rester pointé sur le bon média lors du switch fallback → liste complète.
  const [index, setIndex] = useState(() =>
    Math.max(0, fallbackItems.findIndex((i) => i.id === initialId))
  )
  useEffect(() => {
    const idx = items.findIndex((i) => i.id === initialId)
    if (idx >= 0) setIndex(idx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allData])

  const onNavigate = (delta) => {
    setIndex((i) => (i + delta + items.length) % items.length)
  }

  const item = items[index]
  if (! item) return null

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
      className="fixed inset-0 z-[100] bg-public-ink/95 backdrop-blur-md flex flex-col"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 text-public-bone/90 border-b border-public-bone/10"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="font-mono text-xs uppercase tracking-widest text-public-bone/60 tabular-nums">
          {String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
        </span>
        <div className="flex items-center gap-2">
          <Link
            to="/galerie"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-2 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-public-bone hover:text-public-flame transition border border-public-bone/30 hover:border-public-flame"
          >
            {t('home.lightboxSeeMore', 'Voir tout')}
            <ArrowUpRight size={12}/>
          </Link>
          <button
            onClick={onClose}
            className="p-2 rounded text-public-bone/80 hover:text-public-bone hover:bg-public-bone/10 transition"
            aria-label={t('common.close', 'Fermer')}
          >
            <X size={20}/>
          </button>
        </div>
      </div>

      {/* Media + flèches — média encadré, pas plein écran (UX préférée). */}
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

        {/* Container du média avec dimensions contraintes */}
        <div className="max-w-[min(900px,85vw)] max-h-[70vh] w-auto h-auto flex items-center justify-center">
          {item.file_type === 'video' ? (
            <video
              key={item.id}
              src={item.file_path}
              poster={item.thumbnail || undefined}
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
            className="absolute right-2 sm:right-4 p-3 rounded-full bg-public-ink/40 text-public-bone/80 hover:text-public-bone hover:bg-public-ink/70 transition z-10"
            aria-label={t('common.next', 'Suivant')}
          >
            <ChevronRight size={28}/>
          </button>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 text-center text-[11px] text-public-bone/40 font-mono border-t border-public-bone/10">
        ← → {t('home.lightboxNav', 'pour naviguer')} · ESC {t('common.close', 'fermer')}
      </div>
    </div>
  )
}

// ============================================================
// 3. NEXT STEP — Prochain culte du dimanche (date auto)
//    Affichage fixe : DIMANCHE / 13H00 + date du prochain dim
//    calculée côté client (aucun event DB requis).
//    Si live en cours → override par bandeau "En direct".
// ============================================================
function NextStep({ sermon }) {
  const { t, i18n } = useTranslation()
  const live = useLiveStore((s) => s.current)
  // Locale date-fns selon la langue active : fr-FR ou en-US.
  const dateLocale = i18n.language?.startsWith('en') ? undefined : fr

  // Prochain dimanche à 13h — recalculé à chaque render (léger, pas de state).
  // Si on est dimanche AVANT 14h, on garde aujourd'hui (culte en cours ou à venir).
  // Sinon on décale au dimanche suivant.
  const nextSunday = (() => {
    const now = new Date()
    const day = now.getDay() // 0 = dimanche
    let delta = (7 - day) % 7
    if (day === 0 && now.getHours() >= 14) delta = 7
    const d = new Date(now)
    d.setDate(now.getDate() + delta)
    d.setHours(13, 0, 0, 0)
    return d
  })()

  return (
    <section className="py-20 lg:py-28 bg-public-coffee text-public-bone relative overflow-hidden">
      <div className="container-nwc relative z-10">
        <div className="grid grid-cols-12 gap-8 lg:gap-12 items-stretch">

          <div className="col-span-12 lg:col-span-7">
            <p className="tag-mono text-public-flame mb-3">{t('home.sectionSundayLabel')}</p>

            {live ? (
              <Link to="/live" className="block group">
                <h2 className="heading-anton text-6xl sm:text-7xl lg:text-9xl text-public-bone leading-[0.88]">
                  {t('home.sectionLiveTitle1')}<br/>
                  <span className="text-public-flame inline-flex items-center gap-3">
                    {t('home.sectionLiveTitle2')}
                    <span className="h-3 w-3 rounded-full bg-public-flame animate-pulse"/>
                  </span>
                </h2>
                <p className="editorial-quote text-2xl mt-6 text-public-bone/80">{live.title}</p>
                <span className="mt-6 inline-flex btn-flame group">
                  <Radio size={14}/> {t('home.sectionLiveCta')}
                  <ArrowUpRight size={14} className="transition-transform group-hover:rotate-45"/>
                </span>
              </Link>
            ) : (
              <div>
                <h2 className="heading-anton text-6xl sm:text-7xl lg:text-9xl text-public-bone leading-[0.88]">
                  {format(nextSunday, 'EEEE', { locale: dateLocale }).toUpperCase()}<br/>
                  <span className="text-public-flame">13H00</span>
                </h2>
                <p className="editorial-quote text-2xl mt-6 text-public-bone/80">
                  {format(nextSunday, "d MMMM yyyy", { locale: dateLocale })}
                </p>
                <p className="mt-3 text-sm text-public-bone/60 inline-flex items-center gap-2">
                  <MapPin size={14}/> {t('home.sectionSundaySubtitle')}
                </p>
                <Link to="/contact" className="mt-6 inline-flex btn-flame">
                  {t('home.sectionSundayHowCome')}
                  <ArrowUpRight size={14}/>
                </Link>
              </div>
            )}
          </div>

          <div className="col-span-12 lg:col-span-5 flex flex-col justify-end">
            <div className="border-l-2 border-public-flame pl-6 lg:pl-8">
              {/* Verset biblique en mise en avant principale (sans citation
                  pastorale au-dessus — choix éditorial : laisser parler la Parole). */}
              <p className="font-editorial italic text-2xl sm:text-3xl text-public-bone/95 leading-snug">
                « Venez à moi, vous tous qui êtes fatigués et chargés,
                et je vous donnerai du repos. »
              </p>
              <p className="mt-4 tag-mono text-public-flame">
                Matthieu 11:28
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-12 -right-12 lg:-bottom-16 lg:-right-16 pointer-events-none">
        <RotatingSticker
          text={t('home.stickerInviteText')}
          size={220}
          textColor="rgba(255,74,28,0.3)"
          accent="rgba(255,74,28,0.5)"
        />
      </div>
    </section>
  )
}

// ============================================================
// 3-bis. ÉVÉNEMENTS À VENIR — grid adaptive (1/2/3/4 cols)
//    Affichée seulement si on a au moins 1 event upcoming.
//    Layout dynamique : pas d'espace mort si moins de 4 events.
// ============================================================
function UpcomingEvents({ events, t }) {
  // Grille adaptive selon le nombre d'events — pas de "trous" visuels.
  //   1  → pleine largeur (mise en avant XXL)
  //   2  → 50/50 dès sm
  //   3  → 33/33/33 dès lg
  //   4+ → 25 % chacune dès lg
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  }[events.length] ?? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'

  const isSingle = events.length === 1

  return (
    <section className="py-20 lg:py-28 bg-public-bone">
      <div className="container-nwc">
        {/* Header section : eyebrow + title + CTA "Voir tout" */}
        <div className="flex flex-wrap items-end justify-between gap-6 mb-10 lg:mb-14">
          <div className="max-w-2xl">
            <p className="tag-mono text-public-flame mb-3">
              <span className="inline-block w-8 h-px bg-public-flame/60 mr-3 align-middle"/>
              {t('home.upcomingLabel', 'Agenda')}
            </p>
            <h2 className="heading-anton text-5xl sm:text-6xl lg:text-7xl text-public-ink leading-[0.92]">
              {t('home.upcomingTitle1', 'Événements')}<br/>
              <span className="text-public-flame">{t('home.upcomingTitle2', 'à venir.')}</span>
            </h2>
            <p className="editorial-quote text-xl sm:text-2xl text-public-ink/70 mt-5">
              {t('home.upcomingSubtitle', "Bloque ton agenda — les prochains rendez-vous de la maison.")}
            </p>
          </div>
          <Link to="/evenements"
                className="inline-flex items-center gap-2 px-5 py-3 border-2 border-public-ink hover:bg-public-ink hover:text-public-bone transition font-mono uppercase text-xs tracking-widest">
            {t('home.upcomingSeeAll', 'Tous les événements')}
            <ArrowUpRight size={14}/>
          </Link>
        </div>

        {/* Grid adaptive */}
        <div className={`grid ${gridCols} gap-6 lg:gap-8`}>
          {events.map((e) => <EventCard key={e.id} event={e} featured={isSingle}/>)}
        </div>
      </div>
    </section>
  )
}

function EventCard({ event, featured = false }) {
  const { i18n } = useTranslation()
  const date = event.starts_at ? new Date(event.starts_at) : null
  const dateLocale = i18n.language?.startsWith('en') ? undefined : fr

  // Compte à rebours simple : "Dans 3 jours" / "Demain" / "Aujourd'hui" / "Dans 2 semaines"
  const proximityLabel = (() => {
    if (! date) return null
    const now = new Date()
    const diff = Math.ceil((date - now) / (1000 * 60 * 60 * 24))
    if (diff < 0) return null
    if (diff === 0) return "Aujourd'hui"
    if (diff === 1) return 'Demain'
    if (diff <= 7) return `Dans ${diff} jours`
    if (diff <= 30) return `Dans ${Math.ceil(diff / 7)} sem.`
    return null
  })()

  // Mode "featured" = 1 seul event → carte XXL avec image et infos côte à côte.
  if (featured) {
    return (
      <Link to={event.ticketing_enabled ? `/billetterie/${event.slug}` : `/evenements/${event.slug}`}
            className="group block">
        <article className="grid lg:grid-cols-2 bg-public-ink text-public-bone overflow-hidden">
          {/* Image */}
          <div className="aspect-video lg:aspect-auto relative bg-public-coffee overflow-hidden">
            {event.cover_image ? (
              <img src={event.cover_image} alt="" loading="lazy"
                   className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"/>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-public-flame/40 to-public-coffee"/>
            )}
            {date && (
              <div className="absolute top-4 left-4 bg-public-bone text-public-ink p-3 leading-none text-center min-w-[70px]">
                <p className="tag-mono text-public-flame text-[10px]">{format(date, 'MMM', { locale: dateLocale })}</p>
                <p className="font-display text-4xl mt-1">{format(date, 'd')}</p>
              </div>
            )}
          </div>
          {/* Texte */}
          <div className="p-8 lg:p-12 flex flex-col justify-center">
            {proximityLabel && (
              <p className="tag-mono text-public-flame mb-3 inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-public-flame animate-pulse"/>
                {proximityLabel}
              </p>
            )}
            <h3 className="heading-anton text-4xl sm:text-5xl lg:text-6xl text-public-bone leading-[0.92] group-hover:text-public-flame transition">
              {event.display_title || event.title}
            </h3>
            <div className="mt-6 space-y-2 text-public-bone/80">
              {date && (
                <p className="inline-flex items-center gap-2 text-sm">
                  <Clock size={14} className="text-public-flame"/>
                  {format(date, "EEEE d MMMM · HH'h'mm", { locale: dateLocale })}
                </p>
              )}
              {event.location && (
                <p className="inline-flex items-center gap-2 text-sm">
                  <MapPin size={14} className="text-public-flame"/>{event.display_location || event.location}
                </p>
              )}
            </div>
            <div className="mt-8 inline-flex items-center gap-2 font-mono uppercase text-xs tracking-widest text-public-flame group-hover:gap-3 transition-all">
              {event.ticketing_enabled ? (
                <><Ticket size={12}/> Réserver ma place</>
              ) : (
                <>Découvrir l'événement</>
              )}
              <ArrowUpRight size={14}/>
            </div>
          </div>
        </article>
      </Link>
    )
  }

  // Mode "grid" = 2/3/4 events → card compacte avec image en haut + infos dessous.
  return (
    <Link to={event.ticketing_enabled ? `/billetterie/${event.slug}` : `/evenements/${event.slug}`}
          className="group block">
      <article className="h-full flex flex-col">
        {/* Image */}
        <div className="aspect-video relative bg-public-coffee overflow-hidden">
          {event.cover_image ? (
            <img src={event.cover_image} alt="" loading="lazy"
                 className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"/>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-public-flame/30 to-public-coffee"/>
          )}
          {/* Overlay dégradé pour lisibilité badge date */}
          <div className="absolute inset-0 bg-gradient-to-t from-public-ink/40 via-transparent"/>
          {date && (
            <div className="absolute top-3 left-3 bg-public-bone text-public-ink p-2.5 leading-none text-center min-w-[56px]">
              <p className="tag-mono text-public-flame text-[9px]">{format(date, 'MMM', { locale: dateLocale })}</p>
              <p className="font-display text-3xl mt-0.5">{format(date, 'd')}</p>
            </div>
          )}
          {event.ticketing_enabled && (
            <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 bg-public-flame text-public-bone font-mono text-[10px] uppercase tracking-widest">
              <Ticket size={9}/> Billetterie
            </div>
          )}
          {proximityLabel && (
            <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 bg-public-bone/95 text-public-ink font-mono text-[10px] uppercase tracking-widest">
              <span className="h-1.5 w-1.5 rounded-full bg-public-flame animate-pulse"/>
              {proximityLabel}
            </div>
          )}
        </div>

        {/* Texte */}
        <div className="pt-5 flex flex-col flex-1">
          <h3 className="font-display uppercase text-xl sm:text-2xl text-public-ink group-hover:text-public-flame transition leading-tight">
            {event.display_title || event.title}
          </h3>
          {date && (
            <p className="mt-2 tag-mono text-public-ink/60 inline-flex items-center gap-2">
              <Calendar size={11}/> {format(date, "EEEE · HH'h'mm", { locale: dateLocale })}
            </p>
          )}
          {event.location && (
            <p className="mt-1 text-xs text-public-ink/50 inline-flex items-center gap-1.5">
              <MapPin size={11}/> {event.display_location || event.location}
            </p>
          )}
          <div className="mt-auto pt-4 inline-flex items-center gap-1.5 font-mono uppercase text-[10px] tracking-widest text-public-flame group-hover:gap-2.5 transition-all">
            {event.ticketing_enabled ? 'Réserver' : 'En savoir +'}
            <ArrowUpRight size={12}/>
          </div>
        </div>
      </article>
    </Link>
  )
}

// ============================================================
// 4. TÉMOIGNAGES — Carrousel spotlight (vidéo OU photo + texte)
//    Affiché UNIQUEMENT si items.length > 0 (parent contrôle).
// ============================================================
function Testimonials({ items }) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const current = items[index]

  // Auto-rotate toutes les 9s — pause si vidéo (vidéo doit être lue entière).
  useEffect(() => {
    if (current?.has_video) return // ne pas changer pendant la lecture vidéo
    const tm = setTimeout(() => setIndex((i) => (i + 1) % items.length), 9000)
    return () => clearTimeout(tm)
  }, [index, items.length, current?.has_video])

  const goNext = () => setIndex((i) => (i + 1) % items.length)
  const goPrev = () => setIndex((i) => (i - 1 + items.length) % items.length)

  return (
    <section className="py-20 lg:py-28 bg-public-bone">
      <div className="container-nwc">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-10 lg:mb-14">
          <div>
            <p className="tag-mono text-public-flame mb-2">{t('home.sectionTestimonialsLabel', 'Témoignages')}</p>
            <h2 className="heading-anton text-5xl sm:text-6xl lg:text-8xl text-public-ink leading-[0.92]">
              {t('home.sectionTestimonialsTitle', 'Vies transformées.')}
            </h2>
          </div>
          {items.length > 1 && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs tabular-nums text-public-ink/50">
                {String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
              </span>
              <button
                onClick={goPrev}
                className="h-9 w-9 border-2 border-public-ink text-public-ink hover:bg-public-ink hover:text-public-bone transition flex items-center justify-center"
                aria-label="Témoignage précédent"
              >‹</button>
              <button
                onClick={goNext}
                className="h-9 w-9 border-2 border-public-ink text-public-ink hover:bg-public-ink hover:text-public-bone transition flex items-center justify-center"
                aria-label="Témoignage suivant"
              >›</button>
            </div>
          )}
        </div>

        <TestimonialSpotlight item={current} keyId={current?.id} />

        {items.length > 1 && (
          <div className="mt-8 flex items-center justify-center gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`h-1.5 transition-all ${
                  i === index ? 'w-10 bg-public-flame' : 'w-2 bg-public-ink/20 hover:bg-public-ink/40'
                }`}
                aria-label={`Témoignage ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function TestimonialSpotlight({ item, keyId }) {
  if (! item) return null
  return (
    <div key={keyId} className="grid grid-cols-12 gap-8 lg:gap-12 items-center animate-[fadeIn_400ms_ease-out]">
      {/* Média (vidéo prioritaire, sinon photo, sinon initiale géante) */}
      <div className="col-span-12 lg:col-span-5">
        {item.video_path ? (
          <div className="relative bg-public-coffee aspect-[4/5] overflow-hidden border-2 border-public-ink rotate-[-1deg]">
            <video
              src={item.video_path}
              poster={item.thumbnail || item.image_path || undefined}
              controls
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
        ) : item.video_url ? (
          <div className="relative bg-public-coffee aspect-[4/5] overflow-hidden border-2 border-public-ink rotate-[-1deg]">
            <iframe
              src={toEmbedUrl(item.video_url)}
              title={`Témoignage ${item.name}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        ) : item.image_path ? (
          <div className="relative bg-public-coffee aspect-[4/5] overflow-hidden border-2 border-public-ink rotate-[-1deg]">
            <img src={item.image_path} alt={item.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-[4/5] bg-public-flame border-2 border-public-ink rotate-[-1deg] flex items-center justify-center">
            <span className="font-display text-[12rem] text-public-bone leading-none select-none">
              {item.name?.[0]?.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Citation + identité */}
      <div className="col-span-12 lg:col-span-7">
        <span className="font-display text-7xl sm:text-9xl block leading-none mb-2 select-none text-public-flame">«</span>
        <p className="editorial-quote text-2xl sm:text-3xl lg:text-4xl text-public-ink leading-tight">
          {item.quote}
        </p>
        <div className="mt-8 flex items-center gap-4">
          {item.image_path ? (
            <img src={item.image_path} alt={item.name} className="h-14 w-14 rounded-full object-cover border-2 border-public-ink" />
          ) : (
            <div className="h-14 w-14 rounded-full flex items-center justify-center font-display text-2xl text-public-bone bg-public-ink">
              {item.name?.[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-display uppercase text-xl text-public-ink">
              {item.name}{item.age && `, ${item.age}`}
            </p>
            <p className="tag-mono text-public-ink/50">
              {[item.role, item.location].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Convertit une URL YouTube/Vimeo "watch" en URL embed compatible iframe. */
function toEmbedUrl(url) {
  if (! url) return url
  // YouTube : youtu.be/ID, youtube.com/watch?v=ID
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0`
  // Vimeo
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  return url
}

// ============================================================
// 5. GIVE BAND — Mobile Money copy-clipboard
// ============================================================
function GiveBand({ donation }) {
  const { t } = useTranslation()
  const numbers = [
    { label: 'Orange Money', value: donation.orange_money_number },
    { label: 'Wave', value: donation.wave_number },
    { label: 'MTN MoMo', value: donation.mtn_number },
  ].filter((n) => n.value)

  return (
    <section className="bg-public-flame text-public-bone py-20 lg:py-28 relative overflow-hidden">
      <div className="container-nwc relative z-10">
        <div className="grid grid-cols-12 gap-8 lg:gap-12 items-end">
          <div className="col-span-12 lg:col-span-7">
            <p className="tag-mono text-public-bone/70 mb-3">{t('home.sectionGiveLabel')}</p>
            <h2 className="heading-anton text-6xl sm:text-7xl lg:text-9xl text-public-bone leading-[0.92]">
              {t('home.sectionGiveTitle1')}<br/>
              {t('home.sectionGiveTitle2')}
            </h2>
            <p className="editorial-quote text-xl sm:text-2xl mt-6 max-w-xl text-public-bone/85">
              {t('home.sectionGiveDesc')}
            </p>
            <Link to="/donner" className="btn-outline-bone mt-8 inline-flex">
              {t('home.sectionGiveCta')}
              <ArrowUpRight size={14}/>
            </Link>
          </div>

          <div className="col-span-12 lg:col-span-5">
            {numbers.length > 0 ? (
              <ul className="divide-y divide-public-bone/30 border-y-2 border-public-bone">
                {numbers.map((n) => <CopyRow key={n.label} {...n}/>)}
              </ul>
            ) : (
              <div className="border-2 border-public-bone/40 p-6">
                <p className="tag-mono text-public-bone/70">{t('home.donateMethodsPending')}</p>
                <p className="mt-3 font-display text-2xl uppercase">{t('home.donateMethodsPendingDesc')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="absolute -bottom-12 -right-12 lg:-bottom-16 lg:-right-16 z-0 pointer-events-none">
        <RotatingSticker
          text={t('home.stickerGiveText')}
          size={220}
          textColor="rgba(244,241,235,0.45)"
          accent="rgba(244,241,235,0.7)"
        />
      </div>
    </section>
  )
}

function CopyRow({ label, value }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useCopy()
  return (
    <li className="py-4 flex items-center justify-between gap-4">
      <div>
        <p className="tag-mono text-public-bone/60">{label}</p>
        <p className="font-mono text-2xl sm:text-3xl text-public-bone mt-1">{value}</p>
      </div>
      <button
        onClick={() => setCopied(value)}
        className="shrink-0 inline-flex items-center gap-1.5 border-2 border-public-bone px-3 py-2 font-mono text-xs uppercase tracking-widest hover:bg-public-bone hover:text-public-flame transition-colors"
        aria-label={`${t('home.copy')} ${label}`}
      >
        {copied ? <Check size={12}/> : <Copy size={12}/>}
        {copied ? t('home.copied') : t('home.copy')}
      </button>
    </li>
  )
}

function useCopy() {
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)
  const trigger = (value) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(value).catch(() => {})
    }
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }
  useEffect(() => () => timer.current && clearTimeout(timer.current), [])
  return [copied, trigger]
}

/**
 * Tuile galerie home — aspect-square uniforme + autoplay vidéo on intersect.
 * Composant séparé pour bénéficier du hook useAutoplayVideo proprement.
 */
function BentoMediaTile({ item, onClick }) {
  const isVideo = item.file_type === 'video'
  const videoRef = useAutoplayVideo({ threshold: 0.4 })

  return (
    <button
      // Ouvre la lightbox locale (page d'accueil). Si pas de onClick fourni,
      // fallback vers /galerie via Link wrapper (rétrocompat).
      onClick={onClick}
      type="button"
      style={{ aspectRatio: '1 / 1' }}
      className="w-full relative bg-public-coffee overflow-hidden group block cursor-pointer text-left"
    >
      {isVideo ? (
        <>
          {/* Fallback toujours visible derrière la vidéo. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-public-coffee via-public-ink to-public-coffee"
          >
            <Video size={28} className="text-public-flame/70"/>
          </div>
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
          <div className="absolute top-2 right-2 inline-flex items-center gap-1 bg-public-ink/80 backdrop-blur-sm px-1.5 py-0.5 text-public-bone font-mono text-[9px] uppercase tracking-widest">
            <Video size={8}/> Vidéo
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
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-public-ink/95 to-transparent opacity-0 group-hover:opacity-100 transition">
          <p className="text-public-bone font-display uppercase text-sm truncate">{item.title}</p>
        </div>
      )}
    </button>
  )
}
