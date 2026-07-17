/** Détail événement + bouton inscription — palette Magazine Drop. */
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { ArrowLeft, Calendar, MapPin, Users, ExternalLink, Image as ImageIcon } from 'lucide-react'
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
          <img src={event.cover_image} alt="" className="w-full h-full object-cover"/>
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
              {(event.display_title || event.title)}
            </h1>

            <div className="mt-6 space-y-3 text-public-ink/85">
              {event.starts_at && (
                <p className="flex items-center gap-2.5">
                  <Calendar size={16} className="text-public-flame shrink-0"/>
                  <span className="font-display uppercase text-xl">
                    {format(new Date(event.starts_at), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: dateLocale })}
                  </span>
                </p>
              )}
              {event.location && (
                <p className="flex items-center gap-2.5">
                  <MapPin size={16} className="text-public-flame shrink-0"/>
                  <span>{event.display_location || event.location}</span>
                </p>
              )}
              {event.is_online && event.online_link && (
                <p className="flex items-center gap-2.5">
                  <ExternalLink size={16} className="text-public-flame shrink-0"/>
                  <a href={event.online_link} target="_blank" rel="noopener noreferrer" className="text-public-flame hover:underline">
                    {t('events.onlineLink', 'Lien en ligne')}
                  </a>
                </p>
              )}
            </div>

            <div className="mt-10 border-l-2 border-public-flame pl-6 max-w-3xl">
              <p className="font-editorial text-xl text-public-ink/85 leading-relaxed whitespace-pre-line">
                {event.display_description || event.description}
              </p>
            </div>

            {/* Bouton "Voir la galerie" — apparaît uniquement si des médias
                sont rattachés à cet événement (count exposé par EventResource). */}
            {event.media_count > 0 && (
              <div className="mt-8">
                <Link
                  to={`/galerie?event=${event.slug}`}
                  className="group inline-flex items-center gap-2 px-5 py-3 bg-public-ink text-public-bone hover:bg-public-flame transition font-mono text-xs uppercase tracking-widest font-semibold"
                >
                  <ImageIcon size={14} strokeWidth={2.2}/>
                  {t('events.viewGallery', 'Voir la galerie')}
                  <span className="px-2 py-0.5 bg-public-flame text-public-bone group-hover:bg-public-bone group-hover:text-public-flame transition">
                    {event.media_count}
                  </span>
                </Link>
              </div>
            )}
          </div>

          <aside>
            {/* PRIORITÉ à la BILLETTERIE si activée sur l'event.
                Sinon fallback sur l'ancien système d'inscription (compte membre). */}
            {isPast ? (
              <div className="border-2 border-public-ink/15 p-6 text-center">
                <p className="font-mono text-xs uppercase tracking-widest text-public-ink/50">{t('events.isPast', 'Cet événement est passé.')}</p>
              </div>
            ) : event.ticketing_enabled ? (
              /* === Système Billetterie (Phase 1-7) === */
              <div className="bg-public-coffee text-public-bone p-6 sticky top-24">
                <p className="tag-mono text-public-flame mb-3">{t('events.ticketingLabel', 'Billetterie')}</p>
                <h2 className="font-display uppercase text-2xl mb-4">{t('events.reserveSeat', 'Réserve ta place')}</h2>

                {event.tickets_capacity > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest">
                      <span className="text-public-bone/60 inline-flex items-center gap-1">
                        <Users size={11}/> {t('events.seats', 'Places')}
                      </span>
                      <span>{event.tickets_sold ?? 0} / {event.tickets_capacity}</span>
                    </div>
                    <div className="h-1 bg-public-bone/15 mt-1.5">
                      <div
                        className="h-full bg-public-flame"
                        style={{ width: `${Math.min(100, ((event.tickets_sold ?? 0) / event.tickets_capacity) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {(event.tickets_remaining ?? 1) > 0 ? (
                  <Link
                    to={`/billetterie/${event.slug}`}
                    className="btn-flame w-full justify-center"
                  >
                    {t('events.getTicket', 'Obtenir mon ticket')}
                  </Link>
                ) : event.allow_waitlist ? (
                  <Link
                    to={`/billetterie/${event.slug}`}
                    className="w-full inline-flex items-center justify-center px-4 py-3 border-2 border-public-flame text-public-flame font-mono uppercase text-xs tracking-widest hover:bg-public-flame hover:text-public-bone transition"
                  >
                    {t('events.joinWaitlist', 'Rejoindre la liste d\'attente')}
                  </Link>
                ) : (
                  <p className="font-mono text-xs uppercase tracking-widest text-public-flame text-center py-3 border-2 border-public-flame/30">
                    {t('events.full', 'Complet')}
                  </p>
                )}

                <p className="mt-4 tag-mono text-public-bone/40 text-center">
                  {t('events.ticketByEmail', 'Ticket envoyé par email avec QR code')}
                </p>
              </div>
            ) : event.registration_required ? (
              /* === Ancien système d'inscription (compte membre obligatoire) === */
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
            ) : null}
          </aside>
        </div>
      </div>
    </article>
  )
}
