/**
 * ==============================================================
 *  Module API : authentification.
 *  Toutes les opérations critiques (login, register, password)
 *  passent par cette couche pour centraliser :
 *    - Récupération du cookie CSRF Sanctum
 *    - Gestion du token Bearer (mode mobile/PWA)
 *    - Erreurs réseau normalisées
 * ==============================================================
 */
import api, { fetchCsrfCookie } from './axios'

/**
 * Inscription d'un nouveau membre.
 * Le backend déclenche automatiquement l'envoi de l'email de vérification.
 */
export async function register(payload) {
  await fetchCsrfCookie()
  const { data } = await api.post('/auth/register', payload)
  return data
}

/**
 * Connexion.
 * - Mode SPA (par défaut) : pose un cookie HTTP-only Sanctum.
 * - Mode token : si payload.device_name est présent, on stocke le Bearer token.
 */
export async function login(payload) {
  await fetchCsrfCookie()
  const { data } = await api.post('/auth/login', payload)

  // Mode token : on stocke le Bearer pour les futures requêtes.
  if (data?.token) {
    localStorage.setItem('nwc_token', data.token)
  }
  return data
}

/** Déconnexion (révocation du token courant ou destruction de la session). */
export async function logout() {
  try {
    await api.post('/auth/logout')
  } finally {
    localStorage.removeItem('nwc_token')
  }
}

/** Déconnexion de tous les appareils (en cas de compromission). */
export async function logoutAll() {
  await api.post('/auth/logout-all')
  localStorage.removeItem('nwc_token')
}

/** Demande d'email de réinitialisation. */
export async function forgotPassword(email) {
  await fetchCsrfCookie()
  const { data } = await api.post('/auth/forgot-password', { email })
  return data
}

/** Confirmation reset password avec le token reçu par email. */
export async function resetPassword(payload) {
  await fetchCsrfCookie()
  const { data } = await api.post('/auth/reset-password', payload)
  return data
}

/** Renvoi de l'email de vérification (auth requis). */
export async function resendVerificationEmail() {
  const { data } = await api.post('/auth/email/resend')
  return data
}

/** Récupération du profil de l'utilisateur connecté. */
export async function fetchMe() {
  const { data } = await api.get('/me')
  return data?.data ?? data
}
