/**
 * API client — Inbox notifications utilisateur (/api/notifications).
 * Canal database des Laravel Notifications.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './axios'

export const fetchNotifications = (params = {}) =>
  api.get('/notifications', { params }).then((r) => r.data)

export const fetchNotificationsCount = () =>
  api.get('/notifications/count').then((r) => r.data)

export function useNotifications(params = {}) {
  return useQuery({
    queryKey: ['notifications', 'list', params],
    queryFn:  () => fetchNotifications(params),
    staleTime: 30_000,
  })
}

export function useNotificationsCount() {
  return useQuery({
    queryKey: ['notifications', 'count'],
    queryFn:  fetchNotificationsCount,
    staleTime: 15_000,
    refetchInterval: 60_000, // refetch toutes les minutes en fallback (WS prend le relais)
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/notifications/${id}/mark-read`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/notifications/mark-read').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useDeleteNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/notifications/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
