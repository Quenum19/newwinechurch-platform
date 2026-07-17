/** Détail event + formulaire d'inscription billetterie (1 page). */
import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Calendar, MapPin, Clock, Users, Ticket, AlertTriangle,
  Plus, Minus, Trash2, Camera, ArrowLeft, Loader2, CheckCircle2, Phone,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'react-hot-toast'

import Spinner from '@/components/ui/Spinner.jsx'
import { publicTickets } from '@/api/public'

export default function TicketEventPage() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['public', 'tickets', 'event', slug],
    queryFn: () => publicTickets.show(slug),
    staleTime: 30 * 1000,
  })

  const event = data?.event
  const meta = data?.meta ?? {}
  const ticketTypes = data?.ticket_types ?? []

  if (isLoading) {
    return <div className="min-h-screen bg-public-bone flex items-center justify-center"><Spinner size={32}/></div>
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-public-bone flex flex-col items-center justify-center px-4">
        <p className="font-display uppercase text-3xl text-public-ink">Événement introuvable</p>
        <Link to="/billetterie" className="mt-4 inline-flex items-center gap-2 text-public-flame underline">
          <ArrowLeft size={16}/> Retour à la billetterie
        </Link>
      </div>
    )
  }

  const startDate = event.starts_at ? new Date(event.starts_at) : null
  const closesAt = event.tickets_closes_at ? new Date(event.tickets_closes_at) : null

  return (
    <div className="min-h-screen bg-public-bone pb-24">
      {/* HERO */}
      <header className="relative bg-public-coffee text-public-bone">
        {event.cover_image && (
          <div className="absolute inset-0">
            <img src={event.cover_image} alt="" className="w-full h-full object-cover opacity-30"/>
            <div className="absolute inset-0 bg-gradient-to-b from-public-ink/40 to-public-coffee"/>
          </div>
        )}
        <div className="container-nwc relative py-12 lg:py-20">
          <Link to="/billetterie" className="inline-flex items-center gap-2 tag-mono text-public-bone/70 hover:text-public-bone mb-6">
            <ArrowLeft size={12}/> Tous les événements
          </Link>
          <p className="tag-mono text-public-flame mb-3">{event.type || 'Événement'}</p>
          <h1 className="heading-anton text-5xl sm:text-7xl lg:text-8xl leading-[0.92]">{event.display_title || event.title}</h1>
          <div className="mt-8 flex flex-wrap gap-6 text-sm">
            {startDate && (
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-public-flame"/>
                <span>{format(startDate, "EEEE d MMMM yyyy", { locale: fr })}</span>
              </div>
            )}
            {startDate && (
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-public-flame"/>
                <span>{format(startDate, "HH'h'mm", { locale: fr })}</span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-public-flame"/>
                <span>{event.display_location || event.location}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container-nwc mt-12 grid lg:grid-cols-[1fr_420px] gap-10 items-start">
        {/* Colonne gauche : description + form */}
        <div>
          {event.description && (
            <section className="mb-10">
              <h2 className="tag-mono text-public-flame mb-3">À propos</h2>
              <div className="prose-nwc text-public-ink/85 whitespace-pre-line text-base lg:text-lg leading-relaxed">
                {event.display_description || event.description}
              </div>
            </section>
          )}

          {meta.is_open ? (
            <RegisterForm event={event} meta={meta} ticketTypes={ticketTypes}
                          onSuccess={refetch} navigate={navigate} />
          ) : (
            <ClosedNotice event={event} meta={meta} closesAt={closesAt}
                          ticketTypes={ticketTypes} onSuccess={refetch} navigate={navigate}/>
          )}
        </div>

        {/* Colonne droite : récap inscription */}
        <aside className="lg:sticky lg:top-24 bg-white border-2 border-public-ink/10 p-6">
          <p className="tag-mono text-public-flame">Inscription</p>
          <p className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-public-flame/10 text-public-flame font-mono text-[11px] uppercase tracking-widest">
            <Ticket size={11}/> Entrée gratuite
          </p>
          <dl className="mt-6 space-y-3 text-sm">
            {event.tickets_capacity > 0 && (
              <div className="flex justify-between border-b border-public-ink/10 pb-2">
                <dt className="text-public-ink/60">Places restantes</dt>
                <dd className="font-bold text-public-ink">
                  {Math.max(0, meta.remaining ?? 0)} / {event.tickets_capacity}
                </dd>
              </div>
            )}
            <div className="flex justify-between border-b border-public-ink/10 pb-2">
              <dt className="text-public-ink/60">Tickets max / email</dt>
              <dd className="font-bold text-public-ink">{event.tickets_per_email_max || 3}</dd>
            </div>
            {closesAt && (
              <div className="flex justify-between border-b border-public-ink/10 pb-2">
                <dt className="text-public-ink/60">Clôture inscriptions</dt>
                <dd className="font-bold text-public-ink text-right">{format(closesAt, "d MMM · HH'h'mm", { locale: fr })}</dd>
              </div>
            )}
          </dl>
          {event.support_phone && (
            <p className="mt-6 text-xs text-public-ink/60 flex items-center gap-2">
              <Phone size={12}/> Aide : {event.support_phone}
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────── */

function RegisterForm({ event, meta, ticketTypes = [], onSuccess, navigate, isWaitlist = false }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [email, setEmail]         = useState('')
  const [phone, setPhone]         = useState('')
  const [quantity, setQuantity]   = useState(1) // Phase 1 fallback
  const [cart, setCart]           = useState({}) // Phase 2 : {typeId: qty}
  const [guests, setGuests]       = useState([])
  const [selfie, setSelfie]       = useState(null)
  const [whatsappOptIn, setWhatsappOptIn] = useState(true)
  const [website, setWebsite]     = useState('') // honeypot
  const [success, setSuccess]     = useState(null)

  const maxPerEmail = event.tickets_per_email_max || 3
  const hasTypes = ticketTypes.length > 0
  const totalQty = hasTypes ? Object.values(cart).reduce((s, q) => s + q, 0) : quantity
  const totalFcfa = hasTypes
    ? ticketTypes.reduce((s, t) => s + (cart[t.id] || 0) * t.price_fcfa, 0)
    : 0

  const mutation = useMutation({
    mutationFn: async () => publicTickets.register({
      event_id: event.id,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      ...(hasTypes
        ? { items: Object.entries(cart).filter(([, q]) => q > 0).map(([typeId, q]) => ({ ticket_type_id: parseInt(typeId), quantity: q })) }
        : { quantity }),
      guests: guests.filter(g => g.first_name && g.last_name),
      whatsapp_opt_in: whatsappOptIn ? 1 : 0,
      website,
    }, selfie),
    onSuccess: (res) => {
      onSuccess?.()
      // Backend renvoie soit `waitlist:true` soit `waitlisted:true` — on accepte les 2.
      if (res.waitlist || res.waitlisted) {
        toast.success(res.message || 'Tu as été ajouté à la liste d\'attente.')
        setSuccess({ ...res, isWaitlist: true }) // écran dédié waitlist
      } else if (res.paid) {
        // Phase 2 : redirige vers la page paiement.
        toast.success('Commande enregistrée — direction la page paiement.')
        navigate(`/ma-commande/${res.order_code}`)
      } else {
        toast.success(res.message || 'Ticket envoyé par email !')
        setSuccess(res)
      }
    },
    onError: (err) => {
      const m = err?.response?.data?.message
      const errors = err?.response?.data?.errors
      if (errors) {
        toast.error(Object.values(errors)[0]?.[0] || 'Validation échouée.')
      } else {
        toast.error(m || 'Une erreur est survenue.')
      }
    },
  })

  const handleQuantity = (next) => {
    const n = Math.min(maxPerEmail, Math.max(1, next))
    setQuantity(n)
    setGuests((prev) => {
      const target = n - 1
      if (prev.length === target) return prev
      if (prev.length < target) return [...prev, ...Array(target - prev.length).fill({ first_name: '', last_name: '' })]
      return prev.slice(0, target)
    })
  }

  const updateCartType = (typeId, delta) => {
    setCart((prev) => {
      const t = ticketTypes.find(x => x.id === typeId)
      const current = prev[typeId] || 0
      const next = Math.max(0, current + delta)
      // Respect max_per_order + remaining + maxPerEmail global
      const cap = Math.min(
        t.max_per_order ?? maxPerEmail,
        t.remaining ?? Infinity,
        maxPerEmail - (totalQty - current),
      )
      return { ...prev, [typeId]: Math.min(next, cap) }
    })
    // Reset guests si totalQty change
    setGuests([])
  }

  const updateGuest = (i, field, value) => {
    setGuests((prev) => prev.map((g, idx) => idx === i ? { ...g, [field]: value } : g))
  }

  const onSubmit = (e) => {
    e.preventDefault()
    mutation.mutate()
  }

  if (success) {
    // Cas WAITLIST : message très différent — pas de ticket envoyé, on rappelle plus tard
    if (success.isWaitlist) {
      return (
        <div className="border-2 border-orange-400 bg-orange-50 p-6 sm:p-10 text-center">
          <AlertTriangle size={48} className="mx-auto text-orange-600 mb-4"/>
          <h2 className="font-display uppercase text-3xl text-public-ink">
            Inscrit en liste d'attente
          </h2>
          {success.position && (
            <p className="mt-4 inline-block px-4 py-2 bg-orange-600 text-white font-mono uppercase text-xs tracking-widest">
              Position #{success.position}
            </p>
          )}
          <p className="mt-4 text-public-ink/70">
            Ton inscription est <strong>en attente</strong>. Aucun ticket n'a été envoyé pour l'instant.<br/>
            Si une place se libère, l'équipe NWC te contactera par email
            (<strong>{email}</strong>) ou par téléphone dans l'ordre d'arrivée.
          </p>
          <p className="mt-6 text-xs text-public-ink/50">
            Tu n'as rien d'autre à faire — on te tient au courant.
          </p>
        </div>
      )
    }

    // Cas standard : ticket émis
    return (
      <div className="border-2 border-public-flame bg-public-flame/5 p-6 sm:p-10 text-center">
        <CheckCircle2 size={48} className="mx-auto text-public-flame mb-4"/>
        <h2 className="font-display uppercase text-3xl text-public-ink">Inscription confirmée !</h2>
        <p className="mt-3 text-public-ink/70">
          {success.tickets_count} ticket(s) ont été envoyés à <strong>{email}</strong>.<br/>
          Vérifie ta boîte mail (et tes spams par sécurité).
        </p>
        {success.order_code && (
          <p className="mt-4 tag-mono text-public-flame">N° commande : {success.order_code}</p>
        )}
        {success.access_token && (
          <button
            onClick={() => navigate(`/mon-ticket/${success.access_token}`)}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-public-flame text-public-bone font-mono uppercase text-xs tracking-widest hover:bg-public-ink transition"
          >
            Voir mon ticket
          </button>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="bg-white border-2 border-public-ink/10 p-6 sm:p-8">
      <h2 className="font-display uppercase text-3xl text-public-ink mb-1">Inscription</h2>
      <p className="text-sm text-public-ink/60 mb-6">Tes informations + le nombre de places.</p>

      {/* Honeypot anti-bot */}
      <input
        type="text" name="website" tabIndex={-1} autoComplete="off"
        value={website} onChange={(e) => setWebsite(e.target.value)}
        className="absolute -left-[9999px] opacity-0"
        aria-hidden="true"
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Prénom *" value={firstName} onChange={setFirstName} required />
        <Field label="Nom *" value={lastName} onChange={setLastName} required />
        <Field label="Email *" type="email" value={email} onChange={setEmail} required />
        <Field label="Téléphone *" type="tel" value={phone} onChange={setPhone} required placeholder="+225..." />
      </div>

      {/* Phase 2 : sélecteur multi-types vs Phase 1 : stepper simple */}
      {hasTypes ? (
        <div className="mt-6 space-y-3">
          <label className="tag-mono text-public-ink/60 block">Choisis tes places (max {maxPerEmail} total)</label>
          {ticketTypes.map((t) => (
            <div key={t.id}
                 className="flex items-center justify-between gap-4 p-4 border-2 border-public-ink/10">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {t.color_hex && <span className="w-3 h-3 rounded-full shrink-0" style={{ background: t.color_hex }}/>}
                  <p className="font-display uppercase text-lg text-public-ink">{t.name}</p>
                </div>
                {t.description && (
                  <p className="text-xs text-public-ink/60 mt-1">{t.description}</p>
                )}
                <p className="mt-1 font-mono text-public-flame font-bold">
                  {t.price_fcfa > 0
                    ? `${new Intl.NumberFormat('fr-FR').format(t.price_fcfa)} FCFA`
                    : 'Gratuit'}
                </p>
                {t.remaining !== null && t.remaining < 10 && t.remaining > 0 && (
                  <p className="text-[10px] text-orange-600 mt-1 uppercase font-mono tracking-wider">
                    Plus que {t.remaining} place(s)
                  </p>
                )}
                {!t.is_available && (
                  <p className="text-[10px] text-red-600 mt-1 uppercase font-mono tracking-wider">Épuisé</p>
                )}
              </div>
              <div className="inline-flex items-center border-2 border-public-ink/20 bg-white shrink-0">
                <button type="button" onClick={() => updateCartType(t.id, -1)}
                        disabled={(cart[t.id] || 0) <= 0}
                        className="p-2.5 text-public-ink hover:bg-public-flame hover:text-public-bone transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-public-ink"
                        aria-label={`Diminuer ${t.name}`}>
                  <Minus size={18} strokeWidth={2.5}/>
                </button>
                <span className="px-4 font-display text-xl text-public-ink min-w-[48px] text-center border-x-2 border-public-ink/15">
                  {cart[t.id] || 0}
                </span>
                <button type="button" onClick={() => updateCartType(t.id, +1)}
                        disabled={!t.is_available || totalQty >= maxPerEmail}
                        className="p-2.5 text-public-ink hover:bg-public-flame hover:text-public-bone transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-public-ink"
                        aria-label={`Augmenter ${t.name}`}>
                  <Plus size={18} strokeWidth={2.5}/>
                </button>
              </div>
            </div>
          ))}

          {/* Total */}
          {totalFcfa > 0 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t-2 border-public-ink/10">
              <p className="font-display uppercase text-xl text-public-ink">Total à payer</p>
              <p className="font-display text-3xl text-public-flame">
                {new Intl.NumberFormat('fr-FR').format(totalFcfa)} <span className="text-base font-mono">FCFA</span>
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6">
          <label className="tag-mono text-public-ink/60 block mb-2">Nombre de places (max {maxPerEmail})</label>
          <div className="inline-flex items-center border-2 border-public-ink/20 bg-white">
            <button type="button" onClick={() => handleQuantity(quantity - 1)} disabled={quantity <= 1}
                    className="p-3 text-public-ink hover:bg-public-flame hover:text-public-bone transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-public-ink"
                    aria-label="Diminuer">
              <Minus size={20} strokeWidth={2.5}/>
            </button>
            <span className="px-6 font-display text-3xl text-public-ink min-w-[80px] text-center border-x-2 border-public-ink/15">
              {quantity}
            </span>
            <button type="button" onClick={() => handleQuantity(quantity + 1)} disabled={quantity >= maxPerEmail}
                    className="p-3 text-public-ink hover:bg-public-flame hover:text-public-bone transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-public-ink"
                    aria-label="Augmenter">
              <Plus size={20} strokeWidth={2.5}/>
            </button>
          </div>
        </div>
      )}

      {/* Guests (si > 1 place) — Phase 2 : sync taille via totalQty */}
      {totalQty > 1 && (
        <div className="mt-6 border-t border-public-ink/10 pt-6">
          <p className="tag-mono text-public-flame mb-3">Identité des autres places (optionnel)</p>
          <p className="text-xs text-public-ink/50 mb-3">
            Si tu ne renseignes pas, ton nom sera utilisé pour tous les tickets.
          </p>
          {Array.from({ length: totalQty - 1 }).map((_, i) => (
            <div key={i} className="grid sm:grid-cols-2 gap-3 mb-3">
              <Field label={`Prénom invité ${i + 1}`}
                     value={guests[i]?.first_name ?? ''}
                     onChange={(v) => {
                       const next = [...guests]
                       while (next.length <= i) next.push({ first_name: '', last_name: '' })
                       next[i] = { ...next[i], first_name: v }
                       setGuests(next)
                     }} />
              <Field label={`Nom invité ${i + 1}`}
                     value={guests[i]?.last_name ?? ''}
                     onChange={(v) => {
                       const next = [...guests]
                       while (next.length <= i) next.push({ first_name: '', last_name: '' })
                       next[i] = { ...next[i], last_name: v }
                       setGuests(next)
                     }} />
            </div>
          ))}
        </div>
      )}

      {/* Selfie optionnel */}
      {event.require_selfie && (
        <div className="mt-6 border-t border-public-ink/10 pt-6">
          <label className="tag-mono text-public-ink/60 block mb-2">Selfie (recommandé pour contrôle d'identité)</label>
          <label className="flex items-center gap-3 cursor-pointer border-2 border-dashed border-public-ink/20 p-4 hover:border-public-flame transition">
            <Camera size={20} className="text-public-flame"/>
            <span className="text-sm text-public-ink/70">
              {selfie ? selfie.name : 'Téléverser une photo (5 Mo max)'}
            </span>
            <input type="file" accept="image/*" capture="user" className="hidden"
                   onChange={(e) => setSelfie(e.target.files?.[0] || null)} />
          </label>
        </div>
      )}

      {/* Phase 3 — Opt-in WhatsApp */}
      <label className="mt-6 flex items-start gap-3 p-4 bg-green-50 border border-green-200 cursor-pointer hover:bg-green-100/60 transition">
        <input type="checkbox" checked={whatsappOptIn}
               onChange={(e) => setWhatsappOptIn(e.target.checked)}
               className="mt-0.5 h-4 w-4 accent-green-600"/>
        <span className="text-sm text-public-ink/80 leading-snug">
          <strong className="text-green-700">Recevoir aussi sur WhatsApp</strong> — Tu seras notifié(e) dès que ton ticket est prêt + un rappel la veille de l'événement.
        </span>
      </label>

      <button
        type="submit"
        disabled={mutation.isPending || totalQty === 0}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-public-flame text-public-bone font-mono uppercase text-xs tracking-widest hover:bg-public-ink transition disabled:opacity-60"
      >
        {mutation.isPending ? <Loader2 size={16} className="animate-spin"/> : <Ticket size={16}/>}
        {mutation.isPending
          ? 'Envoi en cours…'
          : isWaitlist
            ? `Rejoindre la liste d'attente (${totalQty || 1} place${totalQty > 1 ? 's' : ''})`
            : totalFcfa > 0
              ? `Continuer vers le paiement (${new Intl.NumberFormat('fr-FR').format(totalFcfa)} FCFA)`
              : `Recevoir ${totalQty || 1} ticket${totalQty > 1 ? 's' : ''} par email`}
      </button>

      <p className="mt-3 text-[11px] text-public-ink/50 text-center">
        En t'inscrivant, tu acceptes que tes informations soient utilisées pour la gestion de l'événement.
      </p>
    </form>
  )
}

function Field({ label, value, onChange, type = 'text', required = false, placeholder = '' }) {
  return (
    <label className="block">
      <span className="tag-mono text-public-ink/60 block mb-1">{label}</span>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        required={required} placeholder={placeholder}
        className="w-full border-2 border-public-ink/15 px-3 py-2.5 bg-white text-public-ink focus:border-public-flame focus:outline-none transition"
      />
    </label>
  )
}

function ClosedNotice({ event, meta, closesAt, ticketTypes, onSuccess, navigate }) {
  const fullCapacity = meta.remaining !== undefined && meta.remaining <= 0
  const canJoinWaitlist = fullCapacity && event.allow_waitlist

  // Cas 1 : Complet + waitlist activée par l'organisateur → formulaire waitlist
  if (canJoinWaitlist) {
    return (
      <div>
        <div className="border-2 border-orange-300 bg-orange-50 p-6 mb-6 text-center">
          <AlertTriangle size={36} className="mx-auto text-orange-600 mb-2"/>
          <p className="font-display uppercase text-2xl text-public-ink">
            Tickets épuisés — Liste d'attente ouverte
          </p>
          <p className="mt-2 text-sm text-public-ink/70">
            Remplis le formulaire ci-dessous pour rejoindre la liste. Si une place se libère,
            l'équipe NWC te contactera par email/téléphone dans l'ordre d'arrivée.
          </p>
        </div>
        <RegisterForm event={event} meta={meta} ticketTypes={ticketTypes}
                      onSuccess={onSuccess} navigate={navigate} isWaitlist/>
      </div>
    )
  }

  // Cas 2 : Complet SANS waitlist OU inscriptions fermées → message d'info seul
  return (
    <div className="border-2 border-public-ink/15 bg-white p-8 text-center">
      <AlertTriangle size={40} className="mx-auto text-public-flame mb-3"/>
      <p className="font-display uppercase text-2xl text-public-ink">
        {fullCapacity ? 'Complet' : 'Inscriptions clôturées'}
      </p>
      <p className="mt-2 text-public-ink/70">
        {fullCapacity
          ? "Toutes les places sont parties et la liste d'attente n'est pas activée pour cet événement."
          : closesAt
            ? `Les inscriptions étaient ouvertes jusqu'au ${format(closesAt, "d MMM 'à' HH'h'mm", { locale: fr })}.`
            : "L'inscription pour cet événement est fermée."}
      </p>
    </div>
  )
}
