import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Returns { cards, loading, error, createCard, updateCard, deleteCard, refetch }
 * cards: Array<{ id, theme_id, front, back, example, created_at, level, next_review_at }>
 * @param {string} userId
 * @param {string|null} themeId — filter to a specific theme, or null for all
 */
export function useCards(userId, themeId = null) {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchCards = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      let query = supabase.from('cards').select('*').order('created_at', { ascending: true })
      if (themeId) query = query.eq('theme_id', themeId)

      const { data: cardsData, error: cErr } = await query
      if (cErr) throw cErr

      const cardIds = (cardsData || []).map(c => c.id)
      let progressMap = {}
      if (cardIds.length > 0) {
        const { data: progressData, error: pErr } = await supabase
          .from('card_progress')
          .select('card_id, level, next_review_at')
          .in('card_id', cardIds)
        if (pErr) throw pErr
        progressMap = Object.fromEntries((progressData || []).map(p => [p.card_id, p]))
      }

      const enriched = (cardsData || []).map(card => ({
        ...card,
        level: progressMap[card.id]?.level ?? null,
        next_review_at: progressMap[card.id]?.next_review_at ?? null,
      }))

      setCards(enriched)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId, themeId])

  useEffect(() => { fetchCards() }, [fetchCards])

  async function createCard({ theme_id, front, back, example }) {
    const { data, error } = await supabase
      .from('cards')
      .insert({ theme_id, front, back, example: example || null, user_id: userId })
      .select()
      .single()
    if (error) throw error
    await fetchCards()
    return data
  }

  async function updateCard(id, { front, back, example, theme_id }) {
    const { error } = await supabase
      .from('cards')
      .update({ front, back, example: example || null, theme_id })
      .eq('id', id)
    if (error) throw error
    await fetchCards()
  }

  async function deleteCard(id) {
    const { error } = await supabase.from('cards').delete().eq('id', id)
    if (error) throw error
    await fetchCards()
  }

  return { cards, loading, error, createCard, updateCard, deleteCard, refetch: fetchCards }
}
