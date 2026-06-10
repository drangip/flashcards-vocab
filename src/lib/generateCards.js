import { supabase } from './supabase'

/**
 * Calls the generate-cards Edge Function.
 * @param {string} theme — theme name
 * @param {number} count — number of cards (1–100)
 * @returns {Promise<Array<{front, back, example}>>}
 */
export async function generateCards(theme, count) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non authentifié')

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cards`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ theme, count }),
    }
  )

  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
  return data.cards
}
