/**
 * Page publique d'une série — hero album + liste chronologique des messages.
 * URL : /messages/series/:slug
 */
import { useQuery } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Layers, Play, Headphones, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import Spinner from '@/components/ui/Spinner.jsx'
import { publicSermonSeries } from '@/api/public'

export default function SermonSeriesDetail() {
  const { t } = useTranslation()
  const { slug } = useParams()
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public', 'sermon-series', slug],
    queryFn: () => publicSermonSeries.get(slug),
    enabled: !!slug,
  })

  if (isLoading) return <div className="flex justify-center py-32"><Spinner size={32}/></div>
  if (isError || !data?.series?.data) return (
    <div className="container-nwc py-32 text-center">
      <p className="font-display uppercase text-3xl text-public-ink">{t('series.notFound', 'Série introuvable.')}</p>
      <Link to="/messages" className="btn-outline-ink mt-6 inline-flex">
        <ArrowLeft size={14}/> {t('series.backToList', 'Retour aux messages')}
      </Link>
    </div>
  )

  const series = data.series.data
  const sermons = data.sermons?.data ?? []

  return (
    <div className="bg-public-bone min-h-screen">
      {/* Hero album */}
      <section className="relative bg-public-ink text-public-bone overflow-hidden">
        {series.cover_image && (
          <>
            <img
              src={series.cover_image}
              alt={series.display_title || series.title}
              className="absolute inset-0 w-full h-full object-cover opacity-30"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-public-ink via-public-ink/70 to-transparent" />
          </>
        )}
        <div className="container-nwc relative py-20 lg:py-28">
          <button
            onClick={() => navigate('/messages')}
            className="inline-flex items-center gap-1 text-xs uppercase tracking-widest font-mono text-public-bone/70 hover:text-public-flame transition mb-8"
          >
            <ArrowLeft size={12}/> {t('series.backToList', 'Tous les messages')}
          </button>

          <p className="tag-mono text-public-flame mb-4">
            <Layers size={11} className="inline mr-1" />
            {t('series.eyebrow', 'Série')}
          </p>

          <h1 className="heading-anton text-[14vw] sm:text-[10vw] lg:text-[7rem] leading-[0.88] text-public-bone max-w-5xl">
            {series.display_title || series.title}
          </h1>

          {(series.display_description || series.description) && (
            <p className="editorial-quote text-xl sm:text-2xl mt-8 max-w-2xl text-public-bone/85">
              {series.display_description || series.description}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-mono uppercase tracking-widest text-public-bone/60">
            {(series.started_at || series.ended_at) && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={11}/>
                {series.started_at && format(new Date(series.started_at), 'MMM yyyy', { locale: fr })}
                {series.ended_at ? ` → ${format(new Date(series.ended_at), 'MMM yyyy', { locale: fr })}` : (series.started_at ? ' → …' : '')}
              </span>
            )}
            <span>
              {sermons.length} {sermons.length > 1 ? t('series.messages', 'messages') : t('series.message', 'message')}
            </span>
          </div>
        </div>
      </section>

      {/* Liste des sermons */}
      <section className="container-nwc py-16 lg:py-24">
        <header className="flex items-end justify-between mb-8 gap-4">
          <h2 className="font-display uppercase text-3xl text-public-ink">
            {t('series.allMessages', 'Tous les messages')}
          </h2>
          <span className="tag-mono text-public-ink/50">
            {t('series.chronoOrder', 'Ordre chronologique')}
          </span>
        </header>

        {sermons.length === 0 ? (
          <div className="border-2 border-public-ink/15 p-12 text-center">
            <p className="font-display uppercase text-2xl text-public-ink">
              {t('series.empty', 'Aucun message dans cette série pour le moment.')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sermons.map((s, i) => <SermonItem key={s.id} sermon={s} index={i + 1} />)}
          </div>
        )}
      </section>
    </div>
  )
}

function SermonItem({ sermon, index }) {
  const { t } = useTranslation()
  const Icon = sermon.type === 'audio' ? Headphones : Play
  return (
    <Link
      to={`/messages/${sermon.slug}`}
      className="group flex items-center gap-4 sm:gap-6 p-4 sm:p-5 border-2 border-public-ink/10 hover:border-public-ink transition bg-public-bone"
    >
      <span className="font-display text-3xl sm:text-4xl tabular-nums w-12 sm:w-16 shrink-0 text-public-flame">
        {String(index).padStart(2, '0')}
      </span>

      <div className="hidden sm:block w-32 lg:w-40 aspect-video relative bg-public-coffee overflow-hidden shrink-0">
        {sermon.thumbnail ? (
          <img src={sermon.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full flex items-center justify-center text-public-flame/60">
            <Icon size={28}/>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-public-flame text-public-bone font-mono text-[10px] uppercase tracking-widest">
            <Icon size={9}/>
            {sermon.type === 'audio' ? t('media.audio', 'Audio') : t('media.video', 'Vidéo')}
            {sermon.duration_seconds && <> · {Math.round(sermon.duration_seconds / 60)}{t('common.minutesShort', 'min')}</>}
          </span>
          {sermon.sermon_date && (
            <span className="text-[10px] uppercase tracking-widest font-mono text-public-ink/50">
              {format(new Date(sermon.sermon_date), 'dd MMM yyyy', { locale: fr })}
            </span>
          )}
        </div>
        <h3 className="font-display uppercase text-xl sm:text-2xl text-public-ink group-hover:text-public-flame transition-colors leading-tight">
          {sermon.display_title || sermon.title}
        </h3>
        {sermon.scripture_reference && (
          <p className="font-editorial italic text-public-flame/80 text-sm mt-1">
            {sermon.scripture_reference}
          </p>
        )}
        {sermon.speaker?.name && (
          <p className="mt-2 tag-mono text-public-ink/50">{sermon.speaker.name}</p>
        )}
      </div>

      <Play size={18} className="text-public-ink/40 group-hover:text-public-flame transition-colors shrink-0"/>
    </Link>
  )
}
