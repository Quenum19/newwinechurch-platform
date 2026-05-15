/**
 * DonatePage — Refonte 2026.
 * Workflow déclaratif : choix opérateur (depuis donation_methods, géré en admin)
 * → transfert externe → saisie référence → admin valide.
 *
 *  - Cards opérateurs visuelles avec vrais logos / couleurs configurés en admin
 *  - Sélection d'un montant rapide (1k / 2k / 5k / 10k / autre)
 *  - Étapes claires : 1) Choisis 2) Effectue 3) Confirme
 *  - Mobile-first : stack des sections
 */
import { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Heart, Copy, Check, Smartphone, BadgeCheck, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import PublicSectionHeader from '@/components/public/PublicSection.jsx'
import { publicDonations, publicDonationMethods } from '@/api/public'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/utils/cn'

const schema = z.object({
  amount:      z.coerce.number().min(100, 'Min 100 FCFA').max(10_000_000),
  method:      z.enum(['orange_money', 'wave', 'mtn_momo', 'card', 'cash', 'other']),
  type:        z.enum(['tithe', 'offering', 'mission', 'building', 'other']).default('offering'),
  reference:   z.string().max(80).optional().or(z.literal('')),
  donor_name:  z.string().max(120).optional().or(z.literal('')),
  donor_phone: z.string().max(30).optional().or(z.literal('')),
  note:        z.string().max(500).optional().or(z.literal('')),
})

// Mappe le code opérateur → enum backend (méthodes statistiques)
const codeToEnum = (code) => {
  if (['orange_money', 'mtn_momo', 'wave'].includes(code)) return code
  if (code === 'moov_money') return 'other'
  return 'other'
}

const AMOUNT_QUICK = [1000, 2000, 5000, 10000, 25000, 50000]

export default function DonatePage() {
  const { t, i18n } = useTranslation()
  const numberLocale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR'
  const user = useAuthStore((s) => s.user)
  const [selected, setSelected] = useState(null) // donation_method object
  const [copied, setCopied] = useState(null)

  const DONATION_TYPES = [
    { value: 'offering',  label: t('donate.types.offering', 'Offrande') },
    { value: 'tithe',     label: t('donate.types.tithe', 'Dîme') },
    { value: 'mission',   label: t('donate.types.mission', 'Mission') },
    { value: 'building',  label: t('donate.types.building', 'Construction') },
    { value: 'other',     label: t('donate.types.other', 'Autre') },
  ]

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['public', 'donation-methods'],
    queryFn: publicDonationMethods.list,
    staleTime: 5 * 60_000,
  })

  // Présélectionne le premier
  useEffect(() => {
    if (!selected && methods.length > 0) setSelected(methods[0])
  }, [methods, selected])

  const submit = useMutation({
    mutationFn: publicDonations.submit,
    onSuccess: () => {
      toast.success(t('donate.successToast', 'Merci ! Ton don est en attente de validation. 🙏'), { duration: 6000 })
      reset({
        method: codeToEnum(selected?.code ?? 'orange_money'),
        type: 'offering',
        amount: '',
        reference: '',
        note: '',
      })
    },
    onError: (err) => {
      const errs = err?.response?.data?.errors
      const first = errs ? Object.values(errs).flat()[0] : err?.response?.data?.message
      toast.error(first || t('donate.errorToast', 'Erreur de soumission.'))
    },
  })

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      method: 'orange_money',
      type: 'offering',
      donor_name: user?.full_name ?? '',
      donor_phone: user?.phone ?? '',
    },
  })

  // Synchronise la méthode du form quand l'opérateur sélectionné change.
  useEffect(() => {
    if (selected) setValue('method', codeToEnum(selected.code))
  }, [selected, setValue])

  const amount = watch('amount')

  const copyToClipboard = async (text, key) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1800)
    } catch {
      toast.error(t('donate.copyError', 'Impossible de copier.'))
    }
  }

  return (
    <div className="bg-public-bone min-h-screen">
      <header className="container-nwc pt-16 lg:pt-24 pb-10">
        <PublicSectionHeader
          eyebrow={t('donate.pageTitle', 'Donner')}
          title={<>{t('donate.heroTitle1', 'Soutiens')}<br/><span className="text-public-flame">{t('donate.heroTitle2', 'la mission.')}</span></>}
          desc={<>{t('donate.heroDesc', "« Donne et il te sera donné » — ton don finance l'évangélisation, la formation et le rayonnement de New Wine Church.")}</>}
        />
      </header>

      <section className="container-nwc pb-24">
        {/* === Étape 1 : Choix opérateur === */}
        <div className="mb-10">
          <StepHeader number="1" title={t('donate.stepChoose', 'Choisis ton opérateur')} />

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 rounded-lg bg-public-ink/5 animate-pulse" />
              ))}
            </div>
          ) : methods.length === 0 ? (
            <p className="mt-4 p-6 bg-public-ink/5 text-public-ink/60 text-center">
              {t('donate.noMethods', "Aucune méthode de don configurée. Contactez l'équipe finance.")}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
              {methods.map((m) => (
                <OperatorCard
                  key={m.id}
                  method={m}
                  isSelected={selected?.id === m.id}
                  onClick={() => setSelected(m)}
                />
              ))}
            </div>
          )}
        </div>

        {/* === Étape 2 : Détails du transfert === */}
        {selected && (
          <div className="mb-10">
            <StepHeader number="2" title={t('donate.stepTransfer', 'Effectue le transfert')} />

            <div className="mt-4 grid lg:grid-cols-2 gap-6">
              {/* Bloc destinataire */}
              <div
                className="rounded-lg p-6 lg:p-7 text-white"
                style={{ background: selected.color_hex ?? '#8B1A2F' }}
              >
                <div className="flex items-center gap-4 mb-5">
                  {selected.logo_url ? (
                    <img src={selected.logo_url} alt={selected.name}
                         className="h-12 w-12 rounded bg-white/10 p-1 object-contain" />
                  ) : (
                    <div className="h-12 w-12 rounded bg-white/20 flex items-center justify-center">
                      <Smartphone size={24} />
                    </div>
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-wider opacity-80">{t('donate.sendTo', 'Envoyer à')}</p>
                    <h3 className="font-display text-2xl">{selected.name}</h3>
                  </div>
                </div>

                <div className="space-y-3">
                  {selected.account_number && (
                    <CopyRow
                      label={t('donate.phoneNumber', 'Numéro')}
                      value={selected.account_number}
                      onCopy={() => copyToClipboard(selected.account_number, 'phone')}
                      copied={copied === 'phone'}
                    />
                  )}
                  {selected.recipient_name && (
                    <CopyRow
                      label={t('donate.recipientName', 'Au nom de')}
                      value={selected.recipient_name}
                      onCopy={() => copyToClipboard(selected.recipient_name, 'name')}
                      copied={copied === 'name'}
                    />
                  )}
                  {selected.ussd_code && (
                    <CopyRow
                      label={t('donate.ussdCode', 'Code USSD')}
                      value={selected.ussd_code}
                      onCopy={() => copyToClipboard(selected.ussd_code, 'ussd')}
                      copied={copied === 'ussd'}
                    />
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-public-coffee text-public-bone p-6 lg:p-7 rounded-lg">
                <p className="tag-mono text-public-flame mb-3 inline-flex items-center gap-1.5">
                  <Sparkles size={12}/> {t('donate.instructions', 'Comment procéder')}
                </p>
                {selected.instructions ? (
                  <div className="font-editorial text-public-bone/85 whitespace-pre-line leading-relaxed">
                    {selected.instructions}
                  </div>
                ) : (
                  <ol className="space-y-2 list-decimal list-inside font-editorial text-public-bone/85">
                    <li>{t('donate.defaultInstructionsStep1', 'Effectue le transfert vers le numéro ci-contre.')}</li>
                    <li>{t('donate.defaultInstructionsStep2', 'Note la référence reçue par SMS.')}</li>
                    <li>{t('donate.defaultInstructionsStep3', 'Remplis le formulaire ci-dessous.')}</li>
                    <li>{t('donate.defaultInstructionsStep4', 'Notre équipe vérifie et confirme ton don.')}</li>
                  </ol>
                )}
              </div>
            </div>
          </div>
        )}

        {/* === Étape 3 : Formulaire de confirmation === */}
        <div>
          <StepHeader number="3" title={t('donate.stepConfirm', 'Confirme ton don')} />

          <form
            onSubmit={handleSubmit((d) => submit.mutate(d))}
            className="mt-4 bg-white border-2 border-public-ink/15 rounded-lg p-6 lg:p-8 space-y-6"
          >
            {/* Montant rapide */}
            <div>
              <span className="tag-mono text-public-ink/60 mb-2 block">{t('donate.amount', 'Montant (FCFA)')} *</span>
              <div className="flex flex-wrap gap-2 mb-3">
                {AMOUNT_QUICK.map((v) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => setValue('amount', v, { shouldValidate: true })}
                    className={cn(
                      'px-4 py-2 rounded-md border-2 text-sm font-medium tabular-nums transition',
                      Number(amount) === v
                        ? 'border-public-flame bg-public-flame/10 text-public-flame'
                        : 'border-public-ink/15 text-public-ink/80 hover:border-public-flame/40',
                    )}
                  >
                    {v.toLocaleString(numberLocale)}
                  </button>
                ))}
              </div>
              <input
                type="number"
                inputMode="numeric"
                min="100"
                placeholder={t('donate.customAmount', 'Saisis un montant personnalisé')}
                {...register('amount')}
                className="w-full px-4 py-3 rounded-md border-2 border-public-ink/15 text-public-ink text-lg font-mono tabular-nums focus:border-public-flame outline-none"
              />
              {errors.amount && <p className="mt-1 text-sm text-public-flame">{errors.amount.message}</p>}
            </div>

            {/* Type */}
            <div>
              <span className="tag-mono text-public-ink/60 mb-2 block">{t('donate.type', 'Type de don')} *</span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {DONATION_TYPES.map((dt) => (
                  <label key={dt.value} className="cursor-pointer">
                    <input type="radio" value={dt.value} {...register('type')} className="peer sr-only" />
                    <div className="px-3 py-2 rounded-md border-2 border-public-ink/15 text-center text-sm text-public-ink/70
                                    peer-checked:border-public-flame peer-checked:bg-public-flame/10 peer-checked:text-public-flame transition">
                      {dt.label}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Hidden méthode (synchronisé via setValue) */}
            <input type="hidden" {...register('method')} />

            {/* Référence (si Mobile Money) */}
            {selected && !['cash', 'other'].includes(codeToEnum(selected.code)) && (
              <FieldLight
                label={t('donate.reference', 'Référence du transfert')}
                hint={t('donate.referenceHint', 'La référence reçue par SMS après ton transfert Mobile Money.')}
                error={errors.reference?.message}
              >
                <input type="text" placeholder={t('donate.referencePlaceholder', 'ex: TR250504.XX.A12345')}
                       {...register('reference')}
                       className="input-light" />
              </FieldLight>
            )}

            {!user && (
              <div className="grid sm:grid-cols-2 gap-4">
                <FieldLight label={t('donate.yourName', 'Ton nom')} hint={t('donate.optional', '(facultatif)')}>
                  <input type="text" {...register('donor_name')} className="input-light" />
                </FieldLight>
                <FieldLight label={t('donate.yourPhone', 'Ton téléphone')} hint={t('donate.yourPhoneHint', 'Pour confirmation')}>
                  <input type="tel" placeholder="+225 …" {...register('donor_phone')} className="input-light" />
                </FieldLight>
              </div>
            )}

            <FieldLight label={t('donate.noteLabel', 'Message au pasteur (optionnel)')}>
              <textarea rows={3} {...register('note')} placeholder={t('donate.notePlaceholder', 'Un mot pour le pasteur…')}
                        className="input-light resize-none" />
            </FieldLight>

            <button
              type="submit"
              disabled={submit.isPending}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md
                         bg-public-flame text-white font-medium py-3 px-4 transition
                         hover:bg-public-flame/90 disabled:opacity-60"
            >
              <Heart size={16} />
              {submit.isPending ? t('donate.submitting', 'Envoi…') : t('donate.submit', 'Soumettre mon don')}
            </button>

            <p className="text-xs text-public-ink/50 text-center inline-flex items-center justify-center gap-1.5">
              <BadgeCheck size={12} /> {t('donate.pendingNotice', "Ton don sera marqué « en attente » jusqu'à vérification par l'équipe finance.")}
            </p>
          </form>
        </div>
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function StepHeader({ number, title }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-9 w-9 rounded-full bg-public-flame text-white inline-flex items-center justify-center font-display text-base">
        {number}
      </span>
      <h2 className="font-display uppercase text-xl sm:text-2xl text-public-ink">{title}</h2>
    </div>
  )
}

function OperatorCard({ method, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative rounded-lg overflow-hidden border-2 p-4 text-left transition bg-white',
        isSelected
          ? 'border-public-flame shadow-lg'
          : 'border-public-ink/15 hover:border-public-flame/50 hover:shadow-md',
      )}
    >
      <div className="flex items-center gap-3">
        {method.logo_url ? (
          <img src={method.logo_url} alt={method.name}
               className="h-12 w-12 rounded object-contain bg-public-ink/5 p-1" />
        ) : (
          <div
            className="h-12 w-12 rounded flex items-center justify-center text-white font-bold"
            style={{ background: method.color_hex ?? '#8B1A2F' }}
          >
            {method.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-display uppercase text-sm text-public-ink truncate">{method.name}</p>
          {method.account_number && (
            <p className="text-xs text-public-ink/55 truncate font-mono">{method.account_number}</p>
          )}
        </div>
      </div>
      {isSelected && (
        <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-public-flame text-white inline-flex items-center justify-center">
          <Check size={12} />
        </span>
      )}
    </button>
  )
}

function CopyRow({ label, value, onCopy, copied }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between gap-3 bg-white/10 rounded-md px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider opacity-70">{label}</p>
        <p className="font-mono text-base sm:text-lg truncate">{value}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 inline-flex items-center gap-1 text-xs bg-white/15 hover:bg-white/25 rounded px-2 py-1.5 transition"
        aria-label={t('donate.copyAria', 'Copier {{label}}', { label })}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? t('donate.copied', 'Copié') : t('donate.copy', 'Copier')}
      </button>
    </div>
  )
}

function FieldLight({ label, required, hint, error, children }) {
  return (
    <label className="block">
      <span className="tag-mono text-public-ink/60 mb-1.5 block">
        {label}{required && <span className="text-public-flame"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="block mt-1 text-xs text-public-ink/45">{hint}</span>}
      {error && <span className="block mt-1 text-xs text-public-flame">{error}</span>}
    </label>
  )
}
