/**
 * Page Communauté — départements + cellules.
 *
 * Design v2 :
 *  - Hero éditorial Magazine Drop
 *  - Grille uniforme avec icône représentative par département (mapping Lucide)
 *  - Filtre rapide par recherche (nom)
 *  - Lien vers la page détail /communaute/:slug
 *  - Gouverneur + nb membres en footer de carte
 */
import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Crown, Search, Users, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import Spinner from '@/components/ui/Spinner.jsx'
import PublicSectionHeader from '@/components/public/PublicSection.jsx'
import DepartmentIcon from '@/utils/departmentIcons.jsx'
import { publicDepartments } from '@/api/public'

export default function CommunityPage() {
  const { t } = useTranslation()
  const [q, setQ] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['public', 'departments'],
    queryFn: publicDepartments.list,
    staleTime: 5 * 60 * 1000,
  })
  const all = data?.data ?? []
  // Normalise une chaîne : minuscules + sans accents (NFD + suppression diacritiques).
  // → "média" et "media" matchent ; "Évangélisation" trouvable via "evangelisation".
  const norm = (s) => (s ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  const depts = useMemo(() => {
    if (! q.trim()) return all
    const needle = norm(q.trim())
    return all.filter((d) =>
      norm(d.name).includes(needle) ||
      norm(d.description ?? '').includes(needle)
    )
  }, [all, q])

  const totalMembers = all.reduce((sum, d) => sum + (d.members_count ?? 0), 0)
  const staffed = all.filter((d) => d.captain).length

  return (
    <div className="bg-public-bone min-h-screen">
      {/* Hero éditorial */}
      <header className="container-nwc pt-16 lg:pt-24 pb-10">
        <PublicSectionHeader
          eyebrow={t('community.pageTitle', 'Communauté')}
          title={<>{t('community.heroTitle1', 'Trouve')}<br/><span className="text-public-flame">{t('community.heroTitle2', 'ta place.')}</span></>}
          desc={<>{t('community.heroDesc', "« Comme dans un seul corps, nous avons plusieurs membres » — Romains 12:4. Chaque département est une porte d'entrée vers le service.")}</>}
        />

        {all.length > 0 && (
          <div className="mt-10 grid grid-cols-3 gap-4 max-w-2xl border-t-2 border-public-ink/15 pt-6">
            <Stat value={all.length} label={t('community.departmentsLabel', 'Départements')}/>
            <Stat value={staffed} label={t('community.governorsLabel', 'Gouverneurs actifs')}/>
            <Stat value={totalMembers} label={t('community.membersLabel', 'Membres servants')}/>
          </div>
        )}

        <div className="mt-10 relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-public-ink/40"/>
          <input
            type="search"
            placeholder={t('community.searchPlaceholder', 'Chercher un département…')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full bg-transparent border-2 border-public-ink/20 pl-9 pr-4 py-2.5 text-public-ink placeholder-public-ink/40 focus:border-public-ink focus:outline-none transition font-mono text-sm"
          />
        </div>
      </header>

      {/* Grille départements */}
      <section className="container-nwc pb-24">
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size={32}/></div>
        ) : depts.length === 0 ? (
          <div className="border-2 border-public-ink/15 p-12 text-center">
            <Users size={48} className="mx-auto text-public-ink/30 mb-4"/>
            <p className="font-display uppercase text-2xl text-public-ink">
              {q ? t('community.noResults', 'Aucun département trouvé.') : t('community.soonOnline', 'Bientôt en ligne.')}
            </p>
            {q && <p className="mt-2 text-public-ink/60">{t('community.tryAnother', 'Essaie avec un autre mot-clé.')}</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {depts.map((d) => <DeptCard key={d.id} dept={d}/>)}
          </div>
        )}
      </section>

      {/* CTA bas de page */}
      <section className="bg-public-coffee text-public-bone py-16 lg:py-24">
        <div className="container-nwc grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="tag-mono text-public-flame mb-3">{t('community.ctaEyebrow', 'Tu cherches ta mission ?')}</p>
            <h2 className="heading-anton text-4xl sm:text-6xl text-public-bone leading-[0.95]">
              {t('community.ctaTitle1', 'On a une place')}<br/><span className="text-public-flame">{t('community.ctaTitle2', 'pour toi.')}</span>
            </h2>
          </div>
          <div className="space-y-4">
            <p className="font-editorial text-xl text-public-bone/85 leading-relaxed">
              {t('community.ctaDesc', 'Aucun département ne te parle ? Écris-nous. On te trouve un gouverneur, une équipe, un service où tu vas grandir.')}
            </p>
            <Link to="/contact" className="btn-flame inline-flex">
              {t('community.ctaWriteToPastor', 'Écrire au pasteur')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function Stat({ value, label }) {
  return (
    <div>
      <p className="heading-anton text-4xl sm:text-5xl text-public-flame leading-none">{value}</p>
      <p className="tag-mono text-public-ink/60 mt-2">{label}</p>
    </div>
  )
}

function DeptCard({ dept: d }) {
  const { t } = useTranslation()
  const color = d.color || '#FF4A1C'
  const qc = useQueryClient()

  // Prefetch au hover : la page détail est servie instantanément au clic.
  const prefetch = () => {
    qc.prefetchQuery({
      queryKey: ['public', 'departments', d.slug, 'bundle'],
      queryFn:  () => publicDepartments.get(d.slug),
      staleTime: 30_000,
    })
  }

  return (
    <Link
      to={`/communaute/${d.slug}`}
      onMouseEnter={prefetch}
      onFocus={prefetch}
      className="group bg-public-bone border-2 border-public-ink/15 p-5 hover:border-public-flame transition-all relative block"
    >
      <div className="flex items-start gap-4">
        <div
          className="h-14 w-14 shrink-0 flex items-center justify-center group-hover:scale-110 transition-transform"
          style={{ backgroundColor: color }}
        >
          <DepartmentIcon name={d.icon} size={26} className="text-public-bone"/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display uppercase text-xl text-public-ink leading-tight group-hover:text-public-flame transition-colors line-clamp-2">
            {d.name}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {d.captain ? (
              <span className="tag-mono text-public-flame inline-flex items-center gap-1">
                <Crown size={10}/> {d.captain.name}
              </span>
            ) : (
              <span className="tag-mono text-public-ink/30 italic">{t('community.governorVacant', 'Gouverneur à pourvoir')}</span>
            )}
            {d.members_count > 0 && (
              <span className="tag-mono text-public-ink/50 inline-flex items-center gap-1">
                <Users size={10}/> {d.members_count}
              </span>
            )}
          </div>
        </div>
        <ChevronRight size={18} className="text-public-ink/30 group-hover:text-public-flame group-hover:translate-x-1 transition-all"/>
      </div>
    </Link>
  )
}
