/** Module API : dons (workflow Mobile Money déclaratif). */
import api, { fetchCsrfCookie } from './axios'

/**
 * Soumission d'un don.
 * Accepte les visiteurs anonymes (donor_name + donor_phone optionnels).
 */
export async function submitDonation(payload) {
  await fetchCsrfCookie()
  const { data } = await api.post('/donations', payload)
  return data
}
