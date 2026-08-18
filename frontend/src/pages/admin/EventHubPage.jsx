/**
 * EventHubPage — Écran-hub d'UN event, avec onglets dynamiques.
 *
 * URL : /admin/events/:id/hub?tab=xxx
 *
 * Principe : chaque event a UNE page hub. Les onglets visibles dépendent
 * de sa config (`event.modules_enabled` + `event.ticketing_enabled`).
 * Un event Bal aura donc : Vue · Régie · Candidats · Photos · PDF · Recap
 * Un event Festi Grill aura : Vue · Inscriptions · Carte · Choix · Ticket · Photos · Recap
 * Un event simple aura juste : Vue · Recap
 *
 * OBJECTIF ARCHITECTURE : plus jamais ajouter un menu au sidebar admin pour
 * un event précis. Tout drilldown ici. Le sidebar reste fixe, quel que soit
 * le nombre d'events (10, 100, 1000).
 *
 * Les onglets qui pointent vers des pages existantes (BalRegiePage,
 * BalCandidatesPage, BalPhotosPage) les affichent en <iframe scrolling>
 * pour ne rien casser — refactor progressif possible dans un 2ᵉ temps.
 */
import { useEffect, useMemo } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Calendar, Info, Monitor, Users, Camera, FileText,
  Ticket, ClipboardList, ImageIcon, MapPin, Award, Settings,
  ExternalLink, Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import api from '@/api/axios'
import { cn } from '@/utils/cn'

/**
 * Définition des onglets — chacun décrit :
 *  - key         : identifiant unique (query param ?tab=…)
 *  - label       : libellé UI
 *  - icon        : lucide component
 *  - visible(ev) : condition d'affichage selon la config de l'event
 *  - render(ev)  : contenu (composant ou iframe vers page existante)
 *
 * Ajouter un onglet = ajouter une entrée ici. Aucune modification du
 * sidebar, aucune migration nouvelle.
 */
function makeTabs(eventId) {
  const modules = (ev) => ev.modules_enabled ?? {}
  return [
    {
      key: 'overview',
      label: 'Vue d\'ensemble',
      icon: Info,
      visible: () => true,
    },
    {
      key: 'ticketing',
      label: 'Billetterie',
      icon: Ticket,
      visible: (ev) => ev.ticketing_enabled,
      // Redirige vers la vue billetterie globale filtrée sur cet event.
      redirect: (ev) => `/admin/billetterie?event=${ev.slug}`,
    },
    {
      key: 'registration',
      label: 'Inscriptions',
      icon: ClipboardList,
      visible: (ev) => modules(ev).registration === true,
      // Onglet à venir (Bloc C) : liste des inscrits pré-Festi
    },
    {
      key: 'map',
      label: 'Cartographie',
      icon: MapPin,
      visible: (ev) => modules(ev).address_capture === true,
    },
    {
      key: 'live',
      label: 'Écran live · Régie',
      icon: Monitor,
      visible: (ev) => modules(ev).live_screen === true,
      redirect: () => `/admin/bal/${eventId}/regie`,
    },
    {
      key: 'candidates',
      label: 'Candidats',
      icon: Users,
      // Historiquement lié au live_screen (Roi/Reine du bal). Peut devenir
      // un module à part si d'autres events ont besoin de candidats.
      visible: (ev) => modules(ev).live_screen === true,
      redirect: () => `/admin/bal/${eventId}/candidats`,
    },
    {
      key: 'gallery',
      label: 'Galerie · Photos',
      icon: Camera,
      visible: (ev) => modules(ev).media_gallery === true,
      redirect: () => `/admin/bal/${eventId}/photos`,
    },
    {
      key: 'supports',
      label: 'Supports PDF',
      icon: FileText,
      visible: (ev) => modules(ev).live_screen === true,
      redirect: (ev) => `${import.meta.env.VITE_API_URL || '/api'}/admin/events/${eventId}/bal/table-supports`,
      external: true,
    },
    {
      key: 'recap',
      label: 'Recap post-event',
      icon: Award,
      visible: (ev) => ev.starts_at && new Date(ev.starts_at) < new Date(),
    },
    {
      key: 'config',
      label: 'Configuration',
      icon: Settings,
      visible: () => true,
    },
  ]
}

export default function EventHubPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'overview'

  const { data: event, isLoading } = useQuery({
    queryKey: ['admin', 'event', id],
    queryFn: () => api.get(`/admin/events/${id}`).then((r) => r.data.data ?? r.data),
    enabled: !! id,
  })

  const tabs = useMemo(() => makeTabs(id), [id])
  const visibleTabs = useMemo(
    () => event ? tabs.filter((t) => t.visible(event)) : [],
    [event, tabs],
  )
  const currentTab = visibleTabs.find((t) => t.key === activeTab) ?? visibleTabs[0]

  // Onglets à "redirect" : dès qu'on clique dessus, on navigue vers la page
  // existante (ex : /admin/bal/:id/regie). Le hub reste le point d'entrée
  // canonique mais on ne duplique pas le code des pages historiques.
  useEffect(() => {
    if (! currentTab?.redirect || ! event) return
    const url = currentTab.redirect(event)
    if (currentTab.external) window.open(url, '_blank')
    else window.location.assign(url)
    // Reset onglet à overview pour ne pas re-trigger la redirect au retour.
    setSearchParams({ tab: 'overview' }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab?.key])

  if (isLoading) return (
    <div className="adm-card p-16 text-center text-zinc-500">
      <Loader2 size={24} className="animate-spin inline"/>
    </div>
  )
  if (! event) return (
    <div className="adm-card p-16 text-center">
      <p className="text-base text-zinc-600">Événement introuvable.</p>
      <Link to="/admin/evenements" className="adm-btn adm-btn-primary mt-4 inline-flex">
        Retour à la liste
      </Link>
    </div>
  )

  const startsAt = event.starts_at ? new Date(event.starts_at) : null

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Breadcrumb */}
      <Link
        to="/admin/evenements"
        className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-zinc-500 hover:text-[color:var(--adm-accent)]"
      >
        <ArrowLeft size={12}/> Événements
      </Link>

      {/* Header event */}
      <header className="adm-card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--adm-accent)] mb-1">
              Event Hub
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--adm-text)' }}>
              {event.title}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-zinc-500 flex-wrap">
              {startsAt && (
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12}/> {format(startsAt, 'EEEE d MMMM yyyy', { locale: fr })}
                </span>
              )}
              {event.location && <span>· {event.location}</span>}
              {event.is_published ? (
                <span className="px-2 py-0.5 text-[10px] uppercase tracking-widest bg-green-500/20 text-green-500 rounded">
                  Publié
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] uppercase tracking-widest bg-zinc-500/20 text-zinc-500 rounded">
                  Brouillon
                </span>
              )}
            </div>
          </div>
          <Link
            to={`/evenements/${event.slug}`}
            target="_blank"
            className="adm-btn inline-flex items-center gap-1 text-xs"
          >
            Voir la page publique <ExternalLink size={12}/>
          </Link>
        </div>
      </header>

      {/* Onglets — scroll horizontal sur mobile si trop nombreux */}
      <nav className="adm-card px-2 py-1 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = tab.key === activeTab
            return (
              <button
                key={tab.key}
                onClick={() => setSearchParams({ tab: tab.key }, { replace: true })}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-2 rounded text-xs font-mono uppercase tracking-widest transition whitespace-nowrap',
                  isActive
                    ? 'bg-[color:var(--adm-accent)] text-white'
                    : 'text-zinc-500 hover:text-[color:var(--adm-text)] hover:bg-black/5',
                )}
              >
                <Icon size={13}/> {tab.label}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Contenu de l'onglet actif */}
      <div className="adm-card p-6 min-h-[300px]">
        {activeTab === 'overview' && <OverviewPane event={event}/>}
        {activeTab === 'registration' && <PlaceholderPane title="Inscriptions" note="Onglet en développement — arrivera avec le Bloc C."/>}
        {activeTab === 'map' && <PlaceholderPane title="Cartographie transport" note="Onglet en développement — arrivera avec le Bloc C."/>}
        {activeTab === 'recap' && <PlaceholderPane title="Recap post-event" note="Onglet en développement — arrivera avec le Bloc E."/>}
        {activeTab === 'config' && <ConfigPane event={event}/>}
      </div>
    </div>
  )
}

// ============================================================================

function OverviewPane({ event }) {
  const modules = event.modules_enabled ?? {}
  const enabledModules = Object.entries(modules).filter(([, v]) => !!v && v !== null)

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-3">Description</h2>
        <p className="text-sm text-zinc-600 whitespace-pre-line">
          {event.description || <em className="text-zinc-400">Aucune description.</em>}
        </p>
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-3">Modules activés</h2>
        {enabledModules.length === 0 ? (
          <p className="text-sm text-zinc-500">
            <em>Aucun module activé.</em> Ouvre l'onglet <strong>Configuration</strong> pour
            activer le formulaire d'inscription, l'écran live, la galerie photos, etc.
          </p>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {enabledModules.map(([k, v]) => (
              <li key={k} className="adm-card px-3 py-2 flex items-center justify-between">
                <span className="font-mono uppercase tracking-widest">{k}</span>
                {typeof v === 'boolean' ? (
                  <span className="text-green-500">✓</span>
                ) : (
                  <span className="text-zinc-500">{String(v)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-3">Actions rapides</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/admin/evenements/${event.id}`}
            className="adm-btn inline-flex items-center gap-1 text-xs"
          >
            <FileText size={12}/> Éditer l'event
          </Link>
          {event.ticketing_enabled && (
            <Link
              to={`/admin/billetterie?event=${event.slug}`}
              className="adm-btn inline-flex items-center gap-1 text-xs"
            >
              <Ticket size={12}/> Voir les tickets
            </Link>
          )}
        </div>
      </section>
    </div>
  )
}

function ConfigPane({ event }) {
  // Édition JSON directe pour l'instant — UI dédiée à venir plus tard.
  // Volontairement simple : le rôle de cet onglet est de VOIR la config
  // actuelle, pas de la modifier finement (ça viendra avec le Bloc C).
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        Cette page affiche la configuration brute de l'event. L'édition
        graphique arrive avec le Bloc C — pour l'instant, modifie directement
        les JSON via l'API ou via seeds/migrations.
      </p>
      <section>
        <h3 className="text-xs font-mono uppercase tracking-widest text-[color:var(--adm-accent)] mb-2">
          modules_enabled
        </h3>
        <pre className="adm-card p-3 text-xs overflow-x-auto bg-black/5">
{JSON.stringify(event.modules_enabled ?? {}, null, 2)}
        </pre>
      </section>
      <section>
        <h3 className="text-xs font-mono uppercase tracking-widest text-[color:var(--adm-accent)] mb-2">
          registration_form_config
        </h3>
        <pre className="adm-card p-3 text-xs overflow-x-auto bg-black/5">
{JSON.stringify(event.registration_form_config ?? {}, null, 2)}
        </pre>
      </section>
      <section>
        <h3 className="text-xs font-mono uppercase tracking-widest text-[color:var(--adm-accent)] mb-2">
          brand_frames
        </h3>
        <pre className="adm-card p-3 text-xs overflow-x-auto bg-black/5">
{JSON.stringify(event.brand_frames ?? {}, null, 2)}
        </pre>
      </section>
    </div>
  )
}

function PlaceholderPane({ title, note }) {
  return (
    <div className="text-center py-12">
      <p className="text-lg font-bold text-zinc-600 mb-2">{title}</p>
      <p className="text-sm text-zinc-500">{note}</p>
    </div>
  )
}
