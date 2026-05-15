/**
 * Page /live — viewer Agora, palette Magazine Drop.
 *
 * Si live actif :
 *   1. Récupère le token via /api/live/{id}/token
 *   2. Joint le channel Agora en mode SUBSCRIBER
 * Sinon : "Aucun direct" + prochain live planifié.
 */
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Radio, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'

import Spinner from '@/components/ui/Spinner.jsx'
import { useLiveStore } from '@/store/liveStore'
import { getViewerToken, getNextLive } from '@/api/live'

export default function LivePage() {
  const { t } = useTranslation()
  const current = useLiveStore((s) => s.current)

  if (! current) return <NoLive t={t} />
  return <ActiveLive stream={current} t={t} />
}

function NoLive({ t }) {
  const { i18n } = useTranslation()
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr
  const { data: next } = useQuery({
    queryKey: ['live', 'next'],
    queryFn: getNextLive,
  })

  return (
    <div className="bg-public-bone min-h-screen">
      <section className="container-nwc min-h-[70vh] flex items-center justify-center text-center px-4 py-20">
        <div className="max-w-2xl">
          <Radio size={64} className="mx-auto text-public-ink/20 mb-6"/>
          <p className="tag-mono text-public-flame mb-3">{t('livePage.title', 'Live')}</p>
          <h1 className="heading-anton text-5xl sm:text-7xl text-public-ink leading-[0.92]">
            {t('live.noStream')}
          </h1>
          <p className="mt-6 editorial-quote text-xl text-public-ink/80 max-w-lg mx-auto">
            {t('livePage.noStreamDesc', 'Reviens un dimanche dès 13h00, ou consulte le planning des prochains directs.')}
          </p>

          {next?.id && (
            <div className="mt-12 bg-public-coffee text-public-bone p-6 text-left max-w-md mx-auto">
              <p className="tag-mono text-public-flame inline-flex items-center gap-1 mb-2">
                <Calendar size={12}/> {t('livePage.nextLive', 'Prochain direct')}
              </p>
              <h2 className="font-display uppercase text-2xl">{next.title}</h2>
              {next.scheduled_at && (
                <p className="mt-2 font-editorial text-public-bone/85">
                  {format(new Date(next.scheduled_at), "EEEE d MMMM 'à' HH'h'mm", { locale: dateLocale })}
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function ActiveLive({ stream, t }) {
  const [tokenInfo, setTokenInfo] = useState(null)
  const [error, setError] = useState(null)
  const [connecting, setConnecting] = useState(true)
  const containerRef = useRef(null)
  const clientRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    getViewerToken(stream.id)
      .then((data) => { if (! cancelled) setTokenInfo(data) })
      .catch(() => { if (! cancelled) setError(t('live.notConfigured')) })
    return () => { cancelled = true }
  }, [stream.id, t])

  useEffect(() => {
    if (! tokenInfo || ! tokenInfo.configured || ! tokenInfo.token) {
      if (tokenInfo && ! tokenInfo.configured) setError(t('live.notConfigured'))
      return
    }

    let mounted = true

    import('agora-rtc-sdk-ng').then(({ default: AgoraRTC }) => {
      if (! mounted) return

      const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' })
      clientRef.current = client
      client.setClientRole('audience')

      const handleUserPublished = async (user, mediaType) => {
        await client.subscribe(user, mediaType)
        if (mediaType === 'video' && containerRef.current) {
          user.videoTrack?.play(containerRef.current)
        }
        if (mediaType === 'audio') {
          user.audioTrack?.play()
        }
      }
      const handleUserUnpublished = (user, mediaType) => {
        if (mediaType === 'video') user.videoTrack?.stop()
      }

      client.on('user-published', handleUserPublished)
      client.on('user-unpublished', handleUserUnpublished)

      client.join(tokenInfo.app_id, tokenInfo.channel_name, tokenInfo.token, tokenInfo.uid)
        .then(() => setConnecting(false))
        .catch((err) => setError(t('livePage.joinError', 'Impossible de rejoindre le live : ') + err.message))
    })

    return () => {
      mounted = false
      const client = clientRef.current
      if (client) {
        client.removeAllListeners()
        client.leave().catch(() => {})
      }
    }
  }, [tokenInfo, t])

  return (
    <div className="bg-public-bone min-h-screen">
      <div className="container-nwc py-8 lg:py-12">
        <div className="flex items-center gap-3 mb-6">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-public-flame text-public-bone font-mono text-[10px] uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-public-bone animate-pulse"/>
            {t('live.badge')}
          </span>
          <h1 className="font-display uppercase text-2xl md:text-4xl text-public-ink leading-tight">{stream.title}</h1>
        </div>

        <div className="aspect-video bg-public-ink overflow-hidden relative">
          <div ref={containerRef} className="w-full h-full"/>
          {connecting && ! error && (
            <div className="absolute inset-0 flex items-center justify-center bg-public-ink/85">
              <div className="text-center">
                <Spinner size={32}/>
                <p className="mt-3 tag-mono text-public-bone/60">{t('live.joining')}</p>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-public-ink/95 px-6">
              <div className="text-center max-w-md">
                <p className="font-display uppercase text-2xl text-public-flame">{error}</p>
                <p className="mt-3 tag-mono text-public-bone/40">
                  {t('livePage.youtubeHint', 'Si ce live est sur YouTube, demande au pasteur le lien de la chaîne.')}
                </p>
              </div>
            </div>
          )}
        </div>

        {stream.description && (
          <div className="mt-8 border-l-2 border-public-flame pl-6 max-w-3xl">
            <p className="font-editorial text-xl text-public-ink/85 leading-relaxed whitespace-pre-line">
              {stream.description}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
