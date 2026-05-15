/**
 * ==============================================================
 *  API client espace leader de cellule — /api/leader/*
 *  Scopé sur la cellule courante via middleware CellLeaderMiddleware.
 * ==============================================================
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './axios'

// === Dashboard ===
export const fetchLeaderDashboard = () =>
  api.get('/leader/dashboard').then((r) => r.data)

export function useLeaderDashboard() {
  return useQuery({
    queryKey: ['leader', 'dashboard'],
    queryFn:  fetchLeaderDashboard,
    staleTime: 30_000,
  })
}

// === Analytics ===
export const fetchLeaderAnalytics = () =>
  api.get('/leader/analytics').then((r) => r.data)

export function useLeaderAnalytics() {
  return useQuery({
    queryKey: ['leader', 'analytics'],
    queryFn:  fetchLeaderAnalytics,
    staleTime: 5 * 60_000,
  })
}

// === Cellule + membres ===
export const fetchLeaderCell = () =>
  api.get('/leader/cell').then((r) => r.data?.data ?? r.data)

export function useLeaderCell() {
  return useQuery({
    queryKey: ['leader', 'cell'],
    queryFn:  fetchLeaderCell,
  })
}

export const fetchLeaderMembers = (filters = {}) =>
  api.get('/leader/members', { params: filters }).then((r) => r.data)

export function useLeaderMembers(filters = {}) {
  return useQuery({
    queryKey: ['leader', 'members', filters],
    queryFn:  () => fetchLeaderMembers(filters),
    keepPreviousData: true,
  })
}

// === Présences ===
export const fetchLeaderAttendance = (filters = {}) =>
  api.get('/leader/attendance', { params: filters }).then((r) => r.data)

export function useLeaderAttendance(filters = {}) {
  return useQuery({
    queryKey: ['leader', 'attendance', filters],
    queryFn:  () => fetchLeaderAttendance(filters),
    keepPreviousData: true,
  })
}

export function useRecordAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/leader/attendance', payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leader', 'attendance'] })
      qc.invalidateQueries({ queryKey: ['leader', 'dashboard'] })
      qc.invalidateQueries({ queryKey: ['leader', 'analytics'] })
    },
  })
}

// === Rapports cellule ===
export const fetchLeaderReports = (filters = {}) =>
  api.get('/leader/reports', { params: filters }).then((r) => r.data)

export function useLeaderReports(filters = {}) {
  return useQuery({
    queryKey: ['leader', 'reports', filters],
    queryFn:  () => fetchLeaderReports(filters),
    keepPreviousData: true,
  })
}

export const fetchLeaderReport = (id) =>
  api.get(`/leader/reports/${id}`).then((r) => r.data?.data ?? r.data)

export function useLeaderReport(id) {
  return useQuery({
    queryKey: ['leader', 'reports', id],
    queryFn:  () => fetchLeaderReport(id),
    enabled:  !!id,
    // Poll si soumis mais PDF pas prêt (queue async). En mode sync c'est
    // déjà prêt au premier fetch, donc le polling ne se déclenche pas.
    // ARRÊT après 30s pour ne jamais boucler à l'infini si la queue meurt.
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

/** Téléchargement du PDF officiel du rapport cellule (leader). */
export async function downloadLeaderReportPdf(reportId, filename = 'rapport.pdf') {
  const res = await api.get(`/leader/reports/${reportId}/pdf`, { responseType: 'blob' })
  const cd = res.headers['content-disposition'] || ''
  const match = cd.match(/filename="?([^";]+)"?/i)
  const finalName = match?.[1] || filename
  const blob = new Blob([res.data], { type: 'application/pdf' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = finalName
  link.click()
  URL.revokeObjectURL(link.href)
}

export function useCreateLeaderReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/leader/reports', payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leader', 'reports'] })
      qc.invalidateQueries({ queryKey: ['leader', 'dashboard'] })
    },
  })
}

export function useUpdateLeaderReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      api.put(`/leader/reports/${id}`, payload).then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['leader', 'reports', vars.id] })
      qc.invalidateQueries({ queryKey: ['leader', 'reports'] })
    },
  })
}

export function useSubmitLeaderReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/leader/reports/${id}/submit`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leader', 'reports'] })
      qc.invalidateQueries({ queryKey: ['leader', 'dashboard'] })
    },
  })
}
