/**
 * Page de mise à jour du profil membre + upload avatar.
 */
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Camera, Trash2 } from 'lucide-react'

import Button from '@/components/ui/Button.jsx'
import Input from '@/components/ui/Input.jsx'
import { useAuthStore } from '@/store/authStore'
import { updateProfile, uploadAvatar, deleteAvatar } from '@/api/me'

export default function MyProfile() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState: { isDirty } } = useForm({
    defaultValues: {
      first_name: user?.first_name || '',
      name:       user?.name || '',
      phone:      user?.phone || '',
      gender:     user?.gender || '',
      birth_date: user?.birth_date || '',
      city:       user?.city || '',
      address:    user?.address || '',
      bio:        user?.bio || '',

      // Fiche membre NWC complète (étape 2 — remplie après inscription).
      profession:              user?.profession || '',
      education_level:         user?.education_level || '',
      residence_area:          user?.residence_area || '',
      joined_at:               user?.joined_at || '',
      congregation:            user?.congregation || '',
      mountain:                user?.mountain || '',
      mentor_name:             user?.mentor_name || '',
      emergency_contact_name:  user?.emergency_contact_name || '',
      emergency_contact_phone: user?.emergency_contact_phone || '',
    },
  })

  // Calcule un % de complétude pour motiver le membre à finir son profil.
  const profileFields = [
    user?.first_name, user?.name, user?.phone, user?.gender, user?.birth_date,
    user?.city, user?.address, user?.bio,
    user?.profession, user?.education_level, user?.residence_area,
    user?.joined_at, user?.congregation, user?.mountain, user?.mentor_name,
    user?.emergency_contact_name, user?.emergency_contact_phone,
  ]
  const filledCount = profileFields.filter((v) => v && String(v).trim().length > 0).length
  const completionPct = Math.round((filledCount / profileFields.length) * 100)

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      setUser(updated)
      queryClient.setQueryData(['me'], updated)
      toast.success(t('memberArea.profile.savedToast'))
    },
    onError: () => toast.error(t('memberArea.profile.errorToast')),
  })

  const avatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: () => {
      toast.success(t('memberArea.profile.avatarReceived'))
      // Refresh /me dans 4s pour récupérer le nouveau chemin avatar.
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['me'] }), 4000)
    },
    onError: (err) => {
      const msg = err?.response?.data?.errors?.avatar?.[0] || err?.response?.data?.message
      toast.error(msg || t('memberArea.profile.avatarError'))
    },
  })

  const deleteAvatarMutation = useMutation({
    mutationFn: deleteAvatar,
    onSuccess: () => {
      setUser({ ...user, avatar_url: null })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      toast.success(t('memberArea.profile.avatarRemoved'))
    },
  })

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-white">{t('memberArea.profile.title')}</h1>
        <p className="text-white/60 mt-1">{t('memberArea.profile.subtitle')}</p>

        {/* Barre de complétude — incite à finir la fiche pour la RH. */}
        <div className="mt-4 card-nwc p-4">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-white/80">{t('memberArea.profile.completion')}</span>
            <span className="text-gold-400 tabular-nums font-medium">{completionPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gold-500 transition-all"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          {completionPct < 100 && (
            <p className="mt-2 text-xs text-white/50">
              {t('memberArea.profile.completionHelp')}
            </p>
          )}
        </div>
      </header>

      {/* === Avatar === */}
      <section className="card-nwc p-5">
        <h2 className="font-serif text-xl text-white mb-4">{t('memberArea.profile.avatarTitle')}</h2>
        <div className="flex items-center gap-4">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-gold-500/30" />
          ) : (
            <div className="h-20 w-20 rounded-full bg-wine-700 flex items-center justify-center text-2xl font-serif text-white">
              {(user?.first_name?.[0] || 'U').toUpperCase()}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <label className="btn-secondary cursor-pointer">
              <Camera size={16} />
              {t('memberArea.profile.changeAvatar')}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) avatarMutation.mutate(file)
                }}
              />
            </label>
            {user?.avatar_url && (
              <Button variant="ghost" onClick={() => deleteAvatarMutation.mutate()}>
                <Trash2 size={16} /> {t('memberArea.profile.removeAvatar')}
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-white/40 mt-3">
          {t('memberArea.profile.avatarHint')}
        </p>
      </section>

      {/* === Formulaire profil === */}
      <form
        onSubmit={handleSubmit((data) => updateMutation.mutate(data))}
        className="card-nwc p-5 space-y-4"
      >
        <h2 className="font-serif text-xl text-white mb-2">{t('memberArea.profile.infoTitle')}</h2>

        <div className="grid sm:grid-cols-2 gap-3">
          <Input label={t('memberArea.profile.firstName')} {...register('first_name')} />
          <Input label={t('memberArea.profile.lastName')}    {...register('name')} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Input label={t('memberArea.profile.phone')} type="tel" {...register('phone')} />
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">{t('memberArea.profile.gender')}</label>
            <select className="select-nwc" {...register('gender')}>
              <option value="">—</option>
              <option value="M">{t('memberArea.profile.male')}</option>
              <option value="F">{t('memberArea.profile.female')}</option>
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Input label={t('memberArea.profile.birthDate')} type="date" {...register('birth_date')} />
          <Input label={t('memberArea.profile.city')} {...register('city')} />
        </div>

        <Input label={t('memberArea.profile.address')} {...register('address')} />

        <div>
          <label className="block text-sm font-medium text-white/80 mb-1.5">{t('memberArea.profile.bio')}</label>
          <textarea
            rows={4}
            className="textarea-nwc"
            placeholder={t('memberArea.profile.bioPlaceholder')}
            {...register('bio')}
          />
        </div>

        {/* === Fiche membre NWC === */}
        <div className="pt-6 border-t border-white/10 space-y-4">
          <div>
            <h2 className="font-serif text-xl text-white">{t('memberArea.profile.nwcCard')}</h2>
            <p className="text-xs text-white/50 mt-1">
              {t('memberArea.profile.nwcCardDesc')}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Input label={t('memberArea.profile.profession')} placeholder={t('memberArea.profile.professionPlaceholder')}
                   {...register('profession')} />
            <Input label={t('memberArea.profile.education')} placeholder={t('memberArea.profile.educationPlaceholder')}
                   {...register('education_level')} />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Input label={t('memberArea.profile.residence')} placeholder={t('memberArea.profile.residencePlaceholder')}
                   {...register('residence_area')} />
            <Input label={t('memberArea.profile.joinedAt')} type="date" {...register('joined_at')} />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Input label={t('memberArea.profile.congregation')} placeholder={t('memberArea.profile.congregationPlaceholder')}
                   {...register('congregation')} />
            <Input label={t('memberArea.profile.mountain')} placeholder={t('memberArea.profile.mountainPlaceholder')}
                   {...register('mountain')} />
          </div>

          <Input label={t('memberArea.profile.mentor')} placeholder={t('memberArea.profile.mentorPlaceholder')}
                 {...register('mentor_name')} />
        </div>

        {/* === Contact d'urgence === */}
        <div className="pt-6 border-t border-white/10 space-y-4">
          <div>
            <h2 className="font-serif text-xl text-white">{t('memberArea.profile.emergency')}</h2>
            <p className="text-xs text-white/50 mt-1">
              {t('memberArea.profile.emergencyDesc')}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label={t('memberArea.profile.emergencyName')} placeholder={t('memberArea.profile.emergencyNamePlaceholder', 'Nom complet')}
                   {...register('emergency_contact_name')} />
            <Input label={t('memberArea.profile.emergencyPhone')} type="tel" placeholder={t('memberArea.profile.emergencyPhonePlaceholder', '+225 ...')}
                   {...register('emergency_contact_phone')} />
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" loading={updateMutation.isPending} disabled={!isDirty}>
            {t('memberArea.profile.save')}
          </Button>
        </div>
      </form>

      {/* Email (lecture seule) */}
      <section className="card-nwc p-5">
        <h2 className="font-serif text-xl text-white mb-2">{t('memberArea.profile.emailLabel')}</h2>
        <p className="text-white/70">{user?.email}</p>
        {!user?.email_verified_at && (
          <p className="mt-2 text-xs text-gold-400">{t('memberArea.profile.emailNotVerified')}</p>
        )}
        <p className="text-xs text-white/40 mt-3">
          {t('memberArea.profile.emailHint')}
        </p>
      </section>
    </div>
  )
}
