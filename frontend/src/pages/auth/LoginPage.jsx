/**
 * Page Connexion — Refonte v3 (premium, motion, CTA expressif, i18n FR/EN).
 */
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react'

import AuthInput from '@/components/auth/AuthInput.jsx'
import { useLogin } from '@/hooks/useAuth'

export default function LoginPage() {
  const { t } = useTranslation()
  const login = useLogin()
  const schema = z.object({
    email:    z.string().email(t('auth.errors.invalidEmail', 'Email invalide')),
    password: z.string().min(6, t('auth.errors.passwordTooShort', '6 caractères minimum')),
    remember: z.boolean().optional(),
  })
  const { register, handleSubmit, formState: { errors } } =
    useForm({ resolver: zodResolver(schema), defaultValues: { remember: true } })

  return (
    <>
      <header>
        <h1 className="text-[40px] sm:text-[44px] text-zinc-900 leading-[1.05] tracking-tight font-semibold">
          {t('auth.login.title')}
        </h1>
        <p className="mt-3 text-[15px] text-zinc-500">
          {t('auth.login.subtitle')}
        </p>
      </header>

      <form
        onSubmit={handleSubmit((data) => login.mutate(data))}
        className="mt-9 space-y-5"
        noValidate
      >
        <AuthInput
          label={t('auth.login.email')}
          type="email"
          autoComplete="email"
          required
          leftIcon={Mail}
          error={errors.email?.message}
          {...register('email')}
        />

        <AuthInput
          label={t('auth.login.password')}
          type="password"
          autoComplete="current-password"
          required
          leftIcon={Lock}
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex items-center justify-between text-sm pt-1">
          <label className="flex items-center gap-2 text-zinc-700 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register('remember')}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900/30"
            />
            {t('auth.login.remember')}
          </label>
          <Link
            to="/mot-de-passe-oublie"
            className="text-zinc-600 hover:text-zinc-900 font-medium transition"
          >
            {t('auth.login.forgot')}
          </Link>
        </div>

        <button
          type="submit"
          disabled={login.isPending}
          className="group relative w-full inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 text-white font-medium py-3.5 px-4 transition-all text-[15px] shadow-sm hover:shadow-md active:scale-[0.99]"
        >
          {login.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <span>{t('auth.login.submit')}</span>
              <ArrowRight
                size={16}
                strokeWidth={2}
                className="transition-transform group-hover:translate-x-1"
              />
            </>
          )}
        </button>
      </form>

      <div className="mt-10 relative">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <span className="w-full border-t border-zinc-200" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase tracking-[0.18em]">
          <span className="bg-white px-3 text-zinc-400">{t('auth.login.or')}</span>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-zinc-600">
        {t('auth.login.noAccount')}{' '}
        <Link
          to="/rejoindre"
          className="text-zinc-900 hover:underline underline-offset-4 font-semibold transition"
        >
          {t('auth.login.createAccount')}
        </Link>
      </p>
    </>
  )
}
