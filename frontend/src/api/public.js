/** Module API public (sans auth) — sermons, events, posts, departments. */
import api from './axios'

export const publicSermons = {
  list: async (params = {}) => (await api.get('/sermons', { params })).data,
  featured: async () => (await api.get('/sermons/featured')).data,
  get: async (slug) => (await api.get(`/sermons/${slug}`)).data?.data ?? null,
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
