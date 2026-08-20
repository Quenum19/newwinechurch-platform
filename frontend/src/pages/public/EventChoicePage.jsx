/**
 * EventChoicePage — Étape 2 de l'inscription par magic-link.
 *
 * URL : /evenements/:slug/choix?token=xxx
 *
 * L'utilisateur choisit son "option" (montagne / atelier / table selon
 * le workflow configuré sur l'event). Une fois validé, un ticket
 * gratuit est généré côté serveur et envoyé par email (si activé).
 *
 * Sur Festi Grill '26 : choix parmi les 7 sphères d'influence.
 */
import { useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Check, AlertCircle, ArrowLeft, Loader2, Ticket, Mail } from 'lucide-react'
import api from '@/api/axios'
import Spinner from '@/components/ui/Spinner.jsx'

export default function EventChoicePage() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [selected, setSelected] = useState(null)
  const [done, setDone] = useState(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['public', 'registration-choice', token],
    queryFn: () => api.get(`/public/registrations/${token}`).then((r) => r.data),
    enabled: !! token,
    retry: false,
  })

  const submit = useMutation({
    mutationFn: (choice) => api.post(`/public/registrations/${token}/choose`, { choice }).then((r) => r.data),
    onSuccess: (res) => setDone(res),
  })

  if (! token) return <NotRegisteredScreen slug={slug}/>
  if (isLoading) return <Loader/>
  if (error) {
    // Token invalide/expiré = probablement pas encore préinscrit → oriente
    // vers la page d'inscription plutôt que d'afficher un simple "erreur".
    return <NotRegisteredScreen slug={slug}/>
  }

  const { registration, event, workflow, options } = data

  // Déjà ticketé : afficher la confirmation avec short_code
  if (registration.step === 'ticketed' && ! done) {
    return (
      <TicketConfirmationScreen
        event={event}
        firstName={registration.first_name}
        email={registration.email}
        shortCode={null}
        alreadyDone
      />
    )
  }

  // Succès après validation
  if (done) {
    return (
      <TicketConfirmationScreen
        event={event}
        firstName={registration.first_name}
        email={registration.email}
        shortCode={done.short_code}
      />
    )
  }

  return (
    <article className="bg-public-bone min-h-screen">
      {/* Hero image event — même bandeau que /inscription pour cohérence
          visuelle. Fallback silencieux si cover_image absente. */}
      {event.cover_image && (
        <div className="relative w-full overflow-hidden" style={{ height: 'clamp(200px, 32vw, 380px)' }}>
          <img
            src={event.cover_image}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-public-bone to-transparent"/>
        </div>
      )}
      <div className="container-nwc py-12 max-w-2xl">
        <Link
          to={`/evenements/${slug}`}
          className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-public-ink/60 hover:text-public-flame mb-6"
        >
          <ArrowLeft size={12}/> Retour à l'événement
        </Link>

        <header className="mb-8">
          <p className="tag-mono text-public-flame mb-2">
            Étape 2 · Choix de ta montagne
          </p>
          <h1 className="heading-anton text-4xl sm:text-5xl text-public-ink leading-tight">
            Bonjour {registration.first_name} 👋
          </h1>
          <p className="mt-3 text-lg text-public-ink/70 leading-relaxed">
            À {event.title}, tu vas découvrir les 7 <strong>sphères d'influence</strong>.
            Choisis celle qui t'attire le plus — tu seras dirigé vers son atelier le jour J.
          </p>
        </header>

        {workflow === 'mountain' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(options).map(([key, label]) => {
                const isSelected = selected === key
                return (
                  <button
                    key={key}
                    onClick={() => setSelected(key)}
                    className={`p-5 border-2 text-left transition ${
                      isSelected
                        ? 'border-public-flame bg-public-flame text-public-bone'
                        : 'border-public-ink/15 bg-white text-public-ink hover:border-public-flame/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-display uppercase text-lg leading-tight">{label}</span>
                      {isSelected && <Check size={20} className="shrink-0"/>}
                    </div>
                  </button>
                )
              })}
            </div>

            {submit.error && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0"/>
                <p>{submit.error?.response?.data?.message || 'Une erreur est survenue.'}</p>
              </div>
            )}

            <button
              disabled={! selected || submit.isPending}
              onClick={() => submit.mutate(selected)}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 py-3 bg-public-flame text-public-bone hover:bg-public-ink transition font-mono text-sm uppercase tracking-widest font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submit.isPending ? <><Loader2 size={16} className="animate-spin"/> Envoi…</> : "Confirmer mon choix & recevoir mon ticket"}
            </button>
            <p className="mt-3 text-center text-[10px] text-public-ink/50 font-mono uppercase tracking-widest">
              Ton ticket avec QR code te sera envoyé par email
            </p>
          </>
        )}

        {! workflow && (
          <div className="text-center py-16 text-public-ink/60">
            <p>Aucun choix n'est requis pour cet événement.</p>
          </div>
        )}
      </div>
    </article>
  )
}

// ============================================================================

function Loader() {
  return <div className="bg-public-bone min-h-screen flex items-center justify-center"><Spinner size={32}/></div>
}

function ErrorScreen({ message }) {
  return (
    <div className="bg-public-bone min-h-screen flex items-center justify-center">
      <div className="max-w-md text-center p-8">
        <AlertCircle size={40} className="mx-auto text-public-ink/30 mb-4"/>
        <p className="font-display uppercase text-2xl text-public-ink mb-2">Lien invalide</p>
        <p className="text-public-ink/60">{message}</p>
        <Link to="/evenements" className="mt-6 inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-public-flame hover:underline">
          <ArrowLeft size={12}/> Voir les événements
        </Link>
      </div>
    </div>
  )
}

/**
 * Écran affiché quand l'utilisateur arrive sur /choix sans token OU avec un
 * token invalide (probablement pas encore préinscrit). Le lien magic-link
 * n'est envoyé qu'aux préinscrits — sans préinscription, aucun choix
 * possible. On oriente vers /inscription avec un message explicite.
 */
function NotRegisteredScreen({ slug }) {
  return (
    <div className="bg-public-bone min-h-screen flex items-center justify-center">
      <div className="max-w-md text-center p-8">
        <AlertCircle size={40} className="mx-auto text-public-flame mb-4"/>
        <p className="font-display uppercase text-2xl text-public-ink mb-2">
          Tu dois d'abord te pré-inscrire
        </p>
        <p className="text-public-ink/70 leading-relaxed">
          Le choix de la montagne est réservé aux personnes déjà pré-inscrites.
          Commence par la pré-inscription en 30 secondes, puis reviens sur ton
          lien personnel (envoyé par email/WhatsApp) pour choisir ta sphère
          et recevoir ton ticket.
        </p>
        <Link
          to={`/evenements/${slug}/inscription`}
          className="mt-8 inline-flex items-center justify-center gap-2 px-6 py-3 bg-public-flame text-public-bone hover:bg-public-ink transition font-mono text-xs uppercase tracking-widest font-semibold"
        >
          Je me pré-inscris
        </Link>
        <div className="mt-4">
          <Link to={`/evenements/${slug}`} className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-public-ink/60 hover:text-public-flame">
            <ArrowLeft size={12}/> Voir l'événement
          </Link>
        </div>
      </div>
    </div>
  )
}

function StatusScreen({ event, title, message, icon }) {
  return (
    <article className="bg-public-bone min-h-screen">
      <div className="container-nwc py-16 max-w-xl text-center">
        {icon && <div className="mb-6 flex justify-center">{icon}</div>}
        <p className="tag-mono text-public-flame mb-3">{event?.title}</p>
        <h1 className="heading-anton text-4xl sm:text-5xl text-public-ink mb-4">{title}</h1>
        <p className="text-lg text-public-ink/70 leading-relaxed">{message}</p>
        <Link to={`/evenements/${event?.slug ?? ''}`} className="mt-8 inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-public-flame hover:underline">
          <ArrowLeft size={12}/> Voir l'événement
        </Link>
      </div>
    </article>
  )
}

/**
 * Écran de confirmation post-choix montagne — design premium avec hero
 * de l'affiche + message pro sur l'envoi email.
 * Utilisé pour les 2 cas : "déjà ticketé" (arrivée après-coup) ET "succès
 * après validation" (juste après le POST /choose).
 */
function TicketConfirmationScreen({ event, firstName, email, shortCode, alreadyDone }) {
  return (
    <article className="bg-public-bone min-h-screen">
      {/* Hero affiche event — même bandeau que /inscription et /choix */}
      {event?.cover_image && (
        <div className="relative w-full overflow-hidden" style={{ height: 'clamp(200px, 32vw, 380px)' }}>
          <img src={event.cover_image} alt="" className="w-full h-full object-cover"/>
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-public-bone to-transparent"/>
        </div>
      )}

      <div className="container-nwc max-w-2xl -mt-16 relative pb-16">
        {/* Card centrale premium avec l'icône check + le message */}
        <div className="bg-white border-2 border-public-flame p-8 sm:p-12 text-center shadow-xl">
          <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-public-flame flex items-center justify-center">
            <Check size={36} className="text-public-bone" strokeWidth={3}/>
          </div>

          <p className="tag-mono text-public-flame mb-3">{event?.title}</p>
          <h1 className="heading-anton text-3xl sm:text-4xl text-public-ink mb-4 leading-tight">
            {alreadyDone
              ? <>Ta place est déjà confirmée{firstName ? `, ${firstName}` : ''}</>
              : <>C'est confirmé{firstName ? `, ${firstName}` : ''} — on se voit sur place</>
            }
          </h1>
          <p className="text-lg text-public-ink/70 leading-relaxed mb-8">
            Merci d'avoir choisi ta sphère d'influence.
            {shortCode && <> Ton code de secours : <strong className="text-public-ink font-mono">{shortCode}</strong>.</>}
          </p>

          {/* Bloc email — le CTA principal après validation */}
          <div className="bg-public-bone border-l-4 border-public-flame p-5 text-left">
            <div className="flex items-start gap-3">
              <Mail size={20} className="text-public-flame shrink-0 mt-0.5"/>
              <div className="text-sm text-public-ink/80 leading-relaxed">
                <p className="font-semibold text-public-ink mb-1">
                  Ton ticket avec QR code arrive par email
                </p>
                <p>
                  Vérifie ta boîte mail{email && <> à <strong className="text-public-ink">{email}</strong></>}
                  {' '}dans les prochaines minutes. Pense à jeter un œil au dossier
                  <strong className="text-public-ink"> spams / promotions</strong> s'il n'apparaît pas.
                  Présente le QR à l'entrée le jour J.
                </p>
              </div>
            </div>
          </div>

          <Link
            to={`/evenements/${event?.slug ?? ''}`}
            className="mt-8 inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-public-flame hover:underline"
          >
            <ArrowLeft size={12}/> Retour à l'événement
          </Link>
        </div>
      </div>
    </article>
  )
}
