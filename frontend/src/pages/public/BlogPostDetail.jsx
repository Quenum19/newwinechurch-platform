/** Détail d'un article de blog — palette Magazine Drop. */
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'

import Spinner from '@/components/ui/Spinner.jsx'
import { publicPosts } from '@/api/public'

export default function BlogPostDetail() {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr
  const { slug } = useParams()
  const { data: post, isLoading } = useQuery({
    queryKey: ['public', 'posts', slug],
    queryFn: () => publicPosts.get(slug),
  })

  if (isLoading) {
    return (
      <div className="bg-public-bone min-h-screen flex justify-center items-center pt-32">
        <Spinner size={32}/>
      </div>
    )
  }
  if (! post) {
    return (
      <div className="bg-public-bone min-h-screen container-nwc py-32 text-center text-public-ink/60">
        {t('blog.notFound', 'Article introuvable.')}
      </div>
    )
  }

  return (
    <div className="bg-public-bone min-h-screen">
      <article className="container-nwc py-12 lg:py-16 max-w-4xl">
        <Link to="/blog" className="font-mono text-xs uppercase tracking-widest text-public-ink/60 hover:text-public-flame transition-colors inline-flex items-center gap-1 mb-8">
          <ArrowLeft size={14}/> {t('blog.allPosts', 'Tous les articles')}
        </Link>

        <header className="mb-10">
          {post.category && (
            <span
              className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 inline-block mb-5"
              style={{ backgroundColor: post.category.color || '#1a1a1a', color: '#fdfaf3' }}
            >
              {post.category.name}
            </span>
          )}
          <h1 className="heading-anton text-5xl sm:text-7xl lg:text-8xl text-public-ink leading-[0.92]">
            {post.title}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-3 tag-mono text-public-ink/60">
            {post.published_at && (
              <span>{format(new Date(post.published_at), 'd MMMM yyyy', { locale: dateLocale })}</span>
            )}
            {post.author?.name && (
              <>
                <span className="text-public-ink/30">—</span>
                <span className="text-public-ink">{post.author.name}</span>
              </>
            )}
            {post.views_count > 0 && (
              <>
                <span className="text-public-ink/30">·</span>
                <span className="inline-flex items-center gap-1">
                  <Eye size={11}/> {post.views_count.toLocaleString(i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR')} {t('blog.reads', 'lectures')}
                </span>
              </>
            )}
          </div>
        </header>

        {post.cover_image && (
          <div className="aspect-[16/9] overflow-hidden mb-10">
            <img src={`/storage/${post.cover_image}`} alt="" className="w-full h-full object-cover"/>
          </div>
        )}

        {post.excerpt && (
          <div className="border-l-2 border-public-flame pl-6 mb-10 max-w-3xl">
            <p className="editorial-quote text-2xl text-public-ink/80">{post.excerpt}</p>
          </div>
        )}

        {/*
          Le contenu HTML est sanitisé serveur-side (HtmlSanitizer.php) avant
          stockage en BDD. Il est sûr de l'injecter avec dangerouslySetInnerHTML.
        */}
        <div
          className="prose prose-lg max-w-3xl
                     prose-headings:font-display prose-headings:uppercase prose-headings:text-public-ink
                     prose-p:font-editorial prose-p:text-public-ink/85
                     prose-a:text-public-flame prose-a:no-underline hover:prose-a:underline
                     prose-strong:text-public-ink prose-strong:font-bold
                     prose-blockquote:border-l-2 prose-blockquote:border-public-flame
                     prose-blockquote:not-italic prose-blockquote:font-editorial
                     prose-blockquote:text-public-ink/85
                     prose-img:w-full prose-img:object-cover
                     prose-code:bg-public-ink/5 prose-code:text-public-ink prose-code:px-1.5 prose-code:py-0.5
                     prose-pre:bg-public-ink prose-pre:text-public-bone"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </div>
  )
}
