/** Module API : inscription / désinscription événements. */
import api from './axios'

export async function registerToEvent(eventId) {
  const { data } = await api.post(`/events/${eventId}/register`)
  return data
}

export async function unregisterFromEvent(eventId) {
  const { data } = await api.delete(`/events/${eventId}/register`)
  return data
}
