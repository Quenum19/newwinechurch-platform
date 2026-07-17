/**
 * SermonDetail — refonte 2026, expérience type YouTube/Vimeo éditorial.
 *
 * Améliorations vs version précédente :
 *   - Player CADRÉ (max-w-5xl) au lieu de full-width = focus sur le contenu
 *   - YouTube embed avec params propres : rel=0 (pas de reco externe),
 *     modestbranding=1, youtube-nocookie.com, sans annotations
 *   - Layout 2 colonnes desktop : player gauche, méta sidebar droite
 *   - Title compact (4xl-6xl) au lieu de 9xl illisible
 *   - Carte "Série" cliquable vers la collection complète
 *   - Bouton Partage + Copier le lien
 *   - États audio/vidéo/youtube distincts avec UI dédiée à chaque format
 */
import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Play, Headphones, BookOpen, Calendar, Clock,
  Share2, Link as LinkIcon, Mic,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'

import Spinner from '@/components/ui/Spinner.jsx'
import { publicSermons } from '@/api/public'

export default function SermonDetail() {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr
  const { slug } = useParams()
  const { data: sermon, isLoading } = useQuery({
    queryKey: ['public', 'sermons', slug],
    queryFn: () => publicSermons.get(slug),
  })

  if (isLoading) {
    return (
      <div className="bg-public-bone min-h-screen flex justify-center items-center pt-32">
        <Spinner size={32}/>
      </div>
    )
  }
  if (! sermon) {
    return (
      <div className="bg-public-bone min-h-screen container-nwc py-32 text-center text-public-ink/60">
        {t('sermons.notFound', 'Message introuvable.')}
      </div>
    )
  }

  return (
    <div className="bg-public-bone min-h-screen">
      <div className="container-nwc py-8 lg:py-12 max-w-7xl">
        {/* Back link */}
        <Link
          to="/messages"
          className="font-mono text-xs uppercase tracking-widest text-public-ink/60 hover:text-public-flame transition-colors inline-flex items-center gap-1 mb-6"
        >
          <ArrowLeft size={14}/> {t('sermons.back', 'Tous les messages')}
        </Link>

        {/* Grid 2-col desktop : player principal + sidebar méta */}
        <div className="grid lg:grid-cols-3 gap-8 lg:gap-10">
          {/* === COL PRINCIPALE — Player + titre + description === */}
          <div className="lg:col-span-2 space-y-6">
            {/* Player cadré 16:9 max-w-5xl avec coins arrondis */}
            <SermonPlayer sermon={sermon} t={t} />

            {/* Type badge + date + durée — bandeau méta sous le player */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-public-flame text-public-bone font-mono uppercase tracking-widest text-[10px]">
                {sermon.youtube_url || sermon.video_url ? <Play size={9}/> : <Headphones size={9}/>}
                {sermon.youtube_url ? 'YouTube' : sermon.video_url ? t('media.video', 'Vidéo') : t('media.audio', 'Audio')}
              </span>
              {sermon.sermon_date && (
                <span className="inline-flex items-center gap-1.5 text-public-ink/60 font-mono">
                  <Calendar size={12}/>
                  {format(new Date(sermon.sermon_date), 'd MMMM yyyy', { locale: dateLocale })}
                </span>
              )}
              {sermon.duration_human && (
                <span className="inline-flex items-center gap-1.5 text-public-ink/60 font-mono">
                  <Clock size={12}/> {sermon.duration_human}
                </span>
              )}
              {sermon.views_count > 0 && (
                <span className="text-public-ink/50 font-mono">
                  {sermon.views_count.toLocaleString()} {t('sermons.views', 'vues')}
                </span>
              )}
              <ShareButton sermon={sermon} t={t} />
            </div>

            {/* Titre — taille raisonnable, focus lisibilité */}
            <h1 className="heading-anton text-4xl sm:text-5xl lg:text-6xl text-public-ink leading-[0.95] tracking-tight">
              {sermon.display_title || sermon.title}
            </h1>

            {/* Scripture reference (si présente) */}
            {sermon.scripture_reference && (
              <p className="editorial-quote text-2xl sm:text-3xl text-public-flame inline-flex items-center gap-2">
                <BookOpen size={22}/> {sermon.scripture_reference}
              </p>
            )}

            {/* Description */}
            {(sermon.display_description || sermon.description) && (
              <div className="pt-4 border-t border-public-ink/10">
                <p className="tag-mono text-public-ink/50 mb-3 text-xs">
                  {t('sermons.aboutMessage', 'À propos de ce message')}
                </p>
                <p className="font-editorial text-lg sm:text-xl text-public-ink/85 leading-relaxed whitespace-pre-line">
                  {sermon.display_description || sermon.description}
                </p>
              </div>
            )}
          </div>

          {/* === SIDEBAR — Méta auxiliaires === */}
          <aside className="space-y-5">
            {/* Prédicateur */}
            {sermon.speaker?.name && (
              <div className="bg-white/40 backdrop-blur-sm border border-public-ink/10 rounded-lg p-5">
                <p className="tag-mono text-public-flame mb-3 text-[10px] uppercase tracking-widest">
                  {t('sermons.preacher', 'Prédicateur')}
                </p>
                <div className="flex items-center gap-3">
                  {sermon.speaker.avatar ? (
                    <img
                      src={sermon.speaker.avatar}
                      alt=""
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-public-coffee text-public-bone flex items-center justify-center">
                      <Mic size={22}/>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-display text-lg text-public-ink truncate">
                      {sermon.speaker.name}
                    </p>
                    <p className="text-xs text-public-ink/50 mt-0.5">
                      {t('sermons.preacher', 'Prédicateur')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Série */}
            {sermon.series && (
              <Link
                to={`/messages/series/${sermon.series.slug}`}
                className="block bg-public-coffee text-public-bone rounded-lg p-5 transition hover:scale-[1.02] hover:shadow-lg group"
              >
                <p className="tag-mono text-public-flame mb-2 text-[10px] uppercase tracking-widest">
                  {t('sermons.partOfSeries', 'Fait partie de la série')}
                </p>
                <p className="font-display uppercase text-xl group-hover:underline underline-offset-4">
                  {sermon.series.display_title || sermon.series.title}
                </p>
                <p className="mt-3 text-sm text-public-bone/70 inline-flex items-center gap-1">
                  {t('sermons.viewSeries', 'Voir la série')} →
                </p>
              </Link>
            )}

            {/* Thèmes / tags — cliquables vers la page Archives filtrée. */}
            {sermon.themes?.length > 0 && (
              <div className="bg-white/40 backdrop-blur-sm border border-public-ink/10 rounded-lg p-5">
                <p className="tag-mono text-public-flame mb-3 text-[10px] uppercase tracking-widest">
                  {t('sermons.themes', 'Thèmes')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {sermon.themes.map((tm) => {
                    const color = tm.color || '#0A0908'
                    return (
                      <Link
                        key={tm.id}
                        to={`/messages?theme=${tm.slug}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono uppercase tracking-wider border transition hover:scale-105"
                        style={{ borderColor: color + '55', background: color + '15', color: 'var(--public-ink, #0A0908)' }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                        {tm.name}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Bouton télécharger si video_url (fichier hébergé) */}
            {(sermon.video_url || sermon.audio_url) && (
              <a
                href={sermon.video_url || sermon.audio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-public-flame text-public-bone rounded-lg p-4 text-center font-mono uppercase tracking-widest text-xs transition hover:bg-public-coffee"
              >
                ↓ {t('sermons.download', 'Télécharger le fichier')}
              </a>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

/**
 * Player vidéo/audio/youtube — cadré, design clean, responsive 16:9.
 * Utilise youtube-nocookie.com + params anti-distraction pour YouTube.
 */
function SermonPlayer({ sermon, t }) {
  if (sermon.youtube_url) {
    return (
      <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-2xl shadow-public-ink/20 ring-1 ring-public-ink/10">
        <iframe
          src={toYouTubeEmbed(sermon.youtube_url)}
          title={sermon.display_title || sermon.title}
          className="w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    )
  }
  if (sermon.video_url) {
    return (
      <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-2xl shadow-public-ink/20 ring-1 ring-public-ink/10">
        <video
          src={sermon.video_url}
          controls
          playsInline
          preload="metadata"
          className="w-full h-full"
          poster={sermon.thumbnail || undefined}
        />
      </div>
    )
  }
  if (sermon.audio_url) {
    return (
      <div className="aspect-video bg-gradient-to-br from-public-flame via-public-coffee to-public-ink rounded-lg overflow-hidden shadow-2xl shadow-public-ink/20 ring-1 ring-public-ink/10 flex flex-col items-center justify-center p-8 relative">
        {sermon.thumbnail && (
          <img
            src={sermon.thumbnail}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-2xl">
          <div className="h-24 w-24 rounded-full bg-public-bone/20 backdrop-blur-md flex items-center justify-center ring-4 ring-public-bone/30">
            <Headphones size={48} className="text-public-bone" />
          </div>
          <p className="font-mono text-public-bone/80 text-xs uppercase tracking-widest">
            {t('media.audio', 'Audio')}
          </p>
          <audio
            src={sermon.audio_url}
            controls
            preload="metadata"
            className="w-full"
          />
        </div>
      </div>
    )
  }
  return (
    <div className="aspect-video bg-public-coffee/20 rounded-lg overflow-hidden ring-1 ring-public-ink/10 flex items-center justify-center">
      <p className="text-public-ink/40 font-mono text-sm uppercase tracking-widest">
        {t('sermons.noMedia', 'Pas de média associé pour le moment.')}
      </p>
    </div>
  )
}

/**
 * Bouton de partage — copie le lien dans le presse-papiers, fallback
 * navigator.share sur mobile.
 */
function ShareButton({ sermon, t }) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = window.location.href
    const title = sermon.display_title || sermon.title
    if (navigator.share) {
      try {
        await navigator.share({ url, title, text: (sermon.display_description || sermon.description)?.slice(0, 100) })
        return
      } catch {
        // Annulé par l'utilisateur, on tombe sur le copy
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success(t('sermons.linkCopied', 'Lien copié'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Erreur')
    }
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 text-public-ink/60 hover:text-public-flame transition font-mono"
      title={t('sermons.share', 'Partager')}
    >
      {copied ? <LinkIcon size={12}/> : <Share2 size={12}/>}
      {copied ? t('sermons.linkCopied', 'Copié') : t('sermons.share', 'Partager')}
    </button>
  )
}

/**
 * Convertit n'importe quelle URL YouTube vers /embed/ID avec des paramètres
 * propres :
 *   - youtube-nocookie.com pour le tracking minimal
 *   - rel=0 : ne montre QUE les vidéos de la chaîne dans les suggestions
 *   - modestbranding=1 : retire le logo YouTube
 *   - iv_load_policy=3 : pas d'annotations
 *   - color=white : barre de progression blanche (style cohérent)
 */
function toYouTubeEmbed(url) {
  if (! url) return ''
  const m = url.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([\w-]{6,})/i
  )
  if (! m) return url
  const videoId = m[1]
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    color: 'white',
    playsinline: '1',
  })
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`
}
