/**
 * ==============================================================
 *  Instance Axios configurée pour l'API Laravel NWC
 *  - URL de base : VITE_API_URL ou /api en dev (proxy Vite)
 *  - Cookies CSRF Sanctum activés (withCredentials)
 *  - Intercepteur erreur 401 → redirige vers /connexion
 *  - Intercepteur erreur 419 → rafraîchit le cookie CSRF
 * ==============================================================
 */
import axios from 'axios'

// Base URL : utilise le proxy Vite "/api" en dev, et VITE_API_URL en prod.
// Pas besoin de http://localhost:8000 puisque le proxy Vite redirige.
const baseURL = import.meta.env.VITE_API_URL || '/api'

// Création de l'instance configurée.
export const api = axios.create({
  baseURL,
  withCredentials: true, // indispensable pour Sanctum (cookies HTTP-only)
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  // 30s par défaut. Les requêtes d'upload (audio/vidéo lourds) override
  // explicitement via { timeout: ... } — voir admin.js sermons.create/update + media.upload.
  timeout: 30000,
  maxContentLength: Infinity,
  maxBodyLength:    Infinity,
})

/**
 * Récupère un cookie CSRF frais depuis Laravel Sanctum.
 * À appeler avant la première requête mutante (POST/PUT/DELETE) de la session.
 */
export async function fetchCsrfCookie() {
  return axios.get('/sanctum/csrf-cookie', { withCredentials: true })
}

// === Intercepteur de requête : ajoute le token Bearer + Accept-Language ===
// (utile pour l'auth Sanctum mode "API token" sur mobile/PWA)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nwc_token')
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Indique au backend la langue active (lu par middleware SetLocaleFromHeader).
  // i18next stocke la langue dans localStorage sous la clé `nwc-lang`.
  const lang = localStorage.getItem('nwc-lang') || 'fr'
  config.headers['Accept-Language'] = lang
  return config
})

// === Intercepteur de réponse : gestion centralisée des erreurs ===
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status

    // 401 = non authentifié → vide le store et redirige (sauf sur la page login).
    if (status === 401) {
      localStorage.removeItem('nwc_token')
      const path = window.location.pathname
      const isAuthPage = path.startsWith('/connexion') || path === '/'
      if (!isAuthPage) {
        // Mémorise l'URL d'origine pour redirection après login.
        sessionStorage.setItem('nwc_redirect_after_login', path)
        window.location.href = '/connexion'
      }
    }

    // 419 = CSRF token expiré → on tente de le rafraîchir et de rejouer.
    if (status === 419 && !error.config._retry) {
      error.config._retry = true
      await fetchCsrfCookie()
      return api(error.config)
    }

    // 503 = maintenance → on peut afficher un toast spécifique.
    // Les erreurs 4xx/5xx restantes remontent à l'appelant pour gestion locale.
    return Promise.reject(error)
  }
)

export default api
