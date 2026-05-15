/** Liste publique des sermons — palette Magazine Drop (public.*). */
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Headphones, Play, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import Spinner from '@/components/ui/Spinner.jsx'
import PublicSectionHeader from '@/components/public/PublicSection.jsx'
import { publicSermons } from '@/api/public'

const PER_PAGE = 12

export default function SermonsPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState({ per_page: PER_PAGE, page: 1 })
  const [searchInput, setSearchInput] = useState('')

  // Debounce search 400ms.
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((searchInput || '') !== (filters.search || '')) {
        setFilters({ ...filters, search: searchInput || undefined, page: 1 })
      }
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['public', 'sermons', filters],
    queryFn: () => publicSermons.list(filters),
    keepPreviousData: true,
  })

  const items = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="bg-public-bone min-h-screen">
      <header className="container-nwc pt-16 lg:pt-24 pb-12">
        <PublicSectionHeader
          eyebrow={t('sermons.pageTitle', 'Messages')}
          title={<>{t('sermons.heroTitle1', 'La Parole')}<br/><span className="text-public-flame">{t('sermons.heroTitle2', 'vivante.')}</span></>}
          desc={t('sermons.heroDesc', 'Tous les messages prêchés à NWC, en audio et en vidéo. Sois nourri par la Parole.')}
        />

        {/* Filtres */}
        <div className="mt-10 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-public-ink/40"/>
            <input
              type="text"
              placeholder={t('sermons.searchPlaceholder', 'Titre, référence biblique…')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-transparent border-2 border-public-ink/20 pl-9 pr-4 py-2.5 text-public-ink placeholder-public-ink/40 focus:border-public-ink focus:outline-none transition font-mono text-sm"
            />
          </div>
          <select
            className="border-2 border-public-ink/20 px-3 py-2.5 bg-transparent text-public-ink font-mono text-xs uppercase tracking-widest focus:border-public-ink focus:outline-none"
            value={filters.type ?? ''}
            onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined, page: 1 })}
          >
            <option value="">{t('sermons.allTypes', 'Tous types')}</option>
            <option value="video">{t('media.video', 'Vidéo')}</option>
            <option value="audio">{t('media.audio', 'Audio')}</option>
          </select>
          {meta && (
            <span className="ml-auto tag-mono text-public-ink/50">
              {meta.total} {meta.total > 1 ? t('sermons.messagesPlural', 'messages') : t('sermons.messageSingular', 'message')}
            </span>
          )}
        </div>
      </header>

      <section className="container-nwc pb-24">
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size={32}/></div>
        ) : items.length === 0 ? (
          <EmptyState/>
        ) : (
          <>
            <div className={`grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
              {items.map((s) => <SermonCard key={s.id} sermon={s}/>)}
            </div>

            {meta?.last_page > 1 && (
              <div className="mt-16 flex items-center justify-center gap-2">
                <button
                  disabled={meta.current_page <= 1}
                  onClick={() => setFilters({ ...filters, page: meta.current_page - 1 })}
                  className="btn-outline-ink py-2 px-4 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14}/> {t('common.previous', 'Précédent')}
                </button>
                <span className="font-mono text-xs uppercase tracking-widest text-public-ink/60 px-4">
                  {meta.current_page} / {meta.last_page}
                </span>
                <button
                  disabled={meta.current_page >= meta.last_page}
                  onClick={() => setFilters({ ...filters, page: meta.current_page + 1 })}
                  className="btn-outline-ink py-2 px-4 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {t('common.next', 'Suivant')} <ChevronRight size={14}/>
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

function EmptyState() {
  const { t } = useTranslation()
  return (
    <div className="border-2 border-public-ink/15 p-12 text-center">
      <Play size={48} className="mx-auto text-public-ink/30 mb-4"/>
      <p className="font-display uppercase text-2xl text-public-ink">{t('sermons.empty', 'Aucun message trouvé.')}</p>
      <p className="mt-2 text-public-ink/60">{t('sermons.emptyHint', 'Essaie un autre filtre ou reviens plus tard.')}</p>
    </div>
  )
}

function SermonCard({ sermon }) {
  const { t } = useTranslation()
  const Icon = sermon.type === 'audio' ? Headphones : Play
  return (
    <Link to={`/messages/${sermon.slug}`} className="group block">
      <div className="aspect-video relative bg-public-coffee overflow-hidden">
        {sermon.thumbnail ? (
          <img
            src={`/storage/${sermon.thumbnail}`}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-public-flame/60">
            <Icon size={48}/>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-public-ink/80 via-transparent"/>
        <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 bg-public-flame text-public-bone font-mono text-[10px] uppercase tracking-widest">
          <Icon size={9}/>
          {sermon.type === 'audio' ? t('media.audio', 'Audio') : t('media.video', 'Vidéo')}
          {sermon.duration_seconds && (
            <> · {Math.round(sermon.duration_seconds / 60)} {t('common.minutes', 'min')}</>
          )}
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="h-16 w-16 rounded-full bg-public-flame/95 flex items-center justify-center">
            <Play size={20} fill="white" className="text-white ml-1"/>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <h3 className="font-display uppercase text-2xl text-public-ink group-hover:text-public-flame transition-colors leading-none">
          {sermon.title}
        </h3>
        {sermon.scripture_reference && (
          <p className="font-editorial italic text-public-flame text-base mt-2">
            {sermon.scripture_reference}
          </p>
        )}
        {sermon.speaker?.name && (
          <p className="mt-3 tag-mono text-public-ink/50">
            {sermon.speaker.name}
          </p>
        )}
      </div>
    </Link>
  )
}
