import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { nextLevel, nextReviewDate, isDue, sortByDue } from '../lib/leitner'

/**
 * Manages a review session.
 * @param {string} userId
 * @param {string|null} themeId — null = all themes
 *
 * Returns {
 *   queue, currentCard, sessionDone, loading, error,
 *   startSession, recordAnswer,
 * }
 */
export function useReview(userId, themeId = null) {
  const [queue, setQueue] = useState([])
  const [sessionDone, setSessionDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const startSession = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    setSessionDone(false)
    try {
      let query = supabase.from('cards').select('id, front, back, example, theme_id')
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
        level: progressMap[card.id]?.level ?? 0,
        next_review_at: progressMap[card.id]?.next_review_at ?? null,
        has_progress: !!progressMap[card.id],
      }))

      const due = enriched.filter(c => isDue(c.next_review_at))
      const sorted = sortByDue(due)
      setQueue(sorted)
      if (sorted.length === 0) setSessionDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId, themeId])

  async function recordAnswer(card, correct) {
    const newLevel = nextLevel(card.level, correct)
    const newDate = nextReviewDate(newLevel)

    const { error } = await supabase
      .from('card_progress')
      .upsert({
        card_id: card.id,
        user_id: userId,
        level: newLevel,
        next_review_at: newDate,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'card_id,user_id' })
    if (error) throw error

    setQueue(prev => {
      const next = prev.slice(1)
      if (next.length === 0) setSessionDone(true)
      return next
    })
  }

  return {
    queue,
    currentCard: queue[0] ?? null,
    sessionDone,
    loading,
    error,
    startSession,
    recordAnswer,
  }
}
