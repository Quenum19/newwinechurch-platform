/** Détail événement + bouton inscription — palette Magazine Drop. */
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { ArrowLeft, Calendar, MapPin, Users, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import Spinner from '@/components/ui/Spinner.jsx'
import { publicEvents } from '@/api/public'
import { registerToEvent } from '@/api/events'
import { useAuthStore } from '@/store/authStore'

export default function EventDetail() {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr
  const { slug } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const { data: event, isLoading } = useQuery({
    queryKey: ['public', 'events', slug],
    queryFn: () => publicEvents.get(slug),
  })

  const registerMutation = useMutation({
    mutationFn: () => registerToEvent(event.id),
    onSuccess: () => {
      toast.success(t('events.registerSuccess', 'Inscription confirmée. À très vite !'))
      queryClient.invalidateQueries({ queryKey: ['public', 'events', slug] })
      queryClient.invalidateQueries({ queryKey: ['me', 'events'] })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || t('events.registerError', 'Inscription impossible.'))
    },
  })

  if (isLoading) {
    return <div className="bg-public-bone min-h-screen flex justify-center pt-32"><Spinner size={32}/></div>
  }
  if (! event) {
    return <div className="bg-public-bone min-h-screen container-nwc py-32 text-center text-public-ink/60">{t('events.notFound', 'Événement introuvable.')}</div>
  }

  const isPast = event.starts_at && new Date(event.starts_at) < new Date()

  const hasCover = !! event.cover_image

  return (
    <article className="bg-public-bone min-h-screen">
      {hasCover && (
        <div className="relative h-[40vh] min-h-[280px] overflow-hidden">
          <img src={`/storage/${event.cover_image}`} alt="" className="w-full h-full object-cover"/>
          <div className="absolute inset-0 bg-gradient-to-t from-public-bone via-public-bone/50 to-transparent"/>
        </div>
      )}

      {/* `-mt-20` overlap uniquement quand on a une cover image (sinon il chevauche le navbar). */}
      <div className={hasCover ? 'container-nwc -mt-20 relative' : 'container-nwc pt-12 lg:pt-16 relative'}>
        <Link to="/evenements" className="font-mono text-xs uppercase tracking-widest text-public-ink/60 hover:text-public-flame inline-flex items-center gap-1 mb-8">
          <ArrowLeft size={14}/> {t('events.back', 'Retour aux événements')}
        </Link>

        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12 pb-24">
          <div className="lg:col-span-2">
            <h1 className="heading-anton text-5xl sm:text-7xl lg:text-8xl text-public-ink leading-[0.92]">
              {event.title}
            </h1>

            <div className="mt-6 space-y-2 text-public-ink/85">
              {event.starts_at && (
                <p className="inline-flex items-center gap-2">
                  <Calendar size={16} className="text-public-flame"/>
                  <span className="font-display uppercase text-xl">
                    {format(new Date(event.starts_at), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: dateLocale })}
                  </span>
                </p>
              )}
              {event.location && (
                <p className="inline-flex items-center gap-2">
                  <MapPin size={16} className="text-public-flame"/> {event.location}
                </p>
              )}
              {event.is_online && event.online_link && (
                <p className="inline-flex items-center gap-2">
                  <ExternalLink size={16} className="text-public-flame"/>
                  <a href={event.online_link} target="_blank" rel="noopener noreferrer" className="text-public-flame hover:underline">
                    {t('events.onlineLink', 'Lien en ligne')}
                  </a>
                </p>
              )}
            </div>

            <div className="mt-10 border-l-2 border-public-flame pl-6 max-w-3xl">
              <p className="font-editorial text-xl text-public-ink/85 leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </div>
          </div>

          <aside>
            {event.registration_required && ! isPast ? (
              <div className="bg-public-coffee text-public-bone p-6 sticky top-24">
                <p className="tag-mono text-public-flame mb-3">{t('events.registrationLabel', 'Inscription')}</p>
                <h2 className="font-display uppercase text-2xl mb-4">{t('events.reserveSeat', 'Réserve ta place')}</h2>

                {event.max_attendees && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest">
                      <span className="text-public-bone/60 inline-flex items-center gap-1">
                        <Users size={11}/> {t('events.seats', 'Places')}
                      </span>
                      <span>{event.attendees_count ?? 0} / {event.max_attendees}</span>
                    </div>
                    <div className="h-1 bg-public-bone/15 mt-1.5">
                      <div
                        className="h-full bg-public-flame"
                        style={{ width: `${Math.min(100, ((event.attendees_count ?? 0) / event.max_attendees) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {event.registration_open ? (
                  isAuthenticated ? (
                    <button
                      onClick={() => registerMutation.mutate()}
                      disabled={registerMutation.isPending}
                      className="btn-flame w-full justify-center"
                    >
                      {registerMutation.isPending ? '…' : t('events.registerMe', "M'inscrire")}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        sessionStorage.setItem('nwc_redirect_after_login', `/evenements/${slug}`)
                        navigate('/connexion')
                      }}
                      className="btn-flame w-full justify-center"
                    >
                      {t('events.loginToRegister', "Connecte-toi pour t'inscrire")}
                    </button>
                  )
                ) : (
                  <p className="font-mono text-xs uppercase tracking-widest text-public-flame">{t('events.registrationsClosed', 'Inscriptions fermées')}</p>
                )}

                {event.registration_deadline && (
                  <p className="mt-4 tag-mono text-public-bone/40">
                    {t('events.deadline', 'Limite')} : {format(new Date(event.registration_deadline), 'd MMM yyyy', { locale: dateLocale })}
                  </p>
                )}
              </div>
            ) : isPast ? (
              <div className="border-2 border-public-ink/15 p-6 text-center">
                <p className="font-mono text-xs uppercase tracking-widest text-public-ink/50">{t('events.isPast', 'Cet événement est passé.')}</p>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </article>
  )
}
