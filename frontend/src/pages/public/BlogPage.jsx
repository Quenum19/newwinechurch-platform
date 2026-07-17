/** Liste publique d'articles de blog — palette Magazine Drop. */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import Spinner from '@/components/ui/Spinner.jsx'
import PublicSectionHeader from '@/components/public/PublicSection.jsx'
import { publicPosts } from '@/api/public'
import { cn } from '@/utils/cn'

const PER_PAGE = 9

export default function BlogPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState({ per_page: PER_PAGE, page: 1 })

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['public', 'posts', filters],
    queryFn: () => publicPosts.list(filters),
    keepPreviousData: true,
  })

  const { data: cats } = useQuery({
    queryKey: ['public', 'posts', 'categories'],
    queryFn: publicPosts.categories,
    staleTime: 10 * 60 * 1000,
  })

  const items = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="bg-public-bone min-h-screen">
      <header className="container-nwc pt-16 lg:pt-24 pb-10">
        <PublicSectionHeader
          eyebrow={t('blog.pageTitle', 'Blog')}
          title={<>{t('blog.heroTitle1', 'Lis,')}<br/><span className="text-public-flame">{t('blog.heroTitle2', 'médite, partage.')}</span></>}
          desc={t('blog.heroDesc', "Articles, témoignages, enseignements. La Parole prolongée par l'écrit.")}
        />

        {cats?.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-1 border-b-2 border-public-ink/15">
            <CatBtn active={!filters.category} onClick={() => setFilters({ ...filters, category: undefined, page: 1 })}>
              {t('common.all', 'Tous')}
            </CatBtn>
            {cats.map((c) => (
              <CatBtn
                key={c.id}
                active={filters.category === c.slug}
                onClick={() => setFilters({ ...filters, category: c.slug, page: 1 })}
              >
                {c.name}
              </CatBtn>
            ))}
          </div>
        )}
      </header>

      <section className="container-nwc pb-24">
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size={32}/></div>
        ) : items.length === 0 ? (
          <div className="border-2 border-public-ink/15 p-12 text-center">
            <FileText size={48} className="mx-auto text-public-ink/30 mb-4"/>
            <p className="font-display uppercase text-2xl text-public-ink">{t('blog.noPosts', 'Aucun article pour le moment.')}</p>
            <p className="mt-2 text-public-ink/60">{t('blog.noPostsHint', 'Reviens bientôt — nous écrivons souvent.')}</p>
          </div>
        ) : (
          <>
            <div className={cn(
              'grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 transition-opacity',
              isFetching && 'opacity-60',
            )}>
              {items.map((p) => <PostCard key={p.id} post={p}/>)}
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

function CatBtn({ active, onClick, children }) {
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

function PostCard({ post: p }) {
  const { i18n } = useTranslation()
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr
  return (
    <Link to={`/blog/${p.slug}`} className="group block">
      <div className="aspect-video relative bg-public-coffee overflow-hidden">
        {p.cover_image ? (
          <img
            src={`/storage/${p.cover_image}`}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-public-flame/40 to-public-coffee"/>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-public-ink/60 via-transparent"/>
        {p.category && (
          <span
            className="absolute top-3 left-3 font-mono text-[10px] uppercase tracking-widest px-2 py-1"
            style={{ backgroundColor: p.category.color || '#1a1a1a', color: '#fdfaf3' }}
          >
            {p.category.name}
          </span>
        )}
      </div>
      <div className="mt-4">
        <h3 className="font-display uppercase text-2xl text-public-ink group-hover:text-public-flame transition leading-tight">
          {p.display_title || p.title}
        </h3>
        {(p.display_excerpt || p.excerpt) && (
          <p className="mt-2 font-editorial text-public-ink/70 line-clamp-3">{p.display_excerpt || p.excerpt}</p>
        )}
        <p className="mt-3 tag-mono text-public-ink/50">
          {p.published_at && format(new Date(p.published_at), 'd MMM yyyy', { locale: dateLocale })}
          {p.author?.name && ` · ${p.author.name}`}
        </p>
      </div>
    </Link>
  )
}
