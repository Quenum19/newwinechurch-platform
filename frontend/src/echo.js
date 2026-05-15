/**
 * ==============================================================
 *  Configuration Laravel Echo + Reverb (WebSockets).
 *
 *  Permet au frontend de souscrire aux channels :
 *   - "live"               : badge EN DIRECT (public, pas d'auth)
 *   - "App.Models.User.{id}" : notifications privées
 *   - "admin.dashboard"    : refresh dashboard temps réel (admin only)
 *
 *  En cas d'absence de config Reverb (env mal renseigné), Echo n'est
 *  pas initialisé — l'app continue de fonctionner sans temps réel.
 * ==============================================================
 */
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

// Pusher est obligatoire en window pour Echo (lib historique).
if (typeof window !== 'undefined') {
  window.Pusher = Pusher
}

const VITE_REVERB_APP_KEY = import.meta.env.VITE_REVERB_APP_KEY
const VITE_REVERB_HOST    = import.meta.env.VITE_REVERB_HOST || 'localhost'
const VITE_REVERB_PORT    = import.meta.env.VITE_REVERB_PORT || 8080
const VITE_REVERB_SCHEME  = import.meta.env.VITE_REVERB_SCHEME || 'http'

let echoInstance = null

export function initEcho() {
  if (echoInstance) return echoInstance
  if (! VITE_REVERB_APP_KEY) {
    console.warn('Reverb non configuré — temps réel désactivé.')
    return null
  }

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key:         VITE_REVERB_APP_KEY,
    wsHost:      VITE_REVERB_HOST,
    wsPort:      Number(VITE_REVERB_PORT),
    wssPort:     Number(VITE_REVERB_PORT),
    forceTLS:    VITE_REVERB_SCHEME === 'https',
    enabledTransports: ['ws', 'wss'],
    // Authorize les channels privés via /broadcasting/auth (Sanctum cookie).
    authEndpoint: '/broadcasting/auth',
    auth: {
      headers: {
        Accept: 'application/json',
      },
    },
  })

  return echoInstance
}

export function getEcho() {
  return echoInstance
}

export function disconnectEcho() {
  echoInstance?.disconnect()
  echoInstance = null
}
