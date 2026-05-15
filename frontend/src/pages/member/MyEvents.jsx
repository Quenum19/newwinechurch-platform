/** Mes événements (inscriptions). */
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'

import { getMyEvents } from '@/api/me'
import Spinner from '@/components/ui/Spinner.jsx'

export default function MyEvents() {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr
  const dateFormat = i18n.language?.startsWith('en')
    ? "EEEE d MMMM yyyy 'at' HH:mm"
    : "EEEE d MMMM yyyy 'à' HH'h'mm"

  const { data, isLoading } = useQuery({
    queryKey: ['me', 'events'],
    queryFn: () => getMyEvents({ per_page: 30 }),
  })

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size={32} /></div>
  }

  const registrations = data?.data ?? []

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-white">{t('memberArea.events.title')}</h1>
        <p className="text-white/60 mt-1">
          {t('memberArea.events.headerSubtitle', 'Tes inscriptions passées et à venir.')}
        </p>
      </header>

      {registrations.length === 0 ? (
        <div className="card-nwc p-10 text-center">
          <p className="text-white/60">{t('memberArea.events.noEvents')}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {registrations.map((r) => {
            const e = r.event
            const startsAt = e?.starts_at ? new Date(e.starts_at) : null
            const isPast = startsAt && startsAt < new Date()
            return (
              <div key={r.id} className="card-nwc p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-xl text-white">{e?.title}</h3>
                    {startsAt && (
                      <p className="text-sm text-gold-400 mt-1">
                        {format(startsAt, dateFormat, { locale: dateLocale })}
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    isPast ? 'bg-white/10 text-white/50' : 'bg-gold-500/20 text-gold-300'
                  }`}>
                    {isPast ? t('memberArea.events.past') : t('memberArea.events.upcoming')}
                  </span>
                </div>
                {e?.location && <p className="text-sm text-white/50 mt-2">📍 {e.location}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
