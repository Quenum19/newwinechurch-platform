/** Changement de mot de passe par le membre. */
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'

import Button from '@/components/ui/Button.jsx'
import Input from '@/components/ui/Input.jsx'
import { changePassword } from '@/api/me'

const schema = z.object({
  current_password: z.string().min(6, 'Requis'),
  password: z.string().min(8)
    .regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
  password_confirmation: z.string(),
}).refine((d) => d.password === d.password_confirmation, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['password_confirmation'],
})

export default function ChangePasswordPage() {
  const { t } = useTranslation()
  const { register, handleSubmit, reset, formState: { errors } } =
    useForm({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success(t('memberArea.security.saved'))
      reset()
    },
    onError: (err) => {
      const errs = err?.response?.data?.errors
      const msg = errs?.current_password?.[0] || errs?.password?.[0] || t('common.error')
      toast.error(msg)
    },
  })

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-white">{t('memberArea.security.title')}</h1>
        <p className="text-white/60 mt-1">{t('memberArea.security.subtitle')}</p>
      </header>

      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        className="card-nwc p-5 space-y-4 max-w-md"
      >
        <Input label={t('memberArea.security.currentPassword')} type="password" required
               error={errors.current_password?.message}
               {...register('current_password')} />
        <Input label={t('memberArea.security.newPassword')} type="password" required
               helper={t('memberArea.security.passwordHelper', '8 chars min, mixedCase, chiffre, symbole.')}
               error={errors.password?.message}
               {...register('password')} />
        <Input label={t('memberArea.security.confirmPassword')} type="password" required
               error={errors.password_confirmation?.message}
               {...register('password_confirmation')} />

        <Button type="submit" loading={mutation.isPending}>
          {t('memberArea.security.submit')}
        </Button>

        <p className="text-xs text-white/40 mt-2">
          {t('memberArea.security.devicesLogoutNotice', 'Note : tous tes autres appareils connectés seront déconnectés.')}
        </p>
      </form>
    </div>
  )
}
