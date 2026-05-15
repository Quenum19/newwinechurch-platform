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
import { Play, ArrowUpRight, Headphones, MapPin, Copy, Check, Radio, Video } from 'lucide-react'

import { publicSermons, publicEvents, publicSettings, publicMedia } from '@/api/public'
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
    queryFn: () => publicEvents.list({ per_page: 2 }),
    staleTime: 5 * 60 * 1000,
  })
  const { data: media } = useQuery({
    queryKey: ['public', 'media', 'home'],
    queryFn: () => publicMedia.list({ per_page: 7 }),
    staleTime: 5 * 60 * 1000,
  })
  const { data: settings } = useQuery({
    queryKey: ['settings', 'public'],
    queryFn: publicSettings.get,
    staleTime: 10 * 60 * 1000,
  })

  const featuredSermon = (featured?.data ?? [])[0] ?? null
  const nextEvent = (events?.data ?? [])[0] ?? null
  const galleryItems = media?.data ?? []
  const donation = settings?.donation ?? {}
  const heroImage = settings?.branding?.hero_image || null

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
      />

      <GalleryPreview gallery={galleryItems} />

      <NextStep
        sermon={featuredSermon}
        event={nextEvent}
      />

      <Testimonials />

      <GiveBand donation={donation} />
    </div>
  )
}

// ============================================================
// 1. HERO — slogan Anton XXL + sermon featured + image bg
// ============================================================
function Hero({ t, sermon, marqueeItems, heroImage }) {
  const hasImage = !! heroImage

  return (
    <section className="relative bg-public-bone pt-12 lg:pt-16 pb-16 lg:pb-24 isolate">
      {hasImage && (
        <>
          <img
            src={heroImage}
            alt=""
            aria-hidden="true"
            loading="eager"
            fetchpriority="high"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover -z-10"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background: `
                linear-gradient(90deg,
                  rgba(244,241,235,0.96) 0%,
                  rgba(244,241,235,0.88) 35%,
                  rgba(244,241,235,0.45) 70%,
                  rgba(244,241,235,0.15) 100%
                ),
                linear-gradient(180deg,
                  rgba(244,241,235,0) 60%,
                  rgba(244,241,235,0.92) 100%
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
            src={`/storage/${sermon.thumbnail}`}
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

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="h-20 w-20 rounded-full bg-public-flame flex items-center justify-center shadow-2xl">
            <Play size={28} fill="white" className="text-white ml-1"/>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5 text-public-bone">
          <p className="tag-mono text-public-bone/70 mb-2">{t('home.lastSunday')}</p>
          <h3 className="font-display text-3xl sm:text-4xl uppercase leading-none mb-2">
            {sermon.title}
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
  if (! gallery?.length) return null

  const items = gallery.slice(0, 7)

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
          Bento aperçu : 6 tuiles uniformes en aspect-square (mobile-first),
          arrangement 2/3/3 colonnes selon breakpoint. Vidéos auto-play silencieuses
          quand visibles. Toutes les tuiles ont la même taille → cohérence garantie.
        */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
          {items.slice(0, 6).map((item) => (
            <BentoMediaTile key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// 3. NEXT STEP — Prochain culte ou live ou message + quote
// ============================================================
function NextStep({ sermon, event }) {
  const { t, i18n } = useTranslation()
  const live = useLiveStore((s) => s.current)
  // Locale date-fns selon la langue active : fr-FR ou en-US.
  const dateLocale = i18n.language?.startsWith('en') ? undefined : fr
  // Format heure : 13h pour FR, 1pm pour EN.
  const timeFormat = i18n.language?.startsWith('en') ? 'haaa' : "H'h'mm"

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
            ) : event ? (
              <Link to={`/evenements/${event.slug}`} className="block group">
                <h2 className="heading-anton text-6xl sm:text-7xl lg:text-9xl text-public-bone leading-[0.88]">
                  {event.starts_at && format(new Date(event.starts_at), 'EEEE', { locale: dateLocale })}<br/>
                  <span className="text-public-flame">
                    {event.starts_at && format(new Date(event.starts_at), timeFormat, { locale: dateLocale })}
                  </span>
                </h2>
                <p className="editorial-quote text-2xl mt-6 text-public-bone/80">{event.title}</p>
                {event.location && (
                  <p className="mt-3 text-sm text-public-bone/60 inline-flex items-center gap-2">
                    <MapPin size={14}/> {event.location}
                  </p>
                )}
                <span className="mt-6 inline-flex btn-flame">
                  {t('home.sectionEventComeCta')}
                  <ArrowUpRight size={14}/>
                </span>
              </Link>
            ) : (
              <div>
                <h2 className="heading-anton text-6xl sm:text-7xl lg:text-9xl text-public-bone leading-[0.88]">
                  {t('home.sectionSundayTitle1')}<br/>
                  <span className="text-public-flame">{t('home.sectionSundayTitle2')}</span>
                </h2>
                <p className="editorial-quote text-2xl mt-6 text-public-bone/80">
                  {t('home.sectionSundaySubtitle')}
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
              <p className="font-editorial italic text-2xl sm:text-3xl text-public-bone/90 leading-snug whitespace-pre-line">
                « {t('home.pastorQuote')} »
              </p>
              <p className="mt-4 tag-mono text-public-bone/50">
                {t('home.pastorName')}
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
// 4. TÉMOIGNAGES — 2 voix courtes
// ============================================================
function Testimonials() {
  const { t } = useTranslation()
  const items = [
    {
      name: t('home.testimonial1Name'),
      age: 23,
      role: t('home.testimonial1Role'),
      quote: t('home.testimonial1Quote'),
      color: '#FF4A1C',
    },
    {
      name: t('home.testimonial2Name'),
      age: 27,
      role: t('home.testimonial2Role'),
      quote: t('home.testimonial2Quote'),
      color: '#0A0908',
    },
  ]

  return (
    <section className="py-20 lg:py-28 bg-public-bone">
      <div className="container-nwc">
        <p className="tag-mono text-public-flame mb-3">{t('home.sectionTestimonialsLabel')}</p>
        <h2 className="heading-anton text-5xl sm:text-6xl lg:text-8xl text-public-ink leading-[0.92] mb-12 lg:mb-16">
          {t('home.sectionTestimonialsTitle')}
        </h2>

        <div className="grid grid-cols-12 gap-8 lg:gap-12">
          {items.map((item, i) => (
            <article
              key={item.name}
              className={`col-span-12 lg:col-span-6 ${i === 1 ? 'lg:translate-y-12' : ''}`}
            >
              <span
                className="font-display text-7xl sm:text-9xl block leading-none mb-2 select-none"
                style={{ color: item.color }}
              >
                «
              </span>
              <p className="editorial-quote text-3xl sm:text-4xl lg:text-5xl text-public-ink leading-tight">
                {item.quote}
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center font-display text-base text-public-bone"
                  style={{ backgroundColor: item.color }}
                >
                  {item.name[0]}
                </div>
                <div>
                  <p className="font-display uppercase text-base">{item.name}, {item.age}</p>
                  <p className="tag-mono text-public-ink/50">{item.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
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
function BentoMediaTile({ item }) {
  const isVideo = item.file_type === 'video'
  const videoRef = useAutoplayVideo({ threshold: 0.4 })

  return (
    <Link
      to="/galerie"
      style={{ aspectRatio: '1 / 1' }}
      className="w-full relative bg-public-coffee overflow-hidden group block"
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
            poster={item.thumbnail ? `/storage/${item.thumbnail}` : undefined}
            className="absolute inset-0 w-full h-full object-cover"
            preload="metadata"
            playsInline
            muted
            loop
          >
            <source src={`/storage/${item.file_path}`} type={videoMimeFromPath(item.file_path)}/>
            {item.file_path?.endsWith('.mov') && (
              <source src={`/storage/${item.file_path}`} type="video/mp4"/>
            )}
          </video>
          <div className="absolute top-2 right-2 inline-flex items-center gap-1 bg-public-ink/80 backdrop-blur-sm px-1.5 py-0.5 text-public-bone font-mono text-[9px] uppercase tracking-widest">
            <Video size={8}/> Vidéo
          </div>
        </>
      ) : (
        <img
          src={`/storage/${item.file_path}`}
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
    </Link>
  )
}
