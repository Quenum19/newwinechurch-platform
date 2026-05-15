/** Liste publique des événements — palette Magazine Drop. */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { Calendar, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import Spinner from '@/components/ui/Spinner.jsx'
import PublicSectionHeader from '@/components/public/PublicSection.jsx'
import { publicEvents } from '@/api/public'
import { cn } from '@/utils/cn'

export default function EventsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('upcoming')

  const { data, isLoading } = useQuery({
    queryKey: ['public', 'events', tab],
    queryFn: () => publicEvents.list({ per_page: 24, ...(tab === 'past' ? { past: 1 } : {}) }),
  })

  const items = data?.data ?? []

  return (
    <div className="bg-public-bone min-h-screen">
      <header className="container-nwc pt-16 lg:pt-24 pb-10">
        <PublicSectionHeader
          eyebrow={t('events.pageTitle', 'Événements')}
          title={<>{t('events.heroTitle1', 'Vivons-le')}<br/><span className="text-public-flame">{t('events.heroTitle2', 'ensemble.')}</span></>}
          desc={t('events.heroDesc', 'Cultes, nuits de prière, formations, évangélisation. Rejoins-nous.')}
        />

        <div className="mt-10 flex gap-1 border-b-2 border-public-ink/15">
          <TabBtn active={tab === 'upcoming'} onClick={() => setTab('upcoming')}>{t('events.tabUpcoming', 'À venir')}</TabBtn>
          <TabBtn active={tab === 'past'} onClick={() => setTab('past')}>{t('events.tabPast', 'Passés')}</TabBtn>
        </div>
      </header>

      <section className="container-nwc pb-24">
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size={32}/></div>
        ) : items.length === 0 ? (
          <div className="border-2 border-public-ink/15 p-12 text-center">
            <Calendar size={48} className="mx-auto text-public-ink/30 mb-4"/>
            <p className="font-display uppercase text-2xl text-public-ink">
              {tab === 'upcoming' ? t('events.noUpcoming', 'Aucun événement à venir.') : t('events.noPast', 'Aucun événement passé.')}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {items.map((e) => <EventCard key={e.id} event={e}/>)}
          </div>
        )}
      </section>
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-5 py-3 font-mono text-xs uppercase tracking-widest border-b-2 -mb-[2px] transition',
        active
          ? 'border-public-flame text-public-flame'
          : 'border-transparent text-public-ink/60 hover:text-public-ink',
      )}
    >{children}</button>
  )
}

function EventCard({ event: e }) {
  const { i18n } = useTranslation()
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr
  return (
    <Link to={`/evenements/${e.slug}`} className="group block">
      <div className="aspect-video relative bg-public-coffee overflow-hidden">
        {e.cover_image ? (
          <img
            src={`/storage/${e.cover_image}`}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-public-flame/40 to-public-coffee"/>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-public-ink/70 via-transparent"/>
        {e.starts_at && (
          <div className="absolute top-3 left-3 bg-public-bone text-public-ink p-2.5 leading-none">
            <p className="tag-mono text-public-flame">{format(new Date(e.starts_at), 'MMM', { locale: dateLocale })}</p>
            <p className="font-display text-3xl mt-0.5">{format(new Date(e.starts_at), 'd')}</p>
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className="font-display uppercase text-2xl text-public-ink group-hover:text-public-flame transition leading-tight">
          {e.title}
        </h3>
        {e.starts_at && (
          <p className="mt-2 tag-mono text-public-ink/60">
            {format(new Date(e.starts_at), "EEEE · HH'h'mm", { locale: dateLocale })}
          </p>
        )}
        {e.location && (
          <p className="mt-1 text-sm text-public-ink/50 inline-flex items-center gap-1">
            <MapPin size={12}/> {e.location}
          </p>
        )}
      </div>
    </Link>
  )
}
