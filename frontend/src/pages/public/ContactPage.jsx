/** Page de contact — palette Magazine Drop. */
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Mail, MapPin, Clock, MessageSquare, Send, Navigation } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import PublicSectionHeader from '@/components/public/PublicSection.jsx'
import { publicSettings, publicContact } from '@/api/public'

const schema = z.object({
  name:    z.string().min(1, 'Requis').max(120),
  email:   z.string().email('Email invalide').max(180),
  phone:   z.string().max(30).optional().or(z.literal('')),
  subject: z.string().max(200).optional().or(z.literal('')),
  message: z.string().min(20, 'Au moins 20 caractères').max(3000),
})

export default function ContactPage() {
  const { t } = useTranslation()
  const { data: settings } = useQuery({
    queryKey: ['settings', 'public'],
    queryFn: publicSettings.get,
  })
  const contact = settings?.contact ?? {}
  const fullAddress = [contact.address, contact.city].filter(Boolean).join(', ')
                      || t('contact.fallbackAddress', "New Wine Church, Cocody-Bonoumin, Abidjan, Côte d'Ivoire")
  const mapQuery = encodeURIComponent(fullAddress)
  // Embed sans clé API — utilise le legacy maps.google.com.
  const mapEmbedUrl = `https://www.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`
  const mapDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm({ resolver: zodResolver(schema) })

  const submit = useMutation({
    mutationFn: publicContact.submit,
    onSuccess: () => {
      toast.success(t('contact.successToast', 'Message bien reçu. Nous reviendrons vers vous rapidement.'), { duration: 6000 })
      reset()
    },
    onError: () => toast.error(t('contact.errorToast', "Erreur d'envoi.")),
  })

  return (
    <div className="bg-public-bone min-h-screen">
      <header className="container-nwc pt-16 lg:pt-24 pb-12">
        <PublicSectionHeader
          eyebrow={t('contact.pageTitle', 'Contact')}
          title={<>{t('contact.heroTitle1', 'Parlons')}<br/><span className="text-public-flame">{t('contact.heroTitle2', 'ensemble.')}</span></>}
          desc={t('contact.heroDesc', 'Une question, un sujet, un témoignage ? Écris-nous, nous lisons tout.')}
        />
      </header>

      <section className="container-nwc pb-24">
        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
          <aside className="lg:col-span-1 space-y-1">
            <InfoCard
              icon={MapPin}
              label={t('contact.addressLabel', 'Adresse')}
              value={`${contact.address || 'Cocody-Bonoumin'} — ${contact.city || "Abidjan, Côte d'Ivoire"}`}
            />
            <InfoCard
              icon={Clock}
              label={t('contact.serviceLabel', 'Culte')}
              value={contact.service_time || t('contact.serviceValue', 'Dimanche · 13h00 — 15h00')}
            />
            <InfoCard
              icon={Mail}
              label={t('contact.emailLabel', 'Email')}
              value={contact.email || 'contact@newinechurch.org'}
              href={`mailto:${contact.email || 'contact@newinechurch.org'}`}
            />
          </aside>

          <form
            onSubmit={handleSubmit((d) => submit.mutate(d))}
            className="lg:col-span-2 bg-public-coffee text-public-bone p-6 lg:p-10 space-y-5"
          >
            <h2 className="font-display uppercase text-3xl inline-flex items-center gap-3">
              <MessageSquare size={22} className="text-public-flame"/> {t('contact.writeMessage', 'Écris ton message')}
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t('contact.nameLabel', 'Nom')} required error={errors.name?.message}>
                <input type="text" {...register('name')} className="input-public-dark"/>
              </Field>
              <Field label={t('contact.emailLabel', 'Email')} required error={errors.email?.message}>
                <input type="email" {...register('email')} className="input-public-dark"/>
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t('contact.phoneLabel', 'Téléphone')}>
                <input type="tel" {...register('phone')} className="input-public-dark"/>
              </Field>
              <Field label={t('contact.subjectLabel', 'Sujet')}>
                <input type="text" {...register('subject')} className="input-public-dark"/>
              </Field>
            </div>

            <Field label={t('contact.messageLabel', 'Message')} required error={errors.message?.message}>
              <textarea rows={6} {...register('message')} className="input-public-dark resize-none"/>
            </Field>

            <button
              type="submit"
              disabled={submit.isPending}
              className="btn-flame inline-flex items-center gap-2 disabled:opacity-50"
            >
              {submit.isPending ? '…' : <>{t('contact.submit', 'Envoyer')} <Send size={14}/></>}
            </button>
          </form>
        </div>
      </section>

      {/* === Carte Google Maps === */}
      <section className="container-nwc pb-24">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <p className="tag-mono text-public-flame mb-2">{t('contact.locationLabel', 'Localisation')}</p>
            <h2 className="font-display uppercase text-3xl sm:text-4xl text-public-ink leading-tight">{t('contact.comeVisit', 'Viens nous voir')}</h2>
          </div>
          <a
            href={mapDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline-ink py-2 px-4 text-xs inline-flex items-center gap-2"
          >
            <Navigation size={14}/> {t('contact.directions', 'Itinéraire')}
          </a>
        </div>

        <div className="aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden border-2 border-public-ink/15 bg-public-coffee">
          <iframe
            title={t('contact.mapTitle', 'Carte — {{address}}', { address: fullAddress })}
            src={mapEmbedUrl}
            className="w-full h-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
        <p className="mt-3 tag-mono text-public-ink/50">{fullAddress}</p>
      </section>
    </div>
  )
}

function InfoCard({ icon: Icon, label, value, href }) {
  const Inner = (
    <div className="border-2 border-public-ink/15 p-5 hover:border-public-flame transition-colors group">
      <div className="tag-mono text-public-flame inline-flex items-center gap-2">
        <Icon size={12}/> {label}
      </div>
      <p className="mt-2 font-editorial text-lg text-public-ink group-hover:text-public-flame transition-colors">{value}</p>
    </div>
  )
  return href ? <a href={href} className="block">{Inner}</a> : Inner
}

function Field({ label, required, error, children }) {
  return (
    <label className="block">
      <span className="tag-mono text-public-bone/60 mb-1.5 block">
        {label}{required && <span className="text-public-flame"> *</span>}
      </span>
      {children}
      {error && <span className="block mt-1 tag-mono text-public-flame">{error}</span>}
    </label>
  )
}
