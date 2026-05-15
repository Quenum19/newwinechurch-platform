/** Ma cellule d'évangélisation. */
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Calendar, MapPin, User } from 'lucide-react'

import { getMyCell } from '@/api/me'
import Spinner from '@/components/ui/Spinner.jsx'

export default function MyCell() {
  const { t } = useTranslation()
  const { data: cell, isLoading } = useQuery({
    queryKey: ['me', 'cell'],
    queryFn: getMyCell,
  })

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size={32} /></div>
  }

  if (!cell) {
    return (
      <div className="card-nwc p-10 text-center">
        <h1 className="font-serif text-3xl text-white">{t('memberArea.cell.title')}</h1>
        <p className="text-white/60 mt-3">
          {t('memberArea.cell.noCellAssigned', "Tu n'es affecté à aucune cellule pour le moment.")}
        </p>
        <p className="text-sm text-white/50 mt-2">
          {t(
            'memberArea.cell.noCellHelp',
            'Parle-en au pasteur ou à ton gouverneur de département pour rejoindre une cellule de quartier.',
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-script text-2xl text-gold-400">{t('memberArea.cell.title')}</p>
        <h1 className="font-serif text-3xl md:text-4xl text-white">{cell.name}</h1>
        {cell.description && <p className="text-white/60 mt-2 max-w-2xl">{cell.description}</p>}
      </header>

      <div className="grid sm:grid-cols-3 gap-4">
        {cell.zone && (
          <InfoCard icon={MapPin} label={t('memberArea.cell.zoneLabel', 'Zone')} value={cell.zone} />
        )}
        {cell.meeting_day && (
          <InfoCard
            icon={Calendar}
            label={t('memberArea.cell.meeting')}
            value={`${cell.meeting_day}${cell.meeting_time ? ' ' + t('memberArea.cell.atTime', 'à') + ' ' + cell.meeting_time.slice(0, 5) : ''}`}
          />
        )}
        {cell.leader && (
          <InfoCard icon={User} label={t('memberArea.cell.leader')} value={cell.leader.full_name} />
        )}
      </div>

      {cell.meeting_location && (
        <div className="card-nwc p-5">
          <h2 className="font-serif text-xl text-white">
            {t('memberArea.cell.meetingPlace', 'Lieu de réunion')}
          </h2>
          <p className="text-white/70 mt-2">{cell.meeting_location}</p>
        </div>
      )}

      {cell.members?.length > 0 && (
        <div className="card-nwc p-5">
          <h2 className="font-serif text-xl text-white mb-4">
            {t('memberArea.cell.members')} ({cell.members.length})
          </h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {cell.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-wine-700 flex items-center justify-center text-white text-sm">
                    {m.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div>
                  <p className="text-white">{m.full_name}</p>
                  {m.role === 'leader' && (
                    <p className="text-xs text-gold-400">{t('memberArea.cell.leader')}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="card-nwc p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold-400">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-2 text-white">{value}</p>
    </div>
  )
}
