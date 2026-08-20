/**
 * TransportEventDetailPage — Cartographie des inscrits d'un event pour le
 * département Transport. Vue 2D Leaflet avec point central Église + fils
 * araignée reliant chaque inscrit à l'église (visualise la portée logistique).
 *
 * URL : /gouverneur/transport/{eventSlug}
 *
 * Fonctions clés (pour les chauffeurs de navette) :
 *  - Carte cliquable avec popup contact
 *  - Liste ordonnée par commune (organise les tournées)
 *  - Boutons Appeler + WhatsApp directs
 *  - Filtre par commune
 *  - Export CSV pour terrain sans réseau
 */
import { useEffect, useRef, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ArrowLeft, MapPin, Users, Calendar, Phone, MessageCircle,
  Loader2, Truck, Filter, FileText, Church, Search, ChevronDown, ChevronRight, X,
} from 'lucide-react'
import api from '@/api/axios'
import { cn } from '@/utils/cn'

export default function TransportEventDetailPage() {
  const { slug } = useParams()
  const [selectedCommune, setSelectedCommune] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['transport', 'event-detail', slug],
    queryFn: () => api.get(`/transport/events/${slug}`).then((r) => r.data),
  })

  const event = data?.event
  const church = data?.church
  const markers = data?.markers ?? []
  const byCommune = data?.by_commune ?? {}

  const filteredMarkers = useMemo(
    () => selectedCommune ? markers.filter((m) => m.commune === selectedCommune) : markers,
    [markers, selectedCommune],
  )

  return (
    <div className="space-y-4 max-w-6xl">
      <Link
        to="/gouverneur/transport"
        className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-zinc-500 hover:text-[color:var(--adm-accent)]"
      >
        <ArrowLeft size={12}/> Retour aux événements
      </Link>

      {/* Header event */}
      <header className="adm-card p-5">
        <p className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--adm-accent)] mb-1">
          <Truck size={11} className="inline mr-1"/> Transport · Cartographie inscrits
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--adm-text)' }}>
          {event?.title || 'Chargement…'}
        </h1>
        {event && (
          <div className="mt-2 text-sm text-zinc-500 flex flex-wrap items-center gap-3">
            {event.starts_at && (
              <span className="inline-flex items-center gap-1">
                <Calendar size={12}/> {format(new Date(event.starts_at), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
              </span>
            )}
            {event.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12}/> {event.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[color:var(--adm-accent)] font-bold">
              <Users size={12}/> {markers.length} inscrit{markers.length > 1 ? 's' : ''}
              {selectedCommune && <span className="text-zinc-500 font-normal"> · {filteredMarkers.length} affichés</span>}
            </span>
          </div>
        )}
      </header>

      {isLoading ? (
        <div className="text-center py-16"><Loader2 size={24} className="animate-spin inline"/></div>
      ) : markers.length === 0 ? (
        <div className="adm-card p-12 text-center">
          <MapPin size={40} className="mx-auto text-zinc-400 mb-3 opacity-40"/>
          <p className="text-sm text-zinc-600">
            Aucun inscrit géolocalisable pour cet événement.
          </p>
        </div>
      ) : (
        <>
          {/* Barre filtre + export */}
          <div className="adm-card p-3 flex flex-wrap items-center gap-2">
            <Filter size={14} className="text-zinc-400 ml-1"/>
            <select
              value={selectedCommune}
              onChange={(e) => setSelectedCommune(e.target.value)}
              className="px-3 py-2 border-2 border-zinc-300 rounded text-sm"
            >
              <option value="">Toutes les communes ({markers.length})</option>
              {Object.entries(byCommune).map(([c, count]) => (
                <option key={c} value={c}>{c} ({count})</option>
              ))}
            </select>
            <a
              href={`${import.meta.env.VITE_API_URL || '/api'}/transport/events/${slug}/list.csv`}
              className="ml-auto adm-btn inline-flex items-center gap-1 text-xs"
            >
              <FileText size={12}/> Export CSV terrain
            </a>
          </div>

          {/* Grid : carte à gauche, liste à droite */}
          <div className="grid lg:grid-cols-[1fr_380px] gap-4">
            <TransportMap
              church={church}
              markers={filteredMarkers}
            />
            <TransportList
              church={church}
              markers={filteredMarkers}
              byCommune={byCommune}
            />
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// CARTE Leaflet — point central Église + fils araignée + marqueurs communes
// ============================================================================

function TransportMap({ church, markers }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
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

  useEffect(() => {
    if (! leafletReady || ! church || ! mapRef.current) return
    const L = window.L
    if (mapInstance.current) mapInstance.current.remove()

    const map = L.map(mapRef.current).setView([church.lat, church.lng], 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(map)

    // === Point central : ÉGLISE (icône dédiée bordeaux large) ===
    const churchIcon = L.divIcon({
      html: `<div style="width:32px;height:32px;border-radius:50%;background:#8B1A2F;border:4px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:16px">✝</div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    })
    L.marker([church.lat, church.lng], { icon: churchIcon })
      .addTo(map)
      .bindPopup(`<strong>${church.name}</strong><br>${church.address}<br><em>Point de rendez-vous</em>`)

    // === Marqueurs inscrits + FILS ARAIGNÉE vers l'église ===
    const bounds = L.latLngBounds([[church.lat, church.lng]])

    markers.forEach((m) => {
      const color = m.attended_bal ? '#dc2626' : '#eab308'
      const icon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
        className: '',
        iconSize: [14, 14],
      })
      // Fil araignée entre l'inscrit et l'église — fine ligne colorée
      L.polyline(
        [[church.lat, church.lng], [m.lat, m.lng]],
        { color, weight: 1, opacity: 0.35, dashArray: '3,4' },
      ).addTo(map)

      // Popup contact complet + boutons appel
      const popup = `
        <div style="min-width:200px">
          <strong style="font-size:14px">${m.full_name || 'Sans nom'}</strong><br>
          <span style="color:#666;font-size:11px">${m.commune}${m.quartier ? ' · ' + m.quartier : ''}</span>
          ${m.mountain ? `<br><em style="color:#8B1A2F;font-size:11px">${m.mountain}</em>` : ''}
          <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
            ${m.phone ? `<a href="tel:${m.phone.replace(/\s/g, '')}" style="background:#059669;color:#fff;padding:4px 8px;border-radius:4px;text-decoration:none;font-size:11px">📞 ${m.phone}</a>` : ''}
            ${m.whatsapp ? `<a href="https://wa.me/${m.whatsapp.replace(/[^0-9]/g, '')}" target="_blank" style="background:#25D366;color:#fff;padding:4px 8px;border-radius:4px;text-decoration:none;font-size:11px">💬 WhatsApp</a>` : ''}
          </div>
        </div>
      `
      L.marker([m.lat, m.lng], { icon }).addTo(map).bindPopup(popup)
      bounds.extend([m.lat, m.lng])
    })

    if (markers.length > 0) map.fitBounds(bounds, { padding: [40, 40] })

    mapInstance.current = map
    return () => { map.remove(); mapInstance.current = null }
  }, [leafletReady, church, markers])

  return (
    <div className="adm-card p-3">
      <div className="mb-2 text-xs text-zinc-500 flex items-center gap-4 flex-wrap">
        <span className="inline-flex items-center gap-1.5">
          <Church size={12} className="text-[#8B1A2F]"/>
          Église (point central)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ background: '#dc2626' }}/>
          Bal-goer
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ background: '#eab308' }}/>
          Nouveau
        </span>
      </div>
      <div ref={mapRef} style={{ height: '600px', width: '100%' }} className="rounded border-2 border-zinc-200"/>
    </div>
  )
}

// ============================================================================
// LISTE des inscrits triés par commune — chauffeurs voient d'un coup d'œil
// ============================================================================

function TransportList({ church, markers, byCommune }) {
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState(() => new Set())

  const normalized = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

  // Regroupe par commune + filtre par recherche (nom / quartier / téléphone)
  const groups = useMemo(() => {
    const q = normalized(query.trim())
    const g = {}
    markers.forEach((m) => {
      if (q) {
        const hay = normalized(`${m.full_name} ${m.quartier || ''} ${m.phone || ''} ${m.email || ''} ${m.mountain || ''}`)
        if (! hay.includes(q)) return
      }
      g[m.commune] = g[m.commune] ?? []
      g[m.commune].push(m)
    })
    return Object.entries(g).sort((a, b) => b[1].length - a[1].length)
  }, [markers, query])

  const totalFiltered = groups.reduce((n, [, list]) => n + list.length, 0)

  const toggleCommune = (commune) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(commune) ? next.delete(commune) : next.add(commune)
      return next
    })
  }

  const collapseAll = () => setCollapsed(new Set(groups.map(([c]) => c)))
  const expandAll   = () => setCollapsed(new Set())

  return (
    <div className="adm-card overflow-hidden max-h-[640px] flex flex-col">
      {/* Header épuré : compteur + actions */}
      <div className="px-4 py-3 border-b border-zinc-200/60 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Inscrits</p>
          <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--adm-text)' }}>
            {totalFiltered}
            {query && totalFiltered !== markers.length && (
              <span className="text-xs text-zinc-400 font-normal ml-1.5">/ {markers.length}</span>
            )}
          </p>
        </div>
        {groups.length > 1 && (
          <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest">
            <button
              onClick={collapsed.size === groups.length ? expandAll : collapseAll}
              className="px-2 py-1 text-zinc-500 hover:text-[color:var(--adm-accent)] transition"
            >
              {collapsed.size === groups.length ? 'Tout ouvrir' : 'Tout replier'}
            </button>
          </div>
        )}
      </div>

      {/* Recherche */}
      <div className="px-4 py-2 border-b border-zinc-200/60 relative">
        <Search size={13} className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400"/>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher nom, quartier, téléphone…"
          className="w-full pl-7 pr-8 py-1.5 text-sm bg-zinc-50 border border-zinc-200 rounded focus:outline-none focus:border-[color:var(--adm-accent)] focus:bg-white transition"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-zinc-700"
          >
            <X size={14}/>
          </button>
        )}
      </div>

      {/* Corps liste */}
      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400">
            Aucun résultat pour « {query} »
          </div>
        ) : (
          groups.map(([commune, list]) => {
            const isCollapsed = collapsed.has(commune)
            return (
              <div key={commune} className="border-b border-zinc-100 last:border-b-0">
                {/* Header commune (cliquable, sticky) */}
                <button
                  onClick={() => toggleCommune(commune)}
                  className="w-full px-4 py-2.5 bg-zinc-50/80 backdrop-blur sticky top-0 z-10 border-b border-zinc-100 flex items-center gap-2 hover:bg-zinc-100 transition text-left"
                >
                  {isCollapsed
                    ? <ChevronRight size={13} className="text-zinc-400"/>
                    : <ChevronDown  size={13} className="text-zinc-400"/>}
                  <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-700 flex-1">
                    {commune}
                  </span>
                  <span className="text-[10px] font-mono tabular-nums text-zinc-500 bg-white px-1.5 py-0.5 rounded border border-zinc-200">
                    {list.length}
                  </span>
                </button>
                {! isCollapsed && (
                  <ul className="divide-y divide-zinc-100">
                    {list.map((m, idx) => (
                      <PersonRow key={m.id} m={m} index={idx + 1}/>
                    ))}
                  </ul>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// Ligne inscrit — sobre, boutons icônes discrets
function PersonRow({ m, index }) {
  const initials = (m.full_name || '?')
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((s) => s[0]?.toUpperCase()).join('')

  return (
    <li className="px-4 py-2.5 hover:bg-zinc-50/60 transition group">
      <div className="flex items-center gap-3">
        {/* Numéro d'ordre + avatar initials */}
        <div className="shrink-0 w-8 text-center">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-600">
            {initials || '?'}
          </div>
          <span className="text-[9px] font-mono text-zinc-400 tabular-nums">{index}</span>
        </div>

        {/* Identité + méta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--adm-text)' }}>
              {m.full_name}
            </p>
            {m.attended_bal && (
              <span className="text-[9px] px-1.5 py-px bg-[color:var(--adm-accent)]/10 text-[color:var(--adm-accent)] font-bold uppercase tracking-wider rounded">
                Bal
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
            {m.quartier && <span className="truncate">{m.quartier}</span>}
            {m.mountain && (
              <>
                {m.quartier && <span className="text-zinc-300">·</span>}
                <span className="text-[10px] font-mono uppercase text-zinc-400 truncate">{m.mountain}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions : boutons icônes sobres */}
        <div className="shrink-0 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
          {m.phone && (
            <a
              href={`tel:${m.phone.replace(/\s/g, '')}`}
              title={`Appeler ${m.phone}`}
              className="h-8 w-8 flex items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-[color:var(--adm-accent)] transition"
            >
              <Phone size={14}/>
            </a>
          )}
          {m.whatsapp && (
            <a
              href={`https://wa.me/${m.whatsapp.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`WhatsApp ${m.whatsapp}`}
              className="h-8 w-8 flex items-center justify-center rounded-full text-zinc-500 hover:bg-[#25D366]/10 hover:text-[#128C7E] transition"
            >
              <MessageCircle size={14}/>
            </a>
          )}
        </div>
      </div>
    </li>
  )
}
