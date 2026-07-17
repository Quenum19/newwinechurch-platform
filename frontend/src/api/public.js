/** Module API public (sans auth) — sermons, events, posts, departments. */
import api from './axios'

export const publicSermons = {
  list: async (params = {}) => (await api.get('/sermons', { params })).data,
  featured: async () => (await api.get('/sermons/featured')).data,
  get: async (slug) => (await api.get(`/sermons/${slug}`)).data?.data ?? null,
}

export const publicSermonSeries = {
  list: async () => (await api.get('/sermon-series')).data?.data ?? [],
  get: async (slug) => (await api.get(`/sermon-series/${slug}`)).data ?? null,
}

export const publicSermonThemes = {
  list: async () => (await api.get('/sermon-themes')).data?.data ?? [],
}

export const publicTestimonials = {
  list: async () => (await api.get('/testimonials')).data?.data ?? [],
}

export const publicSeries = {
  list: async () => (await api.get('/series')).data?.data ?? [],
  get: async (slug) => (await api.get(`/series/${slug}`)).data,
}

export const publicTickets = {
  /** Liste des events ticketés actifs. */
  events: async () => (await api.get('/tickets/events')).data?.data ?? [],
  /** Détail event avec compteurs (sold, remaining, is_open, etc.). */
  show: async (slug) => (await api.get(`/tickets/events/${slug}`)).data,
  /** Réservation — payload {event_id, first_name, last_name, email, phone, quantity, guests[]?, selfie?}. */
  register: async (payload, selfieFile = null) => {
    const fd = new FormData()
    Object.entries(payload).forEach(([k, v]) => {
      if (v === undefined || v === null) return
      if (Array.isArray(v)) {
        v.forEach((item, i) => Object.entries(item).forEach(([kk, vv]) =>
          fd.append(`${k}[${i}][${kk}]`, vv)
        ))
      } else fd.append(k, v)
    })
    if (selfieFile) fd.append('selfie', selfieFile)
    return (await api.post('/tickets/register', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data
  },
  myTicket: async (token) => (await api.get(`/tickets/my/${token}`)).data,
  cancel: async (token) => (await api.post(`/tickets/cancel/${token}`)).data,
  // === Phase 2 — Suivi commande payante ===
  order: async (orderCode) => (await api.get(`/tickets/order/${orderCode}`)).data,
  // Phase 7 — Initialise un paiement CinetPay (renvoie URL où rediriger)
  initiateOnlinePayment: async (orderCode) =>
    (await api.post(`/tickets/order/${orderCode}/initiate-payment`)).data,
  submitPayment: async (orderCode, payload, proofFile = null) => {
    const fd = new FormData()
    Object.entries(payload).forEach(([k, v]) => { if (v != null) fd.append(k, v) })
    if (proofFile) fd.append('payment_proof', proofFile)
    return (await api.post(`/tickets/order/${orderCode}/submit-payment`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data
  },
}

export const publicEvents = {
  list: async (params = {}) => (await api.get('/events', { params })).data,
  get: async (slug) => (await api.get(`/events/${slug}`)).data?.data ?? null,
}

export const publicPosts = {
  list: async (params = {}) => (await api.get('/posts', { params })).data,
  get: async (slug) => (await api.get(`/posts/${slug}`)).data?.data ?? null,
  categories: async () => (await api.get('/posts/categories')).data,
}

export const publicDepartments = {
  list: async () => (await api.get('/departments')).data,
  /** Étape 5 : retourne le bundle complet { data, cells, recent_media, upcoming_events }. */
  get: async (slug) => (await api.get(`/departments/${slug}`)).data,
  /** Étape 5 : médias paginés d'un département (file_type optionnel). */
  media: async (slug, params = {}) =>
    (await api.get(`/departments/${slug}/media`, { params })).data,
}

export const publicMedia = {
  /** Étape 5 : params accepte department (slug), file_type, per_page, page. */
  list: async (params = {}) => (await api.get('/media', { params })).data,
}

export const publicSettings = {
  get: async () => (await api.get('/settings/public')).data,
}

export const publicPrayers = {
  wall: async () => (await api.get('/prayer-requests')).data,
  submit: async (payload) => (await api.post('/prayer-requests', payload)).data,
  pray: async (id) => (await api.post(`/prayer-requests/${id}/pray`)).data,
}

export const publicContact = {
  submit: async (payload) => (await api.post('/contact', payload)).data,
}

export const publicNewsletter = {
  subscribe: async (payload) => (await api.post('/newsletter/subscribe', payload)).data,
}

export const publicDonations = {
  submit: async (payload) => (await api.post('/donations', payload)).data,
}

export const publicDonationMethods = {
  list: async () => (await api.get('/donation-methods')).data?.data ?? [],
}

/** Soumission d'une demande d'adhésion (modèle admission). */
export const publicMembershipRequests = {
  submit: async (payload) => (await api.post('/membership-requests', payload)).data,
}

/** Étape C — Landing scanner invité (magic-link). */
export const publicScannerInvite = {
  verify: async (token) => (await api.get(`/scanner-invite/${token}`)).data,
  redeem: async (token) => (await api.post(`/scanner-invite/${token}/redeem`)).data,
}
