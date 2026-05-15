/**
 * ==============================================================
 *  API client espace gouverneur — /api/governor/*
 *  Tous les endpoints sont scopés au département du gouverneur authentifié
 *  via le middleware backend GovernorMiddleware.
 * ==============================================================
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './axios'

// === Dashboard ===
export const fetchGovernorDashboard = () =>
  api.get('/governor/dashboard').then((r) => r.data)

export function useGovernorDashboard() {
  return useQuery({
    queryKey: ['governor', 'dashboard'],
    queryFn:  fetchGovernorDashboard,
    staleTime: 30_000, // 30s — refresh régulier côté UI
  })
}

// === Analytics ===
export const fetchGovernorAnalytics = () =>
  api.get('/governor/analytics').then((r) => r.data)

export function useGovernorAnalytics() {
  return useQuery({
    queryKey: ['governor', 'analytics'],
    queryFn:  fetchGovernorAnalytics,
    staleTime: 5 * 60_000,
  })
}

// === Département + profil gouverneur ===
export const fetchGovernorDepartment = () =>
  api.get('/governor/department').then((r) => r.data?.data ?? r.data)

export function useGovernorDepartment() {
  return useQuery({
    queryKey: ['governor', 'department'],
    queryFn:  fetchGovernorDepartment,
  })
}

/** Template de rapport actif du département du gouverneur connecté. */
export const fetchGovernorReportTemplate = () =>
  api.get('/governor/department/report-template').then((r) => r.data?.data ?? r.data)

export function useGovernorReportTemplate() {
  return useQuery({
    queryKey: ['governor', 'report-template'],
    queryFn:  fetchGovernorReportTemplate,
    staleTime: 5 * 60_000,
    // 404 = pas de template configuré → on retombe sur le schéma par défaut côté UI
    retry: (failureCount, error) => {
      if (error?.response?.status === 404) return false
      return failureCount < 2
    },
  })
}

export const fetchGovernorProfile = () =>
  api.get('/governor/profile').then((r) => r.data?.data ?? r.data)

export function useGovernorProfile() {
  return useQuery({
    queryKey: ['governor', 'profile'],
    queryFn:  fetchGovernorProfile,
  })
}

/** PATCH profil. Si formData (FormData), Content-Type sera multipart auto. */
export function useUpdateGovernorProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      // FormData (avec fichiers) ou JSON ?
      const isFormData = payload instanceof FormData
      const config = isFormData
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : {}
      // POST avec spoofing _method=PUT pour multipart (Laravel).
      if (isFormData) {
        payload.append('_method', 'PUT')
        return api.post('/governor/profile', payload, config).then((r) => r.data?.data ?? r.data)
      }
      return api.put('/governor/profile', payload).then((r) => r.data?.data ?? r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['governor', 'profile'] })
      qc.invalidateQueries({ queryKey: ['governor', 'department'] })
      qc.invalidateQueries({ queryKey: ['governor', 'dashboard'] })
    },
  })
}

// === Membres ===
export const fetchGovernorMembers = (filters = {}) =>
  api.get('/governor/members', { params: filters }).then((r) => r.data)

export function useGovernorMembers(filters = {}) {
  return useQuery({
    queryKey: ['governor', 'members', filters],
    queryFn:  () => fetchGovernorMembers(filters),
    keepPreviousData: true,
  })
}

export function useMoveMemberCell() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ memberId, cellId }) =>
      api.post(`/governor/members/${memberId}/move-cell`, { cell_id: cellId })
         .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['governor', 'members'] })
      qc.invalidateQueries({ queryKey: ['governor', 'cells'] })
      qc.invalidateQueries({ queryKey: ['governor', 'dashboard'] })
    },
  })
}

// === Cellules ===
export const fetchGovernorCells = (filters = {}) =>
  api.get('/governor/cells', { params: filters }).then((r) => r.data)

export function useGovernorCells(filters = {}) {
  return useQuery({
    queryKey: ['governor', 'cells', filters],
    queryFn:  () => fetchGovernorCells(filters),
  })
}

export function useCreateGovernorCell() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/governor/cells', payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['governor', 'cells'] })
      qc.invalidateQueries({ queryKey: ['governor', 'dashboard'] })
    },
  })
}

export function useUpdateGovernorCell() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      api.put(`/governor/cells/${id}`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['governor', 'cells'] })
    },
  })
}

export function useAssignCellLeader() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cellId, userId, notes }) =>
      api.post(`/governor/cells/${cellId}/leader`, { user_id: userId, notes })
         .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['governor', 'cells'] })
      qc.invalidateQueries({ queryKey: ['governor', 'dashboard'] })
    },
  })
}

// === Rapports département ===
export const fetchGovernorReports = (filters = {}) =>
  api.get('/governor/reports', { params: filters }).then((r) => r.data)

export function useGovernorReports(filters = {}) {
  return useQuery({
    queryKey: ['governor', 'reports', filters],
    queryFn:  () => fetchGovernorReports(filters),
    keepPreviousData: true,
  })
}

export const fetchGovernorReport = (id) =>
  api.get(`/governor/reports/${id}`).then((r) => r.data?.data ?? r.data)

export function useGovernorReport(id) {
  return useQuery({
    queryKey: ['governor', 'reports', id],
    queryFn:  () => fetchGovernorReport(id),
    enabled:  !!id,
    // Poll si soumis mais PDF pas prêt. En sync mode, le PDF arrive
    // immédiatement avec la réponse au submit, donc le polling ne tourne pas.
    // ARRÊT après 30s pour ne jamais boucler à l'infini.
    refetchInterval: (q) => {
      const r = q.state.data
      if (!r) return false
      if (r.status === 'draft' || r.has_pdf) return false
      const submittedAt = r.submitted_at ? new Date(r.submitted_at).getTime() : Date.now()
      if (Date.now() - submittedAt > 30_000) return false
      return 3000
    },
  })
}

export function useCreateGovernorReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/governor/reports', payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['governor', 'reports'] })
    },
  })
}

export function useUpdateGovernorReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      api.put(`/governor/reports/${id}`, payload).then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['governor', 'reports', vars.id] })
      qc.invalidateQueries({ queryKey: ['governor', 'reports'] })
    },
  })
}

export function useSubmitGovernorReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/governor/reports/${id}/submit`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['governor', 'reports'] })
      qc.invalidateQueries({ queryKey: ['governor', 'dashboard'] })
    },
  })
}

export function useDeleteGovernorReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/governor/reports/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['governor', 'reports'] })
    },
  })
}
