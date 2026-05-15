/** Module API : live streaming public + admin. */
import api from './axios'

export async function getCurrentLive() {
  const { data } = await api.get('/live/current')
  return data
}

export async function getNextLive() {
  const { data } = await api.get('/live/next')
  return data
}

export async function getViewerToken(id) {
  const { data } = await api.get(`/live/${id}/token`)
  return data
}
