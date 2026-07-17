/**
 * API — Liste de présence (billetterie).
 * Endpoints backend : /api/admin/events/{id}/attendance/*
 */
import api from './axios'

/**
 * Récupère la liste + stats. Gère l'ETag / 304 → renvoie null si rien de neuf.
 * Le caller doit conserver le dernier ETag reçu et le passer via `lastEtag`.
 */
export async function fetchAttendance(eventId, { lastEtag = null, sinceMinutes = 0 } = {}) {
  const headers = {}
  if (lastEtag) headers['If-None-Match'] = lastEtag
  const params = {}
  if (sinceMinutes > 0) params.since_minutes = sinceMinutes

  try {
    const res = await api.get(`/admin/events/${eventId}/attendance`, {
      headers,
      params,
      // Empêche axios de rejeter les 304 — on veut les traiter comme succès.
      validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
    })
    if (res.status === 304) return { notModified: true }
    return {
      notModified: false,
      etag: res.headers?.etag || res.headers?.ETag || null,
      ...res.data,
    }
  } catch (err) {
    if (err?.response?.status === 304) return { notModified: true }
    throw err
  }
}

/** Marque manuellement un ticket comme présent (VIP ayant perdu son QR). */
export async function manualCheckIn(eventId, ticketId, note = null) {
  const { data } = await api.post(`/admin/events/${eventId}/attendance/manual`, {
    ticket_id: ticketId,
    note,
  })
  return data
}

/** Télécharge un blob (xlsx ou pdf) — force le download côté navigateur. */
async function downloadBlob(url, defaultName) {
  const res = await api.get(url, { responseType: 'blob' })
  const cd = res.headers['content-disposition'] || ''
  const match = cd.match(/filename="?([^";]+)"?/i)
  const filename = match?.[1] || defaultName
  const blob = new Blob([res.data], { type: res.headers['content-type'] })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(link.href)
}

export function exportAttendanceXlsx(eventId) {
  return downloadBlob(
    `/admin/events/${eventId}/attendance/export/xlsx`,
    `presence-${eventId}.xlsx`,
  )
}

export function exportAttendancePdf(eventId) {
  return downloadBlob(
    `/admin/events/${eventId}/attendance/export/pdf`,
    `presence-${eventId}.pdf`,
  )
}

export function exportAttendanceBackupPdf(eventId) {
  return downloadBlob(
    `/admin/events/${eventId}/attendance/backup-pdf`,
    `presence-backup-${eventId}.pdf`,
  )
}
