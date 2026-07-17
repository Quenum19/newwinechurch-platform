/**
 * ForceChangePasswordPage — Forcée à la 1re connexion si `must_change_password=true`.
 * i18n FR/EN.
 */
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Lock, Loader2, ShieldCheck, LogOut } from 'lucide-react'

import api from '@/api/axios'
import AuthInput from '@/components/auth/AuthInput.jsx'
import { useAuthStore } from '@/store/authStore'
import { useLogout } from '@/hooks/useAuth'

export default function ForceChangePasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)
  const logout = useLogout()

  const schema = z.object({
    current_password: z.string().min(1, t('auth.errors.passwordRequired', 'Saisis ton mot de passe initial')),
    password:         z.string().min(8, t('auth.errors.passwordTooShort', '8 caractères minimum'))
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

  const submit = useMutation({
    mutationFn: (data) => api.put('/me/password', data).then((r) => r.data),
    onSuccess: async () => {
      toast.success(t('auth.toasts.passwordUpdated', 'Mot de passe mis à jour 🔒'))
      try {
        const me = await api.get('/me').then((r) => r.data?.data ?? r.data)
        setUser(me)
        queryClient.setQueryData(['me'], me)
      } catch { /* silencieux */ }
      navigate('/espace-perso', { replace: true })
    },
    onError: (err) => {
      const status = err?.response?.status
      const errs   = err?.response?.data?.errors
      const first  = errs ? Object.values(errs).flat()[0] : null
      const msg    = err?.response?.data?.message

      // 500 avec message générique "Server Error" (défaut Laravel prod) →
      // remplace par un message français utilisable pour l'utilisateur.
      if (status >= 500 || msg === 'Server Error') {
        toast.error('Erreur temporaire du serveur. Réessaie dans quelques secondes.')
        return
      }

      // 422 validation → premier message d'erreur ciblé (champ password ou
      // current_password), sinon le message général de Laravel.
      toast.error(first || msg || t('common.error'))
    },
  })

  return (
    <main className="auth-modern min-h-screen flex flex-col items-center justify-center px-4 bg-zinc-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-7 sm:p-8">
          <div className="flex items-center justify-center h-14 w-14 rounded-full bg-zinc-900 text-white mx-auto">
            <ShieldCheck size={26} />
          </div>

          <h1 className="text-2xl sm:text-3xl text-zinc-900 leading-tight tracking-tight text-center mt-5">
            {t('auth.forceChange.title')}
          </h1>
          <p className="mt-2 text-center text-[15px] text-zinc-500">
            {t('auth.forceChange.subtitle', { name: user?.first_name || user?.name || '' })}
          </p>

          <form onSubmit={handleSubmit((data) => submit.mutate(data))} className="mt-7 space-y-5" noValidate>
            <AuthInput
              label={t('auth.forceChange.currentPassword')}
              type="password"
              required
              autoComplete="current-password"
              leftIcon={Lock}
              placeholder={t('auth.forceChange.currentPlaceholder')}
              {...register('current_password')}
              error={errors.current_password?.message}
            />

            <AuthInput
              label={t('auth.forceChange.newPassword')}
              type="password"
              required
              autoComplete="new-password"
              leftIcon={Lock}
              helper={t('auth.reset.helper')}
              {...register('password')}
              error={errors.password?.message}
            />

            <AuthInput
              label={t('auth.forceChange.confirmPassword')}
              type="password"
              required
              autoComplete="new-password"
              leftIcon={Lock}
              {...register('password_confirmation')}
              error={errors.password_confirmation?.message}
            />

            <button
              type="submit"
              disabled={submit.isPending}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 text-white font-medium py-3 px-4 transition text-[15px]"
            >
              {submit.isPending && <Loader2 size={16} className="animate-spin" />}
              {t('auth.forceChange.submit')}
            </button>
          </form>
        </div>

        <button
          onClick={() => logout.mutate()}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-zinc-700"
        >
          <LogOut size={14} /> {t('auth.forceChange.logoutLink')}
        </button>
      </div>
    </main>
  )
}
