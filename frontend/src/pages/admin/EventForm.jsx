/** Formulaire événement — Refonte 2026 admin-v2 native. */
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

import ImageUploader from '@/components/admin/ImageUploader.jsx'
import BackButton from '@/components/admin/BackButton.jsx'
import TicketTypesEditor from '@/components/admin/TicketTypesEditor.jsx'
import BilingualField from '@/components/admin/BilingualField.jsx'
import { events } from '@/api/admin'

const formatForInput = (iso) => iso ? iso.slice(0, 16) : ''

export default function EventForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: event, isLoading } = useQuery({
    queryKey: ['admin', 'events', id],
    queryFn: () => events.get(id),
    enabled: isEdit,
  })

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm({
    values: event ? {
      title: event.title ?? '',
      title_en: event.title_en ?? '',
      description: event.description ?? '',
      description_en: event.description_en ?? '',
      type: event.type ?? 'culte',
      location: event.location ?? '',
      location_en: event.location_en ?? '',
      address: event.address ?? '',
      starts_at: formatForInput(event.starts_at),
      ends_at: formatForInput(event.ends_at),
      max_attendees: event.max_attendees ?? '',
      registration_required: event.registration_required ?? false,
      registration_deadline: formatForInput(event.registration_deadline),
      is_online: event.is_online ?? false,
      online_link: event.online_link ?? '',
      is_featured: event.is_featured ?? false,
      is_published: event.is_published ?? true,
      // Billetterie
      ticketing_enabled: event.ticketing_enabled ?? false,
      tickets_capacity: event.tickets_capacity ?? '',
      tickets_per_email_max: event.tickets_per_email_max ?? 3,
      tickets_closes_at: formatForInput(event.tickets_closes_at),
      allow_waitlist: event.allow_waitlist ?? true,
      require_selfie: event.require_selfie ?? false,
      support_phone: event.support_phone ?? '',
      payment_mode: event.payment_mode ?? 'declarative',
    } : {
      type: 'culte', is_published: true, registration_required: false, is_online: false,
      ticketing_enabled: false, tickets_per_email_max: 3, allow_waitlist: true, require_selfie: false,
      payment_mode: 'declarative',
    },
  })

  const isOnline = watch('is_online')
  const requireReg = watch('registration_required')
  const ticketingOn = watch('ticketing_enabled')
  const startsAt = watch('starts_at')
  const isPastDate = startsAt && new Date(startsAt) < new Date()

  const save = useMutation({
    mutationFn: (formData) => isEdit ? events.update(id, formData) : events.create(formData),
    onSuccess: (data) => {
      toast.success(isEdit ? 'Événement mis à jour.' : 'Événement créé.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] })
      if (!isEdit && data?.id) navigate(`/admin/evenements/${data.id}`)
    },
    onError: (err) => {
      const errs = err?.response?.data?.errors
      const first = errs ? Object.values(errs).flat()[0] : err?.response?.data?.message
      toast.error(first || 'Erreur de sauvegarde.')
    },
  })

  const onSubmit = (data) => {
    const fd = new FormData()
    Object.entries(data).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '') return
      if (k === 'cover_image') return
      if (typeof v === 'boolean') fd.append(k, v ? '1' : '0')
      else fd.append(k, v)
    })
    if (data.cover_image instanceof File) fd.append('cover_image', data.cover_image)
    save.mutate(fd)
  }

  if (isEdit && isLoading) {
    return <div className="adm-card h-96 animate-pulse" />
  }

  return (
    <div className="space-y-5 sm:space-y-6 max-w-5xl">
      <BackButton to="/admin/evenements" label="Retour à la liste" />

      <header>
        <h1>{isEdit ? (event?.title || 'Modifier l\'événement') : 'Nouvel événement'}</h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-4">
          <div className="adm-card p-4 sm:p-6 space-y-4">
            <Controller
              control={control}
              name="title"
              rules={{ required: true }}
              render={({ field: fr }) => (
                <Controller
                  control={control}
                  name="title_en"
                  render={({ field: en }) => (
                    <BilingualField
                      label="Titre" required
                      valueFr={fr.value} onChangeFr={fr.onChange}
                      valueEn={en.value} onChangeEn={en.onChange}
                      errorFr={errors.title && 'Requis'}
                      placeholder="ex: A Dark Night in Elegance"
                      placeholderEn="e.g., A Dark Night in Elegance"
                    />
                  )}
                />
              )}
            />
            <Controller
              control={control}
              name="description"
              rules={{ required: true }}
              render={({ field: fr }) => (
                <Controller
                  control={control}
                  name="description_en"
                  render={({ field: en }) => (
                    <BilingualField
                      label="Description" required
                      type="textarea" rows={5}
                      valueFr={fr.value} onChangeFr={fr.onChange}
                      valueEn={en.value} onChangeEn={en.onChange}
                      errorFr={errors.description && 'Requis'}
                    />
                  )}
                />
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Field label="Type">
                <select {...register('type')} className="adm-select">
                  <option value="culte">Culte</option>
                  <option value="priere">Prière</option>
                  <option value="evangelisation">Évangélisation</option>
                  <option value="concert">Concert</option>
                  <option value="formation">Formation</option>
                  <option value="autre">Autre</option>
                </select>
              </Field>
              <Controller
                control={control}
                name="location"
                render={({ field: fr }) => (
                  <Controller
                    control={control}
                    name="location_en"
                    render={({ field: en }) => (
                      <BilingualField
                        label="Lieu"
                        valueFr={fr.value} onChangeFr={fr.onChange}
                        valueEn={en.value} onChangeEn={en.onChange}
                        placeholder="ex: NWC Cocody-Bonoumin"
                        placeholderEn="e.g., NWC Cocody-Bonoumin"
                      />
                    )}
                  />
                )}
              />
            </div>
            <Field label="Adresse complète">
              <input {...register('address')} className="adm-input" />
            </Field>
          </div>

          <div className="adm-card p-4 sm:p-6 space-y-4">
            <h2>Dates</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Field label="Début" required>
                <input
                  type="datetime-local"
                  {...register('starts_at', { required: true })}
                  className="adm-input"
                />
              </Field>
              <Field label="Fin (optionnel)">
                <input type="datetime-local" {...register('ends_at')} className="adm-input" />
              </Field>
            </div>
            {isPastDate && (
              <div
                className="text-xs p-2.5 rounded border flex items-start gap-2"
                style={{ background: '#FEF3C7', borderColor: '#F59E0B33', color: '#92400E' }}
              >
                <span className="text-base leading-none">ⓘ</span>
                <span>
                  Cette date est <strong>dans le passé</strong>. L'événement sera enregistré comme archive
                  (visible dans l'onglet "Passés" du site). C'est OK pour conserver l'historique.
                </span>
              </div>
            )}
          </div>

          <div className="adm-card p-4 sm:p-6 space-y-4">
            <h2>Inscriptions</h2>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--adm-text)' }}>
              <input
                type="checkbox"
                {...register('registration_required')}
                className="h-4 w-4 rounded border-zinc-300"
                style={{ accentColor: 'var(--adm-accent)' }}
              />
              Inscription obligatoire
            </label>
            {requireReg && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pl-6">
                <Field label="Capacité max">
                  <input type="number" placeholder="ex: 100" {...register('max_attendees')} className="adm-input" />
                </Field>
                <Field label="Date limite">
                  <input type="datetime-local" {...register('registration_deadline')} className="adm-input" />
                </Field>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--adm-text)' }}>
              <input
                type="checkbox"
                {...register('is_online')}
                className="h-4 w-4 rounded border-zinc-300"
                style={{ accentColor: 'var(--adm-accent)' }}
              />
              Événement en ligne
            </label>
            {isOnline && (
              <div className="pl-6">
                <Field label="Lien en ligne (Zoom, YouTube…)">
                  <input type="url" {...register('online_link')} className="adm-input" />
                </Field>
              </div>
            )}
          </div>

          {/* ===== Billetterie (Phase 1) ===== */}
          <div className="adm-card p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2>Billetterie</h2>
              {isEdit && ticketingOn && (
                <Link to={`/admin/evenements/${id}/billetterie`}
                      className="text-xs uppercase tracking-wider font-mono px-3 py-1.5 bg-public-flame/10 text-public-flame hover:bg-public-flame hover:text-white transition">
                  Tableau de bord →
                </Link>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--adm-text)' }}>
              <input
                type="checkbox"
                {...register('ticketing_enabled')}
                className="h-4 w-4 rounded border-zinc-300"
                style={{ accentColor: 'var(--adm-accent)' }}
              />
              Activer la billetterie (tickets + QR code email)
            </label>
            {ticketingOn && (
              <div className="pl-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <Field label="Capacité tickets *">
                    <input type="number" min="1" placeholder="ex: 250"
                           {...register('tickets_capacity')}
                           className="adm-input" />
                  </Field>
                  <Field label="Max tickets / email">
                    <input type="number" min="1" max="10"
                           {...register('tickets_per_email_max', { valueAsNumber: true })}
                           className="adm-input" />
                  </Field>
                  <Field label="Clôture des inscriptions">
                    <input type="datetime-local" {...register('tickets_closes_at')} className="adm-input" />
                  </Field>
                  <Field label="Téléphone support (affiché sur ticket)">
                    <input type="tel" placeholder="+225 …"
                           {...register('support_phone')} className="adm-input" />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--adm-text)' }}>
                  <input type="checkbox" {...register('allow_waitlist')}
                         className="h-4 w-4 rounded border-zinc-300"
                         style={{ accentColor: 'var(--adm-accent)' }} />
                  Activer la liste d'attente quand complet
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--adm-text)' }}>
                  <input type="checkbox" {...register('require_selfie')}
                         className="h-4 w-4 rounded border-zinc-300"
                         style={{ accentColor: 'var(--adm-accent)' }} />
                  Selfie obligatoire à l'inscription (contrôle d'identité)
                </label>

                <div className="border-t border-public-ink/10 pt-3">
                  <Field label="Mode de paiement (Phase 7)">
                    <select {...register('payment_mode')} className="adm-input">
                      <option value="declarative">Déclaratif — l'inscrit envoie Mobile Money, l'admin valide</option>
                      <option value="cinetpay">CinetPay — paiement automatique en ligne (frais ~2.5%)</option>
                    </select>
                  </Field>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--adm-text-muted)' }}>
                    Le mode CinetPay nécessite des credentials configurés côté serveur (.env).
                  </p>
                </div>

                {isEdit && <TicketTypesEditor eventId={id}/>}
                {!isEdit && (
                  <p className="text-xs italic border-t border-public-ink/10 pt-3"
                     style={{ color: 'var(--adm-text-muted)' }}>
                    💡 Les types de tickets (Standard, VIP…) seront configurables après création.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="adm-card p-4 sm:p-5 space-y-3">
            <h2>Visibilité</h2>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--adm-text)' }}>
              <input
                type="checkbox"
                {...register('is_published')}
                className="h-4 w-4 rounded border-zinc-300"
                style={{ accentColor: 'var(--adm-accent)' }}
              />
              Publié
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--adm-text)' }}>
              <input
                type="checkbox"
                {...register('is_featured')}
                className="h-4 w-4 rounded border-zinc-300"
                style={{ accentColor: 'var(--adm-accent)' }}
              />
              Mis en avant
            </label>
          </div>

          <div className="adm-card p-4 sm:p-5">
            <Controller
              name="cover_image"
              control={control}
              render={({ field }) => (
                <ImageUploader
                  label="Image de couverture"
                  currentUrl={event?.cover_image || null}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          {/* Galerie liée à l'événement — accessible uniquement en édition. */}
          {isEdit && (
            <div className="adm-card p-4 sm:p-5">
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--adm-text-muted)' }}>
                Galerie de l'événement
              </p>
              {event?.media_count > 0 ? (
                <p className="text-sm" style={{ color: 'var(--adm-text)' }}>
                  <strong>{event.media_count}</strong> média(s) lié(s) à cet événement.
                </p>
              ) : (
                <p className="text-sm" style={{ color: 'var(--adm-text-muted)' }}>
                  Aucun média rattaché pour le moment.
                </p>
              )}
              <Link
                to={`/admin/galerie`}
                className="adm-btn adm-btn-secondary mt-3 w-full justify-center"
              >
                Ouvrir la galerie (pré-sélectionne cet événement à l'upload)
              </Link>
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--adm-text-faint)' }}>
                Dans la galerie admin, choisis cet événement dans le sélecteur en haut puis dépose tes fichiers.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button type="submit" disabled={save.isPending} className="adm-btn adm-btn-primary justify-center">
              {save.isPending
                ? <><Loader2 size={14} className="animate-spin" /> …</>
                : (isEdit ? 'Enregistrer' : 'Créer l\'événement')}
            </button>
            <Link to="/admin/evenements" className="adm-btn adm-btn-ghost justify-center">Annuler</Link>
          </div>
        </div>
      </form>
    </div>
  )
}

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-sm mb-1.5" style={{ color: 'var(--adm-text)' }}>
        {label}
        {required && <span className="ml-1" style={{ color: 'var(--adm-danger)' }}>*</span>}
      </label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: 'var(--adm-danger)' }}>{error}</p>}
    </div>
  )
}
