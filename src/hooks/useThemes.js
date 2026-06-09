import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Returns { themes, loading, error, createTheme, updateTheme, deleteTheme, refetch }
 * themes: Array<{ id, name, emoji, created_at, card_count, due_count }>
 */
export function useThemes(userId) {
  const [themes, setThemes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchThemes = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const { data: themesData, error: tErr } = await supabase
        .from('themes')
        .select('*')
        .order('created_at', { ascending: true })
      if (tErr) throw tErr

      const { data: cardsData, error: cErr } = await supabase
        .from('cards')
        .select('id, theme_id')
      if (cErr) throw cErr

      const now = new Date().toISOString()
      const { data: dueData, error: dErr } = await supabase
        .from('card_progress')
        .select('card_id')
        .lte('next_review_at', now)
      if (dErr) throw dErr

      const dueCardIds = new Set((dueData || []).map(p => p.card_id))

      const enriched = (themesData || []).map(theme => {
        const themeCards = (cardsData || []).filter(c => c.theme_id === theme.id)
        const dueCount = themeCards.filter(c => dueCardIds.has(c.id)).length
        return { ...theme, card_count: themeCards.length, due_count: dueCount }
      })

      setThemes(enriched)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchThemes() }, [fetchThemes])

  async function createTheme({ name, emoji }) {
    const { data, error } = await supabase
      .from('themes')
      .insert({ name, emoji, user_id: userId })
      .select()
      .single()
    if (error) throw error
    await fetchThemes()
    return data
  }

  async function updateTheme(id, { name, emoji }) {
    const { error } = await supabase
      .from('themes')
      .update({ name, emoji })
      .eq('id', id)
    if (error) throw error
    await fetchThemes()
  }

  async function deleteTheme(id) {
    const { error } = await supabase
      .from('themes')
      .delete()
      .eq('id', id)
    if (error) throw error
    await fetchThemes()
  }

  return { themes, loading, error, createTheme, updateTheme, deleteTheme, refetch: fetchThemes }
}
