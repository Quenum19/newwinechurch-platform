/**
 * EventRegistrationPage — Formulaire d'inscription générique par event.
 *
 * URL : /evenements/:slug/inscription
 *
 * Le formulaire est ENTIÈREMENT piloté par la config renvoyée par l'API :
 *   GET /api/public/events/{slug}/registration-config
 *
 * → aucune page dédiée par event à créer à l'avenir. Un nouvel event
 * qui active modules_enabled.registration + configure ses fields =
 * son formulaire est live automatiquement à /evenements/{slug}/inscription.
 *
 * Cas gérés :
 *   - Fenêtre pas encore ouverte (opens_at futur) : message + compte à rebours
 *   - Fenêtre fermée (closes_at passé) : message
 *   - Registration désactivée (module off) : 404 friendly
 *   - Doublon (mail/tel déjà inscrit) : message "déjà inscrit"
 *   - Succès : écran de confirmation
 */
import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Calendar, MapPin, Check, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import api from '@/api/axios'
import Spinner from '@/components/ui/Spinner.jsx'

const FIELD_LABELS = {
  first_name:   'Prénom',
  name:         'Nom',
  email:        'Email',
  phone:        'Téléphone',
  whatsapp:     'WhatsApp (optionnel)',
  commune:      'Commune',
  quartier:     'Quartier',
  attended_bal: "J'ai participé au Bal DNE (24 juillet)",
  birth_date:   'Date de naissance',
  gender:       'Genre',
}

const FIELD_TYPES = {
  first_name:   'text',
  name:         'text',
  email:        'email',
  phone:        'tel',
  whatsapp:     'tel',
  commune:      'select',
  quartier:     'text',
  attended_bal: 'checkbox',
  birth_date:   'date',
  gender:       'select',
}

const FIELD_PLACEHOLDERS = {
  first_name: 'Jean',
  name:       'Kouadio',
  email:      'jean.kouadio@example.com',
  phone:      '+225 07 00 00 00 00',
  whatsapp:   '+225 07 00 00 00 00',
  quartier:   'Riviera Golf, 2 Plateaux, …',
}

export default function EventRegistrationPage() {
  const { slug } = useParams()
  const [values, setValues] = useState({})
  const [submitted, setSubmitted] = useState(null) // { message, duplicate }

  const { data, isLoading, error } = useQuery({
    queryKey: ['public', 'event-registration-config', slug],
    queryFn: () => api.get(`/public/events/${slug}/registration-config`).then((r) => r.data),
    retry: false,
  })

  const submit = useMutation({
    mutationFn: (payload) => api.post(`/public/events/${slug}/register`, payload).then((r) => r.data),
    onSuccess: (res) => setSubmitted(res),
    onError:   () => {/* affiché via submit.error */},
  })

  // Assure une valeur par défaut pour chaque field côté state (évite les
  // "controlled input turning into uncontrolled" en cas de switch checkbox).
  useEffect(() => {
    if (! data?.form?.fields) return
    const init = {}
    for (const f of data.form.fields) {
      init[f.key] = f.key === 'attended_bal' ? false : ''
    }
    setValues(init)
  }, [data])

  // Loading / erreurs de config
  if (isLoading) return <FullPageLoader/>
  if (error) {
    const status = error?.response?.status
    const msg = error?.response?.data?.message
    return (
      <ErrorPage
        title={status === 404 ? "Inscriptions indisponibles" : "Une erreur est survenue"}
        message={msg || "Cet événement n'accepte pas d'inscription en ligne pour l'instant."}
      />
    )
  }

  const { event, form, options } = data

  // Fenêtre fermée / pas encore ouverte
  if (! form.is_open) {
    const opens = form.opens_at ? new Date(form.opens_at) : null
    const closes = form.closes_at ? new Date(form.closes_at) : null
    const now = new Date()
    const notYet = opens && now < opens
    const over   = closes && now > closes
    return (
      <StatusPage
        event={event}
        title={notYet ? "Inscriptions à venir" : "Inscriptions fermées"}
        message={
          notYet
            ? `Ouverture le ${format(opens, "EEEE d MMMM 'à' HH'h'mm", { locale: fr })}.`
            : over
              ? `Fermées depuis le ${format(closes, "d MMMM yyyy", { locale: fr })}.`
              : "L'inscription n'est pas ouverte pour cet événement."
        }
      />
    )
  }

  // Succès
  if (submitted) {
    return (
      <StatusPage
        event={event}
        icon={<Check size={40} className="text-public-flame"/>}
        title={submitted.duplicate ? "Déjà pré-inscrit" : "Pré-inscription confirmée"}
        message={submitted.message}
      />
    )
  }

  const setField = (key, val) => setValues((v) => ({ ...v, [key]: val }))
  const onSubmit = (e) => {
    e.preventDefault()
    submit.mutate(values)
  }

  const backendError = submit.error?.response?.data?.message
  const backendFieldErrors = submit.error?.response?.data?.errors ?? {}

  return (
    <article className="bg-public-bone min-h-screen">
      <div className="container-nwc py-12 max-w-2xl">
        <Link
          to={`/evenements/${slug}`}
          className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-public-ink/60 hover:text-public-flame mb-6"
        >
          <ArrowLeft size={12}/> Retour à l'événement
        </Link>

        {/* Header event */}
        <header className="mb-8">
          <p className="tag-mono text-public-flame mb-2">Pré-inscription</p>
          <h1 className="heading-anton text-4xl sm:text-5xl text-public-ink leading-tight">
            {event.title}
          </h1>
          <div className="mt-3 flex items-center gap-4 text-sm text-public-ink/70 flex-wrap">
            {event.starts_at && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={14} className="text-public-flame"/>
                {format(new Date(event.starts_at), "EEEE d MMMM yyyy", { locale: fr })}
              </span>
            )}
            {event.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} className="text-public-flame"/>
                {event.location}
              </span>
            )}
          </div>
          {form.closes_at && (
            <p className="mt-3 text-xs text-public-ink/50 font-mono uppercase tracking-widest">
              Clôture des inscriptions : {format(new Date(form.closes_at), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
            </p>
          )}
        </header>

        {/* Formulaire dynamique */}
        <form onSubmit={onSubmit} className="space-y-5 bg-white border-2 border-public-ink/10 p-6 md:p-8">
          {form.fields.map((f) => (
            <Field
              key={f.key}
              field={f}
              value={values[f.key]}
              onChange={(v) => setField(f.key, v)}
              options={options}
              error={backendFieldErrors[f.key]?.[0]}
            />
          ))}

          {backendError && ! Object.keys(backendFieldErrors).length && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0"/>
              <p>{backendError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submit.isPending}
            className="w-full inline-flex items-center justify-center gap-2 py-3 bg-public-flame text-public-bone hover:bg-public-ink transition font-mono text-sm uppercase tracking-widest font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submit.isPending ? <><Loader2 size={16} className="animate-spin"/> Envoi…</> : "Confirmer ma pré-inscription"}
          </button>

          <p className="text-[10px] text-public-ink/50 font-mono uppercase tracking-widest text-center">
            Tes données restent chez NWC · pas de spam
          </p>
        </form>
      </div>
    </article>
  )
}

// ============================================================================
// Champs
// ============================================================================

function Field({ field, value, onChange, options, error }) {
  const type = FIELD_TYPES[field.key] || 'text'
  const label = FIELD_LABELS[field.key] || field.key
  const placeholder = FIELD_PLACEHOLDERS[field.key] || ''

  if (type === 'checkbox') {
    return (
      <label className="flex items-start gap-3 cursor-pointer p-3 border-2 border-public-ink/10 hover:border-public-flame/50 transition">
        <input
          type="checkbox"
          checked={!! value}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-5 w-5 accent-public-flame"
        />
        <span className="text-sm text-public-ink">{label}</span>
      </label>
    )
  }

  if (type === 'select' && field.key === 'commune') {
    const communes = options?.communes ?? []
    return (
      <label className="block">
        <span className="block font-mono text-[11px] uppercase tracking-widest text-public-ink/70 mb-1.5">
          {label}{field.required && <span className="text-public-flame ml-1">*</span>}
        </span>
        <select
          required={field.required}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2.5 border-2 border-public-ink/20 focus:border-public-flame outline-none bg-white text-public-ink"
        >
          <option value="">— Choisis ta commune —</option>
          {communes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </label>
    )
  }

  if (type === 'select' && field.key === 'gender') {
    return (
      <label className="block">
        <span className="block font-mono text-[11px] uppercase tracking-widest text-public-ink/70 mb-1.5">
          {label}{field.required && <span className="text-public-flame ml-1">*</span>}
        </span>
        <select
          required={field.required}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2.5 border-2 border-public-ink/20 focus:border-public-flame outline-none bg-white text-public-ink"
        >
          <option value="">—</option>
          <option value="M">Homme</option>
          <option value="F">Femme</option>
          <option value="other">Autre / préfère ne pas préciser</option>
        </select>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </label>
    )
  }

  return (
    <label className="block">
      <span className="block font-mono text-[11px] uppercase tracking-widest text-public-ink/70 mb-1.5">
        {label}{field.required && <span className="text-public-flame ml-1">*</span>}
      </span>
      <input
        type={type}
        required={field.required}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border-2 border-public-ink/20 focus:border-public-flame outline-none bg-white text-public-ink"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </label>
  )
}

// ============================================================================
// Pages annexes
// ============================================================================

function FullPageLoader() {
  return (
    <div className="bg-public-bone min-h-screen flex items-center justify-center">
      <Spinner size={32}/>
    </div>
  )
}

function ErrorPage({ title, message }) {
  return (
    <div className="bg-public-bone min-h-screen flex items-center justify-center">
      <div className="max-w-md text-center p-8">
        <AlertCircle size={40} className="mx-auto text-public-ink/30 mb-4"/>
        <p className="font-display uppercase text-2xl text-public-ink mb-2">{title}</p>
        <p className="text-public-ink/60">{message}</p>
        <Link
          to="/evenements"
          className="mt-6 inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-public-flame hover:underline"
        >
          <ArrowLeft size={12}/> Retour aux événements
        </Link>
      </div>
    </div>
  )
}

function StatusPage({ event, title, message, icon }) {
  return (
    <article className="bg-public-bone min-h-screen">
      <div className="container-nwc py-16 max-w-xl text-center">
        {icon && <div className="mb-6 flex justify-center">{icon}</div>}
        <p className="tag-mono text-public-flame mb-3">{event?.title}</p>
        <h1 className="heading-anton text-4xl sm:text-5xl text-public-ink mb-4">
          {title}
        </h1>
        <p className="text-lg text-public-ink/70 leading-relaxed">{message}</p>
        <Link
          to={`/evenements/${event?.slug ?? ''}`}
          className="mt-8 inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-public-flame hover:underline"
        >
          <ArrowLeft size={12}/> Voir l'événement
        </Link>
      </div>
    </article>
  )
}
