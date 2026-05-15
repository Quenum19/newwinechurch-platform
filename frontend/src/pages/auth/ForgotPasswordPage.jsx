/** Demande de mot de passe oublié — i18n FR/EN. */
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, Loader2, ArrowLeft, ArrowRight } from 'lucide-react'

import AuthInput from '@/components/auth/AuthInput.jsx'
import { useForgotPassword } from '@/hooks/useAuth'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const forgot = useForgotPassword()
  const schema = z.object({
    email: z.string().email(t('auth.errors.invalidEmail', 'Email invalide')),
  })
  const { register, handleSubmit, formState: { errors } } =
    useForm({ resolver: zodResolver(schema) })

  return (
    <>
      <header>
        <h1 className="text-[40px] sm:text-[44px] text-zinc-900 leading-[1.05] tracking-tight font-semibold">
          {t('auth.forgot.title')}
        </h1>
        <p className="mt-3 text-[15px] text-zinc-500">
          {t('auth.forgot.subtitle')}
        </p>
      </header>

      <form
        onSubmit={handleSubmit((d) => forgot.mutate(d.email))}
        className="mt-9 space-y-5"
        noValidate
      >
        <AuthInput
          label={t('auth.login.email')}
          type="email" required autoComplete="email" leftIcon={Mail}
          error={errors.email?.message}
          {...register('email')}
        />
        <button
          type="submit"
          disabled={forgot.isPending}
          className="group relative w-full inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 text-white font-medium py-3.5 px-4 transition-all text-[15px] shadow-sm hover:shadow-md active:scale-[0.99]"
        >
          {forgot.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <span>{t('auth.forgot.submit')}</span>
              <ArrowRight size={16} strokeWidth={2}
                          className="transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm">
        <Link to="/connexion" className="inline-flex items-center gap-1 text-zinc-700 hover:text-zinc-900 font-medium transition">
          <ArrowLeft size={14} /> {t('auth.forgot.backToLogin')}
        </Link>
      </p>
    </>
  )
}
