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
  Loader2, Truck, Filter, FileText, Church,
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
  // Regroupe par commune pour lisibilité
  const groups = useMemo(() => {
    const g = {}
    markers.forEach((m) => {
      g[m.commune] = g[m.commune] ?? []
      g[m.commune].push(m)
    })
    // Tri commune par nombre décroissant
    return Object.entries(g).sort((a, b) => b[1].length - a[1].length)
  }, [markers])

  return (
    <div className="adm-card overflow-hidden max-h-[640px] flex flex-col">
      <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">
          Liste inscrits · {markers.length}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
        {groups.map(([commune, list]) => (
          <div key={commune}>
            <div className="px-4 py-2 bg-zinc-100 sticky top-0 z-10 border-b border-zinc-200">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-700">
                {commune} · {list.length}
              </p>
            </div>
            {list.map((m) => (
              <div key={m.id} className="px-4 py-3 hover:bg-zinc-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--adm-text)' }}>
                      {m.full_name}
                    </p>
                    {m.quartier && <p className="text-xs text-zinc-500">{m.quartier}</p>}
                    {m.mountain && <p className="text-[10px] text-[color:var(--adm-accent)] font-mono uppercase mt-0.5">{m.mountain}</p>}
                  </div>
                  {m.attended_bal && (
                    <span className="shrink-0 text-[9px] px-1.5 py-0.5 bg-red-100 text-red-700 font-mono uppercase tracking-widest rounded">
                      Bal
                    </span>
                  )}
                </div>
                {(m.phone || m.whatsapp) && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.phone && (
                      <a
                        href={`tel:${m.phone.replace(/\s/g, '')}`}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-[11px] hover:bg-green-700 transition"
                      >
                        <Phone size={10}/> {m.phone}
                      </a>
                    )}
                    {m.whatsapp && (
                      <a
                        href={`https://wa.me/${m.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 bg-[#25D366] text-white rounded text-[11px] hover:opacity-80 transition"
                      >
                        <MessageCircle size={10}/> WhatsApp
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
