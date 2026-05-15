/**
 * GovernorProfileCard — vue publique du profil d'un gouverneur.
 * Utilisé dans les dashboards et la page département publique.
 */
import { motion } from 'framer-motion'
import { User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

export default function GovernorProfileCard({ governor, profile, departmentName, compact = false, className }) {
  const { t } = useTranslation()
  if (!governor) return null

  const photo = profile?.photo_profile_url ?? governor.avatar
  const banner = profile?.banner_image_url

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'rounded-2xl bg-ink-900 border border-white/5 overflow-hidden',
        className,
      )}
    >
      {/* Bannière */}
      <div className="relative h-32 sm:h-40 bg-gradient-to-br from-wine-700 to-wine-900">
        {banner && (
          <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-transparent to-transparent" />
      </div>

      {/* Corps */}
      <div className="px-5 pb-5 -mt-10 relative">
        <div className="flex items-end gap-4">
          {photo ? (
            <img
              src={photo}
              alt={governor.full_name ?? governor.name}
              className="h-20 w-20 rounded-xl object-cover border-4 border-ink-900 shadow-lg"
            />
          ) : (
            <div className="h-20 w-20 rounded-xl bg-wine-700 border-4 border-ink-900 flex items-center justify-center text-white shadow-lg">
              <User size={32} />
            </div>
          )}
          <div className="pb-1">
            <h3 className="text-lg font-semibold text-white">{governor.full_name ?? governor.name}</h3>
            <p className="text-xs text-gold-300">{t('common.governor', 'Gouverneur')}{departmentName ? ` — ${departmentName}` : ''}</p>
          </div>
        </div>

        {!compact && (
          <div className="mt-4 space-y-2">
            {profile?.bio && (
              <p className="text-sm text-white/75 leading-relaxed">{profile.bio}</p>
            )}
            {profile?.vision_statement && (
              <blockquote className="text-sm italic text-white/60 border-l-2 border-gold-500/50 pl-3">
                « {profile.vision_statement} »
              </blockquote>
            )}
            <div className="flex flex-wrap gap-3 text-xs text-white/50 pt-2">
              {profile?.years_in_role > 0 && (
                <span>
                  {profile.years_in_role}{' '}
                  {profile.years_in_role > 1
                    ? t('common.yearsInRolePlural', 'ans en fonction')
                    : t('common.yearsInRoleSingular', 'an en fonction')}
                </span>
              )}
              {profile?.phone_direct && <span>📞 {profile.phone_direct}</span>}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
