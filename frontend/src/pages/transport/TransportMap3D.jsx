/**
 * TransportMap3D — Vue 3D MapLibre GL de la carte des inscrits.
 *
 * Choix techniques :
 *  - MapLibre GL (fork open-source de Mapbox) : pas de token, pas de quota
 *  - Tiles OpenFreeMap style "positron" : sobre, éditorial, gratuit, sans tracking
 *  - Chargement CDN dynamique : zéro coût sur le bundle initial
 *  - Pitch 45° + bearing rotation lente pour effet cinématique
 *  - Fill-extrusion pour buildings 3D (OSM data via OpenFreeMap style)
 *  - Église en marker HTML custom (bordeaux) au centre
 *  - Inscrits en cercles colorés, altitude = ancienneté (bal-goer = plus haut)
 *  - Support timelapse : si `activeIds` fourni, ne montre que ces IDs (fade-out reste)
 */
import { useEffect, useRef, useState } from 'react'
import { Loader2, RotateCw, Maximize2 } from 'lucide-react'

const MAPLIBRE_CSS = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css'
const MAPLIBRE_JS  = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js'
const STYLE_URL    = 'https://tiles.openfreemap.org/styles/positron'

export default function TransportMap3D({ church, markers, activeIds = null }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef(new Map()) // id → maplibre marker
  const churchMarkerRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [rotating, setRotating] = useState(false)
  const rotateAnimRef = useRef(null)

  // 1) Load MapLibre CSS + JS via CDN (une fois)
  useEffect(() => {
    if (window.maplibregl) { setReady(true); return }
    if (! document.querySelector(`link[href="${MAPLIBRE_CSS}"]`)) {
      const css = document.createElement('link')
      css.rel = 'stylesheet'
      css.href = MAPLIBRE_CSS
      document.head.appendChild(css)
    }
    const existing = document.querySelector(`script[src="${MAPLIBRE_JS}"]`)
    if (existing) {
      existing.addEventListener('load', () => setReady(true))
      return
    }
    const s = document.createElement('script')
    s.src = MAPLIBRE_JS
    s.async = true
    s.onload = () => setReady(true)
    document.head.appendChild(s)
  }, [])

  // 2) Init map une fois MapLibre chargé
  useEffect(() => {
    if (! ready || ! church || ! containerRef.current) return
    const maplibregl = window.maplibregl

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [church.lng, church.lat],
      zoom: 12,
      pitch: 50,
      bearing: -20,
      attributionControl: { compact: true },
    })

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')
    map.addControl(new maplibregl.FullscreenControl(), 'top-right')

    map.on('load', () => {
      // Buildings 3D via fill-extrusion sur le layer 'building' du style positron
      const layers = map.getStyle().layers || []
      const symbolIdx = layers.findIndex((l) => l.type === 'symbol')

      // Cherche un layer contenant les buildings dans le style OpenFreeMap
      const buildingSource = layers.find((l) =>
        (l['source-layer'] === 'building' || l.id === 'building')
      )
      if (buildingSource) {
        try {
          map.addLayer({
            id: 'nwc-buildings-3d',
            source: buildingSource.source,
            'source-layer': buildingSource['source-layer'] || 'building',
            type: 'fill-extrusion',
            minzoom: 13,
            paint: {
              'fill-extrusion-color': '#d4c9b8',
              'fill-extrusion-height': [
                'interpolate', ['linear'], ['zoom'],
                13, 0,
                15, ['coalesce', ['get', 'render_height'], ['get', 'height'], 8],
              ],
              'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
              'fill-extrusion-opacity': 0.7,
            },
          }, symbolIdx >= 0 ? layers[symbolIdx].id : undefined)
        } catch (e) {
          console.warn('[3D] buildings layer skipped:', e.message)
        }
      }
    })

    mapRef.current = map
    return () => {
      if (rotateAnimRef.current) cancelAnimationFrame(rotateAnimRef.current)
      map.remove()
      mapRef.current = null
      markersRef.current.clear()
      churchMarkerRef.current = null
    }
  }, [ready, church])

  // 3) Marker Église (créé une fois, jamais retiré)
  useEffect(() => {
    if (! mapRef.current || ! church || churchMarkerRef.current) return
    const maplibregl = window.maplibregl
    const el = document.createElement('div')
    el.innerHTML = `
      <div style="width:36px;height:36px;border-radius:50%;background:#8B1A2F;border:4px solid #fff;
                  box-shadow:0 4px 12px rgba(139,26,47,.5);display:flex;align-items:center;
                  justify-content:center;color:#fff;font-weight:bold;font-size:18px;transform:translate(-50%,-100%)">
        ✝
      </div>
    `
    el.style.cursor = 'pointer'
    const popup = new maplibregl.Popup({ offset: 40 }).setHTML(
      `<strong>${church.name}</strong><br><span style="color:#666;font-size:11px">${church.address}</span><br><em style="color:#8B1A2F;font-size:11px">Point central</em>`
    )
    churchMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([church.lng, church.lat])
      .setPopup(popup)
      .addTo(mapRef.current)
  }, [ready, church])

  // 4) Sync markers inscrits — recréés à chaque changement de dataset,
  //    mais si `activeIds` change (timelapse) on masque/affiche via display
  useEffect(() => {
    const map = mapRef.current
    if (! map || ! window.maplibregl) return
    const maplibregl = window.maplibregl

    // Retire les markers qui ne sont plus dans le dataset
    const currentIds = new Set(markers.map((m) => m.id))
    markersRef.current.forEach((mk, id) => {
      if (! currentIds.has(id)) {
        mk.remove()
        markersRef.current.delete(id)
      }
    })

    // Ajoute / met à jour
    markers.forEach((m) => {
      let mk = markersRef.current.get(m.id)
      if (! mk) {
        const color = m.attended_bal ? '#dc2626' : '#eab308'
        const el = document.createElement('div')
        el.dataset.mid = String(m.id)
        el.style.cssText = `
          width:16px;height:16px;border-radius:50%;background:${color};
          border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);
          transition:opacity .35s ease, transform .35s cubic-bezier(.34,1.56,.64,1);
          cursor:pointer;
        `
        const popup = new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(`
          <div style="min-width:180px;font-family:system-ui,sans-serif">
            <strong style="font-size:13px">${m.full_name || 'Sans nom'}</strong><br>
            <span style="color:#666;font-size:11px">${m.commune}${m.quartier ? ' · ' + m.quartier : ''}</span>
            ${m.mountain ? `<br><em style="color:#8B1A2F;font-size:11px">${m.mountain}</em>` : ''}
            <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">
              ${m.phone ? `<a href="tel:${m.phone.replace(/\s/g, '')}" style="background:#f4f4f5;color:#111;padding:3px 7px;border-radius:4px;text-decoration:none;font-size:11px;border:1px solid #e4e4e7">📞 ${m.phone}</a>` : ''}
              ${m.whatsapp ? `<a href="https://wa.me/${m.whatsapp.replace(/[^0-9]/g, '')}" target="_blank" style="background:#f4f4f5;color:#111;padding:3px 7px;border-radius:4px;text-decoration:none;font-size:11px;border:1px solid #e4e4e7">💬 WhatsApp</a>` : ''}
            </div>
          </div>
        `)
        mk = new maplibregl.Marker({ element: el })
          .setLngLat([m.lng, m.lat])
          .setPopup(popup)
          .addTo(map)
        markersRef.current.set(m.id, mk)
      }
    })

    // Fit bounds si dataset non vide (première fois seulement)
    if (markers.length > 0 && ! map._nwcFitted) {
      const bounds = new maplibregl.LngLatBounds([church.lng, church.lat], [church.lng, church.lat])
      markers.forEach((m) => bounds.extend([m.lng, m.lat]))
      map.fitBounds(bounds, { padding: 60, pitch: 50, bearing: -20, duration: 800 })
      map._nwcFitted = true
    }
  }, [markers, church, ready])

  // 5) Timelapse : masque / affiche via display sans détruire les markers
  useEffect(() => {
    if (! activeIds) {
      markersRef.current.forEach((mk) => {
        mk.getElement().style.opacity = '1'
        mk.getElement().style.transform = 'scale(1)'
      })
      return
    }
    const set = new Set(activeIds)
    markersRef.current.forEach((mk, id) => {
      const el = mk.getElement()
      if (set.has(id)) {
        el.style.opacity = '1'
        el.style.transform = 'scale(1)'
        el.style.pointerEvents = 'auto'
      } else {
        el.style.opacity = '0'
        el.style.transform = 'scale(0)'
        el.style.pointerEvents = 'none'
      }
    })
  }, [activeIds])

  // 6) Rotation cinématique (toggle)
  const toggleRotate = () => {
    const map = mapRef.current
    if (! map) return
    if (rotating) {
      if (rotateAnimRef.current) cancelAnimationFrame(rotateAnimRef.current)
      setRotating(false)
      return
    }
    setRotating(true)
    const step = () => {
      map.rotateTo((map.getBearing() + 0.15) % 360, { duration: 0 })
      rotateAnimRef.current = requestAnimationFrame(step)
    }
    step()
  }

  const resetView = () => {
    const map = mapRef.current
    if (! map || ! church) return
    map.flyTo({ center: [church.lng, church.lat], zoom: 12, pitch: 50, bearing: -20, duration: 1200 })
  }

  return (
    <div className="adm-card p-3 relative">
      <div className="mb-2 text-xs text-zinc-500 flex items-center gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full inline-block" style={{ background: '#8B1A2F' }}/>
          Église
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ background: '#dc2626' }}/>
          Bal-goer
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ background: '#eab308' }}/>
          Nouveau
        </span>
        <span className="ml-auto text-[10px] font-mono uppercase tracking-widest text-zinc-400">
          Vue 3D · MapLibre + OpenFreeMap
        </span>
      </div>

      <div className="relative">
        <div ref={containerRef} style={{ height: '600px', width: '100%' }} className="rounded border-2 border-zinc-200 overflow-hidden"/>

        {! ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-50/80 rounded">
            <div className="text-center">
              <Loader2 size={24} className="animate-spin inline mb-1"/>
              <p className="text-xs text-zinc-500">Chargement du moteur 3D…</p>
            </div>
          </div>
        )}

        {/* Contrôles custom : rotation cinématique + reset vue */}
        {ready && (
          <div className="absolute bottom-3 left-3 flex flex-col gap-1.5">
            <button
              onClick={toggleRotate}
              title={rotating ? 'Arrêter la rotation' : 'Rotation cinématique'}
              className={
                'h-9 w-9 flex items-center justify-center rounded-full shadow-md transition ' +
                (rotating
                  ? 'bg-[color:var(--adm-accent)] text-white'
                  : 'bg-white text-zinc-600 hover:text-[color:var(--adm-accent)]')
              }
            >
              <RotateCw size={15} className={rotating ? 'animate-spin' : ''}/>
            </button>
            <button
              onClick={resetView}
              title="Recentrer sur l'église"
              className="h-9 w-9 flex items-center justify-center rounded-full shadow-md bg-white text-zinc-600 hover:text-[color:var(--adm-accent)] transition"
            >
              <Maximize2 size={15}/>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
