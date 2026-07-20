/**
 * ==============================================================
 *  useBalState — Hook de polling pour l'écran live du Bal
 *
 *  - Poll toutes les 2s l'endpoint /api/public/events/{id}/bal/state
 *  - Résistant aux coupures réseau : garde le dernier state connu
 *  - Retry auto avec backoff léger, ne remonte JAMAIS d'erreur bloquante
 *  - Expose : { state, isOnline, lastUpdate }
 *
 *  Isolé : pas de dépendance à react-query pour rester léger et prévisible
 *  (l'écran tourne en F11 pendant des heures, on veut zéro surprise).
 * ==============================================================
 */
import { useEffect, useRef, useState } from 'react'

// State par défaut si l'API répond 404 ou est indisponible au démarrage.
// L'écran reste beau et affiche la slide "default" (affiche + particules).
const DEFAULT_STATE = {
  current_slide: 'default',
  config: {},
  vote_status: 'closed',
  stats: {
    arrivees_count: 0,
    latest_arrival: null,
    votes_count: 0,
    total_expected: 0,
  },
  results: null,
  candidates: [],
  photos: [],
  event: null,
}

const POLL_INTERVAL_MS = 2000
// Timeout par requête volontairement court : si le serveur rame, on ne bloque pas
// le prochain poll — on garde le last state affiché.
const FETCH_TIMEOUT_MS = 4000

/**
 * @param {string|number} eventId
 * @returns {{state: object, isOnline: boolean, lastUpdate: Date|null}}
 */
export function useBalState(eventId) {
  const [state, setState] = useState(DEFAULT_STATE)
  const [isOnline, setIsOnline] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const timerRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    if (!eventId) return

    let cancelled = false

    // Base URL identique à l'instance axios : VITE_API_URL ou /api en dev (proxy Vite).
    const baseURL = import.meta.env.VITE_API_URL || '/api'

    async function poll() {
      // Annule la requête précédente si toujours en vol
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

      try {
        const res = await fetch(
          `${baseURL}/public/events/${eventId}/bal/state`,
          {
            signal: controller.signal,
            credentials: 'include',
            headers: { Accept: 'application/json' },
          }
        )
        clearTimeout(timeoutId)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (cancelled) return

        // Merge safe : on garantit que les clés attendues existent toujours
        // pour ne jamais crash côté slides.
        setState((prev) => ({
          ...DEFAULT_STATE,
          ...prev,
          ...data,
          stats: { ...DEFAULT_STATE.stats, ...(data.stats || {}) },
          config: { ...(data.config || {}) },
          candidates: Array.isArray(data.candidates) ? data.candidates : [],
          photos: Array.isArray(data.photos) ? data.photos : [],
        }))
        setIsOnline(true)
        setLastUpdate(new Date())
      } catch (err) {
        clearTimeout(timeoutId)
        if (cancelled) return
        // Silence total : on ne veut jamais afficher d'erreur à l'écran.
        // On passe simplement en "hors ligne" (indicateur discret possible en dev).
        setIsOnline(false)
      } finally {
        // Boucle : replanifie le prochain poll (setTimeout > setInterval pour éviter
        // les vagues quand le réseau est lent).
        if (!cancelled) {
          timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
        }
      }
    }

    // Kick-off immédiat
    poll()

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [eventId])

  return { state, isOnline, lastUpdate }
}
