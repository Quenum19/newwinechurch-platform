/**
 * ==============================================================
 *  Module API Admin — toutes les opérations CRUD admin.
 *  Sous-modules : dashboard, members, departments, cells, donations, settings.
 * ==============================================================
 */
import api from './axios'

// === DASHBOARD ===
export const dashboard = {
  stats: async () => {
    const { data } = await api.get('/admin/dashboard')
    return data
  },
}

// === ACTIVITY LOG (lecture seule) ===
export const activityLog = {
  list: async (params = {}) => (await api.get('/admin/activity-log', { params })).data,
}

// === Helpers download Excel ===
async function downloadExcel(url, params = {}) {
  // Sérialise les tableaux en CSV pour traverser HTTP de manière fiable.
  // Axios fait par défaut ?ids[]=1&ids[]=2 mais selon la version certains
  // serveurs PHP ne le parsent pas → on force ?ids=1,2,3 + parsing backend.
  const normalized = { ...params }
  if (Array.isArray(normalized.ids)) normalized.ids = normalized.ids.join(',')
  const res = await api.get(url, { params: normalized, responseType: 'blob' })
  const cd = res.headers['content-disposition'] || ''
  const match = cd.match(/filename="?([^";]+)"?/i)
  const filename = match?.[1] || 'export.xlsx'
  const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

// === MEMBRES ===
export const members = {
  list: async (params = {}) => {
    const { data } = await api.get('/admin/members', { params })
    return data
  },
  export: (params = {}) => downloadExcel('/admin/members/export', params),
  get: async (id) => {
    const { data } = await api.get(`/admin/members/${id}`)
    return data?.data ?? data
  },
  create: async (payload) => {
    const { data } = await api.post('/admin/members', payload)
    return data?.data ?? data
  },
  update: async (id, payload) => {
    const { data } = await api.put(`/admin/members/${id}`, payload)
    return data?.data ?? data
  },
  delete: async (id) => {
    const { data } = await api.delete(`/admin/members/${id}`)
    return data
  },
  deletionImpact: async (id) => {
    const { data } = await api.get(`/admin/members/${id}/deletion-impact`)
    return data
  },
  restore: async (id) => {
    const { data } = await api.post(`/admin/members/${id}/restore`)
    return data
  },
  /** Suppression DÉFINITIVE — efface la ligne en base. Irréversible. */
  forceDelete: async (id) => (await api.delete(`/admin/members/${id}/force`)).data,
  /**
   * Définit un mot de passe (custom ou auto-généré) + envoie email d'accès.
   * Options : { password?: string, send_email?: bool }
   */
  resendCredentials: async (id, options = {}) =>
    (await api.post(`/admin/members/${id}/resend-credentials`, options)).data,
  /** Active/désactive le compte (sessions coupées si désactivation). */
  toggleStatus: async (id) =>
    (await api.post(`/admin/members/${id}/toggle-status`)).data,
  /** Upload photo de profil (multipart). */
  uploadAvatar: async (id, file) => {
    const fd = new FormData()
    fd.append('avatar', file)
    return (await api.post(`/admin/members/${id}/avatar`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
    })).data
  },
  assignRoles: async (id, roles) => {
    const { data } = await api.put(`/admin/members/${id}/roles`, { roles })
    return data?.data ?? data
  },
  /** Suppression groupée (en lot) : 'delete' (archive) ou 'force_delete' (définitif). */
  bulkDelete: async (ids, action = 'delete') => (await api.post('/admin/members/bulk', { action, ids })).data,
}

// === DÉPARTEMENTS ===
export const departments = {
  list: async (params = {}) => {
    const { data } = await api.get('/admin/departments', { params })
    return data
  },
  stats: async () => {
    const { data } = await api.get('/admin/departments-stats')
    return data
  },
  get: async (id) => {
    const { data } = await api.get(`/admin/departments/${id}`)
    return data
  },
  create: async (payload) => {
    const { data } = await api.post('/admin/departments', payload)
    return data?.data ?? data
  },
  update: async (id, payload) => {
    // Si on uploade une bannière, on passe en multipart avec _method=PUT.
    if (payload instanceof FormData) {
      payload.append('_method', 'PUT')
      const { data } = await api.post(`/admin/departments/${id}`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: UPLOAD_TIMEOUT,
      })
      return data?.data ?? data
    }
    const { data } = await api.put(`/admin/departments/${id}`, payload)
    return data?.data ?? data
  },
  delete: async (id) => {
    const { data } = await api.delete(`/admin/departments/${id}`)
    return data
  },
  assignCaptain: async (id, captainId) => {
    const { data } = await api.put(`/admin/departments/${id}/captain`, { captain_id: captainId })
    return data
  },
  governorsHistory: async (id) => {
    const { data } = await api.get(`/admin/departments/${id}/governors-history`)
    return data?.data ?? []
  },
  exportGovernorsHistory: async (id, deptName = 'departement') => {
    const { data } = await api.get(`/admin/departments/${id}/governors-history`, { params: { format: 'csv' } })
    // Backend renvoie le CSV en base64 pour éviter les soucis d'encoding
    const csvBytes = atob(data.data)
    const blob = new Blob([csvBytes], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = data.filename || `historique_gouverneurs_${deptName}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  },
  addMember: async (id, userId, role = 'member') => {
    const { data } = await api.post(`/admin/departments/${id}/members`, { user_id: userId, role })
    return data
  },
  removeMember: async (id, userId) => {
    const { data } = await api.delete(`/admin/departments/${id}/members/${userId}`)
    return data
  },
}

// === CELLULES ===
export const cells = {
  list: async (params = {}) => {
    const { data } = await api.get('/admin/cells', { params })
    return data
  },
  get: async (id) => {
    const { data } = await api.get(`/admin/cells/${id}`)
    return data?.data ?? data
  },
  create: async (payload) => {
    const { data } = await api.post('/admin/cells', payload)
    return data?.data ?? data
  },
  update: async (id, payload) => {
    const { data } = await api.put(`/admin/cells/${id}`, payload)
    return data?.data ?? data
  },
  delete: async (id) => {
    const { data } = await api.delete(`/admin/cells/${id}`)
    return data
  },
  reports: async (id, params = {}) => {
    const { data } = await api.get(`/admin/cells/${id}/reports`, { params })
    return data
  },
  submitReport: async (id, payload) => {
    const { data } = await api.post(`/admin/cells/${id}/reports`, payload)
    return data?.data ?? data
  },
  /**
   * Validation d'un rapport cellule.
   * @param {{status: 'reviewed'|'approved'|'rejected', review_comment?: string}} payload
   */
  validateReport: async (cellId, reportId, payload = { status: 'reviewed' }) => {
    const { data } = await api.put(`/admin/cells/${cellId}/reports/${reportId}/validate`, payload)
    return data?.data ?? data
  },
  regenerateReportPdf: async (cellId, reportId) =>
    (await api.post(`/admin/cells/${cellId}/reports/${reportId}/regenerate-pdf`)).data,
  downloadReportPdf: async (cellId, reportId, filename = 'rapport_cellule.pdf') => {
    const res = await api.get(`/admin/cells/${cellId}/reports/${reportId}/pdf`, { responseType: 'blob' })
    const cd = res.headers['content-disposition'] || ''
    const match = cd.match(/filename="?([^";]+)"?/i)
    const finalName = match?.[1] || filename
    const blob = new Blob([res.data], { type: 'application/pdf' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = finalName
    link.click()
    URL.revokeObjectURL(link.href)
  },
}

// === DONS ===
export const donations = {
  list: async (params = {}) => {
    const { data } = await api.get('/admin/donations', { params })
    return data
  },
  export: (params = {}) => downloadExcel('/admin/donations/export', params),
  stats: async () => {
    const { data } = await api.get('/admin/donations/stats')
    return data
  },
  get: async (id) => {
    const { data } = await api.get(`/admin/donations/${id}`)
    return data?.data ?? data
  },
  confirm: async (id) => {
    const { data } = await api.post(`/admin/donations/${id}/confirm`)
    return data?.data ?? data
  },
  reject: async (id, reason) => {
    const { data } = await api.post(`/admin/donations/${id}/reject`, { reason })
    return data?.data ?? data
  },
}

// ============================================================
// === PHASE 6 : CONTENU =====================================
// ============================================================

// === SERMONS ===
// Timeout 10 minutes pour les uploads audio/vidéo lourds (jusqu'à 500 Mo).
// Le timeout par défaut (30s) est insuffisant : un fichier de 70 Mo en 1 MB/s upload
// prend ~70s rien que pour le transfert, sans compter le traitement serveur.
const UPLOAD_TIMEOUT = 10 * 60 * 1000  // 10 min

export const sermons = {
  list: async (params = {}) => (await api.get('/admin/sermons', { params })).data,
  series: async () => (await api.get('/admin/sermon-series', { params: { per_page: 100 } })).data?.data ?? [],
  themes: async () => (await api.get('/admin/sermon-themes')).data?.data ?? [],
  get: async (id) => (await api.get(`/admin/sermons/${id}`)).data?.data ?? null,
  create: async (formData) => {
    const { data } = await api.post('/admin/sermons', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
    })
    return data?.data ?? data
  },
  update: async (id, formData) => {
    formData.append('_method', 'PUT')
    const { data } = await api.post(`/admin/sermons/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
    })
    return data?.data ?? data
  },
  delete: async (id) => (await api.delete(`/admin/sermons/${id}`)).data,
  togglePublish: async (id) => (await api.post(`/admin/sermons/${id}/toggle-publish`)).data,
  bulk: async (action, ids) => (await api.post('/admin/sermons/bulk', { action, ids })).data,
}

// === SERMON SERIES (CRUD admin) ===
export const sermonSeries = {
  list: async (params = {}) => (await api.get('/admin/sermon-series', { params })).data,
  get: async (id) => (await api.get(`/admin/sermon-series/${id}`)).data?.data ?? null,
  create: async (formData) => {
    const { data } = await api.post('/admin/sermon-series', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
    })
    return data?.data ?? data
  },
  update: async (id, formData) => {
    formData.append('_method', 'PUT')
    const { data } = await api.post(`/admin/sermon-series/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
    })
    return data?.data ?? data
  },
  delete: async (id) => (await api.delete(`/admin/sermon-series/${id}`)).data,
}

// === TESTIMONIALS ===
export const testimonials = {
  list: async (params = {}) => (await api.get('/admin/testimonials', { params })).data,
  get: async (id) => (await api.get(`/admin/testimonials/${id}`)).data?.data ?? null,
  create: async (formData) => {
    const { data } = await api.post('/admin/testimonials', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
    })
    return data?.data ?? data
  },
  update: async (id, formData) => {
    formData.append('_method', 'PUT')
    const { data } = await api.post(`/admin/testimonials/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
    })
    return data?.data ?? data
  },
  delete: async (id) => (await api.delete(`/admin/testimonials/${id}`)).data,
  togglePublish: async (id) => (await api.post(`/admin/testimonials/${id}/toggle-publish`)).data,
  bulk: async (action, ids) => (await api.post('/admin/testimonials/bulk', { action, ids })).data,
}

// === SERMON THEMES (catalogue de tags) ===
export const sermonThemes = {
  list: async (params = {}) => (await api.get('/admin/sermon-themes', { params })).data?.data ?? [],
  create: async (payload) => (await api.post('/admin/sermon-themes', payload)).data?.data ?? null,
  update: async (id, payload) => (await api.put(`/admin/sermon-themes/${id}`, payload)).data?.data ?? null,
  delete: async (id) => (await api.delete(`/admin/sermon-themes/${id}`)).data,
}

// === EVENTS ===
export const events = {
  list: async (params = {}) => (await api.get('/admin/events', { params })).data,
  get: async (id) => (await api.get(`/admin/events/${id}`)).data?.data ?? null,
  create: async (formData) => {
    const { data } = await api.post('/admin/events', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
    })
    return data?.data ?? data
  },
  update: async (id, formData) => {
    formData.append('_method', 'PUT')
    const { data } = await api.post(`/admin/events/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
    })
    return data?.data ?? data
  },
  delete: async (id) => (await api.delete(`/admin/events/${id}`)).data,
  restore: async (id) => (await api.post(`/admin/events/${id}/restore`)).data,
  togglePublish: async (id) => (await api.post(`/admin/events/${id}/toggle-publish`)).data,
  bulk: async (action, ids) => (await api.post('/admin/events/bulk', { action, ids })).data,
  // === Billetterie admin ===
  ticketsList:  async (eventId, params = {}) => (await api.get(`/admin/events/${eventId}/tickets`, { params })).data,
  ticketsStats: async (eventId) => (await api.get(`/admin/events/${eventId}/tickets/stats`)).data,
  ticketsExport:(eventId, params = {}) => downloadExcel(`/admin/events/${eventId}/tickets/export`, params),
  ticketResend: async (eventId, ticketId) =>
    (await api.post(`/admin/events/${eventId}/tickets/${ticketId}/resend`)).data,
  ticketScan:   async (code, eventId = null) =>
    (await api.post('/admin/tickets/scan', { code, event_id: eventId })).data,
  ticketUnscan: async (ticketId) =>
    (await api.post(`/admin/tickets/${ticketId}/unscan`)).data,
  ticketsBulk:  async (eventId, action, ids) =>
    (await api.post(`/admin/events/${eventId}/tickets/bulk`, { action, ids })).data,

  // === Phase 2 — Types de tickets ===
  ticketTypesList:   async (eventId) => (await api.get(`/admin/events/${eventId}/ticket-types`)).data,
  ticketTypeCreate:  async (eventId, data) => (await api.post(`/admin/events/${eventId}/ticket-types`, data)).data,
  ticketTypeUpdate:  async (eventId, id, data) => (await api.put(`/admin/events/${eventId}/ticket-types/${id}`, data)).data,
  ticketTypeDelete:  async (eventId, id) => (await api.delete(`/admin/events/${eventId}/ticket-types/${id}`)).data,

  // === Liste d'attente ===
  waitlist:          async (eventId) => (await api.get(`/admin/events/${eventId}/waitlist`)).data,
  waitlistConvert:   async (eventId, id) => (await api.post(`/admin/events/${eventId}/waitlist/${id}/convert`)).data,
  waitlistRemove:    async (eventId, id) => (await api.delete(`/admin/events/${eventId}/waitlist/${id}`)).data,

  // === Phase 2 — Validation paiements ===
  pendingOrders:     async (eventId) => (await api.get(`/admin/events/${eventId}/tickets/pending-orders`)).data,
  validatePayment:   async (orderCode) =>
    (await api.post(`/admin/tickets/orders/${orderCode}/validate-payment`)).data,
  refusePayment:     async (orderCode, reason) =>
    (await api.post(`/admin/tickets/orders/${orderCode}/refuse-payment`, { reason })).data,

  // === Phase 6 — Remboursements ===
  refundTicket:      async (ticketId, payload) =>
    (await api.post(`/admin/tickets/${ticketId}/refund`, payload)).data,
  refundOrder:       async (orderCode, payload) =>
    (await api.post(`/admin/tickets/orders/${orderCode}/refund`, payload)).data,
  refundWholeEvent:  async (eventId, reason) =>
    (await api.post(`/admin/events/${eventId}/cancel-and-refund`, { reason })).data,

  // === Phase 4 — Analytics ===
  analyticsOverview:        async () => (await api.get('/admin/ticketing/overview')).data,
  analyticsRevenueMonthly:  async () => (await api.get('/admin/ticketing/revenue-monthly')).data,
  analyticsPaymentMethods:  async () => (await api.get('/admin/ticketing/payment-methods')).data,
  analyticsTypesBreakdown:  async () => (await api.get('/admin/ticketing/types-breakdown')).data,
  analyticsPendingOrdersAll:async () => (await api.get('/admin/ticketing/pending-orders')).data,
  analyticsEvent:           async (eventId) => (await api.get(`/admin/events/${eventId}/analytics`)).data,
  analyticsExport:          (params = {}) => downloadExcel('/admin/ticketing/export-overview', params),

  // === Sprint C — Dashboard billetterie 360° ===
  // Endpoints protégés par permission `view billetterie dashboard`.
  dashboard360Kpis:            async () => (await api.get('/admin/billetterie/dashboard-360/kpis')).data,
  dashboard360Timeline:        async (days = 30) =>
    (await api.get('/admin/billetterie/dashboard-360/revenue-timeline', { params: { days } })).data,
  dashboard360PaymentBreakdown:async (period = 'month') =>
    (await api.get('/admin/billetterie/dashboard-360/payment-breakdown', { params: { period } })).data,
  dashboard360TopEvents:       async (limit = 5) =>
    (await api.get('/admin/billetterie/dashboard-360/top-events', { params: { limit } })).data,
  dashboard360Alerts:          async () => (await api.get('/admin/billetterie/dashboard-360/alerts')).data,
  dashboard360Segmentation:    async () => (await api.get('/admin/billetterie/dashboard-360/segmentation')).data,
  dashboard360NoShow:          async () => (await api.get('/admin/billetterie/dashboard-360/no-show-rate')).data,
  dashboard360LiveScans:       async () => (await api.get('/admin/billetterie/dashboard-360/live-scans')).data,
  dashboard360ExportMonthly:   (year, month) =>
    downloadExcel('/admin/billetterie/dashboard-360/export-monthly', { year, month }),

  // === Phase 5 — Séries d'événements ===
  seriesList:        async (params = {}) => (await api.get('/admin/event-series', { params })).data,
  seriesGet:         async (id) => (await api.get(`/admin/event-series/${id}`)).data?.data,
  seriesCreate:      async (formData) => (await api.post('/admin/event-series', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })).data,
  seriesUpdate:      async (id, formData) => (await api.post(`/admin/event-series/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })).data,
  seriesDelete:      async (id) => (await api.delete(`/admin/event-series/${id}`)).data,
  seriesGenerate:    async (id, { start_date, count }) =>
    (await api.post(`/admin/event-series/${id}/generate`, { start_date, count })).data,
  seriesAddOccurrence: async (id, starts_at) =>
    (await api.post(`/admin/event-series/${id}/add-occurrence`, { starts_at })).data,

  registrations: async (id, params = {}) =>
    (await api.get(`/admin/events/${id}/registrations`, { params })).data,
  markAttended: async (id, userId) =>
    (await api.post(`/admin/events/${id}/registrations/${userId}/attended`)).data,

  // === Étape B — Panneau Staff (rôles scopés + magic-links invités) ===
  staffList:        async (eventId) =>
    (await api.get(`/admin/events/${eventId}/staff`)).data,
  staffAdd:         async (eventId, { user_id, grant }) =>
    (await api.post(`/admin/events/${eventId}/staff`, { user_id, grant })).data,
  staffRemove:      async (eventId, staffId, reason = null) =>
    (await api.delete(`/admin/events/${eventId}/staff/${staffId}`, { data: { reason } })).data,
  staffResendNotification: async (eventId, staffId) =>
    (await api.post(`/admin/events/${eventId}/staff/${staffId}/resend-notification`)).data,
  guestUpdateStatus:async (eventId, tokenId, status) =>
    (await api.patch(`/admin/events/${eventId}/guest-scanners/${tokenId}`, { status })).data,
  guestRevoke:      async (eventId, tokenId) =>
    (await api.delete(`/admin/events/${eventId}/guest-scanners/${tokenId}`)).data,

  // === Étape C — Invitation magic-link scanner externe ===
  guestInvite:      async (eventId, { display_name, contact, contact_type }) =>
    (await api.post(`/admin/events/${eventId}/guest-scanners`, { display_name, contact, contact_type })).data,
  guestRegenerate:  async (eventId, tokenId) =>
    (await api.post(`/admin/events/${eventId}/guest-scanners/${tokenId}/regenerate`)).data,
}

// === Recherche utilisateurs (autocomplete pour ajouter un staff) ===
export const userSearch = {
  find: async (q, limit = 10) =>
    (await api.get('/admin/users/search', { params: { q, limit } })).data,
}

// === POSTS (blog) ===
export const posts = {
  list: async (params = {}) => (await api.get('/admin/posts', { params })).data,
  get: async (id) => (await api.get(`/admin/posts/${id}`)).data?.data ?? null,
  create: async (formData) => {
    const { data } = await api.post('/admin/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
    })
    return data?.data ?? data
  },
  update: async (id, formData) => {
    formData.append('_method', 'PUT')
    const { data } = await api.post(`/admin/posts/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
    })
    return data?.data ?? data
  },
  delete: async (id) => (await api.delete(`/admin/posts/${id}`)).data,
  togglePublish: async (id) => (await api.post(`/admin/posts/${id}/toggle-publish`)).data,
  bulk: async (action, ids) => (await api.post('/admin/posts/bulk', { action, ids })).data,
  uploadInlineImage: async (file) => {
    const fd = new FormData()
    fd.append('image', file)
    const { data } = await api.post('/admin/posts/inline-image', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
    })
    return data
  },
}

// === GALERIE MEDIA ===
export const media = {
  list: async (params = {}) => (await api.get('/admin/media', { params })).data,
  upload: async (files, { eventId, departmentId, title, description } = {}) => {
    const fd = new FormData()
    Array.from(files).forEach((f) => fd.append('files[]', f))
    if (eventId) fd.append('event_id', eventId)
    if (departmentId) fd.append('department_id', departmentId)
    if (title) fd.append('title', title)
    if (description) fd.append('description', description)
    const { data } = await api.post('/admin/media/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
    })
    return data
  },
  delete: async (id) => (await api.delete(`/admin/media/${id}`)).data,
  /**
   * Action groupée sur N médias.
   * action ∈ delete | publish | unpublish | attach_event | attach_dept
   * payload optionnel selon l'action (event_id, department_id, null pour détacher)
   */
  bulk: async (action, ids, payload = null) =>
    (await api.post('/admin/media/bulk', { action, ids, payload })).data,
  togglePublish: async (id) => (await api.post(`/admin/media/${id}/toggle-publish`)).data,
}

// === PRIÈRES ===
export const prayers = {
  list: async (params = {}) => (await api.get('/admin/prayers', { params })).data,
  get: async (id) => (await api.get(`/admin/prayers/${id}`)).data,
  update: async (id, payload) => (await api.put(`/admin/prayers/${id}`, payload)).data,
  delete: async (id) => (await api.delete(`/admin/prayers/${id}`)).data,
  togglePublish: async (id) => (await api.post(`/admin/prayers/${id}/toggle-publish`)).data,
}

// === NEWSLETTER ===
export const newsletter = {
  subscribers: async (params = {}) => (await api.get('/admin/newsletter/subscribers', { params })).data,
  deleteSubscriber: async (id) => (await api.delete(`/admin/newsletter/subscribers/${id}`)).data,
  bulk: async (action, ids) => (await api.post('/admin/newsletter/subscribers/bulk', { action, ids })).data,
  send: async (payload) => (await api.post('/admin/newsletter/send', payload)).data,
}

// === RAPPORTS DÉPARTEMENT (pasteur/admin/RH) ===
export const departmentReports = {
  list: async (params = {}) => (await api.get('/admin/department-reports', { params })).data,
  get: async (id) => (await api.get(`/admin/department-reports/${id}`)).data?.data,
  review: async (id, payload) => (await api.post(`/admin/department-reports/${id}/review`, payload)).data,
  regeneratePdf: async (id) =>
    (await api.post(`/admin/department-reports/${id}/regenerate-pdf`)).data,
  downloadPdf: async (id, filename = 'rapport.pdf') => {
    const res = await api.get(`/admin/department-reports/${id}/pdf`, { responseType: 'blob' })
    const cd = res.headers['content-disposition'] || ''
    const match = cd.match(/filename="?([^";]+)"?/i)
    const finalName = match?.[1] || filename
    const blob = new Blob([res.data], { type: 'application/pdf' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = finalName
    link.click()
    URL.revokeObjectURL(link.href)
  },
}

// === TEMPLATES DE RAPPORT (admin builder) ===
export const reportTemplates = {
  list: async (departmentId) =>
    (await api.get(`/admin/departments/${departmentId}/report-templates`)).data?.data ?? [],
  active: async (departmentId) =>
    (await api.get(`/admin/departments/${departmentId}/report-templates/active`)).data?.data,
  create: async (departmentId, payload) =>
    (await api.post(`/admin/departments/${departmentId}/report-templates`, payload)).data?.data,
  update: async (departmentId, tplId, payload) =>
    (await api.put(`/admin/departments/${departmentId}/report-templates/${tplId}`, payload)).data?.data,
  remove: async (departmentId, tplId) =>
    (await api.delete(`/admin/departments/${departmentId}/report-templates/${tplId}`)).data,
  activate: async (departmentId, tplId) =>
    (await api.post(`/admin/departments/${departmentId}/report-templates/${tplId}/activate`)).data?.data,
}

// === DEMANDES D'ADHÉSION (RH / admin) ===
export const membershipRequests = {
  list: async (params = {}) => (await api.get('/admin/membership-requests', { params })).data,
  get: async (id) => (await api.get(`/admin/membership-requests/${id}`)).data?.data,
  pendingCount: async () =>
    (await api.get('/admin/membership-requests/pending-count')).data?.count ?? 0,
  approve: async (id, initial_password) =>
    (await api.post(`/admin/membership-requests/${id}/approve`,
      initial_password ? { initial_password } : {})).data,
  reject: async (id, reason) =>
    (await api.post(`/admin/membership-requests/${id}/reject`, { reason })).data,
  /** Action en lot — uniquement 'reject' (l'approbation bulk est trop sensible). */
  bulk: async (action, ids, reason = null) =>
    (await api.post('/admin/membership-requests/bulk', { action, ids, reason })).data,
}

// === IMAGES AUTH (hero connexion/inscription, superadmin) ===
export const authImages = {
  list: async () => (await api.get('/admin/auth-images')).data?.data ?? [],
  create: async (formData) =>
    (await api.post('/admin/auth-images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data?.data,
  update: async (id, formData) => {
    if (formData instanceof FormData) {
      formData.append('_method', 'PUT')
      return (await api.post(`/admin/auth-images/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })).data?.data
    }
    return (await api.put(`/admin/auth-images/${id}`, formData)).data?.data
  },
  remove: async (id) => (await api.delete(`/admin/auth-images/${id}`)).data,
  toggle: async (id) => (await api.post(`/admin/auth-images/${id}/toggle`)).data,
}

// === MÉTHODES DE DON (opérateurs Mobile Money) ===
export const donationMethods = {
  list: async () => (await api.get('/admin/donation-methods')).data?.data ?? [],
  get: async (id) => (await api.get(`/admin/donation-methods/${id}`)).data?.data,
  create: async (payload) => {
    if (payload instanceof FormData) {
      const { data } = await api.post('/admin/donation-methods', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data?.data ?? data
    }
    const { data } = await api.post('/admin/donation-methods', payload)
    return data?.data ?? data
  },
  update: async (id, payload) => {
    if (payload instanceof FormData) {
      payload.append('_method', 'PUT')
      const { data } = await api.post(`/admin/donation-methods/${id}`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data?.data ?? data
    }
    const { data } = await api.put(`/admin/donation-methods/${id}`, payload)
    return data?.data ?? data
  },
  remove: async (id) => (await api.delete(`/admin/donation-methods/${id}`)).data,
  toggle: async (id) => (await api.post(`/admin/donation-methods/${id}/toggle`)).data,
}

// === PARAMÈTRES ===
export const settings = {
  list: async () => {
    const { data } = await api.get('/admin/settings')
    return data
  },
  update: async (settings) => {
    const { data } = await api.put('/admin/settings', { settings })
    return data
  },
  uploadLogo: async (file, target) => {
    const fd = new FormData()
    fd.append('logo', file)
    fd.append('target', target)
    const { data } = await api.post('/admin/settings/logo', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
}
