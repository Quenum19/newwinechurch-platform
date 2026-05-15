/** Détail sermon — palette Magazine Drop. */
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Play, Headphones, BookOpen } from 'lucide-react'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'

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
      <article className="container-nwc py-12 lg:py-16">
        <Link to="/messages" className="font-mono text-xs uppercase tracking-widest text-public-ink/60 hover:text-public-flame transition-colors inline-flex items-center gap-1 mb-8">
          <ArrowLeft size={14}/> {t('sermons.back', 'Tous les messages')}
        </Link>

        <header className="max-w-4xl mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-public-flame text-public-bone font-mono text-[10px] uppercase tracking-widest">
              {sermon.type === 'audio' ? <Headphones size={9}/> : <Play size={9}/>}
              {sermon.type === 'audio' ? t('media.audio', 'Audio') : t('media.video', 'Vidéo')}
            </span>
            {sermon.sermon_date && (
              <span className="tag-mono text-public-ink/50">
                {format(new Date(sermon.sermon_date), 'd MMMM yyyy', { locale: dateLocale })}
              </span>
            )}
            {sermon.duration_human && <span className="tag-mono text-public-ink/50">· {sermon.duration_human}</span>}
          </div>

          <h1 className="heading-anton text-5xl sm:text-7xl lg:text-9xl text-public-ink leading-[0.92]">
            {sermon.title}
          </h1>

          {sermon.scripture_reference && (
            <p className="mt-6 editorial-quote text-3xl text-public-flame inline-flex items-center gap-2">
              <BookOpen size={24}/> {sermon.scripture_reference}
            </p>
          )}
          {sermon.speaker?.name && (
            <p className="mt-5 tag-mono text-public-ink/60">
              <span className="text-public-ink">{sermon.speaker.name}</span> — {t('sermons.preacher', 'Prédicateur')}
            </p>
          )}
        </header>

        {/* Player */}
        <div className="aspect-video bg-public-ink overflow-hidden mb-10">
          {sermon.youtube_url ? (
            <iframe
              src={toYouTubeEmbed(sermon.youtube_url)}
              title={sermon.title}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          ) : sermon.video_url ? (
            <video
              src={sermon.video_url}
              controls
              playsInline
              className="w-full h-full"
              poster={sermon.thumbnail ? `/storage/${sermon.thumbnail}` : undefined}
            />
          ) : sermon.audio_url ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-public-flame to-public-coffee p-6">
              <audio src={sermon.audio_url} controls className="w-full max-w-xl"/>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-public-bone/40 font-mono text-sm uppercase tracking-widest">
              {t('sermons.noMedia', 'Pas de média associé pour le moment.')}
            </div>
          )}
        </div>

        {sermon.description && (
          <div className="border-l-2 border-public-flame pl-6 max-w-3xl">
            <p className="tag-mono text-public-ink/50 mb-3">{t('sermons.aboutMessage', 'À propos de ce message')}</p>
            <p className="font-editorial text-xl text-public-ink/85 leading-relaxed whitespace-pre-line">
              {sermon.description}
            </p>
          </div>
        )}

        {sermon.series && (
          <div className="mt-10 inline-block bg-public-coffee text-public-bone p-5 max-w-md">
            <p className="tag-mono text-public-flame mb-1">{t('sermons.partOfSeries', 'Fait partie de la série')}</p>
            <p className="font-display uppercase text-xl">{sermon.series.title}</p>
          </div>
        )}
      </article>
    </div>
  )
}

function toYouTubeEmbed(url) {
  if (! url) return ''
  const m = url.match(/(?:youtu\.be\/|v=)([\w-]{6,})/)
  if (m) return `https://www.youtube.com/embed/${m[1]}`
  return url
}
