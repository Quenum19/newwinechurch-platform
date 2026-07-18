/**
 * Module API : profil membre (Mon Espace).
 */
import api from './axios'

/** Récupère le profil de l'utilisateur connecté. */
export async function getProfile() {
  const { data } = await api.get('/me')
  return data?.data ?? data
}

/** Met à jour le profil (sauf email + password). */
export async function updateProfile(payload) {
  const { data } = await api.put('/me', payload)
  return data?.data ?? data
}

/** Change le mot de passe (avec mot de passe actuel pour vérif). */
export async function changePassword(payload) {
  const { data } = await api.put('/me/password', payload)
  return data
}

/**
 * Upload d'avatar (multipart/form-data).
 * La requête revient en 202 Accepted ; l'image traitée arrive ~5s plus tard.
 */
export async function uploadAvatar(file) {
  const fd = new FormData()
  fd.append('avatar', file)

  const { data } = await api.post('/me/avatar', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function deleteAvatar() {
  const { data } = await api.delete('/me/avatar')
  return data
}

export async function getMyCell() {
  const { data } = await api.get('/me/cell')
  return data?.cell ?? null
}

export async function getMyDepartments() {
  const { data } = await api.get('/me/departments')
  return data?.data ?? []
}

export async function getMyDonations(params = {}) {
  const { data } = await api.get('/me/donations', { params })
  return data
}

export async function getMyEvents(params = {}) {
  const { data } = await api.get('/me/events', { params })
  return data
}

/** Étape F — Missions billetterie actives (grants event_staff non révoqués). */
export async function getMyStaffAssignments() {
  const { data } = await api.get('/me/staff-assignments')
  return data?.assignments ?? []
}

// === Sprint B — Préférences notifications ===

/** Liste des préférences notification + état pour l'user connecté. */
export async function getNotificationPreferences() {
  const { data } = await api.get('/me/notification-preferences')
  return data?.data ?? []
}

/**
 * Bulk update des préférences.
 * @param {Array<{key: string, enabled: boolean}>} preferences
 */
export async function updateNotificationPreferences(preferences) {
  const { data } = await api.post('/me/notification-preferences', { preferences })
  return data
}
