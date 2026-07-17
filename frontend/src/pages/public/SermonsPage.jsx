/**
 * Liste publique des sermons — Archives.
 *
 * Pivot du système d'archivage : 4 axes de filtrage combinables (série, thème,
 * année, type) + recherche full-text. Pensé pour retrouver un message
 * facilement même dans 20 ans.
 */
import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Headphones, Play, Search, ChevronLeft, ChevronRight, X, SlidersHorizontal, Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import Spinner from '@/components/ui/Spinner.jsx'
import PublicSectionHeader from '@/components/public/PublicSection.jsx'
import { publicSermons, publicSermonSeries, publicSermonThemes } from '@/api/public'

const PER_PAGE = 12

export default function SermonsPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()

  // Sync filters depuis URL (deep linking : un thème cliqué arrive avec ?theme=priere).
  const filters = useMemo(() => ({
    per_page: PER_PAGE,
    page: parseInt(searchParams.get('page') || '1', 10),
    type:    searchParams.get('type')    || undefined,
    series:  searchParams.get('series')  || undefined,
    theme:   searchParams.get('theme')   || undefined,
    year:    searchParams.get('year')    || undefined,
    search:  searchParams.get('search')  || undefined,
  }), [searchParams])

  const [searchInput, setSearchInput] = useState(filters.search || '')
  const [showFilters, setShowFilters] = useState(false)

  // Debounce search 400ms vers l'URL.
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams)
      if (searchInput.trim()) next.set('search', searchInput.trim())
      else next.delete('search')
      next.delete('page')
      if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true })
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['public', 'sermons', filters],
    queryFn: () => publicSermons.list(filters),
    keepPreviousData: true,
  })

  const { data: seriesList = [] } = useQuery({
    queryKey: ['public', 'sermon-series-list'],
    queryFn: () => publicSermonSeries.list(),
    staleTime: 10 * 60 * 1000,
  })
  const { data: themesList = [] } = useQuery({
    queryKey: ['public', 'sermon-themes-list'],
    queryFn: () => publicSermonThemes.list(),
    staleTime: 10 * 60 * 1000,
  })

  const items = data?.data ?? []
  const meta  = data?.meta

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page')
    setSearchParams(next, { replace: false })
  }
  const setPage = (page) => {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(page))
    setSearchParams(next, { replace: false })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const clearFilters = () => {
    setSearchInput('')
    setSearchParams({}, { replace: false })
  }

  const activeCount = Object.entries(filters)
    .filter(([k, v]) => v && !['per_page', 'page'].includes(k))
    .length

  // Années disponibles (dynamique - 5 ans en arrière jusqu'à cette année).
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i)

  return (
    <div className="bg-public-bone min-h-screen">
      <header className="container-nwc pt-16 lg:pt-24 pb-8">
        <PublicSectionHeader
          eyebrow={t('sermons.pageTitle', 'Archives')}
          title={<>{t('sermons.heroTitle1', 'La Parole')}<br/><span className="text-public-flame">{t('sermons.heroTitle2', 'vivante.')}</span></>}
          desc={t('sermons.heroDesc', 'Tous les messages prêchés à NWC, en audio et en vidéo. Sois nourri par la Parole.')}
        />

        {/* Search principale */}
        <div className="mt-10 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[240px] max-w-xl">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-public-ink/40"/>
            <input
              type="text"
              placeholder={t('sermons.searchPlaceholder', 'Titre, référence biblique, prédicateur…')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-transparent border-2 border-public-ink/20 pl-9 pr-4 py-2.5 text-public-ink placeholder-public-ink/40 focus:border-public-ink focus:outline-none transition font-mono text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="border-2 border-public-ink/20 px-3 py-2.5 font-mono text-xs uppercase tracking-widest text-public-ink hover:border-public-ink transition inline-flex items-center gap-2"
          >
            <SlidersHorizontal size={13}/>
            {t('sermons.filters', 'Filtres')}
            {activeCount > 0 && (
              <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 bg-public-flame text-public-bone text-[10px] rounded-full">
                {activeCount}
              </span>
            )}
          </button>
          {meta && (
            <span className="ml-auto tag-mono text-public-ink/50">
              {meta.total} {meta.total > 1 ? t('sermons.messagesPlural', 'messages') : t('sermons.messageSingular', 'message')}
            </span>
          )}
        </div>

        {/* Panneau filtres avancés */}
        {showFilters && (
          <div className="mt-4 border-2 border-public-ink/15 bg-public-bone p-4 sm:p-5 space-y-4">
            {/* Type */}
            <FilterRow label={t('sermons.filterType', 'Type')}>
              <FilterChip active={!filters.type} onClick={() => setFilter('type', '')}>
                {t('sermons.allTypes', 'Tous')}
              </FilterChip>
              <FilterChip active={filters.type === 'video'} onClick={() => setFilter('type', 'video')}>
                {t('media.video', 'Vidéo')}
              </FilterChip>
              <FilterChip active={filters.type === 'audio'} onClick={() => setFilter('type', 'audio')}>
                {t('media.audio', 'Audio')}
              </FilterChip>
            </FilterRow>

            {/* Année */}
            <FilterRow label={t('sermons.filterYear', 'Année')}>
              <FilterChip active={!filters.year} onClick={() => setFilter('year', '')}>
                {t('sermons.allYears', 'Toutes')}
              </FilterChip>
              {years.map((y) => (
                <FilterChip key={y} active={String(filters.year) === String(y)} onClick={() => setFilter('year', String(y))}>
                  {y}
                </FilterChip>
              ))}
            </FilterRow>

            {/* Série */}
            {seriesList.length > 0 && (
              <FilterRow label={t('sermons.filterSeries', 'Série')}>
                <FilterChip active={!filters.series} onClick={() => setFilter('series', '')}>
                  {t('sermons.allSeries', 'Toutes')}
                </FilterChip>
                {seriesList.slice(0, 12).map((s) => (
                  <FilterChip key={s.id} active={filters.series === s.slug} onClick={() => setFilter('series', s.slug)}>
                    {s.display_title || s.title}
                  </FilterChip>
                ))}
              </FilterRow>
            )}

            {/* Thèmes */}
            {themesList.length > 0 && (
              <FilterRow label={t('sermons.filterTheme', 'Thème')}>
                <FilterChip active={!filters.theme} onClick={() => setFilter('theme', '')}>
                  {t('sermons.allThemes', 'Tous')}
                </FilterChip>
                {themesList.map((tm) => (
                  <FilterChip
                    key={tm.id}
                    active={filters.theme === tm.slug}
                    onClick={() => setFilter('theme', tm.slug)}
                    color={tm.color}
                  >
                    {tm.name}
                  </FilterChip>
                ))}
              </FilterRow>
            )}

            {activeCount > 0 && (
              <div className="flex justify-end pt-2 border-t border-public-ink/15">
                <button onClick={clearFilters} className="text-xs font-mono uppercase tracking-widest text-public-ink/60 hover:text-public-flame transition inline-flex items-center gap-1">
                  <X size={12}/> {t('sermons.clearFilters', 'Effacer tous les filtres')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pills de filtres actifs (toujours visibles, même filtres fermés) */}
        {activeCount > 0 && !showFilters && (
          <div className="mt-3 flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] uppercase tracking-widest text-public-ink/40 font-mono">
              {t('sermons.activeFilters', 'Filtres actifs:')}
            </span>
            {Object.entries(filters).filter(([k, v]) => v && !['per_page', 'page'].includes(k)).map(([k, v]) => (
              <ActiveFilterPill key={k} label={`${k}: ${v}`} onRemove={() => setFilter(k, '')} />
            ))}
            <button onClick={clearFilters} className="text-[10px] uppercase tracking-widest text-public-flame underline ml-1">
              {t('sermons.clearAll', 'Tout effacer')}
            </button>
          </div>
        )}
      </header>

      <section className="container-nwc pb-24">
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size={32}/></div>
        ) : items.length === 0 ? (
          <EmptyState hasFilters={activeCount > 0} onClear={clearFilters}/>
        ) : (
          <>
            <div className={`grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
              {items.map((s) => <SermonCard key={s.id} sermon={s}/>)}
            </div>

            {meta?.last_page > 1 && (
              <div className="mt-16 flex items-center justify-center gap-2">
                <button
                  disabled={meta.current_page <= 1}
                  onClick={() => setPage(meta.current_page - 1)}
                  className="btn-outline-ink py-2 px-4 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14}/> {t('common.previous', 'Précédent')}
                </button>
                <span className="font-mono text-xs uppercase tracking-widest text-public-ink/60 px-4">
                  {meta.current_page} / {meta.last_page}
                </span>
                <button
                  disabled={meta.current_page >= meta.last_page}
                  onClick={() => setPage(meta.current_page + 1)}
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

function FilterRow({ label, children }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-public-ink/50 w-16 shrink-0">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5 flex-1">{children}</div>
    </div>
  )
}

function FilterChip({ active, onClick, color, children }) {
  const accent = color || '#0A0908'
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-xs font-mono uppercase tracking-wider border transition ${
        active
          ? 'text-public-bone border-public-ink'
          : 'text-public-ink/70 border-public-ink/20 hover:border-public-ink/60'
      }`}
      style={active ? { background: accent, borderColor: accent } : {}}
    >
      {children}
    </button>
  )
}

function ActiveFilterPill({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-public-ink/8 border border-public-ink/20 text-[10px] uppercase tracking-widest text-public-ink/70 font-mono">
      {label}
      <button onClick={onRemove} className="hover:text-public-flame"><X size={10}/></button>
    </span>
  )
}

function EmptyState({ hasFilters, onClear }) {
  const { t } = useTranslation()
  return (
    <div className="border-2 border-public-ink/15 p-12 text-center">
      <Play size={48} className="mx-auto text-public-ink/30 mb-4"/>
      <p className="font-display uppercase text-2xl text-public-ink">{t('sermons.empty', 'Aucun message trouvé.')}</p>
      <p className="mt-2 text-public-ink/60">
        {hasFilters
          ? t('sermons.emptyWithFilters', 'Aucun message ne correspond aux filtres actifs.')
          : t('sermons.emptyHint', 'Essaie un autre filtre ou reviens plus tard.')}
      </p>
      {hasFilters && (
        <button onClick={onClear} className="btn-outline-ink mt-4">
          {t('sermons.clearFilters', 'Effacer les filtres')}
        </button>
      )}
    </div>
  )
}

function SermonCard({ sermon }) {
  const { t } = useTranslation()
  const Icon = sermon.type === 'audio' ? Headphones : Play
  const themes = (sermon.themes ?? []).slice(0, 2)
  return (
    <Link to={`/messages/${sermon.slug}`} className="group block">
      <div className="aspect-video relative bg-public-coffee overflow-hidden">
        {sermon.thumbnail ? (
          <img
            src={sermon.thumbnail}
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

        {/* Type badge (haut-gauche) */}
        <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 bg-public-flame text-public-bone font-mono text-[10px] uppercase tracking-widest">
          <Icon size={9}/>
          {sermon.type === 'audio' ? t('media.audio', 'Audio') : t('media.video', 'Vidéo')}
          {sermon.duration_seconds && (
            <> · {Math.round(sermon.duration_seconds / 60)} {t('common.minutes', 'min')}</>
          )}
        </div>

        {/* Série badge (haut-droite, si applicable) */}
        {sermon.series?.title && (
          <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 bg-public-bone/95 text-public-ink font-mono text-[10px] uppercase tracking-widest max-w-[60%] truncate">
            <Layers size={9}/>
            {sermon.series.display_title || sermon.series.title}
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="h-16 w-16 rounded-full bg-public-flame/95 flex items-center justify-center">
            <Play size={20} fill="white" className="text-white ml-1"/>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <h3 className="font-display uppercase text-2xl text-public-ink group-hover:text-public-flame transition-colors leading-none">
          {sermon.display_title || sermon.title}
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
        {themes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {themes.map((tm) => (
              <span
                key={tm.id}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-mono"
                style={{ background: (tm.color || '#0A0908') + '15', color: 'var(--public-ink, #0A0908)' }}
              >
                <span className="h-1 w-1 rounded-full" style={{ background: tm.color || '#0A0908' }} />
                {tm.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
