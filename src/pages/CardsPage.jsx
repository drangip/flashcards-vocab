import { useState } from 'react'
import { useCards } from '../hooks/useCards'
import { useThemes } from '../hooks/useThemes'
import CardForm from '../components/CardForm'

const LEITNER_LABELS = ['Nouveau', 'Niv.1', 'Niv.2', 'Niv.3', 'Niv.4', 'Niv.5', 'Maîtrisé ⭐']
const LEVEL_COLORS = ['text-gray-400', 'text-blue-400', 'text-blue-400', 'text-green-400', 'text-green-400', 'text-yellow-400', 'text-yellow-400']

export default function CardsPage({ user }) {
  const { themes } = useThemes(user?.id)
  const [filterThemeId, setFilterThemeId] = useState(null)
  const { cards, loading, createCard, updateCard, deleteCard } = useCards(user?.id, filterThemeId)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteError, setDeleteError] = useState(null)

  async function handleCreate(values) {
    await createCard(values)
    setShowCreate(false)
  }

  async function handleUpdate(id, values) {
    await updateCard(id, values)
    setEditingId(null)
  }

  async function handleDelete(card) {
    if (!window.confirm(`Supprimer "${card.front}" ?`)) return
    try {
      setDeleteError(null)
      await deleteCard(card.id)
    } catch (err) {
      setDeleteError(err.message)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {deleteError && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
          Erreur : {deleteError}
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">Mes cartes</h1>
        <button
          onClick={() => setShowCreate(true)}
          disabled={themes.length === 0}
          className="bg-accent hover:bg-red-600 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          + Ajouter
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilterThemeId(null)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterThemeId === null ? 'bg-accent text-white' : 'bg-navy-700 text-gray-400 hover:text-white'}`}
        >
          Toutes
        </button>
        {themes.map(t => (
          <button
            key={t.id}
            onClick={() => setFilterThemeId(t.id)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterThemeId === t.id ? 'bg-accent text-white' : 'bg-navy-700 text-gray-400 hover:text-white'}`}
          >
            {t.emoji} {t.name}
          </button>
        ))}
      </div>

      {showCreate && themes.length > 0 && (
        <div className="mb-6">
          <CardForm
            title="Nouvelle carte"
            themes={themes}
            onSave={handleCreate}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : cards.length === 0 ? (
        <p className="text-gray-500">Aucune carte. Ajoute ta première carte !</p>
      ) : (
        <div className="flex flex-col gap-2">
          {cards.map(card => {
            const theme = themes.find(t => t.id === card.theme_id)
            return (
              <div key={card.id}>
                {editingId === card.id ? (
                  <div className="mb-2">
                    <CardForm
                      title="Modifier la carte"
                      initial={{ front: card.front, back: card.back, example: card.example || '', theme_id: card.theme_id }}
                      themes={themes}
                      onSave={values => handleUpdate(card.id, values)}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white truncate">{card.front}</span>
                        <span className="text-gray-500">→</span>
                        <span className="text-gray-300 truncate">{card.back}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {theme && <span className="text-gray-500">{theme.emoji} {theme.name}</span>}
                        <span className={LEVEL_COLORS[card.level ?? 0]}>
                          {LEITNER_LABELS[card.level ?? 0]}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setEditingId(card.id)} className="text-gray-500 hover:text-gray-300 px-2">✏️</button>
                      <button onClick={() => handleDelete(card)} className="text-gray-500 hover:text-red-400 px-2">🗑️</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
