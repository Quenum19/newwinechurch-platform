/**
 * Détail public d'un département (Étape 5).
 *
 * Sections :
 *  - Hero immersif : bannière gouverneur + médaillon profil + badges stats
 *  - Gouverneur : card avec photo + bio + vision + bouton contact
 *  - Cellules : grid responsive (carousel horizontal mobile)
 *  - Activités récentes : 6 photos + bouton "voir tout" → /galerie?departement=
 *  - Prochains événements : 3 cards
 *  - Rejoindre : CTA + QR code (api.qrserver.com) + partage URL
 *
 * SEO : useSeoMeta dynamique (title, description, og:image).
 */
import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Crown, Users, Home, Calendar, Mail, ChevronRight,
  MapPin, Clock, Image as ImageIcon, Heart, QrCode, Share2, Phone,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { publicDepartments } from '@/api/public'
import { useSeoMeta } from '@/hooks/useSeoMeta'
import Spinner from '@/components/ui/Spinner.jsx'
import DepartmentIcon, { getDepartmentIcon } from '@/utils/departmentIcons.jsx'

const STORAGE = (p) => p && (p.startsWith('http') ? p : `/storage/${p}`)

export default function DepartmentDetail() {
  const { t, i18n } = useTranslation()
  const { slug } = useParams()

  const { data: bundle, isLoading } = useQuery({
    queryKey: ['public', 'departments', slug, 'bundle'],
    queryFn:  () => publicDepartments.get(slug),
  })

  const { data: allList } = useQuery({
    queryKey: ['public', 'departments'],
    queryFn:  publicDepartments.list,
    staleTime: 5 * 60 * 1000,
  })

  const dept = bundle?.data ?? null
  const cells = bundle?.cells ?? []
  const recentMedia = bundle?.recent_media ?? []
  const upcomingEvents = bundle?.upcoming_events ?? []
  const others = useMemo(
    () => (allList?.data ?? []).filter((d) => d.slug !== slug).slice(0, 4),
    [allList, slug]
  )

  // === SEO ===
  const seoTitle = dept ? `${dept.name} — New Wine Church | Abidjan` : t('department.seoFallback', 'Département — New Wine Church')
  const seoDesc  = (dept?.governor?.profile?.bio
                  ?? dept?.description
                  ?? t('department.seoDescFallback', 'Découvre le département {{name}} de New Wine Church.', { name: dept?.name ?? '' })) || ''
  const seoImg   = dept?.banner_image_url ?? dept?.governor?.profile?.banner_image_url
  useSeoMeta({
    title: seoTitle,
    description: seoDesc.slice(0, 160),
    image: seoImg,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  })

  if (isLoading) {
    return (
      <div className="bg-public-bone min-h-screen flex justify-center items-center pt-32">
        <Spinner size={32} />
      </div>
    )
  }
  if (!dept) {
    return (
      <div className="bg-public-bone min-h-screen container-nwc py-32 text-center text-public-ink/60">
        {t('department.notFound', 'Département introuvable.')}
      </div>
    )
  }

  const color = dept.color_theme || dept.color || '#FF4A1C'
  const Icon = getDepartmentIcon(dept.icon)

  const bannerUrl = dept.banner_image_url ?? dept.governor?.profile?.banner_image_url
  const govPhoto  = dept.governor?.profile?.photo_profile_url
                  ?? (dept.governor?.avatar ? STORAGE(dept.governor.avatar) : null)

  const joinUrl   = `${window.location.origin}/rejoindre?dept=${encodeURIComponent(slug)}`
  const qrUrl     = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=4&data=${encodeURIComponent(joinUrl)}`
  const galleryUrl = `/galerie?departement=${encodeURIComponent(slug)}`
  const contactSubject = encodeURIComponent(t('department.mailSubject', 'Je veux rejoindre — {{name}}', { name: dept.name }))
  const mailto = `mailto:contact@newinechurch.org?subject=${contactSubject}`

  const localeTag = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR'

  return (
    <div className="bg-public-bone min-h-screen">
      {/* ============= HERO ============= */}
      <section className="relative overflow-hidden">
        <div
          className="h-[280px] sm:h-[360px] lg:h-[420px] w-full bg-public-ink relative"
          style={
            bannerUrl
              ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : undefined
          }
        >
          {!bannerUrl && (
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${color}, #1F1B17)` }}
            />
          )}
          {/* Overlay dégradé bas-haut */}
          <div className="absolute inset-0 bg-gradient-to-t from-public-ink/85 via-public-ink/35 to-transparent" />

          {/* Bandeau couleur du dept en haut */}
          <div className="h-[3px] w-full absolute top-0" style={{ backgroundColor: color }} />

          <div className="absolute inset-x-0 bottom-0 container-nwc pb-8 lg:pb-10">
            <Link
              to="/communaute"
              className="font-mono text-xs uppercase tracking-widest text-public-bone/70 hover:text-public-flame inline-flex items-center gap-1 mb-4"
            >
              <ArrowLeft size={14} /> {t('department.allDepartments', 'Tous les départements')}
            </Link>
            <div className="flex items-end gap-4 sm:gap-6">
              {govPhoto ? (
                <img
                  src={govPhoto}
                  alt={dept.governor?.full_name || dept.governor?.name || ''}
                  className="h-[100px] w-[100px] rounded-full object-cover border-[3px] shadow-2xl shrink-0"
                  style={{ borderColor: color }}
                  loading="lazy"
                />
              ) : (
                <div
                  className="h-[100px] w-[100px] rounded-full border-[3px] flex items-center justify-center shadow-2xl shrink-0"
                  style={{ backgroundColor: color, borderColor: color }}
                >
                  <Icon size={44} className="text-public-bone" />
                </div>
              )}
              <div className="min-w-0 pb-2">
                <p className="tag-mono text-public-flame mb-2">{t('department.departmentLabel', 'Département')}</p>
                <h1
                  className="heading-anton text-4xl sm:text-5xl lg:text-6xl text-public-bone leading-[0.95] line-clamp-2"
                  style={{ textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}
                >
                  {dept.name}
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Badges stats */}
        <div className="container-nwc -mt-6 relative z-10">
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            <StatBadge icon={Users} label={t('department.members', 'Membres')} value={dept.member_count_cache ?? dept.members_count ?? 0} />
            <StatBadge icon={Home} label={t('department.cells', 'Cellules')} value={cells.length} />
            {dept.founded_at && (
              <StatBadge icon={Calendar} label={t('department.since', 'Depuis')} value={new Date(dept.founded_at).getFullYear()} />
            )}
            <StatBadge icon={Crown} label={t('department.status', 'Statut')} value={dept.status === 'active' ? t('department.statusActive', 'Actif') : t('department.statusPreparing', 'En préparation')} />
          </div>
        </div>
      </section>

      <article className="container-nwc py-10 lg:py-14 space-y-14">
        {/* ============= GOUVERNEUR CARD ============= */}
        {dept.governor && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="grid lg:grid-cols-[auto,1fr] gap-6 lg:gap-10 items-start"
          >
            <div className="shrink-0">
              {govPhoto ? (
                <img
                  src={govPhoto}
                  alt={dept.governor.full_name ?? dept.governor.name}
                  className="h-40 w-40 lg:h-56 lg:w-56 object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  className="h-40 w-40 lg:h-56 lg:w-56 flex items-center justify-center"
                  style={{ backgroundColor: color }}
                >
                  <Crown size={56} className="text-public-bone" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="tag-mono text-public-flame mb-2">{t('department.ourGovernor', 'Gouverneur')}</p>
              <h2 className="heading-anton text-3xl sm:text-4xl text-public-ink leading-tight">
                {dept.governor.full_name ?? dept.governor.name}
              </h2>
              {dept.governor.profile?.bio && (
                <p className="mt-4 font-editorial text-lg text-public-ink/80 max-w-2xl">
                  {dept.governor.profile.bio}
                </p>
              )}
              {dept.governor.profile?.vision_statement && (
                <blockquote className="mt-5 editorial-quote text-xl text-public-ink/70 italic border-l-4 pl-4 max-w-2xl" style={{ borderColor: color }}>
                  « {dept.governor.profile.vision_statement} »
                </blockquote>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={mailto} className="btn-flame inline-flex items-center gap-2">
                  <Mail size={14} /> {t('department.contact', 'Contacter')}
                </a>
                {dept.governor.profile?.phone_direct && (
                  <a href={`tel:${dept.governor.profile.phone_direct}`}
                     className="btn-outline-ink inline-flex items-center gap-2">
                    <Phone size={14} /> {dept.governor.profile.phone_direct}
                  </a>
                )}
              </div>
            </div>
          </motion.section>
        )}

        {/* ============= CELLULES ============= */}
        {cells.length > 0 && (
          <section>
            <SectionHeader tag={t('department.cellsTag', 'Sur le terrain')} title={t('department.ourCells', 'Nos cellules')} />
            <div className="mt-6 -mx-4 sm:mx-0 overflow-x-auto sm:overflow-visible">
              <div className="px-4 sm:px-0 grid grid-flow-col sm:grid-flow-row auto-cols-[280px] sm:auto-cols-auto sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cells.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    className="border-2 border-public-ink/15 p-5 hover:border-public-flame transition-colors"
                  >
                    <h3 className="font-display uppercase text-lg text-public-ink leading-tight line-clamp-2">
                      {c.name}
                    </h3>
                    {c.leader_first_name && (
                      <p className="font-mono text-xs uppercase tracking-widest text-public-ink/60 mt-2">
                        {t('department.leader', 'Leader')} : {c.leader_first_name}
                      </p>
                    )}
                    <div className="mt-4 space-y-1.5 text-sm text-public-ink/70">
                      {c.zone && <p className="flex items-center gap-1.5"><MapPin size={12} /> {c.zone}</p>}
                      {(c.meeting_day || c.meeting_time) && (
                        <p className="flex items-center gap-1.5">
                          <Clock size={12} />
                          {c.meeting_day && <span className="capitalize">{c.meeting_day}</span>}
                          {c.meeting_time && <span>· {c.meeting_time}</span>}
                        </p>
                      )}
                      {c.meeting_location && <p className="text-xs text-public-ink/50">{c.meeting_location}</p>}
                    </div>
                    <Link
                      to={`/rejoindre?cell=${c.slug}`}
                      className="mt-4 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-public-flame hover:underline"
                    >
                      {t('department.joinCta', 'Rejoindre')} <ChevronRight size={12} />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ============= ACTIVITÉS RÉCENTES ============= */}
        <section>
          <SectionHeader tag={t('department.mediaTag', 'Souvenirs')} title={t('department.recentActivities', 'Nos dernières activités')} />
          {recentMedia.length === 0 ? (
            <div className="mt-6 border-2 border-dashed border-public-ink/15 p-12 text-center">
              <ImageIcon size={36} className="mx-auto text-public-ink/30 mb-3" />
              <p className="font-display uppercase text-lg text-public-ink/60">{t('department.galleryEmpty', 'Galerie en construction')}</p>
              <p className="mt-1 text-sm text-public-ink/50">{t('department.galleryEmptyHint', 'Les premières photos arrivent bientôt.')}</p>
            </div>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-4">
                {recentMedia.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, scale: 0.97 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className={i === 0 ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square'}
                  >
                    {m.file_type === 'video' ? (
                      <div className="relative h-full w-full bg-public-ink overflow-hidden group">
                        <img
                          src={m.thumbnail ? STORAGE(m.thumbnail) : STORAGE(m.file_path)}
                          alt={m.title || ''}
                          loading="lazy"
                          className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="h-12 w-12 rounded-full bg-public-flame flex items-center justify-center">
                            <span className="text-public-bone font-bold">▶</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={STORAGE(m.file_path)}
                        alt={m.title || ''}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover hover:scale-[1.02] transition-transform duration-500"
                      />
                    )}
                  </motion.div>
                ))}
              </div>
              <Link
                to={galleryUrl}
                className="mt-6 btn-outline-ink inline-flex items-center gap-2"
              >
                {t('department.viewAllActivities', 'Voir toutes les activités')} <ChevronRight size={14} />
              </Link>
            </>
          )}
        </section>

        {/* ============= PROCHAINS ÉVÉNEMENTS ============= */}
        {upcomingEvents.length > 0 && (
          <section>
            <SectionHeader tag={t('department.eventsTag', "À l'agenda")} title={t('department.upcomingEvents', 'Prochains événements')} />
            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingEvents.map((e) => {
                const date = e.starts_at ? new Date(e.starts_at) : null
                return (
                  <Link
                    key={e.id}
                    to={`/evenements/${e.slug}`}
                    className="group border-2 border-public-ink/15 p-5 hover:border-public-flame transition-colors flex gap-4"
                  >
                    {date && (
                      <div className="shrink-0 w-16 text-center">
                        <p className="font-display text-3xl text-public-flame leading-none">
                          {date.getDate()}
                        </p>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-public-ink/60 mt-1">
                          {date.toLocaleString(localeTag, { month: 'short' })}
                        </p>
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-display uppercase text-base text-public-ink line-clamp-2 group-hover:text-public-flame transition-colors">
                        {e.title}
                      </h3>
                      {e.location && (
                        <p className="mt-1 text-xs text-public-ink/60 truncate">{e.location}</p>
                      )}
                      {e.description && (
                        <p className="mt-2 text-sm text-public-ink/70 line-clamp-2">{e.description}</p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ============= REJOINDRE / QR ============= */}
        <section
          className="text-public-bone p-8 lg:p-12 relative overflow-hidden"
          style={{ backgroundColor: '#1F1B17' }}
        >
          <div
            className="absolute -right-20 -bottom-20 h-72 w-72 rounded-full opacity-25 blur-2xl"
            style={{ backgroundColor: color }}
          />
          <div className="relative grid lg:grid-cols-[1fr,auto] gap-8 items-center">
            <div>
              <p className="tag-mono text-public-flame mb-3">{t('department.joinCta', 'Rejoindre')}</p>
              <h2 className="heading-anton text-3xl sm:text-5xl leading-[0.95] mb-4">
                {t('department.joinTitle2', 'Rejoindre {{name}}', { name: dept.name.toLowerCase() })}
              </h2>
              <p className="font-editorial text-lg text-public-bone/80 max-w-2xl">
                {t('department.joinDesc', "Scanne le QR code ou clique pour t'inscrire — on t'accueille à la prochaine réunion.")}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to={`/rejoindre?dept=${encodeURIComponent(slug)}`} className="btn-flame inline-flex items-center gap-2">
                  <Heart size={14} /> {t('department.iWantToJoin', 'Je veux rejoindre')}
                </Link>
                <button
                  onClick={async () => {
                    const data = { title: dept.name, url: window.location.href }
                    if (navigator.share) {
                      try { await navigator.share(data) } catch { /* annulé */ }
                    } else {
                      await navigator.clipboard?.writeText(window.location.href)
                    }
                  }}
                  className="btn-outline-bone inline-flex items-center gap-2 text-xs py-2 px-4"
                >
                  <Share2 size={12} /> {t('department.share', 'Partager')}
                </button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 self-center">
              <div className="bg-public-bone p-3">
                <img
                  src={qrUrl}
                  alt={t('department.qrAlt', 'QR code pour rejoindre {{name}}', { name: dept.name })}
                  width="180"
                  height="180"
                  loading="lazy"
                />
              </div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-public-bone/60 flex items-center gap-1">
                <QrCode size={11} /> {t('department.scanToJoin', 'Scanne pour rejoindre')}
              </p>
            </div>
          </div>
        </section>

        {/* ============= SUGGESTIONS ============= */}
        {others.length > 0 && (
          <section>
            <SectionHeader tag={t('department.alsoDiscoverTag', 'À découvrir aussi')} title={t('department.otherDepartments', "D'autres départements")} />
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
              {others.map((o) => <MiniDeptCard key={o.id} dept={o} />)}
            </div>
          </section>
        )}
      </article>
    </div>
  )
}

function SectionHeader({ tag, title }) {
  return (
    <div>
      <p className="tag-mono text-public-flame mb-2">{tag}</p>
      <h2 className="font-display uppercase text-2xl sm:text-3xl text-public-ink">{title}</h2>
    </div>
  )
}

function StatBadge({ icon: Icon, label, value }) {
  return (
    <div className="bg-public-bone shadow-sm border-2 border-public-ink/10 px-4 py-2 flex items-center gap-2">
      <Icon size={16} className="text-public-flame" />
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-public-ink/50 leading-none">{label}</p>
        <p className="font-display text-base text-public-ink leading-none mt-1">{value}</p>
      </div>
    </div>
  )
}

function MiniDeptCard({ dept: d }) {
  const color = d.color_theme || d.color || '#FF4A1C'
  return (
    <Link
      to={`/communaute/${d.slug}`}
      className="group border-2 border-public-ink/15 p-4 hover:border-public-flame transition-colors flex items-center gap-3"
    >
      <div
        className="h-10 w-10 shrink-0 flex items-center justify-center"
        style={{ backgroundColor: color }}
      >
        <DepartmentIcon name={d.icon} size={18} className="text-public-bone" />
      </div>
      <p className="font-display uppercase text-sm text-public-ink group-hover:text-public-flame transition-colors leading-tight line-clamp-2 flex-1 min-w-0">
        {d.name}
      </p>
      <ChevronRight size={14} className="text-public-ink/30 group-hover:text-public-flame transition-colors shrink-0" />
    </Link>
  )
}
