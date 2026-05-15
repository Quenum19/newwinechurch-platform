/**
 * Page "Rejoindre NWC" — i18n FR/EN.
 *
 * NOUVEAU WORKFLOW (modèle admission) :
 *   1. Le visiteur remplit ce formulaire → crée une `membership_request` côté API
 *   2. La RH/admin reçoit la demande dans /admin/demandes-adhesion
 *   3. À l'approbation, un compte est créé avec mot de passe par défaut
 *      et l'utilisateur reçoit un email avec ses credentials
 */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Mail, User, Phone, Loader2, Calendar, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react'

import AuthInput from '@/components/auth/AuthInput.jsx'
import { publicMembershipRequests } from '@/api/public'

const today = new Date().toISOString().slice(0, 10)

export default function RegisterPage() {
  const { t } = useTranslation()
  const [submitted, setSubmitted] = useState(false)

  const schema = z.object({
    first_name:   z.string().min(1, t('common.required', 'Requis')).max(80),
    name:         z.string().min(1, t('common.required', 'Requis')).max(80),
    email:        z.string().email(t('auth.errors.invalidEmail', 'Email invalide')).max(180),
    phone:        z.string().optional().or(z.literal('')),
    birth_date:   z.string().min(1, t('auth.errors.birthRequired', 'La date de naissance est obligatoire'))
                            .refine((d) => d < today, t('auth.errors.birthPast', 'Doit être dans le passé')),
    gender:       z.enum(['M', 'F']).optional().or(z.literal('')),
    city:         z.string().max(100).optional().or(z.literal('')),
    referrer:     z.string().max(120).optional().or(z.literal('')),
    motivation:   z.string().max(1500).optional().or(z.literal('')),
    accept_terms: z.literal(true, { errorMap: () => ({ message: t('auth.errors.acceptRequired', 'Vous devez accepter pour continuer') }) }),
  })

  const benefits = [
    t('auth.register.benefits.review'),
    t('auth.register.benefits.credentials'),
    t('auth.register.benefits.password'),
  ]

  const {
    register, handleSubmit, formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  const submitMut = useMutation({
    mutationFn: publicMembershipRequests.submit,
    onSuccess: () => setSubmitted(true),
    onError: (err) => {
      const errs = err?.response?.data?.errors
      const first = errs ? Object.values(errs).flat()[0] : err?.response?.data?.message
      toast.error(first || t('auth.toasts.submitError', 'Erreur lors de la soumission.'))
    },
  })

  if (submitted) {
    return <SuccessScreen />
  }

  return (
    <>
      <header>
        <h1 className="text-[40px] sm:text-[44px] text-zinc-900 leading-[1.05] tracking-tight font-semibold">
          {t('auth.register.title')}
        </h1>
        <p className="mt-3 text-[15px] text-zinc-500">
          {t('auth.register.subtitle')}
        </p>
      </header>

      <ul className="mt-6 space-y-2">
        {benefits.map((b) => (
          <li key={b} className="flex items-center gap-2.5 text-[13.5px] text-zinc-700">
            <CheckCircle2 size={14} className="text-zinc-900 shrink-0" strokeWidth={2.5} />
            {b}
          </li>
        ))}
      </ul>

      <form
        onSubmit={handleSubmit((data) => submitMut.mutate(data))}
        className="mt-7 space-y-5"
        noValidate
      >
        <div className="grid grid-cols-2 gap-3">
          <AuthInput
            label={t('auth.register.firstName')} required leftIcon={User}
            {...register('first_name')}
            error={errors.first_name?.message}
          />
          <AuthInput
            label={t('auth.register.lastName')} required
            {...register('name')}
            error={errors.name?.message}
          />
        </div>

        <AuthInput
          label={t('auth.register.email')} type="email" required autoComplete="email" leftIcon={Mail}
          {...register('email')}
          error={errors.email?.message}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AuthInput
            label={t('auth.register.phone')} type="tel" leftIcon={Phone}
            placeholder="+225 07 ..."
            {...register('phone')}
            error={errors.phone?.message}
          />
          <AuthInput
            label={t('auth.register.birthDate')} type="date" required leftIcon={Calendar}
            max={today}
            {...register('birth_date')}
            error={errors.birth_date?.message}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wide text-zinc-700 mb-1.5">
              {t('auth.register.gender')}
            </label>
            <select {...register('gender')}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-[15px] text-zinc-900 hover:border-zinc-300 focus:outline-none focus:ring-4 focus:ring-zinc-900/[0.08] focus:border-zinc-900 transition-all">
              <option value="">—</option>
              <option value="M">{t('auth.register.male')}</option>
              <option value="F">{t('auth.register.female')}</option>
            </select>
          </div>
          <AuthInput
            label={t('auth.register.city')}
            {...register('city')}
            error={errors.city?.message}
          />
        </div>

        <AuthInput
          label={t('auth.register.referrer')}
          {...register('referrer')}
          error={errors.referrer?.message}
        />

        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wide text-zinc-700 mb-1.5">
            {t('auth.register.motivationLabel')}{' '}
            <span className="text-zinc-400 text-[10px] normal-case font-normal tracking-normal">
              {t('auth.register.motivationOptional')}
            </span>
          </label>
          <textarea
            rows={3}
            placeholder={t('auth.register.motivationPlaceholder')}
            {...register('motivation')}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-[15px] text-zinc-900 placeholder:text-zinc-400/70 hover:border-zinc-300 focus:outline-none focus:ring-4 focus:ring-zinc-900/[0.08] focus:border-zinc-900 transition-all resize-y"
          />
        </div>

        <label className="flex items-start gap-2.5 text-sm text-zinc-700 cursor-pointer pt-1">
          <input
            type="checkbox"
            {...register('accept_terms')}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900/30"
          />
          <span className="leading-snug">
            {t('auth.register.termsPrefix')}{' '}
            <Link to="/cgu" className="text-zinc-900 hover:text-[#8B1A2F] underline-offset-2 hover:underline font-medium">
              {t('auth.register.terms')}
            </Link>{' '}
            {t('auth.register.termsAnd')}{' '}
            <Link to="/confidentialite" className="text-zinc-900 hover:text-[#8B1A2F] underline-offset-2 hover:underline font-medium">
              {t('auth.register.privacy')}
            </Link>.
          </span>
        </label>
        {errors.accept_terms && (
          <p className="text-xs text-rose-600 -mt-2">{errors.accept_terms.message}</p>
        )}

        <button
          type="submit"
          disabled={submitMut.isPending}
          className="group relative w-full inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 text-white font-medium py-3.5 px-4 transition-all text-[15px] shadow-sm hover:shadow-md active:scale-[0.99]"
        >
          {submitMut.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <span>{t('auth.register.submit')}</span>
              <ArrowRight size={16} strokeWidth={2}
                          className="transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600">
        {t('auth.register.alreadyMember')}{' '}
        <Link to="/connexion" className="text-zinc-900 hover:underline underline-offset-4 font-semibold transition">
          {t('auth.register.signIn')}
        </Link>
      </p>
    </>
  )
}

function SuccessScreen() {
  const { t } = useTranslation()
  return (
    <div className="text-center py-8">
      <div className="mx-auto h-16 w-16 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center mb-6">
        <Sparkles size={28} className="text-emerald-600" />
      </div>
      <h1 className="text-3xl sm:text-4xl text-zinc-900 leading-tight tracking-tight">
        {t('auth.register.success.title')}
      </h1>
      <p className="mt-3 text-[15px] text-zinc-600 max-w-sm mx-auto">
        {t('auth.register.success.message')}
      </p>
      <p className="mt-2 text-sm text-zinc-500 max-w-sm mx-auto">
        {t('auth.register.success.subMessage')}
      </p>

      <Link
        to="/"
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-3 px-6 transition text-[15px]"
      >
        {t('auth.register.success.backHome')}
      </Link>
    </div>
  )
}
