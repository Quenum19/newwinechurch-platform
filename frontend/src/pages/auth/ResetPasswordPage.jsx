/** Page de réinitialisation — i18n FR/EN. */
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Lock, Loader2, AlertCircle, ArrowRight } from 'lucide-react'

import AuthInput from '@/components/auth/AuthInput.jsx'
import { useResetPassword } from '@/hooks/useAuth'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''
  const reset = useResetPassword()

  const schema = z.object({
    password: z.string().min(8)
                         .regex(/[A-Z]/, t('auth.errors.upperRequired', 'Une majuscule requise'))
                         .regex(/[a-z]/, t('auth.errors.lowerRequired', 'Une minuscule requise'))
                         .regex(/[0-9]/, t('auth.errors.numberRequired', 'Un chiffre requis'))
                         .regex(/[^A-Za-z0-9]/, t('auth.errors.symbolRequired', 'Un symbole requis')),
    password_confirmation: z.string(),
  }).refine((d) => d.password === d.password_confirmation, {
    message: t('auth.errors.passwordMismatch', 'Les mots de passe ne correspondent pas'),
    path: ['password_confirmation'],
  })

  const { register, handleSubmit, formState: { errors } } =
    useForm({ resolver: zodResolver(schema) })

  const onSubmit = (data) => reset.mutate({ token, email, ...data })

  return (
    <>
      <header>
        <h1 className="text-[40px] sm:text-[44px] text-zinc-900 leading-[1.05] tracking-tight font-semibold">
          {t('auth.reset.title')}
        </h1>
        <p className="mt-3 text-[15px] text-zinc-500">
          {email
            ? t('auth.reset.subtitleWithEmail', { email })
            : t('auth.reset.subtitleNoEmail')}
        </p>
      </header>

      {!token && (
        <div className="mt-6 flex items-start gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>
            {t('auth.reset.invalidLink')}{' '}
            <Link to="/mot-de-passe-oublie" className="underline font-medium">
              {t('auth.reset.requestNew')}
            </Link>.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-9 space-y-5" noValidate>
        <AuthInput
          label={t('auth.reset.newPassword')}
          type="password" required autoComplete="new-password" leftIcon={Lock}
          helper={t('auth.reset.helper')}
          error={errors.password?.message}
          {...register('password')}
        />
        <AuthInput
          label={t('auth.reset.confirmPassword')}
          type="password" required autoComplete="new-password" leftIcon={Lock}
          error={errors.password_confirmation?.message}
          {...register('password_confirmation')}
        />

        <button
          type="submit"
          disabled={!token || reset.isPending}
          className="group relative w-full inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 text-white font-medium py-3.5 px-4 transition-all text-[15px] shadow-sm hover:shadow-md active:scale-[0.99]"
        >
          {reset.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <span>{t('auth.reset.submit')}</span>
              <ArrowRight size={16} strokeWidth={2}
                          className="transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm">
        <Link to="/connexion" className="text-zinc-700 hover:text-zinc-900 font-medium transition">
          {t('auth.reset.backToLogin')}
        </Link>
      </p>
    </>
  )
}
