/** Historique des dons du membre. */
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'

import { getMyDonations } from '@/api/me'
import Spinner from '@/components/ui/Spinner.jsx'

const methodLabels = {
  orange_money: 'Orange Money',
  wave:         'Wave',
  mtn_momo:     'MTN MoMo',
  card:         'Carte',
  cash:         'Cash',
  other:        'Autre',
}

const statusBadge = {
  pending:   'bg-gold-500/20 text-gold-300',
  completed: 'bg-green-500/20 text-green-300',
  failed:    'bg-accent/20 text-accent',
}

export default function MyDonations() {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr
  const numberLocale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR'

  const { data, isLoading } = useQuery({
    queryKey: ['me', 'donations'],
    queryFn: () => getMyDonations({ per_page: 50 }),
  })

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size={32} /></div>
  }

  const donations = data?.data ?? []
  const total = donations.filter((d) => d.status === 'completed')
                          .reduce((sum, d) => sum + Number(d.amount), 0)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-white">{t('memberArea.donations.title')}</h1>
          <p className="text-white/60 mt-1">{t('memberArea.donations.subtitle')}</p>
        </div>
        <Link to="/donner" className="btn-primary">+ {t('memberArea.donations.donateNow')}</Link>
      </header>

      <div className="card-nwc p-5 bg-wine-700/10 border-gold-500/20">
        <p className="text-xs uppercase tracking-wider text-gold-400">
          {t('memberArea.donations.totalConfirmed', 'Total confirmé')}
        </p>
        <p className="font-serif text-3xl text-white mt-1">
          {total.toLocaleString(numberLocale)} <span className="text-gold-400">FCFA</span>
        </p>
      </div>

      {donations.length === 0 ? (
        <div className="card-nwc p-10 text-center">
          <p className="text-white/60">{t('memberArea.donations.noDonations')}</p>
          <Link to="/donner" className="btn-primary mt-4 inline-flex">
            {t('memberArea.donations.firstDonation', 'Faire mon premier don')}
          </Link>
        </div>
      ) : (
        <div className="card-nwc overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-900/50 border-b border-white/5">
                <tr className="text-left text-xs uppercase tracking-wider text-white/50">
                  <th className="px-4 py-3">{t('memberArea.donations.date')}</th>
                  <th className="px-4 py-3">{t('memberArea.donations.amount')}</th>
                  <th className="px-4 py-3">{t('memberArea.donations.method')}</th>
                  <th className="px-4 py-3">{t('memberArea.donations.typeColumn', 'Type')}</th>
                  <th className="px-4 py-3">{t('memberArea.donations.reference')}</th>
                  <th className="px-4 py-3">{t('memberArea.donations.status')}</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((d) => (
                  <tr key={d.id} className="border-b border-white/5 last:border-0 text-white/80">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {format(new Date(d.created_at), 'd MMM yyyy', { locale: dateLocale })}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {Number(d.amount).toLocaleString(numberLocale)} {d.currency}
                    </td>
                    <td className="px-4 py-3">{methodLabels[d.method] || d.method}</td>
                    <td className="px-4 py-3 capitalize">{d.type}</td>
                    <td className="px-4 py-3 text-xs text-white/50 font-mono">{d.reference || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge[d.status]}`}>
                        {d.status === 'completed'
                          ? t('memberArea.donations.statuses.completed')
                          : d.status === 'pending'
                          ? t('memberArea.donations.statuses.pending')
                          : t('memberArea.donations.statuses.failed')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
