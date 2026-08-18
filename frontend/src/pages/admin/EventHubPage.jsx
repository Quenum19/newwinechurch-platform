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
import { useEffect, useMemo, useState, useRef } from 'react'
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
        {activeTab === 'registration' && <RegistrationsPane event={event}/>}
        {activeTab === 'map' && <MapPane event={event}/>}
        {activeTab === 'recap' && <RecapPane event={event}/>}
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

// ============================================================================
// PANE Inscriptions — liste + filtres + export
// ============================================================================

function RegistrationsPane({ event }) {
  const [filters, setFilters] = useState({ mountain: '', commune: '', step: '', search: '' })
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'event-preregs', event.id, filters, page],
    queryFn: () => api.get(`/admin/events/${event.id}/preregistrations`, {
      params: { ...filters, page, per_page: 30 },
    }).then((r) => r.data),
    keepPreviousData: true,
  })

  const rows = data?.data ?? []
  const meta = data?.meta ?? null

  const setFilter = (k, v) => { setPage(1); setFilters((f) => ({ ...f, [k]: v })) }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Recherche nom / email / tel…"
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          className="px-3 py-2 border-2 border-zinc-300 rounded text-sm min-w-[200px]"
        />
        <select value={filters.mountain} onChange={(e) => setFilter('mountain', e.target.value)}
                className="px-3 py-2 border-2 border-zinc-300 rounded text-sm">
          <option value="">Toutes montagnes</option>
          <option value="religion">Religion</option>
          <option value="media">Média</option>
          <option value="gouvernement">Gouvernement</option>
          <option value="economie">Économie</option>
          <option value="education">Éducation</option>
          <option value="famille">Famille</option>
          <option value="art_musique_sport">Art · Musique · Sport</option>
        </select>
        <select value={filters.commune} onChange={(e) => setFilter('commune', e.target.value)}
                className="px-3 py-2 border-2 border-zinc-300 rounded text-sm">
          <option value="">Toutes communes</option>
          {['Abobo','Adjamé','Anyama','Attecoubé','Bingerville','Cocody','Koumassi','Marcory','Plateau','Port-Bouët','Songon','Treichville','Yopougon'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={filters.step} onChange={(e) => setFilter('step', e.target.value)}
                className="px-3 py-2 border-2 border-zinc-300 rounded text-sm">
          <option value="">Toutes étapes</option>
          <option value="pre">Pré-inscrit</option>
          <option value="chose">A choisi</option>
          <option value="ticketed">Ticket émis</option>
        </select>
        <a
          href={`${import.meta.env.VITE_API_URL || '/api'}/admin/events/${event.id}/preregistrations.csv`}
          className="adm-btn inline-flex items-center gap-1 text-xs ml-auto"
        >
          <FileText size={12}/> Export CSV
        </a>
      </div>

      {/* Tableau */}
      {isLoading ? (
        <div className="text-center py-8 text-zinc-500"><Loader2 size={24} className="animate-spin inline"/></div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">Aucune inscription pour l'instant.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-[11px] font-mono uppercase tracking-widest text-zinc-500">
                <th className="py-2 px-2">Nom</th>
                <th className="py-2 px-2">Contact</th>
                <th className="py-2 px-2">Commune</th>
                <th className="py-2 px-2">Montagne</th>
                <th className="py-2 px-2">Bal ?</th>
                <th className="py-2 px-2">Étape</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="py-2 px-2">{r.first_name} {r.name}</td>
                  <td className="py-2 px-2 text-xs">
                    {r.email && <div>{r.email}</div>}
                    {r.phone && <div className="text-zinc-500">{r.phone}</div>}
                  </td>
                  <td className="py-2 px-2 text-xs">
                    {r.commune}{r.quartier && <span className="text-zinc-500"> · {r.quartier}</span>}
                  </td>
                  <td className="py-2 px-2 text-xs">{r.interested_mountain || <span className="text-zinc-400">—</span>}</td>
                  <td className="py-2 px-2 text-center">{r.attended_bal ? '✓' : '·'}</td>
                  <td className="py-2 px-2">
                    <span className={cn(
                      'inline-flex px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest',
                      r.registration_step === 'ticketed' ? 'bg-green-100 text-green-700' :
                      r.registration_step === 'chose'   ? 'bg-blue-100 text-blue-700' :
                                                          'bg-zinc-100 text-zinc-600',
                    )}>{r.registration_step}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex justify-center items-center gap-3 pt-4">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  className="adm-btn text-xs disabled:opacity-30">← Précédent</button>
          <span className="text-xs font-mono">{page} / {meta.last_page} ({meta.total} au total)</span>
          <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}
                  className="adm-btn text-xs disabled:opacity-30">Suivant →</button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// PANE Cartographie — Leaflet centroïdes commune
// ============================================================================

function MapPane({ event }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'event-map', event.id],
    queryFn: () => api.get(`/admin/events/${event.id}/preregistrations/map`).then((r) => r.data),
  })

  // Leaflet chargé en CDN dynamique — évite d'imposer une lib au bundle si
  // la page n'est jamais ouverte. Fallback vers dashboard textuel si offline.
  const [leafletReady, setLeafletReady] = useState(false)
  useEffect(() => {
    if (window.L) { setLeafletReady(true); return }
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)
    const s = document.createElement('script')
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    s.onload = () => setLeafletReady(true)
    document.head.appendChild(s)
  }, [])

  const mapRef = useRef(null)
  const mapInstance = useRef(null)

  useEffect(() => {
    if (! leafletReady || ! data || ! mapRef.current) return
    const L = window.L
    if (mapInstance.current) mapInstance.current.remove()

    const map = L.map(mapRef.current).setView(data.center, data.zoom)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(map)

    data.markers.forEach((m) => {
      const color = m.attended_bal ? '#dc2626' : '#eab308'
      const icon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
        className: '',
        iconSize: [14, 14],
      })
      const popup = `
        <strong>${m.name || 'Sans nom'}</strong><br>
        ${m.phone ? `📞 ${m.phone}<br>` : ''}
        ${m.whatsapp ? `💬 ${m.whatsapp}<br>` : ''}
        ${m.commune}${m.quartier ? ` · ${m.quartier}` : ''}<br>
        ${m.mountain ? `<em>${m.mountain}</em><br>` : ''}
        ${m.attended_bal ? '<span style="color:#dc2626">✓ Bal-goer</span>' : '<span style="color:#eab308">Nouveau</span>'}
      `
      L.marker([m.lat, m.lng], { icon }).addTo(map).bindPopup(popup)
    })
    mapInstance.current = map
    return () => { map.remove(); mapInstance.current = null }
  }, [leafletReady, data])

  if (isLoading) return <div className="text-center py-8"><Loader2 size={24} className="animate-spin inline"/></div>
  if (! data || data.markers?.length === 0) return (
    <div className="text-center py-16 text-zinc-500">
      Aucune inscription géolocalisable pour l'instant.
      <p className="mt-2 text-xs">Les inscriptions apparaissent au fil de l'eau (centroïde de la commune, jitter ±500 m).</p>
    </div>
  )

  return (
    <div>
      <div className="mb-3 text-xs text-zinc-500 flex items-center gap-4 flex-wrap">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full inline-block" style={{ background: '#dc2626' }}/>
          Bal-goer (a participé au Bal DNE)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full inline-block" style={{ background: '#eab308' }}/>
          Nouveau (première venue)
        </span>
        <span className="ml-auto">{data.markers.length} marqueur(s)</span>
      </div>
      <div ref={mapRef} style={{ height: '500px', width: '100%' }} className="rounded border-2 border-zinc-200"/>
    </div>
  )
}

// ============================================================================
// PANE Recap — stats agrégées
// ============================================================================

function RecapPane({ event }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'event-stats', event.id],
    queryFn: () => api.get(`/admin/events/${event.id}/preregistrations/stats`).then((r) => r.data),
  })

  if (isLoading) return <div className="text-center py-8"><Loader2 size={24} className="animate-spin inline"/></div>
  if (! data) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Inscriptions" value={data.total}/>
        <Stat label="Bal-goers" value={data.bal_goers} accent/>
        <Stat label="Nouveaux" value={data.newcomers}/>
        <Stat label="Ont choisi" value={data.chose}/>
        <Stat label="Tickets émis" value={data.ticketed}/>
      </div>

      <section>
        <h3 className="text-sm font-bold uppercase tracking-widest mb-3">Par montagne</h3>
        {Object.keys(data.by_mountain).length === 0 ? (
          <p className="text-sm text-zinc-500">Aucun choix enregistré pour l'instant.</p>
        ) : (
          <div className="space-y-1">
            {Object.entries(data.by_mountain).map(([m, count]) => (
              <div key={m} className="flex items-center justify-between px-3 py-2 bg-zinc-50 rounded">
                <span className="text-sm">{m}</span>
                <span className="font-mono text-sm tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-bold uppercase tracking-widest mb-3">Par commune</h3>
        {Object.keys(data.by_commune).length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune commune renseignée.</p>
        ) : (
          <div className="space-y-1">
            {Object.entries(data.by_commune).map(([c, count]) => (
              <div key={c} className="flex items-center justify-between px-3 py-2 bg-zinc-50 rounded">
                <span className="text-sm">{c}</span>
                <span className="font-mono text-sm tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div className={cn('p-4 rounded border-2', accent ? 'border-[color:var(--adm-accent)] bg-[color:var(--adm-accent)]/5' : 'border-zinc-200')}>
      <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  )
}
