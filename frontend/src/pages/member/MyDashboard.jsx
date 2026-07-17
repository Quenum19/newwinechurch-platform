/**
 * Tableau de bord du membre — accueil de l'espace personnel.
 * Affiche les KPI principaux + raccourcis vers les sections.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { HandCoins, Calendar, Home as HomeIcon, MailCheck } from 'lucide-react'

import { useAuthStore } from '@/store/authStore'
import { getMyDonations, getMyEvents, getMyCell } from '@/api/me'
import MyStaffAssignments from '@/components/MyStaffAssignments.jsx'
import SafeBoundary from '@/components/SafeBoundary.jsx'

export default function MyDashboard() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)

  const { data: donations } = useQuery({
    queryKey: ['me', 'donations', { count: true }],
    queryFn: () => getMyDonations({ per_page: 1 }),
  })

  const { data: events } = useQuery({
    queryKey: ['me', 'events', { count: true }],
    queryFn: () => getMyEvents({ upcoming: 1, per_page: 1 }),
  })

  const { data: cell } = useQuery({
    queryKey: ['me', 'cell'],
    queryFn: getMyCell,
  })

  const donationsTotal = donations?.meta?.total ?? 0
  const eventsTotal    = events?.meta?.total ?? 0

  const verified = !!user?.email_verified_at

  return (
    <div className="space-y-6">
      <header>
        <p className="text-script text-2xl text-gold-400">
          {t('memberArea.dashboard.welcomeLabel', 'Bienvenue,')}
        </p>
        <h1 className="font-serif text-3xl md:text-4xl text-white">
          {user?.first_name || user?.name} 🙌
        </h1>
        <p className="text-white/60 mt-1">
          {t('memberArea.dashboard.tagline', 'Sauvé pour Sauver — voici ton espace.')}
        </p>
      </header>

      {/* Étape F — Missions billetterie actives (null si aucune) */}
      <SafeBoundary>
        <MyStaffAssignments />
      </SafeBoundary>

      {/* Bandeau de vérification email */}
      {!verified && (
        <div className="card-nwc border-gold-500/30 bg-gold-500/5 p-4 flex items-start gap-3">
          <MailCheck className="text-gold-400 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-medium text-white">
              {t('memberArea.dashboard.verifyEmailTitle', 'Vérifie ton email')}
            </p>
            <p className="text-sm text-white/60">
              {t(
                'memberArea.dashboard.verifyEmailDesc',
                "Un lien de vérification t'a été envoyé. Pense à vérifier ta boîte de réception (et les spams) pour activer toutes les fonctionnalités.",
              )}
            </p>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          to="/mon-espace/mes-dons"
          icon={HandCoins}
          label={t('memberArea.dashboard.myDonations')}
          value={donationsTotal}
          unit={
            donationsTotal > 1
              ? t('memberArea.dashboard.donationsRecorded', 'dons enregistrés')
              : t('memberArea.dashboard.donationRecorded', 'don enregistré')
          }
        />
        <KpiCard
          to="/mon-espace/mes-evenements"
          icon={Calendar}
          label={t('memberArea.dashboard.upcomingEvents', 'Événements à venir')}
          value={eventsTotal}
          unit={
            eventsTotal > 1
              ? t('memberArea.dashboard.registrationsPlural', 'inscriptions')
              : t('memberArea.dashboard.registrationsSingular', 'inscription')
          }
        />
        <KpiCard
          to="/mon-espace/ma-cellule"
          icon={HomeIcon}
          label={t('memberArea.dashboard.myCell')}
          value={cell?.name || '—'}
          unit={cell?.zone || t('memberArea.dashboard.noCellYet', 'Pas encore de cellule')}
          isText
        />
      </div>

      {/* Raccourcis */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link to="/mon-espace/profil" className="card-nwc p-5 hover:border-gold-500/30">
          <h3 className="font-serif text-xl text-white">
            {t('memberArea.dashboard.updateProfileTitle', 'Mettre à jour mon profil')}
          </h3>
          <p className="text-sm text-white/60 mt-1">
            {t('memberArea.dashboard.updateProfileDesc', 'Photo, téléphone, ville, biographie...')}
          </p>
        </Link>
        <Link to="/donner" className="card-nwc p-5 hover:border-gold-500/30">
          <h3 className="font-serif text-xl text-white">
            {t('memberArea.dashboard.donateTitle', 'Faire un don')}
          </h3>
          <p className="text-sm text-white/60 mt-1">
            {t('memberArea.dashboard.donateDesc', 'Soutenir la mission via Mobile Money.')}
          </p>
        </Link>
      </div>
    </div>
  )
}

function KpiCard({ to, icon: Icon, label, value, unit, isText }) {
  return (
    <Link to={to} className="card-nwc p-5 group">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-gold-400">{label}</span>
        <Icon className="text-white/30 group-hover:text-gold-400 transition" size={20} />
      </div>
      <div className={`mt-3 ${isText ? 'text-xl' : 'text-3xl'} font-serif text-white`}>
        {value}
      </div>
      <div className="text-xs text-white/50 mt-1">{unit}</div>
    </Link>
  )
}
